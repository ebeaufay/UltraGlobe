import * as THREE from 'three';
const VISIBILITY_CHANGE = "visibility-change";
class Layer {
    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        this.id = properties.id;
        this.name = properties.name;
        if(properties.bounds){
            this.bounds = new THREE.Box2(new THREE.Vector2(properties.bounds[0], properties.bounds[1]), new THREE.Vector2(properties.bounds[2], properties.bounds[3]));
        }else{
            this.bounds = new THREE.Box2(new THREE.Vector2(-180,-90), new THREE.Vector2(180,90));
        }
        this.visible = properties.visible;
        this.listeners = {};
    }

    getID() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }
    setVisible(visible) {
        this.visible = visible;
        for (const element in this.listeners) {
            this.listeners[element](this, VISIBILITY_CHANGE);
        }
    }

    pauseRendering(){
        this.pause = true;
    }
    resumeRendering(){
        this.pause = false;
    }
    getBounds() {
        return this.bounds;
    }
    _setBounds(bounds) {
        this.bounds = this.bounds;

    }

    removeListener(key){
        delete this.listeners[key];
    }

    addListener(key, listener) {
        this.listeners[key] = listener;
    }
}

export { Layer, VISIBILITY_CHANGE };