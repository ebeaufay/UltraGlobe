import '../worker/WorkType.js';
import {PlanetShader} from './PlanetShader.js';

const MAX_LEVEL = 5 ;

let TILE_INDEX_NK = 0 ;
let TILE_GEOMETRY_NK = null ;

let BASE_LOADED = false ;
let BASE_LOAD_COUNT = 0 ;

let nkMaths = null ;

function generateBaseTile (nkEngine, resolution)
{
    // Safety checks
    if (resolution < 2)
    {
        console.log("Unsupported base tile geometry resolution. Aborting.") ;
        return ;
    }

    // Names
    const nkGraphics = nkEngine.nkGraphics ;
    const nkMaths = nkEngine.nkMaths ;
    const nkMemory = nkEngine.nkMemory ;

    // Generate buffer data
    var stepX = 1 / (resolution - 1) ;
    var stepY = 1 / (resolution - 1) ;

    const floatSize = 4 ;

    // Vertices
    const vectorSize = 3 ;
    const pointCount = resolution * resolution ;
    const arrayVertexBuffer = new nkMemory.Buffer (floatSize * vectorSize * pointCount) ;
    const vertexBuffer = new Float32Array (arrayVertexBuffer.getData().buffer) ;

    // Vertices
    for (let y = 0 ; y < resolution ; y++)
    {
        const lineIndex = y * resolution * 3 ;

        for (let x = 0 ; x < resolution ; x++)
        {
            const index = lineIndex + x * 3 ;
            vertexBuffer[index + 0] = y * stepY ;
            vertexBuffer[index + 1] = x * stepX ;
            vertexBuffer[index + 2] = 0 ;
        }
    }

    // Indices
    const intSize = 4 ;
    const triSize = 3 ;
    const triCount = 2 * (resolution - 1) * (resolution - 1) ;
    const arrayIndexBuffer = new nkMemory.Buffer (intSize * triSize * triCount) ;
    const indexBuffer = new Int32Array (arrayIndexBuffer.getData().buffer) ;
    let currentIndex = 0 ;
    let pointIndex = 0 ;

    for (let y = 0 ; y < resolution - 1 ; y++)
    {
        for (let x = 0 ; x < resolution - 1 ; x++)
        {
            indexBuffer[currentIndex++] = pointIndex + 0 ;
            indexBuffer[currentIndex++] = pointIndex + resolution ;
            indexBuffer[currentIndex++] = pointIndex + 1 + resolution ;

            indexBuffer[currentIndex++] = pointIndex + 0 ;
            indexBuffer[currentIndex++] = pointIndex + 1 + resolution ;
            indexBuffer[currentIndex++] = pointIndex + 1 ;

            pointIndex++ ;
        }

        // Jump over last point of line
        pointIndex++ ;
    }

    // Translate into mesh
    const tileMesh = nkGraphics.MeshManager.getInstance().createOrRetrieve("Tile") ;

    const positionAttribute = new nkGraphics.MeshInputLayoutAttribute ("POSITION") ;
    positionAttribute._format = nkGraphics.FORMAT.R32G32B32_FLOAT ;
    const layout = new nkGraphics.MeshInputLayout () ;
    layout.addAttribute(positionAttribute) ;

    tileMesh.setInputLayout(layout) ;
    tileMesh.addVertexBufferForward(arrayVertexBuffer) ;
    tileMesh.setIndexBufferForward(arrayIndexBuffer) ;
    tileMesh.setVertexCount(pointCount) ;
    tileMesh.setIndexCount(triCount * triSize) ;
    tileMesh.setBounds(new nkGraphics.BoundingBox (new nkMaths.Vector (), new nkMaths.Vector (1, 1, 1))) ;
    tileMesh.setAutoComputeBounds(false) ;
    tileMesh.load() ;
    
    return tileMesh ;
}

