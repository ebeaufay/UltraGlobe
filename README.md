# ULTRA Globe

Displays a globe with level of detail, imagery and elevation with connection to OGC services.

![globe](https://github.com/ebeaufay/UltraGlobe/blob/master/globe.png?raw=true)
ultraMap_0.2.mp4
<video src="https://github.com/ebeaufay/UltraGlobe/ultraMap_0.2.mp4" width=180/>


Demo : https://ebeaufay.github.io/UltraGlobeDemo/


## Technical info

### Tiling

The globe is seen as a uv-sphere. At the lowest LOD, it is made up of 2 tiles. Each tile is made up of a 32 x 32 grid mesh, displaced in the shader to reflect the curvature of the earth and elevation data. 

![tiles](https://github.com/ebeaufay/UltraGlobe/blob/master/tiles.png?raw=true)

Each tile can be subdivided into 4 sub-tiles recursively depending on its relation to the camera.

### Elevation ( in progress )

Elevation is loaded as a 32 x 32 Tiles, matching the 32 x 32 grid of vertices used to display a tile. 
In order not to see holes in between tiles, each tile holds information about which neighbor is at a lower detail level. The sides of the higher detail tile are adjusted to reflect the level of detail of its neighbors
