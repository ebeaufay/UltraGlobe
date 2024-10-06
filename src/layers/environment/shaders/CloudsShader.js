import * as THREE from 'three';
import Worley from './Worley';
import Perlin from './Perlin2';
//import perlinWorleyTexture from "./../images/perlinWorley.bin"

let defaultSampleDensityFunction = `
float sampleDensity(vec3 samplePosition, float lod){

	vec3 samplePositionNormalized = normalize(samplePosition);
	vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
	float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
	float height = (length(samplePosition)-localRadius-startRadius) / (endRadius-startRadius);
    float theta = time*windSpeed*0.01;
    vec3 offsetPosition = vec3( samplePosition.x * cos(theta) - samplePosition.y * sin(theta), samplePosition.x * sin(theta) + samplePosition.y * cos(theta), samplePosition.z);
            
    float sm= smoothstep(0.0,0.2,height) * (smoothstep(1.0,0.8,height));
    vec3 offset = vec3((texture(perlinWorley, samplePosition*1e-8).r), texture(perlinWorley, (offsetPosition+vec3(435.6,-875.157,69775.419))*1e-8).r, texture(perlinWorley, (offsetPosition+vec3(75358.1287,42247.563,189963.4772))*1e-8).r);
    float localDensity = pow(max(0.0,texture(perlinWorley, offsetPosition*1e-7+offset*0.8).r-0.4-(1.0-sm)),3.0);
    if(localDensity<=0.0) return -1.0;
    localDensity *= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-5).r-0.4-(1.0-sm)),1.0);
    if(localDensity<=0.0) return -1.0;
    localDensity *= pow(max(0.0,texture(perlinWorley, offsetPosition*1e-4).r-(1.0-sm)),1.0);
    if(localDensity<=0.0) return -1.0;
    localDensity *= 50.0;
    return localDensity;
}`;

