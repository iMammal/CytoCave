function normalizeNodeId(value) {
  const nodeId = Number(value);
  return Number.isInteger(nodeId) && nodeId >= 0 ? nodeId : null;
}

function normalizeWeight(value) {
  const weight = Number(value);
  return Number.isFinite(weight) ? weight : 0;
}

const EDGE_VALUE_MODES = ['similarity', 'distance', 'binary'];
const DEFAULT_ADJACENCY_SAMPLE_NODE_IDS = [36, 3657, 6452];

function normalizeEdgeValueMode(mode) {
  const normalized = String(mode || 'similarity').toLowerCase();
  return EDGE_VALUE_MODES.includes(normalized) ? normalized : 'similarity';
}

function edgeModeLabel(mode) {
  switch (normalizeEdgeValueMode(mode)) {
    case 'distance':
      return 'Maximum distance';
    case 'binary':
      return 'Binary edge presence';
    case 'similarity':
    default:
      return 'Minimum similarity';
  }
}

function edgeModeIndicator(mode) {
  switch (normalizeEdgeValueMode(mode)) {
    case 'distance':
      return 'Distance — lower is stronger';
    case 'binary':
      return 'Binary — unweighted';
    case 'similarity':
    default:
      return 'Similarity — higher is stronger';
  }
}

function edgeValue(edge) {
  if (!edge) return 0;
  if (edge.value !== undefined) return normalizeWeight(edge.value);
  return normalizeWeight(edge.weight);
}

function edgePassesThreshold(edge, threshold, mode = 'similarity') {
  const edgeValueMode = normalizeEdgeValueMode(mode);
  if (edgeValueMode === 'binary') return true;

  const value = edgeValue(edge);
  const numericThreshold = Number.isFinite(Number(threshold)) ? Number(threshold) : 0;
  if (edgeValueMode === 'distance') return value <= numericThreshold;
  return value >= numericThreshold;
}

function compareEdgeStrength(a, b, mode = 'similarity') {
  const edgeValueMode = normalizeEdgeValueMode(mode);
  if (edgeValueMode === 'distance') return edgeValue(a) - edgeValue(b);
  if (edgeValueMode === 'binary') return 0;
  return edgeValue(b) - edgeValue(a);
}

function strongestEdgeValue(current, candidate, mode = 'similarity') {
  if (current === null || current === undefined) return candidate;
  const edgeValueMode = normalizeEdgeValueMode(mode);
  if (edgeValueMode === 'distance') return Math.min(normalizeWeight(current), normalizeWeight(candidate));
  if (edgeValueMode === 'binary') return 1;
  return Math.max(normalizeWeight(current), normalizeWeight(candidate));
}

function createRows() {
  return [];
}

function ensureRow(rows, index) {
  if (!rows[index]) rows[index] = [];
  return rows[index];
}

function edgeKey(source, target) {
  return source <= target ? `${source}:${target}` : `${target}:${source}`;
}

function createAdjacencyEdge(source, target, weight, metadata) {
  return {
    source,
    target,
    sourceNodeId: source,
    targetNodeId: target,
    weight,
    value: weight,
    metadata: metadata || null
  };
}

function edgeRecordField(row, names, index) {
  if (Array.isArray(row)) return row[index];
  for (let i = 0; i < names.length; i++) {
    if (row[names[i]] !== undefined) return row[names[i]];
  }
  return undefined;
}

