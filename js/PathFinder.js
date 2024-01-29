// Extension for NodeManager.js,
// PathFinder.js is a class that manages the pathfinding algorithms
// Activates Highlighting of Nodes and Draws Edge Lines for the path

// Requires NodeManager.js
import {NodeManager} from './NodeManager.js';

// PathFinder class
class PathFinder {
  constructor(NodeManager_, previewArea_) {

    this.NodeManager = NodeManager_;
    this.PreviewArea = previewArea_;
    this.activeAlgorithm = null;
    this.ready = false;
    this.active = false;
    this.highlightActive = true;
    this.highlightNotActive = false;

    this.callbackOnFinish = null;
    this.callbackOnFailure = null;
  }

  setCallbackOnFinish(callback) {
    this.callbackOnFinish = callback;
  }

  setCallbackOnFailure(callback) {
    this.callbackOnFailure = callback;
  }

  // Set the active algorithm
  setActiveAlgorithm(algorithm) {

    // check that the algorithm is a valid class.
    // set start and end nodes
    if (algorithm === null) {
      console.log("Algorithm is null. Please select an algorithm.\n" +
        "Currently supported algorithms\n" +
        ": Dijkstra\n" +
        "Pathfinder.setActiveAlgorithm(aClass)\n");
      return;
    }

    if (algorithm === "Dijkstra") {
      this.activeAlgorithm = new Dijkstra(this.NodeManager, this.PreviewArea);
    } else {
      console.log("Algorithm not supported. Please select an algorithm.\n" +
        "Currently supported algorithms\n" +
        ": Dijkstra\n" +
        "Pathfinder.setActiveAlgorithm(aClass)\n");
      return;
    }

    if (this.activeAlgorithm != null) {
      // verify that the algorithm has the required methods

      if (this.NodeManager.selectedNodesCount === 2) {
        // set start and end nodes
        console.log("PathFinder: Setting start and end nodes from active NodeManager selectedNodes.")
        if (this.NodeManager.selectedNodes.length === 2) {
          // the extra check above is largely unnecessary, but it's a good sanity check
          // and will help with debugging, remove it if you want.
          this.activeAlgorithm.setStartNode(this.NodeManager.index2node(this.NodeManager.selectedNodes[0]));
          this.activeAlgorithm.setEndNode(this.NodeManager.index2node(this.NodeManager.selectedNodes[1]));
          this.status = 'ready';
          this.ready = this.activeAlgorithm.ready;
        }
      } else {


        console.log("Please set start and end nodes before running algorithm.");
        return;
      }


    } else {
      // throw error
      console.log("Algorithm is null. Please select an algorithm.\n" +
        "Currently supported algorithms\n" +
        ": Dijkstra\n" +
        "Pathfinder.setActiveAlgorithm(aClass)\n");
    }

  }

  // Get the active algorithm
  getActiveAlgorithm() {
    // Return name of active algorithm
    if (this.activeAlgorithm == null) {
      return "No algorithm selected.";
    }
    return this.activeAlgorithm.getAlgorithmName();
  }

  setStartNode(node) {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    this.activeAlgorithm.setStartNode(node);
    if (this.activeAlgorithm.EndNode !== null) {
      if (this.activeAlgorithm.getStatus() === "ready")
        this.ready = true;
    }
  }

  setEndNode(node) {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    this.activeAlgorithm.setEndNode(node);
    if (this.activeAlgorithm.StartNode !== null) {
      if (this.activeAlgorithm.getStatus() === "ready") {
        this.ready = true;
      }
    }
  }

