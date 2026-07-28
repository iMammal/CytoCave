const assert = require('assert');
const test = require('node:test');

const {
  collectIncidentEdges,
  filterIncidentEdgesForDisplay,
  isDirectedMatrix
} = require('../js/incidentEdges');

function edgePairs(edges) {
  return edges
    .map(edge => `${edge.sourceNodeId}->${edge.targetNodeId}:${edge.weight}`)
    .sort();
}

test('directed incident edges include outgoing-only nodes', () => {
  const matrix = [
    [0, 2, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  assert.equal(isDirectedMatrix(matrix), true);
  assert.deepEqual(edgePairs(collectIncidentEdges(matrix, 0)), ['0->1:2']);
});

test('directed incident edges include incoming-only nodes', () => {
  const matrix = [
    [0, 0, 0],
    [3, 0, 0],
    [0, 0, 0]
  ];

  const edges = collectIncidentEdges(matrix, 0);

  assert.deepEqual(edgePairs(edges), ['1->0:3']);
  assert.equal(edges[0].adjacentNodeId, 1);
});

test('directed incident edges include mixed incoming and outgoing nodes', () => {
  const matrix = [
    [0, 2, 0, 0],
    [0, 0, 0, 0],
    [4, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  assert.deepEqual(edgePairs(collectIncidentEdges(matrix, 0)), [
    '0->1:2',
    '2->0:4'
  ]);
});

test('undirected symmetric matrix does not draw every incident edge twice', () => {
  const matrix = [
    [1, 2, 0],
    [2, 0, 3],
    [0, 3, 0]
  ];

  assert.equal(isDirectedMatrix(matrix), false);
  assert.deepEqual(edgePairs(collectIncidentEdges(matrix, 0)), [
    '0->0:1',
    '0->1:2'
  ]);
});

test('incident edge threshold filtering preserves existing threshold semantics', () => {
  const matrix = [
    [0, 0.25, 0.75],
    [0.5, 0, 0],
    [0, 0, 0]
  ];

  const filtered = filterIncidentEdgesForDisplay(collectIncidentEdges(matrix, 0), {
    threshold: 0.5
  });

  assert.deepEqual(edgePairs(filtered), [
    '0->2:0.75',
    '1->0:0.5'
  ]);
});

test('incident edge collection keeps node index zero valid', () => {
  const matrix = [
    [0, 1],
    [2, 0]
  ];

  const edges = collectIncidentEdges(matrix, '0');

  assert.deepEqual(edgePairs(edges), ['1->0:2']);
  assert.equal(edges[0].adjacentNodeId, 1);
});
