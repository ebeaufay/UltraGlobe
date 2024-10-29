import * as THREE from 'three';
import { PlanetTileShaderChunks } from './PlanetTileShaderChunks.glsl.js';
import { Mesh } from 'three/src/objects/Mesh';
import { MeshStandardMaterial, Vector4 } from 'three';
import { RasterLayer } from '../layers/RasterLayer.js';
import { LAYERS_CHANGED } from '../layers/LayerManager.js'
import { VISIBILITY_CHANGE } from '../layers/Layer.js';
import { TerrainMeshGenerator } from './TerrainMeshGenerator';

const terrainMeshGenerator = new TerrainMeshGenerator();
let programID = 0;
let sid = 0;
const TILE_SIZE = 32;
const MAX_LEVEL = 20;
const TILE_IMAGERY_SIZE = 256;
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
    /* const length = tilesToLoad.length;
    for (let index = 0; index < tilesToLoad.length; index++) {
        if (tilesToLoad[index] == tile) return;
        if (tilesToLoad[index].priority > tile.priority) {
            tilesToLoad.splice(index, 0, tile);
            return;
        }
    }
    if (tilesToLoad.length == length) {
        tilesToLoad.push(tile);
    } */
    tilesToLoad.push(tile);
}



function planetTileUpdate() {
    const start = now();

    tilesToLoad.sort((a, b) => {
        return a.priority - b.priority;
    })
    while (tilesToLoad.length > 0 && now() - start < 1) {
        const tile = tilesToLoad.shift();
        if (!!tile && !tile.disposed) tile._loadLayers(tile);
    }
};

function now() {
    return (typeof performance === 'undefined' ? Date : performance).now(); // see #10732
}
let planetTileIndexCounter = 0;

class PlanetTile extends Mesh {


