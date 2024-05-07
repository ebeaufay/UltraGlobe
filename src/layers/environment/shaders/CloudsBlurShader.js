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

		uniform sampler2D image;
		uniform sampler2D tDepth;
		uniform sampler2D cloudsDepth;
		uniform sampler2D noise2D;
		uniform vec2 offset;
		uniform float preserveMaxOpacity;
		varying vec2 vUv;

		
			
		void main() {

			vec4 center = texture2D( image, vUv );
			float cloudD = texture2D(cloudsDepth,vUv).x;
			
			vec4 noise = texture(noise2D, (vUv*4.0));
			vec2 offsetRand = (offset*0.5+offset*noise.xy)*cloudD*1.5;
			
			
			vec2 uv1 = vUv + offsetRand;
			vec2 uv2 = vUv - offsetRand;
			vec2 uv3 = vUv + offsetRand * vec2( 1., -1. );
			vec2 uv4 = vUv + offsetRand * vec2( -1., 1. );

			vec4 a = texture2D( image, uv1 );
			vec4 b = texture2D( image, uv2 );
			vec4 c = texture2D( image, uv3 );
			vec4 d = texture2D( image, uv4 );
			

			
			float centerDepth = texture2D( tDepth, vUv ).r;
			float centerHitSurface = smoothstep(0.75, 1.0, centerDepth);

			
			

			float wT = 0.0;

			float depthUV = texture2D( tDepth, uv1 ).r;
			float w = 1.0 - smoothstep(0.0,0.025,abs(centerDepth - depthUV));
			float w2 = 1.0 - abs(centerHitSurface-smoothstep(0.75,1.0,depthUV));
			gl_FragColor += 0.25*mix(center,a,mix(w,w2,smoothstep(0.7,0.8,min(depthUV,centerDepth))));

			depthUV = texture2D( tDepth, uv2 ).r;
			w = 1.0 - smoothstep(0.0,0.025,abs(centerDepth - depthUV));
			w2 = 1.0 - abs(centerHitSurface-smoothstep(0.75,1.0,depthUV));
			gl_FragColor += 0.25*mix(center, b,mix(w,w2,smoothstep(0.7,0.8,min(depthUV,centerDepth))));

			depthUV = texture2D( tDepth, uv3 ).r;
			w = 1.0 - smoothstep(0.0,0.025,abs(centerDepth - depthUV));
			w2 = 1.0 - abs(centerHitSurface-smoothstep(0.75,1.0,depthUV));
			gl_FragColor += 0.25*mix(center, c,mix(w,w2,smoothstep(0.7,0.8,min(depthUV,centerDepth))));

			depthUV = texture2D( tDepth, uv4 ).r;
			w = 1.0 - smoothstep(0.0,0.025,abs(centerDepth - depthUV));
			w2 = 1.0 - abs(centerHitSurface-smoothstep(0.75,1.0,depthUV));
			gl_FragColor += 0.25*mix(center, d,mix(w,w2,smoothstep(0.7,0.8,min(depthUV,centerDepth))));
			
			
		}`;
		


		
		return code;
	}
}
export { CloudsBlurShader };