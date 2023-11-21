import { Layer } from "../Layer";
import { I3SPointNode } from './I3SPointNode';


//const TRANSFORM = require('transform-coordinates')
import * as TRANSFORM from '../../transform/Transformer.js';

/**
 * A layer for loading I3S data (only points supported)
 */
class I3SLayer extends Layer {
    /**
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.url the service url
     * @param {String} properties.layer the service layer to display
     * @param {Number} [properties.geometricErrorMultiplier = 1] (optional) between 0 and infinity, defaults to 1. controls the level of detail.
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {
        super(properties);
        this.isI3SLayer = true;
        const self = this;
        // first fetch the layer information
        fetch(properties.url + "/layers/" + properties.layer + "?f=json").then(result => {
            if (!result.ok) {
                throw new Error(`couldn't load "${properties.url}". Request failed with status ${result.status} : ${result.statusText}`);
            }
            result.json().then(json => {
                self.info = json;
                switch (self.info.layerType) {
                    case "Point":
                        self.root = new I3SPointNode({
                            url: properties.url + "/layers/" + properties.layer + "/nodes/",
                            node: "root",
                            geometricErrorMultiplier: properties.geometricErrorMultiplier,
                            transform: TRANSFORM.transform("EPSG:4326", 'EPSG:4978')
                        });
                        if (self.addToSceneCallback) self.addToSceneCallback();
                        break;
                    default: throw "unsupported layer type : " + self.info.layerType;
                }
            });
        });
    }

    addToScene(scene, camera) {
        const self = this;

        function addToScene () {
            scene.add(self.root);
            self.updateInterval.clearInterval();
            self.updateInterval = setIntervalAsync(function () {
                if (self.root) self.root.update(camera);
            }, 50);
        }
        if (!!self.root) {
            addToScene();
        }else{
            self.addToSceneCallback = addToScene;
        }
        
    }


    dispose() {
        if (this.root.dispose) this.root.dispose();
        clearIntervalAsync(this.updateInterval);
    }
}
export { I3SLayer }

function setIntervalAsync(fn, delay) {
    let timeout;

    const run = async () => {
        const startTime = Date.now();
        try {
            await fn();
        } catch (err) {
            console.error(err);
        } finally {
            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            const nextDelay = elapsedTime >= delay ? 0 : delay - elapsedTime;
            timeout = setTimeout(run, nextDelay);
        }
    };

    timeout = setTimeout(run, delay);

    return { clearInterval: () => clearTimeout(timeout) };
}