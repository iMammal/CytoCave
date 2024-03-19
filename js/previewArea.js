/**
 * Created by Johnson on 2/15/2017.
 */

/**
 * This class controls the preview 3D area. It controls the creation of glyphs (nodes), edges, shortest path edges. It
 * also executes the update requests to those objects. It inits the VR environment when requested.
 * @param canvas_ a WebGl canvas
 * @param model_ a Model object
 * @constructor
 */

import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
//import {FirstPersonControls} from "three/examples/jsm/controls/FirstPersonControls";
import {ArcballControls} from "three/examples/jsm/controls/ArcballControls";
//import {FlyControls} from "three/examples/jsm/controls/FlyControls";
import {TrackballControls} from "three/examples/jsm/controls/TrackballControls";
//import {TransformControls} from "three/examples/jsm/controls/TransformControls";
//createWebglContext is deprecated, put here to explain why the gl context thing is broken.
//import {CreateWebGLContext} from "three/examples/jsm/webgl/WebGL";
//import * as quat from "./external-libraries/gl-matrix/quat.js";

// import {isLoaded, dataFiles  , mobile} from "./globals";
import {mobile, atlas, removeEdgesOnUnselect,startNoEdges,startNoLabels} from './globals';
import {getNormalGeometry, getNormalMaterial} from './graphicsUtils.js'
import { XRInterface } from './XRInterface.js'
import {
  getRoot,
  setRoot,
  getSpt,
  glyphNodeDictionary,
  //getNodesSelected,
  //clrNodesSelected,
  // setNodesSelected,
  // getNodesFocused,
  // clrNodesFocused,
  setNodesFocused,
  getVisibleNodes,
  getVisibleNodesLength,
  setVisibleNodes,
  getEnableEB,
  getEnableIpsi,
  getEnableContra,
  getThresholdModality,
  //vr,
  //activeVR,
  // updateNodeSelection,
  updateNodeMoveOver,
    updateScenes,
 previewAreaLeft, previewAreaRight, onMouseDown, onMouseUp, onDocumentMouseMove, toggleFloatingLabel
  // previewAreaLeft, previewAreaRight, onMouseDown, onMouseUp, onDocumentMouseMove,
  //   updateHud2D
} from './drawing'
import {getShortestPathVisMethod, SHORTEST_DISTANCE, NUMBER_HOPS, searchMode, removeGeometryButtons} from './GUI'
import {scaleColorGroup} from './utils/scale'
//import {WebXRButton} from './external-libraries/vr/webxr-button.js'; //Prettier button but not working so well
//import { VRButton } from './external-libraries/vr/VRButton.js';
//import {VRButton} from 'three/examples/jsm/webxr/VRButton.js';
//import { XRControllerModelFactory } from './external-libraries/vr/XRControllerModelFactory.js';
// import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory.js";
// import {nodeObject, timerDelta} from "three/examples/jsm/nodes/shadernode/ShaderNodeElements";
// import {WebXRManager} from "three/src/renderers/webxr/WebXRManager";
// import {abs, sign} from "mathjs";
// import {NODE_STREAM_INPUT} from "papaparse";
// import {modelLeft} from "./model";
// import node from "three/addons/nodes/core/Node";
import NeuroSlice from "./NeuroSlice";
//import * as d3 from '../external-libraries/d3'
import NodeManager from "./NodeManager";
import {modelLeft} from "./model";
import { PathFinder } from "./PathFinder";
import canvasGraph from "./canvasGraph";
import  Hud2D  from "./Hud2d";
import LineGraphs from './LineGraphs.js';
import NodeLabels from "./nodeLabels";

class PreviewArea {
  constructor(canvas_, model_, name_) {
    //Class variables
    this.name = name_;
    this.model = model_;
    this.canvas = canvas_;
    // check if canvas model and name are all valid otherwise abort.
    if (!this.canvas || !this.model || !this.name) {
      console.log('PreviewArea: Invalid parameters');
      return;
    }
    this.camera = null;
    this.renderer = null;
    this.lastResizeTime = 0;
    this.scene = null;
    this.controls = null;
    this.controlMode = 'orbit';  // tracks type of control currently in use if mode is changed by keypress.
    this.clock = new THREE.Clock(true);
    //  this.instances = {}; // NodeManager now handles this, mostly in order to make it easier to remove NodeManager. (Switched to more of a OOP approach)

    this.controllerLeft = null;
    this.controllerRight = null;
    this.xrInputLeft = null;
    this.xrInputRight = null;
    this.enableRender = true; //stops animate loop render calls when false

    this.pointerLeft = null;
    this.pointerRight = null;      // left and right controller pointers for pointing at things
    this.enableVR = false;
    this.activateVR = false;
    this.vrButton = null;
    this.controllerLeftSelectState = false;
    this.controllerRightSelectState = false;

    //todo evaluate if needed.
    this.vrControl = null;
    this.effect = null;

    // // XR stuff
    // this.xrButton = null;
    // this.xrRefSpace = null;
    // this.xrImmersiveRefSpace = null;
    // this.xrInlineRefSpace = null;
    this.inlineSession = null;
    this.controller = null;
    this.controllerGrip = null;
    this.controllerGripLeft = null;
    this.controllerGripRight = null;

    // nodes and edges
    this.brain = null; // three js group housing all instances and edges
    //this.glyphs = [];
    this.displayedEdges = [];
    // shortest path
    this.shortestPathEdges = [];
    this.edgeOpacity = 0.5;
    this.amplitude = 0.0015;
    this.frequency = 0.5;

    this.edgeFlareVertices = [];
    this.edgeFlareGeometry = null;
    this.edgeFlareMaterial = null;
    this.edgeFlarePoints = null;
    //this.edgeFlareMesh = null;
    this.displayedEdgeFlareTravelPercentages = [];
    this.particlesVisible = false;
    //this.edgeFlaresVisible = true;  //particles or flares?

    this.edgesAllOn = false;

    this.edgeFlareVisible = 1; //true;
    this.labelsVisible = false;
    //this.particlesVisible = false;
    this.objectsIntersected = [];

    this.imageSlices = null;

    this.skybox = null;
    this.pathFinder = null;
    //this.gl = null;
    // possably need this.gl to be set to the canvas context
    // I didn't see it created anywhere except some commented code.
    this.animatePV = this.animatePV.bind(this);

    // PreviewArea construction
    this.createCanvas();
    this.initCamera();
    this.initScene();
    this.initControls();
    this.xrInterface = new XRInterface(this);
    //this.initXR();
    //this.drawRegions();  //replaced with nodeManager
    this.NodeManager = new NodeManager(this);
    this.rebindNodeManagerCallbacks();

    this.renderer.setAnimationLoop(this.animatePV); // done: this is the new way to do it in WebXR

    this.addSkybox(); // todo: Try starting without skybox but make the background black in all browsers.
    this.initEdgeFlare();
    this.setEventListeners();
    this.nodeLabels = new NodeLabels(this,this.NodeManager);
    // this.nspCanvas = document.createElement('canvas');
    // this.nodeNameMap = null;
    // this.nodeLabelSprite = null;

    //this.imageSlices = new NeuroSlice('public/images','data/Cartana/SliceDepth0.csv',this.imagesLoadedCallback.bind(this));

    // this.labelAll();
    // this.NodeManager.selectAll();

    this.lineplotCanvas = document.createElement('canvas');
    this.lineplots = [document.getElementById('lineplot1')];//createElement('canvas');
    this.Hud2D = new Hud2D(this);
    this.linegraphs = new LineGraphs(this); //preViewArea_);

    // Display all edges
    if (!startNoEdges) {
      for (let i = 0; i < this.model.getDataset().length; i++) {
        this.drawEdgesGivenIndex(i);
      }
    }

    if(!startNoLabels) {
      this.toggleLabels();
    }
  } // End Constructor

  //reset previewArea to state
  reset = () => {
    this.removeAllInstances();
    //shut down all highlights before reset
    this.NodeManager.removeHighlights();
    //this.nodeLabels.removeAllLabels();

    this.pathFinder = null;
    this.NodeManager = new NodeManager(this);
    this.updateNodesVisibility(true);
    this.rebindNodeManagerCallbacks();
    this.removeEdgesFromScene();
    this.removeShortestPathEdgesFromScene();
    this.reInitEdgeFlare();

    this.setEdgeOpacity(this.edgeOpacity);  //maintains edge opacity between resets.
    //restore nodelabels if they were visible
    if (this.labelsVisible) {
      this.nodeLabels.labelAllNodes();
    }
  }

  appearUnselected = (node) => {
    previewAreaLeft.NodeManager.deselectNode(node);
    previewAreaRight.NodeManager.deselectNode(node);
    this.NodeManager.restoreNode(node);
    // todo: add a global to control edge behavior on [un]select
    if (removeEdgesOnUnselect) this.removeEdgeGivenNode(node);
    //this.NodeManager.removeContextNodesFromAroundObject(node);
    this.NodeManager.removeHighlight(node);
    this.reInitEdgeFlare(); //just until i move it to the node manager or it's own class
  }

  appearSelected = (node) => {
    //console.log('appearSelected');
    //console.log(node);
    let index = this.NodeManager.node2index(node);

    this.NodeManager.restoreNodeByIndex(index);
    this.model.loadNodeDetails(index); // fetch evidence plot for node
    // fetch evidence plot for node's neighbors
    for (let edge of this.NodeManager.getEdges(node)) {
      let neighborI = edge.targetNodeIndex;
      this.model.loadNodeDetails(neighborI);
    }
    this.NodeManager.scaleNodeByIndex(index, 1.5);
    this.drawEdgesGivenIndex(index);
    this.reInitEdgeFlare(); //just until i move it to the node manager or it's own class.
    // In CYtoCave the nodes are all selected by default to show their edges. But highlighting is not done (idealy) until the user selects a node.
    // this.NodeManager.removeHighlight(node); //our highlight color has precedence over the selected color so we need to remove it.
    // this.NodeManager.highlightNode(node, 0xFF0000); // selected node will be red
    // set contextually selected nodes to appear highlighted
    //todo: do we have a slider for distance?
    //this.NodeManager.activateContextAroundIndex(index, 0, 1);

    // for mirroring to the other side

      previewAreaLeft.NodeManager.select(index);  //if it's already selected in this tree selectNode does nothing so it's safe to call on both sides.
      previewAreaRight.NodeManager.select(index);


      this.Hud2D.update();

  }

  GroupSelectedCallback() {
    //only use for things that effect every selected node, can be cpu intensive. when a node is selected in a group, everything
    // the regular callback is also called, so this is not suitable for things that are node specific.
    return;
  }

  //var name = name_;
  //var model = model_;
  //var canvas = canvas_;
  //var camera = null, renderer = null, controls = null, scene = null, raycaster = null, gl = null;
  //var nodeLabelSprite = null, nodeNameMap = null, nspCanvas = null;
  //var clock = new THREE.Clock();
  //var instances = {}; //for tracking instanced meshes
  // make instances public so we can access them from another class
  //this.instances = instances;
  //this.instances = {};
  // VR stuff
  // var vrControl = null, effect = null;
  // var controllerLeft = null, controllerRight = null, xrInputLeft = null, xrInputRight = null,
  //     enableRender = true;
  // var pointerLeft = null, pointerRight = null;      // left and right controller pointers for pointing at things
  // var enableVR = false;
  // var activateVR = false;
  // var vrButton = null;
  // let controllerLeftSelectState = false, controllerRightSelectState = false;

  // // XR stuff
  // var xrButton = null;
  // let xrRefSpace = null;
  // let xrImmersiveRefSpace = null;
  // let xrInlineRefSpace = null;
  // let inlineSession = null;
  // let controller, controllerGrip, controllerGripLeft, controllerGripRight;

  // // nodes and edges
  // var brain = null; // three js group housing all glyphs and edges
  // var glyphs = [];
  // this.displayedEdges = [];

  // // shortest path
  // var shortestPathEdges = [];
  //
  // var edgeOpacity = 1.0;

  // // animation settings
  // var amplitude =  0.0015;
  // var frequency =  0.5;

  getSceneObject() {
    return this.scene;
  }

  getModel() {
    return this.model;
  }


 // initXR = () => {
    //init VR //todo: this is stub now
  //
  //   // if(this.xrInterface !== null) {
  //   //   this.xrInterface.initXR(this);
  //   // }
  //   return; //disabled moved to xrInterface
  //
  //   console.log("Init XR for PV: " + name);
  //   this.enableVR = true;
  //   this.activateVR = false;
  //
  //   //renderer.outputEncoding = THREE.sRGBEncoding; //The robot says this makes the colors look better in VR but it makes the colors look worse in the browser
  //   this.renderer.xr.enabled = true;
  //
  //
  //   function onSelectStart() {
  //
  //     this.userData.isSelecting = true;
  //     console.log("Select start");
  //   }
  //
  //   function onSelectEnd() {
  //
  //     this.userData.isSelecting = false;
  //     console.log("Select end");
  //   }
  //
  //   let v3Origin = new THREE.Vector3(0, 0, 0);
  //   let v3UnitUp = new THREE.Vector3(0, 0, -100);
  //
  //   this.controllerLeft = this.renderer.xr.getController(0);
  //   this.controllerLeft.addEventListener('selectstart', onSelectStart);
  //   this.controllerLeft.addEventListener('selectend', onSelectEnd);
  //   this.controllerLeft.addEventListener('connected', (event) => {
  //     this.controllerLeft.gamepad = event.data.gamepad;
  //     console.log("Left controller connected");
  //     console.log("event data: ");
  //     console.log(event.data);
  //     this.xrInputLeft = event.data;
  //     //  this.add( buildController( event.data ) );
  //     //todo this is no longer the gamepad as we used ()=> {} instead of function() {}
  //     // in order to draw the pointer we need to add it to the controller probably, test this.
  //     this.controllerLeft.add(this.drawPointer(v3Origin, v3UnitUp));
  //     //this.add( drawPointer(v3Origin, v3UnitUp) );
  //
  //   });
  //
  //   this.controllerLeft.addEventListener('disconnected', function () {
  //
  //     this.remove(this.children[0]);
  //
  //   });
  //   this.scene.add(this.controllerLeft);
  //
  //   this.controllerRight = this.renderer.xr.getController(1);
  //   this.controllerRight.addEventListener('selectstart', onSelectStart);
  //   this.controllerRight.addEventListener('selectend', onSelectEnd);
  //   this.controllerRight.addEventListener('connected', (event) => {
  //     this.controllerRight.gamepad = event.data.gamepad;
  //     //this.add( buildController( event.data ) );
  //     console.log("Right controller connected: ");
  //     console.log("event data: ");
  //     this.xrInputRight = event.data;
  //     console.log(event.data);
  //     //todo this is no longer the gamepad as we used ()=> {} instead of function() {}
  //     // in order to draw the pointer we need to add it to the controller probably, test this.
  //     this.controllerRight.add(this.drawPointer(v3Origin, v3UnitUp));
  //     //this.add(this.drawPointer(v3Origin, v3UnitUp));//
  //   });
  //
  //   this.controllerRight.addEventListener('disconnected', function () {
  //
  //     this.remove(this.children[0]);
  //
  //   });
  //   this.scene.add(this.controllerRight);
  //
  //   const controllerModelFactory = new XRControllerModelFactory();
  //
  //   this.controllerGripLeft = this.renderer.xr.getControllerGrip(0);
  //   this.controllerGripLeft.add(controllerModelFactory.createControllerModel(this.controllerGripLeft));
  //   this.scene.add(this.controllerGripLeft);
  //
  //   this.controllerGripRight = this.renderer.xr.getControllerGrip(1);
  //   this.controllerGripRight.add(controllerModelFactory.createControllerModel(this.controllerGripRight));
  //   this.scene.add(this.controllerGripRight);
  //   console.log('this.controllerLeft.gamepad');
  //   console.log(this.controllerLeft.gamepad);
  //   //document.body
  //   document.getElementById('vrButton' + this.name).appendChild(VRButton.createButton(this.renderer));
  //
  // }


  // webxr is now largly responsible for this
  // buildController = (data) => {
  //
  //     let geometry, material;
  //
  //     switch (data.targetRayMode) {
  //
  //         case 'tracked-pointer':
  //
  //             geometry = new THREE.BufferGeometry();
  //             geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
  //             geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
  //
  //             material = new THREE.LineBasicMaterial({vertexColors: true, blending: THREE.AdditiveBlending});
  //
  //             return new THREE.Line(geometry, material);
  //
  //         case 'gaze':
  //
  //             geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
  //             material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
  //             return new THREE.Mesh(geometry, material);
  //
  //     }
  //
  //
  // }

  //todo say no to globals pollution
  // // animation settings
  // var amplitude = 0.0015;
  // var frequency = 0.5;
  // todo compare this initXR to the one above
  // this.initXR = function () {
  //     //init VR //todo: this is stub now
  //
  //     document.addEventListener('keypress', this.keyPress.bind(this), false);
  //     console.log("Init XR for PV: " + name);
  //     enableVR = true;
  //     activateVR = false;
  //
  //     //renderer.outputEncoding = THREE.sRGBEncoding; //The robot says this makes the colors look better in VR but it makes the colors look worse in the browser
  //     renderer.xr.enabled = true;
  //
  //
  //     function onSelectStart() {
  //
  //         this.userData.isSelecting = true;
  //         console.log("Select start");
  //     }
  //
  //     function onSelectEnd() {
  //
  //         this.userData.isSelecting = false;
  //         console.log("Select end");
  //     }
  //
  //     var v3Origin = new THREE.Vector3(0, 0, 0);
  //     var v3UnitUp = new THREE.Vector3(0, 0, -100);
  //
  //     controllerLeft = renderer.xr.getController(0);
  //     controllerLeft.addEventListener('selectstart', onSelectStart);
  //     controllerLeft.addEventListener('selectend', onSelectEnd);
  //     controllerLeft.addEventListener('connected', function (event) {
  //         controllerLeft.gamepad = event.data.gamepad;
  //         console.log("Left controller connected");
  //         console.log("event data: ");
  //         console.log(event.data);
  //         xrInputLeft = event.data;
  //         //  this.add( buildController( event.data ) );
  //         this.add(drawPointer(v3Origin, v3UnitUp));
  //
  //     });
  //
  //     controllerLeft.addEventListener('disconnected', function () {
  //
  //         this.remove(this.children[0]);
  //
  //     });
  //     scene.add(controllerLeft);
  //
  //     controllerRight = renderer.xr.getController(1);
  //     controllerRight.addEventListener('selectstart', onSelectStart);
  //     controllerRight.addEventListener('selectend', onSelectEnd);
  //     controllerRight.addEventListener('connected', function (event) {
  //         controllerRight.gamepad = event.data.gamepad;
  //         //this.add( buildController( event.data ) );
  //         console.log("Right controller connected: ");
  //         console.log("event data: ");
  //         xrInputRight = event.data;
  //         console.log(event.data);
  //
  //         this.add(drawPointer(v3Origin, v3UnitUp));//
  //     });
  //     controllerRight.addEventListener('disconnected', function () {
  //
  //         this.remove(this.children[0]);
  //
  //     });
  //     scene.add(controllerRight);
  //
  //     const controllerModelFactory = new XRControllerModelFactory();
  //
  //     controllerGripLeft = renderer.xr.getControllerGrip(0);
  //     controllerGripLeft.add(controllerModelFactory.createControllerModel(controllerGripLeft));
  //     scene.add(controllerGripLeft);
  //
  //     controllerGripRight = renderer.xr.getControllerGrip(1);
  //     controllerGripRight.add(controllerModelFactory.createControllerModel(controllerGripRight));
  //     scene.add(controllerGripRight);
  //
  //
  //     //document.body
  //     document.getElementById('vrButton' + name).appendChild(VRButton.createButton(renderer));
  //
  // }

// duplicate declaration. unused function. todo: remove
  // function buildController( data ) {
  //
  //     let geometry, material;
  //
  //     switch ( data.targetRayMode ) {
  //
  //         case 'tracked-pointer':
  //
  //             geometry = new THREE.BufferGeometry();
  //             geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
  //             geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );
  //
  //             material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
  //
  //             return new THREE.Line( geometry, material );
  //
  //         case 'gaze':
  //
  //             geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
  //             material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
  //             return new THREE.Mesh( geometry, material );
  //
  //     }
  //
  //
  //
  // }


  // request VR activation - desktop case
  // advise renaming this function to avoid conflict with variable
  // this.activateVR = function (activate) {
  //     if (activate == activateVR)
  //         return;
  //     activateVR = activate;
  //     if (!mobile) {
  //         if (activateVR) {
  //             console.log("Activate VR for PV: " + name);
  //             //effect.requestPresent();
  //         } else
  //             console.log("Disable VR for PV: " + name);
  //         //effect.exitPresent();
  //     }
  // };


