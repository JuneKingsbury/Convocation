import { CONFIG, COLONIST_NAMES, TRAITS, NEED_DECAY, MOOD_THRESHOLDS, MOOD_SPEED_MULT, WEAPONS, ARMORS, BUILDINGS } from './config.js';
import { findPath, findPathAdjacent, manhattanDist } from './pathfinding.js';
import { isPassable, getMoveCost, IMPASSABLE_STRUCTURES } from './map.js';
import { FOODSTUFFS } from './resources.js';
import { completeTame } from './taming.js';

let nextColonistId = 1;

export function syncColonistIdCounter(colonists) {
    const maxId = colonists.reduce((max, c) => Math.max(max, c.id || 0), 0);
    if (maxId >= nextColonistId) nextColonistId = maxId + 1;
}

export function createColonist(x, y, skillBias, existingNames = []) {
    const id = nextColonistId++;
    const usedNames = new Set(existingNames);
    let name = COLONIST_NAMES[(id - 1) % COLONIST_NAMES.length];
    if (usedNames.has(name)) {
        name = COLONIST_NAMES.find(n => !usedNames.has(n)) || `Colonist ${id}`;
    }
    const traitKeys = Object.keys(TRAITS);
    const numTraits = 1 + Math.floor(Math.random() * 2);
    const traits = [];
    const usedIndices = new Set();
    for (let i = 0; i < numTraits; i++) {
        let idx;
        do { idx = Math.floor(Math.random() * traitKeys.length); } while (usedIndices.has(idx));
        usedIndices.add(idx);
        traits.push(traitKeys[idx]);
    }

    const skills = {
        building: 2 + Math.floor(Math.random() * 4),
        farming: 2 + Math.floor(Math.random() * 4),
        crafting: 2 + Math.floor(Math.random() * 4),
        cooking: 2 + Math.floor(Math.random() * 4),
        animals: 1 + Math.floor(Math.random() * 4),
    };
    if (skillBias && skills[skillBias] !== undefined) {
        skills[skillBias] = Math.min(10, skills[skillBias] + 3);
    }

    return {
        id, name, x, y, skills, traits,
        priorities: { building: 3, farming: 3, crafting: 3, cooking: 3, animals: 3, hauling: 4 },
        needs: { hunger: 80 + Math.random() * 20, rest: 80 + Math.random() * 20 },
        mood: 60,
        thoughts: [],
        hp: 100, maxHp: 100,
        state: 'idle',
        currentTaskId: null,
        path: [],
        workProgress: 0,
        assignedBed: null,
        weapon: null,
        drafted: false,
        draftTarget: null,
        stateTimer: 0,
        wanderCooldown: 0,
        moveCooldown: 0,
    };
}

export function updateColonist(colonist, game) {
    updateNeeds(colonist, game);
    updateThoughts(colonist, game);
    colonist.mood = computeMood(colonist);

    if (colonist.hp <= 0) return;

    if (!CONFIG.PEACEFUL_MODE && colonist.traits.includes('pyromaniac') && Math.random() < TRAITS.pyromaniac.fireChance) {
        const tile = game.map[colonist.y][colonist.x];
        if (!tile.onFire && tile.terrain !== 'water' && tile.terrain !== 'rock') {
            tile.onFire = true;
            tile.fireTimer = 0;
        }
    }

    switch (colonist.state) {
        case 'idle': updateIdle(colonist, game); break;
        case 'moving': updateMoving(colonist, game); break;
        case 'working': updateWorking(colonist, game); break;
        case 'eating': updateEating(colonist, game); break;
        case 'sleeping': updateSleeping(colonist, game); break;
        case 'fighting': updateFighting(colonist, game); break;
        case 'fleeing': updateFleeing(colonist, game); break;
        case 'drafted': updateDrafted(colonist, game); break;
        case 'wandering': updateWandering(colonist, game); break;
    }
}

function updateNeeds(colonist, game) {
    let hungerMult = 1;
    if (colonist.traits.includes('iron_stomach')) hungerMult = TRAITS.iron_stomach.hungerDecayMult;
    colonist.needs.hunger = Math.max(0, colonist.needs.hunger - NEED_DECAY.hunger * hungerMult);
    colonist.needs.rest = Math.max(0, colonist.needs.rest - NEED_DECAY.rest);

    if (game.weather.season === 'winter' && !isIndoors(colonist, game.map)) {
        const warmed = game.power.isTileWarmed(game, colonist.x, colonist.y);
        if (!warmed) {
            addThought(colonist, 'Freezing outside', -8, 50, game.tick);
        }
    }
}

