import {common} from "./common.worker.js"

const PerlinElevationWorker = {
    getScript : () => {
        return `
        onmessage = function (e) {
            const id = e.data.id;
            try {
                postMessage({ id: id, result: generateElevationAndMesh(e.data.input) });
            } catch (error) {
                postMessage({ id: id, error: error });
            }
        };
        
        function generateElevationAndMesh(params) {

            const extendedBounds =
            {
                min: {
                    x: params.bounds.min.x - (params.bounds.max.x - params.bounds.min.x) / (params.resolution - 1),
                    y: params.bounds.min.y - (params.bounds.max.y - params.bounds.min.y) / (params.resolution - 1)
                },
                max: {
                    x: params.bounds.max.x + (params.bounds.max.x - params.bounds.min.x) / (params.resolution - 1),
                    y: params.bounds.max.y + (params.bounds.max.y - params.bounds.min.y) / (params.resolution - 1)
                }
            };
        
        
            const extendedWidth = params.resolution + 2;
            const extendedHeight = params.resolution + 2;
        
        
            const latStep = (extendedBounds.max.y - extendedBounds.min.y) / (extendedHeight - 1);
            const lonStep = (extendedBounds.max.x - extendedBounds.min.x) / (extendedWidth - 1);
        
            let baseLat = extendedBounds.min.y;
            let baseLon = extendedBounds.min.x;
        
            var extendedElevationArrayBuffer = new ArrayBuffer(extendedWidth * extendedHeight * Float32Array.BYTES_PER_ELEMENT);
            var extendedElevation = new Float32Array(extendedElevationArrayBuffer);
            
            let ampTotal = 0;
            let lat = baseLat;
            for (let y = 0; y < extendedHeight; y++, lat += latStep) {
                let lon = baseLon;
                for (let x = 0; x < extendedWidth; x++, lon += lonStep) {
                    let adjustedLon = lon;
                    let adjustedLat = lat;
                    if (adjustedLat > 1.57079632679) {
                        adjustedLon -= Math.PI;
                        adjustedLat = 1.57079632679 - (adjustedLat - 1.57079632679)
                    } else if (adjustedLat < -1.57079632679) {
                        adjustedLon -= Math.PI;
                        adjustedLat = -1.57079632679 - (adjustedLat + 1.57079632679)
                    }
                    if (adjustedLon > Math.PI) {
                        adjustedLon = -Math.PI + (adjustedLon % Math.PI);
                    }
                    else if (adjustedLon < -Math.PI) {
                        adjustedLon = Math.PI + (adjustedLon % Math.PI);
                    }

                    
                    let a = Math.cos(adjustedLat) * Math.cos(adjustedLon);
                    let b = Math.cos(adjustedLat) * Math.sin(adjustedLon);
                    let c = Math.sin(adjustedLat);
        
        
                    const warpFactor = noise(a, b, c);
                    const dx = warpFactor * noise(a + 0.57, b + 0.1248, c + 0.845);
                    const dy = warpFactor * noise(a + 0.1111, b + 0.744, c + 0.154);
                    const dz = warpFactor * noise(a + 0.287, b + 0.2678, c + 0.36698);
                    
                    let p2 = 3 * (noise((a + 0.214) * params.continentFrequency, (b + 0.569) * params.continentFrequency, (c + 0.648) * params.continentFrequency));
                    let p1 = 3 * (noise((a + 0.878) * params.continentFrequency, (b + 0.2456) * params.continentFrequency, (c + 0.211) * params.continentFrequency));
                    //p1 = Math.sign(p1)*Math.sqrt(Math.abs(p1));
                    //p2 = Math.sign(p2)*Math.sqrt(Math.abs(p2));
        
                    const teracingMax = (1 + (noise((a + 0.456) * 10.0, (b + 0.678) * 10.0, (c + 0.125) * 10.0)));
                    const teracingMin = -(1 + (noise((a + 0.168) * 10.0, (b + 0.895) * 10.0, (c + 0.174) * 10.0)));
                    
                    let previousTurbulence = 1;
                    
                    for (let octave = 0; octave < params.maxOctaves; octave++) {
                        const freq = Math.pow(5, octave + 1 + params.freqSup);
                        const freqSimplex = freq * 0.02;
                        
                        if (octave < params.maxOctaveSimplex) {
                            const ampSimplex = Math.pow(params.gainSimplex, octave + 1) * p2;
                            extendedElevation[extendedWidth * y + x] += Math.max(teracingMin, Math.min(teracingMax, noise((a + 0.187 + dx) * freqSimplex, (b + 0.289 + dy) * freqSimplex, (c + 0.247 + dz) * freqSimplex))) * ampSimplex;
                            
                        }
        
                        if (octave < params.maxOctaveTurbulence) {
                            
                            const ampTurbulence = Math.pow(params.gainTurbulence, octave + 1) * (p1) * 2;
                            //previousTurbulence = -(2.0 * (Math.max(teracingMin, Math.min(teracingMax, Math.abs(noise((a+0.966 + dx) * freq, (b+0.871 + dy) * freq, (c+0.498 + dz) * freq))))) - 1.0) * ampTurbulence * previousTurbulence;
                            previousTurbulence = Math.max(teracingMin, Math.min(teracingMax, Math.abs(noise((a + 0.966 + dx) * freq, (b + 0.871 + dy) * freq, (c + 0.498 + dz) * freq)) - params.turbulenceUp)) * ampTurbulence * previousTurbulence;
                            extendedElevation[extendedWidth * y + x] += previousTurbulence;
                        }
                    }
                }
            }
            for (let octave = 0; octave < 13; octave++) {
                if (octave < params.maxOctaveSimplex) {
                    ampTotal += Math.pow(params.gainSimplex, octave + 1);
                }
                if (octave < params.maxOctaveTurbulence) {
                    ampTotal += Math.pow(params.gainTurbulence, octave + 1);
                }
            }
        
            
            for (let x = 0; x < extendedWidth; x++) {
                for (let y = 0; y < extendedHeight; y++) {
                    extendedElevation[extendedWidth * y + x] = (((extendedElevation[extendedWidth * y + x] / ampTotal) + 1) * 0.5) * (params.max - params.min) + params.min;
                }
            }
        
            
            let result;
            if (params.bounds.max.y >= 1.57079632) {
                result = generateNorthPoleTile(params.resolution, params.bounds, extendedElevation);
            } else if (params.bounds.min.y <= -1.57079632) {
                result = generateSouthPoleTile(params.resolution, params.bounds, extendedElevation);
            } else {
                result = generateBaseTile(params.resolution, params.bounds, extendedElevation);
            }
            result.extendedElevationBuffer = extendedElevationArrayBuffer;
            return result;
        }

        const _p = [ 151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10,
            23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87,
            174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
            133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
            89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
            202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
            248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
            178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
            14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
            93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180 ];
       
       for ( let i = 0; i < 256; i ++ ) {
       
           _p[ 256 + i ] = _p[ i ];
       
       }
       
       function fade( t ) {
       
           return t * t * t * ( t * ( t * 6 - 15 ) + 10 );
       
       }
       
       function lerp( t, a, b ) {
       
           return a + t * ( b - a );
       
       }
       
       function grad( hash, x, y, z ) {
       
           const h = hash & 15;
           const u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
           return ( ( h & 1 ) == 0 ? u : - u ) + ( ( h & 2 ) == 0 ? v : - v );
       
       }

       const rand = Math.random();

       function noise( x, y, z ) {
           x+=rand;
           y+=rand;
           z+=rand;

		const floorX = Math.floor( x ), floorY = Math.floor( y ), floorZ = Math.floor( z );

		const X = floorX & 255, Y = floorY & 255, Z = floorZ & 255;

		x -= floorX;
		y -= floorY;
		z -= floorZ;

		const xMinus1 = x - 1, yMinus1 = y - 1, zMinus1 = z - 1;

		const u = fade( x ), v = fade( y ), w = fade( z );

		const A = _p[ X ] + Y, AA = _p[ A ] + Z, AB = _p[ A + 1 ] + Z, B = _p[ X + 1 ] + Y, BA = _p[ B ] + Z, BB = _p[ B + 1 ] + Z;

		return 2*lerp( w, lerp( v, lerp( u, grad( _p[ AA ], x, y, z ),
			grad( _p[ BA ], xMinus1, y, z ) ),
		lerp( u, grad( _p[ AB ], x, yMinus1, z ),
			grad( _p[ BB ], xMinus1, yMinus1, z ) ) ),
		lerp( v, lerp( u, grad( _p[ AA + 1 ], x, y, zMinus1 ),
			grad( _p[ BA + 1 ], xMinus1, y, zMinus1 ) ),
		lerp( u, grad( _p[ AB + 1 ], x, yMinus1, zMinus1 ),
			grad( _p[ BB + 1 ], xMinus1, yMinus1, zMinus1 ) ) ) );

	}
        `+common.getGenerateTerrainTile();
    }
};
export{PerlinElevationWorker};

