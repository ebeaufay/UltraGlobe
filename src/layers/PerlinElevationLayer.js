import {ElevationLayer} from './ElevationLayer.js'
import * as simplex from "fast-simplex-noise";
const simplex2 = simplex.makeNoise2D();

class PerlinElevationLayer extends ElevationLayer{

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
        console.log(bounds);
    
        var elevationArray = new Array(width * height).fill(0);

        for (let octave = 0; octave < 5; octave++) {
            const freq = Math.pow(2, octave)*5;
            const amp = Math.pow(0.8, octave);
    
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let lat = bounds.min.y + (y * ((bounds.max.y - bounds.min.y) / (height-1)));
                    let lon = (bounds.min.x + (x * ((bounds.max.x - bounds.min.x) / (width-1))))*Math.cos(lat);
                    elevationArray[width * y + x] += simplex2(lon * freq, lat * freq) * amp * 8000;
                }
            }
        }
        
        return Promise.resolve(elevationArray);
    };
}

export { PerlinElevationLayer };