  /*   // Called when the user selects a device to present to. In response we
       // will request an exclusive session from that device.
       function onRequestSession() {
           return navigator.xr.requestSession('immersive-vr').then((session) => { // onSessionStarted);
               xrButton.setSession(session);
               // Set a flag on the session so we can differentiate it from the
               // inline session.
               session.isImmersive = true;
               onSessionStarted(session);
           });
       }

       // Called either when the user has explicitly ended the session (like in
       // onEndSession()) or when the UA has ended the session for any reason.
       // At this point the session object is no longer usable and should be
       // discarded.
       function onSessionEnded(event) {
           xrButton.setSession(null);

           // In this simple case discard the WebGL context too, since we're not
           // rendering anything else to the screen with it.
           // renderer = null;
       }


       // Called when the user clicks the 'Exit XR' button. In response we end
       // the session.
       function onEndSession(session) {
           session.end();
       }

       // Creates a WebGL context and initializes it with some common default state.
       function createWebGLContext(glAttribs) {
           glAttribs = glAttribs || {alpha: false};

           let webglCanvas = document.createElement('canvas'); //
                               //document.getElementById('mycanvas' + name); // document.createElement('canvas');
           console.log("Canvas: " + webglCanvas);
           let contextTypes = glAttribs.webgl2 ? ['webgl2'] : ['webgl', 'experimental-webgl'];
           let context = null;

           for (let contextType of contextTypes) {
               context = webglCanvas.getContext(contextType, glAttribs);
               if (context) {
                   break;
               }
           }

           if (!context) {
               let webglType = (glAttribs.webgl2 ? 'WebGL 2' : 'WebGL');
               console.error('This browser does not support ' + webglType + '.');
               return null;
           }

           return context;
       }

          // init Oculus Rift
       this.initXR = function () {
              //init VR //todo: this is stub now

           console.log("Init XR for PV: " + name);
           enableVR = true;
           activateVR = false;

           xrButton = new WebXRButton({
               onRequestSession: onRequestSession,
               onEndSession: onEndSession
           });
           // document.querySelector('header').appendChild(xrButton.domElement);
           document.getElementById('vrButton' + name).appendChild(xrButton.domElement);


           // init VR
           vrButton = document.getElementById('vrButton' + name);
           console.log("vrButton: " + vrButton);

           //vrButton.addEventListener('click', function () {
           //vrButton.style.display = 'none';
           //vrButton.innerHTML = 'Enter VR';
           //  console.log("Click On VR Button: " + name);
           //effect.requestPresent();
           //}, false);

           // Is WebXR available on this UA?
           if (navigator.xr) {
               // If the device allows creation of exclusive sessions set it as the
               // target of the 'Enter XR' button.
               navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                   xrButton.enabled = supported;
               });

               // Start up an inline session, which should always be supported on
               // browsers that support WebXR regardless of the available hardware.
               navigator.xr.requestSession('inline').then((session) => {
                   inlineSession = session;
                   onSessionStarted(session);
                   //updateFov(); //todo: make an FoV slider
               });
           }

       } //this.initRXR



               // Called when we've successfully acquired a XRSession. In response we
               // will set up the necessary session state and kick off the frame loop.
               function onSessionStarted(session) {
                   // THis line is left over from the immersive VR example:
                   // This informs the 'Enter XR' button that the session has started and
                   // that it should display 'Exit XR' instead.
                   //xrButton.setSession(session) // So, this is needed in "inline" mode.... not sure why.
                   // It actually breaks the "Enter VR" buttons - makes them start immersive mode on initXR


                   // Listen for the sessions 'end' event so we can respond if the user
                   // or UA ends the session for any reason.
                   session.addEventListener('end', onSessionEnded);

                   // Create a WebGL context to render with, initialized to be compatible
                   // with the XRDisplay we're presenting to.
                   if (!gl) {
                       gl = createWebGLContext({
                           xrCompatible: true
                       });

                       // In order for an inline session to be used we must attach the WebGL
                       // canvas to the document, which will serve as the output surface for
                       // the results of the inline session's rendering.
                       document.getElementById('canvas' + name).appendChild(gl.canvas);

                       // The canvas is synced with the window size via CSS, but we still
                       // need to update the width and height attributes in order to keep
                       // the default framebuffer resolution in-sync.
                       function onResize() {
                           gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
                           gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
                       }

                       window.addEventListener('resize', onResize);
                       onResize();

                       // Installs the listeners necessary to allow users to look around with
                       // inline sessions using the mouse or touch.
                       addInlineViewListeners(gl.canvas);


                   } //if (!gl)


                   // WebGL layers for inline sessions won't allocate their own framebuffer,
                   // which causes gl commands to naturally execute against the default
                   // framebuffer while still using the canvas dimensions to compute
                   // viewports and projection matrices.
                   let glLayer = new XRWebGLLayer(session, gl);

                   session.updateRenderState({
                       baseLayer: glLayer
                   });

                   // Get a frame of reference, which is required for querying poses. In
                   // this case an 'local' frame of reference means that all poses will
                   // be relative to the location where the XRDevice was first detected.
                   let refSpaceType = session.isImmersive ? 'local' : 'viewer';
                   session.requestReferenceSpace(refSpaceType).then((refSpace) => {
                       // Since we're dealing with multiple sessions now we need to track
                       // which XRReferenceSpace is associated with which XRSession.
                       if (session.isImmersive) {
                           xrImmersiveRefSpace = refSpace;
                       } else {
                           xrInlineRefSpace = refSpace;
                       }
                       session.requestAnimationFrame(onXRFrame);
                   });

               } //onSessionStarted

       // Make the canvas listen for mouse and touch events so that we can
       // adjust the viewer pose accordingly in inline sessions.
       function addInlineViewListeners(canvas) {
           canvas.addEventListener('mousemove', (event) => {
               // Only rotate when the right button is pressed
               if (event.buttons && 2) {
                   rotateView(event.movementX, event.movementY);
               }
           });

           // Keep track of touch-related state so that users can touch and drag on
           // the canvas to adjust the viewer pose in an inline session.
           let primaryTouch = undefined;
           let prevTouchX = undefined;
           let prevTouchY = undefined;

           // Keep track of all active touches, but only use the first touch to
           // adjust the viewer pose.
           canvas.addEventListener("touchstart", (event) => {
               if (primaryTouch == undefined) {
                   let touch = event.changedTouches[0];
                   primaryTouch = touch.identifier;
                   prevTouchX = touch.pageX;
                   prevTouchY = touch.pageY;
               }
           });

           // Update the set of active touches now that one or more touches
           // finished. If the primary touch just finished, update the viewer pose
           // based on the final touch movement.
           canvas.addEventListener("touchend", (event) => {
               for (let touch of event.changedTouches) {
                   if (primaryTouch == touch.identifier) {
                       primaryTouch = undefined;
                       rotateView(touch.pageX - prevTouchX, touch.pageY - prevTouchY);
                   }
               }
           });

           // Update the set of active touches now that one or more touches was
           // cancelled. Don't update the viewer pose when the primary touch was
           // cancelled.
           canvas.addEventListener("touchcancel", (event) => {
               for (let touch of event.changedTouches) {
                   if (primaryTouch == touch.identifier) {
                       primaryTouch = undefined;
                   }
               }
           });

           // Only use the delta between the most recent and previous events for
           // the primary touch. Ignore the other touches.
           canvas.addEventListener("touchmove", (event) => {
               for (let touch of event.changedTouches) {
                   if (primaryTouch == touch.identifier) {
                       rotateView(touch.pageX - prevTouchX, touch.pageY - prevTouchY);
                       prevTouchX = touch.pageX;
                       prevTouchY = touch.pageY;
                   }
               }
           });
       } //addInlineViewListeners

           // Called every time the XRSession requests that a new frame be drawn.
       function onXRFrame(t, frame) {
           let session = frame.session;
           // Ensure that we're using the right frame of reference for the session.
           let refSpace = session.isImmersive ?
               xrImmersiveRefSpace :
               xrInlineRefSpace;

           // Account for the click-and-drag mouse movement or touch movement when
           // calculating the viewer pose for inline sessions.
           if (!session.isImmersive) {
               refSpace = getAdjustedRefSpace(refSpace);
           }



           // Get the XRDevice pose relative to the Frame of Reference we created
           // earlier.
           let pose = frame.getViewerPose(refSpace);

           // Inform the session that we're ready for the next frame.
           session.requestAnimationFrame(onXRFrame);

           // Getting the pose may fail if, for example, tracking is lost. So we
           // have to check to make sure that we got a valid pose before attempting
           // to render with it. If not in this case we'll just leave the
           // framebuffer cleared, so tracking loss means the scene will simply
           // disappear.
           if (pose) {
               let glLayer = session.renderState.baseLayer;

               // If we do have a valid pose, bind the WebGL layer's framebuffer,
               // which is where any content to be displayed on the XRDevice must be
               // rendered.
               gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

               // Clear the framebuffer
               gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

               // Loop through each of the views reported by the frame and draw them
               // into the corresponding viewport.
               for (let view of pose.views) {
                   let viewport = glLayer.getViewport(view);
                   gl.viewport(viewport.x, viewport.y,
                       viewport.width, viewport.height);

                   // Draw this view of the scene. What happens in this function really
                   // isn't all that important. What is important is that it renders
                   // into the XRWebGLLayer's framebuffer, using the viewport into that
                   // framebuffer reported by the current view, and using the
                   // projection matrix and view transform from the current view.
                   // We bound the framebuffer and viewport up above, and are passing
                   // in the appropriate matrices here to be used when rendering.
                   //scene.draw(view.projectionMatrix, view.transform);
                   console.log("Draw Scene: " + view.transform.matrix + view.projectionMatrix);
               }

           } //if pose
       } //onXRFrame

       // Inline view adjustment code
       // Allow the user to click and drag the mouse (or touch and drag the
       // screen on handheld devices) to adjust the viewer pose for inline
       // sessions. Samples after this one will hide this logic with a utility
       // class (InlineViewerHelper).
       let lookYaw = 0;
       let lookPitch = 0;
       const LOOK_SPEED = 0.0025;

       // XRReferenceSpace offset is immutable, so return a new reference space
       // that has an updated orientation.
       function getAdjustedRefSpace(refSpace) {
           // Represent the rotational component of the reference space as a
           // quaternion.
           let invOrientation = quat.create();
           quat.rotateX(invOrientation, invOrientation, -lookPitch);
           quat.rotateY(invOrientation, invOrientation, -lookYaw);
           let xform = new XRRigidTransform(
               {x: 0, y: 0, z: 0},
               {x: invOrientation[0], y: invOrientation[1], z: invOrientation[2], w: invOrientation[3]});
           return refSpace.getOffsetReferenceSpace(xform);
       }
   */
  // vrButton.addEventListener('mouseover', function () {
  //         //vrButton.style.display = 'none';
  //         //vrButton.innerHTML = 'Enter VR NOW';
  //         console.log("Mouse Over VR Button: " + name);
  //         //effect.requestPresent();
  //     }, false);
  //effect.requestPresent();
  // I found some VR button HTML in the visualization.html file and tried to light them up
  // with OnClicks but they didn't seem to want to do anything so I tried that example class
  // and it worked a bit better.


  // OLD InitVR Code Here:
  // if (mobile) {
  //     console.log("Init VR for PV: " + name);
  //     enableVR = true;
  //     activateVR = true;
  //     // init VR
  //     vrButton = document.getElementById('vrButton' + name);
  //     vrButton.addEventListener('click', function () {
  //         vrButton.style.display = 'none';
  //         //effect.requestPresent();
  //     }, false);
  //     //effect.requestPresent();
  // } else {
  //     console.log("Init VR for PV: " + name);
  //     enableVR = true;
  //     activateVR = false;
  //     // init VR
  //     vrButton = document.getElementById('vrButton' + name);
  //     vrButton.addEventListener('click', function () {
  //         vrButton.style.display = 'none';
  //         //effect.requestPresent();
  //     }, false);
  //     //effect.requestPresent();
  // }
//    };

  //on resize, used resizeScene instead.
  // onWindowResize() {
  //     if (this.enableVR)  //todo: Is this still required in WebXR model?
  //         return;
  //     this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
  //     this.camera.updateProjectionMatrix();
  //     this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  // };

  //event listener for resize moved to constructor.


  // init Oculus Touch controllers
  // not supported in Firefox, only Google chromium
  // check https://webvr.info/get-chrome/
  // var initOculusTouch = function () {
  //     if (!enableVR)
  //         return;
  //
  //     controllerLeft = new THREE.ViveController(0);
  //     controllerRight = new THREE.ViveController(1);
  //
  //     var loader = new THREE.OBJLoader();
  //     loader.setPath('js/external-libraries/vr/models/obj/vive-controller/');
  //     loader.load('vr_controller_vive_1_5.obj', function (object) {
  //
  //         var loader = new THREE.TextureLoader();
  //         loader.setPath('js/external-libraries/vr/models/obj/vive-controller/');
  //
  //         var controller = object.children[0];
  //         controller.material.map = loader.load('onepointfive_texture.png');
  //         controller.material.specularMap = loader.load('onepointfive_spec.png');
  //
  //         controllerLeft.add(object.clone());
  //         controllerRight.add(object.clone());
  //
  //         controllerLeft.standingMatrix = vrControl.getStandingMatrix();
  //         controllerRight.standingMatrix = vrControl.getStandingMatrix();
  //
  //         scene.add(controllerLeft);
  //         scene.add(controllerRight);
  //     });
  //
  //     // controllerLeft.addEventListener('gripsup', function(e) { updateVRStatus('left'); }, true);
  //     // controllerRight.addEventListener('gripsup', function(e) { updateVRStatus('right'); }, true);
  //
  //     oculusTouchExist = true;
  //
  //     console.log("Init Oculus Touch done");
  // };

  // var initGearVRController = function () {
  //     if (!enableVR || !mobile)
  //         return;
  //
  //     // assume right handed user
  //     controllerRight = new THREE.GearVRController(0);
  //     //controllerRight.position.set( 25, - 50, 0 );
  //
  //
  //     var loader = new THREE.OBJLoader();
  //     loader.setPath('js/external-libraries/vr/models/obj/vive-controller/');
  //     loader.load('vr_controller_vive_1_5.obj', function (object) {
  //         var loader = new THREE.TextureLoader();
  //         loader.setPath('js/external-libraries/vr/models/obj/vive-controller/');
  //         var controller = object.children[0];
  //         controller.material.map = loader.load('onepointfive_texture.png');
  //         controller.material.specularMap = loader.load('onepointfive_spec.png');
  //         controllerRight.add(object.clone());
  //         controllerRight.standingMatrix = vrControl.getStandingMatrix();
  //         scene.add(controllerRight);
  //     });
  //
  //     gearVRControllerExist = true;
  //
  //     console.log("Init Gear VR Controller done");
  // };

  // var initWebVRForMobile = function () {
  //     // Initialize the WebVR UI.
  //     var uiOptions = {
  //         color: 'black',
  //         background: 'white',
  //         corners: 'round',
  //         height: 40,
  //         disabledOpacity: 0.9
  //     };
  //     vrButton = new webvrui.EnterVRButton(renderer.domElement, uiOptions);
  //     vrButton.on('exit', function () {
  //         updateVRStatus('disable');
  //     });
  //     vrButton.on('hide', function () {
  //         document.getElementById('vr' + name).style.display = 'none';
  //     });
  //     vrButton.on('show', function () {
  //         document.getElementById('vr' + name).style.display = 'inherit';
  //     });
  //     document.getElementById('vrButton' + name).appendChild(vrButton.domElement);
  //     document.getElementById('magicWindow' + name).addEventListener('click', function () {
  //         vr = true;
  //         activateVR = true;
  //         activeVR = name.toLowerCase();
  //         console.log("Active VR = " + activeVR);
  //         vrButton.requestEnterFullscreen();
  //     });
  // };

  // scan Gear VR controller
  // var scanGearVRController = function () {
  //     var thumbPad = controllerRight.getButtonState('thumbpad');
  //     var trigger = controllerRight.getButtonState('trigger');
  //     var angleX = null, angleY = null;
  //     var gamePadRight = controllerRight.getGamepad();
  //     if (gamePadRight && !trigger) {
  //         angleX = gamePadRight.axes[0];
  //         angleY = gamePadRight.axes[1];
  //         if (thumbPad) {
  //             brain.rotateX(0.2 * angleX);
  //             brain.rotateZ(0.2 * angleY);
  //         } else {
  //             brain.position.z += 5 * angleX;
  //             brain.position.x += 5 * angleY;
  //         }
  //         brain.matrixWorldNeedsUpdate = true;
  //     }
  //     var v3Origin = new THREE.Vector3(0, 0, 0);
  //     var v3UnitUp = new THREE.Vector3(0, 0, -100);
  //
  //     // Find all nodes within 0.1 distance from left Touch Controller
  //     var closestNodeIndexRight = 0, closestNodeDistanceRight = 99999.9;
  //     for (var i = 0; i < brain.children.length; i++) {
  //         var distToNodeIRight = controllerRight.position.distanceTo(brain.children[i].getWorldPosition());
  //         if ((distToNodeIRight < closestNodeDistanceRight)) {
  //             closestNodeDistanceRight = distToNodeIRight;
  //             closestNodeIndexRight = i;
  //         }
  //     }
  //
  //     var isLeft = (activateVR == 'left');
  //     if (trigger) {
  //         pointedNodeIdx = (closestNodeDistanceRight < 2.0) ? closestNodeIndexRight : -1;
  //
  //         if (pointerRight) {
  //             // Touch Controller pointer already on! scan for selection
  //             if (thumbPad) {
  //                 updateNodeSelection(model, getPointedObject(controllerRight), isLeft);
  //             }
  //         } else {
  //             pointerRight = drawPointer(v3Origin, v3UnitUp);
  //             controllerRight.add(pointerRight);
  //         }
  //         updateNodeMoveOver(model, getPointedObject(controllerRight));
  //     } else {
  //         if (pointerRight) {
  //             controllerRight.remove(pointerRight);
  //         }
  //         pointerRight = null;
  //     }
  // };
  getNearestNodes = (controller) => {
    if (!this.controller) return;
    if (!this.controller.position) return;
    if (!this.brain) return;
    if (!this.brain.children) return;
    // Find all nodes within 0.1 distance from given Touch Controller
    let closestNodeIndex = 0, closestNodeDistance = 99999.9;
    for (let i = 0; i < this.brain.children.length; i++) {
      let distToNodeI = controller.position.distanceTo(this.brain.children[i].position);
      if ((distToNodeI < closestNodeDistance)) {
        closestNodeDistance = distToNodeI;
        closestNodeIndex = i;
      }

    }
    return {closestNodeIndex: closestNodeIndex, closestNodeDistance: closestNodeDistance};

  }
  // scan the Oculus Touch for controls


