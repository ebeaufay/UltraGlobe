import { ElevationLayer } from './ElevationLayer.js'

const radiansToDegrees = 180 / Math.PI;
const halfPI = Math.PI * 0.5;
/**
 * Elevation from a single image (Equidistant Cylindrical).
 * @class
 * @extends ElevationLayer
 */
class SingleImageElevationLayer extends ElevationLayer {

    /**
     * 
     * @param {Object} properties 
     * @param {String|Number} properties.id layer id should be unique
     * @param {String} properties.name the name can be anything you want and is intended for labeling
     * @param {String} properties.url the url of the elevation image
     * @param {Number} properties.min min height relative to sea level
     * @param {Number} properties.max max height relative to sea level
     * @param {Number[]} [properties.bounds=[-180, -90, 180, 90]]  min longitude, min latitude, max longitude, max latitude in degrees
     * @param {Boolean} [properties.visible = true] layer will be rendered if true (true by default)
     * 
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

        img.onload = function () {
            canvas.height = img.height;
            canvas.width = img.width;
            self.context.drawImage(img, 0, 0); // Or at whatever offset you like
            self.data = self.context.getImageData(0, 0, canvas.width, canvas.height).data;
            self.loaded = true;
            self.pendingRequests.forEach(f => f());
        };
        img.src = properties.url;

        //var pixelData = canvas.getContext('2d').getImageData(event.offsetX, event.offsetY, 1, 1).data;
    }




    getElevation(bounds, width, height, geometry, skirtGeometry) {
        const self = this;
        const extendedBounds = bounds.clone();
        extendedBounds.min.x -= (bounds.max.x - bounds.min.x) / (width - 1);
        extendedBounds.max.x += (bounds.max.x - bounds.min.x) / (width - 1);
        extendedBounds.min.y -= (bounds.max.y - bounds.min.y) / (height - 1);
        extendedBounds.max.y += (bounds.max.y - bounds.min.y) / (height - 1);

        const meshGeneration = super._simpleMeshFromElevationAsync;
        const trim = super._trimEdges;

        const extendedWidth = width + 2;
        const extendedHeight = height + 2;
        function request() {
            return new Promise((resolve, reject) => {
                var elevationArray = new Array(extendedWidth * extendedHeight).fill(0);
                for (let x = 0; x < extendedWidth; x++) {
                    for (let y = 0; y < extendedHeight; y++) {
                        let lon = (extendedBounds.min.x + (x * ((extendedBounds.max.x - extendedBounds.min.x) / (width +1))));
                        let lat = -(extendedBounds.min.y + (y * ((extendedBounds.max.y - extendedBounds.min.y) / (height +1))));

                        if (lat > halfPI) {
                            lon += Math.PI;
                            lat = halfPI - (lat - halfPI)
                        } else if (lat < -halfPI) {
                            lon += Math.PI;
                            lat = -halfPI - (lat + halfPI)
                        }
                        if (lon > Math.PI) {
                            lon = -Math.PI + (lon % Math.PI);
                        }
                        else if (lon < -Math.PI) {
                            lon = Math.PI + (lon % Math.PI);
                        }
                        elevationArray[extendedWidth * y + x] = self.getElevationAtLocation(lon * radiansToDegrees, lat * radiansToDegrees);
                    }
                }

                
                if (geometry && skirtGeometry) {

                    meshGeneration(bounds, width, height, elevationArray, geometry, skirtGeometry).then(shift => {
                        resolve({
                            elevationArray: trim(elevationArray, width+2, height+2),
                            shift: shift,
                        });
                    }, error => {
                        reject(error);
                    })

                } else {
                    resolve({
                        elevationArray: trim(elevationArray, width, height),
                        shift: undefined,
                    });
                }
            });
            
        }
        if (this.loaded) {
            return request();
        } else {
            var onLoad;
            const promise = new Promise(resolve => {
                onLoad = () => {
                    request().then(result => {
                        resolve(result);
                    })

                }
            })
            this.pendingRequests.push(onLoad);
            return promise;
        }


    };

    getElevationAtLocation(lon, lat) {
        if (lon < this.bounds.min.x || lat < this.bounds.min.y || lon > this.bounds.max.x || lat > this.bounds.max.y) {
            return 0;
        } else {
            let pixelRedValue = this.billinearInterpolation(
                (lon - this.bounds.min.x) / (this.bounds.max.x - this.bounds.min.x),
                (lat - this.bounds.min.y) / (this.bounds.max.y - this.bounds.min.y)
            );
            pixelRedValue /= 255;
            pixelRedValue *= this.max - this.min;
            pixelRedValue += this.min;
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

        return ((1 - (x - floorX)) * (1 - (y - floorY)) * this.data[floorY * 4 * this.context.canvas.width + floorX * 4]) +
            ((1 - (ceilX - x)) * (1 - (y - floorY)) * this.data[floorY * 4 * this.context.canvas.width + floorX * 4 + 4]) +
            ((1 - (x - floorX)) * (1 - (ceilY - y)) * this.data[(floorY + 1) * 4 * this.context.canvas.width + floorX * 4]) +
            ((1 - (ceilX - x)) * (1 - (ceilY - y)) * this.data[(floorY + 1) * 4 * this.context.canvas.width + floorX * 4 + 4]);
    }

}

export { SingleImageElevationLayer };