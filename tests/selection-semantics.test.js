const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  firstPickableNodeIntersection,
  hasNodeIndex,
  isAnnotationPresentationObject,
  isPickableNodeIntersection,
  markAnnotationObjectNonPickable,
  normalizeSelectionMode,
  selectionTransition,
  shouldReplaceSelection
} = require('../js/selectionSemantics');

function nodeIntersection(instanceId = 0) {
  return {
    instanceId,
    object: {
      name: {
        type: 'region',
        group: 0,
        hemisphere: 'left'
      },
      getDatasetIndex() {
        return instanceId;
      }
    }
  };
}

test('node index detection accepts zero', () => {
  assert.equal(hasNodeIndex(0), true);
  assert.equal(hasNodeIndex('0'), true);
  assert.equal(hasNodeIndex(null), false);
  assert.equal(hasNodeIndex(undefined), false);
  assert.equal(hasNodeIndex(''), false);
});

test('annotation decoration objects are explicitly non-pickable', () => {
  const decoration = { userData: {}, raycast() { return 'old'; } };
  markAnnotationObjectNonPickable(decoration, 'annotation-halo');

  assert.equal(isAnnotationPresentationObject(decoration), true);
  assert.equal(decoration.userData.pickable, false);
  assert.equal(decoration.userData.annotationRole, 'annotation-halo');
  assert.equal(decoration.raycast(), undefined);
  assert.equal(isPickableNodeIntersection({ instanceId: 0, object: decoration }), false);
});

test('pick filtering skips annotation objects and returns real node intersections', () => {
  const decoration = markAnnotationObjectNonPickable({
    userData: {},
    name: { type: 'annotation' },
    raycast() {}
  }, 'annotation-callout');
  const node = nodeIntersection(0);

  assert.equal(isPickableNodeIntersection(node), true);
  assert.equal(firstPickableNodeIntersection([
    { instanceId: 0, object: decoration },
    node
  ]), node);
});

test('REST session selection uses the canonical drawing selection adapter', () => {
  const restSession = fs.readFileSync(path.join(__dirname, '..', 'js', 'restSession.js'), 'utf8');
  assert.match(restSession, /selectNodeByIndex/);
  assert.doesNotMatch(restSession, /applySelectedNode/);
});

test('mouse selection presentation update is local and not bidirectional REST emission', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const restSession = fs.readFileSync(path.join(__dirname, '..', 'js', 'restSession.js'), 'utf8');

  assert.match(drawing, /cytocave-node-selected/);
  assert.match(restSession, /applyLocalSelectionPresentation/);
  assert.doesNotMatch(restSession, /\/interaction\/select-node/);
});

test('selection implementation does not shadow the nodeIndex parameter', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const selectionStart = drawing.indexOf('const updateNodeSelection =');
  const selectionEnd = drawing.indexOf('const selectNodeByIndex =');
  assert.ok(selectionStart >= 0, 'updateNodeSelection should exist');
  assert.ok(selectionEnd > selectionStart, 'selectNodeByIndex should follow updateNodeSelection');

  const selectionBody = drawing.slice(selectionStart, selectionEnd);
  assert.doesNotMatch(selectionBody, /\b(?:let|const|var)\s+nodeIndex\s*=/);
  assert.doesNotMatch(selectionBody, /\bselectedNodeIndex\b/);
  assert.match(selectionBody, /\bdatasetNodeIndex\b/);
});

test('selection transition keeps additive mouse selection and toggles one target', () => {
  const addB = selectionTransition([1], 2, {
    replaceSelection: false,
    toggleSelected: true
  });

  assert.equal(addB.action, 'select');
  assert.deepEqual(addB.selectedAfter, [1, 2]);

  const removeA = selectionTransition([1, 2], 1, {
    replaceSelection: false,
    toggleSelected: true
  });

  assert.equal(removeA.action, 'deselect');
  assert.deepEqual(removeA.selectedAfter, [2]);
});

test('selection transition replacement clears previous nodes and keeps node zero valid', () => {
  const replaceWithZero = selectionTransition([2, 3], 0, {
    replaceSelection: true,
    toggleSelected: true
  });

  assert.equal(replaceWithZero.action, 'select');
  assert.deepEqual(replaceWithZero.selectedAfter, [0]);

  const keepSelectedWithoutToggle = selectionTransition([0, 2], '0', {
    replaceSelection: false,
    toggleSelected: false
  });

  assert.equal(keepSelectedWithoutToggle.action, 'select');
  assert.deepEqual(keepSelectedWithoutToggle.selectedAfter, [0, 2]);
});

test('selection replacement defaults follow mode and honor per-call overrides', () => {
  assert.equal(normalizeSelectionMode(undefined), 'additive');
  assert.equal(normalizeSelectionMode('replace'), 'replace');
  assert.equal(normalizeSelectionMode('unknown'), 'additive');

  assert.equal(shouldReplaceSelection({}, 'additive'), false);
  assert.equal(shouldReplaceSelection({}, 'replace'), true);
  assert.equal(shouldReplaceSelection({ replaceSelection: true }, 'additive'), true);
  assert.equal(shouldReplaceSelection({ replaceSelection: false }, 'replace'), false);
});

