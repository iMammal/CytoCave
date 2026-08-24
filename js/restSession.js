import {getDataFile} from "./globals";
import {modelLeft, modelRight} from "./model";
import {
    changeSceneToSubject,
    changeColorGroup,
    previewAreaLeft,
    previewAreaRight,
    updateNodesVisiblity,
    selectNodeByIndex,
    clearNodeSelection,
    setSelectionMode,
    getSelectionMode
} from "./drawing";
import {buildAnnotationDetailModel} from "./annotationPresentation";
import {refreshEdgeValueModeControls, syncGlyphSizeSliders} from "./GUI";
import {normalizeEdgeValueMode} from "./incidentEdges";
import {CANONICAL_GLYPH_SHAPES, normalizeGlyphSizes} from "./glyphSizeState";

var lastAppliedRevision = null;
var pendingVariantApplyUntil = 0;
var lastHighlightKey = null;
var lastColorBy = {left: null, right: null};
var lastSelectedKey = null;
var lastAnnotationsKey = null;
var lastFocusRequestId = null;
var lastRevealNodeRequestId = null;
var lastSessionState = null;
var lastSelectionMode = null;
var lastEdgeValueMode = null;
var lastGlyphSizesKey = null;
var lastOrientationKey = null;

function sideName(side) {
    return side === "left" ? "Left" : "Right";
}

function modelFor(side) {
    return side === "left" ? modelLeft : modelRight;
}

function previewFor(side) {
    return side === "left" ? previewAreaLeft : previewAreaRight;
}

function findSubjectIndex(subjectID) {
    var dataFiles = getDataFile();
    for (var i = 0; i < dataFiles.length; i++) {
        if (dataFiles[i].subjectID === subjectID) {
            return i;
        }
    }
    return -1;
}

function fieldAvailable(side, field) {
    return Boolean(resolveColorField(side, field));
}

function normalizeClusterFieldName(field) {
    return String(field || "").replace("Clustering", "");
}

function resolveColorField(side, field) {
    if (!field) return false;
    var selectId = side === "left" ? "colorCodingMenuLeft" : "colorCodingMenu";
    var select = document.getElementById(selectId);
    if (!select) return false;
    var normalizedField = normalizeClusterFieldName(field);
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === field || select.options[i].value === normalizedField) {
            return select.options[i].value;
        }
    }
    return false;
}

function setSelectValue(selectId, value) {
    var select = document.getElementById(selectId);
    if (!select || !value) return null;
    var normalizedValue = normalizeClusterFieldName(value);
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value || select.options[i].value === normalizedValue) {
            select.selectedIndex = i;
            return select.options[i].value;
        }
    }
    return null;
}

function applyVariant(side, state) {
    var viewport = state.viewports && state.viewports[side];
    if (!viewport || !viewport.subjectID) return false;

    var select = document.getElementById("subjectMenu" + sideName(side));
    if (!select || select.value === viewport.subjectID) return false;

    var subjectIndex = findSubjectIndex(viewport.subjectID);
    if (subjectIndex < 0) {
        console.warn("Session subject not found in loaded catalog:", viewport.subjectID);
        return false;
    }

    select.selectedIndex = subjectIndex;
    changeSceneToSubject(subjectIndex, modelFor(side), previewFor(side), sideName(side));
    return true;
}

function applyColorBy(state) {
    var colorBy = state.view && state.view.colorBy;
    if (!colorBy) return;

    var leftField = colorBy.left || colorBy.field;
    var rightField = colorBy.right || colorBy.field;

    if (leftField && lastColorBy.left !== leftField && fieldAvailable("left", leftField)) {
        var resolvedLeftField = setSelectValue("colorCodingMenuLeft", leftField);
        changeColorGroup(resolvedLeftField, "Left");
        lastColorBy.left = leftField;
    }

    if (rightField && lastColorBy.right !== rightField && fieldAvailable("right", rightField)) {
        var resolvedRightField = setSelectValue("colorCodingMenu", rightField);
        changeColorGroup(resolvedRightField, "Right");
        lastColorBy.right = rightField;
    }
}

