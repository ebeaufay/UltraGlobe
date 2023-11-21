import { RasterLayer } from './RasterLayer.js';

/**
 * Base constructor for all terrain elevation layers.
 * @class
 * @extends RasterLayer
 */
class ElevationLayer extends RasterLayer{
    /**
     * Base constructor for elevation layers.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} properties.visible layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.isElevationLayer = true;
    }
}

export{ElevationLayer}