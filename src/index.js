import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Map } from './Map.js';
import { UltraElevationLayer } from './layers/UltraElevationLayer';
import { UltraImageryLayer } from './layers/UltraImageryLayer';
import { SingleImageElevationLayer } from './layers/SingleImageElevationLayer';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';
import { WMSLayer } from './layers/WMSLayer.js';
import { SimpleElevationLayer } from './layers/SimpleElevationLayer.js';
import { BingMapsImagerySet, BingMapsLayer } from './layers/BingMapsLayer';
import { I3SLayer } from "./layers/i3s/I3SLayer.js";
import geoidImage from './images/egm84-15.jpg'
import earthElevationImage from './images/earth_elevation.jpg'

document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
        const cam = map.camera;
        let p = new THREE.Vector3();
        cam.getWorldDirection(p).normalize();
        console.log("{ position: new THREE.Vector3(" + cam.position.x + "," + cam.position.y + "," + cam.position.z + "), quaternion: new THREE.Quaternion(" + cam.quaternion.x + "," + cam.quaternion.y + "," + cam.quaternion.z + "," + cam.quaternion.w + ") }")
    }
});
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.add(new THREE.AmbientLight(0xFFFFFF, 1.0));

const domContainer = document.getElementById('screen');

let map = new Map({ scene: scene, divID: 'screen' });


/* map.mapNavigator.moveToCartesianSinusoidal(
    new THREE.Vector3(1323138.125100387,-4696351.773575135,4111000.619625971),
    new THREE.Quaternion(0.8576339439266205,0.06966174508783496,-0.160838910275853,0.4834688246800035),
    2000
); */
map.moveCameraAboveSurface();
map.resetCameraNearFar();

//map.mapNavigator.moveToGeodeticSinusoidal(new THREE.Vector3(0.9,0.2,100000), map.camera.quaternion, 5000, true)
/* map.mapNavigator.moveToCartesianSinusoidal(
    new THREE.Vector3(5328337.770919393,-616702.0204824861,3666880.272101925),
    new THREE.Quaternion(0.6035951782272387,0.47730443539347106,-0.07332093800495981,0.6344110472119955),
    5000,
 true
);  */
// these layers connect to custom imagery and elevation services
// var imageryLayer = new UltraImageryLayer({
//     id: 1,
//     name: "ultraElevation",
//     bounds: [-180, -90, 180, 90],
//     url: "http://localhost:8080/imagery",
//     layer: "1",
//     visible: true
// });
// var elevationLayer = new UltraElevationLayer({
//     id: 3,
//     name: "ultraElevation",
//     bounds: [-180, -90, 180, 90],
//     url: "http://localhost:8080/elevation",
//     layer: "1",
//     visible: true
// });

// var geoid = new SingleImageElevationLayer({
//     id: 8,
//     name: "ultraElevation",
//     bounds: [-180, -90, 180, 90],
//     url: geoidImage,
//     layer: "1",
//     visible: true,
//     min: -103,
//     max: 85
// });

var earthElevation = new SingleImageElevationLayer({
    id: 9,
    name: "singleImageEarthElevation",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    layer: "1",
    visible: true,
    min: 0,
    max: 8000
});

var wmsLayer = new WMSLayer({
    id: 2,
    name: "WMS",
    bounds: [-180, -90, 180, 90],
    url: "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    layer: "gebco_latest_2",
    epsg: "EPSG:4326",
    version: "1.1.1",
    visible: true
})

// var wmsLayer2 = new WMSLayer({
//     id: 20,
//     name: "BlueMarble",
//     bounds: [-180, -90, 180, 90],
//     url: "https://worldwind25.arc.nasa.gov/wms",
//     layer: "BlueMarble-200401",
//     epsg: "EPSG:4326",
//     version: "1.3.0",
//     visible: true
// })



// this is a sample elevation layer class that generates a sinusoidal terrain
// var simpleElevation = new SimpleElevationLayer({
//     id: 4,
//     name: "ultraElevation",
//     bounds: [-180, -90, 180, 90],
//     visible: true
// });

// var bingMapsLayer = new BingMapsLayer({
//     id: 5,
//     name: "bing",
//     bounds: [-180, -90, 180, 90],
//     visible: true,
//     imagerySet: "Aerial",
//     key: "AvCowrXLkgv3AJiVzJANlwC-RCYsP-u7bNLzhaK9vpWvtIQhHERhz7luBbFx40oS"

// })

var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/ayutthaya/tiledWithSkirts/tileset.json",
    //url: "http://localhost:8080/tileset.json",
    zUp: false,
    longitude: 100.5877,
    latitude: 14.3692,
    height: 100,
    //rotationY: 0.5,
    scale: 1,
    geometricErrorMultiplier: 1.0,
    loadOutsideView: true

});

// var treesLayer = new I3SLayer({
//     id: 7,
//     name: "new york trees",
//     visible: true,
//     url: "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/2015_Street_Tree_Survey_v17/SceneServer",
//     layer: "0"

// });

map.setLayer(ogc3dTiles, 6)
map.setLayer(wmsLayer, 0)
//map.setLayer(treesLayer, 1)
map.setLayer(earthElevation, 3)
//map.setLayer(simpleElevation, 2)
//map.setLayer(imageryLayer, 1)

//map.setLayer(elevationLayer, 3)

document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
        const cam = map.camera;
        let p = new THREE.Vector3();
        cam.getWorldDirection(p).normalize();
        console.log(cam.position);
        console.log(p.add(cam.position));
        console.log(cam.up.normalize())
    }
});