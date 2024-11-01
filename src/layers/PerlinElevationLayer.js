import * as THREE from 'three';
import { ElevationLayer } from './ElevationLayer.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { PerlinElevationWorker } from './workers/PerlinElevationWorker.js';

/**
 * PerlinElevationLayer manages elevation data generation using Web Workers.
 * It ensures that message IDs are correctly managed to prevent mixing up of responses.
 */
class PerlinElevationLayer extends ElevationLayer {
    /**
     * @param {number} [properties.maxResolution = 0] Maximum resolution in meters at the equator
     * @param {*} properties 
     */
    constructor(properties) {
        properties.maxResolution = properties.maxResolution?properties.maxResolution:0;
        super(properties);
        this.min = properties.minHeight !== undefined ? properties.minHeight : -100000;
        this.max = properties.maxHeight !== undefined ? properties.maxHeight : 100000;
        this.maxOctaveSimplex = 3 + Math.random() * 3;
        this.gainSimplex = 0.2 + Math.random() * 0.3;
        this.maxOctaveTurbulence = 3 + Math.random() * 2;
        this.gainTurbulence = 0.2 + Math.random() * 0.23;
        this.warpFactorMultiplier = Math.random() * 0.3 + 0.1;
        this.continentFrequency = 0.2 + Math.random() * 2;
        this.turbulenceUp = 0.25 + Math.random() * 0.5;
        this.freqSup = 0.5 + Math.random() * 1;
        this.gains = Array.from({ length: 20 }, () => 0.55 + Math.random() * 0.1);
        this.shift = [Math.random() * 360, Math.random() * 360, Math.random() * 360];

        this.lacunarities = [1 + Math.random(), 20 + Math.random() * 70];
        let f = 1;
        for (let i = 0; i < this.lacunarities.length; i++) {
            f *= this.lacunarities[i];
        }
        let l = Math.pow(200000 / f, 1 / (15 - this.lacunarities.length));
        this.lacunarities.push(l);
        this.noiseTypes = Array.from({ length: 20 }, () => Math.floor(Math.random() * 3));

        this.biomRepLatitude = Math.random() + 1;
        this.biomRepLongitude = Math.random() + 1;

        // Initialize Worker Pool
        this._initializeWorkerPool();

        // Initialize Noise
        this.perlin = new ImprovedNoise();
        this.rand = Math.random();
        this.halfPI = Math.PI * 0.5;
    }

    /**
     * Initializes the worker pool with the desired concurrency.
     */
    _initializeWorkerPool() {
        this.concurrency = navigator.hardwareConcurrency*0.5; // Number of concurrent workers
        this.workers = [];
        this.workerQueues = [];
        this.workerBusy = [];
        this.workerCallbacks = new Map();
        this.workerOnErrors = new Map();
        this.globalId = 0; // For generating unique message IDs
        this.taskQueue = []; // Central task queue

        // Create Blob URL for the worker script
        const blob = new Blob([PerlinElevationWorker.getScript()], { type: 'application/javascript' });
        this.workerUrl = URL.createObjectURL(blob);

        // Initialize workers
        for (let i = 0; i < this.concurrency; i++) {
            const worker = new Worker(this.workerUrl);
            worker.onmessage = this._handleWorkerResponse.bind(this);
            worker.onerror = this._handleWorkerError.bind(this);
            this.workers.push(worker);
            this.workerQueues.push([]);
            this.workerBusy.push(false);
        }
    }

    /**
     * Generates a unique message ID.
     * @returns {String} Unique message ID
     */
    _generateUniqueId() {
        return `msg-${this.globalId++}`;
    }

    /**
     * Sends a task to the worker pool.
     * @param {Object} data - Data to send to the worker
     * @returns {Promise} Promise that resolves with the worker's response
     */
    _sendWorkerTask(data) {
        return new Promise((resolve, reject) => {
            const messageID = this._generateUniqueId();
            const task = { data,resolve, reject, messageID };
            this.taskQueue.push(task);
            this._assignTasks();
        });
    }

    /**
     * Assigns tasks from the queue to available workers.
     */
    _assignTasks() {
        for (let i = 0; i < this.concurrency; i++) {
            if (!this.workerBusy[i] && this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                this._assignTaskToWorker(i, task);
            }
        }
    }

