import * as THREE from 'three';
import { PlanetShader } from './PlanetShader.js';
import { Mesh } from 'three/src/objects/Mesh';

const TILE_GEOMETRY = generateBaseTile(32);
const MAX_LEVEL = 10;
const MATERIAL = new THREE.ShaderMaterial({
    uniforms: {
        elevation: { type: "t", value: buildZeroTexture() },
        imagery: { type: "t", value: buildZeroTexture() }
    },
    vertexShader: PlanetShader.vertexShader,
    fragmentShader: PlanetShader.fragmentShader
});

function buildZeroTexture() {
    var data = new Uint8Array(3);
    data[0] = 255;
    data[1] = 255;
    data[2] = 255;
    return new THREE.DataTexture(data, 1, 1, THREE.RGBFormat);
}

function generateBaseTile(resolution) {
    if (resolution < 2) {
        console.log("unsupported resolution");
        return;
    }
    var stepX = 1 / resolution;
    var stepY = 1 / resolution;

    var indices = [];
    var vertices = [];

    for (var y = 0; y <= 1; y += stepY) {
        for (var x = 0; x <= 1; x += stepX) {
            var vX = x;
            var vY = y;
            vertices.push(vX, vY, 0);
        }
    }

    for (var i = 0; i < vertices.length / 3 - (resolution + 1); i++) {
        if ((i + 1) % (resolution + 1) == 0) continue;
        if ((x < 0 && y < 0) || (x >= 0 && y >= 0)) {
            indices.push(i, i + 1, i + 2 + resolution);
            indices.push(i, i + 2 + resolution, i + 1 + resolution);
        } else {
            indices.push(i, i + 1, i + 1 + resolution);
            indices.push(i + 1 + resolution, i + 1, i + 2 + resolution);
        }

    }

    var geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    return geometry;
}


class PlanetTile extends Mesh {
    constructor(bounds, elevationService, wmsService, planetCenter, radius, level, callback, texture, uvLowerLeft, uvUpperRight) {
        var material = MATERIAL.clone();
        super(TILE_GEOMETRY, material);

        var self = this;

        self.frustumCulled = false;
        self.level = level;
        self.planetCenter = planetCenter;
        self.bounds = bounds;
        self.radius = radius;
        self.elevationService = elevationService;
        self.wmsService = wmsService;
        self.material.uniforms.radius = { type: "f", value: radius };
        self.material.uniforms.planetPosition = { type: "v3", value: planetCenter };
        self.material.uniforms.lowerLeft = { type: "v2", value: bounds.min };
        self.material.uniforms.upperRight = { type: "v2", value: bounds.max };
        self.material.side = THREE.FrontSide;
        self.material.visible = false;
        self.material.wireframe = false;
        if (!!texture) {
            self.material.uniforms.imagery = { type: "uniform", value: texture };
            self.material.uniforms.uvLowerLeft = { type: "v2", value: uvLowerLeft };
            self.material.uniforms.uvUpperRight = { type: "v2", value: uvUpperRight };
            if (!!callback) {
                callback();
            } else {
                self.refining = false;
                self.material.visible = true;
            }
        }
        else {
            self.refining = true;
            self.loadLayers(() => {
                self.refining = false;
                self.material.visible = true;
                if (!!callback) callback();
            });
        }
    }

    loadLayers(callback) {
        var self = this;
        self.mapRequest = self.wmsService.getMap(self.bounds, (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            self.material.uniforms.imagery = { type: "uniform", value: texture };
            self.material.uniforms.uvLowerLeft = { type: "v2", value: new THREE.Vector2(0, 0) };
            self.material.uniforms.uvUpperRight = { type: "v2", value: new THREE.Vector2(1, 1) };
            if (!!callback) {
                callback();
            } else {
                self.material.visible = true;
            }
        }, 1024, 1024);
        /*elevationService.getElevation(bounds).then(function (elevationArray) {
            self.material.uniforms.elevation = { type: "uniform", value: new THREE.DataTexture(Float32Array.from(elevationArray), 32, 32, THREE.RedFormat, THREE.FloatType) };
            self.elevationArray = elevationArray;
        });*/
    }

