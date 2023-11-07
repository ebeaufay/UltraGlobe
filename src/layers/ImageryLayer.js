import { RasterLayer } from './RasterLayer.js';

class ImageryLayer extends RasterLayer{
    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);
        this.transparency = properties.transparency?properties.transparency:0;
        this.isImageryLayer = true;
    }

    
}

export{ImageryLayer}