import * as THREE from 'three';
import { PlanetTileShaderChunks } from './PlanetTileShaderChunks.glsl.js';
import { Mesh } from 'three/src/objects/Mesh';
import { MeshStandardMaterial, Vector4 } from 'three';
import { RasterLayer } from '../layers/RasterLayer.js';
import { LAYERS_CHANGED } from '../layers/LayerManager.js'
import { VISIBILITY_CHANGE } from '../layers/Layer.js';
import { TerrainMeshGenerator } from './TerrainMeshGenerator';

const terrainMeshGenerator = new TerrainMeshGenerator();
const TILE_SIZE = 32;
const MAX_LEVEL = 15;
const TILE_IMAGERY_SIZE = 128;
const defaultTexture = buildZeroTexture();
const defaultImageTexture = generateDefaultImageTexture();
function generateDefaultImageTexture() {
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

const emptyVec4 = new THREE.Vector4(0, 0, 0, 0);

const degreeToRadians = Math.PI / 180;
const radiansToDegrees = 180 / Math.PI;
const defaultElevation = [];
const defaultExtendedElevation = [];

// reusable points
const nearestMSE = new THREE.Vector3();
const nearestSurface = new THREE.Vector3();
const p = new THREE.Vector3();
const p1 = new THREE.Vector3();
const p2 = new THREE.Vector3();
const p3 = new THREE.Vector3();
const center = new THREE.Vector2();
const boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0)


for (let index = 0; index < TILE_SIZE * TILE_SIZE; index++) {
    defaultElevation.push(0);

}
for (let index = 0; index < (TILE_SIZE + 2) * (TILE_SIZE + 2); index++) {
    defaultExtendedElevation.push(0);

}

function buildZeroTexture() {
    var data = new Uint8Array(3);
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    return new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
}





const tilesToLoad = [];
function scheduleLoadLayers(tile) {
    const length = tilesToLoad.length;
    for (let index = 0; index < tilesToLoad.length; index++) {
        if (tilesToLoad[index] == tile) return;
        if (tilesToLoad[index].priority > tile.priority) {
            tilesToLoad.splice(index, 0, tile);
            return;
        }
    }
    if (tilesToLoad.length == length) {
        tilesToLoad.push(tile);
    }
}



setInterval(() => {
    const start = now();
    while (tilesToLoad.length > 0 && now() - start < 1) {
        const tile = tilesToLoad.shift();
        if (!!tile && !tile.disposed) tile._loadLayers(tile);
    }

}, 10)

function now() {
    return (typeof performance === 'undefined' ? Date : performance).now(); // see #10732
}

class PlanetTile extends Mesh {

    
    constructor(properties) {

        super();
        const self = this;
        self.skirt = new THREE.Mesh();
        self.tileChildren = [];
        self.isPlanetTile = true;
        self.frustumCulled = false; 
        self.bounds = properties.bounds; // Lon Lat bounds
        self.planet = properties.planet; // The parent planet (circular dependency... gives access to global planet properties and methods like tree traversal)
        self.layerManager = properties.layerManager;
        self.level = properties.level; // mesh recursion level
        self.elevationArray = defaultElevation;
        self.extendedElevationArray = defaultExtendedElevation;
        self.layerDataMap = {};
        ///// Important, a tile cannot be made visible while "loaded" is false.
        self.loaded = false;
        self.loading = 0;
        self.material.visible = false;
        self.elevationDisplayed = false;

        self.priority = self.level;
        self.mapRequests = []; // collects texture requests in order to abort them when needed
        self.shadows = properties.shadows;
        if (properties.shadows) {
            self.skirt.castShadow = false;
            self.skirt.receiveShadow = true;
            self.castShadow = true
            self.receiveShadow = true;
            
            //mesh.material.flatShading = true;
        }


        //Listen to changes in the list of layers, rebuild material if raster layer
        self.layerManager.addListener(self, (eventName, layer) => {
            if (LAYERS_CHANGED === eventName && layer instanceof RasterLayer) {
                scheduleLoadLayers(self);
            }
        });

        scheduleLoadLayers(self);
        self.rendered = false;
        self.onAfterRender = () => {
            self.rendered = true;
            self.frustumCulled = true;
            delete self.onAfterRender;
        };

    }

