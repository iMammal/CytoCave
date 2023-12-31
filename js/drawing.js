/**
 * Created by Johnson on 2/15/2017.
 */


var previewAreaLeft, previewAreaRight;

var glyphNodeDictionary = {};        /// Object that stores uuid of left and right glyphs

var activeVR = 'left';

var nodesSelected = [];
var nodesFocused = [];

var visibleNodes = [];               // boolean array storing nodes visibility

var pointedNodeIdx = -1;            // index of node under the mouse
var pointedObject;                  // node object under mouse
var root;                           // the index of the root node = start point of the shortest path computation

var thresholdModality = true;
var enableEB = false;
var enableIpsi = true;
var enableContra = true;

var vr = false;                     // enable VR
var spt = false;                    // enabling shortest path
var click = false;
var hoverTimeout = false;
var oldNodeIndex = -1;
var hoverMode = 0;

import * as THREE from 'three'
import {isLoaded, dataFiles, mobile} from "./globals";
import {
    addEdgeBundlingCheck,
    addModalityButton,
	addLateralityCheck,
    removeGeometryButtons,
    addOpacitySlider,
    addThresholdSlider,
    addColorGroupList, addColorGroupListLeft,
    addTopologyMenu,
    addShortestPathFilterButton,
    addDistanceSlider,
    addShortestPathHopsSlider,
    enableShortestPathFilterButton,
    //addDimensionFactorSlider,
    addDimensionFactorSliderLeft,
    addDimensionFactorSliderRight,
    createLegend,
    addAnimationSlider,
    addFlashRateSlider,
    addSkyboxButton,
    //hideVRMaximizeButtons,
    toggleMenus
} from './GUI.js';
import {queue} from "./external-libraries/queue";
import {scanFolder, loadLookUpTable, loadSubjectNetwork, loadSubjectTopology} from "./utils/parsingData";
import {modelLeft, modelRight} from './model';
import {PreviewArea} from "./previewArea";
import {setUpdateNeeded} from './utils/Dijkstra';
import { setNodeInfoPanel, enableThresholdControls, addSearchPanel } from './GUI'
import {setColorGroupScale} from './utils/scale'

// callback on mouse moving, expected action: node beneath pointer are drawn bigger
function onDocumentMouseMove(model, event) {
    // the following line would stop any other event handler from firing
    // (such as the mouse's TrackballControls)
    event.preventDefault();
    var intersectedObject = getIntersectedObject(event);
    // var isLeft = event.clientX < window.innerWidth/2;
    updateNodeMoveOver(model, intersectedObject, 1); // 1 = mouse hover

}