function buildSparseAdjacencyRows(edgeRows, options = {}) {
  const outgoingAdjacency = createRows(options.nodeCount);
  const incomingAdjacency = createRows(options.nodeCount);
  const rows = Array.isArray(edgeRows) ? edgeRows : [];
  const stats = {
    totalEdgeRecordsRead: rows.length,
    validEdgeRecords: 0,
    skippedEdgeRecords: 0,
    minSourceId: null,
    maxSourceId: null,
    minTargetId: null,
    maxTargetId: null
  };

  function observeEndpoint(source, target) {
    stats.validEdgeRecords += 1;
    stats.minSourceId = stats.minSourceId === null ? source : Math.min(stats.minSourceId, source);
    stats.maxSourceId = stats.maxSourceId === null ? source : Math.max(stats.maxSourceId, source);
    stats.minTargetId = stats.minTargetId === null ? target : Math.min(stats.minTargetId, target);
    stats.maxTargetId = stats.maxTargetId === null ? target : Math.max(stats.maxTargetId, target);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) {
      stats.skippedEdgeRecords += 1;
      continue;
    }

    const source = normalizeNodeId(edgeRecordField(row, ['source', 'sourceNodeId', 'from'], 0));
    const target = normalizeNodeId(edgeRecordField(row, ['target', 'targetNodeId', 'to'], 1));
    if (source === null || target === null) {
      stats.skippedEdgeRecords += 1;
      continue;
    }

    const rawWeight = edgeRecordField(row, ['value', 'weight', 'distance', 'similarity'], 2);
    if (rawWeight === undefined || rawWeight === null || rawWeight === '') {
      stats.skippedEdgeRecords += 1;
      continue;
    }
    const weight = normalizeWeight(rawWeight);
    observeEndpoint(source, target);

    const metadata = Array.isArray(row)
      ? (row.length > 3 ? row.slice(3) : null)
      : row;
    const edge = createAdjacencyEdge(source, target, weight, metadata);

    ensureRow(outgoingAdjacency, source).push({
      ...edge,
      direction: 'outgoing',
      outgoingWeight: weight,
      incomingWeight: null
    });
    ensureRow(incomingAdjacency, target).push({
      ...edge,
      direction: 'incoming',
      outgoingWeight: null,
      incomingWeight: weight
    });
  }

  return {
    outgoingAdjacency,
    incomingAdjacency,
    directed: options.directed !== false,
    diagnostics: buildSparseAdjacencyDiagnostics(outgoingAdjacency, incomingAdjacency, {
      ...options,
      stats
    })
  };
}

function collectIncidentEdges(outgoingAdjacency, incomingAdjacency, nodeId, mode = 'similarity') {
  const selectedNodeId = normalizeNodeId(nodeId);
  if (selectedNodeId === null) return [];
  const edgeValueMode = normalizeEdgeValueMode(mode);

  const byPair = new Map();

  function merge(edge, direction) {
    if (!edge) return;
    const source = normalizeNodeId(edge.sourceNodeId !== undefined ? edge.sourceNodeId : edge.source);
    const target = normalizeNodeId(edge.targetNodeId !== undefined ? edge.targetNodeId : edge.target);
    if (source === null || target === null) return;

    const neighborNodeId = direction === 'outgoing' ? target : source;
    const key = edgeKey(selectedNodeId, neighborNodeId);
    const weight = edgeValue(edge);
    let visualEdge = byPair.get(key);

    if (!visualEdge) {
      visualEdge = {
        sourceNodeId: selectedNodeId,
        targetNodeId: neighborNodeId,
        visualSourceNodeId: selectedNodeId,
        visualTargetNodeId: neighborNodeId,
        nodePair: selectedNodeId <= neighborNodeId
          ? [selectedNodeId, neighborNodeId]
          : [neighborNodeId, selectedNodeId],
        weight: edgeValueMode === 'binary' ? 1 : weight,
        value: edgeValueMode === 'binary' ? 1 : weight,
        outgoingWeight: null,
        incomingWeight: null,
        outgoingValue: null,
        incomingValue: null,
        directions: [],
        directedEdges: []
      };
      byPair.set(key, visualEdge);
    }

    if (direction === 'outgoing') {
      visualEdge.outgoingWeight = weight;
      visualEdge.outgoingValue = weight;
    } else {
      visualEdge.incomingWeight = weight;
      visualEdge.incomingValue = weight;
    }
    visualEdge.weight = strongestEdgeValue(visualEdge.weight, weight, edgeValueMode);
    visualEdge.value = visualEdge.weight;
    if (!visualEdge.directions.includes(direction)) {
      visualEdge.directions.push(direction);
    }
    visualEdge.directedEdges.push({
      direction,
      sourceNodeId: source,
      targetNodeId: target,
      weight,
      value: weight,
      metadata: edge.metadata || null
    });
  }

  const outgoing = outgoingAdjacency && outgoingAdjacency[selectedNodeId] ? outgoingAdjacency[selectedNodeId] : [];
  const incoming = incomingAdjacency && incomingAdjacency[selectedNodeId] ? incomingAdjacency[selectedNodeId] : [];

  for (let i = 0; i < outgoing.length; i++) merge(outgoing[i], 'outgoing');
  for (let i = 0; i < incoming.length; i++) merge(incoming[i], 'incoming');

  return Array.from(byPair.values());
}

