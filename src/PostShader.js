// @ts-nocheck
/**
 * Shader for planet tiles
 */
import * as THREE from 'three';
import { Planet } from './planet/Planet';

const PostShader = {

	vertexShader: () =>/* glsl */`
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

		gl_Position = vec4(position, 1.0);
	}`,

	fragmentShader: (atmosphere, ocean, rings, space, clouds) => {
		//ocean = false;
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1, 0.2, 0.7);
		}
		if (!!atmosphere && !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1, 0.4, 1.0);
		}
		let atmosphereHighlight
		if (!!atmosphere) {

			atmosphereHighlight = new THREE.Vector3(Math.sqrt(atmosphere.x), Math.sqrt(atmosphere.y), Math.sqrt(atmosphere.z));
		}

		let code = /* glsl */`
		precision highp float;
		precision highp int;

		#include <packing>
		#include <common>
		#include <logdepthbuf_pars_fragment>
			varying vec2 vUv;
			uniform sampler2D tDiffuse;
			uniform sampler2D tDepth;
			uniform sampler2D opticalDepth;
			uniform sampler2D ringsPalette;
			uniform sampler2D starsTexture;
			uniform sampler2D nebulaTexture;
			uniform sampler2D nebulaPalette;
			uniform sampler2D perlin;
			uniform sampler2D tClouds;
			uniform sampler2D tCloudsDepth;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform float radius;
			uniform float xfov;
			uniform float yfov;
			uniform float heightAboveSeaLevel;
			uniform vec3 planetPosition;
			uniform vec3 nonPostCameraPosition;
			uniform vec3 viewCenter;
			uniform vec3 up;
			uniform vec3 right;
			varying vec3 farPlanePosition;
			varying vec3 nearPlanePosition;
			uniform float ldf;
			uniform mat4 projMatrixInv;
			uniform mat4 viewMatrixInv;
			uniform float time;
			uniform bool mobile;
			uniform float atmosphereDensity;
			float atmosphereRadius = 1.1;
			`;
		if (space) {
			const cos1 = Math.cos(space.texRotation1).toFixed(5);
			const sin1 = Math.sin(space.texRotation1).toFixed(5);

			const cos2 = Math.cos(space.texRotation2).toFixed(5);
			const sin2 = Math.sin(space.texRotation2).toFixed(5);
			code += `
				mat2 texRotation1 = mat2(
                    `+ cos1 + `, ` + (-sin1) + `,
                    `+ sin1 + `, ` + cos1 + `
                );
            
            mat2 texRotation2 = mat2(
                    `+ cos2 + `, ` + (-sin2) + `,
                    `+ sin2 + `, ` + cos2 + `
                );
			`;
		}
		code += `
			float a = 6378137.0;
			float e2 = (1.0 / 298.257223563)*2.0;
			float f = 1.0 / 298.257223563; // flattening
			float b = 6356752.3142451794975639665996337;
			`;
		if (!!rings) {
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

			vec4 computeRingColor(vec3 point, vec3 center, float innerRadius, float outerRadius) {
				float distance = length(point - center);
			
				// Check if the point is before the inner radius or outside the outer radius
				if (distance > outerRadius || distance < innerRadius) {
					return vec4(0.0, 0.0, 0.0, 0.0); // Fully transparent
				}
			
				// Interpolate between color1 and color2 based on the distance
				float t = (distance - innerRadius) / (outerRadius - innerRadius);
				
				return texture2D(ringsPalette, vec2(t+`+ rings.colorMapDisplace.toFixed(2) + `,` + rings.colorMap.toFixed(2) + `)); // Fully opaque interpolated color
			}
		`
		}
		if (space) {
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
			// for stars there's no seams so we can simplify things a bit
			float pickFromTextureStars(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
                
                vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
                uv = matrix*uv*frequency;
                float a1 = texture2D(sampler , uv.xy ).x;
                
                vec2 lonLatRotated = rotate90(lonLat);

                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float b = texture2D(sampler , uv.xy ).x;
				float c = cos(lonLat.y);
				return a1*c+b*(1.0-c);
                
                /* lonLatRotated = rotate90(rotate90(lonLatRotated));
                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float a2 = texture2D(sampler , uv.xy ).x;
                float grad = cos(lonLat.x)*0.5+0.5;
                float a = grad*a1+(1.0-grad)*a2;
                
                float c = cos(lonLat.y);
                c = c*c;
                
                return a*c+b*(1.0-c); */
            }
			`;

		}


		code += `		
			/**
			 * Returns the intersection distances of a ray and a sphere (2 values)
			 **/
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
			/* vec3 transformCartesianToWGS84(float x, float y, float z) {
				float b = (1.0 - f) * a;
			
				float e2Prim = (a * a - b * b) / (b * b);
				float p = sqrt(x * x + y * y);
				float th = atan2(a * z, b * p);
				float lon = atan2(y, x);
				float lat = atan2((z + e2Prim * b * pow(sin(th), 3.0)),
								(p - e2 * a * pow(cos(th), 3.0)));
			
				float N = a / sqrt(1.0 - e2 * sin(lat) * sin(lat));
				float h = p / cos(lat) - N;
			
				return vec3(lon, lat, h);
			} */
			float heightAboveEllipsoid(vec3 xyz) {
				float b = (1.0 - f) * a;
			
				float e2Prim = (a * a - b * b) / (b * b);
				float x = xyz.x;
				float y = xyz.y;
				float z = xyz.z;
				float p = sqrt(x * x + y * y);
				float th = atan(a * z, b * p);
				float lat = atan((z + e2Prim * b * pow(sin(th), 3.0)),
								(p - e2 * a * pow(cos(th), 3.0)));
			
				float N = a / sqrt(1.0 - e2 * sin(lat) * sin(lat));
				float h = p / cos(lat) - N;
			
				return h;
			}
			float readDepth( sampler2D depthSampler, vec2 coord ) {
				vec4 fragCoord = texture2D( depthSampler, coord );
				float viewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
				return viewZToOrthographicDepth( -viewZ, cameraNear, cameraFar );
			  }


			  float cameraToCloudAtmosphereMieFactor(in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection, in float cloudDepth){

				float distToCloud = mix(cameraNear, cameraFar, cloudDepth);
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				vec3 impact = rayOrigin + rayDirection * distToCloud;
				float atmosphereCameraHeight = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(atmosphereCameraHeight<=1.0){ //inside atmosphere
					return (1.0-exp(-length(impact-rayOrigin)*0.00000025*atmosphereDensity));
				}else{ //outsideAtmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					
					if(intersection.x > 0.0){
						float atmosphereImpactDistance = intersection.x;
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						return (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
					}else return 0.0;
				}
			}

			float getOpticalDepth(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth, in vec3 impact,
				out float atmosphereImpactDistance,
				out float mieCoefficient
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){// camera inside atmosphere
					atmosphereImpactDistance = 0.0;
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					
					//return opticalDepthX;
					//return opticalDepthX;
					if(depth<0.999){ // ray touches earth
						float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
						//return impactOpticalDepthY;
						mieCoefficient = (1.0-exp(-length(impact-rayOrigin)*0.00000025*atmosphereDensity));
						return (1.0-exp(-length(impact-rayOrigin)*0.0000007*atmosphereDensity));
					}else{ // ray to space
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						mieCoefficient = (1.0-exp(-length(rayExitOnAtmosphereSurface-rayOrigin)*0.00000025*atmosphereDensity));
						return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x*atmosphereDensity;
					}
					
				}
				else{ //camera outside atmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					if(intersection.x > 0.0){
						atmosphereImpactDistance = intersection.x;
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						opticalDepthY = 1.0;
						sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
						float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
						
						if(depth<0.999){ //ray touches earth
							float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
							mieCoefficient = (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
							return (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.0000007*atmosphereDensity));
						}else{//ray enters atmosphere and exits to space 
							vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
							mieCoefficient = (1.0-exp(-length(rayExitOnAtmosphereSurface-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
							return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x*atmosphereDensity;
						}
					}else{ // ray stays in space
						return 0.0;
					}
				}
				

			}

			float oceanVolume(vec3 rayDirection, vec3 impact){
				float waterVolume = 0.0;
				vec2 intersection = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, rayDirection, a, a, b);
				/* if(intersection.x>=0.0) {
					vec3 sImpact = nonPostCameraPosition + rayDirection * intersection.x;
					if(length(sImpact)>length(impact)){
						return 100000.0;
					}
				} */
				
				if(intersection.x <0.0 && intersection.y<0.0){
					// ray outside ocean
					return 0.0;
				}else{
					float cameraDepth = -heightAboveEllipsoid(nonPostCameraPosition);
					float depthNonLinearized = texture2D( tDepth, vUv ).x;
					if(depthNonLinearized<1.0){ // hit on planet surface
						
						vec3 surfaceImpact = nonPostCameraPosition + rayDirection * intersection.x;
						vec3 surfaceExit = nonPostCameraPosition + rayDirection * intersection.y;
						
						
						if(cameraDepth>0.0){ //camera in ocean
							waterVolume = min(length(impact - nonPostCameraPosition), length(surfaceExit - nonPostCameraPosition));
						}else{ // camera outside ocean
							if(length(surfaceImpact - nonPostCameraPosition)<length(impact - nonPostCameraPosition)){
								
								waterVolume = min(length(surfaceExit - surfaceImpact), length(impact - surfaceImpact));
							}else {
								return 0.0;
							}
						}
					}else{ // ocean through and through
						if(cameraDepth>0.0){ //camera in ocean
							waterVolume = intersection.y;
						}else{
							waterVolume = intersection.y - intersection.x;
						}
					}

				}
				return waterVolume;
			}
			
			vec3 rayToFragment(){
				
    			vec2 screenSpace = vUv.xy * 2.0 - 1.0;

    			vec4 rayCameraSpace = projMatrixInv * vec4(screenSpace, -1.0, 1.0);
				//rayCameraSpace /= rayCameraSpace.w;
				rayCameraSpace.w = 0.0;
				return normalize((viewMatrixInv *rayCameraSpace).xyz);
    			
			}
			
			
			void main() {
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				vec3 worldDir = normalize(farPlanePosition-nonPostCameraPosition);
				float cameraHeightAboveEllipsoid = heightAboveEllipsoid(nonPostCameraPosition);
				`;
		if (space) {
			code += `
					if(depth >= 0.999){
						vec2 lonlat = vec2(atan(worldDir.y, worldDir.x),asin(worldDir.z));
						//diffuse.rgb = vec3((lonlat.y/3.1416)+0.5);
						// stars
						float starsIntensity = pickFromTextureStars(starsTexture, lonlat,texRotation1, 15.0)*0.5;
						starsIntensity += pickFromTextureStars(starsTexture, lonlat,texRotation2, 10.0)*0.5;
						starsIntensity *= 2.0*`+ space.starsIntensity.toFixed(5) + `;

						float nebulaIntensity1 = pickFromTextureX(nebulaTexture, lonlat,texRotation1, 5.0);
						float nebulaIntensity2 = pickFromTextureX(nebulaTexture, lonlat,texRotation2, 4.0);
						float perlin1= pickFromTextureX(perlin, lonlat,texRotation2, 2.0);
						float perlin2= pickFromTextureX(perlin, lonlat,texRotation1, 1.5);
						float perlin3= pickFromTextureX(perlin, lonlat,texRotation1, 4.5);
						nebulaIntensity1*= pow(nebulaIntensity1,0.1);
						nebulaIntensity2*= pow(nebulaIntensity1,0.1);
						nebulaIntensity1*=perlin1*`+ space.gasCloudsIntensity.toFixed(5) + `;
						nebulaIntensity2*=perlin1*`+ space.gasCloudsIntensity.toFixed(5) + `;
						vec3 nebulaColor1 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2,`+ space.colorMap.toFixed(5) + `)).xyz * nebulaIntensity2;
						vec3 nebulaColor2 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2+0.5,`+ space.colorMap.toFixed(5) + `)).xyz * nebulaIntensity1;
						diffuse.rgb = mix(nebulaColor1,nebulaColor2,perlin2)+vec3(starsIntensity*(0.5+0.5*perlin1*perlin3));
					}
					`;
		}
		code += `
				

				
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float atmosphereImpactDistance = -1.0;
				`;
		if (!!atmosphere) {
			code += `
					float mieCoefficient = 0.0;
					float atmosphereThickness = pow(getOpticalDepth(planetPosition, nonPostCameraPosition, worldDir, depth, impact, atmosphereImpactDistance, mieCoefficient),2.0);
					mieCoefficient *= atmosphereThickness;
					vec3 atmosphereColorBeforeMie = mix(vec3(`+ atmosphere.x.toFixed(3) + `,` + atmosphere.y.toFixed(3) + `,` + atmosphere.z.toFixed(3) + `), vec3(` + atmosphereHighlight.x.toFixed(3) + `,` + atmosphereHighlight.y.toFixed(3) + `,` + atmosphereHighlight.z.toFixed(3) + `), atmosphereThickness);
					vec3 atmosphereColor = mix(atmosphereColorBeforeMie, vec3(1.0,1.0,1.0), mieCoefficient);
					
					diffuse = mix(diffuse,atmosphereColor,atmosphereThickness);
	
					`;
		} else {
			code += `
					float atmosphereThickness = 0.0;
				
					vec3 atmosphereColor = vec3(0.0);
				
					diffuse = mix(diffuse,atmosphereColor,atmosphereThickness);

				`;
		}



		if (clouds) {
			code += `
							
							vec4 cl = texture2D(tClouds, vUv);

							float cloudDepth = texture2D(tCloudsDepth, vUv).x;
							if(cl.w > 0.0){
								float cloudsMieFactor = cameraToCloudAtmosphereMieFactor(planetPosition, nonPostCameraPosition, worldDir, cloudDepth);
								cloudsMieFactor = min(1.0, pow(cloudsMieFactor,0.5));
								
								`
			if (!!atmosphere) {
				code += `vec3 atmosphereColorCloud = mix(vec3(` + atmosphere.x.toFixed(3) + `,` + atmosphere.y.toFixed(3) + `,` + atmosphere.z.toFixed(3) + `), vec3(1.0,1.0,1.0), cloudsMieFactor);`;
			} else {
				code += `vec3 atmosphereColorCloud = vec3(1.0);`;
			}
			code +=
				`
								
								
								cl.xyz = mix(cl.xyz,atmosphereColorCloud, cloudsMieFactor);
							}

							if(cameraHeightAboveEllipsoid<0.0){
								diffuse = mix(diffuse, cl.xyz, cl.w);
							}
							`;
		}

		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			code += `
					float waterVolume = oceanVolume(worldDir, impact);
					vec3 waterColor = vec3(` + ocean.x.toFixed(3) + `,` + ocean.y.toFixed(3) + `,` + ocean.z.toFixed(3) + `);
					//vec3 waterColor = mix(vec3(`+ shallowOcean.x.toFixed(3) + `,` + shallowOcean.y.toFixed(3) + `,` + shallowOcean.z.toFixed(3) + `), vec3(` + ocean.x.toFixed(3) + `,` + ocean.y.toFixed(3) + `,` + ocean.z.toFixed(3) + `), min(1.0,max(0.0,waterVolume/100.0)));
					waterColor = mix(waterColor, atmosphereColor, atmosphereThickness*0.5);
					float showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-2000000.0)/5000000.0));
					if(mobile){
						showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-100000.0)/300000.0));
					}
					float waterOpacity = min(0.7,max(0.0,waterVolume/2000.0));
					diffuse.rgb = mix(diffuse,waterColor,mix(0.0,waterOpacity,showWater));
					float impactDepth = -heightAboveEllipsoid(impact);
					diffuse.rgb = mix(diffuse,vec3(waterColor)*0.5,max(0.0,min(1.0,impactDepth*0.0004)));
					`;
		}
		if (clouds) {
			code += `
			if(cameraHeightAboveEllipsoid>=0.0){
				diffuse = mix(diffuse, cl.xyz, cl.w);
			}
			`;
		}

		if (!!rings) {
			code += `
				vec3 ringsOrigin = vec3(`+ rings.origin.x.toFixed(6) + `,` + rings.origin.y.toFixed(6) + `,` + rings.origin.z.toFixed(6) + `);
				vec4 ringIntersection = intersectRayPlane(nonPostCameraPosition, worldDir, ringsOrigin, vec3(`+ rings.normal.x.toFixed(6) + `,` + rings.normal.y.toFixed(6) + `,` + rings.normal.z.toFixed(6) + `));
				if(ringIntersection.w == 1.0){
					float innerRadius = `+ rings.innerRadius.toFixed(6) + `;
					float outerRadius = `+ rings.outerRadius.toFixed(6) + `;
					vec4 ringColor =computeRingColor(ringIntersection.xyz, ringsOrigin, innerRadius,outerRadius);
					
					float lengthToRingIntersection = length(ringIntersection.xyz-nonPostCameraPosition);
					float lengthToDepthImpact = length(impact-nonPostCameraPosition);
					if(depth >= 0.999 || lengthToRingIntersection<lengthToDepthImpact){ 
						if(atmosphereImpactDistance>=0.0 && lengthToRingIntersection<atmosphereImpactDistance){
							diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w);
						}else{
							float diffuseOpacity = ringColor.w*(1.0-0.8*atmosphereThickness);
							`;
			if (ocean) code += `diffuseOpacity *= (1.0-waterOpacity);`;
			if (clouds) code += `diffuseOpacity *= (1.0-cl.w);`;
			code += `
						  diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,diffuseOpacity);
						}
						
					}
				}
			`;
		}

		code += `
				
				gl_FragColor.rgb = diffuse;
				//gl_FragColor.rgb = vec3(radiusStep);
				
				gl_FragColor.a = 1.0;
			
				
			}`;
		return code;
	},
	fragmentShaderShadows: (atmosphere, ocean, sun, globalElevation, rings, space, clouds) => {
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1, 0.2, 0.5);
		}
		if (!!atmosphere && !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1, 0.4, 1.0);
		}
		let blackHole = false;
		let blackHoleNormal;
		if (sun === false) {
			blackHole = true;
		}
		if (!sun || !sun.isVector3) {
			sun = new THREE.Vector3(1.0, 0.9, 0.8);
		}
		const sunHighlight = new THREE.Vector3(Math.pow(sun.x, 0.5), Math.pow(sun.y, 0.5), Math.pow(sun.z, 0.5));
		let atmosphereHighlight;
		if (!!atmosphere) {

			atmosphereHighlight = new THREE.Vector3(Math.sqrt(atmosphere.x), Math.sqrt(atmosphere.y), Math.sqrt(atmosphere.z));
		}

		let code = /* glsl */`
		precision highp float;
		precision highp int;

		#include <packing>
		#include <common>
		#include <logdepthbuf_pars_fragment>
			varying vec2 vUv;
			uniform sampler2D tDiffuse;
			uniform sampler2D tDepth;
			uniform sampler2D opticalDepth;
			uniform sampler2D water1;
			uniform sampler2D water2;
			uniform sampler2D ringsPalette;
			uniform sampler2D starsTexture;
			uniform sampler2D nebulaTexture;
			uniform sampler2D nebulaPalette;
			uniform sampler2D perlin;
			uniform sampler2D tClouds;
			uniform sampler2D tCloudsDepth;
			uniform vec4 waterConfig;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform float radius;
			uniform float xfov;
			uniform float yfov;
			uniform float heightAboveSeaLevel;
			uniform vec3 planetPosition;
			uniform vec3 nonPostCameraPosition;
			uniform vec3 viewCenter;
			uniform vec3 up;
			uniform vec3 right;
			varying vec3 farPlanePosition;
			varying vec3 nearPlanePosition;
			uniform vec3 sunLocation;
			uniform float ldf;
			uniform bool mobile;
			uniform float time;
			uniform float atmosphereDensity;
			`;
		if (globalElevation) {
			code += `uniform sampler2D globalElevation;`
		}
		code += `

			uniform mat4 projMatrixInv;
			uniform mat4 viewMatrixInv;
			
			float atmosphereRadius = 1.1;
			float a = 6378137.0;
			float e2 = 0.00668313865078767255258340984305;
			float f = 1.0 / 298.257223563; // flattening
			float b = 6356752.314245179;
			float e2Prim = 0.00672810349933054833172219855437;
			`;
		if (space) {
			const cos1 = Math.cos(space.texRotation1).toFixed(5);
			const sin1 = Math.sin(space.texRotation1).toFixed(5);

			const cos2 = Math.cos(space.texRotation2).toFixed(5);
			const sin2 = Math.sin(space.texRotation2).toFixed(5);
			code += `
				mat2 texRotation1 = mat2(
                    `+ cos1 + `, ` + (-sin1) + `,
                    `+ sin1 + `, ` + cos1 + `
                );
            
            mat2 texRotation2 = mat2(
                    `+ cos2 + `, ` + (-sin2) + `,
                    `+ sin2 + `, ` + cos2 + `
                );
			`;
		}
		code += `
			vec3 rotateVecByQuat(vec3 v, vec4 q) {
				vec4 p = vec4(
					q.w * v.x + q.y * v.z - q.z * v.y,
					q.w * v.y + q.z * v.x - q.x * v.z,
					q.w * v.z + q.x * v.y - q.y * v.x,
					-q.x * v.x - q.y * v.y - q.z * v.z
				);
			
				return vec3(
					p.w * -q.x + p.x * q.w - p.y * q.z + p.z * q.y,
					p.w * -q.y + p.y * q.w - p.z * q.x + p.x * q.z,
					p.w * -q.z + p.z * q.w - p.x * q.y + p.y * q.x
				);
			}
			vec4 fromToRotation(vec3 from, vec3 to) {
				float cosTheta = dot(from, to);
				vec3 rotationAxis = cross(from, to);
				
				float s = sqrt((1.0 + cosTheta) * 2.0);
				float invs = 1.0 / s;
			
				return vec4(
					rotationAxis.x * invs,
					rotationAxis.y * invs,
					rotationAxis.z * invs,
					s * 0.5
				);
			}

			float heightAboveEllipsoid(vec3 xyz) {
				float x = xyz.x;
				float y = xyz.y;
				float z = xyz.z;
				float p = sqrt(x * x + y * y);
				float th = atan(a * z, b * p);
				float sinth = sin(th);
				float costh = cos(th);
				float lat = atan((z + 42768.887489850550246426289775082 * sinth*sinth*sinth),
								(p - 42625.973904718933451516691906121 * costh*costh*costh));
			
				float sinLat = sin(lat);
				float N = a / sqrt(1.0 - e2 * sinLat*sinLat);
				float h = p / cos(lat) - N;
			
				return h;
			}


			float readDepth( sampler2D depthSampler, vec2 coord ) {
				vec4 fragCoord = texture2D( depthSampler, coord );
				float invViewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
				return viewZToOrthographicDepth( -invViewZ, cameraNear, cameraFar );
			  }
			  	
			/**
			 * Returns the intersection distances of a ray and a sphere (2 values)
			 **/
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

			float intersectRaySphere(vec3 rayA, vec3 rayB, vec3 sphereOrigin, float sphereRadius) {
				vec3 dir = rayB - rayA;
				vec3 L = rayA - sphereOrigin;
				float a = dot(dir, dir);
				float b = 2.0 * dot(dir, L);
				float c = dot(L, L) - sphereRadius * sphereRadius;
			
				float D = b * b - 4.0 * a * c;
			
				if (D < 0.0) {
					return -1.0; // No intersection
				}
			
				// Compute the nearest intersection point (smallest t)
				float t = (-b - sqrt(D)) / (2.0 * a);
			
				// Check if the intersection is within the segment defined by A and B
				if (t >= 0.0 && t <= 1.0) {
					return t; // The ray intersects the sphere within the segment
				}
			
				return -1.0; // Intersection outside the segment
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

			`;
		if (!!rings) {
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
		  
					  vec4 computeRingColor(vec3 point, vec3 center, vec3 ringsNormal, float innerRadius, float outerRadius, vec3 sunLocation, vec3 sunVector) {
						  float distance = length(point - center);
					  
						  // Check if the point is before the inner radius or outside the outer radius
						  if (distance > outerRadius || distance < innerRadius) {
							  return vec4(0.0, 0.0, 0.0, 0.0); // Fully transparent
						  }
					  
						  // Interpolate between color1 and color2 based on the distance
						  float t = (distance - innerRadius) / (outerRadius - innerRadius);
						  
						  //check if ring is in planet's shadow
						  vec2 earthIntersectionSun = raySphereIntersection(planetPosition, radius, point, normalize(sunLocation-point));
						  float rayEarthProximity = pow((earthIntersectionSun.y-earthIntersectionSun.x)/radius,2.0);
						  float sunlight = 0.5+0.5*(1.0-step(-earthIntersectionSun.x,0.0)*rayEarthProximity);
						  sunlight*=0.5+0.5*abs(dot(sunVector, ringsNormal));
						  
						  vec4 color = texture2D(ringsPalette, vec2(t+`+ rings.colorMapDisplace.toFixed(2) + `,` + rings.colorMap.toFixed(2) + `));
						  color.x*=sunlight;
						  color.y*=sunlight;
						  color.z*=sunlight;
						  return color;// interpolated color
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
				  `
		}
		if (space) {
			code += `
			
			
			vec4 intersectRayRing(vec3 rayOrigin, vec3 rayDirection, vec3 planeOrigin, vec3 planeNormal, float ringStartDistance, float ringEndDistance, out float t) {
				// Step 1: Find intersection with the plane
				vec3 diff = planeOrigin - rayOrigin;
				float prod1 = dot(diff, planeNormal);
				float prod2 = dot(rayDirection, planeNormal);
				t = prod1 / prod2;
				
				// If the ray is parallel to the plane or points away from it, return no intersection
				if (prod2 == 0.0 || t < 0.0) {
					return vec4(0.0, 0.0, 0.0, -1.0); // No intersection, w = -1 indicates failure
				}
				
				// Calculate the exact intersection point
				vec3 intersection = rayOrigin + rayDirection * t;
				
				// Step 2: Check if the intersection point is within the ring bounds
				float distanceFromOrigin = length(intersection - planeOrigin);
				
				if (distanceFromOrigin >= ringStartDistance && distanceFromOrigin <= ringEndDistance) {
					// Inside the ring
					return vec4(intersection, 1.0); // Intersection point, w = 1 indicates success
				}
				
				// Outside the ring
				return vec4(0.0, 0.0, 0.0, -1.0); // No intersection within the ring, w = -1 indicates failure
			}

			vec2 rotate90(vec2 longLat) {
                
                // Convert to Cartesian coordinates
                vec3 cart = vec3(sin(longLat.y), cos(longLat.y) * sin(longLat.x), -cos(longLat.y) * cos(longLat.x));
                return vec2(atan(cart.x, cart.y), asin(cart.z));
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
			// for stars there's no seams so we can simplify things a bit
			float pickFromTextureStars(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
                
                vec2 uv = vec2((lonLat.x*0.159154943), lonLat.y*0.3183098);
                uv = matrix*uv*frequency;
                float a1 = texture2D(sampler , uv.xy ).x;
                
                vec2 lonLatRotated = rotate90(lonLat);

                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float b = texture2D(sampler , uv.xy ).x;
				float c = cos(lonLat.y);
				return a1*c+b*(1.0-c);
                
                /* lonLatRotated = rotate90(rotate90(lonLatRotated));
                uv = vec2((lonLatRotated.x*0.159154943), lonLatRotated.y*0.3183098);
                uv = matrix*uv*frequency;
                float a2 = texture2D(sampler , uv.xy ).x;
                float grad = cos(lonLat.x)*0.5+0.5;
                float a = grad*a1+(1.0-grad)*a2;
                
                float c = cos(lonLat.y);
                c = c*c;
                
                return a*c+b*(1.0-c); */
            }
			`;

		}

		code += `	

		float cameraToCloudAtmosphereMieFactor(in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection, in float cloudDepth, in vec3 sunVector,out float shadeClouds){

				float distToCloud = mix(cameraNear, cameraFar, cloudDepth);
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				vec3 impact = rayOrigin + rayDirection * distToCloud;
				shadeClouds = min(1.0,max(0.0,0.5+max(dot(normalize(rayOrigin), sunVector),dot(normalize(impact), sunVector))));
				float atmosphereCameraHeight = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(atmosphereCameraHeight<=1.0){ //inside atmosphere
					return (1.0-exp(-length(impact-rayOrigin)*0.00000025*atmosphereDensity));
				}else{ //outsideAtmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					
					if(intersection.x > 0.0){
						float atmosphereImpactDistance = intersection.x;
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						return (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
					}else return 0.0;
				}
			}
			void atmosphereCalc(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth, in vec3 impact, in vec3 sunVector,
				out float atmosphereImpactDistance, out float atmosphereThickness, out float atmosphereThicknessForSun,
				out float atmosphereCameraHeight, out float shade, out float mieCoefficient
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				atmosphereCameraHeight = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(atmosphereCameraHeight<=1.0){ //inside atmosphere
					atmosphereImpactDistance = 0.0;
					float opticalX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/PI;
					
					if(depth<0.999){ // ground
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						shade = min(1.0,max(-1.0,0.5+max(dot(normalize(rayOrigin), sunVector),dot(normalize(impact), sunVector))));
						
						atmosphereThickness = (1.0-exp(-length(impact-rayOrigin)*0.0000007*atmosphereDensity));

						float impactRadius = length(impact);
						float atmosphereThicknessMultiplier = (impactRadius-radius)/(radius*atmosphereRadius - radius);
						atmosphereThickness*= max(0.0,min(1.0, 1.0-atmosphereThicknessMultiplier));

						atmosphereThicknessForSun = 0.0;
						mieCoefficient = (1.0-exp(-length(impact-rayOrigin)*0.00000025*atmosphereDensity));
						
					}else{ // sky
						
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						shade = min(1.0,max(-1.0,0.5+max(dot(normalize(rayOrigin), sunVector),dot(normalize(rayExitOnAtmosphereSurface), sunVector))));
						vec2 optical = texture2D( opticalDepth, vec2(opticalX, atmosphereCameraHeight)).xy;
						atmosphereThickness = max(0.0,min(1.0,optical.x*atmosphereDensity));
						atmosphereThicknessForSun = optical.y*atmosphereDensity;
						mieCoefficient = (1.0-exp(-length(rayExitOnAtmosphereSurface-rayOrigin)*0.00000025*atmosphereDensity));
					}
				}
				
				else{ // above atmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					
					if(intersection.x > 0.0){
						atmosphereImpactDistance = intersection.x;
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						//vec3 rayMidPoint = mix(rayOriginOnAtmosphereSurface, rayExitOnAtmosphereSurface, 0.75);
						
						//opticalDepthY = 1.0;
						sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
						
						
						if(depth<0.999){ // hit ground
							shade = min(1.0,max(-1.0,0.5+max(dot(normalize(rayOriginOnAtmosphereSurface), sunVector),dot(normalize(impact), sunVector))));
							atmosphereThickness = (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.0000007*atmosphereDensity));
							float impactRadius = length(impact);
							float atmosphereThicknessMultiplier = (impactRadius-radius)/(radius*atmosphereRadius - radius);
							atmosphereThickness*= max(0.0,min(1.0, 1.0-atmosphereThicknessMultiplier));
							
							atmosphereThicknessForSun = 0.0;
							mieCoefficient = (1.0-exp(-length(impact-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
							
						}else{ // to Space
							sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
							float opticalX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
							shade = min(1.0,max(-1.0,0.5+max(dot(normalize(rayOriginOnAtmosphereSurface), sunVector),dot(normalize(rayExitOnAtmosphereSurface), sunVector))));
							vec2 optical = texture2D( opticalDepth, vec2(opticalX, atmosphereCameraHeight)).xy;
							atmosphereThickness = max(0.0,min(1.0,optical.x*atmosphereDensity));
							atmosphereThicknessForSun = optical.y*atmosphereDensity;
							mieCoefficient = (1.0-exp(-length(rayExitOnAtmosphereSurface-rayOriginOnAtmosphereSurface)*0.00000025*atmosphereDensity));
						}
					}
				}
				
			}
			vec3 reflection(vec3 incident, vec3 normal){
				return incident - 2.0 * dot(normal, incident) * normal;
			}

			vec3 computeWaterNormal(vec3 surfacePoint){
				if(heightAboveSeaLevel>100000.0){
					return vec3(0.0,1.0,0.0);
				}
				float flowMapOffset0 = waterConfig.x;
				float flowMapOffset1 = waterConfig.y;
				float halfCycle = waterConfig.z;
				
				// computeNormal
								
				float lat = asin(surfacePoint.z/radius);
				float lon = atan(surfacePoint.y, surfacePoint.x);
				vec2 scale = vec2(waterConfig.w,waterConfig.w)*0.1;
				
				vec2 waterUV = vec2(((lon*cos(lat)) + 3.14159265)/(3.14159265), (lat + 3.14159265 / 2.0)/3.14159265);
				vec2 flow = normalize(vec2(0.7, 0.7))*1.0*cos(lat);
				`;
		if (globalElevation) {
			code += `
					float elevation = texture2D(globalElevation, vec2((lon+3.14159265)/6.28318530717,(lat + 3.14159265 / 2.0)/3.14159265)).r;
					flow *= min(1.0,max(0.0,elevation/-1000.0));
					//if(elevation > -100.0) flow*=0.0;
					`;
		}
		code += `
				
				vec4 normalColor0 = texture2D( water1, ( waterUV * scale ) + flow * flowMapOffset0 );
				vec4 normalColor1 = texture2D( water2, ( waterUV * scale ) + flow * flowMapOffset1 );

				float blendWidth = 0.1;
				if(lon > 3.14159265-blendWidth || lon<-3.14159265+blendWidth) {
					
					float blendFactor = 0.5-(3.1416-abs(-lon))/(blendWidth*2.0);
					waterUV.x = (-lon*cos(lat) + 3.14159265)/(3.14159265);
					vec4 normalColor0B = texture2D( water1, ( waterUV * scale ) + flow * flowMapOffset0 );
					vec4 normalColor1B = texture2D( water2, ( waterUV * scale ) + flow * flowMapOffset1 );
					normalColor0 =mix(normalColor0, normalColor0B, blendFactor);
					normalColor1 =mix(normalColor1, normalColor1B, blendFactor);
				}
	
				float flowLerp = abs( halfCycle - flowMapOffset0 ) / halfCycle;
				vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );
				vec3 normal =  normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
				return mix(normal, vec3(0.0,1.0,0.0), max(0.0,heightAboveSeaLevel/100000.0));
			}
			vec4 oceanCalc(vec3 rayDirection, vec3 impact, vec3 sunVector, float cameraDepth){
				float waterVolume = 0.0;
				float oceanIlumination = 0.0;
				float oceanLightReflection = 0.0;
				float lightIncidence = 0.0;
				
				vec2 intersection = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, rayDirection, a, a, b);
				
				
				if(intersection.x <0.0 && intersection.y<0.0){
					// ray outside ocean
				}else{
					vec3 surfaceImpact = nonPostCameraPosition + rayDirection * intersection.x;
					
					
					float depthNonLinearized = texture2D( tDepth, vUv ).x;
					if(depthNonLinearized<0.999){ // hit on planet surface
						
						
						vec3 surfaceExit = nonPostCameraPosition + rayDirection * intersection.y;
						
						
						if(cameraDepth>0.0){ //camera in ocean
							waterVolume = min(length(impact - nonPostCameraPosition), length(surfaceExit - nonPostCameraPosition));
							//oceanIlumination = dot(sunVector, normalize(nonPostCameraPosition));

							vec3 normal = computeWaterNormal(surfaceImpact);
							vec3 surfaceNormal = normalize(impact);
							vec4 rotationQuat = fromToRotation(vec3(0.0,1.0,0.0), surfaceNormal);
							vec3 worldSpaceNormal = rotateVecByQuat(normal, rotationQuat);
							oceanIlumination = dot(sunVector, worldSpaceNormal);
						}else{ // camera outside ocean
							if(length(surfaceImpact - nonPostCameraPosition)<length(impact - nonPostCameraPosition)){
								vec3 normal = computeWaterNormal(surfaceImpact);
								vec3 surfaceNormal = normalize(surfaceImpact);
								vec4 rotationQuat = fromToRotation(vec3(0.0,1.0,0.0), surfaceNormal);

    							vec3 worldSpaceNormal = rotateVecByQuat(normal, rotationQuat);


								oceanIlumination = dot(sunVector, worldSpaceNormal);
								waterVolume = min(length(surfaceExit - surfaceImpact), length(impact - surfaceImpact));
								oceanLightReflection = dot(normalize(rayDirection), reflection(sunVector, worldSpaceNormal));
								lightIncidence = 1.0-abs(dot(normalize(rayDirection), worldSpaceNormal));
							}
							
						}
					}else{ // ocean through and through
						if(cameraDepth>0.0){ //camera in ocean
							vec3 surfaceExit = nonPostCameraPosition + rayDirection * intersection.y;
							vec3 normal = computeWaterNormal(surfaceExit);
							vec3 surfaceNormal = normalize(surfaceExit);
							vec4 rotationQuat = fromToRotation(vec3(0.0,1.0,0.0), surfaceNormal);
							vec3 worldSpaceNormal = rotateVecByQuat(normal, rotationQuat);
							waterVolume = intersection.y;
							oceanIlumination = max(dot(sunVector, worldSpaceNormal), dot(sunVector, surfaceNormal));
							//oceanLightReflection = dot(normalize(rayDirection), reflection(sunVector, worldSpaceNormal));
						}else{ // camera outside ocean
							vec3 normal = computeWaterNormal(surfaceImpact);
							vec3 surfaceNormal = normalize(surfaceImpact);
							vec4 rotationQuat = fromToRotation(vec3(0.0,1.0,0.0), surfaceNormal);

    						vec3 worldSpaceNormal = rotateVecByQuat(normal, rotationQuat);
							vec3 surfaceExit = nonPostCameraPosition + rayDirection * intersection.y;
							waterVolume = (intersection.y - intersection.x);
							oceanIlumination = dot(sunVector, normalize(surfaceImpact));
							oceanLightReflection = dot(normalize(rayDirection), reflection(sunVector, worldSpaceNormal));
							lightIncidence = 1.0-abs(dot(normalize(rayDirection), worldSpaceNormal));
						}
					}

				}
				
				return vec4(waterVolume, oceanIlumination, oceanLightReflection, lightIncidence);
			}
			vec4 normalizeQuaternion(vec4 q) {
				float norm = sqrt(dot(q, q));
				return q / norm;
			}
			vec4 createQuaternionFromAxisAngle(vec3 axis, float angle) {
				float halfAngle = angle / 2.0;
				float s = sin(halfAngle);
				return normalizeQuaternion(vec4(normalize(axis) * s, cos(halfAngle)));
			}
			
			vec4 multiplyQuaternions(vec4 q1, vec4 q2) {
				return normalizeQuaternion(vec4(
					q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
					q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
					q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
					q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
				));
			}

			vec4 halveQuaternionAngle(vec4 q) {
				q = normalizeQuaternion(q); // Ensure q is normalized
				float angle = 2.0 * acos(q.w); // Extract angle
				float sinHalfAngleOriginal = sqrt(1.0 - q.w * q.w);
				vec3 axis;
				if (sinHalfAngleOriginal < 0.0001) {
					axis = vec3(1, 0, 0); // Default axis if too small to compute
				} else {
					axis = vec3(q.x, q.y, q.z) / sinHalfAngleOriginal; // Extract axis
				}
				return createQuaternionFromAxisAngle(axis, angle * 0.5); // Create new quaternion with half the angle
			}
			
			vec4 conjugate(vec4 q) {
				return vec4(-q.x, -q.y, -q.z, q.w);
			}
			
			vec3 rotateVectorUsingQuaternion(vec3 v, vec4 q) {
				vec4 vecQuat = vec4(v.x, v.y, v.z, 0.0);
				vec4 rotatedQuat = multiplyQuaternions(multiplyQuaternions(q, vecQuat), conjugate(q));
				return vec3(rotatedQuat.x, rotatedQuat.y, rotatedQuat.z);
			}

			
			

			vec4 quatFromTwoVectors(vec3 start, vec3 dest) {
				start = normalize(start);
				dest = normalize(dest);
				float cosTheta = dot(start, dest);
				vec3 rotationAxis;
				float epsilon = 0.000001;
			
				if (cosTheta < -1.0 + epsilon) {
					// start and dest point in opposite directions
					rotationAxis = cross(vec3(0.0, 0.0, 1.0), start);
					if (length(rotationAxis) < epsilon) // They were parallel, try another axis
						rotationAxis = cross(vec3(1.0, 0.0, 0.0), start);
					rotationAxis = normalize(rotationAxis);
					return vec4(rotationAxis, 0.0); // 180 degree rotation
				}
			
				rotationAxis = cross(start, dest);
			
				float s = sqrt((1.0 + cosTheta) * 2.0);
				float invs = 1.0 / s;
			
				return vec4(rotationAxis.x * invs, rotationAxis.y * invs, rotationAxis.z * invs, s * 0.5);
			}

			vec3 rotateVectorAroundAxis(vec3 v, vec3 axis, float angle) {
				float cosTheta = cos(angle);
				float sinTheta = sin(angle);
				vec3 crossProd = cross(axis, v);
				float dotProd = dot(axis, v);
				return v * cosTheta + crossProd * sinTheta + axis * dotProd * (1.0 - cosTheta);
			}

			vec3 adjustDirectionBH(vec3 dir, vec3 bhPos, out float lightAbsorption, out float lightAbsorption2) {

				//vec3 dirBH = dir*length(bhPos);
				
				// Calculate the closest approach (simplified)
				float distanceToBH = length(dir - bhPos);
				
				// Calculate bending angle (simplified formula and approach)
				float angle = 12000000.0 / distanceToBH;

				vec3 axis = normalize(cross(dir, bhPos - dir));
				
				// Assuming 'angle' is small, adjust direction
				// This is a placeholder: actual vector rotation towards 'bhPos' is more complex
				//vec3 newDir = dir + angle * normalize(bhPos - dir);
				vec3 newDir = rotateVectorAroundAxis(dir, axis, angle);
				lightAbsorption = step(angle, 0.48);

				float distance = abs(angle - 0.48);
				lightAbsorption2 = exp(-(500.0 + cos(time*3.49783)*55.0 + cos(time*7.187935)*74.3) * distance * distance);

				return normalize(newDir);
			}

			float gravitationalBendingEffect(vec3 rayPosition, vec3 blackHolePosition, float blackHoleMass) {
				// Placeholder constants for the gravitational constant and the speed of light.
				// In reality, these values would need to be adapted to work within the shader's limitations and the scene's scale.
				float G = 8e-17; // Adjusted for scale in the shader's universe
				float c = 1.0; // Similarly adjusted
			
				vec3 toBlackHole = blackHolePosition - rayPosition;
				float distance = length(toBlackHole);
			
				// Calculate the Schwarzschild radius of the black hole for a simplified gravitational effect
				float rs = 2.0 * G * blackHoleMass / (c * c);
			
				// Adjust bending effect based on distance and Schwarzschild radius
				// This formula is inspired by physical principles but significantly simplified for use in shaders
				float bendingFactor = rs / distance*distance*distance;
			
				// Normalize to prevent excessive bending while ensuring the effect becomes noticeable as the ray approaches the black hole
				bendingFactor = clamp(bendingFactor, 0.0, 0.082); // Clamp the effect to prevent excessive bending and adjust based on visual needs
			
				return bendingFactor;
			}
			float intersectRayDisk(vec3 positionA, vec3 positionB, vec3 diskCenter, vec3 planeNormal, float ringStartDistance, float ringEndDistance) {
				vec3 rayDirection = normalize(positionB - positionA);
				float maxT = length(positionB - positionA);
				vec3 diff = diskCenter - positionA;
				float prod1 = dot(diff, planeNormal);
				float prod2 = dot(rayDirection, planeNormal);
				float t = prod1 / prod2;
			
				// Check if the intersection is within the segment and plane
				if (prod2 == 0.0 || t < 0.0 || t > maxT) {
					return 0.0; // No intersection with the plane in the segment
				}
			
				// Calculate the actual intersection point
				vec3 intersectionPoint = positionA + rayDirection * t;
				// Check if the intersection point is within the disk's radii
				float distanceFromCenter = length(intersectionPoint - diskCenter);
				if (distanceFromCenter >= ringStartDistance && distanceFromCenter <= ringEndDistance) {
					return (distanceFromCenter-ringStartDistance)/(ringEndDistance-ringStartDistance); // Intersection within the disk
				}
			
				return 0.0; // Intersection outside the disk boundaries
			}
			float accretionDiskIntersection(vec3 rayOrigin, vec3 rayDirection, vec3 blackHolePosition, float blackHoleWeight, float eventHorizonRadius, vec3 accretionDiskNormal, float accretionDiskMinRadius, float accretionDiskMaxRadius, float stepSize) {
				vec3 currentPos = rayOrigin;
				vec3 modifiedRayDir = rayDirection;
			
				for (int i = 0; i < 50; ++i) {
					float bendingFactor = gravitationalBendingEffect(currentPos, blackHolePosition, blackHoleWeight);
			
					// Adjust ray direction based on bending factor
					vec3 towardsBH = normalize(blackHolePosition - currentPos);
					modifiedRayDir = normalize(modifiedRayDir + towardsBH * bendingFactor);
			
					vec3 nextPos = currentPos + modifiedRayDir * stepSize;
			
					float rayDiskIntersection = intersectRayDisk(currentPos, nextPos, blackHolePosition, accretionDiskNormal, accretionDiskMinRadius, accretionDiskMaxRadius);
					if (rayDiskIntersection > 0.0) {
						return rayDiskIntersection; // Intersection found
					}
					if (length(nextPos - blackHolePosition) > accretionDiskMaxRadius*2.5) {
						return 0.0; // ray to space
					}
					if (intersectRaySphere(currentPos, nextPos, blackHolePosition, eventHorizonRadius) >= 0.0) {
						return 0.0; // ray swallowed by black hole
					}
			
					currentPos = nextPos;
				}
			
				return 0.0; // No intersection found
			}

			void main() {
				vec3 sunVector = normalize(sunLocation);
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				vec3 rayDirection = normalize(farPlanePosition-nonPostCameraPosition);
				float cameraHeightAboveEllipsoid = heightAboveEllipsoid(nonPostCameraPosition);
				vec3 cameraSun = normalize(sunLocation*999999999999.0 - nonPostCameraPosition);
				//rayDirection = vec3(rayDirection.x, rayDirection.z, -rayDirection.y);
				`;
		if (!!atmosphere) {
			code += `
					float atmosphereImpactDistance = -1.0;
					float atmosphereThickness = 0.0;
					float atmosphereThicknessForSun = 0.0;
					float atmosphereCameraHeight = 0.0;
					float shade = 0.0;
					float normalizedLengthThroughAtmosphere = 0.0;
					float mieCoefficient = 0.0;
					atmosphereCalc(planetPosition, nonPostCameraPosition, rayDirection, depth, impact, sunVector, atmosphereImpactDistance, atmosphereThickness, atmosphereThicknessForSun, atmosphereCameraHeight, shade, mieCoefficient);
					mieCoefficient *= atmosphereThicknessForSun;
					mieCoefficient-=(1.0-max(0.0,shade));
					vec3 atmosphereColorBeforeMie = mix(vec3(`+ atmosphere.x.toFixed(3) + `,` + atmosphere.y.toFixed(3) + `,` + atmosphere.z.toFixed(3) + `), vec3(` + atmosphereHighlight.x.toFixed(3) + `,` + atmosphereHighlight.y.toFixed(3) + `,` + atmosphereHighlight.z.toFixed(3) + `), shade);
					vec3 atmosphereColor = mix(atmosphereColorBeforeMie, vec3(1.0,1.0,1.0), mieCoefficient);
					
					atmosphereThickness = pow(atmosphereThickness,2.0);
					`;
		} else {
			code += `
					float atmosphereThickness = 0.0;
					float atmosphereThicknessForSun = 0.0;
					float shade = 0.0;
					float atmosphereCameraHeight = 1.0;
					float mieScatter = 0.0;
					vec3 atmosphereColor = vec3(0,0,0);
				
				`;
		}

		if (space) {
			code += `
					if(depth >= 0.999){

						vec3 sunReference = vec3(1.0, 0.0, 0.0);
						
						vec3 upVector = vec3(0.0, 0.0, 1.0);
						vec3 projectedSunVector =normalize(vec3(sunVector.x, sunVector.y, 0.0));
						float angle = acos(dot(sunReference, projectedSunVector)) * -sign(dot(upVector, cross(sunReference, projectedSunVector)));
						

						vec3 rotatedVector = rotateVectorAroundAxis(rayDirection, upVector, angle);
						vec3 rotatedSunVector = rotateVectorAroundAxis(sunVector, upVector, angle);
						


						`;
			if (blackHole) {
				code += `
						vec3 blackHoleCenter = rotatedSunVector*8e8+nonPostCameraPosition;
						vec3 blackHoleCenterRelativeCamera = blackHoleCenter+nonPostCameraPosition;
						//blackHoleCenter += nonPostCameraPosition;
						float lightAbsorption = 1.0;
						float lightAbsorption2 = 1.0;
						vec3 accretionDiskNormal = normalize(vec3(0.02,0.025,1.0));
						
						vec3 rayOrigin = rotatedVector * (length(blackHoleCenter)-6e7);
						float lightAbsorption3 = accretionDiskIntersection(rayOrigin, rotatedVector, blackHoleCenter, 2e7, 3.2e7/1.8, accretionDiskNormal, 0e7, 5.4e7, 8.0e6);
						vec3 accretionColor = mix(vec3(0.6,0.8,3.0), vec3(3.0,2.0,1.0), lightAbsorption3);
						if(lightAbsorption3>0.0){
							if (lightAbsorption3 < 0.5) {
								lightAbsorption3 =  1.0 / (1.0 + exp(-(32.0 + cos(time*9.487)*2.0 + cos(time*4.948)*1.7) * (lightAbsorption3 - 0.25)));
							} else {
								lightAbsorption3 =  1.0 - (1.0 / (1.0 + exp(-(35.0 + cos(time*7.0)*1.7 + cos(time*4.24)*2.0) * (lightAbsorption3 - 0.75))));
							}
							accretionColor*=lightAbsorption3;
						}
						
						rotatedVector = adjustDirectionBH(rotatedVector*length(blackHoleCenter), blackHoleCenter, lightAbsorption, lightAbsorption2);
						
							`;
			}
			code += `
						
						vec2 lonlat = vec2(atan(rotatedVector.y, rotatedVector.x),asin(rotatedVector.z));

						vec2 sunLonlat = vec2(atan(rotatedSunVector.y, rotatedSunVector.x),asin(rotatedSunVector.z));
						
						
						
						// stars
						float starsIntensity = pickFromTextureStars(starsTexture, lonlat,texRotation1, 15.0)*0.5;
						starsIntensity += pickFromTextureStars(starsTexture, lonlat,texRotation2, 10.0)*0.5;
						starsIntensity *= 2.0*`+ space.starsIntensity.toFixed(5) + `;

						float nebulaIntensity1 = pickFromTextureX(nebulaTexture, lonlat,texRotation1, 1.5);
						float nebulaIntensity2 = pickFromTextureX(nebulaTexture, lonlat,texRotation2, 1.78);
						float perlin1= pickFromTextureX(perlin, lonlat,texRotation2, 2.0);
						float perlin2= pickFromTextureX(nebulaTexture, lonlat,texRotation1, 0.3);
						float perlin3= pickFromTextureX(perlin, lonlat,texRotation1, 4.5);
						//nebulaIntensity1*= pow(nebulaIntensity1,0.1);
						//nebulaIntensity2*= pow(nebulaIntensity2,0.1);
						nebulaIntensity1*=`+ space.gasCloudsIntensity.toFixed(5) + `;
						nebulaIntensity2*=`+ space.gasCloudsIntensity.toFixed(5) + `;
						vec3 nebulaColor1 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2,`+ space.colorMap.toFixed(5) + `)).xyz * nebulaIntensity2;
						vec3 nebulaColor2 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2+0.5,`+ space.colorMap.toFixed(5) + `)).xyz * nebulaIntensity1;
						diffuse.rgb = mix(nebulaColor1,nebulaColor2,perlin2)+vec3(starsIntensity*(0.5+0.5*perlin1*perlin3));
						//diffuse.rgb = vec3(nebulaIntensity2);
						`;
			if (!blackHole) {
				code += `
							float deltaLon = lonlat.x - sunLonlat.x;
							float cosDistance = sin(sunLonlat.y) * sin(lonlat.y) + cos(sunLonlat.y) * cos(lonlat.y) * cos(deltaLon);
							float angularDistance = 1.0-(acos(clamp(cosDistance, -1.0, 1.0))/PI);
							float gaussianFactor = exp(-1.0 / (angularDistance * (1.0 - angularDistance) + 0.0001));
							diffuse.rgb = mix(diffuse.rgb, vec3(pow(`+ sunHighlight.x.toFixed(2) + `,0.5),pow(` + sunHighlight.y.toFixed(2) + `,0.5),pow(` + sunHighlight.z.toFixed(2) + `,0.5)), 1.0 / (1.0 + exp(-2000.0 * (angularDistance - 0.996))));
							
							`;
			} else {
				code += `
							
							diffuse.rgb = mix(diffuse.rgb, mix(vec3(1.0,0.5,0.5), vec3(2.0,2.0,2.0), lightAbsorption2), lightAbsorption2);
							diffuse.rgb = mix(diffuse.rgb, vec3(0.0,0.0,0.0), 1.0-lightAbsorption);
							diffuse.rgb = mix(diffuse.rgb, accretionColor, lightAbsorption3);
							`;
			}


			code += `

						
						
					}
					`;
		}


		code += `
				float s = max(0.0,dot(cameraSun, rayDirection));
				float atm = pow(1.0-atmosphereThicknessForSun*0.5,4.0)*(1.0/atmosphereDensity);
				float sunVisibility = (depth>=0.999?(pow(s,10.0*atm)):0.0)*(1.0-min(1.0,atmosphereCameraHeight));
				float atmosphereOpacity = min(1.0,max(0.0,(atmosphereThickness*atmosphereDensity)*(shade+0.15)+sunVisibility));
				atmosphereColor.x = mix(atmosphereColor.x,0.6+max(0.0,shade),pow(s,160.0*atm));
				atmosphereColor.y = mix(atmosphereColor.y,0.5+max(0.0,shade),pow(s,120.0*atm));
				atmosphereColor.z = mix(atmosphereColor.z,0.4+max(0.0,shade),pow(s,20.0*atm));
				diffuse = mix(diffuse, atmosphereColor,atmosphereOpacity);
				`;




		if (clouds) {
			code += `
					vec4 cl = texture2D(tClouds, vUv);
					float cloudDepth = texture2D(tCloudsDepth, vUv).x;
					`;

			/* if (!!atmosphere) {
				code += `
					if(cl.w > 0.0 && cloudDepth<1.0){
						float shadeClouds = 0.0;
						float cloudsMieFactor = cameraToCloudAtmosphereMieFactor(planetPosition, nonPostCameraPosition, rayDirection, cloudDepth, sunVector, shadeClouds);
						cloudsMieFactor = min(1.0, pow(cloudsMieFactor,0.2));
						cloudsMieFactor-=(1.0-shadeClouds);

						
						vec3 atmosphereColorCloud = mix(atmosphereColorBeforeMie, vec3(1.0,1.0,1.0), cloudsMieFactor);
						vec3 atmosphereColorShadeCloud = vec3(
							mix(atmosphereColorCloud.x,0.6+shadeClouds,pow(s,160.0*atm)),
							mix(atmosphereColorCloud.y,0.5+shadeClouds,pow(s,120.0*atm)),
							mix(atmosphereColorCloud.z,0.4+shadeClouds,pow(s,20.0*atm))
						);
						atmosphereColorCloud = mix(atmosphereColorCloud, atmosphereColorShadeCloud, shadeClouds);
						cl.xyz = mix(cl.xyz,atmosphereColorCloud*shadeClouds, cloudsMieFactor);
					}
						`;
					} */
				if(!ocean){
					code+=`
					
					diffuse = mix(diffuse, cl.xyz, cl.w);
					`;
				}else{
					code+=`
					
					if(cameraHeightAboveEllipsoid<0.0){
						diffuse = mix(diffuse, cl.xyz, cl.w);
					}
					`;
				}
					
		}
		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			const specularOcean = new THREE.Vector3(Math.sqrt(shallowOcean.x), Math.sqrt(shallowOcean.y), Math.sqrt(shallowOcean.z));
			code += `
							float cameraDepth = -cameraHeightAboveEllipsoid;
							float impactDepth = 0.0;
							if(depth <0.999){
								impactDepth = max(0.0,-heightAboveEllipsoid(impact));
							}
							float waterOpacity = 0.0;
							/* if(cameraDepth>0.0){
								diffuse.rgb = vec3(1.0,0.0,0.0);
							} */
							if(cameraDepth > 0.0 || impactDepth > 0.0){
								vec4 oceanMeasures = oceanCalc(rayDirection, impact, sunVector, cameraDepth);
								float waterVolume = oceanMeasures.x;
								float oceanIlumination = max(0.1,oceanMeasures.y) ;
								
								float oceanLightReflection = max(0.2,pow(oceanMeasures.z,1.0));
								vec3 waterColor = mix(vec3(`+ shallowOcean.x.toFixed(3) + `,` + shallowOcean.y.toFixed(3) + `,` + shallowOcean.z.toFixed(3) + `), vec3(` + ocean.x.toFixed(3) + `,` + ocean.y.toFixed(3) + `,` + ocean.z.toFixed(3) + `), min(1.0,max(0.0,waterVolume/1000.0)));
								waterColor*= oceanIlumination;
								waterColor = mix(waterColor, vec3(`+ specularOcean.x.toFixed(3) + `,` + specularOcean.y.toFixed(3) + `,` + specularOcean.z.toFixed(3) + `), pow(oceanLightReflection,3.0));
								

								
								waterColor = mix(waterColor, waterColor*0.5, max(0.0,min(1.0,pow(waterVolume*0.000001,0.1))));
								
								float showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-2000000.0)/5000000.0));
								if(mobile){
									showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-100000.0)/300000.0));
								}
								float waterOpacity = pow(min(1.0,max(0.0,max(0.0,waterVolume/10000.0))),0.1);
								waterOpacity = max(waterOpacity,oceanLightReflection);
								waterOpacity = max(waterOpacity, oceanMeasures.w);

								
								if(waterVolume>0.0){
									diffuse.rgb = mix(diffuse,waterColor,mix(0.0,waterOpacity, showWater));
									
									diffuse.rgb = mix(diffuse,waterColor,max(0.0,min(1.0,impactDepth*0.0004))*pow(1.0-showWater,0.25));
								}
							}
								
								
							`;
								}
		if (clouds) {
			code += `
			if(cameraHeightAboveEllipsoid>=0.0){
				vec4 cc = texture2D(tClouds, vUv);
				diffuse = mix(diffuse, cc.xyz, cc.w);
			}
			`;
		}

		if (!!rings) {
			code += `
				vec3 ringsOrigin = vec3(`+ rings.origin.x.toFixed(6) + `,` + rings.origin.y.toFixed(6) + `,` + rings.origin.z.toFixed(6) + `);
				vec3 ringsNormal = vec3(`+ rings.normal.x.toFixed(6) + `,` + rings.normal.y.toFixed(6) + `,` + rings.normal.z.toFixed(6) + `);
				vec4 ringIntersection = intersectRayPlane(nonPostCameraPosition, rayDirection, ringsOrigin, ringsNormal);
				vec3 realSunLocation = sunLocation *1.0e10;
				if(ringIntersection.w == 1.0){
					float innerRadius = `+ rings.innerRadius.toFixed(6) + `;
					float outerRadius = `+ rings.outerRadius.toFixed(6) + `;
					vec4 ringColor =computeRingColor(ringIntersection.xyz, ringsOrigin, ringsNormal, innerRadius,outerRadius, realSunLocation, sunVector);
					
					float lengthToRingIntersection = length(ringIntersection.xyz-nonPostCameraPosition);
					float lengthToDepthImpact = length(impact-nonPostCameraPosition);
					float atmosphereOpacityRings = min(1.0,atmosphereThickness*shade+sunVisibility*0.5);
					
					if(depth >= 0.999 || lengthToRingIntersection<lengthToDepthImpact){ 
						
						if(atmosphereImpactDistance>=0.0 && lengthToRingIntersection<atmosphereImpactDistance){
							diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w);
					
						}else{
							ringColor.w*=(1.0-atmosphereOpacityRings);
							`;
			if (ocean) code += `ringColor.w*=(1.0-waterOpacity);`;
			if (clouds) code += `ringColor.w*=(1.0-cl.w);`;

			code += `
						diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w);
						}
						
						
					}
					
				}

				
				
				
			`;
		}
		code += `
		
						gl_FragColor.rgb = diffuse;
						gl_FragColor.a = 1.0;
					}`;


		return code;
	},

	depthPassFragmentShader: () => {
		let code = /* glsl */`

		precision highp float;
		precision highp int;
		
  		#include <packing>
		  #include <common>
		  #include <logdepthbuf_pars_fragment>

		    uniform float cameraNear;
			uniform float cameraFar;
			varying vec2 vUv;
			uniform sampler2D tDepth;
			uniform float ldf;

			
			

			vec2 PackDepth16( float depth ) {
    			float depthVal = depth * 0.9999847412109375;
    			vec3 encode = fract( depthVal * vec3(1.0, 256.0, 65536.0) );
    			return encode.xy - encode.yz / 256.0 + 0.001953125;
			}
			vec3 PackDepth24(float depth) {
				float depthVal = depth * 0.9999847412109375;
				vec4 encode = fract(depthVal * vec4(1.0, 256.0, 65536.0, 16777216.0));
				return encode.xyz - encode.yzw / 256.0 + 0.001953125;
				
			}

			void main() {
				gl_FragColor.xyz = PackDepth24(texture2D(tDepth, vUv).x);
				gl_FragColor.w = 1.0;
			}`;
		return code;
	}
};

export { PostShader };
