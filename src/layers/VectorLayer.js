import * as THREE from 'three';
import { ImageryLayer } from "./ImageryLayer.js"
import { buildPolygon, buildPolyline, buildPoints, buildLonLatPolygon, buildLonLatPolyline, buildLonLatPoints } from "../shapes/GeoShapeGeometryBuilder";
import { v4 as uuidv4 } from 'uuid';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { DrapedVectorLayerTile } from './DrapedVectorLayerTile.js';

const toRadians = 0.01745329251994329576923690768489;
const mapClearColor = new THREE.Color();
const invalidationBox = new THREE.Box2();
const raycastOrigin = new THREE.Vector3();
const raycastDirection = new THREE.Vector3(0, 0, -1);
const raycaster = new THREE.Raycaster(raycastOrigin, raycastDirection)
raycaster.params.Points.threshold = 0.0001;
raycaster.params.Line.threshold = 0.0001;

/**
 * Base class to be implemented by layers displaying vector data
 * @class
 * @extends Layer
 * @private
 */
class VectorLayer extends ImageryLayer {
    /**
     * Creates a vector layer where points, polylines and polygons are represented as 3D objects. 
     * The given materials are used to render objects.
     * Note When this layer is disposed, only geometry will be destroyed on GPU. It's up to the caller to manage the lifecycle of the given materials and associated textures.
     * 
     * @param {Object} properties 
     * @param {String|number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {Number} [properties.maxSegmentLength = 50] the maximum segment length in kilometers before lines and polygons are subdivided to follow the earth curvature
     * @param {THREE.PointMaterial} [properties.pointMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.LineBasicMaterial|THREE.LineDashedMaterial} [properties.lineMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.Material} [properties.polygonMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.PointMaterial} [properties.selectedPointMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.LineBasicMaterial|THREE.LineDashedMaterial} [properties.selectedLineMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.Material} [properties.selectedPolygonMaterial] A three.js material for selected points. defaults to a basic red material
     * @param {number} [properties.lineType = 0] 0 for geodesic lines, 1 for rhumb lines.
     * @param {boolean} [properties.selectable = false] if truthy the layer will be selectable.
     * @param {number} [properties.imageSize = 512] image resolution for draped tiles.
     * @param {number} [properties.maxLOD = 20] max LOD for draped tiles.
     * 
     */
    constructor(properties) {
        super(properties)
        //setParallelism(32);
        this.lineType = properties.lineType != 1 ? 0 : 1;
        this.isVectorLayer = true;
        if (properties.selectable) {
            this.isSelectable = true;
        }

        this.maxSegmentLength = properties.maxSegmentLength ? properties.maxSegmentLength : 50;
        this.polygonMaterial = properties.polygonMaterial ? properties.polygonMaterial : new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5, wireframe: false });
        this.lineMaterial = properties.lineMaterial ? properties.lineMaterial : new THREE.LineBasicMaterial({ color: 0xffffff });
        this.pointMaterial = properties.pointMaterial ? properties.pointMaterial : new THREE.PointsMaterial({ color: 0x0000ff, size: 5, sizeAttenuation: false });

        this.selectedPolygonMaterial = properties.selectedPolygonMaterial ? properties.selectedPolygonMaterial : new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        this.selectedLineMaterial = properties.selectedLineMaterial ? properties.selectedLineMaterial : new THREE.LineBasicMaterial({ color: 0xff00 });
        
        this.selectedPointMaterial = properties.selectedPointMaterial ? properties.selectedPointMaterial : new THREE.PointsMaterial({ color: 0xff00ff, size: 5, sizeAttenuation: false });
        this.objects = {};

        const self = this;

        self.imageSize = properties.imageSize ? properties.imageSize : 512;
        self.maxLOD = properties.maxLOD ? properties.maxLOD : 20;

        self.objects = {};
        self.requests = [];

        self.fetchTextureFunction = (tile) => {

            if (!self.requests.includes(tile)) {
                self.requests.push(tile);
            }
        }
        self.mapTiles = [
            new DrapedVectorLayerTile({
                reference: "EPSG:4326",
                bounds: new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI * 0.5), new THREE.Vector2(0, Math.PI * 0.5)),
                fetchTileTextureFunction: self.fetchTextureFunction,
                imageSize: self.imageSize,
                maxLOD: self.maxLOD
            }),
            new DrapedVectorLayerTile({
                reference: "EPSG:4326",
                bounds: new THREE.Box2(new THREE.Vector2(0, -Math.PI * 0.5), new THREE.Vector2(Math.PI, Math.PI * 0.5)),
                fetchTileTextureFunction: self.fetchTextureFunction,
                imageSize: self.imageSize,
                maxLOD: self.maxLOD
            })
        ];
    }

    /**
     * Adds polygons to the layer
     * The input coordinates array is a multi-polygon with holes. Each polygon in the multi-polygon is defined by a base polygon and holes.
     * The polygon is flat on the surface of the earth at a certain height. the z-component of the polygon is unused. Instead you can set a polygon height through the height parameter.
     * The polygon can also be "draped" on terrain by setting the "drape" parameter to true.
     * @param {Array<Array<Array<Array<number>>>>} coordinates an array containing the polygons coordinates in lon lat e.g. (single polygon with hole): [[[[40.5,20.2], [40.5,25.2], [46.5,25.2], [46.5,20.2]],[[43.5,22.2], [43.5,24.2], [44,24.2], [44,22.2]]]]
     * @param {Object} properties any js object
     * @param {number} [height = undefined] the height of the polygon (a polygon can only have a single height). if undefined, the polygon is draped on terrain
     * @param {boolean} [outline = true] draws an outline using the layer's lineMaterial if true
     * @param {boolean} [draped = false] dismisses the height parameter of the coordinates and drapes the vectors on terrain
     * @returns {Promise} a promise for the uuid of the added polygons
     */
    addPolygons(coordinates, properties, height = 0, outline = true, draped = false) {
        if (draped) {
            return this.addDrapedPolygons(coordinates, properties, outline);
        }
        coordinates.forEach(polygon => {
            for (let i = 0; i < polygon.length; i++) {
                if (polygon[i][0][0] != polygon[i][polygon[i].length - 1][0] || polygon[i][0][1] != polygon[i][polygon[i].length - 1][1]) {
                    polygon[i].push(polygon[i][0])
                }
            }
        })

        if (!this.object3D) {
            this.object3D = new THREE.Object3D();
            if (this.scene) this.scene.add(this.object3D);
        }
        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        this.objects[properties.uuid] = {
            layer: this,
            type: "polygon",
            properties: properties,
            coordinates: coordinates,
            lines: [],
            meshes: []
        }
        const polygonGeometries = [];
        const lineGeometries = [];
        const polygonPromisses = [];
        coordinates.forEach(polygon => {
            polygonPromisses.push(buildPolygon(polygon, this.maxSegmentLength, height, this.lineType)
                .then(geometry => {
                    polygonGeometries.push(geometry);

                }).catch(error => {
                    console.log(error)
                }))

            if (outline) {
                polygon.forEach(subPolyCoordinates => {
                    polygonPromisses.push(buildPolyline(subPolyCoordinates, this.maxSegmentLength, height, this.lineType).then(geometry => {
                        if (geometry != undefined) {
                            lineGeometries.push(geometry);

                        }
                    }))
                })
            }
        });
        return Promise.all(polygonPromisses).then(() => {
            const mesh = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(polygonGeometries, false), this.polygonMaterial);
            mesh.userData = properties;
            this.object3D.add(mesh);
            this.objects[properties.uuid].meshes.push(mesh);

            const line = new THREE.LineSegments(BufferGeometryUtils.mergeGeometries(lineGeometries, false), this.lineMaterial);
            line.userData = properties;
            this.object3D.add(line);
            this.objects[properties.uuid].lines.push(line);

            return properties.uuid;
        })


    }

    /**
     * Adds polylines to the layer.
     * The polylines will use the z-component of the coordinates as height and default to 0.
     * Setting the {@param height} parameter overrides the heigt for all coordinates. 
     * Polylines can be {@param draped} on terrain by setting the drape parameter to true dismissing all height values
     * @param {Array} coordinates an array polylines defined as arrays of lon lat (height) points (height defaults to 0). e.g.: [[[45.5,24.2,5.0], [45.5,25.2]], [[46.5,25.2], [46.5,24.2,2.0]]]
     * @param {Object} properties any js object
     * @param {number} [height = undefined] overrides the height of every line segment vertex to this height when defined (as a height in meters above wgs84 ellipsoid).
     * @param {boolean} [draped = false] dismisses the z component of the coordinates and drapes the vectors on terrain
     * @returns {Promise} a promise for the uuid of the added polylines
     */
    addPolylines(coordinates, properties, height = undefined, draped = false) {
        if (draped) {
            return this.addDrapedPolylines(coordinates, properties, draped);
        }
        if (!this.object3D) {
            this.object3D = new THREE.Object3D();
            if (this.scene) this.scene.add(this.object3D);
        }
        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        this.objects[properties.uuid] = {
            layer: this,
            type: "polyline",
            properties: properties,
            coordinates: coordinates
        }

        const promisses = [];
        const polylineGeometries = [];
        this.objects[properties.uuid].lines = [];
        coordinates.forEach(subPolylineCoordinates => {
            promisses.push(buildPolyline(subPolylineCoordinates, this.maxSegmentLength, height, this.lineType).then(geometry => {
                if (geometry != undefined) {
                    polylineGeometries.push(geometry);

                }
            }));
        })
        return Promise.all(promisses).then(() => {
            const line = new THREE.LineSegments(BufferGeometryUtils.mergeGeometries(polylineGeometries, false), this.lineMaterial);
            line.userData = properties;
            this.object3D.add(line);
            this.objects[properties.uuid].lines.push(line);
            return properties.uuid;
        })
    }

    /**
     * Adds points to the layer
     * The point heights will use the z component of the coordinates and default to 0.
     * Points can also be draped on terrain by setting the {@param draped} parameter to true
     * @param {Array} coordinates an array of lon lat (height) points (height defaults to 0). e.g.: [[42.1,5.0,25.0], [85.8,32.1]] 
     * @param {Object} properties any js object
     * @param {boolean} [draped = false] dismisses the z component of the coordinates and drapes the vectors on terrain
     * @returns {Promise} a promise for the uuid of the added points
     */
    addPoints(coordinates, properties, draped = false) {
        if (draped) {
            return this.addDrapedPoints(coordinates, properties);
        }
        if (!this.object3D) {
            this.object3D = new THREE.Object3D();
            if (this.scene) this.scene.add(this.object3D);
        }
        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        this.objects[properties.uuid] = {
            layer: this,
            type: "points",
            properties: properties,
            coordinates: coordinates,
            points: []
        }

        return buildPoints(coordinates).then(geometry => {
            if (geometry != undefined) {
                const points = new THREE.Points(geometry, this.pointMaterial);
                points.userData = properties;
                this.object3D.add(points);
                this.objects[properties.uuid].points.push(points);
            }
            return properties.uuid;
        });


    }

    /**
     * Adds polygons draped on terrain to the layer
     * The input coordinates array is a multi-polygon with holes. Each polygon in the multi-polygon is defined by a base polygon and holes.
     * @param {Array<Array<Array<Array<number>>>>} coordinates an array containing the polygons coordinates in lon lat e.g. (single polygon with hole): [[[[40.5,20.2], [40.5,25.2], [46.5,25.2], [46.5,20.2]],[[43.5,22.2], [43.5,24.2], [44,24.2], [44,22.2]]]]
     * @param {Object} properties any js object
     * @param {boolean} [outline = true] draws an outline using the layer's lineMaterial if true
     * @returns {Promise} a promise for the uuid of the added polygons
     */
    addDrapedPolygons(coordinates, properties, outline = true) {
        const self = this;
        coordinates.forEach(polygon => {
            for (let i = 0; i < polygon.length; i++) {
                if (polygon[i][0][0] != polygon[i][polygon[i].length - 1][0] || polygon[i][0][1] != polygon[i][polygon[i].length - 1][1]) {
                    polygon[i].push(polygon[i][0])
                }
            }
        })
        coordinates.forEach(polygon => {
            polygon.forEach(subPoly => {
                subPoly.forEach(coordinate => {
                    coordinate.length = 2;
                })
            })
        })

        if (!self.drapedScene) {
            self.drapedScene = new THREE.Scene();
        }

        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        self.objects[properties.uuid] = {
            layer: self,
            type: "drapedPolygon",
            properties: properties,
            coordinates: coordinates,
            lines: [],
            meshes: []
        }
        const polygonGeometries = [];
        const lineGeometries = [];
        const polygonPromisses = [];
        coordinates.forEach(polygon => {
            polygonPromisses.push(buildLonLatPolygon(polygon, self.maxSegmentLength, self.lineType)
                .then(geometry => {
                    polygonGeometries.push(geometry);

                }).catch(error => {
                    console.log(error)
                }))

            if (outline) {
                polygon.forEach(subPolyCoordinates => {
                    polygonPromisses.push(buildLonLatPolyline(subPolyCoordinates, self.maxSegmentLength, self.lineType).then(geometry => {
                        if (geometry != undefined) {
                            lineGeometries.push(geometry);

                        }
                    }))
                })
            }
        });
        return Promise.all(polygonPromisses).then(() => {
            const polygonGeometry = BufferGeometryUtils.mergeGeometries(polygonGeometries, false);
            polygonGeometry.computeBoundingBox();
            
            

            const mesh = new THREE.Mesh(polygonGeometry, self.polygonMaterial);
            mesh.frustumCulled = false;
            mesh.userData = properties;
            self.drapedScene.add(mesh);
            self.objects[properties.uuid].meshes.push(mesh);

            const line = new THREE.LineSegments(BufferGeometryUtils.mergeGeometries(lineGeometries, false), self.lineMaterial);

            line.userData = properties;
            self.drapedScene.add(line);
            self.objects[properties.uuid].lines.push(line);

            invalidationBox.copy(polygonGeometry.boundingBox);
            invalidationBox.min.multiplyScalar(toRadians);
            invalidationBox.max.multiplyScalar(toRadians);
            self.invalidate(invalidationBox);
            return properties.uuid;
        })


    }

    /**
     * Adds polylines draped on terrain to the layer
     * @param {Array} coordinates an array polylines defined as arrays of lon lat points . e.g.: [[[45.5,24.2], [45.5,25.2]], [[46.5,25.2], [46.5,24.2]]]
     * @param {Object} properties any js object
     * @returns {Promise} a promise for the uuid of the added lines
     */
    addDrapedPolylines(coordinates, properties) {
        const self = this;
        if (!self.drapedScene) {
            self.drapedScene = new THREE.Scene();
        }
        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        self.objects[properties.uuid] = {
            layer: self,
            type: "drapedPolyline",
            properties: properties,
            coordinates: coordinates
        }

        const promisses = [];
        const polylineGeometries = [];
        self.objects[properties.uuid].lines = [];
        coordinates.forEach(polyline => {
            polyline.forEach(coordinate => {
                coordinate.length = 2;
            })
        })
        coordinates.forEach(subPolylineCoordinates => {
            promisses.push(buildLonLatPolyline(subPolylineCoordinates, self.maxSegmentLength, self.lineType).then(geometry => {
                if (geometry != undefined) {
                    polylineGeometries.push(geometry);

                }
            }));
        })
        return Promise.all(promisses).then(() => {
            const polylineGeometry = BufferGeometryUtils.mergeGeometries(polylineGeometries, false)
            polylineGeometry.computeBoundingBox();

            
            const line = new THREE.LineSegments(polylineGeometry, self.lineMaterial);

            line.userData = properties;
            self.drapedScene.add(line);
            self.objects[properties.uuid].lines.push(line);
            invalidationBox.copy(polylineGeometry.boundingBox);
            invalidationBox.min.multiplyScalar(toRadians);
            invalidationBox.max.multiplyScalar(toRadians);
            self.invalidate(invalidationBox);
            return properties.uuid;
        })
    }

    /**
     * Adds Draped points to the layer
     * @param {Array} coordinates an array of lon lat points. e.g.: [[42.1,5.0], [85.8,32.1]] 
     * @param {Object} properties any js object
     *  @returns {Promise} a promise for the uuid of the added points
     */
    addDrapedPoints(coordinates, properties) {
        const self = this;
        if (!self.drapedScene) {
            self.drapedScene = new THREE.Scene();
        }
        if (!properties) properties = {};
        if (!properties.uuid) properties.uuid = uuidv4();
        self.objects[properties.uuid] = {
            layer: self,
            type: "drapedPoints",
            properties: properties,
            coordinates: coordinates,
            points: []
        }

        coordinates.forEach(coordinate=>coordinate.length = 2);
        

        return buildLonLatPoints(coordinates).then(geometry => {
            if (geometry != undefined) {
                geometry.computeBoundingBox();

                
                const points = new THREE.Points(geometry, self.pointMaterial);
                points.userData = properties;
                self.drapedScene.add(points);
                self.objects[properties.uuid].points.push(points);
                invalidationBox.copy(geometry.boundingBox);
                invalidationBox.min.multiplyScalar(toRadians);
                invalidationBox.max.multiplyScalar(toRadians);
                self.invalidate(invalidationBox);
                return properties.uuid;
            }
            throw Error("invalid point coordinates")
            
        });


    }

    /**
     * invalidates draped tiles for the current bounds, forcing them to be re-drawn.
     * @param {THREE.Box2} bounds 
     */
    invalidate(bounds) {
        this.mapTiles.forEach(mapTile => {
            mapTile.invalidate(bounds)
        })
    }
    /**
         * disposes of any resources used by this layer
         */
    dispose() {
        this.requests.length = 0;
        this.mapTiles.forEach(element => {
            element.dispose();
        });
        if (this.object3D) {
            this.object3D.traverse(element => {
                if (element.geometry) element.geometry.dispose();
            });
        }
        if (this.drapedScene) {
            this.drapedScene.traverse(element => {
                if (element.geometry) element.geometry.dispose();
            });
        }
        this.scene.remove(this.object3D);
        this.object3D = undefined;
        this.scene = undefined;
    }


    _addToScene(scene) {
        this.scene = scene;
        if (this.object3D) this.scene.add(this.object3D);
    }


    _setMap(map) {
        this.map = map;
        const self = this;
        self.invalidate(new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI*0.5), new THREE.Vector2(Math.PI, Math.PI*0.5)))
        map.addSelectionListener(selections => {
            selections.selected.forEach(selectedObject => {
                if (selectedObject.layer.id == this.id) {
                    const selectedElement = this.objects[selectedObject.uuid]
                    switch (selectedElement.type) {
                        case "points":
                            selectedElement.points.forEach(p => {
                                p.material = this.selectedPointMaterial;
                            });
                            break;
                        case "polyline":
                            selectedElement.lines.forEach(l => {
                                l.material = this.selectedLineMaterial;
                            });
                            break;
                        case "polygon":
                            selectedElement.lines.forEach(l => {
                                l.material = this.selectedLineMaterial;
                            });
                            selectedElement.meshes.forEach(m => {
                                m.material = this.selectedPolygonMaterial;
                            });
                            break;
                        case "drapedPoints":
                            selectedElement.points.forEach(p => {
                                p.material = this.selectedPointMaterial;
                                invalidationBox.copy(p.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                        case "drapedPolyline":
                            selectedElement.lines.forEach(l => {
                                l.material = this.selectedLineMaterial;
                                invalidationBox.copy(l.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                        case "drapedPolygon":
                            selectedElement.lines.forEach(l => {
                                l.material = this.selectedLineMaterial;
                            });
                            selectedElement.meshes.forEach(m => {
                                m.material = this.selectedPolygonMaterial;
                                invalidationBox.copy(m.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                    }
                }
            });
            selections.unselected.forEach(selectedObject => {
                if (selectedObject.layer.id == this.id) {
                    const selectedElement = this.objects[selectedObject.uuid]
                    switch (selectedElement.type) {
                        case "points":
                            selectedElement.points.forEach(p => {
                                p.material = this.pointMaterial;
                            });
                            break;
                        case "polyline":
                            selectedElement.lines.forEach(l => {
                                l.material = this.lineMaterial;
                            });
                            break;
                        case "polygon":
                            selectedElement.lines.forEach(l => {
                                l.material = this.lineMaterial;
                            });
                            selectedElement.meshes.forEach(m => {
                                m.material = this.polygonMaterial;
                            });
                            break;
                        case "drapedPoints":
                            selectedElement.points.forEach(p => {
                                p.material = this.pointMaterial;
                                invalidationBox.copy(p.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                        case "drapedPolyline":
                            selectedElement.lines.forEach(l => {
                                l.material = this.lineMaterial;
                                invalidationBox.copy(l.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                        case "drapedPolygon":
                            selectedElement.lines.forEach(l => {
                                l.material = this.lineMaterial;
                            });
                            selectedElement.meshes.forEach(m => {
                                m.material = this.polygonMaterial;
                                invalidationBox.copy(m.geometry.boundingBox);
                                invalidationBox.min.multiplyScalar(toRadians);
                                invalidationBox.max.multiplyScalar(toRadians);
                                self.invalidate(invalidationBox);
                            });
                            break;
                    }
                }
            })
        })
    }

    update() {
        if (!this.map || !this.drapedScene) return;
        this.requests.sort((a, b) => {
            return a.users.size - b.users.size;
        });
        if (this.requests.length > 0) {
            this.map.renderer.getClearColor(mapClearColor);
            const mapClearAlpha = this.map.renderer.getClearAlpha();
            const mapAlpha = this.map.alpha;
            this.map.alpha = true;
            this.map.renderer.setClearColor(0x000000, 0.0);
            for (let i = 0; i < Math.min(4, this.requests.length); i++) {
                const request = this.requests.pop();
                this.map.renderer.setRenderTarget(request.renderTarget);
                this.map.renderer.clearColor();
                this.map.renderer.render(this.drapedScene, request.camera);
                request._callback()
            }
            this.map.renderer.setClearColor(mapClearColor, mapClearAlpha);
            this.map.alpha = mapAlpha;
        }

    }

    /**
     * Fetches the nearest loaded draped tiles LOD (texture, uvBounds and reference) and adds a callback for the ideal LOD if not yet available
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



    raycast(mapRaycaster) {

        if (!this.isSelectable || !this.map || !this.drapedScene) return [];

        const tileIntersections = this.map.raycastTerrain(mapRaycaster);
        if (tileIntersections != undefined) {
            raycastOrigin.copy(tileIntersections);
            raycastOrigin.z = 1;

            raycaster.set(raycastOrigin, raycastDirection);

            const selected = raycaster.intersectObjects(this.drapedScene.children, false).map(selectedObject => {
                return {
                    uuid: selectedObject.object.userData.uuid,
                    distance: selectedObject.distance,
                    faceIndex: selectedObject.faceIndex,
                    index: selectedObject.index,
                    selectionPosition: selectedObject.point,
                    layer: this
                }
            });
            return selected;
        }

    }
    raycast(mapRaycaster) {

        if (!this.isSelectable || !this.map) return [];

        const selectedNonDraped = !this.object3D?[]:mapRaycaster.intersectObjects(this.object3D.children, false).map(selectedObject => {
            return {
                uuid: selectedObject.object.userData.uuid,
                distance: selectedObject.distance,
                faceIndex: selectedObject.faceIndex,
                index: selectedObject.index,
                selectionPosition: selectedObject.point,
                layer: this
            }
        });
        if(this.drapedScene){
            const tileIntersections = this.map.raycastTerrain(mapRaycaster);
            if (tileIntersections != undefined) {
                raycastOrigin.copy(tileIntersections);
                raycastOrigin.z = 1;
    
                raycaster.set(raycastOrigin, raycastDirection);
    
                const selectedDraped = raycaster.intersectObjects(this.drapedScene.children, false).map(selectedObject => {
                    return {
                        uuid: selectedObject.object.userData.uuid,
                        distance: selectedObject.distance,
                        faceIndex: selectedObject.faceIndex,
                        index: selectedObject.index,
                        selectionPosition: selectedObject.point,
                        layer: this
                    }
                });
                return selectedNonDraped.concat(selectedDraped);
            }
        }
         else {
            return selectedNonDraped;
        }
    }
}

export { VectorLayer };