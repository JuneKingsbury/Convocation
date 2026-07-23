import { CONFIG, ANIMALS, TAMED_ANIMALS, WORK_CONFIG, THOUGHTS } from '../core/config.js';
import { colonistTakeDamage, addThought } from './colonist.js';
import { manhattanDist } from '../world/pathfinding.js';
import { isPassable } from '../world/map.js';

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
        produceCooldown: def.produceRate || 0,
        penX: x,
        penY: y,
    };
}

export function updateTamedAnimals(game) {
    if (!game.research.isResearched('beast_binding')) return;

    for (const animal of game.tamedAnimals) {
        if (animal.onExpedition) continue;
        const def = TAMED_ANIMALS[animal.type];
        if (def.produces) {
            animal.produceCooldown--;
            if (animal.produceCooldown <= 0) {
                const output = {};
                output[def.produces] = def.produceAmount;
                game.resources.add(output);
                animal.produceCooldown = def.produceRate;
            }
        }

        if (Math.random() < WORK_CONFIG.tamedMoveChance) {
            const pen = findNearestPen(game, animal);
            if (pen) {
                wanderInPen(animal, pen, game.map);
            }
        }

        if (def.guardAnimal) {
            updateGuardWolf(animal, def, game);
        }

        if (def.happinessAura) {
            const radius = def.auraRadius || 4;
            for (const c of game.colonists) {
                if (c.hp <= 0) continue;
                const dist = Math.abs(c.x - animal.x) + Math.abs(c.y - animal.y);
                if (dist <= radius) {
                    c.mood = Math.min(100, c.mood + (def.auraMoodBonus || 5) * 0.01);
                }
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
    if (dist <= WORK_CONFIG.penWanderRadius && map[ny][nx].passable) {
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
    if (!tamedDef.guardAnimal && !findAnyPen(game)) return false;

    game.resources.deduct({ food: tamedDef.foodToTame });

    const workAmount = tamedDef.dangerousTame ? WORK_CONFIG.dangerousTameWork : WORK_CONFIG.tameWork;

    game.taskQueue.add({
        type: 'tame',
        skillRequired: 'animals',
        x: wildAnimal.x,
        y: wildAnimal.y,
        workAmount,
        targetAnimalId: wildAnimalId,
    });

    game.notifications.push({ text: `Taming ${wildAnimal.type}...`, tick: game.tick, type: 'success' });
    return true;
}

export function completeTame(game, wildAnimalId) {
    const wildAnimal = game.wildlife.find(a => a.id === wildAnimalId);
    if (!wildAnimal || wildAnimal.hp <= 0) return false;

    const tamedDef = TAMED_ANIMALS[wildAnimal.type];
    let spawnX = wildAnimal.x, spawnY = wildAnimal.y;

    if (!tamedDef.guardAnimal) {
        const pen = findAnyPen(game);
        if (!pen) return false;
        spawnX = pen.x;
        spawnY = pen.y;
    }

    game.wildlife = game.wildlife.filter(a => a.id !== wildAnimalId);
    const tamed = createTamedAnimal(wildAnimal.type, spawnX, spawnY);
    game.tamedAnimals.push(tamed);
    game.notifications.push({ text: `Tamed a ${wildAnimal.type}!`, tick: game.tick, type: 'success' });
    game.eventLog.add(game, `Tamed a ${wildAnimal.type}`, 'success', { type: 'position', x: spawnX, y: spawnY });
    return true;
}

export function getTameChance(colonist, animalType) {
    const tamedDef = TAMED_ANIMALS[animalType];
    if (!tamedDef || !tamedDef.dangerousTame) return 1;
    const baseChance = tamedDef.baseTameChance || 0.4;
    const skillBonus = (colonist.skills.animals || 0) * WORK_CONFIG.tameSkillChanceBonus;
    return Math.min(1, baseChance + skillBonus);
}

export function attemptDangerousTame(game, colonist, wildAnimalId) {
    const wildAnimal = game.wildlife.find(a => a.id === wildAnimalId);
    if (!wildAnimal || wildAnimal.hp <= 0) return 'fail';

    const tamedDef = TAMED_ANIMALS[wildAnimal.type];
    const chance = getTameChance(colonist, wildAnimal.type);

    if (Math.random() < chance) {
        completeTame(game, wildAnimalId);
        return 'success';
    }

    const retDmg = tamedDef.retaliationDamage || ANIMALS[wildAnimal.type].damage;
    colonistTakeDamage(colonist, retDmg, game);
    const t = THOUGHTS.wolf_retaliated;
    addThought(colonist, t.text, t.moodEffect, t.duration, game.tick);
    game.notifications.push({ text: `Wolf attacked ${colonist.name}!`, tick: game.tick, type: 'danger' });
    game.eventLog.add(game, `Wolf retaliated against ${colonist.name} during taming`, 'danger', { type: 'colonist', id: colonist.id });
    return 'fail';
}

function updateGuardWolf(animal, def, game) {
    if (!animal.guardState) animal.guardState = 'patrolling';

    const hostiles = [
        ...game.raiders.filter(r => r.hp > 0),
        ...(game.waves && game.waves.enemies ? game.waves.enemies.filter(e => e.hp > 0) : []),
        ...game.wildlife.filter(w => w.hostile && w.hp > 0),
    ];

    if (animal.guardState === 'retreating') {
        const nearestColonist = findNearestAliveColonist(animal, game);
        if (!nearestColonist) { animal.guardState = 'patrolling'; return; }
        if (manhattanDist(animal.x, animal.y, nearestColonist.x, nearestColonist.y) <= 2) {
            animal.guardState = 'patrolling';
            return;
        }
        moveToward(animal, nearestColonist, game.map);
        return;
    }

    if (animal.hp < (def.hp || 60) * 0.2) {
        animal.guardState = 'retreating';
        animal.guardTarget = null;
        return;
    }

    let target = null;
    let minDist = def.guardRadius || 8;
    for (const h of hostiles) {
        const d = manhattanDist(animal.x, animal.y, h.x, h.y);
        if (d < minDist) { minDist = d; target = h; }
    }

    if (target) {
        animal.guardState = 'engaging';
        animal.guardTarget = { x: target.x, y: target.y };
        const dist = manhattanDist(animal.x, animal.y, target.x, target.y);
        if (dist <= 1) {
            target.hp -= (def.guardDamage || 8);
            game.combatEffects.push({ x: target.x, y: target.y, char: '!', color: '#aaaaaa', ttl: 2 });
        } else {
            moveToward(animal, target, game.map);
        }
    } else {
        animal.guardState = 'patrolling';
        animal.guardTarget = null;
        const nearestColonist = findNearestAliveColonist(animal, game);
        if (nearestColonist) {
            const dist = manhattanDist(animal.x, animal.y, nearestColonist.x, nearestColonist.y);
            if (dist > 3) {
                moveToward(animal, nearestColonist, game.map);
            } else if (Math.random() < 0.1) {
                randomMoveNear(animal, nearestColonist, game.map);
            }
        }
    }
}

function findNearestAliveColonist(animal, game) {
    let nearest = null;
    let minDist = Infinity;
    for (const c of game.colonists) {
        if (c.hp <= 0) continue;
        const d = manhattanDist(animal.x, animal.y, c.x, c.y);
        if (d < minDist) { minDist = d; nearest = c; }
    }
    return nearest;
}

function moveToward(entity, target, map) {
    const dx = Math.sign(target.x - entity.x);
    const dy = Math.sign(target.y - entity.y);
    if (Math.random() < 0.5 && dx !== 0) {
        if (isPassable(map, entity.x + dx, entity.y)) { entity.x += dx; return; }
    }
    if (dy !== 0) {
        if (isPassable(map, entity.x, entity.y + dy)) { entity.y += dy; return; }
    }
    if (dx !== 0) {
        if (isPassable(map, entity.x + dx, entity.y)) { entity.x += dx; }
    }
}

function randomMoveNear(animal, anchor, map) {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const dir = dirs[Math.floor(Math.random() * 4)];
    const nx = animal.x + dir[0];
    const ny = animal.y + dir[1];
    if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) return;
    if (manhattanDist(nx, ny, anchor.x, anchor.y) <= 4 && isPassable(map, nx, ny)) {
        animal.x = nx;
        animal.y = ny;
    }
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
