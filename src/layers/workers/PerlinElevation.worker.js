import { common } from "./common.worker.js"

const PerlinElevationWorker = {

    /*
    indices: indicesBuffer,
                vertices: verticesSharedbuffer,
                normals: normalsSharedbuffer,
                uvs: uvsSharedbuffer,
                skirtIndices: skirtIndicesBuffer,
                skirts: skirtVerticesSharedbuffer,
                skirtNormals: skirtNormalsSharedbuffer,
                skirtUVs: skirtUVsSharedbuffer
    */

    getScript: () => {
        return `
        onmessage = function (e) {
            const id = e.data.id;
            try {
            const result = generateElevationAndMesh(e.data.input);
                postMessage({ id: id, result: result }, [result.vertices, result.normals, result.uvs, result.skirtIndices, result.skirts, result.skirtNormals, result.skirtUVs, result.extendedElevationBuffer]);
            } catch (error) {
                postMessage({ id: id, error: error });
            }
        };

        function hash(x, y, z) {
            let n = x * 3 + y * 113 + z * 311;
            n = (n << 13) ^ n;
            n = n * (n * 15731 + 789221) + 1376312589;
            return -1.0 + 2.0 * (n & 0x0fffffff) / 0x0fffffff;
        }
        function noised(x, y, z) {
            const floorX = Math.floor(x), floorY = Math.floor(y), floorZ = Math.floor(z);
            const wX = x - floorX, wY = y - floorY, wZ = z - floorZ;
        
            // Reduce the complexity of polynomial computations by pre-calculating repeated expressions
            const wx2 = wX * wX, wy2 = wY * wY, wz2 = wZ * wZ;
            const wx3 = wx2 * wX, wy3 = wy2 * wY, wz3 = wz2 * wZ;
            const wx4 = wx3 * wX, wy4 = wy3 * wY, wz4 = wz3 * wZ;
            const wx5 = wx4 * wX, wy5 = wy4 * wY, wz5 = wz4 * wZ;
        
            const uX = wx3 * (wX * (wX * 6 - 15) + 10);
            const uY = wy3 * (wY * (wY * 6 - 15) + 10);
            const uZ = wz3 * (wZ * (wZ * 6 - 15) + 10);
        
            // Optimize derivative calculations by directly using the pre-calculated power values
            const duX = 30.0 * (wx4 - 2.0 * wx3 + wx2);
            const duY = 30.0 * (wy4 - 2.0 * wy3 + wy2);
            const duZ = 30.0 * (wz4 - 2.0 * wz3 + wz2);
        
            // Hash function calls remain the same
            const a = hash(floorX, floorY, floorZ), b = hash(floorX + 1, floorY, floorZ),
                  c = hash(floorX, floorY + 1, floorZ), d = hash(floorX + 1, floorY + 1, floorZ),
                  e = hash(floorX, floorY, floorZ + 1), f = hash(floorX + 1, floorY, floorZ + 1),
                  g = hash(floorX, floorY + 1, floorZ + 1), h = hash(floorX + 1, floorY + 1, floorZ + 1);
        
            // Linear interpolation factors and derivatives calculations
            const k0 = a, k1 = b - a, k2 = c - a, k3 = e - a,
                  k4 = a - b - c + d, k5 = a - c - e + g,
                  k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
        
            const value = k0 + k1 * uX + k2 * uY + k3 * uZ + k4 * uX * uY + k5 * uY * uZ + k6 * uZ * uX + k7 * uX * uY * uZ;
            const derivative = [
                duX * (k1 + k4 * uY + k6 * uZ + k7 * uY * uZ),
                duY * (k2 + k5 * uZ + k4 * uX + k7 * uZ * uX),
                duZ * (k3 + k6 * uX + k5 * uY + k7 * uX * uY)
            ];
        
            return [value, ...derivative];
        }
        function noisedRidge(x, y, z) {
            const val = noised(x,y,z);
            val[0] = ((1-Math.abs(val[0]))*2)-1;
            return val
        }
        function noisedTurbulent(x, y, z) {
            const val = noised(x,y,z);
            val[0] = ((Math.abs(val[0]))*2)-1;
            return val
        }

        function multiplyMatrix3x3WithVector3(m, v) {
            return [
                m[0] * v[0] + m[1] * v[1] + m[2] * v[2], // Row 1
                m[3] * v[0] + m[4] * v[1] + m[5] * v[2], // Row 2
                m[6] * v[0] + m[7] * v[1] + m[8] * v[2]  // Row 3
            ];
        }

        function multiplyMatrices3x3(m1, m2) {
            let result = new Array(9);
        
            // Compute each element of the result matrix
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    result[row * 3 + col] =
                        m1[row * 3] * m2[col] +
                        m1[row * 3 + 1] * m2[col + 3] +
                        m1[row * 3 + 2] * m2[col + 6];
                }
            }
        
            return result;
        }
        function fbm(a,b,c,amplitude,gain,frequency, lacunarities, numOctaves){
            let h = 0;
            let lacunarity = lacunarities;
            if(Array.isArray(lacunarities)) {
                if(lacunarity[0]){
                    frequency = lacunarities[0];
                }
            }
            let overallAmplitude = 0;
            for(let i = 0; i<numOctaves; i++){
                if(Array.isArray(lacunarities)) {
                    if(lacunarity[i+1]){
                        lacunarity = lacunarities[i+1];
                    }
                }
                let n = noise(a*frequency, b*frequency, c*frequency);
                h+=n*amplitude;
                overallAmplitude+=amplitude;
                amplitude *=gain;
                frequency*=lacunarity;
                if(frequency>200000) break;
            }
            return h/overallAmplitude;
        }
        function fbmAD(a,b,c,amplitude,gains, gainMultiplier,frequency, lacunarities, numOctaves, noiseTypes){ // analytical derivative
            let noiseFunction = noised;
            let v = [a,b,c];
            let h = 0;
            let d = [0,0,0];
            let lacunarity = lacunarities;
            if(Array.isArray(lacunarities)) {
                if(lacunarity[0]){
                    frequency = lacunarities[0];
                }
            }
            let overallAmplitude = 0.0;
            for(let i = 0; i<numOctaves; i++){
                
                if(Array.isArray(lacunarities)) {
                    if(lacunarities[i]){
                        lacunarity = lacunarities[i];
                    }
                }
                noiseFunction = noised;
                if(Array.isArray(noiseTypes)) {
                    if(noiseTypes[i]){
                        if(noiseTypes[i] == 1) noiseFunction = noisedRidge;
                        if(noiseTypes[i] == 2) noiseFunction = noisedTurbulent;
                    }
                }
                
                let n = noiseFunction(v[0]*frequency,v[1]*frequency,v[2]*frequency);
                //n[0] = 2*(1-Math.abs(n[0]))-1
                d[0] +=n[1];
                d[1] +=n[2];
                d[2] +=n[3];
                const xx =(1.0+(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]));
                h +=amplitude*n[0]/xx;
                overallAmplitude+=amplitude/xx;
                amplitude *=gains[i]*gainMultiplier;
                frequency*=lacunarity;
                if(frequency>200000) break;
                
            }
            return h/overallAmplitude;
        }

        

        function fbmDW(a,b,c,amplitude,gain,frequency, lacunarities, numOctaves){ // analytical derivative
            let xWarp = fbm(a,b,c,amplitude,gain,frequency, lacunarities, numOctaves);
            let yWarp = fbm(a+0.578,b+7.149,c+2.47841,amplitude,gain,frequency, lacunarities, numOctaves);
            let zWarp = fbm(a+0.758,b+2.639,c+5.741,amplitude,gain,frequency, lacunarities, numOctaves);

            return fbm(a+xWarp,b+yWarp,c+zWarp,amplitude,gain,frequency, lacunarities, numOctaves);
        }

        function generateElevationAndMesh(params) {
            return generateElevationAndMesh2D(params);
        }
        

        function generateElevationAndMesh2D(params) {

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
            
            
            elevation2DSFCT(extendedElevation, extendedWidth, extendedHeight, baseLat, baseLon, latStep, lonStep, params);
        
            
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

        function elevation2DSFCT(extendedElevation, extendedWidth, extendedHeight, baseLat, baseLon, latStep, lonStep, params ){
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

                    let a = Math.cos(adjustedLat) * Math.cos(adjustedLon) +params.shift[0];
                    let b = Math.cos(adjustedLat) * Math.sin(adjustedLon) +params.shift[1];
                    let c = Math.sin(adjustedLat) +params.shift[2];

                    let amplitude = 1.0;
                    let frequency = 1;
                    //const gainMultiplier = Math.max(0.0001,(1+fbm(a,b,c,1,0.75,2,5, 3))*0.5);
                    let elevationMultiplier = Math.pow(Math.max(0.1,(1+fbmAD(a,b,c,1,[0.75,0.75,0.75,0.75],1.0,4,4.2, 4))*0.5),2.2);
                    
                    const fractalAnalytic=fbmAD(a,b,c,amplitude, params.gains, 1, frequency, params.lacunarities, params.maxOctaves, params.noiseTypes);
                    domainWarpNoise = 1-Math.max(0,fbmDW(a,b,c,amplitude, 0.75, 55, 1.9, Math.max(1,params.maxOctaves*0.5)))*0.002;
                    extendedElevation[extendedWidth * y + x] = fractalAnalytic*domainWarpNoise*(params.max-params.min)*0.5*elevationMultiplier;
                    


                }
            }
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
        `+ common.getGenerateTerrainTile();
    }
};
export { PerlinElevationWorker };

