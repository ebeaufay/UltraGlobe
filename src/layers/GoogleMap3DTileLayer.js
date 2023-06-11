import {OGC3DTilesLayer} from "./OGC3DTilesLayer"

class GoogleMap3DTileLayer extends OGC3DTilesLayer {

    /**
     * @param {Object} [properties] - the properties for this tileset
     * @param {Object} [properties.apiKey] - the google map API key
     * @param {Object} [properties.id] - the layer id
     * @param {Object} [properties.name] - a name for the layer.
     * @param {Object} [properties.bounds] - optional, the geometric bounds of the layer
     * @param {Object} [properties.visible] - optional, specifies the visibility of the layer 
     * @param {Object} [properties.geometricErrorMultiplier] - optional, the geometric error multiplier. A higher value means more detail is loaded. defaults to 0.3. 
     * @param {Object} [properties.displayCopyright] - optional, displays copyright info about the loaded tiles
     * @param {Object} [properties.displayErrors] - optional, displays tile loading errors on screen
     * @param {Object} [properties.loadOutsideView] - optional, loads tiles outside the view frustum with the lowest possible detail. this allows data to already be present when the camera moves and for rendering shadows from objects outside the view.
     */
    constructor (properties){
        if(!properties.apiKey) throw "the GoogleMap3DTileLayer requires an API key"
        if(properties.displayCopyright === false) console.warn("google maps requires displaying copyright information about the loaded tiles. Set the displayCopyright property of the GoogleMap3DTileLayer to true for production")
        if(properties.displayCopyright === undefined) properties.displayCopyright = true;
        properties.url= "https://tile.googleapis.com/v1/3dtiles/root.json";
        properties.yUp = true;
        properties.queryParams =  { key: properties.apiKey };
        if (!properties.geometricErrorMultiplier) properties.geometricErrorMultiplier = isMobileDevice()?0.2:0.4;
        super(properties);
    }
}export {GoogleMap3DTileLayer};

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};