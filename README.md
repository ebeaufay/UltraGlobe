[![Version](https://img.shields.io/npm/v/@jdultra/ultra-globe?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)
[![Downloads](https://img.shields.io/npm/dt/@jdultra/ultra-globe.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)

# U L T R A G L O B E  :  http://www.jdultra.com/

![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/80af2644-fa32-48c4-b0d7-3c33a590718d)
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/83c5d224-d417-42b4-87d6-ef41823b6133)




The goal of this library is to provide a way to display geospatial data on a globe in threeJS without having a full fledged framework. Instead, the library is intended as a thin layer to allow threeJS developers to work with a geospatial environment while keeping access to lower level threeJS context.

The existing layer system can be used and extended to import data sources without implementing everything from scratch.

The earth model is wgs 84. and uses a modified UV-sphere for terrain tiles.

There's support for WMS and OGC 3DTiles and partial I3S support. There are also a few custom layers allowing fancy visualizations.

Vector Layers and physics are in the works.

## startup project
Here's a simple getting started project: [ULTRAGLOBE getting started](https://drive.google.com/file/d/1ECn7C98WRZRlaNhz_CG5sVFWkwG4mvTb/view?usp=share_link)

unzip and run:

```
npm install
```
```
npm run dev
```

and here's the same project in typescript: [ULTRAGLOBE getting started TypeScript](https://drive.google.com/file/d/1TPZiEL6xq_qNbfiWT-BE08S5SozcPc0S/view?usp=sharing)
## Documentation

[jsdoc](https://www.jdultra.com/ultraglobe/docs/Map.html)

[guide](https://github.com/ebeaufay/UltraGlobe/blob/master/guide/README.md)


## Demos

[Google Map Tile API](https://www.jdultra.com/mapTiles/index.html) limited availability from google API. if the quotas are used up, try again tomorrow.

[Shadow analysis](https://www.jdultra.com/sunny/index.html) limited availability from google API. if the quotas are used up, try again tomorrow.

[3DTiles](https://ebeaufay.github.io/UltraGlobeDemo/)

[Berlin (3 km²)](https://www.jdultra.com/berlin/index.html)

[Geoid](https://storage.googleapis.com/jdultra.com/geoid/index.html)

[Elevation and WMS imagery](https://storage.googleapis.com/jdultra.com/elevation/index.html)

[I3S Points (new york trees) and blue marble](https://storage.googleapis.com/jdultra.com/i3s/index.html)

[Controls (including mobile)](https://storage.googleapis.com/jdultra.com/controllers/index.html)

[More controls for selecting and moving 3DTiles tilesets](https://storage.googleapis.com/jdultra.com/tilesetplacement/index.html)

[Random planet](https://www.jdultra.com/random/index.html)

## Latest development
In the latest version, terrain tile geometries are generated in web workers. The frame rate improves a little and it's going to allow more interesting terrain layers in the future.

I also spent time (more than I hoped to) on clouds, but they look decent, they're cheap and flexible. Here's a couple of videos playing with the settings. The guide an API contain a full description:

https://github.com/ebeaufay/UltraGlobe/assets/16924300/2fbeb3ce-a000-4e52-a630-4bc060d758ad


https://github.com/ebeaufay/UltraGlobe/assets/16924300/0478bb2d-a7ac-4d17-808c-403e5960fc4a




