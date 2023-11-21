import { Layer } from './Layer.js';

/**
 * A color layer where the color is fully computed in the shader.
 * @class
 * @extends Layer
 */
class ShaderColorLayer extends Layer{
    /**
     * A color layer where the color is fully computed in the shader.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level);".
     * Note that the normal is in world space.
     * The given textures map will be automatically loaded and will be accessible in the shader by name (map keys)
     * 
     * Only one visible ShaderColorLayer will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.shader a string representing shader code to be injected. Should at least implement the method : vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level)
     * @param {Object} [properties.textures = undefined] an object containing texture names and THREE.Texture objects as key-value pairs
     * @param {Number} [properties.transparency = 0] the layer's transparency (0 to 1)
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
     */
    constructor(properties) {
        super(properties);
        this.transparency = properties.transparency?properties.transparency:0;
        this.shader = properties.shader;
        this.textures = properties.textures;
        this.isShaderColorLayer = true;
    }
}
export {ShaderColorLayer}