//////////////////////////////////////////////////////////////////////////////////////////////
// This logic is a bit complicated, because it needs to handle all the cases where the user mouses over or
// points a VR controller at a node and then moves the mouse or controller away from the node.
//
// It updates any glyphs that may be hovered over or pointed at in VR and resets them to their normal state
// INPUT: model, inrtersetedObject: self explanatory, mode: 1 = mouse , 2,4 = VR controllers
// Since there are two preview areas and the mouse and Touch controllers can work independently when one is in VR mode,
// any pointed-at or hovered-over glyphs need to be highlighted in both preview areas and if EITHER pointing device's ray
// intersects with a glyph, that glyph should be highlighted
///////////////////////////////////////////////////////////////////////////////////////////
var updateNodeMoveOver = function (model, intersectedObject, mode) {
    var nodeIdx, region, nodeRegion;
    //console.log("updateNodeMoveOver: ");
    //console.log(intersectedObject);
    if(intersectedObject === undefined)
        return;
    //check if name is defined, if not, it is not a node
    if (intersectedObject.object.name === undefined) {
        return;
    }
    //it's also not a valid node if it has no name
    if (intersectedObject.object.name === '') {
        return;
    }
    console.log("intersected Object Moveover: ");
    console.log(intersectedObject);
    //check if the intersected object is a node, if it is the name.type will be 'region'
    //if it is a node, get the node index and the region name
    if (intersectedObject.object.name.type == 'region') {
        nodeIdx = intersectedObject.object.getDatasetIndex(intersectedObject); //.instanceId);
        if (intersectedObject) {
            //nodeIdx = glyphNodeDictionary[intersectedObject.object.uuid];
            region = model.getRegionByIndex(nodeIdx);
            nodeRegion = model.getGroupNameByNodeIndex(nodeIdx);
        }
    }
    //nodeIdx = intersectedObject.object.getDatasetIndex(intersectedObject.instanceId);
    // if (intersectedObject) {
    //     nodeIdx = glyphNodeDictionary[intersectedObject.object.uuid];
    //     region = model.getRegionByIndex(nodeIdx);
    //     nodeRegion = model.getGroupNameByNodeIndex(nodeIdx);
    // }
        //todo check if the visibleNodes array is valid
    var nodeExistAndVisible = (intersectedObject && visibleNodes[nodeIdx] && model.isRegionActive(nodeRegion));
    // update node information label
    if (nodeExistAndVisible) {
        setNodeInfoPanel(region, nodeIdx);
        // if (vr) {  //todo: this can be used outside of VR to help get node label info next to the node itself, not in the screen corner
            let labeltext = region.group+" "+region.name+" "+region.label;
             previewAreaLeft.updateNodeLabel(labeltext,  intersectedObject);
             previewAreaRight.updateNodeLabel(labeltext, intersectedObject);
        // }
    }

    if (nodeExistAndVisible && intersectedObject.object.isSelected(intersectedObject)) { // not selected
        if (hoverTimeout && oldNodeIndex == nodeIdx) {
            // create a selected node (bigger) from the pointed node
            pointedObject = intersectedObject.object;
            previewAreaLeft.updateNodeGeometry(nodeIdx, 'mouseover');
            previewAreaRight.updateNodeGeometry(nodeIdx, 'mouseover');
            // console.log("Drawing edges from node ", nodeIdx);
            pointedNodeIdx = nodeIdx;
            hoverTimeout = false;
            hoverMode = hoverMode | mode;  // set the hover mode to the mode that triggered this function
        } else {
            setTimeout(function () {
                hoverTimeout = true;
            }, 500);
            oldNodeIndex = nodeIdx;

        }
    } else {
        if (pointedObject ) {
            nodeIdx = intersectedObject.object; //glyphNodeDictionary[pointedObject.uuid];
            if (nodeIdx === undefined)
                return;
            hoverMode = hoverMode & ~mode; // clear the hover mode that triggered this function
            if (hoverMode != 0) {
                return;
            }
            // only proceed to de-hovering a node if both the mouse and all VR controllers are not hovering over it
            pointedNodeIdx = -1;
            if (nodeIdx == root) {
                console.log("Root creation");
                previewAreaLeft.updateNodeGeometry(nodeIdx, 'root');
                previewAreaRight.updateNodeGeometry(nodeIdx, 'root');
            } else {
                previewAreaLeft.updateNodeGeometry(nodeIdx, 'normal');
                previewAreaRight.updateNodeGeometry(nodeIdx, 'normal');
            }
            pointedObject = null;
        }
    }
};

// callback to interact with objects in scene with double click
// selected nodes are drawn bigger
function onMiddleClick(event) {
    event.preventDefault();

    var intersectedObject = getIntersectedObject(event);
    if (intersectedObject) {
        var nodeIndex = intersectedObject.instanceId; //glyphNodeDictionary[intersectedObject.object.uuid];
        if (nodeIndex == undefined || nodeIndex < 0)
            return;
        if (root == nodeIndex) { // disable spt and reset nodes visibility
            spt = false;
            root = undefined;
            visibleNodes.fill(true);
        } else { // enable spt
            spt = true;
            spt = true;
            // compute the shortest path for the two models
            previewAreaLeft.computeShortestPathForNode(nodeIndex);
            previewAreaRight.computeShortestPathForNode(nodeIndex);
        }
        updateScenes();
        enableShortestPathFilterButton(getSpt());
        enableThresholdControls(!getSpt());
    }
}

// callback to select a node on mouse click
function onLeftClick(model, event) {

    event.preventDefault();
    var objectIntersected = getIntersectedObject(event);
    // console.log("onLeftClick event: ");
    // console.log(event);
    // console.log("onLeftClick objectIntersected: ");
    // console.log(objectIntersected);
    var isLeft = event.clientX < window.innerWidth / 2;
    updateNodeSelection(model, objectIntersected, isLeft);
}

