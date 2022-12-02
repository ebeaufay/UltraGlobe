import { Layer } from './Layer.js';
import * as THREE from 'three';

class LODObjectLayer extends Layer{
    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);

        this.lod = new THREE.LOD();
        properties.levels.array.forEach(level => {
            this.lod.addLevel(level.object, level.distance);
        });
        this.objects = {};
    }

    

    addObject(id, position, lookAt){
        newObject = this.lod.clone();
        if(position){
            newObject.position.copy(position);
        }
        if(lookAt){
            newObject.lookAt(lookAt);
        }
        objects[id] = newObject;
    }

    getObject(id){
        return this.objects[id];
    }

    getAll(){
        return this.objects;
    }
}
export {LODObjectLayer}