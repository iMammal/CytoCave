Bidirectional interaction would turn the current Aim 1 pipeline from a one-way “analysis pushes results into CytoCave” demo into a true coordinated-analysis loop.

Right now, the flow is:

```text
Notebook computes
→ REST writes annotation/selection/focus
→ CytoCave updates
```

Bidirectional interaction adds the return path:

```text
User selects or manipulates something in CytoCave
→ session state records that interaction
→ notebook detects it
→ Python computes the next analysis
→ results return to CytoCave
```

That is a much stronger Aim 1 story because it demonstrates not only visualization of computational results, but interactive analytical steering across environments.

## Development plan

### Phase 1: Make CytoCave user actions authoritative

The current server already has authoritative session state. Extend it so frontend actions write back into that state.

At minimum, capture:

```json
{
  "interaction": {
    "selectedNode": {
      "nodeId": "36",
      "viewport": "left",
      "source": "cytocave",
      "timestamp": "..."
    },
    "hoveredNode": null,
    "selectedCluster": null,
    "camera": null
  }
}
```

The key first endpoint should be something like:

```text
POST /interaction/select-node
```

called by the CytoCave frontend when the user clicks or selects a node.

Example:

```json
{
  "nodeId": "36",
  "viewport": "left",
  "source": "cytocave"
}
```

This should update session state and revision just like notebook-issued commands do.

Important distinction:

* `view.selectedNode` = desired current selection
* `interaction.lastEvent` = who changed it, when, and how

That prevents feedback loops and preserves provenance.

---

### Phase 2: Add event provenance and loop prevention

Without provenance, the notebook could select node 36, CytoCave could echo the same selection back, and the notebook might treat that as a new user action.

Add fields like:

```json
{
  "eventId": "evt-123",
  "origin": "cytocave",
  "action": "select-node",
  "nodeId": "36",
  "viewport": "left",
  "timestamp": "...",
  "causedBy": null
}
```

Notebook-originated actions should similarly carry:

```json
{
  "origin": "jupyter"
}
```

Then the notebook can ignore events it caused itself.

A simple rule:

```text
Process only events whose eventId has not been seen
and whose origin is not "jupyter"
```

This is essential for stable bidirectional behavior.

---

### Phase 3: Expose an interaction event stream

Polling `/session/state` every second is enough for the first version.

Add either:

```text
GET /interaction/events?after=<eventId>
```

or include:

```json
{
  "interaction": {
    "lastEvent": {...},
    "eventSequence": 42
  }
}
```

inside `/session/state`.

For Aim 1, a monotonically increasing sequence number is probably sufficient:

```json
{
  "eventSequence": 42,
  "lastEvent": {
    "eventId": "42",
    "origin": "cytocave",
    "action": "select-node",
    "nodeId": "36"
  }
}
```

Later, if you need lower latency or multiple rapid events, move to:

* Server-Sent Events
* WebSocket
* event queue/history

But I would not start there. Polling is already working and keeps the architecture simpler.

---

### Phase 4: Add notebook-side interaction listeners

Create a notebook helper that watches for new CytoCave events.

Conceptually:

```python
import time
import requests

last_sequence = None

def poll_cytocave_events():
    global last_sequence

    state = requests.get(
        "http://localhost:3273/session/state",
        timeout=10,
    ).json()

    interaction = state.get("interaction", {})
    sequence = interaction.get("eventSequence")
    event = interaction.get("lastEvent")

    if sequence is None or sequence == last_sequence:
        return None

    last_sequence = sequence

    if event and event.get("origin") == "cytocave":
        return event

    return None
```

Then a notebook loop can react:

```python
while True:
    event = poll_cytocave_events()

    if event and event["action"] == "select-node":
        selected_node = event["nodeId"]
        print("CytoCave selected:", selected_node)

        # Run Python analysis for that node here.

    time.sleep(1)
```

For notebooks, a blocking infinite loop is awkward. Better options are:

* a lightweight background thread;
* an `ipywidgets` button to poll once;
* an async task;
* a “process latest interaction” cell.

For the first demo, I would use a manual or timer-driven polling helper rather than background threading.

---

### Phase 5: Define the first closed-loop analysis

The demo needs one clear interaction-to-analysis cycle.

A good first example:

1. User selects a node in CytoCave.
2. Notebook receives the selected node ID.
3. Python computes:

   * in-degree;
   * out-degree;
   * module;
   * cross-cluster boundary fraction;
   * nearest-neighbor composition.
