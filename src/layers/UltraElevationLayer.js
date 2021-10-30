import {CancellableTextureLoader} from '../loaders/CancellableTextureLoader.js'
import {ElevationLayer} from './ElevationLayer.js'
/**
 * A service to retrieve maps from a WMS Service
 */

const toDegrees = 57.295779513082320876798154814105;
class UltraElevationLayer extends ElevationLayer{

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double], 
     * url: String,
     * layer: String} properties 
     */
    constructor(properties) {
        super(properties);
        this.url = properties.url;
        this.layer = properties.layer;
        /* fetch(this.url + "/"+this.layer+"/"+this.bounds).then(array=>{
            let a = array.json();
            this._setBounds(bounds.intersectsBox(new THREE.Box2(new THREE.Vector2(a[0], a[1]),new THREE.Vector2(a[2], a[3]))));
        }) */
    }

    getElevation(bounds, width = 32, height = 32) {
        if(!this.bounds || !this.bounds.intersectsBox(bounds)){
            return Promise.reject(new Error("bounds don't intersect with layer"));
        }
        var minY = Math.min(90, Math.max(-90, bounds.min.y * toDegrees));
            var maxY = Math.min(90, Math.max(-90, bounds.max.y * toDegrees));
            var minX = Math.min(180, Math.max(-180, bounds.min.x * toDegrees));
            var maxX = Math.min(180, Math.max(-180, bounds.max.x * toDegrees));

            var request = this.url + "/"+this.layer+"?"+
                "bounds="+minX+","+minY+","+(maxX-minX)+","+(maxY-minY)+
                "&width="+width+"&height="+height;
            
            return fetch(request).then((array)=>{
                return array.json();
            })

    };
}

export { UltraElevationLayer };