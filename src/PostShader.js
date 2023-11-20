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

	fragmentShader: (atmosphere, ocean) => {
		//ocean = false;
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1,0.2,0.7);
		}
		if (!atmosphere || !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1,0.4,1.0);
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

			float a = 6378137.0;
			float e2 = (1.0 / 298.257223563)*2.0;
			float f = 1.0 / 298.257223563; // flattening
			float b = 6356752.3142451794975639665996337;
			

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
				in float depth, in vec3 impact
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){// camera inside atmosphere
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
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				float atmosphereThickness = getOpticalDepth(planetPosition, nonPostCameraPosition, worldDir, depth, impact)*1.4;
				
				//vec3 atmosphereColor = mix(vec3(0.1,0.3,1.0), vec3(0.32,0.72,1.0), atmosphereThickness);
				vec3 atmosphereColor = mix(vec3(`+atmosphere.x.toFixed(3)+`,`+atmosphere.y.toFixed(3)+`,`+atmosphere.z.toFixed(3)+`), vec3(`+atmosphereHighlight.x.toFixed(3)+`,`+atmosphereHighlight.y.toFixed(3)+`,`+atmosphereHighlight.z.toFixed(3)+`), atmosphereThickness);
				
				
				diffuse = atmosphereColor*atmosphereThickness+diffuse;
				`;
		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			code += `
					float waterVolume = oceanVolume(worldDir, impact);
					vec3 waterColor = mix(vec3(`+shallowOcean.x.toFixed(3)+`,`+shallowOcean.y.toFixed(3)+`,`+shallowOcean.z.toFixed(3)+`), vec3(`+ocean.x.toFixed(3)+`,`+ocean.y.toFixed(3)+`,`+ocean.z.toFixed(3)+`), min(1.0,max(0.0,waterVolume/100.0)));
					diffuse.rgb = mix(diffuse,waterColor,min(0.7,max(0.0,waterVolume/100.0)));
					`;
		}
		code += `

				gl_FragColor.rgb = diffuse;
				gl_FragColor.a = 1.0;
			
				
			}`;
		return code;
	},
	fragmentShaderShadows: (atmosphere, ocean, sun, globalElevation) => {
		if (!!ocean && !ocean.isVector3) {
			ocean = new THREE.Vector3(0.1,0.2,0.5);
		}
		if (!atmosphere || !atmosphere.isVector3) {
			atmosphere = new THREE.Vector3(0.1,0.4,1.0);
		}
		if (!sun || !sun.isVector3) {
			sun = new THREE.Vector3(1.0,0.7,0.5);
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
			if(globalElevation){
				code+=`uniform sampler2D globalElevation;`
			}
			code+=`

			uniform mat4 projMatrixInv;
			uniform mat4 viewMatrixInv;
			
			float atmosphereRadius = 1.02;
			float a = 6378137.0;
			float e2 = (1.0 / 298.257223563)*2.0;
			float f = 1.0 / 298.257223563; // flattening
			float b = 6356752.3142451794975639665996337;
			float e2Prim = 0.00673949674227643495478215895675;

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

			

			vec3 atmosphereCalc(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth, in vec3 impact, in vec3 sunVector
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){ //inside atmosphere
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					
					if(depth<0.99){ // ground
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						//vec3 rayMidPoint = mix(rayOriginOnAtmosphereSurface, rayExitOnAtmosphereSurface, 0.75);
						float shade = max(0.01, dot(normalize(rayExitOnAtmosphereSurface), sunVector));
						
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
				 if(globalElevation){
					code+=`
					float elevation = texture2D(globalElevation, vec2((lon+3.14159265)/6.28318530717,(lat + 3.14159265 / 2.0)/3.14159265)).r;
					flow *= min(1.0,max(0.0,elevation/-1000.0));
					//if(elevation > -100.0) flow*=0.0;
					`;
				} 
				code+=`
				
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
			
			void main() {
				vec3 sunVector = normalize(sunLocation);
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				vec3 impact = mix(nearPlanePosition, farPlanePosition, depth);
				vec3 rayDirection = normalize(farPlanePosition-nonPostCameraPosition);
				vec3 cameraSun = normalize(sunLocation*999999999999.0 - nonPostCameraPosition);
				//rayDirection = vec3(rayDirection.x, rayDirection.z, -rayDirection.y);
				vec3 atmosphereMeasures = atmosphereCalc(planetPosition, nonPostCameraPosition, rayDirection, depth, impact, sunVector);
				float atmosphereThickness = atmosphereMeasures.x;
				float shade = atmosphereMeasures.y;
				vec3 atmosphereColor = mix(vec3(`+atmosphere.x.toFixed(3)+`,`+atmosphere.y.toFixed(3)+`,`+atmosphere.z.toFixed(3)+`), vec3(`+atmosphereHighlight.x.toFixed(3)+`,`+atmosphereHighlight.y.toFixed(3)+`,`+atmosphereHighlight.z.toFixed(3)+`), pow(shade,0.5));
				
				
				float s = max(0.001,dot(cameraSun, rayDirection));
				float atm = pow(1.0-atmosphereThickness*0.5,2.0);
				vec3 sunColor = mix(vec3(0.0,0.0,0.0),vec3(`+(sun.x+atmosphere.z)*0.5.toFixed(3)+`,`+(sun.y+atmosphere.y)*0.5.toFixed(3)+`,`+(sun.z+atmosphere.x)*0.5.toFixed(3)+`), pow(s,400.0*atm));
				sunColor = mix(sunColor,vec3(`+sun.x.toFixed(3)+`,`+sun.y.toFixed(3)+`,`+sun.z.toFixed(3)+`), pow(s,1600.0*atm));
				sunColor = mix(sunColor,vec3(`+sunHighlight.x.toFixed(3)+`,`+sunHighlight.y.toFixed(3)+`,`+sunHighlight.z.toFixed(3)+`), pow(s,1600.0*atm));
				diffuse = atmosphereColor*atmosphereThickness*shade+diffuse+sunColor*atmosphereThickness*atmosphereMeasures.z;
				
				`;
		if (!!ocean) {
			const shallowOcean = new THREE.Vector3(Math.sqrt(ocean.x), Math.sqrt(ocean.y), Math.sqrt(ocean.z));
			const specularOcean = new THREE.Vector3(Math.sqrt(shallowOcean.x), Math.sqrt(shallowOcean.y), Math.sqrt(shallowOcean.z));
			code += `
							
							vec3 oceanMeasures = oceanCalc(rayDirection, impact, sunVector);
								float waterVolume = oceanMeasures.x;
								float oceanIlumination = max(0.2,oceanMeasures.y) ;
								
								float oceanLightReflection = max(0.2,pow(oceanMeasures.z,1.0));
								vec3 waterColor = mix(vec3(`+shallowOcean.x.toFixed(3)+`,`+shallowOcean.y.toFixed(3)+`,`+shallowOcean.z.toFixed(3)+`), vec3(`+ocean.x.toFixed(3)+`,`+ocean.y.toFixed(3)+`,`+ocean.z.toFixed(3)+`), min(1.0,max(0.0,waterVolume/1000.0)))*oceanIlumination;
								waterColor = mix(waterColor, vec3(`+specularOcean.x.toFixed(3)+`,`+specularOcean.y.toFixed(3)+`,`+specularOcean.z.toFixed(3)+`), pow(oceanLightReflection,3.0));
								float waterOpacity = max(0.0, min(0.7, waterVolume/200.0));
								waterOpacity *= max(1.0,oceanLightReflection);
								diffuse.rgb = mix(diffuse,waterColor,waterOpacity);
							
							
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
