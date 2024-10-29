import { ElevationLayer } from './ElevationLayer.js'

const toDegrees = 57.295779513082320876798154814105;
/**
* A service to retrieve elevation from a WMS Service
* @class
* @extends ElevationLayer
*/
class WMSElevationLayer extends ElevationLayer {

    /**
     * Create a layer that requests elevation from a WMS service. 
     * The layer will immediately return the closest available LOD and load a better LOD for the tile when requestable
     * Only EPSG:4326 is supported.
     * Only format "application/bil16" is supported
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.url the service url
     * @param {String} properties.layer the wms layer 
     * @param {String} properties.version the version of the service
     * @param {String} [properties.epsg = "EPSG:4326"] an EPSG code (only 4326 supported)
     * @param {String} [properties.format="application/bil16"] the image format
     * @param {Number} [properties.transparency = 0] the layer's transparency (0 to 1)
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {number} [properties.maxResolution = 30] Maximum resolution in meters at the equator
     */
    constructor(properties) {
        super(properties);
        const self = this;
        self.url = properties.url;
        self.layer = properties.layer;
        self.epsg = properties.epsg ? properties.epsg : "EPSG:4326";
        self.version = properties.version;
        self.format = properties.format ? properties.format : "application/bil16";

        self.downloads = [];
        self.fetchElevationFunction = (aBounds, width, height) => {

            const minY = Math.min(90, Math.max(-90, aBounds.min.y * toDegrees));
            const maxY = Math.min(90, Math.max(-90, aBounds.max.y * toDegrees));
            const minX = Math.min(179.99999999, Math.max(-180, aBounds.min.x * toDegrees));
            const maxX = Math.min(179.99999999, Math.max(-180, aBounds.max.x * toDegrees));

            let request = self.url + "?request=GetMap&SERVICE=WMS&BBOX=";
            switch (self.version) {
                case "1.1.1": request += minX + "," + minY + "," + maxX + "," + maxY + "&SRS=" + self.epsg; break;
                default: request += minY + "," + minX + "," + maxY + "," + maxX + "&CRS=" + self.epsg; break;
            }
            request +=
                "&LAYERS=" + self.layer +
                "&WIDTH=" + width +
                "&HEIGHT=" + height +
                "&VERSION=" + self.version +
                "transparent=TRUE" +
                "&STYLES=" +
                "&FORMAT=" + self.format;


            function fetchBIL16(url) {
                return fetch(url).then(response=>{
                    return response.arrayBuffer();
                }).then(buffer=>{
                    const dataView = new DataView(buffer);
                    const elevations = new Float32Array(width * height);
                    let offset = 0;
    
                    for (let row = 0; row < height; row++) {
                        // Optionally reverse the row order if data appears upside down
                         let rowIndex = height - 1 - row; // Uncomment if needed
                        //let rowIndex = row;
                        for (let col = 0; col < width; col++) {
                            const value = dataView.getInt16(offset, true);
                            elevations[rowIndex * width + col] = value;
                            offset += 2;
                        }
                    }
    
                    return elevations;
                }).catch(e=>{
                    throw new Error("failed to retrieve WMS elevation");
                })

                
            }
            return fetchBIL16(request);
        }

    }


    getElevation(bounds, width, height, geometry, skirtGeometry) {
        const self = this;
        const extendedBounds = bounds.clone();
        extendedBounds.min.x -= ((bounds.max.x - bounds.min.x) / (width - 1))*2; 
        extendedBounds.max.x += ((bounds.max.x - bounds.min.x) / (width - 1));
        extendedBounds.min.y -= ((bounds.max.y - bounds.min.y) / (height - 1))*2;
        extendedBounds.max.y += ((bounds.max.y - bounds.min.y) / (height - 1));

        const meshGeneration = super._simpleMeshFromElevationAsync;
        const trim = super._trimEdges;
        const extendedWidth = width + 2;
        const extendedHeight = height + 2;

        return self.fetchElevationFunction(extendedBounds, extendedWidth, extendedHeight).then(elevationArray => {
            if (geometry && skirtGeometry) {

                return meshGeneration(bounds, width, height, elevationArray, geometry, skirtGeometry).then(shift => {
                    return {
                        extendedElevationArray: elevationArray,
                        elevationArray: trim(elevationArray, extendedWidth, extendedHeight),
                        shift: shift,
                    };
                }, error => {
                    throw (error);
                })

            } else {
                return {
                    extendedElevationArray: elevationArray,
                    elevationArray: trim(elevationArray, extendedWidth, extendedHeight),
                    shift: undefined,
                };
            }
        });

    };
}

export { WMSElevationLayer };