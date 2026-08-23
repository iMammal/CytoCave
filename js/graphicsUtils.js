/**
 * Created by giorgioconte on 26/02/15.
 */

import * as THREE from 'three'
// import * as math from 'mathjs'
import * as math from './external-libraries/math.min.js'
import {getColorGroupScaleVersion, scaleColorGroup} from './utils/scale'
import {
    CANONICAL_GLYPH_SHAPES,
    createGlyphGeometry,
    normalizeGlyphShape
} from './glyphGeometryRegistry'
import {
    GLYPH_SIZE_DEFAULT_VALUE,
    normalizeGlyphSizeShape,
    normalizeGlyphSizeValue
} from './glyphSizeState'

var shpereRadius = 3.0;             // normal sphere radius
var sphereResolution = 12;
var dimensionFactor = 1;
var dimensionFactors = {
    Left: {},
    Right: {}
};

CANONICAL_GLYPH_SHAPES.forEach(function (shape) {
    dimensionFactors.Left[shape] = GLYPH_SIZE_DEFAULT_VALUE;
    dimensionFactors.Right[shape] = GLYPH_SIZE_DEFAULT_VALUE;
});

function getSphereResolution(){
    return sphereResolution;
}

function setSphereResolution(value) {
    sphereResolution = value
}

var createGlyphGeometrySet = function () {
    var geometries = {};
    for (var i = 0; i < CANONICAL_GLYPH_SHAPES.length; i++) {
        var shape = CANONICAL_GLYPH_SHAPES[i];
        geometries[shape] = createGlyphGeometry(shape, {
            radius: shpereRadius,
            sphereResolution: sphereResolution
        });
    }
    return geometries;
};

var glyphGeometriesBySide = {
    Left: createGlyphGeometrySet(),
    Right: createGlyphGeometrySet()
};

var normalizeSide = function (side) {
    return side === "Left" ? "Left" : "Right";
};

// create normal node geometry from the canonical glyph shape registry
var getNormalGeometry = function(glyphShape, side) {
    var normalizedSide = normalizeSide(side);
    var shape = normalizeGlyphShape(glyphShape);
    return glyphGeometriesBySide[normalizedSide][shape] || glyphGeometriesBySide[normalizedSide].sphere;
};

var setGlyphSizeFactor = function(side, glyphShape, value) {
    var normalizedSide = normalizeSide(side);
    var shape, numericValue;
    try {
        shape = normalizeGlyphSizeShape(glyphShape);
        numericValue = normalizeGlyphSizeValue(value);
    } catch (error) {
        return;
    }

    var val = 1 / dimensionFactors[normalizedSide][shape] * numericValue;
    glyphGeometriesBySide[normalizedSide][shape].scale(val, val, val);
    dimensionFactors[normalizedSide][shape] = numericValue;
};

var setGlyphSizeFactors = function(side, sizes) {
    if (!sizes) return;
    for (var i = 0; i < CANONICAL_GLYPH_SHAPES.length; i++) {
        var shape = CANONICAL_GLYPH_SHAPES[i];
        if (sizes[shape] !== undefined && sizes[shape] !== null) {
            setGlyphSizeFactor(side, shape, sizes[shape]);
        }
    }
};

var getGlyphSizeFactor = function(side, glyphShape) {
    var normalizedSide = normalizeSide(side);
    var shape = normalizeGlyphShape(glyphShape);
    return dimensionFactors[normalizedSide][shape] || GLYPH_SIZE_DEFAULT_VALUE;
};

// scaling the glyphs
var setDimensionFactor = function(value){

    var numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return;
    }

    for (var i = 0; i < CANONICAL_GLYPH_SHAPES.length; i++) {
        setGlyphSizeFactor("Left", CANONICAL_GLYPH_SHAPES[i], numericValue);
        setGlyphSizeFactor("Right", CANONICAL_GLYPH_SHAPES[i], numericValue);
    }
    dimensionFactor = numericValue;
};

// scaling the glyphs
var setDimensionFactorLeftSphere = function(value){
    setGlyphSizeFactor("Left", "sphere", value);
};

// scaling the glyphs
var setDimensionFactorRightSphere = function(value){
    setGlyphSizeFactor("Right", "sphere", value);
};


// scaling the glyphs
var setDimensionFactorLeftBox = function(value){
    setGlyphSizeFactor("Left", "cube", value);
};

// scaling the glyphs
var setDimensionFactorRightBox = function(value){
    setGlyphSizeFactor("Right", "cube", value);
};

// return the material for a node (vertex) according to its state: active or transparent
//todo: change to static reusable materials
let materialGroups = {};

var materialGroupKey = function(model, group) {
    var modelName = model && model.getName ? model.getName() : "global";
    var activeGroup = model && model.getActiveGroupName ? model.getActiveGroupName() : "default";
    return modelName + "|" + activeGroup + "|" + getColorGroupScaleVersion() + "|" + group;
};

var getNormalMaterial = function(model, group) {
    var material, opacity = 1.0;
    var color = scaleColorGroup(model, group);
    var cacheKey = materialGroupKey(model, group);

    if (materialGroups[cacheKey] === undefined) {
        material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 50,
            transparent: true,
            specular: 0x222222,
            reflectivity:1.3,
            opacity: opacity
        });
        materialGroups[cacheKey] = material;
    } else {
        material = materialGroups[cacheKey];
    }
    material.color.set(color);
    switch (model.getRegionState(group)){
        case 'active':
            opacity = 1.0;
            break;
        case 'transparent':
            opacity = 0.3;
            break;
        case 'inactive':
            opacity = 0.0;
            break;
    }
    material.opacity = opacity;
    return material;
};

/**
 * Distribute n points uniformly on a circle
 * @param n     number of points
 * @param R     radius of the circle
 * @param c     center of the circle in 3D
 * @param v1    unit vector in the plane containing the circle
 * @param v2    unit vector in the plane containing the circle
 * @returns {*} array of the coordinates of the points
 */
var sunflower = function(n, R, c, v1, v2) {
    var alpha = 2;
    var b = math.round(alpha*math.sqrt(n));      // number of boundary points
    var phi = (math.sqrt(5)+1)/2;           // golden ratio
    var k = math.range(1,n+1);
    var theta = math.multiply(k, (2*math.pi)/(phi*phi));
    var r = math.divide(math.sqrt(math.add(k,-0.5)), math.sqrt(n-(b+1)/2));
    var idx = math.larger(k, n-b);
    // r( k > n-b ) = 1; % put on the boundary
    r = math.add(math.dotMultiply(r, math.subtract(1,idx)),idx);
    var tmp1 = math.dotMultiply(math.cos(theta),r);
    var tmp2 = math.dotMultiply(math.sin(theta),r);
    var points = [math.add(math.add(math.multiply(tmp1,v1[0]*R), math.multiply(tmp2,v2[0]*R)), c[0]),
                  math.add(math.add(math.multiply(tmp1,v1[1]*R), math.multiply(tmp2,v2[1]*R)), c[1]),
                  math.add(math.add(math.multiply(tmp1,v1[2]*R), math.multiply(tmp2,v2[2]*R)), c[2])];
    return math.transpose(points);
};

export {sphereResolution,getSphereResolution,setSphereResolution,sunflower, setDimensionFactorLeftSphere, setDimensionFactorRightSphere, setDimensionFactorLeftBox,setDimensionFactorRightBox, setDimensionFactor, setGlyphSizeFactor, setGlyphSizeFactors, getGlyphSizeFactor, getNormalGeometry,getNormalMaterial}