function passesIncidentEdgeFilters(edge, options = {}) {
  if (!edge) return false;
  const selectedNodeId = normalizeNodeId(options.selectedNodeId);
  const targetNodeId = normalizeNodeId(edge.targetNodeId);
  if (selectedNodeId === null || targetNodeId === null) return false;

  if (typeof options.isRegionActive === 'function') {
    const regionName = options.getGroupNameByNodeIndex
      ? options.getGroupNameByNodeIndex(targetNodeId)
      : undefined;
    if (regionName !== undefined && !options.isRegionActive(regionName)) return false;
  }

  if (typeof options.isNodeVisible === 'function' && options.isNodeVisible(targetNodeId) === false) {
    return false;
  }

  const dataset = options.dataset || [];
  const selected = dataset[selectedNodeId];
  const target = dataset[targetNodeId];
  if (selected && target && (options.enableIpsi === false || options.enableContra === false)) {
    const sameHemisphere = selected.hemisphere === target.hemisphere;
    if (sameHemisphere && options.enableIpsi === false) return false;
    if (!sameHemisphere && options.enableContra === false) return false;
  }

  return true;
}

function filterIncidentEdges(edges, options = {}) {
  const filtered = (edges || []).filter((edge) => passesIncidentEdgeFilters(edge, options));
  const topN = options.topN === undefined || options.topN === null ? null : Number(options.topN);
  const edgeValueMode = normalizeEdgeValueMode(options.edgeValueMode);

  if (topN !== null && Number.isFinite(topN) && topN > 0) {
    return filtered
      .slice()
      .sort((a, b) => compareEdgeStrength(a, b, edgeValueMode))
      .slice(0, topN);
  }

  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 0;
  return filtered.filter((edge) => edgePassesThreshold(edge, threshold, edgeValueMode));
}

function safeEdges(edges) {
  return Array.isArray(edges) ? edges : [];
}

function populatedKeyCount(adjacencyRows) {
  if (!adjacencyRows || typeof adjacencyRows !== 'object') return 0;
  return Object.keys(adjacencyRows).filter((key) => safeEdges(adjacencyRows[key]).length > 0).length;
}

function compactEdgeEntry(edge) {
  if (!edge) return null;
  return {
    source: edge.sourceNodeId !== undefined ? edge.sourceNodeId : edge.source,
    target: edge.targetNodeId !== undefined ? edge.targetNodeId : edge.target,
    value: edgeValue(edge),
    direction: edge.direction || null
  };
}

function adjacencySample(outgoingAdjacency, incomingAdjacency, nodeId) {
  const normalized = normalizeNodeId(nodeId);
  const outgoing = normalized === null ? [] : safeEdges(outgoingAdjacency && outgoingAdjacency[normalized]);
  const incoming = normalized === null ? [] : safeEdges(incomingAdjacency && incomingAdjacency[normalized]);
  return {
    nodeId: normalized,
    outgoingCount: outgoing.length,
    incomingCount: incoming.length,
    outgoingFirst5: outgoing.slice(0, 5).map(compactEdgeEntry),
    incomingFirst5: incoming.slice(0, 5).map(compactEdgeEntry)
  };
}

function inferAdjacencyKeySpace(stats, options = {}) {
  if (options.keySpace) return options.keySpace;
  if (!stats || stats.validEdgeRecords === 0) return 'unknown-empty-edge-list';
  const nodeCount = Number(options.nodeCount);
  const maxEndpoint = Math.max(
    stats.maxSourceId === null ? -Infinity : stats.maxSourceId,
    stats.maxTargetId === null ? -Infinity : stats.maxTargetId
  );
  const minEndpoint = Math.min(
    stats.minSourceId === null ? Infinity : stats.minSourceId,
    stats.minTargetId === null ? Infinity : stats.minTargetId
  );
  if (Number.isFinite(nodeCount) && minEndpoint >= 0 && maxEndpoint < nodeCount) {
    return 'dataset-row-index/canonical-node-id';
  }
  return 'edge-list-source-target-values';
}

