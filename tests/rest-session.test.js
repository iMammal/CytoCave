const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
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
  return requestRaw(server, method, urlPath, body).then((response) => ({
    ...response,
    body: response.body ? JSON.parse(response.body) : null
  }));
}

function requestRaw(server, method, urlPath, body) {
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
            headers: res.headers,
            body: data
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

function assertNoCacheHeaders(headers) {
  assert.equal(headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate');
  assert.equal(headers.pragma, 'no-cache');
  assert.equal(headers.expires, '0');
}

test('development responses include no-cache headers before routes and static assets', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const api = await requestRaw(server, 'GET', '/session/state');
  const html = await requestRaw(server, 'GET', '/visualization');
  const javascript = await requestRaw(server, 'HEAD', '/public/main.js');
  const css = await requestRaw(server, 'HEAD', '/style/style.css');

  assert.equal(api.statusCode, 200);
  assert.equal(html.statusCode, 200);
  assert.equal(javascript.statusCode, 200);
  assert.equal(css.statusCode, 200);
  assertNoCacheHeaders(api.headers);
  assertNoCacheHeaders(html.headers);
  assertNoCacheHeaders(javascript.headers);
  assertNoCacheHeaders(css.headers);
});

test('production mode does not apply development no-cache middleware', () => {
  const script = `
    const http = require('http');
    const { app, resetSessionForTests } = require('./server');
    resetSessionForTests();
    const server = app.listen(0, () => {
      const req = http.request({
        method: 'GET',
        host: '127.0.0.1',
        port: server.address().port,
        path: '/session/state'
      }, (res) => {
        const headers = {
          cacheControl: res.headers['cache-control'] || null,
          pragma: res.headers.pragma || null,
          expires: res.headers.expires || null
        };
        res.resume();
        res.on('end', () => {
          console.log(JSON.stringify(headers));
          server.close(() => process.exit(0));
        });
      });
      req.on('error', (error) => {
        console.error(error.stack || error.message);
        server.close(() => process.exit(1));
      });
      req.end();
    });
  `;
  const result = childProcess.spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'production'
    },
    encoding: 'utf8',
    timeout: 15000
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = result.stdout.trim().split(/\r?\n/).pop();
  const headers = JSON.parse(output);
  assert.equal(headers.cacheControl, null);
  assert.equal(headers.pragma, null);
  assert.equal(headers.expires, null);
});

test('REST session state exposes the primary k20/k40 comparison', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await request(server, 'GET', '/session/state');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.viewports.left.subjectID, 'UPENN-GBM-00013_11__n21760_s0_k20');
  assert.equal(response.body.viewports.right.subjectID, 'UPENN-GBM-00013_11__n21760_s0_k40');
  assert.equal(response.body.view.colorBy.left, 'KMeans_k20_c16_s0_Clustering');
  assert.equal(response.body.view.colorBy.right, 'KMeans_k40_c16_s0_Clustering');
  assert.equal(response.body.view.selectionMode, 'additive');
  assert.equal(response.body.view.revealNodeRequest, null);
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

test('reveal-node selects and focuses canonical node zero without mutating annotations', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const annotationBody = {
    nodeId: '0',
    text: 'Existing annotation remains byte-for-byte',
    kind: 'analysis',
    source: 'jupyter',
    viewport: 'left',
    metrics: { score: 4.2 }
  };
  const annotated = await request(server, 'POST', '/api/annotate', annotationBody);
  assert.equal(annotated.statusCode, 200);
  const preservedAnnotation = annotated.body.state.annotations.byNode['0'];

  const reveal = await request(server, 'POST', '/view/reveal-node', {
    viewport: 'left',
    nodeId: '000'
  });

  assert.equal(reveal.statusCode, 200);
  assert.equal(reveal.body.changed, true);
  assert.equal(reveal.body.requestId, reveal.body.state.view.revealNodeRequest.requestId);
  assert.deepEqual(reveal.body.selectedNode, { nodeId: '0', viewport: 'left' });
  assert.deepEqual(reveal.body.state.view.selectedNode, { nodeId: '0', viewport: 'left' });
  assert.equal(reveal.body.revealNodeRequest.nodeId, '0');
  assert.equal(reveal.body.revealNodeRequest.viewport, 'left');
  assert.equal(reveal.body.revealNodeRequest.select, true);
  assert.equal(reveal.body.revealNodeRequest.pinAnnotation, true);
  assert.equal(reveal.body.revealNodeRequest.focus, true);
  assert.deepEqual(reveal.body.resolvedNode, {
    nodeId: '0',
    viewport: 'left',
    datasetIndex: 0
  });
  assert.equal(reveal.body.annotationPresent, true);
  assert.equal(reveal.body.focusRequested, true);
  assert.deepEqual(reveal.body.state.annotations.byNode['0'], preservedAnnotation);
});

