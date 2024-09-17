import * as THREE from 'three';
import { EnvironmentLayer } from './EnvironmentLayer.js';
import perlinWorley3D from "../../images/perlinWorley3D_128.bin";
import blueNoise from '../../images/blueNoise.png';
import {CloudsShader} from './shaders/CloudsShader'
import {CloudsBlurShader} from './shaders/CloudsBlurShader'

let cloudsTarget;
let cloudsBlurTarget1;
let cloudsBlurTarget2;
let cloudsMaterial;
let blurMaterial;
const previousCameraPositon = new THREE.Vector3();
const previousCameraQuaternion = new THREE.Quaternion();

let textureCallback;

let perlinWorley3DDataTexture;
let blueNoiseTexture;

const clock = new THREE.Clock();



/**
 * Base class for clouds layer. 
 * @class
 * @extends EnvironmentLayer
 */
class CloudsLayer extends EnvironmentLayer {
    /**
     * A volumetric clouds layer that allows specifying custom code to compute cloud opacity per sample.
     * See {@class NOAAGFSCloudsLayer} or {@class RandomCloudsLayer} for directly useable implementations.
     * 
     * The given shader glsl code {@param properties.sampleDensityFunction} will be inserted in the clouds shader and 
     * used to compute volume sample densities. It must implement a function "float sampleDensity(vec3 samplePosition, float lod)".
     * The lod shall be a value between 0 and 4 where 0 indicates samples closer to the camera and 4 indicates samples further away. 
     * 
     * Extra uniforms can be specified through the @param{properties.extraUniforms} and will be available in the shader by their key.
     * Only the following types are allowed: number, boolean, THREE.Vector2, THREE.Vector3, THREE.Vector4, THREE.Matrix3, THREE.Matrix4,
     * THREE.Data3DTexture, THREE.DataArrayTexture, THREE.DataTexture and THREE.Texture
     * 
     * Only one visible CloudsLayer (first in layer list) will be taken into account at a time.
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} [properties.sampleDensityFunction] shader function that returns the cloud density given a point in cartesian coordinates and a level of detail.
     * @param {Object} [properties.extraUniforms] a key value pair of uniforms for the shader. The uniforms will be available with the given keys in the shader. 
     * @param {Number} [properties.quality = 0.5] a quality that affects the resolution and number of samples for volumetric clouds
     * @param {Number} [properties.minHeight = 500] clouds min height in meters above ellipsoid
     * @param {Number} [properties.maxHeight = 12000] clouds max height in meters above ellipsoid
     * @param {Number} [properties.density = 0.5] cloud density multiplier 
     * @param {Number} [properties.luminance = 1] sun intensity multiplier
     * @param {Number} [properties.windSpeed = 0.05] wind speed
     * @param {Number} [properties.windDirection = new THREE.Vector2(1.0,0.0)] wind direction
     * @param {Boolean} [properties.debug = false] wind direction
     * @param {THREE.Vector3} [properties.color = new THREE.Vector3(1.0,1.0,1.0)] base cloud color.
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
     */
    constructor(properties) {
        super(properties);
        this.transparency = properties.transparency ? properties.transparency : 0;
        this.shader = properties.shader;
        this.textures = properties.textures;
        this.isCloudsLayer = true;

        const isMobile = _isMobileDevice();
        this.quality = properties.quality;
        if(!this.quality) this.quality = isMobile ? 0.4 : 0.5;
        this.resolution = this.quality;
        this.numBlurPasses = 10/(this.quality*3);//Math.floor((1/this.quality)/5);//(1/this.quality)/5;
        this.proportionSamples = 0.3*this.quality;//this.quality;
        
        this.maxBlurOffset = 50.0;//1.5/this.resolution;
        this.startRadius = properties.minHeight ? properties.minHeight : 500;
        this.endRadius = Math.max(this.startRadius+1,properties.maxHeight ? properties.maxHeight : 12000);
        this.color = properties.color ? properties.color : new THREE.Vector3(1.0, 1.0, 1.0);

        this.windSpeed = properties.windSpeed? properties.windSpeed: 0.0;
        this.density = properties.density ? properties.density : 0.5;
        this.luminance = properties.luminance ? properties.luminance : 1;


        this.extraUniforms = properties.extraUniforms;
        this.sampleDensityFunction = properties.sampleDensityFunction;
        this.isCloudsLayer = true;

        if(properties.debug){
            this._createCloudsDebugPanel();
        }

    }

