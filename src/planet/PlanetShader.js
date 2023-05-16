/**
 * Shader for planet tiles
 */


const PlanetShader = {

	vertexShader: (numImageryLayers, tileSize) =>/* glsl */`
	
	uniform vec3 planetPosition;
	uniform vec4 bounds;
	uniform vec4 imageryBounds[`+ numImageryLayers + `];
	uniform sampler2D elevation;

	varying vec2 fragmentImageryUV[`+ numImageryLayers + `];

	varying float elevationX;

	float a = 6378137.0;
    float e = 0.006694384442042;

	vec3 transformWGS84ToCartesian (float lon, float lat, float h) {
        
        float N = a / (sqrt(1.0 - (e * pow(sin(lat), 2.0))));
        float cosLat = cos(lat);
        float cosLon = cos(lon);
        float sinLat = sin(lat);
        float sinLon = sin(lon);
        float nPh = (N + h);

        return vec3(nPh * cosLat * cosLon,nPh * cosLat * sinLon,(0.993305615557957 * N + h) * sinLat);
    }

	void main() {
		vec3 vPosition = vec3(position);
        
		float lon = vPosition.x * (bounds[2] - bounds[0]) + bounds[0];
		float lat = vPosition.z * (bounds[3] - bounds[1]) + bounds[1];
		float h = vPosition.y;

		float width = bounds[2] - bounds[0];
		float height = bounds[3] - bounds[1];

		for(int i=0;i<`+ numImageryLayers + `;i++) {
			if(lon<imageryBounds[i][0] || lon > imageryBounds[i][2] || lat < imageryBounds[i][1] || lat > imageryBounds[i][3]){
				fragmentImageryUV[i] = vec2(-1,-1);
			}else{
				fragmentImageryUV[i] = vec2(((lon - bounds[0]) / width), ((lat - bounds[1]) /height));
			}
		}
		vec2 elevationUV = vec2(((lon - bounds[0]) / width), ((lat - bounds[1]) /height));
		vec2 texUV = vec2((elevationUV.x*`+(tileSize-1)+`.0+0.5)/`+tileSize+`.0, (elevationUV.y*`+(tileSize-1)+`.0+0.5)/`+tileSize+`.0);
		

		float terrainElevation = texture2D(elevation, texUV.xy).r;
		vPosition = transformWGS84ToCartesian(lon, lat, terrainElevation);
		elevationX = terrainElevation;
		vPosition*=h;
		
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
	}`,

	fragmentShader: (numImageryLayers) => {
		let code = /* glsl */`
		varying vec2 fragmentImageryUV[`+ numImageryLayers + `];
		uniform sampler2D imagery[`+ numImageryLayers + `];
		uniform float transparency[`+ numImageryLayers + `];
		
		varying float elevationX;

		void main() {
			if(imagery.length()>0){
				gl_FragColor = vec4(texture2D(imagery[0], fragmentImageryUV[0].xy).xyz,0.0);
			}
		}`;
		

		// for (let i = numImageryLayers - 1; i >= 0; i--) {
		// 	code += 
		// 	`if()`
		// 	`if(fragmentImageryUV[`+i+`].x>=0.0 && fragmentImageryUV[`+i+`].x<=1.0 && fragmentImageryUV[`+i+`].y>=0.0 && fragmentImageryUV[`+i+`].y<=1.0){
		// 		color = mix(color, texture2D(imagery[`+i+`], fragmentImageryUV[`+i+`].xy), transparency[`+i+`]);
		// 	}
		// 	`;
		// }
		// code+=`
		// gl_FragColor = vec4(texture2D(imagery[0], fragmentImageryUV[0].xy).xyz,0.01);}`;
		return code;
	}
};

export { PlanetShader };
