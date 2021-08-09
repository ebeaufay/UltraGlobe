import * as THREE from 'three';
import { Renderer } from './Renderer';
import "regenerator-runtime/runtime.js";
import {Planet} from './planet/Planet.js';


init();


function init() {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    var container = document.getElementById('screen');
    container.style = "position: absolute; height:100%; width:100%; left: 0px; top:0px;";
    document.body.appendChild(container);
    var camera = new THREE.PerspectiveCamera(50, window.offsetWidth / window.offsetHeight, 100, 63780000);
    camera.position.z = 4;


    var renderer = new Renderer(scene, container, camera);

    var planet = new Planet(camera, new THREE.Vector3(0,0,0));
    scene.add(planet);
    
    animate();
    function animate() {
        renderer.render();
    }
}


