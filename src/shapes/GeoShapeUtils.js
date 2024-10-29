import * as THREE from "three";
import { llhToCartesianFastSFCT, haversineDistance, rhumbDistance, interpolateGreatCircle, interpolateRhumbLine } from "../GeoUtils";
import * as proj4 from 'proj4';
import * as cdt2d from 'cdt2d';
import * as  cleanPSLG from 'clean-pslg';
import * as preprocessPolygon from 'point-in-big-polygon';
import * as earcut from 'earcut';
import * as polygonClipping from 'polygon-clipping';

export function buildPointsGeometry(points) {
    const vertices = []
    points.forEach(point => {
        const cart = new THREE.Vector3(point[0], point[1], point[2] || 0)
        llhToCartesianFastSFCT(cart)
        vertices.push(cart)
    })
    if (vertices.length > 0) return { positions: new Float32Array(vertices.flatMap(v => [v.x, v.y, v.z])) }
    else throw new Error("invalid points array")
}

export function buildPolylineGeometry(coordinates, maxSegmentLength = 10, height, lineType = 0) {
    coordinates = segmentPolyLine(coordinates, maxSegmentLength, lineType);
    
    const positions = []
    const temp = new THREE.Vector3()
    for (let i = 0; i < coordinates.length; i++) {
        temp.set(coordinates[i][0], coordinates[i][1], (height === undefined) ? (coordinates[i][2] || 0) : height)
        llhToCartesianFastSFCT(temp)
        positions.push(temp.x, temp.y, temp.z);
        if (i > 0 && i < coordinates.length - 1) positions.push(temp.x, temp.y, temp.z);
    }
    return { positions: new Float32Array(positions) }
}

export function buildLonLatPolylineGeometry(coordinates, maxSegmentLength = 10, lineType = 0) {
    
    coordinates = splitAntimeridianPolyline(coordinates, lineType);
    const positions = []
    for(let i = 0; i<coordinates.length; i++){
        coordinates[i] = segmentPolyLine(coordinates[i], maxSegmentLength, lineType);
    }
    coordinates.forEach(part=>{
        for (let i = 0; i < part.length; i++) {
            positions.push(part[i][0], part[i][1],0);
            if (i > 0 && i < part.length - 1) positions.push(part[i][0], part[i][1],0);
        }
    })
    
    return { positions: new Float32Array(positions) }
}