    constructor(properties) {

        super();
        const self = this;
        self.planetTileUid = "planetTile" + (planetTileIndexCounter++);
        self.matrixAutoUpdate = true;
        self.tileSize = properties.tileSize ? properties.tileSize : TILE_SIZE;
        self.tileImagerySize = properties.tileImagerySize ? properties.tileImagerySize : TILE_IMAGERY_SIZE;
        self.shift = new THREE.Vector3();
        self.skirt = new THREE.Mesh();
        self.skirt.layers.disable(0);
        self.layers.disable(0);
        //self.skirt.material.visible = false;
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
        self.detailMultiplier = properties.detailMultiplier ? properties.detailMultiplier : 1.0;
        self.loadOutsideView = properties.loadOutsideView ? properties.loadOutsideView : false;
        ///// Important, a tile cannot be made visible while "loaded" is false.
        self.loaded = false;
        self.loading = 0;
        //self.material.visible = false;
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
        self.layerManager.addListener(self.planetTileUid, (eventName, layer) => {
            if (LAYERS_CHANGED === eventName && layer instanceof RasterLayer) {
                scheduleLoadLayers(self);
            } else {
                this.buildMaterial(self)
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
                        if (!self.disposed && textureUVBoundsAndReference.texture != self.layerDataMap[layer.id].texture) {
                            layer.detach(this, self.layerDataMap[layer.id].texture);
                            loadImagery(textureUVBoundsAndReference);
                        } else {
                            layer.detach(this);
                        }
                    }, (error) => {
                        console.error(error);
                    },
                        self.tileImagerySize, self.tileImagerySize));

                } else if (layer.isElevationLayer) {
                    self._startLoading(self);
                    delete self.layerDataMap[layer.id];

                    let elevationPromise;
                    if(!!self.parent.isPlanetTile && layer.maxResolution > ((self.bounds.max.x - self.bounds.min.x)*6371000)/self.tileSize ){
                        elevationPromise = layer._getElevationFromParent(self.parent.bounds, self.parent.layerDataMap[layer.id].extendedElevationArray, self.bounds, self.tileSize, self.tileSize, self.geometry, self.skirt.geometry);
                    }else{
                        elevationPromise = layer.getElevation(self.bounds, self.tileSize, self.tileSize, self.geometry, self.skirt.geometry);
                    }
                    elevationPromise.then(elevationAndShift => {

                        if (!self.disposed) {
                            self.layerDataMap[layer.id] = {
                                layer: layer,
                                extendedElevationArray: elevationAndShift.extendedElevationArray,
                                elevationArray: elevationAndShift.elevationArray
                            }
                            self.elevationArray = self.layerDataMap[layer.id].elevationArray;
                            self.extendedElevationArray = self.layerDataMap[layer.id].extendedElevationArray;
                            var elevationTexture = new THREE.DataTexture(new Float32Array(self.layerDataMap[layer.id].elevationArray), self.tileSize, self.tileSize, THREE.RedFormat, THREE.FloatType);
                            elevationTexture.needsUpdate = true;
                            elevationTexture.magFilter = THREE.LinearFilter;
                            elevationTexture.minFilter = THREE.LinearFilter;
                            elevationTexture.wrapS = THREE.ClampToEdgeWrapping;
                            elevationTexture.wrapT = THREE.ClampToEdgeWrapping;
                            self.layerDataMap[layer.id].texture = elevationTexture;


                            self.shift = elevationAndShift.shift;
                            self._endLoading(self);

                        }




                    });

                }

            }
        });
        self._setLoadingListener(self, () => {
            self._rebuildTile(self);
        });
    }

    _rebuildTile(self) {
        for (const id in self.layerDataMap) {
            if (self.layerDataMap.hasOwnProperty(id)) {
                if (self.layerDataMap[id].layer.isElevationLayer) {
                    self.elevationArray = self.layerDataMap[id].elevationArray;
                    self.extendedElevationArray = self.layerDataMap[id].extendedElevationArray;
                    self.elevationLoaded = true;
                }
            }
        }

        self.position.set(0, 0, 0);
        self.position.add(self.shift);
        if (self.parent.shift) {
            self.position.sub(self.parent.shift)
        }
        self.skirt.position.set(0, 0, 0);
        self.skirt.position.add(self.shift);
        self.planet.add(self.skirt);
        self.updateMatrix();
        self.skirt.matrixAutoUpdate = false;
        self.skirt.updateMatrix();
        //self.buildMaterial(self);
        self.needsMaterialRebuild = true;
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

    _changeContentVisibility(visibility) {
        const self = this;
        if (visibility) {
            self.layers.enable(0);
            self.skirt.layers.enable(0);
        }
        else {
            self.layers.disable(0);
            self.skirt.layers.disable(0);
        }


    }

    update(camera, frustum, renderer) {
        const self = this;
        if (!self.loaded) return;
        if (self.needsMaterialRebuild) {
            self.buildMaterial(self);
            self.needsMaterialRebuild = false;
        }

        if (self.layerManager._getRasterLayers([]).length == 0) {
            self._changeContentVisibility(false);
            //self.material.visible = false;
            return;
        }

        let metric = self.calculateUpdateMetric(camera, frustum, renderer);

        if (isNaN(metric)) {
            throw ("calculation of metric for planet LOD calculation failed");
        }

        if (metric == -1 && self.rendered) { // outside frustum or facing away from camera
            self._changeContentVisibility(true);
            // self.material.visible = true;
            if (self.rendered) {
                self.disposeChildren(self);
                return true;
            }
            return false;
        }
        if (metric < self.level + 1 || self.level >= MAX_LEVEL) { // if self is ideal LOD
            if (self.loaded) { // if layers are loaded
                self._changeContentVisibility(true);
                // self.material.visible = true;
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
                    if (!child.isPlanetTile) return true;
                    let childReady = child.update(camera, frustum) && child.rendered;

                    if (childReady) {
                        childrenReadyCounter++;
                    } else {
                        return false; // break out of loop
                    }
                    return true; // continue
                });
                if (childrenReadyCounter == self.children.length) {
                    self._changeContentVisibility(false);
                    // self.material.visible = false;
                    return true;
                }
            } else if(self.elevationLoaded){ // if self tile doesn't have children yet
                const lengthUp = 111319 * (self.bounds.max.y - self.bounds.min.y);
                const lengthSide = Math.cos((self.bounds.min.y + self.bounds.max.y) * 0.5) * 111319 * (self.bounds.max.x - self.bounds.min.x);


                if (lengthSide < lengthUp * 0.5) {
                    const halfY = self.bounds.min.y + (self.bounds.max.y - self.bounds.min.y) * 0.5;
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(self.bounds.min, new THREE.Vector2(self.bounds.max.x, halfY)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(self.bounds.min.x, self.bounds.min.y + (self.bounds.max.y - self.bounds.min.y) * 0.5), self.bounds.max),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));

                } else {
                    var boundsCenter = new THREE.Vector2();
                    self.bounds.getCenter(boundsCenter);
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(self.bounds.min, boundsCenter),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(boundsCenter.x, self.bounds.min.y), new THREE.Vector2(self.bounds.max.x, boundsCenter.y)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(new THREE.Vector2(self.bounds.min.x, boundsCenter.y), new THREE.Vector2(boundsCenter.x, self.bounds.max.y)),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));
                    self.add(new PlanetTile(
                        {
                            bounds: new THREE.Box2(boundsCenter, self.bounds.max),
                            layerManager: self.layerManager, planet: self.planet, level: self.level + 1, shadows: self.shadows,
                            detailMultiplier: self.detailMultiplier, tileSize: self.tileSize, tileImagerySize: self.tileImagerySize, loadOutsideView: self.loadOutsideView
                        }
                    ));
                }




                self.children.forEach(child => {
                    child.update(camera, frustum);
                })
            }

            // If the tile has loaded children, the method already returned
            if (self.loaded) { // if this tile is itself loaded
                self._changeContentVisibility(true);
                //self.material.visible = true;
                return true;
            } else { // if this tile isn't loaded
                self._changeContentVisibility(false);
                //self.material.visible = false;
                return false;
            }
        }
    }

    _setProgramKey(key) {
        this.material.customProgramCacheKey = function () {
            return key;
        };
        //this.buildMaterial(this)
        //this.material.needsUpdate = true;
        this.needsMaterialRebuild = true;
    }
    /**
     * Rebuilds the material completely. This method should be called when the number of imagery layers changes.
     */
    buildMaterial(self) {

        //self.material.needsUpdate = true; 

        if (self.material) {
            self.material.dispose();
        }
        if (self.skirt.material) {
            self.skirt.material.dispose();
        }
        self.material = new MeshStandardMaterial();

        //self.planet._setProgramKey("planetTile"+(programID++));
        self.material.customProgramCacheKey = function () {
            return self.planet.programCacheKey;
        };
        self.material.uid = sid++;
        self.material.side = THREE.FrontSide;
        if (self.shadows) {
            self.material.shadowSide = THREE.BackSide;

            self.shadows.setupMaterial(self.material);
        }



        const obc = self.material.onBeforeCompile;
        self.material.onBeforeCompile = (shader) => {
            let shaderColorLayerCode;
            let shaderColorLayerTransparency = 0;
            let shaderColorLayerTextures;
            let numLayers = 0;
            for (const id in self.layerDataMap) {
                if (self.layerDataMap.hasOwnProperty(id)) {
                    if (self.layerDataMap[id].layer && self.layerDataMap[id].layer.isImageryLayer) {
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
            if (obc) obc(shader);
            self.material.userData.shader = shader;
            self.fillShaderUniforms(self, shader);
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_pars_vertex>',
                PlanetTileShaderChunks.vertexPreMain() +
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
                PlanetTileShaderChunks.fragmentMain(numLayers, shaderColorLayerCode, shaderColorLayerTransparency)
            );

        };

        //self.material.visible = false;
        self.material.wireframe = false;
        self.material.fog = false;
        self.material.flatShading = false;
        self.material.metalness = 0.0;
        self.material.roughness = 1.0;
        self.skirt.material = self.material;
        self.material.userData.dummy = !self.material.userData.dummy;
        self.material.needsUpdate = true;



        self._changeContentVisibility(false);

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
                } else if (!!layerData && !elevationEncountered && !!layerData.layer && layer.isElevationLayer && layer.visible) {
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
            imageryBounds.push(new THREE.Vector4(-180, -90, 180, 90));
            imageryTransparency.push(0);
            imageryUVBounds.push(new THREE.Vector4(0, 0, 1, 1))
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
        shader.uniforms.offset = { type: "v3", value: self.planet.offset };

    }



    disposeChildren(self) {
        if (self.children.length != 0) {
            self.traverse(function (element) {

                if (element.isPlanetTile && element != self && element.material) {
                    if (element.skirt) {
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
                    self.layerManager.removeListener(element.planetTileUid);
                    self.layerManager.getLayers().forEach(layer => {
                        layer.removeListener(element.planetTileUid);
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
                if (!this.loadOutsideView) {
                    //this.priority = 0;
                    return -1;
                } else {
                    //this.priority = 0.1;
                }

            } else {
                //this.priority = 1;
            }

            var distance = boundingBox.distanceToPoint(camera.position);

            const localRadius = this.planet.radius;

            var log = -(Math.log(distance * (isMobileDevice() ? (10000 / this.detailMultiplier) / 50 * camera.fov : (5000 / this.detailMultiplier) / 50 * camera.fov) * (this.tileSize / 32) / localRadius) / Math.log(1.9)) + 16;
            const metric = Math.min(MAX_LEVEL + 0.1, Math.max(log, 0.0001));

            if (isNaN(metric)) {
                return this.level;
            }
            //this.priority /= (distance);


            return Math.max(3, metric);
        } catch (e) {
            return 1;
        }
    }

    billinearInterpolationOnElevationArray(percentageX, percentageY, elevationArray) {
        if (!elevationArray) elevationArray = this.elevationArray;
        var x = percentageX * (this.tileSize - 1);
        var y = percentageY * (this.tileSize - 1);


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

        ceilX = Math.min((this.tileSize - 1), ceilX);
        ceilY = Math.min((this.tileSize - 1), ceilY);


        return ((1 - (x - floorX)) * (1 - (y - floorY)) * elevationArray[(floorY * this.tileSize) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (y - floorY)) * elevationArray[(floorY * this.tileSize) + ceilX]) +
            ((1 - (x - floorX)) * (1 - (ceilY - y)) * elevationArray[(ceilY * this.tileSize) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (ceilY - y)) * elevationArray[(ceilY * this.tileSize) + ceilX]);
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
                    if (child.loading > 0) return true
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

    /**
     * computes the terrain normal at the given lon lat and stores the result in the normal parameter
     * @param {THREE.Vector2} lonLat in radians
     * @param {THREE.Vector3} normal side-effect variable to hold the normal
     */
    getTerrainNormalSFCT(lonLat, normal) {
        let childHandled = false;
        this.children.every(child => {
            if (child.bounds.containsPoint(lonLat)) {
                if (!child.rendered) return true
                child.getTerrainNormalSFCT(lonLat, normal);
                childHandled = true;
                return false;
            }
            return true;
        })
        if (!childHandled) {
            if (!this.rendered) {
                // Default normal pointing up
                normal.set(0, 0, 1);
                return;
            }

            const delta = 0.0001; // Small radian offset for finite differences
            const lon = lonLat.x;
            const lat = lonLat.y;

            // Get elevation at current point
            let h = this.getTerrainElevation(lonLat);
            if (h === false) h = 0;
            h *= this.planet.elevationExageration;

            // Get elevation at (lon + delta, lat)
            let lonLatX = new THREE.Vector2(lon + delta, lat);
            let h_x = this.getTerrainElevation(lonLatX);
            if (h_x === false) h_x = h;
            h_x *= this.planet.elevationExageration;

            // Get elevation at (lon, lat + delta)
            let lonLatY = new THREE.Vector2(lon, lat + delta);
            let h_y = this.getTerrainElevation(lonLatY);
            if (h_y === false) h_y = h;
            h_y *= this.planet.elevationExageration;

            // Convert to cartesian coordinates
            let p = new THREE.Vector3(lon, lat, h);
            this.planet.llhToCartesianFastSFCT(p, true);

            let p_x = new THREE.Vector3(lon + delta, lat, h_x);
            this.planet.llhToCartesianFastSFCT(p_x, true);

            let p_y = new THREE.Vector3(lon, lat + delta, h_y);
            this.planet.llhToCartesianFastSFCT(p_y, true);

            // Compute vectors
            let vx = new THREE.Vector3().subVectors(p_x, p);
            let vy = new THREE.Vector3().subVectors(p_y, p);

            // Compute normal using cross product
            let n = new THREE.Vector3().crossVectors(vx, vy).normalize();

            normal.copy(n);
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

PlanetTile.planetTileUpdate = planetTileUpdate;
export { PlanetTile };