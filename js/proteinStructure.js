import {SuperPDBLoader} from "./SuperPDBLoader";
import * as THREE from "three";
import {Line2} from "three/addons/lines/Line2";
import {LineMaterial} from "three/addons/lines/LineMaterial";
import {LineGeometry} from "three/addons/lines/LineGeometry";


class proteinStructure {

    constructor(pdbUrl, _previewArea, _x, _y, _z, _colors) {
        this.previewArea = _previewArea;
        this.renderStyle = '';
        this.url = pdbUrl;
        this.ploader = new SuperPDBLoader();
        //https://files.rcsb.org/view/7YQC.pdb
        this.loadpdb(pdbUrl);
        this.molGroup = null;
        this.posx = _x;
        this.posy = _y;
        this.posz = _z;
        this.chainColors = { A: _colors[0], B: _colors[1], C: _colors[2] };

    } // End of Constructor

    loadpdb(pdbUrl) {
        //http://localhost/AF/PSM_9-12-13/unrelaxed_model_1_rw.pdb
        this.ploader.load(pdbUrl,this.pdbLoadCallback.bind(this));
    }

    pdbLoadCallback(pdb) {
        const chainColorsDefault = {
            A: 0xff0000,
            B: 0x00ff00,
            C: 0x0000ff,
            D: 0xffff00,
            E: 0xff00ff,
            F: 0x00ffff,
            G: 0xffffff
            // Add more colors for other chains if necessary
        };

        const sphereGeo = new THREE.IcosahedronGeometry(1, 3);
        this.molGroup = new THREE.Group();

        Object.keys(pdb).forEach(chainId => {
            const chainData = pdb[chainId];
            const color = this.chainColors[chainId] || 0xffffff;  // Default to white if color not specified

            // Create atoms
            chainData.forEach(atom => {
                const [x, y, z, colorArray, element] = atom;
                let material = new THREE.MeshStandardMaterial({color: new THREE.Color(color)});
                let mesh = new THREE.Mesh(sphereGeo, material);
                mesh.position.set(x, y, z);
                if (this.renderStyle === 'ballAndStick') {
                    mesh.scale.set(0.1, 0.1, 0.1);
                } else {
                    mesh.scale.set(0.81, 0.81, 0.81);
                }
                this.molGroup.add(mesh);
            });

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

        this.molGroup.scale.set(1.10, 1.10, 1.10);
        this.molGroup.position.set(this.posx, this.posy, this.posz); //-1000 - 181, -1500 + 313, -932 - 400);
        this.previewArea.scene.add(this.molGroup);
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