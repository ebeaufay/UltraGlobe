import { RGBAFormat, RGBFormat } from 'three/src/constants.js';
import { ImageLoader } from 'three/src/loaders/ImageLoader.js';
import { Texture } from 'three/src/textures/Texture.js';
import { Loader } from 'three/src/loaders/Loader.js';


class CancellableTextureLoader extends Loader {

    constructor(manager) {

        super(manager);
        const self = this;
        this.loader = new ImageLoader(this.manager);
        this.loader.setCrossOrigin(this.crossOrigin);

    }

    

    load(url, onLoad, onProgress, onError) {

        const texture = new Texture();
        let aborted = false;
        var image = this.loader.load(url, function (image) {
            if(aborted){
                return;
            }
            texture.image = image;

            // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
            const isJPEG = url.search(/\.jpe?g($|\?)/i) > 0 || url.search(/^data\:image\/jpeg/) === 0;

            texture.format = isJPEG ? RGBFormat : RGBAFormat;
            texture.needsUpdate = true;

            if (onLoad !== undefined) {

                onLoad(texture);

            }

        }, onProgress, onError);

        texture.abort = function () {
            if (image && typeof image.hasAttribute === 'function') {
                image.src = '';
            }
        };

        
        return texture;

    }

}


export { CancellableTextureLoader };