4. Notebook posts a structured annotation back.
5. CytoCave updates the callout and detail panel without reload.

That gives a complete loop:

```text
User selects node
→ notebook analyzes node
→ CytoCave displays computed result
```

This is much more compelling than a fixed precomputed node 36 demo.
---
This is now ready for MVP demo.
---

### Phase 6: Add cluster-level interaction

After node selection works, add:

```text
POST /interaction/select-cluster
```

Payload:

```json
{
  "clusterId": 8,
  "viewport": "left",
  "source": "cytocave"
}
```

Notebook responses could include:

* cluster size;
* mean in-degree;
* median in-degree;
* boundary-node ranking;
* comparison against the corresponding k=40 cluster;
* enriched metadata if available later.

This advances the demo from node lookup to exploratory sensemaking.

---

### Phase 7: Add region or multi-node selection

A more advanced interaction is selecting a set of nodes with a lasso, box, or spatial brush.

State shape:

```json
{
  "action": "select-nodes",
  "nodeIds": ["36", "41", "77"],
  "viewport": "left"
}
```

Notebook can then compute:

* induced subgraph statistics;
* module composition;
* cross-cluster connectivity;
* central nodes;
* local structural anomalies.

This would make the workflow feel genuinely exploratory rather than scripted.

---

## How it advances Aim 1

The current Aim 1 workflow proves:

> A computational notebook can control and annotate an immersive visualization.

Bidirectional interaction would let Aim 1 claim:

> The notebook and immersive environment form a coordinated analytical system in which either side can initiate analysis.

That is a significant conceptual improvement.

### 1. From visualization output to analytical partner

One-way interaction treats CytoCave as a display target.

Bidirectional interaction makes CytoCave an input device for analysis.

The user can point, select, and inspect in 3D, then invoke Python computations on exactly what they found visually.

---

### 2. Supports human-in-the-loop analysis

The human contributes spatial judgment:

* “this node looks central”
* “this region bridges two modules”
* “this cluster looks fragmented”
* “these two kNN variants differ here”

The notebook contributes exact computation:

* degree;
* boundary fraction;
* neighbor composition;
* graph-distance metrics;
* statistical comparison.

That division of labor is a strong Aim 1 narrative.

---

### 3. Makes the workflow iterative instead of linear

Current workflow:

```text
compute once
→ annotate once
→ inspect
```

Bidirectional workflow:

```text
inspect
→ select
→ compute
→ annotate
→ inspect result
→ refine selection
→ compute again
```

That iterative loop is much closer to real scientific sensemaking.

---

### 4. Strengthens provenance

Because every interaction can be recorded with:

* origin;
* node or cluster;
* viewport;
* event ID;
* timestamp;
* derived annotation;
* analysis parameters;

the session becomes reproducible.

You can reconstruct:

```text
User selected node 36
Notebook computed in-degree and boundary score
Notebook returned annotation A
User then selected cluster 8
Notebook computed cluster summary B
```

That is valuable scientifically and for evaluation.

---

### 5. Enables evaluation of coordinated views

Aim 1 could eventually evaluate:

* latency from VR selection to notebook response;
* correctness of selected-node identity;
* consistency between left and right viewports;
* whether users discover meaningful structures faster;
* how often notebook analyses change user interpretation;
* whether annotations reduce navigation cost.

That gives the aim measurable system outcomes rather than only a visual demo.

## Recommended minimal milestone

I would keep the first bidirectional milestone very small:

```text
CytoCave click
→ POST selected node to session
→ notebook polls latest event
→ notebook computes 4 graph metrics
→ notebook posts annotation
→ CytoCave updates callout and panel
```

No WebSockets yet.
No lasso yet.
No full event log yet.
No automatic continuous execution yet.

Just one clean, repeatable closed loop.

## Suggested implementation order

1. Add `interaction.lastEvent` and `eventSequence` to session state.
2. Make frontend node selection POST an interaction event.
3. Add origin and event IDs.
4. Add notebook polling helper.
5. Add one node-analysis callback.
6. Confirm no feedback loop.
7. Add tests.
8. Record the closed-loop demo.
9. Then add cluster selection.
10. Later consider SSE or WebSockets.

## Aim 1 before and after

Before:

```text
Notebook-driven visualization annotation
```

After:

```text
Bidirectional, provenance-aware, human-in-the-loop immersive analysis
```

That wording is much closer to a defensible systems contribution.
