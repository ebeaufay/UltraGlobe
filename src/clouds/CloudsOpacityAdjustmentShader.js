const CloudsOpacityAdjustmentShader = {
    vertexShader: () =>/* glsl */`
	
	precision highp sampler3D;
	precision highp float;
	precision highp int;

	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}`,
    fragmentShader: ()=>`
    
    precision highp sampler3D;
	precision highp float;
	precision highp int;

    varying vec2 vUv;

    uniform sampler2D clouds;
    uniform sampler2D cloudsOpacityMultiplier;

    float Unpack24(vec3 packed) {
        vec4 unpacked = vec4(packed, 1.0);
        float depth = dot(unpacked, vec4(1.0, 1.0 / 256.0, 1.0 / 65536.0, 1.0 / 16777216.0));
        return depth / 0.9999847412109375;
    }

    void main() {
		gl_FragColor = texture(clouds, vUv);
        /*float temp = Unpack24(texture(cloudsOpacityMultiplier, vUv).xyz)*100.0;
        temp = mix(temp, pow(temp,0.3),step(1.0,temp));
		gl_FragColor.w = min( 1.0, gl_FragColor.w * temp);*/
        //gl_FragColor = vec4(vec3(Unpack24(texture(cloudsOpacityMultiplier, vUv).xyz)*200.0),1.0);
	}
    `
};
export{CloudsOpacityAdjustmentShader}