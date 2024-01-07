/** copied from tooloud to add tiling */
const PERMUTATION = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

const P = [...PERMUTATION, ...PERMUTATION];

class Perlin {
    constructor(seed = 3000) {
        this._seedValue = Perlin.xorshift(seed);

        this.noise = this.noise.bind(this);
        this.setSeed = this.setSeed.bind(this);
    }

    static xorshift(value) {
        let x = value ^ (value >> 12);
        x = x ^ (x << 25);
        x = x ^ (x >> 27);
        return x * 2;
    }

    static lerp(t, a, b) {
        return a + t * (b - a);
    }

    static fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    static grad(hash, x, y, z) {
        var h = hash & 15,
            u = h < 8 ? x : y,
            v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    setSeed(seed = 3000) {
        this._seedValue = Perlin.xorshift(seed);
    }

    seamlessNoise(a, b, c, moduloX,moduloY, moduloZ) {
        let originalNoise = this.noise(a, b, c);

        // Wrapped noise calculation
        let wrappedNoise = this.noise((a % moduloX + moduloX) % moduloX, (b % moduloY + moduloY) % moduloY, (c % moduloZ + moduloZ) % moduloZ);

        let fx = Math.abs((a % moduloX) / moduloX);
        let fy = Math.abs((b % moduloY) / moduloY);
        let fz = Math.abs((c % moduloZ) / moduloZ);

        // Interpolated noise
        let noise = originalNoise * (1 - fx) + wrappedNoise * fx;
        noise = noise * (1 - fy) + wrappedNoise * fy;
        noise = noise * (1 - fz) + wrappedNoise * fz;

        return noise;
    }
    noise(a, b, c) {
        let x = a + this._seedValue;
        let y = b + this._seedValue;
        let z = c + this._seedValue;

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = Perlin.fade(x);
        const v = Perlin.fade(y);
        const w = Perlin.fade(z);

        const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
        const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;

        return Perlin.lerp(w,
            Perlin.lerp(v,
                Perlin.lerp(u, Perlin.grad(P[AA], x, y, z), Perlin.grad(P[BA], x - 1, y, z)),
                Perlin.lerp(u, Perlin.grad(P[AB], x, y - 1, z), Perlin.grad(P[BB], x - 1, y - 1, z))
            ),
            Perlin.lerp(v,
                Perlin.lerp(u, Perlin.grad(P[AA + 1], x, y, z - 1), Perlin.grad(P[BA + 1], x - 1, y, z - 1)),
                Perlin.lerp(u, Perlin.grad(P[AB + 1], x, y - 1, z - 1), Perlin.grad(P[BB + 1], x - 1, y - 1, z - 1))
            )
        )
    }
}

export default Perlin;
