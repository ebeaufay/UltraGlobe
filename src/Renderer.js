function Renderer(nkView, nkEngine)
{
    // Attributes
    var self = this ;

    this.renderer ;
    this.controls ;
    this.planets = [] ;

    this._nkEngine = nkEngine ;
    this._nkContext = null ;
    this._nkView = nkView ;
    this._nkLogger = null ;

    initNkEngine() ;

    function initNkEngine ()
    {
        // Prepare ref
        const nkAstraeus = self._nkEngine.nkAstraeus ;
        const nkGraphics = self._nkEngine.nkGraphics ;
        const nkImages = self._nkEngine.nkImages ;
        const nkLog = self._nkEngine.nkLog ;
        const nkMaths = self._nkEngine.nkMaths ;
        const nkResources = self._nkEngine.nkResources ;
        const nkWinUi = self._nkEngine.nkWinUi ;

        // Init engine
        self._nkLogger = new nkLog.ConsoleLogger () ;

        nkAstraeus.LogManager.getInstance().setReceiver(self._nkLogger) ;
		nkGraphics.LogManager.getInstance().setReceiver(self._nkLogger) ;
		nkWinUi.LogManager.getInstance().setReceiver(self._nkLogger) ;

        nkWinUi.MainSystem.getInstance().initialize() ;
		nkGraphics.MainSystem.getInstance().initialize() ;
        nkAstraeus.Engine.initialize() ;

        // Prepare window
        const graphicsWindow = nkWinUi.ComponentManager.getInstance().createOrRetrieve("Win", nkWinUi.COMPONENT_TYPE.GRAPHICS_WINDOW).asGraphicsWindow() ;
        graphicsWindow.load() ;

        // Prepare context
        const contextDesc = new nkGraphics.RenderContextDescriptor () ;
        const context = nkGraphics.RenderContextManager.getInstance().createRenderContext(contextDesc) ;
        self._nkView.appendChild(context.getAttachedWin().getCanvas()) ;
        context.getAttachedWin().getCanvas().style = "position: absolute; height: 100%; width: 100%; right: 0px; top : 0px;" ;
        self._nkContext = context ;

        // Prepare camera
        const camera = nkGraphics.CameraManager.getInstance().getDefaultCam() ;
        camera.setPositionAbsolute(new nkMaths.Vector (0, 0, 5)) ;
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

    function addPlanet(planet)
    {
        self.planets.push(planet);
        self.controls.addEventListener('change', function(event){
            planet.update(event.target.object)
        });
    }

    let start ;
	const rotationTime = 10000 ;
    const cam = nkEngine.nkGraphics.CameraManager.getInstance().getDefaultCam() ;

    function render (time)
    {
        //self.camera.near = 0.0 + Math.pow(self.camera.position.y / 10, 0.5);
        //self.camera.far = 1000 + self.camera.position.y * 1;
        //self.camera.updateProjectionMatrix();

        requestAnimationFrame(render);

        // nk Logic
        if (start === undefined)
            start = time ;

        // Updating rotation
        //const timeDiff = time - start ;
        //const radianRot = (timeDiff / rotationTime) * (3.14159 * 2) ;
        //const newPos = new nkEngine.nkMaths.Vector (Math.cos(radianRot) * 3, 0, (Math.sin(radianRot) * 3)) ;
        //cam.setPositionRelative(newPos) ;
        //cam.lookAt(new nkEngine.nkMaths.Vector (0, 0, 0), new nkEngine.nkMaths.Vector (0, 1, 0)) ;
        self._nkEngine.nkGraphics.MainSystem.getInstance().frame(self._nkContext) ;
        //
    }


    return {
        render: render,
        camera: cam,
        addPlanet: addPlanet,
    }
}

export { Renderer } ;