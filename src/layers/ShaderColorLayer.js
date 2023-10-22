import { Layer } from './Layer.js';

class ShaderColorLayer extends Layer{
    /**
     * A color layer where the color is fully computed in the shader.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(float lon, float lat, float height);"
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
    }
}
export {ShaderColorLayer}