import { Layer } from "./Layer";
import { OGC3DTile } from "@jdultra/threedtiles/src/tileset/OGC3DTile";
import * as THREE from 'three';
import {TileLoader} from '@jdultra/threedtiles/src/tileset/TileLoader';
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async/dynamic";

const cartesianLocation = new THREE.Vector3();
const orientationHelper = new THREE.Vector3();
const up = new THREE.Vector3(0,1,0);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();
const quaternionSelfRotation = new THREE.Quaternion();
const quaternionZUPtoYUP = new THREE.Quaternion();
quaternionZUPtoYUP.setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0));
const scale = new THREE.Vector3(1,1,1);

class OGC3DTilesLayer extends Layer{
    constructor(properties){
        if(!properties){
            throw "Bad instanciation, OGC3DTilesLayer requires properties."
        }
        super(properties);

        this.scale = !!properties.scale?properties.scale: 1;
        
        this.rotation = new THREE.Euler(
            !!properties.rotationX?properties.rotationX: 0, 
            !!properties.rotationY?properties.rotationY: 0, 
            !!properties.rotationZ?properties.rotationZ: 0, 
            "ZYX");
        

        this.geometricErrorMultiplier = !!properties.geometricErrorMultiplier?properties.geometricErrorMultiplier: 1.0;
        this.longitude = !!properties.longitude?properties.longitude: 0;
        this.latitude = !!properties.latitude?properties.latitude: 0;
        this.height = !!properties.height?properties.height: 0;
        this.llh = new THREE.Vector3(!!properties.longitude?properties.longitude: 0, !!properties.longitude?properties.latitude: 0, !!properties.longitude?properties.height: 0)

        this.zUp = !!properties.zUp?properties.zUp: false;

        
        this.tileset = new OGC3DTile({
            url:properties.url,
            geometricErrorMultiplier: !!properties.geometricErrorMultiplier? properties.geometricErrorMultiplier:1.0,
            loadOutsideView: !!properties.loadOutsideView? properties.loadOutsideView: false,
            tileLoader: !!properties.tileLoader? properties.tileLoader: new TileLoader(
                !!properties.meshCallback? properties.meshCallback : mesh=>{mesh.material.side = THREE.DoubleSide;}, 500)
        });
    }

    setPlanet(planet){
        this.planet = planet;
        this.update();
    }

    addToScene(scene, camera){
        scene.add(this.tileset);
        const self = this;
        self.updateInterval = setIntervalAsync(function () {
            self.tileset.update(camera);
        }, 25);
    }

    update(){
        /* this.tileset.translateOnAxis(cartesianLocation, this.planet.radius+this.location.z)
        scaleMatrix.makeScale(2000, 2000, 2000)
        scaleMatrix.multiplyScalar(scaleMatrix);
        
        this.tileset.applyMatrix4(scaleMatrix); */
        const transform = this.planet.llhToCartesian.forward(this.llh);
        cartesianLocation.set(transform.x, transform.y, transform.z);
        //quaternionSelfRotation
        quaternionToEarthNormalOrientation.setFromUnitVectors( up, orientationHelper.copy(cartesianLocation).normalize() );
        if(this.zUp){
            quaternionToEarthNormalOrientation.multiply(quaternionZUPtoYUP);
        }
        quaternionSelfRotation.setFromEuler(this.rotation);
        this.tileset.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
        this.tileset.position.copy(cartesianLocation);
        this.tileset.scale.set(this.scale, this.scale, this.scale);
        this.tileset.updateMatrix();
        this.tileset.updateMatrixWorld();
        //cartesianLocation.multiplyScalar(this.planet.radius+this.location.z)
        
    }

    dispose(){
        this.tileset.dispose();
        if(this.updateInterval) clearIntervalAsync(this.updateInterval);
    }
}
export{OGC3DTilesLayer}