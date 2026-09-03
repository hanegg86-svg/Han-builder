// Logic Layer (Rendering) - Handles 3D Scene and simulated models
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJECT_DEFINITIONS, cityState, charactersState } from './data.js';

class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.gridHelper = null;
        this.planeHelper = null; // Ground for clicking
        this.isPlayMode = false;
        
        // Map data.js object type to primitive geometric objects for simulation
        this.objectMeshes = new Map();
        this.characterMeshes = new Map();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - 176), 0.1, 1000); // adjust for header+nav
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight - 176); // adjust for header+nav
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.maxPolarAngle = Math.PI / 2; // don't go below ground

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Helpers
        this.gridHelper = new THREE.GridHelper(20, 20);
        this.scene.add(this.gridHelper);
        
        const geometryGround = new THREE.PlaneGeometry(20, 20);
        const materialGround = new THREE.MeshPhongMaterial({ color: 0x8fc272, depthWrite: false });
        this.planeHelper = new THREE.Mesh(geometryGround, materialGround);
        this.planeHelper.rotation.x = -Math.PI / 2;
        this.planeHelper.receiveShadow = true;
        this.scene.add(this.planeHelper);

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / (window.innerHeight - 176);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight - 176);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        
        if (this.isPlayMode) {
            this.updateCharacterAI();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // Map a point clicked to grid coordinates
    getGridPointAtTouch(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        
        // Touch to mouse coordinates
        if (event.touches) {
            mouse.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        } else {
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.planeHelper);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Snap to grid (1x1)
            point.x = Math.floor(point.x + 0.5);
            point.z = Math.floor(point.z + 0.5);
            point.y = 0;
            return point;
        }
        return null;
    }

    // Render an object in 3D based on data.js definition
    renderCityObject(cityObject) {
        const typeDef = OBJECT_DEFINITIONS.find(obj => obj.id === cityObject.typeId);
        if (!typeDef) return;

        let geometry, material;
        
        // Very basic primitive shape mapping based on data.js definition for SIMULATION
        // In reality, this would load actual 3D glTF models
        switch(typeDef.category) {
            case 'building':
                geometry = new THREE.BoxGeometry(typeDef.size.x, typeDef.size.y, typeDef.size.z);
                material = new THREE.MeshPhongMaterial({ color: 0xcd2929 }); // Toad Red House simulation
                if (typeDef.id.includes('castle')) material.color.setHex(0xffaaaa);
                if (typeDef.id.includes('green')) material.color.setHex(0x5ca021);
                break;
            case 'utility':
                geometry = new THREE.CylinderGeometry(typeDef.size.x/2, typeDef.size.x/2, typeDef.size.y);
                material = new THREE.MeshPhongMaterial({ color: 0x228b22 }); // Green Pipe
                if (typeDef.id.includes('yellow')) material.color.setHex(0xffd700);
                break;
            case 'block':
                geometry = new THREE.BoxGeometry(typeDef.size.x, typeDef.size.y, typeDef.size.z);
                material = new THREE.MeshPhongMaterial({ color: 0xffa500 }); // Question Block
                if (typeDef.id.includes('pavement')) material.color.setHex(0x888888);
                break;
            case 'landscape':
                geometry = (typeDef.id.includes('tree')) ? new THREE.SphereGeometry(typeDef.size.x) : new THREE.CircleGeometry(typeDef.size.x, 32);
                material = new THREE.MeshPhongMaterial({ color: 0x3cb371 }); // Green Tree / Circle Pond
                break;
            case 'vehicle':
                geometry = new THREE.BoxGeometry(typeDef.size.x, typeDef.size.y, typeDef.size.z);
                material = new THREE.MeshPhongMaterial({ color: 0x2e86c1 }); // Koopa Car Blue
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
                material = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(cityObject.position.x, typeDef.size.y / 2, cityObject.position.z); // Center object vertically
        mesh.rotation.y = THREE.MathUtils.degToRad(cityObject.orientation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        this.objectMeshes.set(cityObject.id, mesh);
        return mesh;
    }

    renderCharacter(charData) {
        // Red cube for Mario, green cylinder for Koopa (SIMULATION)
        let geometry, material;
        if (charData.type === 'mario') {
            geometry = new THREE.BoxGeometry(0.5, 0.8, 0.5);
            material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        } else {
            geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
            material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(charData.position.x, 0.4, charData.position.z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        this.characterMeshes.set(charData.id, mesh);
        return mesh;
    }

    // Very simple Character AI for random movement
    updateCharacterAI() {
        charactersState.list.forEach(char => {
            if (!this.characterMeshes.has(char.id)) return;
            const mesh = this.characterMeshes.get(char.id);

            // If no target, set a random grid target
            if (!char.targetPosition) {
                const targetX = char.position.x + THREE.MathUtils.randInt(-3, 3);
                const targetZ = char.position.z + THREE.MathUtils.randInt(-3, 3);
                
                // Snap target to grid and within plane bounds
                char.targetPosition = new THREE.Vector3(
                    Math.max(-10, Math.min(10, Math.floor(targetX + 0.5))),
                    0.4,
                    Math.max(-10, Math.min(10, Math.floor(targetZ + 0.5)))
                );
            }

            // Move towards target
            mesh.position.lerp(char.targetPosition, char.speed);
            char.position.copy(mesh.position); // Sync state

            // Check if reached (close enough)
            if (char.position.distanceToSquared(char.targetPosition) < 0.01) {
                char.targetPosition = null;
            }
        });
    }

    setMode(mode) {
        if (mode === 'play') {
            this.isPlayMode = true;
            this.gridHelper.visible = false;
            this.scene.background.set(0x87ceeb); // Clear sky blue
        } else {
            this.isPlayMode = false;
            this.gridHelper.visible = true;
            this.scene.background.set(0xa0a0a0); // Dev gray
            // Reset character positions (simulation)
            charactersState.list.forEach(char => char.targetPosition = null);
        }
    }

    clearScene() {
        this.objectMeshes.forEach(mesh => this.scene.remove(mesh));
        this.objectMeshes.clear();
        this.characterMeshes.forEach(mesh => this.scene.remove(mesh));
        this.characterMeshes.clear();
    }
}

export const engine = new GameEngine('render-container');
