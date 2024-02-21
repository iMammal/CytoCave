/*
 * Class that maintains img and orientation data for a collection of brain slices.
 */

import * as THREE from 'three';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';
class NeuroSlice {
  // Constructor
  constructor(pathToSliceImages, pathToSliceData, onReadyCallback = null) {
      // called when object is created, there can be only one.
      this.data = null;
      this.imageSet = [];
      this.slices = [];
      this.onReadyCallback = onReadyCallback;
      this.loadSliceData(pathToSliceData);
      this.imagePath = pathToSliceImages;
      console.log('NeuroSlice initialized');
      this.loadingProgress = 0;
  }

  // Methods
  loadSliceData(pathToSliceData) {
      // load slice data, just a partial file name and a z value for now.
      //load csv file
      d3.csv(pathToSliceData, this.dataSliceCallback);
  }


  dataSliceCallback = (data) => {
    if (data) {
      console.log('Image Positional Data loaded');
      console.log(data);
      this.data = data;
      this.imagePaths = [];
      this.slices = [];
      //now that we have path data we can load the images.
      this.loadSliceImages();
    } else {
      console.log('Image Positional Data not loaded');
    }
  }
  generateFilename(slice) {
    const pre = 'CA1DapiBoundaries_';
    const post = '_left.tif';
    return pre + slice + post;
  }

  loadTexture(path, slice, z) {
    let loadingTexture = new TIFFLoader();
    loadingTexture.manager.onLoad = this.imageLoadedCallback;
    loadingTexture.manager.onProgress = this.imageProgressCallback;

    let texture = null;
    try {
      texture = loadingTexture.load(path);
      texture.name = slice;
      texture.z = z;
      texture.imageType = 'slice';
    } catch (e) {
      console.error(`Error loading image at path ${path}: ${e}`);
    }

    return texture;
  }

  loadSliceImages() {
    if (!this.data) {
      console.log('No positional data loaded, cannot load images');
      return;
    }

    for (let i = 0; i < this.data.length; i++) {
      const filename = this.generateFilename(this.data[i].slice);
      const path = this.imagePath + '/' + filename;
      console.log('Loading image: ' + path);

      const texture = this.loadTexture(path, this.data[i].slice, this.data[i].z);
      if (texture) {
        this.imagePaths.push(path);
        this.imageSet.push(texture);
      }
    }
  }

  imageLoadedCallback = () => {
    //callback function for when an image is loaded
    console.log('All textures loaded, hopefully.');
    //console.log('Since three.js does not respect "this" properly, all of our textures are loaded now. Even those not of this class.');
    this.createSliceObjects();
  }

  createSliceObjects() {
      // for each path in imagePaths, grab the right texture from imageSet
      // then use that texture to create a three.js object
      if (!this.imagePaths.length) {
          console.log('No images loaded, cannot create objects');
          console.log("something that shouldn't be is triggering this.");
          return;
      }
      for (let i = 0; i < this.imagePaths.length; i++) {
          let path = this.imagePaths[i];
          let texture = this.imageSet[i];
          console.log('Creating object for: ' + path);
          console.log(texture);
          // create a plane geometry for the slice
          let geometry = new THREE.PlaneGeometry( 1, 1, 1 );
          // create a material for the slice
          let material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
          // create a mesh for the slice
          let mesh = new THREE.Mesh( geometry, material );
          // set the texture of the mesh to the texture we loaded
          mesh.material.map = texture;
          //console.log('Texture image:');
          //console.log(texture.image);
          // check if texture is loaded
          if (!texture.image) {
              console.log('Texture not loaded');
              return;
          }
          let width = texture.image.width;
          let height = texture.image.height;
          // console.log('Width: ' + width + ' Height: ' + height);
          // set the size of the texture to the size of the mesh
          mesh.scale.set(width, height, 1);
          // set the position of the mesh 0,0 with offset of texture.z
          mesh.position.set(0, 0, texture.z);
          this.slices.push(mesh);
      }
      //presumably we are done loading images and creating objects, fire the callback
      if (this.onReadyCallback) {
          this.onReadyCallback();
      }
  }

  imageProgressCallback = (texture) => {
    // three.js is kinda odd and only has the path to the texture, not the texture itself.
    // image loading progress callback, unfortunately this is called for all textures, not just those of this class.
    // check if value of texture is in imagePaths
    // if not, return
    // if so, update loading progress
    if (this.imagePaths.indexOf(texture) == -1) {
      // we only care about texture for this class
      return;
    }
    this.loadingProgress++;
    console.log('Image loading progress: ' + this.loadingProgress + '/' + this.imagePaths.length);
    console.log(texture);
  }

  exportSlices() {
    return this.slices;
  }

  toggleSlices() {
    // toggle visibility of slices
    for (let i = 0; i < this.slices.length; i++) {
      this.slices[i].visible = !this.slices[i].visible;
    }

  }

}

export default NeuroSlice;
