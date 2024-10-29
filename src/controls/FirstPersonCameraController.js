import * as THREE from 'three';
import { Controller } from './Controller';
import { cartesianToLlhFastSFCT } from '../GeoUtils';


const forward = new THREE.Vector3();
const up = new THREE.Vector3();
const right = new THREE.Vector3();
const speed = new THREE.Vector3();
const normal = new THREE.Vector3();
const temp = new THREE.Vector3();

/**
 * Camera controller that tracks an object and attempts to place the camera behind it
 * while restricting it to an above ground position.
 */
class FirstPersonCameraController extends Controller {
    constructor(camera, domElement, map, speed = 0.4, jumpSpeed = 1, minHeightAboveGround = 20, showUI = map.isMobile, gravity = true) {
        super(camera, domElement, map);

        this.speed = speed;
        this.jumpSpeed = jumpSpeed;
        this.minHeightAboveGround = minHeightAboveGround;
        this.gravity = gravity;
        if (showUI) {
            this.addUI(domElement);
        }
        this.clock = new THREE.Clock();
    }


    _handleEvent(eventName, e) {
        const self = this;
        switch (eventName) {
            case "keydown": self._keyDown(e); break;
            case "keyup": self._keyUp(e); break;
        }
        super._handleEvent(eventName, e);
    }

    _keyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.accelerate = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.accelerateLeft = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.deccelerate = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.accelerateRight = true;
                break;
            case 'Space':
                this.accelerateUp = true;
                break;
        }
    }

    _keyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.accelerate = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.accelerateLeft = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.deccelerate = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.accelerateRight = false;
                break;
            case 'Space':
                this.accelerateUp = false;
                break;
        }
    }


    _update() {
        const self = this;
        
        speed.multiplyScalar(0.85);
        
        self.camera.getWorldDirection(forward);
        forward.normalize();
        up.copy(self.camera.position).normalize();
        right.crossVectors(forward, up);

        forward.multiplyScalar(self.speed);
        right.multiplyScalar(self.speed);
        up.multiplyScalar(self.jumpSpeed);

        if (self.accelerate) speed.add(forward);
        if (self.deccelerate) speed.sub(forward);
        if (self.accelerateRight) speed.add(right);
        if (self.accelerateLeft) speed.sub(right);
        if (self.accelerateUp) speed.add(up);
        if(self.gravity){
            up.multiplyScalar(0.8 / self.jumpSpeed);
            speed.sub(up);
        }
        
        self.camera.position.add(speed);

        self.straighten()
        self.map.resetCameraNearFar();
        self.map.moveCameraAboveSurface();
        
    }

    straighten() {



        this.camera.getWorldDirection(forward).normalize();

        right.crossVectors(this.camera.up.normalize(), forward);
        forward.add(this.camera.position);
        this.camera.lookAt(forward);
        this.camera.up.crossVectors(forward.sub(this.camera.position), right);
    }

    _dispose(){
        if(this.uiContainer){
            this.uiContainer.parentElement.removeChild(this.uiContainer);
        }
        super._dispose();
    }
    addUI(container) {
        const self = this;
        // Create an inner container to hold all UI elements
        self.uiContainer = document.createElement('div');

        // Style the inner container to match the parent container
        Object.assign(self.uiContainer.style, {
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            //height: '100%',
            pointerEvents: 'none', // Allow underlying game to receive events
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'stretch',
        });

        // Append the inner container to the parent container
        container.appendChild(self.uiContainer);

        // Common styles for buttons
        const buttonStyle = {
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '30px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontSize: '24px',
            userSelect: 'none',
            touchAction: 'none',
            transition: 'background-color 0.2s',
            cursor: 'pointer',
            margin: '10px', // Add margin for spacing
        };

        // Helper function to create a button
        function createButton(symbol, onPressCallback, onReleaseCallback) {
            
            const button = document.createElement('div');
            button.innerText = symbol;
            Object.assign(button.style, buttonStyle);

            // Add active state on press
            const onPress = () => {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                onPressCallback();
            };
            const onRelease = () => {
                button.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                onReleaseCallback();
            };

            // Mouse events
            button.addEventListener('mousedown', onPress);
            button.addEventListener('mouseup', onRelease);
            button.addEventListener('mouseleave', onRelease);

            // Touch events
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                onPress();
            });
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                onRelease();
            });

            return button;
        }

        // Create a container for the jump button and control buttons
        const bottomContainer = document.createElement('div');
        Object.assign(bottomContainer.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '20px', // Add padding for margins
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        self.uiContainer.appendChild(bottomContainer);

        // Create Jump Button
        const jumpButton = createButton('⬆️',()=>self.accelerateUp = true, ()=>self.accelerateUp = false);
        Object.assign(jumpButton.style, {
            pointerEvents: 'auto', // Enable events on buttons
        });
        bottomContainer.appendChild(jumpButton);

        // Create Control Buttons Container
        const controlsContainer = document.createElement('div');
        Object.assign(controlsContainer.style, {
            position: 'absolute',
            width:"200px",
            height:"200px",
            bottom:"20px",
            right:"20px",
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        bottomContainer.appendChild(controlsContainer);

        // Define control buttons with symbols and actions
        const forwardContainer = document.createElement('div');
        Object.assign(forwardContainer.style, {
            position: "absolute",
            width:"80px",
            height:"80px",
            bottom:"140px",
            right:"60px",
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        controlsContainer.appendChild(forwardContainer);
        const btnForward = createButton('↑',()=>self.accelerate = true, ()=>self.accelerate = false);
        Object.assign(btnForward.style, {
            pointerEvents: 'auto', // Enable events on individual buttons
        });
        forwardContainer.appendChild(btnForward);
        
        const backContainer = document.createElement('div');
        Object.assign(backContainer.style, {
            position: "absolute",
            width:"80px",
            height:"80px",
            bottom:"20px",
            right:"60px",
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        controlsContainer.appendChild(backContainer);
        const btnBackward = createButton('↓',()=>self.deccelerate = true, ()=>self.deccelerate = false);
        Object.assign(btnBackward.style, {
            pointerEvents: 'auto', // Enable events on individual buttons
        });
        backContainer.appendChild(btnBackward);


        const rightContainer = document.createElement('div');
        Object.assign(rightContainer.style, {
            position: "absolute",
            width:"80px",
            height:"80px",
            bottom:"80px",
            right:"10px",
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        controlsContainer.appendChild(rightContainer);
        const btnRight = createButton('→',()=>self.accelerateRight = true, ()=>self.accelerateRight = false);
        Object.assign(btnRight.style, {
            pointerEvents: 'auto', // Enable events on individual buttons
        });
        rightContainer.appendChild(btnRight);

        const leftContainer = document.createElement('div');
        Object.assign(leftContainer.style, {
            position: "absolute",
            width:"80px",
            height:"80px",
            bottom:"80px",
            left:"10px",
            pointerEvents: 'none', // Allow only buttons to receive events
        });
        controlsContainer.appendChild(leftContainer);
        const btnLeft = createButton('←',()=>self.accelerateLeft = true, ()=>self.accelerateLeft = false);
        Object.assign(btnLeft.style, {
            pointerEvents: 'auto', // Enable events on individual buttons
        });
        leftContainer.appendChild(btnLeft);
        
        
    }

} export { FirstPersonCameraController }