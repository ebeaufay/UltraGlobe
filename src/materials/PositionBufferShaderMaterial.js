import * as THREE from 'three';


const vertexShader =/* glsl */`
precision highp float;

#include <common>
#include <logdepthbuf_pars_vertex>

varying vec4 vWorld;

void main() {


	#include <begin_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>

    vWorld = modelMatrix * vec4(position, 1.0);
    //gl_Position = projectionMatrix * viewMatrix * vWorld;

}

`;
const fragmentShader =/* glsl */`
precision highp float;
varying vec4 vWorld;

#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>

    gl_FragColor = vec4(vWorld.xyz,1.0);
}

`;

function PositionBufferShaderMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        depthTest: true,
        depthWrite: true,
        
        transparent: false,
        toneMapped: false,
        shadowSide: THREE.DoubleSide,
        premultipliedAlpha: false,
        precision: "highp"
    });
}
export { PositionBufferShaderMaterial };