import { Controller } from './Controller';
import * as THREE from 'three';

const Up = new THREE.Vector3();
const tempPointD = new THREE.Vector3();
const tempPointE = new THREE.Vector3();

//A controller that looks with the mouse
class LookAtController extends Controller {
	constructor(camera, domElement, map, showUI = true, active = false) {
		super(camera, domElement, map);
		this.targetCamera = this.camera.clone();
		if (!map.isMobile) {
			domElement.addEventListener('click', () => {
				domElement.requestPointerLock();
			});
		}
	}
	_dispose() {
		this.deactivate();
		super._dispose();
	}
	activate() {
		this.dom.requestPointerLock();
	}
	deactivate() {
		document.exitPointerLock();
	}
	_handleEvent(eventName, e) {
		let self = this;

		switch (eventName) {

			case "mousemove": self.mouseMove(e); break;
			case "touchstart": self.touchStart(e); break;
			case "touchmove": self.touchMove(e); break;
			case "touchend": self.touchEnd(e); break;
		}
		super._handleEvent(eventName, e)

	}
	touchEnd(e) {
		const self = this;
		if (e.touches.length > 0) {
			let firstTouch = true;
			e.touches.forEach(touch => {
				if (self.touchID == touch.identifier) {
					firstTouch = false;
				}
			});
			if (firstTouch) {
				this.touchID = undefined;
				this.mousePrevious = undefined;
				this.mouseLatest = undefined
			}
		} else {
			this.touchID = undefined;
			this.mousePrevious = undefined;
			this.mouseLatest = undefined
		}

	};
	touchStart(e) {
		if (e.touches.length == 1) {
			this.touchID = e.touches[0].identifier;
		}
	}

	touchMove(e) {
		if (!this.mousePrevious) {
			this.mousePrevious = [e.touches[0].clientX, e.touches[0].clientY];
		}
		else {
			this._updateTarget([this.mousePrevious[0] - e.touches[0].clientX, -(this.mousePrevious[1] - e.touches[0].clientY)]);
			this.mousePrevious = [e.touches[0].clientX, e.touches[0].clientY];
		}
	}


	mouseMove(e) {
		if (document.pointerLockElement === this.dom) {

			this._updateTarget([e.movementX || 0, event.movementY || 0]);
		}
	}
	_updateTarget(movement) {
		this.targetCamera.position.copy(this.camera.position);
		this.targetCamera.getWorldDirection(tempPointD).normalize();
		Up.copy(this.targetCamera.position).normalize();
		tempPointE.crossVectors(Up, tempPointD);
		tempPointD.applyAxisAngle(Up, -movement[0] * 0.01);
		tempPointD.applyAxisAngle(tempPointE, movement[1] * 0.01);

		// avoid gimbal lock
		const maxPitch = THREE.MathUtils.degToRad(85);
		const currentPitch = Math.asin(tempPointD.dot(Up));
		if (currentPitch > maxPitch) {
			tempPointD.applyAxisAngle(tempPointE, -maxPitch + currentPitch);
		} else if (currentPitch < -maxPitch) {
			tempPointD.applyAxisAngle(tempPointE, maxPitch + currentPitch);
		}

		this.targetCamera.up.crossVectors(tempPointD, tempPointE);
		this.targetCamera.lookAt(tempPointD.add(this.targetCamera.position));
	}

	_update() {
		this.camera.quaternion.slerp(this.targetCamera.quaternion, 0.9);
		this.camera.up.copy(this.targetCamera.up);
		this.straighten(this.camera);
	}




	straighten(camera) {



		camera.getWorldDirection(tempPointD).normalize();

		tempPointE.crossVectors(camera.up.normalize(), tempPointD);

		camera.up.crossVectors(tempPointD, tempPointE).normalize();
		tempPointD.add(camera.position);
		camera.lookAt(tempPointD);
		camera.updateProjectionMatrix();
	}




} export { LookAtController }