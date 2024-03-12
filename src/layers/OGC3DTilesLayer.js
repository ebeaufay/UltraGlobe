import { Layer } from "./Layer";
import { OGC3DTile } from "@jdultra/threedtiles/dist/threedtiles.min.js";
import * as THREE from 'three';
import { TileLoader } from '@jdultra/threedtiles/dist/threedtiles.min.js';
import { OBB } from '@jdultra/threedtiles/dist/threedtiles.min.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import moveUpSVG from "./../images/double-arrow.png";

const cartesianLocation = new THREE.Vector3();
const orientationHelper = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();
const quaternionSelfRotation = new THREE.Quaternion();

/**
 * A layer for loading a OGC3DTiles tileset. 
 * @class
 * @extends Layer
 */
class OGC3DTilesLayer extends Layer {
    /**
     * 
     * @param {Object} properties
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.url url of the root tileset.json
     * @param {Boolean} [properties.displayCopyright = false] (optional) display copyright information when present in tiles by concatenating all copyright info for all displayed tiles
     * @param {Boolean} [properties.displayErrors = false] (optional) display loading errors
     * @param {Boolean} [properties.proxy = undefined] (optional) the url to a proxy service. Instead of fetching tiles via a GET request, a POST will be sent to the proxy url with the real tile address in the body of the request.
     * @param {Boolean} [properties.queryParams = undefined] (optional) path params to add to individual tile urls (starts with "?").
     * @param {Number} [properties.scale = 1] (optional) scale the model
     * @param {Number} [properties.rotationX = 0] (optional) rotates the model on its x axis in radians
     * @param {Number} [properties.rotationY = 0] (optional) rotates the model on its y axis in radians
     * @param {Number} [properties.rotationZ = 0] (optional) rotates the model on its z axis in radians
     * @param {Number} [properties.geometricErrorMultiplier = 1] (optional) between 0 and infinity, defaults to 1. controls the level of detail.
     * @param {Number} [properties.longitude = 0] (optional) longitude of the model's center point in degrees.
     * @param {Number} [properties.latitude = 0] (optional) latitude of the model's center point in degrees.
     * @param {Number} [properties.height = 0] (optional) height in meters above sea level.
     * @param {Boolean} [properties.loadOutsideView = false] (optional) if true, will load tiles outside the view at the lowest possible LOD.
     * @param {Boolean} [properties.selectable = false] (optional) if true, the tileset can be selected.
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
     */
    constructor(properties) {
        
        if (!properties) {
            throw "Bad instanciation, OGC3DTilesLayer requires properties."
        }
        super(properties);
        this.isOGC3DTilesLayer = true;
        const self = this;
        self.properties = properties;
        self.displayCopyright = properties.displayCopyright;
        self.displayErrors = properties.displayErrors;
        self.proxy = properties.proxy;
        self.queryParams = properties.queryParams;
        this.scale = !!properties.scale ? properties.scale : 1;

        this.rotation = new THREE.Euler(
            !!properties.rotationX ? properties.rotationX : 0,
            !!properties.rotationY ? properties.rotationY : 0,
            !!properties.rotationZ ? properties.rotationZ : 0,
            "ZYX");


        this.geometricErrorMultiplier = !!properties.geometricErrorMultiplier ? properties.geometricErrorMultiplier : 1.0;
        if(!!properties.longitude && !!properties.latitude){
            this.llh = new THREE.Vector3(properties.longitude, properties.latitude, !!properties.height ? properties.height : 0)
        }
        
        this.url = properties.url;
        this.loadOutsideView = !!properties.loadOutsideView ? properties.loadOutsideView : false;
        
        
        
        this.selected = false;
        this.selectable = !!properties.selectable;
    }

