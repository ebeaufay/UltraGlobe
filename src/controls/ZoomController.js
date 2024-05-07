import { Controller } from './Controller';
import * as THREE from 'three';

const toRadians = Math.PI / 180;
const tempPointA = new THREE.Vector3();
const tempPointB = new THREE.Vector3();
const tempPointC = new THREE.Vector3();
const tempPointD = new THREE.Vector3();
const tempPointE = new THREE.Vector3();
const tempPointF = new THREE.Vector3();
const tempPointG = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const lonlat = new THREE.Vector2();
var pointer1;
var pointer2;
var pointer3;
var pointer4;
var pointer5;

var wgs84MajorMinorRatio = new THREE.Vector3(1,1,6378137.0 / 6356752.3142);

class ZoomController extends Controller {
    constructor(camera, domElement, map) {
        super(camera, domElement, map)

        this.isMouseDown = false;
        this.mouseDownLocation = [];
        this.mouseRayCast = new THREE.Vector3();
        this.zoom = 0;
        this.zoomLocation;
    }

    _handleEvent(eventName, e) {
        switch (eventName) {
            case "mousewheel": this.mouseWheel(e); break;
            case "touchstart": this.touchStart(e); break;
			case "touchmove": this.touchMove(e); break;
			case "touchend": this.touchEnd(e); break;
			case "touchcancel": this.touchEnd(e); break;
        }
        super._handleEvent(eventName, e)
    }

    touchStart(e) {
		if (e.touches.length == 2) {
			
			this.zoomLocation = {x:(e.touches[0].clientX+e.touches[1].clientX)*0.5, y:(e.touches[0].clientY+e.touches[1].clientY)*0.5};
			this.map.screenPixelRayCast(this.zoomLocation.x, this.zoomLocation.y, this.mouseRayCast);
            this.touchDist = Math.sqrt(Math.pow(e.touches[0].clientX-e.touches[1].clientX,2)+Math.pow(e.touches[0].clientY-e.touches[1].clientY,2))
		} else {
			this.touchEnd();
            
		}
	}
	touchEnd() {
		this.zoom = 0;
	}
	touchMove(e) {
        if(e.touches.length == 2){
            this.newDist = Math.sqrt(Math.pow(e.touches[0].clientX-e.touches[1].clientX,2)+Math.pow(e.touches[0].clientY-e.touches[1].clientY,2));
            this.zoom = -(this.newDist - this.touchDist)*0.1;
            
        }else{
            this.touchEnd();
        }
		
	}

    mouseWheel(e) {
        this.zoom += Math.sign(e.deltaY) * 4;
        this.zoomLocation = e;
        //this.map.screenPixelRayCast(e.x, e.y, this.mouseRayCast);
    }

    _update() {
        if (this.zoom != 0) {
            this.zoomAction();
            this.straighten();
            this.zoom = 0.0;
            //if(Math.abs(this.zoom)<0.01) this.zoom = 0.0;
            this.touchDist = this.newDist;
            this.map.moveCameraAboveSurface();
            this.map.resetCameraNearFar();
        }
    }

    zoomAction() {
        if(!this.zoomLocation) return;
        this.map.screenPixelRayCast(this.zoomLocation.x, this.zoomLocation.y, this.mouseRayCast);
        // calculate pointOnGlobe and distToGlobeSurface before zoom
        pointer1 = Math.tan(this.camera.fov * 0.5 * 0.0174533) * this.camera.near * 2;
        pointer2 = pointer1 / this.dom.clientHeight * this.dom.clientWidth;
        pointer2 = (((this.zoomLocation.x - this.dom.offsetLeft) / this.dom.clientWidth) - 0.5) * pointer2;
        pointer1 = (1 - ((this.zoomLocation.y - this.dom.offsetTop) / this.dom.clientHeight) - 0.5) * pointer1;

        tempPointA.set(pointer2, pointer1, - this.camera.near).normalize().applyEuler(this.camera.rotation).normalize();

        const distElevation = this.mouseRayCast.distanceTo(this.camera.position);
        if (!distElevation || distElevation <= 0) {
            this.simpleZoom(this.zoom);
            return;
        }
        const heightAboveEllipsoid = this.planet.llhToCartesian.inverse(this.mouseRayCast).z;

        tempPointC.copy(this.camera.position).add(tempPointB.copy(tempPointA).multiplyScalar(distElevation));


        tempPointE.copy(this.camera.position);

        //// Move camera forwards by zoom factor in the direction it's looking
        this.camera.getWorldDirection(tempPointB).normalize();
        this.camera.position.add(tempPointB.multiplyScalar(distElevation * (-this.zoom * 0.03)));

        ///// calculate target point after zoom

        pointer1 = this.distEllipsoid(this.camera.position, tempPointA, this.planet.radius + heightAboveEllipsoid)
        if (!pointer1 || pointer1 < 0) {
            return;
        }


        tempPointB.copy(this.camera.position).add(tempPointA.multiplyScalar(pointer1));
        quaternion.setFromUnitVectors(tempPointB.normalize(), tempPointA.copy(tempPointC).normalize());
        this.camera.position.applyQuaternion(quaternion);
        pointer3 = this.camera.position.distanceTo(tempPointC);

        /* if ((pointer3 <= distElevation && this.zoom > 0) || (pointer3 >= distElevation && this.zoom < 0)) {
            this.camera.position.copy(tempPointE);
            this.simpleZoom(this.zoom);
            return;
        } */


        this.camera.getWorldDirection(tempPointA).applyQuaternion(quaternion);
        tempPointB.crossVectors(tempPointA, this.camera.position);
        this.camera.lookAt(tempPointC.copy(this.camera.position).add(tempPointA));
        this.camera.up.crossVectors(tempPointB, tempPointA); // tempPointB = right t
    }
    

    simpleZoom(zoom) {
        this.camera.getWorldDirection(tempPointA).normalize();
        //this.planet.llhToCartesian.inverse(this.camera.position);
        pointer1 = this.planet.llhToCartesian.inverse(this.camera.position).z;
        this.camera.position.add(tempPointA.multiplyScalar(pointer1 * (-zoom * 0.01)));
        this.camera.position.add(tempPointA.normalize().multiplyScalar(zoom));
    }

    
    distEllipsoid(origin, direction, radius) {
        tempPointF.copy(origin).multiply(wgs84MajorMinorRatio);
        tempPointG.copy(direction).multiply(wgs84MajorMinorRatio).normalize();
        tempPointD.copy(tempPointF);
        pointer2 = tempPointG.dot(tempPointG);
        pointer3 = 2.0 * tempPointD.dot(tempPointG);
        pointer4 = tempPointD.dot(tempPointD) - radius * radius;
        pointer4 = pointer3 * pointer3 - 4 * pointer2 * pointer4;
        if (pointer4 < 0) {
            return -1.0;
        }
        else {
            tempPointD.copy(tempPointG).multiplyScalar((-pointer3 - Math.sqrt(pointer4)) / (2.0 * pointer2)).add(tempPointF);
            tempPointD.divide(wgs84MajorMinorRatio);
            return tempPointD.distanceTo(origin);
        }
    }

    straighten() {

        this.camera.getWorldDirection(tempPointD).normalize();

        tempPointE.crossVectors(this.camera.up.normalize(), tempPointD);
        tempPointD.add(this.camera.position);
        this.camera.lookAt(tempPointD);
        this.camera.up.crossVectors(tempPointD.sub(this.camera.position), tempPointE);
    }

} export { ZoomController }