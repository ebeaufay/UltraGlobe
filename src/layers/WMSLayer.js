
import * as THREE from 'three';
import { CancellableTextureLoader } from '../loaders/CancellableTextureLoader.js'
import { ImageryLayer } from "./ImageryLayer.js"
import { MapTile } from "./MapTile.js";

const toDegrees = 57.295779513082320876798154814105;
/**
* A service to retrieve maps from a WMS Service
* @class
* @extends ImageryLayer
*/
class WMSLayer extends ImageryLayer {

    /**
     * Create a layer that requests images from a WMS service. 
     * The layer will immediately return the closest available LOD and load a better LOD for the tile when requestable
     * Only EPSG:4326 is supported.
     * @param {Object} properties 
     * @param {String} properties.url the service url
     * @param {String} properties.layer the wms layer 
     * @param {String} properties.epsg an EPSG code (only 4326 supported)
     * @param {String} properties.version the version of the service
     * @param {String} properties.format the image format (usually jpeg or png)
     * @param {Number} properties.maxLOD (optional) a maximum LOD (default : 20) where LOD 0 represents the entire earth and subsequent levels split the parent zone in 4. For EPSG:4326, LOD 0 already has 2 tiles for left and right hemisphere.
     * @param {Number} properties.imageSize (optional) set a size for image requests. defaults to 128
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
        self.imageSize = properties.imageSize ? properties.imageSize : 128;
        self.maxLOD = properties.maxLOD ? properties.maxLOD : 20;

        self.downloads = [];
        self.fetchTextureFunction = (aBounds, callback, onError) => {

            const minY = Math.min(90, Math.max(-90, aBounds.min.y * toDegrees));
            const maxY = Math.min(90, Math.max(-90, aBounds.max.y * toDegrees));
            const minX = Math.min(179.99999999, Math.max(-180, aBounds.min.x * toDegrees));
            const maxX = Math.min(179.99999999, Math.max(-180, aBounds.max.x * toDegrees));


            let request = self.url + "?request=GetMap&SERVICE=WMS&BBOX=";
            switch (self.version) {
                case "1.1.1": request += minX + "," + minY + "," + maxX + "," + maxY + "&SRS=" + self.epsg; break;
                default: request += minY + "," + minX + "," + maxY + "," + maxX + "&CRS=" + self.epsg; break;
            }
            request +=
                "&LAYERS=" + self.layer +
                "&WIDTH=" + self.imageSize +
                "&HEIGHT=" + self.imageSize +
                "&VERSION=" + self.version +
                "&STYLES=" +
                "&FORMAT=image/" + self.format;


            return self.textureLoader.load(request, (texture) => callback(texture), null, (error) => onError(error));
        }
        self.mapTiles = [
            new MapTile({
                reference: self.epsg,
                bounds: new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI * 0.5), new THREE.Vector2(0, Math.PI * 0.5)),
                fetchTileTextureFunction: self.fetchTextureFunction,
                maxLOD: self.maxLOD
            }),
            new MapTile({
                reference: self.epsg,
                bounds: new THREE.Box2(new THREE.Vector2(0, -Math.PI * 0.5), new THREE.Vector2(Math.PI, Math.PI * 0.5)),
                fetchTileTextureFunction: self.fetchTextureFunction,
                maxLOD: self.maxLOD
            })
        ];



    }


    /**
     * Fetches the nearest loaded LOD (texture, uvBounds and reference) and adds a callback for the ideal LOD if not yet available
     * @param {PlanetTile} tile the requestor 
     * @param {Function} callbackSuccess the callback to be called when correct LOD is available with an object containing texture and uvBounds
     * @param {Function} callbackFailure called on exception
     * @returns {{texture: THREE.Texture, uvBounds:THREE.Box2}} the nearest already loaded LOD texture and uv bounds for the requestor: {texture: THREE.Texture, uvBounds:THREE.Box2}
     */
    getMap(tile, callbackSuccess, callbackFailure) {


        for (let i = 0; i < this.mapTiles.length; i++) {
            if (this.mapTiles[i].bounds.containsBox(tile.bounds)) {
                return this.mapTiles[i].getTextureAndUVBounds(tile, tile.bounds, callbackSuccess)
            }
        }
        callbackFailure("bounds don't intersect with layer");
        throw ("bounds don't intersect with layer")
    };

    detach(tile, texture) {
        this.mapTiles.forEach(mapTile => mapTile.detach(tile, texture));
    }
}

export { WMSLayer };