function buildSparseAdjacencyDiagnostics(outgoingAdjacency, incomingAdjacency, options = {}) {
  const stats = options.stats || {};
  const sampleNodeIds = Array.isArray(options.sampleNodeIds) && options.sampleNodeIds.length
    ? options.sampleNodeIds
    : DEFAULT_ADJACENCY_SAMPLE_NODE_IDS;
  return {
    modelSide: options.modelSide || null,
    dataSource: options.dataSource || null,
    adjacencyBuildCount: options.adjacencyBuildCount || null,
    totalEdgeRecordsRead: stats.totalEdgeRecordsRead || 0,
    validEdgeRecords: stats.validEdgeRecords || 0,
    skippedEdgeRecords: stats.skippedEdgeRecords || 0,
    outgoingAdjacencyKeyCount: populatedKeyCount(outgoingAdjacency),
    incomingAdjacencyKeyCount: populatedKeyCount(incomingAdjacency),
    minSourceId: stats.minSourceId === undefined ? null : stats.minSourceId,
    maxSourceId: stats.maxSourceId === undefined ? null : stats.maxSourceId,
    minTargetId: stats.minTargetId === undefined ? null : stats.minTargetId,
    maxTargetId: stats.maxTargetId === undefined ? null : stats.maxTargetId,
    keySpace: inferAdjacencyKeySpace(stats, options),
    keysAreViewportInstanceIds: false,
    adjacencyBuiltFrom: options.adjacencyBuiltFrom || null,
    samples: sampleNodeIds.map((nodeId) => adjacencySample(outgoingAdjacency, incomingAdjacency, nodeId))
  };
}

function buildIncidentEdgeLookupDebugReport(args = {}) {
  const canonicalNodeId = normalizeNodeId(args.canonicalNodeId);
  const sourceInstanceId = normalizeNodeId(args.sourceInstanceId);
  const resolvedInstanceId = normalizeNodeId(args.resolvedInstanceId);
  const resolvedDatasetNodeId = normalizeNodeId(args.resolvedDatasetNodeId);
  const outgoingAdjacency = args.outgoingAdjacency || [];
  const incomingAdjacency = args.incomingAdjacency || [];

  function countsFor(nodeId) {
    if (nodeId === null) {
      return {
        outgoingCount: 0,
        incomingCount: 0
      };
    }
    return {
      outgoingCount: safeEdges(outgoingAdjacency[nodeId]).length,
      incomingCount: safeEdges(incomingAdjacency[nodeId]).length
    };
  }

  return {
    canonicalNodeId,
    sourceInstanceId,
    sourceViewportSide: args.sourceViewportSide || null,
    renderViewportSide: args.renderViewportSide || null,
    modelSide: args.modelSide || null,
    modelDataSource: args.modelDataSource || null,
    renderedInstanceId: resolvedInstanceId,
    renderedInstanceMapsToDatasetNodeId: resolvedDatasetNodeId,
    adjacencyKeyUsedForRenderLookup: canonicalNodeId,
    mappingChain: {
      renderedInstanceId: resolvedInstanceId,
      datasetCanonicalNodeId: resolvedDatasetNodeId,
      adjacencyKey: canonicalNodeId
    },
    canonicalLookup: countsFor(canonicalNodeId),
    sourceInstanceLookup: countsFor(sourceInstanceId),
    resolvedInstanceLookup: countsFor(resolvedInstanceId),
    adjacencyBuildCount: args.adjacencyBuildCount || null,
    sparseAdjacencyDiagnostics: args.sparseAdjacencyDiagnostics || null
  };
}

function rawNeighborId(edge, direction) {
  if (!edge) return null;
  const field = direction === 'incoming'
    ? (edge.sourceNodeId !== undefined ? edge.sourceNodeId : edge.source)
    : (edge.targetNodeId !== undefined ? edge.targetNodeId : edge.target);
  return normalizeNodeId(field);
}

function visualNeighborId(edge) {
  if (!edge) return null;
  return normalizeNodeId(edge.targetNodeId !== undefined ? edge.targetNodeId : edge.target);
}

function first20NeighborIds(edges, neighborForEdge) {
  return safeEdges(edges)
    .slice(0, 20)
    .map((edge) => neighborForEdge(edge))
    .filter((nodeId) => nodeId !== null);
}

function stageReport(edges, neighborForEdge) {
  const stageEdges = safeEdges(edges);
  return {
    count: stageEdges.length,
    first20NeighborIds: first20NeighborIds(stageEdges, neighborForEdge)
  };
}

function topNLimit(topN) {
  if (topN === undefined || topN === null) return null;
  const numericTopN = Number(topN);
  return Number.isFinite(numericTopN) && numericTopN > 0 ? numericTopN : null;
}