test('reveal-node preserves absent and unrelated annotations', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const annotationA = await request(server, 'POST', '/api/annotate', {
    nodeId: '0',
    text: 'Annotation A',
    viewport: 'left',
    metrics: { rank: 1 }
  });
  const annotationB = await request(server, 'POST', '/api/annotate', {
    nodeId: '2',
    text: 'Annotation B',
    viewport: 'left',
    metrics: { rank: 2 }
  });
  assert.equal(annotationA.statusCode, 200);
  assert.equal(annotationB.statusCode, 200);
  const beforeAnnotations = annotationB.body.state.annotations.byNode;

  const revealAnnotated = await request(server, 'POST', '/view/reveal-node', {
    nodeId: '0',
    viewport: 'left'
  });
  assert.equal(revealAnnotated.statusCode, 200);
  assert.deepEqual(revealAnnotated.body.state.annotations.byNode['2'], beforeAnnotations['2']);

  const revealUnannotated = await request(server, 'POST', '/view/reveal-node', {
    nodeId: '1',
    viewport: 'left'
  });
  assert.equal(revealUnannotated.statusCode, 200);
  assert.equal(revealUnannotated.body.annotationPresent, false);
  assert.equal(revealUnannotated.body.state.annotations.byNode['1'], undefined);
  assert.deepEqual(revealUnannotated.body.state.annotations.byNode['0'], beforeAnnotations['0']);
  assert.deepEqual(revealUnannotated.body.state.annotations.byNode['2'], beforeAnnotations['2']);
});

test('reveal-node is intentionally one-shot and does not disturb unrelated view state', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const state = await request(server, 'GET', '/session/state');
  const viewBefore = state.body.view;

  const first = await request(server, 'POST', '/view/reveal-node', {
    viewport: 'left',
    nodeId: '1'
  });
  const second = await request(server, 'POST', '/view/reveal-node', {
    viewport: 'left',
    nodeId: '1'
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(first.body.changed, true);
  assert.equal(second.body.changed, true);
  assert.notEqual(first.body.requestId, second.body.requestId);
  assert.notEqual(first.body.revision, second.body.revision);
  assert.notEqual(first.body.state.view.revealNodeRequest.requestId, second.body.state.view.revealNodeRequest.requestId);

  assert.deepEqual(second.body.state.view.glyphSizes, viewBefore.glyphSizes);
  assert.deepEqual(second.body.state.view.colorBy, viewBefore.colorBy);
  assert.deepEqual(second.body.state.view.orientation, viewBefore.orientation);
  assert.equal(second.body.state.view.layout, viewBefore.layout);
  assert.equal(second.body.state.view.edgeValueMode, viewBefore.edgeValueMode);
  assert.equal(second.body.state.view.selectionMode, viewBefore.selectionMode);
  assert.equal(second.body.state.view.highlightedCluster, viewBefore.highlightedCluster);
  assert.equal(second.body.state.view.focusRequest, viewBefore.focusRequest);
});

test('reveal-node validates viewport node and boolean options', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const badViewport = await request(server, 'POST', '/view/reveal-node', {
    nodeId: '0',
    viewport: 'both'
  });
  assert.equal(badViewport.statusCode, 400);
  assert.match(badViewport.body.error, /viewport must be left or right/);

  const missingNode = await request(server, 'POST', '/view/reveal-node', {
    viewport: 'left'
  });
  assert.equal(missingNode.statusCode, 400);
  assert.match(missingNode.body.error, /nodeId is required/);

  const outsideNode = await request(server, 'POST', '/view/reveal-node', {
    nodeId: '999999999',
    viewport: 'left'
  });
  assert.equal(outsideNode.statusCode, 400);
  assert.match(outsideNode.body.error, /outside viewport left|non-negative integer/);

  const badBoolean = await request(server, 'POST', '/view/reveal-node', {
    nodeId: '0',
    viewport: 'left',
    focus: 'yes'
  });
  assert.equal(badBoolean.statusCode, 400);
  assert.match(badBoolean.body.error, /focus must be true or false/);
});

