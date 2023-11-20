// @ts-nocheck
import * as THREE from 'three';
import { Vector3 } from 'three';

const tempVector = new Vector3();
const tempVector2 = new Vector3();
/**
 * A system of points with constraints resolved through verlet integration. 
 * There is an implicit constraint for all points against the planet surface when a planet is passed to the constructor
 * as well as a gravity constraint when a planet is provided that defaults to a downward force of 9.81 m/s
 * @private
 */
class VerletSystem {
    constructor(planet, gravity = 9.81) {
        this.planet = planet;
        this.points = [];
        this.previousPoints = [];
        this.pointToPointConstraints = [];
        this.externalForces;
        this.gravity = gravity;
        this.previousDelta = 0;
    }

    /**
     * add an array of points (THREE.Vector3) to the system.
     * if generateConstraints is set to true, a hard distance constraint (min & max) will be added between every single point pair  
     */
    addPoints(newPoints, generateConstraints) {
        this.points.push(...newPoints);
        this.previousPoints.push(...newPoints.map(v3 => v3.clone()));

        if(generateConstraints){
            const constraints = [];
            for(let i = 0; i<this.points.length-1; i++){
                for(let j = i+1; j<this.points.length; j++){
                    constraints.push([i,j,this.points[i].distanceTo(this.points[j]), 2])
                }
            }
            this.addPointToPointDistanceConstraints(constraints)
        }
    }

    /**
     * set (replace) external forces as a list of functions to apply a force and an array of point indexes the force is to be applied on.
     * e.g.: [[applyForce(currentPosition), [0,2,5]], ...]
     */
    setForces(externalForces) {
        this.externalForces = externalForces;
    }

    applyForces(delta) {
        // momentum (things that move keep moving)
        if (this.previousDelta) {
            for (let i = 0; i < this.previousPoints.length; i++) {
                tempVector.subVectors(this.points[i], this.previousPoints[i]);
                tempVector.multiplyScalar((delta / this.previousDelta));
                this.previousPoints[i].copy(this.points[i]);
                this.points[i].add(tempVector);
            }
        }
        this.previousDelta = delta;

        // gravity acceleration
        if (this.planet) {
            for (let i = 0; i < this.points.length; i++) {
                tempVector.subVectors(this.planet.center, this.points[i]).normalize().multiplyScalar(delta * this.gravity);
                this.points[i].add(tempVector);
            }
        }

        if(this.externalForces){

            this.externalForces.forEach(element => {
                for (let i = 0; i < element[1].length; i++) {
                    element[0](this.points[element[1][i]]);
                }
            });
        }
    }
    /**
     * 
     * @param {Number[]} pointDistanceConstraints an array where each element is an array of 4 element with the index of the 2 points involved the desired 
     * distance between them and wether the constraint is on max distance, minDistance or both (0,1,2);
     * 
     * [[0,1,51,0]] // a single distance constraint that asks for a maximum distance of 51 between points 0 and 1
     */
    addPointToPointDistanceConstraints(pointDistanceConstraints) {
        this.pointToPointConstraints.push(...pointDistanceConstraints);
    }

    resolveConstraints() {
        const self = this;
        if (self.planet) {
            const pointsLLH = self.points.map(position => self.planet.llhToCartesian.inverse(position));
            const terrainHeights = pointsLLH.map(llh => self.planet.getTerrainElevation({ x: llh.x * 0.0174532925, y: llh.y * 0.0174532925 }));
            for (let i = 0; i < self.points.length; i++) {
                const heightAboveGround = pointsLLH[i].z - terrainHeights[i];
                if (heightAboveGround < 0) {
                    tempVector.copy(self.points[i]).normalize().multiplyScalar(-heightAboveGround);
                    self.points[i].add(tempVector);
                }
            }
        }

        for (let i = 0; i < self.pointToPointConstraints.length; i++) {

            tempVector.subVectors(self.points[self.pointToPointConstraints[i][0]], self.points[self.pointToPointConstraints[i][1]]);
            const distance = tempVector.length();
            if (self.pointToPointConstraints[i][3] == 2 ||
                (self.pointToPointConstraints[i][3] == 0 && distance < self.pointToPointConstraints[i][2]) ||
                (self.pointToPointConstraints[i][3] == 1 && distance < self.pointToPointConstraints[i][2])) {
                tempVector.normalize().multiplyScalar((distance - self.pointToPointConstraints[i][2]) * 0.5);
                self.points[self.pointToPointConstraints[i][0]].sub(tempVector);
                self.points[self.pointToPointConstraints[i][1]].add(tempVector);
            }


        }

        
    };
    update(delta){
        this.applyForces(delta);
        this.resolveConstraints();
    }
} export { VerletSystem }