  scanOculusTouch = () => {
    // this returns immediately right now, is it supposed to do more?
    return;
    //exit if no controllers
    if (!this.controllerLeft || !this.controllerRight) return;
    //exit if no brain
    if (!this.brain) return;


    //check if in VR mode
    if (this.renderer.xr.isPresenting && this.xrInputLeft && this.xrInputRight) {
      //disable the mouse controls
      this.controls.enabled = false;

      //check if camera is the same as the webxr camera
      if (this.camera !== this.renderer.xr.getCamera()) {
        //if not, set the camera to the webxr camera
        this.camera = this.renderer.xr.getCamera();
        //display console, camera changed
        console.log("camera changed to vr camera");
      }

      //check if the camera is a child of the xrDolly
      if (!this.camera.parent) {
        //if not, add the camera to the xrDolly
        this.xrDolly.add(this.camera);
        //add controllers to dolly
        this.xrDolly.add(this.controllerLeft);
        this.xrDolly.add(this.controllerRight);
        this.xrDolly.add(this.controllerGripLeft);
        this.xrDolly.add(this.controllerGripRight);
        //add the xrDolly to the scene
        this.scene.add(this.xrDolly);
        //move xrDolly back to fit brain in view
        this.xrDolly.position.z = -100;
        console.log("xrDolly moved back to fit brain in view");
        console.log("camera added to dolly, dolly added to scene");
      }

      //todo say no to globals. remake the below. use either let or use this or init in constructor
      var cameraMaxTranslationSpeed = 10;
      var cameraMaxRotationSpeed = 0.06;
      var translationDecay = 0.01;
      var rotationDecay = 0.01;
      var maxTranslationAcceleration = 0.1;
      var maxRotationAcceleration = 0.1;

      var currentTranslationSpeed = new THREE.Vector3(0, 0, 0);
      var currentRotationSpeed = new THREE.Vector3(0, 0, 0);
      let delta = this.clock.getDelta();
      //get value of left thumbstick x axis
      if (this.xrInputLeft.gamepad.axes.length > 0) {
        // todo say no to globals. remake the below. use either let or use this or init in constructor
        var leftThumbstickX = this.controllerLeft.gamepad.axes[2];
        var leftThumbstickY = this.controllerLeft.gamepad.axes[3];
        //multiply by max increment
        var leftThumbstickXIncrement = leftThumbstickX * cameraMaxTranslationSpeed;
        var leftThumbstickYIncrement = leftThumbstickY * cameraMaxTranslationSpeed;
        //limit increment to max increment
        if (leftThumbstickXIncrement > maxTranslationAcceleration) {
          leftThumbstickXIncrement = maxTranslationAcceleration;
        }
        if (leftThumbstickXIncrement < -maxTranslationAcceleration) {
          leftThumbstickXIncrement = -maxTranslationAcceleration;
        }
        if (leftThumbstickYIncrement > maxTranslationAcceleration) {
          leftThumbstickYIncrement = maxTranslationAcceleration;
        }
        if (leftThumbstickYIncrement < -maxTranslationAcceleration) {
          leftThumbstickYIncrement = -maxTranslationAcceleration;
        }

        //apply translation to current translation speed forward and backward
        currentTranslationSpeed.x += leftThumbstickXIncrement;
        currentTranslationSpeed.z += leftThumbstickYIncrement;

      }
      //get value of right thumbstick x axis
      if (this.xrInputRight.gamepad.axes.length > 0) {
        //use to rotate left right up or down
        var rightThumbstickX = this.controllerRight.gamepad.axes[3];
        var rightThumbstickY = this.controllerRight.gamepad.axes[2];
        //multiply by max increment
        var rightThumbstickXIncrement = rightThumbstickX * cameraMaxRotationSpeed;
        var rightThumbstickYIncrement = rightThumbstickY * cameraMaxRotationSpeed;
        //limit increment to max increment
        if (rightThumbstickXIncrement > maxRotationAcceleration) {
          rightThumbstickXIncrement = maxRotationAcceleration;
        }
        if (rightThumbstickXIncrement < -maxRotationAcceleration) {
          rightThumbstickXIncrement = -maxRotationAcceleration;
        }
        if (rightThumbstickYIncrement > maxRotationAcceleration) {
          rightThumbstickYIncrement = maxRotationAcceleration;
        }
        if (rightThumbstickYIncrement < -maxRotationAcceleration) {
          rightThumbstickYIncrement = -maxRotationAcceleration;
        }
        //apply rotation
        currentRotationSpeed.x += rightThumbstickXIncrement;
        currentRotationSpeed.y -= rightThumbstickYIncrement;

      }
      //
      //
      //
      // //calculate new position
      // var newCameraPosition = new THREE.Vector3(cameraPosition.x + currentTranslationSpeed.x, cameraPosition.y + currentTranslationSpeed.y, cameraPosition.z);
      // //calculate new rotation
      // var newCameraRotation = new THREE.Vector3(cameraRotation.x + currentRotationSpeed.x, cameraRotation.y + currentRotationSpeed.y, cameraRotation.z);
      // //calculate new quaternion
      // var newCameraQuaternion = new THREE.Quaternion(cameraQuaternion.x, cameraQuaternion.y, cameraQuaternion.z, cameraQuaternion.w);


      //decay the translation speed using the decay value and delta time
      currentTranslationSpeed.x -= currentTranslationSpeed.x * translationDecay * delta;
      currentTranslationSpeed.y -= currentTranslationSpeed.y * translationDecay * delta;
      currentTranslationSpeed.z -= currentTranslationSpeed.z * translationDecay * delta;
      //decay the rotation speed using the decay value and delta time
      currentRotationSpeed.x -= currentRotationSpeed.x * rotationDecay * delta;
      currentRotationSpeed.y -= currentRotationSpeed.y * rotationDecay * delta;
      currentRotationSpeed.z -= currentRotationSpeed.z * rotationDecay * delta;

      if (Math.abs(currentTranslationSpeed.x) < 0.001) {
        //if so, set it to 0
        currentTranslationSpeed.x = 0;
      }
      //check if the translation speed is less than 0.001
      if (Math.abs(currentTranslationSpeed.y) < 0.001) {
        //if so, set it to 0
        currentTranslationSpeed.y = 0;
      }

      //check if the rotation speed is less than 0.001
      if (Math.abs(currentRotationSpeed.x) < 0.001) {
        //if so, set it to 0
        currentRotationSpeed.x = 0;
      }
      //check if the rotation speed is less than 0.001
      if (Math.abs(currentRotationSpeed.y) < 0.001) {
        //if so, set it to 0
        currentRotationSpeed.y = 0;
      }

      //apply the translation speed to the xrDolly
      this.xrDolly.translateX(currentTranslationSpeed.x);
      this.xrDolly.translateY(currentTranslationSpeed.y);
      this.xrDolly.translateZ(currentTranslationSpeed.z);
      //apply the rotation speed to the camera
      this.xrDolly.rotateX(currentRotationSpeed.x);
      this.xrDolly.rotateY(currentRotationSpeed.y);
      this.xrDolly.rotateZ(currentRotationSpeed.z);

      // //if current speeds are not 0, log to console
      // if(currentTranslationSpeed.x != 0 || currentTranslationSpeed.y != 0 || currentTranslationSpeed.z != 0 || currentRotationSpeed.x != 0 || currentRotationSpeed.y != 0 || currentRotationSpeed.z != 0) {
      //     console.log("currentTranslationSpeed: ");
      //     console.log(currentTranslationSpeed);
      //     console.log("currentRotationSpeed: ");
      //     console.log(currentRotationSpeed);
      // }


    } else {
      //every minute or so, log the controller object to the console if we still don't have inputs
      var lastControllerLog = new Date();
      if (Date.now() - lastControllerLog > 60000) {
        console.log(this.controllerLeft);
        console.log(this.controllerRight);
        lastControllerLog = Date.now();
      }
    }


    //     var boostRotationSpeed = controllerLeft.getButtonState('grips') ? 0.1 : 0.02;
    //     var boostMoveSpeed = controllerRight.getButtonState('grips') ? 5.0 : 1.0;
    //     var angleX = null, angleY = null;
    //     var gamePadLeft = controllerLeft? controllerLeft.getGamepad() : nulll;
    //     var gamePadRight = controllerRight? controllerRight.getGamepad() : null;
    //     if (gamePadLeft) {
    //         angleX = gamePadLeft.axes[0];
    //         angleY = gamePadLeft.axes[1];
    //         brain.rotateX(boostRotationSpeed * angleX);
    //         brain.rotateZ(boostRotationSpeed * angleY);
    //         brain.matrixWorldNeedsUpdate = true;
    //         console.log("Left controller: " + angleX + ", " + angleY);
    //     }
    //
    //     if (gamePadRight) {
    //         angleX = gamePadRight.axes[0];
    //         angleY = gamePadRight.axes[1];
    //         if (controllerRight.getButtonState('thumbpad')) {
    //             brain.position.y += boostMoveSpeed * angleY;
    //         } else {
    //             brain.position.z += boostMoveSpeed * angleX;
    //             brain.position.x += boostMoveSpeed * angleY;
    //         }
    //         brain.matrixWorldNeedsUpdate = true;
    //     }
    //
    //     var v3Origin = new THREE.Vector3(0, 0, 0);
    //     var v3UnitUp = new THREE.Vector3(0, 0, -100.0);
    //     // var v3UnitFwd = new THREE.Vector3(0,0,1);

    var nearLeft = this.getNearestNodes(this.controllerLeft);
    var nearRight = this.getNearestNodes(this.controllerRight);
    var closestNodeIndexLeft = nearLeft.closestNodeIndex;
    var closestNodeDistanceLeft = nearLeft.closestNodeDistance;
    var closestNodeIndexRight = nearRight.closestNodeIndex;
    var closestNodeDistanceRight = nearRight.closestNodeDistance;

    //console.log("Left: " + closestNodeIndexLeft + ", " + closestNodeDistanceLeft);
    //console.log("Right: " + closestNodeIndexRight + ", " + closestNodeDistanceRight);

    // changed the always on true statement here because it was causing the nodes to be selected when the user was not touching the controller

    if (VRButton.xrSessionIsGranted) {
      if (this.controllerLeftSelectState && !this.controllerLeft.userData.isSelecting) {  //release Left Trigger
        var isLeft = true;
        var pointedObject = this.getPointedObject(this.controllerLeft);
        //updateNodeSelection(this.model, pointedObject, isLeft);
        //updateNodeMoveOver(this.model, pointedObject, 2); //2 is for left touch controller
        this.NodeManager.toggleSelectNode(pointedObject);
        this.NodeManager.highlightNode(pointedObject);
        //log event to console
        console.log("Left controller: " + this.controllerLeft.userData.isSelecting);
        //log selection to console
        console.log("Left controller: ");
        console.log(pointedObject);


      }
      if (this.controllerRightSelectState && !this.controllerRight.userData.isSelecting) {  //release Right Trigger
        var isLeft = true; //false;
        var pointedObject = this.getPointedObject(this.controllerRight);
        //updateNodeSelection(this.model, pointedObject, isLeft);
        //updateNodeMoveOver(this.model, pointedObject, 4); //4 is for right touch controller
        this.NodeManager.toggleSelectNode(pointedObject);
        this.NodeManager.highlightNode(pointedObject);
        //log event to console
        console.log("Right controller: " + this.controllerRight.userData.isSelecting);
        //log selection to console
        console.log("Right controller: ")
        console.log(pointedObject);
      }

      //updatenodemoveover
      var pointedObjectLeft = this.getPointedObject(this.controllerLeft);
      updateNodeMoveOver(this.model, pointedObjectLeft, 2); //todo: enum for hover mode type
      var pointedObjectRight = this.getPointedObject(this.controllerRight);
      updateNodeMoveOver(this.model, pointedObjectRight, 4);
      if (!pointedObjectLeft && !pointedObjectRight) {
        updateNodeMoveOver(this.model, null, 6);
      }

    }


    this.controllerLeftSelectState = this.controllerLeft.userData.isSelecting;
    this.controllerRightSelectState = this.controllerRight.userData.isSelecting;


    //     // Find all nodes within 0.1 distance from left Touch Controller
    //     var closestNodeIndexLeft = 0, closestNodeDistanceLeft = 99999.9;
    //     var closestNodeIndexRight = 0, closestNodeDistanceRight = 99999.9;
    //     for (var i = 0; i < brain.children.length; i++) {
    //         var distToNodeILeft = controllerLeft.position.distanceTo(brain.children[i].getWorldPosition());
    //         if ((distToNodeILeft < closestNodeDistanceLeft)) {
    //             closestNodeDistanceLeft = distToNodeILeft;
    //             closestNodeIndexLeft = i;
    //         }
    //
    //         var distToNodeIRight = controllerRight.position.distanceTo(brain.children[i].getWorldPosition());
    //         if ((distToNodeIRight < closestNodeDistanceRight)) {
    //             closestNodeDistanceRight = distToNodeIRight;
    //             closestNodeIndexRight = i;
    //         }
    //     }
    //
    //     var isLeft = (activateVR == 'left');
    //     if (controllerLeft.getButtonState('trigger')) {
    //         pointedNodeIdx = (closestNodeDistanceLeft < 2.0) ? closestNodeIndexLeft : -1;
    //
    //         if (pointerLeft) {
    //             // Touch Controller pointer already on! scan for selection
    //             if (controllerLeft.getButtonState('grips')) {
    //                 updateNodeSelection(model, getPointedObject(controllerLeft), isLeft);
    //             }
    //         } else {
    //             pointerLeft = drawPointer(v3Origin, v3UnitUp);
    //             controllerLeft.add(pointerLeft);
    //         }
    //         updateNodeMoveOver(model, getPointedObject(controllerLeft));
    //     } else {
    //         if (pointerLeft) {
    //             controllerLeft.remove(pointerLeft);
    //         }
    //         pointerLeft = null;
    //     }
    //
    if (this.controllerRight.userData.isSelecting) {  //getButtonState('trigger')) {
      //         pointedNodeIdx = (closestNodeDistanceRight < 2.0) ? closestNodeIndexRight : -1;

      //
      console.log("Right controller Trigger: " + this.controllerRight.userData.isSelecting);
      //         if (pointerRight) {
      //             // Touch Controller pointer already on! scan for selection
      //             if (controllerRight.getButtonState('grips')) {
      //                 updateNodeSelection(model, getPointedObject(controllerRight), isLeft);
      //             }
      //         } else {
      //             pointerRight = drawPointer(v3Origin, v3UnitUp);
      //             controllerRight.add(pointerRight);
      //         }
      //         updateNodeMoveOver(model, getPointedObject(controllerRight));
    } else {
      //         if (pointerRight) {
      //             controllerRight.remove(pointerRight);
      //         }
      this.pointerRight = null;
    }
  }; // scanOculusTouch

  // draw a pointing line
  //moved to xrInterface.js

  initControls = () => {
    // console.log("init controls");
    // this.controls = new OrbitControls(this.camera, this.canvas);
    // this.controls.enableDamping = true;
    // this.controls.dampingFactor = 0.25;
    // this.controls.enableZoom = true;
    // this.controls.autoRotate = false;
    // this.controls.autoRotateSpeed = 0.5;
    // this.controls.enablePan = true;
    // this.controls.enableKeys = true;
    // this.controls.minDistance = 10;
    // this.controls.maxDistance = 1000;
    // this.controls.listenToKeyEvents(this.renderer.domElement);
    // //the point in which orbit controls orbits.
    // this.controls.target = new THREE.Vector3(150, 150, 0);
    // this.resetCamera();
    // this.controls.update();
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    switch (this.controlMode) {
      case "orbit":
        this.controls = this.initOrbitControls();
        break;

      case "trackball":
        this.controls = this.initTrackballControls();
        break;
      case "firstPerson":
        this.controls = this.initFirstPersonControls();
        break;
      case "vr":
        //todo: rewrite spectator camera flow
        //this.controls = this.initVRControls();
        break;
      default:
        this.controls = this.initOrbitControls();
        break;
    }
    return this.controls;
  }

  initOrbitControls = () => {
    console.log("init orbit controls");
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.enablePan = true;
    this.controls.enableKeys = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 1000;
    this.controls.listenToKeyEvents(this.renderer.domElement);
    //the point in which orbit controls orbits.
    this.controls.target = new THREE.Vector3(150, 150, 0);
    this.resetCamera();
    this.controls.update();
    this.controlMode = "orbit";
    return this.controls;
  }


  initTrackballControls = () => {
    console.log("init trackball controls");
    this.controls = new TrackballControls(this.camera, this.canvas);
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.noZoom = false;
    this.controls.noPan = false;
    this.controls.staticMoving = true;
    this.controls.dynamicDampingFactor = 0.3;
    this.resetCamera();
    this.controls.update();
    this.controlMode = "trackball";
    return this.controls;
  }


  // initialize scene: init 3js scene, canvas, renderer and camera; add axis and light to the scene
  initScene = () => {
    console.log("init scene");


    this.brain = new THREE.Group();
    this.scene.add(this.brain);

    //Adding light
    this.scene.add(new THREE.HemisphereLight(0x606060, 0x080820, 1.5));
    this.scene.add(new THREE.AmbientLight(0x606060, 1.5));
    let light = new THREE.PointLight(0xffffff, 1.0, 10000);
    light.position.set(1000, 1000, 100);
    this.scene.add(light);

    this.axeshelper = new THREE.AxesHelper(5);
    this.scene.add(this.axeshelper);

    //addNodeLabel();
  };

  resetCamera = () => {
    console.log("default camera position");
    this.camera.position.set(350, 658, -50);
    this.camera.lookAt(150, 150, 0)
    //set camera rotation to 0
    this.camera.rotation.set(0, 0, 0);
    //set camera forward to positive z
    this.camera.up.set(0, 0, 1);
    if (this.controls && this.controls.reset) {
      // reset the orientation of the controls
      this.controls.reset();
    }
    this.camera.updateProjectionMatrix();
  };

  reInitEdgeFlare = () => {
    return;
    //console.log("reInitEdgeFlare");
    this.removeEdgeFlare();
    this.initEdgeFlare();
  }

  removeEdgeFlare = () => {
    //console.log("removeEdgeFlare");
    this.edgeFlareGeometry.dispose();
    this.edgeFlareMaterial.dispose();
    this.scene.remove(this.edgeFlarePoints);
    this.edgeFlareVertices = [];
    this.displayedEdgeFlareTravelPercentages = [];
  }

