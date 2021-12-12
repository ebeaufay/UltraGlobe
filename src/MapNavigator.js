import * as THREE from 'three';

const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const yawPitchRoll = new THREE.Vector3(3.14,0,0);
class MapNavigator {

    constructor(map){
        this.map = map;
        this.planet = map.planet;
        this.camera = map.camera;
        this.desiredPosition = this.camera.position;
        this.desiredOrientation = this.camera.quaternion;
        const self = this;
        setInterval(()=>{
            self.update();
        },16)
    }

    update(){
        yawPitchRoll.copy(this.camera.position).sub(this.planet.center).normalize();
        euler.setFromVector3(yawPitchRoll, "XYZ")
        quaternion.setFromEuler(euler);
        this.camera.quaternion.rotateTowards(quaternion, 0.001)
        this.camera.quaternion.normalize();
    }
}
export{MapNavigator}