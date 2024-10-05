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

		float whiteNoise(vec2 uv) {
    		return fract(sin(dot(uv.xy ,vec2(12.9898,78.233))) * 43758.5453123);
		}
		
		void main() {

    vec4 center = texture2D(image, vUv);
    //if (center.a == 0.0) return;

    // Fetch cloud depth and generate noise
    float cloudD = texture2D(cloudsDepth, vUv).x;
    float noiseX = whiteNoise(vUv * 4.0);
    float noiseY = whiteNoise(vUv * 4.0 + vec2(0.0, 1.0));
    vec2 noiseVec = vec2(noiseX, noiseY);

    // Compute scaling factors
    float cloudFactor = cloudD * 4.0;
    float alphaFactor = center.a * center.a;
    float scaleFactor = clamp(cloudFactor * alphaFactor, 0.5, 1.0);

    // Calculate random offset
    vec2 offsetRand = offset * scaleFactor * (0.5 + noiseVec);

    // Compute sample coordinates
    vec2 uv1 = vUv + offsetRand;
    vec2 uv2 = vUv - offsetRand;
    vec2 uv3 = vUv + offsetRand * vec2(1.0, -1.0);
    vec2 uv4 = vUv + offsetRand * vec2(-1.0, 1.0);

    // Fetch neighboring samples
    vec4 a = texture2D(image, uv1);
    vec4 b = texture2D(image, uv2);
    vec4 c = texture2D(image, uv3);
    vec4 d = texture2D(image, uv4);

    // Initialize the output color
    gl_FragColor = vec4(0.0);

    
    #define APPLY_SAMPLE(sampleColor) { \
        float diff = 1.0 - abs(center.a - sampleColor.a); \
        float w = pow(diff,4.0); \
        gl_FragColor += 0.25 * mix(center, sampleColor, w); \
    }

    // Apply samples
    APPLY_SAMPLE(a);
    APPLY_SAMPLE(b);
    APPLY_SAMPLE(c);
    APPLY_SAMPLE(d);

    // Preserve the alpha channel
	gl_FragColor.a = mix(gl_FragColor.a, center.a, pow(length(center.xyz)/1.73205,0.25));
	//gl_FragColor.a = center.a;
}`;




		return code;
	}
}
export { CloudsBlurShader };