import { RasterLayer } from './RasterLayer.js';

class ImageryLayer extends RasterLayer{
    /**
     * Base constructor for all Imagery layers.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} properties.transparency the layer's transparency (0 to 1)
     * @param {[Number]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     */
    constructor(properties) {
        super(properties);
        this.transparency = properties.transparency?properties.transparency:0;
        this.isImageryLayer = true;
    }

    
}

export{ImageryLayer}