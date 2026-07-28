function normalizeNodeId(value) {
  const nodeId = Number(value);
  return Number.isInteger(nodeId) && nodeId >= 0 ? nodeId : null;
}

function normalizeWeight(value) {
  const weight = Number(value);
  return Number.isFinite(weight) ? weight : 0;
}

function createRows(nodeCount) {
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
    metadata: metadata || null
  };
}

function buildSparseAdjacencyRows(edgeRows, options = {}) {
  const outgoingAdjacency = createRows(options.nodeCount);
  const incomingAdjacency = createRows(options.nodeCount);
  const rows = Array.isArray(edgeRows) ? edgeRows : [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const source = normalizeNodeId(row[0]);
    const target = normalizeNodeId(row[1]);
    if (source === null || target === null) continue;

    const weight = normalizeWeight(row[2]);
    if (weight === 0) continue;

    const metadata = row.length > 3 ? row.slice(3) : null;
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

function collectIncidentEdges(outgoingAdjacency, incomingAdjacency, nodeId) {
  const selectedNodeId = normalizeNodeId(nodeId);
  if (selectedNodeId === null) return [];

  const byPair = new Map();

  function merge(edge, direction) {
    if (!edge) return;
    const source = normalizeNodeId(edge.sourceNodeId !== undefined ? edge.sourceNodeId : edge.source);
    const target = normalizeNodeId(edge.targetNodeId !== undefined ? edge.targetNodeId : edge.target);
    if (source === null || target === null) return;

    const neighborNodeId = direction === 'outgoing' ? target : source;
    const key = edgeKey(selectedNodeId, neighborNodeId);
    const weight = normalizeWeight(edge.weight);
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
        weight: weight,
        outgoingWeight: null,
        incomingWeight: null,
        directions: [],
        directedEdges: []
      };
      byPair.set(key, visualEdge);
    }

    if (direction === 'outgoing') {
      visualEdge.outgoingWeight = weight;
    } else {
      visualEdge.incomingWeight = weight;
    }
    visualEdge.weight = Math.max(normalizeWeight(visualEdge.weight), weight);
    if (!visualEdge.directions.includes(direction)) {
      visualEdge.directions.push(direction);
    }
    visualEdge.directedEdges.push({
      direction,
      sourceNodeId: source,
      targetNodeId: target,
      weight,
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

  if (topN !== null && Number.isFinite(topN) && topN > 0) {
    return filtered
      .slice()
      .sort((a, b) => normalizeWeight(b.weight) - normalizeWeight(a.weight))
      .slice(0, topN);
  }

  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 0;
  return filtered.filter((edge) => normalizeWeight(edge.weight) >= threshold);
}

module.exports = {
  buildSparseAdjacencyRows,
  collectIncidentEdges,
  filterIncidentEdges
};
