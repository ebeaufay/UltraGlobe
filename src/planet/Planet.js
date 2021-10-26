import { PlanetTile } from './PlanetTile.js';
import { BingElevationLayer } from './BingElevationLayer.js';
import { WMSLayer } from './WMSLayer.js';

class Planet
{
    constructor(nkEngine, workers, center = null, radius = 6378000)
    {
        if (!center)
            center = new nkEngine.nkMaths.Vector (0, 0, 0, 1) ;

        var self = this ;
        self.radius = radius ;
        self.center = center ;
        self.elevationLayer ;
        self.mapLayers = [] ;

        self._nkEngine = nkEngine ;
        self._tiles = [] ;

        var elevationLayer = new BingElevationLayer("AteBKVs9dTvvEMIEus-KRwyTybV76si7jcncQK5TG02wgMLRG82Fb6ZO2qSVNNvW") ;
        var wmsLayer = new WMSLayer("https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv", "gebco_latest_2") ;
        //var wmsLayer = new WMSLayer("https://ows.terrestris.de/osm/service", "OSM-WMS")

        const unitBounds0 = new nkEngine.nkGraphics.BoundingBox(new nkEngine.nkMaths.Vector(0, 0, -0.5), new nkEngine.nkMaths.Vector(1.0, 1.0, 0.5)) ;
        const unitBounds1 = new nkEngine.nkGraphics.BoundingBox(new nkEngine.nkMaths.Vector(0, 0, 0.5), new nkEngine.nkMaths.Vector(1.0, 1.0, 0.5)) ;

        const bounds0 = new nkEngine.nkGraphics.BoundingBox(new nkEngine.nkMaths.Vector(-Math.PI * 0.5, 0), new nkEngine.nkMaths.Vector(Math.PI * 0.5, Math.PI * 0.5)) ;
        const bounds1 = new nkEngine.nkGraphics.BoundingBox(new nkEngine.nkMaths.Vector(Math.PI * 0.5, 0), new nkEngine.nkMaths.Vector(Math.PI * 0.5, Math.PI * 0.5)) ;

        this._tiles.push(new PlanetTile(nkEngine, workers, unitBounds0, bounds0, elevationLayer, wmsLayer, center, radius, 0, null, null, new nkEngine.nkMaths.Vector(0, 0), new nkEngine.nkMaths.Vector(1, 1)));
        this._tiles.push(new PlanetTile(nkEngine, workers, unitBounds1, bounds1, elevationLayer, wmsLayer, center, radius, 0, null, null, new nkEngine.nkMaths.Vector(0, 0), new nkEngine.nkMaths.Vector(1, 1)));

        const camera = nkEngine.nkGraphics.CameraManager.getInstance().getDefaultCam() ;

        setInterval(function ()
            {
                // var count = 0;
                self._tiles.forEach(tile => {
                    tile.update(camera) ;
                    /* tile.traverse(function (element) {
                        if (element != self && element.material) {
                            if (element.material.visible) {
                                count++;
                            }
                        }
                    }); */
                });
                // console.log(count);
            }, 200) ;
    }
}


export { Planet } ;