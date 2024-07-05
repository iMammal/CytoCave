/**
 * Created by Johnson on 2/15/2017.
 */
import NodeManager from "./NodeManager";


var previewAreaLeft, previewAreaRight;

var glyphNodeDictionary = {};        /// Object that stores uuid of left and right glyphs

//var activeVR = 'left';

var nodesSelected = [];
var nodesFocused = [];

var visibleNodes = [];               // boolean array storing nodes visibility

var pointedNodeIdx = -1;            // index of node under the mouse
var pointedObject;                  // node object under mouse
var root;                           // the index of the root node = start point of the shortest path computation

var thresholdModality = true;
var enableEB = false;
var enableIpsi = true;
var enableContra = false; //true;

var vr = false;                     // enable VR
var spt = false;                    // enabling shortest path
var click = false;
var hoverTimeout = false;
var oldNodeIndex = -1;
var hoverMode = 0;
var floatingLabel = false;

import * as THREE from 'three'
import {isLoaded, dataFiles, mobile,experimental,mcts,complexes} from "./globals";
import {
    addEdgeBundlingCheck,
    addModalityButton,
    addToggleLinePlotsButton,
	  addLateralityCheck,
    removeGeometryButtons,
    addOpacitySlider,
    addLineWidthSlider,
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
    addLabelScalingSlider,
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
import {func} from "three/nodes";
import nodeManager from "./NodeManager";
import {isNumber} from "mathjs";
import node from "three/addons/nodes/core/Node";
import {setDimensionFactorLeftBox, setDimensionFactorRightBox} from "./graphicsUtils";

function toggleFloatingLabel() {
    floatingLabel = !floatingLabel;
    return floatingLabel;
}

// callback on mouse moving, expected action: node beneath pointer are drawn bigger
function onDocumentMouseMove(model, event) {
    // the following line would stop any other event handler from firing
    // (such as the mouse's TrackballControls)
    // do we want that?
   // event.preventDefault();
   let intersectedObject = getIntersectedObject(event);
   //  console.log("intersectedObject: ");
   //  console.log(intersectedObject);
    let isLeft = event.clientX < window.innerWidth/2;
    updateNodeMoveOver(isLeft ? previewAreaLeft.model : previewAreaRight.model, intersectedObject, isLeft); // 1 = mouse hover

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
    let nodeIdx, region, nodeRegion;
    //console.log("updateNodeMoveOver: ");
    //console.log(intersectedObject);
    if(intersectedObject === undefined || intersectedObject === null)
        return;
    if(intersectedObject.object === undefined)
        return;
    //check if name is defined, if not, it is not a node
    if (intersectedObject.object.name === undefined) {
        return;
    }
    //it's also not a valid node if it has no name
    if (intersectedObject.object.name === '') {
        return;
    }
    //also not valid if type is highlight
    if (intersectedObject.object.type === 'highlight') {
        return;
    }

    //console.log("intersected Object Moveover: ");
    //console.log(intersectedObject);
    //check if the intersected object is a node, if it is the name.type will be 'region'
    //if it is a node, get the node index and the region name
    if (intersectedObject.object.name.type == 'region') {
        nodeIdx = previewAreaLeft.NodeManager.node2index(intersectedObject); //.instanceId);
        if (intersectedObject) {
            //nodeIdx = glyphNodeDictionary[intersectedObject.object.uuid];
            region = model.getRegionByIndex(nodeIdx);
            nodeRegion = model.getGroupNameByNodeIndex(nodeIdx);
        }
    } else {
        // you can test for things other than our instances and route accordingly
        // but right now other things don't matter.
        return;
    }

    //todo based on the code below this is only supposed to highlight the node if it is visible.
    //this is not working anyway so i'm just highlighting the node under the mouse.
    //further modified to not rehighlight the selected nodes.
  //console.info("hightlight triggered line 132 file drawing.js, node idx is ", nodeIdx);
  if(!previewAreaLeft.NodeManager.indexIsSelected(nodeIdx) && !previewAreaRight.NodeManager.indexIsSelected(nodeIdx) ) {
    previewAreaLeft.NodeManager.highlightNodeByIndex(nodeIdx);
    previewAreaRight.NodeManager.highlightNodeByIndex(nodeIdx);
    setTimeout(() =>  {
      //remove the highlight after 1 second
      //don't remove the highlight if the node is selected.
      if(!previewAreaLeft.NodeManager.indexIsSelected(nodeIdx) && !previewAreaRight.NodeManager.indexIsSelected(nodeIdx) ) {
      previewAreaLeft.NodeManager.removeHighlightByIndex(nodeIdx);
      previewAreaRight.NodeManager.removeHighlightByIndex(nodeIdx);
      }
    } , 1000);
  }

    //nodeIdx = intersectedObject.object.getDatasetIndex(intersectedObject.instanceId);
    // if (intersectedObject) {
    //     nodeIdx = glyphNodeDictionary[intersectedObject.object.uuid];
    //     region = model.getRegionByIndex(nodeIdx);
    //     nodeRegion = model.getGroupNameByNodeIndex(nodeIdx);
    // }
        //todo check if the visibleNodes array is valid
    let nodeExistAndVisible = (intersectedObject && visibleNodes[nodeIdx] && model.isRegionActive(nodeRegion));
    // update node information label
    if (nodeExistAndVisible) {
        setNodeInfoPanel(region, nodeIdx);
        // if (vr) {  //todo: this can be used outside of VR to help get node label info next to the node itself, not in the screen corner
        if (floatingLabel) {
            let labeltext = region.group+" "+region.name+" "+region.label;
             previewAreaLeft.nodeLabels.updateNodeLabel(labeltext,  intersectedObject);
             previewAreaRight.nodeLabels.updateNodeLabel(labeltext, intersectedObject);
        }
    }

    if (nodeExistAndVisible && previewAreaLeft.NodeManager.isSelected(intersectedObject)) { // not selected
        if (hoverTimeout && oldNodeIndex == nodeIdx) {
            // create a selected node (bigger) from the pointed node
            pointedObject = intersectedObject.object;
            // previewAreaLeft.updateNodeGeometry(nodeIdx, 'mouseover');
            // previewAreaRight.updateNodeGeometry(nodeIdx, 'mouseover');
            //console.log("highlight triggered line 158 drawing.js");
            //console.log("nodeIdx: ", nodeIdx);
          if(!previewAreaLeft.NodeManager.indexIsSelected(nodeIdx) && !previewAreaRight.NodeManager.indexIsSelected(nodeIdx) ) {
            previewAreaLeft.NodeManager.highlightNodeByIndex(nodeIdx);
            previewAreaRight.NodeManager.highlightNodeByIndex(nodeIdx);
            setTimeout(() =>  {
              //remove the highlight after 1 second
              //don't remove the highlight if the node is selected.
              if(!previewAreaLeft.NodeManager.indexIsSelected(nodeIdx) && !previewAreaRight.NodeManager.indexIsSelected(nodeIdx) ) {
                previewAreaLeft.NodeManager.removeHighlightByIndex(nodeIdx);
                previewAreaRight.NodeManager.removeHighlightByIndex(nodeIdx);
              }
            } , 1000);
          }
            // console.log("Drawing edges from node ", nodeIdx);
            //todo most of this behavior should be moved to the mouseover in previewArea's nodemanager.
            //will need a similar method for dealing with the VR controller.
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
            //nodeIdx = intersectedObject.object; //glyphNodeDictionary[pointedObject.uuid];
            // nodeIdx above would not of been an index, it would of been the object itself.
            //nodeIdx = previewAreaLeft.NodeManager.node2index(intersectedObject);
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
                // previewAreaLeft.updateNodeGeometry(nodeIdx, 'root');
                // previewAreaRight.updateNodeGeometry(nodeIdx, 'root');
                //
              root = nodeIdx;
                previewAreaLeft.NodeManager.setRootNode(nodeIdx);
                previewAreaRight.NodeManager.setRootNode(nodeIdx);
            } else {
                // previewAreaLeft.updateNodeGeometry(nodeIdx, 'normal');
                // previewAreaRight.updateNodeGeometry(nodeIdx, 'normal');
                previewAreaLeft.NodeManager.restoreNode(intersectedObject)
            }
            pointedObject = null;
        }
    }
};

