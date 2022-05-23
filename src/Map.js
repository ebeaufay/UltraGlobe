import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Planet } from './planet/Planet.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController2 } from './controls/PanController2.js';
import { RotateController2 } from './controls/RotateController2.js';
import { ZoomController2 } from './controls/ZoomController2.js';
import { LayerManager } from './layers/LayerManager.js';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';
import { PostShader } from './PostShader.js';
import { MapNavigator } from "./MapNavigator.js";
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import opticalDepth from './images/optical_depth.png';
import { I3SLayer } from "./layers/i3s/I3SLayer.js";


// reused variables
const frustum = new THREE.Frustum();
const mat = new THREE.Matrix4();
const depths = new Uint8Array(4);
const depth16 = new THREE.Vector2();
const unpacker = new THREE.Vector2(1, 1 / 256);
const A = new THREE.Vector3();
const B = new THREE.Vector3();
const loader = new THREE.TextureLoader();
const degreeToRadians = Math.PI/180;

class Map {

    /**
     * 
     * @param {
     *          divID: a div Id
     *        } properties
     */
    constructor(properties) {
        this.layerManager = new LayerManager();
        this.scene = !!properties.scene?properties.scene:this.initScene();
        if(!!properties.domContainer){
            this.domContainer = properties.domContainer;
        }else if(!!properties.divID){
            this.domContainer = document.getElementById(properties.divID);
        }else{
            throw "cannot create Map without a domContainer or divID"
        }
        this.camera = !!properties.camera?properties.camera:this.initCamera();
        
        

        this.initPlanet();
        this.initController();
        this.scene.add(this.planet);
        this.initStats();
        this.setupRenderTarget();
        this.setupPost();
        this.initLabelRenderer();
        this.initRenderer();

        this.startAnimation();
        this.mapNavigator = new MapNavigator(this);
        
    }

