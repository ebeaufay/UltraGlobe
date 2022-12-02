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
import { TilesetPlacementController } from "./controls/TilesetPlacementController";
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


const domContainer = document.getElementById('screen');

let map = new Map({ divID: 'screen' });

let a = map.planet.llhToCartesian.forward({x:50, y:50, z:0})
let b = map.planet.llhToCartesian.forward({x:50, y:50, z:100})

console.log(a);
console.log(b);

 /*  
 { position: new THREE.Vector3(3782988.277509606,903028.6900325633,5038544.195198422), quaternion: new THREE.Quaternion(0.1392583650017903,0.5298290432524704,0.7535066067019033,-0.3634777659772099) }
 */

map.camera.position.set(3782988.277509606,903028.6900325633,5038544.195198422);
map.camera.up.set(0.5632445449715382, 0.1897925769820766, 0.8041979608792276);
map.camera.setRotationFromQuaternion(new THREE.Quaternion(0.1392583650017903,0.5298290432524704,0.7535066067019033,-0.3634777659772099));

map.moveCameraAboveSurface();
map.resetCameraNearFar();



//map.mapNavigator.moveToGeodeticSinusoidal(new THREE.Vector3(0.9,0.2,100000), map.camera.quaternion, 5000, true)
/* map.mapNavigator.moveToCartesianSinusoidal(
    new THREE.Vector3(5328337.770919393,-616702.0204824861,3666880.272101925),
    new THREE.Quaternion(0.6035951782272387,0.47730443539347106,-0.07332093800495981,0.6344110472119955),
    5000,
 true
);  */

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
    id: 20,
    name: "BlueMarble",
    bounds: [-180, -90, 180, 90],
    url: "https://worldwind25.arc.nasa.gov/wms",
    layer: "BlueMarble-200401",
    epsg: "EPSG:4326",
    version: "1.3.0",
    visible: true
})


var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    //url: "https://storage.googleapis.com/ogc-3d-tiles/ayutthaya/tiledWithSkirts/tileset.json",
    url: "https://storage.googleapis.com/ogc-3d-tiles/berlinTileset/tileset.json",
    zUp: true,
    longitude: 13.404954,
    latitude: 52.520008,
    height: 170,
    //rotationY: 0.5,
    scale: 1,
    geometricErrorMultiplier: 0.02,
    loadOutsideView: false
});

map.setLayer(wmsLayer, 0)
map.setLayer(ogc3dTiles, 1)
map.setLayer(earthElevation, 9)

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


//// move tilesets
/* map.addSelectionListener(selections=>{
    if(selections.selected && selections.selected.length == 1 && selections.selected[0].layer instanceof OGC3DTilesLayer){
        const oldMapController = map.controller;
        const tilesetPlacementController = new TilesetPlacementController(map.camera, map.domContainer, map, selections.selected[0].layer, ()=>{
            map.controller = oldMapController;
        })
        tilesetPlacementController.append(oldMapController);
        map.controller = tilesetPlacementController;
    }
}) */
