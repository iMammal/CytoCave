const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  buildSparseAdjacencyRows,
  collectIncidentEdges,
  filterIncidentEdges
} = require('../js/incidentEdges');

function build(edgeRows, options = {}) {
  return buildSparseAdjacencyRows(edgeRows, {
    directed: options.directed !== false,
    nodeCount: options.nodeCount
  });
}

function incident(index, edgeRows, options = {}) {
  const adjacency = build(edgeRows, options);
  return collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, index);
}

test('outgoing-only node returns outgoing incident edge', () => {
  const edges = incident(1, [[1, 2, 4]]);

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 2);
  assert.equal(edges[0].outgoingWeight, 4);
  assert.equal(edges[0].incomingWeight, null);
  assert.deepEqual(edges[0].directions, ['outgoing']);
});

test('incoming-only node returns incoming incident edge', () => {
  const edges = incident(2, [[1, 2, 4]]);

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 1);
  assert.equal(edges[0].outgoingWeight, null);
  assert.equal(edges[0].incomingWeight, 4);
  assert.deepEqual(edges[0].directions, ['incoming']);
});

test('mixed incoming and outgoing node returns both sparse rows', () => {
  const edges = incident(1, [
    [1, 2, 4],
    [3, 1, 6]
  ]);

  assert.deepEqual(edges.map((edge) => edge.targetNodeId).sort(), [2, 3]);
  assert.equal(edges.find((edge) => edge.targetNodeId === 2).outgoingWeight, 4);
  assert.equal(edges.find((edge) => edge.targetNodeId === 3).incomingWeight, 6);
});

test('reciprocal directed pair renders as one visual edge with both directional weights', () => {
  const edges = incident(1, [
    [1, 2, 4],
    [2, 1, 7]
  ]);

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 2);
  assert.equal(edges[0].outgoingWeight, 4);
  assert.equal(edges[0].incomingWeight, 7);
  assert.equal(edges[0].weight, 7);
  assert.deepEqual(edges[0].directions.sort(), ['incoming', 'outgoing']);
});

test('undirected symmetric pair renders one visual edge per node pair', () => {
  const edges = incident(1, [
    [1, 2, 4],
    [2, 1, 4]
  ], { directed: false });

  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0].nodePair, [1, 2]);
});

test('threshold filtering keeps only incident edges meeting the threshold', () => {
  const edges = incident(1, [
    [1, 2, 1],
    [1, 3, 5],
    [4, 1, 2]
  ]);
  const filtered = filterIncidentEdges(edges, {
    selectedNodeId: 1,
    threshold: 2
  });

  assert.deepEqual(filtered.map((edge) => edge.targetNodeId).sort(), [3, 4]);
});

test('top-N filtering ranks merged incident edges by visual weight', () => {
  const edges = incident(1, [
    [1, 2, 5],
    [1, 3, 2],
    [4, 1, 8]
  ]);
  const filtered = filterIncidentEdges(edges, {
    selectedNodeId: 1,
    topN: 2
  });

  assert.deepEqual(filtered.map((edge) => edge.targetNodeId), [4, 2]);
});

test('ipsilateral and contralateral filters use visual target hemisphere', () => {
  const edges = incident(1, [
    [1, 2, 5],
    [3, 1, 7]
  ]);
  const dataset = {
    1: { hemisphere: 'left' },
    2: { hemisphere: 'left' },
    3: { hemisphere: 'right' }
  };

  const ipsiOnly = filterIncidentEdges(edges, {
    selectedNodeId: 1,
    dataset,
    enableIpsi: true,
    enableContra: false
  });
  const contraOnly = filterIncidentEdges(edges, {
    selectedNodeId: 1,
    dataset,
    enableIpsi: false,
    enableContra: true
  });

  assert.deepEqual(ipsiOnly.map((edge) => edge.targetNodeId), [2]);
  assert.deepEqual(contraOnly.map((edge) => edge.targetNodeId), [3]);
});

test('self-loop is retained as a single visual edge', () => {
  const edges = incident(0, [[0, 0, 9]]);

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 0);
  assert.deepEqual(edges[0].nodePair, [0, 0]);
});

test('node index 0 is a valid incident-edge source and target', () => {
  const edges = incident(0, [
    [0, 2, 3],
    [4, 0, 6]
  ]);

  assert.deepEqual(edges.map((edge) => edge.targetNodeId).sort(), [2, 4]);
});

test('large sparse graph builds only populated adjacency rows', () => {
  const adjacency = build([
    [0, 63999, 3],
    [42000, 7, 4],
    [13, 13, 5]
  ], { nodeCount: 64000 });

  assert.deepEqual(Object.keys(adjacency.outgoingAdjacency).sort(), ['0', '13', '42000']);
  assert.deepEqual(Object.keys(adjacency.incomingAdjacency).sort(), ['13', '63999', '7']);
  assert.equal(collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, 7).length, 1);
});

test('adjacency index is built once and reused across selections', () => {
  let buildCount = 0;
  const adjacency = build([
    [1, 2, 3],
    [3, 1, 4]
  ]);
  buildCount += 1;

  collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, 1);
  collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, 2);
  collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, 3);

  assert.equal(buildCount, 1);
});

test('selected incident-edge rendering does not scan connection matrix rows', () => {
  const previewArea = fs.readFileSync(path.join(__dirname, '..', 'js', 'previewArea.js'), 'utf8');
  const drawStart = previewArea.indexOf('this.drawEdgesGivenNode = function');
  const drawEnd = previewArea.indexOf('this.removeEdgesGivenNode = function');
  assert.ok(drawStart >= 0, 'drawEdgesGivenNode should exist');
  assert.ok(drawEnd > drawStart, 'removeEdgesGivenNode should follow drawEdgesGivenNode');

  const drawBody = previewArea.slice(drawStart, drawEnd);
  assert.match(drawBody, /getIncidentEdgesByNode/);
  assert.doesNotMatch(drawBody, /getConnectionMatrixRow/);
});
