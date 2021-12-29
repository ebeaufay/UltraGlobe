const LAYERS_CHANGED = "layers-changed";
class LayerManager{
    constructor(){
        this.layers = [];
        this.listeners = {};
    }

    setLayer(layer, index){
        this.layers[index] = layer;
        for (const element in this.listeners) {
            this.listeners[element](LAYERS_CHANGED, layer);
        }
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

    addListener( key,listener){
        this.listeners[key] = listener;
    }
    removeListener(key){
        delete this.listeners[key];
    }
}
export{LayerManager, LAYERS_CHANGED}