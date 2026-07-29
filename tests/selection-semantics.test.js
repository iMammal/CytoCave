const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const {
  firstPickableNodeIntersection,
  hasNodeIndex,
  isAnnotationPresentationObject,
  isPickableNodeIntersection,
  markAnnotationObjectNonPickable
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