// callback to interact with objects in scene with double click
// selected nodes are drawn bigger
function onMiddleClick(event) {
    //event.preventDefault();
  // determine if the click was on the left or right preview area
  let isLeft = event.clientX < window.innerWidth/2;
  if(isLeft && previewAreaLeft.name !== 'Left') {
      throw new Error("left click processed on right preview area");
  }
    var intersectedObject = getIntersectedObject(event);
    if (intersectedObject) {
        let nodeIndex = isLeft ? previewAreaLeft.NodeManager.node2index(intersectedObject) : previewAreaRight.NodeManager.node2index(intersectedObject);
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
        //updateScenes();
        enableShortestPathFilterButton(getSpt());
        enableThresholdControls(!getSpt());
    }
}

// callback to select a node on mouse click
function onLeftClick(previewArea, event) {



    let isLeft = event.clientX < window.innerWidth / 2;
    if(isLeft && previewArea.name !== 'Left') {
        //console.log("left click processed on right preview area");
        return;
    } else if (!isLeft && previewArea.name !== 'Right') {
        //console.log("right click processed on left preview area");
        return;
    }
    //event.preventDefault();
    let objectIntersected = getIntersectedObject(event);
    if(!objectIntersected) {
        return;
    }

        // if it is a node then toggle it's select state.
        // if it is not a node, then do nothing.
  //console.log("objectIntersected: ", objectIntersected);
    if(objectIntersected.object.name.type === 'region')
        previewArea.NodeManager.toggleSelectNode(objectIntersected);

    if (complexes){ // if complexes selection mode enabled, display lineplots for whole complex
        let neighborI = previewArea.NodeManager.node2index(objectIntersected); //edge.targetNodeIndex;
        previewArea.model.loadNodeDetails(neighborI); // fetch evidence plot for node
        if ( (complexes === 'nbrs') || (parseInt(complexes)) ) {
            // fetch evidence plot for node's neighbors
            let detailsMax = parseInt(complexes) ? complexes : 9999;
            let depth = parseInt(detailsMax);
            for (let edge of previewArea.NodeManager.getEdges(objectIntersected, 0,0, 0, depth)) {
                neighborI = edge.targetNodeIndex;
                previewArea.model.loadNodeDetails(neighborI);
                if (detailsMax) {
                    //detailsMax = detailsMax - 1;
                } else {
                    break;
                }
            }
        } else if (complexes === 'all') {
            previewArea.model.clearAllDetails();
            let nodesInComplex = previewArea.NodeManager.instances[objectIntersected.object.name.group][objectIntersected.object.name.hemisphere].userData.indexList; //'left'
            // sort nodexInComplex by edge weight with objectIntersected node with selected node first
            let selectedNodeIndex = previewArea.NodeManager.node2index(objectIntersected);
            nodesInComplex.sort((a,b) => {
                // let aDist = previewArea.model.getDistance(selectedNodeIndex, a);
                // let bDist = previewArea.model.getDistance(selectedNodeIndex, b);
                if(a === selectedNodeIndex) return -1;
                if(b === selectedNodeIndex) return 1;
                let aDist = previewArea.model.getConnectionMatrixRow(selectedNodeIndex).toArray()[a];
                let bDist = previewArea.model.getConnectionMatrixRow(selectedNodeIndex).toArray()[b];
                let diff = bDist - aDist;
                return diff;
            });

            for (let nodeIdx of nodesInComplex) { //  previewArea.NodeManager.instances[objectIntersected.object.name.group]['left'].userData.indexList){ //.object.parent.children){
                // let neighborI = previewArea.NodeManager.node2index(node); //edge.targetNodeIndex;
                previewArea.model.loadNodeDetails(nodeIdx); // fetch evidence plot for node
            }
            // previewArea.linegraphs.updateLinegraph();

        }

    }

}

