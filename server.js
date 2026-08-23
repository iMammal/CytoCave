const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const Papa = require('papaparse');
const {
  GLYPH_SIZE_RANGE,
  applyGlyphSizeUpdate,
  createDefaultGlyphSizes,
  normalizeGlyphSizes
} = require('./js/glyphSizeState');

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3273;

if (isDevelopment) {
  app.use((req, res, next) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
}

const DATA_ROOT = path.resolve(__dirname, 'data');
const EXPORT_ROOT = path.resolve(__dirname, 'exports');
const DEFAULT_DATASET_FOLDER = 'UPENN_GBM_00013_C16_KCOMPARE';
const DEFAULT_LOOKUP_TABLE = 'upenn_gbm_00013_c16_kcompare';
const DEFAULT_LEFT_SUBJECT = 'UPENN-GBM-00013_11__n21760_s0_k20';
const DEFAULT_RIGHT_SUBJECT = 'UPENN-GBM-00013_11__n21760_s0_k40';
const EDGE_VALUE_MODES = ['similarity', 'distance', 'binary'];

app.use(bodyParser.json({ limit: '50mb' }));

let focusRequestCounter = 0;

const baseSessionState = {
  version: 1,
  dataset: {
    folder: DEFAULT_DATASET_FOLDER,
    lookupTableId: DEFAULT_LOOKUP_TABLE
  },
  view: {
    layout: 'side-by-side',
    orientation: {
      synchronized: true,
      source: 'left'
    },
    colorBy: {
      mode: 'kmeans_cluster',
      left: 'KMeans_k20_c16_s0_Clustering',
      right: 'KMeans_k40_c16_s0_Clustering'
    },
    nodeSizeBy: null,
    glyphSizes: createDefaultGlyphSizes(),
    edgeValueMode: 'similarity',
    selectionMode: 'additive',
    highlightedCluster: null,
    selectedNode: null,
    focusRequest: null
  },
  annotations: {
    byNode: {}
  },
  renderPolicy: {
    edgeMode: 'top_per_node',
    topEdges: 5,
    preserveCompleteMetadata: true
  },
  viewports: {
    left: null,
    right: null
  }
};

let sessionState = clone(baseSessionState);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function revisionFor(state) {
  return crypto.createHash('sha256').update(stableStringify(state)).digest('hex').slice(0, 16);
}

function normalizeSessionState() {
  if (!sessionState.view) {
    sessionState.view = clone(baseSessionState.view);
  }
  sessionState.view.glyphSizes = normalizeGlyphSizes(sessionState.view.glyphSizes);
}

function stateWithRevision() {
  normalizeSessionState();
  const state = clone(sessionState);
  state.revision = revisionFor(sessionState);
  return state;
}

function normalizeViewport(value, { allowBoth = false } = {}) {
  const viewport = String(value || 'left').toLowerCase();
  if (viewport === 'left' || viewport === 'right' || (allowBoth && viewport === 'both')) {
    return viewport;
  }
  throw new Error(allowBoth ? 'viewport must be left, right, or both' : 'viewport must be left or right');
}

function normalizeSelectionMode(value) {
  const mode = String(value || 'additive').toLowerCase();
  if (mode === 'additive' || mode === 'replace') {
    return mode;
  }
  throw new Error('selectionMode must be additive or replace');
}

function normalizeEdgeValueMode(value) {
  const mode = String(value || 'similarity').toLowerCase();
  if (EDGE_VALUE_MODES.includes(mode)) {
    return mode;
  }
  throw new Error(`edgeValueMode must be one of: ${EDGE_VALUE_MODES.join(', ')}`);
}

function configuredEdgeValueMode(...sources) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const value = source.edgeValueMode ?? source.edge_value_mode;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return normalizeEdgeValueMode(value);
    }
  }
  return normalizeEdgeValueMode(sessionState.view.edgeValueMode);
}

function normalizeNodeId(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error('nodeId is required');
  }
  const nodeId = String(value).trim();
  if (!/^\d+$/.test(nodeId)) {
    throw new Error('nodeId must be a non-negative integer dataset index');
  }
  return nodeId;
}

