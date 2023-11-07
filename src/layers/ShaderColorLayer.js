import { Layer } from './Layer.js';

class ShaderColorLayer extends Layer{
    /**
     * A color layer where the color is fully computed in the shader.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level);".
     * Note that the normal is in tangent or topocentric space.
     * 
     * Only one visible ShaderColorLayer will be taken into account at a time.
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double]} properties 
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