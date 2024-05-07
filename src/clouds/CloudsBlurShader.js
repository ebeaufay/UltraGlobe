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

	fragmentShader: () => {
		
		let code = /* glsl */`
		precision highp float;

		uniform sampler2D image;
		uniform sampler2D tDepth;
		uniform sampler2D noise2D;
		uniform vec2 offset;
		uniform float preserveMaxOpacity;
		varying vec2 vUv;

		
			
		float xorFloats(float a, float b) {
			return a + b - 2.0 * a * b;
		}
		void main() {

			vec4 noise = texture(noise2D, (vUv*10.0));
			vec4 center = texture2D( image, vUv );
			float centerHitSurface = step(0.999, texture2D( tDepth, vUv ).r);

			vec2 offsetRand = offset*0.5+offset*1.0*noise.xy;
			
			
			vec2 uv1 = vUv + offsetRand;
			vec2 uv2 = vUv - offsetRand;
			vec2 uv3 = vUv + offsetRand * vec2( 1., -1. );
			vec2 uv4 = vUv + offsetRand * vec2( -1., 1. );


			float totalWeight = 0.0;
			float totalWeightColor = 0.0;

			vec4 local = texture2D( image, uv1 );
			float localHitSurface = step(0.999, texture2D( tDepth, uv1 ).r);
			float weight = 1.0 - abs(centerHitSurface - localHitSurface);//*(0.8+noise.x*0.2);
			//local = mix(center, local, weight);
			weight *=noise.x;
			totalWeight += weight;
			float weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;


			local = texture2D( image, uv2 );
			localHitSurface = step(0.999, texture2D( tDepth, uv2 ).r);
			weight = 1.0 - abs(centerHitSurface - localHitSurface);//*(0.8+noise.y*0.2);
			//local = mix(center, local, weight);
			weight *=noise.y;
			totalWeight += weight;
			weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;

			local = texture2D( image, uv3 );
			localHitSurface = step(0.999, texture2D( tDepth, uv3 ).r);
			weight = 1.0 - abs(centerHitSurface - localHitSurface);//*(0.8+noise.z*0.2);
			//local = mix(center, local, weight);
			weight *=noise.z;
			totalWeight += weight;
			weightColor = weight*local.w;
			totalWeightColor += weightColor;
			gl_FragColor.xyz += local.xyz*weightColor;
			gl_FragColor.w += local.w*weight;

			local = texture2D( image, uv4 );
			localHitSurface = step(0.999, texture2D( tDepth, uv4 ).r);
			weight = 1.0 - abs(centerHitSurface - localHitSurface);//*(0.8+noise.a*0.2);
			//local = mix(center, local, weight);
			weight *=noise.w;
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