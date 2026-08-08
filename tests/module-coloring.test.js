const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', ...relativePath.split('/')), 'utf8');
}

test('color-group changes establish palette before rebuilding viewport meshes', () => {
  const drawing = readSource('js/drawing.js');
  const start = drawing.indexOf('var changeColorGroup = function');
  const end = drawing.indexOf('/* Instead of two functions', start);
  assert.ok(start >= 0, 'changeColorGroup should exist');
  assert.ok(end > start, 'changeColorGroup body should be bounded');

  const body = drawing.slice(start, end);
  const leftSetGroup = body.indexOf('modelLeft.setActiveGroup(name)');
  const leftSetScale = body.indexOf('setColorGroupScale(modelLeft)');
  const leftDraw = body.indexOf('previewAreaLeft.drawRegions()');
  const rightSetGroup = body.indexOf('modelRight.setActiveGroup(name)');
  const rightSetScale = body.indexOf('setColorGroupScale(modelRight)');
  const rightDraw = body.indexOf('previewAreaRight.drawRegions()');

  assert.ok(leftSetGroup >= 0 && leftSetGroup < leftSetScale, 'left active group should be set before palette');
  assert.ok(leftSetScale >= 0 && leftSetScale < leftDraw, 'left palette should be set before drawRegions');
  assert.ok(rightSetGroup >= 0 && rightSetGroup < rightSetScale, 'right active group should be set before palette');
  assert.ok(rightSetScale >= 0 && rightSetScale < rightDraw, 'right palette should be set before drawRegions');
  assert.doesNotMatch(body, /setColorGroupScale\(side\)/);
});

test('normal material cache is scoped by model, palette version, active group, and region group', () => {
  const graphicsUtils = readSource('js/graphicsUtils.js');

  assert.match(graphicsUtils, /import \{getColorGroupScaleVersion, scaleColorGroup\} from '\.\/utils\/scale'/);
  assert.match(graphicsUtils, /var materialGroupKey = function\(model, group\)/);
  assert.match(graphicsUtils, /getName \? model\.getName\(\) : "global"/);
  assert.match(graphicsUtils, /getActiveGroupName \? model\.getActiveGroupName\(\) : "default"/);
  assert.match(graphicsUtils, /return modelName \+ "\|" \+ activeGroup \+ "\|" \+ getColorGroupScaleVersion\(\) \+ "\|" \+ group/);
  assert.match(graphicsUtils, /var cacheKey = materialGroupKey\(model, group\)/);
  assert.match(graphicsUtils, /materialGroups\[cacheKey\]/);
  assert.match(graphicsUtils, /material\.color\.set\(color\)/);
  assert.doesNotMatch(graphicsUtils, /materialGroups\[group\]/);
});

test('palette version increments when the color scale is rebuilt', () => {
  const scale = readSource('js/utils/scale.js');
  const setScaleStart = scale.indexOf('var setColorGroupScale = function');
  const setScaleEnd = scale.indexOf('// return a power scale function', setScaleStart);
  assert.ok(setScaleStart >= 0, 'setColorGroupScale should exist');
  assert.ok(setScaleEnd > setScaleStart, 'setColorGroupScale body should be bounded');

  const body = scale.slice(setScaleStart, setScaleEnd);
  assert.match(scale, /var colorGroupScaleVersion = 0/);
  assert.match(body, /groupColor = \(model\.getActiveGroup\(\)\.length <= 10\) \? d3\.scale\.category10\(\) : d3\.scale\.category20\(\)/);
  assert.match(body, /colorGroupScaleVersion \+= 1/);
  assert.match(scale, /var getColorGroupScaleVersion = function \(\)/);
  assert.match(scale, /export \{scaleColorGroup,setColorGroupScale,getColorGroupScaleVersion\}/);
});

test('legend groups sort numeric identifiers numerically', () => {
  const gui = readSource('js/GUI.js');

  assert.match(gui, /var numericLegendValue = function\(value\)/);
  assert.match(gui, /Number\.isFinite\(numberValue\)/);
  assert.match(gui, /var compareLegendGroups = function\(a, b\)/);
  assert.match(gui, /return numberA - numberB/);
  assert.match(gui, /activeGroup\.sort\(compareLegendGroups\)/);
  assert.doesNotMatch(gui, /typeof\(activeGroup\[0\]\.name\)/);
});

test('numeric-looking module labels sort 1 through 16 and textual labels stay lexical', () => {
  const numericLegendValue = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };
  const compareLegendGroups = (a, b) => {
    const numberA = numericLegendValue(a);
    const numberB = numericLegendValue(b);

    if (numberA !== null && numberB !== null) {
      return numberA - numberB;
    }

    return String(a).localeCompare(String(b));
  };

  assert.deepEqual(
    ['10', '2', '1', '16', '9', '11', '3', '15', '5', '13', '7', '4', '14', '6', '12', '8'].sort(compareLegendGroups),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
  );
  assert.deepEqual(['Temporal', 'Frontal', 'Occipital'].sort(compareLegendGroups), ['Frontal', 'Occipital', 'Temporal']);
});

test('sixteen module groups use the category20 palette path', () => {
  const scale = readSource('js/utils/scale.js');

  assert.match(scale, /model\.getActiveGroup\(\)\.length <= 10\) \? d3\.scale\.category10\(\) : d3\.scale\.category20\(\)/);
  assert.doesNotMatch(scale, /model\.getActiveGroup\(\)\.length <= 16\) \? d3\.scale\.category10/);
});
