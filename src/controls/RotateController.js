import * as THREE from 'three';

const tempPointA = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempPointC = new THREE.Vector3();
const tempPointD = new THREE.Vector3();
const tempPointE = new THREE.Vector3();
var pointer1;
var pointer2;
var pointer3;
var pointer4;

class RotateController /*extends EventDispatcher*/ {
	constructor(camera, domElement, planet) {
		this.dom = domElement;
		this.planet = planet;
		this.camera = camera;
		this.isMouseDown = false;
		this.mouseDownLocation = [];
		this.next = null;
		this.mouseDownLocationOnPlanetSurface = new THREE.Vector3();


	}

	event(eventName, e) {
		let self = this;
		if (e.which == 3) {
			switch (eventName) {
				case "mousedown": self.mouseDown(e); break;
				case "mouseup": self.mouseUp(e); break;
				case "mousemove": self.mouseMove(e); break;
			}
		} else if (!!self.next) {
			self.next.event(eventName, e)
		}

	}
	mouseDown(e) {
		this.isMouseDown = true;
		this.mouseDownLocation = [e.x, e.y];
		this.calculateMouseLocationOnPlanet(e.x, e.y, this.mouseDownLocationOnPlanetSurface);
	}
	mouseUp(e) {
		this.isMouseDown = false;
		this.mouseDownLocation = [e.x, e.y];
	}
	mouseMove(e) {
		if (!!this.isMouseDown && !!this.mouseDownLocationOnPlanetSurface) {
			this.rotate(this.mouseDownLocation, [e.x, e.y]);
		}
	}

	rotate(rotateStart, rotateEnd) {

		pointer1 = (rotateEnd[0] - rotateStart[0]);
		this.rotateX(pointer1);
		pointer1 = (rotateEnd[1] - rotateStart[1]);
		this.rotateY(pointer1);

		rotateStart[0] = rotateEnd[0];
		rotateStart[1] = rotateEnd[1];

		this.resetCameraNearFar();
	}

	rotateX(rotateX) {


		tempPointA.copy(this.mouseDownLocationOnPlanetSurface).sub(this.planet.center).normalize();
		rotateX *= 0.004;
		this.camera.position.sub(this.mouseDownLocationOnPlanetSurface).applyAxisAngle(tempPointA, rotateX).add(this.mouseDownLocationOnPlanetSurface);

		this.camera.getWorldDirection(tempPointB).normalize();
		tempPointC.crossVectors(this.camera.up, tempPointB);

		tempPointB.applyAxisAngle(tempPointA, rotateX).add(this.camera.position);
		this.camera.lookAt(tempPointB);

		this.camera.getWorldDirection(tempPointB).normalize();
		tempPointC.crossVectors(tempPointB, tempPointA.copy(this.camera.position).sub(this.planet.center).normalize());
		this.camera.up.crossVectors(tempPointC, tempPointB);
		
		tempPointC.crossVectors(tempPointB, this.camera.up);
		this.camera.lookAt(tempPointB.add(this.camera.position));
		this.camera.up.crossVectors(tempPointB.normalize(), tempPointC);
	}

	rotateY(rotateY) {
		this.camera.getWorldDirection(tempPointA).normalize();
		tempPointB.crossVectors(this.camera.up, tempPointA).normalize();
		
		rotateY = - rotateY * 0.004;
		
		tempPointC.crossVectors(tempPointA, this.camera.up).normalize();
		tempPointD.copy(this.planet.center).sub(this.camera.position);
		let pitch = Math.atan2(tempPointE.crossVectors(tempPointD, tempPointA).dot(tempPointC), tempPointA.dot(tempPointD));
		
		if(pitch + rotateY < 0.01){
			rotateY =  0.01 - pitch;
		} 
		if(pitch + rotateY > 1.56){
			rotateY =  1.56 - pitch;
		} 
		this.camera.position.sub(this.mouseDownLocationOnPlanetSurface).applyAxisAngle(tempPointB, -rotateY).add(this.mouseDownLocationOnPlanetSurface);


		tempPointA.applyAxisAngle(tempPointB, -rotateY);
		tempPointC.crossVectors(tempPointA, this.camera.up);
		this.camera.lookAt(tempPointA.add(this.camera.position));
		this.camera.up.crossVectors(tempPointA.normalize(), tempPointC);


	}


	calculateMouseLocationOnPlanet(x, y, sideEffect) {

		pointer1 = Math.tan(this.camera.fov * 0.5 * 0.0174533) * this.camera.near * 2;
		pointer2 = pointer1 / this.dom.clientHeight * this.dom.clientWidth;
		pointer2 = ((x / this.dom.clientWidth) - 0.5) * pointer2;
		pointer1 = (1 - (y / this.dom.clientHeight) - 0.5) * pointer1;

		tempPointA.set(pointer2, pointer1, - this.camera.near).normalize().applyEuler(this.camera.rotation).normalize();

		pointer1 = this.distSphere(this.planet.center, this.planet.radius, this.camera.position, tempPointA)

		if (!!pointer1 && pointer1 > 0) {
			sideEffect.copy(this.camera.position).add(tempPointA.multiplyScalar(pointer1));
			return;
		}
		this.camera.getWorldDirection(tempPointB).normalize();
		pointer1 = this.distSphere(this.planet.center, this.planet.radius, this.camera.position, tempPointB);
		if (!!pointer1 && pointer1 > 0) {
			sideEffect.copy(this.camera.position).add(tempPointB.multiplyScalar(pointer1));
		}
		// else, the camera forward vector doesn't touch the planet's MSE surface. Just keep the last known position
	}
	distSphere(center, radius, origin, direction) {
		tempPointB.copy(origin).sub(center);
		pointer1 = direction.dot(direction);
		pointer2 = 2.0 * tempPointB.dot(direction);
		pointer3 = tempPointB.dot(tempPointB) - radius * radius;
		pointer4 = pointer2 * pointer2 - 4 * pointer1 * pointer3;
		if (pointer4 < 0) {
			return -1.0;
		}
		else {
			return (-pointer2 - Math.sqrt(pointer4)) / (2.0 * pointer1);
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

export { RotateController };
