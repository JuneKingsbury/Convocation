import { DIMENSIONS, EXPLORATION_CONFIG } from '../core/config.js';
import { findPathAdjacent, manhattanDist } from '../world/pathfinding.js';

let nextExpeditionId = 1;

export class ExplorationSystem {
    constructor() {
        this.expeditions = [];
        this.completedExpeditions = [];
    }

    canSend(game, dimensionKey) {
        const dim = DIMENSIONS[dimensionKey];
        if (!dim) return false;
        if (dim.research && !game.research.isResearched(dim.research)) return false;
        if (!game.power || !game.power.powered) return false;
        if (!game.mapIndex || game.mapIndex.getStructurePositions('rift_gate').size === 0) return false;
        return true;
    }

    getAvailableDimensions(game) {
        const results = [];
        for (const [key, dim] of Object.entries(DIMENSIONS)) {
            if (dim.research && !game.research.isResearched(dim.research)) continue;
            results.push({ key, ...dim });
        }
        return results;
    }

    sendExpedition(game, dimensionKey, colonistIds) {
        if (!this.canSend(game, dimensionKey)) return null;
        if (colonistIds.length === 0) return null;

        const dim = DIMENSIONS[dimensionKey];
        const party = [];

        for (const id of colonistIds) {
            const c = game.colonists.find(col => col.id === id);
            if (!c || c.hp <= 0 || c.onExpedition || c.drafted) continue;
            party.push(c);
        }

        if (party.length === 0) return null;

        const gatePos = this._findRiftGatePosition(game);
        if (!gatePos) return null;

        for (const c of party) {
            c.expeditionPending = true;
            if (c.currentTaskId) {
                game.taskQueue.release(c.currentTaskId);
                c.currentTaskId = null;
            }
            const path = findPathAdjacent(game.map, c.x, c.y, gatePos.x, gatePos.y);
            if (path && path.length > 0) {
                c.path = path;
                c.state = 'moving';
                c._expeditionMove = true;
            }
        }

        const duration = randInt(dim.duration[0], dim.duration[1]);
        const encounters = this._generateEncounters(dim);

        const expedition = {
            id: nextExpeditionId++,
            dimension: dimensionKey,
            dimensionName: dim.name,
            partyIds: party.map(c => c.id),
            partySnapshot: [],
            gatePos,
            startTick: null,
            duration,
            encounters,
            currentEncounter: 0,
            nextEncounterTick: null,
            status: 'gathering',
            loot: {},
            defeated: [],
            log: [`Party heading to Rift Gate`],
        };

        this.expeditions.push(expedition);
        game.eventLog.add(game, `Expedition assembling for ${dim.name}`, 'event', null);
        return expedition;
    }

    _findRiftGatePosition(game) {
        const positions = game.mapIndex.getStructurePositions('rift_gate');
        if (positions.size === 0) return null;
        const key = positions.values().next().value;
        return { x: key & 0xFFFF, y: key >> 16 };
    }

    update(game) {
        for (const exp of this.expeditions) {
            if (exp.status === 'complete') continue;

            if (exp.status === 'gathering') {
                this._updateGathering(exp, game);
                continue;
            }

            const elapsed = game.tick - exp.startTick;

            if (exp.status === 'exploring') {
                if (game.tick >= exp.nextEncounterTick && exp.currentEncounter < exp.encounters.length) {
                    this._resolveEncounter(exp, game);
                    exp.currentEncounter++;
                    exp.nextEncounterTick = game.tick + Math.floor(exp.duration * EXPLORATION_CONFIG.encounterSpacing);
                }

                const allDefeated = exp.partySnapshot.every(p => p.hp <= 0);
                if (allDefeated) {
                    exp.status = 'returning';
                    exp.log.push('All explorers defeated — retreating empty-handed');
                    exp.loot = {};
                }

                if (elapsed >= exp.duration && exp.status === 'exploring') {
                    exp.status = 'returning';
                    exp.log.push('Expedition complete — returning home');
                }
            }

            if (exp.status === 'returning') {
                const returnTick = exp.startTick + Math.floor(exp.duration * EXPLORATION_CONFIG.returnTimeMult);
                if (game.tick >= returnTick) {
                    this._completeExpedition(exp, game);
                }
            }
        }

        this.expeditions = this.expeditions.filter(e => e.status !== 'complete');
    }

    _updateGathering(exp, game) {
        const gx = exp.gatePos.x;
        const gy = exp.gatePos.y;
        let allArrived = true;

        for (const id of exp.partyIds) {
            const c = game.colonists.find(col => col.id === id);
            if (!c || c.onExpedition) continue;

            const dist = manhattanDist(c.x, c.y, gx, gy);
            if (dist <= 1) {
                if (!c.onExpedition) {
                    c.onExpedition = true;
                    c.state = 'idle';
                    c.path = [];
                    delete c._expeditionMove;
                    delete c.expeditionPending;
                }
            } else {
                allArrived = false;
                if (c.state === 'idle' || (c.state === 'moving' && (!c.path || c.path.length === 0))) {
                    const path = findPathAdjacent(game.map, c.x, c.y, gx, gy);
                    if (path && path.length > 0) {
                        c.path = path;
                        c.state = 'moving';
                        c._expeditionMove = true;
                    }
                }
            }
        }

        if (allArrived) {
            exp.status = 'exploring';
            exp.startTick = game.tick;
            exp.nextEncounterTick = game.tick + Math.floor(exp.duration * EXPLORATION_CONFIG.encounterSpacing);
            exp.partySnapshot = exp.partyIds.map(id => {
                const c = game.colonists.find(col => col.id === id);
                return { id: c.id, name: c.name, hp: c.hp, maxHp: c.maxHp, weapon: c.weapon, armor: c.armor };
            });
            exp.log.push(`Party entered ${DIMENSIONS[exp.dimension].name}`);
            game.eventLog.add(game, `Expedition entered ${exp.dimensionName}`, 'event', null);
        }
    }