const updateNodeSelection = (model, objectIntersected, isLeft, nodeIndex = null) => {
    // console.log("model: ", model);
    // console.log("objectIntersected: ", objectIntersected);
    // console.log(`isLeft: ${isLeft}`);

    if (!objectIntersected && !nodeIndex) {
            return false;
    }

    const previewArea = isLeft ? previewAreaLeft : previewAreaRight;

    if (nodeIndex && !objectIntersected) {
        objectIntersected = previewArea.getNodeInstanceByIndex(nodeIndex);
        if (!objectIntersected ) {
            return false;
        }
    }


    const instanceId = objectIntersected.instanceId;
    const group = objectIntersected.object.name.group;
    const hemisphere = objectIntersected.object.name.hemisphere;
    // check if name is blank empty or undefined
    if (group === "" || group === undefined) return false;
    if (hemisphere === "" || hemisphere === undefined) return false;
    if (instanceId === "" || instanceId === undefined) return false;

    //const previewArea = isLeft ? previewAreaLeft : previewAreaRight;
    //console.log("previewArea instances: ");
    //console.log(previewArea.instances);
    // if
    //const instanceList = previewArea.instances[group][hemisphere];
    //or could be
    //const instanceList = objectIntersected.
    // log instance

    if (!group || !hemisphere || !instanceId) {
        console.log("group: ", group);
        console.log("hemisphere: ", hemisphere);
        console.log("instanceId: ", instanceId);

        return false;
    }

    //if selected make unselected, if unselected make selected
    //objectIntersected.object.userData.selected = !objectIntersected.object.userData.selected;


    // check if object is selected or not
    let isSelected = objectIntersected.object.isSelected(objectIntersected);
    nodeIndex = objectIntersected.object.getDatasetIndex(objectIntersected);

    if (!isSelected) {
        //mark object selected
        objectIntersected.object.select(objectIntersected);
        //previewArea.updateNodeGeometry(objectIntersected, 'selected');
        //set the object geometry to selected in both scenes
        // this if statement is to handle different active groups in the left and right preview areas

        let nodeIndex = -1;
        if (isLeft) {
            nodeIndex = previewAreaLeft.updateNodeGeometry(objectIntersected, 'selected');
            previewAreaRight.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
            //previewAreaLeft.getNodesInstanceFromDatasetIndex(nodeIndex);
        } else {
            //previewAreaRight.getNodesInstanceFromDatasetIndex(nodeIndex);
            nodeIndex = previewAreaRight.updateNodeGeometry(objectIntersected, 'selected');
            previewAreaLeft.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
        }
        //previewAreaLeft.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
        //previewAreaRight.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
        console.log("switched to selected");
        //console.log(`objectIntersected.object.userData.selected: ${objectIntersected.object.userData.selected}`);
        //previewArea.drawSelectedNode(objectIntersected);

        if(spt) {
            //previewArea.getShortestPathFromRootToNode(nodeIndex);
            //return;
            let pathArray = isLeft? modelLeft.getPathArray(getRoot(), nodeIndex) : modelRight.getPathArray(getRoot(), nodeIndex);
            //console.log("pathArray: ", pathArray);
            //console.log("pathArray.length: ", pathArray.length);
            //console.log("pathArray[0]: ", pathArray[0]);
            for (let i = 0; i < pathArray.length; i++) {
                if (thresholdModality) {
                    previewAreaLeft.drawEdgesGivenNode(pathArray[i]);//,activeEdges);
                    previewAreaRight.drawEdgesGivenNode(pathArray[i]);//,activeEdges);

                } else {
                    //const n = model.getNumberOfEdges();
                    //previewArea.drawTopNEdgesByNode(nodeIndex, n);
                    previewAreaLeft.drawEdgesGivenNode(pathArray[i], model.getNumberOfEdges());
                    previewAreaRight.drawEdgesGivenNode(pathArray[i], model.getNumberOfEdges());
                }

            }
        }

        let activeEdges = previewArea.drawConnections(); //do we want to draw the connections there or here in drawing? My vote is here.
        // draw connections does not draw connections, but it does returNs the lists of the connections to be drawn, filtered by the threshold.

        //todo: work out the below.
        if (thresholdModality) {
            previewAreaLeft.drawEdgesGivenNode(nodeIndex);//,activeEdges);
            previewAreaRight.drawEdgesGivenNode(nodeIndex);//,activeEdges);

        } else {
            //const n = model.getNumberOfEdges();
            //previewArea.drawTopNEdgesByNode(nodeIndex, n);
            previewAreaLeft.drawEdgesGivenNode(nodeIndex, model.getNumberOfEdges());
            previewAreaRight.drawEdgesGivenNode(nodeIndex, model.getNumberOfEdges());
        }

    } else {
        //console.log(`objectIntersected.object.userData.selected: ${objectIntersected.object.userData.selected}`);
        //objectIntersected.object.userData.selected = false;
        //unselect the object
        console.log("switching to unselected");
        //previewArea.updateNodeGeometry(objectIntersected, 'normal');
        //set the object geometry to normal in both scenes
        previewAreaLeft.updateNodeGeometry(objectIntersected, 'normal');
        previewAreaRight.updateNodeGeometry(objectIntersected, 'normal');
        objectIntersected.object.unSelect(objectIntersected);
        //probably want to remove the edges from the scene here.
        console.log("end switch");
        removeEdgesGivenNodeFromScenes(nodeIndex);
    }
    //log the currently selected nodes
    let selectedNodes = getNodesSelected(); // local to drawing, returns a list from both preview areas
    console.log("selectedNodes: ", selectedNodes);
};