function updateThoughts(colonist, game) {
    colonist.thoughts = colonist.thoughts.filter(t => {
        if (t.duration === -1) return true;
        return game.tick - t.tickAdded < t.duration;
    });

    if (colonist.traits.includes('socialite')) {
        const nearOthers = game.colonists.some(c => c.id !== colonist.id && c.hp > 0 &&
            manhattanDist(colonist.x, colonist.y, c.x, c.y) <= 3);
        if (nearOthers) {
            addThought(colonist, 'Enjoying company', TRAITS.socialite.nearOthersMoodBonus, 20, game.tick);
        } else {
            addThought(colonist, 'Feeling lonely', TRAITS.socialite.aloneMoodPenalty, 20, game.tick);
        }
    }
    if (colonist.traits.includes('loner')) {
        const nearOthers = game.colonists.some(c => c.id !== colonist.id && c.hp > 0 &&
            manhattanDist(colonist.x, colonist.y, c.x, c.y) <= 3);
        if (!nearOthers) {
            addThought(colonist, 'Peaceful solitude', TRAITS.loner.aloneMoodBonus, 20, game.tick);
        } else {
            addThought(colonist, 'Too crowded', TRAITS.loner.nearOthersMoodPenalty, 20, game.tick);
        }
    }
    if (colonist.traits.includes('lazy') && colonist.state === 'idle') {
        addThought(colonist, 'Relaxing', TRAITS.lazy.idleMoodBonus, 30, game.tick);
    }
}

export function addThought(colonist, text, moodEffect, duration, tick) {
    const existing = colonist.thoughts.find(t => t.text === text);
    if (existing) {
        existing.tickAdded = tick;
        return;
    }

    let effect = moodEffect;
    if (effect > 0 && colonist.traits.includes('optimist')) effect *= TRAITS.optimist.positiveThoughtMult;
    if (effect < 0 && colonist.traits.includes('pessimist')) effect *= TRAITS.pessimist.negativeThoughtMult;

    colonist.thoughts.push({ text, moodEffect: effect, duration, tickAdded: tick });
}

function computeMood(colonist) {
    let mood = 50;
    for (const thought of colonist.thoughts) {
        mood += thought.moodEffect;
    }
    if (colonist.needs.hunger < 20) mood -= 15;
    if (colonist.needs.rest < 20) mood -= 10;
    if (colonist.assignedBed) mood += 5;
    return Math.max(0, Math.min(100, mood));
}

function getMoodLevel(mood) {
    if (mood >= MOOD_THRESHOLDS.inspired) return 'inspired';
    if (mood >= MOOD_THRESHOLDS.content) return 'content';
    if (mood >= MOOD_THRESHOLDS.stressed) return 'stressed';
    return 'breaking';
}

function getWorkSpeed(colonist, game) {
    let speed = 1.0;
    const moodLevel = getMoodLevel(colonist.mood);
    speed *= MOOD_SPEED_MULT[moodLevel];

    if (colonist.traits.includes('hard_worker')) speed *= TRAITS.hard_worker.workSpeedMult;
    if (colonist.traits.includes('lazy')) speed *= TRAITS.lazy.workSpeedMult;

    const isNight = game.timeOfDay > 70 || game.timeOfDay < 20;
    if (colonist.traits.includes('night_owl')) {
        speed *= isNight ? TRAITS.night_owl.nightSpeedMult : TRAITS.night_owl.daySpeedMult;
    }
    if (colonist.traits.includes('early_bird')) {
        speed *= isNight ? TRAITS.early_bird.nightSpeedMult : TRAITS.early_bird.daySpeedMult;
    }

    return speed;
}

