
const VideoPostShader = {
    vertexShader: () => `

    precision highp float;

	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

	}
    `,
    fragmentShader: () => `
precision highp float;

#include <packing>
		#include <common>
		#include <logdepthbuf_pars_fragment>

// Uniforms
uniform sampler2D tColor;          // Normal pass color texture
uniform sampler2D tWorld;     // Normal pass depth texture
uniform sampler2D tVideoColor;      // Video pass color texture
uniform sampler2D tVideoWorld;      // Video pass depth texture
uniform mat4 videoProjectionMatrix; // Video camera projection matrix
uniform mat4 videoViewMatrix;       // Video camera view matrix (inverse of matrixWorld)
uniform bool depthTest;
uniform bool chromaKeying;
uniform vec3 chromaKey;
uniform float chromaKeyTolerance;

varying vec2 vUv;


void main() {
    
    vec4 mainColor = texture2D(tColor, vUv);
    vec3 worldPosition = texture2D(tWorld, vUv).xyz;

    

    vec4 videoClipPos = videoProjectionMatrix * videoViewMatrix * vec4(worldPosition,1.0);
    videoClipPos /= videoClipPos.w;
    vec2 videoUV = videoClipPos.xy * 0.5+ 0.5;
    //videoUV.y = 1.0-videoUV.y;

    
    
    bool withinBounds = all(greaterThanEqual(videoUV, vec2(0.0))) && all(lessThanEqual(videoUV, vec2(1.0)));

    if (withinBounds) {
        
        if(!depthTest){
            gl_FragColor = texture2D(tVideoColor, videoUV);
            return;
        }
        
        vec3 videoWorldPosition = texture2D(tVideoWorld, videoUV).xyz;
        if(length(worldPosition - videoWorldPosition) < length(videoWorldPosition)*0.005){
            vec4 videoColor = texture2D(tVideoColor, videoUV);
            if(!chromaKeying || length(videoColor.xyz - chromaKey)>chromaKeyTolerance){
                gl_FragColor = texture2D(tVideoColor, videoUV);
            }else{
                gl_FragColor = mainColor;
            }
            
            
        }else{
            gl_FragColor = mainColor;
        }

    }else{
        gl_FragColor = mainColor;
    }

    

}
    `
}
export { VideoPostShader };