// callback on mouse press
function onMouseDown(event) {
    click = true;
    switch (event.button) { // middle button
        case 2: // right click -> should be < 200 msec
            setTimeout(function () {
                click = false;
            }, 200);
            break;
    }
}

// callback on mouse release
function onMouseUp(model, event) {

    switch (event.button) {
        case 0:
            onLeftClick(model, event);
            break;
        case 1:
            onMiddleClick(event);
            break;
        case 2:
            if (click)
                toggleMenus();
            break;
    }
    click = false;
}

function onKeyPress(event) {
    // todo: this is now a stub. no move keyboard activated VR
}

// if (event.key === 'v' || event.keyCode === 118) {
//     if (!previewAreaLeft.isVRAvailable()) {
//         alert("No VR Hardware found!!!");
//         return;
//     }
//     updateVRStatus('enable');
//     console.log("Enter VR mode");
// }
// if (vr && (event.key === 's' || event.keyCode === 115)) {
//     updateVRStatus('left');
//     console.log("VR Active for left preview area");
// }
// if (vr && (event.key === 'd' || event.keyCode === 100)) {
//     updateVRStatus('right');
//     console.log("VR Active for right preview area");
// }
// if (event.key === 'e' || event.keyCode === 101) {
//     updateVRStatus('disable');
//     console.log("Exit VR mode");
// }
//}

// todo: this is probably not needed in WebXR
// update VR status for desktop
// var updateVRStatus = function (status) {
//     switch (status)
//     {
//         case 'enable':
//             activeVR = 'none';
//             vr = true;
//             break;
//         case 'left':
//             activeVR = 'left';
//             previewAreaLeft.activateVR(false);
//             previewAreaRight.activateVR(false);
//             // VR allows only one canvas to perform the rendering
//             previewAreaLeft.enableRender(true);
//             previewAreaRight.enableRender(false);
//             setTimeout(function () { previewAreaLeft.activateVR(true); }, 500);
//             break;
//         case 'right':
//             activeVR = 'right';
//             previewAreaLeft.activateVR(false);
//             previewAreaRight.activateVR(false);
//             // VR allows only one canvas to perform the rendering
//             previewAreaLeft.enableRender(false);
//             previewAreaRight.enableRender(true);
//             setTimeout(function () { previewAreaRight.activateVR(true); }, 500);
//             break;
//         case 'disable':
//             activeVR = 'none';
//             previewAreaLeft.activateVR(false);
//             previewAreaRight.activateVR(false);
//             vr = false;
//             previewAreaLeft.resetCamera();
//             previewAreaRight.resetCamera();
//             previewAreaLeft.resetBrainPosition();
//             previewAreaRight.resetBrainPosition();
//             previewAreaLeft.enableRender(true);
//             previewAreaRight.enableRender(true);
//             break;
//     }
// };

