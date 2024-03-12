const Noise3dWorker = {
    getScript: () => `

        const R = 6371000;

        function fbmAD(a,b,c,amplitude,gain,frequency, lacunarities, numOctaves, matrix){ // analytical derivative
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
                    if(lacunarities[i+1]){
                        lacunarity = lacunarities[i+1];
                    }
                }
                let n = noised(v[0]*frequency,v[1]*frequency,v[2]*frequency);
                
                d[0] +=n[1];
                d[1] +=n[2];
                d[2] +=n[3];
                const xx =(1.0+(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]));
                h +=amplitude*n[0]/xx;
                overallAmplitude+=amplitude/xx;
                amplitude *=gain;
                frequency*=lacunarity;
                if(frequency>200000) break;
                if(matrix){
                    v=multiplyMatrix3x3WithVector3(matrix,v);
                }
            }
            return h/overallAmplitude;
        }

        function generateNoiseBlock(params){
            
        }

        function hash(x, y, z) {
            let n = x * 3 + y * 113 + z * 311;
            n = (n << 13) ^ n;
            n = n * (n * 15731 + 789221) + 1376312589;
            return -1.0 + 2.0 * (n & 0x0fffffff) / 0x0fffffff;
        }
        function noised(x, y, z) {
            const floorX = Math.floor(x);
            const floorY = Math.floor(y);
            const floorZ = Math.floor(z);
        
            const wX = x - floorX;
            const wY = y - floorY;
            const wZ = z - floorZ;
        
            // Quintic interpolation
            const uX = wX * wX * wX * (wX * (wX * 6 - 15) + 10);
            const uY = wY * wY * wY * (wY * (wY * 6 - 15) + 10);
            const uZ = wZ * wZ * wZ * (wZ * (wZ * 6 - 15) + 10);
        
            const duX = 30.0 * wX * wX * (wX * (wX - 2.0) + 1.0);
            const duY = 30.0 * wY * wY * (wY * (wY - 2.0) + 1.0);
            const duZ = 30.0 * wZ * wZ * (wZ * (wZ - 2.0) + 1.0);
        
            const a = hash(floorX, floorY, floorZ);
            const b = hash(floorX + 1, floorY, floorZ);
            const c = hash(floorX, floorY + 1, floorZ);
            const d = hash(floorX + 1, floorY + 1, floorZ);
            const e = hash(floorX, floorY, floorZ + 1);
            const f = hash(floorX + 1, floorY, floorZ + 1);
            const g = hash(floorX, floorY + 1, floorZ + 1);
            const h = hash(floorX + 1, floorY + 1, floorZ + 1);
        
            const k0 = a;
            const k1 = b - a;
            const k2 = c - a;
            const k3 = e - a;
            const k4 = a - b - c + d;
            const k5 = a - c - e + g;
            const k6 = a - b - e + f;
            const k7 = -a + b + c - d + e - f - g + h;
        
            const value = k0 + k1 * uX + k2 * uY + k3 * uZ + k4 * uX * uY + k5 * uY * uZ + k6 * uZ * uX + k7 * uX * uY * uZ;
            const derivative = [
                duX * (k1 + k4 * uY + k6 * uZ + k7 * uY * uZ),
                duY * (k2 + k5 * uZ + k4 * uX + k7 * uZ * uX),
                duZ * (k3 + k6 * uX + k5 * uY + k7 * uX * uY)
            ];
        
            return [value, ...derivative];
        }
    `
}
export { PerlinElevationWorker };