function updateIdle(colonist, game) {
    if (colonist.drafted) {
        colonist.state = 'drafted';
        return;
    }

    if (getMoodLevel(colonist.mood) === 'breaking') {
        colonist.state = 'wandering';
        colonist.stateTimer = 30 + Math.floor(Math.random() * 20);
        return;
    }

    const waveActive = game.waves && game.waves.active && game.waves.enemies.length > 0;
    const threat = findNearestHostile(colonist, game);
    if (threat) {
        const dist = manhattanDist(colonist.x, colonist.y, threat.x, threat.y);
        if (waveActive || dist <= 8) {
            colonist.state = 'fighting';
            return;
        }
    }

    if (colonist.needs.hunger < 20 &&
        (game.resources.stockpile.food > 0 || game.resources.getFoodstuffTotal() > 0)) {
        colonist.state = 'eating';
        return;
    }
    if (colonist.needs.rest < 20) {
        startSleeping(colonist, game);
        return;
    }

    const task = game.taskQueue.findBestTask(colonist, game.tick);
    if (task) {
        game.taskQueue.claim(task.id, colonist.id);
        colonist.currentTaskId = task.id;
        const path = findPathAdjacent(game.map, colonist.x, colonist.y, task.x, task.y);
        if (path && path.length > 0) {
            colonist.path = path;
            colonist.state = 'moving';
        } else if (manhattanDist(colonist.x, colonist.y, task.x, task.y) <= 1) {
            colonist.state = 'working';
            colonist.workProgress = 0;
        } else {
            game.taskQueue.release(task.id);
            colonist.currentTaskId = null;
            if (!colonist._failedTasks) colonist._failedTasks = {};
            colonist._failedTasks[task.id] = game.tick;
            if (!colonist._lastPathFailNotify || game.tick - colonist._lastPathFailNotify > 100) {
                colonist._lastPathFailNotify = game.tick;
                game.notifications.push({ text: `${colonist.name} can't reach ${task.type} task`, tick: game.tick, type: 'danger' });
            }
        }
        return;
    }

    colonist.wanderCooldown--;
    if (colonist.wanderCooldown <= 0) {
        wander(colonist, game);
        colonist.wanderCooldown = 5 + Math.floor(Math.random() * 10);
    }
}

function wander(colonist, game) {
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const dir = dirs[Math.floor(Math.random() * 4)];
    const nx = colonist.x + dir[0];
    const ny = colonist.y + dir[1];
    if (isPassable(game.map, nx, ny)) {
        colonist.x = nx;
        colonist.y = ny;
    }
}

function updateMoving(colonist, game) {
    if (game.waves && game.waves.active && game.waves.enemies.length > 0) {
        const threat = findNearestHostile(colonist, game);
        if (threat && colonist.currentTaskId) {
            game.taskQueue.release(colonist.currentTaskId);
            colonist.currentTaskId = null;
            colonist.path = [];
            colonist.state = 'fighting';
            return;
        }
    }

    if (colonist.moveCooldown > 0) {
        colonist.moveCooldown--;
        return;
    }
    if (colonist.path.length === 0) {
        if (colonist._sleepAfterMove) {
            delete colonist._sleepAfterMove;
            colonist.state = 'sleeping';
            colonist.stateTimer = 25;
            return;
        }
        colonist.state = 'working';
        colonist.workProgress = 0;
        return;
    }
    const next = colonist.path[0];
    if (isPassable(game.map, next.x, next.y)) {
        colonist.x = next.x;
        colonist.y = next.y;
        colonist.path.shift();
        const cost = getMoveCost(game.map, next.x, next.y);
        if (cost > 1) {
            colonist.moveCooldown = cost - 1;
        }
    } else {
        const task = game.taskQueue.getAll().find(t => t.id === colonist.currentTaskId);
        if (task) {
            const newPath = findPathAdjacent(game.map, colonist.x, colonist.y, task.x, task.y);
            if (newPath) {
                colonist.path = newPath;
            } else {
                game.taskQueue.release(colonist.currentTaskId);
                colonist.currentTaskId = null;
                colonist.state = 'idle';
            }
        } else {
            colonist.state = 'idle';
            colonist.path = [];
        }
    }
}

