import * as THREE from "three";
import WorkerPool from '../utils/WorkerPool.js'
import Worker from './GeoShape.worker.js';

let pool;
let parallelism;

/**
 * Sets the parallelism (number of workers) for creating geo shapes.
 * If used, should be called before creating any shape. the parameter does not re-create a worker pool if already instantiated.
 * @param {number} [aParallelism = navigator.hardwareConcurrency] number of workers. 
 */
export function setParallelism(aParallelism){
    parallelism = aParallelism;
}

/**
 * builds a three.js geometry for a polygon at a specific height above wgs84 ellipsoid.
 * The polygon is segmented in order to follow the curvature of the earth.
 * @param {Array<Array<Array<Number>>>} coordinates an array containing the polygon coordinates in lon lat potentially with holes, e.g.: [[[45.5,24.2], [45.5,25.2], [46.5,25.2], [46.5,24.2]],[[40.5,24.2], [40.5,25.2], [41.5,25.2], [41.5,24.2]]].
 *                            The main polygon and holes will be automatically closed.
 * @param {number} [maxSegmentLength = 10] a distance in kilometers used to segment the poligon so that it follows the earth curvature.
 * @param {number} [height = 0] the polygon height above wgs84 ellipsoid
 * @param {number} [lineType = 0] 0 for geodesic lines, 1 for rhumb lines
 * @returns 
 */
export async function buildPolygon(coordinates, maxSegmentLength = 10, height, lineType = 0) {
    if (!pool) {
        pool = new WorkerPool(Worker,parallelism)
    }
    return pool.runTask({
        method: "polygon",
        coordinates: coordinates,
        maxSegmentLength: maxSegmentLength,
        height: height,
        lineType: lineType
    }).then(result => {
        if (result.error) throw new Error(result.error);
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(Array.from(result.polygonGeometry.indices));
        geometry.setAttribute('position', new THREE.BufferAttribute(result.polygonGeometry.positions, 3));

        return geometry;
    })
}

/**
* builds a three.js geometry for a polygon in lon lat (no height).
* The polygon is segmented in order to follow the curvature of the earth.
* @param {Array<Array<Array<Number>>>} coordinates an array containing the polygon coordinates in lon lat potentially with holes, e.g.: [[[45.5,24.2], [45.5,25.2], [46.5,25.2], [46.5,24.2]],[[40.5,24.2], [40.5,25.2], [41.5,25.2], [41.5,24.2]]].
*                            The main polygon and holes will be automatically closed.
* @param {number} [maxSegmentLength = 10] a distance in kilometers used to segment the poligon so that it follows the earth curvature.
* @param {number} [lineType = 0] 0 for geodesic lines, 1 for rhumb lines
* @returns 
*/
export async function buildLonLatPolygon(coordinates, maxSegmentLength = 10, lineType = 0) {
    if (!pool) {
        pool = new WorkerPool(Worker,parallelism)
    }
    return pool.runTask({
        method: "lonLatPolygon",
        coordinates: coordinates,
        maxSegmentLength: maxSegmentLength,
        lineType: lineType
    }).then(result => {
        if (result.error) throw new Error(result.error);
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(Array.from(result.lonLatPolygonGeometry.indices));
        geometry.setAttribute('position', new THREE.BufferAttribute(result.lonLatPolygonGeometry.positions, 3));

        return geometry;
    });
}

/**
 * @param {Array<Array<Number>>} coordinates aArray of [longitude, latitude, height?] points where height defaults to 0. e.g.: [[45.5,24.2,5.0], [45.5,25.2], [46.5,25.2], [46.5,24.2,2.0]]
 * @param {number} [maxSegmentLength = 10] a maximum distance in kilometers for a line segment allowing long segments to be split in order to follow the earth curvature.
 * @param {number} [height = undefined] the polyline height above wgs84 ellipsoid. if undefined, the height from the coordinates is used
 * @param {number} [lineType = 0] 0 for geodesic lines, 1 for rhumb lines
 */
export async function buildPolyline(coordinates, maxSegmentLength = 10, height, lineType = 0) {
    if (!pool) {
        pool = new WorkerPool(Worker,parallelism)
    }
    return pool.runTask({
        method: "polyline",
        coordinates: coordinates,
        maxSegmentLength: maxSegmentLength,
        height: height,
        lineType: lineType
    }).then(result => {
        if (result.error) throw new Error(result.error);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(result.polylineGeometry.positions, 3));

        return geometry;
    });
}

/**
 * @param {Array<Array<Number>>} coordinates aArray of [longitude, latitude, height?] points where height defaults to 0. e.g.: [[45.5,24.2,5.0], [45.5,25.2], [46.5,25.2], [46.5,24.2,2.0]]
 * @param {number} [maxSegmentLength = 10] a maximum distance in kilometers for a line segment allowing long segments to be split in order to follow the earth curvature.
 * @param {number} [lineType = 0] 0 for geodesic lines, 1 for rhumb lines
 */
export async function buildLonLatPolyline(coordinates, maxSegmentLength = 10, lineType = 0) {
    if (!pool) {
        pool = new WorkerPool(Worker,parallelism)
    }
    return pool.runTask({
        method: "lonLatPolyline",
        coordinates: coordinates,
        maxSegmentLength: maxSegmentLength,
        lineType: lineType
    }).then(result => {
        if (result.error) throw new Error(result.error);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(result.lonLatPolylineGeometry.positions, 3));

        return geometry;
    });
}

export async function buildPoints(points) {
    if (!pool) {
        pool = new WorkerPool(Worker,parallelism)
    }
    return pool.runTask({
        method: "point",
        coordinates: points
    }).then(result => {
        if (result.error) throw new Error(result.error);
        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(result.pointsGeometry.positions, 3));
        return bufferGeometry;
    });
}

export async function buildLonLatPoints(points) {
    const geometry = new THREE.BufferGeometry();
    points.forEach(p=>{
        p[2] = 0;
    })
    const flatVertices = points.flat();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flatVertices), 3));
    return geometry;
}



