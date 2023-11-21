import * as THREE from 'three';
import {Layer} from "./Layer.js";
/**
 * Base class to be implemented by layers displaying vector data
 * @class
 * @extends Layer
 * @private
 */
class VectorLayer extends Layer {
    /**
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} properties.visible layer will be rendered if true (true by default) 
     */
    constructor(properties) {
        this.super(properties)
        this.isVectorLayer = true;
    }

    /**
     * Returns a THREE.Object3D.
     * @param {THREE.Box2} bounds lon lat bounding box 
     * @param {Number} terrainLevel where 0 is the coarsest LOD
     * @param {Function} getTerrainElevation a function that returns elevation given a longitude and latitude THREE.Vector2
     * @returns {Object3D} an object3D to add to scene 
     */
    getObjects(bounds, tileLOD, terrainElevation, llhToCartesian){
        throw "unimplemented method";
    }

    update(delta){
        throw "unimplemented method";
    }
    dispose(){
        throw "unimplemented method";
    }
    
}

export { VectorLayer };