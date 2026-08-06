const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  buildIncidentEdgeDebugReport,
  buildIncidentEdgeLookupDebugReport,
  buildSparseAdjacencyRows,
  compareEdgeStrength,
  collectIncidentEdges,
  edgePassesThreshold,
  filterIncidentEdges,
  normalizeEdgeValueMode
} = require('../js/incidentEdges');

function build(edgeRows, options = {}) {
  return buildSparseAdjacencyRows(edgeRows, {
    directed: options.directed !== false,
    nodeCount: options.nodeCount
  });
}

function incident(index, edgeRows, options = {}) {
  const adjacency = build(edgeRows, options);
  return collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, index, options.edgeValueMode);
}

test('similarity mode thresholds high values and sorts descending', () => {
  assert.equal(edgePassesThreshold({ value: 0.8 }, 0.5, 'similarity'), true);
  assert.equal(edgePassesThreshold({ value: 0.2 }, 0.5, 'similarity'), false);

  const ordered = [{ value: 0.2 }, { value: 0.9 }, { value: 0.5 }]
    .sort((a, b) => compareEdgeStrength(a, b, 'similarity'))
    .map((edge) => edge.value);
  assert.deepEqual(ordered, [0.9, 0.5, 0.2]);
});

test('distance mode thresholds low values, preserves zero, and sorts ascending', () => {
  assert.equal(edgePassesThreshold({ value: 0.2 }, 0.5, 'distance'), true);
  assert.equal(edgePassesThreshold({ value: 0.8 }, 0.5, 'distance'), false);
  assert.equal(edgePassesThreshold({ value: 0 }, 0, 'distance'), true);

  const ordered = [{ value: 0.2 }, { value: 0 }, { value: 0.5 }]
    .sort((a, b) => compareEdgeStrength(a, b, 'distance'))
    .map((edge) => edge.value);
  assert.deepEqual(ordered, [0, 0.2, 0.5]);
});

test('binary mode uses edge record presence and ignores numeric thresholds', () => {
  assert.equal(edgePassesThreshold({ value: 0 }, 100, 'binary'), true);
  const edges = incident(1, [[1, 2, 0]], { edgeValueMode: 'binary' });

  assert.equal(edges.length, 1);
  const filtered = filterIncidentEdges(edges, {
    selectedNodeId: 1,
    threshold: 100,
    edgeValueMode: 'binary'
  });
  assert.equal(filtered.length, 1);
});

test('absent edge value mode defaults to similarity', () => {
  assert.equal(normalizeEdgeValueMode(), 'similarity');
  assert.equal(edgePassesThreshold({ value: 0.2 }, 0.5), false);
});

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
    threshold: 2,
    edgeValueMode: 'similarity'
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
    topN: 2,
    edgeValueMode: 'similarity'
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

test('explicit zero-valued outgoing edge remains present', () => {
  const edges = incident(36, [[36, 105, 0]], { edgeValueMode: 'distance' });

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 105);
  assert.equal(edges[0].outgoingValue, 0);
});

test('object edge records use presence rather than value truthiness', () => {
  const edges = incident(36, [
    { source: 36, target: 105, value: 0 }
  ], { edgeValueMode: 'distance' });

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 105);
  assert.equal(edges[0].value, 0);
});

test('explicit zero-valued incoming edge remains present', () => {
  const edges = incident(36, [[105, 36, 0]], { edgeValueMode: 'distance' });

  assert.equal(edges.length, 1);
  assert.equal(edges[0].targetNodeId, 105);
  assert.equal(edges[0].incomingValue, 0);
});

test('missing edge remains absent when zero-valued records exist elsewhere', () => {
  const adjacency = build([[36, 105, 0]], { edgeValueMode: 'distance' });

  assert.equal(collectIncidentEdges(adjacency.outgoingAdjacency, adjacency.incomingAdjacency, 7, 'distance').length, 0);
});

test('reciprocal zero-valued edges deduplicate and retain both directions', () => {
  const edges = incident(36, [
    [36, 105, 0],
    [105, 36, 0]
  ], { edgeValueMode: 'distance' });

  assert.equal(edges.length, 1);
  assert.equal(edges[0].outgoingValue, 0);
  assert.equal(edges[0].incomingValue, 0);
  assert.deepEqual(edges[0].directions.sort(), ['incoming', 'outgoing']);
});

