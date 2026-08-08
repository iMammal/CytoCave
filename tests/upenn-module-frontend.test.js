const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', ...relativePath.split('/')), 'utf8');
}

test('frontend topology parsing exposes UPENNModule as a clustering group', () => {
  const model = readSource('js/model.js');
  const setTopologyStart = model.indexOf('this.setTopology = function');
  const setTopologyEnd = model.indexOf('this.getTopologies = function', setTopologyStart);
  assert.ok(setTopologyStart >= 0, 'setTopology should exist');
  assert.ok(setTopologyEnd > setTopologyStart, 'setTopology should precede getTopologies');

  const body = model.slice(setTopologyStart, setTopologyEnd);
  assert.match(body, /dataType\.includes\("Clustering"\)/);
  assert.match(body, /dataType = dataType\.replace\("Clustering", ""\)/);
  assert.match(body, /clusteringTopologies\.push\(dataType\)/);
});

test('REST session color bridge resolves UPENNModuleClustering to UPENNModule', () => {
  const restSession = readSource('js/restSession.js');

  assert.match(restSession, /function normalizeClusterFieldName\(field\)/);
  assert.match(restSession, /replace\("Clustering", ""\)/);
  assert.match(restSession, /resolveColorField\(side, field\)/);
  assert.match(restSession, /select\.options\[i\]\.value === normalizedField/);
  assert.match(restSession, /changeColorGroup\(resolvedLeftField, "Left"\)/);
  assert.match(restSession, /changeColorGroup\(resolvedRightField, "Right"\)/);
  assert.match(restSession, /changeColorGroup\(resolvedField, sideName\(side\)\)/);
});
