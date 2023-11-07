import { ElevationLayer } from './ElevationLayer.js'
import * as simplex from "fast-simplex-noise";
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
const simplexFunctions = [];
for (let i = 0; i < 10; i++) {
    simplexFunctions[i] = simplex.makeNoise3D();
}
const perlin = new ImprovedNoise();
const rand = Math.random();
function noise(x,y,z){
    return perlin.noise(x+rand,y+rand,z+rand)*2;
}

class PerlinElevationLayer extends ElevationLayer {

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
     */
    constructor(properties) {
        super(properties);
        this.min = properties.minHeight? this.minHeight : -10000-Math.random()*10000;
        this.max = properties.maxHeight? this.maxHeight : 10000+Math.random()*22000;
        this.maxOctaveSimplex = 3 + Math.random() * 3;
        this.gainSimplex = 0.5 + Math.random() * 0.2;
        this.maxOctaveTurbulence = 3 + Math.random() * 2;
        this.gainTurbulence = 0.5 + Math.random() * 0.2;
        this.warpFactorMultiplier = Math.random() * 0.3 + 0.1;
        this.continentFrequency = 0.2+Math.random() * 2;
        this.turbulenceUp = Math.random();
        this.octaveSup = 1+Math.random()*1;
    }

    getElevation(bounds, width, height, maxOctaves = 13) {




        const latStep = (bounds.max.y - bounds.min.y) / (height - 1);
        const lonStep = (bounds.max.x - bounds.min.x) / (width - 1);

        let baseLat = bounds.min.y;
        let baseLon = bounds.min.x;

        var elevationArray = new Array(width * height).fill(0);


        let ampTotal = 0;
        let lat = baseLat;
        for (let y = 0; y < height; y++, lat += latStep) {
            let lon = baseLon;
            for (let x = 0; x < width; x++, lon += lonStep) {
                let a = Math.cos(lat) * Math.cos(lon);
                let b = Math.cos(lat) * Math.sin(lon);
                let c = Math.sin(lat);

                const warpFactor = this.warpFactorMultiplier * noise(a, b, c);
                const dx = warpFactor * noise(a+0.57, b+0.1248, c+0.845);
                const dy = warpFactor * noise(a+0.1111, b+0.744, c+0.154);
                const dz = warpFactor * noise(a+0.287, b+0.2678, c+0.36698);

                let p2 = (noise((a+0.214) * this.continentFrequency, (b+0.569) * this.continentFrequency, (c+0.648) * this.continentFrequency));
                let p1 = (noise((a+0.878) * this.continentFrequency, (b+0.2456) * this.continentFrequency, (c+0.211) * this.continentFrequency));


                const teracingMax = (1 + (noise(a+0.456, b+0.678, c+0.125)));
                const teracingMin = -(1 + (noise(a+0.168, b+0.895, c+0.174)));
                let previousTurbulence = 1;
                for (let octave = 0; octave < maxOctaves; octave++) {
                    const freq = Math.pow(5, octave + 1 + this.octaveSup);
                    const freqSimplex = freq * 0.02;
                    if (octave < this.maxOctaveSimplex) {
                        const ampSimplex = Math.pow(this.gainSimplex, octave + 1) * p2;
                        elevationArray[width * y + x] += Math.max(teracingMin, Math.min(teracingMax, noise((a+0.187 + dx) * freqSimplex, (b+0.289 + dy) * freqSimplex, (c+0.247 + dz) * freqSimplex))) * ampSimplex;

                    }

                    if (octave < this.maxOctaveTurbulence) {
                        const ampTurbulence = Math.pow(this.gainTurbulence, octave + 1) * (p1)*2;
                        //previousTurbulence = -(2.0 * (Math.max(teracingMin, Math.min(teracingMax, Math.abs(noise((a+0.966 + dx) * freq, (b+0.871 + dy) * freq, (c+0.498 + dz) * freq))))) - 1.0) * ampTurbulence * previousTurbulence;
                        previousTurbulence = Math.max(teracingMin, Math.min(teracingMax, Math.abs(noise((a+0.966 + dx) * freq, (b+0.871 + dy) * freq, (c+0.498 + dz) * freq))- this.turbulenceUp)) * ampTurbulence * previousTurbulence;
                        elevationArray[width * y + x] += previousTurbulence;
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

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                elevationArray[width * y + x] = (((elevationArray[width * y + x] / ampTotal)+1)*0.5) * (this.max-this.min) + this.min /* + elevationMultiplierArray[width * y + x]*8000 */;
            }
        }


        return Promise.resolve(elevationArray);
    };

    medianFilterInner(data, width, height) {
        const innerWidth = width - 2;
        const innerHeight = height - 2;
        const result = new Array(innerWidth * innerHeight);
        const getMedian = (arr) => {
            const mid = Math.floor(arr.length / 2);
            const nums = [...arr].sort((a, b) => a - b);
            return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        };
        const getMax = (arr) => {
            return Math.max(...arr);
        };

        for (let x = 1; x <= innerWidth; x++) {
            for (let y = 1; y <= innerHeight; y++) {
                const neighbors = [];
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        neighbors.push(data[ny * width + nx]);
                    }
                }
                result[(y - 1) * innerWidth + (x - 1)] = getMax(neighbors);
            }
        }
        return result;
    }



    gaussianFilterInner(data, width, height) {
        const innerWidth = width - 2;
        const innerHeight = height - 2;
        const result = new Array(innerWidth * innerHeight);
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kernelSize = 3;
        const kernelSum = 16; // Sum of the kernel weights

        for (let x = 1; x <= innerWidth; x++) {
            for (let y = 1; y <= innerHeight; y++) {
                let weightedSum = 0;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        const weight = kernel[(dx + 1) * kernelSize + (dy + 1)];
                        weightedSum += data[ny * width + nx] * weight;
                    }
                }
                result[(y - 1) * innerWidth + (x - 1)] = weightedSum / kernelSum;
            }
        }
        return result;
    }
}

export { PerlinElevationLayer };