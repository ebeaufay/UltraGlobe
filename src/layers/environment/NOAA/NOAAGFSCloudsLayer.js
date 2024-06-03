import * as THREE from 'three';
import {CloudsLayer} from '../CloudsLayer'
import {realtimeWeather} from './RealtimeWeather.js'

let defaultSampleDensityFunction = `

float sampleDensity(vec3 samplePosition, float lod){
    vec3 samplePositionNormalized = normalize(samplePosition);
    vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
	float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
    float heightMeters = length(samplePosition)-localRadius;
	float height = (heightMeters-startRadius) / (endRadius-startRadius);
    float sm= smoothstep(0.0,0.01,height) * (smoothstep(1.0,0.95,height)); // smoothstep to prevent hard transition at the clouds lower and upper limits
    
     

    vec3 cover = texture(realTimeCoverage, vec3(lonlatSample.x/6.28318, 0.5+lonlatSample.y/3.1416, mix(0.25,0.75,realTimeLerp))).rgb;
    float coverage = 0.0;
    if(heightMeters<4000.0){
        float t = max(0.0,(heightMeters - 1200.0) / (4000.0 - 1200.0));
        coverage = mix(cover.r, cover.g, t);
        
         
    }else {
        float t = min(1.0,(heightMeters - 4000.0) / (9000.0 - 4000.0));
        coverage = mix(cover.g, cover.b, t);
    } 
    
    if(coverage<=0.0) return -1.0; 
    float lod3 = coverage-0.4-(1.0-sm);
    if(lod>=3.0)return lod3;
    
    float mediumFrequencyCoverage = coverage*0.2;
    float mediumFrequency = 1.0e-5;
    float density = 0.55*((texture(perlinWorley, samplePosition*mediumFrequency).r-(1.0-mediumFrequencyCoverage))/mediumFrequencyCoverage*0.7);
    if(density<-0.25) return -1.0;
    float lod2 = density-(1.0-sm);
    if(lod>=2.0) return mix(lod2, lod3, pow(lod-2.0,2.0));

    density+= 0.3*((texture(perlinWorley, samplePosition*8.5e-5).r-0.8)/0.6);
    if(density<-0.1) return -1.0;
    float lod1 = density-(1.0-sm);
    if(lod>=1.0) return mix(lod1, lod2, pow(lod-1.0,2.0));

    density+= (texture(perlinWorley, samplePosition*1.5e-4).r-0.8)/0.6;
    
    return mix(density -(1.0-sm), lod1, pow(lod,2.0));

}
`;




/**
 * A clouds layer where the clouds are distributed according to NOAA GFS weather forecast.
 * GFS provides cloud coverage estimates for low, medium and high clouds. Noise functions 
 * are used for high frequency cloud details while the low frequency cloud distribution comes 
 * directly from NOAA GFS forecasts. 
 * 
 * 
 * @class
 * @extends NOAAGFSCloudsLayer
 */
class NOAAGFSCloudsLayer extends CloudsLayer {
    /**
     * A volumetric clouds layer for the entire planet with cloud coverage based of NOAA weather forecast
     * 
     * Only one visible CloudsLayer (first in list) will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
      @param {Number} [properties.quality = 0.5] a quality that affects the resolution and number of samples for volumetric clouds. lower the quality to improve performance.
     * @param {Number} [properties.density = 0.5] cloud density multiplier 
     * @param {Number} [properties.luminance = 1] sun intensity multiplier
     * @param {Boolean} [properties.debug = false] wind direction
     * @param {THREE.Vector3} [properties.color = new THREE.Vector3(1.0,1.0,1.0)] base cloud color.
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
     */
    constructor(properties) {
        properties.sampleDensityFunction = defaultSampleDensityFunction;
        properties.extraUniforms = {"realTimeLerp": 0.0, "realTimeCoverage": new THREE.Data3DTexture(new Uint8Array(0),0,0,0)};
        properties.maxHeight = 12000;
        properties.minHeight = 500;
        properties.windSpeed = 0;
        super(properties);
        
    }

    init(map){
        super.init(map);
        realtimeWeather(super.getUniforms(), map.ultraClock)
    }

}
export { NOAAGFSCloudsLayer }



