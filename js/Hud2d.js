/*
 hud for 2d view, build hud around camera from inherited preViewArea class
 *
 */
import * as THREE from 'three';
import canvasGraph from './canvasGraph.js';

class Hud2D {
    constructor(preViewArea_) {
        this.previewArea = preViewArea_;

        this.canvas = [];
        this.context = [];

        for (let i = 1; i < 9; i++) {

            this.canvas[i] = document.getElementById('lineplot'+i); //'canvasLeft');
        // this.flatContext = this.flatCanvas.getContext('2d');
            this.context[i] = this.canvas[i].getContext('2d');


        this.lineplotData = [];

        // this.init();
        this.debug = false;

        let fakeData = [];
        for (let i = 0; i < 25; i++) {
            fakeData.push(0.5+0.1*Math.random());
        }
        this.lineplotData = fakeData;
        this.graphOptions = {
            width: 200,
            height: 60,
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
        let graph = new canvasGraph(this.canvas[i], this.lineplotData, this.graphOptions); // canvas, data, options
        }
    }

    init() {
        // Initialize HUD content, such as drawing a static background or initial set of data
        this.generateFakeData();
        this.drawGraph();
    }

    generateFakeData() {
        // Generate some fake data for demonstration purposes
        let fakeData = [];
        for (let i = 0; i < 25; i++) {
            fakeData.push(Math.random() * 100); // Random data
        }
        this.lineplotData = fakeData;
    }

    drawGraph() {
        // Clear the canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw the graph based on `this.lineplotData` and `this.graphOptions`
        // This is where you'd integrate a graph drawing logic, similar to canvasGraph usage in XRHud
        // For simplicity, here's a basic line drawing example:
        this.context.beginPath();
        this.context.strokeStyle = this.graphOptions.strokeStyle;
        this.context.lineWidth = this.graphOptions.lineWidth;
        let xScale = this.graphOptions.width / this.lineplotData.length;
        let yScale = this.graphOptions.height / Math.max(...this.lineplotData);
        this.lineplotData.forEach((val, i) => {
            let x = i * xScale;
            let y = this.canvas.height - (val * yScale); // Invert y-axis
            if (i === 0) this.context.moveTo(x, y);
            else this.context.lineTo(x, y);
        });
        this.context.stroke();
    }

    update() {
        // Update the HUD content dynamically
        // For example, generate new data and redraw the graph
        //this.generateFakeData(); // Generate new data for demonstration
        //this.drawGraph(); // Redraw the graph with new data
        let newLineplotData = [];
        console.log("nodeDetailData: ");
        console.log(this.previewArea.model.nodeDetailData);
        //check if nodeDetailData is empty
        if (this.previewArea.model.nodeDetailData.length === 0) {
            console.log("nodeDetailData empty");
            //probably should wrap the whole loop instead of returning here
            return;
        }

        // for loop from 1 to 8

        for (const row of this.previewArea.model.nodeDetailData[this.previewArea.model.nodeDetailData.length - 1]) {

            //newLineplotData.push(this.previewArea.model.nodeDetailData[row].time);
            newLineplotData.push(row[1]);
            // if there are more than 25 data points, remove the first 2
            if (newLineplotData.length > 500) {
                newLineplotData.shift();
                newLineplotData.shift();
            }
        }
        this.lineplotData = newLineplotData;
        console.log("lineplotData: ");
        console.log(this.lineplotData);
        //clear the canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        //draw the graph
        let graph = new canvasGraph(this.canvas, this.lineplotData, this.graphOptions); // canvas, data, options


    }

    // Method to call from the animation loop
    animate() {
        this.update(); // Update the HUD each frame
    }
}

export default Hud2D;