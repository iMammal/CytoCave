import * as THREE from 'three';
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
class XRController {
  constructor(index, renderer) {
    this.controller = renderer.xr.getController(index);

    this.controllerGrip = renderer.xr.getControllerGrip(index);
    this.bindMethods();
    this.initControllerEventListeners();
    this.initControllerUserData();
    this.initControllersModel(new XRControllerModelFactory());
  }

  bindMethods() {
    this.onSelectStart = this.onSelectStart.bind(this);
    this.onSelectEnd = this.onSelectEnd.bind(this);
    this.onControllerConnected = this.onControllerConnected.bind(this);
    this.onControllerDisconnected = this.onControllerDisconnected.bind(this);
  }

  initControllerEventListeners() {
    this.controller.addEventListener('selectstart', this.onSelectStart);
    this.controller.addEventListener('selectend', this.onSelectEnd);
    this.controller.addEventListener('connected', this.onControllerConnected);
    this.controller.addEventListener('disconnected', this.onControllerDisconnected);
  }

  initControllersModel(ControllerModelFactory) {
    this.controllerGrip.add(ControllerModelFactory.createControllerModel(this.controllerGrip));
  }

  initControllerUserData() {
    this.controller.userData = {
      isSelecting: false,
      connected: false
    };
  }

  getUserData() {
    return this.controller.userData;
  }

  onSelectStart(event) {
    console.log("Select start");
    event.target.userData.isSelecting = true;
  }

  onSelectEnd(event) {
    console.log("Select end");
    if (event.target.userData.isSelecting) {
      event.target.userData.isSelecting = false;
    }
  }

  onControllerConnected(event) {
    console.log("Controller connected");
    if(event.data.gamepad){
      console.log(event);
      console.log("adding gamepad");
      this.gamepad = event.data.gamepad;
      this.controller.userData.connected = true;
    }

  }

  onControllerDisconnected(event){
    console.log("Controller disconnected");
    this.gamepad = null;
    this.controller.userData.connected = false;
  }



}

export default XRController;
