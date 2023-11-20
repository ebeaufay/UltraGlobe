import {ElevationLayer} from './ElevationLayer.js'

const halfPI = Math.PI*0.5;
/**
 * A simple on the fly elevation layer that displays sinusoidal terrain
 */
class SimpleElevationLayer extends ElevationLayer{

    
    constructor(properties) {
        super(properties);
    }

    getElevation(bounds, width, height) {

        var elevationArray = new Array(width * height).fill(0);
        for (let x = 0; x < width; x ++) {
            for (let y = 0; y < height; y ++) {
                
                let lat = bounds.min.y + (y * ((bounds.max.y - bounds.min.y) / (height-1)));
                let lon = bounds.min.x + (x * ((bounds.max.x - bounds.min.x) / (width-1)));
                let adjustedLon = lon;
                let adjustedLat = lat;
                if(adjustedLat>halfPI){
                    adjustedLon-=Math.PI;
                    adjustedLat = halfPI - (adjustedLat-halfPI)
                }else if (adjustedLat < -halfPI) {
                    adjustedLon -= Math.PI;
                    adjustedLat = -halfPI - (adjustedLat + halfPI)
                }
                if(adjustedLon>Math.PI){
                    adjustedLon = -Math.PI+(adjustedLon%Math.PI);
                }
                else if(adjustedLon<-Math.PI){
                    adjustedLon = Math.PI+(adjustedLon%Math.PI);
                }
                elevationArray[width * y + x] = 5000 *(Math.cos(adjustedLon*500) + Math.cos(adjustedLat*500));
            }
        }
        return Promise.resolve(elevationArray);
    };
}

export { SimpleElevationLayer };