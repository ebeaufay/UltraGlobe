import * as THREE from 'three';

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
var pointer5;
class ZoomController /*extends EventDispatcher*/ {
	constructor(camera, domElement, planet) {
		this.dom = domElement;
		this.planet = planet;
		this.camera = camera;
		this.isMouseDown = false;
		this.mouseDownLocation = [];
		this.next = null;

	}

	event(eventName, e) {
		let self = this;
		switch (eventName) {
			case "mousewheel": self.zoomWheel(e.deltaY, e.x, e.y); break;
			default: if (!!self.next) self.next.event(eventName, e);
		}
	}

	zoomWheel(zoom, x, y) {
	
		// calculate pointOnGlobe and distToGlobeSurface before zoom
		pointer1 = Math.tan(this.camera.fov * 0.5 * 0.0174533) * this.camera.near * 2;
		pointer2 = pointer1 / this.dom.clientHeight * this.dom.clientWidth;
		pointer2 = ((x / this.dom.clientWidth) - 0.5) * pointer2;
		pointer1 = (1 - (y / this.dom.clientHeight) - 0.5) * pointer1;

		tempPointA.set(pointer2, pointer1, - this.camera.near).normalize().applyEuler(this.camera.rotation).normalize();

		pointer1 = this.distSphere(this.planet.center, this.planet.radius, this.camera.position, tempPointA)

		if (!pointer1 || pointer1 < 0) {
			this.simpleZoom(zoom);
			this.resetCameraNearFar();
			return;
		}
		tempPointC.copy(this.camera.position).add(tempPointB.copy(tempPointA).multiplyScalar(pointer1));
		
		
		tempPointE.copy(this.camera.position);
		pointer5 = this.camera.position.distanceTo(tempPointC);
		
		//// Move camera forwards by zoom factor in the direction it's looking
		this.camera.getWorldDirection(tempPointB).normalize();
		this.camera.position.add(tempPointB.multiplyScalar(pointer1*(-zoom*0.0003)));

		///// calculate target point after zoom

		pointer1 = this.distSphere(this.planet.center, this.planet.radius, this.camera.position, tempPointA)

		if (!pointer1 || pointer1 < 0) {
			//point not on globe after rotation
			this.resetCameraNearFar();
			return;
		}
		

		tempPointB.copy(this.camera.position).add(tempPointA.multiplyScalar(pointer1));
		quaternion.setFromUnitVectors(tempPointB.sub(this.planet.center).normalize(), tempPointA.copy(tempPointC).sub(this.planet.center).normalize());
		this.camera.position.applyQuaternion(quaternion);
		pointer3 = this.camera.position.distanceTo(tempPointC);
		
		if((pointer3<=pointer5 && zoom>0) || (pointer3>=pointer5 && zoom<0)){
			this.camera.position.copy(tempPointE);
			this.simpleZoom(zoom);
			this.resetCameraNearFar();
			return;
		}
		

		this.camera.getWorldDirection(tempPointA).applyQuaternion(quaternion);
		tempPointB.crossVectors(tempPointA, this.camera.position);
		this.camera.lookAt(tempPointC.copy(this.camera.position).add(tempPointA));
		this.camera.up.crossVectors(tempPointB, tempPointA);
		this.resetCameraNearFar();
	}

	simpleZoom(zoom){
		this.camera.getWorldDirection(tempPointA).normalize();
		pointer1 = this.camera.position.distanceTo(this.planet.center) - this.planet.radius;
		this.camera.position.add(tempPointA.multiplyScalar(pointer1*(-zoom*0.0003)));
		this.camera.position.add(tempPointA.normalize().multiplyScalar(zoom));
	}

	distSphere(center, radius, origin, direction) {
		tempPointD.copy(origin).sub(center);
		pointer2 = direction.dot(direction);
		pointer3 = 2.0 * tempPointD.dot(direction);
		pointer4 = tempPointD.dot(tempPointD) - radius * radius;
		pointer4 = pointer3 * pointer3 - 4 * pointer2 * pointer4;
		if (pointer4 < 0) {
			return -1.0;
		}
		else {
			return (-pointer3 - Math.sqrt(pointer4)) / (2.0 * pointer2);
		}
	}

	resetCameraNearFar() {
		pointer1 = this.planet.center.distanceTo(this.camera.position) - this.planet.radius;
		this.camera.near = pointer1 * 0.1;
		this.camera.far = Math.sqrt(2 * this.planet.radius * pointer1 + pointer1 * pointer1) * 2;
		this.camera.updateProjectionMatrix();
	}

	append(aController) {
		if (!!this.next) {
			this.next.append(aController);
		} else {
			this.next = aController;
		}
	}
}

export { ZoomController };
