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

function loadMultiSelectionHarness(leftPreview, rightPreview) {
  const restSession = source('js/restSession.js');
  const start = restSession.indexOf('var lastAppliedRevision = null;');
  const end = restSession.indexOf('async function getSessionState', start);
  assert.ok(start >= 0, 'rest session state should exist');
  assert.ok(end > start, 'session helpers should precede getSessionState');

  const moduleFactory = new Function(
    'previewAreaLeft',
    'previewAreaRight',
    `${restSession.slice(start, end)}; return { applyMultiSelection };`
  );
  return moduleFactory(leftPreview, rightPreview);
}

test('REST multi-selection reconciliation replaces viewport selections through PreviewArea', () => {
  const calls = [];
  const leftPreview = {
    clearSelectedNodesVisual() {
      calls.push(['left-clear']);
    },
    setSelectedNodes(nodes) {
      calls.push(['left-set', nodes]);
    },
    redrawEdges() {
      calls.push(['left-redraw']);
    }
  };
  const rightPreview = {
    clearSelectedNodesVisual() {
      calls.push(['right-clear']);
    },
    setSelectedNodes(nodes) {
      calls.push(['right-set', nodes]);
    },
    redrawEdges() {
      calls.push(['right-redraw']);
    }
  };

  const { applyMultiSelection } = loadMultiSelectionHarness(leftPreview, rightPreview);

  applyMultiSelection({
    view: {
      multiSelection: {
        left: ['0', '1'],
        right: ['2']
      }
    }
  });

  assert.deepEqual(calls, [
    ['left-clear'],
    ['left-set', ['0', '1']],
    ['left-redraw'],
    ['right-clear'],
    ['right-set', ['2']],
    ['right-redraw']
  ]);

  applyMultiSelection({
    view: {
      multiSelection: {
        left: ['0', '1'],
        right: ['2']
      }
    }
  });
  assert.equal(calls.length, 6);

  applyMultiSelection({
    view: {
      multiSelection: {
        left: [],
        right: ['2']
      }
    }
  });
  assert.deepEqual(calls.slice(6), [
    ['left-clear'],
    ['left-redraw'],
    ['right-clear'],
    ['right-set', ['2']],
    ['right-redraw']
  ]);
});

test('multi-selection bridge uses existing renderer path and does not post or bypass thresholds', () => {
  const restSession = source('js/restSession.js');
  const applyBody = functionBody(restSession, 'function applyMultiSelection', 'function applyAnnotations');
  const viewportBody = functionBody(restSession, 'function applyMultiSelectionToViewport', 'function applyMultiSelection(state)');
  const sessionBody = functionBody(restSession, 'async function applySessionState', 'function captureCombinedCanvas');

  assert.match(viewportBody, /preview\.clearSelectedNodesVisual\(\)/);
  assert.match(viewportBody, /preview\.setSelectedNodes\(nodeIds\)/);
  assert.match(viewportBody, /preview\.redrawEdges\(\)/);
  assert.doesNotMatch(applyBody + viewportBody, /fetch\(/);
  assert.doesNotMatch(applyBody + viewportBody, /postJson/);
  assert.doesNotMatch(applyBody + viewportBody, /threshold\s*=/);
  assert.doesNotMatch(applyBody + viewportBody, /setThreshold/);
  assert.match(sessionBody, /applyMultiSelection\(state\)/);
});
