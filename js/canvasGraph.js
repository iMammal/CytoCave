
import * as d3 from 'd3';
class canvasGraph {
  constructor(canvas, data, options) {
    this.canvas = canvas;
    this.data = data;

    this.ctx = this.canvas.getContext('2d');
    //apply options
    for (let key in options) {

        this.ctx[key] = options[key];

    }
    // example d3.csv fetch
    // let dataset = [];
    // d3.csv("https://localhost/dataRet?range=1-10").then(
    //   function (data) {
    //   console.log("d3Data");
    //   console.log(data);
    //     data.forEach(function (d) {
    //       dataset.push(d);
    //     } );
    //   });
    // console.log("d3Dataset");
    // console.log(dataset);


    this.draw();
  }

  draw() {
    this.drawAxes();
    this.drawData();
  }

  drawAxes() {
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height);
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.moveTo(0, this.canvas.height);
    this.ctx.lineTo(0, 0);
    this.ctx.stroke();
  }

  drawData() {
    let xStep = this.canvas.width / this.data.length;
    let yStep = this.canvas.height / Math.max(...this.data);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - this.data[0] * yStep);
    for (let i = 1; i < this.data.length; i++) {
      this.ctx.lineTo(i * xStep, this.canvas.height - this.data[i] * yStep);
    }
    this.ctx.stroke();
  }
}

export default canvasGraph;
