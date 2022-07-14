const LAYERS_CHANGED = "layers-changed";
class LayerManager{
    constructor(){
        this.layers = [];
        this.listeners = {};
    }

    pauseRendering(){
        this.layers.forEach(layer=>layer.pauseRendering());
    }
    resumeRendering(){
        this.layers.forEach(layer=>layer.resumeRendering());
    }
    setLayer(layer, index){
        if(this.layers[index] && this.layers[index].dispose){
            this.layers[index].dispose();
        }
        this.layers[index] = layer;
        for (const element in this.listeners) {
            this.listeners[element](LAYERS_CHANGED, layer);
        }
    }

    addLayer(layer){
        for (let i = 0; i < this.layers.length; i++) {
            if(!this.layers[i]){
                this.setLayer(layer, i);
                return i;
            }
        }
    }

    removeLayer(index){
        if(this.layers[index] && this.layers[index].dispose){
            if(this.layers[index].dispose){
                this.layers[index].dispose();
            }
            this.layers[index] = void 0;
        }
    }
    
    getLayers(){
        return this.layers;
    }
    getLayerByID(layerID){
        for (let i = 0; i < this.layers.length; i++) {
            if(this.layers[i] && this.layers[i].id == layerID){
                return this.layers[i];
            }
        }
    }
    getRasterLayers(sideEffect){
        this.layers.forEach(element => {
            if(element instanceof RasterLayer){
                sideEffect.push(element);
            }
        });
        return sideEffect;
    }

    addListener( key,listener){
        this.listeners[key] = listener;
    }
    removeListener(key){
        delete this.listeners[key];
    }
}
export{LayerManager, LAYERS_CHANGED}