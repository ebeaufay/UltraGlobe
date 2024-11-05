import * as THREE from 'three';
import { haversineDistance } from '../GeoUtils'

const defaultUVBounds = new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1));
const defaultTexture = generateDefaultTexture();
const target = new THREE.Vector3();
const toDegrees = 57.295779513082320876798154814105;


/**
 * Map Tile handles level of detail for maps separately from the terrain level of detail.
 */
class DrapedVectorLayerTile {
    /**
     * 
     * @param {Object} properties 
     * @param {THREE.Box2} properties.bounds this tile's bounds
     * @param {DrapedVectorLayerTile} properties.parent this tile's direct parent
     * @param {fetchTileFunction} properties.fetchTileTextureFunction a function that fetches a tile texture and takes this DrapedVectorLayerTile's bounds and a callback as argument.
     * @param {maxLOD} [properties.maxLOD=15] a maximum recursion depth
     * @param {lod} properties.lod this tile's lod (optional)
     * @param {number} [properties.imageSize = 512] image resolution for draped tiles.
     */
    constructor(properties) {
        this.bounds = properties.bounds;
        this.reference = "EPSG:4326";
        this.boundsWidth = (this.bounds.max.x - this.bounds.min.x);
        this.boundsHeight = (this.bounds.max.y - this.bounds.min.y);
        this.parent = properties.parent;
        this.fetchTileTextureFunction = properties.fetchTileTextureFunction;
        this.maxLOD = properties.maxLOD ? properties.maxLOD : 20;
        const min = Math.min(Math.abs(this.bounds.max.y), Math.abs(this.bounds.min.y));
        if(min<90 && min> 83) this.maxLOD = Math.min(13, this.maxLOD)
        this.lod = properties.lod ? properties.lod : 0;
        this.users = new Set();
        this.children = [];
        this.callbacks = [];
        this.imageSize = properties.imageSize ? properties.imageSize : 512;

        const center = this.bounds.getCenter(new THREE.Vector2());
        let centerLat = Math.abs(this.bounds.min.y)>Math.abs(this.bounds.max.y)?this.bounds.max.y:this.bounds.min.y;
        if(Math.abs(centerLat) == Math.PI*0.5) centerLat = 0;
        const distY = haversineDistance(center.x*toDegrees, this.bounds.min.y * toDegrees, center.x*toDegrees, this.bounds.max.y * toDegrees);
        const distX = haversineDistance(this.bounds.min.x * toDegrees, centerLat*toDegrees, this.bounds.max.x * toDegrees, centerLat*toDegrees);

        const m = Math.sqrt((this.imageSize * this.imageSize) / (distX * distY));
        this.renderTarget = new THREE.WebGLRenderTarget(Math.ceil(distX * m), Math.ceil(distY*m), {
            depthBuffer: false,
            generateMipmaps: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            samples: 4
        });
        this.renderTarget.texture.minFilter = THREE.LinearFilter;
        this.renderTarget.texture.magFilter = THREE.LinearFilter;
        this.renderTarget.texture.generateMipmaps = false;
        this.camera = new THREE.OrthographicCamera((-this.boundsWidth / 2) * toDegrees, (this.boundsWidth / 2) * toDegrees, (this.boundsHeight / 2) * toDegrees, (-this.boundsHeight / 2) * toDegrees, 0, 2);
        this.bounds.getCenter(this.camera.position);
        this.camera.position.x *= toDegrees;
        this.camera.position.y *= toDegrees;
        this.camera.position.z = 1;
        target.set(0, 0, -1);
        target.add(this.camera.position)
        this.camera.lookAt(target)
        this.camera.updateMatrixWorld();

        this.isValid = false;
    }

    /**
     *  invalidates the tile and children if it overlaps the given bounds
     * @param {THREE.Box2} bounds 
     */
    invalidate(aBounds) {
        if (this.bounds.intersectsBox(aBounds)) {

            this.isValid = false;
            if (this.users.size > 0) {
                this.fetchTile();
            }

            this.children.forEach(child => {
                child.invalidate(aBounds);
            })
        }
    }

