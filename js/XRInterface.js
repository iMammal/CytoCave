//webxr controller interface for neurocave previewarea
import {VRButton} from "three/examples/jsm/webxr/VRButton.js";

class XRInterface {
  constructor(renderer, scene, controls, clock, name, NodeManager) {
    this.renderer = renderer;
    this.scene = scene;
    this.controls = controls;
    this.clock = clock;
    this.name = name;
    this.NodeManager = NodeManager;

    this.enableVR = true;
    this.activateVR = false;

    this.xrDolly = new THREE.Group();

    this.initXR();

    //if you need side effects that are not covered by the class you can register callbacks here
    this.leftControllerTriggerSelectStartCallback = null;
    this.leftControllerTriggerSelectEndCallback = null;
    this.rightControllerTriggerSelectStartCallback = null;
    this.rightControllerTriggerSelectEndCallback = null;
    this.leftControllerGripSelectStartCallback = null;
    this.leftControllerGripSelectEndCallback = null;
    this.rightControllerGripSelectStartCallback = null;
    this.rightControllerGripSelectEndCallback = null;
    this.leftThumbstickMovementCallback = null;
    this.rightThumbstickMovementCallback = null;
    this.buttonPressStartCallback = null;
    this.buttonPressEndCallback = null;
    this.buttonHeldCallback = null;
    this.controllerAddedCallback = null;
    this.controllerRemovedCallback = null;
  }

  getTriggerPressures(){
    return [this.controllerLeft.gamepad.buttons[1].value, this.controllerRight.gamepad.buttons[1].value];
  }

  initXR() {
    console.log("Init XR for PV: " + this.name);
    this.renderer.xr.enabled = true;

    const onSelectStart = () => {
      this.userData.isSelecting = true;
      console.log("Select start");
    };

    const onSelectEnd = () => {
      this.userData.isSelecting = false;
      console.log("Select end");
    };

    const v3Origin = new THREE.Vector3(0, 0, 0);
    const v3UnitUp = new THREE.Vector3(0, 0, -100);

    this.controllerLeft = this.renderer.xr.getController(0);
    this.controllerLeft.addEventListener("selectstart", onSelectStart);
    this.controllerLeft.addEventListener("selectend", onSelectEnd);
    this.controllerLeft.addEventListener("connected", (event) => {
      this.controllerLeft.gamepad = event.data.gamepad;
      console.log("Left controller connected");
      console.log("event data: ");
      console.log(event.data);
      this.xrInputLeft = event.data;
      this.controllerLeft.add(this.drawPointer(v3Origin, v3UnitUp));
    });

    this.controllerLeft.addEventListener("disconnected", () => {
      this.remove(this.children[0]);
    });
    this.scene.add(this.controllerLeft);

    this.controllerRight = this.renderer.xr.getController(1);
    this.controllerRight.addEventListener("selectstart", onSelectStart);
    this.controllerRight.addEventListener("selectend", onSelectEnd);
    this.controllerRight.addEventListener("connected", (event) => {
      this.controllerRight.gamepad = event.data.gamepad;
      console.log("Right controller connected: ");
      console.log("event data: ");
      this.xrInputRight = event.data;
      console.log(event.data);
      this.controllerRight.add(this.drawPointer(v3Origin, v3UnitUp));
    });

    this.controllerRight.addEventListener("disconnected", () => {
      this.remove(this.children[0]);
    });
    this.scene.add(this.controllerRight);

    const controllerModelFactory = new XRControllerModelFactory();

    this.controllerGripLeft = this.renderer.xr.getControllerGrip(0);
    this.controllerGripLeft.add(
      controllerModelFactory.createControllerModel(this.controllerGripLeft)
    );
    this.scene.add(this.controllerGripLeft);

    this.controllerGripRight = this.renderer.xr.getControllerGrip(1);
    this.controllerGripRight.add(
      controllerModelFactory.createControllerModel(this.controllerGripRight)
    );
    this.scene.add(this.controllerGripRight);

    document
      .getElementById("vrButton" + this.name)
      .appendChild(VRButton.createButton(this.renderer));
  }

