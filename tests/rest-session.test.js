const assert = require('assert');
const fs = require('fs');
const http = require('http');
const test = require('node:test');
const { app } = require('../server');

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function startServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
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
