import { ShaderColorLayer } from './ShaderColorLayer.js';

class JetElevation extends ShaderColorLayer{
    /**
     * A color layer where the color is fully computed in the shader.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(float lon, float lat, float height);"
     * 
     * Only one visible ShaderColorLayer will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} properties.transparency the layer's transparency (0 to 1)
     * @param {[Number]} properties.bounds min longitude, min latitude, max longitude, max latitude in degrees
     * @param {[Number]} properties.min min height for the jet color scheme
     * @param {[Number]} properties.max max height for the jet color scheme
     */
    constructor(properties) {
        let min = Number.isInteger(properties.min) ? properties.min.toFixed(1) : String(properties.min);
        let range = Number.isInteger(properties.max-properties.min) ? (properties.max-properties.min).toFixed(1) : String(properties.max-properties.min);
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