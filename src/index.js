import "regenerator-runtime/runtime.js";
import { Renderer } from './Renderer';
import {Planet} from './planet/Planet.js';

import nkEngine from "./nkEngine/NilkinsEngine.js" ;


init();

let renderer = null ;

function init() {
    // Containing view
    let nkView = document.getElementById("nkView") ;
    nkView.style = "position: absolute; height: 100%; width: 100%; right: 0px; top : 0px; background-color: black;" ;
    document.body.appendChild(nkView);

    // Load nkEngine
    nkEngine().then(
        function (nkEngine)
        {
            // Setup renderer
            renderer = new Renderer(nkView, nkEngine);

            // Create planet
            new Planet(nkEngine, new nkEngine.nkMaths.Vector (0, 0, 0));
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


