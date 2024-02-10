/*
 hud for xr view, build hud around camera from inherited preViewArea class
 *
 */
import * as THREE from 'three';
import canvasGraph from './canvasGraph.js';
import XRController from './XRController.js';
class XRHud {
  constructor(xrInterface_,preViewArea_) {
    this.xrInterface = xrInterface_;
    this.previewArea = preViewArea_;
    this.camera = preViewArea_.camera;
    this.scene = preViewArea_.scene;
    this.renderer = preViewArea_.renderer;

    this.init();
    this.debug = false;

    this.flatCanvas = document.createElement('canvas');
    this.flatCanvas.width = 200;
    this.flatCanvas.height = 100;
    //create a 2d context
    this.flatContext = this.flatCanvas.getContext('2d');
    //set the background color
    // this.flatContext.fillStyle = 'black';
    // this.flatContext.fillRect(0, 0, this.flatCanvas.width, this.flatCanvas.height);
    //for transparent background
    this.flatContext.clearRect(0, 0, this.flatCanvas.width, this.flatCanvas.height);

    //set the font color
    this.flatContext.fillStyle = 'white';
    //set the font size and font family
    this.flatContext.font = '12px Arial';
    //draw the text
    this.flatContext.fillText('Hello, world!', 10, 10);
    //create a texture from the canvas
    this.flatTexture = new THREE.CanvasTexture(this.flatCanvas);
    //create a material from the texture
    this.flatMaterial = new THREE.MeshBasicMaterial({
      map: this.flatTexture,
      transparent: true
    });
    //create a plane geometry
    this.flatGeometry = new THREE.PlaneGeometry(2, 1);
    //create a mesh from the material and geometry
    this.flatMesh = new THREE.Mesh(this.flatGeometry, this.flatMaterial);
    //scale the mesh to 1/10th of a meter
    this.flatMesh.scale.set(0.1, 0.1, 0.1);
    // graph some data
    //generate some fake data
    let fakeData = [];
    for (let i = 0; i < 25; i++) {
      fakeData.push(Math.random());
    }
    let options = {
      width: 200,
      height: 100,
      color: 'white',
      strokeStyle: 'white', // color of the line
      lineWidth: 2,
      lineJoin: 'round',
      lineCap: 'round',
      padding: 10,
      grid: {
        color: 'rgba(255, 255, 255, 0.5)',
        width: 1,
        height: 1
      }
    }
    let graph = new canvasGraph(this.flatCanvas, fakeData, options); // canvas, data, options
    // add the mesh to the hud
    this.hud.add(this.flatMesh);
    //position the mesh in the top left corner of the hud
    this.flatMesh.position.set(-0.35, 0.4, 0);
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
      console.log("xrh controller position: ", controller);
      //console.log("camera position: ", this.camera.position);  // get position of camera from world matrix
      console.log("xrh camera position: ", this.camera.position);
      //get camera quaternion
      console.log("xrh camera quaternion: ", this.camera.quaternion);

      console.log("xrh xrdolly position: ", this.xrInterface.getDolly());
    }
    // create a hud object
    this.floorboard = new THREE.Object3D();

    this.floorboard.position.set(0, 0, 0);
    //set the hud to the right controller
    const cube = this.createWireframeCube();
    this.floorboard.add(cube);
    //controller.add(this.hud);
    this.xrInterface.getDolly().add(this.floorboard);

    // create a hud object
    this.hud = new THREE.Object3D();
    this.createHudObjects(this.hud);
    this.floorboard.add(this.hud);


  }

  createWireframeCube() {
    // create a wireframe cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.name = "floorboard";
    return cube;

  }

  createHudObjects(hud) {

   let boarder = new THREE.Object3D();
    this.hudOutline(boarder);
    hud.add(boarder);

  }



  hudOutline(hud) {
    const line1 = new THREE.Line( new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( -0.5, 0.5, 0 ), new THREE.Vector3( 0.5, 0.5, 0 ) ] ), new THREE.LineBasicMaterial( { color: 0x00ff00 } ) );
    const line2 = new THREE.Line( new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0.5, 0.5, 0 ), new THREE.Vector3( 0.5, -0.5, 0 ) ] ), new THREE.LineBasicMaterial( { color: 0x00ff00 } ) );
    const line3 = new THREE.Line( new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0.5, -0.5, 0 ), new THREE.Vector3( -0.5, -0.5, 0 ) ] ), new THREE.LineBasicMaterial( { color: 0x00ff00 } ) );
    const line4 = new THREE.Line( new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( -0.5, -0.5, 0 ), new THREE.Vector3( -0.5, 0.5, 0 ) ] ), new THREE.LineBasicMaterial( { color: 0x00ff00 } ) );
    //name the lines
    line1.name = "upperBorder";
    line2.name = "rightBorder";
    line3.name = "lowerBorder";
    line4.name = "leftBorder";
    hud.add(line1);
    hud.add(line2);
    hud.add(line3);
    hud.add(line4);
  }

  gethudCornerPoints(hud) {
    let corners = [];
    let children = hud.children;
    for(let i = 0; i < children.length; i++){
      let child = children[i];
      if(child.name === "upperBorder"){
        corners.push(child.geometry.attributes.position.array[0]);
        corners.push(child.geometry.attributes.position.array[1]);
      }
      if(child.name === "rightBorder"){
        corners.push(child.geometry.attributes.position.array[3]);
        corners.push(child.geometry.attributes.position.array[4]);
      }
      if(child.name === "lowerBorder"){
        corners.push(child.geometry.attributes.position.array[3]);
        corners.push(child.geometry.attributes.position.array[4]);
      }
      if(child.name === "leftBorder"){
        corners.push(child.geometry.attributes.position.array[0]);
        corners.push(child.geometry.attributes.position.array[1]);
      }
    }
    //remove duplicates
    corners = Array.from(new Set(corners));
    //should be 4 corners
    if(corners.length !== 4){
      console.log("Error: hud corners not found");
      return;
    }
    return corners;
  }

  update(time,frame) {
    // update hud position to the right controller
    this.floorboard.position.set(0, 0, 0);
    let controller = this.previewArea.renderer.xr.getController(1);

    this.viewerPose = frame.getViewerPose(this.previewArea.renderer.xr.getReferenceSpace())
    this.rightEye = this.viewerPose.views[1];

    let position = this.rightEye.transform.position;
    let rotation = this.rightEye.transform.orientation;
    let hud = this.hud;
    //rotate the hud to face the camera
    hud.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    //position the hud at the camera
    hud.position.set(position.x, position.y, position.z);
    // move the hud back 1 meter relative to it's rotation
    hud.translateZ(-1);



    if(this.debug === true){
      console.log("XRHud update");
      //log controller position, camera position and rotation, xrdolly position and rotation
      console.log("controller position: ", controller);
      //console.log("camera position: ", this.camera.position);  // get position of camera from world matrix
      console.log("camera position: ", this.camera.position);
      //get camera quaternion
      console.log("camera quaternion: ", this.camera.quaternion);
      console.log("xrdolly position: ", this.xrInterface.getDolly());
      console.log("viewerPose: ", this.viewerPose);
      console.log(this.viewerPose);
    }
  }


}

export { XRHud };