  initEdgeFlare = () => {
    return;
    //console.log("initEdgeFlare");
    //console.log("Current value of  this.edgeFlareVisible: " + this.edgeFlareVisible);
    //count active edges in each node from get active edges function
    let count = 0;
    let edges = this.getAllSelectedNodesActiveEdges();
    //console.log("init Edge Flare Edges: ");
    //console.log(edges);
    let colorMatchMap = [];
    let instanceGroup = null;

    for (let i = 0; i < edges.length; i++) {
      count += edges[i][1].length;

      let material = getNormalMaterial(this.model, edges[i][0].object.name.group);
      // index, length, and color, should be enough...
      colorMatchMap[i] = [edges[i][1].length, material.color];
      //log out the color
      // console.log("hex color: ");
      // console.log(tempColor.getHexString());
    }
    //console.log("Count: ", count);

    for (let i = 0; i < edges.length; i++) {
      for (let j = 0; j < edges[i][1].length; j++) {
        let x = 0.0;
        let y = 0.0;
        let z = 0.0;
        let positions = this.NodeManager.getNodePosition(edges[i][0]);
        x = positions.x;
        y = positions.y;
        z = positions.z;
        this.edgeFlareVertices.push(x, y, z);
        this.displayedEdgeFlareTravelPercentages[i] = 0.0
      }
    }

    // for ( let i = 0; i < count; i ++ ) {
    //     // let x = THREE.MathUtils.randFloatSpread(0);
    //     // let y = THREE.MathUtils.randFloatSpread(0);
    //     // let z = THREE.MathUtils.randFloatSpread(0);
    //     let x = 0.0;
    //     let y = 0.0;
    //     let z = 0.0;
    //     if (this.edgeFlareVisible && this.displayedEdges && this.displayedEdges[i]) {
    //         //this.edgeFlareVertices[i * 3]
    //         x = this.displayedEdges[i].geometry.attributes.position.array[0];
    //         //x = edges[i].geometry.attributes.position.array[0];
    //         //this.edgeFlareVertices[i * 3 + 1]
    //         y = this.displayedEdges[i].geometry.attributes.position.array[1];
    //         //y = edges[i].geometry.attributes.position.array[1];
    //         //this.edgeFlareVertices[i * 3 + 2]
    //         z = this.displayedEdges[i].geometry.attributes.position.array[2];
    //         //z = edges[i].geometry.attributes.position.array[2];
    //     }
    //
    //
    //     this.edgeFlareVertices.push( x, y, z );
    //     this.displayedEdgeFlareTravelPercentages[i] = 0.0
    // }

    this.edgeFlareGeometry = new THREE.BufferGeometry();
    this.edgeFlareGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.edgeFlareVertices, 3));
    this.edgeFlareMaterial = new THREE.PointsMaterial({vertexColors: true, size: 3.0});
    this.edgeFlareColors = new Float32Array(count * 3);

    // populate the color array from the colorMatchMap
    // colorMatchMap.count in each object in the map is the basis number for
    // how many vertices to colorize with the color in that object
    let colorIndex = 0;

    for (let i = 0; i < colorMatchMap.length; i++) {
      let [count, color] = colorMatchMap[i];
      const colorR = color.r;
      const colorG = color.g;
      const colorB = color.b;
      for (let j = 0; j < count; j++) {
        this.edgeFlareColors[3 * colorIndex] = colorR;
        this.edgeFlareColors[3 * colorIndex + 1] = colorG;
        this.edgeFlareColors[3 * colorIndex + 2] = colorB;
        colorIndex++;
      }
    }
    if (colorIndex !== count) {
      console.log("colorIndex should equal count");
      throw new Error("colorIndex should equal count");
    }

    //log color list
    this.edgeFlareGeometry.setAttribute('color', new THREE.Float32BufferAttribute(this.edgeFlareColors, 3));
    this.edgeFlareGeometry.colorsNeedUpdate = true;
    this.edgeFlarePoints = new THREE.Points(this.edgeFlareGeometry, this.edgeFlareMaterial);
    this.edgeFlarePoints.name = "EdgeFlare";


    this.scene.add(this.edgeFlarePoints);
  }

  resetBrainPosition = () => {
    this.brain.updateMatrix();
    this.brain.position.set(0, 0, 0);
    this.brain.rotation.set(0, 0, 0);
    this.brain.rotation.x = -Math.PI / 2;
    this.brain.scale.set(1, 1, 1);
    this.brain.updateMatrix();
    this.brain.matrixWorldNeedsUpdate = true;
  };

  initCamera = () => {
    console.log("init camera");
    this.camera = new THREE.PerspectiveCamera(75, (window.innerWidth / 2) / window.innerHeight, 0.1, 3000);
    this.camera.updateProjectionMatrix();
    this.resetCamera();
    return this.camera;
  }
  // create 3js elements: scene, canvas, camera and controls; and init them and add skybox to the scene
  createCanvas = () => {
    console.log("createCanvas");
    this.scene = new THREE.Scene();
    let gl = this.canvas.getContext('webgl2', {alpha: true, antialias: true, xrCompatible: true});
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      context: gl,
      alpha: true,
      canvas: this.canvas,
    });
    // set size of this.canvas to match half the window size
    this.canvas.width = window.innerWidth / 2;
    this.canvas.height = window.innerHeight;
    this.renderer.setSize(window.innerWidth / 2, window.innerHeight);
    //todo window.devicepixelratio can change.
    // need to write a listener to handle when it does.
    // matching pixel ratio to window.devicepixelratio
    // makes the canvas look its best on across all devices
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
    this.updatePixelRatio();
    //this.canvas.appendChild(this.renderer.domElement);


  };


  updatePixelRatio = () => {
    if (this.stopListeningForPixelChange != null) {
      this.stopListeningForPixelChange();
    }
    const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
    const media = matchMedia(mqString);
    media.addEventListener("change", this.updatePixelRatio);
    this.stopListeningForPixelChange = () => {
      media.removeEventListener("change", this.updatePixelRatio);
    };

    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  //toggle between control modes when 'c' is pressed
  toggleControlMode = () => {
    // remove the current controls
    this.controls.dispose();
    // toggle between control modes
    this.controls = null;
    switch (this.controlMode) {
      case 'orbit':
        this.initTrackballControls();
        break;
      case 'trackball':
        this.controls = new ArcballControls(this.camera, this.renderer.domElement);
        this.controlMode = 'arcball';
        break;
      case 'arcball':
        this.initOrbitControls();

        break;
      default:
        this.initOrbitControls();
        break;
    }

    console.log("controlMode: " + this.controlMode);


  }

  //display details of the selected nodes
  displaySelectedNodeDetails = () => {

    // graph some data
    //generate some fake data
    let fakeData = [];
    for (let i = 0; i < 25; i++) {
      fakeData.push(Math.random());
    }
    this.lineplotData = fakeData;
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
      }
    }

    this.addNodeLabel(this.lineplotCanvas);

    //let graph = new canvasGraph(this.lineplotCanvas, this.lineplotData, this.graphOptions); // canvas, data, options
    let graph = new canvasGraph(this.lineplots[0], this.lineplotData, this.graphOptions); // canvas, data, options
    //this.flatMesh.position.set(-0.35, 0.4, 0);

  }

  //listen for key presses
  keyPress = (event) => {
    //remove the event listener for keypresses if it is already listening
    //window.removeEventListener('keypress', this.keyPress, false);

    if(searchMode) return;

    if (event.key === 'c') {
      console.log("toggle control mode");
      this.toggleControlMode();
    }
    if (event.key === 'r') {
      this.resetCamera();
    }
    if (event.key === 'b') {
      this.resetBrainPosition();
    }
    if (event.key === 'l') {
      this.toggleLabels();
    }
    if (event.key === 'j') {
      toggleFloatingLabel();
    }
    if (event.key === 'f') {
      this.toggleFlare();
    }
    if (event.key === 'p') {
      this.toggleParticles();
    }
    if (event.key === 'k') {
      //this.labelAll();
      // this.NodeManager.selectAll();

        // this.NodeManager.selectNode(this.NodeManager.index2node(i));
        if (this.edgesAllOn === false) {
          for(let i=0; i<this.model.getDataset().length;i++) {
            this.drawEdgesGivenIndex(i);
          }
          this.edgesAllOn = true;
        } else {
          for(let i=0;i<this.model.getDataset().length;i++) {
            this.removeEdgeGivenIndex(i);
          }
          this.edgesAllOn = false;
        }
      }

    if (event.key === 'g') {
      this.displaySelectedNodeDetails();
    }
    if (event.key === 's') {
      //toggle slice images.
      if (this.imageSlices) {
        this.imageSlices.toggleSlices();
      }
    }
    if (event.key === 'd') {
      // dump camera and controller to console.
      console.log('dumping camera and controller to console');
      console.log("Camera: ");
      console.log(this.camera);
      console.log("2D Controls: ");
      console.log(this.controls);

    }
    //if even key is spacebar, unselect all nodes
    if (event.key === ' ') {
      console.log("unselect all nodes");
      this.reset();
    }

    if(event.key === 'h') {
      //toggle help menu
      this.toggleHelp();
    }

    if(event.key === 't') {
      //if there are two nodes selected, trigger the PathFinder
      console.log("triggering pathfinder")
      if(this.NodeManager.selectedNodes.length === 2) {
        this.pathFinder = new PathFinder(this.NodeManager, this);
        //console.log("triggering pathfinder");
        console.log("selected nodes: ");
        console.log(this.NodeManager.selectedNodes);
        this.pathFinder.setActiveAlgorithm("Dijkstra"); //Pathfinder auto detects if there are two nodes.
        //deactivate edges on the selected nodes
        for(let i = 0; i < this.NodeManager.selectedNodes.length; i++) {
          this.removeEdgeGivenNode(this.NodeManager.index2node(this.NodeManager.selectedNodes[i]));
        }
        //this.pathFinder.setStartNode(this.NodeManager.index2node(this.NodeManager.selectedNodes[0]));
        //this.pathFinder.setEndNode(this.NodeManager.index2node(this.NodeManager.selectedNodes[1]));

        //this.PathFinder.setActiveHeuristic("Euclidean"); //not yet implemented
        this.pathFinder.setCallbackOnFinish(this.pathfinderFinished);
        this.pathFinder.setCallbackOnFailure(this.pathfinderFailed);
        if(this.pathFinder.getStatus() === 'ready') {
          this.pathFinder.start();
        } else {
          console.log("pathfinder is not ready to start");
          console.log("pathfinder status: " + this.pathFinder.getStatus());
        }
      } else {
        console.log("pathfinder not triggered. not enough nodes selected");
        console.log("selected nodes: ");
        console.log(this.NodeManager.selectedNodes);
      }
    }


    //re-add the event listener for keypresses

  }
  //callback for when the pathfinder finishes
  pathfinderFinished = (pathObject) => {
    console.log(pathObject);
    setTimeout(() => {
      let edgePoints = [];
      let nodesI = [];
      let pathLength = pathObject.path.length;

      for (let i = 0; i < pathLength; i++) {
        let nodeIndex = this.NodeManager.node2index(pathObject.path[i]);
        let node = this.NodeManager.index2node(nodeIndex);

        // Check if the node is the start node, else if it's not the end node, it's a middle node
        if (i === 0) { // start node
          this.NodeManager.scaleNodeByIndex(nodeIndex, 1.5);
          this.NodeManager.removeHighlight(node); // removing any previous highlight before setting our own
          this.NodeManager.highlightNode(node, 0xffffff); // white
        } else if (i === pathLength - 1) { // end node
          this.NodeManager.scaleNodeByIndex(nodeIndex, 1.5);
          this.NodeManager.removeHighlight(node); // removing any previous highlight before setting our own
          this.NodeManager.highlightNode(node, 0x000000); // black
        } else { // middle nodes
          this.NodeManager.scaleNodeByIndex(nodeIndex, 1.5);
          this.NodeManager.removeHighlight(node); // removing any previous highlight before setting our own
          this.NodeManager.highlightNode(node, 0x00ff00); // green
        }

        let point = this.NodeManager.getNodePosition(node);
        edgePoints.push(point);
        nodesI.push(nodeIndex);
      }

      // draw the path
      this.shortestPathEdges.push(this.drawEdgeWithName(edgePoints,"Dijkstra Path", nodesI,1));
    }, 50);

    console.log("pathfinder finished: " + pathObject + " path cost: " + pathObject.distance);
    this.pathFinder = null;
  }

  //callback for when the pathfinder fails
  pathfinderFailed = (pathObject) => {
    //pop an alert with the failure message
    alert("Pathfinder failed: " + pathObject.message);
    this.pathFinder = null;
    this.reset();
  }

  toggleHelp = () => {
    console.log(this.name);
    if(this.name == 'Left') {
      if (document.getElementById("helpMenu").classList.contains("hidden")) {
        console.log('showing help menu');
        this.showHelp();
      } else {
        console.log('hiding help menu');
        this.hideHelp();
      }
    }
  }

  showHelp = () => {
    //show help menu
    document.getElementById("helpMenu").classList.remove("hidden");
  }

  hideHelp = () => {
    //hide help menu
    document.getElementById("helpMenu").classList.add("hidden");
  }

  // toggle between showing and hiding labels
  toggleLabels = () => {
    if (this.labelsVisible) {
      console.log("removing labels");
      this.labelsVisible = false;
      this.nodeLabels.removeAllLabels();
      //this.hideLabels();
      //addNodeLabel();
    } else { //if (toggleFloatingLabel()) {
      console.log("adding labels");
      this.labelsVisible = true;
      //this.showLabels();
      //this.nodeLabels.addNodeLabel();
      this.nodeLabels.labelAllNodes();
    }
  }

  // toggle between showing and hiding edge flares
  toggleFlare = () => {
    if (!(this.edgeFlareVisible < 9)) {
      this.edgeFlareVisible = -1;// false;
      this.removeEdgeFlare();
      //this.reInitEdgeFlare();
      //this.hideEdgeFlare();
    } else {
      this.edgeFlareVisible += 1;// true;;
      this.reInitEdgeFlare();
      //this.showEdgeFlare();
    }
  }

  // toggle between showing and hiding particles
  toggleParticles = () => {
    if (this.particlesVisible) {
      this.particlesVisible = false;
      //this.hideParticles();
    } else {
      this.particlesVisible = true;
      //this.showParticles();
    }
  }

  // labelAllCallback = (nodeObject) => {
  //   let index = this.NodeManager.node2index(nodeObject);
  //   let region = this.model.getRegionByIndex(index);
  //
  //   this.addNodeLabel();
  //   this.updateNodeLabel(index+'_'+region.name,nodeObject);
  //   this.animatePV();
  // }
  //
  // // select and label all nodes
  // labelAll = () => {
  //   this.NodeManager.nodeSelectedCallback = this.labelAllCallback;
  //   this.labelsVisible = true;
  //   this.NodeManager.selectAll();
  //   this.rebindNodeManagerCallbacks();
  //   // this.NodeManager.deselectAll();
  //   this.labelsVisible = false;
  //   // this.model.setThreshold(0.0);
  // }


  // initialize scene: init 3js scene, canvas, renderer and camera; add axis and light to the scene
  //todo is this sort of infinite recursion intentional?

  // using => instead of function(){} to preserve this context
  // there are a few other places where this could be done as well
  setEventListeners = () => {
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mouseup', (e) => {
      onMouseUp(this, e);
    });
    window.addEventListener('mousemove', (e) => {
      onDocumentMouseMove(this.model, e);
    }, true);
    window.addEventListener('resize', this.resizeScene, false);
    window.addEventListener('keypress', this.keyPress, false);
  };

  // update node scale according to selection status
  //replacing updateNodeGeometry to NodeManager calls.
  //if you see a lot of NodeManager calls outside this file, it is because
  //I am trying to replace the old updateNodeGeometry function with NodeManager calls.
  //however drawing is handling a lot of behavior that should be handled by NodeManager
  // or vice versa depending on how you look at it.

  // updateNodeGeometry = (nodeObject, status, nodeIndex) => {
  //     // console.log("updateNodeGeometry");
  //     // console.log("new status: " + status);
  //     // console.log("nodeObject: ");
  //     // console.log(nodeObject);
  //     //let objectParent = nodeObject.object;
  //
  //
  //
  //     if(nodeIndex) {
  //         nodeObject = this.NodeManager.index2node(nodeIndex);
  //     }
  //
  //     if(!nodeObject || !nodeObject.object || !nodeObject.object.name) { //todo why is this happening?
  //         console.log('please do not feed non nodeObjects to updateNodeGeometry');
  //         return;
  //     }
  //     // }
  //     // let objectParent = this.instances[nodeObject.object.name.group][nodeObject.object.name.hemisphere];
  //     //
  //     // //do the above two lines reference the same object?
  //     // //log them both, while they are the same if a nodeobject from another preview window is passed in they will be different in some ways.
  //     // // using this.instances[objectParent.name.group][objectParent.name.hemisphere] is the correct way to get the objectParent
  //     // console.log("objectParent: ");
  //     // console.log(objectParent);
  //
  //
  //     let scale = 1.0;
  //     let delta = this.clock.getDelta();
  //     let matrix = new THREE.Matrix4();
  //     //console.log("NodeObject: ");
  //     //console.log(nodeObject);
  //     let position = new THREE.Vector3();
  //     let quaternion = new THREE.Quaternion();
  //     let scaleVector = new THREE.Vector3();
  //
  //     // get the position of the instanced node, not sure here which to use or if identical.
  //     nodeObject.object.getMatrixAt(nodeObject.instanceId, matrix);
  //     //objectParent.getMatrixAt(nodeObject.instanceId, matrix);
  //     position.setFromMatrixPosition(matrix);
  //     //matrix.decompose(position, quaternion, scaleVector);
  //
  //     //log position, quaternion and scaleVector
  //     // console.log("position: ");
  //     // console.log(position);
  //     let datasetIndex = this.NodeManager.node2index(nodeObject);
  //     switch (status) {
  //         case 'normal':
  //             //check if datasetIndex is in selectedNodes already if it is not, then do nothing
  //             if (!objectParent.isSelected(nodeObject)) {
  //                 console.log("setting normal, but datasetIndex not in selectedNodes," +
  //                     "may be normalizing unhandled state. Recommend unselecting directly following this" +
  //                     " call");
  //             }
  //             console.log("normal");
  //             let color = new THREE.Color(scaleColorGroup(this.model,nodeObject.object.name.group));
  //             // restore nodeObject to original scale and color
  //             objectParent.setColorAt(nodeObject.instanceId, color);
  //             //if object was scaled, restore it
  //             //if (nodeObject.object.userData.scaledBy != 1.0) {
  //                 //restore scale
  //             scale = 1.0;
  //             matrix.identity();
  //             matrix.makeTranslation(position.x, position.y, position.z);
  //             objectParent.setMatrixAt(nodeObject.instanceId, matrix);
  //             objectParent.instanceMatrix.needsUpdate = true;
  //             objectParent.userData.selectedNodes = objectParent.userData.selectedNodes.filter(id => id != datasetIndex);
  //             // set the matrix dirty
  //             objectParent.instanceColor.needsUpdate = true;
  //             //this.updateScene();
  //             break;
  //
  //         case 'mouseover':
  //             console.log("mouseover");
  //             //todo track mouseover.
  //             //break;
  //             scale = 1.72;
  //             matrix.scale(new THREE.Vector3(scale, scale, scale));
  //             objectParent.setMatrixAt(nodeObject.instanceId, matrix);
  //             objectParent.instanceMatrix.needsUpdate = true;
  //             objectParent.setColorAt(nodeObject.instanceId, new THREE.Color((delta * 10.0), (1.0 - delta * 10.0), (0.5 + delta * 5.0)));
  //             objectParent.instanceColor.needsUpdate = true;
  //
  //             return;
  //
  //         case 'selected':
  //             console.log("selected state");
  //             if (!objectParent.isSelected(nodeObject)) {
  //                 objectParent.select(nodeObject);
  //                 console.log("Added to selectedNodes: " + datasetIndex);
  //                 console.log("Please adjust calling function to check if node is already selected.");
  //                 console.log("Applying scale and translation may cause problems if node is already selected.");
  //                 console.log("it may have been called from an event on another preview window.");
  //             }
  //             //objectParent.getMatrixAt(nodeObject.instanceId, matrix);
  //             scale = 8 / 3;
  //             //nodeObject.object.userData.scaledBy = scale;
  //             matrix.identity();
  //             matrix.makeTranslation(position.x, position.y, position.z);
  //             matrix.scale(new THREE.Vector3(scale, scale, scale));
  //             objectParent.setMatrixAt(nodeObject.instanceId, matrix);
  //             objectParent.instanceMatrix.needsUpdate = true;
  //             // if node is not on list of selectedNodes, add it
  //             //this.drawConnections();//better done in mouseclick
  //
  //             objectParent.setColorAt(nodeObject.instanceId, new THREE.Color( 1, 1, 1));
  //             objectParent.instanceColor.needsUpdate = true;
  //             //this.updateScene();
  //             break;
  //
  //         case 'root':
  //             console.log("root");
  //
  //             scale = 10 / 3;
  //
  //
  //             matrix.scale(new THREE.Vector3(scale, scale, scale));
  //             objectParent.setMatrixAt(nodeObject.instanceId, matrix);
  //             objectParent.instanceMatrix.needsUpdate = true;
  //             let oldColor = new THREE.Color();
  //             objectParent.getColorAt(nodeObject.instanceId, oldColor);
  //
  //             objectParent.setColorAt(nodeObject.instanceId, new THREE.Color(scaleColorGroup(this.model, nodeObject.object.name.group)));
  //             console.log("newColor: ");
  //             console.log(scaleColorGroup(this.model, nodeObject.object.name.group));
  //             objectParent.instanceColor.needsUpdate = true;
  //
  //             break;
  //
  //         default:
  //             console.log("default");
  //             console.log("status: " + status);
  //     }
  //
  //     objectParent.needsUpdate = true;
  //
  //     return datasetIndex;
  // };

  animateNodeBreathing = (nodeList) => {
    return;
    //const amplitude =  0.015;
    var scaleFrequency = this.frequency; //0.5;
    var scaleAmplitude = this.amplitude;
    var delta = this.clock.getDelta();
    var elapsedTime = this.clock.getElapsedTime();
    var dataset = this.model.getDataset()

    //this.drawConnections

    var nodeIdx;
    for (var i = 0; i < nodeList.length; i++) {
      nodeIdx = nodeList[i];
      // draw only edges belonging to active nodes
      if ((nodeIdx >= 0) && model.isRegionActive(this.model.getGroupNameByNodeIndex(nodeIdx))) {
        // two ways to draw edges
        //glyphs[nodeIdx].material.color = new THREE.Color(scaleColorGroup(model, dataset[nodeIndex].group));
        //todo update to use instance nodes
        var glyphscale = glyphs[nodeIdx].scale.toArray();//.get();
        var newscale0 = glyphscale[0] + scaleAmplitude * Math.sin(2 * Math.PI * scaleFrequency * elapsedTime);
        var newscale1 = glyphscale[1] + scaleAmplitude * Math.sin(2 * Math.PI * scaleFrequency * elapsedTime);
        var newscale2 = glyphscale[2] + scaleAmplitude * Math.sin(2 * Math.PI * scaleFrequency * elapsedTime);

        //console.log(glyphscale);

        //glyphs[nodeIdx].scale.fromArray(newscale);
        //glyphs[nodeIdx].scale.set(newscale0, newscale1, newscale2);
      }
    }
  }


  // update node scale according to selection status
  animateNodeShimmer = (nodeList, freq = 0.5, color) => { //nodeIndex, status) {
    //var clock = new THREE.Clock();
    // Set up an oscillating size animation
    var colorAmplitude = this.amplitude * 500; // 0.75;
    var colorFrequency = this.frequency * freq / 0.5;
    var delta = this.clock.getDelta();
    var elapsedTime = this.clock.getElapsedTime();
    var dataset = this.model.getDataset()

    //this.drawConnections

    var nodeIdx;
    for (var i = 0; i < nodeList.length; i++) {
      nodeIdx = nodeList[i];
      // draw only edges belonging to active nodes
      if ((nodeIdx >= 0) && this.model.isRegionActive(this.model.getGroupNameByNodeIndex(nodeIdx))) {
        // two ways to draw edges
        //glyphs[nodeIdx].material.color = new THREE.Color(scaleColorGroup(model, dataset[nodeIndex].group));
        var baseColor = new THREE.Color(scaleColorGroup(this.model, dataset[nodeIdx].group));
        var deltaColor = new THREE.Color(colorAmplitude * Math.sin(2 * Math.PI * colorFrequency * elapsedTime), 0, 0);      //delta * 180, delta * 10, delta * 10);
        var tempColor = new THREE.Color();
        tempColor.lerpColors(baseColor, deltaColor, 0.5);
        if (color) {
          var newColor = new THREE.Color(color);
          tempColor.lerpColors(tempColor, newColor, colorAmplitude * Math.sin(2 * Math.PI * colorFrequency * elapsedTime));
        }
        //todo apply color to correct instance nodes
        //glyphs[nodeIdx].material.color = tempColor; //new THREE.Color(baseColor[0] + delta * 12, baseColor[1]+delta * 2, baseColor[2]+delta * 5);
        //console.log(elapsedTime, baseColor, deltaColor, tempColor)
      }
    }
  };

  // updateNodesColor() {
  //   //todo disabled as duplicate.
  //   let dataset = this.model.getDataset();
  //     for (let i = 0; i < dataset.length; ++i) {
  //         //glyphs[i].material.color = new THREE.Color(scaleColorGroup(model, dataset[i].group));
  //         //todo apply color to correct instance nodes, also a good reason to write an instance node getter
  //         //   and setter function
  //     }
  // };

  removeNodesFromScene = () => {
    // for (var i = 0; i < glyphs.length; ++i) {
    //     brain.remove(glyphs[i]);
    //     delete glyphNodeDictionary[glyphs[i].uuid];
    // }
    // glyphs = [];

    // this is the same as removing all the instance nodes now.
    this.removeInstanceNodesFromScene();
  };

  removeInstanceNodesFromScene = () => {
    for (let key in this.instances) {
      for (let key2 in this.instances[key]) {
        const instance = this.instances[key][key2];
        this.scene.remove(instance);

        // Assuming instances have a .dispose() method to release resources
        if (typeof instance.dispose === 'function') {
          instance.dispose();
        }
      }
    }
    this.instances = {}; // Reset instances
  }

  animateEdges = () => {
    return;
    //console.log("animateEdges");
    //console.log("Current value of  this.edgeFlareVisible: " + this.edgeFlareVisible);
    // console.log("Current value of  this.displayedEdges: ");
    // console.log(this.displayedEdges);

    const positions = this.edgeFlareGeometry.attributes.position;
    const material = this.edgeFlareMaterial;
    let groupVal = null;
    for (let i = 0; i < this.displayedEdges.length; ++i) {
      let nodeIdx = this.displayedEdges[i].name;

      //let groupVal = null;
      if (this.model.getDataset()[nodeIdx] !== undefined)
        groupVal = this.model.getDataset()[nodeIdx].group;
      let firerate = 0.01;
      if (typeof (groupVal) !== 'string' && !isNaN(Number(groupVal))) {
        firerate = (groupVal % 10) / 100;
      }

      if (this.edgeFlareVisible < 0) {
        return;
      }

      if (!this.edgeFlareVisible) {
        this.displayedEdgeFlareTravelPercentages[i] += firerate;
        //brain.remove(this.displayedEdges[i]);
        this.edgeFlareVertices[i * 3] = this.displayedEdges[i].geometry.attributes.position.array[0] + this.displayedEdgeFlareTravelPercentages[i] * (this.displayedEdges[i].geometry.attributes.position.array[3] - this.displayedEdges[i].geometry.attributes.position.array[0]);
        this.edgeFlareVertices[i * 3 + 1] = this.displayedEdges[i].geometry.attributes.position.array[1] + this.displayedEdgeFlareTravelPercentages[i] * (this.displayedEdges[i].geometry.attributes.position.array[4] - this.displayedEdges[i].geometry.attributes.position.array[1]);
        this.edgeFlareVertices[i * 3 + 2] = this.displayedEdges[i].geometry.attributes.position.array[2] + this.displayedEdgeFlareTravelPercentages[i] * (this.displayedEdges[i].geometry.attributes.position.array[5] - this.displayedEdges[i].geometry.attributes.position.array[2]);
        if (this.displayedEdgeFlareTravelPercentages[i] > 1.0) {
          this.displayedEdgeFlareTravelPercentages[i] = 0.0;
        }
      } else {
        let dX = this.displayedEdges[i].geometry.attributes.position.array[3] - this.displayedEdges[i].geometry.attributes.position.array[0];
        let dY = this.displayedEdges[i].geometry.attributes.position.array[4] - this.displayedEdges[i].geometry.attributes.position.array[1];
        let dZ = this.displayedEdges[i].geometry.attributes.position.array[5] - this.displayedEdges[i].geometry.attributes.position.array[2];

        // Create a new vector with components dX, dY, dZ
        let vector = new THREE.Vector3(dX, dY, dZ);

        // Normalize the vector
        vector.normalize();


        this.edgeFlareVertices[i * 3] += vector.x * firerate * this.edgeFlareVisible; // this.displayedEdges[i].geometry.attributes.position.array[0];
        this.edgeFlareVertices[i * 3 + 1] += vector.y * firerate * this.edgeFlareVisible; // this.displayedEdges[i].geometry.attributes.position.array[1];
        this.edgeFlareVertices[i * 3 + 2] += vector.z * firerate * this.edgeFlareVisible; // this.displayedEdges[i].geometry.attributes.position.array[2];

        // Create a new vector with components edgeFlareVertices (X, Y, Z
        var vectorFlare = new THREE.Vector3(this.edgeFlareVertices[i * 3], this.edgeFlareVertices[i * 3 + 1], this.edgeFlareVertices[i * 3 + 2]);

        let endX = this.displayedEdges[i].geometry.attributes.position.array[3]; // - this.displayedEdges[i].geometry.attributes.position.array[0];
        let endY = this.displayedEdges[i].geometry.attributes.position.array[4]; // - this.displayedEdges[i].geometry.attributes.position.array[1];
        let endZ = this.displayedEdges[i].geometry.attributes.position.array[5]; // - this.displayedEdges[i].geometry.attributes.position.array[2];

        // Create a new vector with components endX, endY, endZ
        var vectorEnd = new THREE.Vector3(endX, endY, endZ);

        var difference = new THREE.Vector3().subVectors(vectorFlare, vectorEnd);

        if (difference.length() <= firerate * this.edgeFlareVisible) {
          //console.log("vectorFlare and vectorEnd are within 1 unit of each other.");
          this.edgeFlareVertices[i * 3] = this.displayedEdges[i].geometry.attributes.position.array[0];
          this.edgeFlareVertices[i * 3 + 1] = this.displayedEdges[i].geometry.attributes.position.array[1];
          this.edgeFlareVertices[i * 3 + 2] = this.displayedEdges[i].geometry.attributes.position.array[2];
        } // else {
        //     console.log("vectorM and vectorN are more than 1 unit apart.");
        // }
      }

      positions.setXYZ(i, this.edgeFlareVertices[i * 3], this.edgeFlareVertices[3 * i + 1], this.edgeFlareVertices[3 * i + 2]);
      //      let fromNodeColor = this.displayedEdges[i].geometry.attributes.color.array.slice(0, 3);
      //        material.color.setRGB(i, fromNodeColor[0], fromNodeColor[1], fromNodeColor[2]);


    }

    positions.needsUpdate = true;

    //this.displayedEdges = [];

    //this.animateShortestPathEdges();
  };

  animateStars = () => {
    const positions = this.edgeFlareGeometry.attributes.position;

    for (var i = 0; i < this.edgeFlareVertices.length; i++) {  //} displayedEdges.length; ++i) {
      //brain.remove(this.displayedEdges[i]);
      this.edgeFlareVertices[i] += 0.1;
      if (this.edgeFlareVertices[i] > 1000.0) {
        this.edgeFlareVertices[i] = -1000.0;
      }

      if (i % 3 == 0) {
        positions.setXYZ(i, this.edgeFlareVertices[i], this.edgeFlareVertices[i + 1], this.edgeFlareVertices[i + 2]);
      }
    }

    positions.needsUpdate = true;

    //this.displayedEdges = [];

    //this.animateShortestPathEdges();
  };

  refreshEdges = () => {
    for(let i=0;i<this.model.getDataset().length;i++) {
      this.removeEdgeGivenIndex(i);
    }

    this.removeShortestPathEdgesFromScene();

    for(let i=0;i<this.model.getDataset().length;i++) {
        this.drawEdgesGivenIndex(i);
    }
    // this.edgesAllOn = true;
    // } else {


}

  removeEdgesFromScene = () => {
    return;
    for (let i = 0; i < this.displayedEdges.length; ++i) {
      this.brain.remove(this.displayedEdges[i]);
    }
    this.displayedEdges = [];

    this.removeShortestPathEdgesFromScene();
  };

  removeEdgeGivenNode = (node) => {
    // console.log("RemoveEdges from a node.");
    // console.log(this.displayedEdges);
    //get all edges from brain with name index
    let index = this.NodeManager.node2index(node);
    //from this.displayedEdges get all edges with name index
    let edges = this.displayedEdges.filter(edge => edge.name === index);
    //remove all edges from brain
    for (let i = 0; i < edges.length; ++i) {
      this.brain.remove(edges[i]);
    }
    //remove all edges from displayedEdges
    this.displayedEdges = this.displayedEdges.filter(edge => edge.name !== index);
  }

  removeEdgeGivenIndex = (nodeIndex) => {
    let node = this.NodeManager.index2node(nodeIndex);
    this.removeEdgeGivenNode(node);
  }

  removeShortestPathEdgesFromScene = () => {
    for (var i = 0; i < this.shortestPathEdges.length; i++) {
      this.brain.remove(this.shortestPathEdges[i]);
    }
    this.shortestPathEdges = [];
  };




  //say no to globals var lastTime = 0;
  //   var fps = 240;
  //todo: add fps slider
  // calls the animation updates.
  animatePV(time,frame) {
    this.NodeManager.update();
    if(this.pathFinder && this.pathFinder.active) {
      this.pathFinder.update();
    }
    if(this.xrInterface.isVRAvailable())
      this.xrInterface.update(this.xrInterface,time,frame);
    else
      // console.log("NOT XRing");
      if(this.linegraphs !== null)
        this.linegraphs.updateLinegraph();


    //limit this function to (fps)fps)
    // if (Date.now() - lastTime < 1000 / fps) {
    //     return;
    // }
    // lastTime = Date.now();
    //this.handleXRControllers();

    // if (enableVR && activateVR) {
    //     // if (oculusTouchExist) { //todo: Change old WebVR code to WebXR
    //     //     controllerLeft.update();
    //     //     controllerRight.update();
    // //todo re-enable scanOculusTouch when WebXR is working 100%
    // this.scanOculusTouch();
    //     console.log("scanOculusTouch");
    //     // }
    //     //vrControl.update(); //todo: Change old WebVR code to WebXR
    //     console.log("vrControl.update()");
    // } else if (mobile && 0) {  // todo: get code to work and re-enable by deleting && 0
    //     if (gearVRControllerExist) {
    //         controllerRight.update();
    //         scanGearVRController();
    //         console.log("gearVRControllerExist");
    //     }
    //     //vrControl.update();  // todo: get code working then enable
    //     console.log("vrControl.update()");
    // } else {
    //calculate delta for controls

        //var delta = clock.getDelta();

    //todo: update to account for instancing.
    //animateNodeShimmer(getNodesSelected(), 0.5);
    //animateNodeShimmer(getNodesFocused(), 4);//, "#ffffff")
    //animateNodeBreathing(getNodesSelected());
    //shimmerEdgeNodeColors();
    //updateNodesColor();

    //todo left this here out of curiosity. since this function is now a class
    //tod this should probably be called from drawing since it cares about previewAreaLeft and previewAreaRight
    //  we are within previewArea proper though and unless defined as a static
    //  class function it will not be able to access previewAreaLeft and previewAreaRight except
    //  through a callback or something (dirty global). Regardless of which previewArea is active, this function
    //  should be called from the previewArea class, of which we are within the scope of.
    // if(previewAreaLeft ) {
    //     previewAreaLeft.animateEdges();
    // }
    // if(previewAreaRight ) {
    //     previewAreaRight.animateEdges();
    // }

    this.animateEdges();

    // //update camera position, controls do this though so not sure if this is needed.
    // this.camera.updateProjectionMatrix();

    //console.log("controls.update() called");


    if (this.enableRender)
      //changed from effect.render to renderer.render
      this.renderer.render(this.scene, this.camera);


    //effect.requestAnimationFrame(animatePV); //effect no longer has this function. Maybe it is no longer required

    //window.requestAnimationFrame(animatePV); // todo: this is the old way of doing it. Consider in WebXR

  }

  // requestAnimate() {
  //     //effect.requestAnimationFrame(animatePV); //effect no longer has this function. Maybe it is no longer required
  //     //window.requestAnimationFrame(animatePV);
  //     this.animatePV();
  //     // controls.update()
  //     // renderer.render(scene, camera);
  //     console.log("requestAnimate called");
  // };

  enableRender = () => {
    this.enableRender = true;
  };

  disableRender = () => {
    this.enableRender = false;
  }

  toggleRender = () => {
    this.enableRender = !this.enableRender;
  }

  isVRAvailable = () => {
    // changed to xrInterface.isVRAvailable
    return this.xrInterface.isVRAvailable();
  };

  // this.isPresenting = function () {
  //     vrButton.isPresenting();
  // };

  redrawEdges = () => {
    this.removeEdgesFromScene(); // todo: works now?
    this.reInitEdgeFlare();
    // should only be removing the edges then calling drawEdgesGivenNodes based
    // on return of getActiveEdges, get Active edges applies the rules.
    let activeEdges = this.getAllSelectedNodesActiveEdges();  //remember already filtered.
    //filter activeEdges[0] to unique values
    for (let [edge, targets] of activeEdges) {
      this.drawEdgesGivenNode(edge);
    }
    this.redrawEdges();
  }

  //     if (getSpt())
  //         this.updateShortestPathEdges();
  //     //const activeEdges = this.getActiveEdges();
  //
  //     let matrix = new THREE.Matrix4();
  //     let targetPosition = new THREE.Vector3();
  //     let instancePosition = new THREE.Vector3();
  //
  //     for (let i = 0; i < activeEdges.length; i++) {
  //
  //         let indexNode = activeEdges[i][0];
  //         indexNode.object.getMatrixAt(indexNode.instanceId, matrix);
  //         instancePosition.setFromMatrixPosition(matrix);
  //
  //         for (let j = 0; j < activeEdges[i][1].length; ++j) {
  //             let edge  = [];
  //             edge.push(instancePosition);
  //             let targetNodeId = activeEdges[i][1][j].targetNodeId;
  //             let targetNode = this.NodeManager.index2node(targetNodeId);
  //             //test if targetNode is valid and has instanceId
  //             if(!targetNode || !targetNode.instanceId) {
  //                 console.log("targetNode is invalid or has no instanceId");
  //                 console.log("TargetNode: ");
  //                 console.log(targetNode);
  //                 continue;
  //             }
  //
  //             targetNode.object.getMatrixAt(targetNode.instanceId, matrix);
  //             targetPosition.setFromMatrixPosition(matrix);
  //             edge.push(targetPosition);
  //             // todo might need to dispose before replacing, look into it. this.displayedEdges.dispose();
  //             this.displayedEdges[this.displayedEdges.length] = this.drawEdgeWithName(edge, indexNode, [indexNode.instanceId, targetNodeId]);
  //         }
  //     }
  // };

  // determine if a region should be drawn
  shouldDrawRegion = (region) => {
    return (this.model.isRegionActive(region.group) && atlas.getLabelVisibility(region.label));
  };

  // updating scenes: redrawing glyphs and displayed edges
  updateScene = () => {
    console.log('%c  ' + 'updateScene', 'background: #222; color: #bada55');
    this.reset();
    this.refreshEdges()
  };

  removeAllInstances = () => {
    //redirect to this.NodeManager destructor
    this.NodeManager.destructor();
    return;
    // // Loop through all group names in this.instances
    // for (let group in this.instances) {
    //     // Check if the group has hemispheres
    //     if (this.instances.hasOwnProperty(group)) {
    //         // Get the left and right hemisphere objects
    //         let left = this.instances[group].left;
    //         let right = this.instances[group].right;
    //
    //         // Clear memory associated with the left hemisphere if it exists
    //         if (left && left.geometry && left.material) {
    //             left.geometry.dispose();
    //             left.material.dispose();
    //             this.brain.remove(left);
    //             this.instances[group].left = null;
    //         }
    //
    //         // Clear memory associated with the right hemisphere if it exists
    //         if (right && right.geometry && right.material) {
    //             right.geometry.dispose();
    //             right.material.dispose();
    //             this.brain.remove(right);
    //             this.instances[group].right = null;
    //         }
    //     }
    // }
  };


  // list groups in the dataset
  listGroups = () => {
    const dataset = this.model.getDataset();
    const groupSet = new Set();

    for (let i = 0; i < dataset.length; i++) {
      groupSet.add(dataset[i].group);
    }

    return Array.from(groupSet); // Convert the Set to an array
  }

  countGroupMembers = (group, hemisphere) => {
    const dataset = this.model.getDataset();

    const count = dataset.reduce((accumulator, data) => {
      if (data.group && (data.group === group || data.group.toString() === group) && data.hemisphere === hemisphere) {
        return accumulator + 1;
      }
      return accumulator;
    }, 0);

    return count;
  }
  // draw the brain regions as glyphs (the nodes)
  // assumes all nodes are visible, nothing is selected
  //replaced with NodeManager
  //  drawRegions = () => {
  //     let dataset = this.model.getDataset();
  //     console.log("Drawing All Regions");
  //
  //     // for each group and hemisphere in the dataset, create an instance mesh
  //     this.groups = this.listGroups(); //updates the list of groups
  //
  //     for (let i = 0; i < this.groups.length; i++) {
  //         let leftCount = this.countGroupMembers(this.groups[i], 'left');
  //         let rightCount = this.countGroupMembers(this.groups[i], 'right');
  //         this.instances[this.groups[i]] = {
  //             left: null,
  //             right: null
  //         };
  //
  //         // create instance mesh for each group and hemisphere
  //         let geometry = getNormalGeometry('left');
  //         let material = getNormalMaterial(this.model, this.groups[i]);
  //         // create the instance mesh with the number of nodes in the group
  //         this.instances[this.groups[i]].left = new THREE.InstancedMesh(geometry, material, leftCount);
  //         // set the color of the first instance to the group color
  //         this.instances[this.groups[i]].left.setColorAt(0, material.color);
  //
  //         geometry = getNormalGeometry('right');
  //         material = getNormalMaterial(this.model, this.groups[i]);
  //         this.instances[this.groups[i]].right = new THREE.InstancedMesh(geometry, material, rightCount);
  //         this.instances[this.groups[i]].right.setColorAt(0, material.color);
  //
  //         // name the instance with group_hemisphere
  //         this.instances[this.groups[i]].left.name = {
  //             group: this.groups[i],
  //             hemisphere: 'left',
  //             type: 'region'
  //         };
  //         this.instances[this.groups[i]].right.name = {
  //             group: this.groups[i],
  //             hemisphere: 'right',
  //             type: 'region'
  //         };
  //     }
  //
  //     // populate the instance meshes
  //     let topIndexes = {};
  //     for (let i = 0; i < dataset.length; i++) {
  //         // check if region is already in the topIndexes object
  //         if (topIndexes[dataset[i].group] === undefined) {
  //             topIndexes[dataset[i].group] = {
  //                 left: 0,
  //                 right: 0
  //             };
  //         }
  //
  //         // get the index of the instance mesh to add to
  //         let index = topIndexes[dataset[i].group][dataset[i].hemisphere];
  //         // get the instance mesh to add to
  //         let instance = this.instances[dataset[i].group][dataset[i].hemisphere];
  //         // instance.userData = {
  //         //     nodeIndex: i
  //         // }
  //
  //         //console.log("dataset[i].group: " + dataset[i].group);
  //         //console.log("index: " + i);
  //
  //         // get the position of the region
  //         let position = dataset[i].position;
  //         // set the position of the instance
  //         instance.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
  //         instance.setColorAt(index, instance.material.color);
  //         // increment the index
  //         topIndexes[dataset[i].group][dataset[i].hemisphere]++;
  //
  //         /////////////////////////////////
  //         // IMPORTANT: Any variable in userData must be prototypes here before being used
  //         // if there is no userData on the instance create it.
  //         // check if userData.indexList exists if it does push a new index into it at the end, the position should match the instanceId
  //         // if it doesn't exist create it and push the index into it
  //         if (instance.userData.indexList === undefined) {
  //             instance.userData.indexList = [];
  //         }
  //         instance.userData.indexList.push(i); // +1 because the index starts at 0
  //         // userData will need a list of selected since individual objects don't track this.
  //         // check if selectedNodes exists, if it doesn't, create it. Empty by default.
  //         if (instance.userData.selectedNodes === undefined) {
  //             instance.userData.selectedNodes = [];
  //         }
  //
  //         /*Get dataset index of given node. */
  //         instance.getDatasetIndex = function(nodeObject) {
  //             // get object parent
  //             let object = nodeObject.object;
  //             // correlate the dataset[].label to the instanceId
  //             // return parent.userData.indexList[nodeObject.instanceId];
  //             // add some error checking
  //             if (object.userData.indexList[nodeObject.instanceId] === undefined) {
  //                 console.log("Error: Could not find index for instanceId: " + nodeObject.instanceId);
  //                 return -1;
  //             } else {
  //                 return object.userData.indexList[nodeObject.instanceId];
  //             }
  //         };
  //         instance.getNodesInstanceFromDatasetIndex = function(index) {
  //             // search through all instances for the index in the userData.indexList
  //             // return the instanceId and the object
  //             // if the index is not found return -1
  //             /////console.log("Searching for index: " + index);
  //             //console.log(this);
  //             //check that userData.indexList exists
  //             if (this.userData.indexList === undefined) {
  //                 console.log("Error: userData.indexList is undefined");
  //                 return null;
  //             }
  //             for (let i = 0; i < this.userData.indexList.length; i++) {
  //                 if (this.userData.indexList[i] === index) {
  //                     /////console.log("Found index: " + index + " at instanceId: " + i);
  //                     return {
  //                         instanceId: i,
  //                         hemisphere: this.name.hemisphere,
  //                         group: this.name.group,
  //                         object: this
  //                     };
  //                 }
  //             }
  //             //console.log("Error: Could not find index: " + index);
  //             return null;
  //         }
  //
  //         instance.getSelectedNodes = ()=> {
  //             if(instance.userData.selectedNodes === undefined) {
  //                 instance.userData.selectedNodes = [];
  //             }
  //             return instance.userData.selectedNodes;
  //         }
  //
  //         /* accepts an array of indexes, sets these indexes as selected if they exist within this instance group. */
  //         instance.setSelectedNodes = (selectedNodes)=> {
  //             //accepts an array of indexes, only set
  //             //only set select if index is in the indexList
  //
  //             //loop through the selectedNodes array
  //             // node = this.index2node(index);
  //             // if(node !== null) {
  //             //     node.object.select(node);
  //             // }
  //             for (let i = 0; i < selectedNodes.length; i++) {
  //                 //check if index is in indexList
  //                 if (instance.userData.indexList.includes(selectedNodes[i])) {
  //                     //check if it is already in the selectedNodes array
  //                     if (!instance.userData.selectedNodes.includes(selectedNodes[i])) {
  //                         //if not, push it in
  //                         instance.userData.selectedNodes.push(selectedNodes[i]);
  //                     }
  //
  //                 }
  //             }
  //         }
  //
  //         instance.getData = (nodeObject) => {
  //             let index = instance.getDatasetIndex(nodeObject);
  //             return this.model.getDataset()[index];
  //         }
  //
  //         instance.isSelected = (nodeObject) => {
  //             // check if the index is in the selectedNodes array
  //             let index = instance.getDatasetIndex(nodeObject);
  //             if (instance.userData.selectedNodes === undefined) {
  //                 return false;
  //             }
  //             // return true if it is, false if it isn't
  //             if(instance.userData.selectedNodes.includes(index)){
  //                 /////console.log("Yes Node is selected");
  //                 return true;
  //             } else {
  //                 return false;
  //             }
  //             //return instance.userData.selectedNodes.includes(index);
  //         }
  //         instance.select = (nodeObject) => {
  //             let index = instance.getDatasetIndex(nodeObject);
  //             // push the index into the selectedNodes array, if it doesn't exist
  //             if (instance.userData.selectedNodes === undefined) {
  //                 instance.userData.selectedNodes = [];
  //             }
  //             //check if index is already in selectedNodes
  //             if (instance.userData.selectedNodes.includes(index)) {
  //                 // do nothing
  //             } else {
  //                 instance.userData.selectedNodes.push(index);
  //             }
  //
  //         }
  //
  //         instance.unSelect = (nodeObject) => {
  //             // check if index is in selectedNodes array and remove it if it is
  //             let index = instance.getDatasetIndex(nodeObject);
  //             if (!instance.userData.selectedNodes === undefined) {
  //                 let i = instance.userData.selectedNodes.indexOf(index);
  //                 if (i > -1) {
  //                     instance.userData.selectedNodes.splice(i, 1);
  //                 }
  //             }
  //
  //
  //
  //             }
  //
  //         instance.toggleSelect = (nodeObject) => {
  //             if (instance.isSelected(nodeObject)) {
  //                 instance.unSelect(nodeObject);
  //             } else {
  //                 instance.select(nodeObject);
  //             }
  //         }
  //
  //         instance.clearSelection = ()=> {
  //             // clear the selectedNodes array
  //             instance.userData.selectedNodes = [];
  //         }
  //
  //         /*Get edges for instanced node.*/
  //         instance.getEdges = (nodeObject)=> {
  //             console.log("Getting edges for instance node: " + nodeObject.instanceId);
  //             console.log(nodeObject);
  //             let object = nodeObject.object;
  //             let index = object.getDatasetIndex(nodeObject);
  //             //console.log("Index: " + index);
  //             let row = this.model.getConnectionMatrixRow(index);
  //             //console.log("Row: ");
  //             //console.log(row);
  //             let edges = [];
  //
  //             row.forEach(function(weight, targetIndex) {
  //                 if (weight > 0) {
  //                     let edge = {
  //                         weight: weight,
  //                         targetNodeId: targetIndex[0] //1] // subset was 1 but multiply is 0
  //                     };
  //                     edges.push(edge);
  //                 }
  //             }, true); // true: skip zeros
  //             return edges;
  //         };
  //         // overload the getEdges to also take a standard index
  //         instance.getEdgesFromIndex = (index)=> {
  //             let row = this.model.getConnectionMatrixRow(index);
  //             let edges = [];
  //             row.forEach(function(weight, targetIndex) {
  //                 if (weight > 0) {
  //                     let edge = {
  //                         weight: weight,
  //                         targetNodeId: targetIndex[0]  //1]  // subset was 1 but multiply is 0
  //                     };
  //                     edges.push(edge);
  //                 }
  //             }, true); // true: skip zeros
  //             return edges;
  //         }
  //
  //     }
  //
  //     // mark instances as dirty
  //     for (let i = 0; i < this.groups.length; i++) {
  //         this.instances[this.groups[i]].left.instanceMatrix.needsUpdate = true;
  //         this.instances[this.groups[i]].right.instanceMatrix.needsUpdate = true;
  //     }
  //     // display count for each hemisphere
  //     // for (let i = 0; i < groups.length; i++) {
  //     //     let leftCount = this.countGroupMembers(groups[i], 'left');
  //     //     let rightCount = this.countGroupMembers(groups[i], 'right');
  //     //     console.log("Group: " + groups[i] + " Left: " + leftCount + " Right: " + rightCount);
  //     // }
  //     // add the instance meshes to the scene
  //     for (let i = 0; i < this.groups.length; i++) {
  //         this.brain.add(this.instances[this.groups[i]].left);
  //         this.brain.add(this.instances[this.groups[i]].right);
  //     }
  // };


