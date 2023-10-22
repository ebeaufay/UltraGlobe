/**
 * Shader for planet tiles
 */


const PlanetShader = {

	vertexShader: (numImageryLayers, tileSize) =>/* glsl */`
	
	precision highp float;
	precision highp int;

	uniform vec3 planetPosition;
	uniform vec4 bounds;
	uniform vec4 imageryBounds[`+ numImageryLayers + `];
	uniform vec4 imageryUVBounds[`+ numImageryLayers + `];
	uniform int imageryProjections[`+ numImageryLayers + `];
	uniform sampler2D elevation;
	uniform float elevationExageration;

	varying vec2 fragmentImageryUV[`+ numImageryLayers + `];

	varying float elevationX;
	varying float lon;
	varying float lat;
	varying vec3 v_normal;

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
        
		lon = vPosition.x * (bounds[2] - bounds[0]) + bounds[0];
		lat = vPosition.z * (bounds[3] - bounds[1]) + bounds[1];
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
		vec2 texUV = vec2((elevationUV.x*`+ (tileSize - 1) + `.0+0.5)/` + tileSize + `.0, (elevationUV.y*` + (tileSize - 1) + `.0+0.5)/` + tileSize + `.0);
		
		float texelWidth = 1.0/`+ (tileSize) + `.0;
		float texelHeight = 1.0/`+ (tileSize) + `.0;
		float texelWithDeg = width/`+ (tileSize) + `.0;
		float texelHeightDeg = height/`+ (tileSize) + `.0;
		float terrainElevation = texture2D(elevation, texUV.xy).r*elevationExageration;
		float heightA = texture2D(elevation, texUV.xy+vec2(texUV.x<0.5?texelWidth:-texelWidth, 0.0)).r*elevationExageration;
		float heightB = texture2D(elevation, texUV.xy+vec2(0.0, texUV.y<0.5?texelHeight:-texelHeight)).r*elevationExageration;
		
		vPosition = transformWGS84ToCartesian(lon, lat, terrainElevation);
		vec3 positionA = transformWGS84ToCartesian(lon+(texUV.x<0.5?texelWithDeg:-texelWithDeg), lat, heightA);
		vec3 positionB = transformWGS84ToCartesian(lon, lat+(texUV.y<0.5?texelHeightDeg:-texelHeightDeg), heightB);
		
		elevationX = terrainElevation;
		
		csm_Position = vPosition*h;

		vec3 tangent = texUV.x<0.5?positionA - vPosition:vPosition-positionA;
		vec3 bitangent = texUV.y<0.5?positionB - vPosition:vPosition-positionB;
			
		csm_Normal = normalize(cross(tangent, bitangent));
		v_normal = vec3(csm_Normal);
		
		
	}`,

	fragmentShader: (numImageryLayers, shaderColorLayerCode, shaderLayerTransparency) => {
		let code = /* glsl */`

		

		precision highp float;
		precision highp int;

		varying vec2 fragmentImageryUV[`+ numImageryLayers + `];
		uniform sampler2D imagery[`+ numImageryLayers + `];
		uniform float transparency[`+ numImageryLayers + `];
		uniform vec4 imageryUVBounds[`+ numImageryLayers + `];
		uniform int imageryProjections[`+ numImageryLayers + `];
		
		varying float lon;
		varying float lat;
		varying float elevationX;
		varying vec3 v_normal;
		`;
		if (shaderColorLayerCode) {
			code += shaderColorLayerCode;
		}

		code += `void main() {
			if(imagery.length()>0){
				csm_DiffuseColor = vec4(texture2D(imagery[0], fragmentImageryUV[0].xy).xyz,0.0);
			}else{
				csm_DiffuseColor = vec4(0.0,0.0,0.0,0.0);
			}
		`;
		if (shaderColorLayerCode) {
			code+= `
				vec3 shaderLayerColor = getShaderLayerColor(lon, lat, elevationX, v_normal);
				csm_DiffuseColor = mix(csm_DiffuseColor, vec4(shaderLayerColor,0.0), 1.0-`+shaderLayerTransparency.toFixed(3)+`);
			`
		}
		code += `}`;


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