// const updateNodeSelection = (model, objectIntersected, isLeft) => {
//     // console.log("model: ", model);
//     // console.log("objectIntersected: ", objectIntersected);
//     // console.log(`isLeft: ${isLeft}`);
//
//     if (!objectIntersected) return;
//
//
//
//     const instanceId = objectIntersected.instanceId;
//     const group = objectIntersected.object.name.group;
//     const hemisphere = objectIntersected.object.name.hemisphere;
//     // check if name is blank empty or undefined
//     if (group === "" || group === undefined) return;
//     if (hemisphere === "" || hemisphere === undefined) return;
//     if (instanceId === "" || instanceId === undefined) return;
//
//     const previewArea = isLeft ? previewAreaLeft : previewAreaRight;
//     //console.log("previewArea instances: ");
//     //console.log(previewArea.instances);
//     // if
//     //const instanceList = previewArea.instances[group][hemisphere];
//     //or could be
//     //const instanceList = objectIntersected.
//     // log instance
//
//     if (!group || !hemisphere || !instanceId) {
//         // console.log("group: ", group);
//         // console.log("hemisphere: ", hemisphere);
//         // console.log("instanceId: ", instanceId);
//
//         return;
//         }
//     //if selected make unselected, if unselected make selected
//     //objectIntersected.object.userData.selected = !objectIntersected.object.userData.selected;
//     // check if object is selected or not
//     let isSelected = previewArea.NodeManager.isSelected(objectIntersected);
//     let nodeIndex = previewArea.NodeManager.node2index(objectIntersected);
//     if (!isSelected) {
//         //mark object selected
//         previewArea.NodeManager.selectNode(objectIntersected);
//         //previewArea.updateNodeGeometry(objectIntersected, 'selected');
//         //set the object geometry to selected in both scenes
//         // this if statement is to handle different active groups in the left and right preview areas
//         let nodeIndex = -1;
//         if (isLeft) {
//             //this would not have provided an index.
//             previewAreaLeft.NodeManager.selectNode(objectIntersected);
//             //previewAreaRight.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
//             previewAreaRight.NodeManager.selectNode(objectIntersected);
//             //previewAreaLeft.getNodesInstanceFromDatasetIndex(nodeIndex);
//         } else {
//             //previewAreaRight.getNodesInstanceFromDatasetIndex(nodeIndex);
//             nodeIndex = previewAreaRight.updateNodeGeometry(objectIntersected, 'selected');
//             previewAreaLeft.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
//         }
//         //previewAreaLeft.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
//         //previewAreaRight.updateNodeGeometry(objectIntersected, 'selected', nodeIndex);
//         console.log("switched to selected");
//         //console.log(`objectIntersected.object.userData.selected: ${objectIntersected.object.userData.selected}`);
//         //previewArea.drawSelectedNode(objectIntersected);
//
//         if(spt) {
//             //previewArea.getShortestPathFromRootToNode(nodeIndex);
//             //return;
//             let pathArray = isLeft? modelLeft.getPathArray(getRoot(), nodeIndex) : modelRight.getPathArray(getRoot(), nodeIndex);
//             //console.log("pathArray: ", pathArray);
//             //console.log("pathArray.length: ", pathArray.length);
//             //console.log("pathArray[0]: ", pathArray[0]);
//             for (let i = 0; i < pathArray.length; i++) {
//                 if (thresholdModality) {
//                     previewAreaLeft.drawEdgesGivenNode(pathArray[i]);//,activeEdges);
//                     previewAreaRight.drawEdgesGivenNode(pathArray[i]);//,activeEdges);
//
//                 } else {
//                     //const n = model.getNumberOfEdges();
//                     //previewArea.drawTopNEdgesByNode(nodeIndex, n);
//                     previewAreaLeft.drawEdgesGivenNode(pathArray[i], model.getNumberOfEdges());
//                     previewAreaRight.drawEdgesGivenNode(pathArray[i], model.getNumberOfEdges());
//                 }
//
//             }
//         }
//
//         //todo map a ui toggle directly to preview areas.
//         let activeEdges = previewArea.drawConnections(); //do we want to draw the connections there or here in drawing? My vote is here.
//         // draw connections does not draw connections, but it does returs the lists of the connections to be drawn, filtered by the threshold.
//
//         //todo: work out the below.
//         if (thresholdModality) {
//             previewAreaLeft.drawEdgesGivenNode(nodeIndex);//,activeEdges);
//             previewAreaRight.drawEdgesGivenNode(nodeIndex);//,activeEdges);
//
//         } else {
//             //const n = model.getNumberOfEdges();
//             //previewArea.drawTopNEdgesByNode(nodeIndex, n);
//             previewAreaLeft.drawEdgesGivenNode(nodeIndex, model.getNumberOfEdges());
//             previewAreaRight.drawEdgesGivenNode(nodeIndex, model.getNumberOfEdges());
//         }
//
//     } else {
//         //console.log(`objectIntersected.object.userData.selected: ${objectIntersected.object.userData.selected}`);
//         //objectIntersected.object.userData.selected = false;
//         //unselect the object
//         console.log("switching to unselected");
//         //previewArea.updateNodeGeometry(objectIntersected, 'normal');
//         //set the object geometry to normal in both scenes
//         previewAreaLeft.updateNodeGeometry(objectIntersected, 'normal');
//         previewAreaRight.updateNodeGeometry(objectIntersected, 'normal');
//         previewAreaLeft.NodeManager.deselectNode(objectIntersected);
//         previewAreaRight.NodeManager.deselectNode(objectIntersected);
//         //previewAreaLeft.updateScene();
//         //previewAreaRight.updateScene();
//         //probably want to remove the edges from the scene here.
//         //console.log("end switch");
//         removeEdgesGivenNodeFromScenes(nodeIndex);
//     }
//
//     //log the currently selected nodes
//     let selectedNodes = getNodesSelected(); // local to drawing, returns a list from both preview areas
//     console.log("selectedNodes: ", selectedNodes);
// };

