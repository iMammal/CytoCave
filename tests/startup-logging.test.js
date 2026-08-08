const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

test('startup mesh creation does not log every node label or position', () => {
  const model = fs.readFileSync(path.join(__dirname, '..', 'js', 'model.js'), 'utf8');
  const previewArea = fs.readFileSync(path.join(__dirname, '..', 'js', 'previewArea.js'), 'utf8');

  const createGroupsStart = model.indexOf('this.createGroups = function');
  const createGroupsEnd = model.indexOf('this.updateClusteringGroupLevel = function');
  assert.ok(createGroupsStart >= 0, 'createGroups should exist');
  assert.ok(createGroupsEnd > createGroupsStart, 'createGroups should precede clustering updates');

  const drawRegionsStart = previewArea.indexOf('this.drawRegions = function');
  const drawRegionsEnd = previewArea.indexOf('//     this.drawRegions = function');
  assert.ok(drawRegionsStart >= 0, 'drawRegions should exist');
  assert.ok(drawRegionsEnd > drawRegionsStart, 'active drawRegions should precede archived implementation');

  const createGroupsBody = model.slice(createGroupsStart, createGroupsEnd);
  const drawRegionsBody = previewArea.slice(drawRegionsStart, drawRegionsEnd);

  assert.doesNotMatch(createGroupsBody, /console\.log\(label\)/);
  assert.doesNotMatch(drawRegionsBody, /console\.log\("position:/);
  assert.doesNotMatch(drawRegionsBody, /console\.log\(dataset\)/);
});