//     this.drawRegions = function () {
//         var dataset = model.getDataset();
//         console.log("Dataset: ");
//         console.log(dataset);
//         // for each group and hemisphere in the dataset, create an instance mesh
//         var groups = this.listGroups();
//
//
//         for (let i = 0; i < groups.length; i++) {
//             let leftCount = this.countGroupMembers(groups[i], 'left');
//             let rightCount = this.countGroupMembers(groups[i], 'right');
//             this.instances[groups[i]] = {
//                 left: null,
//                 right: null
//             };
//             // create instance mesh for each group and hemisphere
//             let geometry = getNormalGeometry('left');
//             let material = getNormalMaterial(model, groups[i]);
//             this.instances[groups[i]].left = new THREE.InstancedMesh(geometry, material, leftCount);
//             this.instances[groups[i]].left.setColorAt(0, material.color);
//
//             geometry = getNormalGeometry('right');
//             material = getNormalMaterial(model, groups[i]);
//             this.instances[groups[i]].right = new THREE.InstancedMesh(geometry, material, rightCount);
//             this.instances[groups[i]].right.setColorAt(0, material.color);
//
//             // name the instance with group_hemisphere
//             this.instances[groups[i]].left.name = {
//                 group: groups[i],
//                 hemisphere: 'left'
//             };
//             this.instances[groups[i]].right.name = {
//                 group: groups[i],
//                 hemisphere: 'right'
//             }
//         }
// // populate the instance meshes
//         var topIndexes = {};
//         for (let i = 0; i < dataset.length; i++) {
//             // check if region is already in the topIndexes object
//             if (topIndexes[dataset[i].group] === undefined) {
//                 topIndexes[dataset[i].group] = {
//                     left: 0,
//                     right: 0
//                 };
//             }
//             // get the index of the instance mesh to add to
//             let index = topIndexes[dataset[i].group][dataset[i].hemisphere];
//             // get the instance mesh to add to
//             let instance = this.instances[dataset[i].group][dataset[i].hemisphere];
//             // instance.userData = {
//             //     nodeIndex: i
//             // }
//
//             // get the position of the region
//             let position = dataset[i].position;
//             // set the position of the instance
//             instance.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
//             instance.setColorAt(index, instance.material.color);
//             // increment the index
//             topIndexes[dataset[i].group][dataset[i].hemisphere]++;
//
//             /////////////////////////////////
//             // IMPORTANT: Any variable in userdata must be prototypes here before being used
//             //if there is no userData on the instance create it.
//             // check if userData.indexList exists if it does push a new index into it at the end, the position should match the instanceId
//             // if it doesn't exist create it and push the index into it
//             if (instance.userData.indexList === undefined) {
//                 instance.userData.indexList = [];
//             }
//             instance.userData.indexList.push(i);
//             //userData will need a list of selected since individual objects don't track this.
//             //check if selectedNodes exists, if it doesn't, create it. Empty by default.
//             if (instance.userData.selectedNodes === undefined) {
//                 instance.userData.selectedNodes = [];
//             }
//
//
//             instance.getIndex = function (nodeObject) {
//                 //get object parent
//                 let parent;
//                 if(nodeObject.object.name.hemisphere == 'left') {
//                     parent = this.instances[nodeObject.name.group].left;
//                 } else {
//                     parent = this.instances[nodeObject.name.group].right;
//                 }
//
//                 // correlate the dataset[].label to the instanceId
//                 //return parent.userData.indexList[nodeObject.instanceId];
//                 // add some error checking
//                 if (parent.userData.indexList[nodeObject.instanceId] === undefined) {
//                     console.log("Error: Could not find index for instanceId: " + nodeObject.instanceId);
//                     return -1;
//                 } else {
//                     return parent.userData.indexList[nodeObject.instanceId];
//                 }
//
//
//             }
//
//             instance.getEdges = function (nodeObject) {
//                 let parent = this.instances[nodeObject.name.group][nodeObject.name.hemisphere];
//                 let index = parent.getIndex(nodeObject);
//                 let row = model.getConnectionMatrixRow(index);
//                 console.log("Row: ");
//                 console.log(row);
//                 let edges = [];
//
//                 row.forEach(function (weight, index) {
//                     //var i = index[0];
//                     //let edgeToId = index[1];
//                     console.log("index: ");
//                     console.log(index);
//                     if (weight > 0) {
//                         let edge = {
//                             //g: dataset[index].group,
//                             //hemisphere: dataset[index].hemisphere,
//                             weight: weight,
//                             targetNodeId: index[1],
//                             //active: false
//                         };
//                         //log creation of edge
//                         console.log("Edge created: " + edge.targetNodeId + " with weight " + edge.weight);
//                         edges.push(edge);
//                     }
//                 }, true); // true: skip zeros
//
//                 return edges;
//
//             }
//
//         }
//
//
//         // mark instances as dirty
//         for (let i = 0; i < groups.length; i++) {
//             this.instances[groups[i]].left.instanceMatrix.needsUpdate = true;
//             this.instances[groups[i]].right.instanceMatrix.needsUpdate = true;
//         }
//         // add the instance meshes to the scene
//         for (let i = 0; i < groups.length; i++) {
//             brain.add(this.instances[groups[i]].left);
//             brain.add(this.instances[groups[i]].right);
//         }

  // // print count of instances
  // for (let i = 0; i < groups.length; i++) {
  //     console.log(groups[i] + ' left: ' + instances[groups[i]].left.count);
  //     console.log(groups[i] + ' right: ' + instances[groups[i]].right.count);
  // }
  //
  // // print indexes object
  // console.log("indexes object");
  // // for each key in the indexes object (group) print the left and right indexes (number of instances)
  // for (let i = 0; i < groups.length; i++) {
  //     console.log(groups[i]);
  //     console.log(topIndexes[groups[i]]);


  //
  // for (var i = 0; i < dataset.length; i++) {
  //     geometry = getNormalGeometry(dataset[i].hemisphere,name);
  //     material = getNormalMaterial(model, dataset[i].group);
  //     glyphs[i] = new THREE.Mesh(geometry, material);
  //     brain.add(glyphs[i]);
  //     glyphNodeDictionary[glyphs[i].uuid] = i;
  //     glyphs[i].position.set(dataset[i].position.x, dataset[i].position.y, dataset[i].position.z);
  //     glyphs[i].userData.hemisphere = dataset[i].hemisphere;
  // }
  //};

  // update the nodes positions according to the latest in the model
  updateNodesPositions = () => {
    //todo:
    var dataset = this.model.getDataset();
    var instance = null;
    var index = null;
    // randoms for x,y,z small offsets to make nodes less likely to overlap
    // var xRandom = 0;
    // var yRandom = 0;
    // var zRandom = 0;
    // // 0.25-1 jitter
    // xRandom = (Math.random() * 10) + 10;
    // yRandom = (Math.random() * 10) + 10;
    // zRandom = (Math.random() * 10) + 10;


    for (let i = 0; i < dataset.length; i++) {
      instance = this.instances[dataset[i].group][dataset[i].hemisphere];
      index = instance.nodeID;
      instance.setMatrixAt(index, new THREE.Matrix4().makeTranslation(dataset[i].position.x, dataset[i].position.y, dataset[i].position.z));
      // set matrix needs update to true
      instance.instanceMatrix.needsUpdate = true;
    }
    // for (var i = 0; i < dataset.length; i++) {
    //     glyphs[i].position.set(dataset[i].position.x, dataset[i].position.y, dataset[i].position.z);
    // }
  };

  updateNodesVisibility = (updateDataset = false) => {

    let dataset = this.model.getDataset();

    for (let i = 0; i < dataset.length; i++) {
      let opacity = 1.0;
      if (getRoot && getRoot == i) { // root node
        opacity = 1.0;
      }

      if (this.shouldDrawRegion(dataset[i])) {
        switch (this.model.getRegionState(dataset[i].group)) {
          case 'active':
            opacity = 1.0;
            break;
          case 'transparent':
            opacity = 0.3;
            break;
          case 'inactive':
            opacity = 0.0;
            break;
        }
      } else {
        opacity = 0.0;
      }
      this.NodeManager.ChangeOpacityByGroupAndHemisphere(dataset[i].group, dataset[i].hemisphere, opacity);
      //todo: this.instances["area_43"]["left"]  <--- would work
      // this.instances[dataset[i].group][dataset[i].hemisphere].material.opacity = opacity;
      // //glyphs[i].material.opacity = opacity;
      // // mark dirty for update
      // this.instances[dataset[i].group][dataset[i].hemisphere].material.needsUpdate = true;
    }
  };
    getSelectedNodes = () => {
        let selectedNodes = this.NodeManager.getSelectedNodes();
        return selectedNodes;
    }
    // this.getSelectedNodes = function () {
    //     let groups = this.listGroups();
    //     let selectedNodes = [];
    //
    //     for (let i = 0; i < groups.length; i++) {
    //         const instance = this.instances[groups[i]];
    //         if (!instance) continue;
    //
    //         const leftHemisphere = instance['left'];
    //         const rightHemisphere = instance['right'];
    //         if (!leftHemisphere || !rightHemisphere) continue;
    //
    //         const leftSelectedNodes = leftHemisphere.getSelectedNodes && leftHemisphere.getSelectedNodes();
    //         const rightSelectedNodes = rightHemisphere.getSelectedNodes && rightHemisphere.getSelectedNodes();
    //         if (leftSelectedNodes) selectedNodes = selectedNodes.concat(leftSelectedNodes);
    //         if (rightSelectedNodes) selectedNodes = selectedNodes.concat(rightSelectedNodes);
    //     }
    //
    //     selectedNodes = selectedNodes.filter(Boolean);
    //     return selectedNodes;
    // }

  setSelectedNodes = (nodes) => {
    //todo update to use NodeManager mass assignment NodeManager.SetSelectedNodes([#indexs],clear: bool).
    this.NodeManager.setSelectedNodes(nodes, true);
    // return;
    // //accepts an array of dataset indexes and sets the selected flag to true for each node
    // //sets selections globally across all instances
    // let groups= this.listGroups();
    // for (let i = 0; i < groups.length; i++) {
    //     const instance = this.instances[groups[i]];
    //     // if (!instance) continue;
    //     //
    //     // const leftHemisphere = instance['left'];
    //     // const rightHemisphere = instance['right'];
    //     // if (!leftHemisphere || !rightHemisphere) continue;
    //     //
    //     // const leftSelectedNodes = leftHemisphere.setSelectedNodes && leftHemisphere.setSelectedNodes(nodes);
    //     // const rightSelectedNodes = rightHemisphere.setSelectedNodes && rightHemisphere.setSelectedNodes(nodes);
    //     //batching seems great until you realise you need some side effects during the change
    //     //call updateNodeGeometry to update the visual state to selected
    //     for(let j=0;j<nodes.length;j++){
    //         const node = this.NodeManager.index2node(nodes[j]);
    //         //check if nodes is already selected
    //         if(!this.NodeManager.isSelected(node)) {
    //             //mark node as selected
    //             this.NodeManager.selectNode(node);
    //             //this.updateNodeGeometry(node, 'selected');
    //         }
    //     }
    // }
  }

  clrNodesSelected = () => {
    this.NodeManager.deselectAll();
    // // remove the selected flag from all nodes
    // this.groups = this.listGroups();
    // //clear selected nodes from each instance
    // for (let i = 0; i < this.groups.length; i++) {
    //     // only log errors
    //     if (this.instances[this.groups[i]] === undefined) {
    //         console.log("instance group undefined: " + this.groups[i]);
    //         continue;
    //     }
    //     if (this.instances[this.groups[i]]['left'] === undefined) {
    //         console.log("instance left undefined: " + this.groups[i]);
    //     }
    //     if (this.instances[this.groups[i]]['right'] === undefined) {
    //         console.log("instance right undefined: " + this.groups[i]);
    //     }
    //     if (this.instances[this.groups[i]]['left'].clearSelection === undefined) {
    //         console.log("instance clearSelection left undefined: " + this.groups[i]);
    //     } else {
    //         this.instances[this.groups[i]]['left'].clearSelection();
    //     }
    //     if (this.instances[this.groups[i]]['right'].clearSelection === undefined) {
    //         console.log("instance clearSelection right undefined: " + this.groups[i]);
    //     } else {
    //         this.instances[this.groups[i]]['right'].clearSelection();
    //     }
    // }
  };


  // draw all connections between the selected nodes, needs the connection matrix.
  // don't draw edges belonging to inactive nodes
  // drawConnections = () => {
  //
  //     let activeEdges = this.getActiveEdges();
  //     console.log("drawconnections: Active Edges: ");
  //     console.log(activeEdges);
  //
  //
  //     for (let i = 0; i <  activeEdges.length; i++) {
  //         let node = activeEdges[i][0];
  //         //log the node
  //         console.log("Node: ");
  //         console.log(node);
  //
  //         for (let j = 0; j < activeEdges[i][1].length; j++) {
  //             let targetNode = this.NodeManager.index2node(activeEdges[i][1][j].targetNodeId);
  //             if (!targetNode) {
  //                 continue;
  //             }
  //
  //
  //             //let edge = createLine();
  //         }
  //         // do create line logic here
  //
  //         //let targetNode = this.getNodeByIndex(activeEdges[i][1].targetNodeId);
  //
  //
  //         // // draw only edges belonging to active nodes
  //         // if ((nodeIdx >= 0) && model.isRegionActive(model.getGroupNameByNodeIndex(nodeIdx))) {
  //         //     // two ways to draw edges
  //         //     if (getThresholdModality()) {
  //         //         // 1) filter edges according to threshold
  //         //         this.drawEdgesGivenNode(nodeIdx);
  //         //     } else {
  //         //         // 2) draw top n edges connected to the selected node
  //         //         this.drawTopNEdgesByNode(nodeIdx, model.getNumberOfEdges());
  //         //     }
  //         }
  //     //letting drawing do the work here, it just needs the data
  //     return activeEdges;
  // }

  // getNodeInstanceByIndex = (index) => {
  //     this.groups = this.listGroups();
  //     for (let j = 0; j < this.groups.length; j++) {
  //         // each group may have a left and right hemisphere
  //         const groupOf = this.instances[this.groups[j]];
  //         if (!groupOf) continue;
  //         if (groupOf['left'] === undefined && groupOf['right'] === undefined) {
  //             console.log("groupOf left and right undefined: " + this.groups[j]);
  //             continue;
  //         }
  //         if (groupOf['left'] === undefined) {
  //             console.log("groupOf left undefined: " + this.groups[j]);
  //         }
  //         if (groupOf['right'] === undefined) {
  //             console.log("groupOf right undefined: " + this.groups[j]);
  //         }
  //         const leftHemisphere = groupOf['left'];
  //         const rightHemisphere = groupOf['right'];
  //         if (!leftHemisphere || !rightHemisphere) continue;
  //         // check which hemisphere is valid
  //         let node = null;
  //         let leftorright = "";
  //         if (leftHemisphere.getNodesInstanceFromDatasetIndex) {
  //             node = leftHemisphere.getNodesInstanceFromDatasetIndex(index);
  //             leftorright = "left";
  //         } else if (rightHemisphere.getNodesInstanceFromDatasetIndex) {
  //             node = rightHemisphere.getNodesInstanceFromDatasetIndex(index);
  //             leftorright = "right";
  //         } else {
  //             console.log("No hemisphere found");
  //             continue;
  //         }
  //         if (node === null) {
  //             //console.log("Node not found in " + leftorright + " hemisphere");
  //             continue;
  //         }
  //         console.log("Node: ");
  //         console.log(node);
  //
  //         return node;
  //     }
  // }

  // get the active edges, right now this is the same as the selected nodes but will be seperated in the future.
  getAllSelectedNodesActiveEdges = () => {
    //var nodeIdx;
    let nodesSelected = this.NodeManager.getSelectedNodes();
    let numNodesSelected = nodesSelected.length;
    //console.log("numNodesSelected: " + numNodesSelected);
    let activeEdges = [];
    let topN = this.model.getNumberOfEdges();
    let distance = this.model.getDistanceThreshold();
    // console.log('Get Active Edge Settings: ');
    // console.log('topN: ' + topN);
    // console.log('distance: ' + distance);

    //let groups = this.listGroups();
    let threshold = this.model.getThreshold();
    if (threshold === undefined) {
      console.log("Threshold undefined");
      // consider all selected nodes active
      threshold = 0;
    }

    //console.log("Threshold: " + threshold)

    // for each index in nodes selected, get the edges, rules are automatically applied
    // based if threshhold topN or both are supplied.
    for (let i = 0; i < numNodesSelected; i++) {
      let node = this.NodeManager.index2node(nodesSelected[i]);
      if (!node) {
        //throw an error
        //console.log("Node not found for index: " + nodesSelected[i]);
        throw new Error("Node not found for index: " + nodesSelected[i]);
      }
      let edges = this.NodeManager.getEdges(node, threshold, topN, distance);
      if (!edges) {
        //throw an error
        throw new Error("Edges not found for node: " + node);
      }
      // add the edges to active edges

      activeEdges.push([node, edges]);
    }

    return activeEdges;
  }

  getActiveEdgesAtIndex = (index) => {
    let node = this.NodeManager.index2node(index);
    if (!node) {
      //throw an error
      //console.log("Node not found for index: " + nodesSelected[i]);
      throw new Error("Node not found for index: " + index);
    }
    let edges = this.NodeManager.getEdges(node, this.model.getThreshold(), this.model.getNumberOfEdges(), this.model.getDistanceThreshold());
    if (!edges) {
      //throw an error
      throw new Error("Edges not found for node: " + node);
    }
    // add the edges to active edges
    return [node, edges];
  }
  //todo go over the code below at some point, figure out what was supposed to be happening. it looks broken
  // the above should do what is intended.