test('reveal-node honors optional action flags without fabricating annotations', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const selected = await request(server, 'POST', '/view/select-node', {
    nodeId: '0',
    viewport: 'left'
  });
  assert.equal(selected.statusCode, 200);

  const reveal = await request(server, 'POST', '/view/reveal-node', {
    viewport: 'left',
    nodeId: '1',
    select: false,
    pinAnnotation: false,
    focus: false
  });

  assert.equal(reveal.statusCode, 200);
  assert.equal(reveal.body.changed, true);
  assert.deepEqual(reveal.body.state.view.selectedNode, { nodeId: '0', viewport: 'left' });
  assert.equal(reveal.body.revealNodeRequest.select, false);
  assert.equal(reveal.body.revealNodeRequest.pinAnnotation, false);
  assert.equal(reveal.body.revealNodeRequest.focus, false);
  assert.equal(reveal.body.focusRequested, false);
  assert.equal(reveal.body.annotationPresent, false);
  assert.equal(reveal.body.state.annotations.byNode['1'], undefined);
});

test('selection mode can be read and changed without GET mutation', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const stateBefore = await request(server, 'GET', '/session/state');
  const modeBefore = await request(server, 'GET', '/view/selection-mode');
  const stateAfterRead = await request(server, 'GET', '/session/state');

  assert.equal(modeBefore.statusCode, 200);
  assert.equal(modeBefore.body.selectionMode, 'additive');
  assert.equal(stateBefore.body.revision, stateAfterRead.body.revision);

  const replace = await request(server, 'POST', '/view/selection-mode', {
    selectionMode: 'replace'
  });
  assert.equal(replace.statusCode, 200);
  assert.equal(replace.body.selectionMode, 'replace');
  assert.equal(replace.body.state.view.selectionMode, 'replace');
  assert.notEqual(replace.body.revision, stateBefore.body.revision);

  const invalid = await request(server, 'POST', '/view/selection-mode', {
    selectionMode: 'exclusive'
  });
  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.body.error, /selectionMode must be additive or replace/);
});

test('edge value mode defaults to similarity and can be changed', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const before = await request(server, 'GET', '/view/edge-value-mode');
  assert.equal(before.statusCode, 200);
  assert.equal(before.body.edgeValueMode, 'similarity');
  assert.equal(before.body.state.view.edgeValueMode, 'similarity');

  const changed = await request(server, 'POST', '/view/edge-value-mode', {
    edgeValueMode: 'distance'
  });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.body.edgeValueMode, 'distance');
  assert.equal(changed.body.state.view.edgeValueMode, 'distance');

  const after = await request(server, 'GET', '/view/edge-value-mode');
  assert.equal(after.body.edgeValueMode, 'distance');
});

test('edge value mode rejects unsupported values clearly', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const invalid = await request(server, 'POST', '/view/edge-value-mode', {
    edgeValueMode: 'magnitude'
  });

  assert.equal(invalid.statusCode, 400);
  assert.match(invalid.body.error, /edgeValueMode must be one of: similarity, distance, binary/);
});

test('glyph size state defaults to five canonical shapes per viewport', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const state = await request(server, 'GET', '/session/state');
  assert.equal(state.statusCode, 200);
  assert.deepEqual(Object.keys(state.body.view.glyphSizes).sort(), ['left', 'right']);
  assert.deepEqual(state.body.view.glyphSizes.left, {
    sphere: 1,
    cube: 1,
    tetrahedron: 1,
    icosahedron: 1,
    star: 1
  });
  assert.deepEqual(state.body.view.glyphSizes.right, state.body.view.glyphSizes.left);
});

test('glyph size endpoint updates one shape in one viewport and is idempotent', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const before = await request(server, 'GET', '/session/state');
  const changed = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'left',
    shape: 'tetrahedron',
    value: 1.25
  });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.body.changed, true);
  assert.equal(changed.body.state.view.glyphSizes.left.tetrahedron, 1.25);
  assert.equal(changed.body.state.view.glyphSizes.right.tetrahedron, 1);
  assert.notEqual(changed.body.revision, before.body.revision);

  const repeated = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'left',
    shape: 'tetrahedron',
    value: 1.25
  });
  assert.equal(repeated.statusCode, 200);
  assert.equal(repeated.body.changed, false);
  assert.equal(repeated.body.revision, changed.body.revision);
});

