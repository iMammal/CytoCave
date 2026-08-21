const THREE = require('three');

const CANONICAL_GLYPH_SHAPES = Object.freeze([
  'sphere',
  'cube',
  'tetrahedron',
  'icosahedron',
  'star'
]);

const GLYPH_SHAPE_ALIASES = Object.freeze({
  sphere: 'sphere',
  sph: 'sphere',
  ball: 'sphere',
  cube: 'cube',
  box: 'cube',
  tetrahedron: 'tetrahedron',
  tetra: 'tetrahedron',
  icosahedron: 'icosahedron',
  icosa: 'icosahedron',
  star: 'star',
  spiky: 'star',
  spike: 'star'
});

const LEGACY_HEMISPHERE_GLYPH_SHAPES = Object.freeze({
  left: 'sphere',
  right: 'cube'
});

const GLYPH_SHAPE_SIZE_CLASS = Object.freeze({
  sphere: 'sphere',
  cube: 'cube',
  tetrahedron: 'sphere',
  icosahedron: 'sphere',
  star: 'sphere'
});

let lastInvalidGlyphShapeSignature = null;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function cleanToken(value) {
  return String(value === undefined || value === null ? '' : value).trim().toLowerCase();
}

function normalizeGlyphShape(value) {
  const token = cleanToken(value);
  return GLYPH_SHAPE_ALIASES[token] || 'sphere';
}

function legacyHemisphereToGlyphShape(value) {
  const token = cleanToken(value);
  return LEGACY_HEMISPHERE_GLYPH_SHAPES[token] || 'sphere';
}

function resolveGlyphShape(record = {}) {
  if (hasOwn(record, 'glyph_shape')) {
    return {
      shape: normalizeGlyphShape(record.glyph_shape),
      sourceField: 'glyph_shape',
      sourceValue: record.glyph_shape,
      valid: GLYPH_SHAPE_ALIASES[cleanToken(record.glyph_shape)] !== undefined
    };
  }

  return {
    shape: legacyHemisphereToGlyphShape(record.hemisphere),
    sourceField: 'hemisphere',
    sourceValue: record.hemisphere,
    valid: !hasOwn(record, 'hemisphere') || LEGACY_HEMISPHERE_GLYPH_SHAPES[cleanToken(record.hemisphere)] !== undefined
  };
}

function glyphShapeSizeClass(shape) {
  return GLYPH_SHAPE_SIZE_CLASS[normalizeGlyphShape(shape)] || 'sphere';
}

function glyphShapeDiagnostics(records = []) {
  const invalidCounts = {};

  records.forEach((record) => {
    const resolved = resolveGlyphShape(record);
    if (resolved.valid) return;
    const key = `${resolved.sourceField}:${String(resolved.sourceValue === undefined ? '<missing>' : resolved.sourceValue)}`;
    invalidCounts[key] = (invalidCounts[key] || 0) + 1;
  });

  const invalidValues = Object.keys(invalidCounts).sort().map((key) => ({
    key,
    count: invalidCounts[key]
  }));

  return {
    invalidValues,
    invalidCount: invalidValues.reduce((sum, entry) => sum + entry.count, 0)
  };
}

function warnInvalidGlyphShapesOnce(records = [], logger = console) {
  const diagnostics = glyphShapeDiagnostics(records);
  if (!diagnostics.invalidCount) return diagnostics;

  const signature = JSON.stringify(diagnostics.invalidValues);
  if (signature === lastInvalidGlyphShapeSignature) return diagnostics;
  lastInvalidGlyphShapeSignature = signature;

  const examples = diagnostics.invalidValues
    .slice(0, 5)
    .map((entry) => `${entry.key} (${entry.count})`)
    .join(', ');
  const suffix = diagnostics.invalidValues.length > 5 ? `, +${diagnostics.invalidValues.length - 5} more` : '';
  if (logger && typeof logger.warn === 'function') {
    logger.warn(`CytoCave glyph_shape: ${diagnostics.invalidCount} invalid or empty value(s) fell back to sphere: ${examples}${suffix}`);
  }

  return diagnostics;
}

function buildGlyphInstanceBuckets(dataset = []) {
  return dataset.reduce((groups, node, nodeIndex) => {
    const group = node && node.group !== undefined && node.group !== null ? String(node.group) : '';
    const shape = resolveGlyphShape(node).shape;
    if (!groups[group]) groups[group] = {};
    if (!groups[group][shape]) groups[group][shape] = [];
    groups[group][shape].push({
      nodeIndex,
      node,
      group,
      glyph_shape: shape
    });
    return groups;
  }, {});
}

function createStarGeometry(radius = 3.9, baseRadius = 1.45) {
  const b = baseRadius;
  const vertices = [
    radius, 0, 0,
    -radius, 0, 0,
    0, radius, 0,
    0, -radius, 0,
    0, 0, radius,
    0, 0, -radius,
    b, b, b,
    b, b, -b,
    b, -b, b,
    b, -b, -b,
    -b, b, b,
    -b, b, -b,
    -b, -b, b,
    -b, -b, -b
  ];

  const indices = [
    0, 6, 7, 0, 7, 9, 0, 9, 8, 0, 8, 6,
    1, 11, 10, 1, 13, 11, 1, 12, 13, 1, 10, 12,
    2, 10, 6, 2, 11, 10, 2, 7, 11, 2, 6, 7,
    3, 8, 12, 3, 12, 13, 3, 13, 9, 3, 9, 8,
    4, 6, 8, 4, 8, 12, 4, 12, 10, 4, 10, 6,
    5, 9, 7, 5, 13, 9, 5, 11, 13, 5, 7, 11
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createGlyphGeometry(shape, options = {}) {
  const canonicalShape = normalizeGlyphShape(shape);
  const radius = options.radius || 3.0;
  const sphereResolution = options.sphereResolution || 12;

  switch (canonicalShape) {
    case 'cube':
      return new THREE.BoxGeometry(1.5 * radius, 1.5 * radius, 1.5 * radius);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(radius * 1.25, 0);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(radius * 1.1, 0);
    case 'star':
      return createStarGeometry(radius * 1.3, radius * 0.48);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(radius, sphereResolution, sphereResolution);
  }
}

module.exports = {
  CANONICAL_GLYPH_SHAPES,
  GLYPH_SHAPE_ALIASES,
  LEGACY_HEMISPHERE_GLYPH_SHAPES,
  buildGlyphInstanceBuckets,
  createGlyphGeometry,
  createStarGeometry,
  glyphShapeDiagnostics,
  glyphShapeSizeClass,
  legacyHemisphereToGlyphShape,
  normalizeGlyphShape,
  resolveGlyphShape,
  warnInvalidGlyphShapesOnce
};
