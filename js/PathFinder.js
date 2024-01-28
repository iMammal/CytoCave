// Extension for NodeManager.js,
// PathFinder.js is a class that manages the pathfinding algorithms
// Activates Highlighting of Nodes and Draws Edge Lines for the path

// Requires NodeManager.js
import { NodeManager } from './NodeManager.js';
import { PreviewArea } from './previewArea.js';
import {modelLeft} from "./model";

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
    if(algorithm === null) {
      console.log("Algorithm is null. Please select an algorithm.\n" +
        "Currently supported algorithms\n" +
        ": A*\n" +
        "Pathfinder.setActiveAlgorithm(aClass)\n");
      return;
    }

    if(algorithm === "A*") {
      this.activeAlgorithm = new AStar(this.NodeManager, this.PreviewArea);
    } else {
      console.log("Algorithm not supported. Please select an algorithm.\n" +
        "Currently supported algorithms\n" +
        ": A*\n" +
        "Pathfinder.setActiveAlgorithm(aClass)\n");
      return;
    }

    if (this.activeAlgorithm != null) {
      // verify that the algorithm has the required methods

        if (this.NodeManager.selectedNodesCount === 2) {
          // set start and end nodes
          console.log("PathFinder: Setting start and end nodes from active NodeManager selectedNodes.")
          if(this.NodeManager.selectedNodes.length === 2) {
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
      console.log( "Algorithm is null. Please select an algorithm.\n" +
      "Currently supported algorithms\n" +
      ": A*\n" +
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
    if(this.activeAlgorithm.EndNode !== null) {
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
    if(this.activeAlgorithm.StartNode !== null) {
      if(this.activeAlgorithm.getStatus() === "ready") {
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
    this.activeAlgorithm.stop();
  }

  update() {
    if(this.active !== true) {
      return;
    }
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected. Call PathFinder.stop() to stop updating.");
      return;
    }
    let status = this.activeAlgorithm.getStatus();
    //get status of algorithm and run one step if it is running
    if(status === "running") {
      this.activeAlgorithm.step();
    } else if(status === "failed") {
      console.log("Algorithm failed.");
      this.active = false;
      if(this.callbackOnFailure !== null) {
        this.callbackOnFailure(this.activeAlgorithm.getStatus());
      } else {
        console.log("No callbackOnFailure set. Call PathFinder.setCallbackOnFailure(callback) to set callback.");
      }
    } else if(status === "finished") {
      console.log("Algorithm finished.");
      this.active = false;
      if(this.callbackOnFinish !== null) {
        this.callbackOnFinish(this.activeAlgorithm.getPathNodes());
      } else {
        console.log("No callbackOnFinish set. Call PathFinder.setCallbackOnFinish(callback) to set callback.");
      }
      this.status = "finished";

    } else if(status === "not ready") {
      this.active = false;
    }

  }

  // Get the path nodes
  getPathNodes() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    return this.activeAlgorithm.getPathNodes();
  }

  // Get the failed path nodes
  getFailedPathNodes() {
    if (this.activeAlgorithm == null) {
      console.log("No algorithm selected.");
      return;
    }
    return this.activeAlgorithm.getFailedPathNodes();
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

// A* algorithm for pathfinding through NodeManager edges
class AStar {
  constructor(NodeManager_, PreviewArea_) {
    this.running = false;
    this.ready = false;
    this.StartNode = null;
    this.EndNode = null;
    this.NodeManager = NodeManager_;
    this.PreviewArea = PreviewArea_;
    this.path = [];
    this.cost = []; // cost of the path per hop
    this.failedPath = []; //path that failed, or was more expensive than the best path
    this.visited = []; // nodes that have been visited in this iteration
    this.status = "not ready";
    this.edges = []; // a list of the active edges the under processing node is connected to
    this.savedContext = null; // the currently active context function
    this.bestPath = null;
    this.bestPathDistance = null;
    this.pathObject = {}; // return for successful path {path: this.bestPath, distance: this.bestPathDistance}
    this.currentNode = undefined;
    this.currentEdge = undefined;
    this.edges = [];
  }

  reset() {
    this.running = false;
    this.ready = false;
    this.StartNode = null;
    this.EndNode = null;
    this.path = [];
    this.failedPath = [];
    this.visited = [];
    this.status = "not ready";
    this.pathObject = {}; // return for successful path {path: this.path, distance: distance}
    this.edges = []; // a list of the active edges the under processing node is connected to

    this.savedContext = null; // the currently active context function
  }

  // Set the start node, required for pathfinder
  setStartNode(StartNode_) {
    console.log("A* setting start node: " + this.NodeManager.node2index(StartNode_));
    if(StartNode_ !== null) {
      this.StartNode = StartNode_;
    } else {
      console.log("A* StartNode is null.");
    }

    if(this.EndNode !== null) {
      this.ready = true;
      this.status = "ready";
    }
  }

  // Set the end node, required for pathfinder
  setEndNode(EndNode_) {
    console.log("A* setting end node: " + this.NodeManager.node2index(EndNode_));
    if(EndNode_ !== null) {
      this.EndNode = EndNode_;
    } else {
      console.log("A* EndNode is null.");
    }


    if(this.StartNode !== null) {
      this.ready = true;
      this.status = "ready";
    }
  }
  getAlgorithmName() {
    return "A*";
  }

  // Get the path nodes
  getPathNodes() {
    this.pathObject = {path: this.bestPath, distance: this.bestPathDistance};
    return this.pathObject;
  }

  // Get the failed path nodes
  getFailedPathNodes() {
    return this.failedPath;
  }

  // Get the status of the algorithm
  getStatus() {
    return this.status;
  }

  start() {
    console.log("A* start");
    this.running = true;
    this.status = "running";
    this.edges = this.NodeManager.getEdges(this.StartNode);
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
    this.currentNode = this.StartNode;

    this.path.push(this.currentNode);
    this.visited.push(this.currentNode);
  }

  contextCallback(node,color) {
    // This is triggered when the algo adds a node to the path
    console.log("A* looking at node: " + this.NodeManager.node2index(node));
    //setTimeout(() => {
      this.NodeManager.highlightNode(node, 0x00FF00);
      //activate edges on the node
      this.PreviewArea.drawEdgesGivenIndex(this.NodeManager.node2index(node));
    //}, 10);
    setTimeout(() => {
      //check if node is in current path if not remove highlight
      if(this.path.includes(node) === false) {
        this.NodeManager.removeHighlight(node);
        this.PreviewArea.removeEdgeGivenNode(node);
      }

    },1000);
  }

  step() {
    if(!this.running) {
      console.log("A* not running.");
      return;
    }

    //this.currentNode is the node we are currently processing
    //this.edges is the list of edges being processed, it already contains the edges of nextNode

    // Check if we are at the end
    if(this.NodeManager.node2index(this.currentNode) === this.NodeManager.node2index(this.EndNode)) {
      let pathCost = this.calculateTotalPathCost(this.path);
      this.bestPath = this.path.slice();
      this.bestPathDistance = pathCost;
      console.log("A* found path.");
      // Continue searching for more paths
      this.edges.shift();
      if (this.edges.length === 0) {
        console.log("Best Path Obj:")
        console.log(this.bestPath);

        console.log("A* finished. Best path: " + this.bestPathDistance + " hops: " + this.bestPath.length);
        this.status = "finished";
        this.running = false;

        return;
      } else {
        if (this.bestPath === null) {
          console.log("A* found first path.");
          this.bestPath = this.path.slice();
          this.bestPathDistance = pathCost;
          this.path.pop(); // remove the end node from the path
        } else {
          //if total cost of path is less than best path, replace best path
          //add cost of the current path
          //let pathCost = this.calculateTotalPathCost(this.path);
          if(pathCost < this.bestPathDistance || this.path.length < this.bestPath.length) {
            console.log("A* found better path.");
            console.log("Path is " + this.path.length + " hops long. And costs " + pathCost);
            this.bestPath = this.path.slice();
            this.bestPathDistance = pathCost;
            this.path.pop(); // remove the end node from the path
          } else {
            console.log("A* found worse path.");
            console.log("Path is " + this.path.length + " hops long. And costs " + pathCost);
            this.path = [] // remove the end node from the path
            //clear visited nodes
            this.visited = [];
            //add start node to visited nodes
            this.visited.push(this.NodeManager.node2index(this.StartNode));
            //add the last node in the path to the visited nodes
            this.visited.push(this.NodeManager.node2index(this.currentNode));
            //set the current node to the start node
            this.currentNode = this.StartNode;
          }
        }

      }
    }

    // add the edges from the current node to the list of edges
    if(this.edges.length === 0) {
      //but only if it hasn't been visited
      let newEdges = this.NodeManager.getEdges(this.currentNode);
      //check if any of the edges point to the end node

        this.edges = this.edges.concat(newEdges);
        //remove edges that point to visited nodes
        this.edges = this.edges.filter((edge) => {
          if(this.visited.includes(edge.targetNodeIndex)) {
            return false;
          } else {
            return true;
          }
        });
        //check if any of the edges point to the end node

    }
    //sort the edges by cost
    this.edges.sort((a, b) => this.getEdgeCost(a) - this.getEdgeCost(b));
    //add place cost data on the edges
    this.edges.forEach((edge) => {
      edge.cost = this.getEdgeCost(edge);
    });
    //look for next unvisited node in this.edges with current node as sourceNodeIndex
    //remove edges pointing to visited nodes
    console.log(this.currentEdge);

    do {
      this.currentEdge = this.edges.shift();
      if(this.currentEdge === undefined) {
        break;
      }
      //check if visited, remove from edges if visited
      if(this.visited.includes(this.currentEdge.targetNodeIndex)
      || this.path.includes(this.NodeManager.index2node(this.currentEdge.targetNodeIndex))) {

        //remove that edge from the list of edges

      } else {
        break;
      }

      // // If all nodes have been visited, break the loop
      // if (this.visited.length === this.NodeManager.nodes.length) {
      //   console.log("All nodes have been visited. Stopping the algorithm.");
      //   this.running = false;
      //   this.status = "failed";
      //   break;
      // }

    } while(this.edges.length > 0);



    //if there are no more edges, the while loop above will remove all edges and we will be at a dead end
    if(this.currentEdge === undefined) {
      //we are at a dead end, go back to the previous node
      //remove the current node from the path
      console.log("A* dead end, backtracking.") ;
      this.path.pop();
      if(this.path.length === 0) {
        this.status = "finished";
        this.running = false;
        console.log("A* finished. All paths have been explored.");
      }
      this.visited.push(this.NodeManager.node2index(this.currentNode));
      //set the current node to the previous node
      this.currentNode = this.path[this.path.length - 1];
    }



    const maxPathLength = 10;
    // Check if the path is too long
    if (this.path.length > maxPathLength) {
      console.log("A* path is too long, backtracking.");
      //console.log("Path is " + this.path.length + " hops long. And costs " + this.path.reduce((a, b) => a + b.weight, 0));
      // We are at a dead end, go back to the previous node
      // Remove the current node from the path
      this.path.pop();
      // Set the current node to the previous node
      this.currentNode = this.path[this.path.length - 1];
    } else {
      //add the edge to the path
      if(this.currentEdge === undefined) {
        return true;
      }
      this.path.push(this.NodeManager.index2node(this.currentEdge.targetNodeIndex));
      this.visited.push(this.currentEdge.targetNodeIndex);
      // Set the current node to the target node of the current edge
      this.currentNode = this.NodeManager.index2node(this.currentEdge.targetNodeIndex);
      // Highlight the node
      this.NodeManager.addContextNode(this.currentNode);
    }

    //check if any of the edges point to the end node



    console.log("Remaining edges: " + this.edges.length +
      " Path length: " + this.path.length + " Visited: " + this.visited.length + " Total Nodes: " +
        this.PreviewArea.model.getDataset().length);



  }

  getEdgeCost(edge) {
    // returns the cost of the edge + all the hops before it
    let positionalCost = 0;
    for(let i = 0; i < this.path.length; i++) {
      if(this.path[i] === this.NodeManager.index2node(edge.sourceNodeIndex)) {
        positionalCost += i;
      }
    }
    if(this.NodeManager.index2node(edge.targetNodeIndex) === this.EndNode) {
      positionalCost = 0; // straight to the end saves some cost. otherwise guess.
    }

    return positionalCost + edge.weight;// + positionalCost;
  }

  calculateTotalPathCost(path) {
    let totalDistance = 0;

    return totalDistance;
  }

  stop() {
    console.log("A* stop");
    if(this.running === true) {
      if(this.status !== "failed") {
        this.status = "stopped";
        console.log("A* paused.");
      } else {
        console.log("A* failed.");
      }
      this.running = false;
      this.NodeManager.resetContext();
      console.log("restoring context");
      // example of restoring context
      this.NodeManager.contextualNodeActivated = this.savedContext;
      this.NodeManager.setContextualNodesByIndex(this._context);

    } else {
     this.running = false;
     this.status = "finished?";
    }


  }


}

export { PathFinder, AStar };
