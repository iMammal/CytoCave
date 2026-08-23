const {
  CANONICAL_GLYPH_SHAPES,
  GLYPH_SHAPE_ALIASES
} = require('./glyphGeometryRegistry');

const GLYPH_SIZE_DEFAULT_VALUE = 1;
const GLYPH_SIZE_RANGE = Object.freeze({
  min: 0.2,
  max: 4,
  step: 0.1
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanToken(value) {
  return String(value === undefined || value === null ? '' : value).trim().toLowerCase();
}

function createDefaultGlyphSizes() {
  return ['left', 'right'].reduce((result, viewport) => {
    result[viewport] = {};
    CANONICAL_GLYPH_SHAPES.forEach((shape) => {
      result[viewport][shape] = GLYPH_SIZE_DEFAULT_VALUE;
    });
    return result;
  }, {});
}

function normalizeGlyphSizeShape(value) {
  const token = cleanToken(value);
  const shape = GLYPH_SHAPE_ALIASES[token];
  if (!shape) {
    throw new Error(`glyph size shape must be one of: ${CANONICAL_GLYPH_SHAPES.join(', ')}`);
  }
  return shape;
}

function normalizeGlyphSizeViewport(value, { allowBoth = false } = {}) {
  const viewport = cleanToken(value || 'left');
  if (viewport === 'left' || viewport === 'right' || (allowBoth && viewport === 'both')) {
    return viewport;
  }
  throw new Error(allowBoth ? 'viewport must be left, right, or both' : 'viewport must be left or right');
}

function normalizeGlyphSizeValue(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') {
    throw new Error('glyph size value must be a finite number');
  }
  if (typeof value === 'string' && value.trim() === '') {
    throw new Error('glyph size value must be a finite number');
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error('glyph size value must be a finite number');
  }
  if (numericValue < GLYPH_SIZE_RANGE.min || numericValue > GLYPH_SIZE_RANGE.max) {
    throw new Error(`glyph size value must be between ${GLYPH_SIZE_RANGE.min} and ${GLYPH_SIZE_RANGE.max}`);
  }
  return numericValue;
}

function safeGlyphSizeValue(value) {
  try {
    return normalizeGlyphSizeValue(value);
  } catch (error) {
    return GLYPH_SIZE_DEFAULT_VALUE;
  }
}

function normalizeGlyphSizes(glyphSizes) {
  const defaults = createDefaultGlyphSizes();
  const source = glyphSizes && typeof glyphSizes === 'object' ? glyphSizes : {};

  ['left', 'right'].forEach((viewport) => {
    const sideSizes = source[viewport] && typeof source[viewport] === 'object' ? source[viewport] : {};
    CANONICAL_GLYPH_SHAPES.forEach((shape) => {
      if (hasOwn(sideSizes, shape)) {
        defaults[viewport][shape] = safeGlyphSizeValue(sideSizes[shape]);
      }
    });
  });

  return defaults;
}

function normalizeGlyphSizeUpdateBody(body = {}) {
  const viewport = normalizeGlyphSizeViewport(body.viewport || body.side || 'left', { allowBoth: true });
  const sizes = {};

  if (hasOwn(body, 'sizes')) {
    if (!body.sizes || typeof body.sizes !== 'object' || Array.isArray(body.sizes)) {
      throw new Error('sizes must be an object keyed by glyph shape');
    }
    Object.keys(body.sizes).forEach((shapeKey) => {
      sizes[normalizeGlyphSizeShape(shapeKey)] = normalizeGlyphSizeValue(body.sizes[shapeKey]);
    });
  } else {
    if (!hasOwn(body, 'shape')) {
      throw new Error('shape is required when sizes is not provided');
    }
    const value = hasOwn(body, 'value') ? body.value : body.size;
    sizes[normalizeGlyphSizeShape(body.shape)] = normalizeGlyphSizeValue(value);
  }

  if (!Object.keys(sizes).length) {
    throw new Error('at least one glyph size is required');
  }

  return { viewport, sizes };
}

function applyGlyphSizeUpdate(currentGlyphSizes, body = {}) {
  const update = normalizeGlyphSizeUpdateBody(body);
  const next = normalizeGlyphSizes(currentGlyphSizes);
  const targets = update.viewport === 'both' ? ['left', 'right'] : [update.viewport];
  let changed = false;

  targets.forEach((viewport) => {
    Object.keys(update.sizes).forEach((shape) => {
      const value = update.sizes[shape];
      if (next[viewport][shape] !== value) {
        next[viewport][shape] = value;
        changed = true;
      }
    });
  });

  return {
    glyphSizes: next,
    changed,
    viewport: update.viewport,
    sizes: clone(update.sizes)
  };
}

module.exports = {
  CANONICAL_GLYPH_SHAPES,
  GLYPH_SIZE_DEFAULT_VALUE,
  GLYPH_SIZE_RANGE,
  applyGlyphSizeUpdate,
  createDefaultGlyphSizes,
  normalizeGlyphSizeShape,
  normalizeGlyphSizeUpdateBody,
  normalizeGlyphSizeValue,
  normalizeGlyphSizeViewport,
  normalizeGlyphSizes
};
