import { ImageryLayer } from "./ImageryLayer.js"
import * as THREE from 'three';
const toDegrees = 57.295779513082320876798154814105;
const defaultTexture = generateDefaultTexture();

function generateDefaultTexture() {
    const width = 1;
    const height = 1;
    const data = new Uint8Array(4);

    const transparentTexture = new THREE.DataTexture(data, width, height);
    transparentTexture.minFilter = THREE.NearestFilter;
    transparentTexture.magFilter = THREE.NearestFilter;
    transparentTexture.generateMipmaps = false;
    transparentTexture.needsUpdate = true;
    return transparentTexture;
}

/**
 * Imagery from a single image (Equidistant Cylindrical only).
 * @class
 * @extends ImageryLayer
 */
class SingleImageImageryLayer extends ImageryLayer {

    /**
     * Create a layer that requests images from a WMS service. 
     * The layer will immediately return the closest available LOD and load a better LOD for the tile when requestable
     * Only EPSG:4326 is supported.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.url the image url
     * @param {String} properties.epsg an EPSG code (only epsg:4326 supported)
     * @param {Number} [properties.transparency = 0] the layer's transparency (0 to 1)
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        const self = this;

        self.loaded = false;
        self.pendingRequests = [];
        self.reference = properties.epsg;

        const loader = new THREE.TextureLoader();

        // load a resource
        loader.load(
            properties.url,
            // onLoad callback
            function (texture) {
                self.texture = texture;
                self.loaded = true;
                self.pendingRequests.forEach(f => f());
            },
            // onProgress callback currently not supported
            undefined,
            // onError callback
            function (err) {
                console.error('Could not load texture from url: '+properties.url);
            }
        );
    }

    getMap(tile, callbackSuccess, callbackFailure, width = 128, height = 128) {
        if (!this.bounds || !this.bounds.intersectsBox(tile.bounds)) {
            callbackFailure("bounds don't intersect with layer");
        }
        const self = this;

        const minX = (tile.bounds.min.x*toDegrees - self.bounds.min.x)/(self.bounds.max.x-self.bounds.min.x);
        const maxX = (tile.bounds.max.x*toDegrees - self.bounds.min.x)/(self.bounds.max.x-self.bounds.min.x);
        const minY = (tile.bounds.min.y*toDegrees - self.bounds.min.y)/(self.bounds.max.y-self.bounds.min.y);
        const maxY = (tile.bounds.max.y*toDegrees - self.bounds.min.y)/(self.bounds.max.y-self.bounds.min.y);
        const uvBounds = new THREE.Box2(new THREE.Vector2(minX, minY), new THREE.Vector2(maxX, maxY));

        if (!self.loaded) {
            self.pendingRequests.push(() => {
                callbackSuccess({
                    texture: self.texture,
                    uvBounds: uvBounds,
                    reference: self.reference
                })
            });
            return {
                texture: defaultTexture,
                uvBounds: uvBounds,
                reference: self.reference
            };
        } else {
            
            return {
                texture: self.texture,
                uvBounds: uvBounds,
                reference: self.reference
            }
        }
    };

    detach(user, texture) {
        
    }
}

export { SingleImageImageryLayer };