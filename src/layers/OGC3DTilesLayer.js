import { Layer } from "./Layer";
import { OGC3DTile } from "@jdultra/threedtiles/src/tileset/OGC3DTile";
import * as THREE from 'three';
import { TileLoader } from '@jdultra/threedtiles/src/tileset/TileLoader';
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async/dynamic";
import { OBB } from '@jdultra/threedtiles/src/geometry/obb';

const cartesianLocation = new THREE.Vector3();
const orientationHelper = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();
const quaternionSelfRotation = new THREE.Quaternion();
const quaternionZUPtoYUP = new THREE.Quaternion();
quaternionZUPtoYUP.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
const scale = new THREE.Vector3(1, 1, 1);

class OGC3DTilesLayer extends Layer {
    constructor(properties) {
        if (!properties) {
            throw "Bad instanciation, OGC3DTilesLayer requires properties."
        }
        super(properties);

        const self = this;

        this.scale = !!properties.scale ? properties.scale : 1;

        this.rotation = new THREE.Euler(
            !!properties.rotationX ? properties.rotationX : 0,
            !!properties.rotationY ? properties.rotationY : 0,
            !!properties.rotationZ ? properties.rotationZ : 0,
            "ZYX");


        this.geometricErrorMultiplier = !!properties.geometricErrorMultiplier ? properties.geometricErrorMultiplier : 1.0;
        this.longitude = !!properties.longitude ? properties.longitude : 0;
        this.latitude = !!properties.latitude ? properties.latitude : 0;
        this.llh = new THREE.Vector3(!!properties.longitude ? properties.longitude : 0, !!properties.longitude ? properties.latitude : 0, !!properties.longitude ? properties.height : 0)

        this.zUp = !!properties.zUp ? properties.zUp : false;


        this.tileset = new OGC3DTile({
            url: properties.url,
            geometricErrorMultiplier: !!properties.geometricErrorMultiplier ? properties.geometricErrorMultiplier : 1.0,
            loadOutsideView: !!properties.loadOutsideView ? properties.loadOutsideView : false,
            tileLoader: !!properties.tileLoader ? properties.tileLoader : new TileLoader(
                !!properties.meshCallback ? properties.meshCallback : mesh => { mesh.material.side = THREE.DoubleSide; }, 500),
            onLoadCallback: tileset => self.calculateBounds(tileset)
        });

        this.selected = false;
    }

    setLLH(llh){
        this.llh.x = llh.x;
        this.llh.y = llh.y;
        this.llh.z = llh.z;
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
    calculateBounds(tileset) {
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
                opacity: 0.0,
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
                        opacity: 0.6,
                        depthWrite: true,
                        side: THREE.DoubleSide,
                        depthTest: true
                    }
                ));
                this.selectionMesh = this.boundingMesh.clone();
        } else if (tile.boundingVolume instanceof THREE.Box3) {
            // Region
            // Region not supported
            //throw Error("Region bounding volume not supported");
            return;
        }
        this.boundingMesh.layer = this;
        this.update();
    }
    setPlanet(planet) {
        this.planet = planet;
        this.update();
    }

    addToScene(scene, camera) {
        this.scene = scene;
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
        //cartesianLocation.multiplyScalar(this.planet.radius+this.location.z)

    }

    dispose() {
        this.tileset.dispose();
        if (this.updateInterval) clearIntervalAsync(this.updateInterval);
    }

    getSelectableObjects(){
        const selectable = [];
        if(this.boundingMesh) selectable.push(this.boundingMesh);
        return selectable;
    }

    select(objects) {
        if(objects && objects.length && objects[0].layer == this){
            this.selected = true;
            this.scene.add(this.selectionMesh);
            this.scene.add(this.boundingMesh);
            if(this.boundingMeshOutline)this.scene.add(this.boundingMeshOutline);
        }
        
    }
    unselect(objects) {
        if(objects && objects.length && objects[0].layer == this){
            this.selected = false;
            this.scene.remove(this.selectionMesh);
            this.scene.remove(this.boundingMesh);
            if(this.boundingMeshOutline)this.scene.remove(this.boundingMeshOutline);
        }
        
    }
}
export { OGC3DTilesLayer }