// init the GUI controls
var initControls = function () {
    // add controls
    addOpacitySlider();
    // addEdgeBundlingCheck();
    addModalityButton();
    addThresholdSlider();
	addLateralityCheck();
    addColorGroupList();
    addColorGroupListLeft();
    addTopologyMenu(modelLeft, 'Left');
    addTopologyMenu(modelRight, 'Right');

    // addShortestPathFilterButton();
    // addDistanceSlider();
    // addShortestPathHopsSlider();
    // enableShortestPathFilterButton(false);

    //addDimensionFactorSlider();
    addDimensionFactorSliderLeft('Left');
    addDimensionFactorSliderRight('Left');
    addDimensionFactorSliderLeft('Right');
    addDimensionFactorSliderRight('Right');
    // addFslRadioButton();
    addSearchPanel();
    //addAnimationSlider();
    addFlashRateSlider();
     addSkyboxButton();

    modelLeft.setAllRegionsActivated();
    modelRight.setAllRegionsActivated();

    createLegend(modelLeft);

    // if (mobile) { // todo: probably not required for webXR. Now hidden in css style sheet
    //     console.log("Mobile VR requested");
    // } else {
    //     hideVRMaximizeButtons();
    // }
};

// init the canvas where we render the brain
var initCanvas = function () {

    glyphNodeDictionary = {};
    visibleNodes = new Array(modelLeft.getConnectionMatrixDimension()).fill(true);

    // create visualization
    previewAreaLeft = new PreviewArea(document.getElementById('canvasLeft'), modelLeft, 'Left');
    previewAreaRight = new PreviewArea(document.getElementById('canvasRight'), modelRight, 'Right');

    // Get the button, and when the user clicks on it, execute myFunction
    document.getElementById("syncLeft").onclick = function () {
        previewAreaLeft.syncCameraWith(previewAreaRight.getCamera());
    };
    document.getElementById("syncRight").onclick = function () {
        previewAreaRight.syncCameraWith(previewAreaLeft.getCamera());
    };
    // pass mouse events controllers
    previewAreaLeft.setEventListeners(onMouseDown, onMouseUp, onDocumentMouseMove);
    previewAreaRight.setEventListeners(onMouseDown, onMouseUp, onDocumentMouseMove);
    window.addEventListener("keypress", onKeyPress, true);

    $(window).resize(function (e) {
        //e.preventDefault();
        console.log("on resize event");
        previewAreaLeft.resizeScene();
        previewAreaRight.resizeScene();
    });

    // todo: Not sure how this will be handled in WebXR, adding or removing a headset or controller in mid-session
    // window.addEventListener('vrdisplaypresentchange', function(e){
    //         //e.preventDefault();
    //         console.log("on resize event");
    //         previewAreaLeft.resizeScene();
    //         previewAreaRight.resizeScene();}
    //     , true);

    previewAreaLeft.requestAnimate();
    previewAreaRight.requestAnimate();
};

// set the threshold for both models
var setThreshold = function (value) {
    modelLeft.setThreshold(value);
    modelRight.setThreshold(value);
};


// set the threshold for both models
var setConThreshold = function (value) {
    modelLeft.setConThreshold(value);
    modelRight.setConThreshold(value);
};

//enable Ipsilaterality
var enableIpsilaterality = function (enable) {
        enableIpsi = enable;

        console.log("IPSI:"+enable);

    // modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    // modelRight.computeEdgesForTopology(modelRight.getActiveTopology());
    //
    // previewAreaLeft.removeEdgesFromScene();
    // previewAreaRight.removeEdgesFromScene();
    //
    // previewAreaLeft.drawConnections();
    // previewAreaRight.drawConnections();

    previewAreaLeft.updateConnections();
    previewAreaRight.updateConnections();

}

