import { Layer } from "./Layer";
import { OGC3DTile } from "@jdultra/threedtiles";
import * as THREE from 'three';
import { TileLoader } from '@jdultra/threedtiles';
import { OBB } from '@jdultra/threedtiles';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import moveUpSVG from "./../images/double-arrow.png";

const cartesianLocation = new THREE.Vector3();
const orientationHelper = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();
const quaternionSelfRotation = new THREE.Quaternion();
const quaternionZUPtoYUP = new THREE.Quaternion();
quaternionZUPtoYUP.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
const scale = new THREE.Vector3(1, 1, 1);

class OGC3DTilesLayer extends Layer {
    constructor(properties) {
        if (!properties) {
            throw "Bad instanciation, OGC3DTilesLayer requires properties."
        }
        super(properties);

        const self = this;
        self.properties = properties;
        self.displayCopyright = properties.displayCopyright;
        self.displayErrors = properties.displayErrors;
        self.yUp = properties.yUp;
        self.proxy = properties.proxy;
        self.queryParams = properties.queryParams;
        this.scale = !!properties.scale ? properties.scale : 1;

        this.rotation = new THREE.Euler(
            !!properties.rotationX ? properties.rotationX : 0,
            !!properties.rotationY ? properties.rotationY : 0,
            !!properties.rotationZ ? properties.rotationZ : 0,
            "ZYX");


        this.geometricErrorMultiplier = !!properties.geometricErrorMultiplier ? properties.geometricErrorMultiplier : 1.0;
        this.longitude = properties.longitude;
        this.latitude = properties.latitude;
        if(!!properties.longitude && !!properties.latitude){
            this.llh = new THREE.Vector3(properties.longitude, properties.latitude, !!properties.height ? properties.height : 0)
        }
        

        this.zUp = !!properties.zUp ? properties.zUp : false;

        this.url = properties.url;
        this.geometricErrorMultiplier = !!properties.geometricErrorMultiplier ? properties.geometricErrorMultiplier : 1.0;
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

    setRenderer(renderer){
        const self = this;

        var tileLoader = !!self.properties.tileLoader ? self.properties.tileLoader : new TileLoader({
            renderer: renderer,
            maxCachedItems: 200,
            meshCallback: mesh => {
                //mesh.material = new THREE.MeshLambertMaterial();
                if(mesh.material.isMeshBasicMaterial){
                    const newMat = new THREE.MeshStandardMaterial();
                    newMat.map = mesh.material.map;
                    mesh.material = newMat;
                }
                mesh.material.map.colorSpace = THREE.LinearSRGBColorSpace;
                mesh.material.wireframe = false;
                mesh.material.side = THREE.DoubleSide;
                mesh.castShadow = true
                mesh.receiveShadow = true;
                mesh.parent.castShadow = true
                mesh.parent.receiveShadow = true;
                if (!mesh.geometry.getAttribute('normal')) {
                    mesh.geometry.computeVertexNormals();
                }
                mesh.material.shadowSide = THREE.BackSide;
                mesh.material.flatShading = true;
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
            renderer: renderer,
            proxy: self.proxy,
            queryParams: self.queryParams,
            yUp:self.yUp,
            displayErrors: self.displayErrors,
            displayCopyright: self.displayCopyright
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
        /* this.tileset.translateOnAxis(cartesianLocation, this.planet.radius+this.location.z)
        scaleMatrix.makeScale(2000, 2000, 2000)
        scaleMatrix.multiplyScalar(scaleMatrix);
        
        this.tileset.applyMatrix4(scaleMatrix); */
        if(this.llh){
            const transform = this.planet.llhToCartesian.forward(this.llh);
            cartesianLocation.set(transform.x, transform.y, transform.z);
            //quaternionSelfRotation
            quaternionToEarthNormalOrientation.setFromUnitVectors(up, orientationHelper.copy(cartesianLocation).normalize());
            if (this.zUp) {
                quaternionToEarthNormalOrientation.multiply(quaternionZUPtoYUP);
            }
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