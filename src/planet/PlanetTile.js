import * as THREE from 'three';
import { PlanetShader } from './PlanetShader2.js';
import { Mesh } from 'three/src/objects/Mesh';
import { Vector4 } from 'three';
import { RasterLayer } from '../layers/RasterLayer.js';
import { ImageryLayer } from '../layers/ImageryLayer.js';
import { ElevationLayer } from '../layers/ElevationLayer.js';
import { LAYERS_CHANGED } from '../layers/LayerManager.js'
import { VISIBILITY_CHANGE } from '../layers/Layer.js';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';


const TILE_SIZE = 32;
const TILE_IMAGERY_SIZE = 256;
const TILE_GEOMETRY = generateBaseTile(TILE_SIZE);
const MAX_LEVEL = 15;
const defaultTexture = buildZeroTexture();

const emptyVec4 = new THREE.Vector4(0, 0, 0, 0);

const defaultMaterial = new THREE.MeshBasicMaterial();
const degreeToRadians = Math.PI / 180;
const radiansToDegrees = 180 / Math.PI;
const defaultElevation = [];

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

function buildZeroTexture() {
    var data = new Uint8Array(3);
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    return new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
}

function generateBaseTile(resolution) {
    if (resolution < 2) {
        console.log("unsupported resolution");
        return;
    }

    var indices = [];
    var vertices = [];
    var skirts = [];

    //// vertices
    for (var z = 0; z <= resolution - 1; z += 1) {
        for (var x = 0; x <= resolution - 1; x += 1) {
            var vX = x / (resolution - 1);
            var vZ = z / (resolution - 1);
            vertices.push(vX, 1.0, vZ);
            if (z == 0 || z == resolution - 1 || x == 0 || x == resolution - 1) {
                skirts.push(vX, 0.99, vZ);
            }
        }
    }

    const skirtFirstIndex = (vertices.length / 3);
    //// faces

    // tile
    for (var i = 0; i < (vertices.length / 3) - resolution - 1; i++) {
        if ((i + 1) % resolution != 0) {
            indices.push(i, i + 1, i + resolution);
            indices.push(i + resolution, i + 1, i + 1 + resolution);
        }
    }

    //first skirt
    for (let i = 0; i < resolution - 1; i++) {
        indices.push(skirtFirstIndex + i, skirtFirstIndex + i + 1, i);
        indices.push(i, skirtFirstIndex + i + 1, i + 1);
    }

    //second skirt
    let a = resolution - 1;
    let b = resolution - 1;
    while (a < (resolution - 1) + (2 * (resolution - 2))) {
        indices.push(skirtFirstIndex + a, skirtFirstIndex + a + 2, b);
        indices.push(b, skirtFirstIndex + a + 2, b + resolution);
        a += 2;
        b += resolution;
    }
    indices.push(skirtFirstIndex + a, skirtFirstIndex + a + resolution, b);
    indices.push(b, skirtFirstIndex + a + resolution, b + resolution);

    //third skirt
    let skirtVertexIndex = skirtFirstIndex + resolution * 4 - 5;
    let skirtEnd = skirtVertexIndex - resolution + 1;
    let tileIndex = skirtFirstIndex - 1;
    while (skirtVertexIndex > skirtEnd) {
        indices.push(skirtVertexIndex, skirtVertexIndex - 1, tileIndex);
        indices.push(tileIndex, skirtVertexIndex - 1, tileIndex - 1);
        skirtVertexIndex--;
        tileIndex--;
    }

    //fourth skirt
    skirtEnd = skirtVertexIndex - (2 * (resolution - 2));
    while (skirtVertexIndex > skirtEnd) {
        indices.push(skirtVertexIndex, skirtVertexIndex - 2, tileIndex);
        indices.push(tileIndex, skirtVertexIndex - 2, tileIndex - resolution);
        skirtVertexIndex -= 2;
        tileIndex -= resolution;
    }
    indices.push(skirtVertexIndex, skirtVertexIndex - resolution, tileIndex);
    indices.push(tileIndex, skirtVertexIndex - resolution, tileIndex - resolution);

    var geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.concat(skirts), 3));

    return geometry;
}