function setClusterHighlightForSide(side, field, clusterId) {
    var model = modelFor(side);
    var resolvedField = resolveColorField(side, field);
    if (!model || !resolvedField) return;

    if (model.getActiveGroupName() !== resolvedField) {
        changeColorGroup(resolvedField, sideName(side));
    }

    var target = String(clusterId);
    model.setAllRegionsActivated();
    var groups = model.getActiveGroup();
    for (var i = 0; i < groups.length; i++) {
        var state = String(groups[i]) === target ? "active" : "transparent";
        model.toggleRegion(groups[i], state);
    }
    updateNodesVisiblity(sideName(side));
}

function clearClusterHighlightForSide(side) {
    var model = modelFor(side);
    if (!model) return;
    model.setAllRegionsActivated();
    updateNodesVisiblity(sideName(side));
}

function applyHighlight(state) {
    var highlight = state.view && state.view.highlightedCluster;
    var highlightKey = highlight ? JSON.stringify(highlight) : null;
    if (highlightKey === lastHighlightKey) return;

    if (!highlight) {
        if (lastHighlightKey) {
            clearClusterHighlightForSide("left");
            clearClusterHighlightForSide("right");
        }
        lastHighlightKey = null;
        return;
    }

    var viewport = highlight.viewport || "both";
    if (viewport === "both" || viewport === "left") {
        setClusterHighlightForSide("left", highlight.leftField || state.view.colorBy.left, highlight.clusterId);
    }
    if (viewport === "both" || viewport === "right") {
        setClusterHighlightForSide("right", highlight.rightField || state.view.colorBy.right, highlight.clusterId);
    }
    lastHighlightKey = highlightKey;
}

function orientationKeyForState(state) {
    var view = state && state.view ? state.view : {};
    var orientation = view.orientation || {};
    return JSON.stringify({
        layout: view.layout || null,
        synchronized: orientation.synchronized === true,
        source: orientation.source || "left",
        requestId: orientation.requestId || orientation.revision || null
    });
}

function applyOrientation(state) {
    var orientationKey = orientationKeyForState(state);
    if (orientationKey === lastOrientationKey) return;
    lastOrientationKey = orientationKey;

    var orientation = state.view && state.view.orientation;
    if (!orientation || !orientation.synchronized || !previewAreaLeft || !previewAreaRight) return;
    if (orientation.source === "right") {
        previewAreaLeft.syncCameraWith(previewAreaRight.getCamera());
    } else {
        previewAreaRight.syncCameraWith(previewAreaLeft.getCamera());
    }
}

function filterAnnotationsForSide(state, side) {
    var annotations = state.annotations && state.annotations.byNode ? state.annotations.byNode : {};
    var result = {};
    Object.keys(annotations).forEach(function (nodeId) {
        var annotation = annotations[nodeId];
        var viewport = annotation.viewport || "left";
        if (viewport === side) {
            result[nodeId] = annotation;
        }
    });
    return result;
}

function selectedNodeForSide(state, side) {
    var selected = state.view && state.view.selectedNode;
    if (!selected || selected.viewport !== side) return null;
    return selected.nodeId;
}

function detailPanelFor(side) {
    var host = document.getElementById("nodeInfoPanel" + sideName(side));
    if (!host) return null;
    var panelId = "annotationDetail" + sideName(side);
    var panel = document.getElementById(panelId);
    if (!panel) {
        panel = document.createElement("div");
        panel.id = panelId;
        panel.className = "annotation-detail annotation-detail-" + side;
        host.appendChild(panel);
    }
    return panel;
}

function appendDetailRow(parent, label, value) {
    if (value === undefined || value === null || value === "") return;
    var row = document.createElement("div");
    row.className = "annotation-detail-row";

    var key = document.createElement("span");
    key.className = "annotation-detail-key";
    key.textContent = label;

    var val = document.createElement("span");
    val.className = "annotation-detail-value";
    val.textContent = String(value);

    row.appendChild(key);
    row.appendChild(val);
    parent.appendChild(row);
}

