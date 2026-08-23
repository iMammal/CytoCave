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

test('frontend reconciliation applies glyph sizes to renderers and sliders without posting back', () => {
  const restSession = source('js/restSession.js');
  const applyBody = functionBody(restSession, 'function applyGlyphSizes', 'function applyAnnotations');

  assert.match(applyBody, /normalizeGlyphSizes\(state && state\.view && state\.view\.glyphSizes\)/);
  assert.match(applyBody, /preview\.setGlyphSize\(shape,\s*glyphSizes\[side\]\[shape\]\)/);
  assert.match(applyBody, /syncGlyphSizeSliders\(glyphSizes\)/);
  assert.doesNotMatch(applyBody, /postJson/);
  assert.doesNotMatch(applyBody, /fetch\(/);
  assert.doesNotMatch(applyBody, /setSessionGlyphSize/);
});

test('orientation reconciliation is field-sensitive and ignores glyph-size-only revisions', () => {
  const restSession = source('js/restSession.js');
  const start = restSession.indexOf('var lastOrientationKey = null;');
  const end = restSession.indexOf('function filterAnnotationsForSide', start);
  assert.ok(start >= 0, 'orientation state should exist');
  assert.ok(end > start, 'orientation functions should precede annotation helpers');

  const orientationModule = new Function(
    'previewAreaLeft',
    'previewAreaRight',
    `${restSession.slice(start, end)}; return { applyOrientation, orientationKeyForState };`
  );

  const leftCamera = { name: 'left-camera', position: { x: 1 }, zoom: 1 };
  const rightCamera = { name: 'right-camera', position: { x: 10 }, zoom: 2 };
  const calls = [];
  const previewLeft = {
    getCamera: () => leftCamera,
    syncCameraWith: (camera) => {
      calls.push(['left', camera.name]);
      leftCamera.name = camera.name;
    }
  };
  const previewRight = {
    getCamera: () => rightCamera,
    syncCameraWith: (camera) => {
      calls.push(['right', camera.name]);
      rightCamera.name = camera.name;
    }
  };

  const { applyOrientation } = orientationModule(previewLeft, previewRight);
  const baseState = {
    view: {
      layout: 'side-by-side',
      orientation: {
        synchronized: true,
        source: 'left'
      },
      glyphSizes: {
        left: { tetrahedron: 1 },
        right: { tetrahedron: 1 }
      },
      colorBy: { left: 'a', right: 'b' },
      selectedNode: null
    },
    annotations: { byNode: {} }
  };

  applyOrientation(baseState);
  assert.deepEqual(calls, [['right', 'left-camera']]);
  calls.length = 0;
  rightCamera.name = 'right-camera-distinct';

  applyOrientation({
    ...baseState,
    revision: 'glyph-size-only',
    view: {
      ...baseState.view,
      glyphSizes: {
        left: { tetrahedron: 1.5 },
        right: { tetrahedron: 1 }
      }
    }
  });
  assert.deepEqual(calls, []);
  assert.equal(leftCamera.name, 'left-camera');
  assert.equal(rightCamera.name, 'right-camera-distinct');

  applyOrientation({
    ...baseState,
    revision: 'annotation-selection-color-only',
    view: {
      ...baseState.view,
      selectedNode: { nodeId: '1', viewport: 'left' },
      colorBy: { left: 'c', right: 'd' }
    },
    annotations: {
      byNode: {
        1: { nodeId: '1', viewport: 'left', text: 'note' }
      }
    }
  });
  assert.deepEqual(calls, []);

  applyOrientation({
    ...baseState,
    revision: 'layout-change',
    view: {
      ...baseState.view,
      layout: 'stacked'
    }
  });
  assert.deepEqual(calls, [['right', 'left-camera']]);
});

test('glyph size sliders preserve sphere/cube ids and use compact canonical labels', () => {
  const gui = source('js/GUI.js');

  assert.match(gui, /sphere:\s*"dimensionSliderLeft"/);
  assert.match(gui, /cube:\s*"dimensionSliderRight"/);
  assert.match(gui, /cube:\s*"Cube Size"/);
  assert.match(gui, /tetrahedron:\s*"Tetra Size"/);
  assert.match(gui, /icosahedron:\s*"Icosa Size"/);
  assert.match(gui, /star:\s*"Star Size"/);
  assert.doesNotMatch(gui, /Box Size/);
});

test('each glyph size slider updates only its shape and viewport', () => {
  const gui = source('js/GUI.js');
  const handlerBody = functionBody(gui, 'function handleGlyphSizeSliderChange', 'function addGlyphSizeSlider');
  const postBody = functionBody(gui, 'function postGlyphSize', 'function handleGlyphSizeSliderChange');

  assert.match(handlerBody, /setGlyphSizeFactor\(side,\s*canonicalShape,\s*value\)/);
  assert.match(handlerBody, /postGlyphSize\(side,\s*canonicalShape,\s*value\)/);
  assert.doesNotMatch(handlerBody, /enableLeftDimLock|enableRightDimLock|enableSphereDimLock|enableBoxDimLock/);
  assert.match(postBody, /"\/view\/glyph-size"/);
  assert.match(postBody, /viewport:\s*viewportForSide\(side\)/);
  assert.match(postBody, /shape:\s*shape/);
});

test('graphics utilities scale one canonical shape per viewport and rebuilt meshes inherit it', () => {
  const graphicsUtils = source('js/graphicsUtils.js');
  const previewArea = source('js/previewArea.js');

  assert.match(graphicsUtils, /var setGlyphSizeFactor = function\(side,\s*glyphShape,\s*value\)/);
  assert.match(graphicsUtils, /glyphGeometriesBySide\[normalizedSide\]\[shape\]\.scale\(val,\s*val,\s*val\)/);
  assert.match(graphicsUtils, /dimensionFactors\[normalizedSide\]\[shape\] = numericValue/);
  assert.match(graphicsUtils, /return glyphGeometriesBySide\[normalizedSide\]\[shape\]/);
  assert.match(previewArea, /getNormalGeometry\(glyphShape,\s*name\)/);
  assert.match(previewArea, /this\.setGlyphSize = function/);
});
