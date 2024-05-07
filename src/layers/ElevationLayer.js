import * as THREE from 'three';
import { RasterLayer } from './RasterLayer.js';
import { TerrainMeshGenerator } from '../planet/TerrainMeshGenerator';
import {ElevationMesherWorker} from './workers/ElevationMesher.worker.js';

const terrainMeshGenerator = new TerrainMeshGenerator();
let id = 0;
let nextWorker = 0;
function getConcurency() {
    /* if ('hardwareConcurrency' in navigator) {
        return navigator.hardwareConcurrency;
    } else {
        return 4;
    } */
    return 1;
}
const meshGeneratorWorkers = [];
const workerCallbacks = new Map();
const workerOnErrors = new Map();

const blob = new Blob([ElevationMesherWorker.getScript()], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
for (let i = 0; i < getConcurency(); i++) {
    const elevationMesherWorker = new Worker(workerUrl);
    elevationMesherWorker.onmessage = handleWorkerResponse;
    elevationMesherWorker.onerror = handleWorkerError;
    meshGeneratorWorkers.push(elevationMesherWorker);
}

function sendWorkerTask(data, callback, onerror) {
    const messageID = id++;
    workerCallbacks.set(messageID, callback);
    workerOnErrors.set(messageID, onerror);
    nextWorker = (nextWorker + 1) % meshGeneratorWorkers.length;
    meshGeneratorWorkers[nextWorker].postMessage({ id: messageID, input: data });
}

function handleWorkerResponse(e) {
    if (e.data.error) {
        workerOnErrors.get(e.data.id)(e.data.error);
    } else {
        workerCallbacks.get(e.data.id)(e.data.result);
    }
    workerCallbacks.delete(e.data.id);
    workerOnErrors.delete(e.data.id);
}
function handleWorkerError(error) {
    console.error("uncaught elevation mesher worker error : " + error)
}


/**
 * Base constructor for all terrain elevation layers.
 * @class
 * @extends RasterLayer
 */
class ElevationLayer extends RasterLayer {
    /**
     * Base constructor for elevation layers.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.isElevationLayer = true;
    }

    /**
     * Returns a 2D elevation array and populates a tile's geometry and skirtGeometry.
     * The generated geometry does not have to match the elevation array exactly. It can represent overhanging features for example but 
     * the elevation array is expected to correspond at least roughly to the geometry's highest points.
     * 
     * @param {THREE.Box2} bounds 
     * @param {Number} width width resolution for the elevation
     * @param {Number} height height resolution for the elevation
     * @param {THREE.BufferGeometry|undefined} geometry a tile's buffer geometry to be filled with actual geometry
     * @param {THREE.BufferGeometry|undefined} skirtGeometry a skirt geometry to be filled with actual skirts
     * @returns {Promise} a promise for an elevation array
     */
    getElevation(bounds, width, height, geometry, skirtGeometry) {
        throw "not implemented, should be implemented by children of ElevationLayer"
        // to be implemented by children
    }

    /**
     * A default mesh generation function given some elevation.
     * 
     * @param {THREE.Box2} bounds 
     * @param {Number} width 
     * @param {Number} height 
     * @param {Number[]} extendedElevation elevation array extended by 1 in all directions (for correct normals on the edges) 
     * @param {THREE.BufferGeometry} geometry 
     * @param {THREE.BufferGeometry} skirtGeometry 
     * @returns {Promise(THREE.Vector3)} the shift to apply to the tile (for numerical stability)
     */
    _simpleMeshFromElevation(bounds, width, height, extendedElevation, geometry, skirtGeometry) {

        let shift;
        if (bounds.max.y >= 1.57079632) {
            shift = terrainMeshGenerator.generateNorthPoleTile(geometry, skirtGeometry, width, bounds, extendedElevation);
        } else if (bounds.min.y <= -1.57079632) {
            shift = terrainMeshGenerator.generateSouthPoleTile(geometry, skirtGeometry, width, bounds, extendedElevation);
        } else {
            shift = terrainMeshGenerator.generateBaseTile(geometry, skirtGeometry, width, bounds, extendedElevation);
        }
        return shift;
    }

    /**
     * A default mesh generation function given some elevation using web workers.
     * 
     * @param {THREE.Box2} bounds 
     * @param {Number} width 
     * @param {Number} height 
     * @param {Number[]} extendedElevation elevation array extended by 1 in all directions (for correct normals on the edges) 
     * @param {THREE.BufferGeometry} geometry 
     * @param {THREE.BufferGeometry} skirtGeometry 
     * @returns {Promise(THREE.Vector3)} the shift to apply to the tile (for numerical stability)
     */
    _simpleMeshFromElevationAsync(bounds, width, height, extendedElevation, geometry, skirtGeometry) {

        return new Promise((resolve, reject) => {
            sendWorkerTask({ bounds: bounds, resolution: width, extendedElevation: extendedElevation },
                (response) => {
                    //console.log(response);
                    geometry.setIndex(new THREE.Uint32BufferAttribute(new Int32Array(response.indices),1));
                    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(response.vertices), 3));
                    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(response.normals), 3));
                    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(response.uvs), 2));

                    skirtGeometry.setIndex(new THREE.Uint32BufferAttribute(new Int32Array(response.skirtIndices),1));
                    skirtGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(response.skirts), 3));
                    skirtGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(response.skirtNormals), 3));
                    skirtGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(response.skirtUVs), 2));

                    geometry.computeBoundingSphere();
                    geometry.computeBoundingBox();
                    skirtGeometry.computeBoundingSphere();
                    resolve(new THREE.Vector3(response.shift.x, response.shift.y, response.shift.z));
                }, (error) => {
                    reject(error);
                });
        });
    }

    /**
     * Trims the edges of an elevation array by 1 on all sides
     * @param {*} arr elevation array width+2 height+2
     * @param {*} width the desired width
     * @param {*} height the desired height
     * @returns the trimmed array
     */
    _trimEdges(arr, width, height,) {
        const result = [];

        for (let row = 1; row < height - 1; row++) {
            for (let col = 1; col < width - 1; col++) {
                result.push(arr[row * width + col]);
            }
        }

        return result;
    }
}

export { ElevationLayer }