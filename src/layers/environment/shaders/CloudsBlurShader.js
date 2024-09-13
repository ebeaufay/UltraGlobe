/**kawase blur pass**/
const CloudsBlurShader = {
	vertexShader: () =>/* glsl */`
	precision highp float;
	precision highp int;

	varying vec2 vUv;
	
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,

	// a mostly basic kawase blur but it avoids bluring samples together when the depth is very different excepth when the depth is very large.
	// it also adds some randomness to the samples positions to remove the resulting banding

	fragmentShader: () => {

		let code = /* glsl */`
		precision highp float;

		#include <packing>

		uniform sampler2D image;
		uniform sampler2D tDepth;
		uniform sampler2D cloudsDepth;
		uniform sampler2D noise2D;
		uniform vec2 offset;
		uniform float preserveMaxOpacity;
		uniform float cameraNear;
		uniform float cameraFar;
		uniform float ldf;
		varying vec2 vUv;

		
			
		float readDepth( sampler2D depthSampler, vec2 coord ) {
			vec4 fragCoord = texture2D( depthSampler, coord );
			float invViewZ = exp2(fragCoord.x / (ldf * 0.5)) - 1.0;
			return mix(cameraNear, cameraFar,viewZToOrthographicDepth( -invViewZ, cameraNear, cameraFar ));


			//return mix(cameraNear, cameraFar,viewZToOrthographicDepth(1.0 - exp2(texture2D(depthSampler, coord).x * log(cameraFar + 1.0) / log(2.0)),cameraNear, cameraFar));
		}

		
		float toRealDepth(float normalizedCloudDepth ){
			return mix(cameraNear, cameraFar, normalizedCloudDepth);
			//return (normalizedCloudDepth*(cameraFar-cameraNear))+cameraNear;
		}

		
		
		void main() {

			vec4 center = texture2D( image, vUv );
			if(center.a == 0.0) return;
			//gl_FragColor = vec4(center.a, 0.0,0.0,center.a);
			//return;
			float cloudD = texture2D(cloudsDepth,vUv).x;
			
			vec4 noise = texture(noise2D, fract((vUv*4.0)));
			vec2 offsetRand = (offset*0.5+offset*noise.xw)*min(max(cloudD*4.0,0.5),1.0)*pow(center.a,2.0);
			//vec2 offsetRand = (offset)*min(0.8,cloudD*4.0*center.a);//min(max(cloudD*4.0,0.5),1.0);
			
			
			vec2 uv1 = vUv + offsetRand;
			vec2 uv2 = vUv - offsetRand;
			vec2 uv3 = vUv + offsetRand * vec2( 1., -1. );
			vec2 uv4 = vUv + offsetRand * vec2( -1., 1. );

			
			vec4 a = texture2D( image, uv1 );
			vec4 b = texture2D( image, uv2 );
			vec4 c = texture2D( image, uv3 );
			vec4 d = texture2D( image, uv4 );
			
			
			
			float centerDepth = readDepth( tDepth, vUv );
			float centerOrder = step(centerDepth, toRealDepth(cloudD));
			

			float centerLuminosity = (center.r*0.2126 + center.g*0.7152 + center.b*0.0722);

			//float localOrder = step(readDepth( tDepth, uv1 ), toRealDepth(texture2D(cloudsDepth,uv1).x));
			float w = 1.0;
			w*=pow(a.a,2.0);
			vec4 newColor = mix(center,a,w);
			gl_FragColor += 0.25*newColor;

			//localOrder = step(readDepth( tDepth, uv2 ), toRealDepth(texture2D(cloudsDepth,uv2).x));
			w = 1.0;
			w*=pow(b.a,2.0);
			newColor = mix(center,b,w);
			gl_FragColor += 0.25*newColor;

			//localOrder = step(readDepth( tDepth, uv3 ), toRealDepth(texture2D(cloudsDepth,uv3).x));
			w = 1.0;
			w*=pow(c.a,2.0);
			newColor = mix(center,c,w);
			gl_FragColor += 0.25*newColor;

			//localOrder = step(readDepth( tDepth, uv4 ), toRealDepth(texture2D(cloudsDepth,uv4).x));
			w = 1.0;
			w*=pow(d.a,2.0);
			newColor = mix(center,d,w);
			gl_FragColor += 0.25*newColor;
			gl_FragColor.w = gl_FragColor.w;
			
			
		}`;




		return code;
	}
}
export { CloudsBlurShader };