export function buildPolygonGeometry(originalCoordinates, maxSegmentLength, height, lineType = 0) {
    const coordinates = originalCoordinates.map(poly => segmentPolyLine(poly, maxSegmentLength, lineType))
    let centerLon = 0
    let centerLat = 0
    for (let i = 0; i < coordinates[0].length; i++) {
        centerLon += coordinates[0][i][0]
        centerLat += coordinates[0][i][1]
    }
    centerLon /= coordinates[0].length
    centerLat /= coordinates[0].length
    const azimuthal = `+proj=aeqd +R=6371000 +lon_0=${centerLon} +lat_0=${centerLat} +x_0=0 +y_0=0 +units=m +no_defs`
    const cartesian = "+proj=geocent +datum=WGS84 +units=m +no_defs"
    const toAzimuthal = proj4.default("EPSG:4326", azimuthal)
    const toCartesian = proj4.default("EPSG:4326", cartesian)
    let maxRadius = 0
    coordinates.forEach(poly => {
        poly.forEach(coord => {
            const transformed = toAzimuthal.forward(coord)
            coord[0] = transformed[0]
            coord[1] = transformed[1]
            coord.length = 2;
            maxRadius = Math.max(maxRadius, coord[0] ** 2 + coord[1] ** 2)
        })
        ensureClockwise(poly);
    })
    const checkPoint = preprocessPolygon(coordinates)
    maxRadius = Math.sqrt(maxRadius)

    if (maxRadius > 10000000) throw Error("polygons larger than one hemisphere are not supported")


    if (maxRadius < -1) { // small polygon, use earcut

        
        const data = earcut.flatten(coordinates);
        const triangles = earcut.default(data.vertices, data.holes, data.dimensions);
        const vertices = [];
        for (let i = 0; i < data.vertices.length; i += 2) {
            const inv = toAzimuthal.inverse([data.vertices[i], data.vertices[i + 1]]);
            inv[2] = height;
            vertices.push(...toCartesian.forward(inv));
            
            
        }
        return {
            indices: new Uint32Array(triangles),
            positions: new Float32Array(vertices)
        }
    }
    else { // large polygon, add inner vertices and use constrained delaunay triangulation

        const points = [[0, 0]]
        let radius = maxSegmentLength * 1000
        while (radius < maxRadius) {
            addPoints(radius, maxSegmentLength * 1000, checkPoint, points)
            radius += maxSegmentLength * 1000
        }

        const edges = []
        coordinates.forEach(poly => {
            let start = points.length
            let end = start + poly.length - 2
            for (let i = 0; i < poly.length - 1; i++) {
                points.push(poly[i])

            }
            for (let i = 0; i < poly.length - 2; i++) edges.push([start + i, start + i + 1])
            edges.push([end, start])
        })
        cleanPSLG(points, edges)
        const triangles = cdt2d(points, edges, { exterior: false })
        points.forEach((point) => {
            const inv = toAzimuthal.inverse(point);
            inv[2] = height;
            const cartesian = toCartesian.forward(inv);
            point[0] = cartesian[0]
            point[1] = cartesian[1]
            point[2] = cartesian[2]
        })

        return {
            indices: new Uint32Array(triangles.flat()),
            positions: new Float32Array(points.flat())
        }
    }


    

    function addPoints(radiusAzimuthal, distance, checkPoint, points) {
        const radius = 2 * 6371000 * Math.sin(radiusAzimuthal / (2 * 6371000))
        const circumference = 2 * Math.PI * radius
        const numPoints = Math.ceil(circumference / distance)
        for (let i = 0; i < numPoints; i++) {
            const theta = (2 * Math.PI * i) / numPoints
            const x = radiusAzimuthal * Math.cos(theta)
            const y = radiusAzimuthal * Math.sin(theta)
            const p = [x, y]
            if (checkPoint(p) < 0) points.push(p)
        }
    }

    function ensureClockwise(polygon) {
        let area = 0;
        for (let i = 0; i < polygon.length - 1; i++) {
            area += (polygon[i][0] * polygon[i + 1][1]) - (polygon[i + 1][0] * polygon[i][1]);
        }
        if (area > 0) {
            polygon.reverse();
        }
    }
}

export function buildLonLatPolygonGeometry(coordinates, maxSegmentLength = 10, lineType = 0) {
    coordinates = splitAntimeridianPolygonWithHoles(coordinates, maxSegmentLength, lineType);

    const vertices = [];
    const allTriangles = [];
    for(let i = 0; i<coordinates.length; i++){
        const shift = vertices.length/3;
        const data = earcut.flatten(coordinates[i]);
        const triangles = earcut.default(data.vertices, data.holes, data.dimensions);
        for(let i = 0; i<data.vertices.length;i+=2){
            vertices.push(data.vertices[i], data.vertices[i+1], 0);
        }
        triangles.forEach(tri=>{
            allTriangles.push(tri+shift)
        })
    }
    
    return {
        indices: new Uint32Array(allTriangles),
        positions: new Float32Array(vertices)
    }
}

export function segmentPolyLine(coordinates, maxDistance, lineType = 0) { //line type 0 for great circle, 1 for constant bearing.
    if (!Array.isArray(coordinates) || coordinates.length === 0) return []
    if (lineType !== 1) lineType = 0
    const segmented = [coordinates[0]]
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lon1, lat1, h1] = coordinates[i]
        const [lon2, lat2, h2] = coordinates[i + 1]
        let distance = (lineType === 0) ? haversineDistance(lon1, lat1, lon2, lat2) : rhumbDistance(lon1, lat1, lon2, lat2)
        if (distance <= maxDistance) {
            segmented.push(coordinates[i + 1])
            continue
        }
        const segments = Math.ceil(distance / maxDistance)
        for (let s = 1; s <= segments; s++) {
            const fraction = s / segments
            const interp = (lineType === 0) ? interpolateGreatCircle(lon1, lat1, lon2, lat2, fraction) : interpolateRhumbLine(lon1, lat1, lon2, lat2, fraction)
            let height
            if (h1 !== undefined && h2 !== undefined) {
                height = h1 + (h2 - h1) * fraction
            } else if (h1 !== undefined) {
                height = h1 * (1 - fraction)
            } else if (h2 !== undefined) {
                height = h2 * fraction
            }
            const point = interp.longitude !== undefined && interp.latitude !== undefined
                ? [interp.longitude, interp.latitude, height !== undefined ? height : undefined]
                : [interp.longitude, interp.latitude]
            if (height !== undefined) point[2] = height
            segmented.push(point)
        }
    }
    return segmented
}

