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
class PanController /*extends EventDispatcher*/ {
	constructor(camera, domElement, map) {
		this.dom = domElement;
		this.planet = map.planet;
		this.map = map;
		this.camera = camera;
		this.isMouseDown = false;
		this.mouseDownLocation = [];
		this.next = null;
	}

	event(eventName, e){
		let self = this;
		switch (eventName){
			case "mousedown" : if(e.which ==1) {self.mouseDown(e); break;}
			case "mouseup" : if(e.which ==1) {self.mouseUp(e); break;}
			case "mousemove" : self.mouseMove(e);
			default : if(!!self.next){ self.next.event(eventName, e); }
		}
		
		
	}
	mouseDown(e){
		this.isMouseDown = true;
		this.mouseDownLocation = [e.x, e.y];
	}
	mouseUp(e){
		this.isMouseDown = false;
		this.mouseDownLocation = [e.x, e.y];
	}
	mouseMove(e){
		if (!!this.isMouseDown) {
			this.pan(this.mouseDownLocation, [e.x, e.y]);
		}
	}
	
	pan(panStart, panEnd) {
		
		this.calculateMouseLocationOnPlanet(panStart[0], panStart[1], tempPointC);
		tempPointA.copy(this.camera.position).sub(this.planet.position).normalize();
		pointer1 = tempPointC.distanceTo(this.camera.position)* 0.002;
		pointer2 = (panEnd[0] - panStart[0]) * pointer1;
		pointer3 = (panEnd[1] - panStart[1]) * pointer1;

		panStart[0] = panEnd[0];
		panStart[1] = panEnd[1];

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

	append(aController){
		if(!!this.next){
			this.next.append(aController);
		}else{
			this.next = aController;
		}
	}
}

export { PanController };
