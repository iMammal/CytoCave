import {getDataFile} from "./globals";
import {modelLeft, modelRight} from "./model";
import {
    changeSceneToSubject,
    changeColorGroup,
    previewAreaLeft,
    previewAreaRight,
    updateNodesVisiblity
} from "./drawing";
import {buildAnnotationDetailModel} from "./annotationPresentation";

var lastAppliedRevision = null;
var pendingVariantApplyUntil = 0;
var lastHighlightKey = null;
var lastColorBy = {left: null, right: null};
var lastSelectedKey = null;
var lastAnnotationsKey = null;
var lastFocusRequestId = null;

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
    if (!field) return false;
    var selectId = side === "left" ? "colorCodingMenuLeft" : "colorCodingMenu";
    var select = document.getElementById(selectId);
    if (!select) return false;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === field) {
            return true;
        }
    }
    return false;
}

function setSelectValue(selectId, value) {
    var select = document.getElementById(selectId);
    if (!select || !value) return;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            select.selectedIndex = i;
            return;
        }
    }
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
        setSelectValue("colorCodingMenuLeft", leftField);
        changeColorGroup(leftField, "Left");
        lastColorBy.left = leftField;
    }

    if (rightField && lastColorBy.right !== rightField && fieldAvailable("right", rightField)) {
        setSelectValue("colorCodingMenu", rightField);
        changeColorGroup(rightField, "Right");
        lastColorBy.right = rightField;
    }
}

function setClusterHighlightForSide(side, field, clusterId) {
    var model = modelFor(side);
    if (!model || !fieldAvailable(side, field)) return;

    if (model.getActiveGroupName() !== field) {
        changeColorGroup(field, sideName(side));
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

function applyOrientation(state) {
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

function applySelection(state) {
    var selected = state.view && state.view.selectedNode;
    var selectedKey = selected ? JSON.stringify(selected) : null;
    if (selectedKey === lastSelectedKey) return;

    if (previewAreaLeft && previewAreaLeft.clearSelectedNodesVisual) {
        previewAreaLeft.clearSelectedNodesVisual();
    }
    if (previewAreaRight && previewAreaRight.clearSelectedNodesVisual) {
        previewAreaRight.clearSelectedNodesVisual();
    }

    if (selected && previewFor(selected.viewport) && previewFor(selected.viewport).applySelectedNode) {
        previewFor(selected.viewport).applySelectedNode(selected.nodeId);
    }
    lastSelectedKey = selectedKey;
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
        var preview = previewFor(side);
        if (!preview || !preview.applyAnnotations) return;
        var sideAnnotations = filterAnnotationsForSide(state, side);
        var selectedNodeId = selectedNodeForSide(state, side);
        preview.applyAnnotations(sideAnnotations, selectedNodeId);
        updateAnnotationDetailForSide(state, side, sideAnnotations, selectedNodeId);

        var labelNodeId = selectedNodeId && sideAnnotations[selectedNodeId] ? selectedNodeId : Object.keys(sideAnnotations)[0];
        if (labelNodeId && preview.updateNodeLabelByIndex) {
            preview.updateNodeLabelByIndex(labelNodeId, sideAnnotations[labelNodeId]);
        } else if (preview.clearNodeLabel) {
            preview.clearNodeLabel();
        }
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

    var annotations = filterAnnotationsForSide(state, focusRequest.viewport);
    var annotation = annotations[focusRequest.nodeId];
    if (annotation && preview && preview.updateNodeLabelByIndex) {
        preview.updateNodeLabelByIndex(focusRequest.nodeId, annotation);
    }

    lastFocusRequestId = focusRequest.requestId;
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
    if (state.revision === lastAppliedRevision) return;

    var changedLeft = applyVariant("left", state);
    var changedRight = applyVariant("right", state);
    if (changedLeft || changedRight) {
        pendingVariantApplyUntil = Date.now() + 1500;
        lastSelectedKey = null;
        lastAnnotationsKey = null;
        return;
    }
    if (Date.now() < pendingVariantApplyUntil) return;

    applyColorBy(state);
    applyHighlight(state);
    applySelection(state);
    applyAnnotations(state);
    applyFocusRequest(state);
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

function startRestSessionBridge() {
    addExportControls();
    window.DeepCytoCave = {
        applySessionState,
        exportSession,
        exportScreenshot,
        postJson
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
