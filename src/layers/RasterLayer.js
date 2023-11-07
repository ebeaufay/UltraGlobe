import { Layer } from './Layer.js';

class RasterLayer extends Layer{
    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);
        this.isRasterLayer = true;
    }
}
export {RasterLayer}