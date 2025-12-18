import * as THREE from 'three';
import { createScene, createCamera, createRenderer, addLights, createHighlightMesh, handleResize } from './scene.js';
import { World } from './world.js';
import { PlayerControls } from './controls.js';
import { eventsToVoxels } from './voxelMapper.js';
import { buildStrudelEventsFromSource, getStrudelSourceFromUrl } from './strudel.js';
import { PLAYER, UI, MUSIC_MAPPING } from './constants.js';

const scene = createScene();
const camera = createCamera();
const renderer = createRenderer();
document.body.appendChild(renderer.domElement);
addLights(scene);
handleResize(camera, renderer);

const highlightMesh = createHighlightMesh();
scene.add(highlightMesh);

const world = new World(scene);
world.generateBaseTerrain();

const strudelSource = getStrudelSourceFromUrl();
const { events, description } = buildStrudelEventsFromSource(strudelSource);
const voxels = eventsToVoxels(events);
world.addMusicalVoxels(voxels);
const spawnPlan = computeSpawnPlan(voxels);
if (spawnPlan) {
    buildSpawnPlatform(world, spawnPlan);
}

const flightStatusEl = document.getElementById(UI.flightStatusId);
const strudelStatusEl = document.getElementById(UI.strudelStatusId);
if (strudelStatusEl) {
    strudelStatusEl.textContent = description;
}

const controls = new PlayerControls(camera, document.body, world, {
    onFlightChange: (isFlying) => {
        if (flightStatusEl) {
            flightStatusEl.textContent = isFlying ? 'flying' : 'grounded';
        }
    },
});

if (flightStatusEl) {
    flightStatusEl.textContent = 'grounded';
}

if (spawnPlan) {
    controls.getObject().position.copy(spawnPlan.playerPosition);
    controls.velocity?.set(0, 0, 0);
    controls.canJump = true;
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('mousedown', (event) => onMouseDown(event));

function onMouseDown(event) {
    if (!controls.isLocked()) return;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(world.getRaycastTargets(), false);
    if (!intersects.length) return;
    const intersect = intersects[0];

    if (event.button === 0) {
        world.removeByIntersection(intersect);
    } else if (event.button === 2) {
        const voxelPos = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(0.5));
        voxelPos.set(Math.round(voxelPos.x), Math.round(voxelPos.y), Math.round(voxelPos.z));

        if (playerIntersectsBlock(controls.getObject().position, voxelPos)) return;
        world.placeBlock(voxelPos);
    }
}

function playerIntersectsBlock(playerPos, blockPos) {
    const dx = Math.abs(playerPos.x - blockPos.x);
    const dz = Math.abs(playerPos.z - blockPos.z);
    const dy = playerPos.y - blockPos.y;
    return dx < PLAYER.width / 2 + 0.5 && dz < PLAYER.width / 2 + 0.5 && dy > -1.0 && dy < PLAYER.height;
}

function updateHighlight() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(world.getRaycastTargets(), false);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const lookTarget = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1));
        lookTarget.set(Math.round(lookTarget.x), Math.round(lookTarget.y), Math.round(lookTarget.z));
        highlightMesh.position.copy(lookTarget);
        highlightMesh.visible = true;
    } else {
        highlightMesh.visible = false;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    controls.update(delta);
    updateHighlight();
    renderer.render(scene, camera);
}

animate();

function computeSpawnPlan(voxels) {
    if (!voxels.length) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    voxels.forEach((voxel) => {
        if (voxel.x < minX) minX = voxel.x;
        if (voxel.y < minY) minY = voxel.y;
        if (voxel.z < minZ) minZ = voxel.z;
        if (voxel.z > maxZ) maxZ = voxel.z;
    });

    const xStart = Math.floor(minX) - 4;
    const xEnd = xStart + 3;
    const platformY = Math.max(Math.round(minY) - 1, MUSIC_MAPPING.baseHeight - 1);
    const zStart = Math.floor(minZ) - 2;
    const zEnd = Math.ceil(maxZ) + 2;

    const playerX = (xStart + xEnd) / 2;
    const playerZ = (zStart + zEnd) / 2;
    const playerY = platformY + 0.5 + 1.5;

    return {
        xStart,
        xEnd,
        zStart,
        zEnd,
        platformY,
        playerPosition: new THREE.Vector3(playerX, playerY, playerZ),
    };
}

function buildSpawnPlatform(world, plan) {
    for (let x = plan.xStart; x <= plan.xEnd; x += 1) {
        for (let z = plan.zStart; z <= plan.zEnd; z += 1) {
            world.placeBlock(new THREE.Vector3(x, plan.platformY, z));
        }
    }
}
