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
import { PerlinTerrainColorShader } from './layers/PerlinTerrainColorShader.js';
import { HoveringVehicle } from "./vehicles/HoveringVehicle.js";
import { ThirdPersonCameraController } from "./controls/ThirdPersonCameraController.js";
import { VerletSystem } from "./physics/VerletSystem.js";
import { realtimeweather } from "./layers/environment/NOAA/RealtimeWeather.js";
import earthElevationImage from "./images/earth_elevation.jpg"
import equidistant from "./images/equidistant.jpg"
import { Vector3 } from "three";
import { SimpleElevationLayer } from "./layers/SimpleElevationLayer.js";
import { EnvironmentLayer } from "./layers/environment/EnvironmentLayer.js";
import { NOAAGFSCloudsLayer } from "./layers/environment/NOAA/NOAAGFSCloudsLayer.js";
import Worley from "./layers/environment/shaders/Worley"
import Perlin from "./layers/environment/shaders/Perlin2"
import { RandomCloudsLayer } from "./layers/environment/RandomCloudsLayer.js";
import { UserControlledTrack } from "./layers/tracks/UserControlledTrack.js";
import { transformWGS84ToCartesian } from "./GeoUtils.js";
const clock = new THREE.Clock();
const gltfLoader = new GLTFLoader();

/* function remap(x, a, b, c, d) {
    return (((x - a) / (b - a)) * (d - c)) + c;
}
generateImage()
function generateImage() {
    const worley3D = new Worley();
    const perlin = new Perlin(40);
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {

            const w = 1 - (worley3D.noise({ x: (x / size) * 4, y: (y / size) * 4, z: 0.5 }, Worley.EuclideanDistance, 4, 4, 4)[0] * 0.65 +
                worley3D.noise({ x: (x / size) * 8, y: (y / size) * 8, z: 0.5 }, Worley.EuclideanDistance, 8, 8, 8)[0] * 0.25 +
                worley3D.noise({ x: (x / size) * 16, y: (y / size) * 16, z: 0.5 }, Worley.EuclideanDistance, 16, 16, 16)[0] * 0.1);

            let p = perlin.noise((x / size) * 4, (y / size) * 4, 0.5, 4) * 0.6
                + perlin.noise((x / size) * 8, (y / size) * 8, 0.5, 8) * 0.3
                + perlin.noise((x / size) * 16, (y / size) * 16, 0.5, 16) * 0.1;

            p += 0.5;
            p = Math.abs(p * 2. - 1.);
            let value = remap(p, 0, 1, w, 1)
            const color = Math.floor(value * 255); // Scale value to [0, 255]
            const index = (x + y * size) * 4;
            imageData.data[index + 0] = color; // Red
            imageData.data[index + 1] = color; // Green
            imageData.data[index + 2] = color; // Blue
            imageData.data[index + 3] = 255;   // Alpha (fully opaque)
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Export the canvas to a JPG file
    canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'generated-image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, 'image/jpeg');
} */


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
    apiKey: "AIzaSyBkYnnU1tR5GH-nr7gsT4kVvLUT8DE8Vko",
    loadOutsideView: false,
    displayCopyright: true,
    flatShading: false,
    geometricErrorMultiplier: 0.5
}); */
var shaderLayer = new PerlinTerrainColorShader({
    id: 22,
    name: "randomGroundColor",
    visible: true,
    min: -50000,
    max: 50000,
    transparency: 0.0
});
var jetElevationShaderLayer = new JetElevation({
    id: 57,
    name: "jet",
    min: -11000,
    max: 8800,
    bounds: [-180, -90, 180, 90],
    transparency: 0.5
})
var earthElevation = new SingleImageElevationLayer({
    id: 9,
    name: "singleImageEarthElevation",
    bounds: [-180, -90, 180, 90],
    url: earthElevationImage,
    //layer: "1",
    visible: true,
    min: 0,
    max: 0
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
    maxLOD: 10,
    imageSize: 512
});
var wmsLayer2 = new WMSLayer({
    id: 1,
    name: "BlueMarble",
    bounds: [-180, -90, 180, 90],
    url: "https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
    layer: "GEBCO_LATEST_SUB_ICE_TOPO",
    epsg: "EPSG:4326",
    version: "1.3.0",
    visible: true,
    imageSize: 256
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
    url: "http://localhost:8080/tileset.json",
    /* longitude: 4.91845,
    latitude: 52.37385,
    rotationX: -1.57,
    rotationY: -0.05,
    scale:0.4,
    height: 44, */
    geometricErrorMultiplier: 4,
    loadOutsideView: true,
    flatShading: false
});

