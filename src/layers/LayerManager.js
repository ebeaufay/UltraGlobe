const LAYERS_CHANGED = "layers-changed";
class LayerManager{
    constructor(){
        this.layers = [];
        this.listeners = [];
    }

    setLayer(layer, index){
        this.layers[index] = layer;
        this.listeners.forEach(element => {
            element(LAYERS_CHANGED, layer);
        });
    }
    
    getLayers(){
        return this.layers;
    }
    getRasterLayers(sideEffect){
        this.layers.forEach(element => {
            if(element instanceof RasterLayer){
                sideEffect.push(element);
            }
        });
        return sideEffect;
    }

    addListener( listener){
        this.listeners.push(listener);
    }
}
export{LayerManager, LAYERS_CHANGED}