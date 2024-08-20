import * as THREE from 'three';
import {CloudsLayer} from './CloudsLayer'

let defaultSampleDensityFunction = `
float sampleDensity(vec3 samplePosition, float lod){
	vec3 samplePositionNormalized = normalize(samplePosition);
    vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
	float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
	float height = (length(samplePosition)-localRadius-startRadius) / (endRadius-startRadius);
    float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));

    float theta = time*windSpeed*0.00001;
    vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
    vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).g), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).g, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).g);
    
    

    float density = 0.0;

    //low frequency
    float lowFrequencyCoverage = coverage*0.2;
    density += ((texture(perlinWorley, offsetPosition*2e-8+offset*1.5).r-(1.0-lowFrequencyCoverage))/lowFrequencyCoverage)*0.5;
    float lod3 = density-(1.0-sm);
    if(lod>=3.0)return lod3;

    //medium frequency
    float mediumFrequencyCoverage = coverage*0.2;
    density += ((texture(perlinWorley, offsetPosition*8e-6).r-(1.0-mediumFrequencyCoverage))/mediumFrequencyCoverage)*0.25;
    if(density<-0.25) return -1.0;
    float lod2 = density-(1.0-sm);
    if(lod>=2.0) return mix(lod2, lod3, pow(lod-2.0,2.0));

    //high frequency
    density += ((texture(perlinWorley, offsetPosition*2e-5).r-(1.0-0.15))/0.15)*0.125;
    if(density<-0.1) return -1.0;
    float lod1 = density-(1.0-sm);
    if(lod>=1.0) return mix(lod1, lod2, pow(lod-1.0,2.0));

    //ultra high frequency
    density += ((texture(perlinWorley, offsetPosition*8e-5).r-(1.0-0.15))/0.15)*0.125;
    return density-(1.0-sm);

    
}`;


/**
 * A clouds layer where the clouds are randomly positioned according to noise functions
 * @class
 * @extends CloudsLayer
 */
class RandomCloudsLayer extends CloudsLayer {
    /**
     * Renders random clouds all over the planet with density entirely based on noise functions.
     * 
     * Only one visible CloudsLayer (first in list) will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {Number} [properties.quality = 0.3] general quality setting
     
     * @param {Number} [properties.minHeight = 500] clouds min height in earth radii
     * @param {Number} [properties.maxHeight = 12000] clouds max height in earth radii
     * @param {Number} [properties.density = 0.5] cloud density multiplier 
     * @param {Number} [properties.luminance = 0.5] sun intensity multiplier
     * @param {Number} [properties.coverage = 0.2] average sky coverage between 0 and 1 (a high coverage can negatively impact performance)
     * @param {Number} [properties.windSpeed = 0.05] wind speed
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