    _trimEdges(arr, width, height) {
        const result = [];

        for (let row = 1; row < height - 1; row++) {
            for (let col = 1; col < width - 1; col++) {
                result.push(arr[row * width + col]);
            }
        }

        return result;
    }

    _loadLayers(self) {

        self.layerManager.getLayers().forEach(layer => {
            if (!self.layerDataMap[layer.id]) {
                if (layer.isImageryLayer) {
                    //self._startLoading(self);
                    self.layerDataMap[layer.id] = {};
                    self.layerDataMap[layer.id].layer = layer;
                    function loadImagery(textureUVBoundsAndReference) {
                        self.layerDataMap[layer.id].texture = textureUVBoundsAndReference.texture;
                        self.layerDataMap[layer.id].projection = textureUVBoundsAndReference.reference;
                        self.layerDataMap[layer.id].uvBounds = textureUVBoundsAndReference.uvBounds;
                        self.needsMaterialRebuild = true;
                    }
                    loadImagery(layer.getMap(self, (textureUVBoundsAndReference) => {
                        if (!self.disposed) {
                            layer.detach(this, self.layerDataMap[layer.id].texture);
                            loadImagery(textureUVBoundsAndReference);
                        } else {
                            layer.detach(this);
                        }
                    }, (error) => {
                        console.error(error);
                    },
                        TILE_IMAGERY_SIZE, TILE_IMAGERY_SIZE));

                } else if (layer.isElevationLayer) {
                    self._startLoading(self);
                    self.layerDataMap[layer.id] = {};
                    const extendedBounds = self.bounds.clone();
                    extendedBounds.min.x -= (self.bounds.max.x - self.bounds.min.x) / (TILE_SIZE - 1);
                    extendedBounds.max.x += (self.bounds.max.x - self.bounds.min.x) / (TILE_SIZE - 1);
                    extendedBounds.min.y -= (self.bounds.max.y - self.bounds.min.y) / (TILE_SIZE - 1);
                    extendedBounds.max.y += (self.bounds.max.y - self.bounds.min.y) / (TILE_SIZE - 1);
                    layer.getElevation(extendedBounds, TILE_SIZE + 2, TILE_SIZE + 2).then(elevationArray => {

                        self.layerDataMap[layer.id].layer = layer;
                        self.layerDataMap[layer.id].elevationArray = this._trimEdges(elevationArray, TILE_SIZE + 2, TILE_SIZE + 2);
                        self.layerDataMap[layer.id].extendedElevationArray = elevationArray;
                        var elevationTexture = new THREE.DataTexture(Float32Array.from(self.layerDataMap[layer.id].elevationArray), TILE_SIZE, TILE_SIZE, THREE.RedFormat, THREE.FloatType);
                        elevationTexture.needsUpdate = true;
                        elevationTexture.magFilter = THREE.LinearFilter;
                        elevationTexture.minFilter = THREE.LinearFilter;
                        elevationTexture.wrapS = THREE.ClampToEdgeWrapping;
                        elevationTexture.wrapT = THREE.ClampToEdgeWrapping;
                        self.layerDataMap[layer.id].texture = elevationTexture;

                        self._endLoading(self);
                    });
                }
                layer.addListener(self, (layer, event) => {
                    if (VISIBILITY_CHANGE === event) {
                        self._rebuildTile(self);
                    }
                })
            }
        });
        self._setLoadingListener(self, () => {
            self._rebuildTile(self);
        });
    }

