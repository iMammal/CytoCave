//javascript class to render the node structures.
//goals are to accelerate rendering using instancing and to allow for easy customization of the node rendering.
// Class also handles the node selection and highlighting providing a simple interface to the user.
// rendering interface provided by three.js

import * as THREE from 'three';

import {getNormalGeometry, getNormalMaterial} from "./graphicsUtils";

class NodeManager {
  constructor(_previewArea) {
    this.model = _previewArea.getModel();
    this.sceneObject = _previewArea.getSceneObject();
    this.previewArea = _previewArea;
    this.groups = this.previewArea.listGroups();
    this.groupCount = this.groups.length;
    this.instances = {};
    this.selectedNodes = [];
    this.focusedNodes = [];
    this.selectedNodesCount = 0;
    this.selectedNodesChanged = false;
    this.nodesSelectedGeneralCallback = null;
    this.nodeSelectedCallback = null;
    this.onNodeUnselectCallback = null;
    this.defaultScale = 1.0;
    this.rootNode = null;
    this.numberSelected = 0;
    this.CreateInstanceMeshes();
    this.PositionAndColorNodes();
    this.addInstancesToScene();

    this.highLight = null;


    this.rootNodeChanged = false;
    this.rootNodeChangedCallback = null;
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
    }
  }

  CreateInstanceMeshes() {
    //create instance mesh for each group
    let LeftNormalGeometry = getNormalGeometry("left");
    let RightNormalGeometry = getNormalGeometry("right");
    //each group has it's own material that is used for all instances of that group.
    // these can be retrieved with previewArea.getNormalMaterial(this.model, group)

    for (let i = 0; i < this.groupCount; i++) {
      let leftCount = this.previewArea.countGroupMembers(this.groups[i], "left");
      let rightCount = this.previewArea.countGroupMembers(this.groups[i], "right");
      let material = getNormalMaterial(this.model, this.groups[i]);
      this.instances[this.groups[i]] = {
        left: null,
        right: null,
      };
      if (leftCount > 0) {
        this.instances[this.groups[i]].left = new THREE.InstancedMesh(LeftNormalGeometry, material, leftCount);
        this.instances[this.groups[i]].left.name = {
          group: this.groups[i],
          hemisphere: 'left',
          type: 'region'
        }
        this.instances[this.groups[i]].left.setColorAt(0, material.color);
      }

      if (rightCount > 0) {
        this.instances[this.groups[i]].right = new THREE.InstancedMesh(RightNormalGeometry, material, rightCount);
        this.instances[this.groups[i]].right.name = {
          group: this.groups[i],
          hemisphere: 'right',
          type: 'region'
        }
        this.instances[this.groups[i]].right.setColorAt(0, material.color);
      }

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
      console.log("index2node  Index: " + index);
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
    let index = node.object.userData.indexList[instanceId];
    if (index === undefined) {
      console.log("node2index  InstanceID: " + instanceId + " index: " + index);
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
    let scale = this.defaultScale;
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
      this.highlightNode(node);
    }
  }

  highlightNode(node) {
    if (this.highLight !== null) {
      return;
    }
    //console.log("Highlighting");
    // Create a wireframe sphere slightly larger than the node.
    const radius = 1.1;
    const segments = 32;
    const baseGeometry = getNormalGeometry(node.object.name.hemisphere)
    const wireframe = new THREE.WireframeGeometry(
      baseGeometry
    );

    // Create a wireframe material with a low opacity.
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      linewidth: 4
    });

    //figure out the size of the node so we can scale the highlight to match.
    let matrix = new THREE.Matrix4();
    node.object.getMatrixAt(node.instanceId, matrix);
    let scale = matrix.getMaxScaleOnAxis();


    // Create a wireframe mesh and set its position.
    this.highLight = new THREE.LineSegments(wireframe, material);
    if (this.highLight === null || this.highLight === undefined) {
      throw new Error("highLight is null or undefined");
    }
    const position = this.getNodePosition(node);
    this.highLight.position.set(position.x, position.y, position.z);
    this.highLight.scale.set(scale * 1.01, scale * 1.01, scale * 1.01);
    this.highLight.visible = true;
    this.sceneObject.add(this.highLight);
    // console.log("Highlight Position:", this.highLight.position);
    // console.log("Highlight Scale:", this.highLight.scale);
    // Set a timeout to remove the highlight.
    setTimeout(() => {
      // Dispose of the highlight geometry and material.
      this.highLight.geometry.dispose();
      this.highLight.material.dispose();
      // Remove the highlight from the scene.
      this.sceneObject.remove(this.highLight);
      this.highLight = null;
    }, 1000);
  }

  highlightNodeByIndex(index) {
    let node = this.index2node(index);
    this.highlightNode(node);
  }

  isSelected(node) {
    //check if the node is selected.
    //this is true if the node is in the userData.selectedNodes of the instance.
    let index = this.node2index(node);
    //return this.instances[node.object.name.group][node.object.name.hemisphere].userData.selectedNodes.includes(index);
    return this.selectedNodes.includes(index);
  }

  selectNode(node) {
    //given a node from the raycaster, select the node and add it to the userData.selectedNodes of the instance.
    //if the node is already selected, do nothing.

    if (!this.isSelected(node)) {

      let index = this.node2index(node);
      //throw an error if index is null undefined or in any other way not a number.
      if (index === null || index === undefined || isNaN(index)) {
        console.log("Error");
        console.log(node);
        throw new Error("index not found in dataset");
      }
      if (this.selectedNodesCount === 0) {
        this.rootNode = index;
        this.rootNodeChanged = true;
      }
      this.instances[node.object.name.group][node.object.name.hemisphere].userData.selectedNodes.push(index);
      this.selectedNodes.push(index);
      this.selectedNodesChanged = true;
      this.selectedNodesCount++;
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
    // don't do this, but if you do, it puts everything in the userData.indexList into the userData.selectedNodes.
    // this is not a good idea.
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        let instance = this.instances[group][hemisphere];
        instance.userData.selectedNodes = instance.userData.indexList;
      }
    }
    this.selectedNodes = this.getSelectedNodes();
    this.selectedNodesCount = this.selectedNodes.length;
  }

  deselectAll() {
    //this is ok.
    for (let group in this.instances) {
      for (let hemisphere in this.instances[group]) {
        let instance = this.instances[group][hemisphere];
        instance.userData.selectedNodes = [];
      }
    }
    this.selectedNodes = this.getSelectedNodes();
    this.selectedNodesCount = this.selectedNodes.length; // should be 0
  }

  toggleSelectAll() {
    //don't do this either.
    for (let group in this.instances) {
      //for each instance, get the userData.indexList and userData.selectedNodes.
      let inversion = [];
      let instance = this.instances[group];
      let indexList = instance.userData.indexList;
      let selectedNodes = instance.userData.selectedNodes;
      //for each index in the indexList, call toggleSelect.
      for (let i = 0; i < indexList.length; i++) {
        this.toggleSelect(indexList[i]);
      }
    }
  }

  getEdges = (node, threshold = 0, topN = null, distance = 0) => {
    //get the edges of the node at the instanceId.
    // console.log("Getting Edges");
    // //settings
    // console.log("Threshold: " + threshold);
    // console.log("TopN: " + topN);
    // console.log("Distance: " + distance);

    let index = this.node2index(node);
    let matrixRow = this.model.getConnectionMatrixRow(index);
    let edges = [];

    //
    // for (let i = 0; i < matrixRow.length; i++) {
    //     if (matrixRow[i] > threshold) {
    //         edges.push({
    //             sourceNodeId: index,
    //             targetNodeId: i,
    //             weight: matrixRow[i],
    //             position: this.getNodePosition(this.index2node(i))
    //         });
    //     }
    // }
    console.log("Starting with " + matrixRow.size() + " edges.");
    matrixRow.forEach((weight, i) => {
      if (weight > threshold) {

        edges.push({
          sourceNodeId: index,
          targetNodeId: i[0],
          weight: weight,
          position: this.getNodePosition(this.index2node(i[0]))
        });
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
        let targetPosition = this.getNodePosition(this.index2node(edge.targetNodeId));
        let distance2target = sourcePosition.distanceTo(targetPosition);
        return distance2target <= distance;
      });
    }

    edges.sort((a, b) => {
      // sort by distance closest to farthest
      let sourcePosition = this.getNodePosition(node);
      let aPosition = this.getNodePosition(this.index2node(a.targetNodeId));
      let bPosition = this.getNodePosition(this.index2node(b.targetNodeId));
      let aDistance = sourcePosition.distanceTo(aPosition);
      let bDistance = sourcePosition.distanceTo(bPosition);
      return aDistance - bDistance;
    });

    if (topN !== null && topN > 0) {
      console.log("TopN filter set topN to null or 0 to disable.");
      edges = edges.slice(0, topN);
    }
    // console.log("Returning " + edges.length + " edges.");
    // console.log(edges);
    return edges;

  }

  //todo add options for threshold, topN, and distance.
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


  }


}

export default NodeManager;