function validateNodeTarget(nodeId, viewport) {
  const variant = sessionState.viewports && sessionState.viewports[viewport];
  let nodeCount = variant && variant.graph && variant.graph.nodeCount;
  if ((nodeCount === null || nodeCount === undefined) && variant && variant.files && variant.files.topology) {
    const topologyPath = dataPath(variant.datasetFolder, variant.files.topology.name);
    const text = readTextIfExists(topologyPath);
    if (text) {
      nodeCount = text.split(/\r?\n/).filter((line) => line.trim()).length - 1;
    }
  }
  if (nodeCount !== null && nodeCount !== undefined && Number.isFinite(Number(nodeCount))) {
    const index = Number(nodeId);
    const maxIndex = Number(nodeCount) - 1;
    if (index < 0 || index > maxIndex) {
      throw new Error(`nodeId ${nodeId} is outside viewport ${viewport}; expected 0 through ${maxIndex}`);
    }
  }
}

function normalizeNodeTarget(body = {}) {
  const viewport = normalizeViewport(body.viewport || body.side || 'left');
  const nodeId = normalizeNodeId(body.nodeId ?? body.node ?? body.id);
  validateNodeTarget(nodeId, viewport);
  return { nodeId, viewport };
}

function structuredAnnotations() {
  if (!sessionState.annotations) {
    sessionState.annotations = { byNode: {} };
  }
  if (!sessionState.annotations.byNode) {
    sessionState.annotations.byNode = {};
  }
  return sessionState.annotations.byNode;
}

function annotationPayloadEqual(existing, next) {
  if (!existing) return false;
  const keys = ['nodeId', 'text', 'kind', 'source', 'variantId', 'viewport'];
  return keys.every((key) => existing[key] === next[key]) &&
    stableStringify(existing.metrics || {}) === stableStringify(next.metrics || {});
}

function normalizeAnnotation(body = {}) {
  const viewport = normalizeViewport(body.viewport || body.side || 'left');
  const nodeId = normalizeNodeId(body.nodeId ?? body.node ?? body.id);
  validateNodeTarget(nodeId, viewport);

  const hasText = Object.prototype.hasOwnProperty.call(body, 'text');
  const hasNote = Object.prototype.hasOwnProperty.call(body, 'note');
  const rawText = hasText ? body.text : (hasNote ? body.note : undefined);
  if (rawText === undefined) {
    throw new Error('annotation text is required as text or note');
  }

  const text = rawText === null ? null : String(rawText);
  const variant = sessionState.viewports && sessionState.viewports[viewport];
  const variantId = body.variantId || body.variant_id || (variant && variant.variantId) || null;
  const metrics = body.metrics && typeof body.metrics === 'object' && !Array.isArray(body.metrics)
    ? clone(body.metrics)
    : {};

  return {
    nodeId,
    text,
    kind: body.kind || 'analysis',
    source: body.source || 'jupyter',
    variantId,
    viewport,
    metrics
  };
}

