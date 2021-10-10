import * as THREE from 'three';
import { PlanetTile } from './PlanetTile.js';
import { BingElevationLayer } from './BingElevationLayer.js';
import { WMSLayer } from './WMSLayer.js';
import { Object3D } from 'three/src/core/Object3D';

class Planet extends Object3D {
    constructor(nkEngine, camera, center = new THREE.Vector3(0, 0, 0), radius = 6378000) {
        super();
        var self = this;
        self.radius = radius;
        self.center = center;
        self.elevationLayer;
        self.mapLayers = [];
        self._nkEngine = nkEngine ;
        var elevationLayer = new BingElevationLayer("AteBKVs9dTvvEMIEus-KRwyTybV76si7jcncQK5TG02wgMLRG82Fb6ZO2qSVNNvW");
        var wmsLayer = new WMSLayer("https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv", "gebco_latest_2")
        //var wmsLayer = new WMSLayer("https://ows.terrestris.de/osm/service", "OSM-WMS")
        this.add(new PlanetTile(nkEngine, new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI * 0.5), new THREE.Vector2(0, Math.PI * 0.5)), elevationLayer, wmsLayer, center, radius, 0));
        this.add(new PlanetTile(nkEngine, new THREE.Box2(new THREE.Vector2(0, -Math.PI * 0.5), new THREE.Vector2(Math.PI, Math.PI * 0.5)), elevationLayer, wmsLayer, center, radius, 0));

        setInterval(function () {
            // var count = 0;
            self.children.forEach(tile => {
                var frustum = new THREE.Frustum();
                frustum.setFromProjectionMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
                tile.update(camera, frustum);
                /* tile.traverse(function (element) {
                    if (element != self && element.material) {
                        if (element.material.visible) {
                            count++;
                        }
                    }
                }); */
            });
            // console.log(count);
        }, 200);
    }
}


export { Planet };