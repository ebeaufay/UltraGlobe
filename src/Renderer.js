import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as THREE from 'three';

//const types = { UnsignedShortType: THREE.UnsignedShortType, UnsignedIntType: THREE.UnsignedIntType, UnsignedInt248Type: THREE.UnsignedInt248Type };

function Renderer(scene, containerL, containerR, camera, nkEngine) {
    var self = this;
    self.camera = camera;
    this.scene = scene;
    this.camera = camera;
    this.renderer;
    this.controls;
    this.containerL = containerL;
    this.supportsExtension = true;
    this.clock = new THREE.Clock();
    this.planets = [];
    this._nkEngine = nkEngine ;
    this._containerR = containerR;
    this._nkContext = null ;


    init();

    function initNkEnginePart ()
    {
        // Prepare ref
        const nkAstraeus = self._nkEngine.nkAstraeus ;
        const nkGraphics = self._nkEngine.nkGraphics ;
        const nkImages = self._nkEngine.nkImages ;
        const nkLog = self._nkEngine.nkLog ;
        const nkMaths = self._nkEngine.nkMaths ;
        const nkResources = nkEngine.nkResources ;
        const nkWinUi = self._nkEngine.nkWinUi ;

        // Init engine
        const logger = new nkLog.ConsoleLogger () ;

        nkAstraeus.LogManager.getInstance().setReceiver(logger) ;
		nkGraphics.LogManager.getInstance().setReceiver(logger) ;
		nkWinUi.LogManager.getInstance().setReceiver(logger) ;

        nkWinUi.MainSystem.getInstance().initialize() ;
		nkGraphics.MainSystem.getInstance().initialize() ;
        nkAstraeus.Engine.initialize() ;

        // Prepare window
        const graphicsWindow = nkWinUi.ComponentManager.getInstance().createOrRetrieve("Win", nkWinUi.COMPONENT_TYPE.GRAPHICS_WINDOW).asGraphicsWindow() ;
        //graphicsWindow.setFromExternalCanvas(self._containerR) ;
        graphicsWindow.load() ;

        // Prepare context
        const contextDesc = new nkGraphics.RenderContextDescriptor () ;
        const context = nkGraphics.RenderContextManager.getInstance().createRenderContext(contextDesc) ;
        self._containerR.appendChild(context.getAttachedWin().getCanvas()) ;
        context.getAttachedWin().getCanvas().style = "position: absolute; height: 100%; width: 100%; right: 0px; top : 0px;" ;
        self._nkContext = context ;

        // Prepare camera
        const camera = nkGraphics.CameraManager.getInstance().getDefaultCam() ;
        camera.setPositionAbsolute(new nkMaths.Vector (5, 0, 0)) ;
        camera.lookAt(new nkMaths.Vector (0, 0, 0), new nkMaths.Vector (0, 1, 0)) ;
        camera.setNear(0.1) ;
        camera.setFar(100) ;
        camera.setAutoUpdateOnContextSwitch(true) ;

        // Load resources
        nkResources.ResourceManager.getInstance().loadFileIntoMemory("http://localhost:8081/Textures/CubeMaps/PurpleSun.dds").then(
            function (imgData)
            {
                // Setup texture and effect to have something to see
                const alignmentDesc = new nkImages.AlignmentDescriptor () ;
                alignmentDesc._alphaMode = nkImages.ALPHA_MODE.ALPHA ;
                alignmentDesc._forceRgbReordering = true ;
                let img = nkImages.CompositeEncoder.decode(imgData, alignmentDesc) ;
                let backTex = nkGraphics.TextureManager.getInstance().createOrRetrieve("backtex") ;
                backTex.setFromImage(img) ;
                backTex.load() ;

                let envEffect = nkAstraeus.EffectManager.getInstance().createOrRetrieve("envEffect", nkAstraeus.EFFECT_TYPE.IMAGE_ENVIRONMENT) ;
				envEffect.setSourceTexture(backTex) ;
				envEffect.load() ;

                // Prepare compositor as a result
                let compositor = nkGraphics.CompositorManager.getInstance().createOrRetrieve("renderer") ;
				let compositorNode = compositor.addNode() ;

                let targetOp = compositorNode.addOperations() ;
                targetOp.setToBackBuffer(true) ;
                targetOp.setToChainDepthBuffer(true) ;

                targetOp.addClearTargetsPass() ;
                targetOp.addRenderScenePass() ;

                let envPass = targetOp.addPostProcessPass() ;
				envPass.setProcessShader(envEffect.getShader()) ;
				envPass.setBackProcess(true) ;

                // Set in context
                context.setCompositor(compositor) ;
            }
        ) ;        
    }

    function init()
    {
        self.renderer = new THREE.WebGLRenderer();
        self.renderer.antialias = true;
        if (self.renderer.capabilities.isWebGL2 === false && self.renderer.extensions.has('WEBGL_depth_texture') === false)
        {
            self.supportsExtension = false;
            document.querySelector('#error').style.display = 'block';
            return;
        }

        self.renderer.setPixelRatio(window.devicePixelRatio);
        self.renderer.outputEncoding = THREE.sRGBEncoding;
        self.renderer.autoClear = false;

        self.renderer.setSize(self.containerL.offsetWidth, self.containerL.offsetHeight);
        self.containerL.appendChild(self.renderer.domElement);

        self.stats = new Stats();
        self.containerL.appendChild(self.stats.dom);

        self.controls = new OrbitControls(self.camera, self.renderer.domElement);
        self.camera.position.set(-20000000, 0, 0);
        self.controls.target.x = 0;
        self.controls.target.y = 0;
        self.controls.target.z = 0;
        self.controls.minDistance = 6378500;
        self.controls.maxDistance = 1000000000;
        self.controls.zoomSpeed = 0.1;
        self.controls.update();

        initNkEnginePart() ;


        onWindowResize();
        window.addEventListener('resize', onWindowResize);

    }

    function addPlanet(planet){
        self.planets.push(planet);
        self.controls.addEventListener('change', function(event){
            planet.update(event.target.object)
        });
        
    }

    function onWindowResize() {
        const aspect = self.containerL.offsetWidth / self.containerL.offsetHeight;
        self.camera.aspect = aspect;
        self.camera.updateProjectionMatrix();
        const dpr = self.renderer.getPixelRatio();

        self.renderer.setSize(self.containerL.offsetWidth, self.containerL.offsetHeight);

    }

    let start ;
	const rotationTime = 10000 ;
    const cam = nkEngine.nkGraphics.CameraManager.getInstance().getDefaultCam() ;

    function render(time)
    {
        if (!self.supportsExtension)
            return;

        //self.camera.near = 0.0 + Math.pow(self.camera.position.y / 10, 0.5);
        //self.camera.far = 1000 + self.camera.position.y * 1;
        //self.camera.updateProjectionMatrix();

        requestAnimationFrame(render);

        self.camera.updateMatrixWorld();
        self.renderer.render(scene, camera);

        // nk Logic
        if (start === undefined)
            start = time ;

        // Updating rotation
        const timeDiff = time - start ;
        const radianRot = (timeDiff / rotationTime) * (3.14159 * 2) ;
        const newPos = new nkEngine.nkMaths.Vector (Math.cos(radianRot) * 3, 0, (Math.sin(radianRot) * 3)) ;
        cam.setPositionRelative(newPos) ;
        cam.lookAt(new nkEngine.nkMaths.Vector (0, 0, 0), new nkEngine.nkMaths.Vector (0, 1, 0)) ;
        self._nkEngine.nkGraphics.MainSystem.getInstance().frame(self._nkContext) ;
        //

        self.stats.update();
        const delta = self.clock.getDelta();
        self.controls.movementSpeed = 15;
        self.controls.update(delta);
    }


    return {
        render: render,
        camera: self.camera,
        addPlanet: addPlanet,
    }
}
export { Renderer };