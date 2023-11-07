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

	varying vec3 llh;
	varying vec3 vPosition;
	varying vec3 terrainNormal;

	float a = 6378137.0;
    float e2 = 0.00669437999014131699613723354004;
	float degToRad = 0.0174532925199432;

	vec3 transformWGS84ToCartesian (float lon, float lat, float h) {
        float N = a / (sqrt(1.0 - (e2 * pow(sin(lat), 2.0))));
        float cosLat = cos(lat);
        float cosLon = cos(lon);
        float sinLat = sin(lat);
        float sinLon = sin(lon);
        float nPh = (N + h);

        return vec3(nPh * cosLat * cosLon,nPh * cosLat * sinLon,(0.99330562000985868300386276645996 * N + h) * sinLat);
    }

	void main() {
		vPosition = vec3(position);
        
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
		vec2 texUV = vec2((elevationUV.x*`+ (tileSize - 1) + `.0+0.5)/` + tileSize + `.0, (elevationUV.y*` + (tileSize - 1) + `.0+0.5)/` + tileSize + `.0);
		texUV = ((texUV*`+tileSize.toFixed(1)+`)+1.0)/`+(tileSize+2).toFixed(1)+`;
		float texelWidth = 1.0/`+ (tileSize+2) + `.0;
		float texelHeight = 1.0/`+ (tileSize+2) + `.0;
		float texelWithDeg = width/`+ (tileSize) + `.0;
		float texelHeightDeg = height/`+ (tileSize) + `.0;
		float elevationX = texture2D(elevation, texUV.xy).r*elevationExageration;
		vPosition = transformWGS84ToCartesian(lon, lat, elevationX)*h;
		csm_Position = vPosition;
		llh = vec3(lon, lat, elevationX);
		
		//normal
		if(lat>1.5707){
			csm_Normal = vec3(0.0,0.0,1.0);
			terrainNormal = vec3(0.0,0.0,1.0);
		}else if(lat<-1.5707){
			csm_Normal = vec3(0.0,0.0,-1.0);
			terrainNormal = vec3(0.0,0.0,1.0);
		}else{
			float heightA = texture2D(elevation, texUV.xy+vec2(texelWidth, 0.0)).r*elevationExageration;
			float heightB = texture2D(elevation, texUV.xy+vec2(0.0, texelHeight)).r*elevationExageration;
			
			vec3 positionA = transformWGS84ToCartesian(lon+(texelWithDeg), lat, heightA);
			vec3 positionB = transformWGS84ToCartesian(lon, lat+(texelHeightDeg), heightB);
			
			vec3 tangent = positionA - vPosition;
			vec3 bitangent = positionB - vPosition;
				
			csm_Normal = normalize(cross(tangent, bitangent));
			float stepX = a*cos(lat)*texelWithDeg;//*degToRad;
			float stepY = a*texelHeightDeg;//*degToRad;
			terrainNormal = normalize(cross(vec3(stepX, 0, heightA - elevationX), vec3(0, stepY, heightB - elevationX)));
			
		}
		
		
		
	}`,

	fragmentShader: (numImageryLayers, shaderColorLayerCode, shaderLayerTransparency, shaderColorLayerTextures) => {
		let code = /* glsl */`

		

		precision highp float;
		precision highp int;

		varying vec2 fragmentImageryUV[`+ numImageryLayers + `];
		uniform sampler2D imagery[`+ numImageryLayers + `];
		uniform float transparency[`+ numImageryLayers + `];
		uniform vec4 imageryUVBounds[`+ numImageryLayers + `];
		uniform int imageryProjections[`+ numImageryLayers + `];
		uniform float level;

		`;
		
		if(shaderColorLayerTextures){
			const textureNames = Object.keys(shaderColorLayerTextures);
			for(let i = 0; i<textureNames.length; i++){
				code+=`
				uniform sampler2D `+textureNames[i]+`;
				`;
			}
		}

		code+=`
		
		varying vec3 llh;
		varying vec3 terrainNormal;
		varying vec3 vPosition;
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
				vec3 shaderLayerColor = getShaderLayerColor(llh, vPosition, terrainNormal, level);
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
