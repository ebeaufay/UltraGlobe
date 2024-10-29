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

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * @param {Number} lon1 - Longitude of the first point in degrees.
 * @param {Number} lat1 - Latitude of the first point in degrees.
 * @param {Number} lon2 - Longitude of the second point in degrees.
 * @param {Number} lat2 - Latitude of the second point in degrees.
 * @returns {Number} - Distance in kilometers.
 */
export function haversineDistance(lon1, lat1, lon2, lat2) {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculates the geodesic distance between two points on the WGS84 ellipsoid using Vincenty's inverse formula.
 * @param {Number} lon1 - Longitude of the first point in degrees.
 * @param {Number} lat1 - Latitude of the first point in degrees.
 * @param {Number} lon2 - Longitude of the second point in degrees.
 * @param {Number} lat2 - Latitude of the second point in degrees.
 * @returns {Number} - Distance in kilometers.
 */
export function vincentyDistance(lon1, lat1, lon2, lat2) {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    // WGS84 ellipsoid constants
    const a = 6378137; // Semi-major axis in meters
    const f = 1 / 298.257223563; // Flattening
    const b = (1 - f) * a;

    const L = toRad(lon2 - lon1);
    const U1 = Math.atan((1 - f) * Math.tan(toRad(lat1)));
    const U2 = Math.atan((1 - f) * Math.tan(toRad(lat2)));

    const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
    const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

    let lambda = L;
    let lambdaP;
    const iterLimit = 100;
    let sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM, C;

    for (let i = 0; i < iterLimit; i++) {
        const sinLambda = Math.sin(lambda);
        const cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt(
            (cosU2 * sinLambda) * (cosU2 * sinLambda) +
            (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
            (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
        );

        if (sinSigma === 0) return 0; // Co-incident points

        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
        sigma = Math.atan2(sinSigma, cosSigma);
        sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
        cosSqAlpha = 1 - sinAlpha * sinAlpha;
        if (cosSqAlpha === 0) {
            cos2SigmaM = 0; // Equatorial line
        } else {
            cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
        }

        C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha *
            (sigma + C * sinSigma *
                (cos2SigmaM + C * cosSigma *
                    (-1 + 2 * cos2SigmaM * cos2SigmaM)
                )
            );

        if (Math.abs(lambda - lambdaP) < 1e-12) break; // Convergence
        if (i === iterLimit - 1) {
            throw new Error("Vincenty formula failed to converge");
        }
    }

    const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    const A = 1 + (uSq / 16384) *
        (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    const B = (uSq / 1024) *
        (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    const deltaSigma = B * sinSigma *
        (cos2SigmaM + (B / 4) *
            (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
                (B / 6) * cos2SigmaM *
                (-3 + 4 * sinSigma * sinSigma) *
                (-3 + 4 * cos2SigmaM * cos2SigmaM))
        );

    const s = b * A * (sigma - deltaSigma); // Distance in meters
    return s / 1000; // Convert to kilometers
}

function areAntipodal(lon1, lat1, lon2, lat2, epsilon = 1e-10) {
    const deltaLat = Math.abs(lat1 + lat2);
    const deltaLon = Math.abs(Math.abs(lon1 - lon2) - 180);
    return deltaLat < epsilon && deltaLon < epsilon;
}

/**
 * Interpolates between two geographical points along the great-circle path on a spherical Earth.
 *
 * @param {Number} lon1 - Longitude of the first point in degrees.
 * @param {Number} lat1 - Latitude of the first point in degrees.
 * @param {Number} lon2 - Longitude of the second point in degrees.
 * @param {Number} lat2 - Latitude of the second point in degrees.
 * @param {Number} fraction - Fraction between 0 and 1 representing the interpolation factor.
 *                             0 returns the first point, 1 returns the second point.
 * @returns {Object} - An object containing the interpolated longitude and latitude in degrees.
 *                     Format: { longitude: Number, latitude: Number }
 *
 * @throws {Error} - Throws an error if the fraction is not between 0 and 1 or if points are antipodal.
 */
export function interpolateGreatCircle(lon1, lat1, lon2, lat2, fraction) {
    if (fraction < 0 || fraction > 1) {
        throw new Error("Fraction must be between 0 and 1.");
    }
    
    if(areAntipodal(lon1, lat1, lon2, lat2)){
        throw new Error("Points are antipodal");
    }

    // Helper function to convert degrees to radians
    function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    // Helper function to convert radians to degrees
    function radiansToDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    // Convert input coordinates to radians
    const latitude1 = degreesToRadians(lat1);
    const longitude1 = degreesToRadians(lon1);
    const latitude2 = degreesToRadians(lat2);
    const longitude2 = degreesToRadians(lon2);

    // Compute the difference in coordinates
    const deltaLatitude = latitude2 - latitude1;
    const deltaLongitude = longitude2 - longitude1;

    // Using the haversine formula to calculate the central angle
    const a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
              Math.cos(latitude1) * Math.cos(latitude2) *
              Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
    const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (centralAngle === 0) {
        // Points are identical
        return { longitude: lon1, latitude: lat1 };
    }

    // Compute interpolation factors
    const sinCentralAngle = Math.sin(centralAngle);
    const factorA = Math.sin((1 - fraction) * centralAngle) / sinCentralAngle;
    const factorB = Math.sin(fraction * centralAngle) / sinCentralAngle;

    // Compute Cartesian coordinates for the interpolated point
    const x = factorA * Math.cos(latitude1) * Math.cos(longitude1) +
              factorB * Math.cos(latitude2) * Math.cos(longitude2);
    const y = factorA * Math.cos(latitude1) * Math.sin(longitude1) +
              factorB * Math.cos(latitude2) * Math.sin(longitude2);
    const z = factorA * Math.sin(latitude1) +
              factorB * Math.sin(latitude2);

    // Convert back to spherical coordinates
    const interpolatedLatitude = Math.atan2(z, Math.sqrt(x * x + y * y));
    let interpolatedLongitude = Math.atan2(y, x);

    // Convert radians back to degrees
    const latitude = radiansToDegrees(interpolatedLatitude);
    let longitude = radiansToDegrees(interpolatedLongitude);

    // Normalize longitude to be between -180 and +180 degrees
    
    longitude = Math.floor(longitude*1e7)*1e-7;
        while (longitude > 180) longitude -= 360
        while (longitude < -180) longitude += 360

    return { longitude: longitude, latitude: latitude };
}

/**
 * Calculates the distance between two points along a rhumb line.
 *
 * @param {Number} lon1 - Longitude of the first point in degrees.
 * @param {Number} lat1 - Latitude of the first point in degrees.
 * @param {Number} lon2 - Longitude of the second point in degrees.
 * @param {Number} lat2 - Latitude of the second point in degrees.
 * @returns {Number} - Distance in kilometers.
 */
export function rhumbDistance(lon1, lat1, lon2, lat2) {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371; // Earth's radius in kilometers

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    let deltaPhi = phi2 - phi1;
    let deltaLambda = toRad(lon2 - lon1);

    // Handle longitude crossing the antimeridian
    if (Math.abs(deltaLambda) > Math.PI) {
        deltaLambda = deltaLambda > 0 ? -(2 * Math.PI - deltaLambda) : (2 * Math.PI + deltaLambda);
    }

    const deltaPsi = Math.log(Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4));
    let q;
    if (Math.abs(deltaPsi) > 1e-12) {
        q = deltaPhi / deltaPsi;
    } else {
        q = Math.cos(phi1);
    }

    const distance = Math.sqrt(deltaPhi * deltaPhi + q * q * deltaLambda * deltaLambda) * R;
    return distance;
}


/**
 * Interpolates between two geographical points along a rhumb line on a spherical Earth.
 *
 * @param {Number} lon1 - Longitude of the first point in degrees.
 * @param {Number} lat1 - Latitude of the first point in degrees.
 * @param {Number} lon2 - Longitude of the second point in degrees.
 * @param {Number} lat2 - Latitude of the second point in degrees.
 * @param {Number} fraction - Fraction between 0 and 1 representing the interpolation factor.
 *                             0 returns the first point, 1 returns the second point.
 * @returns {Object} - An object containing the interpolated longitude and latitude in degrees.
 *                     Format: { longitude: Number, latitude: Number }
 *
 * @throws {Error} - Throws an error if the fraction is not between 0 and 1.
 */
export function interpolateRhumbLine(lon1, lat1, lon2, lat2, fraction) {
    if (fraction < 0 || fraction > 1) {
        throw new Error("Fraction must be between 0 and 1.");
    }

    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    let deltaPhi = phi2 - phi1;
    let deltaLambda = toRad(lon2 - lon1);

    // Handle longitude crossing the antimeridian
    if (Math.abs(deltaLambda) > Math.PI) {
        deltaLambda = deltaLambda > 0 ? -(2 * Math.PI - deltaLambda) : (2 * Math.PI + deltaLambda);
    }

    const deltaPsi = Math.log(Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4));
    let q;
    if (Math.abs(deltaPsi) > 1e-12) {
        q = deltaPhi / deltaPsi;
    } else {
        q = Math.cos(phi1);
    }

    const phiInterp = phi1 + deltaPhi * fraction;
    const lambdaInterp = toRad(lon1) + (deltaLambda * fraction);

    const lat = toDeg(phiInterp);
    let lon = toDeg(lambdaInterp);

    // Normalize longitude to be between -180 and +180 degrees
    lon = Math.floor(lon*1e7)*1e-7;
        while (lon > 180) lon -= 360
        while (lon < -180) lon += 360

    return { longitude: lon, latitude: lat };
}