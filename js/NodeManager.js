//javascript class to render the node structures.
//goals are to accelerate rendering using instancing and to allow for easy customization of the node rendering.
// Class also handles the node selection and highlighting providing a simple interface to the user.
// rendering interface provided by three.js
/*
* NodeManager: for rendering and managing nodes.
 */

import * as THREE from 'three';

import {getNormalGeometry, getNormalMaterial} from "./graphicsUtils";
import {previewAreaLeft} from "./drawing";

class NodeManager {

  constructor(_previewArea) {
    this.model = _previewArea.getModel();
    this.scene = _previewArea.getSceneObject();
    this.sceneObject = new THREE.Group();
    this.previewArea = _previewArea;
    this.groups = this.previewArea.listGroups();
    this.groupCount = this.groups.length;
    this.instances = {};
    this.selectedNodes = [];
    this.focusedNodes = []; //todo: what is a focused node?

    this.selectedNodesCount = 0;
    this.selectedNodesChanged = false;
    this.nodesSelectedGeneralCallback = null;
    this.nodeSelectedCallback = null;
    this.onNodeUnselectCallback = null;
    this.allNodesSelectedCallback = null;
    this.contextualNodes = [];
    this.contextualNodeDeactivated = null;
    this.contextualNodeActivated = null;
    this.maxNodesToProcess = 100; // used for shortest path
    this.processSTP = false; // used for shortest path
    this.STPRunning = false; // used for shortest path
    this.STPFinished = false; // used for shortest path
    this.STPFinishedCallback = null; // used for shortest path
    this.STPpath = null; // used for shortest path
    this.defaultScale = 1.0;
    this.rootNode = null;
    this.numberSelected = 0;
    this.processQueue = false;
    this.CreateInstanceMeshes();
    this.PositionAndColorNodes();
    this.addInstancesToScene();

    this.highLights = [];


    this.rootNodeChanged = false;
    this.rootNodeChangedCallback = null;
  }

  setContextualNodes(nodes) {
    //accepts an array of nodes and adds them to the contextualNodes list.

    this.contextualNodes = nodes;

    for (let i = 0; i < nodes.length; i++) {
      //trigger callback
      this.addContextNode(nodes[i]);
    }
  }

  setContextualNodesByIndex(indexList) {
    //brute force method to set the contextual nodes.
    // this.contextualNodes = [];
    for (let i = 0; i < indexList.length; i++) {
      let node = this.index2node(indexList[i]);
      //this.contextualNodes.push(node);
      //trigger callback
      this.addContextNode(node);
    }
  }

  PositionAndColorNodes() {
    let dataset = this.model.getDataset();
    let topIndexes = {};
    for (let i = 0; i < dataset.length; i++) {
      let instance = this.instances[dataset[i].group][dataset[i].hemisphere];
      let position = dataset[i].position;
      if (topIndexes[dataset[i].group] === undefined) {
        topIndexes[dataset[i].group] = {
          left: 0,
          right: 0
        };
      }
      let index = topIndexes[dataset[i].group][dataset[i].hemisphere];
      instance.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
      instance.setColorAt(index, instance.material.color);
      topIndexes[dataset[i].group][dataset[i].hemisphere]++;
      if (instance.userData.indexList === undefined) {
        instance.userData.indexList = [];
      }
      instance.userData.indexList.push(i);
      if (instance.userData.selectedNodes === undefined) {
        instance.userData.selectedNodes = [];
      }
      if (instance.userData.contextualNodes === undefined) {
        instance.userData.contextualNodes = [];
      }
    }
  }

    CreateInstanceMeshes() {
        //create instance mesh for each group
        let LeftNormalGeometry = getNormalGeometry("left", this.previewArea.name);
        console.log("LeftNormalGeometry Side: " + this.previewArea.name);
        console.log(this.previewArea.name);
        let RightNormalGeometry = getNormalGeometry("right", this.previewArea.name);

        // Function to create an instance with specified properties
        const createInstance = (count, geometry, material, hemisphere, group) => {
            if (count > 0) {
                const instance = new THREE.InstancedMesh(geometry, material, count);
                instance.name = {
                    group,
                    hemisphere,
                    type: 'region'
                };
                instance.setColorAt(0, material.color);
                return instance;
            }
            return null;
        };

        //each group has it's own material that is used for all instances of that group
        // these can be retrieved with previewArea.getNormalMaterial(this.model, group)
        for (let i = 0; i < this.groupCount; i++) {
            let leftCount = this.previewArea.countGroupMembers(this.groups[i], "left", this.previewArea.name);
            let rightCount = this.previewArea.countGroupMembers(this.groups[i], "right", this.previewArea.name);
            let material = getNormalMaterial(this.model, this.groups[i]);
            this.instances[this.groups[i]] = {
                left: createInstance(leftCount, LeftNormalGeometry, material, 'left', this.groups[i]),
                right: createInstance(rightCount, RightNormalGeometry, material, 'right', this.groups[i])
            };
        }
    }


