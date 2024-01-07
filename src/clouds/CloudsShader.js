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
			float height = (length(position)-radius)/(radius*0.08);
			vec3 normalizedPosition = normalize(position);
			vec2 lonlat = vec2(atan(normalizedPosition.y, normalizedPosition.x)+time*windSpeed*0.01,asin(normalizedPosition.z));
			vec4 rand = pickFromTexture(noise2D, lonlat,texRotation2, 2.0)*0.1;
			vec2 warpShift = vec2(rand.x, rand.w*cos(lonlat.y));
			vec2 lonlatWarpShifted = shift(warpShift+vec2(time*windSpeed*0.01,0.0),lonlat);
			float val1 = pickFromTextureX(noise2D, lonlatWarpShifted,texRotation2, 2.0);
			float val2 = val1*pickFromTextureY(noise2D, vec2(val1,height),texRotation1, 3.0);
			return step(threshold, val2) * (val2 - threshold) / (1.0 - threshold);
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
			
			float cloudsRadiusStartMeters = cloudsRadiusStart*radius;
			float cloudsRadiusEndMeters = cloudsRadiusEnd*radius;

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
				if(ocean){
					code+= `
				if(depth>0.9999){
					
					vec2 rayEllipsoid = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, worldDir, a, a, b);
					float hasImpact = step(0.0, rayEllipsoid.x); // returns 1 if rayEllipsoid.x >= 0.0, else 0
					lengthToEarthImpact = mix(lengthToEarthImpact, rayEllipsoid.x, hasImpact);
					depth = mix(depth, 0.5, hasImpact);
				}
				`;
				}

			code+=`

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
			//float length1Temp = min(10.0,length1);
			//traverse1Exit = mix(traverse1Entry,traverse1Exit,length1Temp/length1);
			//length1 = length1Temp;

			for(float i = 0.0; i<numSamples; i++){
				if(opacity1>=1.0) break;
				
				vec3 samplePosition = mix(traverse1Entry,traverse1Exit,pow((i+rand)/numSamples,1.0+log(max(1.0,length1))));
				vec3 samplePositionNormalized = normalize(samplePosition);
				
				vec3 transformedSamplePosition =cartesianLlhShift(samplePosition, samplePositionNormalized, vec3(time*windSpeed*0.001, 0.0,0.0));

				float localCoverage = texture(perlinWorley, transformedSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSamplePosition*1e-6).r*0.333;
				localCoverage = step(coverage, localCoverage) * (localCoverage - coverage) / (1.0 - coverage);
				float localOpacity = localCoverage * getGlobalCoverage(samplePosition, coverage, windSpeed);

				//float height = (length(samplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
				//localOpacity = localOpacity * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

				opacity1 += localOpacity*45.0;
				///// compute light to sample
				vec3 lightExit = samplePositionNormalized*cloudsRadiusEndMeters;

				float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
				float densityToLight = 0.0;
				for(float j = 0.0; j<numSamplesToLight; j++){
					vec3 secondSamplePosition = mix(samplePosition, lightExit, (j+rand)/numSamplesToLight);
					vec3 transformedSecondSamplePosition =cartesianLlhShift(secondSamplePosition, normalize(secondSamplePosition), vec3(time*windSpeed*0.001, 0.0,0.0));
					float secondLocalCoverage = texture(perlinWorley, transformedSecondSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSecondSamplePosition*1e-6).r*0.333;
					secondLocalCoverage = step(coverage, secondLocalCoverage) * (secondLocalCoverage - coverage) / (1.0 - coverage);
					float localDensityToLight = secondLocalCoverage * getGlobalCoverage(secondSamplePosition, coverage, windSpeed);

					//float height = (length(secondSamplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
					//localDensityToLight = localDensityToLight * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

					densityToLight += localDensityToLight;
				}
				//densityToLight -= 1e-2;
				float lightToSample = multiOctaveBeer((sunlight*(1.0+length1)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
					scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

				float lengthToCamera = length(traverse1Entry-samplePosition)/cloudsDepthMeters;
				lightToSample = beer(lightToSample, (opacity1/(i+1.0)), lengthToCamera*lengthMultiplier); 

				light1 += vec3(min(1.0,lightToSample), min(1.0,lightToSample), min(1.0,lightToSample));
			}
			float length2 = 0.0;
			if(secondTraverse /*&& opacity1>=1.0*/){
				length2 = length(traverse2Entry-traverse2Exit)/cloudsDepthMeters;
				//float length2Temp = min(10.0,length2);
				//traverse2Exit = mix(traverse2Entry,traverse2Exit,length2Temp/length2);
				//length1 += length2;
				for(float i = 0.0; i< numSamples; i++){
					if(opacity2>1.0) break;
					
					vec3 samplePosition = mix(traverse2Entry,traverse2Exit,pow((i+rand)/numSamples,1.0+log(max(1.0,length2))));
					vec3 samplePositionNormalized = normalize(samplePosition);
					vec3 transformedSamplePosition =cartesianLlhShift(samplePosition, samplePositionNormalized, vec3(time*windSpeed*0.001, 0.0,0.0));

					float localCoverage = texture(perlinWorley, transformedSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSamplePosition*1e-6).r*0.333;
				
					localCoverage = step(coverage, localCoverage) * (localCoverage - coverage) / (1.0 - coverage);
					float localOpacity = localCoverage * getGlobalCoverage(samplePosition, coverage, windSpeed);

					//float height = (length(samplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
					//localOpacity = localOpacity * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

					opacity2 += localOpacity*45.0;
					///// compute light to sample
					
					vec3 lightExit = samplePositionNormalized*cloudsRadiusEndMeters;

					float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
					float densityToLight = 0.0;
					for(float j = 0.0; j<numSamplesToLight; j++){
						vec3 secondSamplePosition = mix(samplePosition, lightExit, (j+rand)/numSamplesToLight);
						vec3 transformedSecondSamplePosition =cartesianLlhShift(secondSamplePosition, normalize(secondSamplePosition), vec3(time*windSpeed*0.001, 0.0,0.0));
						float secondLocalCoverage = texture(perlinWorley, transformedSecondSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSecondSamplePosition*1e-6).r*0.333;
						secondLocalCoverage = step(coverage, secondLocalCoverage) * (secondLocalCoverage - coverage) / (1.0 - coverage);
						float localDensityToLight = secondLocalCoverage * getGlobalCoverage(secondSamplePosition, coverage, windSpeed);

						//float height = (length(secondSamplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
						//localDensityToLight = localDensityToLight * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

						densityToLight += localDensityToLight;
					}
					//densityToLight -= 1e-2;
					float lightToSample = multiOctaveBeer((sunlight*(1.0+length2)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
						scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));
					
					float lengthToCamera = length(traverse2Entry-samplePosition)/cloudsDepthMeters;
					lightToSample = beer(lightToSample, opacity2/(i+1.0), lengthToCamera*lengthMultiplier); 
					light2 += vec3(min(1.0,lightToSample), min(1.0,lightToSample), min(1.0,lightToSample));
				}
			}
			
			opacity1 = min(1.0, opacity1);
			opacity2 = min(1.0, opacity2);
			
			float finalOpacity = min(1.0,opacity1 + opacity2);
			vec3 finalLight = mix(light2, light1, opacity1)*color*0.9+vec3(0.10);
			pc_fragColor = vec4(finalLight,finalOpacity);
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
				vec4 random = texture2D(noise2D, (lonlat)*0.1);
				
				//worldDir = randomDirectionInCone(worldDir, 0.001, random.z, random.w);

				//worldDir= normalize(worldDir+rand1*0.4);
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float lengthToEarthImpact = length(impact-nonPostCameraPosition);
				
				float cloudsRadiusStartMeters = cloudsRadiusStart*radius;
				float cloudsRadiusEndMeters = cloudsRadiusEnd*radius;

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
				if(ocean){
					code+= `
				if(depth>0.9999){
					
					vec2 rayEllipsoid = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, worldDir, a, a, b);
					float hasImpact = step(0.0, rayEllipsoid.x); // returns 1 if rayEllipsoid.x >= 0.0, else 0
					lengthToEarthImpact = mix(lengthToEarthImpact, rayEllipsoid.x, hasImpact);
					depth = mix(depth, 0.5, hasImpact);
				}
				`;
				}

				code+=`

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
				

					
				float rand = 1.0*texture(perlinWorley, mix(traverse1Exit, traverse1Entry,0.5)).x;
				//float rand = random.z;

				
				float opacity1 = 0.0;
				float opacity2 = 0.0;
				

				vec3 light1 = vec3(0.0);
				vec3 light2 = vec3(0.0);


				float length1 = length(traverse1Entry-traverse1Exit)/cloudsDepthMeters;
				//float length1Temp = min(10.0,length1);
				//traverse1Exit = mix(traverse1Entry,traverse1Exit,length1Temp/length1);
				//length1 = length1Temp;

				for(float i = 0.0; i<numSamples; i++){
					if(opacity1>=1.0) break;
					
					vec3 samplePosition = mix(traverse1Entry,traverse1Exit,pow((i+rand)/numSamples,1.0+log(max(1.0,length1))));
					vec3 samplePositionNormalized = normalize(samplePosition);
					
					vec3 transformedSamplePosition =cartesianLlhShift(samplePosition, samplePositionNormalized, vec3(time*windSpeed*0.001, 0.0,0.0));

					float localCoverage = texture(perlinWorley, transformedSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSamplePosition*1e-6).r*0.333;
					localCoverage = step(coverage, localCoverage) * (localCoverage - coverage) / (1.0 - coverage);
					float localOpacity = localCoverage * getGlobalCoverage(samplePosition, coverage, windSpeed);

					//float height = (length(samplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
					//localOpacity = localOpacity * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

					opacity1 += localOpacity*45.0;
					///// compute light to sample
					float dotLight = dot(sunLocation, samplePositionNormalized);
					if(dotLight<=-0.2) continue;
					vec3 lightExit = samplePosition + samplePositionNormalized*raySphereIntersection(planetPosition, cloudsRadiusEndMeters, samplePosition, sunLocation).y;

					float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
					float densityToLight = 0.0;
					for(float j = 0.0; j<numSamplesToLight; j++){
						vec3 secondSamplePosition = mix(samplePosition, lightExit, (j+rand)/numSamplesToLight);
						vec3 transformedSecondSamplePosition =cartesianLlhShift(secondSamplePosition, normalize(secondSamplePosition), vec3(time*windSpeed*0.001, 0.0,0.0));
						float secondLocalCoverage = texture(perlinWorley, transformedSecondSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSecondSamplePosition*1e-6).r*0.333;
						secondLocalCoverage = step(coverage, secondLocalCoverage) * (secondLocalCoverage - coverage) / (1.0 - coverage);
						float localDensityToLight = secondLocalCoverage * getGlobalCoverage(secondSamplePosition, coverage, windSpeed);

						//float height = (length(secondSamplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
						//localDensityToLight = localDensityToLight * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

						densityToLight += localDensityToLight;
					}
					//densityToLight -= 1e-2;
					float lightToSample = multiOctaveBeer((sunlight*(1.0+length1)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
						scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));

					float lengthToCamera = length(traverse1Entry-samplePosition)/cloudsDepthMeters;
					lightToSample = beer(lightToSample, (opacity1/(i+1.0)), lengthToCamera*lengthMultiplier); 

					light1 += vec3(min(1.0,lightToSample*(dotLight+0.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.4)));
				}
				float length2 = 0.0;
				if(secondTraverse /*&& opacity1>=1.0*/){
					length2 = length(traverse2Entry-traverse2Exit)/cloudsDepthMeters;
					//float length2Temp = min(10.0,length2);
					//traverse2Exit = mix(traverse2Entry,traverse2Exit,length2Temp/length2);
					//length1 += length2;
					for(float i = 0.0; i< numSamples; i++){
						if(opacity2>1.0) break;
						
						vec3 samplePosition = mix(traverse2Entry,traverse2Exit,pow((i+rand)/numSamples,1.0+log(max(1.0,length2))));
						vec3 samplePositionNormalized = normalize(samplePosition);
						vec3 transformedSamplePosition =cartesianLlhShift(samplePosition, samplePositionNormalized, vec3(time*windSpeed*0.001, 0.0,0.0));

						float localCoverage = texture(perlinWorley, transformedSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSamplePosition*1e-6).r*0.333;
					
						localCoverage = step(coverage, localCoverage) * (localCoverage - coverage) / (1.0 - coverage);
						float localOpacity = localCoverage * getGlobalCoverage(samplePosition, coverage, windSpeed);

						//float height = (length(samplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
						//localOpacity = localOpacity * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

						opacity2 += localOpacity*45.0;
						///// compute light to sample
						float dotLight = dot(sunLocation, samplePositionNormalized);
						if(dotLight<=-0.2) continue;
						vec3 lightExit = samplePosition + samplePositionNormalized*raySphereIntersection(planetPosition, cloudsRadiusEndMeters, samplePosition, sunLocation).y;
	
						float lengthToLight = length(lightExit-samplePosition)/cloudsDepthMeters;
						float densityToLight = 0.0;
						for(float j = 0.0; j<numSamplesToLight; j++){
							vec3 secondSamplePosition = mix(samplePosition, lightExit, (j+rand)/numSamplesToLight);
							vec3 transformedSecondSamplePosition =cartesianLlhShift(secondSamplePosition, normalize(secondSamplePosition), vec3(time*windSpeed*0.001, 0.0,0.0));
							float secondLocalCoverage = texture(perlinWorley, transformedSecondSamplePosition*1e-7).r*0.666+texture(perlinWorley, transformedSecondSamplePosition*1e-6).r*0.333;
							secondLocalCoverage = step(coverage, secondLocalCoverage) * (secondLocalCoverage - coverage) / (1.0 - coverage);
							float localDensityToLight = secondLocalCoverage * getGlobalCoverage(secondSamplePosition, coverage, windSpeed);

							//float height = (length(secondSamplePosition)-cloudsRadiusStartMeters) / (cloudsRadiusEndMeters-cloudsRadiusStartMeters);
							//localDensityToLight = localDensityToLight * smoothstep(0.0,0.2,height) * (1.0-smoothstep(0.8,1.0,height));

							densityToLight += localDensityToLight;
						}
						//densityToLight -= 1e-2;
						float lightToSample = multiOctaveBeer((sunlight*(1.0+length2)),densityToLight/numSamplesToLight, lengthToLight*lengthMultiplier, 
							scatterCoef, biScatteringKappa, dot(worldDir, samplePositionNormalized));
						
						float lengthToCamera = length(traverse2Entry-samplePosition)/cloudsDepthMeters;
						lightToSample = beer(lightToSample, opacity2/(i+1.0), lengthToCamera*lengthMultiplier); 
						light2 += vec3(min(1.0,lightToSample*(dotLight+0.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.2)), min(1.0,lightToSample*pow((dotLight+0.2),1.4)));
					}
				}
				
				opacity1 = min(1.0, opacity1);
				opacity2 = min(1.0, opacity2);
				
				
				float finalOpacity = min(1.0,opacity1 + opacity2);
				vec3 finalLight = mix(light2, light1, opacity1)*color*0.9+vec3(0.10);
				pc_fragColor = vec4(finalLight,finalOpacity);
				gMask = vec4(Pack24(min(1.0,max(length1,length2)*lengthMultiplier/100.0)),step(0.999,depth));

		}`;




		return code;
	},
	generatePerlinWorleyTexture: () => {

		function remap(x, a, b, c, d) {
			return (((x - a) / (b - a)) * (d - c)) + c;
		}
		const perlin = new Perlin(40);
		const worley3D = new Worley();
		const size = 128;
		const data = new Uint8Array(size * size * size);
		let i = 0;
		const vector = new THREE.Vector3();
		for (let z = 0; z < size; z++) {

			for (let y = 0; y < size; y++) {

				for (let x = 0; x < size; x++) {

					vector.set(x, y, z).divideScalar(size);

					const d = perlin.noise((x + 0.1579), (y + 0.7432), (z + 0.4699), size);

					/* let w = worley3D.noise({ x: x, y: y, z: z }, Worley.EuclideanDistance, size * 1, size * 1, size * 1)[0] * 0.0 +
					worley3D.noise({ x: x * 2, y: (y) * 2, z: (z) * 2 }, Worley.EuclideanDistance, size * 2, size * 2, size * 2)[0] * 0.0 +
					worley3D.noise({ x: x * 4, y: (y) * 4, z: (z) * 4 }, Worley.EuclideanDistance, size * 4, size * 4, size * 4)[0] * 1.0; */


					data[i++] = d * 256;

				}

			}

		}

		const texture = new THREE.Data3DTexture(data, size, size, size);
		texture.format = THREE.RedFormat;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.wrapR = THREE.RepeatWrapping;
		texture.unpackAlignment = 1;
		texture.needsUpdate = true;

		return Promise.resolve(texture);
		/*let size = 128;
		function remap(x, a, b, c, d) {
			return (((x - a) / (b - a)) * (d - c)) + c;
		}
		const worley3D = new Worley();
		const perlin1 = new Perlin(40);

		const data = new Uint8Array(size * size * size);
		let i = 0;
		for (let z = 0; z < size; z++) {

			for (let y = 0; y < size; y++) {

				for (let x = 0; x < size; x++) {

					//compute multifractal perlin
					let pX = perlin1.noise(x, y, z, size) * 0.65 + perlin1.noise(x * 2, y * 2, z * 2, size * 2) * 0.25 + perlin1.noise(x * 4, y * 4, z * 4, size * 4) * 0.125;

					let w = worley3D.noise({ x: x, y: y, z: z }, Worley.EuclideanDistance, size * 1, size * 1, size * 1)[0] * 0.65 +
						worley3D.noise({ x: x * 2, y: (y) * 2, z: (z) * 2 }, Worley.EuclideanDistance, size * 2, size * 2, size * 2)[0] * 0.25 +
						worley3D.noise({ x: x * 4, y: (y) * 4, z: (z) * 4 }, Worley.EuclideanDistance, size * 4, size * 4, size * 4)[0] * 0.125;

					data[i] = 512 * remap(pX, w - 1, 1, 0, 1);
					i++;


				}

			}

		}

		//saveDataToBinFile(data, "perlinWorley.bin");
		const texture = new THREE.Data3DTexture(data, 128, 128, 128);
		texture.format = THREE.RedFormat;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.wrapR = THREE.RepeatWrapping;
		texture.unpackAlignment = 1;
		texture.needsUpdate = true;
		return Promise.resolve(texture);
		//const textureSize = 128; // Replace with the actual size
		/* return fetch(perlinWorleyTexture)
			.then(response => {
				return response.arrayBuffer();
			}).then(arrayBuffer => {
				const data = new Uint8Array(arrayBuffer);
				const texture = new THREE.Data3DTexture(data, 128, 128, 128);
				texture.format = THREE.RedFormat;
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.wrapR = THREE.RepeatWrapping;
				texture.unpackAlignment = 1;
				texture.needsUpdate = true;
				return texture;
			}); */
	},
	generateCloudCoverageTexture: (size) => {

		const perlin1 = new Perlin(456);


		const data = new Uint8Array(size * size * size);
		let i = 0;
		for (let z = 0; z < size; z++) {
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					let w = perlin1.noise(x + 0.5, y + 0.5, z + 0.5, size) * 0.625 + perlin1.noise(x * 2 + 0.5, y * 2 + 0.5, z * 2 + 0.5, size * 2) * 0.25 + perlin1.noise(x * 4 + 0.5, y * 4 + 0.5, z * 4 + 0.5, size * 4) * 0.125;
					//let test = perlin1.noise(Math.random(), Math.random(), Math.random());
					data[i] = Math.min(255, Math.max(0, w * 350));
					i++;

				}

			}

		}

		const texture = new THREE.Data3DTexture(data, size, size, size);
		texture.format = THREE.RedFormat;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.wrapR = THREE.RepeatWrapping;
		texture.unpackAlignment = 1;
		texture.needsUpdate = true;

		return texture;
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