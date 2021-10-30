import * as THREE from 'three';
import "regenerator-runtime/runtime.js";
import { Planet } from './planet/Planet.js';
import { WMSLayer } from './planet/WMSLayer.js';
import { ElevationFetcher } from './planet/ElevationFetcher';
import { ImageryFetcher } from './planet/ImageryFetcher';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController } from './controls/PanController.js';
import { RotateController } from './controls/RotateController.js';
import { ZoomController } from './controls/ZoomController.js';
import { Vector3 } from 'three';

var scene;
var domContainer;
var renderer;
var stats;
var camera;
var planet;
var controller;

initScene();
initDomContainer();
initCamera();
initRenderer();
initPlanet();
initController();
addElementsToScene();
animate();

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
}
function initDomContainer() {

    domContainer = document.getElementById('screen');
    domContainer.style = "position: absolute; height:100%; width:100%; left: 0px; top:0px;";
    document.body.appendChild(domContainer);
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.antialias = true;
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = false;

    renderer.setSize(domContainer.offsetWidth, domContainer.offsetHeight);
    domContainer.appendChild(renderer.domElement);

    stats = new Stats();
    //domContainer.appendChild(stats.dom);

    onWindowResize();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const aspect = domContainer.offsetWidth / domContainer.offsetHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const dpr = renderer.getPixelRatio();

    renderer.setSize(domContainer.offsetWidth, domContainer.offsetHeight);

}
function initCamera() {
    camera = new THREE.PerspectiveCamera(30, window.offsetWidth / window.offsetHeight, 1000, 63780000);
    camera.position.set(-6878000, 0, 0);
    camera.lookAt(new Vector3(0,6378000,0));
}

function initPlanet() {
    //var elevationLayer = new ElevationFetcher("http://35.205.106.141:8080/elevation", "1");
    //var imageryLayer = new ImageryFetcher("http://35.205.106.141:8080/imagery", "1")
    var elevationLayer = new ElevationFetcher("http://localhost:8080/elevation", "1");
    //var imageryLayer = new WMSLayer("https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv", "gebco_latest_2")
    var imageryLayer = new ImageryFetcher("http://localhost:8080/imagery", "1")
    planet = new Planet({
        camera: camera,
        center: new THREE.Vector3(0, 0, 0),
        radius: 6378000,
        imageryLayer: imageryLayer,
        elevationLayer: elevationLayer
    });
}

// Three doesn't offer a listener on camera position so we leave it up to the controller to call planet updates.
function initController(){
    controller = new PanController(camera, domContainer, planet);
    controller.append( new RotateController(camera, domContainer, planet));
    controller.append( new ZoomController(camera, domContainer, planet));
    domContainer.addEventListener('mousedown', (e) => {
        controller.event('mousedown', e);
    }, false);
    domContainer.addEventListener('mouseup', (e) => {
        controller.event('mouseup', e);
    }, false);
    domContainer.addEventListener('mousemove', (e) => {
        controller.event('mousemove', e);
    }, false);
    domContainer.addEventListener('mousewheel', (e) => {
        controller.event('mousewheel', e);
    }, false);
    domContainer.addEventListener('touchstart', (e) => {
        controller.event('touchstart', e);
    }, false);
    domContainer.addEventListener('touchmove', (e) => {
        controller.event('touchmove', e);
    }, false);
    domContainer.addEventListener('touchcancel', (e) => {
        controller.event('touchcancel', e);
    }, false);
    domContainer.addEventListener('touchend', (e) => {
        controller.event('touchend', e);
    }, false);
    

}
function addElementsToScene() {
    scene.add(planet);
}

function animate() {
    requestAnimationFrame(animate);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    stats.update();
}



