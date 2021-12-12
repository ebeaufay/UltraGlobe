/**
 * Shader for planet tiles
 */


const PostShader = {

	vertexShader: () =>/* glsl */`

	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,

	fragmentShader: () => {
		let code = /* glsl */`
		#include <packing>

			varying vec2 vUv;
			uniform sampler2D tDiffuse;
			uniform sampler2D tDepth;
			uniform float cameraNear;
			uniform float cameraFar;


			float readDepth( sampler2D depthSampler, vec2 coord ) {
				float fragCoordZ = texture2D( depthSampler, coord ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			}

			void main() {
				vec3 diffuse = texture2D( tDiffuse, vUv ).rgb;
				float depth = readDepth( tDepth, vUv );

				gl_FragColor.rgb = diffuse;
				gl_FragColor.a = 1.0;
			}`;
		return code;
	},

	depthPassFragmentShader: () => {
		let code = /* glsl */`
		#include <packing>

			varying vec2 vUv;
			uniform sampler2D tDepth;

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
