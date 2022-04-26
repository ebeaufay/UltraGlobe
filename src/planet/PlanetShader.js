/**
 * Shader for planet tiles
 */


const PlanetShader = {

	vertexShader: (numImageryLayers, tileSize) =>/* glsl */`
	
	uniform float radius;
	uniform vec3 planetPosition;
	uniform vec4 bounds;
	uniform vec4 imageryBounds[`+ numImageryLayers + `];
	uniform sampler2D elevation;

	
	varying vec2 fragmentImageryUV[`+ numImageryLayers + `];

	void main() {
		vec3 vPosition = vec3(position);
        
		float lon = vPosition.x * (bounds[2] - bounds[0]) + bounds[0];
		float lat = vPosition.y * (bounds[3] - bounds[1]) + bounds[1];

		float width = bounds[2] - bounds[0];
		float height = bounds[3] - bounds[1];

		vPosition = vec3(-(cos(lat) * cos(lon)), sin(lat), cos(lat) * sin(lon));

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
		vPosition *= ((radius*position.z) + terrainElevation);
		
		gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
	}`,

	fragmentShader: (numImageryLayers) => {
		let code = /* glsl */`
		varying vec2 fragmentImageryUV[`+ numImageryLayers + `];
		uniform sampler2D imagery[`+ numImageryLayers + `];
		uniform float transparency[`+ numImageryLayers + `];
		uniform vec4 c;

		void main() {
			vec4 color = vec4(0.0,0.0,0.0,1.0);`;
		

		for (let i = numImageryLayers - 1; i >= 0; i--) {
			code += `
			if(fragmentImageryUV[`+i+`].x>=0.0 && fragmentImageryUV[`+i+`].x<=1.0 && fragmentImageryUV[`+i+`].y>=0.0 && fragmentImageryUV[`+i+`].y<=1.0){
				color = mix(color, texture2D(imagery[`+i+`], fragmentImageryUV[`+i+`].xy), transparency[`+i+`]);
			}
			gl_FragColor = vec4(texture2D(imagery[0], fragmentImageryUV[0].xy).xyz,0.01);`;
			//gl_FragColor = c;`;
		}
		code+=`}`;
		return code;
	}
};

export { PlanetShader };
