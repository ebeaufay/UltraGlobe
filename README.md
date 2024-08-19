[![Version](https://img.shields.io/npm/v/@jdultra/ultra-globe?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)
[![Downloads](https://img.shields.io/npm/dt/@jdultra/ultra-globe.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)

# U L T R A G L O B E  :  http://www.jdultra.com/
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/394b0cd1-04c2-44ee-b510-b580d3c235f9)
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/d26e3484-3a7d-4aef-8e91-8e679d3d6473)


The goal of this library is to provide a way to display geospatial data on a globe in threeJS without having a full fledged framework. Instead, the library is intended as a thin layer to allow threeJS developers to work with a geospatial environment while keeping access to lower level threeJS context.

The existing layer system can be used and extended to import data sources without implementing everything from scratch.

The earth model is wgs 84. and uses a modified UV-sphere for terrain tiles.

There's support for WMS and OGC 3DTiles and partial I3S support. 
There are also a few custom layers allowing fancy visualizations (Google earth 3DTiles, volumetric clouds, Moving tracks..).

Oh, and volumetric clouds are implemented out of the box.

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

[Volumetric Clouds](https://www.jdultra.com/clouds/index.html).

## Latest development
OGC3DTiles now have an alternate "immediate" loading mode that skips intermediate LODs which is faster overall but holes can appear when the camera moves.

There is also a new callback that indicates, amongst a few other stats, the percentage of tiles loaded.

https://github.com/user-attachments/assets/09f43f0b-2eeb-4f58-8c99-67b1c5ebfb44



