import { ImageryLayer } from "./ImageryLayer.js"
import * as THREE from 'three';
const toDegrees = 57.295779513082320876798154814105;
const defaultTexture = generateDefaultTexture();
const uvBounds = new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1));
function generateDefaultTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Get the context of the canvas
    const context = canvas.getContext('2d');

    context.fillStyle = 'rgb(8,23,54)';
    context.fillRect(0, 0, 1, 1);

    // Create a Three.js texture from the canvas
    const texture = new THREE.Texture(canvas);

    // Set texture parameters if needed
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
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
     * @param {String} properties.url the image url
     * @param {String} properties.epsg an EPSG code (only epsg:4326 supported)
     * @param {THREE.Box2} properties.bounds the bounds of the image
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} properties.transparency the layer's transparency (0 to 1)
     * @param {Boolean} properties.visible layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        const self = this;

        self.loaded = false;
        self.pendingRequests = [];
        self.reference = properties.epsg;

        self.img = new Image();

        self.img.onload = function () {
            self.loaded = true;
            self.pendingRequests.forEach(f => f());
        };
        self.img.src = properties.url;
        if(properties.bounds){
            self.bounds = new THREE.Box2(new THREE.Vector2(properties.bounds[0]/toDegrees, properties.bounds[1]/toDegrees), new THREE.Vector2(properties.bounds[2]/toDegrees, properties.bounds[3]/toDegrees));
        }
        
        self.userTextureMap = {};
    }

    getMap(tile, callbackSuccess, callbackFailure, width = 128, height = 128) {
        if (!this.bounds || !this.bounds.intersectsBox(tile.bounds)) {
            callbackFailure("bounds don't intersect with layer");
        }
        const self = this;

        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        const texture = new THREE.CanvasTexture(ctx.canvas);

        const loadFunction = () => {
            if (!!tile.disposed) {
                return;
            }
            const sx = (tile.bounds.min.x - self.bounds.min.x) * self.img.width / (self.bounds.max.x - self.bounds.min.x); let sy = (tile.bounds.min.y - self.bounds.min.y) * self.img.height / (self.bounds.max.y - self.bounds.min.y);
            const sw = ((tile.bounds.max.x - tile.bounds.min.x) / (self.bounds.max.x - self.bounds.min.x)) * self.img.width;
            const sh = ((tile.bounds.max.y - tile.bounds.min.y) / (self.bounds.max.y - self.bounds.min.y)) * self.img.height;
            sy = self.img.height - (sy + sh)
            ctx.drawImage(self.img, sx, sy, sw, sh, 0, 0, width, height);
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            return texture;
        }

        if (!self.loaded) {
            self.pendingRequests.push(() => {
                const tex = loadFunction();
                self.userTextureMap[tile] = tex;
                callbackSuccess(tex);
            });
            return {
                texture: defaultTexture,
                uvBounds: uvBounds,
                reference: self.reference
            };
        } else {
            const tex = loadFunction();
            self.userTextureMap[tile] = tex;
            return {
                texture: tex,
                uvBounds: uvBounds,
                reference: self.reference
            }
        }
    };

    detach(user, texture) {
        if (texture == defaultTexture) return;
        if(this.userTextureMap[user]){
            this.userTextureMap[user].dispose();
            delete this.userTextureMap[user];
        }
    }
}

export { SingleImageImageryLayer };