//
//         //console.log("active edges nodesSelected: ");
//         //console.log(nodesSelected);
// // for each node in nodesSelected look it up in instances and get the edges
//         for (let i = 0; i < numNodesSelected; i++) {
//             // check through the instances for the index and then return the node
//             for (let j = 0; j < groups.length; j++) {
//                 // each group may have a left and right hemisphere
//                 const groupOf = this.instances[groups[j]];
//                 if (!groupOf) continue;
//                 if (groupOf['left'] === undefined && groupOf['right'] === undefined) {
//                     console.log("groupOf left and right undefined: " + groups[j]);
//                     continue;
//                 }
//                 if (groupOf['left'] === undefined) {
//                     console.log("groupOf left undefined: " + groups[j]);
//                 }
//                 if (groupOf['right'] === undefined) {
//                     console.log("groupOf right undefined: " + groups[j]);
//                 }
//                 const leftHemisphere = groupOf['left'];
//                 const rightHemisphere = groupOf['right'];
//                 if (!leftHemisphere || !rightHemisphere) continue;
//                 // check which hemisphere is valid
//                 let node = null;
//                 let leftorright = "";
//                 if (leftHemisphere.getNodesInstanceFromDatasetIndex) {
//                     node = leftHemisphere.getNodesInstanceFromDatasetIndex(nodesSelected[i]);
//                     leftorright = "left";
//                 } else if (rightHemisphere.getNodesInstanceFromDatasetIndex) {
//                     node = rightHemisphere.getNodesInstanceFromDatasetIndex(nodesSelected[i]);
//                     leftorright = "right";
//                 } else {
//                     console.log("No hemisphere found");
//                     continue;
//                 }
//                 if (node === null) {
//                     //console.log("Node not found in " + leftorright + " hemisphere");
//                     continue;
//                 }
//                 //console.log("Node: ");
//                 //console.log(node);
//                 // get the edges
//                 let edges = this.NodeManager.getEdgesByIndex(nodesSelected[i]);
//                 if (!edges) {
//                     console.log("Edges not found");
//                     continue;
//                 }
//                 // console.log("Edges: ");
//                 // console.log(edges);
//                 // get the edges that are above the threshold
//                 let edgesAboveThreshold = [];
//                 if (!topN) {
//                     edgesAboveThreshold = edges.filter(edge => edge.weight >= threshold);
//                 } else {
//                     edgesAboveThreshold = edges.sort((a, b) => b.weight - a.weight).slice(0, topN);
//                 }
//                 if (edgesAboveThreshold.length === 0) {
//                     //console.log("Edges above threshold not found");
//                     continue;
//                 }
//                 // console.log("adding edges to active edges:");
//                 // console.log(edgesAboveThreshold);
//                 //console log the length of edges vs edges above threshold
//                 // console.log("edges length: " + edges.length);
//                 // console.log("edges above threshold length: " + edgesAboveThreshold.length);
//                 //add the node and the edges to the active edges array if the edges are above the threshold
//                 activeEdges.push([node, edgesAboveThreshold]);
//             }
//         }
//         // console.log("fresh active edges: ");
//         // console.log(activeEdges);
//         return activeEdges;
//     };

  setEdgesColor = () => {
    //todo stub return for now.
    return;
  }

  // skew the color distributio n according to the nodes strength
  computeColorGradient(c1, c2, n, p) {
    let gradient = new Float32Array(n * 3);
    let p1 = p;
    let p2 = 1 - p1;
    for (let i = 0; i < n; ++i) {
      // skew the color distribution according to the nodes strength
      let r = i / (n - 1);
      let rr = (r * r * (p2 - 0.5) + r * (0.5 - p2 * p2)) / (p1 * p2);
      gradient[i * 3] = c2.r + (c1.r - c2.r) * rr;
      gradient[i * 3 + 1] = c2.g + (c1.g - c2.g) * rr;
      gradient[i * 3 + 2] = c2.b + (c1.b - c2.b) * rr
    }
    return gradient;
  };

  // set the color of displayed edges
  updateEdgeColors = () => {
    //todo this is currently not used but could be if updated to handle instanced nodes
    return;
    var edge, c1, c2;
    for (var i = 0; i < this.displayedEdges.length; i++) {
      edge = this.displayedEdges[i];
      //todo update for instancing
      // c1 = glyphs[edge.nodes[0]].material.color;
      // c2 = glyphs[edge.nodes[1]].material.color;
      edge.geometry.setAttribute('color', new THREE.BufferAttribute(this.computeColorGradient(c1, c2, edge.nPoints, edge.p1), 3));
    }

    for (i = 0; i < this.shortestPathEdges.length; i++) {
      edge = this.displayedEdges[i];
      //todo update for instancing
      // c1 = glyphs[edge.nodes[0]].material.color;
      // c2 = glyphs[edge.nodes[1]].material.color;
      edge.geometry.setAttribute('color', new THREE.BufferAttribute(this.computeColorGradient(c1, c2, edge.nPoints, edge.p1), 3));
    }
  };

  updateNodesColor = () => {

    const elapsedTime = this.clock.getElapsedTime();
    let dataset = this.model.getDataset();

    if ((elapsedTime % 30) < 29.8) {
      return;
    }
    console.log("updateNodesColor");
    //todo: would getting all current contextual nodes and the selected nodes be equivalent to the nodes focused?
    //todo: focused will likely be reserved for the nodes that are currently being manipulated by the user. The center of camera node or the zoom to node.
    console.log("nodes focused: ");
    console.log(getNodesFocused());
    clrNodesFocused();


    //updated for nodemanager.
    for (let i = 0; i < dataset.length; ++i) {
      //todo: document this
      this.NodeManager.setNodeColor(i, new THREE.Color(scaleColorGroup(this.model, dataset[i].group)));
      //glyphs[i].material.color = new THREE.Color(scaleColorGroup(this.model, dataset[i].group));
    }
  };

  // set the color of displayed edges
  shimmerEdgeNodeColors = () => {
    let dataset = this.model.getDataset();
    let colorAmplitude = this.amplitude * 16.6;  // 0.25;
    let colorFrequency = 3 * this.frequency;
    const elapsedTime = this.clock.getElapsedTime();
    const deltaRadius = colorAmplitude * Math.sin(2 * Math.PI * colorFrequency * elapsedTime);
    let edge, c1, c2, tempColor = new THREE.Color(), targetColor = new THREE.Color();
    for (let i = 0; i < this.displayedEdges.length; i++) {
      edge = this.displayedEdges[i];
      c1 = edge.nodes[0]; //.material.color;
      c2 = edge.nodes[1]; //.material.color;
      let baseColor = new THREE.Color(scaleColorGroup(this.model, dataset[c2].group));
      var deltaColor = new THREE.Color(scaleColorGroup(this.model, dataset[c1].group)); //1,0.6,0.3);
      //amplitude * Math.sin(2 * Math.PI * frequency * elapsedTime),0,0 );      //delta * 180, delta * 10, delta * 10);
      tempColor = new THREE.Color();
      targetColor = new THREE.Color();
      tempColor.lerpColors(baseColor, deltaColor, 0.5 * deltaRadius);
      targetColor = tempColor.offsetHSL(0, 0.5 * deltaRadius, deltaRadius);  //new THREE.Color();
      //0.5*deltaRadius+0.5);
      edge.geometry.setAttribute('color', new THREE.BufferAttribute(this.computeColorGradient(c1, c2, edge.nPoints, edge.p1), 3));
      tempColor.lerpHSL(targetColor, 0.5 * deltaRadius + 0.5);
      // glyphs[edge.nodes[1]].material.color = targetColor; //todo:instancize this
      this.NodeManager.setNodeColor(edge.nodes[1], targetColor);
    }

    for (let i = 0; i < this.shortestPathEdges.length; i++) {
      edge = this.displayedEdges[i];
      // //todo instancize this
      // c1 = glyphs[edge.nodes[0]].material.color;
      // c2 = glyphs[edge.nodes[1]].material.color;
      edge.geometry.setAttribute('color', new THREE.BufferAttribute(this.computeColorGradient(c1, c2, edge.nPoints, edge.p1), 3));

    }
  };

  setEdgeOpacity = (opacity) => {
    this.edgeOpacity = opacity;
    for (var i = 0; i < this.displayedEdges.length; i++) {

      this.displayedEdges[i].material.opacity = this.displayedEdges[i].material.userData.originalOpacity * opacity;
      console.log("originalOpacity: " + this.displayedEdges[i].material.userData.originalOpacity);
      console.log("slider opacity: " + opacity);
      console.log("actual opacity: " + this.displayedEdges[i].material.opacity);
      this.displayedEdges[i].material.needsUpdate = true;
    }
  };

  getEdgeOpacity = () => {
    return this.edgeOpacity;
  }

  // create a line using start and end points and give it a name
  // TODO use this to allow different line sizes
  // https://github.com/spite/THREE.MeshLine#create-a-threemeshline-and-assign-the-geometry
  // geometry.vertices.push(end);
  // var line = new THREE.MeshLine();
  // line.setGeometry( geometry );
  // material = new THREE.MeshLineMaterial();
  // var mesh  = new THREE.Mesh(line.geometry, material);
  /**
   * Creates a line geometry with given edge points and attributes.
   *
   * @param {Array} edge - An array of Vector3 points representing the line's vertices.
   * @param {string} ownerNode - The name or identifier of the owner node for this line.
   * @param {Array} nodes - An array of node identifiers connected by this line.
   * @param {number} [opacity=1] - The opacity of the line.
   * @returns {Line2} - A Three.js Line2 object representing the created line.
   */
  createLine = (edge, ownerNode, nodes, opacity = 1) => {
    //console.log("opacity: " + opacity);
    let material = new LineMaterial({
      transparent: true,
      opacity: opacity * this.getEdgeOpacity(),
      vertexColors: true, //THREE.VertexColors
      //enable double sided rendering
      //side: THREE.DoubleSide,
      worldUnits: true,
      linewidth: 10 * opacity,
      depthTest: true,

      //alphaToCoverage: true,
      // Due to limitations in the ANGLE layer on Windows platforms linewidth will always be 1.
    });
    material.userData = {
      originalOpacity: opacity
    }

    let geometry = new LineGeometry();
    let n = edge.length;

    let positions = [];
    for (let i = 0; i < n; i++) {
      // positions[i * 3] = edge[i].x;
      // positions[i * 3 + 1] = edge[i].y;
      // positions[i * 3 + 2] = edge[i].z;
      positions.push(edge[i].x, edge[i].y, edge[i].z);
    }
    //geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setPositions(positions);
    var s1 = this.model.getNodalStrength(nodes[0]), s2 = this.model.getNodalStrength(nodes[1]);
    var p1 = s1 / (s1 + s2);
    var c1 = new THREE.Color(scaleColorGroup(this.model, this.model.getGroupNameByNodeIndex(nodes[0]))),// glyphs[nodes[0]].material.color,
      c2 = new THREE.Color(scaleColorGroup(this.model, this.model.getGroupNameByNodeIndex(nodes[1])));// glyphs[nodes[1]].material.color;
    //geometry.setAttribute('color', new THREE.BufferAttribute(this.computeColorGradient(c1, c2, n, p1), 3));
    let colorGradient = this.computeColorGradient(c1, c2, n, p1);
    //check that the color gradient is the right length, should be the same as the number of points
    if (colorGradient.length !== n * 3) {
      throw new Error("Color gradient length does not match the number of points");
    }
    // set the color gradient to the geometry
    geometry.setColors(colorGradient);
    // geometry.colors = colorGradient;
    let line2 = new Line2(geometry, material);
    //console.log("ownerNode: ");
    //console.log(ownerNode);
    line2.name = ownerNode;
    line2.nPoints = n;
    line2.nodes = nodes;
    line2.p1 = p1;



    return line2;
  };

  //drawEdgeWithName = (edge, ownerNode, nodes, opacity) => {
  drawEdgeWithName = (edge, ownerNode, nodes, weight) => {
    //edge is an array of points
    //ownerNode is the name of the node that owns the edge//usually the source node index
    //nodes is an array of node indexes that are connected by the edge

    // console.log("Edge: ");
    // console.log(edge);
    // console.log("ownerNode: " + ownerNode);
    // console.log("nodes: ");
    // console.log(nodes);
    let line = this.createLine(edge, ownerNode, nodes, weight);
    this.brain.add(line);
    return line;
  };

  // draw the top n edges connected to a specific node
  // unused, drawedgesgivennode will sort if given the right arguments.
  // drawTopNEdgesByNode = (nodeIndex, n) => {
  //   let row = [];
  //     if(false && (!getEnableContra() && !getEnableIpsi())) { //todo: evaluate best action for neither ipsi nor contra
  // 	  console.log("Neither ipsi nor contra: this should not be able to be accessed.")
  //       row = this.model.getTopConnectionsByNode(nodeIndex, n );
  //   } else {
  // 	  if(getEnableContra()) {
  //         console.log("contra");
  // 		row = row.concat(this.model.getTopContraLateralConnectionsByNode(nodeIndex, n ));
  //         }
  //         if (getEnableIpsi()) {
  //         console.log("ipsi!");
  // 		row = row.concat(this.model.getTopIpsiLateralConnectionsByNode(nodeIndex, n ));
  //         }
  //     }
  //     console.log("contra: "+getEnableContra());
  //     console.log("ipsi: "+getEnableIpsi());
  //
  //     let edges = this.getActiveEdges();
  //     console.log("drawtopNedges Active edges: ");
  //     console.log(edges);
  //     let edgeIdx = this.model.getEdgesIndeces();
  //     if (getEnableEB()) {
  //         console.log("EB point");
  //         this.model.performEBOnNode(nodeIndex);
  //     }
  //     for (let i = 0; i < row.length; ++i) {
  //         if ((nodeIndex != row[i]) && this.model.isRegionActive(this.model.getGroupNameByNodeIndex(i)) && getVisibleNodes(i)) {
  //             //display debug info for each variable above.
  //             // console.log("Displayed Edges Length: ");
  //             // console.log(this.displayedEdges.length);
  //             // console.log("Edges: ");
  //             // console.log(edges);
  //             // console.log("edgeIdx: ");
  //             // console.log(edgeIdx);
  //             // console.log("this.displayedEdges: ");
  //             // console.log(this.displayedEdges);
  //             // console.log("nodeIndex: ");
  //             // console.log(nodeIndex);
  //             // console.log("row: ");
  //             // console.log(row);
  //             // console.log("i: ");
  //             // console.log(i);
  //             //let edix = edgeIdx[nodeIndex][row[i]];
  //             let edix = this.model.getEdgesIndeces().get([nodeIndex, row[i]]);
  //             if(edix < 0) continue;
  //             if(edix > edges.length) continue;
  //             this.displayedEdges[this.displayedEdges.length] = drawEdgeWithName(edges[ edix ], nodeIndex, [nodeIndex, row[i]]);
  //
  //         }
  //     }
  //
  //     //setEdgesColor();
  // };
  // //moved to NodeManager
  // index2node = (index) =>  {
  //     let instanceObj = null;
  //     for(let group in this.instances) {
  //         for(let side in this.instances[group]) {
  //             if(this.instances[group][side] == null || this.instances[group][side] === undefined) continue;
  //             if(this.instances[group][side].getNodesInstanceFromDatasetIndex === undefined) continue;
  //             let temp = this.instances[group][side].getNodesInstanceFromDatasetIndex(index);
  //
  //             if(temp != null) {
  //                 return temp;
  //                 instanceObj = {
  //                     object: this.instances[group][side],
  //                     instanceId: temp.instanceId,
  //                     group: group,
  //                     side: side
  //                 };
  //                 return instanceObj;
  //             }
  //         }
  //     }
  //     return null;
  // }

  drawEdgesGivenIndex = (index) => {
    //if index is NaN the throw an error.
    if (isNaN(index)) {
      throw new Error("index is not a number");

    }
    let node = this.NodeManager.index2node(index);
    this.drawEdgesGivenNode(node);
  }
  // draw edges given a node. thresholding is provided by getActiveEdges, this just draws the edges.
  drawEdgesGivenNode = (node) => {
    //console.log("Attempting to draw edges given node: " + node.object.name.group + " " + node.object.name.hemisphere + " " + node.instanceId);
    //var dataset = this.model.getDataset();
    //var row = this.model.getConnectionMatrixRow(indexNode);

    //let instanceObj = this.instances[dataset[indexNode].group]["left"].getNodesInstanceFromDatasetIndex(indexNode);
    //instanceObj may be in any group (left or right) so we need to find it. getnodesinstancefromdatasetindex returns null if not found in that group.


    if (node == null) {
      console.log("instanceObj is null");
      return;
    }

    let matrix = new THREE.Matrix4();
    //console.log("NodeObject: ");
    //console.log(nodeObject);
    //let instancePosition = new THREE.Vector3();

    //let quaternion = new THREE.Quaternion();
    //let scaleVector = new THREE.Vector3();

    // get the position of the instanced node, not sure here which to use or if identical.
    //node.object.getMatrixAt(node.instanceId, matrix);

    //objectParent.getMatrixAt(nodeObject.instanceId, matrix);
    //instancePosition.setFromMatrixPosition(matrix);
    let nodePosition = this.NodeManager.getNodePosition(node);
    let edges = this.NodeManager.getEdges(node, this.model.getThreshold(), this.model.getNumberOfEdges(), this.model.getDistanceThreshold());
    let sourceIndex = this.NodeManager.node2index(node);
    //var edges = this.getActiveEdges(); //this gets all active edges.
    // console.log("drawEdgesGivenNode: Active edges: ");
    // console.log(edges);
    // get activeedges does the topn distance weight and thresholding.
    // if(!topN) {
    //     edges = edges.filter(edge => edge.weight >= this.model.getThreshold());
    // } else {
    //     edges = edges.sort((a, b) => b.weight - a.weight).slice(0, topN);
    // }
    //console.log("DrawEdgesGivenNode Edges: ");
    //console.log(edges);
    let targetPosition = new THREE.Vector3();
    for (let i = 0; i < edges.length; i++) {
      // console.log("edge: ");
      // console.log(edges[i]);

      let edge = [];
      edge.push(nodePosition);
      // let targetNodeId = edges[i].targetNodeId;
      // let targetNode = this.NodeManager.index2node(targetNodeId);
      // if(targetNode == null) {
      //     console.log("targetNode is null");
      //     continue;
      // }
      // //position = targetNode.object.getPosition(targetNode.instanceId);
      // //targetNode.object.getMatrixAt(targetNode.instanceId, matrix);
      // //targetPosition.setFromMatrixPosition(matrix);
      //
      // edge.push(targetPosition);
      targetPosition.set(edges[i].position.x, edges[i].position.y, edges[i].position.z);
      edge.push(targetPosition);
      //let index = this.NodeManager.node2index(node);
      //targetNodeId is the index of the target node as it is in the dataset. this is not the same as the instanceId which is only used in nodeManager.

      this.displayedEdges[this.displayedEdges.length] = this.drawEdgeWithName(edge, sourceIndex, [sourceIndex, edges[i].targetNodeIndex], edges[i].weight/this.model.getMaximumWeight());
    }

    return;

    // unreachable code beyond this point some of it is updated to support the previewArea change to a class structure
    // but I'm sure more of it needs to be updated in other ways.
    let edgeIdx = this.model.getEdgesIndeces();
    if (getEnableEB()) {
      this.model.performEBOnNode(indexNode);
    }

    // todo: get back to this after edge thresholding is re-implemented
    // thresholding is implemented in getActiveEdges.
    //console.log("contra: "+getEnableContra()+"...ipsi: "+getEnableIpsi());

    // todo: evaluate this: For now, If neither ipsi nor contra are selected, then don't draw any edges
    if (!getEnableIpsi() && !getEnableContra()) {
      return;
    }

    // It can get too cluttered if both ipsi-
    if (getEnableIpsi() && getEnableContra()) {
      console.log("edges: ipsi or contra enabled")
      for (let i = 0; i < row.length; i++) {
        //console.log("Row length: ");
        //console.log(row.length);
        let myThreshold = this.model.getThreshold();
        //console.log("myThreshold: ");
        //console.log(myThreshold);
        if (dataset[indexNode].hemisphere !== dataset[i].hemisphere) {
          myThreshold = this.model.getConThreshold();
          //console.log("myThreshold overwritten by ConThreshold: ");
          //console.log(myThreshold);
        }
        if (myThreshold <= 0 || isNaN(myThreshold)) {
          myThreshold = 2;
        }
        if ((i != indexNode) &&
          (Math.abs(row[i]) >= myThreshold) &&
          this.model.isRegionActive(this.model.getGroupNameByNodeIndex(i)) &&
          getVisibleNodes(i)) {
          //displayedEdges[displayedEdges.length] = drawEdgeWithName(edges[edgeIdx[indexNode][i]], indexNode, [indexNode, i]);
          // //display debug info for each variable above.
          // console.log("Displayed Edges Length: ");
          // console.log(displayedEdges.length);
          // console.log("Edges: ");
          // console.log(edges);
          // console.log("edgeIdx: ");
          // console.log(edgeIdx);
          //
          // console.log("indexNode: ");
          // console.log(indexNode);
          // console.log("row: ");
          // console.log(row);
          // console.log("i: ");
          // console.log(i);
          //let edix = edgeIdx[nodeIndex][row[i]];
          let edix = this.model.getEdgesIndeces().get([indexNode, i]);
          if (edix < 0) continue;
          if (edix > edges.length) continue;
          console.log("Edix");
          console.log(edix);
          console.log("this.displayedEdges before: ");
          console.log(this.displayedEdges);
          this.displayedEdges[this.displayedEdges.length] = this.drawEdgeWithName(edges[edix], indexNode, [indexNode, i]);
          console.log("this.displayedEdges after: ");
          console.log(this.displayedEdges);
        }
      }
    } else {
      console.log("edges: ipsi or contra not enabled")
      for (let i = 0; i < row.length; i++) {
        if ((i != indexNode) && Math.abs(row[i]) > this.model.getThreshold() && this.model.isRegionActive(this.model.getGroupNameByNodeIndex(i)) && getVisibleNodes(i) &&
          ((getEnableIpsi() && (dataset[indexNode].hemisphere === dataset[i].hemisphere)) ||
            (getEnableContra() && (dataset[indexNode].hemisphere !== dataset[i].hemisphere)) ||
            (!getEnableIpsi() && !getEnableContra()))) {
          let edix = this.model.getEdgesIndeces().get([indexNode, i]);
          this.displayedEdges[this.displayedEdges.length] = this.drawEdgeWithName(this.edges[edix], indexNode, [indexNode, i]);
        }
      }
    }
  };

  // give a specific node index, remove all edges from a specific node in a specific scene
  removeEdgesGivenNode = (indexNode) => {
    let l = this.displayedEdges.length;

    // keep a list of removed edges indexes
    let removedEdges = [];
    for (let i = 0; i < l; i++) {
      let edge = this.displayedEdges[i];
      //removing only the edges that starts from that node
      console.log("removing edge: ");
      console.log(edge);
      if (edge.name == indexNode) {
        removedEdges[removedEdges.length] = i;
        this.brain.remove(edge);
      }
    }

    // update the displayedEdges array
    let updatedDisplayEdges = [];
    for (let i = 0; i < this.displayedEdges.length; i++) {
      //if the edge should not be removed
      if (removedEdges.indexOf(i) == -1) {
        updatedDisplayEdges[updatedDisplayEdges.length] = this.displayedEdges[i];
      }
    }

    for (let i = 0; i < this.shortestPathEdges.length; i++) {
      updatedDisplayEdges[updatedDisplayEdges.length] = this.shortestPathEdges[i];
    }
    this.displayedEdges = updatedDisplayEdges;
    this.reInitEdgeFlare();
  };


  skyboxLoadedCallback = (texture) => {
    console.log("Skybox loaded");
    //set the scene background property with the resulting texture
    this.skybox.name = "skybox";
    this.scene.background = this.skybox;
    //activate background
    this.scene.background.needsUpdate = true;
  };

  // draw skybox from images
  addSkybox() {
    console.log("Adding skybox");
    let folder = 'darkgrid';
    let paths = [
      './images/' + folder + '/negx.png',
      './images/' + folder + '/negy.png',
      './images/' + folder + '/negz.png',
      './images/' + folder + '/posx.png',
      './images/' + folder + '/posy.png',
      './images/' + folder + '/posz.png'
    ];
    //create skybox using images
    try {
      this.skybox = new THREE.CubeTextureLoader().load(paths, this.skyboxLoadedCallback);
    } catch (e) {
      console.log("Error loading skybox: " + e);
      return;
    }

  };


  // toggle skybox visibility
  setSkyboxVisibility(visible) {
    // var results = scene.children.filter(function (d) {
    //     return d.name === "skybox"
    // });
    //var skybox = results[0];
    //var skybox = scene.background; // results[0];
    //skybox.visible = visible;
    // check if scene.background is of type THREE.Color
    if (this.scene.background === undefined || this.scene.background === null || this.scene.background.isColor) {
      this.addSkybox();
    } else {
      this.scene.background = null;
      // create blank black background
      this.scene.background = new THREE.Color(0x000000);
    }
    // console.log("skybox: ");
    // console.log(skybox);
    // mark scene as dirty
    this.scene.needsUpdate = true;
  };

  // draw a selected node: increase it's size
  // this.drawSelectedNode = function (nodeObject) {
  //     // todo: check if this is really needed since there is already a toggle for selected in instances
  //     // if (getNodesSelected().indexOf(nodeIndex) == -1) {
  //     //     setNodesSelected(getNodesSelected().length, nodeIndex);
  //     // }
  //     this.updateNodeGeometry(nodeObject, 'selected');
  // };


  //listen for mouse click on canvas
  // this.onDocumentMouseDown = function (event) {
  //     // get mouse position
  //     var vector = new THREE.Vector2();
  //     vector.x = (event.clientX / window.innerWidth) * 2 - 1;
  //     vector.y = -(event.clientY / window.innerHeight) * 2 + 1;
  //     // get intersected object beneath the mouse pointer
  //     var intersectedObject = this.getIntersectedObject(vector);
  //     // if an object was found
  //     if (intersectedObject) {
  //         // log the object to the console
  //         console.log(intersectedObject);
  //         // get the node index
  //         var nodeIndex = intersectedObject.object.name;
  //     } else {
  //         console.log("No intersected object found");
  //     }
  //
  // };
  // the above is not working for some reason, so I am using the following instead


  // get intersected object beneath the mouse pointer
  // detects which scene: left or right
  // return undefined if no object was found

  getIntersectedObject = (vector) => {

    let raycaster = new THREE.Raycaster();

    raycaster.setFromCamera(vector, this.camera);

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
    //return (this.objectsIntersected[0]) ? this.objectsIntersected[0] : null;
  };

  // callback when window is resized
  resizeScene = () => {

    //avoid calling calling to quickly will crash the renderer.
    if (Date.now() - this.lastResizeTime < 50) {
      return;
    } else {
      this.lastResizeTime = Date.now();
    }

    //todo disabled for now straight to else  vrButton.isPresenting() ...  actually removing all WebVR for now
    // if (vrButton && 0) {
    //     camera.aspect = window.innerWidth / window.innerHeight;
    //     renderer.setSize(window.innerWidth, window.innerHeight);
    //     console.log("Resize for Mobile VR");
    // } else {
    if (!this.camera) {
      console.log("resize failed to find camera.");
      this.camera = this.initCamera();
    } else {
      // drop the old camera and create a new one

      this.camera = this.initCamera();
      this.controls = this.initControls();
    }
    let width = window.innerWidth / 2;
    let height = window.innerHeight;
    if (width < 1 || height < 1) {
      // something has gone wrong.
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    console.log("Resize x " + width + " y " + height);
    //}

  };

  // compute shortest path info for a node
  computeShortestPathForNode = (nodeIndex) => {
    console.log("Compute Shortest Path for node " + nodeIndex);
    //setRoot(nodeIndex);
    this.NodeManager.setRootNode(nodeIndex);
    //you can create a side effect for when this happens by passing a function to NodeManager.setRootNodeChanged(callback)
    this.model.computeShortestPathDistances(nodeIndex);
  };

  // draw shortest path from root node up to a number of hops
  updateShortestPathBasedOnHops = () => {
    let hops = this.model.getNumberOfHops();
    let hierarchy = this.model.getHierarchy(getRoot);
    let edges = this.getAllSelectedNodesActiveEdges();
    let edgeIdx = this.model.getEdgesIndeces();
    let previousMap = this.model.getPreviousMap();
    if (!previousMap) {
      return;
    }

    this.removeShortestPathEdgesFromScene();

    for (let i = 0; i < hierarchy.length; ++i) {
      if (i < hops + 1) {
        //Visible node branch
        for (let j = 0; j < hierarchy[i].length; j++) {
          setVisibleNodes(hierarchy[i][j], true);
          let prev = previousMap[hierarchy[i][j]];
          if (prev) {
            this.shortestPathEdges[this.shortestPathEdges.length] = this.createLine(edges[edgeIdx[prev][hierarchy[i][j]]], prev, [prev, i]);
          }
        }
      } else {
        for (let j = 0; j < hierarchy[i].length; ++j) {
          setVisibleNodes(hierarchy[i][j], false);
        }
      }
    }
  };

  updateShortestPathBasedOnDistance = () => {
    this.NodeManager.deselectAll();
    this.removeShortestPathEdgesFromScene();

    // show only nodes with shortest paths distance less than a threshold
    let threshold = this.model.getDistanceThreshold() / 100. * this.model.getMaximumDistance();
    let distanceArray = this.model.getDistanceArray();
    for (let i = 0; i < getVisibleNodesLength(); i++) {
      setVisibleNodes(i, (distanceArray[i] <= threshold));
    }

    let edges = this.model.getActiveEdges(this.model.getNumberOfEdges());
    let edgeIdx = this.model.getEdgesIndeces();
    let previousMap = this.model.getPreviousMap();
    if (!previousMap) {
      return;
    }

    for (let i = 0; i < getVisibleNodesLength(); ++i) {
      if (getVisibleNodes(i)) {
        let prev = previousMap[i];
        if (prev) {
          this.shortestPathEdges[this.shortestPathEdges.length] = this.createLine(edges[edgeIdx[prev][i]], prev, [prev, i]);
        }
      }
    }
  };

  updateShortestPathEdges = () => {
    switch (getShortestPathVisMethod()) {
      case (SHORTEST_DISTANCE):
        this.updateShortestPathBasedOnDistance();
        break;
      case (NUMBER_HOPS):
        this.updateShortestPathBasedOnHops();
        break;
    }
  };

  // prepares the shortest path from a = root to node b
  getShortestPathFromRootToNode = (target) => {
    this.removeShortestPathEdgesFromScene();

    let i = target;
    let prev; // previous node
    let edges = this.model.getActiveEdges();
    let edgeIdx = this.model.getEdgesIndeces();
    let previousMap = this.model.getPreviousMap();

    setVisibleNodes(getVisibleNodes().fill(true));
    while (previousMap[i] != null) {
      prev = previousMap[i];
      setVisibleNodes(prev, true);
      this.shortestPathEdges[this.shortestPathEdges.length] = this.createLine(this.edges[edgeIdx[prev][i]], prev, [prev, i]);
      i = prev;
    }

    this.drawConnections();
  };

  // get intersected object pointed to by Vive/Touch Controller pointer
  // return undefined if no object was found
  //todo this looks familiar, maybe it can be combined with getIntersectedObject
  // main difference between this and getIntersectedObject is this is for a controller
  // while getIntersectedObject is for the mouse or flat screen vector.
  // getPointedObject = (controller) => {
  //   let raycaster = new THREE.Raycaster();
  //   let controllerPosition = controller.position;
  //   let forwardVector = new THREE.Vector3(0, 0, -1);
  //   //get object in front of controller
  //   forwardVector.applyQuaternion(controller.quaternion);
  //   raycaster = new THREE.Raycaster(controllerPosition, forwardVector);
  //   let objectsIntersected = raycaster.intersectObjects(this.scene.children);
  //   return (objectsIntersected[0]) ? objectsIntersected[0] : undefined;
  // }

  // // get the object pointed by the controller
  // var getPointedObject = function (controller) {
  //     var raycaster = new THREE.Raycaster();
  //     //raycaster from controller
  //     raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  //     //raycaster.setFromCamera({x: 0, y: 0}, camera);
  //     var intersects = raycaster.intersectObjects(brain.children, true);
  //     if (intersects.length > 0) {
  //         return intersects[0].object;
  //     }
  //     return null;
  // }

  // updateNodeSpritePos = (nodeObject, targetCanvas = this.nspCanvas) => {
  //
  //   let context = targetCanvas.getContext('2d');
  //
  //   let pos = nodeObject.point;
  //   this.nodeLabelSprite.position.set(pos.x, pos.y, pos.z);
  //   if (true || this.labelsVisible) {
  //     this.nodeLabelSprite.needsUpdate = true;
  //   }
  // }
  //
  // // Update the text and position according to selected node
  // // The alignment, size and offset parameters are set by experimentation
  // // TODO needs more experimentation
  // updateNodeLabel = (text, nodeObject) => {    ///Index) {
  //   //this.updateNodeSpritePos(nodeObject, this.lineplotCanvas);
  //
  //   if (this.labelsVisible === false) return;
  //
  //   let context = this.nspCanvas.getContext('2d');
  //   context.textAlign = 'left';
  //   // Find the length of the text and add enough _s to fill half of the canvas
  //   let textLength = context.measureText(text).width;
  //   let numUnderscores = Math.ceil((this.nspCanvas.width / 2 - textLength) / context.measureText("_").width);
  //   for (let i = 0; i < numUnderscores; i++) {
  //     text = text + "_";
  //   }
  //   //text = text + "___________________________";
  //   context.clearRect(0, 0, 256 * 4, 256);
  //   context.fillText(text, 5, 120);
  //
  //   this.nodeNameMap.needsUpdate = true;
  //   //var pos = glyphs[nodeIndex].position;
  //   let pos = nodeObject.point;
  //   this.nodeLabelSprite.position.set(pos.x, pos.y, pos.z);
  //   //Set Renderorder of label sprites to 1 so they render before the edges and stop obscuring them with transparent planes and making them disappear
  //   this.nodeLabelSprite.renderOrder = 1;
  //   if (this.labelsVisible) {
  //     this.nodeLabelSprite.needsUpdate = true;
  //   }
  // };
  //
  // // Adding Node label Sprite
  //addNodeLabel = (targetCanvas = this.nspCanvas) => {
  //   //this.nspCanvas = document.createElement('canvas');
  //   //moved to constructor.
  //   let size = 256;
  //  targetCanvas.width = size * 4;
  //  targetCanvas.height = size;
  //  let context = targetCanvas.getContext('2d');
  //   context.fillStyle = '#ffffff';
  //   context.textAlign = 'left';
  //  context.font = '88px Arial';
  //   context.fillText("", 0, 0);
  //   //todo bug can't assign a canvas as a texture, extract the texture first.
  //  this.nodeNameMap = new THREE.Texture(targetCanvas);
  //   this.nodeNameMap.needsUpdate = true;
  //
  //   var mat = new THREE.SpriteMaterial({
  //     map: this.nodeNameMap,
  //     transparent: true,
  //     useScreenCoordinates: false,
  //     color: 0xffffff
  //   });
  //
  //   this.nodeLabelSprite = new THREE.Sprite(mat);
  //   this.nodeLabelSprite.scale.set(100, 50, 1);
  //   this.nodeLabelSprite.position.set(0, 0, 0);
  //   // if(previewAreaLeft.labelsVisible) {
  //   //     this.brain.add(this.nodeLabelSprite);
  //   // }
  //   if (this.labelsVisible) {
  //     this.brain.add(this.nodeLabelSprite);
  //   }
  //
  //
  // };

  getCamera = () => {
    return this.camera;
  };

  syncCameraWith = (cam) => {
    this.camera.copy(cam);
    this.camera.position.copy(cam.position);
    this.camera.zoom = cam.zoom;
  };

  // //todo archive or update this
  // getGlyph(nodeIndex) {
  //     if (nodeIndex) {
  //         return glyphs[nodeIndex];
  //     } else {
  //         return null;
  //     }
  // }
  //
  // getGlyphCount() {
  //     return glyphs.length;
  // }

  setAnimation = (amp) => {
    this.amplitude = amp;
  }

  setFlahRate = (freq) => {
    this.frequency = freq;
  }

  imagesLoadedCallback = () => {
    console.log("Images loaded, placing slice images.");
    let slices = this.imageSlices.exportSlices();
    for (let i = 0; i < slices.length; i++) {
      //scale slice to fit brain
      // really shouldn't do this here put in a
      // scale method on the class.
      slices[i].scale.set(1, 1, 1);
      this.brain.add(slices[i]);
      //this.addSkybox();
    }
  }


  rebindNodeManagerCallbacks() {
    this.NodeManager.nodesSelectedGeneralCallback = this.GroupSelectedCallback.bind(this);
    this.NodeManager.nodeSelectedCallback = this.appearSelected.bind(this);
    this.NodeManager.onNodeUnselectCallback = this.appearUnselected.bind(this);
    this.NodeManager.contextualNodeActivated = this.activateContextExampleOnNode.bind(this);
    this.NodeManager.contextualNodeDeactivated = this.deactivateContextOnNode.bind(this);
  }

  activateContextExampleOnNode = (node,data) => {
    //console.log("activate context on node");
    //console.log(node);
    let index = this.NodeManager.node2index(node);
    //set a short timer to highlight the node, doing it on timer to
    //let the backend deal with queueing the context node.

      // calculate color based on position in the highlight list.
      const color = new THREE.Color();
      //start at green and go to yellow then red as the list gets longer
      const startColor = new THREE.Color(0x00ff00); //green
      const midColor = new THREE.Color(0xffff00); //yellow
      const endColor = new THREE.Color(0xff0000); //red


      let weight = data.weight;
      //if weight is greater than 1. then normalize it.
      if(weight > 1.0) {
        weight = weight / this.model.getMaximumWeight();
      }
      //invert weight so that the highest weight is the brightest color.
      weight = 1.0 - weight;
      let maxW = modelLeft.getMaximumWeight();
      let minW = modelLeft.getMinimumWeight();

      //todo look into the usage of threshold multiplier here and in gui.js
      let thresholdMultiplier = (maxW < 1.0) ? 100.0 : 1.0;
      maxW *= thresholdMultiplier;
      let range = maxW - minW;
      // if range is > 1 then normalize it to 1.
      if(range > 1.0) {
        range = range / maxW;
      }
      let colorIndex = (weight - minW) / range;
      //lerp 3 colors, full midcolor within 2% of the middle of the range.
      //lerp from start to mid from 0 to 0.47
      if(colorIndex < 0.47) {
        color.lerpColors(startColor, midColor, colorIndex / 0.47);
      } else if (colorIndex > 0.53) {
        color.lerpColors(midColor, endColor, (colorIndex - 0.53) / 0.47);
      } else {
        color.copy(midColor);
      }

      this.NodeManager.highlightNodeByIndex(index,color.getHex());

  }

  deactivateContextOnNode = (node) => {
    //callback for the deactivation of a context node, this is currently linked to select.
    //console.log("deactivate context on node");
    //console.log(node);
    let index = this.NodeManager.node2index(node);
    this.NodeManager.removeHighlightByIndex(index);
    //this.NodeManager.unhighlightNodeByIndex(index);
    //this.NodeManager.removeContextNodeByIndex(index);
  }



}

export {PreviewArea}
