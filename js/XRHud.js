/*
 hud for xr view, build hud around camera from inherited preViewArea class
 *
 */
import * as THREE from 'three';
//import LineGraphs from './LineGraphs.js';
import canvasGraph from './canvasGraph.js';


class XRHud {
  constructor(xrInterface_, preViewArea_) {
    this.xrInterface = xrInterface_;
    this.previewArea = preViewArea_;
    this.camera = preViewArea_.camera;
    this.scene = preViewArea_.scene;
    this.renderer = preViewArea_.renderer;

    this.lineplotData = [];
    this.graphObjects = [];
    this.renderTextures = [];
    this.init();
    this.debug = false;
    this.initGraphs();
    //this.linegraphs = new LineGraphs(preViewArea_);

  }

  init() {
    //create a wireframe cube at the center of the view
    // cube should have front side edges slightly less
    // in width then the camera view at 1 meter
    let controller = this.previewArea.renderer.xr.getController(1);
    //let camera = this.previewArea.renderer.xr.getCamera(0);
    if (this.debug === true) {
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

  initGraphs() {
    //if there are already graph objects, remove them
    if (this.graphObjects.length > 0) {
       for (let i = 0; i < this.graphObjects.length; i++) {
      //   //dispose of the texture and material currently on the graph object
      //   this.graphObjects[i].material.map.dispose();
      //   this.graphObjects[i].material.dispose();
      //
         this.hud.remove(this.graphObjects[i]);
       }
       //remove this.renderTextures from memory
      this.renderTextures = [];
      this.graphObjects = [];
    }
    const maxGraphs = 8;
    let dataSetCount = this.previewArea.model.nodeDetailData.length;
    console.log("dataSetCount: ", dataSetCount);
    //check for existing lineplot canvas and reuse if available


    this.graphOptions = {
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
      },
      transparent: true
    };



    //iterate backwards through the data sets using up to maxGraphs
    for (let i = dataSetCount - 1; i >= 0 && maxGraphs-i > 0; i--) {
      let renderCanvas = document.getElementById('lineplot' + i);
      if (renderCanvas === null) {
        renderCanvas = document.createElement('canvas');
        renderCanvas.id = 'lineplot' + i;
      }
      //let renderCanvas = document.createElement('canvas', {id: 'lineplot'});
      renderCanvas.width = 200;
      renderCanvas.height = 100;
      let renderContext = renderCanvas.getContext('2d');
      //clear the canvas
      renderContext.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
      //set the font color
      renderContext.fillStyle = 'white';
      //set the font size and font family
      renderContext.font = '12px Arial';
      console.log("nodeDetailData: ", this.previewArea.model.nodeDetailData[i])
      let linedata = [];
      linedata = [];
      // for (let j = 0; j < this.previewArea.model.nodeDetailData[i].length; j++) {
      //   console.log("number of data points: ", this.previewArea.model.nodeDetailData[i].length);
      //   linedata.push(this.previewArea.model.nodeDetailData[i][j][1]);
      // }
      //briefer method to create a lineplot?
      linedata = this.previewArea.model.nodeDetailData[i].data.map((d) => d[1]);
      linedata = linedata.filter((d) => !isNaN(d));
      let graph = new canvasGraph(renderCanvas, linedata, this.graphOptions);
      //add index as line of text at bottom of canvas
      renderContext.fillText(this.previewArea.model.nodeDetailData[i].index, 10, 90);
      //create a texture from the canvas
      this.renderTextures.push(new THREE.CanvasTexture(renderCanvas));
      //create a material from the texture
      let renderMaterial = new THREE.MeshBasicMaterial({
        map: this.renderTextures[this.renderTextures.length - 1],
        transparent: true
      });
      //create a plane geometry
      let renderGeometry = new THREE.PlaneGeometry(2, 1);
      //create a mesh from the material and geometry
      let renderMesh = new THREE.Mesh(renderGeometry, renderMaterial);
      //scale the mesh to 1/10th of a meter
      renderMesh.scale.set(0.1, 0.1, 0.1);
      //track the mesh in the graphObjects array
      this.graphObjects.push(renderMesh);
      // add the mesh to the hud
      this.hud.add(renderMesh);
      //position the first graph in the top left corner of the hud
      //position subsequent graphs below the previous graph
      renderMesh.position.set(-0.35, 0.4 - (0.12 * i), 0);
    }
    //clean up the nodeDetailData array, remove the oldest data sets if there are more than maxGraphs
    if (this.previewArea.model.nodeDetailData.length > maxGraphs) {
      this.previewArea.model.nodeDetailData.splice(0, this.previewArea.model.nodeDetailData.length - maxGraphs);
      //todo: meh, this is a bit of a hack, should be a method in the model
      console.log('pruning nodeDetailData');
    }

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
    const line1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, 0.5, 0), new THREE.Vector3(0.5, 0.5, 0)]), new THREE.LineBasicMaterial({color: 0x00ff00}));
    const line2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.5, 0.5, 0), new THREE.Vector3(0.5, -0.5, 0)]), new THREE.LineBasicMaterial({color: 0x00ff00}));
    const line3 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.5, -0.5, 0), new THREE.Vector3(-0.5, -0.5, 0)]), new THREE.LineBasicMaterial({color: 0x00ff00}));
    const line4 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.5, -0.5, 0), new THREE.Vector3(-0.5, 0.5, 0)]), new THREE.LineBasicMaterial({color: 0x00ff00}));
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
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (child.name === "upperBorder") {
        corners.push(child.geometry.attributes.position.array[0]);
        corners.push(child.geometry.attributes.position.array[1]);
      }
      if (child.name === "rightBorder") {
        corners.push(child.geometry.attributes.position.array[3]);
        corners.push(child.geometry.attributes.position.array[4]);
      }
      if (child.name === "lowerBorder") {
        corners.push(child.geometry.attributes.position.array[3]);
        corners.push(child.geometry.attributes.position.array[4]);
      }
      if (child.name === "leftBorder") {
        corners.push(child.geometry.attributes.position.array[0]);
        corners.push(child.geometry.attributes.position.array[1]);
      }
    }
    //remove duplicates
    corners = Array.from(new Set(corners));
    //should be 4 corners
    if (corners.length !== 4) {
      console.log("Error: hud corners not found");
      return;
    }
    return corners;
  }

  update(time, frame) {
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
    //this.linegraphs.updateLinegraph();
    this.updateLinegraph();


    if (this.debug === true) {
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


  updateLinegraph() {
    //update the textures on the graph objects
    if(this.previewArea.model.nodeDetailData.length === 0){
      return;
    }

    //if the number of graph objects is not equal to the number of nodeDetailData,
    //clear the graphObjects array and reinitialize the graphs using the available nodeDetailData
    if (this.previewArea.model.nodeDetailData.length !== this.graphObjects.length) {
      // for (let i = 0; i < this.graphObjects.length; i++) {
      //   this.hud.remove(this.graphObjects[i]);
      // }
      // this.graphObjects = [];
      this.initGraphs();
    } else {
      //do something else like animate the graph
    }

  }
}

export {XRHud};
