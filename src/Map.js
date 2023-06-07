import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Planet } from './planet/Planet.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController } from './controls/PanController.js';
import { RotateController } from './controls/RotateController.js';
import { ZoomController } from './controls/ZoomController.js';
import { SelectController } from './controls/SelectController.js';
import { LayerManager } from './layers/LayerManager.js';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';
import { PostShader } from './PostShader.js';
import { MapNavigator } from "./MapNavigator.js";
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import opticalDepth from './images/optical_depth_old.png';
import { I3SLayer } from "./layers/i3s/I3SLayer.js";
import { Controller } from "./controls/Controller.js";
import { ShadowMapViewer } from 'three/addons/utils/ShadowMapViewer.js';
import { getSunPosition } from "./Sun";


// reused variables
const frustum = new THREE.Frustum();
const mat = new THREE.Matrix4();
const depths = new Uint8Array(4);
const depth24 = new THREE.Vector3();
const unpacker = new THREE.Vector3(1, 1 / 256, 1 / (256 * 256));
const A = new THREE.Vector3();
const B = new THREE.Vector3();
const VEC4 = new THREE.Vector4();
const shadowTarget = new THREE.Vector3();
const sunToTarget = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const loader = new THREE.TextureLoader();
const degreeToRadians = Math.PI / 180;

class Map {

    /**
     * 
     * @param {
     *          divID: a div Id
     *        } properties
     */
    constructor(properties) {
        this.layerManager = new LayerManager();
        this.debug = properties.debug;
        this.scene = !!properties.scene ? properties.scene : this.initScene(properties.shadows);
        if (!!properties.domContainer) {
            this.domContainer = properties.domContainer;
        } else if (!!properties.divID) {
            this.domContainer = document.getElementById(properties.divID);
        } else {
            throw "cannot create Map without a domContainer or divID"
        }
        this.camera = !!properties.camera ? properties.camera : this.initCamera();
        this.resetLogDepthBuffer();

        if (properties.debug) {
            this.initStats();
        }
        this.shadows = properties.shadows;

        this.initPlanet(properties.shadows);
        this.initController();
        this.scene.add(this.planet);
        this.setupRenderTarget();
        this.setupPost();
        this.initLabelRenderer();
        this.initRenderer(properties.shadows);

        this.startAnimation();
        this.mapNavigator = new MapNavigator(this);

        this.raycaster = new THREE.Raycaster();

        this.selection = {};

    }

    setDate(date) {
        if (this.shadows) {
            this.newSunPosition = getSunPosition(date);
        }

        //shpere to delete
        /* const m = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial());
            m.castShadow = true;
            m.receiveShadow = true;
            m.position.copy(this.sun.position);
            m.scale.set(sunDistance*0.9,sunDistance*0.9,sunDistance*0.9)
            this.scene.add(m);  */
    }
    setLayer(layer, index) {
        this._prepareLayer(layer)
        this.layerManager.setLayer(layer, index);
    }

