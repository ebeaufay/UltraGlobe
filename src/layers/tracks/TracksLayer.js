import {Layer} from '../Layer'
import * as THREE from 'three'

class TracksLayer extends Layer{

    /**
     * A layer representing tracks. The objects "tracks" variable is a THREE.Object3D that can be added to a scene and controls global visibility,
     * position, bounds etc.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     */
    constructor(properties){
        super(properties);
        this.isTracksLayer = true;
        this.tracks = new THREE.Object3D();

        
    }

    /**
     * Returns this layer's tracks
     * @returns {THREE.Object3D} a parent Object3D representing all the tracks
     */
    getTracks(){
        return this.tracks;
    }

    /**
     * updates the layer objects
     */
    update(timeParams){
        // to be implemented by child class
    }

    /**
     * add the tracks to the given scene
     */
    addToScene(scene, camera){
        scene.add(this.tracks);
        this.camera = camera;
    }
}export {TracksLayer}