import { RGBAFormat, RGBFormat } from 'three/src/constants.js';
import { ImageLoader } from 'three/src/loaders/ImageLoader.js';
import { Texture } from 'three/src/textures/Texture.js';
import { Loader } from 'three/src/loaders/Loader.js';

class CancellableTextureLoader extends Loader {

    constructor(manager) {

        super(manager);

    }

    load(url, onLoad, onProgress, onError) {

        const texture = new Texture();

        const loader = new ImageLoader(this.manager);
        loader.setCrossOrigin(this.crossOrigin);
        loader.setPath(this.path);

        var image = loader.load(url, function (image) {

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