    setLLH(llh){
        this.llh.x = llh.x;
        this.llh.y = llh.y;
        this.llh.z = llh.z;
    }
    getCenter(sfct){
        sfct.copy(this.llh);
    }
    getRadius(){
        return this.bounds.min.distanceTo(this.bounds.max);
    }
    getBaseHeight(){
        const bounds = this.tileset.boundingVolume;
        if(bounds){
            if (bounds instanceof OBB) {
                return - bounds.halfDepth;
            }else if(bounds instanceof THREE.Sphere){
                return - bounds.radius;
            }
        }
        return 0;
    }
    generateControlShapes(tileset) {
        if(tileset.json.boundingVolume.region){
            
        }else if(tileset.json.boundingVolume.box){

        }else if(tileset.json.boundingVolume.sphere){
            
        }
        if (tileset.boundingVolume instanceof OBB) {
            // box

            // TODO curved edges
            const shape = new THREE.Shape();
            shape.moveTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.1, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.1);
            shape.lineTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.1, tileset.boundingVolume.center.y - tileset.boundingVolume.halfHeight - tileset.boundingVolume.halfWidth * 0.1);
            shape.lineTo(tileset.boundingVolume.center.x - tileset.boundingVolume.halfWidth - tileset.boundingVolume.halfWidth * 0.1, tileset.boundingVolume.center.y - tileset.boundingVolume.halfHeight - tileset.boundingVolume.halfWidth * 0.1);
            shape.lineTo(tileset.boundingVolume.center.x - tileset.boundingVolume.halfWidth - tileset.boundingVolume.halfWidth * 0.1, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.1);
            shape.lineTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.1, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.1);

            const hole = new THREE.Shape();
            hole.moveTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.0, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.0);
            hole.lineTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.0, tileset.boundingVolume.center.y - tileset.boundingVolume.halfHeight - tileset.boundingVolume.halfWidth * 0.0);
            hole.lineTo(tileset.boundingVolume.center.x - tileset.boundingVolume.halfWidth - tileset.boundingVolume.halfWidth * 0.0, tileset.boundingVolume.center.y - tileset.boundingVolume.halfHeight - tileset.boundingVolume.halfWidth * 0.0);
            hole.lineTo(tileset.boundingVolume.center.x - tileset.boundingVolume.halfWidth - tileset.boundingVolume.halfWidth * 0.0, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.0);
            hole.lineTo(tileset.boundingVolume.center.x + tileset.boundingVolume.halfWidth + tileset.boundingVolume.halfWidth * 0.0, tileset.boundingVolume.center.y + tileset.boundingVolume.halfHeight + tileset.boundingVolume.halfWidth * 0.0);

            shape.holes.push(hole);
            const geometry = new THREE.ShapeGeometry(shape);
            geometry.translate(0,0,-tileset.boundingVolume.halfDepth);

            const matrix = new THREE.Matrix4();
            matrix.setFromMatrix3(tileset.boundingVolume.matrixToOBBCoordinateSystem);
            geometry.applyMatrix4(matrix);
            geometry.translate(tileset.boundingVolume.center.x, tileset.boundingVolume.center.y, tileset.boundingVolume.center.z);
            
            this.selectionMesh = new THREE.Mesh(geometry,
                new THREE.MeshBasicMaterial(
                    {
                        color: 0xFFB24E,
                        transparent: true,
                        opacity: 0.5,
                        depthWrite: true,
                        side: THREE.DoubleSide,
                        depthTest: true
                    }
                )
            );

            const geometry2 = new THREE.BoxGeometry(tileset.boundingVolume.halfWidth * 2, tileset.boundingVolume.halfHeight * 2, tileset.boundingVolume.halfDepth * 2);
            geometry2.applyMatrix4(matrix);
            geometry2.translate(tileset.boundingVolume.center.x, tileset.boundingVolume.center.y, tileset.boundingVolume.center.z);
            
            this.boundingMesh = new THREE.Mesh(geometry2, new THREE.MeshBasicMaterial({
                color: 0xFFB24E,
                transparent: true,
                opacity: 0.3,
                depthWrite: true,
                side: THREE.DoubleSide,
                depthTest: true
            }) );
            this.boundingMeshOutline = new THREE.BoxHelper( this.boundingMesh, 0xFFB24E );




        } else if (tileset.boundingVolume instanceof THREE.Sphere) {
            //sphere
            const geometry = new THREE.SphereGeometry(tileset.boundingVolume.radius, 32, 16)
            geometry.translate(tileset.boundingVolume.center.x, tileset.boundingVolume.center.y, tileset.boundingVolume.center.z);
            this.boundingMesh = new THREE.Mesh(geometry,
                new THREE.MeshBasicMaterial(
                    {
                        color: 0x04E7FF,
                        transparent: true,
                        opacity: 0.3,
                        depthWrite: true,
                        side: THREE.DoubleSide,
                        depthTest: true
                    }
                ));
                this.selectionMesh = this.boundingMesh.clone();
        } else if (tile.boundingVolume instanceof THREE.Box3) {
            // Region
            // Region not supported
            console.error("Region bounding volume not supported");
            return;
        }
        this.boundingMesh.layer = this;
        this.update();
    }

    setMap(map){
        const self = this;

        var tileLoader = !!self.properties.tileLoader ? self.properties.tileLoader : new TileLoader({
            renderer: map.renderer,
            maxCachedItems: 200,
            meshCallback: mesh => {
                //mesh.material = new THREE.MeshLambertMaterial({color: new THREE.Color("rgb("+(Math.floor(Math.random()*256))+", "+(Math.floor(Math.random()*256))+", "+(Math.floor(Math.random()*256))+")")});
                if(mesh.material.isMeshBasicMaterial){
                    const newMat = new THREE.MeshStandardMaterial();
                    newMat.map = mesh.material.map;
                    mesh.material = newMat;
                }
                /* mesh.material.color.copy(new THREE.Color("rgb("+(Math.floor(Math.random()*256))+", "+(Math.floor(Math.random()*256))+", "+(Math.floor(Math.random()*256))+"))+"));
                mesh.material.needsUpdate = true */
                if(mesh.material.map){
                    mesh.material.map.colorSpace = THREE.LinearSRGBColorSpace;
                }
                mesh.material.wireframe = false;
                mesh.material.side = THREE.DoubleSide;
                if (!mesh.geometry.getAttribute('normal')) {
                    mesh.geometry.computeVertexNormals();
                }
                if(map.csm){
                    mesh.material.side = THREE.FrontSide;
                    mesh.castShadow = true
                    mesh.receiveShadow = true;
                    mesh.parent.castShadow = true
                    mesh.parent.receiveShadow = true;
                    
                    mesh.material.shadowSide = THREE.BackSide;
                    map.csm.setupMaterial(mesh.material);
                }
                
                mesh.material.flatShading = self.properties.flatShading;
            },
            pointsCallback: points => {
                points.material.size = Math.min(1.0, 0.1 * Math.sqrt(points.geometricError));
                points.material.sizeAttenuation = true;
            }
        });
        this.tileset = new OGC3DTile({
            url: this.url,
            geometricErrorMultiplier: this.geometricErrorMultiplier,
            loadOutsideView: this.loadOutsideView,
            tileLoader: tileLoader,
            renderer: map.renderer,
            proxy: self.proxy,
            queryParams: self.queryParams,
            displayErrors: self.displayErrors,
            displayCopyright: self.displayCopyright,
            centerModel: self.centerModel
        });
        
    }
    setPlanet(planet) {
        this.planet = planet;
        this.update();
    }

    addToScene(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        scene.add(this.tileset);
        const self = this;
        self.updateInterval = setIntervalAsync(function () {
            if (!self.pause) {
                self.tileset.update(camera);
            }
        }, 25);
    }

    update() {
        
        if(!this.planet){
            return;
        }
        if(this.llh){
            const transform = this.planet.llhToCartesian.forward(this.llh);
            cartesianLocation.set(transform.x, transform.y, transform.z);
            //quaternionSelfRotation
            quaternionToEarthNormalOrientation.setFromUnitVectors(up, orientationHelper.copy(cartesianLocation).normalize());
            quaternionSelfRotation.setFromEuler(this.rotation);
            this.tileset.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
            this.tileset.position.copy(cartesianLocation);
            this.tileset.scale.set(this.scale, this.scale, this.scale);
            
    
            if (this.boundingMesh) {
                this.boundingMesh.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
                this.boundingMesh.position.copy(cartesianLocation);
                this.boundingMesh.scale.set(this.scale, this.scale, this.scale);
                this.boundingMesh.updateMatrix();
                this.boundingMesh.updateMatrixWorld();
    
                this.selectionMesh.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
                this.selectionMesh.position.copy(cartesianLocation);
                this.selectionMesh.scale.set(this.scale, this.scale, this.scale);
                this.selectionMesh.updateMatrix();
                this.selectionMesh.updateMatrixWorld();
    
            }
        }
    

    }

    dispose() {
        this.tileset.dispose();
        if (this.updateInterval) this.updateInterval.clearInterval();
    }

    getSelectableObjects(){
        const selectable = [];
        if(this.boundingMesh) selectable.push(this.boundingMesh);
        return selectable;
    }

    select(objects) {
        if(objects && objects.length && objects[0].layer == this && this.selectable){
            this.selected = true;
            this.scene.add(this.selectionMesh);
            this.scene.add(this.boundingMesh);
            if(this.boundingMeshOutline)this.scene.add(this.boundingMeshOutline);
        }
        
    }
    unselect(objects) {
        if(objects && objects.length && objects[0].layer == this && this.selectable){
            this.selected = false;
            this.scene.remove(this.selectionMesh);
            this.scene.remove(this.boundingMesh);
            if(this.boundingMeshOutline)this.scene.remove(this.boundingMeshOutline);
        }
        
    }
}
export { OGC3DTilesLayer }

function setIntervalAsync(fn, delay) {
    let timeout;

    const run = async () => {
        const startTime = Date.now();
        try {
            await fn();
        } catch (err) {
            console.error(err);
        } finally {
            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            const nextDelay = elapsedTime >= delay ? 0 : delay - elapsedTime;
            timeout = setTimeout(run, nextDelay);
        }
    };

    timeout = setTimeout(run, delay);

    return { clearInterval: () => clearTimeout(timeout) };
}