    getOutputTexture(){
        return cloudsBlurTarget2.texture;
    }
    getOutputDepthTexture(){
        return cloudsTarget.textures[1];
    }

    

    
    render(map) {
        

        cloudsMaterial.uniforms.proportionSamples.value = this.proportionSamples;
        


        map.renderer.setRenderTarget(cloudsTarget);
        map.postQuad.material = cloudsMaterial;
        map.renderer.render(map.postScene, map.postCamera);

        

        /// clouds blur
        
        let texelSizeVertical = 1 / cloudsBlurTarget1.height;
        let texelSizeHorizontal = 1 / cloudsBlurTarget1.width;
        let mul = 0.5;
        
        blurMaterial.uniforms.tDepth.value = map.target.depthTexture;
        blurMaterial.uniforms.cloudsDepth.value = cloudsTarget.textures[1];
        blurMaterial.uniforms.preserveMaxOpacity.value = 0.0;
        blurMaterial.uniforms.image.value = cloudsTarget.textures[0];
        blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
        mul += 0.5;
        
        map.postQuad.material = blurMaterial;
        map.renderer.setRenderTarget(cloudsBlurTarget1);
        map.renderer.render(map.postScene, map.postCamera);

        blurMaterial.uniforms.image.value = cloudsBlurTarget1.texture;
        blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * mul, texelSizeVertical * mul);
        mul += 0.5;
        
        map.renderer.setRenderTarget(cloudsBlurTarget2);
        map.renderer.render(map.postScene, map.postCamera);
        for (let p = 0; p < this.numBlurPasses; p++) {
            
            blurMaterial.uniforms.preserveMaxOpacity.value = 0.0;
            blurMaterial.uniforms.image.value = cloudsBlurTarget2.texture;
            blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * Math.min(this.maxBlurOffset,mul), texelSizeVertical * Math.min(this.maxBlurOffset,mul));
            mul += 0.5;
            map.renderer.setRenderTarget(cloudsBlurTarget1);
            map.renderer.render(map.postScene, map.postCamera);

            blurMaterial.uniforms.image.value = cloudsBlurTarget1.texture;
            blurMaterial.uniforms.offset.value.set(texelSizeHorizontal * Math.min(this.maxBlurOffset,mul), texelSizeVertical * Math.min(this.maxBlurOffset,mul));
            mul += 0.5;
            
