import {calculateMouseLocationOnPlanet, resetCameraNearFar} from "./ControllerUtils.js" ;

class ZoomController
{
	constructor (nkEngine, camera, domElement, planet)
	{
		this._dom = domElement;
		this._planet = planet;
		this._camera = camera;
		this._isMouseDown = false;
		this._mouseDownLocation = [];
		this._next = null;

		this._nkEngine = nkEngine ;
	}

	event (eventName, e)
	{
		switch (eventName) 
		{
			case "mousewheel" :
				this.zoom(e.deltaY, e.x, e.y) ;
			break ;

			default :
				if (!!this._next)
					this._next.event(eventName, e) ;
			break ;
		}
	}

	zoom (z, x, y)
	{
		// Constants
		const nkMaths = this._nkEngine.nkMaths ;

		// Get direction and intersection with globe
		const pixelDir = new nkMaths.Vector (this._camera.getDirectionAtPixelWorld(x, y, null)) ;
		const onGlobe = calculateMouseLocationOnPlanet(nkMaths, this._camera, this._planet, x, y) ;

		if (onGlobe === 0)
			return ;

		// Compute total distance from camera and make 10% increments
		let camToGlobeDistance = onGlobe.getDistanceVec3(this._camera.getPositionAbsolute()) ;
		camToGlobeDistance *= -Math.sign(z) * 0.1 ;

		// Move camera in given direction by given distance
		const newCamPos = new nkMaths.Vector (this._camera.getPositionAbsolute()).add(pixelDir.mul(camToGlobeDistance)) ;
		this._camera.setPositionAbsolute(newCamPos) ;

		// Update camera's properties for optimal viewing conditions
		resetCameraNearFar(this._camera, this._planet) ;
	}

	append (aController)
	{
		if (!!this._next)
			this._next.append(aController) ;
		else
			this._next = aController ;
	}
}

export {ZoomController} ;