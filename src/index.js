/// Imports ----------------------------------

import "regenerator-runtime/runtime.js" ;

import {PanController} from "./controls/PanController.js" ;
import {ZoomController} from "./controls/ZoomController.js" ;

import nkEngine from "./nkEngine/NilkinsEngine.js" ;

import {Planet} from './planet/Planet.js' ;

import {Workers} from "./worker/Workers.js" ;

import {Renderer} from './Renderer' ;

/// Logic ------------------------------------

let renderer = null ;

init() ;

/// Functions --------------------------------

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
            const planet = new Planet (nkEngine, workers, new nkEngine.nkMaths.Vector (0, 0, 0)) ;

            // Prepare controllers
            const nkCamera = nkEngine.nkGraphics.CameraManager.getInstance().getDefaultCam() ;
            const panController = new PanController (nkEngine, nkCamera, nkView, planet) ;
            const zoomController = new ZoomController (nkEngine, nkCamera, nkView, planet) ;

            panController.append(zoomController) ;

            nkView.addEventListener('mousedown', (e) => {panController.event('mousedown', e) ;}, false) ;
            nkView.addEventListener('mouseup', (e) => {panController.event('mouseup', e) ;}, false) ;
            nkView.addEventListener('mousemove', (e) => {panController.event('mousemove', e) ;}, false) ;
            nkView.addEventListener('mousewheel', (e) => {panController.event('mousewheel', e) ;}, false) ;
            nkView.addEventListener('touchstart', (e) => {panController.event('touchstart', e) ;}, false) ;
            nkView.addEventListener('touchmove', (e) => {panController.event('touchmove', e) ;}, false) ;
            nkView.addEventListener('touchcancel', (e) => {panController.event('touchcancel', e) ;}, false) ;
            nkView.addEventListener('touchend', (e) => {panController.event('touchend', e) ;}, false) ;
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


