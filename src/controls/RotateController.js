import {calculateMouseLocationOnPlanet, resetCameraNearFar} from "./ControllerUtils.js" ;

class RotateController 
{
	constructor (nkEngine, camera, domElement, planet)
	{
		this._dom = domElement ;
		this._planet = planet ;
		this._camera = camera ;
		this._isMouseDown = false ;
		this._mouseDownLocation = [] ;
		this._next = null ;
		this._mouseDownLocationOnPlanetSurface = null ;
		this._cameraBasePosition = null ;
		this._cameraBaseOrientation = null ;
		this._cameraBaseRight = null ;

		this._nkEngine = nkEngine ;
	}

	event (eventName, e)
	{
		if (e.which == 3)
		{
			switch (eventName)
			{
				case "mousedown" :
					this.mouseDown(e) ;
				break ;

				case "mouseup" :
					this.mouseUp(e) ;
				break ;

				case "mousemove" :
					this.mouseMove(e) ;
				break ;
			}
		}
		else if (!!this._next)
			this._next.event(eventName, e) ;
	}

	mouseDown (e)
	{
		this._isMouseDown = true ;
		this._mouseDownLocation = [e.x, e.y] ;
		this._mouseDownLocationOnPlanetSurface = calculateMouseLocationOnPlanet(this._nkEngine.nkMaths, this._camera, this._planet, e.x, e.y) ;
		this._cameraBasePosition = new this._nkEngine.nkMaths.Vector (this._camera.getPositionAbsolute()) ;
		this._cameraBaseOrientation = new this._nkEngine.nkMaths.Quaternion (this._camera.getOrientationAbsolute()) ;
		this._cameraBaseRight = new this._nkEngine.nkMaths.Vector (this._camera.getAbsoluteRight()) ;
	}

	mouseUp (e)
	{
		this._isMouseDown = false;
		this._mouseDownLocation = [e.x, e.y] ;
	}

	mouseMove (e)
	{
		if (!!this._isMouseDown && !!this._mouseDownLocationOnPlanetSurface)
		{
			// Callback
			this.rotate(this._mouseDownLocation, [e.x, e.y]) ;

			// Refresh state
			this._mouseDownLocation = [e.x, e.y] ;
			//this._mouseDownLocationOnPlanetSurface = calculateMouseLocationOnPlanet(this._nkEngine.nkMaths, this._camera, this._planet, e.x, e.y) ;
		}
	}

	rotate (rotateStart, rotateEnd)
	{
		// Constants
		const rotationFactor = 0.005 ;
		const nkMaths = this._nkEngine.nkMaths ;

		// Recenter rotation
		const camPos = new nkMaths.Vector (this._camera.getPositionAbsolute()) ;
		const rotationCenter = this._mouseDownLocationOnPlanetSurface ;
		const rotationCamPos = camPos.sub(rotationCenter) ;

		// Rotate around surface normal for pixel x diff
		const yAxis = rotationCenter.sub(this._planet.center).getNormalizedVec3() ;
		//const xRotation = Math.min(0.99, Math.max(-0.99, (rotateEnd[0] - rotateStart[0]) * rotationFactor)) ;
		const xRotation = (rotateEnd[0] - rotateStart[0]) * rotationFactor ;
		const xQuat = new nkMaths.Quaternion (yAxis, xRotation) ;
		const xRotatedCamPos = xQuat.transform(rotationCamPos) ;

		// Rotation around cam's X axis for pixel y diff
		//const xAxis = new nkMaths.Vector (this._camera.getAbsoluteRight()).getNormalizedVec3() ;
		const xAxis = new nkMaths.Vector (this._camera.getAbsoluteRight()) ;
		//const yRotation = Math.min(0.99, Math.max(-0.99, (rotateEnd[1] - rotateStart[1]) * rotationFactor)) ;
		const yRotation = (rotateEnd[1] - rotateStart[1]) * rotationFactor ;
		const yQuat = new nkMaths.Quaternion (xAxis, yRotation) ;
		const yRotatedCamPos = yQuat.transform(rotationCamPos) ;

		// Reconstruct new position
		const posOffset = xRotatedCamPos.sub(rotationCamPos).add(yRotatedCamPos.sub(rotationCamPos)) ;
		const fullRotation = xQuat.combine(yQuat) ;
		//const posOffset = yRotatedCamPos.sub(rotationCamPos) ;
		//const fullRotation = yQuat ;
		this._camera.setPositionAbsolute(camPos.add(posOffset)) ;
		this._camera.setOrientationAbsolute(fullRotation.combine(this._camera.getOrientationAbsolute())) ;
		//this._camera.setOrientationAbsolute(fullRotation) ;

		// Update camera parameters
		resetCameraNearFar(this._camera, this._planet) ;
	}