    /**
     * Update the tree relative to the camera and available elevation data.
     * @param {*} camera 
     */
    update(camera, frustum) {
        var self = this;


        const metric = this.calculateUpdateMetric(camera, frustum);
        if (metric == -1) {
            this.material.visible = true;
            this.disposeChildren(self);
            return;
        }
        if (this.refining || !this.material.uniforms.uvLowerLeft) {
            return;
        }

        if (metric < this.level) {
            //should never happen
        }
        else if (metric < this.level + 1 || this.level >= MAX_LEVEL) {
            // if texture is texture from previous layer, load new texture, invalidate children

            if (self.material.uniforms.uvLowerLeft.value.x != 0 || self.material.uniforms.uvLowerLeft.value.y != 0 || self.material.uniforms.uvUpperRight.value.x != 1 || self.material.uniforms.uvUpperRight.value.y != 1) {
                self.refining = true;
                self.childrenReady = 0;
                var disposeCallBack = () => {
                    self.mapRequest.abort();
                }
                self.material.addEventListener('dispose', disposeCallBack);
                var callback = function () {
                    self.refining = false;
                    self.material.uniforms.uvLowerLeft.value.set(0, 0);
                    self.material.uniforms.uvUpperRight.value.set(1, 1);
                    self.material.visible = true;
                    self.disposeChildren(self);
                }
                self.loadLayers(callback);
            } else {
                self.material.visible = true;
                self.disposeChildren(self);
            }
        }
        else {
            // if has children, recurse
            // else generate Children
            if (self.children.length > 0) {
                this.children.forEach(child => {
                    child.update(camera, frustum);
                });
            } else {
                if (this.level < MAX_LEVEL) {

                    var boundsCenter = new THREE.Vector2();
                    this.bounds.getCenter(boundsCenter);
                    var minUVX = this.material.uniforms.uvLowerLeft.value.x;
                    var minUVY = this.material.uniforms.uvLowerLeft.value.y;
                    var maxUVX = this.material.uniforms.uvUpperRight.value.x;
                    var maxUVY = this.material.uniforms.uvUpperRight.value.y;
                    var halfUVWidth = (maxUVX - minUVX) * 0.5;
                    var halfUVHeight = (maxUVY - minUVY) * 0.5;
                    this.add(new PlanetTile(new THREE.Box2(this.bounds.min, boundsCenter), this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, null, this.material.uniforms.imagery.value, new THREE.Vector2(minUVX, minUVY), new THREE.Vector2(minUVX + halfUVWidth, minUVY + halfUVHeight)));
                    this.add(new PlanetTile(new THREE.Box2(new THREE.Vector2(boundsCenter.x, this.bounds.min.y), new THREE.Vector2(this.bounds.max.x, boundsCenter.y)), this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, null, this.material.uniforms.imagery.value, new THREE.Vector2(minUVX + halfUVWidth, minUVY), new THREE.Vector2(maxUVX, minUVY + halfUVHeight)));
                    this.add(new PlanetTile(new THREE.Box2(new THREE.Vector2(this.bounds.min.x, boundsCenter.y), new THREE.Vector2(boundsCenter.x, this.bounds.max.y)), this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, null, this.material.uniforms.imagery.value, new THREE.Vector2(minUVX, minUVY + halfUVHeight), new THREE.Vector2(minUVX + halfUVWidth, maxUVY)));
                    this.add(new PlanetTile(new THREE.Box2(boundsCenter, this.bounds.max), this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, null, this.material.uniforms.imagery.value, new THREE.Vector2(minUVX + halfUVWidth, minUVY + halfUVHeight), new THREE.Vector2(maxUVX, maxUVY)));
                    self.material.visible = false;
                }
            }
        }

    }



    disposeChildren(self) {
        if (self.children.length != 0) {
            self.traverse(function (element) {
                if (element != self && !!element.mapRequest) {
                    element.mapRequest.abort();
                }
                if (element != self && element.material) {
                    if (element.material.length) {
                        for (let i = 0; i < element.material.length; ++i) {
                            element.material[i].dispose()
                        }
                    }
                    else {
                        element.material.dispose()
                    }
                }
            });
            self.clear();
        }
    }
    calculateUpdateMetric(camera, frustum) {
        var p = camera.position.clone().sub(this.planetCenter);
        var pNormalized = p.clone().normalize();
        var lat = Math.asin(pNormalized.y);
        var lon = Math.atan2(pNormalized.z, -pNormalized.x);

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

        lat = (((lat - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y)) * 32) - 0.5; //lat in pixel coordinates
        lon = (((lon - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x)) * 32) - 0.5; // lon in pixel coordinates

        lat = Math.round(Math.max(0, Math.min(31, lat)));
        lon = Math.round(Math.max(0, Math.min(31, lon)));

        var surfaceElevation = !!this.elevationArray ? this.elevationArray[(lat * 32) + lon] + this.radius : this.radius;
        var surfaceElevationCenter = !!this.elevationArray ? this.elevationArray[(15 * 32) + 15] + this.radius : this.radius;
        var surfaceElevationMax = !!this.elevationArray ? this.elevationArray[(32 * 32) - 1] + this.radius : this.radius;

        lat = (((lat + 0.5) / 32) * (this.bounds.max.y - this.bounds.min.y)) + this.bounds.min.y; //lat in geodetic coordinates
        lon = (((lon + 0.5) / 32) * (this.bounds.max.x - this.bounds.min.x)) + this.bounds.min.x; // lon in geodetic coordinates
        var nearest = new THREE.Vector3(-(Math.cos(lat) * Math.cos(lon)), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        var nearestMSE = nearest.clone().multiplyScalar(this.radius);
        var nearestSurface = nearest.clone().multiplyScalar(surfaceElevation);

        var center = new THREE.Vector2();
        this.bounds.getCenter(center);
        var c = new THREE.Vector3(-(Math.cos(center.y) * Math.cos(center.x)), Math.sin(center.y), Math.cos(center.y) * Math.sin(center.x)).multiplyScalar(surfaceElevationCenter);
        var m = new THREE.Vector3(-(Math.cos(this.bounds.max.y) * Math.cos(this.bounds.max.x)), Math.sin(this.bounds.max.y), Math.cos(this.bounds.max.y) * Math.sin(this.bounds.max.x)).multiplyScalar(surfaceElevationMax);

        var boundingSphere = new THREE.Sphere(c.clone().add(this.planetCenter), c.distanceTo(m) * 1.1)
        if (!frustum.intersectsSphere(boundingSphere)) {
            return -1;
        }

        var dot = nearestMSE.sub(this.planetCenter).normalize().dot(pNormalized);

        if (dot < 0) {
            return -1;
        }

        var distance = Math.sqrt(p.distanceTo(nearestSurface));
        //console.log(this.level);
        return Math.min(20.1, (4000 / Math.max(distance, 0.0001)));
    }
}

export { PlanetTile };