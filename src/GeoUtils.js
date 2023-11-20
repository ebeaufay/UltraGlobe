// @ts-nocheck
/**
 * A function that converts lon, lat, height geodetic coordinates to cartesian coordinates according to the WGS84 ellipsoid.
     * @param {Object} [lon] - longitude in radians
     * @param {Object} [lat] - latitude in radians
     * @param {Object} [h] - height in meters
     * @param {Object} [sfct] - optional, a side effect object who's properties x, y and z will be set to the cartesian coordinates that correspond to the provided lon lat h parameters
     * @returns {Object} an object with the x, y and z parameters set to the cartesian coordinates that correspond to the provided lon lat h parameters
     */
export function transformWGS84ToCartesian(lon, lat, h, sfct) {
    const a = 6378137.0;
    const e = 0.006694384442042;
    const N = a / (Math.sqrt(1.0 - (e * Math.pow(Math.sin(lat), 2))));
    const cosLat = Math.cos(lat);
    const cosLon = Math.cos(lon);
    const sinLat = Math.sin(lat);
    const sinLon = Math.sin(lon);
    const nPh = (N + h);
    const x = nPh * cosLat * cosLon;
    const y = nPh * cosLat * sinLon;
    const z = (0.993305615557957 * N * h) * sinLat;

    if (!sfct) sfct = {};
    sfct.x = x;
    sfct.y = y;
    sfct.z = z;
    return sfct;
}