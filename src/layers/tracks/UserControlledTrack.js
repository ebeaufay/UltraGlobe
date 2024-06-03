import {TracksLayer} from './TracksLayer'
import * as THREE from 'three'




/**
 * model by: "Zuncho Multimedia" https://skfb.ly/6AozK
 * 
 */
class UserControlledTrack extends TracksLayer{
    constructor(properties){
        super(properties);
        this.isUserControlledTrack = true;
        
        if(properties.mesh){
            this.tracks.add(properties.mesh);
        }else{
            const geometry = new THREE.TorusGeometry( 25, 5, 16, 100 ); 
            const material = new THREE.MeshStandardMaterial( { color: 0xeeeeee } ); 
            material.metalness = 0.75;
            material.roughness = 0.25;
            const mesh = new THREE.Mesh( geometry, material );
            this.tracks.add(mesh);
            this.tracks.add(new THREE.BoxHelper( mesh, 0xffff00 ));
        }
        if(properties.position){
            this.tracks.position.copy(properties.position);
        }else{
            this.tracks.position.set(-6382000,6382000,0);
        }

        this.movement = new THREE.Vector3();

        this.onMouseMove = this.getOnMouseMoveFunction();
        this.onMouseLeave = this.getOnMouseLeaveFunction();
        this.onKeyDown = this.getOnKeyDownFunction();
        this.onKeyUp = this.getOnKeyUpFunction();

        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();

        this.tracks.matrixAutoUpdate = false;
        this.tracks.matrixWorldAutoUpdate = false;

        this.acceleration = 50;


        this.previousTime = 0;

        // These are temporary vectors used to orrient the track's mesh
        // the track has it's own orrientation but the track's mesh has it's own relative orientation
        this.desiredSubTrackUp = new THREE.Vector3();
        this.desiredSubTrackForward = new THREE.Vector3();


        /* this.arrowHelperX = new THREE.ArrowHelper( new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 100, 0xff0000 );
        this.arrowHelperY = new THREE.ArrowHelper( new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 100, 0x00ff00 );
        this.arrowHelperZ = new THREE.ArrowHelper( new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), 100, 0x0000ff );
        this.tracks.add( this.arrowHelperX );
        this.tracks.add( this.arrowHelperY );
        this.tracks.add( this.arrowHelperZ ); */
    }

    
    /**
     * initializes controls specific to this Track.
     * @param {HTMLElement} dom the dom on which to attach visual components
     */
    initControls(dom){
        const self = this;
        if(_isMobileDevice()){
            this.initControlsMobile(dom);
        }

        dom.addEventListener('mouseleave',this.onMouseLeave);
        dom.addEventListener('mousemove',this.onMouseMove);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        
    }

    /**
     * Removes controls specific to this Track.
     * @param {HTMLElement} dom the dom on which to visual components are attached
     */
    removeControls(dom){
        if(_isMobileDevice()){
            this.removeControlsMobile();
        }
        dom.removeEventListener('mouseleave',this.onMouseLeave);
        dom.removeEventListener('mousemove',this.onMouseMove);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    getOnMouseMoveFunction(){
        const self = this;
        return (e)=>{
            self.mousePosition = new THREE.Vector2((e.offsetX/e.srcElement.offsetWidth)-0.5, -((e.offsetY/e.srcElement.offsetHeight)-0.5));
        
            
        }
    }

    update(clock){
        
        const delta = clock.elapsedTime - this.previousTime;
        this.previousTime = clock.elapsedTime;

        
        //console.log(delta)
        if(!!this.mousePosition){
            this.tracks.getWorldDirection(this.forward).normalize();
            this.tracks.up.copy(this.tracks.position).normalize();
            this.right.crossVectors(this.tracks.up, this.forward).normalize();

            this.desiredSubTrackUp.copy(this.tracks.up);
            this.desiredSubTrackUp.applyAxisAngle(this.right, -this.mousePosition.y*2*delta)
    
            //this.forward.applyEuler(new THREE.Euler(this.mousePosition.y*0.000001*delta, 0, 0, 'XYZ'))
            this.forward.applyAxisAngle(this.right, -this.mousePosition.y*2*delta);
            this.forward.applyAxisAngle(this.tracks.up, -this.mousePosition.x*2*delta);
            this.tracks.up.copy(this.tracks.position).normalize();
            this.tracks.lookAt(this.tracks.position.x+this.forward.x, this.tracks.position.y+this.forward.y, this.tracks.position.z+this.forward.z)
            
        }
        
        this.tracks.children[0].rotateOnAxis(this.tracks.children[0].up, 0.01);



        this.movement.multiplyScalar(Math.pow(0.5, delta));
        
        if(this.accelerate) {
            this.movement.add(this.forward.normalize().multiplyScalar(this.acceleration*delta));
        }
        if(this.deccelerate) {
            this.movement.add(this.forward.normalize().multiplyScalar(-this.acceleration*delta));
        }
        if(this.accelerateRight) {
            this.movement.add(this.right.normalize().multiplyScalar(-this.acceleration*delta*0.25));
        }
        if(this.accelerateLeft) {
            this.movement.add(this.right.normalize().multiplyScalar(this.acceleration*delta*0.25));
        }
        this.tracks.position.add(this.movement);

        this.tracks.updateMatrix();
        this.tracks.updateMatrixWorld(true);
    }

    getOnMouseLeaveFunction(){
        const self = this;
        return (event)=>{
            self.mousePosition = undefined;
            self.accelerate = false;
            self.accelerateLeft = false;
            self.deccelerate = false;
            self.accelerateRight = false;
        }
    }

    getOnKeyDownFunction(){
        const self = this;
        return (event) => {
            switch (event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    self.accelerate = true;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    self.accelerateLeft = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    self.deccelerate = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    self.accelerateRight = true;
                    break;
            }
        }
    }

    

    getOnKeyUpFunction(){
        const self = this;
        return (event) => {
            switch (event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    self.accelerate = false;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    self.accelerateLeft = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    self.deccelerate = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    self.accelerateRight = false;
                    break;
            }
        }
    }
}export{UserControlledTrack}

function _isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};