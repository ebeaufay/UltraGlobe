class Controller {
    /**
     * 
     * @param {THREE.Camera} camera (optional) the camera controlled by this controller
     * @param {HTMLDocument} domElement the html element where evenets are listened to
     * @param {Map} map 
     */
    constructor(camera, domElement, map){
        this.next = null;
        this.dom = domElement;
		this.planet = map.planet;
		this.map = map;
		this.camera = camera;
    }

    event(eventName, e){
		const eventHandled = this._handleEvent(eventName, e);
        if(!eventHandled && this.next){
            this.next.event(eventName, e);
        }
	}

    _handleEvent(){
        if (!!self.next) { self.next._handleEvent(eventName, e); }
    }

    update(){
        this._update();
        if(!!this.next){
			this.next.update();
		}
    }
    _update(){
        
        
    }
    
    append(aController){
		if(!!this.next){
			this.next.append(aController);
		}else{
			this.next = aController;
		}
	}

    clear(){
        this.next = null;
    }
} export { Controller }