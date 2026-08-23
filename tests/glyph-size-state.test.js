const assert = require('assert');
const test = require('node:test');

const {
  CANONICAL_GLYPH_SHAPES,
  GLYPH_SIZE_DEFAULT_VALUE,
  GLYPH_SIZE_RANGE,
  applyGlyphSizeUpdate,
  createDefaultGlyphSizes,
  normalizeGlyphSizeShape,
  normalizeGlyphSizeValue,
  normalizeGlyphSizes
} = require('../js/glyphSizeState');

test('default glyph size state covers all canonical shapes for both viewports', () => {
  const defaults = createDefaultGlyphSizes();

  assert.deepEqual(Object.keys(defaults).sort(), ['left', 'right']);
  ['left', 'right'].forEach((viewport) => {
    assert.deepEqual(Object.keys(defaults[viewport]), CANONICAL_GLYPH_SHAPES);
    CANONICAL_GLYPH_SHAPES.forEach((shape) => {
      assert.equal(defaults[viewport][shape], GLYPH_SIZE_DEFAULT_VALUE);
    });
  });
});

test('older glyph size state missing fields normalizes to defaults', () => {
  const normalized = normalizeGlyphSizes({
    left: {
      sphere: 1.5
    }
  });

  assert.equal(normalized.left.sphere, 1.5);
  assert.equal(normalized.left.cube, 1);
  assert.equal(normalized.left.tetrahedron, 1);
  assert.equal(normalized.right.star, 1);
});

test('glyph size shape aliases normalize to canonical storage keys', () => {
  assert.equal(normalizeGlyphSizeShape('box'), 'cube');
  assert.equal(normalizeGlyphSizeShape('tetra'), 'tetrahedron');
  assert.equal(normalizeGlyphSizeShape('icosa'), 'icosahedron');
});

test('glyph size values accept range boundaries and reject invalid input', () => {
  assert.equal(normalizeGlyphSizeValue(GLYPH_SIZE_RANGE.min), GLYPH_SIZE_RANGE.min);
  assert.equal(normalizeGlyphSizeValue(String(GLYPH_SIZE_RANGE.max)), GLYPH_SIZE_RANGE.max);

  [null, true, false, NaN, Infinity, -Infinity, '', 'abc', [], {}, GLYPH_SIZE_RANGE.min - 0.1, GLYPH_SIZE_RANGE.max + 0.1].forEach((value) => {
    assert.throws(() => normalizeGlyphSizeValue(value));
  });
});

test('glyph size update supports one shape, both viewports, and idempotent repeats', () => {
  const first = applyGlyphSizeUpdate(null, {
    viewport: 'left',
    shape: 'tetrahedron',
    value: 1.25
  });
  assert.equal(first.changed, true);
  assert.equal(first.glyphSizes.left.tetrahedron, 1.25);
  assert.equal(first.glyphSizes.right.tetrahedron, 1);

  const both = applyGlyphSizeUpdate(first.glyphSizes, {
    viewport: 'both',
    shape: 'box',
    value: 0.8
  });
  assert.equal(both.changed, true);
  assert.equal(both.glyphSizes.left.cube, 0.8);
  assert.equal(both.glyphSizes.right.cube, 0.8);
  assert.equal(both.sizes.cube, 0.8);

  const repeat = applyGlyphSizeUpdate(both.glyphSizes, {
    viewport: 'right',
    sizes: {
      cube: 0.8
    }
  });
  assert.equal(repeat.changed, false);
  assert.deepEqual(repeat.glyphSizes, both.glyphSizes);
});
