// @ts-nocheck
import "regenerator-runtime/runtime.js";
import * as THREE from 'three';
import { Map } from './Map.js';
import { PerlinElevationLayer } from "./layers/PerlinElevationLayer.js";
import { JetElevation } from "./layers/JetElevation.js";
import { SingleImageElevationLayer } from "./layers/SingleImageElevationLayer.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OGC3DTilesLayer } from './layers/OGC3DTilesLayer.js';
import { WMSLayer } from './layers/WMSLayer';
import { SingleImageImageryLayer } from './layers/SingleImageImageryLayer';
import { GoogleMap3DTileLayer } from './layers/GoogleMap3DTileLayer.js';
import { PerlinTerrainColorShader } from './layers/PerlinTerrainColorShader.js'
import { HoveringVehicle } from "./vehicles/HoveringVehicle.js";
import { ThirdPersonCameraController } from "./controls/ThirdPersonCameraController.js";
import { VerletSystem } from "./physics/VerletSystem.js";

import earthElevationImage from "./images/earth_elevation.jpg"
import equidistant from "./images/equidistant.jpg"
import { Vector3 } from "three";
import { SimpleElevationLayer } from "./layers/SimpleElevationLayer.js";
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();

document.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
        const cam = map.camera;
        let p = new THREE.Vector3();
        cam.getWorldDirection(p).normalize();
        console.log("{ position: new THREE.Vector3(" + cam.position.x + "," + cam.position.y + "," + cam.position.z + "), quaternion: new THREE.Quaternion(" + cam.quaternion.x + "," + cam.quaternion.y + "," + cam.quaternion.z + "," + cam.quaternion.w + ") }")
    }
});


const domContainer = document.getElementById('screen');

var perlinElevation = new PerlinElevationLayer({
    id: 43,
    name: "perlin elevation",
    visible: true,
    bounds: [-180, -90, 180, 90]
});

/* var googleMaps3DTiles = new GoogleMap3DTileLayer({
    id: 3,
    name: "Google Maps 3D Tiles",
    visible: true,
    apiKey: "",
    loadOutsideView: true,
    displayCopyright: true,
    flatShading: false
}); */
var shaderLayer = new PerlinTerrainColorShader({
    id: 22,
    name: "randomGroundColor",
    visible: true,
    minHeight: perlinElevation.min,
    maxHeight: perlinElevation.max,
    transparency: 0.0
});
var jetElevationShaderLayer = new JetElevation({
    id: 57,
    name: "jet",
    min: -11000,
    max: 8800,
    bounds: [-180, -90, 180, 90],
    transparency:0.5
})
var earthElevation = new SingleImageElevationLayer({
    id: 9,
    name: "singleImageEarthElevation",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    //layer: "1",
    visible: true,
    min: 0,
    max: 8800
});
var wmsLayer = new WMSLayer({
    id: 20,
    name: "BlueMarble",
    bounds: [-180, -90, 180, 90],
    url: "https://tiles.maps.eox.at/",
    layer: "bluemarble",
    epsg: "EPSG:4326",
    version: "1.1.1",
    visible: true,
    maxLOD:10
});
var imagery = new SingleImageImageryLayer({
    id: 5,
    name: "imagery",
    bounds: [-180, -90, 180, 90],
    url: equidistant,
    visible: true
});

var ogc3dTiles = new OGC3DTilesLayer({
    id: "jhvbg",
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/ayutthaya/tiledWithSkirts/tileset.json",
    longitude: 40.5877,
    latitude: 14.3692,
    height: 16,
    //rotationY: 0.5,
    rotationX: -1.57,
    scale: 10000.0,
    geometricErrorMultiplier: 1,
    loadOutsideView: true,
    flatShading: true
});
var simpleElevationLayer = new SimpleElevationLayer({
    id:"simpleElevationLayer",
    name:"simpleElevationLayer",
    bounds: [-180, -90, 180, 90],
});

perlinElevation.getElevation({ min: { x: -Math.PI, y: -Math.PI * 0.5 }, max: { x: Math.PI, y: Math.PI * 0.5 } }, 1024, 512, 7).then(elevationArray => {
    var globalElevationMap = new THREE.DataTexture(Float32Array.from(elevationArray), 1024, 512, THREE.RedFormat, THREE.FloatType);
    globalElevationMap.needsUpdate = true;
    globalElevationMap.magFilter = THREE.LinearFilter;
    globalElevationMap.minFilter = THREE.LinearFilter;
    globalElevationMap.wrapS = THREE.ClampToEdgeWrapping;
    globalElevationMap.wrapT = THREE.ClampToEdgeWrapping;
    setupMap(globalElevationMap);
})



