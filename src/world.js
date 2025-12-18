import * as THREE from 'three';
import { WORLD_DIMENSIONS, INSTRUMENT_COLORS } from './constants.js';

const loader = new THREE.TextureLoader();
const textureSide = loader.load('textures/dirt-side.jpg');
const textureTop = loader.load('textures/dirt-top.jpg');
const textureBottom = loader.load('textures/dirt-bottom.jpg');

[textureSide, textureTop, textureBottom].forEach((texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
});

const baseMaterials = [
    new THREE.MeshLambertMaterial({ map: textureSide }),
    new THREE.MeshLambertMaterial({ map: textureSide }),
    new THREE.MeshLambertMaterial({ map: textureTop }),
    new THREE.MeshLambertMaterial({ map: textureBottom }),
    new THREE.MeshLambertMaterial({ map: textureSide }),
    new THREE.MeshLambertMaterial({ map: textureSide }),
];

const instrumentMaterialCache = new Map();

function getInstrumentMaterial(instrument) {
    if (instrumentMaterialCache.has(instrument)) {
        return instrumentMaterialCache.get(instrument);
    }
    const color = INSTRUMENT_COLORS[instrument] ?? INSTRUMENT_COLORS.default;
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1,
    });
    instrumentMaterialCache.set(instrument, material);
    return material;
}

function getKey(x, y, z) {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
}

export class World {
    constructor(scene) {
        this.scene = scene;
        this.geometry = new THREE.BoxGeometry();
        this.instancedMesh = null;
        this.objects = [];
        this.dynamicBlocks = [];
        this.occupied = new Map();
        this.seedX = Math.random() * 100;
        this.seedZ = Math.random() * 100;
    }

    generateBaseTerrain() {
        const size = WORLD_DIMENSIONS.size;
        const { terrainThickness } = WORLD_DIMENSIONS;
        const maxCount = size * size * terrainThickness;

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, baseMaterials, maxCount);
        this.instancedMesh.castShadow = true;
        this.instancedMesh.receiveShadow = true;
        this.instancedMesh.userData.instanceKeys = new Map();
        this.scene.add(this.instancedMesh);

        const dummy = new THREE.Object3D();
        let index = 0;
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const wx = x - size / 2;
                const wz = z - size / 2;
                const surfaceHeight = this.#getHeight(wx, wz);

                for (let y = 0; y < terrainThickness; y++) {
                    const wy = surfaceHeight - y;
                    dummy.position.set(wx, wy, wz);
                    dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(index, dummy.matrix);

                    const key = getKey(wx, wy, wz);
                    this.instancedMesh.userData.instanceKeys.set(index, key);
                    this.occupied.set(key, {
                        type: 'instanced',
                        mesh: this.instancedMesh,
                        instanceId: index,
                    });
                    index += 1;
                }
            }
        }
        this.instancedMesh.count = index;
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        this.#refreshRaycastTargets();
    }

    addMusicalBlock(voxel) {
        const block = new THREE.Mesh(this.geometry, getInstrumentMaterial(voxel.instrument));
        block.position.set(voxel.x, voxel.y, voxel.z);
        block.castShadow = true;
        block.receiveShadow = true;
        const key = getKey(voxel.x, voxel.y, voxel.z);
        block.userData.blockKey = key;
        block.userData.instrument = voxel.instrument;
        block.userData.label = voxel.label;
        this.scene.add(block);
        this.dynamicBlocks.push(block);
        this.occupied.set(key, { type: 'dynamic', object: block });
        this.#refreshRaycastTargets();
    }

    addMusicalVoxels(voxels) {
        voxels.forEach((voxel) => {
            if (!this.occupied.has(getKey(voxel.x, voxel.y, voxel.z))) {
                this.addMusicalBlock(voxel);
            }
        });
    }

    placeBlock(position) {
        const key = getKey(position.x, position.y, position.z);
        if (this.occupied.has(key)) return false;
        const block = new THREE.Mesh(this.geometry, getInstrumentMaterial('default'));
        block.position.copy(position);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData.blockKey = key;
        this.scene.add(block);
        this.dynamicBlocks.push(block);
        this.occupied.set(key, { type: 'dynamic', object: block });
        this.#refreshRaycastTargets();
        return true;
    }

    removeByIntersection(intersect) {
        if (intersect.instanceId !== undefined && intersect.object.userData?.instanceKeys) {
            this.#removeInstanced(intersect);
            return true;
        }

        const mesh = intersect.object;
        const key = mesh.userData?.blockKey;
        this.scene.remove(mesh);
        this.dynamicBlocks = this.dynamicBlocks.filter((item) => item !== mesh);
        if (key) {
            this.occupied.delete(key);
        }
        this.#refreshRaycastTargets();
        return true;
    }

    isOccupied(position) {
        return this.occupied.has(getKey(position.x, position.y, position.z));
    }

    hasCollisionAt(position) {
        return this.occupied.has(getKey(position.x, position.y, position.z));
    }

    getRaycastTargets() {
        return this.objects;
    }

    #removeInstanced(intersect) {
        const mesh = intersect.object;
        const instanceId = intersect.instanceId;
        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(instanceId, matrix);
        matrix.scale(new THREE.Vector3(0, 0, 0));
        mesh.setMatrixAt(instanceId, matrix);
        mesh.instanceMatrix.needsUpdate = true;

        const key = mesh.userData.instanceKeys.get(instanceId);
        if (key) {
            mesh.userData.instanceKeys.delete(instanceId);
            this.occupied.delete(key);
        }
    }

    #refreshRaycastTargets() {
        const targets = [];
        if (this.instancedMesh) targets.push(this.instancedMesh);
        this.dynamicBlocks.forEach((block) => targets.push(block));
        this.objects = targets;
    }

    #getHeight(x, z) {
        const scale = 0.2;
        const value =
            Math.sin((x + this.seedX) * scale) * Math.cos((z + this.seedZ) * scale) * 2 +
            Math.sin((x + this.seedX) * scale * 0.5 + (z + this.seedZ) * scale * 0.5) * 2;
        return Math.floor(value);
    }
}
