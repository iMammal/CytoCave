//webxr controller interface for neurocave previewarea
import * as THREE from 'three'
import {VRButton} from "three/examples/jsm/webxr/VRButton.js";

import XRController from "./XRController";
import {XRHud} from "./XRHud";

class XRInterface {

  constructor(previewArea_) {
    this.previewArea = previewArea_;

    this.assignPreviewData();



    this.initializeControllers();
    this.initializeXRSettings();


    //this.syncCameras().bind(this);


    //renderer, scene, controls, clock, name, NodeManager
    console.log("Creating XRInterface for PV: " + this.name);


    this.enableVR = true;
    this.activateVR = false;


    this.initializeControlCallbacks();


    this.lastControllerLog = Date.now();

    this.addControllersToScene();
    this.initXR();
    this.dolly = null;
    this.initXRDolly();

    this.prevContextCallback = null;
    this.prevContextList = null;

    this.bindMethods();
    //this.spectatorCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    //if you need side effects that are not covered by the class you can register callbacks here
    //this.syncCameras = this.syncCameras.bind(this);
    //this.getTriggerPressures = this.getTriggerPressures.bind(this);
    this._camera = this.previewArea.camera;
    this._controls = this.previewArea.controls;
    this.XRHud = new XRHud(this,previewArea_);
  }

  bindMethods() {
    this.update = this.update.bind(this);
    this.applyXRControls = this.applyXRControls.bind(this);
    this.updateXR = this.updateXR.bind(this);
     this.onSelectEnd = this.onSelectEnd.bind(this);
     this.onSelectStart = this.onSelectStart.bind(this);
      this.onSessionStart = this.onSessionStart.bind(this);
      this.onSessionEnd = this.onSessionEnd.bind(this);
      this.getDolly = this.getDolly.bind(this);
     this.addEventListeners();
//    this.initXRControllers = this.initXRControllers.bind(this);
//    this.handleXRControllers = this.handleXRControllers.bind(this);
//    this.getTriggerPressures.bind(this);
    this.newSelections = new Set();
  }

  getDolly(){
    return this.dolly;
  }

  addEventListeners(){
    this.leftController.controller.addEventListener('selectstart', this.onSelectStart);
    this.leftController.controller.addEventListener('selectend', this.onSelectEnd);
    this.rightController.controller.addEventListener('selectstart', this.onSelectStart);
    this.rightController.controller.addEventListener('selectend', this.onSelectEnd);
    this.previewArea.renderer.xr.addEventListener('sessionstart', this.onSessionStart);
    this.previewArea.renderer.xr.addEventListener('sessionend', this.onSessionEnd);
  }

  onSessionStart(event){
    console.log("Session started");
    //use below to change the select node from the start of the session
    //this.previewArea.NodeManager.contextualNodeActivated = this.dragSelectNode.bind(this);
    //if preview area camera is not at 0,0,0, set it to 0,0,0
    if(this.previewArea.camera.position.x !== 0 || this.previewArea.camera.position.y !== 0 || this.previewArea.camera.position.z !== 0){
      // console.log("Camera position is not 0,0,0, setting to 0,0,0");
      // this.previewArea.camera.position.set(0,0,0);
    }
    this._camera = this.previewArea.camera;
    this._controls = this.previewArea.controls;
  }

  onSessionEnd(event){
    console.log("Session ended");

    //restore prev camera and controls
    console.log("restoring camera and controls");
    this.previewArea.camera = this._camera;
    this.previewArea.controls = this._controls;
  }

