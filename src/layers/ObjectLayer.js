import { Layer } from "./Layer";
import * as THREE from 'three';
import { llhToCartesianFastSFCT } from '../GeoUtils.js';

const cartesianLocation = new THREE.Vector3();
const Up = new THREE.Vector3();
const East = new THREE.Vector3();
const North = new THREE.Vector3();
const globalNorth = new THREE.Vector3(0,0,1);
const quaternionToEarthNormalOrientation = new THREE.Quaternion();
const quaternionSelfRotation = new THREE.Quaternion();
const rotationMatrix = new THREE.Matrix4();
const rotation = new THREE.Euler(0,0,0, "ZYX");

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
     * @param {Number} [properties.yaw = 0] (optional) a yaw means the original z axis points north. ccw rotation about the model's local y axis.
     * @param {Number} [properties.pitch = 0] (optional) pitch rotates the model about it's local x axis. a pitch of 0 alligns it with the horizon, negative values tilts it downwards, positive values tilts it up.
     * @param {Number} [properties.roll = 0] (optional) roll around the model's local z axis.
     * @param {Number} [properties.scaleX = 1] (optional) scale on X axes.
     * @param {Number} [properties.scaleY = 1] (optional) scale on Y axes. defaults to the scaleX property if defined.
     * @param {Number} [properties.scaleZ = 1] (optional) scale on Z axes. defaults to the scaleX property if defined.
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
        self.move(properties.longitude, properties.latitude, properties.height, properties.yaw, properties.pitch, properties.roll, properties.scaleX, properties.scaleY?properties.scaleY:properties.scaleX, properties.scaleZ?properties.scaleZ:properties.scaleX);




    }

    /**
  * Sets the object position and orientation based on Longitude, Latitude, Height, Yaw, Pitch, Roll
  *
  * @param {number} [longitude = 0] - a longitude in degrees
  * @param {number} [latitude = 0] - a latitude in degrees
  * @param {number} [height = 0] - a height in meters above WGS 84 sea level
  * @param {number} [yaw = 0] - Yaw angle in degrees. (0 points north ccw rotation)
  * @param {number} [pitch = 0] - Pitch angle in degrees (-90 to 90)
  * @param {number} [roll = 0] - Roll angle in degrees.
  * @param {number} [scaleX = 1] - scale on X axes.
  * @param {number} [scaleY = 1] - scale on Y axes. defaults to the scaleX property if defined.
  * @param {number} [scaleZ = 1] - scale on Z axes. defaults to the scaleX property if defined.
  */
    move(longitude = 0, latitude = 0, height = 0, yaw = 0, pitch = 0, roll = 0, scaleX = 1, scaleY = 1, scaleZ = 1 ) {
        // Step 1: Clamp pitch to avoid gimbal lock
        //pitch = THREE.MathUtils.clamp(pitch, -89.9, 89.9);

        rotation.set(
            pitch*0.0174533, yaw*0.0174533, roll*0.0174533, "ZYX");

        cartesianLocation.set(longitude, latitude, height);
        llhToCartesianFastSFCT(cartesianLocation, false); // Convert LLH to Cartesian in-place

        Up.copy(cartesianLocation).normalize();
        East.crossVectors(Up, globalNorth).normalize();
        if (East.lengthSq() === 0) {
            East.set(1, 0, 0);
        }
        
        North.crossVectors(East, Up).normalize();

        
        rotationMatrix.makeBasis(East, Up, North);

        quaternionToEarthNormalOrientation.setFromRotationMatrix(rotationMatrix);

        quaternionSelfRotation.setFromEuler(rotation);
        this.object3D.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
        this.object3D.position.copy(cartesianLocation);
        this.object3D.scale.set(scaleX, scaleY, scaleZ);


        this._updateMatrices();
    }

    /**
     * Updates the object's local and world matrices.
     */
    _updateMatrices() {
        this.object3D.updateMatrix();
        this.object3D.updateMatrixWorld(true);
    }

    _setPlanet(planet) {
        this.planet = planet;
    }

    _addToScene(scene) {
        this.scene = scene;
        scene.add(this.object3D);
    }


    setVisible(visible) {
        if (visible) {
            this.object3D.layers.enable(0);
        } else {
            this.object3D.layers.disable(0);
        }
        super.setVisible(visible);
    }

    dispose() {
        this.scene.remove(this.object3D);
    }

}

export { ObjectLayer }

