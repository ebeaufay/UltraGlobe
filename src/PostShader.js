/**
 * Shader for planet tiles
 */


const PostShader = {

	vertexShader: () =>/* glsl */`

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
		farPlanePosition += right * distX;
		farPlanePosition += up * distY;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,

	fragmentShader: () => {
		let code = /* glsl */`
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
			
			float atmosphereRadius = 1.02;

			/* float readDepth( sampler2D depthSampler, vec2 coord ) {
				float fragCoordZ = texture2D( depthSampler, coord ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			} */

			float readDepth( sampler2D depthSampler, vec2 coord ) {
				vec4 fragCoord = texture2D( depthSampler, coord );
			
				float logDepthBufFC = 2.0 / ( log( cameraFar + 1.0 ) / log(2.0) );
				float invViewZ = exp2(fragCoord.x / (logDepthBufFC * 0.5)) - 1.0;
				//return invViewZ;
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
				if(opticalDepthY<=1.0){
					float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
					//return opticalDepthX;
					//return opticalDepthX;
					if(depth<0.99){
						float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
						vec3 impact = rayOrigin + (rayDirection*depthInMeters);
						float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
						//return impactOpticalDepthY;
						return (texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.01;
					}else{
						return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
					}
				}
				else{
					vec2 intersection = raySphereIntersection(sphereOrigin, radius*atmosphereRadius, rayOrigin, rayDirection);
					if(intersection.x > 0.0){
						vec3 rayOriginOnAtmosphereSurface = rayOrigin+(intersection.x*rayDirection);
						opticalDepthY = 1.0;
						sphereToRayOrigin = normalize(sphereOrigin - rayOriginOnAtmosphereSurface);
						float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
						//return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
						if(depth<0.9){
							float depthInMeters = depth * (cameraFar - cameraNear) + cameraNear;
							vec3 impact = rayOrigin + (rayDirection*depthInMeters);
							float impactOpticalDepthY = (length(impact - planetPosition)-radius)/(radius*(atmosphereRadius-1.0));
							
							return (texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY)).x - texture2D( opticalDepth, vec2(opticalDepthX, impactOpticalDepthY)).x)*0.01;
						}else{
							return texture2D( opticalDepth, vec2(opticalDepthX, opticalDepthY) ).x;
						}
					}else{
						return 0.0;
					}
				}
				float opticalDepthX = 1.0-abs(acos(dot(sphereToRayOrigin, rayDirection)))/3.1415926535897932384626433832795;
				return opticalDepthX;
				//return opticalDepthX;
				if(depth<0.95){
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
				/* float max = max(max(diffuse.x, diffuse.y), diffuse.z);
				if(max > 1.0){
					diffuse = diffuse/max;
				} */


				gl_FragColor.rgb = diffuse;
				gl_FragColor.a = 1.0;
				

				//remove
				//gl_FragColor.rgb = vec3(atmosphereThickness);
				
			}`;
		return code;
	},

	depthPassFragmentShader: () => {
		let code = /* glsl */`
  		#include <packing>
		  #include <common>
		  #include <logdepthbuf_pars_fragment>

		    uniform float cameraNear;
			uniform float cameraFar;
			varying vec2 vUv;
			uniform sampler2D tDepth;
			
			float readDepth( sampler2D depthSampler, vec2 coord ) {
				float depth = texture2D( depthSampler, coord ).x;
			
				float logDepthBufFC = 2.0 / ( log( cameraFar + 1.0 ) / log(2.0) );
				float invViewZ = exp2(depth / (logDepthBufFC * 0.5)) - 1.0;
				return invViewZ;
				//return (viewZToOrthographicDepth( -invViewZ, cameraNear, cameraFar )*2.0)-1.0;
			  }

			vec2 PackDepth16( float depth ) {
    			float depthVal = depth * 0.9999847412109375;
    			vec3 encode = fract( depthVal * vec3(1.0, 256.0, 65536.0) );
    			return encode.xy - encode.yz / 256.0 + 0.001953125;
			}

			void main() {
				gl_FragColor.xy = PackDepth16(texture2D( tDepth, vUv ).x);
				gl_FragColor.zw = vec2(1.0);
			}`;
		return code;
	}
};

export { PostShader };