function renderAnnotationDetail(side, detailModel, selectedNodeId) {
    var panel = detailPanelFor(side);
    if (!panel) return;
    panel.innerHTML = "";
    if (detailModel.empty && (selectedNodeId === undefined || selectedNodeId === null)) {
        panel.hidden = true;
        return;
    }
    panel.hidden = false;

    var title = document.createElement("div");
    title.className = "annotation-detail-title";
    title.textContent = detailModel.title;
    panel.appendChild(title);

    var rows = document.createElement("div");
    rows.className = "annotation-detail-rows";
    detailModel.rows.forEach(function (row) {
        appendDetailRow(rows, row.label, row.value);
    });
    panel.appendChild(rows);

    if (detailModel.metrics && detailModel.metrics.length) {
        var metricsTitle = document.createElement("div");
        metricsTitle.className = "annotation-detail-section";
        metricsTitle.textContent = "Metrics";
        panel.appendChild(metricsTitle);

        var metrics = document.createElement("div");
        metrics.className = "annotation-detail-rows annotation-detail-metrics";
        detailModel.metrics.forEach(function (metric) {
            appendDetailRow(metrics, metric.label, metric.value);
        });
        panel.appendChild(metrics);
    }
}

function updateAnnotationDetailForSide(state, side, sideAnnotations, selectedNodeId) {
    var annotation = selectedNodeId ? sideAnnotations[selectedNodeId] : null;
    var detailModel = buildAnnotationDetailModel(annotation, {
        selectedNodeId: selectedNodeId,
        viewport: selectedNodeId ? side : null
    });
    renderAnnotationDetail(side, detailModel, selectedNodeId);
}

function renderSelectedNodeAnnotation(state, side) {
    var preview = previewFor(side);
    if (!preview || !preview.applyAnnotations) return;

    var sideAnnotations = filterAnnotationsForSide(state, side);
    var selectedNodeId = selectedNodeForSide(state, side);
    var annotation = selectedNodeId ? sideAnnotations[selectedNodeId] : null;

    preview.applyAnnotations(sideAnnotations, selectedNodeId);
    updateAnnotationDetailForSide(state, side, sideAnnotations, selectedNodeId);

    if (selectedNodeId && annotation && preview.updateSelectedNodeLabelByIndex) {
        preview.updateSelectedNodeLabelByIndex(selectedNodeId, annotation);
    } else if (selectedNodeId && annotation && preview.updateNodeLabelByIndex) {
        preview.updateNodeLabelByIndex(selectedNodeId, annotation);
    } else if (preview.clearSelectedNodeLabel) {
        preview.clearSelectedNodeLabel();
    } else if (preview.clearNodeLabel) {
        preview.clearNodeLabel();
    }
}

function applyLocalSelectionPresentation(detail) {
    if (!lastSessionState || !detail || !detail.viewport) return;
    var side = detail.viewport === "right" ? "right" : "left";
    var selectedNodeId = selectedNodeForSide(lastSessionState, side);
    if (!selectedNodeId || String(selectedNodeId) !== String(detail.nodeId) || detail.selected === false) return;
    renderSelectedNodeAnnotation(lastSessionState, side);
}

function applySelection(state) {
    var selected = state.view && state.view.selectedNode;
    var selectedKey = selected ? JSON.stringify(selected) : null;
    if (selectedKey === lastSelectedKey) return;

    if (selected) {
        var replaceSelection = selected.replaceSelection !== false;
        selectNodeByIndex(selected.viewport, selected.nodeId, {
            replaceSelection: replaceSelection,
            toggleSelected: false
        });
    } else {
        clearNodeSelection();
    }
    lastSelectedKey = selectedKey;
}

function selectionModeFromState(state) {
    return state && state.view && state.view.selectionMode === "replace" ? "replace" : "additive";
}

function updateSelectionModeButton(mode) {
    var button = document.getElementById("selectionModeToggle");
    if (!button) return;
    button.dataset.mode = mode;
    button.textContent = mode === "replace" ? "Selection: Replace" : "Selection: Additive";
}

function applySelectionMode(state) {
    var mode = selectionModeFromState(state);
    if (mode !== lastSelectionMode || mode !== getSelectionMode()) {
        setSelectionMode(mode);
        lastSelectionMode = mode;
    }
    updateSelectionModeButton(mode);
}

function edgeValueModeFromState(state) {
    return normalizeEdgeValueMode(state && state.view && state.view.edgeValueMode);
}

function applyEdgeValueMode(state) {
    var mode = edgeValueModeFromState(state);
    if (mode === lastEdgeValueMode &&
        modelLeft.getEdgeValueMode &&
        modelLeft.getEdgeValueMode() === mode &&
        modelRight.getEdgeValueMode &&
        modelRight.getEdgeValueMode() === mode) {
        return;
    }

    if (modelLeft.setEdgeValueMode) modelLeft.setEdgeValueMode(mode);
    if (modelRight.setEdgeValueMode) modelRight.setEdgeValueMode(mode);
    refreshEdgeValueModeControls();
    lastEdgeValueMode = mode;
}

