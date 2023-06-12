import * as THREE from 'three';
import { PlanetTile } from './PlanetTile.js';
import { Object3D } from 'three/src/core/Object3D';
import { LAYERS_CHANGED } from '../layers/LayerManager.js';
import * as TRANSFORM from '../transform/Transformer.js';

const frustum = new THREE.Frustum();
const mat = new THREE.Matrix4();

class Planet extends Object3D {
    /**
     * 
     * @param {
     *          camera: camera,
     *          center: Vector3,
     *          layerManager: LayerManager
     *        } properties
     */
    constructor(properties) {
        super();
        this.frustumCulled = false;
        this.elevationExageration = 1;
        var self = this;
        if (!properties.camera) {
            throw ("A camera is required in order to refine the planet's levels of detail.")
        }
        self.llhToCartesian = TRANSFORM.transform("EPSG:4326", 'EPSG:4978');
        self.camera = properties.camera;
    
        self.a = 6378137.0;
        self.w = 7292115E-11;
        self.f = 0.00335281066;
        self.GM = 3.986004418E14;

        
        if (!!properties.center) {
            self.center = properties.center;
        } else {
            self.center = new THREE.Vector3(0, 0, 0);
        }
        
        self.radius = 6378137.0;
        self.layerManager = properties.layerManager;

        this.add(new PlanetTile({
            bounds: new THREE.Box2(new THREE.Vector2(-Math.PI, -Math.PI * 0.5), new THREE.Vector2(0, Math.PI * 0.5)),
            layerManager: self.layerManager, planet: this, level: 0, shadows: properties.shadows
        }));
        this.add(new PlanetTile({
            bounds: new THREE.Box2(new THREE.Vector2(0, -Math.PI * 0.5), new THREE.Vector2(Math.PI, Math.PI * 0.5)),
            layerManager: self.layerManager, planet: this, level: 0, shadows: properties.shadows
        }));

        self.matrixAutoUpdate = false;
        setInterval(function () {
            self.children.forEach(child => {
                if(!self.pause){
                    frustum.setFromProjectionMatrix(mat.multiplyMatrices(self.camera.projectionMatrix, self.camera.matrixWorldInverse));
                    child.update(self.camera, frustum);
                }
            });
        }, 50);

    }

    /**
     * this method returns all the leaf tiles that interact with the given lon/lat bounds
     */
    interactsWith(bounds) {
        var interactingTiles = [];
        this.children.forEach(child => {
            interactingTiles = interactingTiles.concat(child.interactsWith(bounds));
        });
        return interactingTiles;
    }

    cull(frustum) {
        this.children.forEach(child => {
            child.cull(frustum);
        });
    }

    /**
     * Returns the terrain height at the given longitude and latitude
     * @param {Vector2} lonlat in radians 
     */
    getTerrainElevation(lonLat) {
        let elevation = 0;
        this.children.every(child => {
            if (child.bounds.containsPoint(lonLat)) {
                elevation = child.getTerrainElevation(lonLat);
                return false;
            }
            return true;
        })
        if (elevation === false) {
            return 0;
        }
        return elevation*this.elevationExageration;
    }
    pauseRendering(){
        this.pause = true;
    }
    resumeRendering(){
        this.pause = false;
    }

    setElevationExageration(elevationExageration){
        this.elevationExageration = elevationExageration;
        this.children.forEach(planetTile=>planetTile.setElevationExageration());
    }
}


export { Planet };