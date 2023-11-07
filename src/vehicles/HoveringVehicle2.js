import * as THREE from 'three';
import { VerletSystem } from '../physics/VerletSystem';


class HoveringVehicle {

    constructor(properties) {
        this.planet = properties.planet;
        this.gravity = properties.gravity ? properties.gravity : 9.81;
        this.verletSystem = new VerletSystem(this.planet);
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempVector3 = new THREE.Vector3();
        this.object3D = properties.object3D;
        this.object3D.updateMatrixWorld(true)
        
        this.hoverHeight = properties.hoverHeight;
        this.vehicleRight = new THREE.Vector3(1, 0, 0);
        this.vehicleForward = new THREE.Vector3(0, 0, 1);
        this.initializePointsAndNeighborConstraints();
        this.initializeforces();
        this.movement = new THREE.Vector3();
        this.matrix = new THREE.Matrix4();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
    }


    applyMovement(delta){
        const self = this;
        self.movementForce.set(0,0,0);
        if(self.moveForward){
            self.tempVector.copy(self.vehicleForward).multiplyScalar(25);
            self.movementForce.add(self.tempVector);
        }
        if(self.moveBackward){
            self.tempVector.copy(self.vehicleForward).multiplyScalar(-25);
            self.movementForce.add(self.tempVector);
        }
        if(self.moveRight){
            self.tempVector.copy(self.vehicleRight).multiplyScalar(8);
            self.movementForce.add(self.tempVector);
        }
        if(self.moveLeft){
            self.tempVector.copy(self.vehicleRight).multiplyScalar(-8);
            self.movementForce.add(self.tempVector);
        }
        for(let i = 0; i<self.corners.length; i++){
            if (i >1) {
                self.tempVector3.copy(self.movementForce).multiplyScalar(delta);
                self.corners[i].add(self.tempVector3);
            }
        }
        
    }
    initializeforces() {
        const self = this;
        self.movementForce = new THREE.Vector3();
        self.previousDelta = 0;
        self.applyForces = (delta) => {
            
            const pointsLLH = self.corners.map(position => self.planet.llhToCartesian.inverse(position));
            const terrainHeights = pointsLLH.map(llh => self.planet.getTerrainElevation({x:llh.x*0.0174532925, y:llh.y*0.0174532925}));
            for (let i = 0; i < terrainHeights.length; i++) {
                if(self.previousDelta){
                    self.tempVector.subVectors(self.corners[i], self.previousCorners[i]);
                    //self.corners[i].multiplyScalar(2).sub(self.previousCorners[i])
                    self.tempVector.multiplyScalar((delta/self.previousDelta)*0.99);
                    self.previousCorners[i].copy(self.corners[i]);
                    self.corners[i].add(self.tempVector);
                    //console.log(self.tempVector)
                }
            }
            for (let i = 0; i < terrainHeights.length; i++) {
                
                self.previousDelta = delta;

                self.tempVector.copy(self.corners[i]).negate().normalize().multiplyScalar(delta * self.gravity);
                const heightAboveGround = pointsLLH[i].z - terrainHeights[i];
                if(heightAboveGround<self.hoverHeight*2){

                    heightAboveGround/self.hoverHeight;
                    const multiplier = (heightAboveGround / self.hoverHeight) - 2;
                    self.tempVector2.copy(self.object3D.up).multiplyScalar(-self.tempVector.length()).multiplyScalar(multiplier);
                    self.tempVector.add(self.tempVector2);
                }
                 if(self.tempVector.length()>0.1){
                     self.tempVector.normalize().multiplyScalar(0.1);
                 }
                //console.log(this.tempVector);
                //tempVector2.copy(self.object3D.up).multiplyScalar(Math.min(1.5,Math.exp(-heightAboveGround + self.hoverHeight)) * self.gravity * delta2);
                self.corners[i].add(self.tempVector);
                
            }
        }

    }
    initializePointsAndNeighborConstraints() {
        const self = this;
        const boundingSphere = new THREE.Sphere();

        self.object3D.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                geometry.computeBoundingSphere();
                const sphere = geometry.boundingSphere.clone().applyMatrix4(child.matrixWorld);
                boundingSphere.union(sphere);
            }
        });
        self.object3D.updateMatrixWorld(true);
        //self.hoverHeight+=boundingSphere.radius;
        self.object3D.getWorldDirection(self.vehicleForward).normalize().multiplyScalar(boundingSphere.radius);
        self.vehicleRight.crossVectors(self.vehicleForward, self.object3D.position).normalize().multiplyScalar(boundingSphere.radius);
        self.corners = [];
        self.corners.push(self.object3D.position.clone().sub(self.vehicleRight).sub(self.vehicleForward));
        self.corners.push(self.object3D.position.clone().add(self.vehicleRight).sub(self.vehicleForward));
        self.corners.push(self.object3D.position.clone().sub(self.vehicleRight).add(self.vehicleForward));
        self.corners.push(self.object3D.position.clone().add(self.vehicleRight).add(self.vehicleForward));
        
        self.verletSystem.addPoints(self.corners, true);
        

        self.applyNeighborConstraints = () => {
            const pointsLLH = self.corners.map(position => self.planet.llhToCartesian.inverse(position));
            const terrainHeights = pointsLLH.map(llh => self.planet.getTerrainElevation({x:llh.x*0.0174532925, y:llh.y*0.0174532925}));
            
            for (let i = 0; i < constraints.length; i++) {
                
                self.tempVector.subVectors(self.corners[constraints[i][0]], self.corners[constraints[i][1]]);
                const distance = self.tempVector.length();
                self.tempVector.normalize().multiplyScalar((distance-constraints[i][2])*0.5);
                self.corners[constraints[i][0]].sub(self.tempVector);
                self.corners[constraints[i][1]].add(self.tempVector);
                
            }
             for (let i = 0; i < self.corners.length; i++) {
                const heightAboveGround = pointsLLH[i].z - terrainHeights[i];
                if(heightAboveGround<0){
                    self.tempVector.copy(self.object3D.up).normalize().multiplyScalar(Math.max(-0.1,-heightAboveGround));
                    self.corners[i].add(self.tempVector);
                } 
            }
            
            // compute vehicle orientation
            self.vehicleRight.subVectors(self.corners[1], self.corners[0]);
            self.tempVector2.subVectors(self.corners[2], self.corners[0]);
            self.tempVector3.crossVectors(self.tempVector2, self.vehicleRight);
            self.vehicleForward.copy(self.tempVector2);
            self.tempVector.subVectors(self.corners[2], self.corners[3]);
            self.tempVector2.subVectors(self.corners[1], self.corners[3]);
            self.vehicleForward.sub(self.tempVector2);
            
            self.vehicleRight.normalize();
            self.vehicleForward.normalize();

            self.object3D.position.copy(self.corners[0]).add(self.corners[1]).add(self.corners[2]).add(self.corners[3]).divideScalar(4);

            self.tempVector.copy(this.vehicleForward).add(self.object3D.position);
            self.tempVector3.crossVectors(self.vehicleRight, self.vehicleForward);
            self.object3D.up.lerp(self.tempVector3, 0.01).normalize();
            self.object3D.lookAt(self.tempVector);

            
        };

    }

    update(timeStep) {
        const self = this;
        self.applyForces(timeStep);
        self.applyMovement(timeStep);
        self.applyNeighborConstraints();
    }
} export { HoveringVehicle };