
import { VectorLayer } from "./VectorLayer";



class GeoJsonLayer extends VectorLayer {
    /**
     * Decodes and renders a geojson. 
     * Shapes with height information will be rendered as 3D vectors unless {@param properties.draped is set to true} 
     * in which case, all vectors will be rendered as 2D vectors, draped on terrain.
     * 
     * 
     * @param {Object} properties
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String|Object} [properties.geoJson] a geojson as a javascript object or a url
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
        if (!properties || !properties.geoJson) {
            throw "Bad instanciation, GeoJsonLayer misses required properties."
        }
        super(properties);
        const self = this;
        self.draped = properties.draped;


        self.isGeoJsonLayer = true;

        if(typeof properties.geoJson === 'object'){
            self._decode(properties.geoJson);
        }else if(typeof properties.geoJson === 'string' && !!isValidURL(properties.geoJson)){
            fetch(properties.geoJson).then(response => {
                return response.json()

            }).then((response) => {
                self._decode(response);
            }).catch(e=>{
                throw new Error ("couldn't decode geojson: "+e.message)
            })
        }else{
            throw new Error ("invalid geojson property. Should be a geojson object or a URL");
        }
        


    }

    _decode(geojson) {
        const features = geojson.type === "FeatureCollection" ? geojson.features :
        geojson.type === "Feature" ? [geojson] : [];

        const promisses = [];
        features.forEach(feature => {
            const geometry = feature.geometry;
            const properties = feature.properties || {};
            if (!geometry) return;
            const type = geometry.type;
            const coords = geometry.coordinates;
            switch (type) {
                case "Point":
                    this.addPoints([coords], properties, this.draped|coords.length<3);
                    break;
                case "MultiPoint":
                    this.addPoints(coords, properties, this.draped|coords[0].length<3);
                    break;
                case "LineString":
                    this.addPolylines([coords], properties, undefined, this.draped|coords[0].length<3);
                    break;
                case "MultiLineString":
                    this.addPolylines(coords, properties, undefined, this.draped|coords[0][0].length<3);
                    break;
                case "Polygon":
                    this.addPolygons([coords], properties, coords[0][0][2], true, this.draped|coords[0][0].length<3);
                    break;
                case "MultiPolygon":
                    this.addPolygons(coords, properties,coords[0][0][0][2], true, this.draped|coords[0][0][0].length<3)
                    break;
            }
        });
    
    }




} export { GeoJsonLayer };

function isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }