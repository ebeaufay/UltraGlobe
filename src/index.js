import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Map } from './Map.js';
import { UltraElevationLayer } from './layers/UltraElevationLayer';
import { UltraImageryLayer } from './layers/UltraImageryLayer';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer';
import { WMSLayer } from './layers/WMSLayer.js';
import { SimpleElevationLayer } from './layers/SimpleElevationLayer.js';
import { BingMapsImagerySet, BingMapsLayer } from './layers/BingMapsLayer';


document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
        const cam = map.camera;
        let p = new THREE.Vector3();
        cam.getWorldDirection(p).normalize();
        console.log("{ position: new THREE.Vector3("+cam.position.x+","+cam.position.y+","+cam.position.z+"), quaternion: new THREE.Quaternion("+cam.quaternion.x+","+cam.quaternion.y+","+cam.quaternion.z+","+cam.quaternion.w+") }")
    }
});

let map = new Map({ divID: 'screen' });
map.camera.position.set(1135374.1079837575, 1582929.2067864006, 6073246.228415415);
map.camera.up.set(0.07262682094327516, 0.12390382390695276, 0.9896328548006621);
map.camera.lookAt(1135373.469332833, 1582928.4504241983, 6073246.369982416);

map.moveCameraAboveSurface();
map.resetCameraNearFar();
map.camera.updateProjectionMatrix();
//map.mapNavigator.moveToGeodeticSinusoidal(new THREE.Vector3(0.9,0.2,100000), map.camera.quaternion, 5000, true)
/*map.mapNavigator.moveThroughCartesianSinusoidalSmooth(
 [new THREE.Vector3(-3801661.953649642,5493319.0414049085,-965899.9395956083),new THREE.Vector3(-4140562.0957549973,5543729.045920986,1129637.24563917), new THREE.Vector3(-3133082.467283349,5566781.494291212,696080.8143572904)],
 [new THREE.Quaternion(-0.24275813559876883,0.936981381419383,0.1716691926451317,-0.1834777010173254),new THREE.Quaternion(-0.05333718681073973,-0.5692385193522304,0.007440687832537013,0.8204067824886478), new THREE.Quaternion(-0.21066558480298186,0.24311229885578783,0.31293733595080436,0.8936367524294675)],
 10000,
 true
);*/

// these layers connect to custom imagery and elevation services
var imageryLayer = new UltraImageryLayer({
    id: 1,
    name: "ultraElevation",
    bounds: [-180, -90, 180, 90],
    url: "http://localhost:8080/imagery",
    layer: "1",
    visible: true
});
var elevationLayer = new UltraElevationLayer({
    id: 3,
    name: "ultraElevation",
    bounds: [-180, -90, 180, 90],
    url: "http://localhost:8080/elevation",
    layer: "1",
    visible: true
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



// this is a sample elevation layer class that generates a sinusoidal terrain
var simpleElevation = new SimpleElevationLayer({
    id: 4,
    name: "ultraElevation",
    bounds: [-180, -90, 180, 90],
    visible: false
});

var bingMapsLayer = new BingMapsLayer({
    id: 5,
    name: "bing",
    bounds: [-180, -90, 180, 90],
    visible: true,
    imagerySet: "Aerial",
    key: "AvCowrXLkgv3AJiVzJANlwC-RCYsP-u7bNLzhaK9vpWvtIQhHERhz7luBbFx40oS"

})

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

map.setLayer(ogc3dTiles, 6)
map.setLayer(wmsLayer, 0)
//map.setLayer(simpleElevation, 2)
//map.setLayer(imageryLayer, 1)

//map.setLayer(elevationLayer, 3)

document.getElementById("elevation").addEventListener('click', function () {
    simpleElevation.setVisible(!simpleElevation.visible)
});
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