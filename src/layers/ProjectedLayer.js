import { Layer } from './Layer.js';
import * as THREE from 'three';


/**
 * Projected layers are draped onto other data from the given perspective
 */
class ProjectedLayer extends Layer {
    /**
     * construct a projected layer that will project a three.js onto other loaded geospatial data from the given perspective.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {THREE.Texture} [properties.texture = null] a three.js texture
     * @param {Number} [properties.fov = 20] frustum vertical field of view of the video camera.
     * @param {THREE.Vector3} [properties.cameraLLH = new THREE.Vector3(0,0,0)] the position of the camera in longitude (degrees) latitude (degrees) height (meters)
     * @param {Number} [properties.yaw = 0] - Yaw angle in degrees
     * @param {Number} [properties.pitch = -90] - Pitch angle in degrees.
     * @param {Number} [properties.roll = 0] - Roll angle in degrees.
     * @param {Boolean} [properties.depthTest = true] depth test prevents drawing the projected texture behind occluders but the precision is limitted at long distances
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {Boolean} [showFrustum = true] show the projection camera frustum
     * @param {Boolean} [chromaKeying = false] use chroma key (green screen)
     * @param {THREE.Vector3} [chromaKey = new THREE.Vector3(0.5,1.0,0.5)] chroma key color
     * @param {Number} [chromaKeyTolerance = 0.5] tolerance for chroma key (0 to sqrt(3))
     */
    constructor(properties) {
        super(properties);
        this.isProjectedLayer = true;
        this.depthTest = properties.depthTest != undefined ? properties.depthTest : true;
        
        this._cameraLLH = !!properties.cameraLLH ? properties.cameraLLH : new THREE.Vector3(0, 0, 0);
        this._yaw = !!properties.yaw ? properties.yaw : 0;
        this._pitch = !!properties.camerapitch ? properties.camerapitch : -90;
        this._roll = !!properties.roll ? properties.roll : 0;
        this._fov = !!properties.fov ? properties.fov : 20;

        this.showFrustum = properties.showFrustum!=undefined?properties.showFrustum:true;

        this.chromaKeying = properties.chromaKeying != undefined? properties.chromaKeying:false;
        this.chromaKey = properties.chromaKey != undefined? properties.chromaKey:new THREE.Vector3(0.5,1.0,0.5);
        this.chromaKeyTolerance = properties.chromaKeyTolerance != undefined? properties.chromaKeyTolerance:0.5;

        if(properties.texture){
            this.setTexture(properties.texture);
        }
    }

    /**
     * Set a texture to be projected
     */
    setTexture(texture) {
        const self = this;
        self.texture = texture;
        self.isInitialized = false;
        if(this.renderTarget) this.renderTarget.dispose();
        this.renderTarget = undefined;
        
        // Check if the texture is loaded
        if (texture.image && texture.image.width && texture.image.height) {
            self.width = texture.image.width;
            self.height = texture.image.height;
            self._initCameraAndTarget();
        }
    }

    isReady(){
        if(this.isInitialized) return true;
        if(!this.renderTarget && this.texture){
            if (this.texture.image && this.texture.image.width > 0 && this.texture.image.height > 0) {
                this.width = this.texture.image.width;
                this.height = this.texture.image.height;
                this._initCameraAndTarget();
                if(this.isInitialized) return true;
            }
            if (this.texture.image && this.texture.image.videoWidth > 0 && this.texture.image.videoHeight > 0) {
                this.width = this.texture.image.videoWidth;
                this.height = this.texture.image.videoHeight;
                this._initCameraAndTarget();
                if(this.isInitialized) return true;
            }
        }
        return false;
    }

    _initCameraAndTarget() {
        this.projectionCamera = new THREE.PerspectiveCamera(this._fov, this.width / this.height, 0.1, 3000);
        this.projectionRenderCamera = this.projectionCamera.clone();
        this.setCameraFromLLHYawPitchRollFov(this._cameraLLH, this._yaw, this._pitch, this._roll, this._fov);
        if(this.renderTarget) this.renderTarget.dispose();
        this.renderTarget = new THREE.WebGLRenderTarget(Math.min(1080,this.width), Math.min(1080,this.height));
        this.renderTarget.texture.format = THREE.RGBAFormat;
        this.renderTarget.texture.type = THREE.FloatType;
        this.renderTarget.texture.colorSpace = THREE.NoColorSpace;
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.texture.generateMipmaps = false;
        this.renderTarget.texture.premultiplyAlpha = false;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthBuffer = true;
        this.renderTarget.depthTexture = new THREE.DepthTexture();
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.FloatType;
        if(this.map){
            this._initWithMap();
        }
    }

