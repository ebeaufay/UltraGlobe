
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
     * @param {THREE.PointMaterial} [properties.pointMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.LineBasicMaterial|THREE.LineDashedMaterial} [properties.lineMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.Material} [properties.polygonMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.PointMaterial} [properties.selectedPointMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.LineBasicMaterial|THREE.LineDashedMaterial} [properties.selectedLineMaterial] A three.js material for points. defaults to a basic red material
     * @param {THREE.Material} [properties.selectedPolygonMaterial] A three.js material for selected points. defaults to a basic red material
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