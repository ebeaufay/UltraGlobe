import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Renderer } from './Renderer';
import {Planet} from './planet/Planet.js';

import nkEngine from "./nkEngine/NilkinsEngine.js" ;


init();

let renderer = null ;

function init() {
    // Original view ThreeJs
    var containerL = document.getElementById('screenL');
    containerL.style = "position: absolute; height:100%; width:50%; left: 0px; top:0px; background-color: gray;";
    document.body.appendChild(containerL);

    // New view nkEngine
    let containerR = document.getElementById("screenR") ;
    containerR.style = "position: absolute; height: 100%; width: 50%; right: 0px; top : 0px; background-color: black;" ;
    document.body.appendChild(containerL);

    // Load nkEngine
    nkEngine().then(
        function (nkEngine)
        {
            // Prepare ThreeJs part
            var scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);

            var camera = new THREE.PerspectiveCamera(50, window.offsetWidth / window.offsetHeight, 100, 63780000);
            camera.position.z = 4;

            // Setup renderer
            renderer = new Renderer(scene, containerL, containerR, camera, nkEngine);

            // Create planet
            var planet = new Planet(nkEngine, camera, new THREE.Vector3(0,0,0));
            scene.add(planet);
        }
    ).then(
        function ()
        {
            // Rendering loop
            animate();
            function animate() {
                renderer.render();
            }
        }
    ) ;
    
    
}


