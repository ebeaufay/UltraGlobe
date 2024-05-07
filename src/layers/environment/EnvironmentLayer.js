import { Layer } from '../Layer.js';

/**
 * Base class for layers affecting the environment
 * @class
 * @extends Layer
 */
class EnvironmentLayer extends Layer{
    /**
     * Base constructor for layers where the information is stored in 2D rasters
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.isEnvironmentLayer = true;
    }
}
export {EnvironmentLayer}