function setupMap(globalElevationMap) {
    
    let map = new Map({
        divID: 'screen',
        shadows: true,
        debug: false,
        ocean: false,//generateLiquidColor(),
        atmosphere: generateAtmosphereColor(),
        sun: generateSunColor(),
        globalElevation: globalElevationMap,
    });

    const t = new THREE.Vector3(6301200,50,50);
    clock.getDelta();
    for(let i = 0; i<1000000; i++){
        map.planet.llhToCartesian.inverse(t);
    }
    console.log("time = "+clock.getDelta())
    for(let i = 0; i<1000000; i++){
        t.set(6301200,50,50)
        map.cartesianToLlhFastSFCT(t);
    }
    console.log("time = "+clock.getDelta())
    /*const axesHelper = new THREE.AxesHelper(50000000);
    map.scene.add(axesHelper);*/
    /* let d = new Date();
        setInterval(() => {
            d.setSeconds(d.getSeconds() + 1);
            map.setDate(d);
        }, 10) */
    map.setDate(new Date(2023, 5, 21, 10, 0, 0, 0));
    let h = 20;
    let m = 0;
    /* setInterval(()=>{
        map.setDate(new Date(2023, 5, 21, h, m++, 0, 0));
        if(m==60){
            m=0;
            h = (h+1)%24
        }
    },5000); */

    map.moveAndLookAt({ x: 0.0, y: 0.0000, z: 10000000 }, { x: 0, y: 1, z: 170 });

    map.setLayer(perlinElevation, 0);
    map.setLayer(wmsLayer, 1);
    //map.setLayer(ogc3dTiles, 2);
    //map.setLayer(googleMaps3DTiles, 2);
    //map.setLayer(ogc3dTiles, 3);


    /* document.addEventListener('keyup', (e) => {
        if (e.key === 't') {
            let position = new THREE.Vector3();
            map.screenPixelRayCast(map.domContainer.offsetWidth * (0.5), map.domContainer.offsetHeight * (0.5), position);

            let l = position.length();
            position.normalize().multiplyScalar(l + 50);

            
            gltfLoader.load("http://localhost:8081/little_hover_tank.glb", gltf => {
                gltf.scene.position.copy(position);
                position.multiplyScalar(1.1);
                gltf.scene.scale.set(1.0, 1.0, 1.0);
                gltf.scene.lookAt(position);
                gltf.scene.rotateX(Math.PI / 2);
                gltf.scene.traverse(node => {
                    if (node.isMesh) node.castShadow = true;
                });


                map.scene.add(gltf.scene);
                let hoveringVehicle = new HoveringVehicle({
                    object3D: gltf.scene,
                    planet: map.planet,
                    hoverHeight: 1,
                });
                setInterval(() => {
                    hoveringVehicle.update(clock.getDelta())
                }, 1);

                map.controller = new ThirdPersonCameraController(map.camera, map.domContainer, map, gltf.scene, 10, 30)

                document.addEventListener('keyup', (e) => {
                    switch (e.key) {
                        case 'ArrowUp': hoveringVehicle.moveForward = false;
                            break;
                        case 'ArrowDown': hoveringVehicle.moveBackward = false;
                            break;
                        case 'ArrowLeft': hoveringVehicle.moveLeft = false;
                            break;
                        case 'ArrowRight': hoveringVehicle.moveRight = false;
                            break;
                    }
                });
                document.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowUp': hoveringVehicle.moveForward = true;
                            break;
                        case 'ArrowDown': hoveringVehicle.moveBackward = true;
                            break;
                        case 'ArrowLeft': hoveringVehicle.moveLeft = true;
                            break;
                        case 'ArrowRight': hoveringVehicle.moveRight = true;
                            break;
                    }
                })
            })
        }
    }); */
}






/* var earthElevation = new SingleImageElevationLayer({
    id: 9,
    name: "singleImageEarthElevation",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    //layer: "1",
    visible: true,
    min: 0,
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
    url: "https://tiles.maps.eox.at/",
    layer: "bluemarble",
    epsg: "EPSG:4326",
    version: "1.1.1",
    visible: true
})


var bingMaps = new BingMapsLayer({
    id: 21,
    name: "BingAerial",
    imagerySet: BingMapsImagerySet.aerial,
    key: "AvCowrXLkgv3AJiVzJANlwC-RCYsP-u7bNLzhaK9vpWvtIQhHERhz7luBbFx40oS",
    visible: true
})

var ogc3dTiles = new OGC3DTilesLayer({
    id: 2,
    name: "OGC 3DTiles",
    visible: true,
    url: "http://localhost:8080/georef_tileset.json",
    //yUp:false,
    longitude: 0,
    latitude: 0,
    height: 100,
    //centerModel:true,

    rotationX: -1.57,
    //rotationY: 180,
    //rotationZ: 180,
    scale: 1.0,
    geometricErrorMultiplier: 1,
    loadOutsideView: false,
    flatShading: false
});
ogc3dTiles.update(); */


/* var googleMaps3DTiles = new GoogleMap3DTileLayer({
    id: 3,
    name: "Google Maps 3D Tiles",
    visible: true,
    apiKey: "",
    loadOutsideView: true,
    displayCopyright: true,
    flatShading: false
});  */




//map.setLayer(wmsLayer, 0)
//map.setLayer(ogc3dTiles, 1)

//map.setLayer(googleMaps3DTiles, 3);









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
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

function generateLiquidColor() {
    let hue = Math.floor(Math.random() * 360);
    let saturation = 25 + Math.random() * 50;
    let lightness = 30 + Math.random() * 40;

    return hslToRgb(hue, saturation, lightness);
}

function generateAtmosphereColor() {
    let hue = Math.floor(60+Math.random()* 180);
    let saturation = 50+Math.random() * 25;
    let lightness = 50 + Math.random() * 25;
    
    return hslToRgb(hue, saturation, lightness);
}
function generateSunColor() {
    let hue = Math.floor(220+Math.random()* 140);
    let saturation = 100;
    let lightness = 50 + Math.random() * 50;
    
    return hslToRgb(hue, saturation, lightness);
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    // Adding 'm' to match the desired lightness
    r = r + m;
    g = g + m;
    b = b + m;

    return new THREE.Vector3(r,g,b);
}