var ogc3dTiles2 = new OGC3DTilesLayer({
    id: 2,
    name: "OGC 3DTiles",
    visible: true,
    url: "https://storage.googleapis.com/ogc-3d-tiles/berlinTileset/tileset.json",
    longitude: 4.918021,
    latitude: 52.373724,
    height: 1000,
    rotationY: 0.72,
    rotationX: 3.1416,
    scale: 100.0,
    geometricErrorMultiplier: 0.03,
    loadOutsideView: false,
    flatShading: true
});

var environmentLayer = new NOAAGFSCloudsLayer({
    id: 84,
    name: "clouds",
    coverage:0.5,
    debug:false,
    windSpeed: 0.0,
    minHeight:500,
    maxHeight:40000
});
var simpleElevationLayer = new SimpleElevationLayer({
    id: 978,
    name: "simpleElevationLayer",
    bounds: [-180, -90, 180, 90],
});



/* perlinElevation.getElevationSync(new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI * 0.5), new THREE.Vector2(Math.PI, Math.PI * 0.5)), 1024, 512, undefined, undefined, 7).then(elevationArray => {
//perlinElevation.getElevation({ min: { x: -Math.PI, y: -Math.PI * 0.5 }, max: { x: Math.PI, y: Math.PI * 0.5 } }, 1024, 512, undefined, undefined, 7).then(elevationArray => {
    var globalElevationMap = new THREE.DataTexture(Float32Array.from(elevationArray), 1024, 512, THREE.RedFormat, THREE.FloatType);
    globalElevationMap.needsUpdate = true;
    globalElevationMap.magFilter = THREE.LinearFilter;
    globalElevationMap.minFilter = THREE.LinearFilter;
    globalElevationMap.wrapS = THREE.ClampToEdgeWrapping;
    globalElevationMap.wrapT = THREE.ClampToEdgeWrapping;
    setupMap(globalElevationMap);
}) */

setupMap();

