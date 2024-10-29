import {common} from "./commonWorker.js";
const ElevationMesherWorker = {
    getScript : ()=> {
        return `
        onmessage = function (e) {
            const id = e.data.id;
            try{
                const bounds = e.data.input.bounds
                const resolution = e.data.input.resolution;
                const extendedElevation = e.data.input.extendedElevation;
        
                let result;
                if (bounds.max.y >= 1.57079632) {
                    result = generateNorthPoleTile(resolution, bounds, extendedElevation);
                } else if (bounds.min.y <= -1.57079632) {
                    result = generateSouthPoleTile(resolution, bounds, extendedElevation);
                } else {
                    
                    result = generateBaseTile(resolution, bounds, extendedElevation);
                }
                postMessage({id:id,result:result});
            }catch(error){
                postMessage({id:id,error:error});
            }
        };
        `+common.getGenerateTerrainTile();
    }
}
export{ElevationMesherWorker};