  // Run the active algorithm
  start() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    if (this.activeAlgorithm.getStatus() === "ready") {
      this.active = true;
      this.activeAlgorithm.start();
    } else {
      console.log("Algorithm not ready. Please set start and end nodes.\n" +
        "Pathfinder.setStartNode(node)\n" +
        "Pathfinder.setEndNode(node)\n" + "Pathfinder.start()\n");
    }
  }

  // Stop the active algorithm
  stop() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }

    this.active = false;


    this.activeAlgorithm.stop();
  }

  update() {
    if (this.active !== true) {
      return;
    }
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected. Call PathFinder.stop() to stop updating.");
      return;
    }
    let status = this.activeAlgorithm.getStatus();
    //get status of algorithm and run one step if it is running
    if (status === "running") {
      this.activeAlgorithm.step();
    } else if (status === "failed") {
      console.log("Algorithm failed.");
      this.active = false;
      if (this.callbackOnFailure !== null) {
        this.callbackOnFailure(this.activeAlgorithm.getStatus());
      } else {
        console.log("No callbackOnFailure set. Call PathFinder.setCallbackOnFailure(callback) to set callback.");
      }
      this.stop();
    } else if (status === "finished") {
      console.log("Algorithm finished.");
      this.active = false;
      if (this.callbackOnFinish !== null) {
        this.callbackOnFinish(this.getPathObj());
        this.stop();
      } else {
        console.log("No callbackOnFinish set. Call PathFinder.setCallbackOnFinish(callback) to set callback.");
      }
      this.status = "finished";
      this.stop();

    } else if (status === "not ready") {
      this.active = false;
    }

  }

  // Get the path nodes
  getPathObj() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    return this.activeAlgorithm.getPath();
  }

  // Get the status of the algorithm
  getStatus() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    return this.activeAlgorithm.getStatus();
  }

  // Get the algorithm name
  getAlgorithmName() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    return this.activeAlgorithm.getAlgorithmName();
  }

  reset() {
    this.activeAlgorithm.reset();
    this.ready = false;
  }

}

// Dijkstra algorithm for pathfinding through NodeManager edges
class Dijkstra {
  constructor(NodeManager_, PreviewArea_) {
    this.running = false;
    this.ready = false;
    this.StartNode = null;
    this.EndNode = null;
    this.NodeManager = NodeManager_;
    this.PreviewArea = PreviewArea_;

    this.status = "not ready";

    this.savedContext = null; // the currently active context function

    this.priQueue = new Set();  // priority queue of nodes
    this.visited = new Set();  // set of visited nodes
    this.distance = new Map();  // map of nodes to their distance from the start node
    this.parentMap = new Map(); // map of nodes to their parent nodes

    this.bestPath = [];
    this.bestPathDistance = 0;

    this.sCount = 0; // a counter for the number of steps taken in the algorithm

  }

  reset() {
    this.running = false;
    this.ready = false;
    this.StartNode = null;
    this.EndNode = null;

    this.status = "not ready";

    this.savedContext = null; // the currently active context function
    this.sCount = 0; // a counter for the number of steps taken in the algorithm
  }

  // Set the start node, required for pathfinder
  setStartNode(StartNode_) {
    console.log("Dijkstra setting start node: " + this.NodeManager.node2index(StartNode_));
    if (StartNode_ !== null) {
      this.StartNode = StartNode_;
    } else {
      console.log("Dijkstra StartNode is null.");
    }

    if (this.EndNode !== null) {
      this.ready = true;
      this.status = "ready";
    }
  }

  // Set the end node, required for pathfinder
  setEndNode(EndNode_) {
    console.log("Dijkstra setting end node: " + this.NodeManager.node2index(EndNode_));
    if (EndNode_ !== null) {
      this.EndNode = EndNode_;
    } else {
      console.log("Dijkstra EndNode is null.");
    }


    if (this.StartNode !== null) {
      this.ready = true;
      this.status = "ready";
    }
  }

  getAlgorithmName() {
    return "Dijkstra";
  }

  // Get the path nodes
  getPath() {
    let path = [];
    let sni = this.NodeManager.node2index(this.StartNode);
    let eni = this.NodeManager.node2index(this.EndNode);

    if (!this.parentMap.has(eni)) {
      console.log("Dijkstra end node has no parent.");
      this.status = "failed";
      this.running = false;
      return;
    }
    path.unshift(this.EndNode);   // add the end node at the beginning
    for(let ni = this.parentMap.get(eni); ni !== sni; ni = this.parentMap.get(ni)) {
      path.unshift(this.NodeManager.index2node(ni));
    }

    path.unshift(this.StartNode); // add the start node at the beginning


    return {
      path: path,
      distance: this.distance.get(eni) // get distance for the end node
    };
  }


