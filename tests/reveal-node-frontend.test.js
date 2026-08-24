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

function createDocumentStub() {
  const elements = {};
  function createElement(tagName) {
    const element = {
      tagName,
      id: '',
      className: '',
      hidden: false,
      innerHTML: '',
      textContent: '',
      children: [],
      appendChild(child) {
        this.children.push(child);
        if (child.id) elements[child.id] = child;
      }
    };
    return element;
  }
  elements.nodeInfoPanelLeft = createElement('div');
  elements.nodeInfoPanelRight = createElement('div');
  return {
    getElementById(id) {
      return elements[id] || null;
    },
    createElement
  };
}

function loadRevealHarness(stubs) {
  const restSession = source('js/restSession.js');
  const start = restSession.indexOf('var lastAppliedRevision = null;');
  const end = restSession.indexOf('async function getSessionState', start);
  assert.ok(start >= 0, 'rest session state should exist');
  assert.ok(end > start, 'session helpers should precede getSessionState');

  const moduleFactory = new Function(
    'previewAreaLeft',
    'previewAreaRight',
    'selectNodeByIndex',
    'clearNodeSelection',
    'buildAnnotationDetailModel',
    'document',
    `${restSession.slice(start, end)}; return { applyRevealNodeRequest };`
  );

  return moduleFactory(
    stubs.previewAreaLeft,
    stubs.previewAreaRight,
    stubs.selectNodeByIndex,
    stubs.clearNodeSelection || function () {},
    stubs.buildAnnotationDetailModel,
    stubs.document
  );
}

test('reveal reconciliation replays each request id once without syncing cameras', () => {
  const calls = [];
  const leftPreview = {
    applyAnnotations(annotations, selectedNodeId) {
      calls.push(['left-annotations', Object.keys(annotations), selectedNodeId]);
    },
    updateSelectedNodeLabelByIndex(nodeId, annotation) {
      calls.push(['left-label', nodeId, annotation.text]);
    },
    clearSelectedNodeLabel() {
      calls.push(['left-clear-label']);
    },
    focusNodeByIndex(nodeId) {
      calls.push(['left-focus', nodeId]);
      return true;
    },
    syncCameraWith() {
      calls.push(['left-sync']);
    }
  };
  const rightPreview = {
    applyAnnotations() {
      calls.push(['right-annotations']);
    },
    focusNodeByIndex(nodeId) {
      calls.push(['right-focus', nodeId]);
      return true;
    },
    syncCameraWith() {
      calls.push(['right-sync']);
    }
  };
  const selectCalls = [];
  const { applyRevealNodeRequest } = loadRevealHarness({
    previewAreaLeft: leftPreview,
    previewAreaRight: rightPreview,
    selectNodeByIndex(viewport, nodeId, options) {
      selectCalls.push([viewport, nodeId, options]);
      return true;
    },
    buildAnnotationDetailModel(annotation, context) {
      return {
        empty: !annotation,
        title: annotation ? 'Annotation' : 'No annotation',
        rows: [
          { label: 'Node ID', value: context.selectedNodeId },
          { label: 'Annotation', value: annotation && annotation.text }
        ],
        metrics: []
      };
    },
    document: createDocumentStub()
  });

  const state = {
    view: {
      selectedNode: { nodeId: '7', viewport: 'left' },
      revealNodeRequest: {
        requestId: 'request-1',
        nodeId: '7',
        viewport: 'left',
        select: true,
        pinAnnotation: true,
        focus: true
      }
    },
    annotations: {
      byNode: {
        7: { nodeId: '7', viewport: 'left', text: 'Pinned annotation' }
      }
    }
  };

  applyRevealNodeRequest(state);
  assert.deepEqual(selectCalls, [['left', '7', { replaceSelection: true, toggleSelected: false }]]);
  assert.deepEqual(calls, [
    ['left-annotations', ['7'], '7'],
    ['left-label', '7', 'Pinned annotation'],
    ['left-focus', '7']
  ]);

  applyRevealNodeRequest(state);
  assert.equal(selectCalls.length, 1);
  assert.equal(calls.length, 3);

  applyRevealNodeRequest({
    ...state,
    view: {
      ...state.view,
      revealNodeRequest: {
        ...state.view.revealNodeRequest,
        requestId: 'request-2'
      }
    }
  });
  assert.equal(selectCalls.length, 2);
  assert.deepEqual(calls.slice(3), [
    ['left-annotations', ['7'], '7'],
    ['left-label', '7', 'Pinned annotation'],
    ['left-focus', '7']
  ]);
  assert.ok(!calls.some((call) => call[0].includes('sync')));
  assert.ok(!calls.some((call) => call[0].startsWith('right-')));
});

test('reveal frontend contract separates request replay from focus and selection idempotency', () => {
  const restSession = source('js/restSession.js');
  const revealBody = functionBody(restSession, 'function applyRevealNodeRequest', 'async function getSessionState');
  const applyBody = functionBody(restSession, 'async function applySessionState', 'function captureCombinedCanvas');

  assert.match(restSession, /var lastRevealNodeRequestId = null/);
  assert.match(revealBody, /revealRequest\.requestId === lastRevealNodeRequestId/);
  assert.match(revealBody, /selectNodeByIndex\(viewport,\s*revealRequest\.nodeId,\s*\{/);
  assert.match(revealBody, /replaceSelection:\s*true/);
  assert.match(revealBody, /toggleSelected:\s*false/);
  assert.match(revealBody, /renderSelectedNodeAnnotation\(state,\s*viewport\)/);
  assert.match(revealBody, /preview\.focusNodeByIndex\(revealRequest\.nodeId\)/);
  assert.match(revealBody, /lastRevealNodeRequestId = revealRequest\.requestId/);
  assert.doesNotMatch(revealBody, /syncCameraWith/);
  assert.match(applyBody, /applyRevealNodeRequest\(state\)/);
});
