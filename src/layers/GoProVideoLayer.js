import * as THREE from "three";
import { ProjectedLayer } from "./ProjectedLayer.js";
import gpmfExtract  from 'gpmf-extract';
import goproTelemetry from 'gopro-telemetry';

let id = 0;
class GoProVideoLayer extends ProjectedLayer {

    /**
     * construct a projected layer that will project a three.js onto other loaded geospatial data from the given perspective.
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} videoURL url to a video
     * @param {Boolean} [properties.depthTest = true] depth test prevents drawing the projected texture behind occluders but the precision is limitted at long distances
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * @param {Boolean} [showFrustum = true] show the projection camera frustum
     */
    constructor(properties) {
        super(properties);

        const self = this;

        self.video = document.createElement('video');

        self.video.addEventListener('timeupdate', () => {
            self._interpolatedTelemetry(self.video.currentTime*1000);
            
        });

        //self.video.src = properties.video; // video file path
        self._fetchVideoAsBlob(properties.videoURL).then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            self.video.src = blobUrl;
            self.video.crossOrigin = 'anonymous'; // Enable CORS if needed
            self.video.loop = true;               // Optional: loop the video
            self.video.muted = true;              // Optional: mute the video to allow autoplay
            self.video.playsInline = true;        // For iOS Safari
            const file = new File([blob], id + ".mp4", { type: blob.type });
            gpmfExtract(file, { browserMode: true, useWorker: true }).then(res => {
                goproTelemetry(res, { decimalPlaces:"9", progress: self._progress, groupTimes:"frames"}, telemetry => {
                    self.telemetry = telemetry;
                    self.video.play();
                });
            });
        });

    }

    _progress(p){
        console.log(p);
    }

    async _fetchVideoAsBlob(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const blob = await response.blob();
        return blob;
    }
    

    _getInterpolatedTelemetry(currentTime) {

        //TODO interpolate or pick telemetry matching the current time and update camera

        //this.setCameraFromLLHYawPitchRollFov(llh, yaw, pitch, roll, fov);

        return null;
    }
}
export { GoProVideoLayer };