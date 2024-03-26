/*
 hud for xr view, build hud around camera from inherited preViewArea class
 *
 */
import * as THREE from 'three';
import canvasGraph from './canvasGraph.js';

class LineGraphs {
    constructor(preViewArea_, container) {
        this.previewArea = preViewArea_;
        this.lineplotCanvas = [];
        this.container = document.getElementById(container);
        this.lineplotData = [];
        this.graphObjects = [];
        //this.renderTextures = [];
        // this.init();
        this.debug = false;
        this.initGraphs();

    }

        // this.canvas = [];
        // this.context = [];
        //
        // for (let i = 0; i < 8; i++) {
        //
        //     this.canvas[i] = document.getElementById('lineplot'+i); //'canvasLeft');
        // // this.flatContext = this.flatCanvas.getContext('2d');
        //     this.context[i] = this.canvas[i].getContext('2d');
        //

    needsUpdate() {
      //needs a proper test.
      this.nddl = this.previewArea.model.nodeDetailData.length;
      if(this.nddl != this.lastNDDL){
        this.lastNDDL = this.nddl;
        return true;
      }
    }
    initGraphs() {
        //if there are already graph objects, remove them
        if (this.graphObjects.length > 0) {
            for (let i = 0; i < this.graphObjects.length; i++) {
                //   //dispose of the texture and material currently on the graph object
                //   this.graphObjects[i].material.map.dispose();
                //   this.graphObjects[i].material.dispose();
                //
                ///// this.hud.remove(this.graphObjects[i]);
            }
            //remove this.renderTextures from memory
            this.renderTextures = [];
            this.graphObjects = [];
        }
        const maxGraphs = 30;
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
                this.container.appendChild(renderCanvas);
                //append a break element to the container
                let br = document.createElement('br');
                this.container.appendChild(br);
            }
            //let renderCanvas = document.createElement('canvas', {id: 'lineplot'});
            //renderCanvas.width = 200;
          //rendercanvas to 100% width of container
            renderCanvas.width = this.container.clientWidth;
            renderCanvas.height = 100;
            let renderContext = renderCanvas.getContext('2d');
            //clear the canvas
            renderContext.clearRect(0, 0, renderCanvas.width, renderCanvas.height);

            let nodeIndex = parseInt(this.previewArea.model.nodeDetailData[i].index.split(' ')[0]);
            let node = this.previewArea.NodeManager.index2node(nodeIndex);
            let nodeColor = node.object.material.color;


            //set the font color
            // construct color string from nodeColor rgb values
            let nodeColorRGB = 'rgb(' + Math.round(nodeColor.r * 255) + ',' + Math.round(nodeColor.g * 255) + ',' + Math.round(nodeColor.b * 255) + ')';
            renderContext.fillStyle = nodeColorRGB; //   'yellow'; //'green'; //'white';

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
            console.log("linedata size: ", linedata.length);
            console.log(linedata);
            //drop anything in data that is not a number
            linedata = linedata.filter((d) => !isNaN(d));
            let graph = new canvasGraph(renderCanvas, linedata, this.graphOptions);
            //add index as line of text at bottom of canvas
            let textlength = renderContext.measureText(this.previewArea.model.nodeDetailData[i].index).width;
            let textoffset = this.container.clientWidth - textlength - 10;
            renderContext.fillText(this.previewArea.model.nodeDetailData[i].index, textoffset, 90);
            //create a texture from the canvas
            //this.renderTextures.push(new THREE.CanvasTexture(renderCanvas));
            //create a material from the texture
            // let renderMaterial = new THREE.MeshBasicMaterial({
            //     map: this.renderTextures[this.renderTextures.length - 1],
            //     transparent: true
            // });
            //create a plane geometry
//            let renderGeometry = new THREE.PlaneGeometry(2, 1);
            //create a mesh from the material and geometry
  //          let renderMesh = new THREE.Mesh(renderGeometry, renderMaterial);
            //scale the mesh to 1/10th of a meter
//            renderMesh.scale.set(0.1, 0.1, 0.1);
            //track the mesh in the graphObjects array
 //           this.graphObjects.push(renderMesh);
            // add the mesh to the hud
            ///// this.hud.add(renderMesh);
            //position the first graph in the top left corner of the hud
            //position subsequent graphs below the previous graph
 //           renderMesh.position.set(-0.35, 0.4 - (0.12 * i), 0);
        }
        //clean up the nodeDetailData array, remove the oldest data sets if there are more than maxGraphs
        if (this.previewArea.model.nodeDetailData.length > maxGraphs) {
            this.previewArea.model.nodeDetailData.splice(0, this.previewArea.model.nodeDetailData.length - maxGraphs);
            //todo: meh, this is a bit of a hack, should be a method in the model
            console.log('pruning nodeDetailData');
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
            /////   this.hud.remove(this.graphObjects[i]);
            // }
            // this.graphObjects = [];
            this.initGraphs();
        } else {
            //do something else like animate the graph
        }

    }
}

export default LineGraphs;