  // Get the status of the algorithm
  getStatus() {
    return this.status;
  }

  start() {
    console.log("Dijkstra start");

    //hijacking context for this.
    if (this.NodeManager.contextualNodeActivated !== null) {
      //only using this as an example of how a context function can be restored.
      //needs to save the list of contextual nodes and restore them.
      this.savedContext = this.NodeManager.contextualNodeActivated;
      this._context = this.NodeManager.resetContext();
    }
    this.NodeManager.contextualNodeActivated = this.contextCallback.bind(this);

    this.NodeManager.removeHighlight(this.StartNode); // remove highlight from so that we can change it ourselves.
    this.NodeManager.highlightNode(this.StartNode, 0xFFFFFF); //white is the color of the start node
    this.NodeManager.removeHighlight(this.EndNode); // remove highlight from so that we can change it ourselves.
    this.NodeManager.highlightNode(this.EndNode, 0x000000); //black is the color of the end node

    if (this.StartNode === this.EndNode) {
      console.log("Dijkstra start and end nodes are the same.");
      this.status = "failed";
      this.running = false;
      return;
    }

    console.log("Dijkstra start node: " + this.NodeManager.node2index(this.StartNode));
    console.log(this.StartNode);
    //add start node to queue
    let sni = this.NodeManager.node2index(this.StartNode);
    this.priQueue.add(sni);
    this.distance.set(sni, 0);
    this.status = "running";
    this.running = true;

  }

  contextCallback(node, color) {
    // This is triggered when the algo adds a node to the path
    //console.log("Dijkstra looking at node: " + this.NodeManager.node2index(node));
    //setTimeout(() => {
    let ni = this.NodeManager.node2index(node);
    let sni = this.NodeManager.node2index(this.StartNode);
    let eni = this.NodeManager.node2index(this.EndNode);
    if (ni !== sni && ni !== eni) {
      this.NodeManager.highlightNodeByIndex(ni, 0x00FF00);
    }
    this.PreviewArea.drawEdgesGivenIndex(ni);
    //}, 10);
    setTimeout(() => {
      //check if node is in current path if not remove highlight
      // if(this.path.includes(node) === false) {
      //   this.NodeManager.removeHighlight(node);
      //   this.PreviewArea.removeEdgeGivenNode(node);
      //
      //}
      let ni = this.NodeManager.node2index(node);
      let sni = this.NodeManager.node2index(this.StartNode);
      let eni = this.NodeManager.node2index(this.EndNode);
      if (ni !== sni && ni !== eni) {
        this.NodeManager.removeHighlightByIndex(ni);
      }
      this.PreviewArea.removeEdgeGivenNode(node);
    }, 1000);
  }

  step() {
    if (this.running === false) {
      return false;
    }
    this.sCount += 1;
    // this is the main loop of the algorithm
    // it is called by the update function
    //console.log('Dijkstra step');
    if (this.priQueue.size === 0) {
      console.log("Priority queue is empty. Dijkstra's algorithm has already terminated.");
      this.status = "finished";
      return true;
    }
    //estimate queue size
    let queueSize = this.priQueue.size;
    //console.log("Dijkstra queue size: " + queueSize + " sCount: " + this.sCount);
    let node = this.NodeManager.index2node(this.dequeueMin());
    if (node === null) {
      console.log("Priority queue is empty. Dijkstra's algorithm has already terminated.");
      this.status = "finished";
      return true;
    }
    //console.log("Dijkstra dequeued node: " + this.NodeManager.node2index(node));
    this.NodeManager.addContextNode(node);
    this.exploreNeighbors(node);

    if (this.priQueue.size === 0) {
      console.log("Priority queue is empty. Dijkstra's algorithm has already terminated.");
      this.status = "finished";
      return true;
    }

    return false;


  }