    /**
     * Request a texture and UVBounds from this tile.
     * the request fits this tile if the requestBounds width and height are equal to the tile bounds or smalle but bigger than half of the tile bounds
     * 
     * If the request fits the tile:
     * - When a texture is already loaded, it is immediately returned with matching uv bounds. The callback will never be called.
     * - when a texture is not yet loaded, a texture will be requested from the parent and the texture for this level will be requested. 
     * The callback will then be called if the requestor hasn't called the detach method in the meantime.
     * 
     * If the request does not fit the tile because the tile is too large.
     * - If the tile already has children, the request will be forwarded.
     * - If the tile does not have children, children are generated and the request is forwarded down.
     * 
     * If the request does not fit the tile because the tile bounds doesn't contain the request bounds,  an error will be thrown.
     * 
     * @param {Object} requestor 
     * @param {THREE.Box2} requestBounds 
     * @param {Function} callback a callback function called when the texture is loaded
     */
    getTextureAndUVBounds(requestor, requestBounds, callback) {
        const self = this;
        if (!self.bounds.containsBox(requestBounds)) {
            throw "Exception: DrapedVectorLayerTile bounds does not contain request bounds";
        }

        if (self.maxLOD <= self.lod ||
            requestBounds.max.x - requestBounds.min.x > self.boundsWidth * 0.5 ||
            requestBounds.max.y - requestBounds.min.y > self.boundsHeight * 0.5) { //bounds fit this tile

            self.users.add(requestor);
            if (self.isValid) {
                
                return {
                    texture: self.renderTarget.texture,
                    uvBounds: new THREE.Box2(
                        new THREE.Vector2(
                            (requestBounds.min.x - self.bounds.min.x) / self.boundsWidth,
                            (requestBounds.min.y - self.bounds.min.y) / self.boundsHeight),
                        new THREE.Vector2(
                            (requestBounds.max.x - self.bounds.min.x) / self.boundsWidth,
                            (requestBounds.max.y - self.bounds.min.y) / self.boundsHeight)
                    ),
                    reference: self.reference
                }
            } else {
                self.fetchTile(self.bounds);
                self.callbacks.push(() => {
                    callback({
                        texture: self.renderTarget.texture,
                        uvBounds: new THREE.Box2(
                            new THREE.Vector2(
                                (requestBounds.min.x - self.bounds.min.x) / self.boundsWidth,
                                (requestBounds.min.y - self.bounds.min.y) / self.boundsHeight),
                            new THREE.Vector2(
                                (requestBounds.max.x - self.bounds.min.x) / self.boundsWidth,
                                (requestBounds.max.y - self.bounds.min.y) / self.boundsHeight)
                        ),
                        reference: self.reference
                    })
                });
                if (self.parent) {
                    return self.parent.getBestTextureAndUVBounds(requestor, requestBounds);
                } else {
                    return {
                        texture: defaultTexture,
                        uvBounds: defaultUVBounds,
                        reference: self.reference
                    }
                }
            }
        } else {
            if (self.children.length == 0) {
                self.split();
            }
            for (let i = 0; i < self.children.length; i++) {
                if (self.children[i].bounds.containsBox(requestBounds)) {
                    return self.children[i].getTextureAndUVBounds(requestor, requestBounds, callback);
                }
            }
        }
    }