// callback on mouse press
function onMouseDown(event) {
    click = true;
    switch (event.button) { // middle button
        //auto bounce control timer
        case 0: // left click -> should be < 200 msec
        case 2: // right click -> should be < 200 msec
            setTimeout( () => {
                //console.log("unblocking click");
              //debouncing the click
                click = false;
            }, 300);
            break;
    }
}

// callback on mouse release
let onMouseUp = (model, event) => {

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
    // todo: not sure if the above todo is still valid
    // todo: this is still a stub since previewArea does it's own keyhandling.
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
    addLineWidthSlider();
    // addEdgeBundlingCheck();
    addToggleLinePlotsButton();
    addModalityButton();
    addThresholdSlider();
    //addLateralityCheck();
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
    //addFlashRateSlider();
    addLabelScalingSlider("Left");
    addLabelScalingSlider("Right");
    addSkyboxButton();

    if (mcts) { //} && (modelLeft.getActiveTopology() === 'LevelTree' || modelLeft.getActiveTopology() === 'TreeLevel') ) {
        modelLeft.setLeftRegionsActivated();
    } else {
        modelLeft.setAllRegionsActivated();
    }
    if (mcts) { //} && (modelRight.getActiveTopology() === 'LevelTree' || modelRight.getActiveTopology() === 'TreeLevel') ) {
        modelRight.setLeftRegionsActivated();
    } else {
        modelRight.setAllRegionsActivated();
    }

    if (mcts) {
        setDimensionFactorLeftBox(0.3);
        setDimensionFactorRightBox(0.3);
    }


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
    // pass mouse events controllers, took it off drawings hands.
    //previewAreaLeft.setEventListeners(onMouseDown, onMouseUp, onDocumentMouseMove);
    //previewAreaRight.setEventListeners(onMouseDown, onMouseUp, onDocumentMouseMove);
    window.addEventListener("keypress", onKeyPress, true);

    // $(window).resize( (e) => {
    //     //e.preventDefault();
    //     console.log("on resize event");
    //     previewAreaLeft.resizeScene();
    //     previewAreaRight.resizeScene();
    // });

    // todo: Not sure how this will be handled in WebXR, adding or removing a headset or controller in mid-session
    // window.addEventListener('vrdisplaypresentchange', function(e){
    //         //e.preventDefault();
    //         console.log("on resize event");
    //         previewAreaLeft.resizeScene();
    //         previewAreaRight.resizeScene();}
    //     , true);
    // previewAreas constructor will kick off the rendering loop.
    // previewAreaLeft.requestAnimate();
    // previewAreaRight.requestAnimate();
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

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();

    previewAreaLeft.drawConnections();
    previewAreaRight.drawConnections();

}

