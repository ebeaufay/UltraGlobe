import * as THREE from 'three';
import "regenerator-runtime/runtime.js";
import { Planet } from './planet/Planet.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController } from './controls/PanController.js';
import { RotateController } from './controls/RotateController.js';
import { ZoomController } from './controls/ZoomController.js';
import {LayerManager} from './layers/LayerManager.js';

class Map {

    /**
     * 
     * @param {
     *          divID: a div Id
     *        } properties
     */
    constructor(properties) {
        this.layerManager = new LayerManager()
        this.initScene();
        this.initDomContainer(properties.divID);
        this.initCamera();
        this.initRenderer();
        this.initPlanet();
        this.initController();
        this.addElementsToScene(this.planet);
        this.initStats();
        this.startAnimation();
    }

    setLayer(layer, index){
        this.layerManager.setLayer(layer, index);
    }
    getLayers(){
        return this.layerManager.getLayers();
    }
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }

    initDomContainer(divID) {
    
        this.domContainer = document.getElementById(divID);
        document.body.appendChild(this.domContainer);
    }
    
    initRenderer() {
        let self = this;
        self.renderer = new THREE.WebGLRenderer();
        self.renderer.antialias = true;
        
        self.renderer.setPixelRatio(window.devicePixelRatio);
        self.renderer.outputEncoding = THREE.sRGBEncoding;
        self.renderer.autoClear = false;
    
        self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        self.domContainer.appendChild(self.renderer.domElement);
    
        onWindowResize();
        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {
            self.camera.aspect = self.domContainer.offsetWidth / self.domContainer.offsetHeight;
            self.camera.updateProjectionMatrix();
            //const dpr = self.renderer.getPixelRatio();
            self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        }
    }

    initStats(){
        this.stats = new Stats();
        this.domContainer.appendChild(this.stats.dom);
    }
    
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(30, window.offsetWidth / window.offsetHeight, 1000, 63780000);
        this.camera.position.set(-40000000, 0, 0);
        this.camera.lookAt(new THREE.Vector3(0,6378000,0));
    }
    
    initPlanet() {
        
        this.planet = new Planet({
            camera: this.camera,
            center: new THREE.Vector3(0, 0, 0),
            radius: 6378000,
            layerManager: this.layerManager
        });
        
    }
    
    // Three doesn't offer a listener on camera position so we leave it up to the controller to call planet updates.
    initController(){
        this.controller = new PanController(this.camera, this.domContainer, this.planet);
        this.controller.append( new RotateController(this.camera, this.domContainer, this.planet));
        this.controller.append( new ZoomController(this.camera, this.domContainer, this.planet));
        this.domContainer.addEventListener('mousedown', (e) => {
            this.controller.event('mousedown', e);
        }, false);
        this.domContainer.addEventListener('mouseup', (e) => {
            this.controller.event('mouseup', e);
        }, false);
        this.domContainer.addEventListener('mousemove', (e) => {
            this.controller.event('mousemove', e);
        }, false);
        this.domContainer.addEventListener('mousewheel', (e) => {
            this.controller.event('mousewheel', e);
        }, false);
        this.domContainer.addEventListener('touchstart', (e) => {
            this.controller.event('touchstart', e);
        }, false);
        this.domContainer.addEventListener('touchmove', (e) => {
            this.controller.event('touchmove', e);
        }, false);
        this.domContainer.addEventListener('touchcancel', (e) => {
            this.controller.event('touchcancel', e);
        }, false);
        this.domContainer.addEventListener('touchend', (e) => {
            this.controller.event('touchend', e);
        }, false);
    
    
    }
    addElementsToScene(object) {
        this.scene.add(object);
    }
    
    startAnimation(){
        var self = this;
        function animate() {
            requestAnimationFrame(animate);
            self.camera.updateMatrixWorld();
            self.renderer.render(self.scene, self.camera);
            self.stats.update();
        }
        animate();
    }
    
    
    
}


export { Map };