import { ElevationLayer } from './ElevationLayer.js'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const perlin = new ImprovedNoise();
const rand = Math.random();
const halfPI = Math.PI*0.5;
function noise(x,y,z){
    return perlin.noise(x+rand,y+rand,z+rand)*2;
}

/**
 * An elevation layer that generates on the fly elevation using a mixture of noise techniques
 * @class
 * @extends ElevationLayer
 */
class PerlinElevationLayer extends ElevationLayer {

    /**
     * Base constructor for elevation layers.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number[]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Number} properties.minHeight min terrain height relative to sea level
     * @param {Number} properties.maxHeight max terrain height relative to sea level
     * @param {Boolean} properties.visible layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.min = properties.minHeight? this.minHeight : -10000-Math.random()*10000;
        this.max = properties.maxHeight? this.maxHeight : 10000+Math.random()*22000;
        this.maxOctaveSimplex = 3 + Math.random() * 3;
        this.gainSimplex = 0.2+Math.random()*0.3;//0.5 + Math.random() * 0.2;
        this.maxOctaveTurbulence = 3 + Math.random() * 2;
        this.gainTurbulence = 0.2+Math.random()*0.23;//0.7;//0.5 + Math.random() * 0.2;
        this.warpFactorMultiplier = Math.random() * 0.3 + 0.1;
        this.continentFrequency = 0.2+Math.random() * 2;
        this.turbulenceUp = 0.25+Math.random()*0.5;
        this.freqSup = 1+Math.random()*1;
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
                let adjustedLon = lon;
                let adjustedLat = lat;
                if(adjustedLat>halfPI){
                    adjustedLon-=Math.PI;
                    adjustedLat = halfPI - (adjustedLat-halfPI)
                }else if (adjustedLat < -halfPI) {
                    adjustedLon -= Math.PI;
                    adjustedLat = -halfPI - (adjustedLat + halfPI)
                }
                if(adjustedLon>Math.PI){
                    adjustedLon = -Math.PI+(adjustedLon%Math.PI);
                }
                else if(adjustedLon<-Math.PI){
                    adjustedLon = Math.PI+(adjustedLon%Math.PI);
                }
                let a = Math.cos(adjustedLat) * Math.cos(adjustedLon);
                let b = Math.cos(adjustedLat) * Math.sin(adjustedLon);
                let c = Math.sin(adjustedLat);

                
                const warpFactor = this.warpFactorMultiplier * noise(a, b, c);
                const dx = warpFactor * noise(a+0.57, b+0.1248, c+0.845);
                const dy = warpFactor * noise(a+0.1111, b+0.744, c+0.154);
                const dz = warpFactor * noise(a+0.287, b+0.2678, c+0.36698);

                let p2 = 3*(noise((a+0.214) * this.continentFrequency, (b+0.569) * this.continentFrequency, (c+0.648) * this.continentFrequency));
                let p1 = 3*(noise((a+0.878) * this.continentFrequency, (b+0.2456) * this.continentFrequency, (c+0.211) * this.continentFrequency));
                //p1 = Math.sign(p1)*Math.sqrt(Math.abs(p1));
                //p2 = Math.sign(p2)*Math.sqrt(Math.abs(p2));

                const teracingMax = (1 + (noise((a+0.456)*10.0, (b+0.678)*10.0, (c+0.125)*10.0)));
                const teracingMin = -(1 + (noise((a+0.168)*10.0, (b+0.895)*10.0, (c+0.174)*10.0)));
                let previousTurbulence = 1;
                for (let octave = 0; octave < maxOctaves; octave++) {
                    const freq = Math.pow(5, octave + 1 + this.freqSup);
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

    
}

export { PerlinElevationLayer };