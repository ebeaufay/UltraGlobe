import {ElevationLayer} from './ElevationLayer.js'

const halfPI = Math.PI*0.5;
/**
 * A simple on the fly elevation layer that displays sinusoidal terrain
 * @class
 * @extends ElevationLayer
 */
class SimpleElevationLayer extends ElevationLayer{

    /**
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
    }

    getElevation(bounds, width, height, geometry, skirtGeometry) {

        return new Promise((resolve, reject)=>{
            const extendedBounds = bounds.clone();
            extendedBounds.min.x -= (bounds.max.x - bounds.min.x) / (width - 1);
            extendedBounds.max.x += (bounds.max.x - bounds.min.x) / (width - 1);
            extendedBounds.min.y -= (bounds.max.y - bounds.min.y) / (height - 1);
            extendedBounds.max.y += (bounds.max.y - bounds.min.y) / (height - 1);
    
            const meshGeneration = super._simpleMeshFromElevationAsync;
            //const meshGeneration = super._simpleMeshFromElevation;
            const trim = super._trimEdges;
    
            const extendedWidth = width + 2;
            const extendedHeight = height + 2;
    
            var elevationArray = new Array(extendedWidth * extendedHeight).fill(0);
            for (let x = 0; x < extendedWidth; x ++) {
                for (let y = 0; y < extendedHeight; y ++) {
                    
                    let lat = bounds.min.y + (y * ((bounds.max.y - bounds.min.y) / (extendedHeight-1)));
                    let lon = bounds.min.x + (x * ((bounds.max.x - bounds.min.x) / (extendedWidth-1)));
                    let adjustedLon = lon;
                    let adjustedLat = lat;
                    if(adjustedLat>halfPI){
                        adjustedLon-=Math.PI;
                        adjustedLat = halfPI - (adjustedLat-halfPI)
                    }else if (adjustedLat < -halfPI) {
                        adjustedLon -= Math.PI;
                        adjustedLat = -halfPI - (adjustedLat + halfPI)
                    }
                    if(adjustedLon>Math.PI){
                        adjustedLon = -Math.PI+(adjustedLon%Math.PI);
                    }
                    else if(adjustedLon<-Math.PI){
                        adjustedLon = Math.PI+(adjustedLon%Math.PI);
                    }
                    elevationArray[extendedWidth * y + x] = 5000 *(Math.cos(adjustedLon*500) + Math.cos(adjustedLat*500));
                }
            }

            
            if(geometry && skirtGeometry){
                /*resolve({
                    elevationArray: trim(elevationArray, width, height),
                    shift: meshGeneration(bounds, width, height, elevationArray, geometry, skirtGeometry),
                });*/
                meshGeneration(bounds, width, height, elevationArray, geometry, skirtGeometry).then(shift=>{
                    resolve({
                        elevationArray: trim(elevationArray, width+2, height+2),
                        shift: shift,
                    });
                }, error=>{
                    reject(error);
                })
                
            }else{
                resolve({
                    elevationArray: trim(elevationArray, width, height),
                    shift: undefined,
                });
            }
            

            
        });
        
    };
}

export { SimpleElevationLayer };