function updateWorking(colonist, game) {
    if (game.waves && game.waves.active && game.waves.enemies.length > 0) {
        const threat = findNearestHostile(colonist, game);
        if (threat && colonist.currentTaskId) {
            game.taskQueue.release(colonist.currentTaskId);
            colonist.currentTaskId = null;
            colonist.state = 'fighting';
            return;
        }
    }

    const task = game.taskQueue.getAll().find(t => t.id === colonist.currentTaskId);
    if (!task) {
        colonist.state = 'idle';
        colonist.currentTaskId = null;
        return;
    }

    if (getMoodLevel(colonist.mood) === 'breaking') {
        game.taskQueue.release(colonist.currentTaskId);
        colonist.currentTaskId = null;
        colonist.state = 'idle';
        return;
    }

    let speed = getWorkSpeed(colonist, game);
    const skill = colonist.skills[task.skillRequired] || 1;
    speed *= (1 + skill * 0.15);

    if (task.skillRequired === 'farming' && colonist.traits.includes('green_thumb')) {
        speed *= TRAITS.green_thumb.farmingSpeedMult;
    }

    task.workDone += speed;
    colonist.workProgress = task.workDone / task.workAmount;

    if (task.workDone >= task.workAmount) {
        completeTask(colonist, task, game);
    }
}

function completeTask(colonist, task, game) {
    switch (task.type) {
        case 'build': {
            const tile = game.map[task.y][task.x];
            tile.structure = task.buildType;
            tile.designation = null;
            tile.passable = !IMPASSABLE_STRUCTURES.has(task.buildType);
            game.roomsDirty = true;
            if (game.waves && game.waves.active) game.waves.invalidatePathPreview();
            addThought(colonist, 'Built something', 3, 100, game.tick);
            break;
        }
        case 'chop': {
            const tile = game.map[task.y][task.x];
            if (tile.resource && tile.resource.type === 'tree') {
                game.resources.add({ wood: tile.resource.amount });
                tile.resource = null;
            }
            tile.designation = null;
            addThought(colonist, 'Good honest work', 2, 80, game.tick);
            break;
        }
        case 'mine': {
            const tile = game.map[task.y][task.x];
            if (tile.resource) {
                if (tile.resource.type === 'stone') {
                    game.resources.add({ stone: tile.resource.amount });
                } else if (tile.resource.type === 'runite_ore') {
                    game.resources.add({ runite: tile.resource.amount });
                }
                tile.resource = null;
                tile.terrain = 'dirt';
                tile.passable = true;
            }
            tile.designation = null;
            break;
        }
        case 'plant': {
            const tile = game.map[task.y][task.x];
            if (tile.zone) {
                tile.zone.state = 'growing';
                tile.zone.growth = 0;
            }
            break;
        }
        case 'harvest': {
            const tile = game.map[task.y][task.x];
            if (tile.zone) {
                const crop = tile.zone.crop;
                const yields = {};
                yields[crop] = tile.zone.harvestYield || 2;
                game.resources.add(yields);
                tile.zone.state = 'empty';
                tile.zone.growth = 0;
                addThought(colonist, 'Harvested crops', 3, 100, game.tick);
            }
            break;
        }
        case 'craft': {
            if (task.recipe) {
                const output = task.recipe.output;
                let handled = false;
                for (const key of Object.keys(output)) {
                    if (WEAPONS[key]) {
                        game.resources.addWeapon({ ...WEAPONS[key] });
                        handled = true;
                    } else if (ARMORS[key]) {
                        game.resources.addArmor({ ...ARMORS[key] });
                        handled = true;
                    }
                }
                if (!handled) {
                    game.resources.add(output);
                }
                addThought(colonist, 'Crafted something', 4, 120, game.tick);
            }
            break;
        }
        case 'cook': {
            if (task.recipe) {
                const output = { ...task.recipe.output };
                if (output.food && game.research.isResearched('alchemy')) {
                    output.food += 2;
                }
                game.resources.add(output);
                addThought(colonist, 'Cooked a meal', 3, 100, game.tick);
            }
            break;
        }
        case 'hunt': {
            if (task.targetAnimalId) {
                const animal = game.wildlife.find(a => a.id === task.targetAnimalId);
                if (animal && animal.hp > 0) {
                    const weaponDmg = colonist.weapon ? colonist.weapon.damage : 5;
                    animal.hp -= weaponDmg + (colonist.skills.animals || 1) * 2;
                }
            }
            break;
        }
        case 'extinguish': {
            const tile = game.map[task.y][task.x];
            tile.onFire = false;
            tile.fireTimer = 0;
            addThought(colonist, 'Put out a fire', 5, 150, game.tick);
            break;
        }
        case 'research': {
            game.research.addProgress(colonist.skills.crafting + 2);
            break;
        }
        case 'tame': {
            if (task.targetAnimalId) {
                if (completeTame(game, task.targetAnimalId)) {
                    addThought(colonist, 'Tamed an animal', 6, 150, game.tick);
                }
            }
            break;
        }
        case 'repair': {
            const tile = game.map[task.y][task.x];
            if (tile.structure && tile.structureHp !== undefined) {
                tile.structureHp = undefined;
                addThought(colonist, 'Repaired a structure', 3, 100, game.tick);
            }
            break;
        }
        case 'deconstruct': {
            const tile = game.map[task.y][task.x];
            if (tile.structure) {
                const def = BUILDINGS[tile.structure];
                if (def) {
                    const partial = {};
                    for (const [res, amt] of Object.entries(def.cost)) {
                        partial[res] = Math.ceil(amt * 0.5);
                    }
                    game.resources.add(partial);
                }
                tile.structure = null;
                tile.passable = true;
                tile.designation = null;
                game.roomsDirty = true;
                addThought(colonist, 'Tore something down', 2, 80, game.tick);
            }
            break;
        }
    }

    game.taskQueue.complete(task.id);
    colonist.currentTaskId = null;
    colonist.state = 'idle';
    colonist.workProgress = 0;
}

