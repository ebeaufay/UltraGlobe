import * as THREE from 'three';
import { Controller } from './Controller';

class SelectController extends Controller {
    constructor(camera, domElement, map) {
        super(camera, domElement, map);
    }

    _handleEvent(eventName, e) {
        let self = this;
        switch (eventName) {
            case "mousedown": self.mouseDown(e); break;
            case "mouseup": self.mouseUp(e); break;
            case "touchstart": self.touchStart(e); break;
			case "touchend": self.touchEnd(e); break;
        }
        super._handleEvent(eventName, e);
    }

    touchStart(e){
        if(!this.touchId && e.touches.length == 1){
            this.touchId = e.changedTouches[0].identifier; 
            this.downTime = Date.now();
            this.downLocation = {x:e.changedTouches[0].clientX, y:e.changedTouches[0].clientY};
        }else{
            delete this.touchID;
        }
    }
    touchEnd(e){
        if(this.touchId == e.changedTouches[0].identifier && e.touches.length == 1 && Date.now()-this.downTime < 1000){
            delete this.touchId;
            const upLocation = new THREE.Vector2(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            const distance = Math.sqrt(Math.pow(this.downLocation.x - upLocation.x,2)+Math.pow(this.downLocation.y - upLocation.y,2))
            if(distance<5){
                this.select(upLocation);
            }
        }
        
    }
    mouseDown(e){
        if (e.which == 1 || e.which == "all") {
            this.downTime = Date.now();
            this.downLocation = {x:e.clientX, y:e.clientY};
        }
    }
    mouseUp(e){
        if (e.which == 1 || e.which == "all" && Date.now()-this.downTime < 1000) {
            const upLocation = new THREE.Vector2(e.clientX, e.clientY);
            const distance = Math.sqrt(Math.pow(this.downLocation.x - upLocation.x,2)+Math.pow(this.downLocation.y - upLocation.y,2))
            if(distance<5){
                this.select(upLocation);
            }
        }
    }
    

    select(mouseLocation){

        mouseLocation.x-=this.map.domContainer.clientLeft;
        mouseLocation.y-=this.map.domContainer.clientTop;
        mouseLocation.x/=this.map.domContainer.clientWidth;
        mouseLocation.y/=this.map.domContainer.clientHeight;
        mouseLocation.x = (mouseLocation.x * 2)-1;
        mouseLocation.y = ((1-mouseLocation.y) * 2)-1;
        
        
        
        this.map.select(mouseLocation, 2);
        
    }

    _update(){

    }
}export { SelectController }