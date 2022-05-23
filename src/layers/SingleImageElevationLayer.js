import {ElevationLayer} from './ElevationLayer.js'

const radiansToDegrees = 180/Math.PI;

/**
 * Elevation from a single image (Equidistant Cylindrical).
 */
class SingleImageElevationLayer extends ElevationLayer{

    /**
     * 
     * @param {id: Object, 
     * name: String, 
     * bounds: [Double], 
     * url: imageURL,
     * min: Double,
     * max: Double} properties 
     */
    constructor(properties) {
        super(properties);

        this.min = properties.min;
        this.max = properties.max;

        this.loaded = false;
        this.pendingRequests = [];

        const canvas = document.createElement('canvas');
        this.context = canvas.getContext('2d');
        
        const img = new Image;
        const self = this;
        
        img.onload = function(){
            canvas.height = img.height;
            canvas.width = img.width;
            self.context.drawImage(img,0,0); // Or at whatever offset you like
            self.data = self.context.getImageData(0, 0, canvas.width, canvas.height).data;
            self.loaded = true;
            self.pendingRequests.forEach(f=>f());
        };
        img.src = properties.url;

        //var pixelData = canvas.getContext('2d').getImageData(event.offsetX, event.offsetY, 1, 1).data;
    }

    getElevation(bounds, width, height) {
        const self = this;
        function request(){
            var elevationArray = new Array(width * height).fill(0);
            for (let x = 0; x < width; x ++) {
                for (let y = 0; y < height; y ++) {
                    let lon = (bounds.min.x + (x * ((bounds.max.x - bounds.min.x) / (width-1))))*radiansToDegrees;
                    let lat = -(bounds.min.y + (y * ((bounds.max.y - bounds.min.y) / (height-1))))*radiansToDegrees;
    
                    elevationArray[width * y + x] = self.getElevationAtLocation(lon,lat);
                }
            }
            return elevationArray;
        }
        if(this.loaded){
            return Promise.resolve(request());
        }else{
            var onLoad;
            const promise = new Promise(resolve=>{
                onLoad = ()=>{
                    resolve(request());
                }
            })
            this.pendingRequests.push(onLoad);
            return promise;
        }
        
        
    };

    getElevationAtLocation(lon, lat){
        if(lon < this.bounds.min.x || lat < this.bounds.min.y || lon>this.bounds.max.x || lat > this.bounds.max.y){
            return 0;
        }else{
            let pixelRedValue = this.billinearInterpolation(
                (lon - this.bounds.min.x)/(this.bounds.max.x-this.bounds.min.x),
                (lat - this.bounds.min.y)/(this.bounds.max.y-this.bounds.min.y)
            );
            pixelRedValue/=255;
            pixelRedValue*= this.max - this.min;
            pixelRedValue+=this.min;
            return pixelRedValue;
        }
    }

    billinearInterpolation(percentageX, percentageY) {

        var x = percentageX * (this.context.canvas.width - 1);
        var y = percentageY * (this.context.canvas.height - 1);


        var floorX = Math.floor(x);
        if (floorX == x) floorX -= 1;
        var floorY = Math.floor(y);
        if (floorY == y) floorY -= 1;
        var ceilX = Math.ceil(x);
        if (ceilX == 0) ceilX += 1;
        var ceilY = Math.ceil(y);
        if (ceilY == 0) ceilY += 1;
        floorX = Math.max(0, floorX);
        floorY = Math.max(0, floorY);

        ceilX = Math.min((this.context.canvas.width - 1), ceilX);
        ceilY = Math.min((this.context.canvas.height - 1), ceilY);

        return ((1 - (x - floorX)) * (1 - (y - floorY)) * this.data[floorY*4*this.context.canvas.width+floorX*4]) +
            ((1 - (ceilX - x)) * (1 - (y - floorY)) * this.data[floorY*4*this.context.canvas.width+floorX*4+4]) +
            ((1 - (x - floorX)) * (1 - (ceilY - y)) * this.data[(floorY+1)*4*this.context.canvas.width+floorX*4]) +
            ((1 - (ceilX - x)) * (1 - (ceilY - y)) * this.data[(floorY+1)*4*this.context.canvas.width+floorX*4+4]);
    }

}

export { SingleImageElevationLayer };