  exploreNeighbors(node) {
    for (let edge of this.NodeManager.getEdges(node)) {
      let neighborI = edge.targetNodeIndex;

      // Use helper function to calculate shortest path distance
      let distance = this.getShortestPathDistance(edge, neighborI);

      if (distance !== null && this.pathSizeWithinRange(neighborI)) {
        //neighbor index
        let ni = neighborI;
        let sni = this.NodeManager.node2index(node);

        // Use helper function to update path data
        this.updatePathData(ni, sni, distance);
      }
    }
  }

// Extracted helper function to calculate shortest path distance
  getShortestPathDistance(edge, neighborI) {
    let distance = this.distance.get(edge.sourceNodeIndex) + edge.weight;

    // If this distance is longer than the existing one, return null
    if (this.distance.has(neighborI) && distance >= this.distance.get(neighborI)) {
      return null;
    }

    return distance;
  }

// Extracted helper function to update path data
  updatePathData(ni, sni, distance) {
    this.distance.set(ni, distance);
    this.parentMap.set(ni, sni);
    this.priQueue.add(ni);
  }

  pathSizeWithinRange(neighborI) {
    let currentIndex = neighborI;
    let pathLength = 0;
    let x = 0;
    //random between 0 and 10
    //todo make this a parameter
    let y = Math.floor(Math.random() * 10) + 1;
    // Calculate the path length by traversing parents
    let sni = this.NodeManager.node2index(this.StartNode);
    while (currentIndex !== sni) {
      pathLength++;
      currentIndex = this.parentMap.get(currentIndex);
      if (!currentIndex) {
        // Reached the start node or encountered an unreachable node
        break;
      }
    }

    // Check if the path length is within the specified range [x, y]
    return pathLength >= x && pathLength <= y;
  }

  getDistance(node1, node2) {
    let edge = this.NodeManager.getEdge(node1, node2);
    if (edge) {
      return edge.weight;
    } else {
      return Infinity;
    }
  }

  dequeueMin() {
    if (this.priQueue.size === 0) {
      return null;
    }
    let min = Infinity;
    let minNode = null;
    for (let index of this.priQueue) {
      //console.log("Dijkstra queue index: " + index);

      //let node = this.NodeManager.index2node(index);
      //raw object
      //console.log(node)
      if (this.distance.get(index) < min) {
        min = this.distance.get(index);
        minNode = index;
      }
    }
    //console.log("Dijkstra min node: ");
    //console.log(minNode);
    this.priQueue.delete(minNode);
    return minNode;
  }

  calculateTotalPathCost(path) {
    let totalCost = 0;

    let sni = this.NodeManager.node2index(this.StartNode);
    let eni = this.NodeManager.node2index(this.EndNode);
    console.log("Dijkstra start: " + sni + " end: " + eni);
    console.log("Dijkstra path: " + this.NodeManager.node2index(path[0]) + " " + this.NodeManager.node2index(path[path.length - 1]));

    for (let i = 0; i < path.length - 1; i++) {
      let edge = this.NodeManager.getEdge(path[i], path[i + 1]);
      if (edge === null) {
        console.log("Dijkstra edge is null.");
        return;
      }
      totalCost += edge.weight;
    }


    return totalCost;
  }

  stop() {
    console.log("Dijkstra stop");
    if (this.running === true && this.status !== "finished") {
      if (this.status !== "finished") {
        this.status = "stopped";
        console.log("Dijkstra paused.");
      } else {
        console.log("Dijkstra failed.");
      }
      this.running = false;
      //this.NodeManager.resetContext();
      //console.log("restoring context");
      // example of restoring context
      //this.NodeManager.contextualNodeActivated = this.savedContext;
      //this.NodeManager.setContextualNodesByIndex(this._context);

    } else {
      if (this.running === false) {
        console.log("Dijkstra already stopped.");
      } else {
      this.running = false;
      this.status = "finished";
      console.log("Dijkstra finished.");
      }
    }

  }

}

export {PathFinder};