//enable Contralaterality
var enableContralaterality = function (enable) {
        enableContra = enable;

        console.log("CONTRA:"+enable);

    // modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    // modelRight.computeEdgesForTopology(modelRight.getActiveTopology());
    //
    // previewAreaLeft.removeEdgesFromScene();
    // previewAreaRight.removeEdgesFromScene();
    //
    // previewAreaLeft.drawConnections();
    // previewAreaRight.drawConnections();
    //
    // for ( selectedNode in getNodesSelected()) {
    //     console.log("selectedNode: ", selectedNode);
    //     //removeEdgesGivenNodeFromScenes(selectedNode);
    // }

    previewAreaLeft.updateConnections();
    previewAreaRight.updateConnections();


}
//
// //enable Ipsilaterality
// var enableIpsilaterality = function (enable) {
//     //if (!enableIpsi && enable) {}
//     enableIpsi = enable;
//
// 	console.log("IPSI:"+enable);
//
//     modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
//     modelRight.computeEdgesForTopology(modelRight.getActiveTopology());
//
//     previewAreaLeft.removeEdgesFromScene();
//     previewAreaRight.removeEdgesFromScene();
//
//     previewAreaLeft.drawConnections();
//     previewAreaRight.drawConnections();
//
// }
//
// //enable Contralaterality
// var enableContralaterality = function (enable) {
// 	enableContra = enable;
//
// 	console.log("CONTRA:"+enable);
//
//     modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
//     modelRight.computeEdgesForTopology(modelRight.getActiveTopology());
//
//     previewAreaLeft.removeEdgesFromScene();
//     previewAreaRight.removeEdgesFromScene();
//
//     previewAreaLeft.drawConnections();
//     previewAreaRight.drawConnections();
//
// }


// enable edge bundling
var enableEdgeBundling = function (enable) {
    if (enableEB == enable)
        return;

    enableEB = enable;

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();

    previewAreaLeft.drawConnections();
    previewAreaRight.drawConnections();
};

// updating scenes: redrawing glyphs and displayed edges
var updateScenes = function (side) {
    console.log("Scene update "+side);
    if (side !== "Right") {
        previewAreaLeft.updateScene();
        createLegend(modelLeft,"Left");
    }
    if (side !== "Left") {
        previewAreaRight.updateScene();
        createLegend(modelRight,"Right");
    }
};

var updateNodesVisiblity = function (side) {
    if (side !== "Right") {
        previewAreaLeft.updateNodesVisibility();
        createLegend(modelLeft,"Left");
    }
    if (side !== "Left") {
        previewAreaRight.updateNodesVisibility();
        createLegend(modelRight,"Right");
    }
};

var redrawEdges = function () {
    previewAreaLeft.redrawEdges();
    previewAreaRight.redrawEdges();
};

var updateOpacity = function (opacity) {
    previewAreaLeft.updateEdgeOpacity(opacity);
    previewAreaRight.updateEdgeOpacity(opacity);
};

var removeEdgesGivenNodeFromScenes = function (nodeIndex) {
    previewAreaLeft.removeEdgesGivenNode(nodeIndex);
    previewAreaRight.removeEdgesGivenNode(nodeIndex);

    // setEdgesColor();
    // setEdgesColor();
};

// get intersected object beneath the mouse pointer
// detects which scene: left or right
// return undefined if no object was found
var getIntersectedObject = function (event) {

    var isLeft = event.clientX < window.innerWidth / 2;

    // mapping coordinates of the viewport to (-1,1), (1,1), (-1,-1), (1,-1)
    // TODO: there is a glitch for the right side
    var vector = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 4 - (isLeft ? 1 : 3),
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    let iObject = isLeft ? previewAreaLeft.getIntersectedObject(vector) : previewAreaRight.getIntersectedObject(vector);
    //console.log("Intersected object: ");
    //console.log(iObject);
    return iObject;
};

// This now only changes the Right color group
var changeColorGroup = function (name, side) {
    console.log("Change color group: " + name + " " + side);
    let tempNodesSelected = getNodesSelected();

    if (side !== "Right") {
        previewAreaLeft.removeAllInstances();
        modelLeft.setActiveGroup(name);
        modelLeft.setAllRegionsActivated();
        modelLeft.getDataset(true);
        previewAreaLeft.drawRegions();
        previewAreaLeft.updateNodesVisibility();
        previewAreaLeft.updateNodesColor();
        createLegend(modelLeft, "Left");
        //redrawScene("Left")   // This is not needed as the redrawScene is called in the updateNodesVisibility
        previewAreaLeft.setSelectedNodes(tempNodesSelected);
    }

    if (side !== "Left") {
        previewAreaRight.removeAllInstances();
        modelRight.setActiveGroup(name);
        modelRight.setAllRegionsActivated();
        modelRight.getDataset(true);
        previewAreaRight.drawRegions();
        previewAreaRight.updateNodesVisibility();
        previewAreaRight.updateNodesColor();
        createLegend(modelRight, "Right");
        //redrawScene("Right")  // This is not needed as the redrawScene is called in the updateNodesVisibility
        previewAreaRight.setSelectedNodes(tempNodesSelected);
    }

    setColorGroupScale(side);
    redrawEdges();
};

