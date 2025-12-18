import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { FLIGHT, PHYSICS, PLAYER } from './constants.js';

export class PlayerControls {
    constructor(camera, domElement, world, { onFlightChange } = {}) {
        this.world = world;
        this.controls = new PointerLockControls(camera, domElement);
        this.velocity = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.ascend = false;
        this.descend = false;
        this.canJump = false;
        this.isFlying = false;
        this.onFlightChange = onFlightChange;

        this.#bindEvents(domElement);
    }

    #bindEvents(domElement) {
        domElement.addEventListener('click', () => this.controls.lock());
        document.addEventListener('keydown', (event) => this.#onKeyDown(event));
        document.addEventListener('keyup', (event) => this.#onKeyUp(event));
    }

    getObject() {
        return this.controls.getObject();
    }

    isLocked() {
        return this.controls.isLocked;
    }

    toggleFlight() {
        this.isFlying = !this.isFlying;
        if (!this.isFlying) {
            this.ascend = false;
            this.descend = false;
        }
        if (typeof this.onFlightChange === 'function') {
            this.onFlightChange(this.isFlying);
        }
    }

    #onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.isFlying) {
                    this.ascend = true;
                } else if (this.canJump) {
                    this.velocity.y += 12;
                    this.canJump = false;
                }
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                if (this.isFlying) {
                    this.descend = true;
                }
                break;
            case 'KeyF':
                this.toggleFlight();
                break;
            default:
                break;
        }
    }

    #onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
            case 'Space':
                this.ascend = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.descend = false;
                break;
            default:
                break;
        }
    }

    update(delta) {
        if (!this.isLocked()) return;

        this.velocity.x -= this.velocity.x * PHYSICS.damping * delta;
        this.velocity.z -= this.velocity.z * PHYSICS.damping * delta;

        const forward = new THREE.Vector3();
        this.controls.getDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(forward, this.controls.getObject().up).normalize();

        const inputVector = new THREE.Vector3();
        if (this.moveForward) inputVector.add(forward);
        if (this.moveBackward) inputVector.sub(forward);
        if (this.moveRight) inputVector.add(right);
        if (this.moveLeft) inputVector.sub(right);
        inputVector.normalize();

        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            const accel = this.isFlying ? FLIGHT.acceleration : FLIGHT.horizontalAcceleration;
            this.velocity.x += inputVector.x * accel * delta;
            this.velocity.z += inputVector.z * accel * delta;
        }

        if (!this.isFlying) {
            this.velocity.y -= PHYSICS.gravity * delta;
        } else {
            this.velocity.y = 0;
        }

        const player = this.controls.getObject();
        const originalPos = player.position.clone();

        player.position.x += this.velocity.x * delta;
        if (this.#checkHorizontalCollision(player.position)) {
            player.position.x = originalPos.x;
            this.velocity.x = 0;
        }

        player.position.z += this.velocity.z * delta;
        if (this.#checkHorizontalCollision(player.position)) {
            player.position.z = originalPos.z;
            this.velocity.z = 0;
        }

        if (this.isFlying) {
            const verticalInput = (this.ascend ? 1 : 0) - (this.descend ? 1 : 0);
            player.position.y += verticalInput * FLIGHT.verticalSpeed * delta;
        } else {
            player.position.y += this.velocity.y * delta;
            if (this.velocity.y < 0) {
                if (this.#checkVerticalCollision(player.position, true)) {
                    this.velocity.y = 0;
                    this.canJump = true;
                    const feetY = player.position.y - 1.5;
                    const blockY = Math.round(feetY);
                    player.position.y = blockY + 0.5 + 1.5;
                }
            } else if (this.velocity.y > 0) {
                if (this.#checkVerticalCollision(player.position, false)) {
                    this.velocity.y = 0;
                    player.position.y = Math.floor(player.position.y + 0.1) - 0.2;
                }
            }
        }

        if (player.position.y < -10) {
            this.velocity.set(0, 0, 0);
            player.position.set(0, 10, 0);
        }
    }

    #checkHorizontalCollision(position) {
        const { halfWidth } = PLAYER;
        const points = [
            new THREE.Vector3(position.x - halfWidth, position.y - 1.4, position.z - halfWidth),
            new THREE.Vector3(position.x + halfWidth, position.y - 1.4, position.z - halfWidth),
            new THREE.Vector3(position.x - halfWidth, position.y - 1.4, position.z + halfWidth),
            new THREE.Vector3(position.x + halfWidth, position.y - 1.4, position.z + halfWidth),
            new THREE.Vector3(position.x - halfWidth, position.y - 0.8, position.z - halfWidth),
            new THREE.Vector3(position.x + halfWidth, position.y - 0.8, position.z - halfWidth),
            new THREE.Vector3(position.x - halfWidth, position.y - 0.8, position.z + halfWidth),
            new THREE.Vector3(position.x + halfWidth, position.y - 0.8, position.z + halfWidth),
            new THREE.Vector3(position.x, position.y + 0.1, position.z),
        ];
        return points.some((p) => this.world.hasCollisionAt(p));
    }

    #checkVerticalCollision(position, isFalling) {
        const { halfWidth } = PLAYER;
        const points = [];
        if (isFalling) {
            points.push(
                new THREE.Vector3(position.x - halfWidth, position.y - 1.5, position.z - halfWidth),
                new THREE.Vector3(position.x + halfWidth, position.y - 1.5, position.z - halfWidth),
                new THREE.Vector3(position.x - halfWidth, position.y - 1.5, position.z + halfWidth),
                new THREE.Vector3(position.x + halfWidth, position.y - 1.5, position.z + halfWidth),
            );
        } else {
            points.push(new THREE.Vector3(position.x, position.y + 0.1, position.z));
        }
        return points.some((p) => this.world.hasCollisionAt(p));
    }
}
