import { Layer } from "../Layer";
import { clearIntervalAsync, setIntervalAsync } from "set-interval-async/dynamic";
import { I3SPointNode } from './I3SPointNode';

import * as THREE from 'three';

//const TRANSFORM = require('transform-coordinates')
import * as TRANSFORM from '../../transform/Transformer.js';
/**
* @param {
*   root: String,
*   layer: String
* } properties 
*/
class I3SLayer extends Layer {
    constructor(properties) {
        super(properties);
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
                            tileLoader: properties.tileLoader,
                            onLoadCallback: properties.onLoadCallback,
                            loadOutsideView: properties.loadOutsideView,
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
            clearIntervalAsync(self.updateInterval);
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