/* Instead of two functions just add an arguement to original one
// This One now Does the Left Color Group
var changeColorGroupLeft = function (name) {
    modelLeft.setActiveGroup(name);
    //modelRight.setActiveGroup(name);

    modelLeft.setAllRegionsActivated();
    //modelRight.setAllRegionsActivated();
    setColorGroupScale();

    previewAreaLeft.updateNodesVisibility();
    //previewAreaRight.updateNodesVisibility();
    previewAreaLeft.updateNodesColor();
    //previewAreaRight.updateNodesColor();
    redrawEdges();
    createLegend(modelLeft);
};*/

var redrawScene = function (side) {
    setUpdateNeeded(true);
    switch (side) {
        case 'Left':
        case 'left':
            previewAreaLeft.updateScene();
            break;
        case 'Right':
        case 'right':
            previewAreaRight.updateScene();
            break;
    }
};

// change the active geometry
var changeActiveGeometry = function (model, side, type) {
    console.log("Change Active Geometry to: ", type);
    let tempNodesSelected = getNodesSelected();
    model.setActiveTopology(type);

    if(side !== "Left") {
        previewAreaRight.removeAllInstances();
        modelRight.setAllRegionsActivated();
        modelRight.getDataset(true);
        previewAreaRight.drawRegions();
        previewAreaRight.updateNodesVisibility();
        previewAreaRight.setSelectedNodes(tempNodesSelected);

    } else {
        previewAreaLeft.removeAllInstances();
        modelLeft.setAllRegionsActivated();
        modelLeft.getDataset(true);
        previewAreaLeft.drawRegions();
        previewAreaLeft.updateNodesVisibility();
        previewAreaLeft.setSelectedNodes(tempNodesSelected);

    }
    model.computeEdgesForTopology(model.getActiveTopology());
    redrawScene(side);};

// draw shortest path for the left and right scenes = prepare the edges and plot them
var updateShortestPathEdges = function (side) {
    if (!spt)
        return;
    switch (side) {
        case ('left'):
            previewAreaLeft.updateShortestPathEdges();
            break;
        case ('right'):
            previewAreaRight.updateShortestPathEdges();
            break;
        case ('both'):
            previewAreaLeft.updateShortestPathEdges();
            previewAreaRight.updateShortestPathEdges();
            break;
    }
};

// change the subject in a specific scene
var changeSceneToSubject = function (subjectId, model, previewArea, side) {
    var fileNames = dataFiles[subjectId];
    removeGeometryButtons(side);
    var info = model.getCurrentRegionsInformation();
    var type = model.getActiveTopology();
    if(side !== "Left") {
        type = modelRight.getActiveTopology();
    }
    if(side !== "Right") {
        type = modelLeft.getActiveTopology();
    }
    let tempNodesSelected = getNodesSelected();
    model.clearModel();

    queue()
        .defer(loadSubjectNetwork, fileNames, model)
        .awaitAll(function () {
            queue()
                // PLACE depends on connection matrix
                .defer(loadSubjectTopology, fileNames, model)
                .awaitAll(function () {
                    console.log("Loading data done.");
                    var activeGroup = model.getActiveGroupName();
                    var level1 = model.getClusteringLevel();
                    var level2 = model.getClusteringGroupLevel();
                    model.createGroups();
                    addTopologyMenu(model, side, type);
                    model.setActiveGroup(activeGroup);
                    model.setClusteringLevel(level1);
                    model.updateClusteringGroupLevel(level2);
                    model.setAllRegionsActivated();
                    model.setCurrentRegionsInformation(info);
                    model.computeEdgesForTopology(type); //model.getActiveTopology());
                    changeActiveGeometry(model, side, type);
                    if (side !== "right") previewAreaLeft.setSelectedNodes(tempNodesSelected);
                    if (side !== "left") previewAreaRight.setSelectedNodes(tempNodesSelected);
                    redrawScene(side);
                })
            ;
        });
};

