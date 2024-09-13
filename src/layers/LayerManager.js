import { VISIBILITY_CHANGE } from "./Layer";
import { ShaderColorLayer } from "./ShaderColorLayer";
const LAYERS_CHANGED = "layers-changed";
/**
 * The Layer manager keeps track of loaded layers and their order and sends events when there is a change.
 */
class LayerManager{
    constructor(){
        this.layers = [];
        this.listeners = {};
    }

    _pauseRendering(){
        this.layers.forEach(layer=>layer._pauseRendering());
    }
    _resumeRendering(){
        this.layers.forEach(layer=>layer._resumeRendering());
    }

    /**
     * Sets the given layer at the given index disposing of any layer previously at that index.
     * @param {Layer} layer 
     * @param {Number} index 
     */
    setLayer(layer, index){
        if(this.layers[index] && this.layers[index].dispose){
            this.layers[index].dispose();
        }
        this.layers[index] = layer;
        for (const element in this.listeners) {
            this.listeners[element](LAYERS_CHANGED, layer);
        }
        layer.addListener("layerManager", (event, layer)=>{
            for (const element in this.listeners) {
                this.listeners[element](event, layer);
            }
        })
    }

    /**
     * appends the layer to the end of the list of layers
     * @param {Layer} layer 
     * @param {Number} index 
     */
    addLayer(layer){
        for (let i = 0; i < this.layers.length; i++) {
            if(!this.layers[i]){
                this.setLayer(layer, i);
                return i;
            }
        }
    }

    /**
     * removes the layer at the specific index optionally "disposing" of any resources the layer is using.
     * @param {Number} index 
     * @param {Boolean} dispose 
     */
    removeLayer(index, dispose = true){
        if(this.layers[index]){
            if(dispose && this.layers[index].dispose){
                this.layers[index].dispose();
            }
            this.layers[index] = void 0;
        }
    }
    
    /**
     * Returns an array of layers currently loaded on the map
     * @returns {Layer[]} the list of layers
     */
    getLayers(){
        return this.layers;
    }

    /**
     * Fetches a specific layer by ID.
     * @param {Number|String} id 
     * @returns {Layer} layer with given id if any
     */
    getLayerByID(layerID){
        for (let i = 0; i < this.layers.length; i++) {
            if(this.layers[i] && this.layers[i].id == layerID){
                return this.layers[i];
            }
        }
    }
    
    _getRasterLayers(sideEffect){
        this.layers.forEach(element => {
            if(element.isRasterLayer){
                sideEffect.push(element);
            }
        });
        return sideEffect;
    }
    _getImageryLayers(sideEffect){
        this.layers.forEach(element => {
            if(element.isImageryLayer){
                sideEffect.push(element);
            }
        });
        return sideEffect;
    }

    _getShaderColorLayers(sideEffect){
        this.layers.forEach(element => {
            if(element.isShaderColorLayer){
                sideEffect.push(element);
            }
        });
        return sideEffect;
    }

    /**
     * Adds a listener for map layer content changes
     * @param {*} key 
     * @param {Function} listener (eventName, layer)=>{}
     */
    addListener( key,listener){
        this.listeners[key] = listener;
    }
    /**
     * removes the listener associated with the given key
     * @param {*} key 
     */
    removeListener(key){
        delete this.listeners[key];
    }
}
export{LayerManager, LAYERS_CHANGED}