function updateEating(colonist, game) {
    if (game.resources.stockpile.food > 0) {
        game.resources.stockpile.food--;
        colonist.needs.hunger = 100;
        colonist.state = 'idle';
        if (colonist.traits.includes('gourmand')) {
            addThought(colonist, 'Delicious meal', TRAITS.gourmand.cookedFoodMoodBonus, 200, game.tick);
        } else {
            addThought(colonist, 'Ate a meal', 5, 150, game.tick);
        }
    } else {
        const eaten = eatRawFoodstuff(game);
        if (eaten) {
            colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 35);
            colonist.state = 'idle';
            if (colonist.traits.includes('gourmand')) {
                addThought(colonist, 'Ate raw food', TRAITS.gourmand.rawFoodMoodPenalty, 200, game.tick);
            } else {
                addThought(colonist, 'Ate raw food', -4, 100, game.tick);
            }
        } else {
            colonist.state = 'idle';
            addThought(colonist, 'Starving', -20, 100, game.tick);
        }
    }
}

function eatRawFoodstuff(game) {
    for (const item of FOODSTUFFS) {
        if ((game.resources.stockpile[item] || 0) > 0) {
            game.resources.stockpile[item]--;
            return true;
        }
    }
    return false;
}

function startSleeping(colonist, game) {
    if (colonist.assignedBed) {
        const path = findPath(game.map, colonist.x, colonist.y, colonist.assignedBed.x, colonist.assignedBed.y);
        if (path && path.length > 0) {
            colonist.path = path;
            colonist.state = 'moving';
            colonist.currentTaskId = null;
            colonist._sleepAfterMove = true;
            return;
        }
    }
    colonist.state = 'sleeping';
    colonist.stateTimer = 30;
}

function updateSleeping(colonist, game) {
    colonist.stateTimer--;
    colonist.needs.rest = Math.min(100, colonist.needs.rest + 3);
    if (colonist.stateTimer <= 0 || colonist.needs.rest >= 100) {
        colonist.state = 'idle';
        const inBed = colonist.assignedBed &&
            colonist.x === colonist.assignedBed.x && colonist.y === colonist.assignedBed.y;
        if (inBed) {
            const roomId = game.map[colonist.y][colonist.x].roomId;
            if (roomId !== null) {
                addThought(colonist, 'Slept in nice room', 10, 300, game.tick);
            } else {
                addThought(colonist, 'Slept in bed', 5, 200, game.tick);
            }
        } else {
            addThought(colonist, 'Slept on the ground', -15, 400, game.tick);
        }
    }
}

function updateFighting(colonist, game) {
    const target = findNearestHostile(colonist, game);
    if (!target) {
        colonist.state = 'idle';
        return;
    }

    const dist = manhattanDist(colonist.x, colonist.y, target.x, target.y);
    const waveActive = game.waves && game.waves.active && game.waves.enemies.length > 0;
    if (dist > 8 && !waveActive) {
        colonist.state = 'idle';
        return;
    }

    if (colonist.hp < 20) {
        colonist.state = 'fleeing';
        return;
    }

    if (dist > 1) {
        const dx = Math.sign(target.x - colonist.x);
        const dy = Math.sign(target.y - colonist.y);
        if (dx !== 0 && isPassable(game.map, colonist.x + dx, colonist.y)) {
            colonist.x += dx;
        } else if (dy !== 0 && isPassable(game.map, colonist.x, colonist.y + dy)) {
            colonist.y += dy;
        }
        return;
    }

    const weaponDmg = colonist.weapon ? colonist.weapon.damage : WEAPONS.fists.damage;
    const dmg = weaponDmg + Math.floor(Math.random() * 3);
    target.hp -= dmg;
    game.combatEffects.push({ x: target.x, y: target.y, char: '!', color: '#ffff00', ttl: 2 });

    if (target.hp <= 0) {
        addThought(colonist, 'Won a fight', 5, 200, game.tick);
        colonist.state = 'idle';
    }
}

