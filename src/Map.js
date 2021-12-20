import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Planet } from './planet/Planet.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController } from './controls/PanController.js';
import { RotateController } from './controls/RotateController.js';
import { ZoomController } from './controls/ZoomController.js';
import { LayerManager } from './layers/LayerManager.js';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';
import { PostShader } from './PostShader.js';
import { MapNavigator } from "./MapNavigator.js";

// reused variables
const frustum = new THREE.Frustum();
const mat = new THREE.Matrix4();
const depths = new Uint8Array(4);
const depth16 = new THREE.Vector2();
const unpacker = new THREE.Vector2(1, 1 / 256);
const A = new THREE.Vector3();
const B = new THREE.Vector3();


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
        this.initPlanet();
        this.initController();
        this.addElementsToScene(this.planet);
        this.initStats();
        this.setupRenderTarget();
        this.setupPost();
        this.initRenderer();

        this.startAnimation();
        this.mapNavigator = new MapNavigator(this);
    }

    setLayer(layer, index) {
        if (layer instanceof OGC3DTilesLayer) {
            layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
        this.layerManager.setLayer(layer, index);
    }
    getLayers() {
        return this.layerManager.getLayers();
    }
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));

        /*  var dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
         dirLight.position.set(49, 500, 151);
         dirLight.target.position.set(0, 0, 0);
 
         this.scene.add(dirLight);
         this.scene.add(dirLight.target); */
    }

    initDomContainer(divID) {

        this.domContainer = document.getElementById(divID);
        document.body.appendChild(this.domContainer);
    }

    setupRenderTarget() {

        if (this.target) this.target.dispose();

        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.target.texture.format = THREE.RGBFormat;
        this.target.texture.encoding = THREE.sRGBEncoding;
        this.target.texture.minFilter = THREE.LinearFilter;
        this.target.texture.magFilter = THREE.LinearFilter;
        this.target.texture.generateMipmaps = false;
        this.target.stencilBuffer = false;
        this.target.depthBuffer = true;
        this.target.depthTexture = new THREE.DepthTexture();
        this.target.depthTexture.format = THREE.DepthFormat;
        this.target.depthTexture.type = THREE.UnsignedShortType;

        // the depth render target is used to render depth to the main texture so that it can read retrieved on the CPU
        if (this.depthTarget) this.depthTarget.dispose();

        this.depthTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.depthTarget.texture.format = THREE.RGBAFormat;
        this.depthTarget.texture.minFilter = THREE.NearestFilter;
        this.depthTarget.texture.magFilter = THREE.NearestFilter;
        this.depthTarget.texture.generateMipmaps = false;
        this.depthTarget.stencilBuffer = false;
        this.depthTarget.depthBuffer = false;
    }


    setupPost() {

        // Setup post processing stage
        this.postCamera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
        this.postMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: PostShader.fragmentShader(),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDiffuse: { value: null },
                tDepth: { value: null }
            }
        });

        this.depthPassMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: PostShader.depthPassFragmentShader(),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDepth: { value: null }
            }
        });
        const postPlane = new THREE.PlaneGeometry(2, 2);
        const postQuad = new THREE.Mesh(postPlane, this.postMaterial);
        this.postScene = new THREE.Scene();
        this.postScene.add(postQuad);

        const depthPostQuad = new THREE.Mesh(postPlane, this.depthPassMaterial);
        this.depthScene = new THREE.Scene();
        this.depthScene.add(depthPostQuad);
    }

    initRenderer() {
        let self = this;
        self.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
        self.renderer.setPixelRatio(window.devicePixelRatio);
        self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);

        self.renderer.outputEncoding = THREE.sRGBEncoding;
        self.renderer.autoClear = false;

        self.domContainer.appendChild(self.renderer.domElement);

        onWindowResize();
        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {
            self.camera.aspect = self.domContainer.offsetWidth / self.domContainer.offsetHeight;
            self.camera.updateProjectionMatrix();
            //const dpr = self.renderer.getPixelRatio();
            self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        }
        onWindowResize();
        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {

            const aspect = window.innerWidth / window.innerHeight;
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();

            const dpr = self.renderer.getPixelRatio();
            self.target.setSize(self.domContainer.offsetWidth * dpr, self.domContainer.offsetHeight * dpr);
            self.depthTarget.setSize(self.domContainer.offsetWidth * dpr, self.domContainer.offsetHeight * dpr);
            self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        }
    }

    initStats() {
        this.stats = new Stats();
        this.domContainer.appendChild(this.stats.dom);
    }


    initCamera() {
        this.camera = new THREE.PerspectiveCamera(30, window.offsetWidth / window.offsetHeight, 1, 4000000);
        this.camera.position.set(-40000000, 0, 0);
        this.camera.lookAt(new THREE.Vector3(0, 100, 0));
    }

    initPlanet() {

        this.planet = new Planet({
            camera: this.camera,
            center: new THREE.Vector3(0, 0, 0),
            radius: 6378000,
            layerManager: this.layerManager
        });

        this.resetCameraNearFar();
    }


    // Three doesn't offer a listener on camera position so we leave it up to the controller to call planet updates.
    initController() {
        const self = this;
        self.controller = new PanController(self.camera, self.domContainer, self);
        self.controller.append(new RotateController(self.camera, self.domContainer, self));
        self.controller.append(new ZoomController(self.camera, self.domContainer, self));
        self.domContainer.addEventListener('mousedown', (e) => {
            if(!!self.controller) self.controller.event('mousedown', e);
        }, false);
        self.domContainer.addEventListener('mouseup', (e) => {
            if(!!self.controller) self.controller.event('mouseup', e);
        }, false);
        self.domContainer.addEventListener('mousemove', (e) => {
            if(!!self.controller) self.controller.event('mousemove', e);
        }, false);
        self.domContainer.addEventListener('wheel', (e) => {
            if(!!self.controller) self.controller.event('mousewheel', e);
        }, false);
        self.domContainer.addEventListener('touchstart', (e) => {
            if(!!self.controller) self.controller.event('touchstart', e);
        }, false);
        self.domContainer.addEventListener('touchmove', (e) => {
            if(!!self.controller) self.controller.event('touchmove', e);
        }, false);
        self.domContainer.addEventListener('touchcancel', (e) => {
            if(!!self.controller) self.controller.event('touchcancel', e);
        }, false);
        self.domContainer.addEventListener('touchend', (e) => {
            if(!!self.controller) self.controller.event('touchend', e);
        }, false);

        /* //// mousewheel ////
        if (this.domContainer.addEventListener) {
            // IE9, Chrome, Safari, Opera
            this.domContainer.addEventListener("mousewheel", mouseWheelHandler, false);
            // Firefox
            this.domContainer.addEventListener("DOMMouseScroll", mouseWheelHandler, false);
        }
        // IE 6/7/8
        else {
            this.domContainer.attachEvent("onmousewheel", mouseWheelHandler);
        }
        const mouseWheelHandler = (e) => {
            if(!!this.controller) this.controller.event('mousewheel', e);
        } */

    }
    addElementsToScene(object) {
        this.scene.add(object);
    }

    startAnimation() {
        var self = this;
        /* function animate() {
            requestAnimationFrame(animate);
            self.camera.updateMatrixWorld();
            self.renderer.render(self.scene, self.camera);
            self.stats.update();
        } */
        function animate() {
            requestAnimationFrame(animate);

            frustum.setFromProjectionMatrix(mat.multiplyMatrices(self.camera.projectionMatrix, self.camera.matrixWorldInverse));
            //self.planet.cull(frustum);

            self.camera.updateMatrixWorld();

            self.renderer.setRenderTarget(self.target);
            self.renderer.render(self.scene, self.camera);

            self.depthPassMaterial.uniforms.tDepth.value = self.target.depthTexture;

            self.postMaterial.uniforms.tDiffuse.value = self.target.texture;
            self.postMaterial.uniforms.tDepth.value = self.target.depthTexture;

            self.renderer.setRenderTarget(self.depthTarget);
            self.renderer.render(self.depthScene, self.postCamera);


            self.renderer.setRenderTarget(null);
            self.renderer.render(self.postScene, self.postCamera);
            self.stats.update();
        }
        animate();
    }

    resetCameraNearFar() {
        const distToMSE = this.planet.center.distanceTo(this.camera.position) - this.planet.radius;
        A.copy(this.camera.position).sub(this.planet.center);
        A.normalize();
		B.set(Math.atan2(A.z, -A.x), Math.asin(A.y))
        const distToGround = distToMSE - this.planet.getTerrainElevation(B);
        this.planet.getTerrainElevation(B);

        this.camera.near = Math.max(distToGround * 0.5, 2);
        this.camera.far = Math.max(10000, Math.sqrt(2 * this.planet.radius * distToMSE + distToMSE * distToMSE) * 2);
        this.camera.updateProjectionMatrix();
        
    }


    screenPixelRayCast(x, y, sideEffect) {
        const dpr = this.renderer.getPixelRatio();
        this.renderer.readRenderTargetPixels(this.depthTarget, x * dpr, (this.domContainer.offsetHeight - y) * dpr, 1, 1, depths);

        depth16.set(depths[0], depths[1]);
        let z = depth16.dot(unpacker)
        z = (z * 0.00390630960555428397039749752041);
        if (z == 1) {
            sideEffect.copy(this.camera.position);
            return;
        }
        z = perspectiveDepthToViewZ(z, this.camera.near, this.camera.far);
        x = (x / this.domContainer.offsetWidth) * 2 - 1;
        y = (1 - (y / this.domContainer.offsetHeight)) * 2 - 1;
        const clipSpacePosition = new THREE.Vector3(x, y, 0.5);
        mat.copy(this.camera.projectionMatrix).invert();
        clipSpacePosition.applyMatrix4(this.camera.projectionMatrixInverse);
        clipSpacePosition.multiplyScalar(z / clipSpacePosition.z);
        clipSpacePosition.applyMatrix4(this.camera.matrixWorld);

        sideEffect.set(clipSpacePosition.x, clipSpacePosition.y, clipSpacePosition.z);
    }
    checkCameraCollision(){
        this.planet.heightAboveElevation();
    }

    moveCameraAboveSurface(){
        A.copy(this.camera.position).sub(this.planet.center);
        A.normalize();
		B.set(Math.atan2(A.z, -A.x), Math.asin(A.y))
        
		let elevation = this.planet.getTerrainElevation(B)+this.planet.radius;
        if(this.planet.center.distanceTo(this.camera.position)<elevation){
            this.camera.position.normalize().multiplyScalar(elevation+5);
        }
    }

    moveCamera(location, lookAt){
        
        this.camera.position.set(location);
        this.camera.lookAt(lookAt);
        let p1 = new THREE.Vector3();
        let p2 = new THREE.Vector3();
        let p3 = new THREE.Vector3();
        this.camera.getWorldDirection(p1).normalize();
		p2.copy(this.planet.center).sub(this.camera.position);

		p3.crossVectors(p1, p2);
		this.camera.up.crossVectors(p1, p3);

		this.moveCameraAboveSurface();
        this.resetCameraNearFar();
    }
}

function perspectiveDepthToViewZ(invClipZ, near, far) {
    return (near * far) / ((far - near) * invClipZ - far);
}

export { Map };