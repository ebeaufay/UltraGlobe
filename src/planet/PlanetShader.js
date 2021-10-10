/**
 * Simple test shader
 */

const PlanetShader = {

	vertexShader: /* glsl */`
	#define HalfPI 1.5707963267948966192313216916398
	#define PI 3.1415926535897932384626433832795
	#define LON_MULTIPLIER 0.15915494309189533576888376337251
	#define LAT_MULTIPLIER 0.63661977236758134307553505349006

	uniform sampler2D elevation;
	uniform float radius;
	uniform vec3 planetPosition;
	uniform vec2 lowerLeft;
	uniform vec2 upperRight;
	uniform vec2 uvLowerLeft;
	uniform vec2 uvUpperRight;
	
	varying vec2 texUV;

	void main() {
		vec3 vPosition = position;
        float elevation = texture2D(elevation, vPosition.xy).r;
		float lon = vPosition.x * (upperRight.x - lowerLeft.x) + lowerLeft.x;
		float lat = vPosition.y * (upperRight.y - lowerLeft.y) + lowerLeft.y;

		float width = upperRight.x - lowerLeft.x;
		float height = upperRight.y - lowerLeft.y;

		texUV = vec2(((lon - lowerLeft.x) / width)*(uvUpperRight.x-uvLowerLeft.x)+uvLowerLeft.x, ((lat - lowerLeft.y) /height)*(uvUpperRight.y-uvLowerLeft.y)+uvLowerLeft.y );
		vPosition = vec3(-(cos(lat) * cos(lon)), sin(lat), cos(lat) * sin(lon));
		
		vPosition *= elevation+radius;
		
	    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
	}`,

	fragmentShader: /* glsl */`

	varying vec2 texUV;
	uniform vec2 uvLowerLeft;
	uniform vec2 uvUpperRight;
	uniform sampler2D imagery;
	
	void main() {
		//vec3 color = vec3(0.5, 0.6, 0.7) ;
		vec3 color = texture2D(imagery, texUV.xy).xyz;
		gl_FragColor = vec4(color, 1.0);
	}`

};

const PlanetShaderNk = {

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

		PIX_UV = vec2(1.0) - vec2(((lon - lowerLeft.x) / width) * (uvUpperRight.x-uvLowerLeft.x) + uvLowerLeft.x, ((lat - lowerLeft.y) / height) * (uvUpperRight.y - uvLowerLeft.y) + uvLowerLeft.y) ;
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

export { PlanetShader, PlanetShaderNk };
