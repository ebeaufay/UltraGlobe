import * as THREE from 'three';
import {CloudsLayer} from './CloudsLayer'

let defaultSampleDensityFunction = `
float sampleDensity(vec3 samplePosition, out float scatterCoefficient){
	vec3 samplePositionNormalized = normalize(samplePosition);
    vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
	float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
	float height = (length(samplePosition)-localRadius-startRadius) / (endRadius-startRadius);
    float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
    scatterCoefficient = mix(0.25,0.85, height);

    float theta = time*windSpeed*0.01;
    vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
    vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).g), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).g, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).g);
    
    

    float density = 0.0;

    //low frequency
    float lowFrequencyCoverage = coverage*0.2;
    density += (texture(perlinWorley, offsetPosition*1e-7+offset*1.5).r-(1.0-lowFrequencyCoverage))/lowFrequencyCoverage*0.5;

    //medium frequency
    float mediumFrequencyCoverage = coverage*0.2;
    density += (texture(perlinWorley, offsetPosition*2e-6).r-(1.0-mediumFrequencyCoverage))/mediumFrequencyCoverage*0.3;

    //high frequency
    density += (texture(perlinWorley, offsetPosition*2e-5).r-(1.0-0.15))/0.15*0.2;

    return density*0.05*sm;
    
}`;

/*let defaultSampleDensityFunction = `
float sampleDensity(vec3 samplePosition, float height){
    float theta = time*windSpeed*0.01;
    vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
            
    float cover = 1.0-coverage;//0.5-coverage*0.5;
    float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
    vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).g), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).g, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).g);
    float localDensity = pow(max(0.0,texture(perlinWorley, offsetPosition*1e-7+offset*0.8).g-cover-(1.0-sm)),4.0);
    if(localDensity<=0.0) return -1.0;
    localDensity *= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-6).g-cover-(1.0-sm)),1.0);
    if(localDensity<=0.0) return -1.0;
    localDensity *= pow(max(0.0,texture(perlinWorley, offsetPosition*5e-6).r-(1.0-sm)),1.0);
    if(localDensity<=0.0) return -1.0;
    //localDensity *= 5.0;
    return localDensity*500.0;
}`; */

/**
 * A clouds layer where the clouds are randomly positioned according to noise functions
 * @class
 * @extends EnvironmentLayer
 */
class RandomCloudsLayer extends CloudsLayer {
    /**
     * A volumetric clouds layer that allows specifying custom code to compute cloud opacity per sample.
     * The given shader glsl code will be inserted in the main planet shader and 
     * color per fragment will be computed via a call to "vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level);".
     * Note that the normal is in world space.
     * 
     * The given textures map will be automatically loaded and will be accessible in the shader by name (map keys)
     * 
     * Only one visible CloudsLayer (first in list) will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} [properties.resolution = 0.5] resolution for clouds as a proportion relative to the creen canvas size. defaults to half resolution and quarter resolution for mobile
     * @param {Number} [properties.numSamples = 15] base num samples (when straight up through the atmosphere) defaults to 15 and 2 for mobile
     * @param {Number} [properties.numSamplesToLight = 4] base num samples towards light (when straight up through the atmosphere) defaults to 4 and 2 for mobile
     * @param {Number} [properties.startRadius = 1.001] clouds min height in earth radii
     * @param {Number} [properties.endRadius = 1.004] clouds max height in earth radii
     * @param {Number} [properties.density = 8] cloud density multiplier 
     * @param {Number} [properties.luminance = 0.5] sun intensity multiplier
     * @param {Number} [properties.coverage = 0.2] average sky coverage between 0 and 1 (a high coverage can negatively impact performance)
     * @param {Number} [properties.windSpeed = 0.05] wind speed
     * @param {Number} [properties.numBlurPasses = 1] blur passes to apply. Defaults to 1 for desktop and 4 for mobile
     * @param {Number} [properties.windDirection = new THREE.Vector2(1.0,0.0)] wind direction
     * @param {THREE.Vector3} [properties.color = new THREE.Vector3(1.0,1.0,1.0)] base cloud color.
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
     */
    constructor(properties) {
        properties.sampleDensityFunction = defaultSampleDensityFunction;
        properties.extraUniforms = {"coverage": properties.coverage?properties.coverage:0.2}
        super(properties);
        
    }

}
export { RandomCloudsLayer }