//enable Contralaterality
var enableContralaterality = function (enable) {
        enableContra = enable;

        console.log("CONTRA:"+enable);

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();

    previewAreaLeft.drawConnections();
    previewAreaRight.drawConnections();

}

//enable Ipsilaterality
var enableIpsilaterality = function (enable) {
    //if (!enableIpsi && enable) {}
    enableIpsi = enable;

	console.log("IPSI:"+enable);

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();

    previewAreaLeft.drawConnections();
    previewAreaRight.drawConnections();

}

//enable Contralaterality
var enableContralaterality = function (enable) {
	enableContra = enable;

	console.log("CONTRA:"+enable);

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();

    previewAreaLeft.drawConnections();
    previewAreaRight.drawConnections();

}


// enable edge bundling
var enableEdgeBundling = function (enable) {
    if (enableEB == enable)
        return;

    enableEB = enable;

    modelLeft.computeEdgesForTopology(modelLeft.getActiveTopology());
    modelRight.computeEdgesForTopology(modelRight.getActiveTopology());

    previewAreaLeft.removeEdgesFromScene();
    previewAreaRight.removeEdgesFromScene();
    previewAreaLeft.reset();
    previewAreaRight.reset();
    // previewAreaLeft.drawConnections();
    // previewAreaRight.drawConnections();
};

