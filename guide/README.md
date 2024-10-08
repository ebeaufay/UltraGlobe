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
    id: 1,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/berlinTileset/tileset.json",
    longitude: 13.42,
    latitude: 52.4895,
    height: 172,
    rotationY: 0.72,
    rotationX: 3.1416,
    scale: 1.0,
    geometricErrorMultiplier: 0.03,
    loadOutsideView: false
});
map.setLayer(ogc3dTiles, 1);
````

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/a8bf92c2-5f93-4556-b392-e22b89401f89)


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

##### loading strategy
Specify a loading strategy, "INCREMENTAL" (default) or "IMMEDIATE". The "incremental" strategy loads intermediate LODs while the "immediate" strategy skips them.
Immediate mode loads faster and has a lower memory footprint but holes can appear when moving the camera.

````js
var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "path/to/georeferenced/tileset.json",
    geometricErrorMultiplier: 1.5,
    loadingStrategy:"IMMEDIATE"
});
map.setLayer(ogc3dTiles, 2);
````

##### update callback
The update callback will be called on every tileset update giving info on the number of tiles loaded/rendered, the max loaded LOD and the loaded percentage.
````js
var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "path/to/georeferenced/tileset.json",
    geometricErrorMultiplier: 1.5,
    updateCallback: (stats)=>console.log(stats)
});
map.setLayer(ogc3dTiles, 2);
````


The 3DTiles support is done through this library: https://github.com/ebeaufay/threedtiles

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

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/83c5d224-d417-42b4-87d6-ef41823b6133)

#### Volumetric Clouds
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/281cbe50-fc6a-4e4c-9b52-76e1da773551)
There are currently 2 layers for clouds. NOAAGFSCloudsLayer adds real weather forecast cloud coverage:

var environmentLayer = new NOAAGFSCloudsLayer({
    id: 84,
    name: "clouds"
});

For a less realistic but more customizeable clouds layer, you can use RandomCloudsLayer:

var environmentLayer = new RandomCloudsLayer({
    id: 84,
    name: "clouds",
    coverage:0.5, overall cloud coverage percentage (between 0 and 1)
    debug:false,
    windSpeed: 0.01,
    minHeight:1000,
    maxHeight:30000,
    luminance: 0.5, // sun intensity
    density: 0.5, //cloud sample density multiplier 
    windDirection: new THREE.Vector2(1.0,0.0), // lon lat wind direction 
    color: new THREE.Vector3(1.0,1.0,1.0), // clouds color 
});

#### I3S

In the same spirit, an I3SLayer is also provided although only points are supported currently. (tell me if there's more interest)

#### Shader Color Layer

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/af7d20d9-b6a8-4de0-a724-23846ad3108f)
Shader color layers allow adding an overlay with a color that can be computed in the shader based on lon lat height position and the terrain normal.

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
      vec3 getShaderLayerColor(vec3 llh, vec3 xyz, vec3 normal, float level){
        // compute color here
      }
    `
})
map.setLayer(shaderLayer, 3)
```

note that the normal passed to the "getShaderLayerColor" function is in world space as is the xyz coordinate.

You can also pass layer specific textures through the properties.textures parameter. it should contain a map of name->THREE.Texture value pairs and the textures will be available by name as 'sampler2D' objects.

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
let imageryLayer = map.getLayerByID(0);
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
map.ultraClock.setDate(new Date(2023,5, 21, 8, 0,0,0));
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

### clock
Initializes a default widget for manipulating the time:

```js
let map = new Map({ divID: 'screen', clock:true});
```

you can also specify a widget to select the time-zone as well as a date-time picker panel:

```js
let map = new Map({ divID: 'screen', clock:{timezone:true, dateTimePicker: true});
```

If you want to change the time programatically, do it through the map.ultraClock object:

```js
map.ultraClock.setDate(new Date());
map.ultraClock.getDate(new Date());
map.ultraClock.addListener(date=> console.log(date));
```

### ThreeJS context objects
Rather than a full fledged geospatial framework. This library is intended as a lightweight library on top of threeJS. Nevertheless, the render pipeline is mildly complex hence the need to manage it in the Map object itself. You can access threejs context objects from the map:

```
Map#renderer
Map#labelRenderer
Map#camera
Map#scene
```

### Game like features
These features are destined to be more experimental and fun features. 

#### PerlinElevationLayer

```javascript
var perlinElevation = new PerlinElevationLayer({
    id: 43,
    name: "perlin elevation",
    visible: true,
    bounds: [-180, -90, 180, 90]
});
```

We'll then use this layer to compute a texture giving elevation around the world. this will be used in post to affect water flow (less flow near the coast). This step is optional.

