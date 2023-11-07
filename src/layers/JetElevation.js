import { ShaderColorLayer } from './ShaderColorLayer.js';

class JetElevation extends ShaderColorLayer{
    /**
     * A color layer where the color is fully computed in the shader.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(float lon, float lat, float height);"
     * 
     * Only one visible ShaderColorLayer will be taken into account at a time.
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double],
     * minHeight: double,
     * maxHeight: double} properties 
     */
    constructor(properties) {
        let min = Number.isInteger(properties.minHeight) ? properties.minHeight.toFixed(1) : String(properties.minHeight);
        let range = Number.isInteger(properties.maxHeight-properties.minHeight) ? (properties.maxHeight-properties.minHeight).toFixed(1) : String(properties.maxHeight-properties.minHeight);
        properties.shader = `
            vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level){
                float normalizedHeight = (llh.z - `+min+`) / `+range+`; // Normalize to [0, 1]
    
                float r = clamp(1.5 - abs(normalizedHeight * 4.0 - 3.0), 0.0, 1.0);
                float g = clamp(1.5 - abs(normalizedHeight * 4.0 - 2.0), 0.0, 1.0);
                float b = clamp(1.5 - abs(normalizedHeight * 4.0 - 1.0), 0.0, 1.0);

                return vec3(r,g,b);
            }
        `;
        super(properties);
    }
}
export {JetElevation}