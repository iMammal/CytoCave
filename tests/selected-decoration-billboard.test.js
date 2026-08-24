const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function functionBody(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  const end = text.indexOf(endNeedle, start);
  assert.ok(start >= 0, `${startNeedle} should exist`);
  assert.ok(end > start, `${endNeedle} should follow ${startNeedle}`);
  return text.slice(start, end);
}

test('selected annotation halo and callout are sprite or double-sided overlay decorations', () => {
  const previewArea = source('js/previewArea.js');
  const haloBody = functionBody(previewArea, 'var createAnnotationHalo = function', 'var updateAnnotationHaloPosition');
  const selectedCalloutBody = functionBody(previewArea, 'var addNodeLabel = function', 'var addHoverNodeLabel');
  const materialHelperBody = functionBody(previewArea, 'var configureAnnotationOverlayMaterial = function', 'var configureAnnotationOverlayObject');
  const objectHelperBody = functionBody(previewArea, 'var configureAnnotationOverlayObject = function', 'var orientAnnotationOverlayToCamera');

  assert.match(haloBody, /new THREE\.SpriteMaterial/);
  assert.match(haloBody, /side:\s*THREE\.DoubleSide/);
  assert.match(haloBody, /configureAnnotationOverlayMaterial\(material\)/);
  assert.match(haloBody, /configureAnnotationOverlayObject\(sprite,\s*'annotation-halo'/);
  assert.match(selectedCalloutBody, /new THREE\.SpriteMaterial/);
  assert.match(selectedCalloutBody, /side:\s*THREE\.DoubleSide/);
  assert.match(selectedCalloutBody, /configureAnnotationOverlayMaterial\(mat\)/);
  assert.match(selectedCalloutBody, /configureAnnotationOverlayObject\(nodeLabelSprite,\s*'annotation-callout'/);
  assert.match(materialHelperBody, /material\.side = THREE\.DoubleSide/);
  assert.match(materialHelperBody, /material\.depthTest = false/);
  assert.match(materialHelperBody, /material\.depthWrite = false/);
  assert.match(objectHelperBody, /object\.frustumCulled = false/);
  assert.match(objectHelperBody, /object\.renderOrder = renderOrder \|\| 1000/);
  assert.match(objectHelperBody, /markAnnotationObjectNonPickable\(object,\s*role\)/);
});

test('selected decoration orientation is updated from each PreviewArea camera only', () => {
  const previewArea = source('js/previewArea.js');
  const orientBody = functionBody(previewArea, 'var orientAnnotationOverlayToCamera = function', 'var createAnnotationHalo = function');
  const haloUpdateBody = functionBody(previewArea, 'var updateAnnotationHaloPosition = function', 'var removeAnnotationHalo');
  const selectedLabelBody = functionBody(previewArea, 'var updateNodeLabelPosition = function', 'var updateHoverNodeLabelPosition');

  assert.match(orientBody, /object\.quaternion\.copy\(camera\.quaternion\)/);
  assert.doesNotMatch(orientBody, /previewAreaLeft|previewAreaRight|getCamera|syncCameraWith/);
  assert.match(haloUpdateBody, /orientAnnotationOverlayToCamera\(sprite\)/);
  assert.match(selectedLabelBody, /orientAnnotationOverlayToCamera\(nodeLabelSprite\)/);
});

test('render-loop decoration orientation does not touch REST state or issue requests', () => {
  const previewArea = source('js/previewArea.js');
  const updateBody = functionBody(previewArea, 'var updateAnnotationVisualPositions = function', 'this.focusNodeByIndex = function');
  const orientBody = functionBody(previewArea, 'var orientAnnotationOverlayToCamera = function', 'var createAnnotationHalo = function');

  assert.match(updateBody, /updateAnnotationHaloPosition\(nodeKey,\s*annotationHaloSprites\[nodeKey\]\)/);
  assert.match(updateBody, /updateNodeLabelPosition\(\)/);
  assert.match(updateBody, /updateHoverNodeLabelPosition\(\)/);
  assert.doesNotMatch(updateBody + orientBody, /fetch\(/);
  assert.doesNotMatch(updateBody + orientBody, /postJson/);
  assert.doesNotMatch(updateBody + orientBody, /sessionState|lastSessionState|annotations\.byNode|view\.selectedNode/);
});