function generateShader (nkEngine, boundsMin, boundsMax, uvLeft, uvRight, index, texture)
{
    // Const
    const nkGraphics = nkEngine.nkGraphics ;
    const nkMaths = nkEngine.nkMaths ;

    // Prepare program
    const program = nkGraphics.ProgramManager.getInstance().createOrRetrieve("TileProgram") ;

    if (program.isUnloaded())
    {
        const programSources = new nkGraphics.ProgramSourcesHolder () ;
        programSources.setVertexMemory(PlanetShader.vertex) ;
        programSources.setPixelMemory(PlanetShader.pixel) ;

        program.setFromMemory(programSources) ;
        program.load() ;
    }

    // Prepare shader
    const shader = nkGraphics.ShaderManager.getInstance().createOrRetrieve("TileShader_" + index) ;

    shader.setAttachedShaderProgram(program) ;

    shader.addInstanceMemorySlot().setAsWorldMatrix() ;

    const cBuffer = shader.addConstantBuffer(0) ;
    cBuffer.addPassMemorySlot().setAsViewMatrix() ;
    cBuffer.addPassMemorySlot().setAsProjectionMatrix() ;
    cBuffer.addPassMemorySlot().setFromVector(new nkMaths.Vector (boundsMax._x, boundsMin._y, boundsMin._x, boundsMax._y)) ;
    cBuffer.addPassMemorySlot().setFromVector(new nkMaths.Vector (uvLeft._x, uvLeft._y, uvRight._x, uvRight._y)) ;

    if (texture)
        shader.addTexture(texture, 0) ;
    else
        shader.addTexture(nkGraphics.TextureManager.getInstance().get("NILKINS_DEFAULT_TEXTURE"), 0) ;

    // Done
    return shader ;
}

function onImageLoaded (data, nkEngine, self)
{
    // Check result and if we need to do something
    if (!data._success || self._nkShader === null)
        return ;

    // Prepare texture from the image data
    let tex = nkEngine.nkGraphics.TextureManager.getInstance().createOrRetrieve("TILE_" + self._index) ;
    tex.setWidth(data._width) ;
    tex.setHeight(data._height) ;
    tex.setDepthOrArraySize(1) ;
    tex.setMipLevels(1) ;
    tex.setTextureFormat(nkEngine.nkGraphics.FORMAT.R8G8B8A8_UNORM) ;
    tex.setFromBuffer(new nkEngine.nkMemory.BufferView (data._data)) ;
    tex.load() ;

    self._nkShader.setTexture(tex, 0) ;
    self._nkTexture = tex ;
    self._ownsTexture = true ;

    self._uvLowerLeft = new nkEngine.nkMaths.Vector (0, 0) ;
    self._uvUpperRight = new nkEngine.nkMaths.Vector (1, 1) ;
    self._nkShader.getConstantBuffer(0).getPassMemorySlot(3).setFromVector(new nkEngine.nkMaths.Vector (self._uvLowerLeft._x, self._uvLowerLeft._y, self._uvUpperRight._x, self._uvUpperRight._y)) ;

    if (!BASE_LOADED)
    {
        // Add a tile to the base level successful load count
        // Base level is 2 tiles, one for each side, mark it as good once everything is loaded
        BASE_LOAD_COUNT++ ;
        BASE_LOADED = BASE_LOAD_COUNT == 2 ;
    }
}

function requestTexture (tile)
{
    const requestUrl = tile.wmsService.getFullUrl(tile._bounds, 1024, 1024) ;
    tile._workers.requestWork({_type : WORK_TYPE.PARSE_IMAGE, _path : requestUrl, _index : tile._index}, function (result) {onImageLoaded(result.data, tile._nkEngine, tile) ;}) ;
}

function cancelTexture (tile)
{
    tile._workers.cancelWork(tile._index) ;
}

function toLonLat (cartesianVector)
{
    return new nkMaths.Vector (Math.atan2(cartesianVector._z, -cartesianVector._x), Math.asin(cartesianVector._y)) ;
}

function toCartesian (lonLatVector)
{
    return new nkMaths.Vector (-(Math.cos(lonLatVector._y) * Math.cos(lonLatVector._x)), Math.sin(lonLatVector._y), Math.cos(lonLatVector._y) * Math.sin(lonLatVector._x)) ;
}

class PlanetTile
{
    constructor (nkEngine, workers, unitBounds, bounds, elevationService, wmsService, planetCenter, radius, level, texture, uvLowerLeft, uvUpperRight)
    {
        // Check parameters
        var self = this;

        self.frustumCulled = false;
        self.level = level;
        self.radius = radius;
        self.elevationService = elevationService;
        self.wmsService = wmsService;

        self._nkEngine = nkEngine ;
        self._workers = workers ;
        self._planetCenter = planetCenter ;
        self._bounds = bounds ;
        self._unitBounds = unitBounds ;
        self._planetCenter = new nkEngine.nkMaths.Vector (0, 0, 0) ;
        self._uvLowerLeft = uvLowerLeft ;
        self._uvUpperRight = uvUpperRight ;
        self._entity = null ;
        self._children = [] ;
        self._index = TILE_INDEX_NK++ ;
        self._nkTexture = texture ;
        self._ownsTexture = false ;

        nkMaths = nkEngine.nkMaths ;

        // Setup nk
        if (!TILE_GEOMETRY_NK)
            TILE_GEOMETRY_NK = generateBaseTile(nkEngine, 32) ;

        // Add to nk pipeline
        self._nkShader = generateShader(nkEngine, bounds.getMin(), bounds.getMax(), self._uvLowerLeft, self._uvUpperRight, self._index, self._nkTexture) ;

        const rq = nkEngine.nkGraphics.RenderQueueManager.getInstance().get(0) ;
        self._entity = rq.addEntity() ;
        self._entity.setShader(self._nkShader) ;
        const subEnt = self._entity.addChild() ;
        subEnt.setMesh(TILE_GEOMETRY_NK) ;

        // Request dedicated texture for this tile
        requestTexture(this) ;
    }