    _prepareLayer(layer) {
        if (layer instanceof OGC3DTilesLayer) {
            layer.setRenderer(this.renderer);
            layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
        if (layer instanceof I3SLayer) {
            //layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
    }

    addLayer(layer) {
        this._prepareLayer(layer)
        return this.layerManager.addLayer(layer);
    }

    removeLayer(index) {
        this.layerManager.removeLayer(index);
    }
    getLayers() {
        return this.layerManager.getLayers();
    }
    initScene(shadows) {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);


        if (shadows) {


            this.sun = new THREE.DirectionalLight(0xffFFFF, 1.0);
            this.sun.position.copy(getSunPosition(new Date()));
            this.sun.castShadow = true;


            this.sun.shadow.bias = -0.0005;

            this.sun.shadow.blurSamples = 8
            this.sun.shadow.mapSize.width = 2048;
            this.sun.shadow.mapSize.height = 2048;

            this.sun.needsUpdate = true;

            scene.add(this.sun)
            scene.add(new THREE.AmbientLight(0xFFFFFF, 0.2));

            if (this.debug) {
                this.lightShadowMapViewer = new ShadowMapViewer(this.sun);
                this.lightShadowMapViewer.position.x = 10;
                this.lightShadowMapViewer.position.y = 110;
                this.lightShadowMapViewer.size.width = 100;
                this.lightShadowMapViewer.size.height = 100;
                this.lightShadowMapViewer.update();
            }

        } else {
            scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));
        }
        return scene;
    }

    setupRenderTarget() {

        if (this.target) this.target.dispose();

        this.target = new THREE.WebGLRenderTarget(this.domContainer.offsetWidth, this.domContainer.offsetHeight);
        this.target.texture.format = THREE.RGBAFormat;
        this.target.texture.colorSpace = THREE.SRGBColorSpace;
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

        this.depthTarget = new THREE.WebGLRenderTarget(this.domContainer.offsetWidth, this.domContainer.offsetHeight);
        this.depthTarget.texture.format = THREE.RGBAFormat;
        this.depthTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
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
                radius: { value: 0 },
                xfov: { value: 0 },
                yfov: { value: 0 },
                planetPosition: { value: new THREE.Vector3(0, 0, 0) },
                nonPostCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
                viewCenterFar: { value: new THREE.Vector3(0, 0, 0) },
                up: { value: new THREE.Vector3(0, 0, 0) },
                right: { value: new THREE.Vector3(0, 0, 0) },
                heightAboveSeaLevel: { value: 0 },
                opticalDepth: { value: null },
                ldf: {value: 0}
            }
        });

        loader.load(
            // resource URL
            opticalDepth,

            // onLoad callback
            function (texture) {
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                self.postMaterial.uniforms.opticalDepth.value = texture;
            },
            undefined,
            function (err) {
                console.error('An error happened: ' + err);
            }
        );

        this.depthPassMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: PostShader.depthPassFragmentShader(),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDepth: { value: null },
                ldf: {value: 0},
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

    initRenderer(shadows) {
        let self = this;
        self.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
        //self.renderer.debug.checkShaderErrors = false;
        if (shadows) {
            self.renderer.shadowMap.enabled = true;
            if (isMobileDevice()) {
                self.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } else {
                self.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }

        }

        self.renderer.setPixelRatio(1)
        self.renderer.setSize(this.domContainer.offsetWidth, this.domContainer.offsetHeight);

        self.renderer.outputColorSpace = THREE.SRGBColorSpace;
        self.renderer.autoClear = false;
        THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
            'vec3 CustomToneMapping( vec3 color ) { return color; }',
            `#define Uncharted2Helper( x ) max( ( ( x * ( 0.15 * x + 0.10 * 0.50 ) + 0.20 * 0.02 ) / ( x * ( 0.15 * x + 0.50 ) + 0.20 * 0.30 ) ) - 0.02 / 0.30, vec3( 0.0 ) )
            float toneMappingWhitePoint = 1.0;
            vec3 CustomToneMapping( vec3 color ) {
                color *= toneMappingExposure;
                return saturate( Uncharted2Helper( color ) / Uncharted2Helper( vec3( toneMappingWhitePoint ) ) );
            }`
        );
        self.renderer.toneMapping = THREE.CustomToneMapping;
        self.renderer.toneMappingExposure = 1;
        self.renderer.domElement.style.overflow = "hidden";
        self.domContainer.appendChild(self.renderer.domElement);

        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {

            const aspect = self.domContainer.offsetWidth / self.domContainer.offsetHeight;
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();


            self.target.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.depthTarget.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.labelRenderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        }
        setTimeout(onWindowResize, 1000);
    }

    initLabelRenderer() {
        this.labelRenderer = new CSS3DRenderer();
        this.labelRenderer.setSize(this.domContainer.offsetWidth, this.domContainer.offsetHeight);
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
        const camera = new THREE.PerspectiveCamera(30, this.domContainer.offsetWidth / this.domContainer.offsetHeight, 0.01, 50000000);
        camera.position.set(40000000, 0, 0);
        camera.up.set(0, 0, 1)
        camera.lookAt(new THREE.Vector3(-0, 0, 10000));
        camera.updateProjectionMatrix();

        return camera;
    }



    initPlanet(shadows) {

        this.planet = new Planet({
            camera: this.camera,
            center: new THREE.Vector3(0, 0, 0),
            shadows: shadows,
            layerManager: this.layerManager
        });
        this.resetCameraNearFar();
    }


    initController() {
        const self = this;
        self.controller = new Controller(self.camera, self.domContainer, self);
        //self.controller.append(new SelectController(self.camera, self.domContainer, self));
        self.controller.append(new PanController(self.camera, self.domContainer, self));
        self.controller.append(new RotateController(self.camera, self.domContainer, self));
        self.controller.append(new ZoomController(self.camera, self.domContainer, self));

        self.domContainer.addEventListener('mousedown', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('mousedown', e);
        }, false);
        self.domContainer.addEventListener('mouseup', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('mouseup', e);
        }, false);
        self.domContainer.addEventListener('mousemove', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('mousemove', e);
        }, false);
        self.domContainer.addEventListener('wheel', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('mousewheel', e);
        }, false);
        self.domContainer.addEventListener('touchstart', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('touchstart', e);
        }, false);
        self.domContainer.addEventListener('touchmove', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('touchmove', e);
        }, false);
        self.domContainer.addEventListener('touchcancel', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('touchcancel', e);
        }, false);
        self.domContainer.addEventListener('touchend', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('touchend', e);
        }, false);
        self.domContainer.addEventListener('keydown', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('keydown', e);
        }, false);
        self.domContainer.addEventListener('keyup', (e) => {
            if (!!self.controller && !self.pause) self.controller.event('keyup', e);
        }, false);

        document.addEventListener("mouseleave", function (event) {

            if (event.clientY <= 0 || event.clientX <= 0 || (event.clientX >= self.domContainer.offsetWidth || event.clientY >= self.domContainer.offsetHeight)) {

                self.controller.event('mouseup', { which: "all" });

            }
        });

    }


    pauseRendering() {
        this.pause = true;
        this.planet.pauseRendering();
        this.layerManager.pauseRendering();
    }
    resumeRendering() {
        this.pause = false;
        this.planet.resumeRendering();
        this.layerManager.resumeRendering();
    }
    startAnimation() {
        var self = this;

        function animate() {
            requestAnimationFrame(animate);
            if (self.shadows) {
                if (self.newSunPosition) {
                    self.sun.shadow.camera.position.copy(self.newSunPosition);
                    self.sun.position.copy(self.newSunPosition);
                    self.newSunPosition = undefined;
                }
                self.screenPixelRayCast(self.domContainer.offsetWidth * (0.5), self.domContainer.offsetHeight * (0.8), shadowTarget);
                //A.copy(self.sun.position).normalize();
                const targetToSunDistance = 1 - self.sun.position.dot(shadowTarget)

                sunToTarget.subVectors(shadowTarget, self.sun.shadow.camera.position);


                cameraRight.crossVectors(self.sun.position, self.sun.shadow.camera.up).normalize();
                cameraUp.crossVectors(cameraRight, self.sun.position).normalize();

                let rightDistance = cameraRight.dot(sunToTarget);
                let upDistance = cameraUp.dot(sunToTarget);


                let frustumHalfSize = Math.pow(self.camera.position.distanceTo(shadowTarget) * 1.5, 0.9);
                frustumHalfSize = Math.max(Math.floor(frustumHalfSize / 30) * 30, 400);
                self.sun.shadow.camera.left = -rightDistance - frustumHalfSize;
                self.sun.shadow.camera.right = -rightDistance + frustumHalfSize;
                self.sun.shadow.camera.bottom = upDistance - frustumHalfSize;
                self.sun.shadow.camera.top = upDistance + frustumHalfSize;

                self.sun.shadow.camera.near = targetToSunDistance - frustumHalfSize;
                self.sun.shadow.camera.far = targetToSunDistance + frustumHalfSize;

                self.sun.shadow.camera.updateProjectionMatrix();

            }
            if (!self.pause) {
                self.controller.update();

                frustum.setFromProjectionMatrix(mat.multiplyMatrices(self.camera.projectionMatrix, self.camera.matrixWorldInverse));


                //self.camera.updateMatrixWorld();

                self.renderer.setRenderTarget(self.target);
                self.renderer.render(self.scene, self.camera);


                self.depthPassMaterial.uniforms.tDepth.value = self.target.depthTexture;

                /// post params
                self.postMaterial.uniforms.tDiffuse.value = self.target.texture;
                self.postMaterial.uniforms.tDepth.value = self.target.depthTexture;
                self.postMaterial.uniforms.cameraNear.value = self.camera.near;
                self.postMaterial.uniforms.cameraFar.value = self.camera.far;
                self.postMaterial.uniforms.radius.value = 6356752.3142;
                self.postMaterial.uniforms.xfov.value = 2 * Math.atan(Math.tan(self.camera.fov * Math.PI / 180 / 2) * self.camera.aspect) * 180 / Math.PI;
                self.postMaterial.uniforms.yfov.value = self.camera.fov;
                self.postMaterial.uniforms.planetPosition.value = self.planet.position;
                self.postMaterial.uniforms.nonPostCameraPosition.value = self.camera.position;
                self.postMaterial.uniforms.ldf.value = self.logDepthBufFC;


                self.camera.getWorldDirection(self.postMaterial.uniforms.viewCenterFar.value).normalize();
                self.postMaterial.uniforms.up.value = self.camera.up.normalize();
                self.postMaterial.uniforms.right.value.crossVectors(self.camera.up, self.postMaterial.uniforms.viewCenterFar.value);
                self.postMaterial.uniforms.viewCenterFar.value.multiplyScalar(self.camera.far).add(self.camera.position);

                self.postMaterial.uniforms.heightAboveSeaLevel.value = self.camera.position.length() - 6356752.3142;


                self.depthPassMaterial.uniforms.cameraNear.value = self.camera.near;
                self.depthPassMaterial.uniforms.cameraFar.value = self.camera.far;
                self.depthPassMaterial.uniforms.ldf.value = self.logDepthBufFC;

                self.renderer.setRenderTarget(self.depthTarget);
                self.renderer.render(self.depthScene, self.postCamera);

                self.renderer.setRenderTarget(null);
                self.renderer.render(self.postScene, self.postCamera);
                self.labelRenderer.render(self.scene, self.camera);


            }

            if (self.stats) {
                self.stats.update();
            }
            if (self.lightShadowMapViewer) {
                //self.lightShadowMapViewer.render(self.renderer);
            }
        }
        animate();
    }

    resetCameraNearFar() {
        const geodeticCameraPosition = this.planet.llhToCartesian.inverse(this.camera.position);
        B.set(geodeticCameraPosition.x * degreeToRadians, geodeticCameraPosition.y * degreeToRadians)
        //const distToGround = geodeticCameraPosition.z - this.planet.getTerrainElevation(B);

        this.camera.near = 0.1;
        const distanceToHorizon = Math.sqrt(2 * this.planet.a * Math.abs(geodeticCameraPosition.z) + geodeticCameraPosition.z * geodeticCameraPosition.z); // estimation
        this.camera.far = distanceToHorizon * 2;
        //console.log(distanceToHorizon)
        this.camera.updateProjectionMatrix();
        this.resetLogDepthBuffer();
    }

    resetLogDepthBuffer() {
        this.logDepthBufFC = 2.0 / (Math.log(this.camera.far + 1.0) / Math.LN2);

    }
    moveCameraAboveSurface() {
        let geodeticCameraPosition = this.planet.llhToCartesian.inverse(this.camera.position);

        B.set(geodeticCameraPosition.x * degreeToRadians, geodeticCameraPosition.y * degreeToRadians);

        this.distToGround = geodeticCameraPosition.z - this.planet.getTerrainElevation(B);
        if (this.distToGround < 10) {
            geodeticCameraPosition.z += (10 - this.distToGround);
            geodeticCameraPosition = this.planet.llhToCartesian.forward(geodeticCameraPosition);
            this.camera.position.set(geodeticCameraPosition.x, geodeticCameraPosition.y, geodeticCameraPosition.z);
        }
    }
    setCameraUp() {
        this.camera.getWorldDirection(A).normalize();
        B.crossVectors(this.camera.position, A);
        this.camera.up.crossVectors(A, B).normalize();

    }

    /**
     * Moves the camera to a location in lon lat height and looks at another location in lon lat height.
     * 
     * @param {Object} cameraPosition an object representing the camera desired location in lon lat height (according to WGS84 coordinates)
     * @param {Number} cameraPosition.x longitude
     * @param {Number} cameraPosition.y latitude
     * @param {Number} cameraPosition.z height
     * @param {Object} cameraAim an object representing the camera desired target in lon lat height (according to WGS84 coordinates)
     * @param {Number} cameraAim.x longitude
     * @param {Number} cameraAim.y latitude
     * @param {Number} cameraAim.z height
     */
    moveAndLookAt(cameraPosition, cameraAim) {

        this.camera.position.copy(this.planet.llhToCartesian.forward(cameraPosition));
        const target = this.planet.llhToCartesian.forward(cameraAim);
        this.camera.up.copy(this.camera.position).normalize()
        this.camera.lookAt(target.x, target.y, target.z);
        this.moveCameraAboveSurface();
        this.resetCameraNearFar();
        this.setCameraUp();
        //this.camera.up.set(Math.random(), Math.random(), Math.random())


        //this.planet.update();
        //this.camera.up.copy(this.camera.position).normalize();
        //this.camera.updateProjectionMatrix();
        //this.controller._update();
    }


    screenPixelRayCast(x, y, sideEffect) {
        this.renderer.readRenderTargetPixels(this.depthTarget, x - this.domContainer.offsetLeft, (this.domContainer.offsetHeight - (y - this.domContainer.offsetTop)), 1, 1, depths);

        depth24.set(depths[0], depths[1], depths[2]);
        let z = depth24.dot(unpacker);
        z = (z * 0.00390630960555428397039749752041);
        if(z<=0 || z>=1){
            sideEffect.copy(this.camera.position);
            return;
        }
        z = -(Math.pow(2, z * Math.log2(this.camera.far + 1.0)) - 1.0);
        z = this.viewZToPerspectiveDepth(z, this.camera.near, this.camera.far);
        z = z * 2 - 1;
        
        x = ((x - this.domContainer.offsetLeft) / this.domContainer.offsetWidth) * 2 - 1;
        y = (1 - ((y - this.domContainer.offsetTop) / this.domContainer.offsetHeight)) * 2 - 1;

        sideEffect.set(x,y,z).unproject(this.camera);
        
    }

    viewZToPerspectiveDepth(viewZ, near, far) {
        return ((near + viewZ) * far) / ((far - near) * viewZ);
    }

    checkCameraCollision() {
        this.planet.heightAboveElevation();
    }



    moveCamera(location, lookAt) {

        this.camera.position.copy(location);
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

    addSelectionListener(calback) {
        if (!this.selectionListeners) this.selectionListeners = [];
        this.selectionListeners.push(calback);
    }
    removeSelectionListener(callback) {
        if (this.selectionListeners) this.selectionListeners.filter(f => f !== callback);
    }
    /**
     * select action at a particular location on this map (normalized between -1 and 1)
     * @param {THREE.Vector2} screenLocation 
     * @param {int} type 0(Add), 1(Remove) or 2(Replace)
     */
    select(screenLocation, type) {

        this.raycaster.setFromCamera(screenLocation, this.camera);
        const selectableObjects = [];
        const layers = this.layerManager.getLayers();
        for (let i = layers.length - 1; i >= 0; i--) {
            const l = layers[i];
            if (l) {
                const selectable = l.getSelectableObjects();
                while (selectable.length) selectableObjects.push(selectable.shift());
            }
        }

        const select = this.raycaster.intersectObjects(selectableObjects, false);

        const selected = [];
        const unselected = [];
        if (type == 0) {
            select.forEach(object => {
                if (!this.selection[object.object.layer.id]) {
                    this.selection[object.object.layer.id] = [];
                }
                if (!this.selection[object.object.layer.id].includes(object)) {
                    this.selection[object.object.layer.id].push(object);
                    selected.push(object.object);
                }
            });
            for (const layerID in this.selection) {
                const selectLayer = this.layerManager.getLayerByID(layerID);
                selectLayer.select(this.selection[layerID]);
            }
        } else if (type == 1) {
            select.forEach(object => {
                if (this.selection[object.object.layer.id] && this.selection[object.object.layer.id].includes(object.object)) {
                    this.selection[object.object.layer.id].filter(o => o !== object.object);
                    if (!this.selection[object.object.layer.id].length) delete this.selection[object.object.layer.id];
                    unselected.push(object.object);
                    object.object.layer.unselect([object.object])
                }
            });
        } else if (type == 2) {
            // unselect everything
            for (const key in this.selection) {
                const unselectLayer = this.layerManager.getLayerByID(key);
                unselectLayer.unselect(this.selection[key])
                while (this.selection[key].length) unselected.push(this.selection[key].shift());
            }
            this.selection = {};
            // select first object
            if (select.length > 0) {
                const object = select[0].object;
                if (!this.selection[object.layer.id]) {
                    this.selection[object.layer.id] = [];
                }
                if (!unselected.includes(object)) {
                    this.selection[object.layer.id].push(object);
                    object.layer.select([object]);
                    selected.push(object);
                    unselected.filter(o => o !== object);
                }
            }
        }

        const selections = {
            selection: this.selection,
            selected: selected,
            unselected: unselected,
        }
        if (this.selectionListeners) this.selectionListeners.forEach(callback => callback(selections))
        return selections;
    }
}


function perspectiveDepthToViewZ(invClipZ, near, far) {
    return (near * far) / ((far - near) * invClipZ - far);


}
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

export { Map };
