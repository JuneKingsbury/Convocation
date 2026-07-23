import { CONFIG, RAID_CONFIG, WEAPONS, BUILDINGS, COMBAT_VISUALS, PATHFINDING_CONFIG } from '../core/config.js';

const RAIDER_WEAPONS = ['wooden_club', 'etched_axe', 'runic_blade'];
import { isPassableForEnemies, isBreakableByEnemies } from '../world/map.js';
import { findPathForEnemies, manhattanDist } from '../world/pathfinding.js';
import { colonistTakeDamage } from './colonist.js';

let nextRaiderId = 1;

export class CombatSystem {
    constructor() {
        this.nextRaidTick = RAID_CONFIG.firstRaidTick;
        this.raidActive = false;
        this.raidStartTick = 0;
    }

    update(game) {
        if (CONFIG.PEACEFUL_MODE) return;

        if (this.raidActive) {
            this.updateRaid(game);
        } else if (game.tick >= this.nextRaidTick) {
            const mods = game.divinationModifiers || [];
            const raidDelay = mods.reduce((sum, m) => sum + (m.raidDelay || 0), 0);
            if (raidDelay > 0) {
                this.nextRaidTick = game.tick + raidDelay;
            } else {
                this.startRaid(game);
            }
        }
    }

    startRaid(game) {
        const wealth = game.resources.getWealth();
        const numRaiders = Math.max(RAID_CONFIG.baseRaiders,
            Math.floor(RAID_CONFIG.baseRaiders + wealth * RAID_CONFIG.wealthScaling));

        const edge = Math.floor(Math.random() * 4);
        for (let i = 0; i < numRaiders; i++) {
            const pos = getEdgePosition(edge, i);
            game.raiders.push(createRaider(pos.x, pos.y));
        }

        this.raidActive = true;
        this.raidStartTick = game.tick;
        const raidPos = { x: game.raiders[0]?.x || 0, y: game.raiders[0]?.y || 0 };
        game.notifications.push({ text: `Raid! ${numRaiders} raiders approaching!`, tick: game.tick, type: 'danger' });
        game.eventLog.add(game, `Raid! ${numRaiders} raiders attacking!`, 'danger', { type: 'position', ...raidPos });

        game.events.pendingEvent = {
            type: 'raid',
            text: `Raid! ${numRaiders} raiders are approaching from the ${['north','east','south','west'][edge]}!`,
            choices: ['Go To Raiders', 'Dismiss'],
            data: raidPos,
        };

        if (game.settings.autoPauseHostile && !game.paused) {
            game.togglePause();
        }

        this.nextRaidTick = game.tick + RAID_CONFIG.minInterval +
            Math.floor(Math.random() * (RAID_CONFIG.maxInterval - RAID_CONFIG.minInterval));
    }

    updateRaid(game) {
        const aliveRaiders = game.raiders.filter(r => r.hp > 0);
        if (aliveRaiders.length === 0) {
            this.raidActive = false;
            game.notifications.push({ text: 'Raid defeated!', tick: game.tick, type: 'success' });
            game.eventLog.add(game, 'Raid defeated!', 'success', null);
            return;
        }

        if (game.tick - this.raidStartTick > RAID_CONFIG.timeout) {
            for (const raider of aliveRaiders) {
                raider.fleeing = true;
            }
        }

        const initialCount = game.raiders.length;
        const fleeThreshold = Math.floor(initialCount * RAID_CONFIG.fleeThreshold);
        if (aliveRaiders.length <= fleeThreshold) {
            for (const raider of aliveRaiders) {
                raider.fleeing = true;
            }
        }

        for (let i = game.raiders.length - 1; i >= 0; i--) {
            const raider = game.raiders[i];
            if (raider.hp <= 0) {
                game.raiders.splice(i, 1);
                continue;
            }
            updateRaider(raider, game);
            if (raider.x < 0 || raider.x >= CONFIG.MAP_WIDTH ||
                raider.y < 0 || raider.y >= CONFIG.MAP_HEIGHT) {
                game.raiders.splice(i, 1);
            }
        }

        if (game.raiders.length === 0) {
            this.raidActive = false;
            game.notifications.push({ text: 'Raiders fled!', tick: game.tick, type: 'success' });
            game.eventLog.add(game, 'Raiders fled!', 'success', null);
        }
    }
}

function createRaider(x, y) {
    const weaponKey = RAIDER_WEAPONS[Math.floor(Math.random() * RAIDER_WEAPONS.length)];
    const weapon = WEAPONS[weaponKey];
    return {
        id: nextRaiderId++,
        x, y,
        hp: RAID_CONFIG.raiderHp,
        maxHp: RAID_CONFIG.raiderHp,
        damage: RAID_CONFIG.raiderDamage + weapon.damage,
        speed: RAID_CONFIG.raiderSpeed,
        moveCooldown: 0,
        hostile: true,
        fleeing: false,
        path: [],
        pathAge: 0,
        weapon: { name: weapon.name, damage: weapon.damage },
        char: 'R',
        color: '#ff3333',
    };
}

