const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const THREE = require('three');

const {
  CANONICAL_GLYPH_SHAPES,
  buildGlyphInstanceBuckets,
  createGlyphGeometry,
  glyphShapeDiagnostics,
  glyphShapeSizeClass,
  legacyHemisphereToGlyphShape,
  normalizeGlyphShape,
  resolveGlyphShape
} = require('../js/glyphGeometryRegistry');

test('canonical glyph shapes are stable and complete', () => {
  assert.deepEqual(CANONICAL_GLYPH_SHAPES, [
    'sphere',
    'cube',
    'tetrahedron',
    'icosahedron',
    'star'
  ]);

  CANONICAL_GLYPH_SHAPES.forEach((shape) => {
    assert.equal(normalizeGlyphShape(shape), shape);
  });
});

test('glyph shape aliases canonicalize without using viewport left/right tokens', () => {
  assert.equal(normalizeGlyphShape('box'), 'cube');
  assert.equal(normalizeGlyphShape('tetra'), 'tetrahedron');
  assert.equal(normalizeGlyphShape('icosa'), 'icosahedron');
  assert.equal(normalizeGlyphShape(' left '), 'sphere');
  assert.equal(normalizeGlyphShape('right'), 'sphere');
});

test('legacy hemisphere compatibility maps left to sphere and right to cube', () => {
  assert.equal(legacyHemisphereToGlyphShape('left'), 'sphere');
  assert.equal(legacyHemisphereToGlyphShape('right'), 'cube');
  assert.equal(resolveGlyphShape({ hemisphere: 'left' }).shape, 'sphere');
  assert.equal(resolveGlyphShape({ hemisphere: 'right' }).shape, 'cube');
});

test('glyph_shape is preferred over legacy hemisphere and fallbacks are sphere', () => {
  assert.equal(resolveGlyphShape({ glyph_shape: 'box', hemisphere: 'left' }).shape, 'cube');
  assert.equal(resolveGlyphShape({ glyph_shape: '', hemisphere: 'right' }).shape, 'sphere');
  assert.equal(resolveGlyphShape({ glyph_shape: 'unknown', hemisphere: 'right' }).shape, 'sphere');
  assert.equal(resolveGlyphShape({}).shape, 'sphere');
});

test('invalid glyph shape diagnostics are bounded by value rather than node count', () => {
  const diagnostics = glyphShapeDiagnostics([
    { glyph_shape: 'bad' },
    { glyph_shape: 'bad' },
    { glyph_shape: '' },
    { hemisphere: 'sideways' },
    { hemisphere: 'right' }
  ]);

  assert.equal(diagnostics.invalidCount, 4);
  assert.deepEqual(diagnostics.invalidValues, [
    { key: 'glyph_shape:', count: 1 },
    { key: 'glyph_shape:bad', count: 2 },
    { key: 'hemisphere:sideways', count: 1 }
  ]);
});

test('all canonical glyph geometries are instanced and raycastable', () => {
  CANONICAL_GLYPH_SHAPES.forEach((shape) => {
    const geometry = createGlyphGeometry(shape);
    geometry.computeBoundingSphere();
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, 1);
    mesh.name = { type: 'region', group: 'g', glyph_shape: shape };
    mesh.userData.indexList = [42];
    mesh.getDatasetIndex = function (nodeObject) {
      return this.userData.indexList[nodeObject.instanceId];
    };
    mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, 0));
    mesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 20),
      new THREE.Vector3(0, 0, -1)
    );
    const intersections = raycaster.intersectObject(mesh, true);

    assert.ok(intersections.length > 0, `${shape} should be raycastable`);
    assert.equal(intersections[0].instanceId, 0);
    assert.equal(mesh.getDatasetIndex(intersections[0]), 42);
  });
});

test('glyph buckets preserve node id, color group, and coordinate position', () => {
  const position = { x: 1, y: 2, z: 3 };
  const dataset = [
    {
      position,
      name: 'n0',
      group: 'module-a',
      glyph_shape: 'tetra',
      hemisphere: 'right',
      label: 'node-0'
    }
  ];

  const buckets = buildGlyphInstanceBuckets(dataset);
  const bucketed = buckets['module-a'].tetrahedron[0];

  assert.equal(bucketed.nodeIndex, 0);
  assert.equal(bucketed.node, dataset[0]);
  assert.equal(bucketed.node.group, 'module-a');
  assert.equal(bucketed.node.label, 'node-0');
  assert.equal(bucketed.node.position, position);
  assert.equal(bucketed.node.hemisphere, 'right');
});

test('renderer source uses glyph_shape buckets and keeps laterality edge comparison separate', () => {
  const previewArea = fs.readFileSync(path.join(__dirname, '..', 'js', 'previewArea.js'), 'utf8');
  const drawStart = previewArea.indexOf('this.drawRegions = function');
  const drawEnd = previewArea.indexOf('//     this.drawRegions = function', drawStart);
  const drawBody = previewArea.slice(drawStart, drawEnd);

  assert.match(drawBody, /buildGlyphInstanceBuckets\(dataset\)/);
  assert.match(drawBody, /glyph_shape: glyphShape/);
  assert.match(drawBody, /this\.instances\[dataset\[i\]\.group\]\[glyphShape\]/);
  assert.doesNotMatch(drawBody, /getNormalGeometry\('left'/);
  assert.doesNotMatch(drawBody, /getNormalGeometry\('right'/);

  const edgeBodyStart = previewArea.indexOf('this.updateConnections = function');
  const edgeBodyEnd = previewArea.indexOf('this.drawConnections = function', edgeBodyStart);
  const edgeBody = previewArea.slice(edgeBodyStart, edgeBodyEnd);
  assert.match(edgeBody, /model\.getDataset\(\)\[edgeNodes\[0\]\]\.hemisphere/);
});

test('glyph shape size helper returns canonical independent shape keys', () => {
  assert.equal(glyphShapeSizeClass('sphere'), 'sphere');
  assert.equal(glyphShapeSizeClass('tetrahedron'), 'tetrahedron');
  assert.equal(glyphShapeSizeClass('icosahedron'), 'icosahedron');
  assert.equal(glyphShapeSizeClass('star'), 'star');
  assert.equal(glyphShapeSizeClass('cube'), 'cube');
});
