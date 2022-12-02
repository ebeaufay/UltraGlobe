import * as THREE from 'three';
import { Controller } from './Controller';
import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async/dynamic';

const angleToRadians = 0.01745329251994329576923690768489;
class TilesetPlacementController extends Controller {
    constructor(camera, domElement, map, ogc3DTilesLayer, dropCallback) {
        super(camera, domElement, map);
        this.mouseRayCast = new THREE.Vector3();
        this.dropLocation = new THREE.Vector2();
        this.moveLocation = new THREE.Vector2();
        this.tempLonLat = new THREE.Vector2();

        this.ogc3DTilesLayer = ogc3DTilesLayer;

        const interval = setIntervalAsync(()=>{
            if(this.drop){
                //this.moveTileset(this.moveLocation);
                clearIntervalAsync(interval);
                dropCallback();
            }
            else if(this.moved){
                this.moveTileset(this.moveLocation);
            }
        },10);

    }

    moveTileset(screenLocation){
        const baseHeightBefore = this.ogc3DTilesLayer.getBaseHeight();
        
        this.map.screenPixelRayCast(screenLocation.x, screenLocation.y, this.mouseRayCast);
        const llh = this.planet.llhToCartesian.inverse(this.mouseRayCast);
        this.tempLonLat.set(llh.x*angleToRadians, llh.y*angleToRadians);
        const terrainElevation = this.map.planet.getTerrainElevation(this.tempLonLat);

        llh.z = terrainElevation-baseHeightBefore;
        //llh.z-=this.ogc3DTilesLayer.getBaseHeight();
        this.ogc3DTilesLayer.setLLH(llh);
        this.ogc3DTilesLayer.update();
    }
    _handleEvent(eventName, e) {
        if(this.handle(eventName, e)){
            super._handleEvent(eventName, e);
        }
    }

    handle(eventName, e){
        let self = this;
        switch (eventName) {
            case "mousemove": self.mouseMove(e); return true;
            case "mousedown": self.mouseDown(e); return true;
            case "mouseup": return self.mouseUp(e); 
            case "touchstart": self.touchStart(e); return true;
			case "touchend": return self.touchEnd(e); 
        }

        return true;
    }
    //this.map.screenPixelRayCast(this.zoomLocation.x, this.zoomLocation.y, this.mouseRayCast);
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
            this.dropLocation.set(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            const distance = Math.sqrt(Math.pow(this.downLocation.x - this.dropLocation.x,2)+Math.pow(this.downLocation.y - this.dropLocation.y,2))
            if(distance<5){
                this.drop = true;
            }
        }
        
    }
    mouseMove(e){
        this.moved = true;
        this.moveLocation.set(e.clientX, e.clientY);
    }
    mouseDown(e){
        if (e.which == 1 || e.which == "all") {
            this.downTime = Date.now();
            this.downLocation = {x:e.clientX, y:e.clientY};
        }
    }
    mouseUp(e){
        if (e.which == 1 || e.which == "all" && Date.now()-this.downTime < 1000) {
            this.dropLocation = new THREE.Vector2(e.clientX, e.clientY);
            const distance = Math.sqrt(Math.pow(this.downLocation.x - this.dropLocation.x,2)+Math.pow(this.downLocation.y - this.dropLocation.y,2))
            if(distance<5){
                this.drop = true;
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
}export { TilesetPlacementController }