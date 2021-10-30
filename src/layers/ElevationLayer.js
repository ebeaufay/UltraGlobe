import { RasterLayer } from './RasterLayer.js';

class ElevationLayer extends RasterLayer{
    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);
    }
}

export{ElevationLayer}