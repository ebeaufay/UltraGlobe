import { Map } from './Map.js';
import { UltraElevationLayer } from './layers/UltraElevationLayer';
import { UltraImageryLayer } from './layers/UltraImageryLayer';
import { WMSLayer } from './layers/WMSLayer.js';
import { SimpleElevationLayer } from './layers/SimpleElevationLayer.js';

let map = new Map({ divID: 'screen' });

// these layers connect to custom imagery and elevation services
var imageryLayer = new UltraImageryLayer({
    id:1,
    name: "ultraElevation",
    bounds: [-180,-90,180,90],
    url:"http://localhost:8080/imagery",
    layer:"1",
    visible: true
});
var elevationLayer = new UltraElevationLayer({
    id:3,
    name: "ultraElevation",
    bounds: [-180,-90,180,90],
    url:"http://localhost:8080/elevation",
    layer:"1",
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
    visible:true
})

// this is a sample elevation layer class that generates a sinusoidal terrain
var simpleElevation = new SimpleElevationLayer({
    id: 4,
    name: "ultraElevation",
    bounds: [-180, -90, 180, 90],
    visible:false
});


map.setLayer(wmsLayer, 0)
map.setLayer(simpleElevation, 2)
//map.setLayer(imageryLayer, 1)

//map.setLayer(elevationLayer, 3)

/* map.camera.position.set(-12000000, 5000000, 0);
map.camera.lookAt(0, 3500000, 0); */

document.getElementById("elevation").addEventListener('click', function () {
    simpleElevation.setVisible(!simpleElevation.visible)
});