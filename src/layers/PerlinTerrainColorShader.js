import * as THREE from 'three';
import { ShaderColorLayer } from './ShaderColorLayer.js';
import perlin from '../images/perlin.png';
import palette from '../images/palette2.png';
import manifold from '../images/manifold.png';
import manifold2 from '../images/manifold2.png';
import melt from '../images/melt.png';
import melt2 from '../images/melt2.png';
import marble from '../images/marble.png';
import marble2 from '../images/marble2.png';
import milky from '../images/milky.png';
import milky2 from '../images/milky2.png';
import streak from '../images/streak.png';
import swirl from '../images/swirl.png';
import swirl2 from '../images/swirl2.png';
import techno from '../images/techno.png';
import techno2 from '../images/techno2.png';
import vein from '../images/vein.png';
import vein2 from '../images/vein2.png';
import voronoi from '../images/voronoi.png';
import voronoi2 from '../images/voronoi2.png';
import voronoi3 from '../images/voronoi3.png';
import grainy from '../images/grainy.png';
import grainy2 from '../images/grainy2.png';
import grainy3 from '../images/grainy3.png';

const noiseTextures = [
    manifold, manifold2, melt, melt2, marble, marble2, milky,
    milky2, streak, swirl, swirl2, techno, techno2,
    vein, vein2, voronoi, voronoi2, voronoi3,
    grainy, grainy2, grainy3];
