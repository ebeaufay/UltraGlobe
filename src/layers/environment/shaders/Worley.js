/** copied from tooloud to add tiling */
class Worley {
    constructor(seed = 3000) {
        this._seedValue = seed;

        this.setSeed = this.setSeed.bind(this);
        this.noise = this.noise.bind(this);
        this.Euclidean = this.Euclidean.bind(this);
        this.Manhattan = this.Manhattan.bind(this);
    }

    static xorshift(value) {
        let x = value ^ (value >> 12);
        x = x ^ (x << 25);
        x = x ^ (x >> 27);
        return x * 2;
    }

    static hash(i, j, k) {
        return (((((2166136261 ^ i) * 16777619) ^ j) * 16777619) ^ k) * 16777619 & 0xffffffff;
    }

    static d(p1, p2) {
        return [p1.x - p2.x, p1.y - p2.y, p1.z - p2.z];
    }

    static EuclideanDistance(p1, p2) {
        return Worley.d(p1, p2).reduce((sum, x) => sum + (x * x), 0);
    }

    static ManhattanDistance(p1, p2) {
        return Worley.d(p1, p2).reduce((sum, x) => sum + Math.abs(x), 0)
    }

    static probLookup(value) {
        value = value & 0xffffffff;
        if (value < 393325350) return 1;
        if (value < 1022645910) return 2;
        if (value < 1861739990) return 3;
        if (value < 2700834071) return 4;
        if (value < 3372109335) return 5;
        if (value < 3819626178) return 6;
        if (value < 4075350088) return 7;
        if (value < 4203212043) return 8;
        return 9;
    }

    static insert(arr, value) {
        let temp;
        for (let i = arr.length - 1; i >= 0; i--) {
            if (value > arr[i]) break;
            temp = arr[i];
            arr[i] = value;
            if (i + 1 < arr.length) arr[i + 1] = temp;
        }
    }

    noise(input, distanceFunc, moduloX, moduloY, moduloZ) {
        let lastRandom,
            numberFeaturePoints,
            randomDiff = { x: 0, y: 0, z: 0 },
            featurePoint = { x: 0, y: 0, z: 0 };
        let cubeX, cubeY, cubeZ, cubeXMod, cubeYMod, cubeZMod;
        let distanceArray = [9999999, 9999999, 9999999];

        for (let i = -1; i < 2; ++i)
            for (let j = -1; j < 2; ++j)
                for (let k = -1; k < 2; ++k) {
                    

                    cubeX = Math.floor(input.x) + i;
                    cubeY = Math.floor(input.y) + j;
                    cubeZ = Math.floor(input.z) + k;

                    cubeXMod = (cubeX%moduloX+moduloX)%moduloX;
                    cubeYMod = (cubeY%moduloY+moduloY)%moduloY;
                    cubeZMod = (cubeZ%moduloZ+moduloZ)%moduloZ;
                    lastRandom = Worley.xorshift(
                        Worley.hash(
                            (cubeXMod + this._seedValue) & 0xffffffff,
                            (cubeYMod) & 0xffffffff,
                            (cubeZMod) & 0xffffffff
                        )
                    );
                    numberFeaturePoints = Worley.probLookup(lastRandom);
                    for (let l = 0; l < numberFeaturePoints; ++l) {
                        lastRandom = Worley.xorshift(lastRandom);
                        randomDiff.x = lastRandom / 0x100000000;

                        lastRandom = Worley.xorshift(lastRandom);
                        randomDiff.y = lastRandom / 0x100000000;

                        lastRandom = Worley.xorshift(lastRandom);
                        randomDiff.z = lastRandom / 0x100000000;

                        featurePoint = {
                            x: randomDiff.x + cubeX,
                            y: randomDiff.y + cubeY,
                            z: randomDiff.z + cubeZ
                        };
                        Worley.insert(distanceArray, distanceFunc(input, featurePoint));
                    }
                }

        return distanceArray.map(x => x < 0 ? 0 : x > 1 ? 1 : x );
    }

    setSeed(seed = 3000) {
        this._seedValue = seed;
    }

    Euclidean(x, y, z) {
        return this.noise({ x:x, y:y, z:z }, Worley.EuclideanDistance);
    }

    Manhattan(x, y, z) {
        return this.noise({ x:x, y:y, z:z }, Worley.ManhattanDistance);
    }
}

export default Worley;