    _generateEncounters(dim) {
        const encounters = [];
        for (let i = 0; i < dim.encounters; i++) {
            const isCombat = Math.random() < 0.6;
            if (isCombat) {
                const count = randInt(dim.enemies.count[0], dim.enemies.count[1]);
                const enemies = [];
                for (let j = 0; j < count; j++) {
                    enemies.push({
                        hp: randInt(dim.enemies.hp[0], dim.enemies.hp[1]),
                        damage: randInt(dim.enemies.damage[0], dim.enemies.damage[1]),
                    });
                }
                encounters.push({ type: 'combat', enemies });
            } else {
                const lootEntry = this._rollLoot(dim);
                encounters.push({ type: 'loot', ...lootEntry });
            }
        }
        return encounters;
    }

    _rollLoot(dim) {
        const totalWeight = dim.loot.reduce((s, l) => s + l.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const entry of dim.loot) {
            roll -= entry.weight;
            if (roll <= 0) {
                return { resource: entry.resource, amount: randInt(entry.amount[0], entry.amount[1]) };
            }
        }
        const fallback = dim.loot[0];
        return { resource: fallback.resource, amount: randInt(fallback.amount[0], fallback.amount[1]) };
    }

    _resolveEncounter(exp, game) {
        const encounter = exp.encounters[exp.currentEncounter];
        if (!encounter) return;

        if (encounter.type === 'loot') {
            exp.loot[encounter.resource] = (exp.loot[encounter.resource] || 0) + encounter.amount;
            exp.log.push(`Found ${encounter.amount} ${encounter.resource}`);
            return;
        }

        const alive = exp.partySnapshot.filter(p => p.hp > 0);
        if (alive.length === 0) return;

        const enemies = encounter.enemies.map(e => ({ ...e }));
        exp.log.push(`Combat: ${enemies.length} enemies`);

        while (alive.some(p => p.hp > 0) && enemies.some(e => e.hp > 0)) {
            for (const member of alive) {
                if (member.hp <= 0) continue;
                const target = enemies.find(e => e.hp > 0);
                if (!target) break;
                const weaponDmg = member.weapon ? member.weapon.damage : EXPLORATION_CONFIG.baseFistDamage;
                const dmg = weaponDmg + randInt(0, 3);
                target.hp -= dmg;
            }

            for (const enemy of enemies) {
                if (enemy.hp <= 0) continue;
                const target = alive.find(p => p.hp > 0);
                if (!target) break;
                let dmg = enemy.damage + randInt(0, 2);
                if (target.armor) {
                    dmg = Math.max(1, Math.floor(dmg * (1 - target.armor.damageReduction)));
                }
                target.hp -= dmg;
                if (target.hp <= 0) {
                    exp.defeated.push(target.id);
                    exp.log.push(`${target.name} was defeated`);
                }
            }
        }

        const survived = alive.filter(p => p.hp > 0).length;
        if (survived > 0) {
            const lootEntry = this._rollLoot(DIMENSIONS[exp.dimension]);
            exp.loot[lootEntry.resource] = (exp.loot[lootEntry.resource] || 0) + lootEntry.amount;
            exp.log.push(`Victory! Found ${lootEntry.amount} ${lootEntry.resource}`);
        }
    }

    _completeExpedition(exp, game) {
        exp.status = 'complete';

        const allDefeated = exp.partySnapshot.every(p => p.hp <= 0);
        const gx = exp.gatePos.x;
        const gy = exp.gatePos.y;

        for (const snapshot of exp.partySnapshot) {
            const colonist = game.colonists.find(c => c.id === snapshot.id);
            if (!colonist) continue;
            colonist.onExpedition = false;
            colonist.x = gx;
            colonist.y = gy;
            if (snapshot.hp <= 0) {
                colonist.hp = 1;
            } else {
                colonist.hp = Math.min(colonist.maxHp, snapshot.hp);
            }
            colonist.state = 'idle';
        }

        if (!allDefeated) {
            game.resources.add(exp.loot);
            const lootSummary = Object.entries(exp.loot).map(([k, v]) => `${v} ${k}`).join(', ');
            game.eventLog.add(game, `Expedition returned from ${exp.dimensionName}: ${lootSummary || 'nothing'}`, 'event', null);
        } else {
            game.eventLog.add(game, `Expedition to ${exp.dimensionName} failed — party retreated`, 'warning', null);
        }

        this.completedExpeditions.push(exp);
        if (this.completedExpeditions.length > 10) {
            this.completedExpeditions.shift();
        }
    }
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
