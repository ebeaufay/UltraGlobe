
const CloudTemporalAccumulationShader = {
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

		#include <packing>

		uniform sampler2D previousFrame;
		uniform sampler2D currentFrame;

		uniform float blendFactor;
		varying vec2 vUv;
		

		

		void main() {

			vec4 currentColor = texture2D(currentFrame, vUv);
			vec4 previousColor = texture2D(previousFrame, vUv);
			gl_FragColor = mix(previousColor, currentColor, blendFactor +currentColor.a*0.01);//+currentColor.a*0.01);
		}`;
		
		
		return code;
	}
}
export { CloudTemporalAccumulationShader };