  applyXRControls(xrInterface,time,frame) {


    // let viewerPose = frame.getViewerPose();
    // console.log("viewer pose: ", viewerPose);
    // console.log("viewer pose transform: ", viewerPose.transform);
    // let viewerPos = viewerPose.transform.position;
    // let viewerRot = viewerPose.transform.orientation;
    // console.log("viewer position: ", viewerPos);
    // console.log("viewer rotation: ", viewerRot);
    if (this.camera.position.x !== this.dollycam.position.x) {

      console.warn("Camera and dolly are not at the same position");
    }

    // Get translation and rotation from thumbsticks
    let calculatedMovement = this.computeThumbstickMovement();
    let cameraQuat = this.camera.quaternion.clone();
    let translation = calculatedMovement.translation[0].clone().applyQuaternion(cameraQuat);

    // Apply the translation to the dolly
    this.dolly.position.add(translation);

    // Convert Euler angles to Quaternion to avoid gimbal lock
    let rotation = calculatedMovement.rotation[0].clone();
    let quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));

    // Apply the rotation to the dolly
    this.dolly.quaternion.multiply(quaternion);

    // If you need the Euler angles for something else, you can get them from the quaternion
    this.dolly.rotation.setFromQuaternion(this.dolly.quaternion, 'XYZ');
  }
  //
  // applyXRControls = function () {
  //   //move the camera forward directly
  //
  //   //check that camera and dolly are at the same position
  //   if (this.camera.position.x !== this.dollycam.position.x) {
  //     console.warn("Camera and dolly are not at the same position");
  //   }
  //
  //   // still has rotation issues, but is moving in the right direction
  //   // Get translation and rotation from thumbsticks
  //   let calculatedMovement = this.computeThumbstickMovement();
  //   let cameraQuat = this.camera.quaternion.clone();
  //   // When we move the dolly 'forward', we are moving along this vector
  //   let translation = calculatedMovement.translation[0].clone().applyQuaternion(cameraQuat);
  //
  //   // Ensure rotation aligns with the camera's forward vector
  //   // let forwardQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
  //   // let rightQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.camera.rotation.x);
  //   // let upQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.camera.rotation.z);
  //   // forwardQuaternion.multiply(rightQuaternion);
  //   // forwardQuaternion.multiply(upQuaternion);
  //
  //
  //   // Apply the translation and rotation to the dolly
  //   this.dolly.position.add(translation);
  //   let rotation = calculatedMovement.rotation[0].clone().applyQuaternion(cameraQuat);
  //   this.dolly.rotation.x += rotation.x;
  //   this.dolly.rotation.y += rotation.y;
  //   this.dolly.rotation.z += rotation.z;
  //
  //
  //   //
  //   //
  //   // // the below sort of works, but is not rotating around the forward vector of the camera
  //   // // Get translation and rotation from thumbsticks
  //   // let calculatedMovement = this.computeThumbstickMovement();
  //   //
  //   // // when we move the dolly 'forward' we are moving along this vector
  //   // let translation = calculatedMovement.translation[0].clone().applyQuaternion(this.camera.quaternion);
  //   //
  //   // let rotation = calculatedMovement.rotation[0].clone().applyQuaternion(this.camera.quaternion);
  //   // //apply the translation and rotation to the dolly
  //   // this.dolly.position.add(translation);
  //   // this.dolly.rotation.x += rotation.x;
  //   // this.dolly.rotation.y += rotation.y;
  //   // this.dolly.rotation.z += rotation.z;
  //
  // }

  initializeControlCallbacks() {
    this.callbacks = ['leftControllerTriggerSelectStart', 'leftControllerTriggerSelectEnd',
      'rightControllerTriggerSelectStart', 'rightControllerTriggerSelectEnd',
      'leftControllerGripSelectStart', 'leftControllerGripSelectEnd',
      'rightControllerGripSelectStart', 'rightControllerGripSelectEnd',
      'leftThumbstickMovement', 'rightThumbstickMovement',
      'buttonPressStart', 'buttonPressEnd', 'buttonHeld',
      'controllerAdded', 'controllerRemoved'
    ];
    this.callbacks.forEach(callback => this[callback + 'Callback'] = null);
  }

  initializeXRSettings() {
    // this.renderer.xr.enabled = true;
    // this.renderer.xr.setReferenceSpaceType('local');
    // this.renderer.xr.setSession();
    this.XRMaximumSpeed = 15.0; //m/s
    this.XRMaximumRotationSpeed = 2.0; //rad/s
    this.XRspeed = 0.0; //current speed in m/s
    this.XRControlDeadzone = 0.05; //deadzone for thumbstick

  }

  getController(index) {
    return this.renderer.xr.getController(index);
  }

  initializeControllers() {
    this.leftController = new XRController(0, this.renderer);
    this.rightController = new XRController(1, this.renderer);
  }

  assignPreviewData() {
    this.renderer = this.previewArea.renderer;
    this.scene = this.previewArea.scene;
    this.controls = this.previewArea.controls;
    this.clock = this.previewArea.clock;
    this.name = this.previewArea.name;
    //this.NodeManager = this.previewArea.NodeManager;
    //don't bother, doesn't work in callback
  }


  isVRAvailable() {
    return this.renderer.xr.isPresenting && this.renderer.xr.enabled;
  }

  initXR() {
    console.log("Init XR for PV: " + this.name);
    this.renderer.xr.enabled = true;
    document.getElementById('vrButton' + this.name).appendChild(VRButton.createButton(this.renderer));


  }

  addControllersToScene() {
    // this.scene.add(this.leftController.controller);
    // this.scene.add(this.rightController.controller);
    // this.scene.add(this.leftController.controllerGrip);
    // this.scene.add(this.rightController.controllerGrip);
    //attach pointers to controllers
    let pointerLength = 2; //meters
    const pointerLeft = this.drawPointer(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -pointerLength));
    const pointerRight = this.drawPointer(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -pointerLength));
    this.leftController.controller.add(pointerLeft);
    this.rightController.controller.add(pointerRight);
  }

  initXRDolly() {
    //attach the camera to the dolly
    this.dolly = new THREE.Group();
    this.dollycam = this.renderer.xr.getCamera();
    //set the camera's parent to the dolly
    //add the controllers to the dolly
    this.dolly.add(this.leftController.controller);
    this.dolly.add(this.rightController.controller);
    this.dolly.add(this.leftController.controllerGrip);
    this.dolly.add(this.rightController.controllerGrip);
    let cMatrix = this.dollycam.matrixWorld;
    let cameraPosition = new THREE.Vector3();
    cameraPosition.setFromMatrixPosition(cMatrix);
    let cameraPos = cameraPosition;
    let cameraRotation = new THREE.Euler();
    cameraRotation.setFromRotationMatrix(cMatrix);
    let cameraRot = cameraRotation;

    // set the dollies position to the camera's position
    this.dolly.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    this.dolly.rotation.set(cameraRot.x, cameraRot.y, cameraRot.z);
    //add the camera to the dolly
    this.dolly.add(this.dollycam);
    //move the camera to the center of the dolly

    this.scene.add(this.dolly);
  }


  updateXR(xrInterface,time,frame) {
    // console.log("frame update xr func");
    // console.log(frame);
    //console.log("Updating XR for PV: " + this.name);
    if (xrInterface.leftController && xrInterface.rightController) {
      this.controls.enabled = true;
      // if (this.previewArea.camera !== this.renderer.xr.getCamera()) {
      //   this.previewArea.camera = this.renderer.xr.getCamera();
      //   console.log("camera changed to vr camera");
      // }

      this.camera = this.renderer.xr.getCamera();


      if (this.camera !== this.previewArea.camera) {
        console.warn("Camera changed to xr camera");
        //move this.dolly to the new camera position
        this.dolly.position.set(this._camera.position.x, this._camera.position.y, this._camera.position.z);
        this.dolly.rotation.set(this._camera.rotation.x, this._camera.rotation.y, this._camera.rotation.z);
        //change camera to xr camera
        this.previewArea.camera = this.camera;
      }

      //console.log(frame);
      this.applyXRControls(xrInterface,time,frame);
      this.checkForSelecting();
      this.XRHud.update(time,frame);


    } else {

      if (Date.now() - this.lastControllerLog > 60000) {
        console.log("one or both controllers not found");
        console.log(this.leftController);
        console.log(this.rightController);
        this.lastControllerLog = Date.now();
      }
    }
  }

  onSelectStart(event) {
    console.log("Select start, xrinterface");
    //needed if you want to do something when the user presses the trigger, update loop does actual select logic while trigger is held
    event.target.userData.selectStarted = true;
  }

  onSelectEnd(event) {
    console.log("Select end, xrinterface");
    //needed if you want to do something when the user releases the trigger
    event.target.userData.selectEnded = true;
  }

  checkForSelecting() {
  if(this.leftController.getUserData().connected === false || this.rightController.getUserData().connected === false){
    return;
  }

    this.previewArea.NodeManager.contextualNodeActivated = this.dragSelectNode.bind(this);
    if (this.leftController.getUserData().isSelecting) {
      //store previous context callback
      console.log("Left controller is selecting");
      let target = this.getPointedObject(this.leftController.controller);
      if (target) {
        //add target index to new selections
        this.newSelections.add(this.previewArea.NodeManager.node2index(target));
        this.previewArea.NodeManager.addContextNodeByIndex(this.previewArea.NodeManager.node2index(target));
      }
    }
    if (this.rightController.getUserData().isSelecting) {
      console.log("Right controller is selecting");
      let target = this.getPointedObject(this.rightController.controller);
      if (target) {
        //add target node to context in node manager
        this.newSelections.add(this.previewArea.NodeManager.node2index(target));
        this.previewArea.NodeManager.addContextNodeByIndex(this.previewArea.NodeManager.node2index(target));
      }
    }

    if(this.leftController.getUserData().selectStarted){
      this.prevContextCallback = this.previewArea.NodeManager.contextualNodeActivated;
      this.prevContextList = this.previewArea.NodeManager.contextualNodes;
      this.leftController.getUserData().selectStarted = false;
      this.newSelections.clear();
    }
    if(this.leftController.getUserData().selectEnded){
      this.leftController.getUserData().selectEnded = false;
      //select all nodes in context
      for (let index of this.newSelections) {
        this.previewArea.NodeManager.removeHighlightByIndex(index);
        this.previewArea.NodeManager.toggleSelect(index);
      }
      //restore previous context callback
      this.previewArea.NodeManager.contextualNodeActivated = this.prevContextCallback;
      //restore previous context list
      for(let index of this.prevContextList){
        this.previewArea.NodeManager.addContextNodeByIndex(index);
      }
    }

    if(this.rightController.getUserData().selectStarted){
      this.prevContextCallback = this.previewArea.NodeManager.contextualNodeActivated;
      this.prevContextList = this.previewArea.NodeManager.contextualNodes;
      this.rightController.getUserData().selectStarted = false;
      this.newSelections.clear();
    }
    if(this.rightController.getUserData().selectEnded){
      this.rightController.getUserData().selectEnded = false;
      //toggle select on all new selections
      for (let index of this.newSelections) {
        this.previewArea.NodeManager.removeHighlightByIndex(index);
        this.previewArea.NodeManager.toggleSelect(index);
      }
      //restore previous context callback
      this.previewArea.NodeManager.contextualNodeActivated = this.prevContextCallback;
      //restore previous context list
      for(let index of this.prevContextList){
        this.previewArea.NodeManager.addContextNodeByIndex(index);
      }

    }





  }

  //highlightnode
  dragSelectNode(target) {
    //dragging highlights nodes as it passes over them
    this.previewArea.NodeManager.highlightNode(target, 0x800080);
  }

  gamepadsAvailable() {
    if (this.leftController.getUserData().connected === false || this.rightController.getUserData().connected === false) {
      return false;
    } else {
      return true;
    }
  }

  computeThumbstickMovement() {
    let delta = this.clock.getDelta();

    if (!this.gamepadsAvailable()) {
      return {translation: [new THREE.Vector3(0, 0, 0), 0], rotation: [new THREE.Vector3(0, 0, 0), 0]};
    }
    let leftgamepad = this.leftController.gamepad;
    let rightgamepad = this.rightController.gamepad;
    let translation = new THREE.Vector3(0, 0, 0);
    let rotation = new THREE.Vector3(0, 0, 0);
    let translationDistance = 0;
    let rotDistance = 0;
    let leftThumbstickPress = leftgamepad.buttons[3].pressed;
    let rightThumbstickPress = rightgamepad.buttons[3].pressed;

    //find final translation and rotation based on thumbstick movement and delta time

    let sprintFactor = 1.0;
    if (leftThumbstickPress) {
        sprintFactor = 1.0 + delta * 2.0;
    }

    //use axes 3 for forward and backward movement, -1 is forward, 1 is backward
    if (leftgamepad.axes[3] > this.XRControlDeadzone || leftgamepad.axes[3] < -this.XRControlDeadzone) {
      translation.z = leftgamepad.axes[3] * this.XRMaximumSpeed * delta * sprintFactor;
    }
    // //use axes 2 for strafing left and right, -1 is left, 1 is right
    // if (leftgamepad.axes[2] > this.XRControlDeadzone || leftgamepad.axes[2] < -this.XRControlDeadzone) {
    //   translation.x = leftgamepad.axes[2] * this.XRMaximumSpeed * delta;
    //   translationDistance = translation.x;
    // }
    // // use axes 2 to turn left and right, 1 is left, 0 is right
    if (leftgamepad.axes[2] > this.XRControlDeadzone || leftgamepad.axes[2] < -this.XRControlDeadzone) {
      rotation.y = -leftgamepad.axes[2] * this.XRMaximumRotationSpeed * delta;
      rotDistance = rotation.y;
    }

    //right thumbstick for pitch and roll
    //use axes 3 for pitch, 1 is up, -1 is down
    if (rightgamepad.axes[3] > this.XRControlDeadzone || rightgamepad.axes[3] < -this.XRControlDeadzone) {
      rotation.x = rightgamepad.axes[3] * this.XRMaximumRotationSpeed * delta;
      rotDistance = rotation.x;
    }
    //use axes 2 for roll, 1 is right, -1 is left
    if (rightgamepad.axes[2] > this.XRControlDeadzone || rightgamepad.axes[2] < -this.XRControlDeadzone) {
      rotation.z = rightgamepad.axes[2] * this.XRMaximumRotationSpeed * delta;
      rotDistance = rotation.z;
    }

    // translation.normalize();
    // rotation.normalize();

    return {translation: [translation, Math.abs(translationDistance)], rotation: [rotation, Math.abs(rotDistance)]};
  }


  getPointedObject = (controller) => {
    let raycaster = new THREE.Raycaster();
    //get world position of controller
    let cMatrix = controller.matrixWorld;
    let controllerPosition = new THREE.Vector3();
    controllerPosition.setFromMatrixPosition(cMatrix);
    //get world rotation of controller
    let controllerRotation = new THREE.Euler();
    controllerRotation.setFromRotationMatrix(cMatrix);
    //get direction of controller
    let controllerDirection = new THREE.Vector3(0, 0, -1);
    controllerDirection.applyEuler(controllerRotation);
    //set raycaster origin to controller position
    raycaster.set(controllerPosition, controllerDirection);
    //get intersected objects
    //let objectsIntersected = raycaster.intersectObjects(this.scene.children);
    let nodes = this.scene.children.filter(o => o.name === 'NodeManager');
    let objectsIntersected = [];
    if (nodes.length > 0) {
      for(let i = 0; i < nodes.length; i++) {
        let intersects = raycaster.intersectObjects(nodes[i].children);
        objectsIntersected = objectsIntersected.concat(intersects);
      }
      return (objectsIntersected.find(o => o.object.name.type === 'region'));
    } else {
      return null;
    }
  }

  drawPointer(v3Origin, v3UnitUp) {
    const material = new THREE.LineBasicMaterial();
    const geometry = new THREE.BufferGeometry().setFromPoints([v3Origin, v3UnitUp]);
    return new THREE.Line(geometry, material);
  }

  update(xrInterface,time,frame) {
    //console.log("xr update");
    // if presenting, update XR
    if (this.isVRAvailable()) {
      this.updateXR(xrInterface,time,frame);
    } else {
      //console.log("XR not available");
    }

  }

}

export {XRInterface};
