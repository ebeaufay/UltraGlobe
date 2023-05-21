[![Version](https://img.shields.io/npm/v/@jdultra/ultra-globe?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)
[![Downloads](https://img.shields.io/npm/dt/@jdultra/ultra-globe.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)

# U L T R A G L O B E  :  http://www.jdultra.com/

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/80af2644-fa32-48c4-b0d7-3c33a590718d)
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/83c5d224-d417-42b4-87d6-ef41823b6133)

Displays the earth with level of detail, imagery, elevation and connection to OGC web services.

The earth model is wgs 84.

Support for WMS and OGC 3DTiles.

Partial I3S support.

## startup project
Here's a simple getting started project: [ULTRAGLOBE getting started](https://drive.google.com/file/d/1ECn7C98WRZRlaNhz_CG5sVFWkwG4mvTb/view?usp=share_link)

unzip and run:

```
npm install
```
```
npm run dev
```

## Demos

[Google Map Tile API](https://www.jdultra.com/mapTiles/index.html)

[3DTiles](https://ebeaufay.github.io/UltraGlobeDemo/)

[Berlin (3 km²)](https://www.jdultra.com/berlin/index.html)

[Geoid](https://storage.googleapis.com/jdultra.com/geoid/index.html)

[Elevation and WMS imagery](https://storage.googleapis.com/jdultra.com/elevation/index.html)

[I3S Points (new york trees) and blue marble](https://storage.googleapis.com/jdultra.com/i3s/index.html)

[Controls (including mobile)](https://storage.googleapis.com/jdultra.com/controllers/index.html)

[More controls for selecting and moving 3DTiles tilesets](https://storage.googleapis.com/jdultra.com/tilesetplacement/index.html)

[Random planet](https://www.jdultra.com/planet/index.html)

## API

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

At this point, you'll only see a black planet with atmosphere as no data has yet been loaded.

### Loading data

Loading data is done through a layering system. Each data type has it's own layer type

#### WMS

Use the WMSLayer to add imagery from a WMS layer.

````js
import { Map, WMSLayer } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';

let map = new Map({ divID: 'screen' });

var wmsLayer = new C({
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

chack out the classes "SimpleElevationLayer" and "UltraImageryLayer" to get an idea of how to implement your own layers to connect to your imagery/elevation service or generate on the fly data.

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

Layers can also be removed:

#### I3S

In the same spirit, an I3SLayer is also provided although only points are supported currently

#### Removing layers
```
map.removeLayer(imageryLayer);
```
### Navigation

#### controls
The controls are on by default and handle moving around with the mouse or touch.

The Map.controller property gives you access to the root controller object.

If you need to implement custom controls, you can look at the existing implementation in "src/controls/" and also check the Map#initController method.

#### navigation through code
A utility method in the Map object allows specifying a camera location and target in geodetic coordinates (lon, lat, height).

````js
import { Map } from '@jdultra/ultra-globe/dist/ultraglobe.min.js';
map.moveAndLookAt({x:13.42, y:52.5, z:300},{x:13.42, y:52.4895, z:170})

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

### Coordinate transform utility
A utility to transform between geodetic coordinates and cartesian coordinates is made available through the map.planet.llhToCartesin object. You can use it to convert easily and accurately between geodetic WGS84 coordinates to cartesian coordinates.

````js
const geodeticCameraPosition = map.planet.llhToCartesian.inverse(map.camera.position);
const cartesianCameraPosition = map.planet.llhToCartesian.forward(geodeticCameraPosition);
````

### ThreeJS context objects
Rather than a full fledged geospatial framework. This library is intended as a lightweight library on top of threeJS. Nevertheless, the render pipeline is mildly complex hence the need to manage it in the Map object itself. You can access threejs context objects from the map:

```
Map#renderer
Map#labelRenderer
Map#camera
Map#scene
```