test('node index 0 is a valid incident-edge source and target', () => {
  const edges = incident(0, [
    [0, 2, 0],
    [4, 0, 0]
  ], { edgeValueMode: 'distance' });

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

test('incident-edge debug report includes staged counts and neighbor samples', () => {
  const adjacency = build([
    [0, 1, 5],
    [1, 0, 7],
    [0, 2, 1],
    [3, 0, 9]
  ]);
  const incidentEdges = collectIncidentEdges(
    adjacency.outgoingAdjacency,
    adjacency.incomingAdjacency,
    0
  );
  const filterOptions = {
    selectedNodeId: 0,
    threshold: 6,
    edgeValueMode: 'similarity',
    enableIpsi: true,
    enableContra: true
  };
  const submittedEdges = filterIncidentEdges(incidentEdges, filterOptions);
  const report = buildIncidentEdgeDebugReport({
    selectedNodeId: 0,
    outgoingRecords: adjacency.outgoingAdjacency[0],
    incomingRecords: adjacency.incomingAdjacency[0],
    mergedEdges: incidentEdges,
    submittedEdges,
    filterOptions
  });

  assert.deepEqual(Object.keys(report.stages), [
    'rawOutgoingEdgeRecords',
    'rawIncomingEdgeRecords',
    'union',
    'afterReciprocalMerge',
    'afterHemisphereFilter',
    'afterThreshold',
    'afterTopNOrEdgeCountLimit',
    'submittedRenderList'
  ]);
  assert.equal(report.stages.rawOutgoingEdgeRecords.count, 2);
  assert.deepEqual(report.stages.rawOutgoingEdgeRecords.first20NeighborIds, [1, 2]);
  assert.equal(report.stages.rawIncomingEdgeRecords.count, 2);
  assert.deepEqual(report.stages.rawIncomingEdgeRecords.first20NeighborIds, [1, 3]);
  assert.equal(report.stages.union.count, 4);
  assert.deepEqual(report.stages.union.first20NeighborIds, [1, 2, 1, 3]);
  assert.equal(report.stages.afterReciprocalMerge.count, 3);
  assert.deepEqual(report.stages.afterReciprocalMerge.first20NeighborIds, [1, 2, 3]);
  assert.equal(report.stages.afterThreshold.count, 2);
  assert.deepEqual(report.stages.afterThreshold.first20NeighborIds, [1, 3]);
  assert.equal(report.stages.submittedRenderList.count, submittedEdges.length);
  assert.deepEqual(report.firstCountCollapse, {
    from: 'union',
    to: 'afterReciprocalMerge',
    fromCount: 4,
    toCount: 3,
    droppedCount: 1,
    missingNeighborIdsFirst20: []
  });
});

test('sparse adjacency diagnostics report construction key space and sample nodes', () => {
  const adjacency = build([
    [36, 3657, 0],
    [3657, 6452, 1],
    [6452, 36, 2],
    ['source', 'target', 'value']
  ], { nodeCount: 10000 });
  const diagnostics = adjacency.diagnostics;

  assert.equal(diagnostics.totalEdgeRecordsRead, 4);
  assert.equal(diagnostics.validEdgeRecords, 3);
  assert.equal(diagnostics.skippedEdgeRecords, 1);
  assert.equal(diagnostics.outgoingAdjacencyKeyCount, 3);
  assert.equal(diagnostics.incomingAdjacencyKeyCount, 3);
  assert.equal(diagnostics.minSourceId, 36);
  assert.equal(diagnostics.maxSourceId, 6452);
  assert.equal(diagnostics.minTargetId, 36);
  assert.equal(diagnostics.maxTargetId, 6452);
  assert.equal(diagnostics.keySpace, 'dataset-row-index/canonical-node-id');
  assert.equal(diagnostics.keysAreViewportInstanceIds, false);
  assert.deepEqual(diagnostics.samples.map((sample) => sample.nodeId), [36, 3657, 6452]);
});

test('lookup diagnostics compare canonical node id with source instance id', () => {
  const adjacency = build([
    [3657, 105, 0],
    [220, 3657, 0],
    [69, 70, 1]
  ], { nodeCount: 10000 });
  const diagnostics = buildIncidentEdgeLookupDebugReport({
    canonicalNodeId: 3657,
    sourceInstanceId: 69,
    resolvedInstanceId: 69,
    resolvedDatasetNodeId: 3657,
    outgoingAdjacency: adjacency.outgoingAdjacency,
    incomingAdjacency: adjacency.incomingAdjacency,
    modelSide: 'Left',
    sourceViewportSide: 'left',
    renderViewportSide: 'left'
  });

  assert.deepEqual(diagnostics.mappingChain, {
    renderedInstanceId: 69,
    datasetCanonicalNodeId: 3657,
    adjacencyKey: 3657
  });
  assert.deepEqual(diagnostics.canonicalLookup, {
    outgoingCount: 1,
    incomingCount: 1
  });
  assert.deepEqual(diagnostics.sourceInstanceLookup, {
    outgoingCount: 1,
    incomingCount: 0
  });
  assert.equal(diagnostics.adjacencyKeyUsedForRenderLookup, 3657);
});

test('headerless triple edge rows preserve node 3657 outgoing-only runtime lookup', () => {
  const edgeRows = [];
  for (let i = 0; i < 20; i++) {
    edgeRows.push([3657, 5000 + i, 0]);
  }
  edgeRows.push([69, 70, 1]);
  edgeRows.push([70, 69, 1]);

  const adjacency = build(edgeRows, { nodeCount: 21760 });
  const incidentEdges = collectIncidentEdges(
    adjacency.outgoingAdjacency,
    adjacency.incomingAdjacency,
    3657,
    'distance'
  );
  const diagnostics = buildIncidentEdgeLookupDebugReport({
    canonicalNodeId: 3657,
    sourceInstanceId: 69,
    resolvedInstanceId: 69,
    resolvedDatasetNodeId: 3657,
    outgoingAdjacency: adjacency.outgoingAdjacency,
    incomingAdjacency: adjacency.incomingAdjacency,
    sparseAdjacencyDiagnostics: adjacency.diagnostics
  });

  assert.equal(adjacency.diagnostics.totalEdgeRecordsRead, 22);
  assert.equal(adjacency.diagnostics.minSourceId, 69);
  assert.equal(adjacency.diagnostics.maxSourceId, 3657);
  assert.equal(adjacency.diagnostics.minTargetId, 69);
  assert.equal(adjacency.diagnostics.maxTargetId, 5019);
  assert.equal(adjacency.outgoingAdjacency[3657].length, 20);
  assert.equal(adjacency.incomingAdjacency[3657], undefined);
  assert.equal(incidentEdges.length, 20);
  assert.deepEqual(diagnostics.canonicalLookup, {
    outgoingCount: 20,
    incomingCount: 0
  });
  assert.deepEqual(diagnostics.sourceInstanceLookup, {
    outgoingCount: 1,
    incomingCount: 1
  });
});

test('lookup diagnostics keep node zero valid', () => {
  const adjacency = build([
    [0, 105, 0],
    [220, 0, 0]
  ], { nodeCount: 10000 });
  const diagnostics = buildIncidentEdgeLookupDebugReport({
    canonicalNodeId: 0,
    sourceInstanceId: 0,
    resolvedInstanceId: 0,
    resolvedDatasetNodeId: 0,
    outgoingAdjacency: adjacency.outgoingAdjacency,
    incomingAdjacency: adjacency.incomingAdjacency
  });

  assert.deepEqual(diagnostics.canonicalLookup, {
    outgoingCount: 1,
    incomingCount: 1
  });
  assert.deepEqual(diagnostics.mappingChain, {
    renderedInstanceId: 0,
    datasetCanonicalNodeId: 0,
    adjacencyKey: 0
  });
});

test('independent sparse adjacency indexes do not share left and right rows', () => {
  const left = build([[3657, 1, 5]], { nodeCount: 10000 });
  const right = build([[2, 3657, 7]], { nodeCount: 10000 });

  assert.notEqual(left.outgoingAdjacency, right.outgoingAdjacency);
  assert.notEqual(left.incomingAdjacency, right.incomingAdjacency);
  assert.equal(left.outgoingAdjacency[3657].length, 1);
  assert.equal(left.incomingAdjacency[3657], undefined);
  assert.equal(right.outgoingAdjacency[3657], undefined);
  assert.equal(right.incomingAdjacency[3657].length, 1);
});

test('incident-edge debug report mirrors top-N mode without applying threshold first', () => {
  const adjacency = build([
    [0, 1, 1],
    [0, 2, 9],
    [0, 3, 8]
  ]);
  const incidentEdges = collectIncidentEdges(
    adjacency.outgoingAdjacency,
    adjacency.incomingAdjacency,
    0
  );
  const filterOptions = {
    selectedNodeId: 0,
    threshold: 10,
    topN: 2,
    edgeValueMode: 'similarity'
  };
  const submittedEdges = filterIncidentEdges(incidentEdges, filterOptions);
  const report = buildIncidentEdgeDebugReport({
    selectedNodeId: 0,
    outgoingRecords: adjacency.outgoingAdjacency[0],
    incomingRecords: adjacency.incomingAdjacency[0],
    mergedEdges: incidentEdges,
    submittedEdges,
    filterOptions
  });

  assert.equal(report.thresholdApplied, false);
  assert.equal(report.stages.afterThreshold.count, 3);
  assert.deepEqual(report.stages.afterTopNOrEdgeCountLimit.first20NeighborIds, [2, 3]);
  assert.deepEqual(report.stages.submittedRenderList.first20NeighborIds, [2, 3]);
});

test('selected incident-edge rendering emits pipeline debug report under selection debug', () => {
  const previewArea = fs.readFileSync(path.join(__dirname, '..', 'js', 'previewArea.js'), 'utf8');
  const drawStart = previewArea.indexOf('this.drawEdgesGivenNode = function');
  const drawEnd = previewArea.indexOf('this.removeEdgesGivenNode = function');
  const drawBody = previewArea.slice(drawStart, drawEnd);

  assert.match(drawBody, /CYTOCAVE_SELECTION_DEBUG/);
  assert.match(drawBody, /cytocave-incident-edge-pipeline/);
  assert.match(drawBody, /buildIncidentEdgeDebugReport/);
});
