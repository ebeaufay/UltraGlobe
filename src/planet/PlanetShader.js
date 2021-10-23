/**
 * Simple test shader
 */

const PlanetShader = {

	vertex: `
	layout(binding = 0, std140) uniform PassBuffer
	{
		mat4 view ;
		mat4 proj ;

		vec2 lowerLeft ;
		vec2 upperRight ;
		vec2 uvLowerLeft ;
		vec2 uvUpperRight ;
	} ;

	in vec4 POSITION ;
	in mat4 WORLD_MATRIX ;

	out vec2 PIX_UV ;

	void main ()
	{
		float lon = POSITION.x * (upperRight.x - lowerLeft.x) + lowerLeft.x ;
		float lat = POSITION.y * (upperRight.y - lowerLeft.y) + lowerLeft.y ;

		float width = upperRight.x - lowerLeft.x ;
		float height = upperRight.y - lowerLeft.y ;

		PIX_UV = vec2(((lon - lowerLeft.x) / width) * (uvUpperRight.x - uvLowerLeft.x) + uvLowerLeft.x, 1.0 - (((lat - lowerLeft.y) / height) * (uvUpperRight.y - uvLowerLeft.y) + uvLowerLeft.y)) ;
		vec3 vPosition = vec3(-(cos(lat) * cos(lon)), sin(lat), cos(lat) * sin(lon));
		
	    gl_Position = proj * view * WORLD_MATRIX * vec4(vPosition, 1.0) ;
	}
	`,

	pixel: `
		in vec2 PIX_UV ;

		uniform sampler2D inputTex ;

		out vec4 OUT_COLOR ;

		void main ()
		{
			OUT_COLOR = texture(inputTex, PIX_UV) ;
			//OUT_COLOR = vec4(PIX_UV, 0, 1) ;
		}
	`
}

export { PlanetShader };
