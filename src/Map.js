import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Planet } from './planet/Planet.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { PanController } from './controls/PanController.js';
import { RotateController } from './controls/RotateController.js';
import { ZoomController } from './controls/ZoomController.js';
import { LayerManager } from './layers/LayerManager.js';
import { PostShader } from './PostShader.js';
import { CloudsShader } from './clouds/CloudsShader.js';
import { CloudsBlurShader } from './clouds/CloudsBlurShader.js';
import { CloudsOpacityAdjustmentShader } from './clouds/CloudsOpacityAdjustmentShader';
import { MapNavigator } from "./MapNavigator.js";
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import opticalDepth from './images/optical_depth.png';
import water1 from './images/Water_1_M_Normal.jpg';
import water2 from './images/Water_2_M_Normal.jpg';
import perlin from './images/noise2.png';
import { Controller } from "./controls/Controller.js";
import { getSunPosition } from "./Sun";
import { CSM } from './csm/CSM.js';
import { CSMHelper } from 'three/addons/csm/CSMHelper.js';
import ringsPalette from './images/ringsPalette.png';
import stars from './images/stars.png';
import nebula from './images/nebula.png';
import nebulaPalette from './images/paletteNebula.png';


// reused variables
const frustum = new THREE.Frustum();
const mat = new THREE.Matrix4();
const depths = new Uint8Array(4);
const depth24 = new THREE.Vector3();
const unpacker = new THREE.Vector3(1, 1 / 256, 1 / (256 * 256));
const A = new THREE.Vector3();
const B = new THREE.Vector3();
const loader = new THREE.TextureLoader();
const degreeToRadians = Math.PI / 180;

const cycle = 0.04; // a cycle of a flow map phase
const halfCycle = cycle * 0.5;
const waterScale = 1000;

const clock = new THREE.Clock();
const flowSpeed = 0.01;
class Map {

    /**
    * @param {Object} properties 
    * @param {String} properties.divID A div ID.
    * @param {Boolean} [properties.debug=false] Display debug information.
    * @param {Boolean} [properties.shadows=false] Display sunlight and shadows.
    * @param {THREE.Vector3} [properties.atmosphere=false] An atmosphere color. By thefault a blueish atmosphere is displayed
    * @param {THREE.Vector3} [properties.sun=false] A sun color, defaults to a yelowish sun. Only taken into account when shadows is true.
    * @param {Boolean|THREE.Vector3} [properties.ocean=false] if true displays a blue ocean but a specific ocean color can be specified.
    * @param {THREE.DataTexture} [properties.globalElevation=false] A texture representing the global elevation (equidistant cylindrical projection) used for post processing effects.
    * @param {Boolean|Object} [properties.rings = false] Rings properties, if undefined, no rings are drawn 
    * @param {THREE.Vector3} [properties.rings.origin=new THREE.Vector3()] the center point of the rings
    * @param {THREE.Vector3} [properties.rings.normal=new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize()] the orientation of the rings plane
    * @param {Number} [properties.rings.innerRadius=6378137.0 * (1.1+Math.random())] the rings inner radius
    * @param {Number} [properties.rings.outerRadius=this.rings.innerRadius+(0.1+Math.random())*6378137.0] the rings outer radius
    * @param {Number} [properties.rings.colorMap=Math.random()] a modulation on the ring colors
    * @param {Number} [properties.rings.colorMapDisplace=Math.random()] rings displacement in a loop
    * @param {Boolean|Object} [properties.space = false] space properties, if undefined, no space is drawn
    * @param {Number} [properties.space.starsIntensity=0.75] The intensity of stars
    * @param {Number} [properties.space.gasCloudsIntensity=0.25] the intensity of nebula like gasClouds
    * @param {Number} [properties.space.colorMap=Math.random()] a modulation on gas cloud colors
    * @param {Number} [properties.space.texRotation1= Math.random()*Math.PI] a texture rotation to avoid obvious repetition.
    * @param {Number} [properties.space.texRotation2 = Math.random()*Math.PI] a texture rotation to avoid obvious repetition.
    * @param {Boolean|Object} [properties.clouds = false] display clouds or not. May be an object with optional clouds related properties. If truthy, the Map object will have a "clouds" property allowing the cloud options to be tuned on the fly.
    * @param {THREE.Vector3} [properties.clouds.color = new THREE.Vector3(1.0,1.0,1.0)] base cloud color.
    * @param {Number} [properties.clouds.density = 10] clouds density
    * @param {Number} [properties.clouds.luminosity = 2] luminosity multiplier
    * @param {Number} [properties.clouds.scatterCoefficient = 0.85] henyey-greenstein scatter coefficient.
    * @param {Number} [properties.clouds.biScatteringKappa = 0.75] forward-back scattering kappa coefficient.
    * @param {Number} [properties.clouds.coverage = 0.5] Average earth cloud coverage
    * @param {Number} [properties.clouds.startRadius = 1.010] the lowest height at which clouds may appear in planet radius units
    * @param {Number} [properties.clouds.endRadius = 1.015] the highest radius at which clouds may appear in planet radius units
    * @param {Boolean} [properties.clouds.showPanel = false] show tuning panel. cannot be changed dynamically
    * @param {Number} [properties.clouds.quality = 0.5] Resolution multiplier for clouds. cannot be changed dynamically.
    * @param {Number} [properties.clouds.windSpeed = 0.01] cloud movement speed
    * 
    */
    constructor(properties) {

        this.previousCameraPosition = new THREE.Vector3();
        this.previousCameraRotation = new THREE.Euler();

        this.layerManager = new LayerManager();
        this.debug = properties.debug;
        this.shadows = properties.shadows;
        this.rings = properties.rings;
        this.postCamera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
        if (this.rings) {
            if (!(typeof this.rings === 'object' && Array.isArray(this.rings))) this.rings = {};
            if (!this.rings.origin) this.rings.origin = new THREE.Vector3();
            if (!this.rings.normal) this.rings.normal = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
            if (!this.rings.innerRadius) this.rings.innerRadius = 6378137.0 * (1.1 + Math.random());
            if (!this.rings.outerRadius) this.rings.outerRadius = this.rings.innerRadius + (0.1 + Math.random()) * 6378137.0;
            if (!this.rings.colorMap) this.rings.colorMap = Math.random();
            if (!this.rings.colorMapDisplace) this.rings.colorMapDisplace = Math.random();
        }
        this.space = properties.space;
        if (this.space) {
            if (!(typeof this.space === 'object' && Array.isArray(this.space))) this.space = {};
            if (!this.space.starsIntensity) this.space.starsIntensity = 0.75;
            if (!this.space.gasCloudsIntensity) this.space.gasCloudsIntensity = 0.25;//Math.random();
            if (!this.space.colorMap) this.space.colorMap = Math.random();
            if (!this.space.texRotation1) this.space.texRotation1 = Math.random() * Math.PI;
            if (!this.space.texRotation2) this.space.texRotation2 = Math.random() * Math.PI;
        }

        this.globalElevation = properties.globalElevation;
        if (!!properties.domContainer) {
            this.domContainer = properties.domContainer;
        } else if (!!properties.divID) {
            this.domContainer = document.getElementById(properties.divID);
        } else {
            throw "cannot create Map without a domContainer or divID"
        }
        this.camera = !!properties.camera ? properties.camera : this._initCamera();
        this.scene = !!properties.scene ? properties.scene : this._initScene(properties.shadows);
        this._resetLogDepthBuffer();

        if (properties.debug) {
            this._initStats();
            const axesHelper = new THREE.AxesHelper(50000000);
            this.scene.add(axesHelper);
        }

        this.ocean = properties.ocean;
        this.atmosphere = properties.atmosphere;
        this.sunColor = properties.sun;
        this.clouds = properties.clouds;
        if (this.clouds === true) {
            this.clouds = {}
        } if (this.clouds) {
            if (!this.clouds.color) this.clouds.color = new Vector3(1.0, 1.0, 1.0);
            if (!this.clouds.coverage) this.clouds.coverage = 0.81;
            if (!this.clouds.scatterCoefficient) this.clouds.scatterCoefficient = 0.85;
            if (!this.clouds.biScatteringKappa) this.clouds.biScatteringKappa = 0.75;
            if (!this.clouds.density) this.clouds.density = 25;
            if (!this.clouds.luminance) this.clouds.luminance = 10;
            if (!this.clouds.cloudsRadiusStart) this.clouds.startRadius = 1.010;
            if (!this.clouds.cloudsRadiusEnd) this.clouds.endRadius = 1.015;
            if (!this.clouds.quality) this.clouds.quality = 0.5;
            if (!this.clouds.windSpeed) this.clouds.windSpeed = 0.01;
        }

        
        this._initRenderer(properties.shadows);
        this._initLabelRenderer();

        this._initPlanet(properties.shadows);
        this._initController();
        this.scene.add(this.planet);
        this._setupRenderTarget();
        this._setupPostScene();
        this._setupPostMaterial();
        this._setupBlurMaterials();
        this._setupCloudsOpacityAdjustmentShader();
        if (this.clouds) {
            this._setupCloudsPassMaterial();
            if (properties.debug || this.clouds.showPanel) {
                this._createCloudsDebugPanel();
            }
        }
        this._setupDepthPassMaterial();


        this._startAnimation();
        this.mapNavigator = new MapNavigator(this);

        this.raycaster = new THREE.Raycaster();

        this.selection = {};



    }

