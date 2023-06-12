/**
 * Shader for planet tiles
 */


const PostShader = {

	vertexShader: () =>/* glsl */`
	precision highp float;
	precision highp int;

	varying vec2 vUv;
	varying vec3 farPlanePosition;
	uniform vec3 viewCenterFar;
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
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,

	fragmentShader: () => {
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
			uniform float ldf;
			
			float atmosphereRadius = 1.02;

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

			float getOpticalDepth(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){// camera inside atmosphere
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					//return opticalDepthX;
					//return opticalDepthX;
					if(depth<0.99){ // ray touches earth
						float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
						vec3 impact = rayOrigin + (rayDirection*depthInMeters);
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
							float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
							vec3 impact = rayOrigin + (rayDirection*depthInMeters);
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
					float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
					vec3 impact = rayOrigin + (rayDirection*depthInMeters);
					float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x;
				}else{
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
				}

			}

			void main() {
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );

				vec3 rayDirection = normalize(farPlanePosition-nonPostCameraPosition);
				float atmosphereThickness = getOpticalDepth(planetPosition, nonPostCameraPosition, rayDirection, depth)*1.4;
				
				vec3 atmosphereColor = mix(vec3(0.1,0.3,1.0), vec3(0.32,0.72,1.0), atmosphereThickness);
				
				diffuse = atmosphereColor*atmosphereThickness+diffuse;
				


				gl_FragColor.rgb = diffuse;
				gl_FragColor.a = 1.0;
			
				
			}`;
		return code;
	},

	fragmentShaderShadows: () => {
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
			uniform vec3 sunLocation;
			uniform float ldf;

			uniform mat4 projMatrixInv;
			uniform mat4 viewMatrixInv;
			
			float atmosphereRadius = 1.02;

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

			float getOpticalDepth(
				in vec3 sphereOrigin,
				in vec3 rayOrigin, in vec3 rayDirection,
				in float depth
			) {
				
				vec3 sphereToRayOrigin = normalize(sphereOrigin - rayOrigin);
				
				float opticalDepthY = heightAboveSeaLevel/(radius*(atmosphereRadius-1.0));
				if(opticalDepthY<=1.0){// camera inside atmosphere
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					//return opticalDepthX;
					//return opticalDepthX;
					if(depth<0.99){ // ray touches earth
						float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
						vec3 impact = rayOrigin + (rayDirection*depthInMeters);
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
							float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
							vec3 impact = rayOrigin + (rayDirection*depthInMeters);
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
					float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
					vec3 impact = rayOrigin + (rayDirection*depthInMeters);
					float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x;
				}else{
					return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
				}

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
					
					if(depth<0.9999){ // ground
						
						float shade = max(0.01, (dot(normalize(impact), sunVector)+dot(normalize(rayOrigin), sunVector))*0.5);
						
						float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
						
						return vec3(
							pow((texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x + texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x),1.0)*0.1,
							shade,0.0
						);
					}else{ // sky
						
						//float shade = max(0.01, dot(normalize(rayOrigin), sunVector));
						vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						vec3 rayMidPoint = mix(rayOrigin, rayExitOnAtmosphereSurface, 0.5);
						float shade = max(0.01, dot(normalize(rayMidPoint), sunVector));
						return vec3(texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x*2.0,shade,1.0);
					}
				}
				
				else{ // above atmosphere
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					
					if(intersection.x > 0.0){
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						vec3 rayExitOnAtmosphereSurface = rayOrigin+(intersection.y*rayDirection);
						vec3 rayMidPoint = mix(rayOriginOnAtmosphereSurface, rayExitOnAtmosphereSurface, 0.5);
						float shade = max(0.01, dot(normalize(rayMidPoint), sunVector));
						//opticalDepthY = 1.0;
						sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
						float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
						
						if(depth<0.99){ // hit ground
							float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
							
							return vec3(
								pow((texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x + texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x),1.0)*0.1,
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
			vec3 getWorldPosition(float depth, vec2 coord){
				float z = depth * 2.0 - 1.0;

    			vec4 clipSpacePosition = vec4(coord * 2.0 - 1.0, z, 1.0);
    			vec4 viewSpacePosition = projMatrixInv * clipSpacePosition;

    			// Perspective division
    			viewSpacePosition /= viewSpacePosition.w;

    			vec4 worldSpacePosition = viewMatrixInv * viewSpacePosition;

    			return worldSpacePosition.xyz;
			}
			void main() {
				vec3 sunVector = normalize(sunLocation);
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );
				vec3 impact = getWorldPosition(depth, vUv);
				vec3 rayDirection = normalize(farPlanePosition-nonPostCameraPosition);
				vec3 cameraSun = normalize(sunLocation*999999999999.0 - nonPostCameraPosition);
				//rayDirection = vec3(rayDirection.x, rayDirection.z, -rayDirection.y);
				vec3 atmosphereMeasures = atmosphereCalc(planetPosition, nonPostCameraPosition, rayDirection, depth, impact, sunVector);
				float atmosphereThickness = atmosphereMeasures.x;
				float shade = atmosphereMeasures.y;
				vec3 atmosphereColor = mix(vec3(0.1,0.4,1.0), vec3(0.32,0.52,1.0), pow(shade,0.5));

				
				float s = max(0.001,dot(cameraSun, rayDirection));
				float atm = pow(1.0-atmosphereThickness*0.5,1.6);
				vec3 sunColor = mix(vec3(0.0,0.0,0.0),vec3(1.0,0.7,0.5), pow(s,50.0*atm));
				sunColor = mix(sunColor,vec3(1.0,1.0,0.5), pow(s,500.0*atm));
				//atmosphereColor*=s;
				diffuse = atmosphereColor*atmosphereThickness*shade+diffuse+sunColor*atmosphereThickness*atmosphereMeasures.z;
				//diffuse = atmosphereColor*atmosphereThickness+diffuse;
				


				gl_FragColor.rgb = diffuse;
				//gl_FragColor.rgb = farPlanePosition;
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