    /**
     * Assigns a single task to a specific worker.
     * @param {Number} workerIndex - Index of the worker in the pool
     * @param {Object} task - Task containing data, resolve, reject, and messageID
     */
    _assignTaskToWorker(workerIndex, task) {
        const worker = this.workers[workerIndex];
        this.workerBusy[workerIndex] = true;
        this.workerCallbacks.set(task.messageID, { resolve: task.resolve, reject: task.reject });
        worker.postMessage({ id: task.messageID, input: task.data });
    }

    /**
     * Handles responses from workers.
     * @param {MessageEvent} e - Message event from the worker
     */
    _handleWorkerResponse(e) {
        const { id: messageID, error, result } = e.data;
        if (!messageID) {
            console.error("Received message without an ID:", e.data);
            return;
        }

        const workerIndex = this.workers.findIndex(worker => worker === e.target);
        if (workerIndex === -1) {
            console.error("Unknown worker responded:", e.target);
            return;
        }

        const callbacks = this.workerCallbacks.get(messageID);
        if (callbacks) {
            if (error) {
                callbacks.reject(error);
            } else {
                callbacks.resolve(result);
            }
            this.workerCallbacks.delete(messageID);
        } else {
            console.error(`No callbacks found for message ID ${messageID}`);
        }

        this.workerBusy[workerIndex] = false;
        this._assignTasks(); // Assign next task in the queue if available
    }

    /**
     * Handles errors from workers.
     * @param {ErrorEvent} e - Error event from the worker
     */
    _handleWorkerError(e) {
        console.error("Uncaught elevation mesher worker error:", e.message);
        // Optionally, you can implement more sophisticated error handling here
    }

    /**
     * Cleans up workers when the instance is no longer needed.
     */
    terminateWorkers() {
        this.workers.forEach(worker => worker.terminate());
        URL.revokeObjectURL(this.workerUrl);
    }

    /**
     * Generates noise value.
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @returns {Number} Noise value
     */
    noise(x, y, z) {
        return this.perlin.noise(x + this.rand, y + this.rand, z + this.rand) * 2;
    }