```javascript
perlinElevation.getElevation({ min: { x: -Math.PI, y: -Math.PI * 0.5 }, max: { x: Math.PI, y: Math.PI * 0.5 } }, 2048, 1024, 7).then(elevationArray => {
    var globalElevationMap = new THREE.DataTexture(Float32Array.from(elevationArray), 1024, 512, THREE.RedFormat, THREE.FloatType);
    globalElevationMap.needsUpdate = true;
    globalElevationMap.magFilter = THREE.LinearFilter;
    globalElevationMap.minFilter = THREE.LinearFilter;
    globalElevationMap.wrapS = THREE.ClampToEdgeWrapping;
    globalElevationMap.wrapT = THREE.ClampToEdgeWrapping;
    setupMap(globalElevationMap);
})
```

The setupMap function can then specify this texture as global elevation and we're also going to activate ocean and set the water, sun and atmosphere colors to something fancy

```javascript
function setupMap(globalElevationMap) {
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: new THREE.Vector3(0.7,0.3,0.1),
        atmosphere: new THREE.Vector3(0.75,0.5,0.1),
        sun: new THREE.Vector3(0.75,0.8,1.0),
        globalElevation: globalElevationMap,
    });
}
```

This gives us something like this

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/6e9b2418-b795-41f8-9959-7fc9ba01252c)

#### PerlinTerrainColorShader

We want to add some color to the terrain. As an example, you can use the PerlinTerrainColorShader class that implements a few techniques for texturing the earth without seems and distortions. It also applies texture rotations so that the ground texture doesn't seem too repetitive.

```javascript
var shaderLayer = new PerlinTerrainColorShader({
    id: 22,
    name: "randomGroundColor",
    visible: true,
    min: perlinElevation.min,
    max: perlinElevation.max,
    transparency: 0.0
});

map.setLayer(shaderLayer, 1);
```

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/f7deaa15-0acb-4332-b308-71eacd35eb49)

Now for some extra fancyness, let's add a random space background:

```javascript
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: new THREE.Vector3(0.7,0.3,0.1),
        atmosphere: new THREE.Vector3(0.75,0.5,0.1),
        sun: new THREE.Vector3(0.75,0.8,1.0),
        globalElevation: globalElevationMap,
        space: true
    });
}
```

#### Space
space is computed on the fly in post and again applies the same tricks to avoid repetition and seems. The space background can be controlled by passing a more complete object:

```javascript
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: new THREE.Vector3(0.7,0.3,0.1),
        atmosphere: new THREE.Vector3(0.75,0.5,0.1),
        sun: new THREE.Vector3(0.75,0.8,1.0),
        globalElevation: globalElevationMap,
        space: {
            starsIntensity: 1.5,
            gasCloudsIntensity: 0.8,
            colorMap: 0.25, // this is a modulation on a pre-defined color palette,
            texRotation1 : 0.75, //radians
            texRotation2 : 1.78  // these 2 rotations avoid repetition on the sampled random texture but changing them will modify the appearance of the gas clouds
        }
    });
}
```
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/f04fba92-7c42-4185-8a4b-a53706b76cb4)

#### Planet Rings
let's also add some planet rings:

```javascript
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: new THREE.Vector3(0.7,0.3,0.1),
        atmosphere: new THREE.Vector3(0.75,0.5,0.1),
        sun: new THREE.Vector3(0.75,0.8,1.0),
        globalElevation: globalElevationMap,
        space: true,
        rings: true
    });
}
```

or with a bit more control:

```javascript
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: new THREE.Vector3(0.7,0.3,0.1),
        atmosphere: new THREE.Vector3(0.75,0.5,0.1),
        sun: new THREE.Vector3(0.75,0.8,1.0),
        globalElevation: globalElevationMap,
        space: true,
        rings: {
            origin: new THREE.Vector3(), // center of the rings, defaults to the center of the planet
            normal: new THREE.Vector3(0,1,0), //orientation of the rings
            innerRadius: 6378137.0 * 2, // twice the earth radius (all planets are actually based on the earth, this is an earth centered library after all)
            outerRadius: 6378137.0 * 3,
            colorMap: 0.6, // a modulation on a pre-defined color palette
            colorMapDisplace: 0.7, // displaces the rings. they will repeat between the inner and outer radius
        }
    });
}
```

The result should look something like this
![planet6](https://github.com/ebeaufay/UltraGlobe/assets/16924300/0da89e6e-a692-463d-a505-12a220eb1dc8)

#### Clouds 

Next we can add clouds.
In a similar manner to the other postfx, the cloud are initialized at Map instantiation:
```javascript
    
var environmentLayer = new RandomCloudsLayer({
    id: 84,
    name: "clouds",
    coverage:0.5,
    windSpeed: 0.01,
    minHeight:1000,
    maxHeight:40000,
    debug: true
});
map.setLayer(environmentLayer, 2);

```
Several of those properties may be self-evident but you can set the "debug" property to true to play around with the parameters.

<img width="785" alt="image" src="https://github.com/ebeaufay/UltraGlobe/assets/16924300/a51cf94e-f3df-4c83-b04f-203037e824c2">
<img width="1272" alt="image" src="https://github.com/ebeaufay/UltraGlobe/assets/16924300/cfdc6687-257e-445d-a780-3c2b33dca290">


If you're interested in implementing specific elevation or color shader layers, check the source.