function common(densityFunction) {
	const rot1 = Math.random() * 3.1416 * 2;
	const rot2 = Math.random() * 3.1416 * 2;
	const cos1 = Math.cos(rot1).toFixed(5);
	const sin1 = Math.sin(rot1).toFixed(5);

	const cos2 = Math.cos(rot2).toFixed(5);
	const sin2 = Math.sin(rot2).toFixed(5);

	let code = `
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
		float e2 = 0.006694379990; // earth First eccentricity squared

		
		float getEarthRadiusAtLatitude(float latitude){
			float sinLat = sin(latitude);
			float cosLat = cos(latitude);

    		
			return sqrt((pow(40680631590769.0*cosLat,2.0)+pow(40408295989504.0*sinLat,2.0))/(pow(6378137.0*cosLat,2.0)+pow(6356752.0*sinLat,2.0)));
		}

		vec4 blendBackToFront(vec4 back, vec4 front) {
			float alpha = 1.0 - (1.0 - front.a) * (1.0 - back.a); // Combined alpha
			vec3 color;
			if (alpha == 0.0) {
				color = vec3(0.0); // Completely transparent; color is irrelevant
			} else {
				color = (front.rgb * front.a + back.rgb * back.a * (1.0 - front.a)) / alpha;
			}
			return vec4(color, alpha);
		}

		vec2 blendBackToFront(vec2 back, vec2 front) {
			float alpha = 1.0 - (1.0 - front.g) * (1.0 - back.g); // Combined alpha
			float color;
			if (alpha == 0.0) {
				color = 0.0; // Completely transparent; color is irrelevant
			} else {
				color = (front.r * front.g + back.r * back.g * (1.0 - front.g)) / alpha;
			}
			return vec2(color, alpha);
		}

		vec4 blendFrontToBack(vec4 front, vec4 back) {
			float alpha = front.a + back.a * (1.0 - front.a); // Updated alpha
			vec3 color;
			if (alpha == 0.0) {
				color = vec3(0.0); // Completely transparent; color is irrelevant
			} else {
				color = (front.rgb * front.a + back.rgb * back.a * (1.0 - front.a)) / alpha;
			}
			return vec4(color, alpha);
		}

		vec2 blendFrontToBack(vec2 front, vec2 back) {
			float alpha = front.g + back.g * (1.0 - front.g); // Updated alpha
			float color;
			if (alpha == 0.0) {
				color = 0.0; // Completely transparent; color is irrelevant
			} else {
				color = (front.r * front.g + back.r * back.g * (1.0 - front.g)) / alpha;
			}
			return vec2(color, alpha);
		}
		
		// Calculate the ideal number of samples per ray (homogeneous sampling in 3 dimensions)
		float calculateIdealNumberOfSamples(float fov, float resolutionHeight, float nearPlane, float farPlane) {
    		float thetaRadians = radians(fov / 2.0);
    		float tanTheta = tan(thetaRadians);
    		float N = (1.0 / (2.0 * tanTheta)) * log(farPlane / nearPlane);
    		return N * resolutionHeight*2.0;
		}

		// returns Sample distance along ray from near plane
		float samplePositionAlongRay(float nearPlane, float farPlane, float sampleIndex, float totalSamples) {
    		
    		float zRatio = exp((sampleIndex / totalSamples) * log(farPlane / nearPlane));
    		return nearPlane * zRatio - nearPlane;
		}


		float remap(float x, float a, float b, float c, float d)
		{
    		return (((x - a) / (b - a)) * (d - c)) + c;
		}

		`;

	if (densityFunction) {
		code += densityFunction
	} else {
		code += defaultSampleDensityFunction;
	}

	code += `


		
		
		
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
			
			return tValues;
		}

		void rayEllipsoidForwardSurfaceIntersection(
			in vec3 ellipsoidCenter, in vec3 rayOrigin, in vec3 rayDirection,
			in float a, in float b, in float c,
			out vec3 surfaceLocation1, out vec3 surfaceLocation2,
			out bool intersect1, out bool intersect2
		) {
			intersect1 = false;
			intersect2 = false;
		
			// Normalize the ray direction
			vec3 normalizedRayDir = normalize(rayDirection);
		
			// Get the t-values for intersections
			
			vec2 tValues = rayEllipsoidIntersection(ellipsoidCenter, rayOrigin, normalizedRayDir, a, b, c);
		
			// Check if there are any intersections
			if (tValues.x > 0.0) {
				// Calculate the first intersection point if it is in the forward direction of the ray
				surfaceLocation1 = rayOrigin + tValues.x * normalizedRayDir;
				intersect1 = true;
			}
		
			if (tValues.y > 0.0 && tValues.y != tValues.x) {
				// Calculate the second intersection point if it is in the forward direction and not at the same point as the first
				surfaceLocation2 = rayOrigin + tValues.y * normalizedRayDir;
				intersect2 = true;
			}
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
		
		float readDepth( sampler2D depthSampler, vec2 coord ) {
			vec4 fragCoord = texture2D( depthSampler, coord );
			float invViewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
			return viewZToOrthographicDepth( -invViewZ, cameraNear, cameraFar );
		  }

		  float encodeDepth( float depth ) {
			
			float viewZ = orthographicDepthToViewZ( depth, cameraNear, cameraFar );
			return log2(-viewZ + 1.0) * (ldf * 0.5)-1.0;
		}

		
		  float normalizeDepth(float trueDepth) {
			float trueNear = length(nearPlanePosition-nonPostCameraPosition);
			float trueFar = length(farPlanePosition-nonPostCameraPosition);
			return (trueDepth - trueNear)/(trueFar-trueNear);
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

			for(float i = 0.0; i<2.0; i++){
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

		uint wang_hash(uint seed)
					{
							seed = (seed ^ 61u) ^ (seed >> 16u);
							seed *= 9u;
							seed = seed ^ (seed >> 4u);
							seed *= 0x27d4eb2du;
							seed = seed ^ (seed >> 15u);
							return seed;
					}

					float randomFloat(inout uint seed)
					{
							return float(wang_hash(seed)) / 4294967296.;
					}

	`;
	return code;
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

	fragmentShader: (ocean, atmosphere, sunColor, sampleDensityFunction, extraUniforms) => {
		
		//ocean = false;
		let code = /* glsl */`
		precision highp sampler3D;
		precision highp float;
		precision highp int;

		
		layout(location = 1) out vec4 gPosition;

		#include <packing>
		
		varying vec2 vUv;
		uniform sampler2D tDepth;
		uniform sampler3D perlinWorley;
		uniform sampler2D noise2D;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform float radius;
		uniform vec3 planetPosition;
		uniform vec3 nonPostCameraPosition;
		varying vec3 farPlanePosition;
		varying vec3 nearPlanePosition;
		uniform float ldf;
		uniform float time;
		uniform float proportionSamples;
		uniform float yfov;
		uniform float xfov;
		uniform float resolution;
		uniform float quality;

		uniform float densityMultiplier;
		uniform float sunlight;
		
		uniform vec3 color;
		uniform float startRadius;
		uniform float endRadius;
		uniform float windSpeed;


		
		`;

		if (extraUniforms) {
			Object.entries(extraUniforms).forEach(([key, value]) => {
				switch (typeof value) {
					case "number": code += `uniform float ${key};`; break;
					case "boolean": code += `uniform bool ${key};`; break;
					default: {
						if (value.isData3DTexture) {
							code += `uniform sampler3D ${key};`; break;
						}
						else if (value.isDataArrayTexture) {
							code += `uniform sampler2DArray ${key};`; break;
						}
						else if (value.isTexture) {
							code += `uniform sampler2D ${key};`; break;
						} else if (value.isVector2) {
							code += `uniform vec2 ${key};`; break;
						} else if (value.isVector3) {
							code += `uniform vec3 ${key};`; break;
						} else if (value.isVector4) {
							code += `uniform vec4 ${key};`; break;
						} else if (value.isMatrix3) {
							code += `uniform mat3 ${key};`; break;
						}
					}
				}
			});
		}

		code += common(sampleDensityFunction);
		code += `
			
	
		
		void main() {
			gPosition = vec4(1.0,1.0,0.0,0.0);
			float depth = readDepth( tDepth, vUv );
			vec3 worldDir = normalize(farPlanePosition-nonPostCameraPosition);
			float frac = yfov/xfov;
			vec4 random = texture(noise2D, vUv*vec2(1.0,frac)*4.0);
			

			vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
			float lengthToEarthImpact = length(impact-nonPostCameraPosition);
			
			
			vec3 cloudImpactsStartIn = vec3(0.0);
			vec3 cloudImpactsStartOut = vec3(0.0);
			vec3 cloudImpactsEndIn = vec3(0.0);
			vec3 cloudImpactsEndOut = vec3(0.0);
			bool inEndHits;
			bool outEndHits;
			bool inStartHits;
			bool outStartHits;

			float trueEndRadius = max(startRadius+1.0, endRadius);
			
			rayEllipsoidForwardSurfaceIntersection(planetPosition, nonPostCameraPosition, worldDir, a+trueEndRadius, a+trueEndRadius, b+trueEndRadius, cloudImpactsEndIn, cloudImpactsEndOut, inEndHits, outEndHits);
			rayEllipsoidForwardSurfaceIntersection(planetPosition, nonPostCameraPosition, worldDir, a+startRadius, a+startRadius, b+startRadius, cloudImpactsStartIn, cloudImpactsStartOut, inStartHits, outStartHits);
			

			if(!inEndHits  && !outEndHits) {
				pc_fragColor = vec4(vec3(1.0),0.0);
				
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

			float near1 = max(5000.0,length(traverse1Entry-nonPostCameraPosition));
			float far1 = length(traverse1Exit-nonPostCameraPosition);
			float near2 = max(1000.0,length(traverse2Entry-nonPostCameraPosition));
			float far2 = length(traverse2Exit-nonPostCameraPosition);
			if(depth<0.9999){
				if( lengthToEarthImpact < near1) {
					pc_fragColor = vec4(1.0,1.0,1.0,0.0);
					
					return;
				}
				if( lengthToEarthImpact < far1) {
					traverse1Exit = impact;
					far1 = length(traverse1Exit-nonPostCameraPosition);
					secondTraverse = false;
					
				}
				if(secondTraverse && lengthToEarthImpact < near2){
					secondTraverse = false;
					
					
				}
				if(secondTraverse && lengthToEarthImpact < far2){
					traverse2Exit = nonPostCameraPosition;
					far2 = length(traverse2Exit-nonPostCameraPosition);
				}
				
			}
			
			/// First deal with traverse1 (nearer to the camera) and only deal with traverse 2 if opacity is less than 100%
			

				
			
			float density1 = 0.0;
			float density2 = 0.0;
			
			float light1 = 0.0;
			float light2 = 0.0;

			float length1 = far1-near1;
			float biScatteringKappa = 0.75;
			
			float numSamples = max(50.0,min(250.0, calculateIdealNumberOfSamples(yfov, resolution, near1, far1 ) * proportionSamples));
			numSamples+= (random.r-0.5)*40.0;
			

			vec3 surfacePosition = vec3(0,0,0);
			float weightTotal = 0.0;
			for(float i = 0.0; i< numSamples; i++){
				if(density1>=1.0) {
					break;
				}
				float index = i+random.g;
				float distAlongRay = samplePositionAlongRay(near1, far1, index, numSamples);
				float distAlongRayStart = samplePositionAlongRay(near1, far1, i, numSamples);
				float distAlongRayEnd = samplePositionAlongRay(near1, far1, i+1.0, numSamples);
				
				float lod = pow(min(1.0,((distAlongRay+near1) / (10000000.0 * quality*6.0))),0.35)*4.0;
				float fraction = distAlongRay/length1;

				vec3 samplePosition = mix(traverse1Entry,traverse1Exit,fraction);
				vec3 samplePositionNormalized = normalize(samplePosition);

				float localDensity = sampleDensity(samplePosition, lod)*densityMultiplier*0.005;
				if(localDensity<=0.0) continue;
				
				float weightLocal = pow(localDensity,2.0);
				surfacePosition += samplePosition * weightLocal;
				weightTotal+= weightLocal;
				
				density1 += localDensity * (distAlongRay - distAlongRayStart);

				///// compute light to sample
				vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
				float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
				vec3 lightExit = samplePositionNormalized*(trueEndRadius+localRadius);

				float lengthToLight = min(5000.0,length(lightExit-samplePosition));
				lightExit = samplePosition+samplePositionNormalized*lengthToLight;
				float densityToLight = 0.0;
				
				float numSamplesToLightLocal = max(1.0,3.0*(3.0-lod)*localDensity*1000.0);
				float actualNumSamplesToLight = 0.0;
				
				for(float j = 0.0; j<numSamplesToLightLocal; j++){
					actualNumSamplesToLight++;
					float indexLightSample = j+random.b;
					float distAlongRayToLight = mix(0.0, lengthToLight, indexLightSample/numSamplesToLightLocal);
					
					
					float fractionToLight = distAlongRayToLight/lengthToLight;

					
					vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
					
					float localDensityToLight = sampleDensity(secondSamplePosition, lod)*densityMultiplier*15.0;
					if(localDensityToLight<=0.0) continue;
					densityToLight +=localDensityToLight;
					if(densityToLight > 1.0) {
						
						break;
					}
				}
					densityToLight/=actualNumSamplesToLight;
					


				densityToLight*= lengthToLight;
				
				float lightToSample = multiOctaveBeer(sunlight*30.0*(distAlongRayEnd-distAlongRayStart),densityToLight, 0.01, 0.5, biScatteringKappa, dot(samplePositionNormalized, worldDir));
				lightToSample = multiOctaveBeer(lightToSample*localDensity,density1, 0.01, 0.5, biScatteringKappa, 1.0);



				light1 += lightToSample;
				density1 += localDensity * (distAlongRayEnd - distAlongRay);
				


				
			}
			

			
			if(secondTraverse && density1<1.0){
				float length2 = far2-near2;

				float numSamples = max(5.0,min(50.0, calculateIdealNumberOfSamples(yfov, resolution, near2, far2 ) * proportionSamples));
				numSamples+= (random.r-0.5)*10.0;
				for(float i = 0.0; i< numSamples; i++){

					if(density1+density2>=1.0) {
						
						break;
					}


					float index = i+random.g;
					float distAlongRay = samplePositionAlongRay(near2, far2, index, numSamples);
					float distAlongRayStart = samplePositionAlongRay(near2, far2, i, numSamples);
					float distAlongRayEnd = samplePositionAlongRay(near2, far2, i+1.0, numSamples);
				
					
					float lod = pow(min(1.0,((distAlongRay+near2) / (10000000.0 * quality*6.0))),0.35)*4.0;
					float fraction = distAlongRay/length2;

					vec3 samplePosition = mix(traverse2Entry,traverse2Exit,fraction);
					vec3 samplePositionNormalized = normalize(samplePosition);
				

					float localDensity = sampleDensity(samplePosition, lod)*densityMultiplier*0.005;
					if(localDensity<=0.0) continue;
					
					float weightLocal = pow(localDensity,2.0);
					surfacePosition += samplePosition * weightLocal;
					weightTotal+= weightLocal;
					
					density2 += localDensity * (distAlongRay - distAlongRayStart);



					
					///// compute light to sample
					vec2 lonlatSample = vec2(atan(samplePositionNormalized.y, samplePositionNormalized.x),asin(samplePositionNormalized.z));
					float localRadius = getEarthRadiusAtLatitude(lonlatSample.y);
					vec3 lightExit = samplePositionNormalized*(trueEndRadius+localRadius);
	
					float lengthToLight = min(5000.0,length(lightExit-samplePosition));
					lightExit = samplePosition+samplePositionNormalized*lengthToLight;
					float densityToLight = 0.0;
					
					float numSamplesToLightLocal = max(1.0,3.0*(3.0-lod)*localDensity*1000.0);
					float actualNumSamplesToLight = 0.0;
				
					for(float j = 0.0; j<numSamplesToLightLocal; j++){
						actualNumSamplesToLight++;
						float indexLightSample = j+random.b;
						float distAlongRayToLight = mix(0.0, lengthToLight, indexLightSample/numSamplesToLightLocal);
					
					
						float fractionToLight = distAlongRayToLight/lengthToLight;

					
						vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
					
						float localDensityToLight = sampleDensity(secondSamplePosition, lod)*densityMultiplier*15.0;
						if(localDensityToLight<=0.0) continue;
						densityToLight +=localDensityToLight;
						if(densityToLight > 1.0) {
							
							break;
						}
					}
						densityToLight/=actualNumSamplesToLight;
						
					
					densityToLight*= lengthToLight;
				
					float lightToSample = multiOctaveBeer(sunlight*30.0*(distAlongRayEnd-distAlongRayStart),densityToLight, 0.01, 0.5, biScatteringKappa, dot(samplePositionNormalized, worldDir));
					lightToSample = multiOctaveBeer(lightToSample*localDensity,density2, 0.01, 0.5, biScatteringKappa, 1.0);


					light2 += lightToSample;
					density2 += localDensity * (distAlongRayEnd - distAlongRay);

					
					
				}
				
			}

			surfacePosition/= weightTotal;
			density1 = min(1.0, density1);
			density2 = min(1.0, density2);
			light1 = min(1.0, light1);
			light2 = min(1.0, light2);
			if(density1+density2 == 0.0){
				gPosition = vec4(1.0,0.0,0.0,0.0);
				pc_fragColor = vec4(1.0,1.0,1.0,0.0);
				
			}else{
				float depth = length(nonPostCameraPosition-surfacePosition);
				gPosition = vec4(normalizeDepth(depth),0.0,0.0,0.0);
				float dotLight = 1.0;
				
				vec2 blend = blendBackToFront(vec2(light2,density2), vec2(light1,density1));
				/* float lengthThroughAtmosphere = max(0.0,min(1.0,((depth-near1)/400000.0)))*0.25;
				pc_fragColor = vec4(
					mix(
						vec3(mix(0.35, 1.0, blend.x),mix(0.45, 1.0, blend.x),mix(0.65, 1.0, blend.x)),
						vec3(0.2),
						lengthThroughAtmosphere),
					blend.y
				);  */
				pc_fragColor = vec4(
					vec3(mix(0.25, 1.0, blend.x),mix(0.35, 1.0, blend.x),mix(0.55, 1.0, blend.x)),
					blend.y
				); 
				
			}
			
	}`;




		return code;
	},

	fragmentShaderShadows: (ocean, rings, atmosphere, sunColor, densityFunction, extraUniforms) => {
		
		let code = /* glsl */`
		

		precision highp sampler3D;
		precision highp float;
		precision highp int;

		layout(location = 1) out vec4 gPosition;

		#include <packing>
		
			varying vec2 vUv;
			uniform sampler2D tDepth;
			uniform sampler3D perlinWorley;
			uniform sampler2D noise2D;
			uniform sampler2D ringsPalette;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform float radius;
			uniform vec3 planetPosition;
			uniform vec3 nonPostCameraPosition;
			varying vec3 farPlanePosition;
			varying vec3 nearPlanePosition;
			uniform float ldf;
			uniform float time;
			uniform float proportionSamples;
			uniform float numSamplesToLight;
			uniform float xfov;
			uniform float yfov;
			uniform float resolution;
			uniform float quality;

			uniform float densityMultiplier;
			uniform float sunlight;
			uniform vec3 sunLocation;
		
			uniform vec3 color;
			uniform float startRadius;
			uniform float endRadius;
			uniform float windSpeed;


			`;

		if (extraUniforms) {
			Object.entries(extraUniforms).forEach(([key, value]) => {
				switch (typeof value) {
					case "number": code += `uniform float ${key};`; break;
					case "boolean": code += `uniform bool ${key};`; break;
					default: {
						if (value.isData3DTexture) {
							code += `uniform sampler3D ${key};`; break;
						}
						else if (value.isDataArrayTexture) {
							code += `uniform sampler2DArray ${key};`; break;
						}
						else if (value.isTexture) {
							code += `uniform sampler2D ${key};`; break;
						} else if (value.isVector2) {
							code += `uniform vec2 ${key};`; break;
						} else if (value.isVector3) {
							code += `uniform vec3 ${key};`; break;
						} else if (value.isVector4) {
							code += `uniform vec4 ${key};`; break;
						} else if (value.isMatrix3) {
							code += `uniform mat3 ${key};`; break;
						}
					}
				}
			});
		}


		code += common(densityFunction);
		code += `
			
		/**
					   * Ray plane intersection. Returns the position of the intersection or a null vector(0,0,0) when there is no intersection
					   **/
					  vec4 intersectRayPlane(vec3 rayOrigin, vec3 rayDirection, vec3 planeOrigin, vec3 planeNormal) {
						  float denom = dot(planeNormal, rayDirection);
					  
						  // Check if ray is parallel to the plane
						  if (abs(denom) > 1e-6) {
							  vec3 p0l0 = planeOrigin - rayOrigin;
							  float t = dot(p0l0, planeNormal) / denom;
							  if(t>0.0){
								  return vec4(rayOrigin + t * rayDirection, 1.0);
							  }
						  }
					  
						  // Return a 'null' vector if no intersection
						  return vec4(0.0,0.0,0.0,0.0);
					  }
		  
					  
					  float computeRingOpacity(vec3 point, vec3 center, vec3 ringsNormal, float innerRadius, float outerRadius) {
						  float distance = length(point - center);
					  
						  // Check if the point is before the inner radius or outside the outer radius
						  if (distance > outerRadius || distance < innerRadius) {
							  return 0.0; // Fully transparent
						  }
					  
						  // Interpolate between color1 and color2 based on the distance
						  float t = (distance - innerRadius) / (outerRadius - innerRadius);
						  
						  return texture2D(ringsPalette, vec2(t+`+ rings.colorMapDisplace.toFixed(2) + `,` + rings.colorMap.toFixed(2) + `)).w;
					  }
			float computeTerrainShadow(vec3 impact, float trueEndRadius, float startRadius, vec4 random){
					vec3 impactNormalized = normalize(impact);
					float dotSurfaceSun = dot(impactNormalized, sunLocation);
					if(dotSurfaceSun<0.0)return 0.0;
					vec3 lightEnter = impact;
					float innerRadiusIntersectionDistance = rayEllipsoidIntersection(planetPosition, impact, sunLocation, a+startRadius, a+startRadius, b+startRadius).y;
					if(innerRadiusIntersectionDistance > 0.0){
						lightEnter = impact + sunLocation*innerRadiusIntersectionDistance;
					}
					vec3 lightExit = impact + (sunLocation)*rayEllipsoidIntersection(planetPosition, impact, sunLocation, a+trueEndRadius, a+trueEndRadius, b+trueEndRadius).y;

					float lengthToLight = length(lightExit-lightEnter);
					
					float densityToLight = 0.0;
				
					float numSamplesToLightLocal = 10.0;
					
					for(float j = 0.0; j<numSamplesToLightLocal; j++){
						float indexLightSample = j+random.b;
	
						
						vec3 secondSamplePosition = mix(lightEnter,lightExit,indexLightSample/numSamplesToLightLocal);
						
						float localDensityToLight = sampleDensity(secondSamplePosition, 1.0)*densityMultiplier*lengthToLight*0.0008;
						if(localDensityToLight<=0.0) continue;
						densityToLight +=localDensityToLight;
						if(densityToLight > 1.0) {
							densityToLight = 1.0;
							break;
						}
					}
					float shadowClouds = densityToLight*0.6*dotSurfaceSun;
					`;
						if (!!rings) {
							code += `
								vec3 ringsOrigin = vec3(`+ rings.origin.x.toFixed(6) + `,` + rings.origin.y.toFixed(6) + `,` + rings.origin.z.toFixed(6) + `);
								vec3 ringsNormal = vec3(`+ rings.normal.x.toFixed(6) + `,` + rings.normal.y.toFixed(6) + `,` + rings.normal.z.toFixed(6) + `);
								vec4 ringIntersection = intersectRayPlane(impact, sunLocation, ringsOrigin, ringsNormal);
								if(ringIntersection.w == 1.0){
									float innerRadius = `+ rings.innerRadius.toFixed(6) + `;
									float outerRadius = `+ rings.outerRadius.toFixed(6) + `;
									float ringOpacity =computeRingOpacity(ringIntersection.xyz, ringsOrigin, ringsNormal, innerRadius,outerRadius);
									densityToLight+=ringOpacity;
								}

							`;
						}
						code+=`
				return min(1.0,densityToLight)*0.6*dotSurfaceSun;
			}
			void main() {
				gPosition = vec4(1.0,1.0,0.0,0.0);
				float depth = readDepth( tDepth, vUv );
				vec3 worldDir = normalize(farPlanePosition-nonPostCameraPosition);
				float frac = yfov/xfov;
				vec4 random = texture(noise2D, vUv*vec2(1.0,frac)*4.0);
				
	
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float lengthToEarthImpact = length(impact-nonPostCameraPosition);
				
				
				vec3 cloudImpactsStartIn = vec3(0.0);
				vec3 cloudImpactsStartOut = vec3(0.0);
				vec3 cloudImpactsEndIn = vec3(0.0);
				vec3 cloudImpactsEndOut = vec3(0.0);
				bool inEndHits;
				bool outEndHits;
				bool inStartHits;
				bool outStartHits;

				float trueEndRadius = max(startRadius+1.0, endRadius);
			
				rayEllipsoidForwardSurfaceIntersection(planetPosition, nonPostCameraPosition, worldDir, a+trueEndRadius, a+trueEndRadius, b+trueEndRadius, cloudImpactsEndIn, cloudImpactsEndOut, inEndHits, outEndHits);
				rayEllipsoidForwardSurfaceIntersection(planetPosition, nonPostCameraPosition, worldDir, a+startRadius, a+startRadius, b+startRadius, cloudImpactsStartIn, cloudImpactsStartOut, inStartHits, outStartHits);
			

				
				if(!inEndHits  && !outEndHits) {
					pc_fragColor = vec4(vec3(dot(sunLocation, worldDir)),0.0);
					
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
			vec2 rayEllipsoid = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, worldDir, a, a, b);
					float hasImpact = step(0.0, rayEllipsoid.x); // returns 1 if rayEllipsoid.x >= 0.0, else 0
					float impactDistance = rayEllipsoid.x>0.0?rayEllipsoid.x:rayEllipsoid.y>0.0?rayEllipsoid.y:-1.0;
					if(lengthToEarthImpact>impactDistance && impactDistance>0.0){
						lengthToEarthImpact = impactDistance;
						impact = nonPostCameraPosition+lengthToEarthImpact*worldDir;
					}
				if(depth>0.9999){
					
					
					depth = mix(depth, 0.5, hasImpact);
				}
				`;
		}

		code += `

			float near1 = max(5000.0,length(traverse1Entry-nonPostCameraPosition));
			float far1 = length(traverse1Exit-nonPostCameraPosition);
			float near2 = max(1000.0,length(traverse2Entry-nonPostCameraPosition));
			float far2 = length(traverse2Exit-nonPostCameraPosition);
			if(depth<0.9999){
				if( lengthToEarthImpact < near1) {
					//pc_fragColor = vec4(vec3(dot(sunLocation, normalize(impact))),0.0);
					pc_fragColor = vec4(0.0,0.0,0.0, computeTerrainShadow(impact, trueEndRadius, startRadius, random));
					
					return;
				}
				if( lengthToEarthImpact < far1) {
					traverse1Exit = impact;
					far1 = length(traverse1Exit-nonPostCameraPosition);
					secondTraverse = false;
				
				}
				if(secondTraverse && lengthToEarthImpact < near2){
					secondTraverse = false;
				
				
				}
				if(secondTraverse && lengthToEarthImpact < far2){
					traverse2Exit = nonPostCameraPosition;
					far2 = length(traverse2Exit-nonPostCameraPosition);
				}
			
			}

			

				/// First deal with traverse1 (nearer to the camera) and only deal with traverse 2 if opacity is less than 100%
				
			
			
				float density1 = 0.0;
				float density2 = 0.0;
			
				vec3 light1 = vec3(0.0);
				vec3 light2 = vec3(0.0);

				float length1 = far1-near1;
				float biScatteringKappa = 0.75;
				float numSamples = max(50.0,min(250.0, calculateIdealNumberOfSamples(yfov, resolution, near1, far1 ) * proportionSamples));
				numSamples+= (random.r-0.5)*40.0;
				
				vec3 surfacePosition = vec3(0,0,0);
				float weightTotal = 0.0;
				for(float i = 0.0; i< numSamples; i++){
					if(density1>=1.0) {
						
						break;
					}
					float index = i+random.g;
					float distAlongRay = samplePositionAlongRay(near1, far1, index, numSamples);
					float distAlongRayStart = samplePositionAlongRay(near1, far1, i, numSamples);
					float distAlongRayEnd = samplePositionAlongRay(near1, far1, i+1.0, numSamples);
				
					float lod = pow(min(1.0,((distAlongRay+near1) / (10000000.0 * quality*6.0))),0.35)*4.0;
					float fraction = distAlongRay/length1;

					vec3 samplePosition = mix(traverse1Entry,traverse1Exit,fraction);
					vec3 samplePositionNormalized = normalize(samplePosition);

					float localDensity = sampleDensity(samplePosition, lod)*densityMultiplier*0.005;
					if(localDensity<=0.0) continue;
					
					float weightLocal = pow(localDensity,2.0);
					surfacePosition += samplePosition * weightLocal;
					weightTotal+= weightLocal;
				
					density1 += localDensity * (distAlongRay - distAlongRayStart);

					
					

					///// compute light to sample
					float dotLight = dot(sunLocation, samplePositionNormalized);
					//if(rayEllipsoidIntersection(planetPosition, samplePosition, sunLocation,a,a,b).x>=0.0) continue;
					vec3 lightExit = samplePosition + (sunLocation)*rayEllipsoidIntersection(planetPosition, samplePosition, sunLocation, a+trueEndRadius, a+trueEndRadius, b+trueEndRadius).y;

					float lengthToLight = min(5000.0,length(lightExit-samplePosition));
					lightExit = samplePosition+samplePositionNormalized*lengthToLight;
					float densityToLight = 0.0;
				
					float numSamplesToLightLocal = max(1.0,3.0*(3.0-lod)*localDensity*1000.0);
					float actualNumSamplesToLight = 0.0;

					for(float j = 0.0; j<numSamplesToLightLocal; j++){
						actualNumSamplesToLight++;
						float indexLightSample = j+random.b;
						float distAlongRayToLight = mix(0.0, lengthToLight, indexLightSample/numSamplesToLightLocal);
						
						
						float fractionToLight = distAlongRayToLight/lengthToLight;
	
						
						vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
						
						float localDensityToLight = sampleDensity(secondSamplePosition, lod)*densityMultiplier*15.0;
						if(localDensityToLight<=0.0) continue;
						densityToLight +=localDensityToLight;
						if(densityToLight > 1.0) {
							
							break;
						}
					}
					densityToLight/=actualNumSamplesToLight;
						
					float sunStrengthMultiplier = 10.0;
					`;
					if (!!rings) {
						code += `
							vec3 ringsOrigin = vec3(`+ rings.origin.x.toFixed(6) + `,` + rings.origin.y.toFixed(6) + `,` + rings.origin.z.toFixed(6) + `);
							vec3 ringsNormal = vec3(`+ rings.normal.x.toFixed(6) + `,` + rings.normal.y.toFixed(6) + `,` + rings.normal.z.toFixed(6) + `);
							vec4 ringIntersection = intersectRayPlane(samplePosition, sunLocation, ringsOrigin, ringsNormal);
							if(ringIntersection.w == 1.0){
								float innerRadius = `+ rings.innerRadius.toFixed(6) + `;
								float outerRadius = `+ rings.outerRadius.toFixed(6) + `;
								float ringOpacity =computeRingOpacity(ringIntersection.xyz, ringsOrigin, ringsNormal, innerRadius,outerRadius);
								sunStrengthMultiplier*=1.0-ringOpacity;
							}
							
						`;
					}
					code+=`
					
					densityToLight*= lengthToLight;
				
					float lightToSample = multiOctaveBeer(sunlight*sunStrengthMultiplier*(distAlongRayEnd-distAlongRayStart),densityToLight, 0.01, 0.75, biScatteringKappa, dot(sunLocation, worldDir));
					lightToSample = multiOctaveBeer(lightToSample*localDensity,density1, 0.01, 0.75, biScatteringKappa, 1.0);



					light1 += vec3(pow(color.x,0.5)*lightToSample*max(dotLight,0.0), pow(color.y,0.5)*lightToSample*pow(max(dotLight,0.0),1.2),pow(color.z,0.5)*lightToSample*pow(max(dotLight,0.0),1.4));
					density1 += localDensity * (distAlongRayEnd - distAlongRay);

					
				}
				
				if(secondTraverse && density1<1.0){

					
					float length2 = far2-near2;
					float numSamples = max(5.0,min(50.0, calculateIdealNumberOfSamples(yfov, resolution, near2, far2 ) * proportionSamples));
					numSamples+= (random.r-0.5)*10.0;
					
					for(float i = 0.0; i< numSamples; i++){

						if(density1+density2>=1.0) {
							
							break;
						}
						float index = i+random.g;
						float distAlongRay = samplePositionAlongRay(near2, far2, index, numSamples);
						float distAlongRayStart = samplePositionAlongRay(near2, far2, i, numSamples);
						float distAlongRayEnd = samplePositionAlongRay(near2, far2, i+1.0, numSamples);
				
					
						float lod = pow(min(1.0,((distAlongRay+near2) / (10000000.0 * quality*6.0))),0.35)*4.0;
						float fraction = distAlongRay/length2;

						vec3 samplePosition = mix(traverse2Entry,traverse2Exit,fraction);
						vec3 samplePositionNormalized = normalize(samplePosition);
				

						float localDensity = sampleDensity(samplePosition, lod)*densityMultiplier*0.005;
						if(localDensity<=0.0) continue;
						
						float weightLocal = pow(localDensity,2.0);
						surfacePosition += samplePosition * weightLocal;
						weightTotal+= weightLocal;
					
						density2 += localDensity * (distAlongRay - distAlongRayStart);




						///// compute light to sample
						float dotLight = dot(sunLocation, samplePositionNormalized);
						if(rayEllipsoidIntersection(planetPosition, samplePosition, sunLocation, a, a, b).x>=0.0) continue;
						vec3 lightExit = samplePosition + (sunLocation)*rayEllipsoidIntersection(planetPosition, samplePosition, sunLocation, a+trueEndRadius, a+trueEndRadius, b+trueEndRadius).y;

						float lengthToLight = min(5000.0,length(lightExit-samplePosition));
						lightExit = samplePosition+samplePositionNormalized*lengthToLight;
						float densityToLight = 0.0;
					
						float numSamplesToLightLocal = max(1.0,3.0*(3.0-lod)*localDensity*1000.0);
						float actualNumSamplesToLight = 0.0;
						for(float j = 0.0; j<numSamplesToLightLocal; j++){
							actualNumSamplesToLight++;
							float indexLightSample = j+random.b;
							float distAlongRayToLight = mix(0.0, lengthToLight, indexLightSample/numSamplesToLightLocal);
						
						
							float fractionToLight = distAlongRayToLight/lengthToLight;
	
						
							vec3 secondSamplePosition = mix(samplePosition,lightExit,fractionToLight);
						
							float localDensityToLight = sampleDensity(secondSamplePosition, lod)*densityMultiplier*15.0;
							if(localDensityToLight<=0.0) continue;
							densityToLight +=localDensityToLight;
							if(densityToLight > 1.0) {
								
								break;
							}
						}
							densityToLight/=actualNumSamplesToLight;
							
						float sunStrengthMultiplier = 10.0;
						`;
						if (!!rings) {
							code += `
								vec3 ringsOrigin = vec3(`+ rings.origin.x.toFixed(6) + `,` + rings.origin.y.toFixed(6) + `,` + rings.origin.z.toFixed(6) + `);
								vec3 ringsNormal = vec3(`+ rings.normal.x.toFixed(6) + `,` + rings.normal.y.toFixed(6) + `,` + rings.normal.z.toFixed(6) + `);
								vec4 ringIntersection = intersectRayPlane(samplePosition, sunLocation, ringsOrigin, ringsNormal);
								if(ringIntersection.w == 1.0){
									float innerRadius = `+ rings.innerRadius.toFixed(6) + `;
									float outerRadius = `+ rings.outerRadius.toFixed(6) + `;
									float ringOpacity =computeRingOpacity(ringIntersection.xyz, ringsOrigin, ringsNormal, innerRadius,outerRadius);
									sunStrengthMultiplier*=1.0-ringOpacity;
								}

							`;
						}
						code+=`

						densityToLight*= lengthToLight;
				
						float lightToSample = multiOctaveBeer(sunlight*sunStrengthMultiplier*(distAlongRayEnd-distAlongRayStart),densityToLight, 0.01, 0.75, biScatteringKappa, dot(sunLocation, worldDir));
						lightToSample = multiOctaveBeer(lightToSample*localDensity,density2, 0.01, 0.75, biScatteringKappa, 1.0);

						light2 += vec3(pow(color.x,0.5)*lightToSample*max(dotLight,0.0), pow(color.y,0.5)*lightToSample*pow(max(dotLight,0.0),1.2),pow(color.z,0.5)*lightToSample*pow(max(dotLight,0.0),1.4));
						density2 += localDensity * (distAlongRayEnd - distAlongRay);


						

					}
				}

				surfacePosition/= weightTotal;

				density1 = min(1.0, density1);
				density2 = min(1.0, density2);
				
				
				
				


				if(density1+density2 == 0.0){
					gPosition = vec4(1.0,0.0,0.0,0.0);
					pc_fragColor = vec4(vec3(dot(sunLocation, normalize(impact))),0.0);
					
					
				}else{
					float depth = length(nonPostCameraPosition-surfacePosition);
					gPosition = vec4(normalizeDepth(depth),0.0,0.0,0.0);
					float dotLight = clamp(dot(sunLocation, normalize(traverse1Entry+traverse1Exit))+0.5,0.0,1.0);
					vec3 fullDarkColor = vec3(max(0.0,dotLight)*0.25+0.05);
					vec3 fullLightColor = vec3(1.0);

					//pc_fragColor = vec4(light1*0.5, density1);
					pc_fragColor = blendBackToFront(vec4(light2, density2), vec4(light1, density1));
					pc_fragColor = vec4(fullDarkColor + pc_fragColor.rgb * (vec3(2.0) - fullDarkColor) / vec3(1.0),min(1.0,density1+density2));
					
				}

				if(density1+density2<1.0 && depth<0.99){
					pc_fragColor = blendBackToFront(vec4(0.0,0.0,0.0, computeTerrainShadow(impact, trueEndRadius, startRadius, random)), pc_fragColor);
				}

		}`;




		return code;
	},
	loadPerlinWorley: (url) => {
		return fetch(url)
			.then(response => response.arrayBuffer())
			.then(buffer => {
				const data = new Uint8Array(buffer);
				const texture = new THREE.Data3DTexture(data, 128, 128, 128);
				texture.format = THREE.RGFormat;
				texture.type = THREE.UnsignedByteType;
				texture.minFilter = THREE.LinearMipmapLinearFilter;
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
		const dataFloatW = new Float32Array(size * size * size);
		const dataFloatP = new Float32Array(size * size * size);
		const data = new Uint8Array(size * size * size * 2);
		let i = 0;
		const vector = new THREE.Vector3();

		let minW = 10000;
		let maxW = -10000;
		let minP = 10000;
		let maxP = -10000;
		for (let z = 0; z < size; z++) {

			for (let y = 0; y < size; y++) {

				for (let x = 0; x < size; x++) {


					vector.set(x, y, z).divideScalar(size);
					let F = 10;
					let perlinFBM = perlin.noise((x / size) * F, (y / size) * F, (z / size) * F, F) * 0.65
						+ perlin.noise((x / size) * F * 2, (y / size) * F * 2, (z / size) * F * 2, F * 2) * 0.25
						+ perlin.noise((x / size) * F * 4, (y / size) * F * 4, (z / size) * F * 4, F * 4) * 0.1;
					perlinFBM += 0.5;
					//perlinFBM = Math.abs(perlinFBM * 2 - 1);



					let worleyFBM4 = 1 - (worley3D.noise({ x: (x / size) * F, y: (y / size) * F, z: (z / size) * F }, Worley.EuclideanDistance, F, F, F)[0] * 0.65 +
						worley3D.noise({ x: (x / size) * F * 2, y: (y / size) * F * 2, z: (z / size) * F * 2 }, Worley.EuclideanDistance, F * 2, F * 2, F * 2)[0] * 0.25 +
						worley3D.noise({ x: (x / size) * F * 4, y: (y / size) * F * 4, z: (z / size) * F * 4 }, Worley.EuclideanDistance, F * 4, F * 4, F * 4)[0] * 0.1);

					//let perlinWorley = remap(perlinFBM, 0, 1, worleyFBM4, 1);


					if (worleyFBM4 < minW) minW = worleyFBM4;
					if (worleyFBM4 > maxW) maxW = worleyFBM4;

					dataFloatW[i] = worleyFBM4;

					if (perlinFBM < minP) minP = perlinFBM;
					if (perlinFBM > maxP) maxP = perlinFBM;

					dataFloatP[i++] = perlinFBM;

				}

			}

		}


		for (let i = 0; i < size * size * size; i++) {
			const perlinNorm = ((dataFloatP[i] / (maxP - minP)) - minP);
			const worleyNorm = ((dataFloatW[i] / (maxP - minP)) - minP);
			data[i * 2] = remap(perlinNorm, 0, 1, worleyNorm, 1) * 256;
			data[i * 2 + 1] = worleyNorm * 256;
		}

		saveDataToBinFile(data, "test.bin")

		const texture = new THREE.Data3DTexture(data, size, size, size);
		texture.format = THREE.RGFormat;
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


					if (perlinFBM < min) min = perlinFBM;
					if (perlinFBM > max) max = perlinFBM;

					//clouds = 1 - (clouds * 2 - 1);
					//const cloud = Math.max(0.0, Math.min(1.0, remap(perlinFBM, clouds - 1, 1, 0, 1) + 0.5));
					dataFloat[i++] = perlinFBM;//(Math.pow(clouds,0.5)/2+0.5) * 256;

				}

			}

		}


		for (let i = 0; i < size * size * size; i++) {
			data[i] = ((dataFloat[i] / (max - min)) - min) * 256;
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

