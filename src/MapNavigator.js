import * as THREE from 'three';

const tempQuaternion = new THREE.Quaternion();
const tempPointA = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempPointC = new THREE.Vector3();
export class MapNavigator {
    constructor(map) {
        this.map = map;
        this.interval;
    }

    moveToCartesianSinusoidal(destination, destinationOrientation, timeTotal, adaptNearFar, cameraMovedCallback) {
        return this.moveThroughCartesianSinusoidal(
            [this.map.camera.position, destination],
            [this.map.camera.quaternion, destinationOrientation],
            timeTotal,
            adaptNearFar,
            cameraMovedCallback
        )
    }
    moveThroughCartesianSinusoidalSmooth(positions, quaternions, timeTotal, adaptNearFar, cameraMovedCallback) {
        const curve = new THREE.CatmullRomCurve3(positions);
        return this.moveThroughCartesianSinusoidal(curve.getPoints(Math.max(positions.length, Math.min(1000, positions.length * 10))), quaternions, timeTotal, adaptNearFar, cameraMovedCallback);
    }
    moveThroughCartesianSinusoidal(positions, quaternions, timeTotal, adaptNearFar, cameraMovedCallback) {
        const self = this;
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            if (this.interval) {
                clearInterval(this.interval);
            }
            this.interval = setInterval(() => {
                const currentTime = Date.now() - startTime;
                const percentageTime = currentTime / timeTotal;
                const overallPercentage = (Math.sin(((percentageTime) * Math.PI) - (Math.PI / 2)) + 1) / 2;
                
                if (percentageTime >= 1.0) {
                    if (positions.length > 0) this.map.camera.position.copy(positions[positions.length - 1]);
                    if (quaternions.length > 0) this.map.camera.setRotationFromQuaternion(quaternions[quaternions.length - 1]);
                    clearInterval(self.interval);
                    if (cameraMovedCallback) cameraMovedCallback();
                    if (adaptNearFar) self.map.resetCameraNearFar();
                    resolve();
                }
                if (positions.length == 1) {
                    this.map.camera.position.copy(positions[positions.length - 1]);
                } else if (positions.length > 1) {
                    let percentage = overallPercentage * (positions.length - 1);
                    let previousIndex = Math.floor(percentage);
                    percentage -= previousIndex;
                    console.log(previousIndex+ "  "+percentage);
                    this.map.camera.position.lerpVectors(positions[previousIndex], positions[previousIndex + 1], percentage);
                }

                if (quaternions.length == 1) {
                    this.map.camera.setRotationFromQuaternion(quaternions[quaternions.length - 1]);
                } else if (quaternions.length > 1) {
                    let percentage = overallPercentage * (quaternions.length - 1);
                    let previousIndex = Math.floor(percentage);
                    percentage -= previousIndex;

                    tempQuaternion.slerpQuaternions(quaternions[previousIndex], quaternions[previousIndex + 1], percentage);
                    this.map.camera.setRotationFromQuaternion(tempQuaternion);
                }
                if (cameraMovedCallback) cameraMovedCallback();
                if (adaptNearFar) self.map.resetCameraNearFar();
            }, 20);
        });

    }


    moveThroughGeodeticSinusoidalSmooth(positions, quaternions, timeTotal, adaptNearFar, cameraMovedCallback) {
        const curve = new THREE.CatmullRomCurve3(positions);
        return this.moveThroughGeodeticSinusoidal(curve.getPoints(Math.max(positions.length, Math.min(1000, positions.length * 10))), quaternions, timeTotal, adaptNearFar, cameraMovedCallback);
    }

    moveToGeodeticSinusoidal(destination, destinationOrientation, timeTotal, adaptNearFar, cameraMovedCallback) {
        return this.moveThroughGeodeticSinusoidal(
            [this.cartesianToLonlatheightSFCT(this.map.camera.position, new THREE.Vector3()), destination],
            [this.map.camera.quaternion, destinationOrientation],
            timeTotal,
            adaptNearFar,
            cameraMovedCallback
        )
    }
    /**
     * 
     * @param {Vector3[]} positions in lon lat height
     * @param {Vector3[]} quaternions 
     * @param {long} timeTotal 
     * @param {*} cameraMovedCallback 
     * @returns 
     */
    moveThroughGeodeticSinusoidal(positions, quaternions, timeTotal, adaptNearFar, cameraMovedCallback) {

        const self = this;
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            if (self.interval) {
                clearInterval(self.interval);
            }
            self.interval = setInterval(() => {
                const currentTime = Date.now() - startTime;
                const percentageTime = currentTime / timeTotal;
                const overallPercentage = (Math.sin(((percentageTime) * Math.PI) - (Math.PI / 2)) + 1) / 2;
                if (percentageTime >= 1.0) {
                    if (positions.length > 0) self.lonlatheightToCartesianSFCT(positions[positions.length - 1], self.map.camera.position);
                    if (quaternions.length > 0) self.map.camera.setRotationFromQuaternion(quaternions[quaternions.length - 1]);

                    self.map.camera.getWorldDirection(tempPointA).normalize();
		            tempPointB.copy(self.map.planet.center).sub(self.map.camera.position);

		            tempPointC.crossVectors(tempPointA, tempPointB);
		            self.map.camera.up.crossVectors(tempPointA, tempPointC).normalize();

                    clearInterval(self.interval);
                    if (adaptNearFar) self.map.resetCameraNearFar();
                    if (cameraMovedCallback) cameraMovedCallback();
                    resolve();
                }
                if (positions.length == 1) {
                    self.lonlatheightToCartesianSFCT(positions[positions.length - 1], self.map.camera.position);
                    
                } else if (positions.length > 1) {
                    let percentage = overallPercentage * (positions.length - 1);
                    let previousIndex = Math.floor(percentage);
                    percentage -= previousIndex;
                    self.map.camera.position.lerpVectors(positions[previousIndex], positions[previousIndex + 1], percentage);
                    self.lonlatheightToCartesianSFCT(self.map.camera.position, self.map.camera.position);
                    
                }

                if (quaternions.length == 1) {
                    self.map.camera.setRotationFromQuaternion(quaternions[quaternions.length - 1]);

                    self.map.camera.getWorldDirection(tempPointA).normalize();
		            tempPointB.copy(self.map.planet.center).sub(self.map.camera.position);

		            tempPointC.crossVectors(tempPointA, tempPointB);
		            self.map.camera.up.crossVectors(tempPointA, tempPointC).normalize();
                } else if (quaternions.length > 1) {
                    let percentage = overallPercentage * (quaternions.length - 1);
                    let previousIndex = Math.floor(percentage);
                    percentage -= previousIndex;

                    tempQuaternion.slerpQuaternions(quaternions[previousIndex], quaternions[previousIndex + 1], percentage);
                    
                    self.map.camera.setRotationFromQuaternion(tempQuaternion);

                    self.map.camera.getWorldDirection(tempPointA).normalize();
		            tempPointB.copy(self.map.planet.center).sub(self.map.camera.position);
		            tempPointC.crossVectors(tempPointA, tempPointB);
		            self.map.camera.up.crossVectors(tempPointA, tempPointC).normalize();
                    self.map.camera.updateProjectionMatrix();
                }
                if (adaptNearFar) self.map.resetCameraNearFar();
                if (cameraMovedCallback) cameraMovedCallback();
            }, 20);
        });


    }
    lonlatheightToCartesianSFCT(point, sfct) {
        const scalar = this.map.planet.radius + point.z;
        sfct.set(-(Math.cos(point.y) * Math.cos(point.x)), Math.sin(point.y), Math.cos(point.y) * Math.sin(point.x))
        sfct.multiplyScalar(scalar);
    }
    cartesianToLonlatheightSFCT(position, sfct) {
        sfct.copy(position).sub(this.map.planet.center);
        let height = sfct.length() - this.map.planet.radius;
        sfct.normalize();
        var lat = Math.asin(sfct.y);
        var lon = Math.atan2(sfct.z, -sfct.x);
        sfct.set(lon, lat, height);
        return sfct;
    }
    cancel(){
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}