function updateFleeing(colonist, game) {
    const threat = findNearestHostile(colonist, game);
    if (!threat || manhattanDist(colonist.x, colonist.y, threat.x, threat.y) > 8) {
        colonist.state = 'idle';
        return;
    }

    const dx = Math.sign(colonist.x - threat.x);
    const dy = Math.sign(colonist.y - threat.y);
    const nx = colonist.x + dx;
    const ny = colonist.y + dy;
    if (isPassable(game.map, nx, ny)) {
        colonist.x = nx;
        colonist.y = ny;
    }
}

function updateDrafted(colonist, game) {
    if (!colonist.drafted) {
        colonist.state = 'idle';
        return;
    }
    if (colonist.moveCooldown > 0) {
        colonist.moveCooldown--;
        return;
    }
    if (colonist.draftTarget) {
        if (colonist.path.length === 0) {
            const path = findPath(game.map, colonist.x, colonist.y, colonist.draftTarget.x, colonist.draftTarget.y);
            if (path) colonist.path = path;
        }
        if (colonist.path.length > 0) {
            const next = colonist.path.shift();
            if (isPassable(game.map, next.x, next.y)) {
                colonist.x = next.x;
                colonist.y = next.y;
                const cost = getMoveCost(game.map, next.x, next.y);
                if (cost > 1) {
                    colonist.moveCooldown = cost - 1;
                }
            }
        }
        if (colonist.x === colonist.draftTarget.x && colonist.y === colonist.draftTarget.y) {
            colonist.draftTarget = null;
        }
    }
}

function updateWandering(colonist, game) {
    colonist.stateTimer--;
    if (colonist.stateTimer <= 0) {
        colonist.state = 'idle';
        return;
    }
    if (Math.random() < 0.3) wander(colonist, game);
}

function findNearestHostile(colonist, game) {
    let nearest = null;
    let minDist = Infinity;
    const waveEnemies = game.waves ? game.waves.enemies : [];
    for (const entity of [...game.wildlife, ...game.raiders, ...waveEnemies]) {
        if (entity.hp <= 0) continue;
        if (!entity.hostile && !waveEnemies.includes(entity)) continue;
        const dist = manhattanDist(colonist.x, colonist.y, entity.x, entity.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = entity;
        }
    }
    return nearest;
}

function isIndoors(colonist, map) {
    const tile = map[colonist.y]?.[colonist.x];
    return tile && tile.roomId !== null;
}

export function colonistTakeDamage(colonist, damage, game) {
    let mult = 1;
    if (colonist.traits.includes('tough')) mult = TRAITS.tough.damageTakenMult;
    if (colonist.armor) mult *= (1 - colonist.armor.damageReduction);
    const actualDmg = Math.floor(damage * mult);
    colonist.hp -= actualDmg;
    game.combatEffects.push({ x: colonist.x, y: colonist.y, char: '!', color: '#ff3333', ttl: 2 });

    if (colonist.state !== 'fighting' && colonist.state !== 'fleeing' && colonist.hp > 0) {
        game.eventLog.add(game, `${colonist.name} is under attack!`, 'danger', { type: 'colonist', id: colonist.id });
    }

    if (colonist.hp <= 0) {
        colonist.hp = 0;
        colonist.state = 'dead';
        game.eventLog.add(game, `${colonist.name} has died!`, 'danger', { type: 'colonist', id: colonist.id });
        for (const other of game.colonists) {
            if (other.id !== colonist.id && other.hp > 0) {
                addThought(other, `${colonist.name} died`, -40, 2000, game.tick);
            }
        }
    } else if (colonist.state !== 'fighting' && colonist.state !== 'fleeing') {
        colonist.state = 'fighting';
    }
}
