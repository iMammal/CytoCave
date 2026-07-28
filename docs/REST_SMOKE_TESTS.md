# CytoCave REST Smoke Tests

Manual checks for the REST/session layer and the notebook-to-CytoCave
annotation path.

Use placeholders instead of hard-coded demo values:

- `<NODE_ID>`: zero-based node index from the loaded topology.
- `<VARIANT_ID>`: variant identifier returned by `/variants/load` or `/variants/compare`.
- `<DATASET_FOLDER>`: dataset folder under `data/`.
- `<LOOKUP_TABLE_ID>`: lookup table suffix without `LookupTable_`.
- `<LEFT_SUBJECT_ID>` and `<RIGHT_SUBJECT_ID>`: catalog subject IDs.
- `<ANNOTATION_TEXT>`: notebook-generated annotation text.

In Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`; these
examples use `Invoke-RestMethod`.

## 1. Start Server

```powershell
node server.js
```

Expected:

- Server listens on `http://localhost:3273`.
- `/visualization` is available.

## 2. Open One Persistent Notebook Iframe

```python
from IPython.display import IFrame, display

cytocave_frame = IFrame(
    "http://localhost:3273/visualization",
    width="100%",
    height=800,
)

display(cytocave_frame)
```

Expected:

- Exactly one CytoCave iframe is displayed.
- Later annotation, selection, highlight, and focus operations use REST; do
  not create or reload another iframe for routine notebook operations.

## 3. Get Current Session State

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3273/session/state" `
  -Method Get |
ConvertTo-Json -Depth 12
```

Expected:

- HTTP 200.
- Session includes `revision`, `view`, `viewports`, and `annotations.byNode`.

## 4. Compare Two Variants

```powershell
$body = @{
  datasetFolder = "<DATASET_FOLDER>"
  lookupTableId = "<LOOKUP_TABLE_ID>"
  left = @{
    subjectID = "<LEFT_SUBJECT_ID>"
  }
  right = @{
    subjectID = "<RIGHT_SUBJECT_ID>"
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

- Left and right viewports update in the existing iframe through session
  synchronization.
- Repeating the same request preserves the same session revision.

## 5. Load One Variant

```powershell
$body = @{
  viewport = "left"
  datasetFolder = "<DATASET_FOLDER>"
  lookupTableId = "<LOOKUP_TABLE_ID>"
  subjectID = "<LEFT_SUBJECT_ID>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/variants/load" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- The target viewport changes without reloading the iframe.
- `GET /session/state` shows the loaded viewport and revision.

## 6. Annotate A Node

Legacy-compatible request:

```powershell
$body = @{
  node = "<NODE_ID>"
  note = "<ANNOTATION_TEXT>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/api/annotate" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Structured request:

```powershell
$body = @{
  nodeId = "<NODE_ID>"
  text = "<ANNOTATION_TEXT>"
  kind = "analysis"
  source = "jupyter"
  variantId = "<VARIANT_ID>"
  viewport = "left"
  metrics = @{}
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://localhost:3273/api/annotate" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- `annotations.byNode.<NODE_ID>` appears in `/session/state`.
- The session revision changes when annotation content changes.
- Repeating an identical annotation request preserves the same revision.
- The existing iframe marks the annotated node and shows annotation text via
  the existing label overlay.

To remove an annotation without adding a new route, send `text = ""` or
`note = ""` for the same node and viewport.

## 7. Select Node

```powershell
$body = @{
  nodeId = "<NODE_ID>"
  viewport = "left"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/select-node" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- `view.selectedNode` is updated in `/session/state`.
- The existing iframe changes the node selection without reloading.

## 8. Focus Node Once

```powershell
$body = @{
  nodeId = "<NODE_ID>"
  viewport = "left"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/focus-node" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- `view.focusRequest` includes `nodeId`, `viewport`, and a new `requestId`.
- Each focus request gets a distinct `requestId`.
- The browser processes each `requestId` once; polling must not repeatedly
  reset the camera.

## 9. Highlight K-Means Assignment

```powershell
$body = @{
  viewport = "both"
  clusterId = "<KMEANS_ASSIGNMENT_ID>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/highlight-cluster" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- The session stores `view.highlightedCluster`.
- The iframe highlights the requested k-means assignment. Do not describe
  these assignments as graph communities.

## 10. Change Color Mapping

```powershell
$body = @{
  mode = "kmeans_cluster"
  left = "<LEFT_KMEANS_FIELD>"
  right = "<RIGHT_KMEANS_FIELD>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/view/color-by" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- Color mapping changes through session synchronization.
- Sending the same values again preserves the revision.

## 11. Change Layout

```powershell
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

Expected:

- Session view state changes.
- Browser updates through the same polling path.

## 12. Export Session

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3273/export/session" `
  -Method Post `
  -ContentType "application/json" `
  -Body "{}"
```

Expected:

- Session JSON is written under `exports/`.
- Export includes annotations, selected node, focus request, and revision.

## 13. Screenshot Export

From the browser, click `Screenshot`, or post a PNG data URL:

```powershell
$body = @{
  imageData = "<PNG_DATA_URL>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3273/export/screenshot" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- PNG is written under `exports/`.
- A visual screenshot match requires a real browser check.

## Notebook Helper Example

```python
import requests

CYTOCAVE = "http://localhost:3273"

def cytocave_annotate(node_id, text, **metadata):
    payload = {
        "nodeId": str(node_id),
        "text": text,
        "kind": metadata.pop("kind", "analysis"),
        "source": metadata.pop("source", "jupyter"),
        **metadata,
    }
    response = requests.post(f"{CYTOCAVE}/api/annotate", json=payload)
    response.raise_for_status()
    return response.json()

def cytocave_select_node(node_id, viewport="left"):
    response = requests.post(
        f"{CYTOCAVE}/view/select-node",
        json={"nodeId": str(node_id), "viewport": viewport},
    )
    response.raise_for_status()
    return response.json()

def cytocave_focus_node(node_id, viewport="left"):
    response = requests.post(
        f"{CYTOCAVE}/view/focus-node",
        json={"nodeId": str(node_id), "viewport": viewport},
    )
    response.raise_for_status()
    return response.json()

def cytocave_state():
    response = requests.get(f"{CYTOCAVE}/session/state")
    response.raise_for_status()
    return response.json()
```

Intended sequence:

```python
cytocave_annotate(
    node_id,
    computed_note,
    variantId=variant["variant_id"],
    kind="analysis",
    source="jupyter",
    metrics=computed_metrics,
    viewport="left",
)

cytocave_select_node(node_id, viewport="left")
cytocave_focus_node(node_id, viewport="left")
state = cytocave_state()
```

## Validation Checklist

- One `/visualization` iframe is sufficient.
- Annotation, selection, and focus operations use REST and do not reload the
  iframe.
- Annotation changes participate in session revisions.
- Identical annotation and selection requests preserve revisions where
  practical.
- Focus requests are distinguishable by `requestId`.
- Invalid node IDs and invalid viewports return HTTP 400 with useful errors.
- Existing variant, layout, color, k-means highlight, session export, and
  screenshot export routes remain functional.
