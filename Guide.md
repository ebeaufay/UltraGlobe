# GUIDE

## Creating a Map

In your HTML, have a div with a specific id.

````html
<body>
  <div id="screen" oncontextmenu="return false;" style="position: absolute; height:100%; width:100%; left: 0px; top:0px;"></div>
</body>
````

in your main javascript file, insert the following:

````js
import { Map } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });
````

At this point, you'll only see an atmosphere as no data has yet been loaded.
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/610fb812-ca9b-4007-8eae-b3448670cdeb)

### Loading data

Loading data is done through a layering system. Each data type has it's own layer type

#### WMS

Use the WMSLayer to add imagery from a WMS layer.

````js
import { Map, WMSLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });

var wmsLayer = new WMSLayer({
    id: 0,
    name: "WMS",
    bounds: [-180, -90, 180, 90],
    url: "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    layer: "gebco_latest_2",
    epsg: "EPSG:4326",
    version: "1.1.1",
    visible:true
})

//add a layer at index 0
map.setLayer(wmsLayer, 0);
````
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/722185b1-2b27-4e4b-b2bb-89006c0294d1)


#### Imagery from single image

You can also load imagery from a single image:
````js
import { Map, SingleImageImageryLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';
import bluemarble from './images/bluemarble.jpg'

let map = new Map({ divID: 'screen' });

var imagery = new SingleImageImageryLayer({
    id: 0,
    name: "imagery",
    bounds: [-180, -90, 180, 90],
    url: bluemarble,
    visible: true
})

//add a layer at index 0
map.setLayer(imagery, 0);
````
the imagery is expected in "equidistant cylindrical" projection (EPSG:4326).

#### Elevation

You can also add elevation from a single image 

````js
import { Map, SingleImageElevationLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';
import earthElevationImage from './images/earthElevationImage.jpg'

let map = new Map({ divID: 'screen' });
var earthElevation = new SingleImageElevationLayer({
    id: 0,
    name: "singleImageEarthElevation",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    visible: true,
    min: 0,
    max: 8000
});

//add a layer at index 0
map.setLayer(earthElevation, 0);
````

#### Custom imagery and elevation
Loading data for the entire earth from a single image is definitely not ideal as you'll be limitted in terms of quality.

chack out the classes "SimpleElevationLayer" to get an idea of how to implement your own layers to connect to a cusom imagery/elevation service or generate on the fly data.

#### Loading OGC 3DTiles

An OGC3DTilesLayer allows placing a tileset anywhere on earth

````js
import { Map, OGC3DTilesLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });
var ogc3dTiles = new OGC3DTilesLayer({
    id: 0,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/ayutthaya/tileset.json",
    zUp: false,
    longitude: 100.5877,
    latitude: 14.3692,
    height: 16,
    rotationY: 0.5,
    scale: 1,
    geometricErrorMultiplier: 1.5,
    loadOutsideView:true
});
map.setLayer(ogc3dTiles, 0);
````

In the case of a tileset that is already georeferenced (region bounding volume) you should omit the properties related to tileset positioning and scaling :

````js
var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "path/to/georeferenced/tileset.json",
    geometricErrorMultiplier: 1.5,
    loadOutsideView:true
});
map.setLayer(ogc3dTiles, 2);
````

The 3DTiles support is done through this library: https://github.com/ebeaufay/3DTilesViewer

#### Loading Google Maps 3D Tiles

Although google maps 3D Tiles can be loaded via the OGC3DTilesLayer, a specific GoogleMap3DTileLayer manages the default settings to get the data in the right location

````js
import { Map, GoogleMap3DTileLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });
var googleMaps3DTiles = new GoogleMap3DTileLayer({
    id: 0,
    name: "Google Maps 3D Tiles",
    visible: true,
    apiKey: "your google maps api key",
    loadOutsideView: true,
    displayCopyright: true,
}); 
map.setLayer(googleMaps3DTiles, 0);
````

#### I3S

In the same spirit, an I3SLayer is also provided although only points are supported currently

#### Shader Color Layer

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/af7d20d9-b6a8-4de0-a724-23846ad3108f)
Shader color layers allow adding an overlay with a color that's computed in the shader based on lon lat height position and the terrain normal.

A sample "JetElevation" layer is provided that can be added like so:

```
var shaderLayer = new JetElevation({
    id: 22,
    name: "jet",
    visible: true,
    minHeight: 0,
    maxHeight: 8000,
    transparency:0.5
})
map.setLayer(shaderLayer, 3)
```
you can also use the ShaderColorLayer directly and pass your shader code:
```
var shaderLayer = new ShaderColorLayer({
    id: 22,
    name: "shaderLayer",
    visible: true,
    minHeight: 0,
    maxHeight: 8000,
    transparency:0.5,
    shader:`
      vec3 getShaderLayerColor(float lon, float lat, float height, vec3 terrainNormal){
        // compute color here
      }
    `
})
map.setLayer(shaderLayer, 3)
```

Only a single visible layer is visualized at a time so there may be several loaded ShaderColorLayers 
but only the last visible layer will be displayed.

#### Removing layers

Layers can also be removed:

```
map.removeLayer(imageryLayer);
```
### Navigation

#### controls
The controls are on by default and handle moving around with the mouse or touch:

Pan: left mouse button / single touch

rotate: right mouse button | ctrl+left mouse button / 2 touch move right or left

zoom: mouse wheel / 2 touch move apart or closer together

The Map.controller property gives you access to the root controller object to add or replace controllers. Controllers are chained together via the append method:

````js
import { Map, PanController, RotateController, ZoomController } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });

map.controller.clear(); // clear existing controller chain

map.controller.append(new PanController(map.camera, map.domContainer, map));
map.controller.append(new RotateController(map.camera, map.domContainer, map));
map.controller.append(new ZoomController(map.camera, map.domContainer, map));
````

#### navigation through code
A utility method in the Map object allows specifying a camera location and target in geodetic coordinates (lon, lat, height).

````js
import { Map } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';
map.moveAndLookAt({x:13.42, y:52.5, z:300},{x:13.42, y:52.4895, z:170})

````

### Coordinate transform utility
A utility to transform between geodetic coordinates and cartesian coordinates is made available through the map.planet.llhToCartesin object. You can use it to convert easily and accurately between geodetic WGS84 coordinates to cartesian coordinates.

````js
const geodeticCameraPosition = map.planet.llhToCartesian.inverse(map.camera.position);
const cartesianCameraPosition = map.planet.llhToCartesian.forward(geodeticCameraPosition);
````

### Layer management
the maps LayerManager allows accessing layers

````js
let map = new Map({ divID: 'screen' });

// retrieve a layer by id
let imageryLayer = map.layerManager.getLayerByID(0);
imageryLayer.setVisible(false);

// retrieve all layers
let layers = map.getLayers();
for (let layer of layers) {
  console.log(layer.getID()+" "+layer.getName());
}

````

### screen pixel raycast

convert a location on screen to cartesians coordinates through raycasting on the depth buffer.

````js
self.domContainer.addEventListener('mouseup', (e) => {
  let sideEffect = new THREE.Vector3();          
  map.screenPixelRayCast(e.x, e.y, sideEffect)
  console.log(sideEffect);
}, false);
````

## Map parameters
These are some extra map parameters that affect the general appearance.

### Shadows
You can enable shadows and set a time:

```js
let map = new Map({ divID: 'screen', shadows:true });
map.setDate(new Date(2023,5, 21, 8, 0,0,0));
```
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/c98cdc0c-a703-4bbd-8309-adc558dceb1e)

The time will be relative to the local time-zone.
OGC3DTiles tilesets, including google map tiles, will automatically cast shadows.

### Atmosphere

change the atmosphere base color
```js
let map = new Map({ divID: 'screen', atmosphere:new THREE.Vector3(1.0,0.0,0.0) });
```
### Sun

change the sun color (only if shadows are turned on)
```js
let map = new Map({ divID: 'screen', sun:new THREE.Vector3(0.0,0.0,1.0) });
```

### Ocean

Add oceans:
```js
let map = new Map({ divID: 'screen', ocean:true });
```
The ocean will be displayed as a wgs84 ellipsoid. make sure you have good enough elevation data

You can also set the water color
```js
let map = new Map({ divID: 'screen', ocean:new THREE.Vector3(0.0,1.0,0.0) });
```

### Global Elevation

This can be used to specify a global elevation texture used for post effects

```js
let map = new Map({ divID: 'screen', globalElevation:threejsDataTexture});
```


### ThreeJS context objects
Rather than a full fledged geospatial framework. This library is intended as a lightweight library on top of threeJS. Nevertheless, the render pipeline is mildly complex hence the need to manage it in the Map object itself. You can access threejs context objects from the map:

```
Map#renderer
Map#labelRenderer
Map#camera
Map#scene
```