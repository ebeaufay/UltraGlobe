import * as THREE from 'three';
import {Layer} from "./Layer.js";
/**
 * Base class to be implemented by layers displaying vector data
 * @class
 * @extends Layer
 * @private
 */
class VectorLayer extends Layer {
    
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