    _rebuildTile(self){
        for (const id in self.layerDataMap) {
            if (self.layerDataMap.hasOwnProperty(id)) {
                if (self.layerDataMap[id].layer.isElevationLayer) {
                    self.elevationArray = self.layerDataMap[id].elevationArray;
                    self.extendedElevationArray = self.layerDataMap[id].extendedElevationArray;
                }
            }
        }
        if (self.bounds.max.y >= 1.57079632) {
            self.shift = terrainMeshGenerator.generateNorthPoleTile(self.geometry, self.skirt.geometry, TILE_SIZE, self.bounds, self.extendedElevationArray, self.planet.llhToCartesianFastSFCT);
        } else if (self.bounds.min.y <= -1.57079632) {
            self.shift = terrainMeshGenerator.generateSouthPoleTile(self.geometry, self.skirt.geometry, TILE_SIZE, self.bounds, self.extendedElevationArray, self.planet.llhToCartesianFastSFCT);
        } else {
            self.shift = terrainMeshGenerator.generateBaseTile(self.geometry, self.skirt.geometry,TILE_SIZE, self.bounds, self.extendedElevationArray, self.planet.llhToCartesianFastSFCT);
        }
        self.position.set(0, 0, 0);
        self.position.add(self.shift);
        if (self.parent.shift) {
            self.position.sub(self.parent.shift)
        }
        self.skirt.position.add(self.shift);
        self.planet.add(self.skirt);
        self.buildMaterial(self);
        self.loaded = true;
    }
    /**
     * to call when a layer that needs to be fully loaded starts loading
     */
    _startLoading(self) {
        self.loading++;
    }

