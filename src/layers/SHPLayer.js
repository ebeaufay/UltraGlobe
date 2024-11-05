
import { VectorLayer } from "./VectorLayer";
var shapefile = require("shapefile");

class SHPLayer extends VectorLayer {
    /**
     * 
     * @param {Object} properties
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} [properties.shp] a url to an shp file
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {Number} [properties.maxSegmentLength = 10] the maximum segment length in kilometers before lines and polygons are subdivided to follow the earth curvature
     * @param {Number} [properties.polygonOpacity = 0.7] polygon opacity
     * @param {THREE.Color} [properties.polygonColor = new THREE.Color(0.0, 1.0, 0.0)] polygon color
     * @param {THREE.Color} [properties.selectedPolygonColor = new THREE.Color(1.0, 1.0, 0.0)] selected polygon color
     * @param {THREE.Color} [properties.polylineColor = new THREE.Color(1.0, 1.0, 1.0)] polyline color
     * @param {THREE.Color} [properties.selectedPolylineColor = new THREE.Color(0.5, 1.0, 0.0)] selected polyline color
     * @param {THREE.Color} [properties.pointColor = new THREE.Color(0.0, 0.0, 1.0)] point color
     * @param {THREE.Color} [properties.selectedPointColor = new THREE.Color(1.0, 0.0, 0.0)] selected point color
     * @param {boolean} [properties.draped = false] force draping onto terrain
     */
    constructor(properties) {
        if (!properties || !properties.shp) {
            throw "Bad instanciation, SHPLayer misses required properties."
        }
        super(properties);

        const self = this;
        self.draped = properties.draped;
        shapefile.open(properties.shp)
            .then(source => source.read()
                .then(function next(result) {
                    if (result.done) return;
                    switch (result.value.geometry.type) {
                        case "Point":
                            self.addPoints([result.value.geometry.coordinates], result.value.properties, self.draped|result.value.geometry.coordinates.length<3);
                            break;
                        case "MultiPoint":
                            self.addPoints(result.value.geometry.coordinates, result.value.properties, self.draped|result.value.geometry.coordinates[0].length<3);
                            break;
                        case "LineString":
                            self.addPolylines([result.value.geometry.coordinates], result.value.properties, undefined, self.draped|result.value.geometry.coordinates[0].length<3);
                            break;
                        case "MultiLineString":
                            self.addPolylines(result.value.geometry.coordinates, result.value.properties, undefined, self.draped|result.value.geometry.coordinates[0][0].length<3);
                            break;
                        case "Polygon":
                            self.addPolygons([result.value.geometry.coordinates], result.value.properties, result.value.geometry.coordinates[0][0][2], true, self.draped|result.value.geometry.coordinates[0][0].length<3);
                            break;
                        case "MultiPolygon":
                            self.addPolygons(result.value.geometry.coordinates, result.value.properties,result.value.geometry.coordinates[0][0][0][2], true, self.draped|result.value.geometry.coordinates[0][0][0].length<3)
                            break;
                    }
                    return source.read().then(next);
                }))
            .catch(error => console.error(error.stack));

        this.isSHPLayer = true;

    }

} export { SHPLayer };