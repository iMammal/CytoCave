function hasNodeIndex(value) {
  return value !== undefined && value !== null && value !== '';
}

function matrixSize(matrix) {
  if (!matrix) return 0;
  if (typeof matrix.size === 'function') {
    const size = matrix.size();
    return Math.max(Number(size[0]) || 0, Number(size[1]) || 0);
  }
  if (Array.isArray(matrix)) {
    return matrix.length;
  }
  return 0;
}

function matrixValue(matrix, row, column) {
  if (!matrix) return 0;
  let value;
  if (typeof matrix.get === 'function') {
    value = matrix.get([row, column]);
  } else if (Array.isArray(matrix) && Array.isArray(matrix[row])) {
    value = matrix[row][column];
  }
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function visualEdgeKey(sourceNodeId, targetNodeId) {
  const source = Number(sourceNodeId);
  const target = Number(targetNodeId);
  return source <= target ? source + ':' + target : target + ':' + source;
}

function isDirectedMatrix(matrix) {
  const size = matrixSize(matrix);
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) {
      if (matrixValue(matrix, row, column) !== matrixValue(matrix, column, row)) {
        return true;
      }
    }
  }
  return false;
}

function addIncidentEdge(edgesByPair, selectedNodeId, sourceNodeId, targetNodeId, weight, direction) {
  const numericWeight = Number(weight || 0);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) return;

  const adjacentNodeId = sourceNodeId === selectedNodeId ? targetNodeId : sourceNodeId;
  const key = visualEdgeKey(sourceNodeId, targetNodeId);
  const edge = {
    sourceNodeId,
    targetNodeId,
    adjacentNodeId,
    weight: numericWeight,
    direction
  };
  const existing = edgesByPair.get(key);

  if (!existing || edge.weight > existing.weight) {
    edgesByPair.set(key, edge);
  }
}

function collectIncidentEdges(matrix, nodeIndex, options = {}) {
  if (!hasNodeIndex(nodeIndex)) return [];

  const selectedNodeId = Number(nodeIndex);
  if (!Number.isFinite(selectedNodeId) || selectedNodeId < 0) return [];

  const size = matrixSize(matrix);
  if (selectedNodeId >= size) return [];

  const directed = Object.prototype.hasOwnProperty.call(options, 'directed')
    ? !!options.directed
    : isDirectedMatrix(matrix);
  const edgesByPair = new Map();

  for (let targetNodeId = 0; targetNodeId < size; targetNodeId++) {
    addIncidentEdge(
      edgesByPair,
      selectedNodeId,
      selectedNodeId,
      targetNodeId,
      matrixValue(matrix, selectedNodeId, targetNodeId),
      'outgoing'
    );
  }

  if (directed) {
    for (let sourceNodeId = 0; sourceNodeId < size; sourceNodeId++) {
      addIncidentEdge(
        edgesByPair,
        selectedNodeId,
        sourceNodeId,
        selectedNodeId,
        matrixValue(matrix, sourceNodeId, selectedNodeId),
        'incoming'
      );
    }
  }

  return Array.from(edgesByPair.values());
}

function filterIncidentEdgesForDisplay(edges, options = {}) {
  const incidentEdges = Array.isArray(edges) ? edges.slice() : [];
  const topN = options.topN;

  if (topN !== undefined && topN !== null) {
    return incidentEdges
      .sort((left, right) => right.weight - left.weight)
      .slice(0, Number(topN));
  }

  const threshold = Number(options.threshold || 0);
  return incidentEdges.filter(edge => edge.weight >= threshold);
}

module.exports = {
  collectIncidentEdges,
  filterIncidentEdgesForDisplay,
  isDirectedMatrix,
  matrixSize,
  matrixValue,
  visualEdgeKey
};