    /**
     * Retrieves elevation data using workers.
     * @param {THREE.Box2} bounds - Geographical bounds
     * @param {Number} width - Width of the elevation grid
     * @param {Number} height - Height of the elevation grid
     * @param {THREE.BufferGeometry} geometry - Geometry to update
     * @param {THREE.BufferGeometry} skirtGeometry - Skirt geometry to update
     * @param {Number} [maxOctaves=12] - Maximum number of octaves
     * @returns {Promise<Object>} Promise resolving with elevation data
     */
    getElevation(bounds, width, height, geometry, skirtGeometry, maxOctaves = 12) {
        const trim = super._trimEdges;
        
        return new Promise((resolve, reject) => {
            this._sendWorkerTask({
                bounds: bounds,
                resolution: width,
                min: this.min,
                max: this.max,
                maxOctaves: Math.min(12, maxOctaves),
                lacunarities: this.lacunarities,
                biomRepLongitude: this.biomRepLongitude,
                biomRepLatitude: this.biomRepLatitude,
                shift: this.shift,
                gains: this.gains,
                noiseTypes: this.noiseTypes
            })
                .then(response => {
                    
                    geometry.setIndex(new THREE.Uint32BufferAttribute(new Int32Array(response.indices), 1));
                    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(response.vertices), 3));
                    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(response.normals), 3));
                    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(response.uvs), 2));

                    skirtGeometry.setIndex(new THREE.Uint32BufferAttribute(new Int32Array(response.skirtIndices), 1));
                    skirtGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(response.skirts), 3));
                    skirtGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(response.skirtNormals), 3));
                    skirtGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(response.skirtUVs), 2));

                    geometry.computeBoundingSphere();
                    geometry.computeBoundingBox();
                    skirtGeometry.computeBoundingSphere();
                    const elevationArray = new Float32Array(response.extendedElevationBuffer);
                    resolve({
                        extendedElevationArray: elevationArray,
                        elevationArray: trim(elevationArray, width + 2, height + 2),
                        shift: new THREE.Vector3(response.shift.x, response.shift.y, response.shift.z),
                    });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    /**
     * Another method to retrieve elevation data (original getElevation2).
     * You might want to refactor this to also use workers if needed.
     * @param {THREE.Box2} bounds
     * @param {Number} width
     * @param {Number} height
     * @param {THREE.BufferGeometry} geometry
     * @param {THREE.BufferGeometry} skirtGeometry
     * @param {Number} [maxOctaves=13]
     * @returns {Promise<Object>}
     */
    getElevation2(bounds, width, height, geometry, skirtGeometry, maxOctaves = 13) {
        
        const meshGeneration = super._simpleMeshFromElevationAsync;
        const trim = super._trimEdges;
        return new Promise((resolve, reject) => {
            const extendedBounds = bounds.clone();
            extendedBounds.min.x -= (bounds.max.x - bounds.min.x) / (width - 1);
            extendedBounds.max.x += (bounds.max.x - bounds.min.x) / (width - 1);
            extendedBounds.min.y -= (bounds.max.y - bounds.min.y) / (height - 1);
            extendedBounds.max.y += (bounds.max.y - bounds.min.y) / (height - 1);

            const extendedWidth = width + 2;
            const extendedHeight = height + 2;

            const latStep = (extendedBounds.max.y - extendedBounds.min.y) / (extendedHeight - 1);
            const lonStep = (extendedBounds.max.x - extendedBounds.min.x) / (extendedWidth - 1);

            let baseLat = extendedBounds.min.y;
            let baseLon = extendedBounds.min.x;

            const extendedElevationArray = new Array(extendedWidth * extendedHeight).fill(0);

            let ampTotal = 0;
            let lat = baseLat;
            for (let y = 0; y < extendedHeight; y++, lat += latStep) {
                let lon = baseLon;
                for (let x = 0; x < extendedWidth; x++, lon += lonStep) {
                    let adjustedLon = lon;
                    let adjustedLat = lat;
                    if (adjustedLat > this.halfPI) {
                        adjustedLon -= Math.PI;
                        adjustedLat = this.halfPI - (adjustedLat - this.halfPI);
                    } else if (adjustedLat < -this.halfPI) {
                        adjustedLon -= Math.PI;
                        adjustedLat = -this.halfPI - (adjustedLat + this.halfPI);
                    }
                    if (adjustedLon > Math.PI) {
                        adjustedLon = -Math.PI + (adjustedLon % Math.PI);
                    } else if (adjustedLon < -Math.PI) {
                        adjustedLon = Math.PI + (adjustedLon % Math.PI);
                    }
                    const a = Math.cos(adjustedLat) * Math.cos(adjustedLon);
                    const b = Math.cos(adjustedLat) * Math.sin(adjustedLon);
                    const c = Math.sin(adjustedLat);

                    const warpFactor = this.warpFactorMultiplier * this.noise(a, b, c);
                    const dx = warpFactor * this.noise(a + 0.57, b + 0.1248, c + 0.845);
                    const dy = warpFactor * this.noise(a + 0.1111, b + 0.744, c + 0.154);
                    const dz = warpFactor * this.noise(a + 0.287, b + 0.2678, c + 0.36698);

                    let p2 = 3 * this.noise(
                        (a + 0.214) * this.continentFrequency,
                        (b + 0.569) * this.continentFrequency,
                        (c + 0.648) * this.continentFrequency
                    );
                    let p1 = 3 * this.noise(
                        (a + 0.878) * this.continentFrequency,
                        (b + 0.2456) * this.continentFrequency,
                        (c + 0.211) * this.continentFrequency
                    );

                    const teracingMax = 1 + this.noise(
                        (a + 0.456) * 10.0,
                        (b + 0.678) * 10.0,
                        (c + 0.125) * 10.0
                    );
                    const teracingMin = -(1 + this.noise(
                        (a + 0.168) * 10.0,
                        (b + 0.895) * 10.0,
                        (c + 0.174) * 10.0
                    ));
                    let previousTurbulence = 1;
                    for (let octave = 0; octave < maxOctaves; octave++) {
                        const freq = Math.pow(5, octave + 1 + this.freqSup);
                        const freqSimplex = freq * 0.02;
                        if (octave < this.maxOctaveSimplex) {
                            const ampSimplex = Math.pow(this.gainSimplex, octave + 1) * p2;
                            extendedElevationArray[extendedWidth * y + x] += Math.max(
                                teracingMin,
                                Math.min(
                                    teracingMax,
                                    this.noise(
                                        (a + 0.187 + dx) * freqSimplex,
                                        (b + 0.289 + dy) * freqSimplex,
                                        (c + 0.247 + dz) * freqSimplex
                                    )
                                )
                            ) * ampSimplex;
                        }

                        if (octave < this.maxOctaveTurbulence) {
                            const ampTurbulence = Math.pow(this.gainTurbulence, octave + 1) * p1 * 2;
                            previousTurbulence = Math.max(
                                teracingMin,
                                Math.min(
                                    teracingMax,
                                    Math.abs(this.noise(
                                        (a + 0.966 + dx) * freq,
                                        (b + 0.871 + dy) * freq,
                                        (c + 0.498 + dz) * freq
                                    )) - this.turbulenceUp
                                )
                            ) * ampTurbulence * previousTurbulence;
                            extendedElevationArray[extendedWidth * y + x] += previousTurbulence;
                        }
                    }
                }
            }

            for (let octave = 0; octave < 13; octave++) {
                if (octave < this.maxOctaveSimplex) {
                    ampTotal += Math.pow(this.gainSimplex, octave + 1);
                }
                if (octave < this.maxOctaveTurbulence) {
                    ampTotal += Math.pow(this.gainTurbulence, octave + 1);
                }
            }

            for (let x = 0; x < extendedWidth; x++) {
                for (let y = 0; y < extendedHeight; y++) {
                    extendedElevationArray[extendedWidth * y + x] =
                        (((extendedElevationArray[extendedWidth * y + x] / ampTotal) + 1) * 0.5) *
                            (this.max - this.min) +
                        this.min;
                }
            }

            let shift;
            if (geometry && skirtGeometry) {
                shift = meshGeneration(bounds, width, height, extendedElevationArray, geometry, skirtGeometry);
            }

            resolve({
                elevationArray: trim(extendedElevationArray, width, height),
                shift: shift,
            });
        });
    }

    /**
     * Generates a random rotation.
     * @returns {Array} Array containing three random rotation angles
     */
    generateRandomRotation() {
        const u1 = Math.random();
        const u2 = Math.random();
        const u3 = Math.random();
        return [u1, u2, u3];
    }

    /**
     * Generates a random orthogonal matrix.
     * @returns {Array} 3x3 rotation matrix as a flat array
     */
    generateRandomOrthogonalMatrix() {
        const u1 = Math.random();
        const u2 = Math.random();
        const u3 = Math.random();

        const q0 = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
        const q1 = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
        const q2 = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
        const q3 = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);

        const m = [
            1 - 2 * (q2 * q2 + q3 * q3),
            2 * (q1 * q2 - q0 * q3),
            2 * (q1 * q3 + q0 * q2),

            2 * (q1 * q2 + q0 * q3),
            1 - 2 * (q1 * q1 + q3 * q3),
            2 * (q2 * q3 - q0 * q1),

            2 * (q1 * q3 - q0 * q2),
            2 * (q2 * q3 + q0 * q1),
            1 - 2 * (q1 * q1 + q2 * q2)
        ];

        return m;
    }

    /**
     * Generates a random 3x3 matrix and normalizes its rows.
     * @returns {Array} 3x3 normalized matrix as a flat array
     */
    generateRandomMatrixAndScale() {
        let m = Array.from({ length: 9 }, () => Math.random() * 10 - 5);

        let scales = [
            Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2),
            Math.sqrt(m[3] ** 2 + m[4] ** 2 + m[5] ** 2),
            Math.sqrt(m[6] ** 2 + m[7] ** 2 + m[8] ** 2),
        ];

        for (let i = 0; i < 3; i++) {
            const scale = scales[i] || 1; // Prevent division by zero
            for (let j = 0; j < 3; j++) {
                m[i * 3 + j] /= scale;
            }
        }

        return m;
    }

    /**
     * Cleans up resources when the instance is destroyed.
     */
    dispose() {
        this.terminateWorkers();
        super.dispose();
    }
}

export { PerlinElevationLayer };
