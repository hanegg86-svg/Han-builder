import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

// --- Scene Initialization ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(4, 5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// --- Lighting & Grids ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(6, 12, 8);
scene.add(dirLight);

const gridHelper = new THREE.GridHelper(20, 20, 0x4f46e5, 0x333333);
scene.add(gridHelper);

// --- Controls Setup ---
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.75;
scene.add(transformControls);

// Disable OrbitControls during Gizmo manipulation
transformControls.addEventListener('dragging-changed', (e) => {
  orbit.enabled = !e.value;
});

// --- State Variables ---
const objectsGroup = new THREE.Group();
scene.add(objectsGroup);

let selectedObject = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };
let isSnap = false;

// --- Touch Raycasting & Selection ---
renderer.domElement.addEventListener('pointerdown', (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (dist > 6) return; // Ignore drag moves

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(objectsGroup.children, false);

  if (intersects.length > 0) {
    selectObject(intersects[0].object);
  } else if (!transformControls.dragging) {
    deselectObject();
  }
});

function selectObject(obj) {
  selectedObject = obj;
  transformControls.attach(obj);
  syncPanelProperties();
  document.getElementById('bottom-sheet').classList.add('open');
}

function deselectObject() {
  selectedObject = null;
  transformControls.detach();
  document.getElementById('bottom-sheet').classList.remove('open');
}

// --- Object Spawning ---
function createMesh(geometry) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(document.getElementById('mat-color').value),
    roughness: parseFloat(document.getElementById('mat-roughness').value),
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0.5, 0);
  objectsGroup.add(mesh);
  selectObject(mesh);
}

document.getElementById('btn-add-cube').addEventListener('click', () => {
  createMesh(new THREE.BoxGeometry(1, 1, 1));
});

document.getElementById('btn-add-sphere').addEventListener('click', () => {
  createMesh(new THREE.SphereGeometry(0.6, 32, 24));
});

document.getElementById('btn-add-cylinder').addEventListener('click', () => {
  createMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 24));
});

// --- UI Panel Sync & Modifiers ---
function syncPanelProperties() {
  if (!selectedObject) return;
  document.getElementById('mat-color').value = '#' + selectedObject.material.color.getHexString();
  document.getElementById('mat-roughness').value = selectedObject.material.roughness;
}

document.getElementById('mat-color').addEventListener('input', (e) => {
  if (selectedObject) selectedObject.material.color.set(e.target.value);
});

document.getElementById('mat-roughness').addEventListener('input', (e) => {
  if (selectedObject) selectedObject.material.roughness = parseFloat(e.target.value);
});

document.querySelectorAll('.seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    transformControls.setMode(btn.dataset.mode);
  });
});

document.getElementById('btn-snap-grid').addEventListener('click', (e) => {
  isSnap = !isSnap;
  e.currentTarget.classList.toggle('active', isSnap);
  transformControls.setTranslationSnap(isSnap ? 0.5 : null);
  transformControls.setRotationSnap(isSnap ? THREE.MathUtils.degToRad(15) : null);
});

document.getElementById('btn-delete').addEventListener('click', () => {
  if (selectedObject) {
    const obj = selectedObject;
    deselectObject();
    objectsGroup.remove(obj);
    obj.geometry.dispose();
    obj.material.dispose();
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('ต้องการล้างฉากทั้งหมดหรือไม่?')) {
    deselectObject();
    while (objectsGroup.children.length > 0) {
      const obj = objectsGroup.children[0];
      objectsGroup.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    }
  }
});

// --- Export Functions ---
function downloadFile(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById('btn-export-glb').addEventListener('click', () => {
  if (objectsGroup.children.length === 0) return alert('ไม่มีโมเดลในฉาก');
  const exporter = new GLTFExporter();
  exporter.parse(
    objectsGroup,
    (gltf) => {
      const blob = new Blob([gltf], { type: 'model/gltf-binary' });
      downloadFile(blob, 'model.glb');
    },
    (err) => console.error(err),
    { binary: true }
  );
});

document.getElementById('btn-export-obj').addEventListener('click', () => {
  if (objectsGroup.children.length === 0) return alert('ไม่มีโมเดลในฉาก');
  const exporter = new OBJExporter();
  const result = exporter.parse(objectsGroup);
  const blob = new Blob([result], { type: 'text/plain' });
  downloadFile(blob, 'model.obj');
});

// --- Window Resize & Render Loop ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  orbit.update();
  renderer.render(scene, camera);
}
animate();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(console.error);
}