function setupMap(globalElevationMap) {



    let map = new Map({
        divID: 'screen',
        atmosphere: true,
        shadows: true,
        //clock: true,
        /* shadows: true,
        debug: false,
        detailMultiplier: 0.5,
        //ocean: generateLiquidColor(),
        atmosphere: true,//generateAtmosphereColor(),
        //atmosphereDensity: 0.8+Math.random()*0.4,
        //sun: Math.random()<0.25?false:new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        //globalElevation: globalElevationMap,
        rings:true,//Math.random()<0.25?true:false,
        space: new THREE.Color(0.05, 0.05, 0.2),
        clock: true,
        tileSize: 64 */

    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            const cam = map.camera;
            let p = new THREE.Vector3();
            cam.getWorldDirection(p).normalize();
            console.log("{ position: new THREE.Vector3(" + cam.position.x + "," + cam.position.y + "," + cam.position.z + "), quaternion: new THREE.Quaternion(" + cam.quaternion.x + "," + cam.quaternion.y + "," + cam.quaternion.z + "," + cam.quaternion.w + ") }")
        }
    });
    const t = new THREE.Vector3(6301200, 50, 50);
    clock.getDelta();
    for (let i = 0; i < 1000000; i++) {
        map.planet.llhToCartesian.inverse(t);
    }
    console.log("time = " + clock.getDelta())
    for (let i = 0; i < 1000000; i++) {
        t.set(6301200, 50, 50)
        map.cartesianToLlhFastSFCT(t);
    }
    console.log("time = " + clock.getDelta())
    /*const axesHelper = new THREE.AxesHelper(50000000);
    map.scene.add(axesHelper);*/
    /* let d = new Date();
        setInterval(() => {
            d.setSeconds(d.getSeconds() + 1);
            map.setDate(d);
        }, 10) */
    //map.ultraClock.setDate(new Date(2023, 2, 21, 12, 0, 0, 0));
    let h = 20;
    let m = 0;
    let s = 0;
    /* setInterval(()=>{
        const d = map.ultraClock.getDate();
        h = d.getHours();
        m = d.getMinutes();
        s = d.getSeconds();
        s+=10;
        if(s==60){
            m++;
            s=0;
        }
        if(m==60){
            m=0;
            h = (h+1)%24
        }
        map.ultraClock.setDate(new Date(2023, 2, 21, h, m, s, 0));
    },10); */
    //map.camera.position.set(4019631.932204086,305448.9859209114,4926343.029568041);
    //map.camera.quaternion.copy(new THREE.Quaternion(0.306015242224167,0.6300451739927658,0.6978639828043095,-0.14961153618426734));
    map.moveAndLookAt({ x:0, y: 0, z: 50100 }, { x: 0, y: 0, z: 50000 });
    //52.50921677914625, 13.405685233710862
    //map.setLayer(perlinElevation, 0);
    //map.setLayer(shaderLayer, 1);
    //map.setLayer(googleMaps3DTiles, 2);
    //map.setLayer(googleMaps3DTiles, 2);
    //map.setLayer(ogc3dTiles2, 3);
    map.setLayer(earthElevation, 5);
    map.setLayer(wmsLayer, 4);
    map.setLayer(environmentLayer, 8);


    /* gltfLoader.load("http://localhost:8081/billy_meier_ufo.glb", gltf=>{
        gltf.scene.scale.set(10,10,10)
        gltf.scene.traverse(o=>{
            if(o.material){
                o.material.metalness = 0.9
                o.material.roughness = 0.15
            }
        })
        var ufo = new UserControlledTrack({
            id:409,
            name:'ufo',
            mesh: gltf.scene,
            position: transformWGS84ToCartesian(2.4*0.0174533,49*0.0174533, 15000, new THREE.Vector3())
        })
        
        map.setLayer(ufo, 9);
        ufo.initControls(map.domContainer);
        map.controller.clear();
        map.controller.append(new ThirdPersonCameraController(map.camera, map.domContainer, map, ufo.getTracks(), 3, 30));
    }); */
    
    
    /* map.sunPosition.set(0,0,1);
    map.sunPosition.normalize();
    map.csm.lightDirection.copy(map.sunPosition).negate(); */


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
    let saturation = 50 + Math.random() * 10;
    let lightness = 60 + Math.random() * 40;

    return hslToRgb(hue, saturation, lightness);
}

function generateAtmosphereColor() {
    let hue = Math.floor(60 + Math.random() * 180);
    let saturation = 50 + Math.random() * 25;
    let lightness = 50 + Math.random() * 25;

    return hslToRgb(hue, saturation, lightness);

}
function generateCloudsColor() {
    let hue = Math.floor(60 + Math.random() * 180);
    let saturation = 50 + Math.random() * 25;
    let lightness = 75 + Math.random() * 25;

    return hslToRgb(hue, saturation, lightness);

}
function generateRingColor() {
    let hue = Math.floor(30 + Math.random() * 20);
    let saturation = 20 + Math.random() * 80;
    let lightness = 10 + Math.random() * 90;

    return hslToRgb(hue, saturation, lightness);
}
function generateSunColor() {
    let hue = Math.floor(220 + Math.random() * 140);
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

    return new THREE.Vector3(r, g, b);
}