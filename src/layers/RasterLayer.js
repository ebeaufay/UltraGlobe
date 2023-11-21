import { Layer } from './Layer.js';

/**
 * Base class for layers where the data is stored in 2D rasters
 * @class
 * @extends Layer
 */
class RasterLayer extends Layer{
    /**
     * Base constructor for layers where the information is stored in 2D rasters
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.isRasterLayer = true;
    }
}
export {RasterLayer}