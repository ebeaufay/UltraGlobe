class Perlin {
    constructor() {
        
        this.permutation = this.shuffleArray([...Array(256).keys()]);
        this.p = new Array(256 * 2);
        for (let i = 0; i < 256 * 2; i++) {
            this.p[i] = this.permutation[i % 256];
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    

    noise(x, y, z, period) {
        //x = x % period;
        //y = y % period;
       // z = z % period;

        const X = (Math.floor(x) & 255);
        const Y = (Math.floor(y) & 255);
        const Z = (Math.floor(z) & 255);

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = (this.p[X%period] + Y)%period;
        const AA = (this.p[A%period] + Z)%period;
        const AB = (this.p[(A + 1)%period] + Z)%period;

        const B = (this.p[(X + 1)%period] + Y)%period
        const BA = (this.p[B%period] + Z)%period
        const BB = (this.p[(B + 1)%period] + Z)%period;



        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)), this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))), this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)), this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }
}
export default Perlin;