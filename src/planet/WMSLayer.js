import * as THREE from 'three';
import {CancellableTextureLoader} from '../loaders/CancellableTextureLoader.js'

/**
 * A service to retrieve maps from a WMS Service
 */

const toDegrees = 57.295779513082320876798154814105;
class WMSLayer {

    constructor(url, layers, epsg = "EPSG:4326", version = "1.1.1") {
        this.url = url;
        this.layers = layers;
        this.epsg = epsg;
        this.version = version;
    }

    getMap(bounds, callback, width = 128, height = 128) {

            const textureLoader = new CancellableTextureLoader();
            
            return textureLoader.load(this.getFullUrl(bounds, width, height), (texture) => {
                callback(texture);
            });
    };

    getFullUrl (bounds, width = 128, height = 128)
    {
        var minY = Math.min(90, Math.max(-90, bounds.min.y * toDegrees));
        var maxY = Math.min(90, Math.max(-90, bounds.max.y * toDegrees));
        var minX = Math.min(179.99999999, Math.max(-180, bounds.min.x * toDegrees));
        var maxX = Math.min(179.99999999, Math.max(-180, bounds.max.x * toDegrees));

        return this.url + "?request=getmap&service=wms&format=image/jpeg&BBOX=" +
               minX + "," + minY + "," +
               maxX + "," + maxY +
               "&srs=" + this.epsg +
               "&layers=" + this.layers +
               "&width=" + width +
               "&height=" + height +
               "&version=" + this.version +
               "&styles=default";
    }
}

export { WMSLayer };