
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
                    this.addPolygons([coords], properties, coords[0][0][2], true, this.draped|coords[0][0].length<3,false);
                    break;
                case "MultiPolygon":
                    this.addPolygons(coords, properties,coords[0][0][0][2], true, this.draped|coords[0][0][0].length<3,false)
                    break;
            }
        });

        
        this.updateBatchedMeshes();
    
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