import { Layer } from './Layer.js';
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
     * @param {Number} [properties.far = 3000] maximum distance for projecting the texture in meters 
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
        
        this._cameraLLH = properties.cameraLLH!=undefined ? properties.cameraLLH : new THREE.Vector3(0, 0, 0);
        this._yaw = properties.yaw!=undefined ? properties.yaw : 0;
        this._pitch = properties.pitch!=undefined ? properties.pitch : -90;
        this._roll = properties.roll!=undefined ? properties.roll : 0;
        this._fov = properties.fov!=undefined ? properties.fov : 20;
        this._far = properties.far!=undefined ? properties.far : 3000;

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
        this.setCameraFromLLHYawPitchRollFov(this._cameraLLH, this._yaw, this._pitch, this._roll, this._fov, this._far);
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
  * @param {number} far - The max distance to project the texture.
  */
    setCameraFromLLHYawPitchRollFov(llh, yaw, pitch, roll, fov, far) {
        if(llh)this._cameraLLH.copy(llh);
        if(yaw)this._yaw = yaw;
        if(pitch)this._pitch = pitch;
        if(roll)this._roll = roll;
        if(fov)this._fov = fov;
        if(far)this._far = far;
        if(!this.projectionCamera) return;

        
        rotation.set(
            pitch*0.0174533, yaw*0.0174533, roll*0.0174533, "ZYX");

        cartesianLocation.set(llh.x, llh.y, llh.z);
        llhToCartesianFastSFCT(cartesianLocation, false); // Convert LLH to Cartesian in-place

        Up.copy(cartesianLocation).normalize();
        East.crossVectors(globalNorth, Up).normalize();
        if (East.lengthSq() === 0) {
            East.set(1, 0, 0);
        }
        North.crossVectors(East, Up).normalize();

        
        rotationMatrix.makeBasis(East, Up, North);

        quaternionToEarthNormalOrientation.setFromRotationMatrix(rotationMatrix);

        quaternionSelfRotation.setFromEuler(rotation);
        this.projectionCamera.quaternion.copy(quaternionToEarthNormalOrientation).multiply(quaternionSelfRotation);
        this.projectionCamera.position.copy(cartesianLocation);
        

        // Step 12: Set FOV and update camera matrices
        this.projectionCamera.fov = fov;
        this.projectionCamera.far = this._far;
        this.projectionCamera.matrixWorldNeedsUpdate = true;
        this.projectionCamera.updateMatrix();
        this.projectionCamera.updateMatrixWorld(true);
        this.projectionCamera.updateProjectionMatrix();
    }

    
}
export { ProjectedLayer }