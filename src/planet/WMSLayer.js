/**
 * A service to retrieve maps from a WMS Service
 */

const toDegrees = 57.295779513082320876798154814105;
class WMSLayer {

    constructor(url, layers, epsg = "EPSG:4326", version = "1.1.1") {
        this.url = url;
        this.layers = layers;
        this.epsg = epsg;
        this.version = version;
    }

    getFullUrl (bounds, width = 128, height = 128)
    {
        const minY = Math.min(90, Math.max(-90, bounds.getMin()._y * toDegrees));
        const maxY = Math.min(90, Math.max(-90, bounds.getMax()._y * toDegrees));
        const minX = Math.min(179.99999999, Math.max(-180, -bounds.getMax()._x * toDegrees));
        const maxX = Math.min(179.99999999, Math.max(-180, -bounds.getMin()._x * toDegrees));

        return this.url + "?request=getmap&service=wms&format=image/jpeg&BBOX=" +
               minX + "," + minY + "," +
               maxX + "," + maxY +
               "&srs=" + this.epsg +
               "&layers=" + this.layers +
               "&width=" + width +
               "&height=" + height +
               "&version=" + this.version +
               "&styles=default";
    }
}

export { WMSLayer };