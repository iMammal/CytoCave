# DeepCytoCave Linninger POC Demo

## Launch

```powershell
npm install
npm run prod
node server.js
```

Open:

```text
http://localhost:3273/visualization.html?dataset=UPENN_GBM_00013_C16_KCOMPARE&lut=upenn_gbm_00013_c16_kcompare&load=0&metric=0&mobile=0&neuro=0&leftSubject=UPENN-GBM-00013_11__n21760_s0_k20&rightSubject=UPENN-GBM-00013_11__n21760_s0_k40
```

Expected view:

- Left viewport: `UPENN-GBM-00013 k20, seed 0, C16`
- Right viewport: `UPENN-GBM-00013 k40, seed 0, C16`
- Color-by fields: `KMeans_k20_c16_s0_Clustering` and `KMeans_k40_c16_s0_Clustering`

## REST Smoke Test

In another PowerShell:

```powershell
Invoke-RestMethod http://localhost:3273/session/state
Invoke-RestMethod -Method Post http://localhost:3273/variants/compare -ContentType 'application/json' -Body '{}'
Invoke-RestMethod -Method Post http://localhost:3273/view/highlight-cluster -ContentType 'application/json' -Body '{"clusterId":6,"viewport":"both"}'
Invoke-RestMethod -Method Post http://localhost:3273/export/session -ContentType 'application/json' -Body '{}'
```

The browser bridge polls `/session/state`; the highlight command makes cluster `6` active and leaves other clusters transparent in both viewports.

## Screenshot Export

Use the `Screenshot` button in the top-right menu after the view renders. The server writes the combined left/right PNG under `exports/`.

Programmatic browser export is also available:

```javascript
await window.DeepCytoCave.exportScreenshot()
```

## Automated Tests

```powershell
npm test
```

The test suite verifies the default k20/k40 state, idempotent compare requests, cluster highlight state, session JSON export, and screenshot endpoint determinism.