    setLayer(layer, index) {
        if (layer instanceof OGC3DTilesLayer) {
            layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
        if (layer instanceof I3SLayer) {
            //layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
        this.layerManager.setLayer(layer, index);
    }

    removeLayer(index){
        this.layerManager.removeLayer(index);
    }
    getLayers() {
        return this.layerManager.getLayers();
    }
    initScene() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        scene.add(new THREE.AmbientLight(0xFFFFFF, 1.5));
        return scene;
        /*  var dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
         dirLight.position.set(49, 500, 151);
         dirLight.target.position.set(0, 0, 0);
 
         this.scene.add(dirLight);
         this.scene.add(dirLight.target); */
    }

    setupRenderTarget() {

        if (this.target) this.target.dispose();

        this.target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.target.texture.format = THREE.RGBAFormat;
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
        const self = this;
        this.postCamera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
        this.postMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: PostShader.fragmentShader(),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDiffuse: { value: null },
                tDepth: { value: null },
                radius: {value: 0 },
                xfov: {value: 0 },
                yfov: {value: 0 },
                planetPosition: {value: new THREE.Vector3(0,0,0)},
                nonPostCameraPosition: {value: new THREE.Vector3(0,0,0)},
                viewCenterFar: {value: new THREE.Vector3(0,0,0)},
                up: {value: new THREE.Vector3(0,0,0)},
                right: {value: new THREE.Vector3(0,0,0)},
                heightAboveSeaLevel: {value: 0},
                opticalDepth:{value: null}
            }
        });

        loader.load(
            // resource URL
            opticalDepth,
        
            // onLoad callback
            function ( texture ) {
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                self.postMaterial.uniforms.opticalDepth.value =texture;
            },
            undefined,
            function ( err ) {
                console.error( 'An error happened: '+err );
            }
        );

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
        //self.renderer.debug.checkShaderErrors = false;
        self.renderer.setPixelRatio(window.devicePixelRatio);
        self.renderer.setSize(window.innerWidth, window.innerHeight);

        self.renderer.outputEncoding = THREE.sRGBEncoding;
        self.renderer.autoClear = false;
        self.renderer.domElement.style.overflow = "hidden";
        self.domContainer.appendChild(self.renderer.domElement);
        
        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {

            const aspect = window.innerWidth / window.innerHeight;
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();

            
            self.target.setSize(window.innerWidth, window.innerHeight);
            self.depthTarget.setSize(window.innerWidth, window.innerHeight);
            self.renderer.setSize(window.innerWidth, window.innerHeight);
            self.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        }
        onWindowResize();
    }

    initLabelRenderer() {
        this.labelRenderer = new CSS3DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
    }

    initStats() {
        this.stats = new Stats();
        this.domContainer.appendChild(this.stats.dom);
    }


    initCamera() {
        const camera = new THREE.PerspectiveCamera(30, window.offsetWidth / window.offsetHeight, 0.01, 40);
        camera.position.set(40000000, 0, 0);
        camera.up.set(0,0,1)
        camera.lookAt(new THREE.Vector3(-0, 0, 10000));
        camera.updateProjectionMatrix();
        
        return camera;
    }

    initPlanet() {

        this.planet = new Planet({
            camera: this.camera,
            center: new THREE.Vector3(0, 0, 0),
            
            layerManager: this.layerManager
        });
        this.resetCameraNearFar();
    }


    // Three doesn't offer a listener on camera position so we leave it up to the controller to call planet updates.
    initController() {
        const self = this;
        self.controller = new PanController2(self.camera, self.domContainer, self);
        self.controller.append(new RotateController2(self.camera, self.domContainer, self));
        self.controller.append(new ZoomController2(self.camera, self.domContainer, self));
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
        document.addEventListener("mouseleave", function(event){

            if(event.clientY <= 0 || event.clientX <= 0 || (event.clientX >= window.innerWidth || event.clientY >= window.innerHeight))
            {
                
                self.controller.event('mouseup', {which: "all"});
          
            }
          });

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

            self.controller.update();

            frustum.setFromProjectionMatrix(mat.multiplyMatrices(self.camera.projectionMatrix, self.camera.matrixWorldInverse));
            //self.planet.cull(frustum);

            self.camera.updateMatrixWorld();

            self.renderer.setRenderTarget(self.target);
            self.renderer.render(self.scene, self.camera);

            self.depthPassMaterial.uniforms.tDepth.value = self.target.depthTexture;

            /// post params
            self.postMaterial.uniforms.tDiffuse.value = self.target.texture;
            self.postMaterial.uniforms.tDepth.value = self.target.depthTexture;
            self.postMaterial.uniforms.cameraNear.value = self.camera.near;
            self.postMaterial.uniforms.cameraFar.value = self.camera.far;
            self.postMaterial.uniforms.radius.value = 6356752.3142;
            self.postMaterial.uniforms.xfov.value = 2 * Math.atan( Math.tan( self.camera.fov * Math.PI / 180 / 2 ) * self.camera.aspect ) * 180 / Math.PI;
            self.postMaterial.uniforms.yfov.value = self.camera.fov;
            self.postMaterial.uniforms.planetPosition.value = self.planet.position;
            self.postMaterial.uniforms.nonPostCameraPosition.value = self.camera.position;
            
            
            self.camera.getWorldDirection(self.postMaterial.uniforms.viewCenterFar.value).normalize();
            self.postMaterial.uniforms.up.value = self.camera.up.normalize();
            self.postMaterial.uniforms.right.value.crossVectors(self.camera.up, self.postMaterial.uniforms.viewCenterFar.value);
            self.postMaterial.uniforms.viewCenterFar.value.multiplyScalar(self.camera.far).add(self.camera.position);

            self.postMaterial.uniforms.heightAboveSeaLevel.value = self.camera.position.length()-6356752.3142;
            
            self.renderer.setRenderTarget(self.depthTarget);
            self.renderer.render(self.depthScene, self.postCamera);

            self.renderer.setRenderTarget(null);
            self.renderer.render(self.postScene, self.postCamera);
            self.labelRenderer.render(self.scene, self.camera);
            self.stats.update();
        }
        animate();
    }

    resetCameraNearFar() {
        const geodeticCameraPosition = this.planet.llhToCartesian.inverse(this.camera.position);
		B.set(geodeticCameraPosition.x * degreeToRadians, geodeticCameraPosition.y * degreeToRadians)
        const distToGround = geodeticCameraPosition.z - this.planet.getTerrainElevation(B);
        
        this.camera.near = Math.max(distToGround * 0.25, 1.25);
        const distanceToHorizon = Math.sqrt(2 * this.planet.a * Math.abs(geodeticCameraPosition.z) + geodeticCameraPosition.z * geodeticCameraPosition.z); // estimation
        this.camera.far = Math.max(10000, Math.max(distanceToHorizon * 1.5, this.camera.near*50000));
        this.camera.updateProjectionMatrix();
        
    }
    moveCameraAboveSurface(){
        let geodeticCameraPosition = this.planet.llhToCartesian.inverse(this.camera.position);
        //A.copy(this.camera.position).sub(this.planet.center);
        //A.normalize();
		B.set(geodeticCameraPosition.x * degreeToRadians, geodeticCameraPosition.y * degreeToRadians);

        const distToGround = geodeticCameraPosition.z - this.planet.getTerrainElevation(B);
        if(distToGround<10){
            geodeticCameraPosition.z += (10-distToGround);
            geodeticCameraPosition = this.planet.llhToCartesian.forward(geodeticCameraPosition);
            this.camera.position.set(geodeticCameraPosition.x, geodeticCameraPosition.y, geodeticCameraPosition.z);
        }
    }


    screenPixelRayCast(x, y, sideEffect) {
        this.renderer.readRenderTargetPixels(this.depthTarget, x, (this.domContainer.offsetHeight - y), 1, 1, depths);

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