function updateRaider(raider, game) {
    raider.moveCooldown -= raider.speed;
    if (raider.moveCooldown > 0) return;
    raider.moveCooldown = 1;

    if (raider.fleeing) {
        moveToEdge(raider, game);
        return;
    }

    const nearest = findNearestColonist(raider, game);
    if (!nearest) {
        moveTowardCenter(raider, game);
        return;
    }

    const dist = manhattanDist(raider.x, raider.y, nearest.x, nearest.y);
    if (dist <= 1) {
        colonistTakeDamage(nearest, raider.damage, game);
        return;
    }

    // Break structure if standing next to one on our path
    if (raider.path.length > 0) {
        const next = raider.path[0];
        if (isBreakableByEnemies(game.map, next.x, next.y)) {
            attackStructure(game, next.x, next.y, raider.damage);
            return;
        }
    }

    // Repath every 15 ticks or if path is empty
    raider.pathAge++;
    if (raider.path.length === 0 || raider.pathAge > PATHFINDING_CONFIG.raiderRepathInterval) {
        raider.path = findPathForEnemies(game.map, raider.x, raider.y, nearest.x, nearest.y) || [];
        raider.pathAge = 0;
    }

    if (raider.path.length > 0) {
        const next = raider.path[0];
        if (isPassableForEnemies(game.map, next.x, next.y)) {
            raider.x = next.x;
            raider.y = next.y;
            raider.path.shift();
        } else if (isBreakableByEnemies(game.map, next.x, next.y)) {
            // Will break next tick
        } else {
            raider.path = [];
        }
    }
}

function findNearestColonist(raider, game) {
    if (game.spatial) {
        return game.spatial.colonists.findNearest(raider.x, raider.y, PATHFINDING_CONFIG.raiderSearchRadius, null);
    }
    let nearest = null;
    let minDist = Infinity;
    for (const c of game.colonists) {
        if (c.hp <= 0) continue;
        const dist = manhattanDist(raider.x, raider.y, c.x, c.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = c;
        }
    }
    return nearest;
}

function moveTowardCenter(raider, game) {
    const cx = Math.floor(CONFIG.MAP_WIDTH / 2);
    const cy = Math.floor(CONFIG.MAP_HEIGHT / 2);
    const dx = Math.sign(cx - raider.x);
    const dy = Math.sign(cy - raider.y);
    if (dx !== 0 && isPassableForEnemies(game.map, raider.x + dx, raider.y)) {
        raider.x += dx;
    } else if (dy !== 0 && isPassableForEnemies(game.map, raider.x, raider.y + dy)) {
        raider.y += dy;
    } else if (dy !== 0 && isPassableForEnemies(game.map, raider.x + dx, raider.y + dy)) {
        raider.x += dx;
        raider.y += dy;
    }
}

function moveToEdge(raider, game) {
    const edges = [
        { x: 0, y: raider.y },
        { x: CONFIG.MAP_WIDTH - 1, y: raider.y },
        { x: raider.x, y: 0 },
        { x: raider.x, y: CONFIG.MAP_HEIGHT - 1 },
    ];
    edges.sort((a, b) =>
        manhattanDist(raider.x, raider.y, a.x, a.y) -
        manhattanDist(raider.x, raider.y, b.x, b.y)
    );
    const target = edges[0];
    const dx = Math.sign(target.x - raider.x);
    const dy = Math.sign(target.y - raider.y);
    if (dx !== 0 && isPassableForEnemies(game.map, raider.x + dx, raider.y)) {
        raider.x += dx;
    } else if (dy !== 0 && isPassableForEnemies(game.map, raider.x, raider.y + dy)) {
        raider.y += dy;
    }
}

function attackStructure(game, x, y, damage) {
    const tile = game.map[y][x];
    if (!tile.structure) return;

    if (tile.structureHp === undefined) {
        tile.structureHp = BUILDINGS[tile.structure]?.hp || 50;
    }

    tile.structureHp -= damage;
    if (game.combatEffects) game.combatEffects.push({ x, y, char: COMBAT_VISUALS.hitChar, color: COMBAT_VISUALS.structureDamageColor, ttl: COMBAT_VISUALS.hitTtl });

    if (tile.structureHp <= 0) {
        const oldStructure = tile.structure;
        tile.structure = null;
        tile.structureHp = undefined;
        tile.passable = true;
        if (game.mapIndex) game.mapIndex.removeStructure(x, y, oldStructure);
        game.roomsDirty = true;
    }
}

function getEdgePosition(side, offset) {
    const spread = offset * 2;
    switch (side) {
        case 0: return { x: Math.floor(CONFIG.MAP_WIDTH / 2) + spread, y: 0 };
        case 1: return { x: CONFIG.MAP_WIDTH - 1, y: Math.floor(CONFIG.MAP_HEIGHT / 2) + spread };
        case 2: return { x: Math.floor(CONFIG.MAP_WIDTH / 2) + spread, y: CONFIG.MAP_HEIGHT - 1 };
        case 3: return { x: 0, y: Math.floor(CONFIG.MAP_HEIGHT / 2) + spread };
    }
}

export function raiderTakeDamage(raider, damage) {
    raider.hp -= damage;
}