            map.renderer.setRenderTarget(cloudsBlurTarget2);
            map.renderer.render(map.postScene, map.postCamera);
        }
        
        previousCameraQuaternion.copy(map.camera.quaternion);
        previousCameraPositon.copy(map.camera.position);
    }
    updateUniforms(map) {
        const self = this;
        cloudsMaterial.uniforms.tDepth.value = map.target.depthTexture;
        cloudsMaterial.uniforms.cameraNear.value = map.camera.near;
        cloudsMaterial.uniforms.cameraFar.value = map.camera.far;
        cloudsMaterial.uniforms.radius.value = map.planet.radius;
        cloudsMaterial.uniforms.xfov.value = 2 * Math.atan(Math.tan(map.camera.fov * Math.PI / 180 / 2) * map.camera.aspect) * 180 / Math.PI;
        cloudsMaterial.uniforms.yfov.value = map.camera.fov;
        cloudsMaterial.uniforms.resolution.value = cloudsTarget.height,
        cloudsMaterial.uniforms.planetPosition.value = map.planet.position;
        cloudsMaterial.uniforms.nonPostCameraPosition.value = map.camera.position;
        cloudsMaterial.uniforms.ldf.value = map.logDepthBufFC;

        cloudsMaterial.uniforms.densityMultiplier.value = self.density;
        cloudsMaterial.uniforms.sunlight.value = self.luminance;
        cloudsMaterial.uniforms.color.value = self.color;
        
        cloudsMaterial.uniforms.startRadius.value = self.startRadius;
        cloudsMaterial.uniforms.endRadius.value = Math.max(self.startRadius, self.endRadius);
        cloudsMaterial.uniforms.windSpeed.value = self.windSpeed;
        cloudsMaterial.uniforms.windDirection.value = self.windDirection;

        map.camera.getWorldDirection(cloudsMaterial.uniforms.viewCenterFar.value).normalize();
        cloudsMaterial.uniforms.viewCenterNear.value.copy(cloudsMaterial.uniforms.viewCenterFar.value);
        cloudsMaterial.uniforms.up.value = map.camera.up.normalize();
        cloudsMaterial.uniforms.right.value.crossVectors(map.camera.up, cloudsMaterial.uniforms.viewCenterFar.value);
        cloudsMaterial.uniforms.viewCenterFar.value.multiplyScalar(map.camera.far).add(map.camera.position);
        cloudsMaterial.uniforms.viewCenterNear.value.multiplyScalar(map.camera.near).add(map.camera.position);
        if (map.shadows) {
            cloudsMaterial.uniforms.sunLocation.value.copy(map.sunPosition);
        }

        cloudsMaterial.uniforms.time.value = clock.getElapsedTime()*1000;

        blurMaterial.uniforms.cameraNear.value = map.camera.near;
        blurMaterial.uniforms.cameraFar.value = map.camera.far;
        blurMaterial.uniforms.ldf.value = map.logDepthBufFC;
        
    }

    changeSize(dom) {
        cloudsTarget.setSize(Math.floor(dom.offsetWidth * this.resolution), Math.floor(dom.offsetHeight * this.resolution));
        cloudsBlurTarget1.setSize(Math.floor(dom.offsetWidth), Math.floor(dom.offsetHeight));
        cloudsBlurTarget2.setSize(Math.floor(dom.offsetWidth), Math.floor(dom.offsetHeight));
    }

    init(map) {
        const self = this;

        if (!cloudsTarget) {
            cloudsTarget = new THREE.WebGLRenderTarget(Math.floor(map.domContainer.offsetWidth*self.resolution), Math.floor(map.domContainer.offsetHeight*self.resolution), {count:2,  samples:8});
            cloudsTarget.stencilBuffer = false;
            cloudsTarget.depthBuffer = false;
            cloudsTarget.textures[0].format = THREE.RGBAFormat;
            cloudsTarget.textures[0].colorSpace = THREE.LinearSRGBColorSpace;
            cloudsTarget.textures[0].minFilter = THREE.LinearFilter;
            cloudsTarget.textures[0].magFilter = THREE.LinearFilter;
            cloudsTarget.textures[0].generateMipmaps = false;
            cloudsTarget.textures[0].premultiplyAlpha = false;

            cloudsTarget.textures[1].format = THREE.RedFormat;
            cloudsTarget.textures[1].type = THREE.HalfFloatType;
            cloudsTarget.textures[1].colorSpace = THREE.LinearSRGBColorSpace;
            cloudsTarget.textures[1].minFilter = THREE.NearestFilter;
            cloudsTarget.textures[1].magFilter = THREE.LinearFilter;
            cloudsTarget.textures[1].generateMipmaps = false;
            cloudsTarget.textures[1].premultiplyAlpha = false;
            //cloudsTarget.textures[1].type = THREE.FloatType;
            
        }

        



        if (!cloudsBlurTarget1) {
            cloudsBlurTarget1 = new THREE.WebGLRenderTarget(Math.floor(map.domContainer.offsetWidth), Math.floor(map.domContainer.offsetHeight));
            cloudsBlurTarget1.texture.format = THREE.RGBAFormat;
            cloudsBlurTarget1.texture.colorSpace = THREE.SRGBColorSpace;
            cloudsBlurTarget1.texture.minFilter = THREE.LinearFilter;
            cloudsBlurTarget1.texture.magFilter = THREE.LinearFilter;
            cloudsBlurTarget1.texture.generateMipmaps = false;
            cloudsBlurTarget1.stencilBuffer = false;
            cloudsBlurTarget1.depthBuffer = false;
            cloudsBlurTarget1.texture.premultiplyAlpha = false;
            cloudsBlurTarget1.texture.type = THREE.HalfFloatType;
        }



        if (!cloudsBlurTarget2) {
            cloudsBlurTarget2 = new THREE.WebGLRenderTarget(Math.floor(map.domContainer.offsetWidth), Math.floor(map.domContainer.offsetHeight));
            cloudsBlurTarget2.texture.format = THREE.RGBAFormat;
            cloudsBlurTarget2.texture.colorSpace = THREE.SRGBColorSpace;
            cloudsBlurTarget2.texture.minFilter = THREE.LinearFilter;
            cloudsBlurTarget2.texture.magFilter = THREE.LinearFilter;
            cloudsBlurTarget2.texture.generateMipmaps = false;
            cloudsBlurTarget2.stencilBuffer = false;
            cloudsBlurTarget2.depthBuffer = false;
            cloudsBlurTarget2.texture.premultiplyAlpha = false;
            cloudsBlurTarget2.texture.type = THREE.HalfFloatType;
        }




        if (cloudsMaterial) cloudsMaterial.dispose();

        cloudsMaterial = new THREE.ShaderMaterial({
            vertexShader: CloudsShader.vertexShader(),
            fragmentShader: map.shadows ? CloudsShader.fragmentShaderShadows(!!map.ocean, map.atmosphere, map.sunColor, self.sampleDensityFunction, self.extraUniforms) : CloudsShader.fragmentShader(!!map.ocean, map.atmosphere, map.sunColor, self.sampleDensityFunction, self.extraUniforms),
            uniforms: {
                cameraNear: { value: map.camera.near },
                cameraFar: { value: map.camera.far },
                perlinWorley: { value: null },
                noise2D: { value: null },
                tDepth: { value: null },
                radius: { value: 0 },
                xfov: { value: 0 },
                yfov: { value: 0 },
                resolution: {value: cloudsTarget.height},
                planetPosition: { value: new THREE.Vector3(0, 0, 0) },
                nonPostCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
                viewCenterFar: { value: new THREE.Vector3(0, 0, 0) },
                viewCenterNear: { value: new THREE.Vector3(0, 0, 0) },
                up: { value: new THREE.Vector3(0, 0, 0) },
                right: { value: new THREE.Vector3(0, 0, 0) },
                ldf: { value: 0 },
                time: { value: 0.0 },
                proportionSamples: { value: self.proportionSamples },
                densityMultiplier: { value: 20.0 },
                sunlight: { value: 10.0 },
                sunLocation: { value: new THREE.Vector3(0, 0, 0) },
                color: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                startRadius: { value: self.startRadius },
                endRadius: { value: self.endRadius },
                windSpeed: { value: self.windspeed },
                windDirection: { value: new THREE.Vector3(1.0, 0.0) },
                quality: {value: self.quality}
            },
            depthTest: false,
            depthWrite: false
        });

        if (this.extraUniforms) {
            Object.entries(this.extraUniforms).forEach(([key, value]) => {
                cloudsMaterial.uniforms[key] = { value: value };
            });
        }

        if (blurMaterial) blurMaterial.dispose();
        blurMaterial = new THREE.ShaderMaterial({
            vertexShader: CloudsBlurShader.vertexShader(),
            fragmentShader: CloudsBlurShader.fragmentShader(),
            uniforms: {
                offset: { value: new THREE.Vector2() },
                image: { value: null },
                tDepth: { value: null },
                cloudsDepth: { value: null },
                noise2D: { value: null },
                preserveMaxOpacity: { value: 0.0 },
                cameraNear: { value: map.camera.near },
                cameraFar: { value: map.camera.far },
                ldf: { value: 0 },
            },
            premultipliedAlpha: false,
            depthTest: false,
            depthWrite: false
        });



        if (!perlinWorley3DDataTexture) {
            if (!textureCallback) {
                Promise.all([
                    CloudsShader.loadPerlinWorley(perlinWorley3D).then(texture => {
                        perlinWorley3DDataTexture = texture;
                    }),
                    new THREE.TextureLoader().load(
                        blueNoise,
                        function (texture) {
                            texture.wrapS = THREE.RepeatWrapping;
                            texture.wrapT = THREE.RepeatWrapping;
                            texture.magFilter = THREE.LinearFilter;
                            texture.minFilter = THREE.LinearFilter;
                            blueNoiseTexture = texture;
                            blueNoiseTexture = texture;
                        },
                        undefined,
                        function (err) {
                            console.error('An error happened: ' + err);
                        }
                    )
                    ]).then(() => {
                    cloudsMaterial.uniforms.perlinWorley.value = perlinWorley3DDataTexture;
                    cloudsMaterial.uniforms.noise2D.value = blueNoiseTexture;
                    blurMaterial.uniforms.noise2D.value = blueNoiseTexture;
                });
            }
        } else {
            cloudsMaterial.uniforms.perlinWorley.value = perlinWorley3DDataTexture;
            cloudsMaterial.uniforms.noise2D.value = blueNoiseTexture;
            blurMaterial.uniforms.noise2D.value = blueNoiseTexture;
        }
    }

    getUniforms(){
        return cloudsMaterial.uniforms;
    }
    _createCloudsDebugPanel() {
        const self = this;
        // Create panel element
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '0';
        panel.style.right = '0';
        panel.style.backgroundColor = '#f0f0f0';
        panel.style.padding = '10px';
        panel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        panel.style.maxWidth = '300px';

        // Define labels and ranges
        const elements = [
            { label: 'density', min: 0, max: 2, value: self.density, step: 0.001, action: (val) => { self.density = val; } },
            { label: 'sun strength', min: 0, max: 10, value: self.luminance, step: 0.01, action: (val) => { self.luminance = val; } },
            { label: 'r', min: 0, max: 1, value: self.color.x, step: 0.01, action: (val) => { self.color.x = val; } },
            { label: 'g', min: 0, max: 1, value: self.color.y, step: 0.01, action: (val) => { self.color.y = val; } },
            { label: 'b', min: 0, max: 1, value: self.color.z, step: 0.01, action: (val) => { self.color.z = val; } },
            { label: 'wind speed', min: 0, max: 1, value: self.windSpeed, step: 0.01, action: (val) => { self.windSpeed = val; } },

        ];


        elements.forEach(element => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'space-between';
            container.style.marginBottom = '10px';

            const label = document.createElement('label');
            label.textContent = element.label;
            label.style.marginRight = '10px';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = element.min;
            slider.max = element.max;
            slider.step = element.step;
            slider.value = element.value;

            const valueDisplay = document.createElement('span');
            valueDisplay.style.minWidth = '50px';
            valueDisplay.style.textAlign = 'right';
            valueDisplay.textContent = slider.value.toString();

            slider.oninput = () => {
                valueDisplay.textContent = slider.value.toString();
                element.action(slider.value);
            };

            container.appendChild(label);
            container.appendChild(slider);
            container.appendChild(valueDisplay);
            panel.appendChild(container);
        });

        //// Clouds min max height
        const lowClouds = document.createElement('div');
        lowClouds.style.display = 'flex';
        lowClouds.style.alignItems = 'center';
        lowClouds.style.justifyContent = 'space-between';
        lowClouds.style.marginBottom = '10px';

        const lowCloudsLabel = document.createElement('label');
        lowCloudsLabel.textContent = "clouds Radius Start";
        lowCloudsLabel.style.marginRight = '10px';

        const lowCloudsSlider = document.createElement('input');
        lowCloudsSlider.type = 'range';
        lowCloudsSlider.min = 0.0;
        lowCloudsSlider.max = 50000;
        lowCloudsSlider.step = 1;
        lowCloudsSlider.value = self.startRadius;

        const lowCloudsValueDisplay = document.createElement('span');
        lowCloudsValueDisplay.style.minWidth = '50px';
        lowCloudsValueDisplay.style.textAlign = 'right';
        lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();

        lowClouds.appendChild(lowCloudsLabel);
        lowClouds.appendChild(lowCloudsSlider);
        lowClouds.appendChild(lowCloudsValueDisplay);
        panel.appendChild(lowClouds);

        const highClouds = document.createElement('div');
        highClouds.style.display = 'flex';
        highClouds.style.alignItems = 'center';
        highClouds.style.justifyContent = 'space-between';
        highClouds.style.marginBottom = '10px';

        const highCloudsLabel = document.createElement('label');
        highCloudsLabel.textContent = "clouds Radius End";
        highCloudsLabel.style.marginRight = '10px';

        const highCloudsSlider = document.createElement('input');
        highCloudsSlider.type = 'range';
        highCloudsSlider.min = 1.0;
        highCloudsSlider.max = 50000;
        highCloudsSlider.step = 1.0;
        highCloudsSlider.value = self.endRadius;

        const highCloudsValueDisplay = document.createElement('span');
        highCloudsValueDisplay.style.minWidth = '50px';
        highCloudsValueDisplay.style.textAlign = 'right';
        highCloudsValueDisplay.textContent = highCloudsSlider.value.toString();

        highClouds.appendChild(highCloudsLabel);
        highClouds.appendChild(highCloudsSlider);
        highClouds.appendChild(highCloudsValueDisplay);
        panel.appendChild(highClouds);

        lowCloudsSlider.oninput = () => {
            lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();
            this.startRadius = lowCloudsSlider.value;
            this.endRadius = Math.max(this.endRadius, this.startRadius);
            highCloudsSlider.value = this.endRadius;
            highCloudsValueDisplay.textContent = this.endRadius.toString();
        };
        highCloudsSlider.oninput = () => {
            highCloudsValueDisplay.textContent = highCloudsSlider.value.toString();
            this.endRadius = highCloudsSlider.value;
            this.startRadius = Math.min(this.startRadius, highCloudsSlider.value);
            lowCloudsSlider.value = this.startRadius;
            lowCloudsValueDisplay.textContent = lowCloudsSlider.value.toString();
        };



        document.body.appendChild(panel);

    }

}
export { CloudsLayer }



function _isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

function frobeniusNormDifference(matrixA, matrixB) {
    // Create a new matrix for the difference
    let difference = new THREE.Matrix4();

    // Extract the elements of the matrices
    let elementsA = matrixA.elements;
    let elementsB = matrixB.elements;

    // Compute the element-wise differences and store in the difference matrix
    let elementsDifference = [];
    for (let i = 0; i < elementsA.length; i++) {
        elementsDifference[i] = elementsA[i] - elementsB[i];
    }

    // Assign the computed differences to the difference matrix's elements
    difference.elements = elementsDifference;

    // Calculate the Frobenius norm of the difference
    let sumOfSquares = 0;
    for (let element of elementsDifference) {
        sumOfSquares += element * element;
    }

    return Math.sqrt(sumOfSquares);
}