    _updateFlow() {

        const delta = clock.getDelta();
        const config = this.postMaterial.uniforms['waterConfig'];

        config.value.x += flowSpeed * delta; // flowMapOffset0
        config.value.y = config.value.x + halfCycle; // flowMapOffset1

        // Important: The distance between offsets should be always the value of "halfCycle".
        // Moreover, both offsets should be in the range of [ 0, cycle ].
        // This approach ensures a smooth water flow and avoids "reset" effects.

        if (config.value.x >= cycle) {

            config.value.x = 0;
            config.value.y = halfCycle;

        } else if (config.value.y >= cycle) {

            config.value.y = config.value.y - cycle;

        }

    }

    /**
     * Set the date (sun position)
     * @param {Date} date 
     */
    setDate(date) {
        if (this.shadows) {
            this.sunPosition = getSunPosition(date);
            if (this.csm) {
                this.csm.lightDirection.copy(this.sunPosition).negate();
            }
        }
    }

    /**
     * Sets the given layer at the given index disposing of any layer previously at that index.
     * @param {Layer} layer 
     * @param {Number} index 
     */
    setLayer(layer, index) {
        this._prepareLayer(layer)
        this.layerManager.setLayer(layer, index);
    }

    _prepareLayer(layer) {
        if (layer.isOGC3DTilesLayer) {
            layer.setMap(this);
            layer.setPlanet(this.planet);
            layer.addToScene(this.scene, this.camera);
        }
        if (layer.isI3SLayer) {
            layer.addToScene(this.scene, this.camera);
        }
    }

    /**
     * appends the layer to the end of the list of layers, replacing any layer already at that position.
     * @param {Layer} layer 
     * @param {Number} index 
     */
    addLayer(layer) {
        this._prepareLayer(layer)
        return this.layerManager.addLayer(layer);
    }

    /**
     * removes the layer at the specific index optionally "disposing" of any resources the layer is using.
     * @param {Number} index 
     * @param {Boolean} dispose 
     */
    removeLayer(index, dispose = true) {
        this.layerManager.removeLayer(index, dispose);
    }

    /**
     * Returns an array of layers currently loaded on the map
     * @returns {Layer[]} the list of layers
     */
    getLayers() {
        return this.layerManager.getLayers();
    }

