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

test('hover presentation uses hover-only panel and callout APIs', () => {
  const drawing = source('js/drawing.js');
  const hoverBody = functionBody(drawing, 'var updateNodeMoveOver = function', '// callback to interact');

  assert.match(hoverBody, /updateHoverNodeInfo\(region,\s*nodeIdx\)/);
  assert.match(hoverBody, /updateHoverNodeLabelByIndex\(nodeIdx,\s*labeltext\)/);
  assert.doesNotMatch(hoverBody, /setNodeInfoPanel\(region,\s*nodeIdx\)/);
  assert.doesNotMatch(hoverBody, /updateNodeLabel\(labeltext/);
});

test('mouseout clears only transient hover presentation', () => {
  const drawing = source('js/drawing.js');
  const clearBody = functionBody(drawing, 'function clearHoverPresentation', '// callback on mouse moving');
  const hoverBody = functionBody(drawing, 'var updateNodeMoveOver = function', '// callback to interact');

  assert.match(clearBody, /clearHoverNodeInfo\(\)/);
  assert.match(clearBody, /clearHoverNodeLabel\(\)/);
  assert.doesNotMatch(clearBody, /clearSelectedNodeLabel/);
  assert.doesNotMatch(clearBody, /clearNodeLabel/);
  assert.match(hoverBody, /if\(!intersectedObject \|\| !intersectedObject\.object\)/);
  assert.match(hoverBody, /clearHoverPresentation\(\)/);
});

test('selected annotation rendering is reconstructed only from session selected node and annotations', () => {
  const restSession = source('js/restSession.js');
  const renderBody = functionBody(restSession, 'function renderSelectedNodeAnnotation', 'function applyLocalSelectionPresentation');

  assert.match(renderBody, /var sideAnnotations = filterAnnotationsForSide\(state,\s*side\)/);
  assert.match(renderBody, /var selectedNodeId = selectedNodeForSide\(state,\s*side\)/);
  assert.match(renderBody, /var annotation = selectedNodeId \? sideAnnotations\[selectedNodeId\] : null/);
  assert.match(renderBody, /updateAnnotationDetailForSide\(state,\s*side,\s*sideAnnotations,\s*selectedNodeId\)/);
  assert.doesNotMatch(renderBody, /Object\.keys\(sideAnnotations\)\[0\]/);
});

test('selected annotated node gets persistent callout and unannotated selected node clears only selected callout', () => {
  const restSession = source('js/restSession.js');
  const renderBody = functionBody(restSession, 'function renderSelectedNodeAnnotation', 'function applyLocalSelectionPresentation');

  assert.match(renderBody, /selectedNodeId && annotation && preview\.updateSelectedNodeLabelByIndex/);
  assert.match(renderBody, /preview\.updateSelectedNodeLabelByIndex\(selectedNodeId,\s*annotation\)/);
  assert.match(renderBody, /preview\.clearSelectedNodeLabel\(\)/);
  assert.match(renderBody, /updateAnnotationDetailForSide\(state,\s*side,\s*sideAnnotations,\s*selectedNodeId\)/);
});

test('REST selected node changes and clearing selection drive persistent presentation', () => {
  const restSession = source('js/restSession.js');
  const applyBody = functionBody(restSession, 'function applyAnnotations', 'function applyFocusRequest');

  assert.match(applyBody, /selectedNode: selected \|\| null/);
  assert.match(applyBody, /renderSelectedNodeAnnotation\(state,\s*side\)/);
  assert.doesNotMatch(applyBody, /Object\.keys\(sideAnnotations\)\[0\]/);
});

test('local browser selection events cannot retarget persistent annotation away from REST selection', () => {
  const restSession = source('js/restSession.js');
  const localBody = functionBody(restSession, 'function applyLocalSelectionPresentation', 'function applySelection');

  assert.match(localBody, /var selectedNodeId = selectedNodeForSide\(lastSessionState,\s*side\)/);
  assert.match(localBody, /String\(selectedNodeId\) !== String\(detail\.nodeId\)/);
  assert.match(localBody, /renderSelectedNodeAnnotation\(lastSessionState,\s*side\)/);
  assert.doesNotMatch(localBody, /var selectedNodeId = detail\.selected === false/);
});

test('repeated hover events do not mutate REST selection or annotations', () => {
  const drawing = source('js/drawing.js');
  const hoverBody = functionBody(drawing, 'var updateNodeMoveOver = function', '// callback to interact');

  assert.doesNotMatch(hoverBody, /selectedNode/);
  assert.doesNotMatch(hoverBody, /annotations/);
  assert.doesNotMatch(hoverBody, /fetch\(/);
  assert.doesNotMatch(hoverBody, /postJson/);
});

test('hover and selected callout objects have separate anchors and remain non-pickable', () => {
  const previewArea = source('js/previewArea.js');

  assert.match(previewArea, /activeNodeLabelNode = null,\s*activeHoverNodeLabelNode = null/);
  assert.match(previewArea, /this\.clearHoverNodeLabel = function/);
  assert.match(previewArea, /this\.updateHoverNodeLabel = function/);
  assert.match(previewArea, /markAnnotationObjectNonPickable\(hoverNodeLabelSprite,\s*'hover-callout'\)/);
  assert.match(previewArea, /markAnnotationObjectNonPickable\(nodeLabelSprite,\s*'annotation-callout'\)/);
});
