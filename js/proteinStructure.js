import {SuperPDBLoader} from "./SuperPDBLoader";
import * as THREE from "three";
import {Line2} from "three/addons/lines/Line2";
import {LineMaterial} from "three/addons/lines/LineMaterial";
import {LineGeometry} from "three/addons/lines/LineGeometry";
// import {getNormalGeometry} from "./graphicsUtils";


class proteinStructure {

    constructor(pdbUrl, _previewArea, _x, _y, _z, _colors, _originIndexes=0) {
        this.previewArea = _previewArea;
        this.renderStyle = '';
        this.url = pdbUrl;
        this.ploader = new SuperPDBLoader();
        //https://files.rcsb.org/view/7YQC.pdb
        this.loadpdb(pdbUrl);
        this.molGroup = null;
        // this.highlight = null;
        this.highLights = [];
        this.posx = _x;
        this.posy = _y;
        this.posz = _z;
        this.chainColors = { A: _colors[0], B: _colors[1], C: _colors[2] };
        this.originIndexes = _originIndexes;
        this.boxpoints = [[[-1100.0, -1150.0, -1193.2], [1118.1, 1131.3, 1140.0]],
            [[-11010.0, -1150.0, -1193.2], [1118.1, 1131.3, 1140.0]],
            [[-11020.0, -1150.0, -1193.2], [1118.1, 1131.3, 1140.0]]];
        this.boxGeometry = [null, null, null];
        console.log("Origin Indexes:");
        console.log(this.originIndexes);
    } // End of Constructor

    loadpdb(pdbUrl) {
        //http://localhost/AF/PSM_9-12-13/unrelaxed_model_1_rw.pdb
        this.ploader.load(pdbUrl,this.pdbLoadCallback.bind(this));
    }


