function titleCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMetricLabel(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatMetricValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(4)));
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(formatMetricValue).join(', ')}]`;
  return JSON.stringify(value);
}

function metricEntries(metrics, limit = 3, options = {}) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return [];
  return Object.entries(metrics)
    .filter(([key, value]) => key && (options.includeEmpty || (value !== undefined && value !== null && value !== '')))
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      label: formatMetricLabel(key),
      value: formatMetricValue(value)
    }));
}

function truncateText(text, maxChars) {
  const value = String(text || '');
  if (!maxChars || value.length <= maxChars) return value;
  if (maxChars <= 1) return '...'.slice(0, maxChars);
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
}

function wrapLine(text, maxChars = 28) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let current = '';
  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      return;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function wrapAndTruncateLines(lines, { maxChars = 28, maxLines = 5 } = {}) {
  const wrapped = [];
  lines.forEach((line) => {
    wrapped.push(...wrapLine(line, maxChars));
  });
  if (wrapped.length <= maxLines) return wrapped;
  const visible = wrapped.slice(0, maxLines);
  visible[visible.length - 1] = truncateText(visible[visible.length - 1], Math.max(1, maxChars - 1));
  if (!visible[visible.length - 1].endsWith('...')) {
    visible[visible.length - 1] = truncateText(`${visible[visible.length - 1]} ...`, maxChars);
  }
  return visible;
}

function buildAnnotationCalloutLines(annotation, options = {}) {
  const metrics = metricEntries(annotation && annotation.metrics, options.maxMetrics || 3);
  const kind = annotation && annotation.kind ? titleCase(annotation.kind) : 'Analysis';
  const nodeId = annotation && annotation.nodeId !== undefined ? annotation.nodeId : '';
  const lines = [
    `${kind} annotation`,
    `Node ${nodeId}`
  ];
  metrics.forEach((metric) => {
    lines.push(`${metric.label}: ${metric.value}`);
  });
  return wrapAndTruncateLines(lines, {
    maxChars: options.maxChars || 28,
    maxLines: options.maxLines || 5
  });
}

function buildAnnotationDetailModel(annotation, options = {}) {
  if (!annotation) {
    const selectedRows = [];
    if (options.selectedNodeId !== undefined && options.selectedNodeId !== null) {
      selectedRows.push({ label: 'Node ID', value: options.selectedNodeId });
    }
    if (options.viewport) {
      selectedRows.push({ label: 'Viewport', value: options.viewport });
    }
    selectedRows.push({ label: 'Status', value: options.selectedNodeId ? 'Selected node has no annotation' : 'No annotated node selected' });
    return {
      title: 'Annotation detail',
      empty: true,
      rows: selectedRows,
      metrics: []
    };
  }

  return {
    title: `Annotation detail: node ${annotation.nodeId}`,
    empty: false,
    rows: [
      { label: 'Node ID', value: annotation.nodeId },
      { label: 'Viewport', value: annotation.viewport || '' },
      { label: 'Kind', value: annotation.kind || '' },
      { label: 'Source', value: annotation.source || '' },
      { label: 'Variant ID', value: annotation.variantId || '' },
      { label: 'Annotation', value: annotation.text || '' }
    ],
    metrics: metricEntries(annotation.metrics, Number.MAX_SAFE_INTEGER, { includeEmpty: true })
  };
}

module.exports = {
  buildAnnotationCalloutLines,
  buildAnnotationDetailModel,
  formatMetricLabel,
  formatMetricValue,
  metricEntries,
  titleCase,
  truncateText,
  wrapAndTruncateLines,
  wrapLine
};
