import * as THREE from 'three';
const VISIBILITY_CHANGE = "visibility-change";

const toRadians = 0.01745329251994329576923690768489;
/**
 * Base class implemented by all layers.
 */
class Layer {
    /**
     * Base constructor for all layer types.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        this.isLayer = true;
        this.isSelectable = false;
        this.id = properties.id;
        this.name = properties.name;
        if(properties.bounds){
            this.bounds = new THREE.Box2(new THREE.Vector2(properties.bounds[0], properties.bounds[1]), new THREE.Vector2(properties.bounds[2], properties.bounds[3]));
        }else{
            this.bounds = new THREE.Box2(new THREE.Vector2(-180,-90), new THREE.Vector2(180,90));
        }
        this.visible = properties.visible != undefined? properties.visible: true;
        this.listeners = {};
    }

    /**
     * Moves a given point to this layer's center in degree longitude/latitude
     * @param {THREE.Vector3} sfct a point to move
     * @returns {THREE.Vector3} the input point
     */
    getCenter(sfct){
        this.bounds.getCenter(sfct);
        sfct.setComponent(2,0.0);
        return sfct;
    }
    
    /**
     * 
     * @returns layer id
     */
    getID() {
        return this.id;
    }

    /**
     * 
     * @returns layer name
     */
    getName() {
        return this.name;
    }

    /**
     * change the layer name
     * @param {String} name 
     */
    setName(name) {
        this.name = name;
    }
    /**
     * Modifies the layer visibility
     * @param {Boolean} visible 
     */
    setVisible(visible) {
        this.visible = visible;
        for (const element in this.listeners) {
            this.listeners[element](this, VISIBILITY_CHANGE);
        }
    }

    /**
     * 
     * @returns {THREE.Box2} bounds in longitude latitude (degrees) 
     */
    getBounds() {
        return this.bounds;
    }
    _setBounds(bounds) {
        this.bounds = this.bounds;

    }

    /**
     * Removes the listener associated to the given key
     * @param {*} key can be anything but should be unique
     */
    removeListener(key){
        delete this.listeners[key];
    }

    /**
     * Adds a listener for layer events
     * @param {*} key can be anything but should be unique
     * @param {Function} listener a function : (layer, eventType)=>{}
     */
    addListener(key, listener) {
        this.listeners[key] = listener;
    }

    /**
     * raycasts through objects from this layer if the layer is selectable and if the objects are raycastable
     * @param {Object} raycaster a three.js Raycaster 
     * @returns {Array} an array of selected objects
     */
    raycast(raycaster){
        // to be implemented by children
        return [];
    }

    _pauseRendering(){
        this.paused = true;
    }
    _resumeRendering(){
        this.paused = false;
    }
    /**
     * disposes of any resources used by this layer
     */
    dispose(){
        // to be implemented by children
    }

    _addToScene(scene){
        // to be implemented by children
    }
    _setMap(map){
        // to be implemented by children
    }
}

export { Layer, VISIBILITY_CHANGE };