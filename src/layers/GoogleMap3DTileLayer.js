import {OGC3DTilesLayer} from "./OGC3DTilesLayer"

/**
 * A layer that displays google maps 3DTiles.
 * Note that the regular OGC3DTilesLayer can be used but this layer handles default settings specific to google maps 3D tiles
 * @class
 * @extends OGC3DTilesLayer
 */
class GoogleMap3DTileLayer extends OGC3DTilesLayer {

    /**
     * @param {Object} properties the properties for this tileset
     * @param {String} properties.apiKey the google map API key
     * @param {Object} properties.id the layer id
     * @param {String} properties.name a name for the layer.
     * @param {Boolean} [properties.displayCopyright = true] (optional) display copyright information when present in tiles by concatenating all copyright info for all displayed tiles
     * @param {Boolean} [properties.displayErrors = false] (optional) display loading errors
     * @param {Number} [properties.geometricErrorMultiplier = 1] (optional) between 0 and infinity, defaults to 1 on desktop and 0.3 on mobile devices. controls the level of detail.
     * @param {Boolean} [properties.loadOutsideView = false] (optional) if true, will load tiles outside the view at the lowest possible LOD.
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {String} [properties.loadingStrategy = "INCREMENTAL"] loading strategy, "INCREMENTAL" (default) or "IMMEDIATE". "IMMEDIATE" mode loads only the ideal LOD while "INCREMENTAL" loads intermediate LODs.
     * @param {Function} [properties.updateCallback = undefined] A callback called on every tileset update with a stats object indicating number of tiles loaded/visualized, max loaded LOD, and percentage of the tileset loaded
     */
    constructor (properties){
        
        if(!properties.apiKey) throw "the GoogleMap3DTileLayer requires an API key"
        if(properties.displayCopyright === false) console.warn("google maps requires displaying copyright information about the loaded tiles. Set the displayCopyright property of the GoogleMap3DTileLayer to true for production")
        if(properties.displayCopyright === undefined) properties.displayCopyright = true;
        properties.url= "https://tile.googleapis.com/v1/3dtiles/root.json";
        properties.queryParams =  { key: properties.apiKey };
        if (!properties.geometricErrorMultiplier) properties.geometricErrorMultiplier = isMobileDevice()?0.3:1.0;
        super(properties);
        this.isGoogleMaps3DTilesLayer = true;
    }
}export {GoogleMap3DTileLayer};

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};