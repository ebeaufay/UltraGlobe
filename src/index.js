import "regenerator-runtime/runtime.js";
import {Renderer} from './Renderer';
import {Planet} from './planet/Planet.js';
import {Workers} from "./worker/Workers.js" ;
import nkEngine from "./nkEngine/NilkinsEngine.js" ;

init() ;

let renderer = null ;

function init()
{
    // Containing view
    let nkView = document.getElementById("nkView") ;
    nkView.style = "position: absolute; height: 100%; width: 100%; right: 0px; top : 0px; background-color: black;" ;
    document.body.appendChild(nkView) ;

    // Load nkEngine
    nkEngine().then(
        function (nkEngine)
        {
            // Launch our processing workers
            const workers = new Workers () ;

            // Setup renderer
            renderer = new Renderer (nkView, nkEngine) ;

            // Create planet
            new Planet (nkEngine, workers, new nkEngine.nkMaths.Vector (0, 0, 0)) ;
        }
    ).then(
        function ()
        {
            // Rendering loop
            animate();
            function animate ()
            {
                renderer.render() ;
            }
        }
    ) ;
}


