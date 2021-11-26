function calculateMouseLocationOnPlanet (nkMaths, camera, planet, x, y)
{
	// Get back direction for pixel
	const pixelDir = camera.getDirectionAtPixelWorld(x, y) ;
	const camPos = camera.getPositionAbsolute() ;
	const sphereDistance = distSphere(planet.center, planet.radius, camPos, pixelDir) ;

	if (sphereDistance > 0)
		return camPos.add(pixelDir.mulScalar(sphereDistance)) ;

	return 0 ;
}

function distSphere (center, radius, origin, direction)
{
	// Use sphere equation against ray equation to find back right parameter
	// This gives back intersection distance if there is one
	const fromCenter = origin.sub(center) ;

	const a = direction.dotProductVec3(direction) ;
	const b = 2.0 * direction.dotProductVec3(fromCenter) ;
	const c = fromCenter.dotProductVec3(fromCenter) - radius * radius ;
	const d = (b * b) - (4 * a * c) ;

	if (d < 0)
		return -1 ;
	else
		return (-b - Math.sqrt(d)) / (2.0 * a) ;
}

function resetCameraNearFar (camera, planet)
{
	const pointer1 = planet.center.getDistanceVec3(camera.getPositionAbsolute()) - planet.radius ;
	camera.setNear(pointer1 * 0.1) ;
	camera.setFar(Math.sqrt(2 * planet.radius * pointer1 + pointer1 * pointer1) * 2) ;
}

export {calculateMouseLocationOnPlanet, resetCameraNearFar} ;