    _initWithMap(){
        if(this.map && this.renderTarget){
            if(this.showFrustum){
                if(this.helper){
                    this.map.scene.remove(this.helper);
                    this.helper.traverse(o=>{
                        if(o.dispose) o.dispose();
                        if(o.material) o.material.dispose();
                    })
                }
                this.helper = new THREE.CameraHelper(this.projectionCamera);
                this.helper.layers.set(31);
                this.map.scene.add(this.helper);
            }
            this.isInitialized = true;
        }
        
    }

    _init(map) {
        this.map = map;
        this._initWithMap();
    }

    /**
  * Sets the video camera's position and orientation based on Longitude, Latitude, Height, Yaw, Pitch, Roll, and FOV.
  *
  * @param {THREE.Vector3} llh - A Vector3 where:
  *   - x = Longitude in degrees
  *   - y = Latitude in degrees
  *   - z = Height in meters
  * @param {number} yaw - Yaw angle in degrees. (0 points north ccw rotation)
  * @param {number} pitch - Pitch angle in degrees (-90 to 90)
  * @param {number} roll - Roll angle in degrees.
  *   - Rotation around the Forward vector (local Y-axis).
  * @param {number} fov - The camera's vertical field of view in degrees.
  */
    setCameraFromLLHYawPitchRollFov(llh, yaw, pitch, roll, fov) {
        pitch = Math.min(89.9, Math.max(-89.9, pitch));
        this._cameraLLH = llh;
        this._yaw = yaw;
        this._pitch = pitch;
        this._roll = roll;
        this._fov = fov;
        if(!this.projectionCamera) return;
        const cartesian = new THREE.Vector3(llh.x, llh.y, llh.z);
        this._llhToCartesianFastSFCT(cartesian, false); // Convert LLH to Cartesian in-place

        // Step 2: Compute Local Up vector (points away from Earth's center)
        const Up = cartesian.clone().normalize();

        // Step 3: Define Global North (assumed Y-axis)
        const globalNorth = new THREE.Vector3(0, 1, 0);

        // Step 4: Compute Local East vector
        const East = new THREE.Vector3().crossVectors(Up, globalNorth).normalize();
        // Handle the singularity at the poles
        if (East.length() === 0) {
            // At the poles, define East arbitrarily
            East.set(1, 0, 0);
        }

        // Step 5: Compute Local North vector
        const North = new THREE.Vector3().crossVectors(East, Up).normalize();

        // Step 5: Initialize Forward vector as North
        let Forward = North.clone();

        // Step 6: Apply Yaw rotation around Up vector
        const yawRad = THREE.MathUtils.degToRad(yaw);
        Forward.applyAxisAngle(Up, yawRad).normalize();

        // Step 7: Compute Right vector as cross of Up and Forward
        const Right = new THREE.Vector3().crossVectors(Forward, Up).normalize();

        // Step 8: Apply Pitch rotation around Right vector
        const pitchRad = THREE.MathUtils.degToRad(pitch);
        Forward.applyAxisAngle(Right, pitchRad).normalize();

        // Step 9: Compute the target point the camera should look at
        const target = cartesian.clone().add(Forward);



        // Step 11: Apply Roll by rotating the Up vector around Forward vector
        const rollRad = THREE.MathUtils.degToRad(roll);
        Up.crossVectors(Right, Forward);
        Up.applyAxisAngle(Forward, rollRad).normalize();
        this.projectionCamera.up.copy(Up);

        // Step 10: Set camera position and orientation using lookAt
        this.projectionCamera.position.copy(cartesian);
        this.projectionCamera.lookAt(target);

        // Step 12: Set FOV and update camera matrices
        this.projectionCamera.fov = fov;
        this.projectionCamera.matrixWorldNeedsUpdate = true;
        this.projectionCamera.updateMatrix();
        this.projectionCamera.updateMatrixWorld(true);
        this.projectionCamera.updateProjectionMatrix();
    }

    _llhToCartesianFastSFCT(llh, radians = false) {
        const lon = radians ? llh.x : 0.017453292519 * llh.x;
        const lat = radians ? llh.y : 0.017453292519 * llh.y;
        const N = 6378137.0 / (Math.sqrt(1.0 - (0.006694379990141316 * Math.pow(Math.sin(lat), 2.0))));
        const cosLat = Math.cos(lat);
        const cosLon = Math.cos(lon);
        const sinLat = Math.sin(lat);
        const sinLon = Math.sin(lon);
        const nPh = (N + llh.z);

        llh.set(nPh * cosLat * cosLon, nPh * cosLat * sinLon, (0.993305620009858684 * N + llh.z) * sinLat);
    }
}
export { ProjectedLayer }