    /**
     * Update the tree relative to the camera and available elevation data.
     * @param {*} camera 
     */
    update (camera)
    {
        // First load base to offer a good starting view
        // As a result, prevent going further in this case
        if (!BASE_LOADED)
            return ;

        // Update rendering tree
        const metric = this.calculateUpdateMetric(camera) ;

        if (metric == -1)
        {
            // This level is not visible (other side or outside camera)
            this.disposeChildren() ;
            this.showTile() ;
        }
        else if (metric < this.level || this.level >= MAX_LEVEL)
        {
            // Right level
            this.disposeChildren() ;
            this.showTile() ;
        }
        else
        {
            // Hide ourselves
            this.hideTile() ;

            // If has children, recurse
            // Else generate children
            if (this._children.length > 0)
            {
                this._children.forEach(child => {
                        child.update(camera) ;
                    }
                ) ;
            }
            else
            {
                // Add new children
                const nkGraphics = this._nkEngine.nkGraphics ;
                const nkMaths = this._nkEngine.nkMaths ;
                
                const minUVX = this._uvLowerLeft._x ;
                const minUVY = this._uvLowerLeft._y ;
                const maxUVX = this._uvUpperRight._x ;
                const maxUVY = this._uvUpperRight._y ;

                const halfUVWidth = (maxUVX - minUVX) * 0.5 ;
                const halfUVHeight = (maxUVY - minUVY) * 0.5 ;

                const boundsCenter = this._bounds.getCenter() ;
                const boundsSides = this._bounds.getAxisAlignedSides() ;
                const boundsQuarterSides = boundsSides.divScalar(4) ;

                const bounds0 = new nkGraphics.BoundingBox (boundsCenter.sub(boundsQuarterSides), boundsQuarterSides) ;
                const bounds1 = new nkGraphics.BoundingBox (new nkMaths.Vector(boundsCenter._x + boundsQuarterSides._x, boundsCenter._y - boundsQuarterSides._y), boundsQuarterSides) ;
                const bounds2 = new nkGraphics.BoundingBox (new nkMaths.Vector(boundsCenter._x - boundsQuarterSides._x, boundsCenter._y + boundsQuarterSides._y), boundsQuarterSides) ;
                const bounds3 = new nkGraphics.BoundingBox (boundsCenter.add(boundsQuarterSides), boundsQuarterSides) ;

                const unitBoundsCenter0 = toCartesian(bounds0.getCenter()) ;
                const unitBoundsCenter1 = toCartesian(bounds1.getCenter()) ;
                const unitBoundsCenter2 = toCartesian(bounds2.getCenter()) ;
                const unitBoundsCenter3 = toCartesian(bounds3.getCenter()) ;

                const unitBoundsExtent0 = toCartesian(bounds0.getMax()).sub(toCartesian(bounds0.getMin())).divScalar(2) ;
                const unitBoundsExtent1 = toCartesian(bounds1.getMax()).sub(toCartesian(bounds1.getMin())).divScalar(2) ;
                const unitBoundsExtent2 = toCartesian(bounds2.getMax()).sub(toCartesian(bounds2.getMin())).divScalar(2) ;
                const unitBoundsExtent3 = toCartesian(bounds3.getMax()).sub(toCartesian(bounds3.getMin())).divScalar(2) ;

                const unitBounds0 = new nkGraphics.BoundingBox (unitBoundsCenter0, unitBoundsExtent0) ;
                const unitBounds1 = new nkGraphics.BoundingBox (unitBoundsCenter1, unitBoundsExtent1) ;
                const unitBounds2 = new nkGraphics.BoundingBox (unitBoundsCenter2, unitBoundsExtent2) ;
                const unitBounds3 = new nkGraphics.BoundingBox (unitBoundsCenter3, unitBoundsExtent3) ;

                const uvMin0 = new nkMaths.Vector (minUVX + halfUVWidth, minUVY) ;
                const uvMax0 = new nkMaths.Vector (maxUVX, minUVY + halfUVHeight) ;
                
                const uvMin1 = new nkMaths.Vector (minUVX, minUVY) ;
                const uvMax1 = new nkMaths.Vector (minUVX + halfUVWidth, minUVY + halfUVHeight) ;

                const uvMin2 = new nkMaths.Vector (minUVX + halfUVWidth, minUVY + halfUVHeight) ;
                const uvMax2 = new nkMaths.Vector (maxUVX, maxUVY) ;

                const uvMin3 = new nkMaths.Vector (minUVX, minUVY + halfUVHeight) ;
                const uvMax3 = new nkMaths.Vector (minUVX + halfUVWidth, maxUVY) ;

                this._children.push(new PlanetTile (this._nkEngine, this._workers, unitBounds0, bounds0, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, this._nkTexture, uvMin0, uvMax0)) ;
                this._children.push(new PlanetTile (this._nkEngine, this._workers, unitBounds1, bounds1, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, this._nkTexture, uvMin1, uvMax1)) ;
                this._children.push(new PlanetTile (this._nkEngine, this._workers, unitBounds2, bounds2, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, this._nkTexture, uvMin2, uvMax2)) ;
                this._children.push(new PlanetTile (this._nkEngine, this._workers, unitBounds3, bounds3, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, this._nkTexture, uvMin3, uvMax3)) ;
            }
        }
    }

