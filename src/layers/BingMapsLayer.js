
import { CancellableTextureLoader } from '../loaders/CancellableTextureLoader.js'
import { ImageryLayer } from "./ImageryLayer.js"
/**
 * A service to retrieve maps from a WMS Service
 */

const toDegrees = 57.295779513082320876798154814105;

const BingMapsImagerySets = {
    aerial: "Aerial",
    aerialWithLabels: "AerialWithLabelsOnDemand",
    birdseye: "Birdseye",
    birdseyeWithLabels: "BirdseyeWithLabels",
    birdseyeV2: "BirdseyeV2",
    birdseyeWithLabelsV2: "BirdseyeV2WithLabels",
    canvasDark: "CanvasDark",
    canvasGray: "CanvasGray",
    roadOnDemand: "RoadOnDemand"
}
class BingMapsLayer extends ImageryLayer {

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double],
     * imagerySet: String,
     * key:String} properties 
     */
    constructor(properties) {
        super(properties);
        this.urls = [];
        this.currentURL = 0;
        this.key = properties.key;
        this.textureLoader = new CancellableTextureLoader();
        this.cache = {};

        const self = this;
        fetch("http://dev.virtualearth.net/REST/V1/Imagery/Metadata/" + properties.imagerySet + "?output=json&include=ImageryProviders&key=" + properties.key)
            .then(response => {
                return response.json()

            }).then((response) => {
                const resource = response.resourceSets[0].resources[0];
                const urlBase = resource.imageUrl;
                for (let index = 0; index < resource.imageUrlSubdomains.length; index++) {
                    self.urls.push(urlBase.replace("{subdomain}", resource.imageUrlSubdomains[index]));
                }
            });
    }

    getMap(tile, callbackSuccess, callbackFailure) {
        if (this.urls.length == 0 || !this.bounds || !this.bounds.intersectsBox(tile.bounds)) {
            callbackFailure();
            return;
        }
        let lat = (tile.bounds.min.y + (tile.bounds.max.y - tile.bounds.min.y) * 0.5) / Math.PI * 180;
        let lon = (tile.bounds.min.x + (tile.bounds.max.x - tile.bounds.min.x) * 0.5) / Math.PI * 180;

        let xy = [];
        latlonToPixelXY(lat, lon, tile.level, xy);
        pixelXYToTileXY(xy)
        const quadKey = tileXYToQuadKey(xy, tile.level);

        const url = this.urls[this.currentURL].replace("{quadkey}", quadKey);
        this.currentURL = (this.currentURL + 1) % this.urls.length;

        return this.textureLoader.load(url, (texture) => callbackSuccess(texture), null, () => callbackFailure());
    };


}

function latlonToPixelXY(latitude, longitude, levelOfDetail, xy) {
    //latitude = Math.min(Math.max(latitude, MinLatitude), MaxLatitude);
    //longitude = Math.min(Math.max(longitude, MinLongitude), MaxLongitude);

    const x = (longitude + 180) / 360;
    const sinLatitude = Math.sin(latitude * Math.PI / 180);
    const y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);

    const mapSize = 256 << levelOfDetail;
    xy[0] = Math.min(Math.max(x * mapSize + 0.5, 0), mapSize - 1);
    xy[1] = Math.min(Math.max(y * mapSize + 0.5, 0), mapSize - 1);
}

function pixelXYToTileXY(xy) {
    xy[0] = xy[0] / 256;
    xy[1] = xy[1] / 256;
}

function tileXYToQuadKey(xy, levelOfDetail) {
    let quadKey = "";
    for (let i = levelOfDetail; i > 0; i--) {
        let digit = '0';
        let mask = 1 << (i - 1);
        if ((xy[0] & mask) != 0) {
            digit++;
        }
        if ((xy[1] & mask) != 0) {
            digit++;
            digit++;
        }
        quadKey += digit;
    }
    return quadKey;
}
export { BingMapsLayer, BingMapsImagerySets };