  updateXR() {
    if (this.xrInputLeft && this.xrInputRight) {
      this.controls.enabled = false;
      if (this.camera !== this.renderer.xr.getCamera()) {
        this.camera = this.renderer.xr.getCamera();
        console.log("camera changed to vr camera");
      }

      if (!this.camera.parent) {
        this.xrDolly.add(this.camera);
        this.xrDolly.add(this.controllerLeft);
        this.xrDolly.add(this.controllerRight);
        this.xrDolly.add(this.controllerGripLeft);
        this.xrDolly.add(this.controllerGripRight);
        this.scene.add(this.xrDolly);
        this.xrDolly.position.z = -100;
        console.log("xrDolly moved back to fit brain in view");
        console.log("camera added to dolly, dolly added to scene");
      }

      const cameraMaxTranslationSpeed = 10;
      const cameraMaxRotationSpeed = 0.06;
      const translationDecay = 0.01;
      const rotationDecay = 0.01;
      const maxTranslationAcceleration = 0.1;
      const maxRotationAcceleration = 0.1;

      const currentTranslationSpeed = new THREE.Vector3(0, 0, 0);
      const currentRotationSpeed = new THREE.Vector3(0, 0, 0);

      const delta = this.clock.getDelta();

      const handleThumbstick = (controller, isLeft) => {
        const thumbstickX = controller.gamepad.axes[2];
        const thumbstickY = controller.gamepad.axes[3];
        const thumbstickXIncrement = thumbstickX * cameraMaxTranslationSpeed;
        const thumbstickYIncrement = thumbstickY * cameraMaxTranslationSpeed;

        let thumbstickXIncrementLimited = thumbstickXIncrement;
        if (thumbstickXIncrementLimited > maxTranslationAcceleration) {
          thumbstickXIncrementLimited = maxTranslationAcceleration;
        }
        if (thumbstickXIncrementLimited < -maxTranslationAcceleration) {
          thumbstickXIncrementLimited = -maxTranslationAcceleration;
        }

        let thumbstickYIncrementLimited = thumbstickYIncrement;
        if (thumbstickYIncrementLimited > maxTranslationAcceleration) {
          thumbstickYIncrementLimited = maxTranslationAcceleration;
        }
        if (thumbstickYIncrementLimited < -maxTranslationAcceleration) {
          thumbstickYIncrementLimited = -maxTranslationAcceleration;
        }

        currentTranslationSpeed.x += thumbstickXIncrementLimited;
        currentTranslationSpeed.z += thumbstickYIncrementLimited;

        const decay = isLeft ? translationDecay : rotationDecay;
        currentTranslationSpeed.x -= currentTranslationSpeed.x * decay * delta;
        currentTranslationSpeed.y -= currentTranslationSpeed.y * decay * delta;
        currentTranslationSpeed.z -= currentTranslationSpeed.z * decay * delta;

        if (Math.abs(currentTranslationSpeed.x) < 0.001) {
          currentTranslationSpeed.x = 0;
        }
        if (Math.abs(currentTranslationSpeed.y) < 0.001) {
          currentTranslationSpeed.y = 0;
        }
      };

      if (this.xrInputLeft && this.xrInputLeft.gamepad.axes.length > 0) {
        handleThumbstick(this.controllerLeft, true);
      }

      if (this.xrInputRight && this.xrInputRight.gamepad.axes.length > 0) {
        handleThumbstick(this.controllerRight, false);
      }

      this.xrDolly.translateX(currentTranslationSpeed.x);
      this.xrDolly.translateY(currentTranslationSpeed.y);
      this.xrDolly.translateZ(currentTranslationSpeed.z);
      this.xrDolly.rotateX(currentRotationSpeed.x);
      this.xrDolly.rotateY(currentRotationSpeed.y);
      this.xrDolly.rotateZ(currentRotationSpeed.z);
    } else {

      if (Date.now() - this.lastControllerLog > 60000) {
        console.log(this.controllerLeft);
        console.log(this.controllerRight);
        this.lastControllerLog = Date.now();
      }
    }
  }

  drawPointer(v3Origin, v3UnitUp) {
    // implementation for drawing pointer
  }
  getNearestNodes(controller) {
    // implementation for getting nearest nodes
  }
  getPointedObject(controller) {
    // implementation for getting pointed object
  }

  updateNodeSelection() {
    // implementation for updating node selection
  }

  updateNodeMoveOver() {
    // implementation for updating node move over
  }

  update() {
    this.updateXR();

    const pointedObjectLeft = this.getPointedObject(this.controllerLeft);
    this.updateNodeMoveOver(this.model, pointedObjectLeft, 2);

    const pointedObjectRight = this.getPointedObject(this.controllerRight);
    this.updateNodeMoveOver(this.model, pointedObjectRight, 4);

    if (!pointedObjectLeft && !pointedObjectRight) {
      this.updateNodeMoveOver(this.model, null, 6);
    }

    if (VRButton.xrSessionIsGranted) {
      if (this.controllerLeftSelectState && !this.controllerLeft.userData.isSelecting) {
        const isLeft = true;
        const pointedObject = this.getPointedObject(this.controllerLeft);
        this.NodeManager.toggleSelectNode(pointedObject);
        this.NodeManager.highlightNode(pointedObject);
        console.log("Left controller: " + this.controllerLeft.userData.isSelecting);
        console.log("Left controller: ");
        console.log(pointedObject);
      }

      if (this.controllerRightSelectState && !this.controllerRight.userData.isSelecting) {
        const isLeft = true;
        const pointedObject = this.getPointedObject(this.controllerRight);
        this.NodeManager.toggleSelectNode(pointedObject);
        this.NodeManager.highlightNode(pointedObject);
        console.log("Right controller: " + this.controllerRight.userData.isSelecting);
        console.log("Right controller: ");
        console.log(pointedObject);
      }
    }

    this.controllerLeftSelectState = this.controllerLeft.userData.isSelecting;
    this.controllerRightSelectState = this.controllerRight.userData.isSelecting;

    this.pointerRight = null;
  }
}
