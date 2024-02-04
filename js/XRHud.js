/*
 hud for xr view, build hud around camera from inherited preViewArea class
 *
 */
import * as THREE from 'three';
import XRController from './XRController.js';
class XRHud {
  constructor(xrInterface_,preViewArea_) {
    this.xrInterface = xrInterface_;
    this.previewArea = preViewArea_;
    this.camera = preViewArea_.camera;
    this.scene = preViewArea_.scene;
    this.renderer = preViewArea_.renderer;
    this.init();
    this.debug = true;
  }

  init() {
  //create a wireframe cube at the center of the view
    // cube should have front side edges slightly less
    // in width then the camera view at 1 meter
    let controller = this.previewArea.renderer.xr.getController(1);
    let camera = this.previewArea.renderer.xr.getCamera(0);
    if(this.debug === true){
      console.log("XRHud init");
      //log controller position, camera position and rotation, xrdolly position and rotation
      console.log("controller position: ", controller);
      //console.log("camera position: ", this.camera.position);  // get position of camera from world matrix
      console.log("camera position: ", this.camera.position);
      //get camera quaternion
      console.log("camera quaternion: ", this.camera.quaternion);

      console.log("xrdolly position: ", this.xrInterface.getDolly());
    }
    // create a hud object
    this.hud = new THREE.Object3D();
    this.hud.name = "hud";
    this.hud.position.set(0, 0, 0);
    //set the hud to the right controller
    const cube = this.createWireframeCube();
    this.hud.add(cube);
    //controller.add(this.hud);
    this.xrInterface.getDolly().add(this.hud);




  }

  createWireframeCube() {
    // create a wireframe cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true
    });
    const cube = new THREE.Mesh(geometry, material);
    return cube;

  }

  update() {
    // update hud position to the right controller
    this.hud.position.set(0, 0, 0);
    let controller = this.previewArea.renderer.xr.getController(1);
    if(this.debug === true){
      console.log("XRHud init");
      //log controller position, camera position and rotation, xrdolly position and rotation
      console.log("controller position: ", controller);
      //console.log("camera position: ", this.camera.position);  // get position of camera from world matrix
      console.log("camera position: ", this.camera.position);
      //get camera quaternion
      console.log("camera quaternion: ", this.camera.quaternion);

      console.log("xrdolly position: ", this.xrInterface.getDolly());
    }
  }


}

export { XRHud };
