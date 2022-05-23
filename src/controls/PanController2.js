import * as THREE from 'three';
import { Controller } from './Controller';

const tempPointA = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempPointC = new THREE.Vector3();
const tempPointD = new THREE.Vector3();
const tempPointE = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
var pointer1;
var pointer2;
var pointer3;
var pointer4;


class PanController2 extends Controller {
    constructor(camera, domElement, map) {
        super(camera, domElement, map);
        this.isMouseDown = false;
        this.mouseDownLocation = [];
        this.mouseRayCast = new THREE.Vector3();
    }
    _handleEvent(eventName, e) {
        let self = this;
        switch (eventName) {
            case "mousedown": self.mouseDown(e); break;
            case "mouseup": self.mouseUp(e); break;
            case "mousemove": self.mouseMove(e); break;
            case "touchstart": self.touchStart(e); break;
            case "touchmove": self.touchMove(e); break;
            case "touchend": self.touchEnd(e); break;
            case "touchcancel": self.touchEnd(e); break;
        }
        super._handleEvent(eventName, e);
    }

    touchStart(e){
        if(!this.touchId && e.touches.length == 1){
            this.touchId = e.changedTouches[0].identifier; 
            this.isMouseDown = true;
            this.mouseDownLocation = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
            this.mouseLatest = [e.changedTouches[0].clientX, e.changedTouches[0].clientY];
            this.map.screenPixelRayCast(e.changedTouches[0].clientX, e.changedTouches[0].clientY, this.mouseRayCast);
        }else{
            delete this.touchID; 
            this.isMouseDown = false;
        }
    }
    touchEnd(e){
        for (let index = 0; index < e.changedTouches.length; index++) {
            const touch = e.changedTouches[index];
            if(this.touchId == touch.identifier){
                delete this.touchID; 
                this.isMouseDown = false;
                break;
            }
        }
        
    }
    touchMove(e){
        for (let index = 0; index < e.changedTouches.length; index++) {
            const touch = e.changedTouches[index];
            if(this.touchId == touch.identifier){
                this.mouseLatest = [touch.clientX, touch.clientY];
                break;
            }
        }
    }
    
    mouseDown(e) {
        if (e.which == 1 || e.which == "all") {
            this.isMouseDown = true;
            this.mouseDownLocation = [e.x, e.y];
            this.mouseLatest = [e.x, e.y];
            this.map.screenPixelRayCast(e.x, e.y, this.mouseRayCast);
        }
    }
    mouseUp(e) {
        if (e.which == 1 || e.which == "all") {
            this.isMouseDown = false;
        }
    }
    mouseMove(e) {
        if (!!this.isMouseDown) {
            this.mouseLatest = [e.x, e.y];
        }
    }

    _update() {
        if (!this.isMouseDown) {
            return;
        }
        tempPointC.copy(this.mouseRayCast);
        //this.calculateMouseLocationOnPlanet(this.mouseDownLocation[0], this.mouseDownLocation[1], tempPointC);
        tempPointA.copy(this.camera.position).sub(this.planet.position).normalize();
        pointer1 = tempPointC.distanceTo(this.camera.position) * 0.002;
        pointer2 = (this.mouseLatest[0] - this.mouseDownLocation[0]) * pointer1;
        pointer3 = (this.mouseLatest[1] - this.mouseDownLocation[1]) * pointer1;

        this.mouseDownLocation[0] = this.mouseLatest[0];
        this.mouseDownLocation[1] = this.mouseLatest[1];

        this.camera.getWorldDirection(tempPointD).normalize();

        tempPointE.crossVectors(this.camera.up.normalize(), tempPointD);
        tempPointB.crossVectors(tempPointE, this.camera.position).normalize();

        pointer1 = this.planet.center.distanceTo(this.camera.position);

        this.camera.position.set(
            this.camera.position.x + pointer2 * tempPointE.x + pointer3 * tempPointB.x,
            this.camera.position.y + pointer2 * tempPointE.y + pointer3 * tempPointB.y,
            this.camera.position.z + pointer2 * tempPointE.z + pointer3 * tempPointB.z,
        );

        this.camera.position.sub(this.planet.center).normalize().multiplyScalar(pointer1).add(this.planet.center);

        tempPointB.copy(this.camera.position).sub(this.planet.position).normalize();

        quaternion.setFromUnitVectors(tempPointA, tempPointB);

        tempPointD.applyQuaternion(quaternion).add(this.camera.position);
        this.camera.lookAt(tempPointD);
        tempPointE.applyQuaternion(quaternion);
        this.camera.up.crossVectors(tempPointD.sub(this.camera.position), tempPointE);

        this.map.moveCameraAboveSurface();
        this.map.resetCameraNearFar();
    }



} export { PanController2 }