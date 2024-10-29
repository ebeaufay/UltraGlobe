import { Controller } from './Controller';
import * as THREE from 'three';

const tempPointA = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempPointC = new THREE.Vector3();
const tempPointD = new THREE.Vector3();
const tempPointE = new THREE.Vector3();

class RotateController extends Controller {
	constructor(camera, domElement, map) {
		super(camera, domElement, map);
		this.isMouseDown = false;
		this.mouseDownLocation;
		this.mouseLatest;
		this.mouseRayCast = new THREE.Vector3();
		this.touchIDs = [];
	}
	_handleEvent(eventName, e) {
		let self = this;

		switch (eventName) {
			case "mousedown": self.mouseDown(e); break;
			case "mouseup": self.mouseUp(e); break;
			case "mousemove": self.mouseMove(e); break;
			case "touchstart": self.touchStart(e); break;
			case "touchmove": self.touchMove(e); break;
			case "touchend": self.touchEnd(); break;
			case "touchcancel": self.touchEnd(); break;
		}
		super._handleEvent(eventName, e)

	}
	
	touchStart(e) {
		if (e.touches.length == 2) {
			this.touchIDs.push(e.touches[0].identifier);
			this.touchIDs.push(e.touches[1].identifier);
			this.isMouseDown = true;
			this.mouseDownLocation = [(e.touches[0].clientX+e.touches[1].clientX)*0.5, (e.touches[0].clientY+e.touches[1].clientY)*0.5];
			this.mouseLatest = [this.mouseDownLocation[0], this.mouseDownLocation[1]];
			this.map.screenPixelRayCast(this.mouseDownLocation[0], this.mouseDownLocation[1], this.mouseRayCast);
		} else {
			this.touchEnd();
		}
	}
	touchEnd() {
		this.touchIDs = [];
		this.isMouseDown = false;
	}
	touchMove(e) {
		if (e.touches.length == 2) {
			const tempX= (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
			const tempY= (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
			this.mouseLatest = [tempX, tempY];
		}
		else{
			this.touchEnd();
		}
	}

	mouseDown(e) {
		if (e.which == 3 || (e.which ==1 && e.ctrlKey)) {
			this.isMouseDown = true;
			this.mouseDownLocation = [e.x, e.y];
			this.mouseLatest = [e.x, e.y];
			this.map.screenPixelRayCast(e.x, e.y, this.mouseRayCast);
		}

	}
	mouseUp(e) {
		this.isMouseDown = false;
	}
	mouseMove(e) {
		if (!!this.isMouseDown && !!this.mouseRayCast) {
			this.mouseLatest = ([e.x, e.y])
		}

	}
	_update() {
		if (this.isMouseDown) {
			this.rotate(this.mouseDownLocation, this.mouseLatest);
		}
	}

	rotate(rotateStart, rotateEnd) {

		this.rotateX(rotateEnd[0] - rotateStart[0]);
		this.rotateY(rotateEnd[1] - rotateStart[1]);

		rotateStart[0] = rotateEnd[0];
		rotateStart[1] = rotateEnd[1];

		this.map.moveCameraAboveSurface();
		this.map.resetCameraNearFar(this.mouseRayCast);
		this.straighten();
	}

	straighten() {

        this.camera.getWorldDirection(tempPointD).normalize();

        tempPointE.crossVectors(this.camera.up.normalize(), tempPointD);
        tempPointD.add(this.camera.position);
        this.camera.lookAt(tempPointD);
        this.camera.up.crossVectors(tempPointD.sub(this.camera.position), tempPointE);
    }

	rotateX(rotateX) {


		tempPointA.copy(this.mouseRayCast).sub(this.planet.center).normalize(); //tempPointA is vector to surface mouse down
		rotateX *= 0.004;

		// rotate camera around the provided axis
		this.camera.position.sub(this.mouseRayCast).applyAxisAngle(tempPointA, rotateX).add(this.mouseRayCast);

		//rotate camera and make it's up axis align with planet normal

		this.camera.getWorldDirection(tempPointB).normalize();
		this.camera.up.applyAxisAngle(tempPointB, rotateX * tempPointB.dot(tempPointA));

		this.camera.getWorldDirection(tempPointB).normalize();
		tempPointB.applyAxisAngle(tempPointA, rotateX).add(this.camera.position);
		this.camera.lookAt(tempPointB);



	}

	rotateY(rotateY) {
		this.camera.getWorldDirection(tempPointA).normalize(); // tempPointA is lookAt direction vector
		tempPointB.crossVectors(this.camera.up, tempPointA).normalize(); // temp point B is rotation axis
		rotateY = - rotateY * 0.004;

		tempPointC.crossVectors(tempPointA, this.camera.up).normalize();
		tempPointD.copy(this.planet.center).sub(this.camera.position);
		let pitch = Math.atan2(tempPointE.crossVectors(tempPointD, tempPointA).dot(tempPointC), tempPointA.dot(tempPointD));

		if (pitch + rotateY < 0.01) {
			rotateY = 0.01 - pitch;
		}
		if (pitch + rotateY > 3.13) {
			rotateY = 3.13 - pitch;
		}

		this.camera.position.sub(this.mouseRayCast).applyAxisAngle(tempPointB, -rotateY).add(this.mouseRayCast);
		tempPointA.applyAxisAngle(tempPointB, -rotateY);


		this.camera.lookAt(tempPointC.copy(tempPointA).add(this.camera.position));
		this.camera.up.crossVectors(tempPointA, tempPointB);


		this.camera.getWorldDirection(tempPointA).normalize();
		tempPointB.copy(this.planet.center).sub(this.camera.position);

		tempPointC.crossVectors(tempPointA, tempPointB);
		this.camera.up.crossVectors(tempPointA, tempPointC);
	}


} export { RotateController }