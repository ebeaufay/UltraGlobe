class Controller {
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
        throw "error, this should be implemented in child class";
    }
    
    append(aController){
		if(!!this.next){
			this.next.append(aController);
		}else{
			this.next = aController;
		}
	}
} export { Controller }