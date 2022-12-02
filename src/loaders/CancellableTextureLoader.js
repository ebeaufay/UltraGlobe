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

        this.downloads = [];
        setInterval(()=>{
            const start = self.now();
            //console.log(start);
            self.downloads.sort((d1, d2)=>{
                if(!d1.priority || d2.priority) return 0;
                if(d1.priority<d2.priority) return -1;
                if(d1.priority>d2.priority) return 1;
                return 0;
            });
            while(self.now()-start<1){
                const download = self.downloads.shift();
                if(!!download) download.request();
            }
            
        },10)
    }

    now() {
        return (typeof performance === 'undefined' ? Date : performance).now(); // see #10732
    }

    load(url, onLoad, onProgress, onError, priority) {

        const texture = new Texture();
        let aborted = false;
        this.downloads.push({priority:priority, request:()=>{
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
        }})

        texture.abort = ()=>{
            aborted = true;
            console.log("abort!")
        }
        return texture;

    }

}


export { CancellableTextureLoader };