const loader = new THREE.TextureLoader();
function loadTexture(url) {
    const texture = loader.load(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsPMREMUpdate = true;
    return texture;
}
/**
 * A ShaderColorLayer that computes color on the fly based on elevation, terrain normals and noise functions
 * @class
 * @extends ShaderColorLayer
 */
class PerlinTerrainColorShader extends ShaderColorLayer {

    /**
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} properties.min min height for the color scheme
     * @param {Number} properties.max max height for the color scheme
     * @param {Number} [properties.transparency = 0] the layer's transparency (0 to 1)
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        let min = Number.isInteger(properties.min) ? properties.min.toFixed(1) : String(properties.min);
        let range = Number.isInteger(properties.max - properties.min) ? (properties.max - properties.min).toFixed(1) : String(properties.max - properties.min);

        let shuffled = noiseTextures.sort(() => 0.5 - Math.random());

        properties.textures = {
            perlin: loadTexture(perlin),
            palette: loadTexture(palette),
            rand0: loadTexture(shuffled[0]),
            rand1: loadTexture(shuffled[1]),
            rand2: loadTexture(shuffled[2])
        };

        const angle1 = Math.random() * 3.1416;
        const angle2 = angle1 + 0.523598;
        const angle3 = angle2 + 0.2+Math.random()*0.323598;
        const angle4 = angle1 + 0.2+Math.random()*0.323598;
        const angle5 = angle2 + 0.2+Math.random()*0.323598;
        const cos1 = Math.cos(angle1).toFixed(5);
        const sin1 = Math.sin(angle1).toFixed(5);
        const cos2 = Math.cos(angle2).toFixed(5);
        const sin2 = Math.sin(angle2).toFixed(5);
        const cos3 = Math.cos(angle3).toFixed(5);
        const sin3 = Math.sin(angle3).toFixed(5);
        const cos4 = Math.cos(angle4).toFixed(5);
        const sin4 = Math.sin(angle4).toFixed(5);
        const cos5 = Math.cos(angle5).toFixed(5);
        const sin5 = Math.sin(angle5).toFixed(5);

        const palette1 = (Math.floor(Math.random() * 128) + 0.5) / 128;
        const palette2 = (Math.floor(Math.random() * 128) + 0.5) / 128;

        const randomTextures = ['rand0', 'rand1', 'rand2'];
        const largeNoiseMap = randomTextures[0];
        const mediumNoiseMap1 = randomTextures[1];
        const mediumNoiseMap2 = randomTextures[2];
        const smallNoiseMap1 = randomTextures[2];
        const smallNoiseMap2 = randomTextures[1];

        const colorModulation = Math.random();

        properties.shader = `

            mat2 matrix1 = mat2(
                    `+ cos1 + `, ` + (-sin1) + `,
                    `+ sin1 + `, ` + cos1 + `
                );
            
            mat2 matrix2 = mat2(
                    `+ cos2 + `, ` + (-sin2) + `,
                    `+ sin2 + `, ` + cos2 + `
                );
            
            mat2 matrix3 = mat2(
                    `+ cos3 + `, ` + (-sin3) + `,
                    `+ sin3 + `, ` + cos3 + `
                );
            mat2 matrix4 = mat2(
                    `+ cos4 + `, ` + (-sin4) + `,
                    `+ sin4 + `, ` + cos4 + `
                );
            mat2 matrix5 = mat2(
                    `+ cos5 + `, ` + (-sin5) + `,
                    `+ sin5 + `, ` + cos5 + `
                );
            
            vec2 rotate90(vec2 longLat) {
                
                // Convert to Cartesian coordinates
                vec3 cart = vec3(sin(longLat.y), cos(longLat.y) * sin(longLat.x), -cos(longLat.y) * cos(longLat.x));
                return vec2(atan(cart.x, cart.y), asin(cart.z));
            }

            

            // applies a rotation on the texture and blends from 3 angles to avoid texture pinch and seam.
            float pickFromTexture(sampler2D sampler, vec3 llh, mat2 matrix, float frequency){
                
                vec2 uv = vec2((llh.x*0.159154943), llh.y*0.3183098);
                uv = matrix*uv*frequency;
                float a1 = texture2D(sampler , uv.xy ).x;
                
                vec2 lonLatRotated = rotate90(llh.xy);

                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float b = texture2D(sampler , uv.xy ).x;

                
                lonLatRotated = rotate90(rotate90(lonLatRotated));
                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float a2 = texture2D(sampler , uv.xy ).x;
                float grad = cos(llh.x)*0.5+0.5;
                float a = grad*a1+(1.0-grad)*a2;
                
                float c = cos(llh.y);
                c = c*c;
                
                return a*c+b*(1.0-c);
            }

            vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level){
                float dot = smoothstep(0.75,1.0,dot(normalize(xyz), normal));
                // return vec3((llh.x+3.1416)/6.2832);
                //return vec3((llh.x+3.1416)/6.2832,(llh.y+1.5708)/3.1416, 1.0);
                float polar = abs(llh.y/3.1416);
                
                
                float normalizedHeight = ((llh.z - `+ min + `) / ` + range + `)*0.95; // Normalize to [0, 0.95]
    
                // large scale
                float f = pickFromTexture(perlin, llh,matrix1, 5.0);
                //float noiseLarge = pickFromTexture(`+ largeNoiseMap + `, llh, matrix2, 11.0)*f + pickFromTexture(` + largeNoiseMap + `, llh, matrix3, 13.0)*(1.0-f);
                float noiseLarge= normalizedHeight*f*(0.5+f)+polar;
                float f2 = pickFromTexture(perlin, llh,matrix4, 4.0);
                vec3 large = texture2D(palette, vec2(noiseLarge, `+ palette1 + `)).xyz*f2+texture2D(palette, vec2(noiseLarge, ` + palette2 + `)).xyz*(1.0-f2);

                // small scale
                float fSmall = pickFromTexture(perlin, llh,matrix5, 8724.0);
                float noiseSmall1 = pickFromTexture(`+ smallNoiseMap1 + `, llh, matrix1, 8468.0)*fSmall + pickFromTexture(` + smallNoiseMap1 + `, llh, matrix2, 8775.0)*(1.0-fSmall);
                float noiseSmall2 = pickFromTexture(`+ smallNoiseMap2 + `, llh, matrix3, 8625.0)*fSmall + pickFromTexture(` + smallNoiseMap2 + `, llh, matrix4, 8254.0)*(1.0-fSmall);
                float noiseSmall = mix(noiseSmall1,noiseSmall2,dot);
                //return vec3(noiseSmall);
                noiseSmall= noiseSmall*0.10-(dot*0.25)+normalizedHeight*(f+`+colorModulation+`)*0.5 + polar;
                
                float f2Small = dot;
                vec3 small = texture2D(palette, vec2(noiseSmall, `+ palette1 + `)).xyz*f2Small+texture2D(palette, vec2(noiseSmall, ` + palette2 + `)).xyz*(1.0-f2Small);
                return sqrt(small*large);
                
                
            }

            
            
        `;


        super(properties);
    }
}
export { PerlinTerrainColorShader }