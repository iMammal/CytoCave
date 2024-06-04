/**
 * Created by giorgioconte on 31/01/15.
 */
/*
private variables
 */
import * as d3 from './external-libraries/d3'
import {labelLUT, dataFiles, atlas, folder, setDataFile, setAtlas} from "./globals";
//import { Graph } from './utils/Dijkstra'
import Graph from 'node-dijkstra';
//import { GPUForceEdgeBundling } from "./utils/gpu-forcebundling.js"; // Todo: Fix Edge Bundling
import * as THREE from 'three'
import {Platonics} from "./polyhedron";
import * as math from 'mathjs'
import {sunflower} from "./graphicsUtils";
import {setNodeInfoPanel} from "./GUI";
import {loadDetailsFile} from "./utils/parsingData";
import {Atlas} from "./atlas";


function Model(side) {
    var groups = {};                    // contain nodes group affiliation according to Anatomy, place, rich club, id
    var activeGroup;                    // active group name
    var regions = {};                   // activeGroup activation (T/F) and state: active, transparent or inactive
    var labelKeys;                      // map between each node and its corresponding Atlas label
    var icColorTable = [];
    var dataset = [];                   // contains compiled information about the dataset according to the active coloring
                                        // scheme and topology

    var centroids = {};                 // nodes centroids according to topological spaces: centroids[node][technique] = (x,y,z)
    var topologies = [];                // available topologies
    var clusteringTopologies = [];      // available clustering topologies
    var heatmapTopologies = [];      // available heatmap topologies
    var activeTopology;                 // isomap, MDS, anatomy, tsne, PLACE, selection from centroids
    var nodesDistances = {};            // Euclidean distance between the centroids of all nodes
    let previousMap = {};               // previous map of nodesDistances

    this.connectionMatrix = [];          // adjacency matrix
    var distanceMatrix = [];            // contains the distance matrix of the model: 1/(adjacency matrix)
    var nodesStrength = [];

    this.minConnectionMatrix = 1;
    this.maxConnectionMatrix = 1;


    var threshold = 0;                  // threshold for the edge value, default to 0, max, all edges  //todo this is currently being used a a weight threshold. maybe scale to 0-1? figure out what it's supposed to actually threshold.
    var conthreshold = 0;               // threshold for the contralateral edge value, default to 1, max, no edges
    var numberOfEdges = 0;              // threshold the number of edges for shortest paths, 0 for all edges, topN edges if not in shortest path.
    this.minConnectionMatrix = 1;
    this.maxConnectionMatrix = 1;



    var threshold = 0.01;                  // threshold for the edge value, default to 1, max, no edges
    var conthreshold = 1;               // threshold for the contralateral edge value, default to 1, max, no edges
    var numberOfEdges = 5;              // threshold the number of edges for shortest paths

    var edges = [];                     // contains the edges per dataType
    var edgeIdx = [];                   // 2D matrix where entries are the corresponding edge index

    var distanceArray = [];                  // contain the shortest path for current selected node
    var maxDistance = null;             // max value of distanceArray
    var distanceThreshold = 0;         // threshold for the distanceArray in percentage of the max value: 0 to 100
    var numberOfHops = 0;               // max number of hops for shortest path
    this.graph = new Graph();

    var metricValues = [];

    this.metricQuantileScale;

    var clusters = {};                  // PLACE clusters, assumed level 4: clusters from 1 to 16
    var heatmaps = {};                  // PLACE clusters, assumed level 4: clusters from 1 to 16
    var maxClusterHierarchicalLevel = 4;// max clustering hierarchical level
    var clusteringLevel = 4;            // default PLACE/PACE level
    var clusteringGroupLevel = 4;       // clustering group level used for color coding, 1 to 4
    var clusteringRadius = 5;           // sphere radius of PLACE/PACE visualization
    this.maxNumberOfLeftClusters = 0;   // max number of left clusters
    this.maxNumberOfLeftNodes = 0;  // max number of left nodes

    this.DetailsFilesList = [];
    this.nodeDetailData = [];

    var name = side;

    // TODO: disable edge bundling for now to get rest of code working
    // enabling again... re-disabling... things got complicated...
    //var fbundling = GPUForceEdgeBundling().cycles(6).iterations(60).enable_keep_programs(true);

    this.clearModel = function (side) {
        groups = [];
        regions = {};
        icColorTable = [];

        centroids = {};
        topologies = [];
        clusteringTopologies = [];
        clusters = {};
        nodesDistances = {};

        this.DetailsFilesList = [];

        this.connectionMatrix = [];
        distanceMatrix = [];

        edges = [];
        edgeIdx = [];

        if (side) {
            name = side;
        }
    };


    // data ready in model ready
    this.ready = function () {
        return (labelKeys && centroids && this.connectionMatrix);
    };


    // set the iso center color table ???
    this.setICColor = function (icData) {
        icColorTable = icData.data;
    };

    this.getDistanceArray = function () {
        return distanceArray;
    };

    // get the longest shortest path of the current selected node = the farthest node
    this.getMaximumDistance = function () {
        return maxDistance;
    };

    // store map between each node and its corresponding Atlas label#
    this.setLabelKeys = function (data, loc) {
        labelKeys = [];
        // data[0] is assumed to contain a string header
        for (var j = 1; j < data.length; j++) {
            labelKeys.push(data[j][loc]);
        }
    };

    // setting activeGroup: 0 = Anatomy, 1 = place, 2 = rich club, 3 = PLACE, 4 = id
    this.setActiveGroup = function (group) {
        activeGroup = group;
    };

    this.getActiveGroupName = function () {
        return activeGroup;
    };

    this.getName = function () {
        return name;
    };

    // create groups in order: Anatomy, place, rich club, id
    this.createGroups = function () {
        console.log("create groups");
        var len = labelKeys.length;
        var names = atlas.getGroupsNames();
        for (var i = 0; i < names.length; ++i)
            groups[names[i]] = new Array(len);

        for (var i = 0; i < len; ++i) {
            var label = labelKeys[i];
            //`console.log(label)
            var region = atlas.getRegion(label);
            for (var j = 0; j < names.length; ++j)
                groups[names[j]][i] = region[names[j]];
        }

        if (this.hasClusteringData()) {
            for (var i = 0; i < clusteringTopologies.length; ++i) {
                var topology = clusteringTopologies[i];
                groups[topology] = clusters[topology][clusters[topology].length - 1];
            }
        }

        if (false && this.hasHeatmapData()) {   // TODO: roll heatmap data into clustering data for now
            for (var i = 0; i < heatmapTopologies.length; ++i) {
                var topology = heatmapTopologies[i];
                groups[topology] = heatmaps[topology][heatmaps[topology].length - 1];
            }
        }



        activeGroup = names[0];
        this.prepareDataset();
    };

    // update the clustering group level, level can be 1 to 4
    this.updateClusteringGroupLevel = function (level) {
        if (this.hasClusteringData() && clusteringTopologies.indexOf(activeGroup) > -1 && clusters[activeGroup].length > 1) {
            groups[activeGroup] = clusters[activeGroup][level - 1];
            clusteringGroupLevel = level;
        }
    };

    this.getClusteringGroupLevel = function () {
        return clusteringGroupLevel;
    };

    // return the group affiliation of every node according to activeGroup
    this.getActiveGroup = function () {
        var l = groups[activeGroup].length;
        var results = [];
        for (var i = 0; i < l; i++) {
            var element = groups[activeGroup][i];
            if (results.indexOf(element) == -1) {
                results[results.length] = element;
            }
        }
        return results;
    };


    // isomap, MDS, anatomy, tsne, selection from centroids
    this.setActiveTopology = function (topology) {
        if (activeTopology === topology)
            return;

        activeTopology = topology;
        this.computeEdgesForTopology(topology);
    };

    this.getActiveTopology = function () {
        return activeTopology;
    };

    //todo: These are the distances between the nodes in the selected topology used for edge bundling calculations.
    // This is not the same as the distance matrix used for the shortest path calculations.
    this.computeNodesDistances = function (topology) {
        nodesDistances[topology] = [];
        // var cen = centroids[topology];
        // var nNodes = cen.length;
        // var distances = new Array(nNodes);
        // for (var i = 0; i < nNodes; i++) {
        //     distances[i] = new Array(nNodes);
        // }
        // for (var i = 0; i < nNodes; i++) {
        //     for (var j = i; j < nNodes; j++) {
        //         distances[i][j] = cen[i].distanceTo(cen[j]);
        //         distances[j][i] = distances[i][j];
        //     }
        // }
        // nodesDistances[topology] = distances;

    };

    // store nodes centroids according to topological spaces
    // technique can be: Isomap, MDS, tSNE, anatomy ...
    this.setCentroids = function (d, topology, offset) {
        var data = [];
        // data[0] is assumed to contain a string header
        for (var i = 1; i < d.length; i++) {
            //console.log("i,d[i]:",i, d[i]);
            data.push(new THREE.Vector3(d[i][0 + offset], d[i][1 + offset], d[i][2 + offset]));
        }
        centroids[topology] = scaleCentroids(data);
        this.computeNodesDistances(topology);
    };

    // set shortest path distance threshold and update GUI
    this.setDistanceThreshold = function (dt) {
        distanceThreshold = dt;
    };

    // get shortest path distance threshold
    this.getDistanceThreshold = function () {
        return distanceThreshold;
    };

    // store edge threshold and update GUI
    this.setThreshold = function (t) {
        threshold = t;
    };

    // get edge threshold
    this.getThreshold = function () {
        return threshold;
    };

    // store contralateral edge threshold and update GUI
    this.setConThreshold = function (t) {
        conthreshold = t;
    };

    // get edge threshold
    this.getConThreshold = function () {
        return conthreshold;
    };

    // set connection matrix from JSON file
    this.setConnectionMatrixFromJSON = function (jsonData) {
        //const connectionMatrix = math.sparse(jsonData);
        this.connectionMatrix = math.SparseMatrix.fromJSON(jsonData);

        console.log(`Successfully created the sparse matrix from JSON data.`);
        this.computeDistanceMatrix();
        this.computeNodalStrength();
        //console.log(connectionMatrix);  // This will print the sparse matrix. You can do further processing if needed.
    }

    // set connection matrix from CSV file
    this.setConnectionMatrix = function (d) {
        //console.log("set connection matrix:",Papa);
        this.connectionMatrix = math.sparse();
        if (d.data[0].length == 3) {
            // Process each data row
            for (let i = 0; i < d.data.length; i++) {
                const row = d.data[i];
                const from = row[0];
                const to = row[1];
                const weight = row[2];

                // Assign the weight to the corresponding position in the sparse matrix
                this.connectionMatrix.set([from, to], weight);
                // let text = "from: " + from + " to: " + to + " weight: " + weight;
                // setNodeInfoPanel(1,1,text);
                //if(i % 1000 == 0) {
                //    console.log(text);
                // }
            }
        } else {
            this.connectionMatrix = math.sparse(d.data); // d.data;
        }
        this.computeDistanceMatrix();
        this.computeNodalStrength();
    };

    // prepare the dataset data
    this.prepareDataset = function () {
        dataset = [];
        for (var i = 0; i < labelKeys.length; i++) {
            var label = labelKeys[i];
            var region = atlas.getRegion(label);
            dataset[i] = {
                position: centroids[activeTopology][i],
                name: region.region_name,
                group: groups[activeGroup][i],
                hemisphere: region.hemisphere,
                label: label
            };
        }
    };

    // Not just a getter. Also adds/updates position and group info into the dataset according to activeTopology
    // Maybe it should be split up into a getter and an updater?
    this.getDataset = function (update = false) {
        if (update) {
            for (var i = 0; i < dataset.length; i++) {
                // console.log("i,activeTopology:", i, activeTopology);
                // console.log("activeGroup:", activeGroup);
                // console.log("centroids[activeTopology][i]:", centroids[activeTopology][i]);
                // console.log("groups[activeGroup][i]:", groups[activeGroup][i]);
                dataset[i].position = centroids[activeTopology][i];
                dataset[i].group = groups[activeGroup][i];
            }
        }
        return dataset;
    };

    // get connection matrix according to activeMatrix
    this.getConnectionMatrix = function () {
        return this.connectionMatrix;
    };

    // get a row (one node) from connection matrix
    this.getConnectionMatrixRow = function (index) {
        // log the index
        //console.log("index:",index);
        //console.log("ConnectionMatrix Size:",connectionMatrix.size());
        //console.log("ConnectionMatrix:",connectionMatrix);
        //let row = connectionMatrix.subset(math.index(index,math.range(0,connectionMatrix.size()[0]))).toArray().slice(0);

        const size = this.connectionMatrix.size()[1];

        // if (false) {
        //     const range = math.range(0, size);
        //     const rowindex = math.index(index, range);
        //     const rowA = connectionMatrix.subset(rowindex);
        // }

        const rowVector = math.zeros([size,1]);
        rowVector[index][0] = 1; //.set([index], 1);

        let row = math.multiply(this.connectionMatrix, rowVector);

        // let row = connectionMatrix.subset();
        //
        // // Create a vector of zeros
        // const vector = math.zeros(connectionMatrix.size()[0]+1);
        //
        // // Set the nth value to one (e.g., n = 10)
        //
        // vector.set([index], 1);
        //
        // // Multiply the vector by the matrix to get the nth row vector
        // const nthRow = math.multiply(connectionMatrix,vector);
        //
        // console.log(nthRow);


        //console.log("Row: ");
        //console.log(row);
        return row;

        //return connectionMatrix.subset(math.index(index,math.range(0,connectionMatrix.size()[0]))).toArray().slice(0);

    };

    // get the group of a specific node according to activeGroup
    this.getGroupNameByNodeIndex = function (index) {
        return groups[activeGroup][index];
    };

    // return if a specific region is activated
    this.isRegionActive = function (regionName) {
        return regions[regionName].active;
    };

    // toggle a specific region in order: active, transparent, inactive
    // set activation to false if inactive
    this.toggleRegion = function (regionName, state) {
        if (state) {
            regions[regionName].state = state;
            if (state === 'inactive') {
                regions[regionName].active = false;
            } else {
                regions[regionName].active = true;
            }
        } else {
            switch (regions[regionName].state) {
                case 'active':
                    regions[regionName].state = 'transparent';
                    regions[regionName].active = true;
                    break;
                case 'transparent':
                    regions[regionName].state = 'inactive';
                    regions[regionName].active = false;
                    break;
                case 'inactive':
                    regions[regionName].state = 'active';
                    regions[regionName].active = true;
                    break;
            }
        }
    };

    this.getCurrentRegionsInformation = function () {
        return regions;
    };

    // get region state using its name
    this.getRegionState = function (regionName) {
        //console.info("regionName:", regionName);
        // verify if regionName is a valid region
        if (regions[regionName] === undefined) {
            console.error("regionName is not valid");
            return;
        }
        return regions[regionName].state;
    };

    this.getRegionActivation = function (regionName) {
        return regions[regionName].active;
    };

    this.setCurrentRegionsInformation = function (info) {
        for (var element in regions) {
            if (info[element]) {
                regions[element] = info[element];
            }
        }
    };

    // set all regions active
    this.setAllRegionsActivated = function () {
        regions = {};
        for (var i = 0; i < groups[activeGroup].length; i++) {
            var element = groups[activeGroup][i];
            if (regions[element] === undefined)
                regions[element] = {
                    active: true,
                    state: 'active'
                }
        }
    };

    // set all regions inactive
    this.setLeftRegionsActivated = function () {
        regions = {};
        for (var i = 0; i < groups[activeGroup].length; i++) {
            var element = groups[activeGroup][i];
            if  (regions[element] === undefined)
                if ( ( element <= this.maxNumberOfLeftClusters ) || ( typeof(element) !== "number" ) ) {
                    regions[element] = {
                        active: true,
                        state: 'active'
                    }
                } else {
                    regions[element] = {
                        active: false,
                        state: 'inactive'
                    }
                }
        }
    };

    // get the connection matrix number of nodes
    this.getConnectionMatrixDimension = function () {
        return this.connectionMatrix.size()[1]; //length;
    };

    // get top n edges connected to a specific node
    this.getTopIpsiLateralConnectionsByNode = function (indexNode, n) {
        var row = this.getConnectionMatrixRow(indexNode);
	var tmprow = row.slice();
	var hemisphere = dataset[indexNode].hemisphere;
	if (hemisphere) {
		console.log("Hemi:", hemisphere);
		for (var i = 0; i < row.length; i++){
			if(dataset[i].hemisphere !== hemisphere) {
				tmprow[i] = 0;
			}
		}
	}
	console.log(row,tmprow);
        //var sortedRow = this.getConnectionMatrixRow(indexNode).sort(function (a, b) {
        var sortedRow = tmprow.sort(function (a, b) {
            return b - a
        }); //sort in a descending flavor
        var indexes = new Array(n);
        for (var i = 0; i < n; i++) {
            indexes[i] = row.indexOf(sortedRow[i]);
        }
        return indexes;
    };

    // get top n edges connected to a specific node
    this.getTopContraLateralConnectionsByNode = function (indexNode, n) {
        var row = this.getConnectionMatrixRow(indexNode);
	var tmprow = row.slice();
	var hemisphere = dataset[indexNode].hemisphere;
	if (hemisphere) {
		console.log("Hemi:", hemisphere);
		for (var i = 0; i < row.length; i++){
			if(dataset[i].hemisphere === hemisphere) {
				tmprow[i] = 0;
			}
		}
	}
	console.log(row,tmprow);
        //var sortedRow = this.getConnectionMatrixRow(indexNode).sort(function (a, b) {
        var sortedRow = tmprow.sort(function (a, b) {
            return b - a
        }); //sort in a descending flavor
        var indexes = new Array(n);
        for (var i = 0; i < n; i++) {
            indexes[i] = row.indexOf(sortedRow[i]);
        }
        return indexes;
    };

	// get top n edges connected to a specific node
    this.getTopConnectionsByNode = function (indexNode, n) {
        var row = this.getConnectionMatrixRow(indexNode);
        var sortedRow = this.getConnectionMatrixRow(indexNode).sort(function (a, b) {
            return b - a
        }); //sort in a descending flavor
        var indexes = new Array(n);
        for (var i = 0; i < n; i++) {
            indexes[i] = row.indexOf(sortedRow[i]);
        }
        return indexes;
    };


    this.getMaximumWeight = function () {
        return this.maxConnectionMatrix;
        // return d3.max(this.connectionMatrix, function (d) {
        //     return d3.max(d, function (d) {
        //         return d;
        //     })
        // });
    };

    this.getMinimumWeight = function () {
        return this.minConnectionMatrix;
        // return d3.min(this.connectionMatrix, function (d) {
        //     return d3.min(d, function (d) {
        //         return d;
        //     })
        // });
    };

    this.getNumberOfEdges = function () {
        return numberOfEdges;
    };

    this.setNumberOfEdges = function (n) {
        numberOfEdges = n;
    };

    // get the region data of a specific node
    this.getRegionByIndex = function (index) {
        return dataset[index];
    };

    this.setMetricValues = function (data) {
        metricValues = data.data;

        this.metricQuantileScale = d3.scale.quantile()
            .domain(metricValues)
            .range(['#000080', '#0000c7', '#0001ff', '#0041ff', '#0081ff', '#00c1ff', '#16ffe1', '#49ffad',
                '#7dff7a', '#b1ff46', '#e4ff13', '#ffd000', '#ff9400', '#ff5900', '#ff1e00', '#c40000']);

        console.log("loaded metric file");
    };

// Jet colormap
//'#000080','#0000c7','#0001ff','#0041ff','#0081ff','#00c1ff','#16ffe1','#49ffad','#7dff7a',
// '#b1ff46','#e4ff13','#ffd000','#ff9400','#ff5900','#ff1e00','#c40000'
// Mine colormap
//'#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'

    /* BCT Stuff*/
    // compute nodal strength of a specific node given its row
    this.getNodalStrength = function (idx) {
        return nodesStrength.get([idx, 0]);
    };

    this.computeNodalStrength = function () {
        var nNodes = this.connectionMatrix.size()[1];//length;
        // nodesStrength = new Array(nNodes);
        // for (var i = 0; i < nNodes; ++i)
        //     nodesStrength[i] = d3.sum(this.getConnectionMatrixRow(i));

        const OnesVector = math.ones([nNodes,1]);
        nodesStrength = math.multiply(this.connectionMatrix, OnesVector);

    };
// // old compute distance
//     compute distance matrix = 1/(adjacency matrix)
//     this.computeDistanceMatrix = function () {
//         var nNodes = connectionMatrix.length;
//         distanceMatrix = new Array(nNodes);
//         graph = new Graph();
//         var idx = 0;
//         // for every node, add the distance to all other nodes
//         for (var i = 0; i < nNodes; i++) {
//             var vertexes = [];
//             var row = new Array(nNodes);
//             edgeIdx.push(new Array(nNodes));
//             edgeIdx[i].fill(-1); // indicates no connection
//             for (var j = 0; j < nNodes; j++) {
//                 vertexes[j] = 1 / connectionMatrix[i][j];
//                 row[j] = 1 / connectionMatrix[i][j];
//                 if (j > i && Math.abs(connectionMatrix[i][j]) > 0) {
//                     edgeIdx[i][j] = idx;
//                     idx++;
//                 }
//             }
//             distanceMatrix[i] = row;
//             graph.addVertex(i, vertexes);
//         }
//
//         // mirror it
//         for (var i = 0; i < nNodes; i++) {
//             for (var j = i + 1; j < nNodes; j++) {
//                 edgeIdx[j][i] = edgeIdx[i][j];
//             }
//         }
//         console.log("Distance Matrix Computed");
//     };
    // compute distance matrix = 1/(adjacency matrix)
    this.computeDistanceMatrix = function() {
        const nNodes = this.connectionMatrix.size()[1];

        this.graph = new Graph();
        const distanceMatrix = this.connectionMatrix.map((value, index) => {
            const i = index[0];
            const j = index[1];
            //this.graph.addNode(i.toString(), {j.toString(): value});  //todo: fix j

            const newmap = new Map();
            newmap.set(j.toString(), value); //            j.toString(): value);

            this.graph.addNode(i.toString(),newmap);

            if (value < this.minConnectionMatrix) this.minConnectionMatrix = value;
            if (value > this.maxConnectionMatrix) this.maxConnectionMatrix = value;

            if (value !== 0) {
                return 1 / value;
            }
            return 0;
        }, true); // skipZeros=true

        //const graph = new Graph();

        // Assign the computed distanceMatrix and edgeIdx to class variables
        this.distanceMatrix = distanceMatrix;

        return;

        //edgeIdx is not used anymore.
        // but we create it anyway for the sake of consistency
        // use also create the graph for SPT
        let idx = 0; // Initialize idx to 0
        edgeIdx = this.connectionMatrix.map((value, index) => {
            const i = index[0];
            const j = index[1];
            this.graph.addNode(i.toString(), {j: value});

            if (true || (j > i)) { // && Math.abs(value) > 0) {
                let result = idx++; // St1ext iteration
                //edgeIdx.set([j, i], result); // Set the symmetric entry
                return result;
            }
            return 0; //-1; // Return -1 for (j < i) entries
        }, true); // skipZeros=true

        //let edgeIdxTr = edgeIdx.transpose();
        //lets try not doing this:
        if (false) {
            idx = 0; // Initialize idx to 0
            edgeIdx.forEach((value, index) => {
                const i = index[0];
                const j = index[1];
                edgeIdx.set([j, i], value);
                return value;

                // if (j > i) { // && Math.abs(value) > 0) {
                //     edgeIdx.set([j, i], idx++); // Set the symmetric entry
                // } else {
                //     return edgeIdx.get([i, j]);
                // }
            }, true); // skipZeros=true
        }
        //     let retval = 0;
        //     idx = idx + 1;
        //
        //     // if (value === -1) {
        //     //     retval = 0;
        //     // }
        //
        //     if (i === j) {
        //         return 1; // i=j entries set matrix diagonal to 1
        //     }
        //
        //     if (j < i) {
        //         retval = (edgeIdx.get([j, i]));
        //     } else {
        //         retval = value;
        //     }
        //     if (retval === -1) {
        //         retval = 0;
        //     }
        //     return retval;
        // },true);

        //console.log("edgeIdx", edgeIdx);


        // for (let i = 0; i < nNodes; i++) {
        //     const row = connectionMatrix
        //         .subset(math.index(i, math.range(0, connectionMatrix.size()[0])))
        //         .toArray()
        //         .filter(value => value !== 0);
        //     graph.addVertex(i, row);
        // }


        // Assign edgeIdx to class variables
        this.edgeIdx = edgeIdx;
    };


    // compute shortest path from a specific node to the rest of the nodes
    this.computeShortestPathDistances = function (rootNode) {
        console.log("computing spt");
        var nNodes = this.connectionMatrix.size()[1];
        distanceArray = [];
        for (var i = 0; i < nNodes; i++) {
            const pathArray = this.graph.path(String(rootNode), String(i));
            if(pathArray) {
                distanceArray[i]=(pathArray.length);

            } else {
                distanceArray[i] = -1;  //nNodes+nNodes;
            }  //graph.shortestPath(String(rootNode));
        }
        maxDistance = d3.max(distanceArray);
    };

    this.getHierarchy = function (rootIndex) {
        return graph.getHierarchy(rootIndex);
    };

    this.getPreviousMap = function () {
        return (this.previousMap) ? this.previousMap : null;
    };

    this.getMaxNumberOfHops = function () {
        return maxDistance; //  graph.getMaxNumberOfHops();  // maxDistance can be standin for maxNumberOfHops for now
    };

    this.setNumberOfHops = function (hops) {
        numberOfHops = hops;
    };

    this.getNumberOfHops = function () {
        return numberOfHops;
    };

    this.getPathArray = function (rootIndex,targetId) {
        return this.graph.path(rootIndex, targetId);
    }

    this.treeLevel = function (nNodes, face) {
        let points = new Array(nNodes);
        //var n = face.length;
        let scaleFactor = 4.0;
        let faceLength = math.sqrt( math.sum( math.dot(math.subtract(face[2],face[0]),math.subtract(face[2],face[0]) ) ) );
        let faceDelta = scaleFactor *  faceLength / nNodes;
        let x = face[0][0], y = face[0][1], z = face[0][2];
        for (let i = 0; i < nNodes; i++) {

            // for (var j = 0; j < n; j++) {

            x += faceDelta;//[j][0];
            // y += faceDelta;//[j][1];
            // z += faceDelta;//[j][2];
            //}
            points[i] = [x, y, z];
        }
        return points;
    }

    // compute the position of each node for a clustering topology according to clustering data
    // in case of PLACE or PACE, clustering level can be 1 to 4, clusters[topology][level]
    // in case of other clustering techniques: Q-modularity, no hierarchy information is applied
    // clusters[topology][0] contains the clustering information.
    // clusters starts by 1 not 0.
    this.computeNodesLocationForClusters = function (topology) {
        var platonic = new Platonics();
        var isHierarchical = topology === "PLACE" || topology === "PACE";
        var isHeatmap = topology.indexOf("HEATMAP") !== -1;
        var isTree = topology.indexOf("Tree") !== -1;
        var level = isHierarchical ? clusteringLevel - 1 : 0;
        var cluster = clusters[topology][level];
        var totalNNodes = cluster.length;
        var maxNumberOfClusters = d3.max(cluster) - d3.min(cluster) + 1;
        var nClusters = ((isHierarchical)) ? Math.pow(2, clusteringLevel) : maxNumberOfClusters;
        // if hierarchical but the nClusters > maxNumberOfClusters
        // this only happens if the provided data have < 4 levels
        // of clusters. The clusteringLevel should discover that
        nClusters = Math.min(nClusters, maxNumberOfClusters);

        if(isHeatmap) {
            console.error("Can not visualize heatmap data.");
            return;
        }

        if (isTree)
            platonic.createTree();
        else if (maxNumberOfClusters < 4)
            platonic.createTetrahedron();
        else if (maxNumberOfClusters < 7)
            platonic.createCube();
        else if (maxNumberOfClusters < 12)
            platonic.createDodecahedron();
        else if (maxNumberOfClusters <= 20)
            platonic.createIcosahedron();
        else {
            console.error("Can not visualize clustering data.");
            return;
        }
        // use one of the faces to compute primary variables

        var face = platonic.getFace(0);

        var coneAxis = math.mean(face, 0);
        coneAxis = math.divide(coneAxis, math.norm(coneAxis));
        var theta = Math.abs(Math.acos(math.dot(coneAxis, face[0])));
        var coneAngle = theta * 0.6;
        var coneR = clusteringRadius * Math.sin(coneAngle / 2);
        var coneH = clusteringRadius * Math.cos(coneAngle / 2);
        var v1 = [], v2 = [], center = [];
        var centroids = new Array(totalNNodes + 1);

        // assume clustering data starts at 1
        for (var i = 0; i < nClusters; i++) {
            var clusterIdx = [];
            for (var s = 0; s < totalNNodes; s++) {
		//    console.log(s);
                //if( (!isTree || (atlas.getRegion(s+1).hemisphere === 'left') ) && 
		if((cluster[s] == (i + 1)) ) clusterIdx.push(s);
            }
            var nNodes = clusterIdx.length;
            if(!isTree && (nNodes < 2) ) {
                console.error("Can not visualize clustering data.");
                return;
            }

            if (isTree && atlas.getRegion(clusterIdx[0]+1).hemisphere === 'right') {


                for (var k = 0; k < nNodes; k++) {
                    let point = {...centroids[i-this.maxNumberOfLeftClusters+2]};
                    //point[1] = point[1] + k + 1;
                    // create circle of radius 1
                    let angle = 2.0 * Math.PI * k / nNodes;
                    point[2] = point[2] + 0.35 * Math.cos(angle);
                    point[1] = point[1] + 0.8642 + 0.35 +Math.sin(angle);
                    point[0] = point[0] ;

                    centroids[clusterIdx[k] + 1] = point;
                }
                continue;
            }

            this.maxNumberOfLeftClusters = i;

            face = platonic.getFace(i);

            coneAxis = math.mean(face, 0);
            coneAxis = math.divide(coneAxis, math.norm(coneAxis));
            v1 = math.subtract(face[0], face[1]);
            v1 = math.divide(v1, math.norm(v1));
            v2 = math.cross(coneAxis, v1);
            if(isTree) {
                let points =  this.treeLevel(nNodes,  face );
                // normalize and store
                for (var k = 0; k < nNodes; k++) {

                    centroids[clusterIdx[k] + 1] = points[k];

                    this.maxNumberOfLeftNodes += 1;
                }
            } else {
                coneH = face[0][2] * 3;

                center = math.multiply(coneH, coneAxis);

                let points = sunflower(nNodes, coneR, center, v1, v2);

                // normalize and store
                for (var k = 0; k < nNodes; k++) {
                    centroids[clusterIdx[k] + 1] = math.multiply(clusteringRadius, math.divide(points[k], math.norm(points[k])));
                }
            }
        }
        this.setCentroids(centroids, topology, 0);
    };



    this.setDetailFiles = function (data, loc) {
        this.DetailsFilesList = [];
        // data[0] is assumed to contain a string header
        for (var j = 1; j < data.length; j++) {
            this.DetailsFilesList.push(data[j][loc]);
        }

    }

    // this.addNodeDetails = function (data) {
    //     this.nodeDetailData.push(data);
    //
    // }

    this.clearAllDetails = function () {
        this.nodeDetailData  = [];
    }

    this.loadNodeDetails = function (index) {
        //var file = "/3NeuroCave/data/SciVisIEEE2023/"+this.DetailsFilesList[index];
        // var fileData = [];
        // d3.csv(file, function (error, data) {
        //     if (error) throw error;
        //     fileData = data;
        //     console.log("fileData:", fileData);
        // });
        // //return fileData;
        // //done:This proabably Needs to wait for the file to be loaded...
        // this.nodeDetailDeta.push(fileData);

        loadDetailsFile(this.DetailsFilesList[index], this, this.finishedLoadingDetailsFile.bind(this),index);

    }

    //this.nodeDetailData = [];

    this.finishedLoadingDetailsFile = function (data,index,filename) {
      console.log("Finished loading details file");
      //console.log(data);
        this.nodeDetailData.push({index: index+' '+this.getDataset()[index].name+' '+filename.split('=')[1].split('&')[0], data: data });
    }

    // clusters can be hierarchical such as PLACE and PACE or not
    this.setClusters = function (data, loc, name, heatmap = false, treemap = false) {
        var clusteringData = [];

        // in treemap data, only left hemisphere is used for clustering... but we need to store all data
        // let dataLength = treemap? data.length;
        // data[0] is assumed to contain a string header
        for (var j = 1; j < data.length; j++) {
            if( true ) { // treemap && (atlas.getRegion(j).hemisphere === 'left') ) {
                clusteringData.push(data[j][loc]);
            }
        }
        var temp = [];
        if (name === "PLACE" || name === "PACE") { // PLACE
            var maxNumberOfClusters = d3.max(clusteringData) - d3.min(clusteringData) + 1;
            console.log("Found " + maxNumberOfClusters + " clusters for " + name + " data.");
            maxClusterHierarchicalLevel = Math.ceil(Math.log2(maxNumberOfClusters));
            clusteringLevel = maxClusterHierarchicalLevel;
            console.log("Max clustering level to be used = " + maxClusterHierarchicalLevel);
            if (maxClusterHierarchicalLevel > 4) {
                console.error("Hierarchical data requires " + maxClusterHierarchicalLevel + " levels." +
                    "\n That is more than what can be visualized!!");
            }
            temp = new Array(maxClusterHierarchicalLevel); // final levels
            temp[maxClusterHierarchicalLevel - 1] = clusteringData;
            for (var i = maxClusterHierarchicalLevel - 2; i >= 0; i--) {
                temp[i] = math.ceil(math.divide(temp[i + 1], 2.0));
            }
        } else {
            temp[0] = clusteringData;
        }
        clusters[name] = temp;
        if (false && heatmap) {
            heatmaps[name] = clusteringData;
        }
    };

    this.setClusteringLevel = function (level) {
        if (level == clusteringLevel) {
            return;
        }
        // clustering level assumes hierarchical data
        if (level > maxClusterHierarchicalLevel) {
            console.log("Clustering level set to more than the max possible for the current data.");
            console.log("Cap value to " + maxClusterHierarchicalLevel);
            clusteringLevel = maxClusterHierarchicalLevel;
        } else {
            clusteringLevel = level;
        }
        this.computeNodesLocationForClusters(activeTopology);
    };

    this.setClusteringSphereRadius = function (r) {
        if (r == clusteringRadius) {
            return;
        }
        clusteringRadius = r;
        this.computeNodesLocationForClusters(activeTopology);
    };

    this.getClusteringLevel = function () {
        return clusteringLevel;
    };

    this.getMaxClusterHierarchicalLevel = function () {
        return maxClusterHierarchicalLevel;
    };

    this.hasClusteringData = function () {
        return (clusteringTopologies.length > 0);
    };

    this.hasHeatmapData = function () {
        return (heatmapTopologies.length > 0);
    };

    this.getClusteringTopologiesNames = function () {
        return clusteringTopologies;
    };

    this.getHeatmapTopologiesNames = function () {
        return heatmapTopologies;
    };

    this.setTopology = function (data) {
        // the first line is assumed to contain the data indicator type
        var dataType;
        if (data == null) {
            console.log("data is null")
        }
        for (var i = 0; i < data[0].length; i++) {
            dataType = data[0][i];
            if (dataType === "" || dataType == null) {
            } else if (dataType === "label") {
                this.setLabelKeys(data, i);
            } else if (dataType === "PLACE" ||  // structural
                dataType === "PACE" || // functional
                dataType === "Q" ||
                dataType === "Q-Modularity" ||
                dataType.includes("Clustering")) {
                dataType = dataType.replace("Clustering", "");
                this.setClusters(data, i, dataType);
                this.computeNodesLocationForClusters(dataType);
                topologies.push(dataType);
                clusteringTopologies.push(dataType);
            } else if ( dataType.includes("Heatmap") ) {
                //dataType = dataType.replace("Heatmap", "");  //Todo: Keep it in the name for now to distinguish it from clustering
                this.setClusters(data, i, dataType, true);
                this.computeNodesLocationForClusters(dataType);
                topologies.push(dataType);
                clusteringTopologies.push(dataType);
                //heatmapTopologies.push(dataType);
            } else if ( dataType.includes("Tree" ) ) {
                this.setClusters(data, i, dataType, true, true);
                this.computeNodesLocationForClusters(dataType);
                topologies.push(dataType);
                clusteringTopologies.push(dataType);
            } else if (dataType === "DetailsFile" ) {
                this.setDetailFiles(data, i);
            } else { // all other topologies
                this.setCentroids(data, dataType, i);
                topologies.push(dataType);
            }
        }
        activeTopology = topologies[0];
        this.computeEdgesForTopology(activeTopology);
    };

    this.getTopologies = function () {
        return topologies;
    };

    /*
     * Since EB takes time for large networks, we are going to partially computes it
     * we are going to compute EB for only 1000 edges at a time following:
     * 1) all edges of selected node
     * 2) all edges of selected node neighbor
     * @param nodeIdx selected node index
     */
    this.performEBOnNode = function (nodeIdx) {
        var edges_ = [];
        var edgeIndices = [];
        var nNodes = this.connectionMatrix.size()[1];//length;
        var cen = centroids[activeTopology];
        // all edges of selected node
        for (var i = 0; i < nNodes; i++) {
            if (Math.abs(this.connectionMatrix.get([nodeIdx,i])) > 0) {
                edges_.push({
                    'source': cen[i],
                    'target': cen[nodeIdx]
                });
                edgeIndices.push(edgeIdx[nodeIdx][i]);
            }
        }
        // selected node neighbors
        var neighbors = nodesDistances[activeTopology][nodeIdx]
            .map(function (o, i) {
                return {idx: i, val: o};
            }) // create map with value and index
            .sort(function (a, b) {
                return a.val - b.val;
            }); // sort based on value
        for (var i = 1; i < nNodes; i++) { // first one assumed to be self
            if (edges_.length >= 500)
                break;
            if (neighbors[i].idx != nodeIdx) {
                var row = this.getConnectionMatrixRow(neighbors[i].idx);//,math.range(0,connectionMatrix.size()[0]))).toArray()[0];
                for (var j = 0; j < nNodes; j++) {
                    if (Math.abs(row[j]) > 0 && j != nodeIdx) {
                        edges_.push({
                            'source': cen[neighbors[i].idx],
                            'target': cen[j]
                        });
                        edgeIndices.push(edgeIdx[neighbors[i].idx][j]);
                    }
                }
            }
        }
        // TODO: disable edge bundling for now, just to get the rest of the code upgraded and working
        // stable enough to try enabling EB... Disabling again... things got complicated
        //fbundling.edges(edges_);
        //var results = fbundling();
        //
        //for (i = 0; i <edges_.length; i++) {
        //    edges[edgeIndices[i]] = results[i];
        //}
    };

    this.getActiveEdges = function () {
        console.log("model getActiveEdges");

        return edges;
    };

    this.getEdgesIndeces = function () {
        console.log("model getEdgesIndeces");
        return edgeIdx;
    };

    // linearly scale coordinates to a range -500 to +500
    // returns a function that can be used to scale any input
    // according to provided data
    var createCentroidScale = function (d) {
        var l = d.length;
        var allCoordinates = [];

        for (var i = 0; i < l; i++) {
            allCoordinates[allCoordinates.length] = d[i].x;
            allCoordinates[allCoordinates.length] = d[i].y;
            allCoordinates[allCoordinates.length] = d[i].z;
        }
        var centroidScale = d3.scale.linear().domain(
            [
                d3.min(allCoordinates, function (e) {
                    return e;
                }),
                d3.max(allCoordinates, function (e) {
                    return e;
                })
            ]
        ).range([-500, +500]);
        return centroidScale;
    };

    // scales and center centroids
    var scaleCentroids = function (centroids) {
        var centroidScale = createCentroidScale(centroids);

        // compute centroids according to scaled data
        var xCentroid = d3.mean(centroids, function (d) {
            return centroidScale(d.x);
        });
        var yCentroid = d3.mean(centroids, function (d) {
            return centroidScale(d.y);
        });
        var zCentroid = d3.mean(centroids, function (d) {
            return centroidScale(d.z);
        });

        var newCentroids = new Array(centroids.length);
        for (var i = 0; i < centroids.length; i++) {
            var x = centroidScale(centroids[i].x) - xCentroid;
            var y = centroidScale(centroids[i].y) - yCentroid;
            var z = centroidScale(centroids[i].z) - zCentroid;
            newCentroids[i] = new THREE.Vector3(x, y, z);
        }
        return newCentroids;
    };
// compute the edges for a specific topology
    this.computeEdgesForTopology = function (topology) {
        console.log("Computing edges for " + topology);
        var nNodes = this.connectionMatrix.size()[1]; //length;

        //return;
        //edges array is no longer used. Data is stored in node instance userdata
        //and that is updated when the topology or subject changes

        this.connectionMatrix.forEach(function (value, index) {
            var i = index[0];
            var j = index[1];

            if (Math.abs(value) > 0.5 ) { //|| j > i) {
                var edge = [];
                edge.push(centroids[topology][i]);
                edge.push(centroids[topology][j]);
                edges.push(edge);
            }
        },true);  // true to iterate over non-zero entries only
    };

    // compute the edges for a specific topology
    // this.computeEdgesForTopology = function (topology) {
    //     console.log("Computing edges for " + topology);
    //     var nNodes = connectionMatrix.size()[1];//length;
    //     edges = [];
    //     for (var i = 0; i < nNodes; i++) {
    //         for (var j = i + 1; j < nNodes; j++) {
    //             if (Math.abs(connectionMatrix.get([i,j])) > 0.5) {
    //                 var edge = [];
    //                 edge.push(centroids[topology][i]);
    //                 edge.push(centroids[topology][j]);
    //                 edges.push(edge);
    //             }
    //         }
    //     }
    //
    // }

}

var modelLeft = new Model("Left");
var modelRight = new Model("Right");
export {modelRight, modelLeft}