    /**
     * Fetches a specific layer by ID.
     * @param {Number|String} id 
     * @returns {Layer} the layer with given ID if any
     */
    getLayerByID(id) {
        return this.layerManager.getLayerByID(id);
    }
    _initScene() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);


        if (this.shadows) {

            this.sunPosition = getSunPosition(new Date())
            const csmSplits = [];
            for (let i = 0; i < 7; i++) {
                if (i == 0) csmSplits.push(1);
                else {
                    csmSplits.push(csmSplits[i - 1] * 3);
                }
            }
            for (let i = 0; i < csmSplits.length; i++) {
                csmSplits[i] /= csmSplits[csmSplits.length - 1];
            }
            this.csm = new CSM({
                maxFar: 500000,
                cascades: csmSplits.length,
                mode: "custom",
                customSplitsCallback: (cascadeCount, nearDistance, farDistance, target) => {
                    target.push(...csmSplits);
                },
                fade: true,
                parent: scene,
                shadowMapSize: _isMobileDevice() ? 1024 : 2048,
                lightIntensity: 2.0,
                lightDirection: this.sunPosition.clone().negate(),
                lightMargin: 500000,
                shadowBias: -0.000001,
                //noLastCascadeCutOff: true,
                //shadowNormalBias : -5000,
                camera: this.camera
            });

            for (let i = 0; i < this.csm.lights.length; i++) {
                this.csm.lights[i].shadow.bias = 0.001 * csmSplits[i];
                this.csm.lights[i].shadow.normalBias = 0.1;
                this.csm.lights[i].shadow.camera.near = 1;
                this.csm.lights[i].shadow.camera.updateProjectionMatrix();
                this.csm.lights[i].shadow.camera.far = this.csm.lightMargin + this.csm.maxFar * 2 * csmSplits[i];
                this.csm.lights[i].shadow.needsUpdate = true;
            }
            //this.sun.shadow.bias = -0.005;



            scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));

            if (this.debug) {
                this.csmHelper = new CSMHelper(this.csm);
                this.csmHelper.visible = true;
                scene.add(this.csmHelper);
                const self = this;
                document.addEventListener('keyup', (e) => {
                    if (e.key === 'u') {
                        console.log("csmHelper update");
                        self.csmHelper.update();
                    }
                });

                document.addEventListener('keyup', (e) => {
                    if (e.key === 'a') {
                        for (let i = 0; i < this.csm.lights.length; i++) {
                            this.csm.lights[i].shadow.normalBias *= 2;
                            this.csm.lights[i].shadow.needsUpdate = true;
                        }
                    }
                    if (e.key === 'q') {
                        for (let i = 0; i < this.csm.lights.length; i++) {
                            this.csm.lights[i].shadow.normalBias *= 0.5;
                            this.csm.lights[i].shadow.needsUpdate = true;
                        }
                        console.log("normalBiasDown " + this.csm.lights[0].shadow.normalBias);
                    }
                    if (e.key === 'z') {
                        for (let i = 0; i < this.csm.lights.length; i++) {
                            this.csm.lights[i].shadow.bias *= 2;
                            this.csm.lights[i].shadow.needsUpdate = true;
                        }
                    }
                    if (e.key === 's') {
                        for (let i = 0; i < this.csm.lights.length; i++) {
                            this.csm.lights[i].shadow.bias *= 0.5;
                            this.csm.lights[i].shadow.needsUpdate = true;
                        }
                        console.log("BiasDown " + this.csm.lights[0].shadow.bias);
                    }
                });
            }

        } else {
            scene.add(new THREE.AmbientLight(0xFFFFFF, 3.0));
        }
        return scene;
    }

    _setupRenderTarget() {

        if (this.target) this.target.dispose();

        this.target = new THREE.WebGLRenderTarget(this.domContainer.offsetWidth, this.domContainer.offsetHeight);
        this.target.texture.format = THREE.RGBAFormat;
        this.target.texture.colorSpace = THREE.SRGBColorSpace;
        this.target.texture.minFilter = THREE.NearestFilter;
        this.target.texture.magFilter = THREE.NearestFilter;
        this.target.texture.premultiplyAlpha = false;
        this.target.texture.generateMipmaps = false;
        this.target.stencilBuffer = false;
        this.target.depthBuffer = true;
        this.target.depthTexture = new THREE.DepthTexture();
        this.target.depthTexture.format = THREE.DepthFormat;
        this.target.depthTexture.type = THREE.FloatType;

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

        if (this.target2) this.target2.dispose();

        this.target2 = new THREE.WebGLRenderTarget(Math.floor(this.domContainer.offsetWidth * 1.0), Math.floor(this.domContainer.offsetHeight * 1.0));
        this.target2.texture.format = THREE.RGBAFormat;
        this.target2.texture.colorSpace = THREE.SRGBColorSpace;
        this.target2.texture.minFilter = THREE.NearestFilter;
        this.target2.texture.magFilter = THREE.LinearFilter;
        this.target2.texture.generateMipmaps = false;
        this.target2.texture.premultiplyAlpha = false;
        this.target2.stencilBuffer = false;
        this.target2.depthBuffer = false;

        if (this.clouds) {
            if (this.cloudsTarget) this.cloudsTarget.dispose();


            this.cloudsTarget = new THREE.WebGLMultipleRenderTargets(
                Math.floor(this.domContainer.offsetWidth * this.clouds.quality), Math.floor(this.domContainer.offsetHeight * this.clouds.quality),
                2
            );
            this.cloudsTarget.stencilBuffer = false;
            this.cloudsTarget.depthBuffer = false;

            this.cloudsTarget.texture[0].format = THREE.RGBAFormat;
            this.cloudsTarget.texture[0].colorSpace = THREE.SRGBColorSpace;
            this.cloudsTarget.texture[0].minFilter = THREE.NearestFilter;
            this.cloudsTarget.texture[0].magFilter = THREE.LinearFilter;
            this.cloudsTarget.texture[0].generateMipmaps = false;
            this.cloudsTarget.texture[0].premultiplyAlpha = false;

            this.cloudsTarget.texture[1].format = THREE.RGBAFormat;
            this.cloudsTarget.texture[1].colorSpace = THREE.SRGBColorSpace;
            this.cloudsTarget.texture[1].minFilter = THREE.NearestFilter;
            this.cloudsTarget.texture[1].magFilter = THREE.NearestFilter;
            this.cloudsTarget.texture[1].generateMipmaps = false;
            this.cloudsTarget.texture[1].premultiplyAlpha = false;



            if (this.cloudsBlur1) this.cloudsBlur1.dispose();

            this.cloudsBlur1 = new THREE.WebGLRenderTarget(Math.floor(this.domContainer.offsetWidth * this.clouds.quality), Math.floor(this.domContainer.offsetHeight * this.clouds.quality));
            this.cloudsBlur1.texture.format = THREE.RGBAFormat;
            this.cloudsBlur1.texture.colorSpace = THREE.SRGBColorSpace;
            this.cloudsBlur1.texture.minFilter = THREE.NearestFilter;
            this.cloudsBlur1.texture.magFilter = THREE.LinearFilter;
            this.cloudsBlur1.texture.generateMipmaps = false;
            this.cloudsBlur1.stencilBuffer = false;
            this.cloudsBlur1.depthBuffer = false;
            this.cloudsBlur1.texture.premultiplyAlpha = false;

            if (this.cloudsBlur2) this.cloudsBlur1.dispose();

            this.cloudsBlur2 = new THREE.WebGLRenderTarget(Math.floor(this.domContainer.offsetWidth * this.clouds.quality), Math.floor(this.domContainer.offsetHeight * this.clouds.quality));
            this.cloudsBlur2.texture.format = THREE.RGBAFormat;
            this.cloudsBlur2.texture.colorSpace = THREE.SRGBColorSpace;
            this.cloudsBlur2.texture.minFilter = THREE.NearestFilter;
            this.cloudsBlur2.texture.magFilter = THREE.LinearFilter;
            this.cloudsBlur2.texture.generateMipmaps = false;
            this.cloudsBlur2.stencilBuffer = false;
            this.cloudsBlur2.depthBuffer = false;
            this.cloudsBlur2.texture.premultiplyAlpha = false;
        }

    }

    _setupCloudsOpacityAdjustmentShader() {
        this.cloudsOpacityAdjustmentShader = new THREE.ShaderMaterial({
            vertexShader: CloudsOpacityAdjustmentShader.vertexShader(),
            fragmentShader: CloudsOpacityAdjustmentShader.fragmentShader(),
            uniforms: {
                clouds: { value: null },
                cloudsOpacityMultiplier: { value: null }
            },
            premultipliedAlpha: false,
            depthTest: false,
            depthWrite: false
        })
    }
    _setupBlurMaterials() {

        this.blurMaterial = new THREE.ShaderMaterial({
            vertexShader: CloudsBlurShader.vertexShader(),
            fragmentShader: CloudsBlurShader.fragmentShader(),
            uniforms: {
                offset: { value: new THREE.Vector2() },
                image: { value: null },
                mask: { value: null },
                preserveMaxOpacity: { value: 0.0 }
            },
            premultipliedAlpha: false,
            depthTest: false,
            depthWrite: false
        });
    }
    _setupCloudsPassMaterial() {
        const self = this;
        this.cloudsMaterial = new THREE.ShaderMaterial({
            vertexShader: CloudsShader.vertexShader(),
            fragmentShader: self.shadows ? CloudsShader.fragmentShaderShadows(!!self.ocean) : CloudsShader.fragmentShader(!!self.ocean),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDepth: { value: null },
                radius: { value: 0 },
                xfov: { value: 0 },
                yfov: { value: 0 },
                planetPosition: { value: new THREE.Vector3(0, 0, 0) },
                nonPostCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
                viewCenterFar: { value: new THREE.Vector3(0, 0, 0) },
                viewCenterNear: { value: new THREE.Vector3(0, 0, 0) },
                up: { value: new THREE.Vector3(0, 0, 0) },
                right: { value: new THREE.Vector3(0, 0, 0) },
                perlinWorley: { value: null },
                noise2D: { value: null },
                ldf: { value: 0 },
                time: { value: 0.0 },
                numSamples: { value: 15.0 },
                numSamplesToLight: { value: 2.0 },
                lengthMultiplier: { value: 20.0 },
                sunlight: { value: 10.0 },
                sunLocation: { value: new THREE.Vector3(0, 0, 0) },
                scatterCoef: { value: 0.8 },
                biScatteringKappa: { value: 0.65 },
                color: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                coverage: { value: 0.2 },
                cloudsRadiusStart: { value: 1.003 },
                cloudsRadiusEnd: { value: 1.015 },
                windSpeed: { value: 0.01 },
                temporalDeNoiseAlpha: { value: 0.5 }
            },
            depthTest: false,
            depthWrite: false
        });

        CloudsShader.generatePerlinWorleyTexture().then(texture => {
            this.cloudsMaterial.uniforms.perlinWorley.value = texture;
        })

        loader.load(
            perlin,
            function (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                self.cloudsMaterial.uniforms.noise2D.value = texture;
            },
            undefined,
            function (err) {
                console.error('An error happened: ' + err);
            }
        );


    }
    _setupPostScene() {
        const postPlane = new THREE.PlaneGeometry(2, 2);
        this.postQuad = new THREE.Mesh(postPlane);
        this.postScene = new THREE.Scene();
        this.postScene.add(this.postQuad);
    }
    _setupPostMaterial() {

        // Setup post processing stage
        const self = this;

        this.postMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: self.shadows ? PostShader.fragmentShaderShadows(self.atmosphere, self.ocean, self.sunColor, !!self.globalElevation, self.rings, self.space, self.clouds) : PostShader.fragmentShader(self.atmosphere, self.ocean, self.rings, self.space, self.clouds),
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
                viewCenterNear: { value: new THREE.Vector3(0, 0, 0) },
                up: { value: new THREE.Vector3(0, 0, 0) },
                right: { value: new THREE.Vector3(0, 0, 0) },
                heightAboveSeaLevel: { value: 0 },
                opticalDepth: { value: null },
                perlin: { value: null },
                water1: { value: null },
                water2: { value: null },
                waterConfig: { value: new THREE.Vector4(0, halfCycle, halfCycle, waterScale) },
                ldf: { value: 0 },
                sunLocation: { value: new THREE.Vector3(0, 0, 0) },
                projMatrixInv: { value: new THREE.Matrix4() },
                viewMatrixInv: { value: new THREE.Matrix4() },
                ringsPalette: { value: null },
                starsTexture: { value: null },
                nebulaTexture: { value: null },
                nebulaPalette: { value: null },
                tClouds: { value: null },
                time: { value: 0.0 },
            },
            depthTest: false,
            depthWrite: false
        });
        if (self.globalElevation) {
            self.postMaterial.uniforms.globalElevation = { type: "t", value: self.globalElevation };
        };


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

        loader.load(
            // resource URL
            ringsPalette,

            // onLoad callback
            function (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                self.postMaterial.uniforms.ringsPalette.value = texture;
            },
            undefined,
            function (err) {
                console.error('An error happened: ' + err);
            }
        );

        if (this.shadows && this.ocean) {
            loader.load(
                // resource URL
                water1,

                // onLoad callback
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.water1.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );
            loader.load(
                water2,
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.water2.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );

        }


        if (self.space) {
            loader.load(
                perlin,
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.perlin.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );
        }
        if (this.space) {

            loader.load(
                stars,
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.starsTexture.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );
            loader.load(
                nebula,
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.nebulaTexture.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );
            loader.load(
                nebulaPalette,
                function (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    self.postMaterial.uniforms.nebulaPalette.value = texture;
                },
                undefined,
                function (err) {
                    console.error('An error happened: ' + err);
                }
            );
        }



    }

    _setupDepthPassMaterial() {
        this.depthPassMaterial = new THREE.ShaderMaterial({
            vertexShader: PostShader.vertexShader(),
            fragmentShader: PostShader.depthPassFragmentShader(),
            uniforms: {
                cameraNear: { value: this.camera.near },
                cameraFar: { value: this.camera.far },
                tDepth: { value: null },
                ldf: { value: 0 },
            }
        });

    }

    _initRenderer(shadows) {
        let self = this;
        self.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
        //self.renderer.getContext().getProgramInfoLog= function() { return '' }
        //self.renderer.debug.checkShaderErrors = false;
        if (shadows) {
            self.renderer.shadowMap.enabled = true;
            if (_isMobileDevice()) {
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
        self.renderer.toneMappingExposure = 0.2;
        self.renderer.domElement.style.overflow = "hidden";
        self.domContainer.appendChild(self.renderer.domElement);

        window.addEventListener('resize', onWindowResize);
        function onWindowResize() {

            const aspect = self.domContainer.offsetWidth / self.domContainer.offsetHeight;
            self.camera.aspect = aspect;
            self.camera.updateProjectionMatrix();


            self.target.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.depthTarget.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.target2.setSize(Math.floor(self.domContainer.offsetWidth * 1.0), Math.floor(self.domContainer.offsetHeight * 1.0));
            if (self.clouds) {
                self.cloudsTarget.setSize(Math.floor(self.domContainer.offsetWidth * self.clouds.quality), Math.floor(self.domContainer.offsetHeight * self.clouds.quality));
                self.cloudsBlur1.setSize(Math.floor(self.domContainer.offsetWidth * self.clouds.quality), Math.floor(self.domContainer.offsetHeight * self.clouds.quality));
                self.cloudsBlur2.setSize(Math.floor(self.domContainer.offsetWidth * self.clouds.quality), Math.floor(self.domContainer.offsetHeight * self.clouds.quality));
            }
            self.renderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
            self.labelRenderer.setSize(self.domContainer.offsetWidth, self.domContainer.offsetHeight);
        }
        setTimeout(onWindowResize, 1000);
    }

    _initLabelRenderer() {
        this.labelRenderer = new CSS3DRenderer();
        this.labelRenderer.setSize(this.domContainer.offsetWidth, this.domContainer.offsetHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
    }

    _initStats() {
        this.stats = new Stats();
        this.domContainer.appendChild(this.stats.dom);
    }


    _initCamera() {
        const camera = new THREE.PerspectiveCamera(50, this.domContainer.offsetWidth / this.domContainer.offsetHeight, 0.01, 50000000);
        camera.position.set(40000000, 0, 0);
        camera.up.set(0, 0, 1)
        camera.lookAt(new THREE.Vector3(-0, 0, 10000));
        camera.updateProjectionMatrix();

        return camera;
    }



    _initPlanet() {

        this.planet = new Planet({
            camera: this.camera,
            center: new THREE.Vector3(0, 0, 0),
            shadows: this.csm,
            layerManager: this.layerManager,
            renderer: this.renderer
        });
        this.resetCameraNearFar();
    }


    _initController() {
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

    /**
     * Pauses the rendering of all the layers.
     */
    pauseRendering() {
        this.pause = true;
        this.planet._pauseRendering();
        this.layerManager._pauseRendering();
    }
    /**
     * Resumes the rendering of all the layers
     */
    resumeRendering() {
        this.pause = false;
        this.planet._resumeRendering();
        this.layerManager._resumeRendering();
    }

    _startAnimation() {
        var self = this;

        function animate() {
            requestAnimationFrame(animate);
            if (self.shadows) {
                self.csm.update(self.camera.matrix);

            }
            if (!self.pause) {
                self.controller.update();
                //self.controller.update();
                frustum.setFromProjectionMatrix(mat.multiplyMatrices(self.camera.projectionMatrix, self.camera.matrixWorldInverse));


                //self.camera.updateMatrixWorld();

                self.renderer.setRenderTarget(self.target);
                self.renderer.render(self.scene, self.camera);


                /// depth
                self.depthPassMaterial.uniforms.tDepth.value = self.target.depthTexture;
                self.depthPassMaterial.uniforms.cameraNear.value = self.camera.near;
                self.depthPassMaterial.uniforms.cameraFar.value = self.camera.far;
                self.depthPassMaterial.uniforms.ldf.value = self.logDepthBufFC;

                self.renderer.setRenderTarget(self.depthTarget);
                self.postQuad.material = self.depthPassMaterial;
                self.renderer.render(self.postScene, self.postCamera);

                /// clouds
                if (self.clouds) {
                    const context = self.renderer.getContext();
                    context.clearDepth(1.0); // Set the depth to the farthest
                    context.clear(context.DEPTH_BUFFER_BIT); // Clear the depth buffer
                    context.depthMask(true)
                    //self._switchCloudRenderTarget();
                    self.cloudsMaterial.uniforms.tDepth.value = self.target.depthTexture;
                    self.cloudsMaterial.uniforms.cameraNear.value = self.camera.near;
                    self.cloudsMaterial.uniforms.cameraFar.value = self.camera.far;
                    self.cloudsMaterial.uniforms.radius.value = self.planet.radius;
                    self.cloudsMaterial.uniforms.xfov.value = 2 * Math.atan(Math.tan(self.camera.fov * Math.PI / 180 / 2) * self.camera.aspect) * 180 / Math.PI;
                    self.cloudsMaterial.uniforms.yfov.value = self.camera.fov;
                    self.cloudsMaterial.uniforms.planetPosition.value = self.planet.position;
                    self.cloudsMaterial.uniforms.nonPostCameraPosition.value = self.camera.position;
                    self.cloudsMaterial.uniforms.ldf.value = self.logDepthBufFC;

                    self.cloudsMaterial.uniforms.lengthMultiplier.value = self.clouds.density;
                    self.cloudsMaterial.uniforms.sunlight.value = self.clouds.luminance;
                    self.cloudsMaterial.uniforms.scatterCoef.value = self.clouds.scatterCoefficient;
                    self.cloudsMaterial.uniforms.biScatteringKappa.value = self.clouds.biScatteringKappa;
                    self.cloudsMaterial.uniforms.coverage.value = 1.0 - self.clouds.coverage;
                    self.cloudsMaterial.uniforms.color.value = self.clouds.color;
                    self.cloudsMaterial.uniforms.cloudsRadiusStart.value = self.clouds.cloudsRadiusStart;
                    self.cloudsMaterial.uniforms.cloudsRadiusEnd.value = self.clouds.cloudsRadiusEnd;
                    self.cloudsMaterial.uniforms.windSpeed.value = self.clouds.windSpeed;

                    self.camera.getWorldDirection(self.cloudsMaterial.uniforms.viewCenterFar.value).normalize();
                    self.cloudsMaterial.uniforms.viewCenterNear.value.copy(self.cloudsMaterial.uniforms.viewCenterFar.value);
                    self.cloudsMaterial.uniforms.up.value = self.camera.up.normalize();
                    self.cloudsMaterial.uniforms.right.value.crossVectors(self.camera.up, self.cloudsMaterial.uniforms.viewCenterFar.value);
                    self.cloudsMaterial.uniforms.viewCenterFar.value.multiplyScalar(self.camera.far).add(self.camera.position);
                    self.cloudsMaterial.uniforms.viewCenterNear.value.multiplyScalar(self.camera.near).add(self.camera.position);
                    //self.cloudsMaterial.uniforms.previous.value = self.cloudsTarget.texture;
                    if(self.shadows){
                        self.cloudsMaterial.uniforms.sunLocation.value.copy(self.sunPosition);
                    }
                    self.cloudsMaterial.uniforms.temporalDeNoiseAlpha.value = !self.previousCameraPosition.equals(self.camera.position) || !self.previousCameraRotation.equals(self.camera.rotation) ? 0.6 : 0.1;

                    self.previousCameraPosition.copy(self.camera.position);
                    self.previousCameraRotation.copy(self.camera.rotation);

                    self.cloudsMaterial.uniforms.time.value = clock.elapsedTime;

                    self.renderer.setRenderTarget(self.cloudsTarget);
                    self.postQuad.material = self.cloudsMaterial;
                    self.renderer.render(self.postScene, self.postCamera);


                    /// clouds blur
                    let texelSizeVertical = 1 / self.target2.height;
                    let texelSizeHorizontal = 1 / self.target2.width;
                    let mul = 0.5;

                    self.blurMaterial.uniforms.mask.value = self.cloudsTarget.texture[1];
                    self.blurMaterial.uniforms.preserveMaxOpacity.value = 0.0;
                    self.blurMaterial.uniforms.image.value = self.cloudsTarget.texture[0];
                    self.blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
                    mul += 1;
                    self.postQuad.material = self.blurMaterial;
                    self.renderer.setRenderTarget(self.cloudsBlur1);
                    self.renderer.render(self.postScene, self.postCamera);

                    self.blurMaterial.uniforms.image.value = self.cloudsBlur1.texture;
                    self.blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
                    mul += 1;
                    self.postQuad.material = self.blurMaterial;
                    self.renderer.setRenderTarget(self.cloudsBlur2);
                    self.renderer.render(self.postScene, self.postCamera);

                    for (let p = 0; p < 3; p++) {
                        self.blurMaterial.uniforms.preserveMaxOpacity.value = 0.0;
                        self.blurMaterial.uniforms.image.value = self.cloudsBlur2.texture;
                        self.blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
                        mul += 1;
                        self.postQuad.material = self.blurMaterial;
                        self.renderer.setRenderTarget(self.cloudsBlur1);
                        self.renderer.render(self.postScene, self.postCamera);

                        self.blurMaterial.uniforms.image.value = self.cloudsBlur1.texture;
                        self.blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
                        mul += 1;
                        self.postQuad.material = self.blurMaterial;
                        self.renderer.setRenderTarget(self.cloudsBlur2);
                        self.renderer.render(self.postScene, self.postCamera);
                    }

                    self.cloudsOpacityAdjustmentShader.uniforms.clouds.value = self.cloudsBlur2.texture;
                    self.cloudsOpacityAdjustmentShader.uniforms.cloudsOpacityMultiplier.value = self.cloudsTarget.texture[1];

                    self.postQuad.material = self.cloudsOpacityAdjustmentShader;
                    self.renderer.setRenderTarget(self.cloudsBlur1);
                    self.renderer.render(self.postScene, self.postCamera);

                    self.postMaterial.uniforms.tClouds.value = self.cloudsBlur1.texture;
                }


                /// post final
                self.postMaterial.uniforms.tDiffuse.value = self.target.texture;
                self.postMaterial.uniforms.tDepth.value = self.target.depthTexture;
                self.postMaterial.uniforms.cameraNear.value = self.camera.near;
                self.postMaterial.uniforms.cameraFar.value = self.camera.far;
                self.postMaterial.uniforms.radius.value = self.planet.radius;
                self.postMaterial.uniforms.xfov.value = 2 * Math.atan(Math.tan(self.camera.fov * Math.PI / 180 / 2) * self.camera.aspect) * 180 / Math.PI;
                self.postMaterial.uniforms.yfov.value = self.camera.fov;
                self.postMaterial.uniforms.planetPosition.value = self.planet.position;
                self.postMaterial.uniforms.nonPostCameraPosition.value = self.camera.position;
                self.postMaterial.uniforms.ldf.value = self.logDepthBufFC;

                self.postMaterial.uniforms.projMatrixInv.value.copy(self.camera.projectionMatrixInverse);

                self.postMaterial.uniforms.viewMatrixInv.value.copy(self.camera.matrixWorld);
                if (self.shadows) {
                    self.postMaterial.uniforms.sunLocation.value.copy(self.sunPosition);
                }

                self.camera.getWorldDirection(self.postMaterial.uniforms.viewCenterFar.value).normalize();
                self.postMaterial.uniforms.viewCenterNear.value.copy(self.postMaterial.uniforms.viewCenterFar.value);
                self.postMaterial.uniforms.up.value = self.camera.up.normalize();
                self.postMaterial.uniforms.right.value.crossVectors(self.camera.up, self.postMaterial.uniforms.viewCenterFar.value);
                self.postMaterial.uniforms.viewCenterFar.value.multiplyScalar(self.camera.far).add(self.camera.position);
                self.postMaterial.uniforms.viewCenterNear.value.multiplyScalar(self.camera.near).add(self.camera.position);

                self.postMaterial.uniforms.heightAboveSeaLevel.value = self.camera.position.length() - self.planet.radius;

                //water
                self._updateFlow();
                self.postMaterial.uniforms.time.value = clock.elapsedTime;



                self.renderer.setRenderTarget(null);
                self.postQuad.material = self.postMaterial;
                self.renderer.render(self.postScene, self.postCamera);
                self.labelRenderer.render(self.scene, self.camera);


            }

            if (self.stats) {
                self.stats.update();
            }

        }
        animate();
    }

    /**
     * When moving the map.camera manually, you may want to call this method to correctly set the camera near and far to limit z-fighting artefacts.
     */
    resetCameraNearFar() {


        const heightAboveEllipsoid = this.camera.position.length() - this.planet.radius;

        this.camera.near = 0.1;
        const distanceToHorizon = Math.sqrt(2 * this.planet.radius * Math.abs(heightAboveEllipsoid) + heightAboveEllipsoid * heightAboveEllipsoid); // estimation
        this.camera.far = Math.max(2000000, distanceToHorizon * 1.5);
        //console.log(distanceToHorizon)
        this.camera.updateProjectionMatrix();
        this._resetLogDepthBuffer();

        /* if(this.csm){
            this.csm.maxFar = Math.min(1000000, this.camera.far);
            
            
            this.csm.updateFrustums()
        } */

    }

    _resetLogDepthBuffer() {
        this.logDepthBufFC = 2.0 / (Math.log(this.camera.far + 1.0) / Math.LN2);

    }

    /**
     * Moves the camera 1 meter above the ground.
     */
    moveCameraAboveSurface() {
        try {
            let geodeticCameraPosition = this.planet.llhToCartesian.inverse(this.camera.position);
            B.set(geodeticCameraPosition.x * degreeToRadians, geodeticCameraPosition.y * degreeToRadians);


            this.distToGround = geodeticCameraPosition.z - this.planet.getTerrainElevation(B);
            if (this.distToGround < 5) {
                geodeticCameraPosition.z += (5 - this.distToGround);
                geodeticCameraPosition = this.planet.llhToCartesian.forward(geodeticCameraPosition);
                this.camera.position.set(geodeticCameraPosition.x, geodeticCameraPosition.y, geodeticCameraPosition.z);
            }
        } catch (e) { }

    }

    /**
     * reset the camera up so that the camera roll alligns with the horizon
     */
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
    }


    /**
     * Get the hit location of a ray going from the camera through a pixel on screen or undefined if the ray does not hit anything.
     * @param {Number} x a screen pixel x coordinate
     * @param {Number} y a screen pixel y coordinate
     * @param {THREE.Vector3} sideEffect a THREE.Vector3 that will be moved to the ray hit location
     * @returns {THREE.Vector3} the sideEffect object.
     */
    screenPixelRayCast(x, y, sideEffect) {
        this.renderer.readRenderTargetPixels(this.depthTarget, x - this.domContainer.offsetLeft, (this.domContainer.offsetHeight - (y - this.domContainer.offsetTop)), 1, 1, depths);

        depth24.set(depths[0], depths[1], depths[2]);
        let z = depth24.dot(unpacker);
        z = (z * 0.00390630960555428397039749752041);
        if (z <= 0 || z >= 1) {
            sideEffect.copy(this.camera.position);
            return;
        }
        z = -(Math.pow(2, z * Math.log2(this.camera.far + 1.0)) - 1.0);
        z = this._viewZToPerspectiveDepth(z, this.camera.near, this.camera.far);
        z = z * 2 - 1;

        x = ((x - this.domContainer.offsetLeft) / this.domContainer.offsetWidth) * 2 - 1;
        y = (1 - ((y - this.domContainer.offsetTop) / this.domContainer.offsetHeight)) * 2 - 1;

        sideEffect.set(x, y, z).unproject(this.camera);
        return sideEffect;

    }

    _viewZToPerspectiveDepth(viewZ, near, far) {
        return ((near + viewZ) * far) / ((far - near) * viewZ);
    }

    /**
     * Transforms a lon lat height point (degrees) to cartesian coordinates (EPSG:4978).
     * The transform is slightly inaccurate compared to proj4 but it's 3 times faster
     * @param {THREE.Vector3} llh
     */
    llhToCartesianFastSFCT(llh) {
        this.planet.llhToCartesianFastSFCT(llh);
    }

    /**
     * Transforms a xyz point (degrees) to llh coordinates (EPSG:4326).
     * The transform is slightly inaccurate compared to proj4 but it's 2.5 times faster
     * @param {THREE.Vector3} llh
     */
    cartesianToLlhFastSFCT(xyz) {
        this.planet.cartesianToLlhFastSFCT(xyz);
    }

    /**
     * Set an elevation exageration factor
     * @param {Number} elevationExageration 
     */
    setElevationExageration(elevationExageration) {
        this.elevationExageration = elevationExageration;
        this.planet.setElevationExageration(this.elevationExageration);
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
     * @param {Number} type 0(Add), 1(Remove) or 2(Replace)
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

    _createCloudsDebugPanel() {
        const self = this;
        // Create panel element
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '0';
        panel.style.right = '0';
        panel.style.backgroundColor = '#f0f0f0';
        panel.style.padding = '10px';
        panel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        panel.style.maxWidth = '300px';

        // Define labels and ranges
        const elements = [
            { label: 'density', min: 0, max: 300, value: self.clouds.density, step: 0.1, action: (val) => { self.clouds.density = val; } },
            { label: 'luminance', min: 0, max: 50, value: self.clouds.luminance, step: 0.1, action: (val) => { self.clouds.luminance = val; } },
            { label: 'scatterCoefficient', min: 0, max: 1, value: self.clouds.scatterCoefficient, step: 0.01, action: (val) => { self.clouds.scatterCoefficient = val; } },
            { label: 'biScatteringKappa', min: 0, max: 1, value: self.clouds.biScatteringKappa, step: 0.01, action: (val) => { self.clouds.biScatteringKappa = val; } },
            { label: 'coverage', min: 0, max: 1, value: self.clouds.coverage, step: 0.01, action: (val) => { self.clouds.coverage = val; } },
            { label: 'r', min: 0, max: 1, value: self.clouds.color.x, step: 0.01, action: (val) => { self.clouds.color.x = val; } },
            { label: 'g', min: 0, max: 1, value: self.clouds.color.y, step: 0.01, action: (val) => { self.clouds.color.y = val; } },
            { label: 'b', min: 0, max: 1, value: self.clouds.color.z, step: 0.01, action: (val) => { self.clouds.color.z = val; } },
            { label: 'wind speed', min: 0, max: 1, value: self.clouds.windSpeed, step: 0.01, action: (val) => { self.clouds.windSpeed = val; } }
            
        ];


        elements.forEach(element => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'space-between';
            container.style.marginBottom = '10px';

            const label = document.createElement('label');
            label.textContent = element.label;
            label.style.marginRight = '10px';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = element.min;
            slider.max = element.max;
            slider.step = element.step;
            slider.value = element.value;

            const valueDisplay = document.createElement('span');
            valueDisplay.style.minWidth = '50px';
            valueDisplay.style.textAlign = 'right';
            valueDisplay.textContent = slider.value.toString();

            slider.oninput = () => {
                valueDisplay.textContent = slider.value.toString();
                element.action(slider.value);
            };

            container.appendChild(label);
            container.appendChild(slider);
            container.appendChild(valueDisplay);
            panel.appendChild(container);
        });

        //// Clouds min max height
        const lowClouds = document.createElement('div');
        lowClouds.style.display = 'flex';
        lowClouds.style.alignItems = 'center';
        lowClouds.style.justifyContent = 'space-between';
        lowClouds.style.marginBottom = '10px';

        const lowCloudsLabel = document.createElement('label');
        lowCloudsLabel.textContent = "clouds Radius Start";
        lowCloudsLabel.style.marginRight = '10px';

        const lowCloudsSlider = document.createElement('input');
        lowCloudsSlider.type = 'range';
        lowCloudsSlider.min = 1.0;
        lowCloudsSlider.max = 1.1;
        lowCloudsSlider.step = 0.001;
        lowCloudsSlider.value = self.clouds.cloudsRadiusStart;

        const lowCloudsValueDisplay = document.createElement('span');
        lowCloudsValueDisplay.style.minWidth = '50px';
        lowCloudsValueDisplay.style.textAlign = 'right';
        lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();

        lowClouds.appendChild(lowCloudsLabel);
        lowClouds.appendChild(lowCloudsSlider);
        lowClouds.appendChild(lowCloudsValueDisplay);
        panel.appendChild(lowClouds);

        const highClouds = document.createElement('div');
        highClouds.style.display = 'flex';
        highClouds.style.alignItems = 'center';
        highClouds.style.justifyContent = 'space-between';
        highClouds.style.marginBottom = '10px';

        const highCloudsLabel = document.createElement('label');
        highCloudsLabel.textContent = "clouds Radius End";
        highCloudsLabel.style.marginRight = '10px';

        const highCloudsSlider = document.createElement('input');
        highCloudsSlider.type = 'range';
        highCloudsSlider.min = 1.0;
        highCloudsSlider.max = 1.1;
        highCloudsSlider.step = 0.001;
        highCloudsSlider.value = self.clouds.cloudsRadiusEnd;

        const highCloudsValueDisplay = document.createElement('span');
        highCloudsValueDisplay.style.minWidth = '50px';
        highCloudsValueDisplay.style.textAlign = 'right';
        highCloudsValueDisplay.textContent = highCloudsSlider.value.toString();

        highClouds.appendChild(highCloudsLabel);
        highClouds.appendChild(highCloudsSlider);
        highClouds.appendChild(highCloudsValueDisplay);
        panel.appendChild(highClouds);

        lowCloudsSlider.oninput = () => {
            lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();
            this.clouds.cloudsRadiusStart = lowCloudsSlider.value;
            this.clouds.cloudsRadiusEnd = Math.max(this.clouds.cloudsRadiusEnd, lowCloudsSlider.value);
            highCloudsSlider.value = this.clouds.cloudsRadiusEnd;
            highCloudsValueDisplay.textContent = highCloudsSlider.value.toString();
        };
        highCloudsSlider.oninput = () => {
            highCloudsValueDisplay.textContent = highCloudsSlider.value.toString();
            this.clouds.cloudsRadiusEnd = highCloudsSlider.value;
            this.clouds.cloudsRadiusStart = Math.min(this.clouds.cloudsRadiusStart, highCloudsSlider.value);
            lowCloudsSlider.value = this.clouds.cloudsRadiusStart;
            lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();
        };
        


        document.body.appendChild(panel);

    }
}


function _perspectiveDepthToViewZ(invClipZ, near, far) {
    return (near * far) / ((far - near) * invClipZ - far);


}

function _isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

export { Map };