    /**
     * to call when a layer that needs to be fully loaded ends loading
     */
    _endLoading(self) {
        self.loading--;
        if (self.loading == 0 && !!self.loadingListener) {
            self.loadingListener();
            delete self.loadingListener;
        }
    }
    /**
     * Set a listener that will be called when all layers finished loading
     */
    _setLoadingListener(self, listener) {
        if (self.loading == 0) {
            listener();
        } else {
            self.loadingListener = listener;
        }
    }

    
    update(camera, frustum, renderer) {
        const self = this;
        if (self.needsMaterialRebuild) {
            self.buildMaterial(self);
            self.needsMaterialRebuild = false;
        }
        if (self.layerManager._getRasterLayers([]).length == 0) {
            self.material.visible = false;
            return;
        }
        
        let metric = self.calculateUpdateMetric(camera, frustum, renderer);

        if (isNaN(metric)) {
            throw ("calculation of metric for planet LOD calculation failed");
        }

        if (metric == -1 && self.rendered) { // outside frustum or facing away from camera
            self.material.visible = true;
            if (self.rendered) {
                self.disposeChildren(self);
                return true;
            }
            return false;
        }
        if (metric < self.level + 1 || self.level >= MAX_LEVEL) { // if self is ideal LOD
            if (self.loaded) { // if layers are loaded
                self.material.visible = true;
                self.disposeChildren(self);
                return true;
            } else { // layers not yet loaded
                return false;
            }
        }
        else { // if ideal LOD is past self tile
            if (self.children.length > 0) { // if self tile already has children
                let childrenReadyCounter = 0;
                self.children.every(child => {
                    let childReady = child.update(camera, frustum) && child.rendered;

                    if (childReady) {
                        childrenReadyCounter++;
                    } else {
                        return false; // break out of loop
                    }
                    return true; // continue
                });
                if (childrenReadyCounter == self.children.length) {
                    self.material.visible = false;
                    return true;
                }
            } else { // if self tile doesn't have children yet
                const lengthUp = 111319 * (this.bounds.max.y - this.bounds.min.y);
                const lengthSide = Math.cos((self.bounds.min.y + self.bounds.max.y) * 0.5) * 111319 * (self.bounds.max.x - self.bounds.min.x);

                if (lengthSide < lengthUp * 0.5) {
                    const halfY = self.bounds.min.y + (self.bounds.max.y - self.bounds.min.y) * 0.5;
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(self.bounds.min, new THREE.Vector2(self.bounds.max.x, halfY)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(self.bounds.min.x, self.bounds.min.y + (self.bounds.max.y - self.bounds.min.y) * 0.5), self.bounds.max),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));

                } else {
                    var boundsCenter = new THREE.Vector2();
                    self.bounds.getCenter(boundsCenter);
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(self.bounds.min, boundsCenter),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(boundsCenter.x, self.bounds.min.y), new THREE.Vector2(self.bounds.max.x, boundsCenter.y)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(self.bounds.min.x, boundsCenter.y), new THREE.Vector2(boundsCenter.x, self.bounds.max.y)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(boundsCenter, self.bounds.max),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                        }
                    ));
                }




                self.children.forEach(child => {
                    child.update(camera, frustum);
                })
            }

            // If the tile has loaded children, the method already returned
            if (self.loaded) { // if this tile is itself loaded
                self.material.visible = true;
                return true;
            } else { // if this tile isn't loaded
                self.material.visible = false;
                return false;
            }
        }
    }

    /**
     * Rebuilds the material completely. This method should be called when the number of imagery layers changes.
     */
    buildMaterial(self) {
        let numLayers = 0;
        let shaderColorLayerCode;
        let shaderColorLayerTransparency = 0;
        let shaderColorLayerTextures;
        for (const id in self.layerDataMap) {
            if (self.layerDataMap.hasOwnProperty(id)) {
                if (self.layerDataMap[id].layer.isImageryLayer) {
                    numLayers++;
                }
            }
        }
        self.layerManager._getShaderColorLayers([]).forEach(function (layer) {
            if (layer.isShaderColorLayer && layer.visible) {
                shaderColorLayerCode = layer.shader;
                shaderColorLayerTransparency = layer.transparency;
                shaderColorLayerTextures = layer.textures;
            }
        });


        numLayers = Math.max(numLayers, 1);

        
        self.material = new MeshStandardMaterial();
        self.material.side = THREE.FrontSide;
        if(self.shadows){
            self.material.shadowSide = THREE.BackSide;
            
            self.shadows.setupMaterial(self.material);
        }
        const obc = self.material.onBeforeCompile;
        self.material.onBeforeCompile=(shader) => {
            if(obc) obc(shader);
            self.material.userData.shader = shader;
            self.fillShaderUniforms(self, shader);
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_pars_vertex>',
                PlanetTileShaderChunks.vertexPreMain()+
                `#include <uv_pars_vertex>`
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>` +
                PlanetTileShaderChunks.vertexMain()
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <packing>',
                `#include <packing>` +
                PlanetTileShaderChunks.fragmentPreMain(numLayers, shaderColorLayerCode, shaderColorLayerTextures)
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                PlanetTileShaderChunks.fragmentMain(shaderColorLayerCode, shaderColorLayerTransparency)
            );
        };
        
        self.material.visible = false;
        self.material.wireframe = false;
        self.material.flatShading = false;
        self.material.metalness = 0.0;
        self.material.roughness = 1.0;
        self.skirt.material = self.material;
        self.material.needsUpdate = true;
    }
    setElevationExageration() {
        if (this.material && this.material.uniforms && this.material.uniforms.elevationExageration) {
            this.material.uniforms.elevationExageration.value = this.planet.elevationExageration;
        }
        this.children.forEach(planetTile => planetTile.setElevationExageration());
    }

    fillShaderUniforms(self, shader) {

        let imagery = [];
        let imageryBounds = [];
        let imageryUVBounds = [];
        let imageryProjections = [];
        let imageryTransparency = [];
        let elevation = defaultTexture;
        let elevationEncountered = false;
        self.layerManager.getLayers().forEach(layer => {
            if (layer.isRasterLayer) {
                let layerData = self.layerDataMap[layer.id];
                if (!!layerData && layer.isImageryLayer && !!layer.visible) {
                    imagery.push(layerData.texture);
                    imageryBounds.push(new Vector4(layer.bounds.min.x, layer.bounds.min.y, layer.bounds.max.x, layer.bounds.max.y));
                    imageryTransparency.push(layer.visible ? layer.transparency : 1);
                    if (layerData.projection) imageryProjections.push(layerData.projection);
                    else imageryProjections.push(0);

                    if (layerData.uvBounds) imageryUVBounds.push(new Vector4(layerData.uvBounds.min.x, layerData.uvBounds.min.y, layerData.uvBounds.max.x, layerData.uvBounds.max.y));
                    else imageryUVBounds.push(new Vector4(0, 1, 0, 1));
                } else if (!elevationEncountered && !!layerData.layer && layer.isElevationLayer && layer.visible) {
                    elevation = layerData.texture;
                    elevationEncountered = true;
                }
            } else if (layer.isShaderColorLayer && layer.textures) {
                for (const name in layer.textures) {
                    if (layer.textures.hasOwnProperty(name)) {
                        const tex = layer.textures[name];
                        shader.uniforms[name] = { type: "t", value: tex };
                    }
                }
            }

        });
        if (imagery.length == 0) {
            imagery.push(defaultImageTexture);
            imageryBounds.push(new THREE.Vector4(-180,-90,180,90));
            imageryTransparency.push(0);
            imageryUVBounds.push(new THREE.Vector4(0,0,1,1))
        }
        self.elevationDisplayed = elevationEncountered;

        shader.uniforms.imagery = { type: "tv", value: imagery };
        shader.uniforms.imageryBounds = { type: "v4v", value: imageryBounds };
        shader.uniforms.imageryTransparency = { type: "fv", value: imageryTransparency };
        shader.uniforms.imageryUVBounds = { type: "v4v", value: imageryUVBounds };
        shader.uniforms.imageryProjections = { type: "iv", value: imageryProjections };
        shader.uniforms.elevation = { type: "t", value: elevation };
        shader.uniforms.planetPosition = { type: "v3", value: self.planet.center };
        shader.uniforms.bounds = { type: "v4", value: new Vector4(self.bounds.min.x, self.bounds.min.y, self.bounds.max.x, self.bounds.max.y) };
        shader.uniforms.level = { type: "f", value: self.level };
        
    }
    

    
    disposeChildren(self) {
        if (self.children.length != 0) {
            self.traverse(function (element) {

                
                if (element != self && element.material) {
                    if(element.skirt){
                        element.skirt.geometry.dispose();
                        self.planet.remove(element.skirt);
                    }
                    // dispose textures
                    for (const id in element.layerDataMap) {
                        if (element.layerDataMap.hasOwnProperty(id)) {

                            if (element.layerDataMap[id].layer.isImageryLayer) {
                                element.layerDataMap[id].layer.detach(element);
                            } else if (!!element.layerDataMap[id].texture) {
                                element.layerDataMap[id].texture.dispose();
                            }

                        }
                    }
                    // dispose materials
                    if (element.material.length) {
                        for (let i = 0; i < element.material.length; ++i) {
                            element.material[i].dispose();
                        }
                    }
                    else {
                        element.material.dispose()
                    }

                    //dispose mesh geometry
                    element.geometry.dispose();

                    var index = tilesToLoad.indexOf(element);
                    if (index !== -1) {
                        tilesToLoad.splice(index, 1);
                    }
                    self.layerManager.removeListener(element);
                    self.layerManager.getLayers().forEach(layer => {
                        layer.removeListener(element);
                    });
                    element.mapRequests.forEach(e => {
                        if (e instanceof Promise) {
                            e.then(r => r.abort());
                        } else {
                            e.abort()
                        }
                    })
                    element.disposed = true;
                    element.material = void 0;
                    element.layerManager = void 0;
                    element.layerDataMap = void 0;
                    element.elevationArray = void 0;
                    element.geometry = void 0;
                    element.planet = void 0;
                    element.mapRequests = void 0;
                    element.parent = void 0;
                }
            });
            self.clear();
        }
    }


    calculateUpdateMetric(camera, frustum, renderer) {
        try {
            
            let boundingBox = this.geometry.boundingBox.clone();
            boundingBox.applyMatrix4(this.matrixWorld)
            
            if (!frustum.intersectsBox(boundingBox)) {
                return -1;
            }
            //const verticesPerMeter = TILE_SIZE/(111111*(this.bounds.max.y-this.bounds.min.y));

            var distance = boundingBox.distanceToPoint(camera.position);

            const localRadius = this.planet.radius;

            var log = -(Math.log(distance * (isMobileDevice() ? 10000 : 2500) * (TILE_SIZE / 32) / localRadius) / Math.log(1.9)) + 16;
            const metric = Math.min(MAX_LEVEL + 0.1, Math.max(log, 0.0001));

            if (isNaN(metric)) {
                return this.level;
            }
            self.priority = (distance) * this.level;
            return metric;
        } catch (e) {
            return 1;
        }
    }

    billinearInterpolationOnElevationArray(percentageX, percentageY, elevationArray) {
        if (!elevationArray) elevationArray = this.elevationArray;
        var x = percentageX * (TILE_SIZE - 1);
        var y = percentageY * (TILE_SIZE - 1);


        var floorX = Math.floor(x);
        if (floorX == x) floorX -= 1;
        var floorY = Math.floor(y);
        if (floorY == y) floorY -= 1;
        var ceilX = Math.ceil(x);
        if (ceilX == 0) ceilX += 1;
        var ceilY = Math.ceil(y);
        if (ceilY == 0) ceilY += 1;
        floorX = Math.max(0, floorX);
        floorY = Math.max(0, floorY);

        ceilX = Math.min((TILE_SIZE - 1), ceilX);
        ceilY = Math.min((TILE_SIZE - 1), ceilY);


        return ((1 - (x - floorX)) * (1 - (y - floorY)) * elevationArray[(floorY * TILE_SIZE) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (y - floorY)) * elevationArray[(floorY * TILE_SIZE) + ceilX]) +
            ((1 - (x - floorX)) * (1 - (ceilY - y)) * elevationArray[(ceilY * TILE_SIZE) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (ceilY - y)) * elevationArray[(ceilY * TILE_SIZE) + ceilX]);
    }


    interactsWith(bounds) {
        var interactingTiles = [];

        if (this.bounds.min.y <= bounds.max.y && this.bounds.max.y >= bounds.min.y) {
            if ((this.bounds.min.x <= bounds.max.x && this.bounds.max.x >= bounds.min.x) ||
                (this.bounds.min.x + (Math.PI * 2) <= bounds.max.x && this.bounds.max.x + (Math.PI * 2) >= bounds.min.x) ||
                (this.bounds.min.x <= bounds.max.x + (Math.PI * 2) && this.bounds.max.x >= bounds.min.x + (Math.PI * 2))) {
                if (this.children.length == 0) {
                    interactingTiles.push(this);
                } else {
                    this.children.forEach(child => {
                        interactingTiles = interactingTiles.concat(child.interactsWith(bounds));
                    });
                }
            }
        }
        return interactingTiles;
    }

    /**
     * Returns the terrain height at the given longitude and latitude
     * @param {Vector2} lonlat in radians 
     */
    getTerrainElevation(lonLat) {
        let elevation = false;
        if (this.children.length > 0) {
            this.children.every(child => {
                if (child.bounds.containsPoint(lonLat)) {
                    elevation = child.getTerrainElevation(lonLat);
                    return false;
                }
                return true;
            })
        }
        if (elevation !== false) {
            return elevation;
        }

        if (!this.rendered) {
            return false;
        }
        else {
            let lat = ((lonLat.y - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y)); // lat in uv coordinates
            let lon = ((lonLat.x - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x)); // lon in uv coordinates

            lat = Math.max(0, Math.min(1, lat));
            lon = Math.max(0, Math.min(1, lon));
            return !!this.elevationArray ? this.billinearInterpolationOnElevationArray(lon, lat) : 0;
        }

    }

    transformWGS84ToCartesian(lon, lat, h, sfct) {
        const a = 6378137.0;
        const e = 0.006694384442042;
        const N = a / (Math.sqrt(1.0 - (e * Math.pow(Math.sin(lat), 2))));
        const cosLat = Math.cos(lat);
        const cosLon = Math.cos(lon);
        const sinLat = Math.sin(lat);
        const sinLon = Math.sin(lon);
        const nPh = (N + h);
        const x = nPh * cosLat * cosLon;
        const y = nPh * cosLat * sinLon;
        const z = (0.993305615557957 * N + h) * sinLat;

        sfct.set(x, y, z);
    }



    /*cull(frustum){
        if(this.visibility == false){
            this.material.visible = false;
            
        }
        if (!!this.boundingSphere && frustum.intersectsSphere(this.boundingSphere)) {
            this.material.visible = true;
        }else{
            this.material.visible = false;
        }
        this.children.forEach(child=>child.cull(frustum));
    }*/
}

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

export { PlanetTile };