function upsertAnnotation(body = {}) {
  const incoming = normalizeAnnotation(body);
  const byNode = structuredAnnotations();

  if (incoming.text === null || incoming.text.trim() === '') {
    const existed = Boolean(byNode[incoming.nodeId]);
    delete byNode[incoming.nodeId];
    return { annotation: null, changed: existed, removed: existed };
  }

  const existing = byNode[incoming.nodeId] || null;
  if (annotationPayloadEqual(existing, incoming)) {
    return { annotation: clone(existing), changed: false, removed: false };
  }

  const now = new Date().toISOString();
  const annotation = {
    ...incoming,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
  byNode[incoming.nodeId] = annotation;
  return { annotation: clone(annotation), changed: true, removed: false };
}

function legacyAnnotationMap() {
  const byNode = structuredAnnotations();
  return Object.keys(byNode).sort().reduce((result, nodeId) => {
    result[nodeId] = byNode[nodeId].text;
    return result;
  }, {});
}

function ensureExportRoot() {
  fs.mkdirSync(EXPORT_ROOT, { recursive: true });
}

function assertDataPath(targetPath) {
  const resolved = path.resolve(targetPath);
  if (resolved !== DATA_ROOT && !resolved.startsWith(DATA_ROOT + path.sep)) {
    throw new Error(`Path escapes data root: ${targetPath}`);
  }
  return resolved;
}

function dataPath(folder, fileName = '') {
  const folderPath = assertDataPath(path.join(DATA_ROOT, folder || ''));
  const targetPath = assertDataPath(path.join(folderPath, fileName || ''));
  if (targetPath !== folderPath && !targetPath.startsWith(folderPath + path.sep)) {
    throw new Error(`Path escapes dataset folder: ${fileName}`);
  }
  return targetPath;
}

function publicDataUrl(folder, fileName) {
  return `/data/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`;
}

function fileInfo(folder, fileName) {
  if (!fileName) return null;
  const target = dataPath(folder, fileName);
  if (!fs.existsSync(target)) return null;
  const stat = fs.statSync(target);
  return {
    name: fileName,
    bytes: stat.size,
    url: publicDataUrl(folder, fileName)
  };
}

function readTextIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonIfExists(filePath) {
  const text = readTextIfExists(filePath);
  if (!text) return null;
  return JSON.parse(text);
}

function readCsvRecords(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(text, {
    delimiter: ',',
    dynamicTyping: true,
    header: true,
    skipEmptyLines: true
  });
  if (parsed.errors && parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse failed for ${path.basename(filePath)}: ${first.message}`);
  }
  return parsed.data;
}

function readTopologyHeader(folder, topologyFile) {
  const text = readTextIfExists(dataPath(folder, topologyFile));
  if (!text) return [];
  const firstLine = text.split(/\r?\n/, 1)[0];
  return firstLine.split(',').map((field) => field.trim()).filter(Boolean);
}

function inferK(value) {
  const match = String(value || '').match(/(?:^|_)k(\d+)(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function inferC(value) {
  const match = String(value || '').match(/(?:^|_)c(\d+)(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function inferSeed(value) {
  const match = String(value || '').match(/(?:^|_)s(\d+)(?:_|$)/);
  return match ? Number(match[1]) : null;
}

function existingFile(folder, fileName) {
  if (!fileName) return null;
  return fs.existsSync(dataPath(folder, fileName)) ? fileName : null;
}

function findCatalogRecord(folder, subjectID) {
  const indexPath = dataPath(folder, 'index.txt');
  const records = readCsvRecords(indexPath);
  return records.find((record) => String(record.subjectID) === String(subjectID)) || null;
}

function chooseDefaultSubject(viewport) {
  return viewport === 'right' ? DEFAULT_RIGHT_SUBJECT : DEFAULT_LEFT_SUBJECT;
}

function isKMeansClusterColumn(field) {
  return String(field || '').includes('KMeans');
}

function isSchemaClusteringColumn(field) {
  const name = String(field || '').trim();
  return name.length > 'Clustering'.length && name.endsWith('Clustering');
}

function clusteringColumnBase(field) {
  const name = String(field || '').trim();
  return isSchemaClusteringColumn(name) ? name.slice(0, -'Clustering'.length) : name;
}

function isClusterColumn(field) {
  if (!field) return false;
  return isKMeansClusterColumn(field) || isSchemaClusteringColumn(field);
}

function colorModeForClusterColumns(fields, knownClusterColumns = fields) {
  const selectedFields = fields.filter(Boolean).map(String);
  const knownNonKMeansColumns = knownClusterColumns
    .filter((field) => isSchemaClusteringColumn(field) && !isKMeansClusterColumn(field))
    .map(String);

  return selectedFields.some((field) => {
    return (isSchemaClusteringColumn(field) && !isKMeansClusterColumn(field)) ||
      knownNonKMeansColumns.some((knownField) => field === clusteringColumnBase(knownField));
  })
    ? 'module_cluster'
    : 'kmeans_cluster';
}

function chooseClusterColumn({ folder, record, variantMetadata, commonMetadata, k, clusterCount, seed }) {
  if (record.clusterColumn) return record.clusterColumn;
  if (variantMetadata && variantMetadata.cluster_column) return variantMetadata.cluster_column;

  const columns = [];
  if (commonMetadata && Array.isArray(commonMetadata.cluster_columns)) {
    columns.push(...commonMetadata.cluster_columns);
  }
  if (record.topology) {
    columns.push(...readTopologyHeader(folder, record.topology).filter(isClusterColumn));
  }

  const normalizedK = k != null ? String(k) : null;
  const normalizedC = clusterCount != null ? String(clusterCount) : null;
  const normalizedSeed = seed != null ? String(seed) : null;
  const exact = columns.find((field) => {
    return (!normalizedK || field.includes(`k${normalizedK}`)) &&
      (!normalizedC || field.includes(`c${normalizedC}`)) &&
      (!normalizedSeed || field.includes(`s${normalizedSeed}`));
  });
  if (exact) return exact;
  if (columns.length) return columns[0];
  if (k != null && clusterCount != null && seed != null) {
    return `KMeans_k${k}_c${clusterCount}_s${seed}_Clustering`;
  }
  return null;
}

function normalizeVariant(input = {}, viewport = 'left') {
  const folder = input.datasetFolder || input.folder || sessionState.dataset.folder || DEFAULT_DATASET_FOLDER;
  const lookupTableId = input.lookupTableId || input.lut || sessionState.dataset.lookupTableId || DEFAULT_LOOKUP_TABLE;
  const bodyRecord = input.catalogRecord || input.record || {};
  const subjectID = input.subjectID || input.subject_id || bodyRecord.subjectID || bodyRecord.subject_id || chooseDefaultSubject(viewport);
  const indexRecord = findCatalogRecord(folder, subjectID);
  if (!indexRecord && (!bodyRecord.network || !bodyRecord.topology)) {
    throw new Error(`No catalog record found for subjectID ${subjectID} in ${folder}`);
  }

  const record = {
    ...indexRecord,
    ...bodyRecord,
    subjectID
  };
  record.network = record.network || record.edges || record.edge_file || record.edgeFile;
  record.topology = record.topology || record.topology_file || record.topologyFile;
  record.metadata = record.metadata || record.metadata_file || record.metadataFile;
  record.cluster_summary = record.cluster_summary || record.clusterSummary || record.cluster_summary_file || record.clusterSummaryFile;

  if (!record.network || !record.topology) {
    throw new Error(`Catalog record for ${subjectID} must include network and topology`);
  }

  const variantMetadataFile = existingFile(folder, record.metadata || `${subjectID}_metadata.json`);
  const clusterSummaryFile = existingFile(folder, record.cluster_summary || record.clusterSummary || `${subjectID}_cluster_summary.csv`);
  const commonMetadataFile = existingFile(folder, input.commonMetadata || `${subjectID.replace(/_k\d+(?:_c\d+)?$/, '')}_metadata.json`);
  const variantMetadata = readJsonIfExists(variantMetadataFile ? dataPath(folder, variantMetadataFile) : null);
  const commonMetadata = readJsonIfExists(commonMetadataFile ? dataPath(folder, commonMetadataFile) : null);

  const k = input.knn_k || record.knn_k || (variantMetadata && variantMetadata.knn_k) || inferK(subjectID) || inferK(record.network);
  const seed = input.seed ?? record.seed ?? (variantMetadata && variantMetadata.graph_seed) ?? (commonMetadata && commonMetadata.seed) ?? inferSeed(subjectID) ?? inferSeed(record.network) ?? 0;
  const clusterCount = input.cluster_count || record.cluster_count || (variantMetadata && variantMetadata.cluster_count) || inferC(subjectID) || inferC(record.network) || 16;
  const clusterColumn = chooseClusterColumn({
    folder,
    record: { ...record, clusterColumn: input.clusterColumn || record.clusterColumn },
    variantMetadata,
    commonMetadata,
    k,
    clusterCount,
    seed
  });

  const nodeCount = (variantMetadata && variantMetadata.node_count) ||
    (commonMetadata && commonMetadata.node_count) ||
    record.node_count ||
    null;
  const edgeValueMode = configuredEdgeValueMode(input, record, variantMetadata, commonMetadata);

  return {
    viewport,
    variantId: `${folder}:${subjectID}`,
    datasetFolder: folder,
    lookupTableId,
    subjectID,
    catalogRecord: {
      ...record,
      datasetFolder: folder,
      lookupTableId,
      metadata: variantMetadataFile,
      commonMetadata: commonMetadataFile,
      clusterSummary: clusterSummaryFile,
      clusterColumn
    },
    files: {
      edges: fileInfo(folder, record.network),
      topology: fileInfo(folder, record.topology),
      metadata: fileInfo(folder, variantMetadataFile),
      commonMetadata: fileInfo(folder, commonMetadataFile),
      clusterSummary: fileInfo(folder, clusterSummaryFile)
    },
    graph: {
      nodeCount,
      knnK: k,
      seed,
      clusterCount,
      clusterMethod: (variantMetadata && variantMetadata.cluster_method) || 'kmeans',
      clusterColumn,
      edgeFilterMode: (variantMetadata && variantMetadata.edge_filter_mode) || 'top_per_node',
      edgeValueMode,
      topEdges: (variantMetadata && variantMetadata.top_edges) || sessionState.renderPolicy.topEdges
    },
    metadata: {
      variant: variantMetadata,
      common: commonMetadata
    }
  };
}

function setViewportVariant(viewport, input) {
  if (viewport !== 'left' && viewport !== 'right') {
    throw new Error('viewport must be left or right');
  }
  const variant = normalizeVariant(input, viewport);
  sessionState.dataset = {
    folder: variant.datasetFolder,
    lookupTableId: variant.lookupTableId
  };
  sessionState.viewports[viewport] = variant;
  sessionState.view.edgeValueMode = variant.graph.edgeValueMode || 'similarity';
  if (variant.graph.clusterColumn) {
    sessionState.view.colorBy[viewport] = variant.graph.clusterColumn;
    sessionState.view.colorBy.mode = colorModeForClusterColumns([
      sessionState.view.colorBy.left,
      sessionState.view.colorBy.right
    ]);
  }
  return variant;
}

function compareVariants(body = {}) {
  const leftInput = {
    datasetFolder: body.datasetFolder || body.folder || DEFAULT_DATASET_FOLDER,
    lookupTableId: body.lookupTableId || body.lut || DEFAULT_LOOKUP_TABLE,
    edgeValueMode: body.edgeValueMode || body.edge_value_mode,
    subjectID: DEFAULT_LEFT_SUBJECT,
    ...(body.left || {})
  };
  const rightInput = {
    datasetFolder: body.datasetFolder || body.folder || DEFAULT_DATASET_FOLDER,
    lookupTableId: body.lookupTableId || body.lut || DEFAULT_LOOKUP_TABLE,
    edgeValueMode: body.edgeValueMode || body.edge_value_mode,
    subjectID: DEFAULT_RIGHT_SUBJECT,
    ...(body.right || {})
  };
  const left = setViewportVariant('left', leftInput);
  const right = setViewportVariant('right', rightInput);
  sessionState.view.edgeValueMode = normalizeEdgeValueMode(
    body.edgeValueMode ||
    body.edge_value_mode ||
    left.graph.edgeValueMode ||
    right.graph.edgeValueMode
  );
  sessionState.view.layout = body.layout || 'side-by-side';
  sessionState.view.orientation = {
    synchronized: body.syncOrientation !== false,
    source: body.orientationSource || 'left'
  };
  sessionState.view.colorBy = {
    mode: colorModeForClusterColumns([left.graph.clusterColumn, right.graph.clusterColumn]),
    left: left.graph.clusterColumn,
    right: right.graph.clusterColumn
  };
  return { left, right };
}

function handleRoute(fn, res) {
  try {
    const result = fn();
    res.json({ ok: true, revision: revisionFor(sessionState), ...result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}

compareVariants();

app.post('/api/annotate', (req, res) => {
  handleRoute(() => {
    const result = upsertAnnotation(req.body || {});
    return {
      state: stateWithRevision(),
      annotation: result.annotation,
      changed: result.changed,
      removed: result.removed
    };
  }, res);
});

app.get('/api/annotations', (req, res) => {
  res.json({
    ...legacyAnnotationMap(),
    byNode: clone(structuredAnnotations())
  });
});

app.get('/session/state', (req, res) => {
  res.json(stateWithRevision());
});

app.post('/variants/load', (req, res) => {
  handleRoute(() => {
    const viewport = req.body.viewport || req.body.side || 'left';
    const variant = setViewportVariant(String(viewport).toLowerCase(), req.body);
    return { state: stateWithRevision(), variant };
  }, res);
});

app.post('/variants/compare', (req, res) => {
  handleRoute(() => {
    const variants = compareVariants(req.body || {});
    return { state: stateWithRevision(), variants };
  }, res);
});

app.post('/view/layout', (req, res) => {
  handleRoute(() => {
    const layout = req.body.layout || 'side-by-side';
    sessionState.view.layout = layout;
    sessionState.view.orientation = {
      synchronized: req.body.syncOrientation !== false,
      source: req.body.orientationSource || req.body.source || sessionState.view.orientation.source || 'left'
    };
    return { state: stateWithRevision() };
  }, res);
});

app.post('/view/color-by', (req, res) => {
  handleRoute(() => {
    const field = req.body.field || req.body.clusterColumn || null;
    const left = req.body.left || req.body.leftField || field || (sessionState.viewports.left && sessionState.viewports.left.graph.clusterColumn);
    const right = req.body.right || req.body.rightField || field || (sessionState.viewports.right && sessionState.viewports.right.graph.clusterColumn);
    const knownClusterColumns = [
      sessionState.viewports.left && sessionState.viewports.left.graph.clusterColumn,
      sessionState.viewports.right && sessionState.viewports.right.graph.clusterColumn
    ];
    const mode = req.body.mode || colorModeForClusterColumns([left, right], knownClusterColumns);
    sessionState.view.colorBy = {
      mode,
      left,
      right
    };
    return { state: stateWithRevision() };
  }, res);
});

app.post('/view/highlight-cluster', (req, res) => {
  handleRoute(() => {
    if (req.body.clusterId === undefined && req.body.cluster_id === undefined) {
      throw new Error('clusterId is required');
    }
    const viewport = normalizeViewport(req.body.viewport || req.body.side || 'both', { allowBoth: true });
    const clusterId = req.body.clusterId ?? req.body.cluster_id;
    const leftField = req.body.leftField || sessionState.view.colorBy.left;
    const rightField = req.body.rightField || sessionState.view.colorBy.right;
    const knownClusterColumns = [
      sessionState.viewports.left && sessionState.viewports.left.graph.clusterColumn,
      sessionState.viewports.right && sessionState.viewports.right.graph.clusterColumn
    ];
    sessionState.view.highlightedCluster = {
      mode: req.body.mode || colorModeForClusterColumns([leftField, rightField], knownClusterColumns),
      clusterId,
      viewport,
      leftField,
      rightField
    };
    return { state: stateWithRevision() };
  }, res);
});

app.get('/view/selection-mode', (req, res) => {
  res.json({
    ok: true,
    revision: revisionFor(sessionState),
    selectionMode: sessionState.view.selectionMode || 'additive',
    state: stateWithRevision()
  });
});

app.post('/view/selection-mode', (req, res) => {
  handleRoute(() => {
    const body = req.body || {};
    const selectionMode = normalizeSelectionMode(body.selectionMode || body.mode);
    sessionState.view.selectionMode = selectionMode;
    return { state: stateWithRevision(), selectionMode };
  }, res);
});

app.get('/view/edge-value-mode', (req, res) => {
  res.json({
    ok: true,
    revision: revisionFor(sessionState),
    edgeValueMode: normalizeEdgeValueMode(sessionState.view.edgeValueMode),
    state: stateWithRevision()
  });
});

app.post('/view/edge-value-mode', (req, res) => {
  handleRoute(() => {
    const body = req.body || {};
    const edgeValueMode = normalizeEdgeValueMode(body.edgeValueMode || body.edge_value_mode || body.mode);
    sessionState.view.edgeValueMode = edgeValueMode;
    return { state: stateWithRevision(), edgeValueMode };
  }, res);
});

app.post('/view/glyph-size', (req, res) => {
  handleRoute(() => {
    const result = applyGlyphSizeUpdate(sessionState.view && sessionState.view.glyphSizes, req.body || {});
    sessionState.view.glyphSizes = result.glyphSizes;
    return {
      state: stateWithRevision(),
      glyphSizes: clone(sessionState.view.glyphSizes),
      changed: result.changed,
      viewport: result.viewport,
      sizes: result.sizes,
      range: GLYPH_SIZE_RANGE
    };
  }, res);
});

app.post('/view/select-node', (req, res) => {
  handleRoute(() => {
    const target = normalizeNodeTarget(req.body || {});
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'replaceSelection')) {
      target.replaceSelection = req.body.replaceSelection !== false;
    }
    sessionState.view.selectedNode = target;
    return { state: stateWithRevision(), selectedNode: clone(target) };
  }, res);
});

app.post('/view/focus-node', (req, res) => {
  handleRoute(() => {
    const target = normalizeNodeTarget(req.body || {});
    const focusRequest = {
      ...target,
      requestId: `${Date.now()}-${++focusRequestCounter}`
    };
    sessionState.view.focusRequest = focusRequest;
    return { state: stateWithRevision(), focusRequest: clone(focusRequest) };
  }, res);
});

app.post('/export/session', (req, res) => {
  handleRoute(() => {
    ensureExportRoot();
    const state = stateWithRevision();
    const fileName = `session-${state.revision}.json`;
    const target = path.join(EXPORT_ROOT, fileName);
    fs.writeFileSync(target, JSON.stringify(state, null, 2));
    return {
      export: {
        type: 'session',
        fileName,
        path: target,
        url: `/exports/${encodeURIComponent(fileName)}`
      }
    };
  }, res);
});

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('imageData must be a PNG data URL');
  }
  return Buffer.from(match[1], 'base64');
}

app.post('/export/screenshot', (req, res) => {
  handleRoute(() => {
    ensureExportRoot();
    const imageData = req.body.imageData || req.body.combined || (req.body.screenshots && req.body.screenshots.combined);
    if (!imageData) {
      throw new Error('imageData is required; call this endpoint from the browser bridge or provide a PNG data URL');
    }
    const imageBuffer = parseDataUrl(imageData);
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex').slice(0, 16);
    const fileName = `screenshot-${hash}.png`;
    const target = path.join(EXPORT_ROOT, fileName);
    fs.writeFileSync(target, imageBuffer);
    return {
      export: {
        type: 'screenshot',
        fileName,
        path: target,
        url: `/exports/${encodeURIComponent(fileName)}`,
        bytes: imageBuffer.length
      }
    };
  }, res);
});

app.get('/visualization', (req, res) => {
  res.sendFile(path.join(__dirname, 'visualization.html'));
  console.log('CytoCave backend received GET request for visualization.');
});

app.use('/exports', express.static(EXPORT_ROOT));
app.use(express.static('.'));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CytoCave backend running on http://localhost:${port}`);
  });
}

module.exports = {
  app,
  compareVariants,
  normalizeVariant,
  revisionFor,
  stateWithRevision,
  resetSessionForTests: () => {
    sessionState = clone(baseSessionState);
    focusRequestCounter = 0;
    compareVariants();
    return stateWithRevision();
  }
};
