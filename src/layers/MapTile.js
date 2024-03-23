import * as THREE from 'three';
const defaultUVBounds = new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1));
const defaultTexture = generateDefaultTexture();
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
 * Map Tile handles level of detail for maps separately from the terrain level of detail.
 */
class MapTile {
    /**
     * 
     * @param {Object} properties 
     * @param {Object} properties.reference unused, only EPSG:4326 is supported
     * @param {THREE.Box2} properties.bounds this tile's bounds
     * @param {MapTile} properties.parent this tile's direct parent
     * @param {fetchTileFunction} properties.fetchTileTextureFunction a function that fetches a tile texture through a CancellableTextureLoader and takes this MapTile's bounds and a callback as argument.
     * @param {maxLOD} properties.maxLOD a maximum recursion depth
     * @param {lod} properties.lod this tile's lod (optional)
     */
    constructor(properties) {
        this.reference = properties.reference; // currently only EPSG:4326 is supported
        this.bounds = properties.bounds;
        this.boundsWidth = (this.bounds.max.x - this.bounds.min.x);
        this.boundsHeight = (this.bounds.max.y - this.bounds.min.y);
        this.parent = properties.parent;
        this.fetchTileTextureFunction = properties.fetchTileTextureFunction;
        this.maxLOD = properties.maxLOD ? properties.maxLOD : 20;
        this.lod = properties.lod ? properties.lod : 0;
        this.users = new Set();
        this.children = [];
        this.callbacks = [];
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
            throw "Exception: MapTile bounds does not contain request bounds";
        }

        if (self.maxLOD == self.lod ||
            requestBounds.max.x - requestBounds.min.x > self.boundsWidth * 0.5 ||
            requestBounds.max.y - requestBounds.min.y > self.boundsHeight * 0.5) { //bounds fit this tile

            self.users.add(requestor);
            if (self.texture) {
                if (self.texture.isReady) {
                    return {
                        texture: self.texture,
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

                    self.callbacks.push((texture) => {


                        callback({
                            texture: texture,
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
                self.texture = self.fetchTile(self.bounds);
                self.callbacks.push((texture) => {
                    callback({
                        texture: texture,
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
                new MapTile({
                    reference: self.reference,
                    bounds: cb,
                    parent: self,
                    fetchTileTextureFunction: self.fetchTileTextureFunction,
                    maxLOD: self.maxLOD,
                    lod: self.lod + 1
                })
            );
        });

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
        if (self.texture && self.texture.isReady) {
            self.users.add(requestor);
            return {
                texture: self.texture,
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
            if (self.texture && texture == self.texture) {
                self.users.delete(requestor);
            }
        } else {
            self.users.delete(requestor);
        }

        if (emptyChildren && self.users.size == 0) {
            if (self.texture) {
                if(self.texture.abort) self.texture.abort();
                self.texture.dispose();
                self.texture = undefined;
            }
            return true;
        }

        return false;
    }

    fetchTile() {
        const self = this;
        return self.fetchTileTextureFunction(self.bounds, (texture) => {
            self.callbacks.forEach(callback => callback(texture));
            self.callbacks.length = 0;
        }, error => {
            if (self.texture) {
                if(self.texture.abort) self.texture.abort();
                self.texture.dispose();
                self.texture = undefined;
            }

        })
    }


} export { MapTile }