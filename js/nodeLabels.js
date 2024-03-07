//sprite labels for nodes
import * as THREE from "three";

class NodeLabels {
    constructor(_previewArea, _nodeManager) {
        this.labels = [];
        this.previewArea = _previewArea;
        this.nodeManager = _nodeManager;
        this.nspCanvas = document.createElement('canvas');
        this.nodeNameMap = null;
        this.nodeLabelSprite = null;

        this._state = {
            labelsVisible: this.previewArea.labelsVisible
        };
    }

    removeAllLabels() {
      console.log("removeAllLabels");
      let foundsprites = this.previewArea.brain.children.filter((child) => {
        return child.name === "nodeLabelSprite";
      });
      foundsprites.forEach((sprite) => {
        this.previewArea.brain.remove(sprite);
      });
      this._state.labelsVisible = false;
    }

  // Update the text and position according to selected node
  // The alignment, size and offset parameters are set by experimentation
  // TODO needs more experimentation
  updateNodeLabel  (text, nodeObject)  {    ///Index) {
    //this.updateNodeSpritePos(nodeObject, this.lineplotCanvas);
    if(this.previewArea.labelsVisible === false && !this._state.labelsVisible) {
      return;
    } else
    if (this.previewArea.labelsVisible === false && this._state.labelsVisible) {
      this.removeAllLabels();
      this._state.labelsVisible = this.previewArea.labelsVisible;
    } else if (this.previewArea.labelsVisible === true && this._state.labelsVisible === false) {
      //this.previewArea.brain.add(this.nodeLabelSprite);
      this.addNodeLabel();
      this._state.labelsVisible = this.previewArea.labelsVisible;
    }





    let context = this.nspCanvas.getContext('2d');
    context.textAlign = 'left';
    // Find the length of the text and add enough _s to fill half of the canvas
    let textLength = context.measureText(text).width;
    let numUnderscores = Math.ceil((this.nspCanvas.width / 2 - textLength) / context.measureText("_").width);
    for (let i = 0; i < numUnderscores; i++) {
      text = text + "_";
    }
    //text = text + "___________________________";
    context.clearRect(0, 0, 256 * 4, 256);
    context.fillText(text, 5, 120);

    this.nodeNameMap.needsUpdate = true;
    //var pos = glyphs[nodeIndex].position;
    let pos = nodeObject.point;
    this.nodeLabelSprite.position.set(pos.x, pos.y, pos.z);
    if (this.previewArea.labelsVisible) {
      this.nodeLabelSprite.needsUpdate = true;
    }
  };

  // Adding Node label Sprite
  addNodeLabel(targetCanvas = this.nspCanvas)  {
    //this.nspCanvas = document.createElement('canvas');

    //moved to constructor.
    let size = 256;
    targetCanvas.width = size * 4;
    targetCanvas.height = size;
    let context = targetCanvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.textAlign = 'left';
    context.font = '84px Arial';
    context.fillText("", 0, 0);

    this.nodeNameMap = new THREE.CanvasTexture(targetCanvas);
    this.nodeNameMap.needsUpdate = true;

    var mat = new THREE.SpriteMaterial({
      map: this.nodeNameMap,
      transparent: true,
      //useScreenCoordinates: false,
      color: 0xffffff,
      depthTest: true,
      // renderOrder: 1
      //// drawOrder: 1
    });

    this.nodeLabelSprite = new THREE.Sprite(mat);
    this.nodeLabelSprite.scale.set(100, 50, 1);
    this.nodeLabelSprite.position.set(0, 0, 0);
    // if(previewAreaLeft.labelsVisible) {
    //     this.brain.add(this.nodeLabelSprite);
    // }
    this.nodeLabelSprite.name = "nodeLabelSprite";
    if (this.previewArea.labelsVisible) {
      this.previewArea.brain.add(this.nodeLabelSprite);
    }
    this.nodeLabelSprite.renderOrder = 1;
  };

  labelAllNodes () {
    console.log("labelAllNodes");
    //remove what there is
    this.removeAllLabels();
    console.log("dataset length: ", this.previewArea.model.getDataset().length);

    for (let i = 0; i < this.previewArea.model.getDataset().length; i++) {

      let region = this.previewArea.model.getRegionByIndex(i);
      let node = this.previewArea.NodeManager.index2node(i);
      if(node === undefined || node === null) {
        console.log("index ", i, " is not a node");
        continue;
      }
      //if region is not enabled, do not show label
      if (this.previewArea.model.isRegionActive(region.group) === false) {
        continue;
      }
      this.addNodeLabel();
      this.updateNodeLabel(i+'_'+region.name, node);
      this.previewArea.renderer.render(this.previewArea.scene, this.previewArea.camera);
    }
  }
  updateNodeSpritePos(nodeObject, targetCanvas = this.nspCanvas)  {

    let context = targetCanvas.getContext('2d');

    let pos = nodeObject.point;
    this.nodeLabelSprite.position.set(pos.x, pos.y, pos.z);
    if (true || this.previewArea.labelsVisible) {
      this.nodeLabelSprite.needsUpdate = true;
    }
  };
}

export default NodeLabels;
