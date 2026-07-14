import { CONFIG, TAMED_ANIMALS } from './config.js';

let nextTamedId = 1;

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

export function tameAnimal(game, animalType) {
    if (!game.research.isResearched('beast_binding')) return false;
    const def = TAMED_ANIMALS[animalType];
    if (!def) return false;
    if (!game.resources.has({ food: def.foodToTame })) return false;

    const pen = findAnyPen(game);
    if (!pen) return false;

    game.resources.deduct({ food: def.foodToTame });
    const tamed = createTamedAnimal(animalType, pen.x, pen.y);
    game.tamedAnimals.push(tamed);
    game.notifications.push({ text: `Tamed a ${animalType}!`, tick: game.tick, type: 'success' });
    game.eventLog.add(game, `Tamed a ${animalType}`, 'success', { type: 'position', x: pen.x, y: pen.y });
    return true;
}

function findAnyPen(game) {
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            if (game.map[y][x].structure === 'beast_circle') {
                return { x, y };
            }
        }
    }
    return null;
}
