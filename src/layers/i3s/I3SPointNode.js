import { I3SNode } from './I3SNode';
import * as THREE from 'three';

class I3SPointNode extends I3SNode {
    constructor(properties) {
        super(properties);
    }
    loadFeatures(root) {
        const self = this;
        const featurePromisses = [];
        const decodePromisses = [];
        const positions = [];
        self.info.featureData.forEach(element => {
            featurePromisses.push(fetch(root + element.href))
        });
        Promise.all(featurePromisses).then(results => {
            results.forEach(result => {
                if (!result.ok) {
                    throw new Error(`couldn't load "${properties.url}". Request failed with status ${result.status} : ${result.statusText}`);
                }
                decodePromisses.push(result.json().then(json => {

                    json.featureData.forEach(item => {
                        const position = this.properties.transform.forward(item.position);
                        positions.push(position[0], position[1], position[2]);
                        //TODO handle ID
                        //const id = this.properties.transform.forward(item.id);
                    })

                }));
            })
            
        }).then(()=>{
            Promise.all(decodePromisses).then(()=>{
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.computeBoundingSphere();
                const material = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false });
    
                self.content = new THREE.Points(geometry, material);
                self.content.onAfterRender = () => {
                    self.loaded = true;
                    delete self.content.onAfterRender;
                };
                //self.loaded = true;
                self.add(self.content);
            })
        });

        

    }
    dispose() {
        this.traverse((o) => {
            if (o.material) {
                // dispose materials
                if (o.material.length) {
                    for (let i = 0; i < o.material.length; ++i) {
                        o.material[i].dispose();
                    }
                }
                else {
                    o.material.dispose()
                }
            }
            if (o.geometry) {
                // dispose geometry
                o.geometry.dispose();
            }
        });
    }

    createChildren() {
        const self = this;
        self.info.children.forEach(child => {
            self.childNodes.push(new I3SPointNode({
                url: self.properties.url + self.properties.node + "/",
                node: child.href,
                geometricErrorMultiplier: self.properties.geometricErrorMultiplier,
                transform: self.properties.transform
            }));
            
        });
        self.childNodes.forEach(childNode=>{
            self.add(childNode);
        })
        
    }
}
export { I3SPointNode }