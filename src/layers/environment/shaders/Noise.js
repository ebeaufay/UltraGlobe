// Assuming Three.js is included in your project
import * as THREE from 'three';

const UI0 = 1597334673;
const UI1 = 3812015801;
const UI2 = [UI0, UI1];
const UI3 = [UI0, UI1, 2798796415];
const UIF = 1.0 / 0xffffffff;

function fract(v) {
    return new THREE.Vector3(v.x - Math.floor(v.x), v.y - Math.floor(v.y), v.z - Math.floor(v.z));
}

function mod(v, n) {
    return new THREE.Vector3(v.x % n, v.y % n, v.z % n);
}

function hash33(p) {
    let q = new THREE.Vector3(
        ((Math.floor(p.x) & 0xffffffff) * UI3[0]) ^ ((Math.floor(p.y) & 0xffffffff) * UI3[1]) ^ ((Math.floor(p.z) & 0xffffffff) * UI3[2]),
        ((Math.floor(p.y) & 0xffffffff) * UI3[0]) ^ ((Math.floor(p.z) & 0xffffffff) * UI3[1]) ^ ((Math.floor(p.x) & 0xffffffff) * UI3[2]),
        ((Math.floor(p.z) & 0xffffffff) * UI3[0]) ^ ((Math.floor(p.x) & 0xffffffff) * UI3[1]) ^ ((Math.floor(p.y) & 0xffffffff) * UI3[2])
    );
    q = new THREE.Vector3(q.x * UI3[0], q.y * UI3[1], q.z * UI3[2]);
    return new THREE.Vector3().subScalar(1).addScaledVector(q, 2 * UIF);
}

function remap(x, a, b, c, d) {
    return (((x - a) / (b - a)) * (d - c)) + c;
}

function gradientNoise(x, freq) {
    let p = x.clone().floor();
    let w = fract(x);
    let u = w.clone().multiply(w).multiply(w).multiply(new THREE.Vector3(w.x * (w.x * 6 - 15) + 10, w.y * (w.y * 6 - 15) + 10, w.z * (w.z * 6 - 15) + 10));

    let gradients = ['ga', 'gb', 'gc', 'gd', 'ge', 'gf', 'gg', 'gh'].map((_, i) => {
        let offset = new THREE.Vector3(i & 1, (i >> 1) & 1, (i >> 2) & 1);
        return hash33(mod(p.clone().add(offset),freq));
    });

    let projections = gradients.map((g, i) => {
        let offset = new THREE.Vector3(i & 1, (i >> 1) & 1, (i >> 2) & 1);
        return g.dot(w.clone().sub(offset));
    });

    // Interpolation
    return projections[0] + 
           u.x * (projections[1] - projections[0]) + 
           u.y * (projections[2] - projections[0]) + 
           u.z * (projections[4] - projections[0]) + 
           u.x * u.y * (projections[0] - projections[1] - projections[2] + projections[3]) + 
           u.y * u.z * (projections[0] - projections[2] - projections[4] + projections[6]) + 
           u.z * u.x * (projections[0] - projections[1] - projections[4] + projections[5]) + 
           u.x * u.y * u.z * (-projections[0] + projections[1] + projections[2] - projections[3] + projections[4] - projections[5] - projections[6] + projections[7]);
}

function worleyNoise(uv, freq) {
    let id = uv.clone().floor();
    let p = fract(uv);
    let minDist = 10000.0;

    for (let x = -1; x <= 1; ++x) {
        for (let y = -1; y <= 1; ++y) {
            for (let z = -1; z <= 1; ++z) {
                let offset = new THREE.Vector3(x, y, z);
                let h = hash33(mod(id.clone().add(offset),freq)).multiplyScalar(0.5).addScalar(0.5);
                h.add(offset);
                let d = p.clone().sub(h);
                minDist = Math.min(minDist, d.dot(d));
            }
        }
    }

    return 1.0 - Math.sqrt(minDist);
}

function perlinFbm(p, freq, octaves) {
    let G = Math.pow(2, -0.85);
    let amp = 1.0;
    let noise = 0.0;

    for (let i = 0; i < octaves; ++i) {
        noise += amp * gradientNoise(p.clone().multiplyScalar(freq), freq);
        freq *= 2.0;
        amp *= G;
    }

    return noise;
}

function worleyFbm(p, freq) {
    return worleyNoise(p.clone().multiplyScalar(freq), freq) * 0.625 +
           worleyNoise(p.clone().multiplyScalar(freq * 2), freq * 2) * 0.25 +
           worleyNoise(p.clone().multiplyScalar(freq * 4), freq * 4) * 0.125;
}


export {perlinFbm, worleyFbm}
