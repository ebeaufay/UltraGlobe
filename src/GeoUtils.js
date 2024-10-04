// @ts-nocheck

/**
     * Transforms a lon lat height point (EPSG:4326) to cartesian coordinates (EPSG:4978).
     * The transform is slightly inaccurate compared to proj4 but it's 3 times faster and accurate enough for most needs
     * @param {THREE.Vector3} llh
     * @param {boolean} [radians = false] set to true if the input longitude and latitude are in radians. height is always expected in meters.
     */
export function llhToCartesianFastSFCT(llh, radians = false) {
    const lon = radians ? llh.x : 0.017453292519 * llh.x;
    const lat = radians ? llh.y : 0.017453292519 * llh.y;
    const N = 6378137.0 / (Math.sqrt(1.0 - (0.006694379990141316 * Math.pow(Math.sin(lat), 2.0))));
    const cosLat = Math.cos(lat);
    const cosLon = Math.cos(lon);
    const sinLat = Math.sin(lat);
    const sinLon = Math.sin(lon);
    const nPh = (N + llh.z);

    llh.set(nPh * cosLat * cosLon, nPh * cosLat * sinLon, (0.993305620009858684 * N + llh.z) * sinLat);
}

/**
     * Transforms a xyz point (EPSG:4978) to lon lat height coordinates (EPSG:4326) with longitude and latitude in degrees.
     * The transform is slightly inaccurate compared to proj4 but it's 2.5 times faster
     * @param {THREE.Vector3} llh lon/lat/height
     */
export function cartesianToLlhFastSFCT(xyz) {
    const a = 6378137.0;
    const b = 6356752.314245179;
    const e2 = 0.006694379990141316;
    const p = Math.sqrt(xyz.x * xyz.x + xyz.y * xyz.y);
    const th = Math.atan2(a * xyz.z, b * p);
    const sinTh = Math.sin(th);
    const cosTh = Math.cos(th);
    const lat = Math.atan2(xyz.z + 42841.3115133135658 * sinTh * sinTh * sinTh, p - 42697.672707179 * cosTh * cosTh * cosTh);
    const sinLat = Math.sin(lat);
    const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);

    xyz.x = Math.atan2(xyz.y, xyz.x) * 57.29577951308232;
    xyz.y = lat * 57.29577951308232;
    xyz.z = p / Math.cos(lat) - N;
}