// updating scenes: redrawing glyphs and displayed edges
//todo compare with redrawScene
var updateScenes = function (side, clear = true) {
  let selectedNodes = getNodesSelected();
    console.log("Drawing Scene Update "+side);
    if (side !== "Right") {
        //previewAreaLeft.NodeManager.removeHighlights();
        previewAreaLeft.updateScene();
        createLegend(modelLeft,"Left");
    }
    if (side !== "Left") {
        //previewAreaRight.NodeManager.removeHighlights();
        previewAreaRight.updateScene();
        createLegend(modelRight,"Right");
    }
    previewAreaLeft.setSelectedNodes(selectedNodes,clear);
    previewAreaRight.setSelectedNodes(selectedNodes,clear);

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


let updateOpacity = function (opacity) {
  previewAreaLeft.setEdgeOpacity(opacity);
  previewAreaRight.setEdgeOpacity(opacity);
};

let updateEdgeWidth = function (width) {
    previewAreaLeft.setEdgeWidth(width);
    previewAreaRight.setEdgeWidth(width);
};

var removeEdgesGivenNodeFromScenes = function (nodeIndex) {
    previewAreaLeft.removeEdgesGivenNode(nodeIndex);
    previewAreaRight.removeEdgesGivenNode(nodeIndex);

    // setEdgesColor();
    // setEdgesColor();
};

//maps the coordinates to the canvas, returns a vector2 containing 2 values between -1 and 1
var mapCoordinates = function (event, isLeft) {
    // Define the mapping range for x and y coordinates
    const xRange = [-1, 1];
    const yRange = [-1, 1];

    // Calculate the x mapping based on isLeft
    let x;
    if (isLeft) {
        x = (event.clientX / (window.innerWidth / 2)) * (xRange[1] - xRange[0]) + xRange[0];
    } else {
        x = ((event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * (xRange[1] - xRange[0]) + xRange[0];
    }

    // Map the y coordinate
    const y = -(event.clientY / window.innerHeight) * (yRange[1] - yRange[0]) + yRange[1];

    return new THREE.Vector2(x, y);
};
// get intersected object beneath the mouse pointer
// detects which scene: left or right
// return undefined if no object was found
let getIntersectedObject = (event) => {

    var isLeft = event.clientX < window.innerWidth / 2;
    var vector = mapCoordinates(event, isLeft);

    //log client xy
    // console.log("clientX: ", event.clientX);
    // console.log("clientY: ", event.clientY);
    // console.log("Vector: ", vector);
    let iObject = isLeft ? previewAreaLeft.getIntersectedObject(vector) : previewAreaRight.getIntersectedObject(vector);

    return iObject;
};

// This now only changes the Right color group
var changeColorGroup = function (name, side) {
    console.log("Change color group: " + name + " " + side);
    let tempNodesSelected = getNodesSelected();

    if (side !== "Right" || side === "Both") {
        //previewAreaLeft.removeAllInstances();
        modelLeft.setActiveGroup(name);
        if(mcts) // && (name === 'LevelTree') || (name === 'TreeLevel'))
            modelLeft.setLeftRegionsActivated();
        else
            modelLeft.setAllRegionsActivated();
        modelLeft.getDataset(true);
        //previewAreaLeft.drawRegions();
        previewAreaLeft.updateNodesVisibility();
        previewAreaLeft.updateNodesColor();
        createLegend(modelLeft, "Left");
        //redrawScene("Left")   // This is not needed as the redrawScene is called in the updateNodesVisibility
        previewAreaLeft.setSelectedNodes(tempNodesSelected);
    }

    if (side !== "Left" || side === "Both" ) {
        //previewAreaRight.removeAllInstances();
        modelRight.setActiveGroup(name);
        if(mcts) // && (name === 'LevelTree') || (name === 'TreeLevel'))
            modelRight.setLeftRegionsActivated();
        else
            modelRight.setAllRegionsActivated();
        modelRight.getDataset(true);
        //previewAreaRight.drawRegions();
        previewAreaRight.updateNodesVisibility();
        previewAreaRight.updateNodesColor();

        createLegend(modelRight, "Right");
        //redrawScene("Right")  // This is not needed as the redrawScene is called in the updateNodesVisibility
        previewAreaRight.setSelectedNodes(tempNodesSelected);
    }
    setColorGroupScale(side);
    previewAreaLeft.updateScene();
    previewAreaRight.updateScene();

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

//todo compare with updateScene
var redrawScene = function (side) {
    setUpdateNeeded(true);
    switch (side) {
        case 'Left':
        case 'left':
            //previewAreaLeft.updateScene();
            break;
        case 'Right':
        case 'right':
            //previewAreaRight.updateScene();
            break;
    }
    updateScenes(side);
};

// change the active geometry
var changeActiveGeometry = function (model, side, type) {
    console.log("Change Active Geometry to: ", type);
    let tempNodesSelected = getNodesSelected();
    model.setActiveTopology(type);

    if(side !== "Left") {

        if (mcts) // && (type === 'LevelTree') || (type === 'TreeLevel'))
            modelRight.setLeftRegionsActivated();
        else
            modelRight.setAllRegionsActivated();
        modelRight.getDataset(true);
        previewAreaRight.reset();

        previewAreaRight.updateNodesVisibility();
        previewAreaRight.setSelectedNodes(tempNodesSelected);

    } else {

        if (mcts) // && (type === 'LevelTree') || (type === 'TreeLevel'))
            modelLeft.setLeftRegionsActivated();
        else
            modelLeft.setAllRegionsActivated();
        modelLeft.getDataset(true);
        previewAreaLeft.reset();
        previewAreaLeft.updateNodesVisibility();
        previewAreaLeft.setSelectedNodes(tempNodesSelected);

    }
    model.computeEdgesForTopology(model.getActiveTopology());
    redrawScene(side);
};

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
                    if (mcts) // && (type === 'LevelTree') || (type === 'TreeLevel'))
                        model.setLeftRegionsActivated();
                    else
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

// var setRoot = function (rootNode) {
//     root = rootNode;
//     previewAreaLeft.NodeManager.setRootNode(rootNode);
//     previewAreaRight.NodeManager.setRootNode(rootNode);
// }

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
    // console.log("nodesSelected: ");
    // console.log(nodesSelected);
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
  //todo see if context selection can be applied here
    return nodesFocused;
}

var clrNodesFocused = function () {
    //todo same as getNodesFocused comment except for this stuff.
  //todo see if context selection can be applied here
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
//    setRoot,
    getRoot,
    getSpt,
    updateScenes,
    updateNodesVisiblity,
    updateNodeMoveOver,
    //updateNodeSelection,
    redrawEdges,
    updateOpacity,
    updateEdgeWidth,
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
    //enableIpsilaterality, enableContralaterality,
    setThresholdModality,
    getThresholdModality,
    onMouseUp,
    onDocumentMouseMove,
    onMouseDown,
    toggleFloatingLabel
}