	rotate0 (rotateStart, rotateEnd)
	{
		// Constants
		const rotationFactor = 0.012 ;
		const nkMaths = this._nkEngine.nkMaths ;

		// Recenter rotation
		const camPos = new nkMaths.Vector (this._cameraBasePosition) ;
		const rotationCenter = this._mouseDownLocationOnPlanetSurface ;
		const rotationCamPos = camPos.sub(rotationCenter) ;

		// Rotate around surface normal for pixel x diff
		const yAxis = rotationCenter.sub(this._planet.center).getNormalizedVec3() ;
		//const xRotation = Math.min(0.99, Math.max(-0.99, (rotateEnd[0] - rotateStart[0]) * rotationFactor)) ;
		const xRotation = (rotateEnd[0] - rotateStart[0]) * rotationFactor ;
		const xQuat = new nkMaths.Quaternion (yAxis, xRotation) ;
		const xRotatedCamPos = xQuat.transform(rotationCamPos) ;

		// Rotation around cam's X axis for pixel y diff
		//const xAxis = new nkMaths.Vector (this._camera.getAbsoluteRight()).getNormalizedVec3() ;
		const xAxis = this._cameraBaseRight ;
		//const yRotation = Math.min(0.99, Math.max(-0.99, (rotateEnd[1] - rotateStart[1]) * rotationFactor)) ;
		const yRotation = (rotateEnd[1] - rotateStart[1]) * rotationFactor ;
		const yQuat = new nkMaths.Quaternion (xAxis, yRotation) ;
		const yRotatedCamPos = yQuat.transform(rotationCamPos) ;

		// Reconstruct new position
		//const posOffset = xRotatedCamPos.sub(rotationCamPos).add(yRotatedCamPos.sub(rotationCamPos)) ;
		//const fullRotation = yQuat.combine(xQuat) ;
		const posOffset = xRotatedCamPos.sub(rotationCamPos) ;
		const fullRotation = xQuat ;
		this._camera.setPositionAbsolute(camPos.add(posOffset)) ;
		this._camera.setOrientationAbsolute(fullRotation.combine(this._cameraBaseOrientation)) ;
		//this._camera.setOrientationAbsolute(fullRotation) ;

		let t0 = fullRotation ;
		let t1 = this._cameraBaseOrientation ;
		let t2 = fullRotation.combine(this._cameraBaseOrientation) ;
		//Object.keys(t).map(function (key, index) {t[key] *= 180.0 / 3.141516 ;}) ;
		console.log("-----") ;
		console.log(yAxis) ;
		console.log(xRotation) ;
		//console.log(xAxis._x + ", " + xAxis._y + ", " + xAxis._z) ;
		//console.log(yRotation * 180.0 / 3.1415) ;
		//console.log("VS") ;
		console.log("For :") ;
		console.log(t0._x + ", " + t0._y + ", " + t0._z) ;
		console.log(t0._w) ;
		//console.log("with") ;
		//console.log(t1._x + ", " + t1._y + ", " + t1._z) ;
		//console.log(t1._w) ;
		//console.log("ending in") ;
		//console.log(t2._x + ", " + t2._y + ", " + t2._z) ;
		//console.log(t2._w + ", " + t2.getLengthVec4()) ;
		console.log("-----") ;

		// Update camera parameters
		resetCameraNearFar(this._camera, this._planet) ;

		/*let pointer1 = (rotateEnd[0] - rotateStart[0]) ;
		this.rotateX(pointer1) ;
		pointer1 = (rotateEnd[1] - rotateStart[1]) ;
		this.rotateY(pointer1) ;

		rotateStart[0] = rotateEnd[0] ;
		rotateStart[1] = rotateEnd[1] ;

		this.resetCameraNearFar() ;*/
	}

	/*rotateX (rotateX)
	{
		const tempPointA = this._mouseDownLocationOnPlanetSurface.sub(this._planet.center).getNormalizedVec3() ;
		rotateX *= 0.004 ;

		const q = new this._nkEngine.nkMaths.Quaternion (tempPointA, rotateX) ;
		let camPos = new this._nkEngine.nkMaths.Vector (this._camera.getPositionAbsolute()).sub(this._mouseDownLocationOnPlanetSurface) ;
		q.apply(camPos) ;
		camPos = camPos.add(this._mouseDownLocationOnPlanetSurface) ;
		this._camera.setPositionAbsolute(camPos) ;

		let tempPointB = new this._nkEngine.nkMaths.Vector (this._camera.getAbsoluteFront()) ;
		let tempPointC = new this._nkEngine.nkMaths.Vector (this._camera.getAbsoluteUp()).getCrossVec3(tempPointB) ;

		tempPointB = q.transform(tempPointB).add(camPos) ;
		this._camera.lookAt(tempPointB) ;

		this._camera.getWorldDirection(tempPointB).normalize();
		tempPointC.crossVectors(tempPointB, tempPointA.copy(this._camera.position).sub(this._planet.center).normalize());
		this._camera.up.crossVectors(tempPointC, tempPointB);
		
		tempPointC.crossVectors(tempPointB, this._camera.up);
		this._camera.lookAt(tempPointB.add(this._camera.position));
		this._camera.up.crossVectors(tempPointB.normalize(), tempPointC);
	}

	rotateY (rotateY)
	{
		this._camera.getWorldDirection(tempPointA).normalize();
		tempPointB.crossVectors(this._camera.up, tempPointA).normalize();
		
		rotateY = - rotateY * 0.004;
		
		tempPointC.crossVectors(tempPointA, this._camera.up).normalize();
		tempPointD.copy(this._planet.center).sub(this._camera.position);
		let pitch = Math.atan2(tempPointE.crossVectors(tempPointD, tempPointA).dot(tempPointC), tempPointA.dot(tempPointD));
		
		if(pitch + rotateY < 0.01){
			rotateY =  0.01 - pitch;
		} 
		if(pitch + rotateY > 1.56){
			rotateY =  1.56 - pitch;
		} 
		this._camera.position.sub(this._mouseDownLocationOnPlanetSurface).applyAxisAngle(tempPointB, -rotateY).add(this._mouseDownLocationOnPlanetSurface);


		tempPointA.applyAxisAngle(tempPointB, -rotateY);
		tempPointC.crossVectors(tempPointA, this._camera.up);
		this._camera.lookAt(tempPointA.add(this._camera.position));
		this._camera.up.crossVectors(tempPointA.normalize(), tempPointC);
	}*/

	append (aController)
	{
		if (!!this._next)
			this._next.append(aController) ;
		else
			this._next = aController ;
	}
}

export {RotateController} ;