var setRoot = function (rootNode) {
    root = rootNode;
}

var getRoot = function () {
    return root;
}

var getSpt = function () {
    return spt;
}

var getNodesSelected = function () {
    var nodesRight = previewAreaRight.getSelectedNodes();
    var nodesLeft = previewAreaLeft.getSelectedNodes();
    var nodesSelected = [...new Set(nodesRight.concat(nodesLeft))];
    //update the previewAreas nodesSelected groups while we've already concatted them
    // previewAreaLeft.setSelectedNodes(nodesSelected);
    // previewAreaRight.setSelectedNodes(nodesSelected);
    // an ok idea that didn't account for unselecting nodes
    console.log("nodesSelected: ");
    console.log(nodesSelected);
    return nodesSelected;
}

var clrNodesSelected = function () {
    previewAreaLeft.clrNodesSelected();
    previewAreaRight.clrNodesSelected();
}

var setNodesSelected = function (arrIndex, newNodeVal) {
    //todo update this to sync the two previewAreas nodes selected groups
    nodesSelected[arrIndex] = newNodeVal;
}

var getNodesFocused = function () {
    //todo add a focused state list to userData similar to selected state list.
    // also figure out what to do with the focused state list.
    return nodesFocused;
}

var clrNodesFocused = function () {
    //todo same as getNodesFocused comment except for this stuff.
    console.log(nodesFocused);
    nodesFocused = [];
}

//todo: No, this shouldn't always be true. Need to fix the else branch and remove the true
var setNodesFocused = function (arrIndex, newNodeVal) {
    if(true || newNodeVal) {
        nodesFocused[arrIndex] = newNodeVal;
    } else {
        nodesFocused[nodesFocused.length] = arrIndex;
    }
}

var getEnableEB = function () {
    return enableEB
};



var getVisibleNodesLength = function (arrIndex) {
    return visibleNodes.length
}

var getVisibleNodes = function (arrIndex) {
    return visibleNodes[arrIndex]
}

var setVisibleNodes = function (arrIndex, arrValue) {
    visibleNodes[arrIndex] = arrValue
}

var getThresholdModality = function () {
    return thresholdModality
}

var setThresholdModality = function (modality) {
    thresholdModality = modality
}

var getEnableIpsi = function () {
    return enableIpsi;
}
var getEnableContra = function () {
    return enableContra;
}
// export {
//     changeSceneToSubject,
//     initControls,
//     initCanvas,
//     changeActiveGeometry,
//     changeColorGroup,
//     setRoot,
//     getRoot,
//     getSpt,
//     updateScenes,
//     updateNodesVisiblity,
//     updateNodeMoveOver,
//     updateNodeSelection, redrawEdges, updateOpacity, glyphNodeDictionary, previewAreaLeft, previewAreaRight, getNodesSelected, setNodesSelected, clrNodesSelected, getNodesFocused, setNodesFocused, clrNodesFocused, getVisibleNodes, getVisibleNodesLength, setVisibleNodes, getEnableEB, getEnableIpsi, getEnableContra, enableIpsilaterality, enableContralaterality, setThresholdModality };
// removed duplicates
export {
    changeSceneToSubject,
    initControls,
    initCanvas,
    changeActiveGeometry,
    changeColorGroup,
    setRoot,
    getRoot,
    getSpt,
    updateScenes,
    updateNodesVisiblity,
    updateNodeMoveOver,
    updateNodeSelection,
    redrawEdges,
    updateOpacity,
    glyphNodeDictionary,
    previewAreaLeft,
    previewAreaRight,
    getNodesSelected,
    setNodesSelected,
    clrNodesSelected,
    getNodesFocused,
    setNodesFocused,
    clrNodesFocused,
    getVisibleNodes,
    getVisibleNodesLength,
    setVisibleNodes,
    getEnableEB,
    getEnableIpsi, //todo: couldn't find definition
    getEnableContra,
    enableIpsilaterality, enableContralaterality,
    setThresholdModality,
    getThresholdModality
}