    /**
     * Split this tile in four and populate this.children with them.
     */
    split() {
        const self = this;

        const lengthUp = 111319 * (this.bounds.max.y - this.bounds.min.y);
        const lengthSide = Math.cos((self.bounds.min.y + self.bounds.max.y) * 0.5) * 111319 * (self.bounds.max.x - self.bounds.min.x);

        if (lengthSide < lengthUp * 0.5) {
            const midY = (self.bounds.min.y + self.bounds.max.y) / 2;
            // Create four new boxes
            const childBounds = [
                new THREE.Box2(self.bounds.min, new THREE.Vector2(self.bounds.max.x, midY)),
                new THREE.Box2(new THREE.Vector2(self.bounds.min.x, midY), self.bounds.max)
            ];
    
    
            childBounds.forEach(cb => {
                self.children.push(
                    new DrapedVectorLayerTile({
                        bounds: cb,
                        parent: self,
                        fetchTileTextureFunction: self.fetchTileTextureFunction,
                        maxLOD: self.maxLOD,
                        lod: self.lod + 1,
                        imageSize: this.imageSize
                    })
                );
            });
        }else{
            const midX = (self.bounds.min.x + self.bounds.max.x) / 2;
            const midY = (self.bounds.min.y + self.bounds.max.y) / 2;
    
            // Create four new boxes
            const childBounds = [
                new THREE.Box2(new THREE.Vector2(self.bounds.min.x, midY), new THREE.Vector2(midX, self.bounds.max.y)),
                new THREE.Box2(new THREE.Vector2(midX, midY), new THREE.Vector2(self.bounds.max.x, self.bounds.max.y)),
                new THREE.Box2(new THREE.Vector2(self.bounds.min.x, self.bounds.min.y), new THREE.Vector2(midX, midY)),
                new THREE.Box2(new THREE.Vector2(midX, self.bounds.min.y), new THREE.Vector2(self.bounds.max.x, midY))
            ];
    
    
            childBounds.forEach(cb => {
                self.children.push(
                    new DrapedVectorLayerTile({
                        bounds: cb,
                        parent: self,
                        fetchTileTextureFunction: self.fetchTileTextureFunction,
                        maxLOD: self.maxLOD,
                        lod: self.lod + 1,
                        imageSize: this.imageSize
                    })
                );
            });
        }
        

    }
    /**
     * If this tile has a loaded texture, returns it with uv bounds that match the requested bounds,
     * else, forwards the request to it's parent.
     * if no parent is present, returns a default texture.
     * @param {Object} requestor 
     * @param {THREE.Box2} requestBounds 
     */
    getBestTextureAndUVBounds(requestor, requestBounds) {

        const self = this;
        if (self.isValid) {
            self.users.add(requestor);
            return {
                texture: self.renderTarget.texture,
                uvBounds: new THREE.Box2(
                    new THREE.Vector2(
                        (requestBounds.min.x - self.bounds.min.x) / self.boundsWidth,
                        (requestBounds.min.y - self.bounds.min.y) / self.boundsHeight),
                    new THREE.Vector2(
                        (requestBounds.max.x - self.bounds.min.x) / self.boundsWidth,
                        (requestBounds.max.y - self.bounds.min.y) / self.boundsHeight)
                ),
                reference: self.reference
            }
        } else if (self.parent) {
            return self.parent.getBestTextureAndUVBounds(requestor, requestBounds);
        } else {
            return {
                texture: defaultTexture,
                uvBounds: defaultUVBounds,
                reference: self.reference
            }
        }
    }

    /**
     * detach a requestor that was using this tile's texture.
     * If children have no users, they'll be garbage collected.
     * If this tile has no more users, texture will be disposed and ongoing texture requests will be cancelled.
     * @param {Object} requestor the requestor using the tile's texture
     * @param {THREE.Texture} texture (optional) the requestor will be removed from the user set ONLY if the texture matches this tile's texture when one is provided
     * @returns true if there are no users left for this tile or any children tile
     */
    detach(requestor, texture) {
        if (texture && texture == defaultTexture) return;
        const self = this;
        let emptyChildren = true;
        for (let i = 0; i < self.children.length; i++) {
            if (!self.children[i].detach(requestor, texture)) {
                emptyChildren = false;

            }
        }

        if (emptyChildren) {
            self.children.length = 0;
        }
        if (texture) {
            if (texture == self.renderTarget.texture) {
                self.users.delete(requestor);
            }
        } else {
            self.users.delete(requestor);
        }

        if (emptyChildren && self.users.size == 0) {
            self.isValid = false;
            self.renderTarget.texture.dispose();
            self.renderTarget.dispose();
            return true;
        }

        return false;
    }


    _callback() {
        this.isValid = true;
        this.callbacks.forEach(callback => callback());
        this.callbacks.length = 0;
    }
    fetchTile() {

        this.fetchTileTextureFunction(this)
    }

    dispose() {
        this.children.forEach(child => {
            child.dispose();
        })
        this.children.length = 0;
        this.users.clear();
        self.callbacks.length = 0;
        this.renderTarget.texture.dispose();
        this.renderTarget.dispose();
    }

} export { DrapedVectorLayerTile }

function generateDefaultTexture() {
    const width = 2;
    const height = 2;
    const data = new Uint8Array(16); // RGBA format, fully transparent

    const transparentTexture = new THREE.DataTexture(data, width, height);
    transparentTexture.minFilter = THREE.NearestFilter;
    transparentTexture.magFilter = THREE.NearestFilter;
    transparentTexture.generateMipmaps = false;
    transparentTexture.needsUpdate = true;
    return transparentTexture;
}