function findIntersection(lon1, lat1, lon2, lat2, lineType) {
    const targetLon = 180;
    lon1 = lon1 > 0 ? lon1 : lon1 + 360;
    lon2 = lon2 > 0 ? lon2 : lon2 + 360;

    let low;
    let high;
    if (lon1 < 180) {
        low = { longitude: lon1, latitude: lat1 };
        high = { longitude: lon2, latitude: lat2 };
    } else {
        high = { longitude: lon1, latitude: lat1 };
        low = { longitude: lon2, latitude: lat2 };
    }
    let fraction = 0.5, interp;

    let j = 0;
    do {
        fraction = (180 - low.longitude) / (high.longitude - low.longitude);
        interp = lineType === 0
            ? interpolateGreatCircle(low.longitude, low.latitude, high.longitude, high.latitude, fraction)
            : interpolateRhumbLine(low.longitude, low.latitude, high.longitude, high.latitude, fraction);
        if (interp.longitude > 0) {
            low = interp;
        } else {
            high = interp;
            high.longitude += 360;
        }
        j++;
    } while (j < 10 && Math.abs((interp.longitude < 0 ? interp.longitude + 360 : interp.longitude) - 180) > 1e-6);


    // Ensure the intersection longitude is exactly at the antimeridian
    interp.longitude = 180;
    return interp;
}
function normalizeLon(lon) {
    lon = Math.floor(lon*1e7)*1e-7;
    while (lon > 180) lon -= 360
    while (lon < -180) lon += 360
    return lon
}
function splitAntimeridianPolygonWithHoles(coordinates, maxSegmentLength = 10, lineType = 0) {
    const mainPolys = splitAntimeridianPolygon(coordinates[0], maxSegmentLength, lineType);
    for(let i = 1; i<coordinates.length; i++){
        const holes = splitAntimeridianPolygon(coordinates[1], maxSegmentLength, lineType);
        mainPolys.forEach(poly=>{
            holes.forEach(hole=>{
                poly.push(hole[0])
            })
        });
    }
    return mainPolys;
}
function splitAntimeridianPolygon(coordinates, maxSegmentLength, lineType = 0) {
    /* if(coordinates[0][0] == coordinates[coordinates.length-1][0] && coordinates[0][1] == coordinates[coordinates.length-1][1]){
        coordinates.length = coordinates.length-1;
    } */
    for (let i = 0; i < coordinates.length; i++) {
        coordinates[i][0] = normalizeLon(coordinates[i][0]);
    }
    const unnormalizedCoordinates = [];
    let highestCrossIndex = -1;
    let highestCross = -1;
    let shift = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        let [lon1, lat1] = coordinates[i];
        unnormalizedCoordinates.push([lon1 + shift, lat1]);
        let [lon2, lat2] = coordinates[(i + 1) % coordinates.length]

        let deltaLon = Math.abs(lon2 - lon1)
        if (deltaLon > 180) deltaLon = 360 - deltaLon

        const isCrossing = deltaLon > 180 || Math.abs(lon2 - lon1) >= 180
        if (isCrossing) {
            if (lon1 != 180 && lon1 != -180 && lon2 != 180 && lon2 != -180) {

                const interp = findIntersection(lon1, lat1, lon2, lat2, lineType);
                unnormalizedCoordinates.push([(lon1 > 0 ? 180 : -180) + shift, interp.latitude]);

            }
            if (lon1 > 0) {
                shift += 360;
            }
            else {
                shift -= 360;
            }
        }
    }
    unnormalizedCoordinates.push([coordinates[coordinates.length - 1][0] + shift, coordinates[coordinates.length - 1][1]]);

    if (unnormalizedCoordinates[0][0] != unnormalizedCoordinates[unnormalizedCoordinates.length - 1][0]) {
        let finalShift = unnormalizedCoordinates[unnormalizedCoordinates.length - 1][0] - unnormalizedCoordinates[0][0];
        if (Math.abs(finalShift) != 360) {
            throw Error("polygon cannot be fixed");
        }

        let indexHighestCross = 0;
        let highestCross = 0;
        for (let i = 0; i < unnormalizedCoordinates.length; i++) {
            if (Math.abs(unnormalizedCoordinates[i][0] % 360) - 180 == 0 && Math.abs(unnormalizedCoordinates[i][1]) > highestCross) {
                indexHighestCross = i;
                highestCross = Math.abs(unnormalizedCoordinates[i][1]);
            }
        }
        const firstPart = unnormalizedCoordinates.splice(0, indexHighestCross);
        for (let i = 1; i < firstPart.length; i++) {
            unnormalizedCoordinates.push([firstPart[i][0] + finalShift, firstPart[i][1]]);
        }
        unnormalizedCoordinates.push([unnormalizedCoordinates[0][0] + finalShift, unnormalizedCoordinates[0][1]]);

        const lat = unnormalizedCoordinates[0][1] > 0 ? 90 : -90;
        unnormalizedCoordinates.unshift([unnormalizedCoordinates[0][0], lat]);
        unnormalizedCoordinates.push([unnormalizedCoordinates[unnormalizedCoordinates.length - 1][0], lat]);
        unnormalizedCoordinates.push(unnormalizedCoordinates[0]);


    }

    let minLon = Number.POSITIVE_INFINITY, maxLon = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < unnormalizedCoordinates.length; i++) {
        let lon = unnormalizedCoordinates[i][0];
        if(lon<minLon) minLon = lon;
        if(lon>maxLon) maxLon = lon;
    }
    minLon = Math.floor((minLon+180)/360)*360-180;
    maxLon = Math.ceil((maxLon+180)/360)*360-180;
    const polys = [];
    for(let i = minLon; i< maxLon;i+=360){
        polys.push(...polygonClipping.intersection([unnormalizedCoordinates], [[[i,-90],[i,90],[i+360,90],[i+360,-90],[i,-90]]]))
    }
    polys.forEach(poly=>{
        poly.forEach(main=>{
            const unshift = 180 -Math.floor((main[0][0]+180)/360)*360-180;
            main.forEach(coordinate=>{
                coordinate[0] = coordinate[0]+unshift;
            })
            
            
        });
        for(let i = 0; i<poly.length; i++){
            poly[i] = segmentPolyLine(poly[i], maxSegmentLength, lineType);
        }
    })

    return polys;



}
/**
 * 
 * @param {Array<Array<number>>} coordinates an array of lon lat points e.g. [[175,34], [185,22],[-170,12]]
 * @param {*} lineType 
 * @returns 
 */
