import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import * as THREE from 'three';
import Worley from './Worley';
import Perlin from './Perlin2';
import perlinWorleyTexture from "./../images/perlinWorley.bin"

function common() {
	const rot1 = Math.random() * 3.1416 * 2;
	const rot2 = Math.random() * 3.1416 * 2;
	const cos1 = Math.cos(rot1).toFixed(5);
	const sin1 = Math.sin(rot1).toFixed(5);

	const cos2 = Math.cos(rot2).toFixed(5);
	const sin2 = Math.sin(rot2).toFixed(5);

	return `
		mat2 texRotation1 = mat2(
            `+ cos1 + `, ` + (-sin1) + `,
            `+ sin1 + `, ` + cos1 + `
        );
            
        mat2 texRotation2 = mat2(
            `+ cos2 + `, ` + (-sin2) + `,
            `+ sin2 + `, ` + cos2 + `
        );

		float a = 6378137.0;
		float b = 6356752.3142451794975639665996337;

		vec2 shift(in vec2 shift, in vec2 lonlat){
			vec2 lonlatShifted = vec2(shift.x+lonlat.x, shift.y+lonlat.y);
			if (lonlatShifted.y > 1.57080) {
				lonlatShifted.x -= 3.14159;
				lonlatShifted.y = 3.14159 - lonlatShifted.y;
			} else if (lonlatShifted.y < -1.57080) {
				lonlatShifted.x -= 3.14159;
				lonlatShifted.y = -3.14159 - lonlatShifted.y;
			}
			
			// Wrap longitude
			lonlatShifted.x = mod(lonlatShifted.x + 3.14159, 2.0 * 3.14159) - 3.14159;
			return lonlatShifted;
		}
		vec2 rotate90(vec2 longLat) {
			
			// Convert to Cartesian coordinates
			vec3 cart = vec3(sin(longLat.y), cos(longLat.y) * sin(longLat.x), -cos(longLat.y) * cos(longLat.x));
			return vec2(atan(cart.x, cart.y), asin(cart.z));
		}
		vec4 pickFromTexture(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
			
			vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
			uv = matrix*uv*frequency;
			vec4 a1 = texture2D(sampler , uv.xy );
			vec2 lonLatRotated = rotate90(lonLat);

			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			vec4 b = texture2D(sampler , uv.xy );

			
			lonLatRotated = rotate90(rotate90(lonLatRotated));
			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			vec4 a2 = texture2D(sampler , uv.xy );
			float grad = cos(lonLat.x)*0.5+0.5;
			vec4 a = grad*a1+(1.0-grad)*a2;
			
			float c = cos(lonLat.y);
			c = c*c;
			
			return a*c+b*(1.0-c);
		}
		float pickFromTextureX(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
			
			vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
			uv = matrix*uv*frequency;
			float a1 = texture2D(sampler , uv.xy ).x;
			vec2 lonLatRotated = rotate90(lonLat);

			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float b = texture2D(sampler , uv.xy ).x;

			
			lonLatRotated = rotate90(rotate90(lonLatRotated));
			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float a2 = texture2D(sampler , uv.xy ).x;
			float grad = cos(lonLat.x)*0.5+0.5;
			float a = grad*a1+(1.0-grad)*a2;
			
			float c = cos(lonLat.y);
			c = c*c;
			
			return a*c+b*(1.0-c);
		}
		float pickFromTextureZ(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
			
			vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
			uv = matrix*uv*frequency;
			float a1 = texture2D(sampler , uv.xy ).z;
			vec2 lonLatRotated = rotate90(lonLat);

			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float b = texture2D(sampler , uv.xy ).z;

			
			lonLatRotated = rotate90(rotate90(lonLatRotated));
			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float a2 = texture2D(sampler , uv.xy ).z;
			float grad = cos(lonLat.x)*0.5+0.5;
			float a = grad*a1+(1.0-grad)*a2;
			
			float c = cos(lonLat.y);
			c = c*c;
			
			return a*c+b*(1.0-c);
		}
		float pickFromTextureY(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
			
			vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
			uv = matrix*uv*frequency;
			float a1 = texture2D(sampler , uv.xy ).y;
			vec2 lonLatRotated = rotate90(lonLat);

			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float b = texture2D(sampler , uv.xy ).y;

			
			lonLatRotated = rotate90(rotate90(lonLatRotated));
			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float a2 = texture2D(sampler , uv.xy ).y;
			float grad = cos(lonLat.x)*0.5+0.5;
			float a = grad*a1+(1.0-grad)*a2;
			
			float c = cos(lonLat.y);
			c = c*c;
			
			return a*c+b*(1.0-c);
		}
		float pickFromTextureW(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
			
			vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
			uv = matrix*uv*frequency;
			float a1 = texture2D(sampler , uv.xy ).w;
			vec2 lonLatRotated = rotate90(lonLat);

			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float b = texture2D(sampler , uv.xy ).w;

			
			lonLatRotated = rotate90(rotate90(lonLatRotated));
			uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
			uv = matrix*uv*frequency;
			float a2 = texture2D(sampler , uv.xy ).w;
			float grad = cos(lonLat.x)*0.5+0.5;
			float a = grad*a1+(1.0-grad)*a2;
			
			float c = cos(lonLat.y);
			c = c*c;
			
			return a*c+b*(1.0-c);
		}

		void raySphereForwardSurfaceIntersection(
			in vec3 sphereOrigin, in float sphereRadius,
			in vec3 rayOrigin, in vec3 rayDirection, 
			out vec3 surfaceLocation1, out vec3 surfaceLocation2,
			out bool intersect1, out bool intersect2
		) {
			
			intersect1 = false;
			intersect2 = false;

			vec3 distSphereToRayOrigin = sphereOrigin - rayOrigin;
			float t = dot(distSphereToRayOrigin, rayDirection);
			vec3 P = rayDirection * t + rayOrigin;
			float y = length(sphereOrigin-P);

			if(y < sphereRadius){ //  impact
				
				float x = sqrt(sphereRadius*sphereRadius - y*y);
			
				if(t-x>0.0){
					surfaceLocation1.xyz = rayDirection;
					surfaceLocation1.xyz *= t-x;
					surfaceLocation1.xyz += rayOrigin;
					intersect1 = true;
				}
				if(t+x>0.0){
					surfaceLocation2.xyz = rayDirection;
					surfaceLocation2.xyz *= t+x;
					surfaceLocation2.xyz += rayOrigin;
					intersect2 = true;
				}
			}
			
		}
		
		float getGlobalCoverage(vec3 position, float threshold, float windSpeed){
			float height = (length(position)-radius)/(radius*0.05);
			vec3 normalizedPosition = normalize(position);
			vec2 lonlat = vec2(atan(normalizedPosition.y, normalizedPosition.x)+time*windSpeed*0.01,asin(normalizedPosition.z));
			vec4 rand = pickFromTexture(noise2D, lonlat,texRotation2, 5.0)*0.1;
			vec2 warpShift = vec2(rand.x, rand.w*cos(lonlat.y));
			vec2 lonlatWarpShifted = shift(warpShift+vec2(time*windSpeed*0.01,0.0),lonlat);
			float val1 = pickFromTextureX(noise2D, lonlatWarpShifted,texRotation2, 2.0);
			float val2 = val1*pickFromTextureY(noise2D, vec2(val1,height),texRotation1, 3.0);
			return (step(threshold, val2) * (val2 - threshold) / (1.0 - threshold))*2.0-1.0;
		  }

		  float readDepth( sampler2D depthSampler, vec2 coord ) {
			vec4 fragCoord = texture2D( depthSampler, coord );
			//float logDepthBufFC = 2.0 / ( log( cameraFar + 1.0 ) / log(2.0) );
			float viewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
			return viewZToOrthographicDepth( -viewZ, cameraNear, cameraFar );
		  }

		
		float lightThrough(float lengthThroughCloudToLight, float lengthThroughCloudToCamera, float densityToLight, float densityToCamera, float cosThetaIncident, float cosThetaToCamera, float lightSourceIntesity, float lightFromPrevious){
			float g = 0.2;
			float phaseFactor = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosThetaIncident, 1.5);
			phaseFactor /= 4.0 * 3.14159265;

			float lightReachingPoint = lightFromPrevious+ lightSourceIntesity * phaseFactor * exp(max(-10.0,-lengthThroughCloudToLight*densityToLight));

			phaseFactor = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosThetaToCamera, 1.5);
			phaseFactor /= 4.0 * 3.14159265;
			return lightReachingPoint*phaseFactor*exp(max(-10.0,-lengthThroughCloudToCamera*densityToCamera));
		}

		float scatterOut(float g, float cosTheta, float lightIn){
			float phaseFactor = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5);
			phaseFactor /= 4.0 * 3.14159265;
			return lightIn * phaseFactor;
		}

		float biScattering(float g, float k, float cosTheta, float lightIn){
			float g2 = g*g;
			float phaseFactor = mix((1.0 - g2) / pow(1.0 + g2 - 2.0 * g * -cosTheta, 1.5), (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5), k);
			phaseFactor /= 4.0 * 3.14159265;
			return lightIn * phaseFactor;
		}

		float beerPowder(float lightIn, float density, float distance ){
			return lightIn * (exp(-distance * density) * (1.0-exp(-2.0*distance*density)));
		}

		float beer(float lightIn, float density, float distance){
			return lightIn * exp(-distance * density);
		}

		float multiOctaveBeer(float lightIn, float density, float distance, float g, float k, float cosTheta){
			float attenuation = 0.2;
			float contribution = 0.4;
			float phaseAttenuation = 0.1;

			float a = 1.0;
			float b = 1.0;
			float c = 1.0;

			float luminance = 0.0;

			for(float i = 0.0; i<4.0; i++){
				float phase = biScattering(g, k, cosTheta, c);
				float beers = exp(-density * distance * 0.1 * a);

				luminance += b * phase * beers;

				a*= attenuation;
				b*= contribution;
				c*= (1.0 - phaseAttenuation);
			}
			return lightIn * luminance;
		}

		vec3 rotateVectorAroundAxis(vec3 dir, vec3 axis, float angle) {
			float cosTheta = cos(angle);
			float sinTheta = sin(angle);
			return dir * cosTheta + cross(axis, dir) * sinTheta + axis * dot(axis, dir) * (1.0 - cosTheta);
		}
		vec3 randomDirectionInCone(vec3 originalDirection, float coneAngle, float rand1, float rand2) {
			// Generating a random axis within the cone
			float randomAngleAroundOriginalDir = rand1 * 2.0 * 3.14159265; // Full circle
			vec3 perpendicularAxis = normalize(cross(originalDirection, vec3(0, 1, 0)));
			if (length(perpendicularAxis) < 0.001) {
				perpendicularAxis = normalize(cross(originalDirection, vec3(1, 0, 0)));
			}
			vec3 randomAxis = rotateVectorAroundAxis(perpendicularAxis, originalDirection, randomAngleAroundOriginalDir);
		
			// Random angle within the cone
			float angleWithinCone = rand2 * coneAngle;
		
			// Rotate the vector
			vec3 newDirection = rotateVectorAroundAxis(originalDirection, randomAxis, angleWithinCone);
		
			return normalize(newDirection);
		}

		vec3 Pack24(float val) {
			float sclaedVal = val * 0.9999847412109375;
			vec4 encode = fract(sclaedVal * vec4(1.0, 256.0, 65536.0, 16777216.0));
			return encode.xyz - encode.yzw / 256.0 + 0.001953125;
			
		}

		float scaleRandom(float length, float random) {
			// Ensure that the minimum output is 1.0
			float minOutput = 1.0;
		
			// Adjust the skew factor based on the input length.
			// The skew factor increases as the input length increases,
			// making the output more likely to be closer to 1.
			float skewFactor = log(length + 1.0);
		
			// Apply the skew to the random value
			float skewedRandom = pow(random, skewFactor);
		
			// Scale the skewed random value between minOutput and length
			float scaledRandom = minOutput + (skewedRandom * (length - minOutput));
		
			// Ensure the output is at least minOutput and at most the input length
			return clamp(scaledRandom, minOutput, length);
		}

		vec3 cartesianLlhShift(vec3 cartesianPosition, vec3 cartesianPositionNormalized, vec3 llhShift){
			vec3 sampleLonLatHeight = vec3(
				atan(cartesianPositionNormalized.y, cartesianPositionNormalized.x) + llhShift.x,
				asin(cartesianPositionNormalized.z)+llhShift.y, 
				length(cartesianPosition) - radius + llhShift.z
				);
			float cosLat = cos(sampleLonLatHeight.z);
			return vec3(
				(radius + sampleLonLatHeight.z) * cosLat * cos(sampleLonLatHeight.x),
				(radius + sampleLonLatHeight.z) * cosLat * sin(sampleLonLatHeight.x),
				(radius + sampleLonLatHeight.z) * sin(sampleLonLatHeight.y)
				);
		}

		vec2 raySphereIntersection(
			in vec3 sphereOrigin, in float sphereRadius,
			in vec3 rayOrigin, in vec3 rayDirection
		) {
			vec3 distSphereToRayOrigin = sphereOrigin - rayOrigin;
			float t = dot(distSphereToRayOrigin, rayDirection);
			vec3 P = rayDirection * t + rayOrigin;
			float y = length(sphereOrigin-P);

			if(y > sphereRadius){ // no impact
				return vec2(-1.0);
			}
			float x = sqrt(sphereRadius*sphereRadius - y*y);
			return vec2(t-x, t+x);
		}

		vec2 rayEllipsoidIntersection(
			in vec3 ellipsoidCenter, in vec3 rayOrigin, in vec3 normalizedRayDir, in float a, in float b, in float c
		) {
			vec3 translatedRayOrigin = rayOrigin - ellipsoidCenter;
			vec3 rescale = vec3(1.0 / a, 1.0 / b, 1.0 / c);
			vec3 newRayOrigin = translatedRayOrigin * rescale;
			vec3 newRayDir = normalize(normalizedRayDir * rescale);
			
			vec2 tValues = raySphereIntersection(vec3(0,0,0), 1.0, newRayOrigin, newRayDir);
			if(tValues.x>0.0){
				vec3 impact = newRayOrigin+(newRayDir*tValues.x);
				impact/=rescale;
				tValues.x = length(translatedRayOrigin-impact);
			}
			if(tValues.y>0.0){
				vec3 impact = newRayOrigin+(newRayDir*tValues.y);
				impact/=rescale;
				tValues.y = length(translatedRayOrigin-impact);
			}
			/* tValues /= length(newRayOrigin);
			tValues*= length(translatedRayOrigin); */
			/* tValues.x /= length(rescale);
			tValues.y /= length(rescale); */
			return tValues;
		}

		
	`;
}
const CloudsShader = {
	vertexShader: () =>/* glsl */`
	
	precision highp sampler3D;
	precision highp float;
	precision highp int;

	varying vec2 vUv;
	varying vec3 farPlanePosition;
	varying vec3 nearPlanePosition;
	uniform vec3 viewCenterFar;
	uniform vec3 viewCenterNear;
    uniform vec3 up;
    uniform vec3 right;
	uniform float xfov;
	uniform float yfov;
	uniform float cameraNear;
	uniform float cameraFar;

	

	void main() {
		vUv = uv;
		float x = (uv.x-0.5)*2.0;
		float y = (uv.y-0.5)*2.0;
		farPlanePosition = viewCenterFar;
		float distX = ( x * (tan(radians(xfov*0.5))*cameraFar));
		float distY = ( y * (tan(radians(yfov*0.5))*cameraFar));
		farPlanePosition -= right * distX;
		farPlanePosition += up * distY;

		nearPlanePosition = viewCenterNear;
		distX = ( x * (tan(radians(xfov*0.5))*cameraNear));
		distY = ( y * (tan(radians(yfov*0.5))*cameraNear));
		nearPlanePosition -= right * distX;
		nearPlanePosition += up * distY;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,

	fragmentShader: (ocean) => {
		//ocean = false;
		let code = /* glsl */`
		precision highp sampler3D;
		precision highp float;
		precision highp int;

		layout(location = 1) out vec4 gMask;

		#include <packing>
		
		varying vec2 vUv;
		uniform sampler2D tDepth;
		uniform sampler3D perlinWorley;
		uniform sampler2D noise2D;
		uniform sampler2D previous;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform float radius;
		uniform vec3 planetPosition;
		uniform vec3 nonPostCameraPosition;
		varying vec3 farPlanePosition;
		varying vec3 nearPlanePosition;
		uniform float ldf;
		uniform float time;
		uniform float numSamples;
		uniform float numSamplesToLight;

		uniform float lengthMultiplier;
		uniform float sunlight;
		uniform float scatterCoef;
		uniform float biScatteringKappa;
		uniform float coverage;
		uniform vec3 color;
		uniform float cloudsRadiusStart;
		uniform float cloudsRadiusEnd;
		uniform float windSpeed;
		uniform float temporalDeNoiseAlpha;
		`;


		code += common();
		code += `
			
	
		
		void main() {
			float sunIntensity = 20.0;
			float depth = readDepth( tDepth, vUv );
			vec3 worldDir = normalize(farPlanePosition-nonPostCameraPosition);
			vec2 lonlat = vec2(atan(worldDir.y, worldDir.x),asin(worldDir.z));
			vec4 random = texture2D(noise2D, (lonlat)*0.1);
			
			//worldDir = randomDirectionInCone(worldDir, 0.001, random.z, random.w);

			//worldDir= normalize(worldDir+rand1*0.4);
			vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
			float lengthToEarthImpact = length(impact-nonPostCameraPosition);
			
			
			float cloudsRadiusStartMeters = max(cloudsRadiusStart,1.001)*radius;
			float cloudsRadiusEndMeters = max(cloudsRadiusEnd,1.001)*radius;

			float cloudsDepthMeters = cloudsRadiusEndMeters - cloudsRadiusStartMeters;
			
			vec3 cloudImpactsStartIn = vec3(0.0);
			vec3 cloudImpactsStartOut = vec3(0.0);
			vec3 cloudImpactsEndIn = vec3(0.0);
			vec3 cloudImpactsEndOut = vec3(0.0);
			bool inEndHits;
			bool outEndHits;
			bool inStartHits;
			bool outStartHits;
			raySphereForwardSurfaceIntersection(planetPosition, cloudsRadiusEndMeters, nonPostCameraPosition, worldDir, cloudImpactsEndIn, cloudImpactsEndOut, inEndHits, outEndHits);
			raySphereForwardSurfaceIntersection(planetPosition, cloudsRadiusStartMeters, nonPostCameraPosition, worldDir, cloudImpactsStartIn, cloudImpactsStartOut, inStartHits, outStartHits);
			
			

			if(!inEndHits  && !outEndHits) {
				pc_fragColor = vec4(vec3(1.0),0.0);
				gMask = vec4(0.0,0.0,0.0,1.0);
				
				return; // no cloud hit
			}
			vec3 traverse1Entry;
			vec3 traverse1Exit;
			
			bool secondTraverse = false;
			vec3 traverse2Entry;
			vec3 traverse2Exit;

			
			if(inEndHits){ // camera outside clouds looking in
				
				traverse1Entry = cloudImpactsEndIn;
				if(inStartHits){ //ray penetrates inner radius
					traverse1Exit = cloudImpactsStartIn;
					
					secondTraverse = true;
					traverse2Entry = cloudImpactsStartOut;
					traverse2Exit = cloudImpactsEndOut;
				}else{ // ray doesn't penetrate clouds inner radius
					traverse1Exit = cloudImpactsEndOut;
					
				}
			}else { // camera inside outer radius

				if(inStartHits){ //camera outside inner radius looking in
					traverse1Entry = nonPostCameraPosition;
					traverse1Exit = cloudImpactsStartIn;
					secondTraverse = true;
					traverse2Entry = cloudImpactsStartOut;
					traverse2Exit = cloudImpactsEndOut;
					
				}
				else if(outStartHits){ // camera inside inner radius
					traverse1Entry = cloudImpactsStartOut;
					traverse1Exit = cloudImpactsEndOut;
				}else{
					traverse1Entry = nonPostCameraPosition;
					traverse1Exit = cloudImpactsEndOut;
				}
			}


			// depth check
			`;
		// ocean check
		if (ocean) {
			code += `
				if(depth>0.9999){
					
					vec2 rayEllipsoid = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, worldDir, a, a, b);
					float hasImpact = step(0.0, rayEllipsoid.x); // returns 1 if rayEllipsoid.x >= 0.0, else 0
					lengthToEarthImpact = mix(lengthToEarthImpact, rayEllipsoid.x, hasImpact);
					depth = mix(depth, 0.5, hasImpact);
				}
				`;
		}

		code += `

			if(depth<0.9999){
				if( lengthToEarthImpact < length(traverse1Entry-nonPostCameraPosition)) {
					pc_fragColor = vec4(vec3(1.0,0.0,0.0),0.0);
					gMask = vec4(0.0,0.0,0.0,0.0);
					//gl_FragDepth = 0.0;
					return;
				}
				if( lengthToEarthImpact < length(traverse1Exit-nonPostCameraPosition)) {
					traverse1Exit = impact;
					secondTraverse = false;
				}
				if(secondTraverse && lengthToEarthImpact < length(traverse2Entry-nonPostCameraPosition)){
					secondTraverse = false;
					
				}
				if(secondTraverse && lengthToEarthImpact < length(traverse2Exit-nonPostCameraPosition)){
					traverse2Exit = nonPostCameraPosition;
				}
				
			}

			/// First deal with traverse1 (nearer to the camera) and only deal with traverse 2 if opacity is less than 100%
			

				
			float rand = 1.0*texture(perlinWorley, mix(traverse1Exit, traverse1Entry,0.5)).x;
			//float rand = random.z;

			
			float opacity1 = 0.0;
			float opacity2 = 0.0;
			

			vec3 light1 = vec3(0.0);
			vec3 light2 = vec3(0.0);


			float length1 = length(traverse1Entry-traverse1Exit)/cloudsDepthMeters;
			float numSamplesLocal = numSamples*length1;
			float theta = time*windSpeed*0.01;
			for(float i = 0.0; i<numSamplesLocal; i++){
				if(opacity1>=1.0) break;
				float fraction = (i+rand)/numSamplesLocal;
				vec3 samplePosition = mix(traverse1Entry,traverse1Exit,fraction);
				vec3 samplePositionNormalized = normalize(samplePosition);
				
				vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
				
				float height = (length(samplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
				float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
				vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).r), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
				float localOpacity= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-9+offset*0.6).r-coverage-(1.0-sm)),4.0);
				if(localOpacity<=0.0) continue;
				localOpacity*= max(0.0,texture(perlinWorley, offsetPosition*6e-7+offset*0.357).r-coverage-(1.0-sm));
				if(localOpacity<=0.0) continue;
				localOpacity *= pow(max(0.0,texture(perlinWorley, offsetPosition*4e-6).r),2.0);
				opacity1 += localOpacity*lengthMultiplier;

				///// compute light to sample
				vec3 lightExit = samplePositionNormalized*cloudsRadiusEndMeters;

				float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
				float densityToLight = 0.0;
				//float numSamplesLocalToLight = min(numSamplesToLight*2.0,numSamplesToLight*length1);
				for(float j = 0.0; j<numSamplesToLight; j++){
					float fractionToLight = (j+rand)/numSamplesToLight;
					
					vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
					vec3 secondOffsetPosition = vec3( secondSamplePosition.x * cos(theta) - secondSamplePosition.y * sin(theta), secondSamplePosition.x * sin(theta) + secondSamplePosition.y * cos(theta), secondSamplePosition.z);
				
					float secondHeight = (length(secondSamplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
					float smToLight= smoothstep(0.0,0.2,secondHeight) * (smoothstep(1.0,0.8,secondHeight));
					vec3 secondOffset = vec3(texture(perlinWorley, secondSamplePosition*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
					float localDensityToLight=  pow(max(0.0,texture(perlinWorley, secondOffsetPosition*1e-9+secondOffset*0.6).r-coverage-(1.0-smToLight)),4.0);
					
					if(localDensityToLight<=0.0) break;
					localDensityToLight*= max(0.0,texture(perlinWorley, secondOffsetPosition*6e-7+secondOffset*0.357).r-coverage-(1.0-smToLight));
					if(localDensityToLight<=0.0) break;
					localDensityToLight *= pow(max(0.0,texture(perlinWorley, secondOffsetPosition*4e-6).r),2.0);
					
					
					densityToLight += localDensityToLight*lengthMultiplier;
				}
				float lightToSample = multiOctaveBeer((sunlight*(1.0+length1)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
					scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

				float lengthToCamera = length(traverse1Entry-samplePosition)/cloudsDepthMeters;
				lightToSample = beer(lightToSample, (opacity1/(i+1.0)), lengthToCamera);

				light1 += vec3(min(1.0,lightToSample));
			}
			
			float length2 = 0.0;
			if(secondTraverse /*&& opacity1>=1.0*/){
				length2 = length(traverse2Entry-traverse2Exit)/cloudsDepthMeters;
				float numSamplesLocal = numSamples*length2;
				for(float i = 0.0; i< numSamplesLocal; i++){
					if(opacity2>1.0) break;
					float fraction = (i+rand)/numSamplesLocal;
					vec3 samplePosition = mix(traverse2Entry,traverse2Exit,fraction);
					vec3 samplePositionNormalized = normalize(samplePosition);
					
					vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
				
					float height = (length(samplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
					float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
					vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).r), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
					float localOpacity= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-9+offset*0.6).r-coverage-(1.0-sm)),4.0);
					if(localOpacity<=0.0) continue;
					localOpacity*= max(0.0,texture(perlinWorley, offsetPosition*6e-7+offset*0.357).r-coverage-(1.0-sm));
					if(localOpacity<=0.0) continue;
					localOpacity *= pow(max(0.0,texture(perlinWorley, offsetPosition*4e-6).r),2.0);
					opacity2 += localOpacity*lengthMultiplier;
					
				
					///// compute light to sample
					vec3 lightExit = samplePositionNormalized*cloudsRadiusEndMeters;

					float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
					float densityToLight = 0.0;

					for(float j = 0.0; j<numSamplesToLight; j++){
						float fractionToLight = (j+rand)/numSamplesToLight;
						
						vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
						vec3 secondOffsetPosition = vec3( secondSamplePosition.x * cos(theta) - secondSamplePosition.y * sin(theta), secondSamplePosition.x * sin(theta) + secondSamplePosition.y * cos(theta), secondSamplePosition.z);
				
						float secondHeight = (length(secondSamplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
						float smToLight= smoothstep(0.0,0.2,secondHeight) * (smoothstep(1.0,0.8,secondHeight));
						vec3 secondOffset = vec3(texture(perlinWorley, secondSamplePosition*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
						float localDensityToLight=  pow(max(0.0,texture(perlinWorley, secondOffsetPosition*1e-9+secondOffset*0.6).r-coverage-(1.0-smToLight)),4.0);
						if(localDensityToLight<=0.0) break;
						localDensityToLight*= max(0.0,texture(perlinWorley, secondOffsetPosition*6e-7+secondOffset*0.357).r-coverage-(1.0-smToLight));
						if(localDensityToLight<=0.0) break;
						localDensityToLight *= pow(max(0.0,texture(perlinWorley, secondOffsetPosition*4e-6).r),2.0);
						
						
						densityToLight += localDensityToLight*lengthMultiplier;
					}
					
					float lightToSample = multiOctaveBeer((sunlight*(1.0+length2)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
					scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

					float lengthToCamera = length(traverse2Entry-samplePosition)/cloudsDepthMeters;
					lightToSample = beer(lightToSample, (opacity2/(i+1.0)), lengthToCamera);

					light2 += vec3(min(1.0,lightToSample));


					
				}
			}
			
			opacity1 = min(1.0, opacity1);
			opacity2 = min(1.0, opacity2);
				
				
			float finalOpacity = min(1.0,opacity1 + opacity2);
			vec3 finalLight = mix(light2, light1, opacity1)*color*0.9+vec3(0.10);
			pc_fragColor = vec4(finalLight,finalOpacity);
			//pc_fragColor = vec4(1.0,0.0,0.0,opacity1);
			gMask = vec4(Pack24(min(1.0,max(length1,length2)*lengthMultiplier/100.0)),step(0.999,depth));

	}`;




		return code;
	},

	fragmentShaderShadows: (ocean) => {
		let code = /* glsl */`
		

		precision highp sampler3D;
		precision highp float;
		precision highp int;

		layout(location = 1) out vec4 gMask;

		#include <packing>
		
			varying vec2 vUv;
			uniform sampler2D tDepth;
			uniform sampler3D perlinWorley;
			uniform sampler2D noise2D;
			uniform sampler2D previous;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform float radius;
			uniform vec3 planetPosition;
			uniform vec3 nonPostCameraPosition;
			varying vec3 farPlanePosition;
			varying vec3 nearPlanePosition;
			uniform float ldf;
			uniform float time;
			uniform float numSamples;
			uniform float numSamplesToLight;

			uniform float lengthMultiplier;
			uniform float sunlight;
			uniform vec3 sunLocation;
			uniform float scatterCoef;
			uniform float biScatteringKappa;
			uniform float coverage;
			uniform vec3 color;
			uniform float cloudsRadiusStart;
            uniform float cloudsRadiusEnd;
            uniform float windSpeed;
			uniform float temporalDeNoiseAlpha;
			`;


		code += common();
		code += `
			
		
			
			void main() {
				float sunIntensity = 20.0;
				float depth = readDepth( tDepth, vUv );
				vec3 worldDir = normalize(farPlanePosition-nonPostCameraPosition);
				vec2 lonlat = vec2(atan(worldDir.y, worldDir.x),asin(worldDir.z));
				vec4 random = texture2D(noise2D, (lonlat)*1000.0);
				
				//worldDir = randomDirectionInCone(worldDir, 0.001, random.z, random.w);

				//worldDir= normalize(worldDir+rand1*0.4);
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float lengthToEarthImpact = length(impact-nonPostCameraPosition);
				
				float cloudsRadiusStartMeters = (cloudsRadiusStart+1e-10)*radius;
				float cloudsRadiusEndMeters = (cloudsRadiusEnd+1e-10)*radius;

				float cloudsDepthMeters = cloudsRadiusEndMeters - cloudsRadiusStartMeters;
				
				vec3 cloudImpactsStartIn = vec3(0.0);
				vec3 cloudImpactsStartOut = vec3(0.0);
				vec3 cloudImpactsEndIn = vec3(0.0);
				vec3 cloudImpactsEndOut = vec3(0.0);
				bool inEndHits;
				bool outEndHits;
				bool inStartHits;
				bool outStartHits;
				raySphereForwardSurfaceIntersection(planetPosition, cloudsRadiusEndMeters, nonPostCameraPosition, worldDir, cloudImpactsEndIn, cloudImpactsEndOut, inEndHits, outEndHits);
				raySphereForwardSurfaceIntersection(planetPosition, cloudsRadiusStartMeters, nonPostCameraPosition, worldDir, cloudImpactsStartIn, cloudImpactsStartOut, inStartHits, outStartHits);
				
				if(!inEndHits  && !outEndHits) {
					pc_fragColor = vec4(vec3(1.0),0.0);
					gMask = vec4(0.0,0.0,0.0,1.0);
					
					return; // no cloud hit
				}
				vec3 traverse1Entry;
				vec3 traverse1Exit;
				
				bool secondTraverse = false;
				vec3 traverse2Entry;
				vec3 traverse2Exit;

				
				if(inEndHits){ // camera outside clouds looking in
					
					traverse1Entry = cloudImpactsEndIn;
					if(inStartHits){ //ray penetrates inner radius
						traverse1Exit = cloudImpactsStartIn;
						
						secondTraverse = true;
						traverse2Entry = cloudImpactsStartOut;
						traverse2Exit = cloudImpactsEndOut;
					}else{ // ray doesn't penetrate clouds inner radius
						traverse1Exit = cloudImpactsEndOut;
						
					}
				}else { // camera inside outer radius

					if(inStartHits){ //camera outside inner radius looking in
						traverse1Entry = nonPostCameraPosition;
						traverse1Exit = cloudImpactsStartIn;
						secondTraverse = true;
						traverse2Entry = cloudImpactsStartOut;
						traverse2Exit = cloudImpactsEndOut;
						
					}
					else if(outStartHits){ // camera inside inner radius
						traverse1Entry = cloudImpactsStartOut;
						traverse1Exit = cloudImpactsEndOut;
					}else{
						traverse1Entry = nonPostCameraPosition;
						traverse1Exit = cloudImpactsEndOut;
					}
				}


				// depth check
				`;
		// ocean check
		if (ocean) {
			code += `
				if(depth>0.9999){
					
					vec2 rayEllipsoid = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, worldDir, a, a, b);
					float hasImpact = step(0.0, rayEllipsoid.x); // returns 1 if rayEllipsoid.x >= 0.0, else 0
					lengthToEarthImpact = mix(lengthToEarthImpact, rayEllipsoid.x, hasImpact);
					depth = mix(depth, 0.5, hasImpact);
				}
				`;
		}

		code += `

				if(depth<0.9999){
					if( lengthToEarthImpact < length(traverse1Entry-nonPostCameraPosition)) {
						pc_fragColor = vec4(vec3(1.0),0.0);
						gMask = vec4(0.0,0.0,0.0,0.0);
						//gl_FragDepth = 0.0;
						return;
					}
					if( lengthToEarthImpact < length(traverse1Exit-nonPostCameraPosition)) {
						traverse1Exit = impact;
						secondTraverse = false;
					}
					if(secondTraverse && lengthToEarthImpact < length(traverse2Entry-nonPostCameraPosition)){
						secondTraverse = false;
						
					}
					if(secondTraverse && lengthToEarthImpact < length(traverse2Exit-nonPostCameraPosition)){
						traverse2Exit = nonPostCameraPosition;
					}
					
				}

				/// First deal with traverse1 (nearer to the camera) and only deal with traverse 2 if opacity is less than 100%
				

					
				//float rand = 1.0*texture(perlinWorley, mix(traverse1Exit, traverse1Entry,0.5)).x;
				float rand = random.z;

				
				float opacity1 = 0.0;
				float opacity2 = 0.0;
				

				vec3 light1 = vec3(0.0);
				vec3 light2 = vec3(0.0);


				float length1 = length(traverse1Entry-traverse1Exit)/cloudsDepthMeters;
				float numSamplesLocal = numSamples*length1;
				float theta = time*windSpeed*0.01;
				for(float i = 0.0; i<numSamplesLocal; i++){
					if(opacity1>=1.0) break;
					float fraction = (i+rand)/numSamplesLocal;
					vec3 samplePosition = mix(traverse1Entry,traverse1Exit,fraction);
					vec3 samplePositionNormalized = normalize(samplePosition);
					
					vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
					
					float height = (length(samplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
					float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
					vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).r), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
					float localOpacity= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-9+offset*0.6).r-coverage-(1.0-sm)),4.0);
					if(localOpacity<=0.0) continue;
					localOpacity*= max(0.0,texture(perlinWorley, offsetPosition*6e-7+offset*0.357).r-coverage-(1.0-sm));
					if(localOpacity<=0.0) continue;
					localOpacity *= pow(max(0.0,texture(perlinWorley, offsetPosition*4e-6).r),2.0);
					opacity1 += localOpacity*lengthMultiplier;

					///// compute light to sample
					float dotLight = dot(sunLocation, samplePositionNormalized);
					if(dotLight<=-0.2) continue;
					vec3 lightExit = samplePosition + samplePositionNormalized*raySphereIntersection(planetPosition, cloudsRadiusEndMeters, samplePosition, sunLocation).y;

					float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
					float densityToLight = 0.0;
					//float numSamplesLocalToLight = min(numSamplesToLight*2.0,numSamplesToLight*length1);
					for(float j = 0.0; j<numSamplesToLight; j++){
						float fractionToLight = (j+rand)/numSamplesToLight;
						
						vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
						vec3 secondOffsetPosition = vec3( secondSamplePosition.x * cos(theta) - secondSamplePosition.y * sin(theta), secondSamplePosition.x * sin(theta) + secondSamplePosition.y * cos(theta), secondSamplePosition.z);
					
						float secondHeight = (length(secondSamplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
						float smToLight= smoothstep(0.0,0.2,secondHeight) * (smoothstep(1.0,0.8,secondHeight));
						vec3 secondOffset = vec3(texture(perlinWorley, secondSamplePosition*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
						float localDensityToLight=  pow(max(0.0,texture(perlinWorley, secondOffsetPosition*1e-9+secondOffset*0.6).r-coverage-(1.0-smToLight)),4.0);
						if(localDensityToLight<=0.0) break;
						localDensityToLight*= max(0.0,texture(perlinWorley, secondOffsetPosition*6e-7+secondOffset*0.357).r-coverage-(1.0-smToLight));
						if(localDensityToLight<=0.0) break;
						localDensityToLight *= pow(max(0.0,texture(perlinWorley, secondOffsetPosition*4e-6).r),2.0);
						
						
						densityToLight += localDensityToLight*lengthMultiplier;
					}
					float lightToSample = multiOctaveBeer((sunlight*(1.0+length1)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
						scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

					float lengthToCamera = length(traverse1Entry-samplePosition)/cloudsDepthMeters;
					lightToSample = beer(lightToSample, (opacity1/(i+1.0)), lengthToCamera);

					light1 += vec3(min(1.0,lightToSample*(dotLight+0.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.4)));
				}
				float length2 = 0.0;
				if(secondTraverse /*&& opacity1>=1.0*/){
					length2 = length(traverse2Entry-traverse2Exit)/cloudsDepthMeters;
					float numSamplesLocal = numSamples*length2;
					for(float i = 0.0; i< numSamplesLocal; i++){
						if(opacity2>1.0) break;
						float fraction = (i+rand)/numSamplesLocal;
						vec3 samplePosition = mix(traverse2Entry,traverse2Exit,fraction);
						vec3 samplePositionNormalized = normalize(samplePosition);
						
						vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
					
						float height = (length(samplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
						float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
						vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).r), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
						float localOpacity= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-9+offset*0.6).r-coverage-(1.0-sm)),4.0);
						if(localOpacity<=0.0) continue;
						localOpacity*= max(0.0,texture(perlinWorley, offsetPosition*6e-7+offset*0.357).r-coverage-(1.0-sm));
						if(localOpacity<=0.0) continue;
						localOpacity *= pow(max(0.0,texture(perlinWorley, offsetPosition*4e-6).r),2.0);
						opacity2 += localOpacity*lengthMultiplier;
						
					
						///// compute light to sample
						float dotLight = dot(sunLocation, samplePositionNormalized);
						if(dotLight<=-0.2) continue;
						vec3 lightExit = samplePosition + samplePositionNormalized*raySphereIntersection(planetPosition, cloudsRadiusEndMeters, samplePosition, sunLocation).y;
	
						float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
						float densityToLight = 0.0;

						for(float j = 0.0; j<numSamplesToLight; j++){
							float fractionToLight = (j+rand)/numSamplesToLight;
							
							vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
							vec3 secondOffsetPosition = vec3( secondSamplePosition.x * cos(theta) - secondSamplePosition.y * sin(theta), secondSamplePosition.x * sin(theta) + secondSamplePosition.y * cos(theta), secondSamplePosition.z);
					
							float secondHeight = (length(secondSamplePosition)-cloudsRadiusStartMeters) / ((cloudsRadiusEndMeters-cloudsRadiusStartMeters)+1e-10);
							float smToLight= smoothstep(0.0,0.2,secondHeight) * (smoothstep(1.0,0.8,secondHeight));
							vec3 secondOffset = vec3(texture(perlinWorley, secondSamplePosition*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (secondOffsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
							float localDensityToLight=  pow(max(0.0,texture(perlinWorley, secondOffsetPosition*1e-9+secondOffset*0.6).r-coverage-(1.0-smToLight)),4.0);
							if(localDensityToLight<=0.0) break;
							localDensityToLight*= max(0.0,texture(perlinWorley, secondOffsetPosition*6e-7+secondOffset*0.357).r-coverage-(1.0-smToLight));
							if(localDensityToLight<=0.0) break;
							localDensityToLight *= pow(max(0.0,texture(perlinWorley, secondOffsetPosition*4e-6).r),2.0);
							
							
							densityToLight += localDensityToLight*lengthMultiplier;
						}
						
						float lightToSample = multiOctaveBeer((sunlight*(1.0+length2)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
						scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

						float lengthToCamera = length(traverse2Entry-samplePosition)/cloudsDepthMeters;
						lightToSample = beer(lightToSample, (opacity2/(i+1.0)), lengthToCamera);

						light2 += vec3(min(1.0,lightToSample*(dotLight+0.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.4)));


						
					}
				}
				
				opacity1 = min(1.0, opacity1);
				opacity2 = min(1.0, opacity2);
				
				
				float finalOpacity = min(1.0,opacity1 + opacity2);
				vec3 finalLight = mix(light2, light1, opacity1)*color*0.9+vec3(0.10);
				pc_fragColor = vec4(finalLight,finalOpacity);
				//pc_fragColor = vec4(1.0,0.0,0.0,opacity1);
				gMask = vec4(Pack24(min(1.0,max(length1,length2)*lengthMultiplier/100.0)),step(0.999,depth));

		}`;




		return code;
	},
	loadPerlinWorley : (url) => {
		return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const texture = new THREE.Data3DTexture(data, 128, 128, 128);
            texture.format = THREE.RedFormat;
            texture.type = THREE.UnsignedByteType;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.wrapR = THREE.RepeatWrapping;
            texture.unpackAlignment = 1;
            texture.needsUpdate = true;
            return texture;
        })
        .catch(error => console.error('Error loading binary file:', error));
	},
	generatePerlinWorleyTexture: () => {

		function remap(x, a, b, c, d) {
			return (((x - a) / (b - a)) * (d - c)) + c;
		}
		const perlin = new Perlin(40);
		const worley3D = new Worley();
		const size = 128;
		const dataFloat = new Float32Array(size * size * size);
		const data = new Uint8Array(size * size * size);
		let i = 0;
		const vector = new THREE.Vector3();

		let min = 10000;
		let max = -10000;
		for (let z = 0; z < size; z++) {

			for (let y = 0; y < size; y++) {

				for (let x = 0; x < size; x++) {

					vector.set(x, y, z).divideScalar(size);

					let perlinFBM = perlin.noise((x + 0.1579) * 1, (y + 0.7432) * 1, (z + 0.4699) * 1, size) * 0.6
						+ perlin.noise((x + 0.1579) * 2, (y + 0.7432) * 2, (z + 0.4699) * 2, size) * 0.3
						+ perlin.noise((x + 0.1579) * 3, (y + 0.7432) * 3, (z + 0.4699) * 3, size) * 0.1;

					let worleyFBM = worley3D.noise({ x: x*10, y: y*10, z: z*10 }, Worley.EuclideanDistance, size * 10, size * 10, size * 10)[0] * 0.6 +
						worley3D.noise({ x: x * 20, y: (y) * 20, z: (z) * 20 }, Worley.EuclideanDistance, size * 20, size * 20, size * 20)[0] * 0.3 +
						worley3D.noise({ x: x * 30, y: (y) * 30, z: (z) * 30 }, Worley.EuclideanDistance, size * 30, size * 30, size * 30)[0] * 0.1;

					const clouds = remap(perlinFBM, worleyFBM-1, 1.0,0.0,1.0)
					if(clouds<min) min = clouds;
					if(clouds>max) max = clouds;
					
					//clouds = 1 - (clouds * 2 - 1);
					//const cloud = Math.max(0.0, Math.min(1.0, remap(perlinFBM, clouds - 1, 1, 0, 1) + 0.5));
					dataFloat[i++] = worleyFBM;//(Math.pow(clouds,0.5)/2+0.5) * 256;

				}

			}

		}

		
		for(let i = 0; i<size * size * size; i++){
			data[i] = ((dataFloat[i]/(max-min))-min)*256;
		}

		//saveDataToBinFile(data, "test.bin")

		const texture = new THREE.Data3DTexture(data, size, size, size);
		texture.format = THREE.RedFormat;
		texture.type = THREE.UnsignedByteType;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.wrapR = THREE.RepeatWrapping;
		texture.unpackAlignment = 1;
		texture.needsUpdate = true;

		return Promise.resolve(texture);
		
	},
	generatePerlin3D: () => {

		function remap(x, a, b, c, d) {
			return (((x - a) / (b - a)) * (d - c)) + c;
		}
		const perlin = new Perlin(40);
		const worley3D = new Worley();
		const size = 128;
		const dataFloat = new Float32Array(size * size * size);
		const data = new Uint8Array(size * size * size);
		let i = 0;
		const vector = new THREE.Vector3();

		let min = 10000;
		let max = -10000;
		for (let z = 0; z < size; z++) {

			for (let y = 0; y < size; y++) {

				for (let x = 0; x < size; x++) {

					vector.set(x, y, z).divideScalar(size);

					let perlinFBM = perlin.noise((x + 0.1579) * 1, (y + 0.7432) * 1, (z + 0.4699) * 1, size) * 0.6
						+ perlin.noise((x + 0.1579) * 1.75, (y + 0.7432) * 1.75, (z + 0.4699) * 1.75, size) * 0.3
						+ perlin.noise((x + 0.1579) * 5.125, (y + 0.7432) * 5.125, (z + 0.4699) * 5.125, size) * 0.1;

				
					if(perlinFBM<min) min = perlinFBM;
					if(perlinFBM>max) max = perlinFBM;
					
					//clouds = 1 - (clouds * 2 - 1);
					//const cloud = Math.max(0.0, Math.min(1.0, remap(perlinFBM, clouds - 1, 1, 0, 1) + 0.5));
					dataFloat[i++] = perlinFBM;//(Math.pow(clouds,0.5)/2+0.5) * 256;

				}

			}

		}

		
		for(let i = 0; i<size * size * size; i++){
			data[i] = ((dataFloat[i]/(max-min))-min)*256;
		}

		//saveDataToBinFile(dataFloat, "test.bin")

		const texture = new THREE.Data3DTexture(data, size, size, size);
		texture.format = THREE.RedFormat;
		texture.type = THREE.UnsignedByteType;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.wrapR = THREE.RepeatWrapping;
		texture.unpackAlignment = 1;
		texture.needsUpdate = true;

		return Promise.resolve(texture);
		
	}
}
export { CloudsShader };

function saveDataToBinFile(data, filename) {
	const blob = new Blob([data], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

function remap(x, a, b, c, d) {
	return (((x - a) / (b - a)) * (d - c)) + c;
}