    pdbLoadCallback(pdb) {
        // const chainColorsDefault = {
        //     A: 0xff0000,
        //     B: 0x00ff00,
        //     C: 0x0000ff,
        //     D: 0xffff00,
        //     E: 0xff00ff,
        //     F: 0x00ffff,
        //     G: 0xffffff
        //     // Add more colors for other chains if necessary
        // };

        const sphereGeo = new THREE.IcosahedronGeometry(1, 3);
        this.molGroup = new THREE.Group();
        this.molGroup.name = "molGroup";

        let count = 0;
        console.log("Origin Indexes:");
        console.log(this.originIndexes);
        Object.keys(pdb).forEach(chainId => {
            const chainData = pdb[chainId];
            const color = this.chainColors[chainId] || 0xffffff;  // Default to white if color not specified
          let oIndex = 0;
          switch (chainId) {
            case 'A':
              oIndex = 0
              break;
            case 'B':
              oIndex = 1
              break;
            case 'C':
              oIndex = 2
              break;
            default:
              oIndex = 0
              break;
            }



            //create custom material with ghostly highlights




            // Create atoms
            chainData.forEach(atom => {
                const [x, y, z, colorArray, element] = atom;

            //    let material = new THREE.MeshStandardMaterial({color: new THREE.Color(color)});
              var material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(color),
                emissive: 0x072534,
                side: THREE.DoubleSide,
                flatShading: true
              });

              let mesh = new THREE.Mesh(sphereGeo, material);
                mesh.position.set(x, y, z);
                if (this.renderStyle === 'ballAndStick') {
                    mesh.scale.set(0.1, 0.1, 0.1);
                } else {
                    mesh.scale.set(0.81, 0.81, 0.81);
                }

                mesh.name= {
                  name: element,
                  type: "atom",
                }

                mesh.userData = {
                  originIndex: this.originIndexes[oIndex],
                }

                this.molGroup.add(mesh);
            });



            for (let i = 0; i < chainData.length; i++) {
                this.boxpoints[oIndex][0][0] = Math.max(this.boxpoints[oIndex][0][0], chainData[i][0]);
                this.boxpoints[oIndex][0][1] = Math.max(this.boxpoints[oIndex][0][1], chainData[i][1]);
                this.boxpoints[oIndex][0][2] = Math.max(this.boxpoints[oIndex][0][2], chainData[i][2]);
                this.boxpoints[oIndex][1][0] = Math.min(this.boxpoints[oIndex][1][0], chainData[i][0]);
                this.boxpoints[oIndex][1][1] = Math.min(this.boxpoints[oIndex][1][1], chainData[i][1]);
                this.boxpoints[oIndex][1][2] = Math.min(this.boxpoints[oIndex][1][2], chainData[i][2]);
            }

            // Create bonds between nearest and second nearest neighbors
            if (this.renderStyle === 'ballAndStick') {
                for (let i = 0; i < chainData.length; i++) {
                    let minDist = Infinity;
                    let minIndex = -1;
                    let secondMinDist = Infinity;
                    let secondMinIndex = -1;

                    for (let j = 0; j < chainData.length; j++) {
                        if (i === j) continue;
                        const dist = new THREE.Vector3(chainData[i][0], chainData[i][1], chainData[i][2])
                            .distanceTo(new THREE.Vector3(chainData[j][0], chainData[j][1], chainData[j][2]));

                        if (dist < minDist) {
                            secondMinDist = minDist;
                            secondMinIndex = minIndex;
                            minDist = dist;
                            minIndex = j;
                        } else if (dist < secondMinDist) {
                            secondMinDist = dist;
                            secondMinIndex = j;
                        }
                    }

                    if (minIndex !== -1) {
                        this.createBond(molGroup, chainData[i], chainData[minIndex], color);
                    }

                    if (secondMinIndex !== -1) {
                        this.createBond(molGroup, chainData[i], chainData[secondMinIndex], color);
                    }
                }
            }
        });

        //Create wireframe Box for each chain


        this.molGroup.scale.set(1.10, 1.10, 1.10);
        this.molGroup.position.set(this.posx, this.posy, this.posz); //-1000 - 181, -1500 + 313, -932 - 400);


        // let box = new THREE.Box3().setFromObject(this.molGroup);
        // let boxHelper = new THREE.Box3Helper(box, 0xffff00);
        // this.molGroup.add(boxHelper);

        // add this.xpos, this.ypos, this.zpos to this.boxpoints
        // for(let i = 0; i < 3; i++) {
        //     for(let j = 0; j < 2; j++) {
        //         this.boxpoints[i][j][0] = this.boxpoints[i][j][0] + this.molGroup.position.x; //this.posx;
        //         this.boxpoints[i][j][1] = this.boxpoints[i][j][1] +  this.molGroup.position.y;
        //         this.boxpoints[i][j][2] = this.boxpoints[i][j][2] +  this.molGroup.position.z;
        //
        //     }
        // }



        // let boxpoints = new THREE.Box3().setFromObject(this.molGroup).getPoints();
        // this.boxGeometry[0] = new THREE.Box3().setFromPoints(this.boxpoints[0][0], this.boxpoints[0][1]);
        // this.boxGeometry[1] = new THREE.Box3().setFromPoints(this.boxpoints[1][0], this.boxpoints[1][1]);
        // this.boxGeometry[2] = new THREE.Box3().setFromPoints(this.boxpoints[2][0], this.boxpoints[2][1]);

        // let min[3] be an array of Vector3 objects with the minimum x, y, and z values of the box
        // let max[3] be an array of Vector3 objects with the maximum x, y, and z values of the box
        // let boxGeometry[0] be a Box3 object with min[0] and max[0] as the min and max values
        // let boxGeometry[1] be a Box3 object with min[1] and max[1] as the min and max values
        // let boxGeometry[2] be a Box3 object with min[2] and max[2] as the min and max values

        let  min = [new THREE.Vector3(this.boxpoints[0][0][0],this.boxpoints[0][0][1],this.boxpoints[0][0][2]),
                                new THREE.Vector3(this.boxpoints[1][0][0],this.boxpoints[1][0][1],this.boxpoints[1][0][2]),
                                new THREE.Vector3(this.boxpoints[2][0][0],this.boxpoints[2][0][1],this.boxpoints[2][0][2])];
        let  max = [new THREE.Vector3(this.boxpoints[0][1][0],this.boxpoints[0][1][1],this.boxpoints[0][1][2]),
            new THREE.Vector3(this.boxpoints[1][1][0],this.boxpoints[1][1][1],this.boxpoints[1][1][2]),
            new THREE.Vector3(this.boxpoints[2][1][0],this.boxpoints[2][1][1],this.boxpoints[2][1][2])];
        // for(let i = 0; i < 3; i++) {
        //     min[i] = new THREE.Vector3(Math.min(this.boxpoints[i][0][0], this.boxpoints[i][1][0]), Math.min(this.boxpoints[i][0][1], this.boxpoints[i][1][1]), Math.min(this.boxpoints[i][0][2], this.boxpoints[i][1][2]));
        //     max[i] = new THREE.Vector3(Math.max(this.boxpoints[i][0][0], this.boxpoints[i][1][0]), Math.max(this.boxpoints[i][0][1], this.boxpoints[i][1][1]), Math.max(this.boxpoints[i][0][2], this.boxpoints[i][1][2]));
        //     this.boxGeometry[i] = new THREE.Box3(min[i], max[i]);
        // }


        this.boxGeometry[0] = new THREE.Box3(min[0], max[0]);
        this.boxGeometry[1] = new THREE.Box3(min[1], max[1]);
        this.boxGeometry[2] = new THREE.Box3(min[2], max[2]);



        this.previewArea.scene.add(this.molGroup);
    }

    // highlightAtom(atomIndex, color) {}

    // highlightChain(chainId, color) {

    highlightChainByID(chainId, color) {
        this.molGroup.children.forEach(atom => {
            if (atom.name.type === "atom") {
                if (atom.userData.originIndex === this.originIndexes[chainId]) {
                    atom.material.color.set(color);
                }
            }
        });
    }

    removeHighlightByIndex(index) {
        // remove highlight from this.highLights where highlight.userData.index === index
        // count matching objects in this.highLights
        // if count > 1
        for (let i = 0; i < this.highLights.length; i++) {
            if (this.highLights[i].userData.index === index) {
                this.previewArea.remove(this.highLights[i]);
                //remove from this.highLights list
                this.highLights.splice(i, 1);
            }
        }
    }

    highlightChainByIndex(index) {

        // let chainId = the index of the value of chainIndex in the originIndexes array
        let chainId = this.originIndexes.indexOf(index);

        if(chainId < 0) return; //this.drawBoxAroundChain(chainId);




    // drawBoxAroundChain(chainId) {
        let box = this.boxGeometry[chainId]; //new THREE.Box3().setFromObject(this.molGroup);
        let boxHelper = new THREE.Box3Helper(box, 0xffff00);
        // box.position.set(this.molGroup.position.x, this.molGroup.position.y, this.molGroup.position.z);
        // box.translateY(111.1);
        // boxHelper.scale.set(11.1, 11.1, 11.1);
        // this.previewArea.scene.add(box);
        // this.molGroup.add(box);

        // compute box geometry for min and max points
        let min = box.min;
        let max = box.max;
        let boxGeometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
        let boxMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
        // let boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);


        // const baseGeometry = getNormalGeometry('left','Left');//node.object.name.hemisphere,this.previewArea.name);
        const wireframe = new THREE.WireframeGeometry(
            boxGeometry
            // box
        );



        // Create a wireframe material with a low opacity.
        const material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.4,
            linewidth: 8
        });

        //figure out the size of the node so we can scale the highlight to match.
        let matrix = //new THREE.Matrix4();
                this.molGroup.matrix; //object.getMatrixAt(this.molGroup, matrix);
        let scale = matrix.getMaxScaleOnAxis();

        let newHighlight = new THREE.LineSegments(wireframe, material);
        // Create a wireframe mesh and set its position.
        newHighlight = new THREE.LineSegments(wireframe, material);
        if (newHighlight === null || newHighlight === undefined) {
            throw new Error("highLight is null or undefined");
        }
        const position = this.getPosition();         //NodePosition(node);
        newHighlight.position.set(position.x+min.x, position.y+min.y, position.z+min.z);
        newHighlight.scale.set(scale * 1.02, scale * 1.02, scale * 1.02);
        newHighlight.visible = true;
        newHighlight.userData = {
            type: "highlight",
        //     group: node.object.name.group,
        //     hemisphere: node.object.name.hemisphere,
            index: index
        }
        // this.sceneObject.add(newHighlight);
        this.previewArea.scene.add(newHighlight);
        // this.molGroup.add(box);

        this.highLights.push(newHighlight);

    }

    createBond(group, atom1, atom2, color) {
        const start = new THREE.Vector3(atom1[0], atom1[1], atom1[2]);
        const end = new THREE.Vector3(atom2[0], atom2[1], atom2[2]);
        const line = new Line2();
        const matLine = new LineMaterial({color: color, linewidth: 0.0025});
        const geo = new LineGeometry();
        geo.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
        line.geometry = geo;
        line.material = matLine;
        group.add(line);
    }

    getPosition() {
        return this.molGroup.position;
    }

    setPosition(x, y, z) {
        this.molGroup.position.set(x, y, z);
    }

    getOrientation() {
        return this.molGroup.quaternion;
    }

    setOrientation(x, y, z, w) {
        this.molGroup.quaternion.set(x, y, z, w);
    }

    // getScale() {
    //     return this.molGroup.scale;
    // }
    //
    // setScale(x, y, z) {
    //     this.molGroup.scale.set(x, y, z);
    // }
    //
    // getVisible() {
    //     return this.molGroup.visible;
    // }
    //
    // setVisible(visible) {
    //     this.molGroup.visible = visible;
    // }
    //
    // getOpacity() {
    //     return this.molGroup.material.opacity;
    // }
    //
    // setOpacity(opacity) {
    //     this.molGroup.material.opacity = opacity;
    // }
    //
    // getColor() {
    //     return this.molGroup.material.color;
    // }
    //
    // setColor(color) {
    //     this.molGroup.material.color = color;
    // }

    getMaterial() {
        return this.molGroup.material;
    }

    setMaterial(material) {
        this.molGroup.material = material;
    }

    // getRenderStyle() {
    //     return renderStyle;
    // }
    //
    // setRenderStyle(style) {
    //     renderStyle = style;
    // }
    //
    // getPreviewArea() {
    //     return this.previewArea;
    // }

}
export {proteinStructure};
