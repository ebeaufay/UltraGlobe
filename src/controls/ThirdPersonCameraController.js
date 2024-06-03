import * as THREE from 'three';
import { Vector3 } from 'three';
import { Controller } from './Controller';


const tempPoint1 = new THREE.Vector3();
const tempPoint2 = new THREE.Vector3();
/**
 * Camera controller that tracks an object and attempts to place the camera behind it
 * while restricting it to an above ground position.
 */
class ThirdPersonCameraController extends Controller {
    constructor(camera, domElement, map, trackedObject, heightAboveObject = 300, distanceBehindObject = 100) {
        super(camera, domElement, map);
        this.mouseRayCast = new THREE.Vector3();
        this.trackedObject = trackedObject;
        this.previousPosition = new Vector3().copy(trackedObject.position);
        this.heightAboveObject = heightAboveObject;
        this.distanceBehindObject = distanceBehindObject;
        this.clock = new THREE.Clock();
    }
    _handleEvent(eventName, e) {
        super._handleEvent(eventName, e);
    }

    _update() {
        const self = this;
        self.trackedObject.getWorldDirection(tempPoint1);
        tempPoint1.normalize().negate().multiplyScalar(self.distanceBehindObject);
        tempPoint2.copy(self.trackedObject.position).normalize().multiplyScalar(self.heightAboveObject);

        // tempPoint1 contains the desired camera position
        tempPoint1.add(tempPoint2).add(self.trackedObject.position);

        const llh = self.map.planet.llhToCartesian.inverse(tempPoint1)
        const terrainHeight = self.map.planet.getTerrainElevation({x:llh.x*0.0174532925, y:llh.y*0.0174532925});

        if(llh.z < terrainHeight+5){
            tempPoint2.divideScalar(self.heightAboveObject).multiplyScalar(terrainHeight+5-llh.z);
            tempPoint1.add(tempPoint2);
        }

        self.camera.position.lerp(tempPoint1, Math.pow(0.9,self.clock.getDelta()));
        self.camera.up.copy(self.camera.position).normalize();
        self.camera.lookAt(self.trackedObject.position);
        self.straighten()
        this.map.resetCameraNearFar();
    }

    straighten() {



        this.camera.getWorldDirection(tempPoint2).normalize();

        tempPoint1.crossVectors(this.camera.up.normalize(), tempPoint2);
        tempPoint2.add(this.camera.position);
        this.camera.lookAt(tempPoint2);
        this.camera.up.crossVectors(tempPoint2.sub(this.camera.position), tempPoint1);
    }

} export { ThirdPersonCameraController }