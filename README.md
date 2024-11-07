[![Version](https://img.shields.io/npm/v/@jdultra/ultra-globe?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)
[![Downloads](https://img.shields.io/npm/dt/@jdultra/ultra-globe.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@jdultra/ultra-globe)

# U L T R A G L O B E  :  http://www.jdultra.com/
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/394b0cd1-04c2-44ee-b510-b580d3c235f9)
![image](https://github.com/ebeaufay/UltraGlobe/assets/16924300/d26e3484-3a7d-4aef-8e91-8e679d3d6473)


The goal of this library is to provide a way to display geospatial data on a globe in threeJS without having a full fledged framework. Instead, the library is intended as a thin layer to allow threeJS developers to work with a geospatial environment while keeping access to lower level threeJS context.

The existing layer system can be used and extended to import data sources without implementing everything from scratch.

The earth model is wgs 84. and uses a modified UV-sphere for terrain tiles.

There's support for WMS and OGC 3DTiles and partial I3S support. 
There are also a few custom layers allowing fancy visualizations (Google earth 3DTiles, volumetric clouds, Video projection, Line of sight, Moving tracks..).

Vector Layers and physics are in the works.

## Documentation

[jsdoc](https://www.jdultra.com/ultraglobe/docs/Map.html)

[guide](https://github.com/ebeaufay/UltraGlobe/blob/master/guide/README.md)


## Demos and Code


<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/6552990b-80ed-419c-9165-69b0c9fd8415" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/ultraglobeGettingStarted">Getting started JS</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/ultraglobeGettingStarted">code</a></div>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/ultraglobeGettingStartedTS">Getting started TS</a>   <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/ultraglobeGettingStartedTS">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/8e232c42-9a05-4eef-baea-056c1fd9cd81" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/ultraglobeGoogleTiles">Google 3D Tiles</a>  <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/ultraglobeGoogleTiles">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/864538b3-eeb7-445d-8476-44c3bc67e136" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/addCustomDataToScene">Custom data through three.js</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/addCustomDataToScene">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/d9198a74-8024-4daf-aec7-51456c7b8f80" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/cloudsNOAA">Volumetric clouds NOAA forecast connector</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/cloudsNOAA">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/e16e7779-b6d6-4e04-abee-adf6383e9ff8" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/shaderLayer">programmable shader layers</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/shaderLayer">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/785a7c5e-47e5-455e-83d2-b541a037abbb" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/videoProjection">Video projection</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/videoProjection">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/359c959b-96da-49ba-9439-0d058e82d876" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/procedural">procedurally generated data</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/procedural">code</a></div>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
      <img src="https://github.com/user-attachments/assets/43916c0a-2032-4fd6-92ef-a0d249d89884" width="200" />
    </td>
    <td>
      <div style="display: flex;"><a href="https://www.jdultra.com/ultraglobe/demos/customController">custom controls</a>    <a href="https://github.com/ebeaufay/ultraglobedemos/tree/main/demos/customController">code</a></div>
    </td>
  </tr>
</table>


Other demos:

[Shadow analysis](https://www.jdultra.com/sunny/index.html)

[3DTiles](https://ebeaufay.github.io/UltraGlobeDemo/)

[Geoid](https://storage.googleapis.com/jdultra.com/geoid/index.html)

[Elevation and WMS imagery](https://storage.googleapis.com/jdultra.com/elevation/index.html)

[I3S Points (new york trees) and blue marble](https://storage.googleapis.com/jdultra.com/i3s/index.html)

[Controls (including mobile)](https://storage.googleapis.com/jdultra.com/controllers/index.html)

[More controls for selecting and moving 3DTiles tilesets](https://storage.googleapis.com/jdultra.com/tilesetplacement/index.html)


## Latest development
VectorLayers to display data draped on terrain or in 3D

https://github.com/user-attachments/assets/3c3a935e-3193-4cf4-b296-76328c3f24cb



Projected layers allow projecting a texture onto other data from a given view point. Can be used for video projection, line of sight and anything you can imagine. 

https://github.com/user-attachments/assets/e9401d9b-1ee9-42f8-84bf-f445ed05c597


Cloud and planetary ring shadows give a bit more realism. works on all data like google 3D tiles and here, on some procedural data

https://github.com/user-attachments/assets/cf2f12ea-218f-42c2-b861-1316e34345e2



ObjectLayer simplifies geolocating any three.js object

https://github.com/user-attachments/assets/5aa63a07-fb06-4654-af50-6d06db924040