const tilesToLoad = [];
function scheduleLoadLayers(tile) {
    const length = tilesToLoad.length;
    for (let index = 0; index < tilesToLoad.length; index++) {
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
    while (tilesToLoad.length > 0 && now() - start < 5) {
        const tile = tilesToLoad.shift();
        if (!!tile && !tile.disposed) tile._loadLayers(tile);
    }

}, 10)

function now() {
    return (typeof performance === 'undefined' ? Date : performance).now(); // see #10732
}

class PlanetTile extends Mesh {

    /**
     * @param properties 
     * {
     *  bounds: Box2
     *  layerManager: LayerManager,
     *  planet: Planet, 
     *  level: Integer, 
     *  parentLayerDataMap: intenal,
     *  childType: 0 BottomLeft, 1 BottomRight, 2 TopLeft, 3 TopRight,
     *  shadows: truthy/falsy
     * }
     */
    constructor(properties) {
        let geometry;

        super(TILE_GEOMETRY, defaultMaterial);
        const self = this;

        self.frustumCulled = false; // frustum culling is handled separately (mesh is displaced in shader)
        self.bounds = properties.bounds; // Lon Lat bounds
        self.planet = properties.planet; // The parent planet (circular dependency... gives access to global planet properties and methods like tree traversal)
        self.layerManager = properties.layerManager;
        self.level = properties.level; // mesh recursion level
        self.elevationArray = defaultElevation;
        self.layerDataMap = {};
        ///// Important, a tile cannot be made visible while "loaded" is false.
        self.loaded = false;
        self.loading = 0;
        self.material.visible = false;
        self.elevationDisplayed = false;

        self.priority = self.level;
        self.mapRequests = []; // collects texture requests in order to abort them when needed

        if (properties.shadows) {
            self.shadows = properties.shadows;
            self.castShadow = true
            self.receiveShadow = true;
            self.material.shadowSide = THREE.FrontSide;
            //mesh.material.flatShading = true;
        }
        /////// prevent loading too many levels at the poles
        if (self.bounds.max.y == Math.PI / 2 || self.bounds.min.y == -Math.PI / 2) {
            self.maxLevel = 4;
        } else {
            self.maxLevel = MAX_LEVEL;
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
            delete self.onAfterRender;
        };

    }

    
    _loadLayers(self) {
        self.layerManager.getLayers().forEach(layer => {
            if (!self.layerDataMap[layer.id]) {
                if (layer instanceof ImageryLayer) {
                    self._startLoading(self);
                    self.layerDataMap[layer.id] = {};
                    self._loadImagery(self, layer, (texture) => {
                        self.layerDataMap[layer.id].texture = texture;
                        self.layerDataMap[layer.id].layer = layer;
                        delete self.layerDataMap[layer.id].loading;
                        self._endLoading(self);
                    }, (error) => {
                        //self.layerDataMap[layer.id].texture = defaultTexture;
                        //self.layerDataMap[layer.id].layer = layer;
                        //delete self.layerDataMap[layer.id].loading;
                    });
                } else if (layer instanceof ElevationLayer) {
                    self._startLoading(self);
                    self.layerDataMap[layer.id] = {};
                    layer.getElevation(self.bounds, TILE_SIZE, TILE_SIZE).then(elevationArray => {
                        var elevationTexture = new THREE.DataTexture(Float32Array.from(elevationArray), TILE_SIZE, TILE_SIZE, THREE.RedFormat, THREE.FloatType);
                        elevationTexture.needsUpdate = true;
                        elevationTexture.magFilter = THREE.LinearFilter;
                        elevationTexture.minFilter = THREE.LinearFilter;
                        elevationTexture.wrapS = THREE.ClampToEdgeWrapping;
                        elevationTexture.wrapT = THREE.ClampToEdgeWrapping;
                        self.layerDataMap[layer.id].texture = elevationTexture;
                        self.layerDataMap[layer.id].layer = layer;
                        self.layerDataMap[layer.id].elevationArray = elevationArray;

                        self._endLoading(self);
                    });
                }
                layer.addListener(self, (layer, event) => {
                    if (VISIBILITY_CHANGE === event) {
                        self.fillShaderUniforms(self);
                    }
                })
            }
        });
        self._setLoadingListener(self, () => {
            for (const id in self.layerDataMap) {
                if (self.layerDataMap.hasOwnProperty(id)) {
                    if (self.layerDataMap[id].layer instanceof ElevationLayer) {
                        self.elevationArray = self.layerDataMap[id].elevationArray;
                    }
                }
            }
            self.buildMaterial(self);
            self.loaded = true;
        });
    }

