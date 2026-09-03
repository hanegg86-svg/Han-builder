// Logic Layer (App) - Orchestrates PWA, UI, Data, and Engine
import { engine } from './engine.js';
import { OBJECT_DEFINITIONS, addObjectToCity, cityState, clearCityState, charactersState, addCharacterState } from './data.js';

// Global app state for UI
let selectedObjectType = null;
let currentMode = 'build';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // 1. PWA Registration
    registerServiceWorker();

    // 2. Init 3D Engine
    engine.initScene();

    // 3. Render Object Selector (10+ objects)
    renderObjectSelector();

    // 4. Setup Event Listeners (Touch-friendly Delegation)
    setupEventListeners();
    
    // Add dummy characters (simulation)
    loadInitialCharacters();
});

// PWA: Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered!', reg))
            .catch(err => console.error('SW Registration Failed!', err));
    }
}

// UI: Generate Object Selector DOM
function renderObjectSelector() {
    const container = document.getElementById('object-selector-container');
    container.innerHTML = ''; // Clear

    OBJECT_DEFINITIONS.forEach(objDef => {
        const item = document.createElement('div');
        item.className = 'object-item';
        item.id = `obj-${objDef.id}`;
        item.innerHTML = objDef.icon;
        item.setAttribute('aria-label', `เลือก ${objDef.name}`);
        item.setAttribute('data-id', objDef.id);
        
        item.addEventListener('click', () => {
            selectObject(objDef.id);
        });

        container.appendChild(item);
    });
}

// Logic: Select Object from Toolbar
function selectObject(typeId) {
    // UI Feedback: Deselect previous
    const prevSelected = document.querySelector('.object-item.selected');
    if (prevSelected) prevSelected.classList.remove('selected');

    selectedObjectType = typeId;
    const objDef = OBJECT_DEFINITIONS.find(obj => obj.id === typeId);
    
    // UI Feedback: Select current
    document.getElementById(`obj-${typeId}`).classList.add('selected');
    document.getElementById('selected-object-label').textContent = `${objDef.icon} ${objDef.name}`;
}

// Logic: Add Initial Characters
function loadInitialCharacters() {
    const mario = addCharacterState('mario', new THREE.Vector3(-3, 0.4, -3));
    const koopa1 = addCharacterState('koopa', new THREE.Vector3(3, 0.4, 3));
    const koopa2 = addCharacterState('koopa', new THREE.Vector3(2, 0.4, -2));
    
    // Render them (hidden by mode at start)
    engine.renderCharacter(mario);
    engine.renderCharacter(koopa1);
    engine.renderCharacter(koopa2);
    
    // Start play mode after adding them (simulation)
    // engine.setMode('play'); // Auto start play for character walking demo
}

// UI: Event Delegation for Bottom Nav
function setupEventListeners() {
    // Bottom Nav Main Actions
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            handleNavAction(item.getAttribute('data-action'));
        });
    });

    // 3D Grid Touch/Click handling for object placement
    const renderCanvas = document.querySelector('#render-container canvas');
    
    // Function to handle object placement logic
    const handlePlacement = (event) => {
        if (currentMode !== 'build' || !selectedObjectType) return;
        
        const gridPoint = engine.getGridPointAtTouch(event);
        if (!gridPoint) return;

        // Data Layer update
        const newObj = addObjectToCity(selectedObjectType, gridPoint);
        if (newObj) {
            // View/Rendering Layer update
            engine.renderCityObject(newObj);
        }
    };

    // Both click (desktop) and touch (mobile) support for quick feedback
    renderCanvas.addEventListener('mousedown', handlePlacement);
    renderCanvas.addEventListener('touchstart', (event) => {
        // Prevent default touch behavior (like zooming) for the canvas interaction
        event.preventDefault(); 
        handlePlacement(event);
    }, { passive: false });
}

// Logic: Handle Bottom Nav Interactions
function handleNavAction(action) {
    if (action === 'clear') {
        engine.clearScene();
        clearCityState();
        document.getElementById('selected-object-label').textContent = "เมืองถูกล้างแล้ว";
        if (currentMode === 'play') {
             // Reload characters and set play mode again after clearing (simulation)
             loadInitialCharacters(); 
             engine.setMode('play');
        }
        return;
    }

    // Toggle active state in UI
    const prevActive = document.querySelector('.nav-item.active');
    if (prevActive) prevActive.classList.remove('active');
    document.querySelector(`[data-action="${action}"]`).classList.add('active');

    currentMode = action;
    engine.setMode(currentMode);

    if (action === 'play') {
        document.getElementById('selected-object-label').textContent = "เล่นโหมด: ดูตัวละครเดินไปมา";
    } else if (action === 'build') {
        document.getElementById('selected-object-label').textContent = "เลือกวัตถุเพื่อสร้าง";
    }
}
