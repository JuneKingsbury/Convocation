import { CONFIG, ANIMALS, TAMED_ANIMALS } from '../core/config.js';

let nextTamedId = 1;

export function syncTamedIdCounter(animals) {
    const maxId = animals.reduce((max, a) => Math.max(max, a.id || 0), 0);
    if (maxId >= nextTamedId) nextTamedId = maxId + 1;
}

export function createTamedAnimal(type, x, y) {
    const def = TAMED_ANIMALS[type];
    return {
        id: nextTamedId++,
        type,
        x, y,
        hp: def.hp,
        maxHp: def.hp,
        char: def.char,
        color: def.color,
        produceCooldown: def.produceRate,
        penX: x,
        penY: y,
    };
}

export function updateTamedAnimals(game) {
    if (!game.research.isResearched('beast_binding')) return;

    for (const animal of game.tamedAnimals) {
        animal.produceCooldown--;
        if (animal.produceCooldown <= 0) {
            const def = TAMED_ANIMALS[animal.type];
            const output = {};
            output[def.produces] = def.produceAmount;
            game.resources.add(output);
            animal.produceCooldown = def.produceRate;
        }

        if (Math.random() < 0.1) {
            const pen = findNearestPen(game, animal);
            if (pen) {
                wanderInPen(animal, pen, game.map);
            }
        }
    }
}

function findNearestPen(game, animal) {
    if (game.mapIndex) {
        return game.mapIndex.findNearest('beast_circle', animal.x, animal.y);
    }
    let bestDist = Infinity;
    let bestPen = null;
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            if (game.map[y][x].structure === 'beast_circle') {
                const dist = Math.abs(animal.x - x) + Math.abs(animal.y - y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestPen = { x, y };
                }
            }
        }
    }
    return bestPen;
}

function wanderInPen(animal, pen, map) {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const dir = dirs[Math.floor(Math.random() * 4)];
    const nx = animal.x + dir[0];
    const ny = animal.y + dir[1];
    if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) return;
    const dist = Math.abs(nx - pen.x) + Math.abs(ny - pen.y);
    if (dist <= 3 && map[ny][nx].passable) {
        animal.x = nx;
        animal.y = ny;
    }
}

export function designateTame(game, wildAnimalId) {
    if (!game.research.isResearched('beast_binding')) return false;

    const wildAnimal = game.wildlife.find(a => a.id === wildAnimalId);
    if (!wildAnimal || wildAnimal.hp <= 0) return false;

    const animalDef = ANIMALS[wildAnimal.type];
    if (!animalDef || !animalDef.tameable) return false;

    const tamedDef = TAMED_ANIMALS[wildAnimal.type];
    if (!tamedDef) return false;

    if (!game.resources.has({ food: tamedDef.foodToTame })) return false;
    if (!findAnyPen(game)) return false;

    game.resources.deduct({ food: tamedDef.foodToTame });

    game.taskQueue.add({
        type: 'tame',
        skillRequired: 'animals',
        x: wildAnimal.x,
        y: wildAnimal.y,
        workAmount: 20,
        targetAnimalId: wildAnimalId,
    });

    game.notifications.push({ text: `Taming ${wildAnimal.type}...`, tick: game.tick, type: 'success' });
    return true;
}

export function completeTame(game, wildAnimalId) {
    const wildAnimal = game.wildlife.find(a => a.id === wildAnimalId);
    if (!wildAnimal || wildAnimal.hp <= 0) return false;

    const pen = findAnyPen(game);
    if (!pen) return false;

    game.wildlife = game.wildlife.filter(a => a.id !== wildAnimalId);
    const tamed = createTamedAnimal(wildAnimal.type, pen.x, pen.y);
    game.tamedAnimals.push(tamed);
    game.notifications.push({ text: `Tamed a ${wildAnimal.type}!`, tick: game.tick, type: 'success' });
    game.eventLog.add(game, `Tamed a ${wildAnimal.type}`, 'success', { type: 'position', x: pen.x, y: pen.y });
    return true;
}

function findAnyPen(game) {
    if (game.mapIndex) {
        return game.mapIndex.findFirst('beast_circle');
    }
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            if (game.map[y][x].structure === 'beast_circle') {
                return { x, y };
            }
        }
    }
    return null;
}