function firstCountCollapse(stages, orderedStageNames) {
  for (let i = 1; i < orderedStageNames.length; i++) {
    const fromName = orderedStageNames[i - 1];
    const toName = orderedStageNames[i];
    const fromStage = stages[fromName];
    const toStage = stages[toName];
    if (!fromStage || !toStage) continue;

    if (toStage.count < fromStage.count) {
      const nextNeighbors = new Set(toStage.first20NeighborIds);
      return {
        from: fromName,
        to: toName,
        fromCount: fromStage.count,
        toCount: toStage.count,
        droppedCount: fromStage.count - toStage.count,
        missingNeighborIdsFirst20: fromStage.first20NeighborIds
          .filter((nodeId) => !nextNeighbors.has(nodeId))
          .slice(0, 20)
      };
    }
  }
  return null;
}

function buildIncidentEdgeDebugReport(args = {}) {
  const selectedNodeId = normalizeNodeId(args.selectedNodeId);
  const outgoingRecords = safeEdges(args.outgoingRecords);
  const incomingRecords = safeEdges(args.incomingRecords);
  const mergedEdges = safeEdges(args.mergedEdges);
  const submittedEdges = safeEdges(args.submittedEdges);
  const filterOptions = args.filterOptions || {};
  const edgeValueMode = normalizeEdgeValueMode(filterOptions.edgeValueMode || args.edgeValueMode);
  const threshold = Number.isFinite(Number(filterOptions.threshold))
    ? Number(filterOptions.threshold)
    : 0;
  const topN = topNLimit(filterOptions.topN);
  const thresholdApplied = topN === null;

  const unionEdges = outgoingRecords
    .map((edge) => ({ direction: 'outgoing', edge }))
    .concat(incomingRecords.map((edge) => ({ direction: 'incoming', edge })));
  const afterHemisphereFilter = mergedEdges.filter((edge) => passesIncidentEdgeFilters(edge, {
    ...filterOptions,
    selectedNodeId
  }));
  const afterThreshold = thresholdApplied
    ? afterHemisphereFilter.filter((edge) => edgePassesThreshold(edge, threshold, edgeValueMode))
    : afterHemisphereFilter.slice();
  const afterTopNLimit = topN !== null
    ? afterThreshold
      .slice()
      .sort((a, b) => compareEdgeStrength(a, b, edgeValueMode))
      .slice(0, topN)
    : afterThreshold.slice();

  const stages = {
    rawOutgoingEdgeRecords: stageReport(outgoingRecords, (edge) => rawNeighborId(edge, 'outgoing')),
    rawIncomingEdgeRecords: stageReport(incomingRecords, (edge) => rawNeighborId(edge, 'incoming')),
    union: stageReport(unionEdges, (entry) => rawNeighborId(entry.edge, entry.direction)),
    afterReciprocalMerge: stageReport(mergedEdges, visualNeighborId),
    afterHemisphereFilter: stageReport(afterHemisphereFilter, visualNeighborId),
    afterThreshold: stageReport(afterThreshold, visualNeighborId),
    afterTopNOrEdgeCountLimit: stageReport(afterTopNLimit, visualNeighborId),
    submittedRenderList: stageReport(submittedEdges, visualNeighborId)
  };
  const orderedTransformStages = [
    'union',
    'afterReciprocalMerge',
    'afterHemisphereFilter',
    'afterThreshold',
    'afterTopNOrEdgeCountLimit',
    'submittedRenderList'
  ];

  return {
    nodeId: selectedNodeId,
    edgeValueMode,
    threshold,
    topN,
    thresholdApplied,
    zeroValuedOutgoingCount: outgoingRecords.filter((edge) => edgeValue(edge) === 0).length,
    zeroValuedIncomingCount: incomingRecords.filter((edge) => edgeValue(edge) === 0).length,
    filterStages: {
      afterHemisphereFilterIncludes: [
        'active region',
        'visible node',
        'ipsilateral/contralateral hemisphere'
      ],
      submittedRenderListUsesExistingFilterIncidentEdges: true
    },
    lookupDiagnostics: args.lookupDiagnostics || null,
    stages,
    firstCountCollapse: firstCountCollapse(stages, orderedTransformStages)
  };
}

module.exports = {
  buildIncidentEdgeDebugReport,
  buildIncidentEdgeLookupDebugReport,
  buildSparseAdjacencyDiagnostics,
  buildSparseAdjacencyRows,
  compareEdgeStrength,
  collectIncidentEdges,
  edgeModeIndicator,
  edgeModeLabel,
  edgePassesThreshold,
  edgeValue,
  normalizeEdgeValueMode,
  filterIncidentEdges
};
