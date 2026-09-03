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
        
        // Map data.js object type to meshes/groups
        this.objectMeshes = new Map();
        this.characterMeshes = new Map();

        // Cached shared textures
        this.questionBlockTexture = null;
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

    // Procedural texture for Mario Question Block
    getQuestionBlockTexture() {
        if (this.questionBlockTexture) return this.questionBlockTexture;

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Yellow-Orange background
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(0, 0, 128, 128);

        // Dark orange outer border
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, 118, 118);

        // Corner rivets
        ctx.fillStyle = '#78350f';
        [[18, 18], [110, 18], [18, 110], [110, 110]].forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Question mark symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 74px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#a84300';
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillText('?', 64, 66);

        this.questionBlockTexture = new THREE.CanvasTexture(canvas);
        return this.questionBlockTexture;
    }

    // Procedural composite models for all objects
    createProceduralModel(typeDef) {
        const group = new THREE.Group();

        switch (typeDef.id) {
            case 'peach_castle_core': {
                // Castle Main Base
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(1.6, 1.8, 1.6),
                    new THREE.MeshPhongMaterial({ color: 0xfff5ea })
                );
                body.position.y = 0.9;
                group.add(body);

                // Main Pink Cone Roof
                const roof = new THREE.Mesh(
                    new THREE.ConeGeometry(1.15, 1.2, 16),
                    new THREE.MeshPhongMaterial({ color: 0xe83e8c })
                );
                roof.position.y = 2.4;
                group.add(roof);

                // Gold Top Spire Ball
                const spire = new THREE.Mesh(
                    new THREE.SphereGeometry(0.14, 12, 12),
                    new THREE.MeshPhongMaterial({ color: 0xffd700 })
                );
                spire.position.y = 3.05;
                group.add(spire);

                // 4 Corner Towers with Cone Roofs
                const towerGeom = new THREE.CylinderGeometry(0.22, 0.22, 2.0, 12);
                const towerRoofGeom = new THREE.ConeGeometry(0.32, 0.6, 12);
                const towerMat = new THREE.MeshPhongMaterial({ color: 0xfff5ea });
                const towerRoofMat = new THREE.MeshPhongMaterial({ color: 0xe83e8c });

                [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([tx, tz]) => {
                    const tower = new THREE.Mesh(towerGeom, towerMat);
                    tower.position.set(tx, 1.0, tz);
                    group.add(tower);

                    const tRoof = new THREE.Mesh(towerRoofGeom, towerRoofMat);
                    tRoof.position.set(tx, 2.3, tz);
                    group.add(tRoof);
                });

                // Castle Door
                const door = new THREE.Mesh(
                    new THREE.BoxGeometry(0.4, 0.6, 0.08),
                    new THREE.MeshPhongMaterial({ color: 0x5c3a21 })
                );
                door.position.set(0, 0.3, 0.81);
                group.add(door);

                // Balcony Window
                const win = new THREE.Mesh(
                    new THREE.CircleGeometry(0.18, 16),
                    new THREE.MeshPhongMaterial({ color: 0x3498db })
                );
                win.position.set(0, 1.15, 0.81);
                group.add(win);
                break;
            }

            case 'mario_warp_pipe_green':
            case 'mario_warp_pipe_yellow': {
                const isYellow = typeDef.id.includes('yellow');
                const pipeColor = isYellow ? 0xffcc00 : 0x27ae60;
                const holeColor = isYellow ? 0x554400 : 0x0c3d14;
                const pipeMat = new THREE.MeshPhongMaterial({ color: pipeColor });

                // Pipe Stem
                const stem = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.44, 0.44, 1.1, 20),
                    pipeMat
                );
                stem.position.y = 0.55;
                group.add(stem);

                // Pipe Lip / Collar
                const lip = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.52, 0.52, 0.34, 20),
                    pipeMat
                );
                lip.position.y = 0.93;
                group.add(lip);

                // Top Hole (Dark)
                const hole = new THREE.Mesh(
                    new THREE.CircleGeometry(0.38, 20),
                    new THREE.MeshBasicMaterial({ color: holeColor })
                );
                hole.rotation.x = -Math.PI / 2;
                hole.position.y = 1.105;
                group.add(hole);
                break;
            }

            case 'mario_question_block': {
                const texture = this.getQuestionBlockTexture();
                const blockMat = new THREE.MeshPhongMaterial({ map: texture });
                const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMat);
                block.position.y = 0.5;
                group.add(block);
                break;
            }

            case 'toad_house_red':
            case 'toad_house_green': {
                const isGreen = typeDef.id.includes('green');
                const capColor = isGreen ? 0x27ae60 : 0xe74c3c;

                // House Wall Stem
                const stem = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.65, 0.75, 0.8, 20),
                    new THREE.MeshPhongMaterial({ color: 0xffeedb })
                );
                stem.position.y = 0.4;
                group.add(stem);

                // Wooden Door
                const door = new THREE.Mesh(
                    new THREE.BoxGeometry(0.32, 0.5, 0.1),
                    new THREE.MeshPhongMaterial({ color: 0x5c3a21 })
                );
                door.position.set(0, 0.25, 0.71);
                group.add(door);

                // Mushroom Cap Dome
                const cap = new THREE.Mesh(
                    new THREE.SphereGeometry(1.0, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
                    new THREE.MeshPhongMaterial({ color: capColor })
                );
                cap.scale.set(1, 0.8, 1);
                cap.position.y = 0.75;
                group.add(cap);

                // White Spots on Cap
                const spotMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
                const spotGeom = new THREE.CircleGeometry(0.22, 16);

                const topSpot = new THREE.Mesh(spotGeom, spotMat);
                topSpot.rotation.x = -Math.PI / 2;
                topSpot.position.y = 1.55;
                group.add(topSpot);

                const sideSpots = [
                    { pos: [0, 1.15, 0.95], rot: [-0.6, 0, 0] },
                    { pos: [0, 1.15, -0.95], rot: [0.6, Math.PI, 0] },
                    { pos: [0.95, 1.15, 0], rot: [0, Math.PI / 2, -0.6] },
                    { pos: [-0.95, 1.15, 0], rot: [0, -Math.PI / 2, 0.6] }
                ];
                sideSpots.forEach(({ pos, rot }) => {
                    const s = new THREE.Mesh(spotGeom, spotMat);
                    s.position.set(...pos);
                    s.rotation.set(...rot);
                    group.add(s);
                });
                break;
            }

            case 'mushroom_kingdom_tree': {
                // Trunk
                const trunk = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.18, 0.9, 12),
                    new THREE.MeshPhongMaterial({ color: 0x6d4c41 })
                );
                trunk.position.y = 0.45;
                group.add(trunk);

                // Layered Foliage
                const tier1 = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.65, 0.7, 0.35, 16),
                    new THREE.MeshPhongMaterial({ color: 0x2ecc71 })
                );
                tier1.position.y = 0.95;
                group.add(tier1);

                const tier2 = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.58, 0.35, 16),
                    new THREE.MeshPhongMaterial({ color: 0x27ae60 })
                );
                tier2.position.y = 1.25;
                group.add(tier2);

                const tier3 = new THREE.Mesh(
                    new THREE.SphereGeometry(0.38, 16, 12),
                    new THREE.MeshPhongMaterial({ color: 0x2ecc71 })
                );
                tier3.position.y = 1.55;
                group.add(tier3);
                break;
            }

            case 'koopa_racing_car_blue': {
                const carBlueMat = new THREE.MeshPhongMaterial({ color: 0x1e88e5 });
                const darkMat = new THREE.MeshPhongMaterial({ color: 0x212121 });
                const rimMat = new THREE.MeshPhongMaterial({ color: 0xb0bec5 });

                // Body
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 1.4), carBlueMat);
                body.position.y = 0.25;
                group.add(body);

                // Hood
                const hood = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 0.12, 0.45),
                    new THREE.MeshPhongMaterial({ color: 0xffffff })
                );
                hood.position.set(0, 0.28, 0.45);
                group.add(hood);

                // Seat
                const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.35), darkMat);
                seat.position.set(0, 0.35, -0.05);
                group.add(seat);

                // Steering Wheel
                const wheelTorus = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 16), darkMat);
                wheelTorus.rotation.x = Math.PI / 4;
                wheelTorus.position.set(0, 0.42, 0.2);
                group.add(wheelTorus);

                // Rear Spoiler
                const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.2), carBlueMat);
                spoiler.position.set(0, 0.52, -0.6);
                group.add(spoiler);

                [[-0.25, -0.6], [0.25, -0.6]].forEach(([sx, sz]) => {
                    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2), darkMat);
                    strut.position.set(sx, 0.42, sz);
                    group.add(strut);
                });

                // 4 Wheels
                const wheelGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16);
                const rimGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.125, 12);
                [[-0.48, 0.18, 0.42], [0.48, 0.18, 0.42], [-0.48, 0.18, -0.42], [0.48, 0.18, -0.42]].forEach(([wx, wy, wz]) => {
                    const tire = new THREE.Mesh(wheelGeom, darkMat);
                    tire.rotation.z = Math.PI / 2;
                    tire.position.set(wx, wy, wz);
                    group.add(tire);

                    const rim = new THREE.Mesh(rimGeom, rimMat);
                    rim.rotation.z = Math.PI / 2;
                    rim.position.set(wx, wy, wz);
                    group.add(rim);
                });
                break;
            }

            case 'cheep_cheep_pond': {
                // Water
                const water = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.4, 1.4, 0.1, 24),
                    new THREE.MeshPhongMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.85 })
                );
                water.position.y = 0.05;
                group.add(water);

                // Cobblestone Border
                const rim = new THREE.Mesh(
                    new THREE.TorusGeometry(1.4, 0.09, 8, 24),
                    new THREE.MeshPhongMaterial({ color: 0x78909c })
                );
                rim.rotation.x = Math.PI / 2;
                rim.position.y = 0.07;
                group.add(rim);

                // Cheep Cheep Fish
                const fishBody = new THREE.Mesh(
                    new THREE.SphereGeometry(0.16, 12, 12),
                    new THREE.MeshPhongMaterial({ color: 0xe53935 })
                );
                fishBody.position.set(0, 0.15, 0.2);
                group.add(fishBody);

                const fishFinGeom = new THREE.ConeGeometry(0.08, 0.14, 8);
                const fishFinMat = new THREE.MeshPhongMaterial({ color: 0xffeb3b });

                const fin1 = new THREE.Mesh(fishFinGeom, fishFinMat);
                fin1.rotation.z = Math.PI / 2;
                fin1.position.set(0.18, 0.15, 0.2);
                group.add(fin1);

                const fin2 = new THREE.Mesh(fishFinGeom, fishFinMat);
                fin2.rotation.z = -Math.PI / 2;
                fin2.position.set(-0.18, 0.15, 0.2);
                group.add(fin2);

                const fishEyeGeom = new THREE.SphereGeometry(0.04, 8, 8);
                const fishEyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

                const eye1 = new THREE.Mesh(fishEyeGeom, fishEyeMat);
                eye1.position.set(0.08, 0.22, 0.32);
                group.add(eye1);

                const eye2 = new THREE.Mesh(fishEyeGeom, fishEyeMat);
                eye2.position.set(-0.08, 0.22, 0.32);
                group.add(eye2);
                break;
            }

            case 'road_block_pavement': {
                // Base Slab
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(1.0, 0.08, 1.0),
                    new THREE.MeshPhongMaterial({ color: 0x9e9e9e })
                );
                base.position.y = 0.04;
                group.add(base);

                // 4 Paver Tiles
                const tileMat1 = new THREE.MeshPhongMaterial({ color: 0xbdc3c7 });
                const tileMat2 = new THREE.MeshPhongMaterial({ color: 0x7f8c8d });
                const tileGeom = new THREE.BoxGeometry(0.44, 0.02, 0.44);

                const t1 = new THREE.Mesh(tileGeom, tileMat1);
                t1.position.set(-0.24, 0.09, -0.24);
                group.add(t1);

                const t2 = new THREE.Mesh(tileGeom, tileMat2);
                t2.position.set(0.24, 0.09, -0.24);
                group.add(t2);

                const t3 = new THREE.Mesh(tileGeom, tileMat2);
                t3.position.set(-0.24, 0.09, 0.24);
                group.add(t3);

                const t4 = new THREE.Mesh(tileGeom, tileMat1);
                t4.position.set(0.24, 0.09, 0.24);
                group.add(t4);
                break;
            }

            default: {
                const defaultMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshPhongMaterial({ color: 0xeeeeee })
                );
                defaultMesh.position.y = 0.5;
                group.add(defaultMesh);
            }
        }

        return group;
    }

    // Render an object in 3D based on data.js definition
    renderCityObject(cityObject) {
        const typeDef = OBJECT_DEFINITIONS.find(obj => obj.id === cityObject.typeId);
        if (!typeDef) return;

        const model = this.createProceduralModel(typeDef);
        model.position.set(cityObject.position.x, 0, cityObject.position.z);
        model.rotation.y = THREE.MathUtils.degToRad(cityObject.orientation);

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(model);
        this.objectMeshes.set(cityObject.id, model);
        return model;
    }

    renderCharacter(charData) {
        const group = new THREE.Group();

        if (charData.type === 'mario') {
            const redMat = new THREE.MeshPhongMaterial({ color: 0xd32f2f });
            const blueMat = new THREE.MeshPhongMaterial({ color: 0x1565c0 });
            const skinMat = new THREE.MeshPhongMaterial({ color: 0xffcc80 });
            const darkMat = new THREE.MeshPhongMaterial({ color: 0x3e2723 });

            // Shoes
            const shoeGeom = new THREE.BoxGeometry(0.14, 0.1, 0.22);
            [-0.1, 0.1].forEach(sx => {
                const shoe = new THREE.Mesh(shoeGeom, darkMat);
                shoe.position.set(sx, 0.05, 0.03);
                group.add(shoe);
            });

            // Pants / Overalls
            const pants = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.26), blueMat);
            pants.position.y = 0.24;
            group.add(pants);

            // Torso (Red Shirt)
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.24), redMat);
            torso.position.y = 0.48;
            group.add(torso);

            // Head
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.28), skinMat);
            head.position.y = 0.72;
            group.add(head);

            // Nose
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skinMat);
            nose.position.set(0, 0.72, 0.16);
            group.add(nose);

            // Mustache
            const mustache = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.05, 0.05),
                new THREE.MeshPhongMaterial({ color: 0x111111 })
            );
            mustache.position.set(0, 0.67, 0.16);
            group.add(mustache);

            // Red Cap
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.32), redMat);
            cap.position.y = 0.88;
            group.add(cap);

            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.14), redMat);
            visor.position.set(0, 0.84, 0.18);
            group.add(visor);
        } else {
            // Koopa Model
            const greenMat = new THREE.MeshPhongMaterial({ color: 0x43a047 });
            const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf5f5f5 });
            const yellowMat = new THREE.MeshPhongMaterial({ color: 0xffb300 });

            // Feet
            [-0.14, 0.14].forEach(fx => {
                const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), yellowMat);
                foot.position.set(fx, 0.04, 0.04);
                group.add(foot);
            });

            // Shell Body
            const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), greenMat);
            shell.scale.set(0.85, 1.1, 0.85);
            shell.position.set(0, 0.38, -0.04);
            group.add(shell);

            // Shell White Rim
            const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 16), whiteMat);
            rim.position.set(0, 0.38, -0.04);
            group.add(rim);

            // Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), yellowMat);
            head.position.set(0, 0.64, 0.14);
            group.add(head);

            // Snout
            const snout = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.1, 0.12),
                new THREE.MeshPhongMaterial({ color: 0xffe082 })
            );
            snout.position.set(0, 0.6, 0.24);
            group.add(snout);
        }

        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });

        group.position.set(charData.position.x, 0, charData.position.z);
        this.scene.add(group);

        this.characterMeshes.set(charData.id, group);
        return group;
    }

    // Character AI for random movement
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
                    0,
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
