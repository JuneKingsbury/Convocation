import { CONFIG, RAID_CONFIG, WEAPONS } from './config.js';

const RAIDER_WEAPONS = ['wooden_club', 'etched_axe', 'runic_blade'];
import { isPassable } from './map.js';
import { manhattanDist } from './pathfinding.js';
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

        if (!this.raidActive && game.tick >= this.nextRaidTick) {
            this.startRaid(game);
        }

        if (this.raidActive) {
            this.updateRaid(game);
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
        moveToEdge(raider, game.map);
        return;
    }

    const nearest = findNearestColonist(raider, game);
    if (!nearest) {
        moveToEdge(raider, game.map);
        return;
    }

    const dist = manhattanDist(raider.x, raider.y, nearest.x, nearest.y);
    if (dist <= 1) {
        colonistTakeDamage(nearest, raider.damage, game);
    } else {
        moveToward(raider, nearest, game.map);
    }
}

function findNearestColonist(raider, game) {
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

function moveToward(entity, target, map) {
    const dx = Math.sign(target.x - entity.x);
    const dy = Math.sign(target.y - entity.y);
    if (Math.random() < 0.5 && dx !== 0) {
        const nx = entity.x + dx;
        if (isPassable(map, nx, entity.y)) { entity.x = nx; return; }
    }
    if (dy !== 0) {
        const ny = entity.y + dy;
        if (isPassable(map, entity.x, ny)) { entity.y = ny; return; }
    }
    if (dx !== 0) {
        const nx = entity.x + dx;
        if (isPassable(map, nx, entity.y)) { entity.x = nx; }
    }
}

function moveToEdge(entity, map) {
    const edges = [
        { x: 0, y: entity.y },
        { x: CONFIG.MAP_WIDTH - 1, y: entity.y },
        { x: entity.x, y: 0 },
        { x: entity.x, y: CONFIG.MAP_HEIGHT - 1 },
    ];
    edges.sort((a, b) =>
        manhattanDist(entity.x, entity.y, a.x, a.y) -
        manhattanDist(entity.x, entity.y, b.x, b.y)
    );
    moveToward(entity, edges[0], map);
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
