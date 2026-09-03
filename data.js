// Data Layer - separation of concern for definitions

export class CityObject {
    constructor(id, typeId, position, orientation = 0) {
        this.id = id;
        this.typeId = typeId;
        this.position = position; // Vector3 {x, y, z}
        this.orientation = orientation; // In degrees
    }
}

export class Character {
    constructor(id, type, startPosition) {
        this.id = id;
        this.type = type; // e.g., 'mario', 'koopa'
        this.position = startPosition; // Vector3
        this.targetPosition = null; // Vector3 for AI movement
        this.speed = 0.05;
    }
}

// 10 different object types definitions (Simulated)
// For actual 3D, these would link to actual geometry data. Here we define basic properties for simulated rendering in engine.js
export const OBJECT_DEFINITIONS = [
    { id: 'peach_castle_core', name: 'ปราสาท Peach', icon: '🏰', category: 'building', size: {x: 2, y: 3, z: 2} },
    { id: 'mario_warp_pipe_green', name: 'ท่อ Warp สีเขียว', icon: '🟢', category: 'utility', size: {x: 1, y: 1.5, z: 1} },
    { id: 'mario_warp_pipe_yellow', name: 'ท่อ Warp สีเหลือง', icon: '🟡', category: 'utility', size: {x: 1, y: 1.5, z: 1} },
    { id: 'mario_question_block', name: 'บล็อก ?', icon: '❓', category: 'block', size: {x: 1, y: 1, z: 1} },
    { id: 'toad_house_red', name: 'บ้าน Toad สีแดง', icon: '🍄', category: 'building', size: {x: 1.5, y: 2, z: 1.5} },
    { id: 'toad_house_green', name: 'บ้าน Toad สีเขียว', icon: '🐸', category: 'building', size: {x: 1.5, y: 2, z: 1.5} },
    { id: 'mushroom_kingdom_tree', name: 'ต้นไม้เห็ด', icon: '🌳', category: 'landscape', size: {x: 1, y: 2, z: 1} },
    { id: 'koopa_racing_car_blue', name: 'รถแข่ง Koopa (น้ำเงิน)', icon: '🚙', category: 'vehicle', size: {x: 2, y: 1, z: 1} },
    { id: 'cheep_cheep_pond', name: 'บ่อน้ำ Cheep Cheep', icon: '💧', category: 'landscape', size: {x: 3, y: 0.2, z: 3} },
    { id: 'road_block_pavement', name: 'บล็อกทางเท้า', icon: '🧱', category: 'block', size: {x: 1, y: 0.1, z: 1} }
];

// App State (Single source of truth for city layout)
export let cityState = {
    objects: [], // Array of CityObject instances
    nextObjectId: 1
};

export let charactersState = {
    list: [], // Array of Character instances
    nextCharacterId: 1
};

// State Mutators
export function addObjectToCity(typeId, position) {
    const objectType = OBJECT_DEFINITIONS.find(obj => obj.id === typeId);
    if (!objectType) return null;
    
    const newObject = new CityObject(cityState.nextObjectId++, typeId, position);
    cityState.objects.push(newObject);
    return newObject;
}

export function clearCityState() {
    cityState.objects = [];
    cityState.nextObjectId = 1;
    charactersState.list = [];
    charactersState.nextCharacterId = 1;
}

export function addCharacterState(type, startPosition) {
    const newChar = new Character(charactersState.nextCharacterId++, type, startPosition);
    charactersState.list.push(newChar);
    return newChar;
}
