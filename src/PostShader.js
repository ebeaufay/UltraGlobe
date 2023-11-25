// @ts-nocheck
/**
 * Shader for planet tiles
 */
import * as THREE from 'three';

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
	uniform vec2 resolution;

	

	void main() {
		vUv = uv;
		//vUv.y-=0.1248/resolution.y;
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

	fragmentShader: (atmosphere, ocean, rings, space) => {
		//ocean = false;
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1, 0.2, 0.7);
		}
		if (!atmosphere || !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1, 0.4, 1.0);
		}

		const atmosphereHighlight = new THREE.Vector3(Math.sqrt(atmosphere.x), Math.sqrt(atmosphere.y), Math.sqrt(atmosphere.z));
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
			uniform vec2 resolution;
			float atmosphereRadius = 1.02;
			`;
			if(space){
				const cos1 = Math.cos(space.texRotation1).toFixed(5);
        		const sin1 = Math.sin(space.texRotation1).toFixed(5);

				const cos2 = Math.cos(space.texRotation2).toFixed(5);
        		const sin2 = Math.sin(space.texRotation2).toFixed(5);
				code+=`
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
			code+=`
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
		if(space){
			code+=`
			vec2 rotate90(vec2 longLat) {
                
                // Convert to Cartesian coordinates
                vec3 cart = vec3(sin(longLat.y), cos(longLat.y) * sin(longLat.x), -cos(longLat.y) * cos(longLat.x));
                return vec2(atan(cart.x, cart.y), asin(cart.z));
            }
			float pickFromTexture(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
                
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
				//float logDepthBufFC = 2.0 / ( log( cameraFar + 1.0 ) / log(2.0) );
				float viewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
				return viewZToOrthographicDepth( -viewZ, cameraNear, cameraFar );
			  }


			float getOpticalDepth(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth, in vec3 impact,
				out float atmosphereImpactDistance
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){// camera inside atmosphere
					atmosphereImpactDistance = 0.0;
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					//return opticalDepthX;
					//return opticalDepthX;
					if(depth<0.99){ // ray touches earth
						float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
						//return impactOpticalDepthY;
						return (texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.01;
					}else{ // ray to space
						return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
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
						if(depth<0.99){ //ray touches earth
							float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
							
							return (texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.01;
						}else{//ray enters atmosphere and exits to space 
							return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
						}
					}else{ // ray stays in space
						return 0.0;
					}
				}
				float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
				return opticalDepthX;
				//return opticalDepthX;
				if(depth<1.0){
					float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x;
				}else{
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
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
				`; 
				if(space){
					code += `
					if(depth >= 0.9999){
						vec2 lonlat = vec2(atan(worldDir.y, worldDir.x),asin(worldDir.z));
						//diffuse.rgb = vec3((lonlat.y/3.1416)+0.5);
						// stars
						float starsIntensity = pickFromTextureStars(starsTexture, lonlat,texRotation1, 15.0)*0.5;
						starsIntensity += pickFromTextureStars(starsTexture, lonlat,texRotation2, 10.0)*0.5;
						starsIntensity *= 2.0*`+space.starsIntensity.toFixed(5)+`;

						float nebulaIntensity1 = pickFromTexture(nebulaTexture, lonlat,texRotation1, 5.0);
						float nebulaIntensity2 = pickFromTexture(nebulaTexture, lonlat,texRotation2, 4.0);
						float perlin1= pickFromTexture(perlin, lonlat,texRotation2, 2.0);
						float perlin2= pickFromTexture(perlin, lonlat,texRotation1, 1.5);
						float perlin3= pickFromTexture(perlin, lonlat,texRotation1, 4.5);
						nebulaIntensity1*= pow(nebulaIntensity1,0.1);
						nebulaIntensity2*= pow(nebulaIntensity1,0.1);
						nebulaIntensity1*=perlin1*`+space.gasCloudsIntensity.toFixed(5)+`;
						nebulaIntensity2*=perlin1*`+space.gasCloudsIntensity.toFixed(5)+`;
						vec3 nebulaColor1 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2,`+space.colorMap.toFixed(5)+`)).xyz * nebulaIntensity2;
						vec3 nebulaColor2 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.2+0.5,`+space.colorMap.toFixed(5)+`)).xyz * nebulaIntensity1;
						diffuse.rgb = mix(nebulaColor1,nebulaColor2,perlin2)+vec3(starsIntensity*(0.5+0.5*perlin1*perlin3));
					}
					`;
				}
				code+=`
				

				
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float atmosphereImpactDistance = -1.0;
				float atmosphereThickness = getOpticalDepth(planetPosition, nonPostCameraPosition, worldDir, depth, impact, atmosphereImpactDistance)*1.4;
				
				//vec3 atmosphereColor = mix(vec3(0.1,0.3,1.0), vec3(0.32,0.72,1.0), atmosphereThickness);
				vec3 atmosphereColor = mix(vec3(`+ atmosphere.x.toFixed(3) + `,` + atmosphere.y.toFixed(3) + `,` + atmosphere.z.toFixed(3) + `), vec3(` + atmosphereHighlight.x.toFixed(3) + `,` + atmosphereHighlight.y.toFixed(3) + `,` + atmosphereHighlight.z.toFixed(3) + `), atmosphereThickness);
				
				
				diffuse = mix(diffuse,atmosphereColor,atmosphereThickness);
				`;
		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			code += `
					float waterVolume = oceanVolume(worldDir, impact);
					vec3 waterColor = mix(vec3(`+ shallowOcean.x.toFixed(3) + `,` + shallowOcean.y.toFixed(3) + `,` + shallowOcean.z.toFixed(3) + `), vec3(` + ocean.x.toFixed(3) + `,` + ocean.y.toFixed(3) + `,` + ocean.z.toFixed(3) + `), min(1.0,max(0.0,waterVolume/100.0)));
					float showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-2000000.0)/3000000.0));
					float waterOpacity = min(0.7,max(0.0,waterVolume/200.0))*showWater;
					diffuse.rgb = mix(diffuse,waterColor,waterOpacity);
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
					if(depth >= 0.9999 || lengthToRingIntersection<lengthToDepthImpact){ 
						if(atmosphereImpactDistance>=0.0 && lengthToRingIntersection<atmosphereImpactDistance){
							diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w);
						}else{
							`;
						if(!ocean)code+=`diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w*(1.0-atmosphereThickness));`;
						else code+=`diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w*(1.0-atmosphereThickness)*(1.0-waterOpacity));`;
						code+=`
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
	fragmentShaderShadows: (atmosphere, ocean, sun, globalElevation, rings, space) => {
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1, 0.2, 0.5);
		}
		if (!atmosphere || !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1, 0.4, 1.0);
		}
		if (!sun || !sun.isVector3) {
			sun = new THREE.Vector3(1.0, 0.7, 0.5);
		}
		const sunHighlight = new THREE.Vector3(Math.sqrt(sun.x), Math.sqrt(sun.y), Math.sqrt(sun.z));
		const atmosphereHighlight = new THREE.Vector3(Math.sqrt(atmosphere.x), Math.sqrt(atmosphere.y), Math.sqrt(atmosphere.z));

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
			`;
		if (globalElevation) {
			code += `uniform sampler2D globalElevation;`
		}
		code += `

			uniform mat4 projMatrixInv;
			uniform mat4 viewMatrixInv;
			
			float atmosphereRadius = 1.02;
			float a = 6378137.0;
			float e2 = (1.0 / 298.257223563)*2.0;
			float f = 1.0 / 298.257223563; // flattening
			float b = 6356752.3142451794975639665996337;
			float e2Prim = 0.00673949674227643495478215895675;
			`;
			if(space){
				const cos1 = Math.cos(space.texRotation1).toFixed(5);
        		const sin1 = Math.sin(space.texRotation1).toFixed(5);

				const cos2 = Math.cos(space.texRotation2).toFixed(5);
        		const sin2 = Math.sin(space.texRotation2).toFixed(5);
				code+=`
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
			code+=`
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
				float lat = atan((z + e2Prim * b * pow(sin(th), 3.0)),
								(p - e2 * a * pow(cos(th), 3.0)));
			
				float N = a / sqrt(1.0 - e2 * sin(lat) * sin(lat));
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
						  return color;// Fully opaque interpolated color
					  }
				  `
		}
		if(space){
			code+=`
			vec2 rotate90(vec2 longLat) {
                
                // Convert to Cartesian coordinates
                vec3 cart = vec3(sin(longLat.y), cos(longLat.y) * sin(longLat.x), -cos(longLat.y) * cos(longLat.x));
                return vec2(atan(cart.x, cart.y), asin(cart.z));
            }
			float pickFromTexture(sampler2D sampler, vec2 lonLat, mat2 matrix, float frequency){
                
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

			vec3 atmosphereCalc(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth, in vec3 impact, in vec3 sunVector,
				out float atmosphereImpactDistance
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){ //inside atmosphere
					atmosphereImpactDistance = 0.0;
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					
					if(depth<0.99){ // ground
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						//vec3 rayMidPoint = mix(rayOriginOnAtmosphereSurface, rayExitOnAtmosphereSurface, 0.75);
						float shade = max(0.00, dot(normalize(rayExitOnAtmosphereSurface), sunVector));
						
						float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
						
						return vec3(
							(texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x + texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.05*shade,
							shade,0.0
						);
						
					}else{ // sky
						
						//float shade = max(0.01, dot(normalize(rayOrigin), sunVector));
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						//vec3 rayMidPoint = mix(rayOrigin, rayExitOnAtmosphereSurface, 0.75);
						float shade = max(0.01, dot(normalize(rayExitOnAtmosphereSurface), sunVector));
						return vec3(texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x*2.0,shade,1.0);
					}
				}
				
				else{ // above atmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					
					if(intersection.x > 0.0){
						atmosphereImpactDistance = intersection.x;
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						//vec3 rayMidPoint = mix(rayOriginOnAtmosphereSurface, rayExitOnAtmosphereSurface, 0.75);
						float shade = max(0.01, dot(normalize(rayExitOnAtmosphereSurface), sunVector));
						//opticalDepthY = 1.0;
						sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
						float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
						
						if(depth<0.99){ // hit ground
							float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
							
							return vec3(
								(texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x + texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.05*shade,
								shade, 0.0
							);
						}else{ // to Space

							return vec3(texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x*2.0,shade,1.0);
						}
					}else{
						return vec3(0.0,0.0,0.0);
					}
				}
				return vec3(1.0,1.0,1.0);
				
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
				vec2 scale = vec2(waterConfig.w,waterConfig.w);
				
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
			vec3 oceanCalc(vec3 rayDirection, vec3 impact, vec3 sunVector){
				float waterVolume = 0.0;
				float oceanIlumination = 0.0;
				float oceanLightReflection = 0.0;
				
				vec2 intersection = rayEllipsoidIntersection(planetPosition, nonPostCameraPosition, rayDirection, a, a, b);
				
				
				if(intersection.x <0.0 && intersection.y<0.0){
					// ray outside ocean
					
				}else{
					vec3 surfaceImpact = nonPostCameraPosition + rayDirection * intersection.x;
					
					float cameraDepth = -heightAboveEllipsoid(nonPostCameraPosition);
					float depthNonLinearized = texture2D( tDepth, vUv ).x;
					if(depthNonLinearized<1.0){ // hit on planet surface
						
						
						vec3 surfaceExit = nonPostCameraPosition + rayDirection * intersection.y;
						
						
						if(cameraDepth>0.0){ //camera in ocean
							waterVolume = min(length(impact - nonPostCameraPosition), length(surfaceExit - nonPostCameraPosition));
							//oceanIlumination = dot(sunVector, normalize(nonPostCameraPosition));

							vec3 normal = computeWaterNormal(impact);
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
							waterVolume = intersection.y - intersection.x;
							oceanIlumination = (dot(sunVector, normalize(surfaceImpact))+dot(sunVector, normalize(surfaceExit)))*0.5;
							oceanLightReflection = dot(normalize(rayDirection), reflection(sunVector, worldSpaceNormal));
						}
					}

				}
				
				return vec3(waterVolume, oceanIlumination, oceanLightReflection);
			}
			vec4 fromAxisAngle(vec3 axis, float angle) {
				float halfAngle = angle / 2.0;
				float s = sin(halfAngle);
				return vec4(normalize(axis) * s, cos(halfAngle));
			}
			
			vec4 multiplyQuaternions(vec4 q1, vec4 q2) {
				return vec4(
					q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
					q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
					q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
					q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
				);
			}
			
			vec4 conjugate(vec4 q) {
				return vec4(-q.x, -q.y, -q.z, q.w);
			}
			
			vec3 rotateVectorUsingQuaternion(vec3 v, vec4 q) {
				vec4 vecQuat = vec4(v.x, v.y, v.z, 0.0);
				vec4 rotatedQuat = multiplyQuaternions(multiplyQuaternions(q, vecQuat), conjugate(q));
				return vec3(rotatedQuat.x, rotatedQuat.y, rotatedQuat.z);
			}
			void main() {
				vec3 sunVector = normalize(sunLocation);
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				vec3 rayDirection = normalize(farPlanePosition-nonPostCameraPosition);
				
				vec3 cameraSun = normalize(sunLocation*999999999999.0 - nonPostCameraPosition);
				//rayDirection = vec3(rayDirection.x, rayDirection.z, -rayDirection.y);
				float atmosphereImpactDistance = -1.0;
				vec3 atmosphereMeasures = atmosphereCalc(planetPosition, nonPostCameraPosition, rayDirection, depth, impact, sunVector, atmosphereImpactDistance);
				float atmosphereThickness = atmosphereMeasures.x;
				float shade = atmosphereMeasures.y;//pow(atmosphereMeasures.y,1.0);
				vec3 atmosphereColor = mix(vec3(`+ atmosphere.x.toFixed(3) + `,` + atmosphere.y.toFixed(3) + `,` + atmosphere.z.toFixed(3) + `), vec3(` + atmosphereHighlight.x.toFixed(3) + `,` + atmosphereHighlight.y.toFixed(3) + `,` + atmosphereHighlight.z.toFixed(3) + `), shade);
				float atmosphereTransparency = atmosphereThickness*shade;
				
				float s = max(0.001,dot(cameraSun, rayDirection));
				float atm = pow(1.0-atmosphereThickness*0.5,2.0);
				vec3 sunColor = mix(vec3(0.0,0.0,0.0),vec3(`+ (sun.x + atmosphere.z) * 0.5.toFixed(3) + `,` + (sun.y + atmosphere.y) * 0.5.toFixed(3) + `,` + (sun.z + atmosphere.x) * 0.5.toFixed(3) + `), pow(s,400.0*atm));
				sunColor = mix(sunColor,vec3(`+ sun.x.toFixed(3) + `,` + sun.y.toFixed(3) + `,` + sun.z.toFixed(3) + `), pow(s,1600.0*atm));
				sunColor = mix(sunColor,vec3(`+ sunHighlight.x.toFixed(3) + `,` + sunHighlight.y.toFixed(3) + `,` + sunHighlight.z.toFixed(3) + `), pow(s,1600.0*atm))*atmosphereThickness*atmosphereMeasures.z;
				`; 
				if(space){
					code += `
					if(depth >= 0.9999){

						vec3 sunReference = vec3(1.0, 0.0, 0.0);
						vec3 rotationAxis = cross(sunReference, sunVector);
						float rotationAngle = -acos(dot(sunReference, sunVector));
						vec4 rotationQuat1 = fromAxisAngle(rotationAxis, rotationAngle);
						vec3 upVector = vec3(0.0,0.0,1.0);
						vec3 rotatedUp = rotateVectorUsingQuaternion(upVector, rotationQuat1);

						vec4 rotationQuat2 = fromAxisAngle(cross(rotatedUp, upVector), 
                                             acos(dot(normalize(rotatedUp), normalize(upVector))));

						vec4 combinedQuat = multiplyQuaternions(rotationQuat2, rotationQuat1);
						vec3 rotatedVector = rotateVectorUsingQuaternion(rayDirection, combinedQuat);
						vec2 lonlat = vec2(atan(rotatedVector.y, rotatedVector.x),asin(rotatedVector.z));
						
						// stars
						float starsIntensity = pickFromTextureStars(starsTexture, lonlat,texRotation1, 15.0)*0.5;
						starsIntensity += pickFromTextureStars(starsTexture, lonlat,texRotation2, 10.0)*0.5;
						starsIntensity *= 2.0*`+space.starsIntensity.toFixed(5)+`;

						float nebulaIntensity1 = pickFromTexture(nebulaTexture, lonlat,texRotation1, 5.0);
						float nebulaIntensity2 = pickFromTexture(nebulaTexture, lonlat,texRotation2, 4.0);
						float perlin1= pickFromTexture(perlin, lonlat,texRotation2, 2.0);
						float perlin2= pickFromTexture(perlin, lonlat,texRotation1, 1.5);
						float perlin3= pickFromTexture(perlin, lonlat,texRotation1, 4.5);
						nebulaIntensity1*= pow(nebulaIntensity1,0.1);
						nebulaIntensity2*= pow(nebulaIntensity1,0.1);
						nebulaIntensity1*=perlin1*`+space.gasCloudsIntensity.toFixed(5)+`;
						nebulaIntensity2*=perlin1*`+space.gasCloudsIntensity.toFixed(5)+`;
						vec3 nebulaColor1 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.3,`+space.colorMap.toFixed(5)+`)).xyz * nebulaIntensity2;
						vec3 nebulaColor2 = texture2D(nebulaPalette, vec2(nebulaIntensity1*0.3+0.5,`+space.colorMap.toFixed(5)+`)).xyz * nebulaIntensity1;
						diffuse.rgb = (mix(nebulaColor1,nebulaColor2,perlin2)+vec3(starsIntensity*(0.5+0.5*perlin1*perlin3)));
						
						//diffuse.rgb = vec3(lonlat.x/(2.0*PI)+0.5, lonlat.y/PI+0.5, 1.0);
						
					}
					`;
				}
				code+=`
				//diffuse = atmosphereColor+diffuse+sunColor;
				diffuse = mix(diffuse, atmosphereColor,atmosphereTransparency)+sunColor;
				
				`;
		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			const specularOcean = new THREE.Vector3(Math.sqrt(shallowOcean.x), Math.sqrt(shallowOcean.y), Math.sqrt(shallowOcean.z));
			code += `
							
							vec3 oceanMeasures = oceanCalc(rayDirection, impact, sunVector);
								float waterVolume = oceanMeasures.x;
								float oceanIlumination = max(0.2,oceanMeasures.y) ;
								
								float oceanLightReflection = max(0.2,pow(oceanMeasures.z,1.0));
								vec3 waterColor = mix(vec3(`+ shallowOcean.x.toFixed(3) + `,` + shallowOcean.y.toFixed(3) + `,` + shallowOcean.z.toFixed(3) + `), vec3(` + ocean.x.toFixed(3) + `,` + ocean.y.toFixed(3) + `,` + ocean.z.toFixed(3) + `), min(1.0,max(0.0,waterVolume/1000.0)))*oceanIlumination;
								waterColor = mix(waterColor, vec3(`+ specularOcean.x.toFixed(3) + `,` + specularOcean.y.toFixed(3) + `,` + specularOcean.z.toFixed(3) + `), pow(oceanLightReflection,3.0));
								float showWater = 1.0-min(1.0, max(0.0, (heightAboveSeaLevel-2000000.0)/3000000.0));
								float waterOpacity = min(0.7,max(0.0,waterVolume/200.0))*showWater;
								waterOpacity *= max(1.0,oceanLightReflection);
								diffuse.rgb = mix(diffuse,waterColor,waterOpacity);
							
							
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
					if(depth >= 0.9999 || lengthToRingIntersection<lengthToDepthImpact){ 
						
						if(atmosphereImpactDistance>=0.0 && lengthToRingIntersection<atmosphereImpactDistance){
							diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w);
					
						}else{
							`;
						if(!ocean)code+=`diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w*(1.0-atmosphereThickness*shade));`;
						else code+=`diffuse.rgb = mix(diffuse.rgb,ringColor.xyz,ringColor.w*(1.0-atmosphereThickness*shade)*(1.0-waterOpacity));`;
						code+=`
						}
						
						
					}
				}
				
				
			`;
		}
		code += `
		
		//diffuse.rgb = vec3(shade);
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

			float readDepth( sampler2D depthSampler, vec2 coord ) {
				float depth = texture2D(depthSampler, coord).x;
    			float viewSpaceZ = -(exp2(depth * 2.0) - 1.0) / ldf;
    			return -viewSpaceZ;
			  }
			

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
