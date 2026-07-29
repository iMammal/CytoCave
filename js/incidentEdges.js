function normalizeNodeId(value) {
  const nodeId = Number(value);
  return Number.isInteger(nodeId) && nodeId >= 0 ? nodeId : null;
}

function normalizeWeight(value) {
  const weight = Number(value);
  return Number.isFinite(weight) ? weight : 0;
}

const EDGE_VALUE_MODES = ['similarity', 'distance', 'binary'];

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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const source = normalizeNodeId(edgeRecordField(row, ['source', 'sourceNodeId', 'from'], 0));
    const target = normalizeNodeId(edgeRecordField(row, ['target', 'targetNodeId', 'to'], 1));
    if (source === null || target === null) continue;

    const rawWeight = edgeRecordField(row, ['value', 'weight', 'distance', 'similarity'], 2);
    if (rawWeight === undefined || rawWeight === null || rawWeight === '') continue;
    const weight = normalizeWeight(rawWeight);

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
    directed: options.directed !== false
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

module.exports = {
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
