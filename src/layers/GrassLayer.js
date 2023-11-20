import * as THREE from 'three';
import { VectorLayer } from "./VectorLayer.js";
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { InstancedMesh } from 'three';

const perlin = new ImprovedNoise();
const geometry = generateGrassGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const temp1 = THREE.Vector3(); 
const temp2 = THREE.Vector3(); 
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);
/**
 * A vector layer designed to display point objects on terrain.
 * @private
 */
class GrassLayer extends VectorLayer {

    
    constructor(properties) {
        this.super(properties)
        this.isGrassLayer = true;
        this.density = properties.density? properties.density:1;
    }

    
    getObjects(bounds, tileLOD, terrainElevation, llhToCartesian) {
        if(tileLOD == 13){
            const numItemsX = Math.cos((bounds.max.y+bounds.min.y)*0.5)*111320*this.density;
            const numItemsZ = 111000*this.density;
            const instancedMesh = new THREE.InstancedMesh(geometry, material, numItemsX * numItemsZ);

            const size = new THREE.Vector2(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);

            const terrainVertices = [];
            const terrainResolution = Math.sqrt(terrainElevation.length);
            const terrainStepSizeX = (size.x / (terrainResolution - 1));
            const terrainStepSizeY = (size.y / (terrainResolution - 1));
            for(let y = 0; y<terrainResolution; y++){
                for(let x = 0; x<terrainResolution; x++){
                    const terrainVertex = {
                        x:terrainBounds.min.x + terrainStepSizeX * x,
                        y:terrainBounds.min.y + terrainStepSizeY * y,
                        z:elevations[y * resolution + x],
                    }
                    llhToCartesian(terrainVertex);
                    terrainVertices.push(terrainVertex);
                }
            }


            const stepX = 1 / (numItemsX - 1); // Normalized step size for interpolation along X
            const stepZ = 1 / (numItemsZ - 1);

            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const rotation = new THREE.Quaternion();
            const scale = new THREE.Vector3(1, 1, 1);
            temp1.set(0,1,0);
            

            for (let i = 0; i < numItemsZ; i++) {
                for (let j = 0; j < numItemsX; j++) {
                  // Normalized position for interpolation
                  const u = j * stepX; // Normalized position along X
                  const v = i * stepZ; // Normalized position along Z

                  // add random displacement to have an irregular grid
                  u+=(Math.random()-0.5)*stepX;
                  v+=(Math.random()-0.5)*stepZ;
              
                  // Calculate the actual indices in the terrain vertices
                  const x = u * (terrainResolution - 1);
                  const z = v * (terrainResolution - 1);
                  const xFloor = Math.floor(x);
                  const zFloor = Math.floor(z);
                  const xCeil = Math.ceil(x);
                  const zCeil = Math.ceil(z);
              
                  // Interpolate the elevation for each corner
                  const bl = terrainVertices[zFloor * cols + xFloor]; // bottom left
                  const br = terrainVertices[zFloor * cols + xCeil]; // bottom right
                  const tl = terrainVertices[zCeil * cols + xFloor]; // top left
                  const tr = terrainVertices[zCeil * cols + xCeil]; // top right
              
                  // Bilinear interpolation
                  const tx = x - xFloor;
                  const tz = z - zFloor;
                  const heightBottom = (1 - tx) * bl + tx * br;
                  const heightTop = (1 - tx) * tl + tx * tr;
                  const height = (1 - tz) * heightBottom + tz * heightTop;
              
                  // Add the interpolated position to the array
                  position.set(u,height,v);
                  temp2.copy(position).normalize();
                  rotation.setFromUnitVectors(temp1, temp2)
                  matrix.compose(position, rotation, scale);

                  // Apply matrix to the instance
                  instancedMesh.setMatrixAt(i*numItemsZ+j, matrix);
                }
              }
            return InstancedMesh;
        }else return;
    }
    update(delta) {
        // do nothing
    }
    dispose() {
        // do nothing
    }


}

function generateGrassGeometry() {
    const geometry = new THREE.BufferGeometry();

    // Updated vertices
    const vertices = new Float32Array([
        -0.1, 0.0, 0.0, // vertex 0
        0.1, 0.0, 0.0, // vertex 1
        0.0, 1.0, 0.00  // vertex 2
    ]);

    // Manually define normals for each vertex
    const normals = new Float32Array([
        -0.5, 0.0, 1.0, // normal at vertex 0
        0.5, 0.0, 1.0,  // normal at vertex 1
        0.0, 0.0, 1.0,   // normal at vertex 2
    ]);

    // Create an attribute for the position vector
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Create an attribute for the normals vector
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    geometry.normalizeNormals();
    return geometry;
}

export { GrassLayer };