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
import { SingleImageImageryLayer } from "./layers/SingleImageImageryLayer.js";
import { GoogleMap3DTileLayer } from "./layers/GoogleMap3DTileLayer.js";

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



   
 //new THREE.Vector3(3785340.637455419,902150.4375344106,5036895.401656743), quaternion: new THREE.Quaternion(0.39140876313901685,0.10700124939413477,-0.352335063581273,0.8433326246133608)

map.camera.position.set(3785340.637455419,902150.4375344106,5036895.401656743);
//map.camera.up.set(0.5632445449715382, 0.1897925769820766, 0.8041979608792276);
map.camera.setRotationFromQuaternion(new THREE.Quaternion(0.39140876313901685,0.10700124939413477,-0.352335063581273,0.8433326246133608)); 

map.moveCameraAboveSurface();
map.resetCameraNearFar();
map.setCameraUp();


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
    min: -100,
    max: -100
});
var imagery = new SingleImageImageryLayer({
    id: 5,
    name: "imagery",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    visible: true
})

var imageryLayer = new WMSLayer({
    id: 0,
    name: "WMS",
    bounds: [-180, -90, 180, 90],
    // url: "https://ows.terrestris.de/osm/service",
    url: "https://ows.terrestris.de/osm-gray/service",
    layer: "OSM-WMS",
    epsg: "EPSG:4326",
    version: "1.1.1",
    visible: true
  });
var wmsLayer = new WMSLayer({
    id: 20,
    name: "BlueMarble",
    bounds: [-180, -90, 180, 90],
    //url: "https://worldwind25.arc.nasa.gov/wms",
    url: "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    layer: "GEBCO_LATEST_SUB_ICE_TOPO",
    epsg: "EPSG:4326",
    version: "1.3.0",
    visible: true
})

/* var ogc3dTiles = new OGC3DTilesLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://tile.googleapis.com/v1/3dtiles/root.json",
    queryParams: { key: getDayOfYear()%2==1?"AIzaSyDYPWkPgNsShrxmY3PtQvMo_QA7u6FDiIw":"AIzaSyCHxPmhNNywr_vSmLCZdMEEF_aU5AQdV3I" },
    yUp:true,
    //zUp: true,
    //longitude: 13.42,
    //latitude: 52.4895,
    //height: 170,
    //rotationY: 0.72,
    scale: 1.1,
    geometricErrorMultiplier: 0.3,
    loadOutsideView: true,
    displayErrors: true,
    displayCopyright: true
}); */

/* var ogc3dTiles = new GoogleMap3DTileLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    
    apiKey: getDayOfYear()%2==1?"AIzaSyDYPWkPgNsShrxmY3PtQvMo_QA7u6FDiIw":"AIzaSyCHxPmhNNywr_vSmLCZdMEEF_aU5AQdV3I",
    
    loadOutsideView: true,
    displayCopyright: true
}); */

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return day;
}

//map.setLayer(imageryLayer, 0)
//map.setLayer(ogc3dTiles, 10)
//map.setLayer(earthElevation, 9)




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
