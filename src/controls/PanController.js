import {calculateMouseLocationOnPlanet} from "./ControllerUtils.js" ;

class PanController
{
	constructor (nkEngine, camera, domElement, planet)
	{
		this._dom = domElement ;
		this._planet = planet ;
		this._camera = camera ;
		this._isMouseDown = false ;
		this._mouseDownLocation = [] ;
		this._next = null ;
		this._lastGlobePosition = null ;

		this._nkEngine = nkEngine ;
	}

	event (eventName, e)
	{
		if (e.which == 1)
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
		this._lastGlobePosition = calculateMouseLocationOnPlanet(this._nkEngine.nkMaths, this._camera, this._planet, e.x, e.y) ;
	}

	mouseUp (e)
	{
		this._isMouseDown = false ;
		this._mouseDownLocation = [e.x, e.y] ;
	}

	mouseMove (e)
	{
		if (!!this._isMouseDown && !!this._lastGlobePosition)
		{
			// Callback
			this.pan(this._mouseDownLocation, [e.x, e.y]) ;

			// Update tracking
			this._mouseDownLocation = [e.x, e.y] ;
		}
	}

	pan (panStart, panEnd)
	{
		// Checks if worthwhile
		const xMove = panEnd[0] - panStart[0] ;
		const yMove = panEnd[1] - panStart[1] ;

		if (xMove === 0 && yMove === 0)
			return ;

		// Constants
		const factor = 0.002 ;
		const nkMaths = this._nkEngine.nkMaths ;
		const absUp = new nkMaths.Vector (0, 1, 0) ;
		const camPos = new nkMaths.Vector (this._camera.getPositionAbsolute()) ;
		const toCenter = new nkMaths.Vector ().sub(camPos).getNormalizedVec3() ;
		const camRot = new nkMaths.Quaternion (this._camera.getOrientationAbsolute()) ;
		const rotationRight = new nkMaths.Vector (this._camera.getAbsoluteRight()) ;
		const rotationUp = absUp ;

		// Rotate camera around up for x move
		const xQuat = new nkMaths.Quaternion (rotationUp, xMove * factor) ;

		// Rotate camera around right for y move
		const yQuat = new nkMaths.Quaternion (rotationRight, yMove * factor) ;

		// Bake rotation in both position and rotation
		const fullQuat = xQuat.combine(yQuat) ;
		const newPos = fullQuat.transform(camPos) ;
		const newRot = fullQuat.combine(camRot) ;

		// Constraint checks : can't pass through Y plane (flip cam through pole)
		const planeEq = new nkMaths.Vector (camPos._x, 0, camPos._z, 0).getNormalizedVec3() ;
		const planeNewPosDot = planeEq._x * newPos._x + planeEq._y * newPos._y + planeEq._z * newPos._z ;

		if (planeNewPosDot < 0)
			return ;

		// Update camera
		this._camera.setPositionAbsolute(newPos) ;
		this._camera.setOrientationAbsolute(newRot) ;
	}

	append (aController)
	{
		if(!!this._next)
			this._next.append(aController) ;
		else
			this._next = aController ;
	}
}

export {PanController} ;