function applyGlyphSizes(state) {
    var glyphSizes = normalizeGlyphSizes(state && state.view && state.view.glyphSizes);
    var glyphSizesKey = JSON.stringify(glyphSizes);
    if (glyphSizesKey === lastGlyphSizesKey) return;

    ["left", "right"].forEach(function (side) {
        var preview = previewFor(side);
        CANONICAL_GLYPH_SHAPES.forEach(function (shape) {
            if (preview && preview.setGlyphSize) {
                preview.setGlyphSize(shape, glyphSizes[side][shape]);
            }
        });
    });
    syncGlyphSizeSliders(glyphSizes);
    lastGlyphSizesKey = glyphSizesKey;
}

function applyAnnotations(state) {
    var annotations = state.annotations && state.annotations.byNode ? state.annotations.byNode : {};
    var selected = state.view && state.view.selectedNode;
    var annotationKey = JSON.stringify({
        annotations: annotations,
        selectedNode: selected || null
    });
    if (annotationKey === lastAnnotationsKey) return;

    ["left", "right"].forEach(function (side) {
        renderSelectedNodeAnnotation(state, side);
    });
    lastAnnotationsKey = annotationKey;
}

function applyFocusRequest(state) {
    var focusRequest = state.view && state.view.focusRequest;
    if (!focusRequest || !focusRequest.requestId || focusRequest.requestId === lastFocusRequestId) return;

    var preview = previewFor(focusRequest.viewport);
    if (preview && preview.focusNodeByIndex) {
        preview.focusNodeByIndex(focusRequest.nodeId);
    }

    renderSelectedNodeAnnotation(state, focusRequest.viewport);

    lastFocusRequestId = focusRequest.requestId;
}

function applyRevealNodeRequest(state) {
    var revealRequest = state.view && state.view.revealNodeRequest;
    if (!revealRequest || !revealRequest.requestId || revealRequest.requestId === lastRevealNodeRequestId) return;

    var viewport = revealRequest.viewport === "right" ? "right" : "left";
    var preview = previewFor(viewport);

    if (revealRequest.select !== false) {
        selectNodeByIndex(viewport, revealRequest.nodeId, {
            replaceSelection: true,
            toggleSelected: false
        });
        lastSelectedKey = state.view && state.view.selectedNode ? JSON.stringify(state.view.selectedNode) : null;
    }

    if (revealRequest.pinAnnotation !== false) {
        renderSelectedNodeAnnotation(state, viewport);
    }

    if (revealRequest.focus !== false && preview && preview.focusNodeByIndex) {
        preview.focusNodeByIndex(revealRequest.nodeId);
    }

    lastRevealNodeRequestId = revealRequest.requestId;
}

async function getSessionState() {
    var response = await fetch("/session/state");
    if (!response.ok) throw new Error("Unable to fetch session state");
    return response.json();
}

async function postJson(url, body) {
    var response = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body || {})
    });
    var payload = await response.json();
    if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Request failed: " + url);
    }
    return payload;
}

async function applySessionState() {
    var state = await getSessionState();
    lastSessionState = state;
    if (state.revision === lastAppliedRevision) return;

    var changedLeft = applyVariant("left", state);
    var changedRight = applyVariant("right", state);
    if (changedLeft || changedRight) {
        pendingVariantApplyUntil = Date.now() + 1500;
        lastSelectedKey = null;
        lastAnnotationsKey = null;
        lastGlyphSizesKey = null;
        lastOrientationKey = null;
        lastRevealNodeRequestId = null;
        return;
    }
    if (Date.now() < pendingVariantApplyUntil) return;

    applyColorBy(state);
    applyHighlight(state);
    applySelectionMode(state);
    applyEdgeValueMode(state);
    applyGlyphSizes(state);
    applySelection(state);
    applyAnnotations(state);
    applyFocusRequest(state);
    applyRevealNodeRequest(state);
    applyOrientation(state);
    lastAppliedRevision = state.revision;
}