function splitAntimeridianPolyline(coordinates, lineType = 0) {

    const polylines = [[]]
    polylines[0].push([normalizeLon(coordinates[0][0]), coordinates[0][1]])

    for (let i = 0; i < coordinates.length - 1; i++) {
        let [lon1, lat1] = coordinates[i]
        let [lon2, lat2] = coordinates[i + 1]

        lon1 = normalizeLon(lon1)
        lon2 = normalizeLon(lon2)

        let deltaLon = Math.abs(lon2 - lon1)
        if (deltaLon > 180) deltaLon = 360 - deltaLon

        const crosses = deltaLon > 180 || Math.abs(lon2 - lon1) >= 180

        if (crosses) {
            if (lon1 == 180 || lon1 == -180) {
                polylines.push([[lon1 > 0 ? -180 : 180, lat1]])
                polylines[polylines.length - 1].push([normalizeLon(lon2), lat2])
            } else if (lon2 == 180 || lon2 == -180) { // TODO delete, should never happen
                polylines[polylines.length - 1].push([normalizeLon(lon2) > 0 ? -180 : 180, lat2])
                polylines.push([[normalizeLon(lon2), lat2]])
            } else {
                const interp = findIntersection(lon1, lat1, lon2, lat2, lineType)
                const crossingPoint = [lon1 > 0 ? 180 : -180, interp.latitude]

                polylines[polylines.length - 1].push(crossingPoint)

                polylines.push([[lon1 > 0 ? -180 : 180, interp.latitude]])

                polylines[polylines.length - 1].push([normalizeLon(lon2), lat2])
            }

        } else {
            polylines[polylines.length - 1].push([lon2, lat2])
        }
    }

    return polylines.map(poly => poly.map(([lon, lat]) => [
        normalizeLon(lon),
        Math.max(-90, Math.min(90, lat))
    ]))
}