# REST_SMOKE_TESTS.md

# CytoCave REST Smoke Tests

This document captures the manual REST validation performed for the
CytoCave REST/session layer.

## Purpose

These tests verify:

-   REST endpoints are reachable.
-   The authoritative server-side session state updates correctly.
-   Browser synchronization works.
-   State transitions are deterministic.
-   Idempotent requests do **not** create unnecessary revisions.
-   Session export works.

## PowerShell note

In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`.

Use either:

-   `Invoke-RestMethod`
-   `curl.exe`

The Linux-style examples using `curl -X -H -d` will not work with the
PowerShell alias.

------------------------------------------------------------------------

# 1. Get current session state

``` powershell
Invoke-RestMethod `
  -Uri "http://localhost:3273/session/state" `
  -Method Get |
ConvertTo-Json -Depth 12
```

Expected:

-   HTTP 200
-   JSON session object
-   Current revision
-   Dataset metadata
-   View configuration

------------------------------------------------------------------------

# 2. Compare two variants

``` powershell
$body = @{
  datasetFolder = "UPENN_GBM_00013_C16_KCOMPARE"
  lookupTableId = "upenn_gbm_00013_c16_kcompare"
  left = @{
    subjectID = "UPENN-GBM-00013_11__n21760_s0_k20"
  }
  right = @{
    subjectID = "UPENN-GBM-00013_11__n21760_s0_k40"
  }
  layout = "side-by-side"
  syncOrientation = $true
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://localhost:3273/variants/compare" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

-   Variants load into left/right viewports.
-   Browser updates.
-   Revision changes only if the comparison differs from the current
    state.

------------------------------------------------------------------------

# 3. Load a single variant

Left viewport:

``` powershell
$body = @{
  viewport = "left"
  datasetFolder = "UPENN_GBM_00013_C16_KCOMPARE"
  lookupTableId = "upenn_gbm_00013_c16_kcompare"
  subjectID = "UPENN-GBM-00013_11__n21760_s0_k20"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/variants/load" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Repeat for the right viewport with the k40 subject.

------------------------------------------------------------------------

# 4. Highlight cluster

``` powershell
$body = @{
  viewport = "both"
  clusterId = 7
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/highlight-cluster" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

-   Highlight changes immediately.
-   Session revision changes.

------------------------------------------------------------------------

# 5. Change color mapping

Example:

``` powershell
$body = @{
  mode = "kmeans_cluster"
  left = "KMeans_k40_c16_s0_Clustering"
  right = "KMeans_k20_c16_s0_Clustering"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/color-by" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Important:

Sending the **same** values already present in the session is expected
to be a no-op and should not change the session revision.

------------------------------------------------------------------------

# 6. Change layout

``` powershell
$body = @{
  layout = "side-by-side"
  syncOrientation = $false
  orientationSource = "left"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/layout" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Verify:

-   Session state changes.
-   Browser updates.
-   Revision changes.

------------------------------------------------------------------------

# 7. Export session

``` powershell
Invoke-RestMethod `
  -Uri "http://localhost:3273/export/session" `
  -Method Post `
  -ContentType "application/json" `
  -Body "{}"
```

Expected:

-   Session JSON written to the exports directory.
-   Export reflects current authoritative session.

------------------------------------------------------------------------

# 8. Screenshot export

Use the browser Screenshot button.

Expected:

-   PNG written to the exports directory.
-   Screenshot matches current visualization.

------------------------------------------------------------------------

# Idempotence

A key property of the REST session model is idempotence.

Repeated requests that do not change the session state should:

-   return success,
-   preserve the current revision,
-   avoid unnecessary updates.

Only genuine state changes should generate a new revision identifier.

------------------------------------------------------------------------

# Outcome

The manual smoke tests confirmed successful operation of:

-   GET /session/state
-   POST /variants/load
-   POST /variants/compare
-   POST /view/highlight-cluster
-   POST /view/color-by
-   POST /view/layout
-   POST /export/session
-   Browser screenshot export

These tests validate the end-to-end path:

Client → REST API → Authoritative Session → Browser Synchronization →
Export