function captureCombinedCanvas() {
    var leftCanvas = document.querySelector("#canvasLeft canvas");
    var rightCanvas = document.querySelector("#canvasRight canvas");
    if (!leftCanvas || !rightCanvas) {
        throw new Error("Both viewport canvases must exist before screenshot export");
    }

    var combined = document.createElement("canvas");
    combined.width = leftCanvas.width + rightCanvas.width;
    combined.height = Math.max(leftCanvas.height, rightCanvas.height);
    var context = combined.getContext("2d");
    context.drawImage(leftCanvas, 0, 0);
    context.drawImage(rightCanvas, leftCanvas.width, 0);
    return combined.toDataURL("image/png");
}

async function exportSession() {
    return postJson("/export/session", {});
}

async function exportScreenshot() {
    return postJson("/export/screenshot", {
        imageData: captureCombinedCanvas()
    });
}

async function setSessionSelectionMode(mode) {
    return postJson("/view/selection-mode", {
        selectionMode: mode
    });
}

async function setSessionEdgeValueMode(mode) {
    return postJson("/view/edge-value-mode", {
        edgeValueMode: mode
    });
}

async function setSessionGlyphSize(viewport, shape, value) {
    return postJson("/view/glyph-size", {
        viewport: viewport,
        shape: shape,
        value: value
    });
}

function setButtonStatus(button, text) {
    var original = button.textContent;
    button.textContent = text;
    window.setTimeout(function () {
        button.textContent = original;
    }, 1600);
}

function addExportControls() {
    if (document.getElementById("exportSessionJson")) return;
    var panel = document.getElementById("viewRight");
    if (!panel) return;

    var sessionButton = document.createElement("button");
    sessionButton.type = "button";
    sessionButton.id = "exportSessionJson";
    sessionButton.textContent = "Session JSON";
    sessionButton.onclick = function () {
        exportSession()
            .then(function () { setButtonStatus(sessionButton, "Exported"); })
            .catch(function (error) {
                console.error(error);
                setButtonStatus(sessionButton, "Failed");
            });
    };

    var screenshotButton = document.createElement("button");
    screenshotButton.type = "button";
    screenshotButton.id = "exportScreenshot";
    screenshotButton.textContent = "Screenshot";
    screenshotButton.onclick = function () {
        exportScreenshot()
            .then(function () { setButtonStatus(screenshotButton, "Exported"); })
            .catch(function (error) {
                console.error(error);
                setButtonStatus(screenshotButton, "Failed");
            });
    };

    panel.appendChild(sessionButton);
    panel.appendChild(screenshotButton);
}

function addSelectionModeControl() {
    if (document.getElementById("selectionModeToggle")) return;
    var panel = document.getElementById("viewLeft") || document.getElementById("viewRight");
    if (!panel) return;

    var modeButton = document.createElement("button");
    modeButton.type = "button";
    modeButton.id = "selectionModeToggle";
    modeButton.textContent = "Selection: Additive";
    modeButton.dataset.mode = "additive";
    modeButton.onclick = function () {
        var nextMode = modeButton.dataset.mode === "replace" ? "additive" : "replace";
        setSessionSelectionMode(nextMode)
            .then(function (payload) {
                if (payload && payload.state) {
                    applySelectionMode(payload.state);
                    lastSessionState = payload.state;
                } else {
                    setSelectionMode(nextMode);
                    updateSelectionModeButton(nextMode);
                }
            })
            .catch(function (error) {
                console.error(error);
                setButtonStatus(modeButton, "Mode failed");
            });
    };

    panel.appendChild(modeButton);
}

function startRestSessionBridge() {
    addExportControls();
    addSelectionModeControl();
    if (!window.__cytocaveLocalSelectionBridge) {
        window.__cytocaveLocalSelectionBridge = true;
        window.addEventListener('cytocave-node-selected', function (event) {
            applyLocalSelectionPresentation(event.detail);
        });
    }
    window.DeepCytoCave = {
        applySessionState,
        exportSession,
        exportScreenshot,
        postJson,
        setSessionSelectionMode,
        setSessionEdgeValueMode,
        setSessionGlyphSize,
        applyGlyphSizes,
        applyRevealNodeRequest,
        applyOrientation
    };
    applySessionState().catch(function (error) {
        console.error(error);
    });
    window.setInterval(function () {
        applySessionState().catch(function (error) {
            console.error(error);
        });
    }, 1000);
}

export {startRestSessionBridge, exportSession, exportScreenshot}
