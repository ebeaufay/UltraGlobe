import ElevationLayer from './ElevationLayer.js'

/**
 * A service to retrieve elevation from a single image in equidistant cylindrical projection
 */

const toDegrees = 57.295779513082320876798154814105;
class BingElevationLayer extends ElevationLayer{

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double],
     * bingMapsKey: String} properties 
     */
    constructor(properties) {
        super(properties);
        this.bingMapsKey = properties.bingMapsKey;
    }
    
    getElevation(bounds) {
        if(!this.bounds.intersectsBox(bounds)){
            return Promise.reject(new Error("bounds don't intersect with layer"));
        }
        var minY = Math.min(90,Math.max(-90,bounds.min.y * toDegrees));
        var maxY = Math.min(90,Math.max(-90,bounds.max.y * toDegrees));
        var minX = Math.min(179.99999999,Math.max(-180,bounds.min.x * toDegrees));
        var maxX = Math.min(179.99999999,Math.max(-180,bounds.max.x * toDegrees));
        
        if (minY > 85 || maxY < -85) {
            return Promise.resolve(new Array(32 * 32).fill(0));
        }
        else if (minY >= -85 && maxY <= 85) {
            var request = "http://dev.virtualearth.net/REST/v1/Elevation/Bounds?bounds=" +
                minY + "," + minX + "," +
                maxY + "," + maxX +
                "&rows=" + 32 + "&cols=" + 32 + "&key=" + this.bingMapsKey;
            return fetch(request)
                .then(response => response.json())
                .then(json => json.resourceSets[0].resources[0].elevations);
        } else {
            
            var skipLow = 0;
            var skipHigh = 0;
            var rowHeight = ((maxY - minY) / 32);
            if (minY < -85) {
                skipLow = Math.ceil((-85 - minY) / rowHeight);
            }
            if (maxY > 85) {
                skipHigh = Math.ceil((maxY - 85) / rowHeight);
            }
            var request = "http://dev.virtualearth.net/REST/v1/Elevation/Bounds?bounds=" +
                ((minY+(skipLow * rowHeight)) ) + "," + (minX ) + "," +
                ((maxY-(skipHigh * rowHeight)) ) + "," + (maxX ) +
                "&rows=" + (32-skipHigh-skipLow) + "&cols=" + 32 + "&key=" + this.bingMapsKey;
            return fetch(request)
                .then(response => response.json())
                .then(json => json.resourceSets[0].resources[0].elevations)
                .then(elevations =>{
                    var elevationArray = new Array(32 * 32).fill(0);
                    var skip = 32*skipLow;
                    for (let index = 0; index < elevations.length; index++) {
                        elevationArray[skip+index] = elevations[index];
                    }
                    return elevationArray;
                });
        }

    };
}

export { BingElevationLayer };