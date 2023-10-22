import {ElevationLayer} from './ElevationLayer.js'

class SimpleElevationLayer extends ElevationLayer{

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);
    }

    getElevation(bounds, width, height) {

        var elevationArray = new Array(width * height).fill(0);
        for (let x = 0; x < width; x ++) {
            for (let y = 0; y < height; y ++) {
                let lat = bounds.min.y + (y * ((bounds.max.y - bounds.min.y) / (height-1)));
                let lon = bounds.min.x + (x * ((bounds.max.x - bounds.min.x) / (width-1)));
                elevationArray[width * y + x] = 5000 *(Math.cos(lon*500) + Math.cos(lat*500));
            }
        }
        return Promise.resolve(elevationArray);
    };
}

export { SimpleElevationLayer };