test('mouse selection uses session-controlled mode while programmatic selection remains replace by default', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const restSession = fs.readFileSync(path.join(__dirname, '..', 'js', 'restSession.js'), 'utf8');

  assert.match(drawing, /var selectionMode = 'additive'/);
  assert.match(drawing, /shouldReplaceSelection\(options,\s*selectionMode\)/);
  assert.match(drawing, /const setSelectionMode = function/);
  assert.match(restSession, /selectionModeToggle/);
  assert.match(restSession, /\/view\/selection-mode/);
  assert.match(restSession, /selected\.replaceSelection !== false/);
});

test('mouse selection keeps additive toggle branch for selected nodes', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const selectionStart = drawing.indexOf('const updateNodeSelection =');
  const selectionEnd = drawing.indexOf('const selectNodeByIndex =');
  const selectionBody = drawing.slice(selectionStart, selectionEnd);

  assert.match(selectionBody, /const toggleSelected = options\.toggleSelected !== false/);
  assert.match(selectionBody, /transition\.action === 'deselect'/);
  assert.match(selectionBody, /removeEdgesGivenNodeFromScenes\(datasetNodeIndex\)/);
  assert.match(selectionBody, /emitLocalNodeSelection\(datasetNodeIndex,\s*isLeft,\s*false\)/);
});

test('selection resolves each viewport from canonical dataset node id', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const selectionStart = drawing.indexOf('const updateNodeSelection =');
  const selectionEnd = drawing.indexOf('const selectNodeByIndex =');
  const selectionBody = drawing.slice(selectionStart, selectionEnd);

  assert.match(selectionBody, /const leftIntersection = localNodeIntersection\(previewAreaLeft,\s*datasetNodeIndex\)/);
  assert.match(selectionBody, /const rightIntersection = localNodeIntersection\(previewAreaRight,\s*datasetNodeIndex\)/);
  assert.match(selectionBody, /setNodeSelectedInPreview\(previewAreaLeft,\s*leftIntersection\)/);
  assert.match(selectionBody, /setNodeSelectedInPreview\(previewAreaRight,\s*rightIntersection\)/);
  assert.doesNotMatch(selectionBody, /previewAreaRight\.updateNodeGeometry\(sourceIntersection/);
  assert.doesNotMatch(selectionBody, /previewAreaLeft\.updateNodeGeometry\(sourceIntersection/);
  assert.doesNotMatch(selectionBody, /=\s*previewArea(?:Left|Right)\.updateNodeGeometry/);
});

test('canonical dataset node id drives info panel, edge lookup, and event emission', () => {
  const drawing = fs.readFileSync(path.join(__dirname, '..', 'js', 'drawing.js'), 'utf8');
  const selectionStart = drawing.indexOf('const updateNodeSelection =');
  const selectionEnd = drawing.indexOf('const selectNodeByIndex =');
  const selectionBody = drawing.slice(selectionStart, selectionEnd);

  assert.match(selectionBody, /setNodeInfoPanel\(model\.getRegionByIndex\(datasetNodeIndex\),\s*datasetNodeIndex\)/);
  assert.match(selectionBody, /drawIncidentEdgesForNode\(model,\s*datasetNodeIndex,\s*isLeft,\s*\{/);
  assert.match(selectionBody, /emitLocalNodeSelection\(datasetNodeIndex,\s*isLeft,\s*true\)/);
  assert.doesNotMatch(selectionBody, /drawIncidentEdgesForNode\(model,\s*(?:sourceInstanceId|instanceId)/);
});

test('preview area dataset lookup searches glyph shape instance ids independently', () => {
  const previewArea = fs.readFileSync(path.join(__dirname, '..', 'js', 'previewArea.js'), 'utf8');
  const lookupStart = previewArea.indexOf('this.getNodeInstanceByIndex = function');
  const lookupEnd = previewArea.indexOf('this.getActiveEdges = function');
  const lookupBody = previewArea.slice(lookupStart, lookupEnd);

  assert.match(lookupBody, /const glyphShapes = shapeKeysForGroup\(groupOf\)/);
  assert.match(lookupBody, /getNodesInstanceFromDatasetIndex\(index\)/);
  assert.doesNotMatch(lookupBody, /else if \(rightHemisphere\.getNodesInstanceFromDatasetIndex\)/);
});

test('annotation creation is kept separate from native selection mutation', () => {
  const restSession = fs.readFileSync(path.join(__dirname, '..', 'js', 'restSession.js'), 'utf8');
  const annotateStart = restSession.indexOf('function applyAnnotations');
  const annotateEnd = restSession.indexOf('function applyFocus');
  const annotationBody = restSession.slice(annotateStart, annotateEnd);

  assert.doesNotMatch(annotationBody, /selectNodeByIndex/);
  assert.doesNotMatch(annotationBody, /clearNodeSelection/);
});