    /**
     * to call when a layer starts loading
     */
    _startLoading(self) {
        self.loading++;
    }

    /**
     * to call when a layer ends loading
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

    /**
         * Loads a texture native to this tile
         * @param {*} layerData 
         */
    _loadImagery(self, layer, callbackSuccess, callbackFailure) {
        self.mapRequests.push(
            layer.getMap(self, (texture) => {
                if (!!self.disposed) {
                    texture.dispose();
                    return;
                }
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;

                if (!!callbackSuccess) callbackSuccess(texture);

            }, error => callbackFailure(error), TILE_IMAGERY_SIZE, TILE_IMAGERY_SIZE)
        );
    }


    update(camera, frustum) {
        const self = this;
        if (self.layerManager.getRasterLayers([]).length == 0) return;
        const metric = self.calculateUpdateMetric(camera, frustum);
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
        if (metric < self.level + 1 || self.level >= self.maxLevel) { // if self is ideal LOD
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
        for (const id in self.layerDataMap) {
            if (self.layerDataMap.hasOwnProperty(id)) {
                if (self.layerDataMap[id].layer instanceof ImageryLayer) {
                    numLayers++;
                }
            }
        }

        numLayers = Math.max(numLayers, 1);

        self.material = new CustomShaderMaterial({
            uniforms: {},
            baseMaterial: THREE.MeshStandardMaterial,
            depthTest: true,
            depthWrite: true,
            vertexShader: PlanetShader.vertexShader(numLayers, TILE_SIZE),
            fragmentShader: PlanetShader.fragmentShader(numLayers),
            
        });

        self.fillShaderUniforms(self);
        self.material.side = THREE.FrontSide;
        self.material.visible = true;
        self.material.wireframe = false;
    }

    fillShaderUniforms(self) {

        let imagery = [];
        let imageryBounds = [];
        let imageryTransparency = [];
        let elevation = defaultTexture;
        let elevationEncountered = false;
        self.layerManager.getLayers().forEach(layer => {
            if (layer instanceof RasterLayer) {
                let layerData = self.layerDataMap[layer.id];
                if (!!layerData && layer instanceof ImageryLayer && !!layer.visible) {
                    imagery.push(layerData.texture);
                    imageryBounds.push(new Vector4(layer.bounds.min.x, layer.bounds.min.y, layer.bounds.max.x, layer.bounds.max.y));
                    imageryTransparency.push(layer.visible ? 1 : 0);
                } else if (!elevationEncountered && !!layerData.layer && layer instanceof ElevationLayer && layer.visible) {
                    elevation = layerData.texture;
                    elevationEncountered = true;
                }
            }

        });
        if (imagery.length == 0) {
            imagery.push(defaultTexture);
            imageryBounds.push(emptyVec4);
            imageryTransparency.push(0);
        }
        self.elevationDisplayed = elevationEncountered;

        self.material.uniforms.imagery = { type: "tv", value: imagery };
        self.material.uniforms.imageryBounds = { type: "v4v", value: imageryBounds };
        self.material.uniforms.imageryTransparency = { type: "fv", value: imageryTransparency };
        self.material.uniforms.elevation = { type: "t", value: elevation };
        self.material.uniforms.planetPosition = { type: "v3", value: self.planet.center };
        self.material.uniforms.bounds = { type: "v4", value: new Vector4(self.bounds.min.x, self.bounds.min.y, self.bounds.max.x, self.bounds.max.y) };
        self.material.uniforms.c = { type: "v4", value: new Vector4(Math.random(), Math.random(), Math.random(), 1.0) };
    }


    disposeChildren(self) {
        if (self.children.length != 0) {
            self.traverse(function (element) {

                if (element != self && element.material) {

                    // dispose textures
                    for (const id in element.layerDataMap) {
                        if (element.layerDataMap.hasOwnProperty(id)) {
                            if (!!element.layerDataMap[id].texture) {
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

                    var index = tilesToLoad.indexOf(this);
                    if (index !== -1) {
                        tilesToLoad.splice(index, 1);
                    }
                    self.layerManager.removeListener(self);
                    self.layerManager.getLayers().forEach(layer => {
                        layer.removeListener(self);
                    });
                    element.mapRequests.forEach(e => {
                        e.abort()
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

    calculateUpdateMetric(camera, frustum) {
        p.copy(camera.position).sub(this.planet.center);

        const llh = this.planet.llhToCartesian.inverse(p);

        let lon = llh.x * degreeToRadians;
        let lat = llh.y * degreeToRadians;
        if (lon > this.bounds.max.x || lon < this.bounds.min.x) {
            var max = this.bounds.max.x - lon;
            max += (max > Math.PI) ? -2 * Math.PI : (max < -Math.PI) ? 2 * Math.PI : 0;

            var min = this.bounds.min.x - lon;
            min += (min > Math.PI) ? -2 * Math.PI : (min < -Math.PI) ? 2 * Math.PI : 0;

            if (Math.abs(max) < Math.abs(min)) {
                lon = this.bounds.max.x;
            } else {
                lon = this.bounds.min.x;
            }
        }
        lat = Math.min(this.bounds.max.y, Math.max(this.bounds.min.y, lat));

        lat = ((lat - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y)); // lat in uv coordinates
        lon = ((lon - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x)); // lon in uv coordinates

        lat = Math.max(0, Math.min(1, lat));
        lon = Math.max(0, Math.min(1, lon));

        var lati = (lat * (this.bounds.max.y - this.bounds.min.y)) + this.bounds.min.y; // lat in geodetic coordinates
        var long = (lon * (this.bounds.max.x - this.bounds.min.x)) + this.bounds.min.x; // lon in geodetic coordinates
        this.transformWGS84ToCartesian(long, lati, 0, nearestMSE);
        this.transformWGS84ToCartesian(long, lati, this.billinearInterpolationOnElevationArray(lon, lat), nearestSurface);

        this.bounds.getCenter(center);

        this.transformWGS84ToCartesian(center.x, center.y, this.billinearInterpolationOnElevationArray(0.5, 0.5), p1);
        this.transformWGS84ToCartesian(this.bounds.min.x, this.bounds.min.y, this.elevationArray[(TILE_SIZE * TILE_SIZE) - 1], p2);
        this.transformWGS84ToCartesian(this.bounds.max.x, this.bounds.max.y, this.elevationArray[(TILE_SIZE * TILE_SIZE) - 1], p3);

        // an estimation of the bounding volume is calculated based on the size of the tile and the elevation at the center and max elevation.
        boundingSphere.radius = Math.max(p1.distanceTo(p2), p1.distanceTo(p3)) * 1.1;
        boundingSphere.center.copy(p1).add(this.planet.center);


        if (!frustum.intersectsSphere(boundingSphere)) {
            return -1;
        }

        var dot = Math.max(0.02, Math.abs(p1.copy(p).sub(nearestMSE).normalize().dot(nearestMSE.normalize())));

        if (dot < 0) {
            return -1;
        }

        var distance = p.distanceTo(nearestSurface);

        const localRadius = nearestSurface.sub(this.planet.center).length();

        var log = -(Math.log(distance * 2500 / localRadius) / Math.log(2)) + 16;
        const metric = Math.min(MAX_LEVEL + 0.1, Math.max(log, 0.0001)) * Math.pow(dot, 0.07);

        if (isNaN(metric)) {
            return this.level;
        }
        self.priority = (distance) * this.level;
        return metric;
    }

    billinearInterpolationOnElevationArray(percentageX, percentageY) {
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


        return ((1 - (x - floorX)) * (1 - (y - floorY)) * this.elevationArray[(floorY * TILE_SIZE) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (y - floorY)) * this.elevationArray[(floorY * TILE_SIZE) + ceilX]) +
            ((1 - (x - floorX)) * (1 - (ceilY - y)) * this.elevationArray[(ceilY * TILE_SIZE) + floorX]) +
            ((1 - (ceilX - x)) * (1 - (ceilY - y)) * this.elevationArray[(ceilY * TILE_SIZE) + ceilX]);
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

        if (!this.elevationDisplayed) {
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

export { PlanetTile };