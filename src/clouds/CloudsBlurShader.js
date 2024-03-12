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

	fragmentShader: (screenWidth, screenHeight) => {
		
		let code = /* glsl */`
		precision highp float;

		uniform sampler2D image;
		uniform sampler2D mask;
		uniform sampler2D noise2D;
		uniform vec2 offset;
		uniform float preserveMaxOpacity;
		varying vec2 vUv;
			
		float xorFloats(float a, float b) {
			return a + b - 2.0 * a * b;
		}
		void main() {

			vec4 noise = (vec4(-0.5)+texture(noise2D, (vUv+(offset/vec2(`+screenWidth.toFixed(1)+`,`+screenHeight.toFixed(1)+`)))*500.0))*0.001;
			vec4 center = texture2D( image, vUv );
			vec4 centerMask = texture2D( mask, vUv );

			vec2 offsetRand = offset+noise.xy;
			
			vec2 uv1 = vUv + offsetRand;
			vec2 uv2 = vUv - offsetRand;
			vec2 uv3 = vUv + offsetRand * vec2( 1., -1. );
			vec2 uv4 = vUv + offsetRand * vec2( -1., 1. );

			float centerHitSurface = centerMask.a;

			float totalWeight = 0.0;
			float totalWeightColor = 0.0;

			vec4 local = texture2D( image, uv1 );
			float localHitSurface = texture(mask,uv1).a; // 1 means ground
			float weight = 1.0 - abs(centerHitSurface - localHitSurface);
			local = mix(center, local, weight);
			weight = 1.0+noise.x;
			totalWeight += weight;
			float weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;


			local = texture2D( image, uv2 );
			localHitSurface = texture(mask,uv2).a; // 1 means ground
			weight = 1.0 - abs(centerHitSurface - localHitSurface);
			local = mix(center, local, weight);
			weight = 1.0+noise.y;
			totalWeight += weight;
			weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;

			local = texture2D( image, uv3 );
			localHitSurface = texture(mask,uv3).a; // 1 means ground
			weight = 1.0 - abs(centerHitSurface - localHitSurface);
			local = mix(center, local, weight);
			weight = 1.0+noise.z;
			totalWeight += weight;
			weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;

			local = texture2D( image, uv4 );
			localHitSurface = texture(mask,uv4).a; // 1 means ground
			weight = 1.0 - abs(centerHitSurface - localHitSurface);
			local = mix(center, local, weight);
			weight = 1.0+noise.w;
			totalWeight += weight;
			weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;

			
			if(totalWeight == 0.0){
				gl_FragColor = center;
			}else{
				gl_FragColor.w/=totalWeight;
				gl_FragColor.xyz/=totalWeightColor;
			}
			gl_FragColor.w = mix(gl_FragColor.w, center.w, preserveMaxOpacity);
			/* gl_FragColor = .25 * (
				texture2D( image, vUv + offset )
				+ texture2D( image, vUv - offset )
				+ texture2D( image, vUv + offset * vec2( 1., -1. ) )
				+ texture2D( image, vUv + offset * vec2( -1., 1. ) )
			  ); */
			
			  


			
		}`;
		


		
		return code;
	}
}
export { CloudsBlurShader };