const assert = require('assert');
const fs = require('fs');
const http = require('http');
const test = require('node:test');
const { app, resetSessionForTests } = require('../server');

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function startServer() {
  resetSessionForTests();
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function demoNodeId(state) {
  const count = state.viewports.left.graph.nodeCount;
  assert.ok(count === null || count > 0);
  return '0';
}

function request(server, method, urlPath, body) {
  const payload = body ? JSON.stringify(body) : null;
  const options = {
    method,
    port: server.address().port,
    path: urlPath,
    host: '127.0.0.1',
    headers: {}
  };
  if (payload) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('REST session state exposes the primary k20/k40 comparison', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await request(server, 'GET', '/session/state');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.viewports.left.subjectID, 'UPENN-GBM-00013_11__n21760_s0_k20');
  assert.equal(response.body.viewports.right.subjectID, 'UPENN-GBM-00013_11__n21760_s0_k40');
  assert.equal(response.body.view.colorBy.left, 'KMeans_k20_c16_s0_Clustering');
  assert.equal(response.body.view.colorBy.right, 'KMeans_k40_c16_s0_Clustering');
});

test('POST /variants/compare is idempotent for the default demo', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const first = await request(server, 'POST', '/variants/compare', {});
  const second = await request(server, 'POST', '/variants/compare', {});
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(first.body.revision, second.body.revision);
  assert.equal(second.body.state.view.orientation.synchronized, true);
});

test('view commands update authoritative server state', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const color = await request(server, 'POST', '/view/color-by', {
    left: 'KMeans_k20_c16_s0_Clustering',
    right: 'KMeans_k40_c16_s0_Clustering'
  });
  assert.equal(color.statusCode, 200);

  const highlight = await request(server, 'POST', '/view/highlight-cluster', {
    clusterId: 6,
    viewport: 'both'
  });
  assert.equal(highlight.statusCode, 200);
  assert.equal(highlight.body.state.view.highlightedCluster.clusterId, 6);
  assert.equal(highlight.body.state.view.highlightedCluster.viewport, 'both');
});

test('legacy annotation requests normalize into session annotations', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const before = await request(server, 'GET', '/session/state');
  const nodeId = demoNodeId(before.body);
  const note = 'Computed notebook observation';

  const annotated = await request(server, 'POST', '/api/annotate', {
    node: nodeId,
    note
  });
  assert.equal(annotated.statusCode, 200);
  assert.equal(annotated.body.annotation.nodeId, nodeId);
  assert.equal(annotated.body.annotation.text, note);
  assert.equal(annotated.body.annotation.kind, 'analysis');
  assert.equal(annotated.body.annotation.source, 'jupyter');
  assert.notEqual(annotated.body.revision, before.body.revision);

  const legacy = await request(server, 'GET', '/api/annotations');
  assert.equal(legacy.statusCode, 200);
  assert.equal(legacy.body[nodeId], note);
  assert.equal(legacy.body.byNode[nodeId].text, note);

  const state = await request(server, 'GET', '/session/state');
  assert.equal(state.body.annotations.byNode[nodeId].text, note);
});

test('structured annotations are idempotent and replaceable', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const state = await request(server, 'GET', '/session/state');
  const nodeId = demoNodeId(state.body);
  const body = {
    nodeId,
    text: 'Structured analysis note',
    kind: 'analysis',
    source: 'jupyter',
    variantId: state.body.viewports.left.variantId,
    viewport: 'left',
    metrics: { score: 1.25 }
  };

  const first = await request(server, 'POST', '/api/annotate', body);
  const second = await request(server, 'POST', '/api/annotate', body);
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.changed, false);
  assert.equal(first.body.revision, second.body.revision);
  assert.deepEqual(second.body.annotation.metrics, { score: 1.25 });

  const replacement = await request(server, 'POST', '/api/annotate', {
    ...body,
    text: 'Replacement analysis note'
  });
  assert.equal(replacement.statusCode, 200);
  assert.equal(replacement.body.changed, true);
  assert.notEqual(replacement.body.revision, second.body.revision);
  assert.equal(replacement.body.annotation.createdAt, first.body.annotation.createdAt);
  assert.equal(replacement.body.annotation.text, 'Replacement analysis note');

  const removed = await request(server, 'POST', '/api/annotate', {
    nodeId,
    text: '',
    viewport: 'left'
  });
  assert.equal(removed.statusCode, 200);
  assert.equal(removed.body.removed, true);
  assert.equal(removed.body.state.annotations.byNode[nodeId], undefined);
});

test('node selection and focus requests update session state', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const state = await request(server, 'GET', '/session/state');
  const nodeId = demoNodeId(state.body);

  const selected = await request(server, 'POST', '/view/select-node', {
    nodeId,
    viewport: 'left'
  });
  assert.equal(selected.statusCode, 200);
  assert.deepEqual(selected.body.state.view.selectedNode, { nodeId, viewport: 'left' });

  const selectedAgain = await request(server, 'POST', '/view/select-node', {
    nodeId,
    viewport: 'left'
  });
  assert.equal(selectedAgain.statusCode, 200);
  assert.equal(selectedAgain.body.revision, selected.body.revision);

  const focusOne = await request(server, 'POST', '/view/focus-node', {
    nodeId,
    viewport: 'left'
  });
  const focusTwo = await request(server, 'POST', '/view/focus-node', {
    nodeId,
    viewport: 'left'
  });
  assert.equal(focusOne.statusCode, 200);
  assert.equal(focusTwo.statusCode, 200);
  assert.equal(focusOne.body.state.view.focusRequest.nodeId, nodeId);
  assert.notEqual(focusOne.body.state.view.focusRequest.requestId, focusTwo.body.state.view.focusRequest.requestId);
  assert.notEqual(focusOne.body.revision, focusTwo.body.revision);
});

test('node view commands return useful validation errors', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const missing = await request(server, 'POST', '/view/select-node', {
    viewport: 'left'
  });
  assert.equal(missing.statusCode, 400);
  assert.match(missing.body.error, /nodeId is required/);

  const badViewport = await request(server, 'POST', '/view/select-node', {
    nodeId: '0',
    viewport: 'center'
  });
  assert.equal(badViewport.statusCode, 400);
  assert.match(badViewport.body.error, /viewport must be left or right/);

  const badNode = await request(server, 'POST', '/view/focus-node', {
    nodeId: '999999999',
    viewport: 'left'
  });
  assert.equal(badNode.statusCode, 400);
  assert.match(badNode.body.error, /outside viewport left|non-negative integer/);

  const badAnnotation = await request(server, 'POST', '/api/annotate', {
    nodeId: 'not-a-node',
    text: 'bad',
    viewport: 'left'
  });
  assert.equal(badAnnotation.statusCode, 400);
  assert.match(badAnnotation.body.error, /nodeId must be a non-negative integer/);
});

test('session and screenshot exports write deterministic files', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const session = await request(server, 'POST', '/export/session', {});
  assert.equal(session.statusCode, 200);
  assert.equal(fs.existsSync(session.body.export.path), true);

  const screenshot = await request(server, 'POST', '/export/screenshot', {
    imageData: ONE_PIXEL_PNG
  });
  assert.equal(screenshot.statusCode, 200);
  assert.equal(fs.existsSync(screenshot.body.export.path), true);

  const screenshotAgain = await request(server, 'POST', '/export/screenshot', {
    imageData: ONE_PIXEL_PNG
  });
  assert.equal(screenshotAgain.body.export.fileName, screenshot.body.export.fileName);
});
