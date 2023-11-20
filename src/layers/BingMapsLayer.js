
import { CancellableTextureLoader } from '../loaders/CancellableTextureLoader.js'
import { ImageryLayer } from "./ImageryLayer.js"
/**
 * A service to retrieve maps from Bing
 * @private
 */

const toDegrees = 57.295779513082320876798154814105;

const BingMapsImagerySet = {
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
        
        return new Promise((resolve, reject) => {
            const intervalId = setInterval(() => {
                if (this.urls.length > 0) {
                    clearInterval(intervalId);
                    let level = tile.level+1;
                    let xyMin = [];
                    let xyMax = [];
                    do{
                        level -=1;
                        latlonToPixelXY(tile.bounds.min.y, tile.bounds.min.x, tile.level, xyMin);
                        latlonToPixelXY(tile.bounds.max.y, tile.bounds.max.x, tile.level, xyMax);
                    }while(xyMax[0]-xyMin[0]>256 || xyMin[1]-xyMax[1]>512);

                    
                    pixelXYToTileXY(xyMin);
                    pixelXYToTileXY(xyMax);
                    const quadKeyMIN = tileXYToQuadKey(xyMin, level);
                    const quadKeyMax = tileXYToQuadKey(xyMax, level);
                    
    
                    const url = this.urls[this.currentURL].replace("{quadkey}", quadKeyMIN);
                    this.currentURL = (this.currentURL + 1) % this.urls.length;
    
                    resolve(this.textureLoader.load(url, (texture) => callbackSuccess(texture), null, () => callbackFailure()));
                }
            }, 10);
        });
    }


}

function latlonToPixelXY(latitude, longitude, levelOfDetail, xy) {
    //latitude = Math.min(Math.max(latitude, MinLatitude), MaxLatitude);
    //longitude = Math.min(Math.max(longitude, MinLongitude), MaxLongitude);
    
    const x = (longitude + Math.PI) / (2*Math.PI);
    const sinLatitude = Math.sin(latitude);
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
function BingMapsReprojectionGLSL(){ return `
vec2 lonlatToPixelXY (float lon, float lat, int bingLOD) {

    float x = (lon + 3.1415926535897932384626433832795) / 6.283185307179586476925286766559;
    float sinLatitude = sin(lat);
    float y = 0.5 - log((1.0 + sinLatitude) / (1.0 - sinLatitude)) / (4.0 * 3.1415926535897932384626433832795);

    const mapSize = float(256 << bingLOD);
    return vec2(min(max(x * mapSize + 0.5, 0.0), mapSize - 1.0), min(max(y * mapSize + 0.5, 0.0), mapSize - 1.0));
}
`;} 
export { BingMapsLayer, BingMapsImagerySet, BingMapsReprojectionGLSL };