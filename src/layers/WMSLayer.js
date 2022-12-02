
import { CancellableTextureLoader } from '../loaders/CancellableTextureLoader.js'
import { ImageryLayer } from "./ImageryLayer.js"
/**
 * A service to retrieve maps from a WMS Service
 */

const toDegrees = 57.295779513082320876798154814105;
class WMSLayer extends ImageryLayer {

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double], 
     * url: String,
     * layer: String[],
     * epsg:String,
     * version:String} properties 
     */
    constructor(properties) {
        super(properties);
        const self = this;
        self.url = properties.url;
        self.layer = properties.layer;
        self.epsg = properties.epsg;
        self.version = properties.version;
        self.format = properties.format ? properties.format : "jpeg";
        self.textureLoader = new CancellableTextureLoader();

        self.downloads = [];

        
        
    }


    getMap(tile, callbackSuccess, callbackFailure, width = 128, height = 128) {
        if (!this.bounds || !this.bounds.intersectsBox(tile.bounds)) {
            callbackFailure("bounds don't intersect with layer");
        }
        var minY = Math.min(90, Math.max(-90, tile.bounds.min.y * toDegrees));
        var maxY = Math.min(90, Math.max(-90, tile.bounds.max.y * toDegrees));
        var minX = Math.min(179.99999999, Math.max(-180, tile.bounds.min.x * toDegrees));
        var maxX = Math.min(179.99999999, Math.max(-180, tile.bounds.max.x * toDegrees));

        var request = this.url + "?request=GetMap&SERVICE=WMS&BBOX=";
        switch (this.version) {
            case "1.1.1": request += minX + "," + minY + "," + maxX + "," + maxY + "&SRS=" + this.epsg; break;
            default: request += minY + "," + minX + "," + maxY + "," + maxX + "&CRS=" + this.epsg; break;
        }
        request +=
            "&LAYERS=" + this.layer +
            "&WIDTH=" + width +
            "&HEIGHT=" + height +
            "&VERSION=" + this.version +
            "&FORMAT=image/" + this.format;

        
        return this.textureLoader.load(request, (texture) => callbackSuccess(texture), null, (error) => callbackFailure(error), tile.level);

    };
}

export { WMSLayer };