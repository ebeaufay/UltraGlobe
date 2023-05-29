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

let map = new Map({ divID: 'screen', shadows:false, debug: false });
let d = new Date();;
/* setInterval(()=>{
    d.setSeconds(d.getSeconds()+1);
    map.setDate(d);
}, 100) */
map.setDate(new Date(2023,5, 21, 8, 0,0,0));


//axes
/* const materialX = new THREE.LineBasicMaterial({
	color: 0xff0000
});
const pointsX = [];
pointsX.push( new THREE.Vector3( 0, 0, 0 ) );
pointsX.push( new THREE.Vector3( 10000000000, 0, 0 ) );

const geometryX = new THREE.BufferGeometry().setFromPoints( pointsX );

const lineX = new THREE.Line( geometryX, materialX );
map.scene.add( lineX );

const materialY = new THREE.LineBasicMaterial({
	color: 0x00ff00
});
const pointsY = [];
pointsY.push( new THREE.Vector3( 0, 0, 0 ) );
pointsY.push( new THREE.Vector3( 0, 10000000000, 0 ) );

const geometryY = new THREE.BufferGeometry().setFromPoints( pointsY );

const lineY = new THREE.Line( geometryY, materialY );
map.scene.add( lineY );


const materialZ = new THREE.LineBasicMaterial({
	color: 0x0000ff
});
const pointsZ = [];
pointsZ.push( new THREE.Vector3( 0, 0, 0 ) );
pointsZ.push( new THREE.Vector3( 0, 0, 10000000000 ) );

const geometryZ = new THREE.BufferGeometry().setFromPoints( pointsZ );

const lineZ = new THREE.Line( geometryZ, materialZ );
map.scene.add( lineZ ); */
   
 //new THREE.Vector3(3785340.637455419,902150.4375344106,5036895.401656743), quaternion: new THREE.Quaternion(0.39140876313901685,0.10700124939413477,-0.352335063581273,0.8433326246133608)

/* map.camera.position.set(3785340.637455419,902150.4375344106,5036895.401656743);
//map.camera.up.set(0.5632445449715382, 0.1897925769820766, 0.8041979608792276);
map.camera.setRotationFromQuaternion(new THREE.Quaternion(0.39140876313901685,0.10700124939413477,-0.352335063581273,0.8433326246133608)); 

map.moveCameraAboveSurface();
map.resetCameraNearFar();
map.setCameraUp(); */

//map.moveAndLookAt({x:-0.0062266679680371226496, y:51.513254715534870343, z:900},{x:-0.0062266679680371226496, y:51.513254715534870343, z:170})
map.moveAndLookAt({ x: 13.42, y: 52.480, z: 300 }, { x: 13.42, y: 52.4895, z: 170 })



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
    //layer: "1",
    visible: true,
    min: -150,
    max: 8000
});
var imagery = new SingleImageImageryLayer({
    id: 5,
    name: "imagery",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    visible: true
})


var wmsLayer = new WMSLayer({
    id: 20,
    name: "BlueMarble",
    bounds: [-180, -90, 180, 90],
    url: "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    layer: "GEBCO_LATEST_SUB_ICE_TOPO",
    epsg: "EPSG:4326",
    version: "1.3.0",
    visible: true
})


var ogc3dTiles = new OGC3DTilesLayer({
    id: 2,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/berlinTileset/tileset.json",
    //yUp:true,
    zUp: true,
    longitude: 13.42,
    latitude: 52.4895,
    height: 170,
    rotationY: 0.72,
    scale: 1.0,
    geometricErrorMultiplier: 0.01,
    loadOutsideView: true
});
map.setLayer(ogc3dTiles, 2);

 /* var googleMaps = new GoogleMap3DTileLayer({
    id: 6,
    name: "OGC 3DTiles",
    visible: true,
    
    apiKey: "",
    
    loadOutsideView: true,
    displayCopyright: true
});  */



map.setLayer(wmsLayer, 0)
map.setLayer(ogc3dTiles, 10)
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
