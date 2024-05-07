const PlanetTileShaderChunks = {
    vertexPreMain: () => `
    uniform vec4 bounds;
    uniform sampler2D elevation;
    varying vec3 llh;
    varying vec2 vUv;
    varying vec3 vSurfacePosition;
    varying vec3 terrainNormal;
    `,

    vertexMain: () => `
    llh = vec3( mix(bounds.x, bounds.z, uv.x), mix(bounds.y, bounds.w, uv.y), texture2D(elevation, uv));
    if(llh.y>PI_HALF || llh.y<-PI_HALF){
        llh.x = 0.0;
    }
    vUv = uv;
    terrainNormal = normal;
    #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
        vSurfacePosition = worldPosition.xyz;
    #else
        vSurfacePosition = (modelMatrix * vec4(position,1.0)).xyz;
    #endif
    
    `,

    fragmentPreMain: (numImageryLayers, shaderColorLayerCode, shaderColorLayerTextures) => {
        let code = /* glsl */`

		uniform sampler2D imagery[`+ numImageryLayers + `];
		uniform float transparency[`+ numImageryLayers + `];
		uniform vec4 imageryUVBounds[`+ numImageryLayers + `];
		uniform int imageryProjections[`+ numImageryLayers + `];
		uniform float level;

		`;

        if (shaderColorLayerTextures) {
            const textureNames = Object.keys(shaderColorLayerTextures);
            for (let i = 0; i < textureNames.length; i++) {
                code += `
				uniform sampler2D `+ textureNames[i] + `;
				`;
            }
        }

        code += `
		
		varying vec3 llh;
        varying vec2 vUv;
        varying vec3 vSurfacePosition;
        varying vec3 terrainNormal;
		`;
        if (shaderColorLayerCode) {
            code += shaderColorLayerCode;
        }
        return code;
    },
    

    fragmentMain: (shaderColorLayerCode, shaderLayerTransparency) => {
        let code = `
			if(imagery.length()>0){
				vec2 localUV = vec2(vUv.x*(imageryUVBounds[0].z-imageryUVBounds[0].x)+imageryUVBounds[0].x,vUv.y*(imageryUVBounds[0].w-imageryUVBounds[0].y)+imageryUVBounds[0].y);
				diffuseColor = vec4(texture2D(imagery[0], localUV).xyz,1.0);
			}else{
				diffuseColor = vec4(0.0,0.0,0.0,1.0);
			}
		`;
        if (shaderColorLayerCode) {
            console.log("ljhbgljgh")
            code += `
				vec3 shaderLayerColor = getShaderLayerColor(llh, vSurfacePosition, terrainNormal, level);
				diffuseColor = mix(diffuseColor, vec4(shaderLayerColor,0.0), 1.0-`+ shaderLayerTransparency.toFixed(3) + `);
			`
        }
        
        // NOTE
        // vTangent and vBitangent may be available
    
        return code;
    }


};
export { PlanetTileShaderChunks };