test('glyph size endpoint supports viewport both, aliases, and multi-shape updates', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const both = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'both',
    shape: 'box',
    value: 0.8
  });
  assert.equal(both.statusCode, 200);
  assert.equal(both.body.state.view.glyphSizes.left.cube, 0.8);
  assert.equal(both.body.state.view.glyphSizes.right.cube, 0.8);
  assert.equal(both.body.sizes.cube, 0.8);
  assert.equal(both.body.state.view.glyphSizes.left.box, undefined);

  const multi = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'right',
    sizes: {
      tetra: 1.2,
      icosa: 1.1,
      star: 0.9
    }
  });
  assert.equal(multi.statusCode, 200);
  assert.equal(multi.body.state.view.glyphSizes.right.tetrahedron, 1.2);
  assert.equal(multi.body.state.view.glyphSizes.right.icosahedron, 1.1);
  assert.equal(multi.body.state.view.glyphSizes.right.star, 0.9);
  assert.equal(multi.body.state.view.glyphSizes.left.tetrahedron, 1);
});

test('glyph size endpoint validates shape viewport and values', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const lower = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'left',
    shape: 'sphere',
    value: 0.2
  });
  assert.equal(lower.statusCode, 200);
  assert.equal(lower.body.state.view.glyphSizes.left.sphere, 0.2);

  const upper = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'right',
    shape: 'star',
    value: 4
  });
  assert.equal(upper.statusCode, 200);
  assert.equal(upper.body.state.view.glyphSizes.right.star, 4);

  const badShape = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'left',
    shape: 'pyramid',
    value: 1
  });
  assert.equal(badShape.statusCode, 400);
  assert.match(badShape.body.error, /glyph size shape must be one of/);

  const badViewport = await request(server, 'POST', '/view/glyph-size', {
    viewport: 'center',
    shape: 'sphere',
    value: 1
  });
  assert.equal(badViewport.statusCode, 400);
  assert.match(badViewport.body.error, /viewport must be left, right, or both/);

  for (const value of [null, true, 'abc', 0.1, 4.1]) {
    const badValue = await request(server, 'POST', '/view/glyph-size', {
      viewport: 'left',
      shape: 'sphere',
      value
    });
    assert.equal(badValue.statusCode, 400);
    assert.match(badValue.body.error, /glyph size value/);
  }
});

test('variant edge value mode can be loaded from request configuration', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await request(server, 'POST', '/variants/compare', {
    edgeValueMode: 'binary'
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.state.view.edgeValueMode, 'binary');
  assert.equal(response.body.variants.left.graph.edgeValueMode, 'binary');
  assert.equal(response.body.variants.right.graph.edgeValueMode, 'binary');
});

test('UPENN module clustering columns load through REST view state', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const moduleVariant = {
    datasetFolder: 'UPENN_GBM_C16_COMPARE',
    lookupTableId: 'upenn_gbm_c16_compare',
    subjectID: 'UPENN-GBM-00002_11__n64000_s0_k20_c16'
  };

  const loaded = await request(server, 'POST', '/variants/load', {
    viewport: 'left',
    ...moduleVariant
  });
  assert.equal(loaded.statusCode, 200);
  assert.equal(loaded.body.variant.graph.clusterColumn, 'UPENNModuleClustering');
  assert.equal(loaded.body.variant.graph.nodeCount, 64000);
  assert.equal(loaded.body.state.view.colorBy.left, 'UPENNModuleClustering');
  assert.equal(loaded.body.state.view.colorBy.mode, 'module_cluster');

  const compared = await request(server, 'POST', '/variants/compare', {
    datasetFolder: 'UPENN_GBM_C16_COMPARE',
    lookupTableId: 'upenn_gbm_c16_compare',
    left: {
      subjectID: 'UPENN-GBM-00002_11__n64000_s0_k20_c16'
    },
    right: {
      subjectID: 'UPENN-GBM-00006_11__n64000_s0_k20_c16'
    }
  });
  assert.equal(compared.statusCode, 200);
  assert.equal(compared.body.variants.left.graph.clusterColumn, 'UPENNModuleClustering');
  assert.equal(compared.body.variants.right.graph.clusterColumn, 'UPENNModuleClustering');
  assert.equal(compared.body.state.view.colorBy.mode, 'module_cluster');

  const color = await request(server, 'POST', '/view/color-by', {
    field: 'UPENNModule'
  });
  assert.equal(color.statusCode, 200);
  assert.equal(color.body.state.view.colorBy.mode, 'module_cluster');
  assert.equal(color.body.state.view.colorBy.left, 'UPENNModule');
  assert.equal(color.body.state.view.colorBy.right, 'UPENNModule');

  const highlight = await request(server, 'POST', '/view/highlight-cluster', {
    clusterId: 7,
    viewport: 'both'
  });
  assert.equal(highlight.statusCode, 200);
  assert.equal(highlight.body.state.view.highlightedCluster.mode, 'module_cluster');
  assert.equal(highlight.body.state.view.highlightedCluster.leftField, 'UPENNModule');
  assert.equal(highlight.body.state.view.highlightedCluster.rightField, 'UPENNModule');
});