  CountGroupMembers(group) {
    let leftCount;
    let rightCount;
    leftCount = this.previewArea.countGroupMembers(group, "left");
    rightCount = this.previewArea.countGroupMembers(group, "right");
    return {left: leftCount, right: rightCount}
  }

  index2node(index) {
    //find the instancedMesh that contains the index and return it.
    //return null if not found.
    if (index === null || index === undefined || isNaN(index)) {
      //console.log("index2node  Index: " + index);
      throw new Error("index is not a number");
    }
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        //if the index is in the userData.indexList of the instance, return the instance.
        //if index is null undefined or in any other way not a number, throw an error.
        //console.log("looking for index: " + index + " in group: " + group + " and hemisphere: " + hemisphere);
        if (this.instances[group][hemisphere].userData.indexList.includes(index)) {
          return {
            object: this.instances[group][hemisphere],
            instanceId: this.instances[group][hemisphere].userData.indexList.indexOf(index),
            point: this.getNodePosition({
              object: this.instances[group][hemisphere],
              instanceId: this.instances[group][hemisphere].userData.indexList.indexOf(index)
            })
          };
        }
      }
    }
    return null;
  }

  node2index = (node) => {
    //the node is what is returned by the raycaster. this will contain the instanceId. use this to get the index.
    //find the index of the node in the userData.indexList of the instance.
    //return null if not found.
    // from the node.userData.indexList, get the node at position instanceId.
    // return the index of the node in the dataset.
    let instanceId = node.instanceId;
    // check if object is null or undefined
    if (node.object === null || node.object === undefined) {
      console.log('error');
      console.log(node);
      throw new Error("node2index node.object null InstanceID: " + instanceId + " index: ?");
    }
    //check if userData.indexList is defined. before using it.
    if (node.object.userData === undefined) {
      console.log('error');
      console.log(node);
      throw new Error("node2index userData undefined, InstanceID: " + instanceId + " index: ?");
    }
    if(instanceId >= node.object.userData.indexList.length){
      console.log("instanceId is greater than length of indexList");
      throw new Error("instanceId is greater than length of indexList");
    }
    let index= undefined;
    if(instanceId === undefined || instanceId === null || isNaN(instanceId)) {
      console.log("node2index  InstanceID: " + instanceId + " index: " + index + "InstanceID is null undefined or in any other way not a number")
      console.log("Falling back to node.id")
      index = node.object.userData.indexList[node.id];
    } else {
      index = node.object.userData.indexList[instanceId];
    }
    //let index = node.object.userData.indexList[instanceId];
    if (index === undefined && node.id !== undefined) {
      console.log("node2index  InstanceID: " + instanceId + " index: " + index + "Index not found in userData.indexList");
      throw new Error("index not found in dataset");
    }


    return index;
  }

  //gets all selected nodes, optionally filtered by group and hemisphere.
  //to filter by group, pass an array of group names. to filter by hemisphere, pass an array of hemisphere names.
  //todo rename hemisphere to subsection or something.
  getSelectedNodes(groups = null, hemispheres = null) {
    // from all this.instances, get the userData.selectedNodes of each instance.
    // return the list of selected nodes.
    if (groups === null) {
      groups = this.groups;
    }

    if (hemispheres === null) {
      hemispheres = ["left", "right"];
    }

    let selectedNodes = [];
    for (let group in this.instances) {
      if (!groups.includes(group)) {
        continue;
      }
      for (let hemisphere in this.instances[group]) {
        if (!hemispheres.includes(hemisphere)) {
          continue;
        }
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        //console.log("getting selected nodes from group: " + group + " and hemisphere: " + hemisphere);
        //console.log(this.instances[group][hemisphere].userData.selectedNodes);
        selectedNodes = selectedNodes.concat(this.instances[group][hemisphere].userData.selectedNodes);
      }
    }

    return selectedNodes;

    //
    // let selectedNodes = [];
    // for (let group in this.instances) {
    //     for (let hemisphere in this.instances[group]) {
    //         if(this.instances[group][hemisphere] === null){
    //             continue;
    //         }
    //         //console.log("getting selected nodes from group: " + group + " and hemisphere: " + hemisphere);
    //             //console.log(this.instances[group][hemisphere].userData.selectedNodes);
    //         selectedNodes = selectedNodes.concat(this.instances[group][hemisphere].userData.selectedNodes);
    //     }
    // }
    // this.selectedNodes = selectedNodes;
    // return selectedNodes;
  }

  setSelectedNodes(indexList, clear = true) {
    // takes an array of dataset indexes and sets the selectedNodes of each instance.
    // this can be used for mass selection of nodes. does not set RootNode.
    //console.log("setting selected nodes from index list of length: " + indexList.length + " clear: " + clear);
    //console.log(indexList);
    //clear the selectedNodes of each instance.
    if (clear) {
      this.selectedNodesCount = 0;
      for (let group in this.instances) {
        for (let hemisphere in this.instances[group]) {
          if (this.instances[group][hemisphere] === null) {
            continue;
          }
          this.instances[group][hemisphere].userData.selectedNodes = [];
        }
      }
    }
    //identify the instance that contains each index and add the index to the userData.selectedNodes of that instance.
    for (let i = 0; i < indexList.length; i++) {
      let node = this.index2node(indexList[i]);
      this.selectNode(node)
      //this.selectedNodesCount++;
    }
    this.selectedNodes = this.getSelectedNodes();
    this.selectedNodesChanged = true;
  }

  getData(node) {
    //convert the node to an index. then return the dataset[index] from the model.
    let index = this.node2index(node);
    return this.model.getDataset()[index];
  }

  isSelectable(node) {
    //check if the node is selectable.
    //this is true if the node is in the dataset and has a valid instanceId.
    let index = this.node2index(node);
    return index !== null;
  }

  getOriginalPosition(node) {
    //get the position of the node.
    //this is the position of the node as defined by dataset.
    let index = this.node2index(node);
    return this.model.getDataset()[index].position;
  }

  getNodePosition(node = null) {
    let matrix = new THREE.Matrix4();
    //get the position of the node.
    node.object.getMatrixAt(node.instanceId, matrix);
    let position = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);
    return position;
  }

  restoreNodePosition(node) {
    //restore the position of the node.
    //this is the position of the node as defined by dataset.
    let index = this.node2index(node);
    let position = this.model.getDataset()[index].position;
    node.object.setMatrixAt(node.instanceId, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
  }

  restoreNodePositionByIndex(index) {
    let node = this.index2node(index);
    this.restoreNodePosition(node);
  }

  restoreNodeColor(node) {
    //restore the color of the node.
    //this is the color of the node as defined by the instance.
    let index = this.node2index(node);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    instance.setColorAt(instance.userData.indexList.indexOf(index), instance.material.color);
  }

  restoreNodeColorByIndex(index) {
    let node = this.index2node(index);
    this.restoreNodeColor(node);
  }

  restoreNodeScale(node) {
    //restore the scale of the node.
    //this is the scale of the node as defined by the instance.
    let matrix = new THREE.Matrix4();
    node.object.getMatrixAt(node.instanceId, matrix);
    matrix.scale(new THREE.Vector3(this.defaultScale, this.defaultScale, this.defaultScale));
    let index = this.node2index(node);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    //let scale = this.defaultScale;
    instance.setMatrixAt(instance.userData.indexList.indexOf(index), matrix);
  }

  restoreNodeScaleByIndex(index) {
    let node = this.index2node(index);
    this.restoreNodeScale(node);
  }

  restoreNode(node) {
    this.restoreNodePosition(node);
    this.restoreNodeColor(node);
    this.restoreNodeScale(node);
  }

  restoreNodeByIndex(index) {
    let node = this.index2node(index);
    this.restoreNode(node);
  }

  restoreAllNodes() {
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        for (let i = 0; i < this.instances[group][hemisphere].userData.indexList.length; i++) {
          let index = this.instances[group][hemisphere].userData.indexList[i];
          let node = this.index2node(index);
          this.restoreNode(node);
        }
      }
    }
  }

  scaleNode = (node, scale) => {
    let matrix = new THREE.Matrix4();
    //scale by a factor of scale.
    node.object.getMatrixAt(node.instanceId, matrix);
    matrix.scale(new THREE.Vector3(scale, scale, scale));
    node.object.setMatrixAt(node.instanceId, matrix);
  }

  scaleNodeByIndex(index, scale) {
    let node = this.index2node(index);
    this.scaleNode(node, scale);
  }

  translate(node, translation) {
    let position = new THREE.Vector3();
    position.setFromMatrixPosition(node.object.getMatrixAt(node.instanceId));
    let matrix = new THREE.Matrix4();
    //translate by a vector translation.
    node.object.getMatrixAt(node.instanceId, matrix);
    matrix.setPosition(position.add(translation));
    node.object.setMatrixAt(node.instanceId, matrix);
  }

  // callback for onMouseover must preserve the context of the NodeManager instance.
  // this is done by using the bind method or in this case the arrow function.
  onMouseover = (event) => {
    //when the mouse is over a node, highlight the node.
    //if the node is selected, do nothing.
    let node = event.object;
    if (!this.isSelected(node)) {
      this.highlightNode(node);  //todo: add color parameter, defaults to white.
      //add timeout to remove highlight.
      setTimeout(() => {
        this.removeHighlightByIndex(this.node2index(node));
      } , 1000);
    }
  }

  highlightNode(node,color = 0xffffff) {
    if (node == null || node === undefined || node.object === null || node.object === undefined ) {
      console.log("highlightNode: node is null or undefined");
      console.log(node);

      //throw new Error("node is null or undefined");
      return;
    }
    //only put index in the highlight list if it is not already there.
    let index = this.node2index(node);
    // check if index matches any index in highLights userData.index
    // for (let i = 0; i < this.highLights.length; i++) {
    //   if (this.highLights[i].userData.index === index) {
    //     return;
    //   }
    // }
    // // use some method to do above
    if(this.highLights.some(highLight => highLight.userData.index === index)){
      return;
    }

    //console.log("Highlighting");
    //console.log(index);
    // Create a wireframe  slightly larger than the node.
    // const radius = 1.1;
    // const segments = 32;
    const baseGeometry = getNormalGeometry(node.object.name.hemisphere,this.previewArea.name);
    const wireframe = new THREE.WireframeGeometry(
      baseGeometry
    );

    // Create a wireframe material with a low opacity.
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      linewidth: 8
    });

    //figure out the size of the node so we can scale the highlight to match.
    let matrix = new THREE.Matrix4();
    node.object.getMatrixAt(node.instanceId, matrix);
    let scale = matrix.getMaxScaleOnAxis();

    let newHighlight = new THREE.LineSegments(wireframe, material);
    // Create a wireframe mesh and set its position.
    newHighlight = new THREE.LineSegments(wireframe, material);
    if (newHighlight === null || newHighlight === undefined) {
      throw new Error("highLight is null or undefined");
    }
    const position = this.getNodePosition(node);
    newHighlight.position.set(position.x, position.y, position.z);
    newHighlight.scale.set(scale * 1.02, scale * 1.02, scale * 1.02);
    newHighlight.visible = true;
    newHighlight.userData = {
      type: "highlight",
      group: node.object.name.group,
      hemisphere: node.object.name.hemisphere,
      index: index
    }
    this.sceneObject.add(newHighlight);
    // console.log("Highlight Position:", this.highLight.position);
    // console.log("Highlight Scale:", this.highLight.scale);
    // Set a timeout to remove the highlight.
    this.highLights.push(newHighlight);

  }

  highlightNodeByIndex(index, color= 0xffffff) {

    let node = this.index2node(index);
    this.highlightNode(node,color);
  }

  removeHighlights = () => {
    //remove all highlights.
    let i = this.highLights.length;
    while (i--)   {
      this.removeHighlightByIndex(this.highLights[i].userData.index);
    }

  };

  removeHighlight(node) {
    // remove highlight from scene where highlight.userData.index === node.userData.index
    //console.log("removing highlight");

    let index = this.node2index(node);
    //console.log(index);
    this.removeHighlightByIndex(index);

  }
  removeHighlightByIndex(index) {

    // remove highlight from this.highLights where highlight.userData.index === index
    // count matching objects in this.highLights
    // if count > 1
    for (let i = 0; i < this.highLights.length; i++) {
      if (this.highLights[i].userData.index === index) {
        this.sceneObject.remove(this.highLights[i]);
        //remove from this.highLights list
        this.highLights.splice(i, 1);
      }

    }
    //let node = this.index2node(index);
    //this.removeHighlight(node);
  }


  isSelected(node) {
    //check if the node is selected.
    //this is true if the node is in the userData.selectedNodes of the instance.
    //throw an error if hemisphere or group are not set
    if (node.object.name.hemisphere === undefined || node.object.name.group === undefined) {
      console.log("NodeManager.isSelected: hemisphere or group not set");
      console.log(node);
    }
    let index = this.node2index(node);
    if (index === null) {
      return false;
    }


    let value = this.instances[node.object.name.group][node.object.name.hemisphere].userData.selectedNodes.includes(index);

    // verify the value is valid
    if (value === undefined || value === null) {
      console.log("NodeManager.isSelected: value is undefined or null");
      console.log(node);
    }

    return value;
    //return this.selectedNodes.includes(index);
  }

  //nodeSelectedCallback(node) {
    //console.log("nodeSelectedCallback");
    //console.log(node);
    //console.log(this);
    //console.log(this.model);
    //console.log(this.model.getDataset());
    //console.log(this.model.getDataset()[this.node2index(node)]);
    //console.log(this.model.getDataset()[this.node2index(node)].name);
    //console.log(this.model.getDataset()[this.node2index(node)].group);
    //console.log(this.model.getDataset()[this.node2index(node)].hemisphere);
    //console.log(this.model.getDataset()[this.node2index(node)].position);
    //console.log(this.model.getDataset()[this.node2index(node)].index);

    //this.model.loadNodeDetails(this.model.getDataset()[this.node2index(node)]);
  //  }


  selectNode(node) {
    //given a node from the raycaster, select the node and add it to the userData.selectedNodes of the instance.
    //if the node is already selected, do nothing.

    if (!this.isSelected(node)) {

      let index = this.node2index(node);
      //throw an error if index is null undefined or in any other way not a number.
      if (index === null || index === undefined || isNaN(index)) {
        console.log("selectNode: index is null undefined or in any other way not a number");
        console.log(node);

      }
      if (this.selectedNodesCount === 0) {
        this.rootNode = index;
        this.rootNodeChanged = true;
      }
      this.instances[node.object.name.group][node.object.name.hemisphere].userData.selectedNodes.push(index);
      this.selectedNodes.push(index);
      this.selectedNodesChanged = true;
      this.selectedNodesCount++;
      //
      //this.model.loadNodeDetails(index); //this.model.getDataset()[index]);
      //use the callback, right now it points to appearselected in previewarea as defined by previewarea.
      if (this.nodeSelectedCallback !== null) {
        this.nodeSelectedCallback(node);
      }
    }
  }

  deselectNode(node) {
    //given a node from the raycaster, deselect the node and remove it from the userData.selectedNodes of the instance.
    //if the node is not selected, do nothing.
    if (this.isSelected(node)) {
      let index = this.node2index(node);
      let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
      let selectedNodes = instance.userData.selectedNodes;
      let indexList = instance.userData.indexList;
      let instanceId = selectedNodes.indexOf(index);
      selectedNodes.splice(instanceId, 1);
      this.selectedNodes.splice(this.selectedNodes.indexOf(index), 1);
      this.selectedNodesChanged = true;
      this.selectedNodesCount--;
      if (this.selectedNodesCount === 0) {
        this.rootNode = null;
        this.rootNodeChanged = true;
      }
      if (this.onNodeUnselectCallback !== null) {
        this.onNodeUnselectCallback(node);
      }
    }
  }

  toggleSelectNode(node) {
    //given a node from the raycaster, toggle the selection.
    //if the node is selected, deselect it.
    //if the node is not selected, select it.
    if (this.isSelected(node)) {
      this.deselectNode(node);
    } else {
      this.selectNode(node);
    }
  }

  indexIsSelected(index) {
    //given a dataset index, check if the node is selected.
    //this is true if the node is in the userData.selectedNodes of the instance.
    let node = this.index2node(index);
    return this.instances[node.object.name.group][node.object.name.hemisphere].userData.selectedNodes.includes(index);
  }

  select(index) {
    //given a dataset index, select the node and add it to the userData.selectedNodes of the instance.
    //if the index is not a number null or undefined, throw an error.
    if (index === null || index === undefined || isNaN(index)) {
      throw new Error("index is not a number");
    }
    //if the node is already selected, do nothing.
    let node = this.index2node(index);
    this.selectNode(node);
  }

  deselect(index) {
    //given a dataset index, deselect the node and remove it from the userData.selectedNodes of the instance.
    //if the node is not selected, do nothing.
    let node = this.index2node(index);
    //throw an error if node is not found.
    this.deselectNode(node);
  }

  toggleSelect(index) {
    //given a dataset index, toggle the selection.
    //if the node is selected, deselect it.
    //if the node is not selected, select it.
    let node = this.index2node(index);
    if (this.isSelected(node)) {
      this.deselect(index);
    } else {
      this.select(index);
    }
  }

  selectAll() {
    //probably don't do this. it might work but will have side effects
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        for (let i = 0; i < this.instances[group][hemisphere].userData.indexList.length; i++) {
          let index = this.instances[group][hemisphere].userData.indexList[i];
          this.select(index); // beware, the callbacks for each individual node are still called in select.
        }
      }
    }
    if(this.allNodesSelectedCallback !== null){
      this.allNodesSelectedCallback();
    }
  }

  deselectAll() {
    for (let x = this.selectedNodes.length - 1; x >= 0; x--) {
      this.deselect(this.selectedNodes[x]);
    }
  }

  toggleSelectAll() {
    //don't do this either.
    for (let group in this.instances) {
      //for each instance, get the userData.indexList and userData.selectedNodes.
      let inversion = [];
      for (let hemisphere in this.instances[group]) {
        // call this.toggleSelect for each index in the indexList.
        let instance = this.instances[group][hemisphere];
        let indexList = instance.userData.indexList;
        //  let selectedNodes = instance.userData.selectedNodes;
        //for each index in the indexList, call toggleSelect.
        for (let i = 0; i < indexList.length; i++) {
          this.toggleSelect(indexList[i]);
        }
      }
    }
  }

  //Given a node from the raycaster, return the edges of the node.
  //Optional parameters are threshold, topN, and distance.
  //Threshold is the minimum weight of the edge.
  //TopN is the maximum number of edges to return.
  //Distance is the maximum distance from the source node to the target node.
  //If distance is 0, the distance filter is disabled.
  //If topN is null or 0, the topN filter is disabled.
  //If threshold is null or 0, the threshold filter is disabled.
  getEdges = (node, threshold = 0, topN = 0, distance = 0) => {
    //todo: move to model, remove edges as a concept from NodeManager
    let edges = []; //this.previewArea.model.getActiveEdges();
    //console.log(edges);
    //return edges;
    //get the edges of the node at the instanceId.
    // console.log("Getting Edges");
    // //settings
    // console.log("Threshold: " + threshold);
    // console.log("TopN: " + topN);
    // console.log("Distance: " + distance);
    if(threshold === 0){
      threshold = this.previewArea.model.getThreshold();
    }
    let maxThreshold = this.previewArea.model.getMaximumWeight();
    //console.log("Max Threshold: " + maxThreshold);

    if(threshold > maxThreshold){
      threshold = maxThreshold;
      this.previewArea.model.setThreshold(threshold); //update the threshold in the model.
    }
    if(topN === 0){
      topN = this.previewArea.model.getNumberOfEdges();
    }
    if(distance === 0){
      distance = this.previewArea.model.getDistanceThreshold();
    }
    let index = this.node2index(node);
    let matrixRow = this.model.getConnectionMatrixRow(index);


    //
    // for (let i = 0; i < matrixRow.length; i++) {
    //     if (matrixRow[i] > threshold) {
    //         edges.push({
    //             sourceNodeId: index,
    //             targetNodeIndex: i,
    //             weight: matrixRow[i],
    //             position: this.getNodePosition(this.index2node(i))
    //         });
    //     }
    // }
    //console.log("Starting with " + matrixRow.size() + " edges.");
    matrixRow.forEach((weight, j) => {
      if (weight > threshold && weight <= maxThreshold) {
        let regionActive1 = this.previewArea.model.isRegionActive(this.index2node(index).object.name.group);
        let regionActive2 = this.previewArea.model.isRegionActive(this.index2node(j[0]).object.name.group);
        if (regionActive1 && regionActive2) {
          edges.push({
            sourceNodeIndex: index,
            targetNodeIndex: j[0],
            weight: weight,
            position: this.getNodePosition(this.index2node(j[0]))
          });
        }
      }
    });


    edges.sort((a, b) => {
      //sort by weight
      return b.weight - a.weight;
    });

    if (distance !== 0) {
      console.log("Distance filter active, distance to 0 to disable.");
      //calculate distance to each target, drop targets that are too far away.
      let sourcePosition = this.getNodePosition(node);
      edges = edges.filter(edge => {
        let targetPosition = this.getNodePosition(this.index2node(edge.targetNodeIndex));
        let distance2target = sourcePosition.distanceTo(targetPosition);
        return distance2target <= distance;
      });
    } else {

      edges.sort((a, b) => {
        // sort by distance closest to farthest
        let sourcePosition = this.getNodePosition(node);
        let aPosition = this.getNodePosition(this.index2node(a.targetNodeIndex));
        let bPosition = this.getNodePosition(this.index2node(b.targetNodeIndex));
        let aDistance = sourcePosition.distanceTo(aPosition);
        let bDistance = sourcePosition.distanceTo(bPosition);
        return aDistance - bDistance;
      });

    }

    if (topN !== null && topN > 0) {
      console.log("TopN filter set topN to null or 0 to disable.");
      edges = edges.slice(0, topN);
    }
    // console.log("Returning " + edges.length + " edges.");
    // console.log(edges);
    return edges;

  }

  //given two nodes, find common edge.
  //return the edge or null if no common edge.
  getEdge(node1, node2) {
    let edges = this.getEdges(node1);
    for (let i = 0; i < edges.length; i++) {
      if (edges[i].targetNodeIndex === this.node2index(node2)) {
        return edges[i];
      }
    }
    return null;
  }




  /*supplemental example function that activates edges on nodes around the actual selected node.*/
  /* node is the node that was selected. distance is the distance from the node to the target node.
  /* focusDepth is the number of hops to activate focus on.
  */
  activateContextAroundNode(node, distance, focusDepth = 1, topN = null, processby = "edgeweight") {
    // nodes around the are either physically close to the node or connected to the node by an edge.
    // if the node is already selected, do nothing.

    if (this.inContext(node)) {
      //skip this node if it is already in the context.
      return;
    }
    if(processby === "edgeweight") {
      let edges = [];
      if (topN === null || topN === undefined || isNaN(topN) || topN === 0) {
        topN = previewAreaLeft.model.getNumberOfEdges();
      }

      if (topN === null || topN === undefined || isNaN(topN) || topN === 0) {
        topN = null;
      }
      //get the edges of the node.
      edges = this.getEdges(node, previewAreaLeft.model.getThreshold(), topN, distance);

      //sort by threshold
      edges.sort((a, b) => {
        return b.weight - a.weight;
      });


      //for each edge add the target node to the context.
      for (let i = 0; i < edges.length; i++) {
        let targetNode = this.index2node(edges[i].targetNodeIndex);

        //console.log("adding node to context");
        //console.log(targetNode);
        const data = {order: i, weight: edges[i].weight, origin: this.node2index(node)};
        this.addContextNode(targetNode, data);
      }
    }

  }

  removeContextNodesFromAroundObject(node, distance = 0, topN = null, processby = "edgeweight") {
    // nodes around the are either physically close to the node or connected to the node by an edge.
    // if the node is already selected, do nothing.
    console.log("removeContextNodesFromAroundObject");

    if(processby === "edgeweight") {
      let edges = [];

      //get the edges of the node.
      edges = this.getEdges(node, previewAreaLeft.model.getThreshold(), topN, distance);

      //sort by threshold
      edges.sort((a, b) => {
        return b.weight - a.weight;
      });

      for (let i = 0; i < edges.length; i++) {
        let targetNode = this.index2node(edges[i].targetNodeIndex);

        //console.log("removing node from context");
        //console.log(targetNode);

        this.removeContextNodeByIndex(edges[i].targetNodeIndex);
      }
    }
}

  /*same as above but uses the index of the node instead of the node itself.*/
  activateContextAroundIndex(index, distance, focusDepth = 1) {
    let node = this.index2node(index);
    this.activateContextAroundNode(node, distance, focusDepth);
  }

  removeContextNode(node) {
    // remove the node from the userData.contextualNodes of the instance.
    // if the node is not focused, do nothing.
    if (!this.inContext(node)) {
      return;
    }
    let index = this.node2index(node);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    let contextualNodes = instance.userData.contextualNodes;
    //let instanceId = contextualNodes.indexOf(index);
    contextualNodes.splice(index, 1);
    this.contextualNodes.splice(this.contextualNodes.indexOf(index), 1);
    // fire the callback if it is set.
    if (this.contextualNodeDeactivated !== null) {
      //console.debug("firing callback for contextual node deactivated")
      this.contextualNodeDeactivated(node);
    }
  }

  removeContextNodeByIndex(index) {
    let node = this.index2node(index);
    this.removeContextNode(node);
  }

  addContextNode(node, data) {
    // add the node to the userData.contextualNodes of the instance.
    // if the node is already focused, do nothing.
    if (this.inContext(node)) {
      //console.log("node is already in context")
      return;
    }
    let index = this.node2index(node);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    instance.userData.contextualNodes.push(index);
    this.contextualNodes.push(index);
    // fire the callback if it is set.
    if (this.contextualNodeActivated !== null) {
      //console.debug("firing callback for contextual node activated")
      if (data !== undefined) {
        this.contextualNodeActivated(node, data);
      } else {
        this.contextualNodeActivated(node);
      }
    }
  }

  addContextNodeByIndex(index, data) {
    let node = this.index2node(index);
    this.addContextNode(node, data);
  }

  inContext(node) {
    //check if the node is focused.
    //this is true if the node is in the userData.focusedNodes of the instance.
    //throw an error if hemisphere or group are not set
    if (node.object.name.hemisphere === undefined || node.object.name.group === undefined) {
      console.log("Error checking context, node info is undefined or null");
      console.log(node);
    }
    let index = this.node2index(node);

    //check if the node is in the this.contextualNodes list. return true if it is.
    if (this.contextualNodes.includes(index)) {
      return true;
    } else {
      return false;
    }

  }

  indexInContext(index) {
    //given a dataset index, check if the node is focused.
    //this is true if the node is in the userData.focusedNodes of the instance.
    let node = this.index2node(index);
    return this.instances[node.object.name.group][node.object.name.hemisphere].userData.contextualNodes.includes(index);
  }


  //Given an index number return the available edges from that node.
  //Optional parameters are threshold, topN, and distance.
  //Threshold is the minimum weight of the edge.
  //TopN is the maximum number of edges to return.
  //Distance is the maximum distance from the source node to the target node.
  //If distance is 0, the distance filter is disabled.
  //If topN is null or 0, the topN filter is disabled.
  //If threshold is null or 0, the threshold filter is disabled.
  getEdgesByIndex(index, threshold = 0, topN = null, distance = 0) {
    let node = this.index2node(index);
    let edges = this.getEdges(node, threshold, topN, distance);
    return edges;
  }

  addInstancesToScene() {
    //add each instance to the scene.
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        // console.log("adding instance to scene");
        // console.log(this.instances[group][hemisphere]);
        this.sceneObject.add(this.instances[group][hemisphere]);
      }
    }
    //set name of sceneObject to "NodeManager"
    this.sceneObject.name = "NodeManager";
    this.scene.add(this.sceneObject);
  }

  setNodeColor(index, color) {
    //given a dataset index, set the color of the node.
    let node = this.index2node(index);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    instance.setColorAt(instance.userData.indexList.indexOf(index), color);
  }

  setNodeColorByNode(node, color) {
    //given a node from the raycaster, set the color of the node.
    let index = this.node2index(node);
    let instance = this.instances[node.object.name.group][node.object.name.hemisphere];
    instance.setColorAt(instance.userData.indexList.indexOf(index), color);
  }

  update() {
    if (this.selectedNodesChanged) {
      this.selectedNodesChanged = false;
      if (this.nodesSelectedGeneralCallback !== null) {
        this.nodesSelectedGeneralCallback();
      }
      for (let group in this.instances) {
        for (let hemisphere in this.instances[group]) {
          if (this.instances[group][hemisphere] === null) {
            continue;
          }
          this.instances[group][hemisphere].instanceMatrix.needsUpdate = true;

        }
      }

    }

    if (this.rootNodeChanged) {
      this.rootNodeChanged = false;
      if (this.rootNodeChangedCallback !== null) {
        this.rootNodeChangedCallback();

      }

        if(this.processSTP){
            this.STPstep( this.stpQueue, this.sptSet, this.dist, this.prev);
            if(this.STPFinishedCallback !== null){
                this.STPFinishedCallback();
            }
        }

    }
  }

  setRootNode(index) {
    this.rootNode = index;
    this.rootNodeChanged = true;
  }

  getRootNode() {
    return this.rootNode;
  }

  removeRootNode() {
    this.rootNode = null;
    this.rootNodeChanged = true;
  }

  setRootNodeChangedCallback(callback) {
    this.rootNodeChangedCallback = callback;
  }

  ChangeOpacityByGroupAndHemisphere = (group, hemisphere, opacity) => {
    if (this.instances[group] === undefined) {
      return;
    }
    if (this.instances[group][hemisphere] === undefined || this.instances[group][hemisphere] === null) {
      return;
    }
    this.instances[group][hemisphere].material.opacity = opacity;
    this.instances[group][hemisphere].material.needsUpdate = true;
  }

  getActiveEdges() {
    console.log("NodeManager does not track rendered edges, only returns raw data about the edges from the model" +
      "associated with the node. Use NodeManager.getEdges to get the edges of specific nodes, or " +
      "NodeManager.getEdgesByIndex to get the edges of a node by index and track them elsewhere, " +
      "or in PreviewArea use getAllSelectedNodesActiveEdges. All of these methods return the same data" +
      "in different formats and packaging, but do not track the rendered objects.");
    return undefined;
  }

  destructor() {
    // clear all objects free memory.
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        this.instances[group][hemisphere].geometry.dispose();
        this.instances[group][hemisphere].material.dispose();
        //remove the instance from the scene.
        this.sceneObject.remove(this.instances[group][hemisphere]);

        this.instances[group][hemisphere] = null;
      }
    }
    //find object in scene that have userData.type = "highlight" and remove them.
    // this.previewArea.scene.children.forEach((child) => {
    //   if (child.userData.type === "highlight") {
    //     this.previewArea.scene.remove(child);
    //   }
    // } );
    //remove all highlights.
    this.removeHighlights();
  }

  resetContext() {
    let _contextualNodes = this.contextualNodes;
    for(let i = 0; i < _contextualNodes.length; i++){
      this.removeContextNodeByIndex(_contextualNodes[i]);
    }
    //just in case you want to do something with the nodes that were removed.
    //like reactivate their context after some other operation.
    return _contextualNodes;
  }

  //iterator for all nodes.
  * [Symbol.iterator]() {
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        if (this.instances[group][hemisphere] === null) {
          continue;
        }
        for (let i = 0; i < this.instances[group][hemisphere].userData.indexList.length; i++) {
          //yield this.instances[group][hemisphere].userData.indexList[i];
          //return [index: this.instances[group][hemisphere].userData.indexList[i], node: this.index2node(this.instances[group][hemisphere].userData.indexList[i])];
          yield this.index2node(this.instances[group][hemisphere].userData.indexList[i]);
        }
      }
    }

  }
}

export default NodeManager;
