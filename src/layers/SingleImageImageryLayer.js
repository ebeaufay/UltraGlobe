import { ImageryLayer } from "./ImageryLayer.js"
import * as THREE from 'three';
const toDegrees = 57.295779513082320876798154814105;

/**
 * Elevation from a single image (Equidistant Cylindrical).
 */
class SingleImageImageryLayer extends ImageryLayer {

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double], 
     * url: imageURL,
     * min: Double,
     * max: Double} properties 
     */
    constructor(properties) {
        super(properties);
        const self = this;


        this.loaded = false;
        this.pendingRequests = [];

        self.img = new Image();

        self.img.onload = function () {
            self.loaded = true;
            self.pendingRequests.forEach(f => f());
        };
        self.img.src = properties.url;

    }

    getMap(tile, callbackSuccess, callbackFailure, width = 128, height = 128) {
        if (!this.bounds || !this.bounds.intersectsBox(tile.bounds)) {
            callbackFailure("bounds don't intersect with layer");
        }
        const self = this;

        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        const texture = new THREE.CanvasTexture(ctx.canvas);
        let aborted = false;
        const loadFunction = () => {
            if(!!aborted){
                return;
            }
            const sx = ((tile.bounds.min.x * toDegrees) - self.bounds.min.x) * self.img.width /(self.bounds.max.x-self.bounds.min.x);
            let sy = ((tile.bounds.min.y * toDegrees) - self.bounds.min.y) * self.img.height / (self.bounds.max.y-self.bounds.min.y);
            const sw = (((tile.bounds.max.x-tile.bounds.min.x)*toDegrees) / (self.bounds.max.x-self.bounds.min.x)) * self.img.width;
            const sh = (((tile.bounds.max.y-tile.bounds.min.y)*toDegrees) / (self.bounds.max.y-self.bounds.min.y)) * self.img.height;
            sy = self.img.height - (sy+sh)
            ctx.drawImage(self.img, sx, sy, sw, sh, 0, 0, width, height);
            texture.needsUpdate = true; 
            callbackSuccess(texture);
        }

        if(!self.loaded){
            self.pendingRequests.push(loadFunction);
        }else{
            loadFunction();
        }
        
        return {abort:()=>{
            //aborted = true;
        }};
    };
}

export { SingleImageImageryLayer };