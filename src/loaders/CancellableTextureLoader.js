import * as THREE from 'three';
import { RGBAFormat } from 'three/src/constants.js';
import { ImageLoader } from 'three/src/loaders/ImageLoader.js';
import { Texture } from 'three/src/textures/Texture.js';
import { Loader } from 'three/src/loaders/Loader.js';

class CancellableTextureLoader extends Loader {
    constructor(manager) {
        super(manager);
        this.loader = new ImageLoader(this.manager);
        this.loader.setCrossOrigin(this.crossOrigin);
        this.activeDownloads = 0;
        this.downloadQueue = [];
        this.maxSimultaneousDownloads = 8;
    }

    processQueue() {
        if (this.downloadQueue.length > 0 && this.activeDownloads < this.maxSimultaneousDownloads) {
            const nextDownload = this.downloadQueue.shift();
            // Start the download for the first item in the queue
            this.startDownload(nextDownload.texture, nextDownload.url, nextDownload.onLoad, nextDownload.onProgress, nextDownload.onError);
        }
    }

    startDownload(texture, url, onLoad, onProgress, onError) {
        this.activeDownloads++;
        let aborted = false;
        const self = this;
        const image = this.loader.load(url, function(image) {
            if (aborted) return;
            texture.image = image;
            texture.format = RGBAFormat;
            texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.magFilter = texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            texture.isReady = true;
            if (onLoad !== undefined) {
                onLoad(texture);
            }
            self.activeDownloads--;
            self.processQueue();
        }, onProgress, onError);

        texture.abort = function() {
            if (!aborted) {
                aborted = true;
                if (image && typeof image.hasAttribute === 'function') {
                    image.src = '';
                }
                self.activeDownloads--;
                self.processQueue();
            }
        };
    }

    load(url, onLoad, onProgress, onError) {
        const texture = new Texture();

        if (this.activeDownloads >= this.maxSimultaneousDownloads) {
            // Store the request in the queue with the texture object
            this.downloadQueue.push({ texture, url, onLoad, onProgress, onError });
        } else {
            this.startDownload(texture, url, onLoad, onProgress, onError);
        }

        return texture;
    }
}

export { CancellableTextureLoader };
