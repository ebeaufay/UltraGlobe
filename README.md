# ULTRA Globe

Displays a globe in threeJS with level of detail, imagery and elevation with connection to OGC web services.

<p align="center">
  <img src="https://github.com/ebeaufay/UltraGlobe/blob/master/Pic2.png" width="600" style="display: block; margin: 0 auto"/>
</p>
<p align="center">
  <img src="https://github.com/ebeaufay/UltraGlobe/blob/master/Pic1.png" width="600" style="display: block; margin: 0 auto"/>
</p>
<p align="center">
  <img src="https://github.com/ebeaufay/UltraGlobe/blob/master/tiles.jpg" width="600" style="display: block; margin: 0 auto"/>
</p>

Demo : https://ebeaufay.github.io/UltraGlobeDemo/


## How to use

In your HTML, have a div with a specific id.

````html
<body>
  <div id="screen" oncontextmenu="return false;" style="position: absolute; height:100%; width:100%; left: 0px; top:0px;"></div>
</body>
````

in your main javascript file, insert the following:

````js
import { Map } from './Map.js';

let map = new Map({ divID: 'screen' });
````

At this point, you'll only see a white sphere as no data has yet been loaded.

### Loading imagery

We'll first add a WMSLayer that connects to an OGC WMS service in order to display maps at multiple levels of detail

````js
import { Map } from './Map.js';
import { WMSLayer } from './layers/WMSLayer.js';

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
map.setLayer(imageryLayer, 0);
````

Right now, only WMS and a custom imagery service are supported. You may look at the WMSLayer class to create your own layer.

### Loading elevation

Currently, only a custom service for elevation is supported. You can implement your own ElevationLayer. 
Here we'll use the SimpleElevationLayer class to add some sinusoidal terrain to the map:

````js
import { Map } from './Map.js';
import { WMSLayer } from './layers/WMSLayer.js';

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

map.setLayer(imageryLayer, 0);

var simpleElevation = new SimpleElevationLayer({
    id: 1,
    name: "ultraElevation",
    bounds: [-180, -90, 180, 90],
    visible:false
});

map.setLayer(simpleElevation, 1);
````

### Loading OGC 3DTiles

An OGC3DTiles tileset can be added as a layer.

````js
import { Map } from './Map.js';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';

var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/ayutthaya/tileset.json",
    zUp: false,
    longitude: 100.5877 * 0.01745329251994329576923690768489,
    latitude: 14.3692 * 0.01745329251994329576923690768489,
    height: 16,
    rotationY: 0.5,
    scale: 1,
    geometricErrorMultiplier: 1.5,
    loadOutsideView:true
});
map.setLayer(ogc3dTiles, 2);
````
Only B3DM tilesets are supported right now (meshes). Point-cloud will be comming eventually, you can follow the progress of the 3DTiles implementation here: https://github.com/ebeaufay/3DTilesViewer
Furthermore, only Box and Sphere bounding volumes are supported (unrefferenced tileset).

# NILKINS

This project is being ported to the nilkins engine, a c++ engine with javascript transpilation and superior performance.
Write once and compile for web and desktop with this next generation Rendering engine : https://www.nilkinsengine.com/