    showTile ()
    {
        // Check if visible already
        if (this._entity)
            return ;

        // Add back to rq, with right shader
        const rq = this._nkEngine.nkGraphics.RenderQueueManager.getInstance().get(0) ;
        this._entity = rq.addEntity() ;
        this._entity.setShader(this._nkShader) ;
        const subEnt = this._entity.addChild() ;
        subEnt.setMesh(TILE_GEOMETRY_NK) ;

        // Check if texture needs to be downloaded
        if (!this._ownsTexture)
            requestTexture(this) ;
    }

    hideTile ()
    {
        // Check visibility
        if (!this._entity)
            return ;

        // Erase linked entity from rq
        const rq = this._nkEngine.nkGraphics.RenderQueueManager.getInstance().get(0) ;
        rq.eraseEntity(this._entity) ;

        this._entity = null ;

        // Check if we cancel texture request
        if (!this._ownsTexture)
            cancelTexture(this) ;
    }

    disposeChildren ()
    {
        const parent = this ;

        this._children.forEach(
            function (element)
            {
                // Clear children just in case
                element.disposeChildren() ; 
                
                // Clear what is displayed
                if (element._entity)
                {
                    const rq = element._nkEngine.nkGraphics.RenderQueueManager.getInstance().get(0) ;
                    rq.eraseEntity(element._entity) ;
                }

                // Clear shader
                element._nkEngine.nkGraphics.ShaderManager.getInstance().erase(element._nkShader.getResourceName()) ;
                element._nkShader = null ;

                // Clear texture                    
                if (element._nkTexture && element._ownsTexture)
                    element._nkEngine.nkGraphics.TextureManager.getInstance().erase(element._nkTexture.getResourceName()) ;
                else if (element._nkTexture)
                    cancelTexture(element) ;
            }
        ) ;

        this._children = [] ;
    }

    calculateUpdateMetric (camera)
    {
        // Check bounds
        const frustum = camera.getFrustum() ;

        if (!this._unitBounds.checkAgainst(frustum))
            return -1 ;

        // Simple check
        const tileCenterLonLat = this._bounds.getCenter() ;
        const tileCenter = toCartesian(tileCenterLonLat) ;
        const tileOnSphere = tileCenter.getNormalizedVec3() ;
        const onSphere = camera.getPositionAbsolute().getNormalizedVec3() ;
        const camToSphere = camera.getPositionAbsolute().sub(onSphere) ;

        const log = -Math.log(camToSphere.getLengthVec3() * 0.25) / Math.log(2) ;
        const dotTile = Math.max(0, tileOnSphere.dotProductVec3(onSphere)) ;
        const metric = Math.min(MAX_LEVEL + 0.1, Math.max(log * dotTile, 0.0001)) ;

        if (isNaN(metric))
            return this.level ;

        return metric ;
    }
}

export { PlanetTile } ;