test('schema clustering columns are discovered without hard-coded UPENN names', () => {
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(serverSource, /function isSchemaClusteringColumn\(field\)/);
  assert.match(serverSource, /name\.endsWith\('Clustering'\)/);
  assert.match(serverSource, /name\.length > 'Clustering'\.length/);
  assert.match(serverSource, /function clusteringColumnBase\(field\)/);
  assert.match(serverSource, /function isKMeansClusterColumn\(field\)/);
  assert.match(serverSource, /isKMeansClusterColumn\(field\) \|\| isSchemaClusteringColumn\(field\)/);
  assert.match(serverSource, /knownNonKMeansColumns\.some/);
  assert.doesNotMatch(serverSource, /isUpennModuleClusterColumn/);
});

test('select-node supports explicit replacement override while default remains replace', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const additive = await request(server, 'POST', '/view/select-node', {
    nodeId: '0',
    viewport: 'left',
    replaceSelection: false
  });
  assert.equal(additive.statusCode, 200);
  assert.deepEqual(additive.body.state.view.selectedNode, {
    nodeId: '0',
    viewport: 'left',
    replaceSelection: false
  });

  const defaultReplace = await request(server, 'POST', '/view/select-node', {
    nodeId: '1',
    viewport: 'left'
  });
  assert.equal(defaultReplace.statusCode, 200);
  assert.deepEqual(defaultReplace.body.state.view.selectedNode, {
    nodeId: '1',
    viewport: 'left'
  });
});

test('selection replacement preserves annotations and supports node zero', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const state = await request(server, 'GET', '/session/state');
  assert.ok(state.body.viewports.left.graph.nodeCount === null || state.body.viewports.left.graph.nodeCount > 1);

  const annotated = await request(server, 'POST', '/api/annotate', {
    nodeId: '0',
    text: 'Annotation preserved while native selection changes',
    viewport: 'left',
    metrics: { score: 2 }
  });
  assert.equal(annotated.statusCode, 200);

  const selectedZero = await request(server, 'POST', '/view/select-node', {
    nodeId: '0',
    viewport: 'left'
  });
  assert.equal(selectedZero.statusCode, 200);
  assert.deepEqual(selectedZero.body.state.view.selectedNode, { nodeId: '0', viewport: 'left' });
  assert.equal(selectedZero.body.state.annotations.byNode['0'].text, 'Annotation preserved while native selection changes');

  const selectedOne = await request(server, 'POST', '/view/select-node', {
    nodeId: '1',
    viewport: 'left'
  });
  assert.equal(selectedOne.statusCode, 200);
  assert.deepEqual(selectedOne.body.state.view.selectedNode, { nodeId: '1', viewport: 'left' });
  assert.equal(selectedOne.body.state.annotations.byNode['0'].text, 'Annotation preserved while native selection changes');
});

test('annotation creation does not alter selection mode or selected node', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const mode = await request(server, 'POST', '/view/selection-mode', {
    selectionMode: 'replace'
  });
  assert.equal(mode.statusCode, 200);

  const selected = await request(server, 'POST', '/view/select-node', {
    nodeId: '0',
    viewport: 'left'
  });
  assert.equal(selected.statusCode, 200);

  const annotated = await request(server, 'POST', '/api/annotate', {
    nodeId: '1',
    text: 'Annotation does not select this node',
    viewport: 'left'
  });
  assert.equal(annotated.statusCode, 200);
  assert.deepEqual(annotated.body.state.view.selectedNode, { nodeId: '0', viewport: 'left' });
  assert.equal(annotated.body.state.view.selectionMode, 'replace');
  assert.equal(annotated.body.state.annotations.byNode['1'].text, 'Annotation does not select this node');
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
