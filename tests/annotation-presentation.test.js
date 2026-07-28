const assert = require('assert');
const test = require('node:test');

const {
  buildAnnotationCalloutLines,
  buildAnnotationDetailModel,
  formatMetricLabel,
  wrapAndTruncateLines
} = require('../js/annotationPresentation');

test('metric labels are formatted without hard-coded metric names', () => {
  assert.equal(formatMetricLabel('inDegree'), 'in degree');
  assert.equal(formatMetricLabel('module_id'), 'module id');
  assert.equal(formatMetricLabel('betweenness-score'), 'betweenness score');
});

test('annotation callout uses generic title, node id, and limited metrics', () => {
  const lines = buildAnnotationCalloutLines({
    nodeId: '42',
    kind: 'analysis',
    metrics: {
      inDegree: 308,
      module: 8,
      pValue: 0.012345,
      extraMetric: 100
    }
  }, { maxChars: 32, maxLines: 5, maxMetrics: 3 });

  assert.equal(lines[0], 'Analysis annotation');
  assert.equal(lines[1], 'Node 42');
  assert.ok(lines.includes('in degree: 308'));
  assert.ok(lines.includes('module: 8'));
  assert.ok(lines.some((line) => line.startsWith('p value:')));
  assert.ok(!lines.some((line) => line.startsWith('extra metric:')));
});

test('callout wrapping truncates to bounded line count', () => {
  const wrapped = wrapAndTruncateLines([
    'Analysis annotation',
    'Node 42',
    'this is a long metric value that should wrap across several lines before truncation'
  ], { maxChars: 18, maxLines: 4 });

  assert.equal(wrapped.length, 4);
  assert.ok(wrapped[wrapped.length - 1].endsWith('...'));
  wrapped.forEach((line) => assert.ok(line.length <= 18));
});

test('annotation detail model keeps full text and all supplied metrics', () => {
  const detail = buildAnnotationDetailModel({
    nodeId: '42',
    text: 'Complete notebook annotation sentence that should stay out of the 3D callout.',
    kind: 'analysis',
    source: 'jupyter',
    variantId: 'variant-placeholder',
    viewport: 'left',
    metrics: {
      inDegree: 308,
      module: 8,
      pValue: 0.012345,
      extraMetric: 100
    }
  });

  assert.equal(detail.empty, false);
  assert.ok(detail.rows.some((row) => row.label === 'Annotation' && row.value.includes('Complete notebook annotation')));
  assert.equal(detail.metrics.length, 4);
  assert.deepEqual(detail.metrics.map((metric) => metric.label), ['in degree', 'module', 'p value', 'extra metric']);
});

test('empty annotation detail distinguishes an unannotated selection', () => {
  const detail = buildAnnotationDetailModel(null, {
    selectedNodeId: '42',
    viewport: 'right'
  });

  assert.equal(detail.empty, true);
  assert.ok(detail.rows.some((row) => row.label === 'Node ID' && row.value === '42'));
  assert.ok(detail.rows.some((row) => row.label === 'Viewport' && row.value === 'right'));
  assert.ok(detail.rows.some((row) => row.value === 'Selected node has no annotation'));
});
