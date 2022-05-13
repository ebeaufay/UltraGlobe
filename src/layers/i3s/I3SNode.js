import * as THREE from 'three';

const tempSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0, 1)); // used for calculating the update metric

class I3SNode extends THREE.Object3D {
    constructor(properties) {
        super();
        const self = this;
        self.properties = properties;
        self.childNodes = [];
        self.feature;

        // when a node is created, it's features are automatically downloaded and displayed. 
        // Once the features have been displayed once, the "loaded" flag is set to true.
        self.loaded = false;

        fetch(properties.url + properties.node + "?f=json").then(result => {
            if (!result.ok) {
                throw new Error(`couldn't load "${properties.url}". Request failed with status ${result.status} : ${result.statusText}`);
            }
            result.json().then(json => {
                self.info = json;
                self.metric = self.chooseLodSelectionMetric(self.info.lodSelection);
                const mbsCenter = self.properties.transform.forward(self.info.mbs);
                self.mbs = new THREE.Sphere(new THREE.Vector3(mbsCenter[0], mbsCenter[1], mbsCenter[2]), mbsCenter[3]);
                self.loadFeatures(properties.url + properties.node+"/");

                /* const geometry = new THREE.SphereGeometry( self.mbs.radius, 32, 16 );
                geometry.translate(self.mbs.center.x, self.mbs.center.y, self.mbs.center.z);
                const material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe:true } );
                const sphere = new THREE.Mesh( geometry, material );
                self.add( sphere ); */
            });
        });
    }

    loadFeatures(){
        throw "unimplemented Exception, use one of the umplementations of the I3SNode interface";
    }

    dispose(){
        throw "unimplemented Exception, use one of the umplementations of the I3SNode interface";
    }
    createChildren(){
        throw "unimplemented Exception, use one of the umplementations of the I3SNode interface";
    }

    hasFeatureData() {
        return this.info && this.info.hasFeatureData && this.info.hasFeatureData.length > 0;
    }

    hasChildren() {
        return this.info && this.info.children && this.info.children.length > 0;
    }

    update(camera) {
        const frustum = new THREE.Frustum();
        if (!this.info || !this.info.children || this.info.children.length == 0) {
            return; // this is a leaf node or hasn't downloaded base info yet.
        }
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        this._update(camera, frustum);
    }
    _update(camera, frustum) {
        if (!this.loaded) {
            return;
        }
        if (this.shouldRefine(camera, frustum) ) {
            if (this.childNodes.length > 0) {
                let hasUnloadedChild = false;
                for(let i = 0; i<this.childNodes.length; i++){
                    if(!this.childNodes[i].loaded){
                        hasUnloadedChild = true;
                        break;
                    }
                }
                if(hasUnloadedChild){
                    this.content.material.visible = true;
                }else{
                    this.content.material.visible = false;
                }
            } else if(!!this.info.children && this.info.children.length>0){
                // create children
                this.createChildren();
            }
            if (this.childNodes.length > 0) {
                this.childNodes.forEach(childNode=>{
                    childNode._update(camera, frustum);
                })
            }
        } else {
            this.childNodes.forEach(child => child.dispose());
            this.childNodes = [];
            this.clear();
            if (!!this.content) this.add(this.content);
            this.content.material.visible = true;
        }

        
    }

    shouldRefine(camera, frustum) {
        ////// return -1 if not in frustum
        tempSphere.copy(this.mbs);
        tempSphere.applyMatrix4(this.matrixWorld);
        if (!frustum.intersectsSphere(tempSphere)) return false;


        
        

        if (this.metric.metricType != "maxScreenThreshold") {
            throw "metric type " + this.metric.metricType + " is not supported";
        }
        switch (this.metric.metricType) {
            case "maxScreenThreshold": return this.maxScreenThreshold(this.metric.maxError, camera, tempSphere);
            case "distanceRangeFromDefaultCamera": return this.distanceRangeFromDefaultCamera(this.metric.maxError, camera, tempSphere);
            case "effectiveDensity": throw "metric type " + this.metric.metricType + " is not supported";
            case "screenSpaceRelative": throw "metric type " + this.metric.metricType + " is not supported";
        }
    }

    maxScreenThreshold(maxError, camera, mbs) {
        
        return (mbs.radius / (Math.tan(camera.fov * (Math.PI/180) * 0.5) * (camera.position.distanceTo(mbs.center)))) * window.innerHeight *0.5> maxError;
    }
    distanceRangeFromDefaultCamera(maxError, camera, mbs) {
        return camera.position.distanceTo(mbs.center) - mbs.radius < maxError;
    }
    /**
     * Choose LOD Selection metric. I3s nodes may have one or more selection metrics. 
     * The used selection metric is selected in order of preference: 
     * maxScreenThreshold -> maxScreenThresholdSQ -> distanceRangeFromDefaultCamera -> effectiveDensity -> screenSpaceRelative
     */
    chooseLodSelectionMetric(lodSelectionArray) {
        let selection;
        lodSelectionArray.forEach(element => {
            switch (element.metricType) {

                case "maxScreenThreshold":
                    return element;
                case "maxScreenThresholdSQ":
                    selection = element;
                    selection.metricType = "maxScreenThreshold"
                        selection.maxError = Math.sqrt((selection.maxError * 4) / Math.PI);
                    break;
                case "distanceRangeFromDefaultCamera":
                    if (selection.metricType == "maxScreenThresholdSQ" || selection.metricType == "maxScreenThreshold") break;
                    selection = element;
                    break;
                case "effectiveDensity":
                    if (selection.metricType == "maxScreenThresholdSQ" || selection.metricType == "distanceRangeFromDefaultCamera") break;
                    selection = element;
                    break;
                case "screenSpaceRelative":
                    if (selection.metricType != null) break;
                    selection = element;
                    break;
            }
        });
        return selection;
    }
}
export {I3SNode}