import { Layer } from "./Layer";
import * as THREE from 'three';

const cartesianLocation = new THREE.Vector3();
const orientationHelper = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();

/**
 * A layer for loading and geolocating a three.js Object3D. 
 * Note that disposing of resources is not done automatically as the meshes, materials and textures may be used elsewhere.
 * It's up to the user to dispose of these resources after calling this layer's #dispose method.
 * @class
 * @extends Layer
 */
class ObjectLayer extends Layer {
    /**
     * 
     * @param {Object} properties
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {THREE.Object3D} [properties.object] a three.js object to add to the scene and georeference
     * @param {Number} [properties.longitude = 0] (optional) longitude of the model's center point in degrees.
     * @param {Number} [properties.latitude = 0] (optional) latitude of the model's center point in degrees.
     * @param {Number} [properties.height = 0] (optional) height in meters above sea level.
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     */
    constructor(properties) {

        if (!properties || !properties.object) {
            throw "Bad instanciation, ObjectLayer misses required properties."
        }


        super(properties);
        this.isObjectLayer = true;
        this.object = properties.object;
        this.object3D = new THREE.Object3D();
        this.object3D.matrixAutoUpdate = false;
        this.object3D.add(this.object);
        const self = this;
        self.properties = properties;

        if (!!properties.longitude && !!properties.latitude) {
            this.llh = new THREE.Vector3(properties.longitude, properties.latitude, !!properties.height ? properties.height : 0)
        }



    }

    /**
     * Move the object to the given location
     * @param {Number} longitude in degrees (geodetic)
     * @param {Number} latitude in degrees (geodetic)
     * @param {Number} height in meters (above wgs84)
     */
    move(longitude, latitude, height) {
        this.llh.set(longitude, latitude, height);
        this.updateLocation();
    }

    _setPlanet(planet) {
        this.planet = planet;
    }

    _addToScene(scene) {
        this.scene = scene;
        scene.add(this.object3D);
        this.updateLocation();
    }

    updateLocation() {

        if (!this.planet) {
            return;
        }
        if (this.llh) {
            const transform = this.planet.llhToCartesian.forward(this.llh);
            cartesianLocation.set(transform.x, transform.y, transform.z);
        } else {
            cartesianLocation.set(0, 0, 0);
        }

        quaternionToEarthNormalOrientation.setFromUnitVectors(up, orientationHelper.copy(cartesianLocation).normalize());
        this.object3D.quaternion.copy(quaternionToEarthNormalOrientation);
        this.object3D.position.copy(cartesianLocation);

        this.object3D.updateMatrix();
        this.object3D.updateMatrixWorld(true);
        this.object.updateMatrixWorld(true);

    }

    setVisible(visible) {
        if(visible){
            this.object3D.layers.enable(0);
        }else{
            this.object3D.layers.disable(0);
        }
        super.setVisible(visible);
    }

    dispose() {
        this.scene.remove(this.object3D);
    }

}

export { ObjectLayer }

