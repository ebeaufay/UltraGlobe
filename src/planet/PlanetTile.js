import '../worker/WorkType.js';
import {PlanetShader} from './PlanetShader.js';

const MAX_LEVEL = 1 ;

let TILE_INDEX_NK = 0 ;
let TILE_GEOMETRY_NK = null ;

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
    const arrayIndexBuffer = new ArrayBuffer (intSize * triSize * triCount) ;
    const indexBuffer = new Int32Array (arrayIndexBuffer) ;
    let currentIndex = 0 ;
    let pointIndex = 0 ;

    for (let y = 0 ; y < resolution - 1 ; y++)
    {
        for (let x = 0 ; x < resolution - 1 ; x++)
        {
            indexBuffer[currentIndex++] = pointIndex + 0 ;
            indexBuffer[currentIndex++] = pointIndex + 1 + resolution ;
            indexBuffer[currentIndex++] = pointIndex + resolution ;

            indexBuffer[currentIndex++] = pointIndex + 0 ;
            indexBuffer[currentIndex++] = pointIndex + 1 ;
            indexBuffer[currentIndex++] = pointIndex + 1 + resolution ;

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
    cBuffer.addPassMemorySlot().setFromVector(new nkMaths.Vector (boundsMin._x, boundsMin._y, boundsMax._x, boundsMax._y)) ;
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
    tex.setFromBuffer(data._data, 0, 0) ;
    tex.load() ;

    self._nkShader.setTexture(tex, 0) ;
    self._nkTexture = tex ;

    self._uvLowerLeft = new nkEngine.nkMaths.Vector (0, 0) ;
    self._uvUpperRight = new nkEngine.nkMaths.Vector (1, 1) ;
    self._nkShader.getConstantBuffer(0).getPassMemorySlot(3).setFromVector(new nkEngine.nkMaths.Vector (self._uvLowerLeft._x, self._uvLowerLeft._y, self._uvUpperRight._x, self._uvUpperRight._y)) ;
}

class PlanetTile
{
    constructor(nkEngine, workers, unitBounds, bounds, elevationService, wmsService, planetCenter, radius, level, texture, uvLowerLeft, uvUpperRight)
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
        self._planetCenter = new nkEngine.nkMaths.Vector (0, 0, 0, 0) ;
        self._uvLowerLeft = uvLowerLeft ;
        self._uvUpperRight = uvUpperRight ;
        self._entity = null ;
        self._children = [] ;
        self._index = TILE_INDEX_NK++ ;
        self._nkTexture = texture ;

        // Compute bounds
        //const center = new this._nkEngine.nkMaths.Vector (this._unitBounds.getCenter()) ;
        //const c = new this._nkEngine.nkMaths.Vector (-(Math.cos(center.y) * Math.cos(center.x)), Math.sin(center.y), Math.cos(center.y) * Math.sin(center.x)) ;
        //const m = new this._nkEngine.nkMaths.Vector (-(Math.cos(this._unitBounds.max.y) * Math.cos(this._unitBounds.max.x)), Math.sin(this._unitBounds.max.y), Math.cos(this._unitBounds.max.y) * Math.sin(this._unitBounds.max.x)) ;

        //var boundingSphere = new THREE.Sphere(c.clone().add(this.planetCenter), c.distanceTo(m) * 1.1)

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
        const requestUrl = self.wmsService.getFullUrl(self._bounds, 1024, 1024) ;
        workers.requestWork({_type : WORK_TYPE.PARSE_IMAGE, _path : requestUrl, _index : self._index}, function (result) {onImageLoaded(result.data, nkEngine, self) ;}) ;
    }

    /**
     * Update the tree relative to the camera and available elevation data.
     * @param {*} camera 
     */
    update (camera)
    {
        var self = this ;
        const metric = this.calculateUpdateMetric(camera) ;

        if (metric == -1)
        {
            this.disposeChildren() ;
            return;
        }

        if (metric < this.level)
        {
            // Should never happen
            console.log("Metric < this.level, this should never happen, bad logic somewhere.") ;
        }
        else if (metric < this.level + 1 || this.level >= MAX_LEVEL)
        {
            // Right level
            // If texture is texture from previous layer, load new texture, invalidate children
            self.disposeChildren() ;
        }
        else
        {
            // if has children, recurse
            // else generate Children
            if (self._children.length > 0)
            {
                this._children.forEach(child => {
                        child.update(camera) ;
                    }
                ) ;
            }
            else
            {
                if (this.level < MAX_LEVEL)
                {
                    const nkGraphics = this._nkEngine.nkGraphics ;
                    const nkMaths = this._nkEngine.nkMaths ;

                    const unitBoundsCenter = new nkMaths.Vector(this._unitBounds.getCenter()) ;
                    const boundsCenter = new nkMaths.Vector(this._bounds.getCenter()) ;
                    const minUVX = this._uvLowerLeft._x ;
                    const minUVY = this._uvLowerLeft._y ;
                    const maxUVX = this._uvUpperRight._x ;
                    const maxUVY = this._uvUpperRight._y ;

                    const halfUVWidth = (maxUVX - minUVX) * 0.5 ;
                    const halfUVHeight = (maxUVY - minUVY) * 0.5 ;

                    let unitBoundsHalfSize = this._unitBounds.getMax().sub(this._unitBounds.getMin()).div(2) ;
                    let unitBoundsQuarterSize = unitBoundsHalfSize.div(2) ;
                    let unitBoundsOffset = new nkMaths.Vector (unitBoundsQuarterSize) ;

                    const boundsSides = new nkMaths.Vector(this._bounds.getAxisAlignedSides()) ;
                    const boundsQuarterSides = boundsSides.div(4) ;

                    if (this.level < 2)
                    {
                        unitBoundsQuarterSize._z = 0.5 ;
                        unitBoundsOffset._z = 0 ;
                    }

                    const unitBounds0 = new nkGraphics.BoundingBox(unitBoundsCenter.sub(unitBoundsOffset), unitBoundsHalfSize) ;
                    const unitBounds1 = new nkGraphics.BoundingBox(new nkMaths.Vector(unitBoundsCenter._x + unitBoundsOffset._x, unitBoundsCenter._y + unitBoundsOffset._y, unitBoundsCenter._z + unitBoundsOffset._z), unitBoundsHalfSize) ;
                    const unitBounds2 = new nkGraphics.BoundingBox(new nkMaths.Vector(unitBoundsCenter._x - unitBoundsOffset._x, unitBoundsCenter._y - unitBoundsOffset._y, unitBoundsCenter._z + unitBoundsOffset._z), unitBoundsHalfSize) ;
                    const unitBounds3 = new nkGraphics.BoundingBox(unitBoundsCenter.add(unitBoundsOffset), unitBoundsHalfSize) ;

                    const bounds1 = new nkGraphics.BoundingBox(boundsCenter.sub(boundsQuarterSides), boundsQuarterSides) ;
                    const bounds0 = new nkGraphics.BoundingBox(new nkMaths.Vector(boundsCenter._x + boundsQuarterSides._x, boundsCenter._y - boundsQuarterSides._y), boundsQuarterSides) ;
                    const bounds2 = new nkGraphics.BoundingBox(new nkMaths.Vector(boundsCenter._x - boundsQuarterSides._x, boundsCenter._y + boundsQuarterSides._y), boundsQuarterSides) ;
                    const bounds3 = new nkGraphics.BoundingBox(boundsCenter.add(boundsQuarterSides), boundsQuarterSides) ;

                    //this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds0, bounds0, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX, minUVY), new nkMaths.Vector(minUVX + halfUVWidth, minUVY + halfUVHeight)));
                    //this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds1, bounds1, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX + halfUVWidth, minUVY), new nkMaths.Vector(maxUVX, minUVY + halfUVHeight)));

                    this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds0, bounds0, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX + halfUVWidth, minUVY), new nkMaths.Vector(maxUVX, minUVY + halfUVHeight)));
                    this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds1, bounds1, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX, minUVY), new nkMaths.Vector(minUVX + halfUVWidth, minUVY + halfUVHeight)));
                    this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds2, bounds2, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX, minUVY + halfUVHeight), new nkMaths.Vector(minUVX + halfUVWidth, maxUVY)));
                    this._children.push(new PlanetTile(self._nkEngine, self._workers, unitBounds3, bounds3, this.elevationService, this.wmsService, this.planetCenter, this.radius, this.level + 1, self._nkTexture, new nkMaths.Vector(minUVX + halfUVWidth, minUVY + halfUVHeight), new nkMaths.Vector(maxUVX, maxUVY)));
                }
            }
        }
    }

    disposeChildren ()
    {
        if (this._children.length != 0)
        {
            this._children.forEach(
                function (element)
                {
                    // Clear child just in case
                    element.disposeChildren() ; 
                    
                    // Clear what is displayed
                    const rq = element._nkEngine.nkGraphics.RenderQueueManager.getInstance().get(0) ;
                    rq.eraseEntity(element._entity) ;

                    // Clear shader
                    element._nkEngine.nkGraphics.ShaderManager.getInstance().erase(element._nkShader.getResourceName()) ;
                    element._nkShader = null ;

                    // Clear texture
                    if (element._nkTexture)
                        element._nkEngine.nkGraphics.TextureManager.getInstance().erase(element._nkTexture.getResourceName()) ;
                }
            ) ;

            this._children = [] ;
        }
    }

    calculateUpdateMetric (camera)
    {
        // Check bounds
        const frustum = camera.getFrustum() ;

        //if (!this._unitBounds.checkAgainst(frustum))
        //{
        //    console.log("Nope") ;
        //    //console.log(this._unitBounds) ;
        //    return -1 ;
        //}

        // Compute error metrics
        const p = new this._nkEngine.nkMaths.Vector (camera.getPositionAbsolute()).sub(this._planetCenter) ;

        const pNormalized = p.getNormalizedVec3() ;
        let lat = Math.asin(pNormalized._y) ;
        let lon = Math.atan2(pNormalized._z, -pNormalized._x) ;

        if (lon > this._bounds.getMax()._x || lon < this._bounds.getMin()._x)
        {
            var max = this._bounds.getMax()._x - lon;
            max += (max > Math.PI) ? -2 * Math.PI : (max < -Math.PI) ? 2 * Math.PI : 0;

            var min = this._bounds.getMin()._x - lon;
            min += (min > Math.PI) ? -2 * Math.PI : (min < -Math.PI) ? 2 * Math.PI : 0;

            if (Math.abs(max) < Math.abs(min))
                lon = this._bounds.getMax()._x;
            else
                lon = this._bounds.getMin()._x;
        }

        lat = Math.min(this._bounds.getMax()._y, Math.max(this._bounds.getMin()._y, lat)) ;

        lat = (((lat - this._bounds.getMin()._y) / (this._bounds.getMax()._y - this._bounds.getMin()._y)) * 32) - 0.5 ; //lat in pixel coordinates
        lon = (((lon - this._bounds.getMin()._x) / (this._bounds.getMax()._x - this._bounds.getMin()._x)) * 32) - 0.5 ; // lon in pixel coordinates

        lat = Math.round(Math.max(0, Math.min(31, lat))) ;
        lon = Math.round(Math.max(0, Math.min(31, lon))) ;

        var surfaceElevation = !!this.elevationArray ? this.elevationArray[(lat * 32) + lon] + this.radius : this.radius ;
        //var surfaceElevationCenter = !!this.elevationArray ? this.elevationArray[(15 * 32) + 15] + this.radius : this.radius;
        //var surfaceElevationMax = !!this.elevationArray ? this.elevationArray[(32 * 32) - 1] + this.radius : this.radius;

        lat = (((lat + 0.5) / 32) * (this._bounds.getMax()._y - this._bounds.getMin()._y)) + this._bounds.getMin()._y ; //lat in geodetic coordinates
        lon = (((lon + 0.5) / 32) * (this._bounds.getMax()._x - this._bounds.getMin()._x)) + this._bounds.getMin()._x ; // lon in geodetic coordinates
        var nearest = new this._nkEngine.nkMaths.Vector (-(Math.cos(lat) * Math.cos(lon)), Math.sin(lat), Math.cos(lat) * Math.sin(lon)) ;
        var nearestMSE = nearest.mul(this.radius) ;
        var nearestSurface = nearest.mul(surfaceElevation) ;

        const dot = nearestMSE.sub(this._planetCenter).normalizeVec3().dotProductVec3(pNormalized) ;

        if (dot < 0)
            return -1 ;

        var distance = p.getDistanceVec3(nearestSurface) ;

        if (distance < 1)
            return MAX_LEVEL;

        var log = Math.log(distance * 0.05) / Math.log(2) ;
        const metric = Math.min(MAX_LEVEL + 0.1, Math.max(MAX_LEVEL - log, 0.0001)) ;

        if (isNaN(metric))
            return this.level ;

        return metric ;
    }
}

export { PlanetTile } ;