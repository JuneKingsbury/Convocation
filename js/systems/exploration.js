import { DIMENSIONS, EXPLORATION_CONFIG, EXPLORATION_EVENTS, TAMED_ANIMALS, SPELLS, ARTIFACTS } from '../core/config.js';
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

    sendExpedition(game, dimensionKey, colonistIds, packAnimalIds = []) {
        if (!this.canSend(game, dimensionKey)) return null;
        if (colonistIds.length === 0) return null;

        const dim = DIMENSIONS[dimensionKey];
        const party = [];

        for (const id of colonistIds) {
            const c = game.getColonist(id);
            if (!c || c.hp <= 0 || c.onExpedition || c.drafted) continue;
            party.push(c);
        }

        if (party.length === 0) return null;

        const gatePos = this._findRiftGatePosition(game);
        if (!gatePos) return null;

        const packAnimals = [];
        for (const id of packAnimalIds) {
            const a = game.tamedAnimals.find(ta => ta.id === id);
            if (!a || a.hp <= 0) continue;
            const def = TAMED_ANIMALS[a.type];
            if (def && def.packAnimal) {
                packAnimals.push({ id: a.id, type: a.type, speedBonus: def.expeditionSpeedBonus || 0 });
                a.onExpedition = true;
            }
        }

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

        let duration = randInt(dim.duration[0], dim.duration[1]);
        const totalSpeedBonus = packAnimals.reduce((sum, pa) => sum + pa.speedBonus, 0);
        if (totalSpeedBonus > 0) {
            duration = Math.max(Math.floor(duration * (1 - totalSpeedBonus)), Math.floor(duration * 0.5));
        }
        let durationMult = 1.0;
        for (const c of party) {
            if (c.artifact && !c.artifactBroken) {
                const art = c.artifact;
                if (art.expedition?.durationMult) durationMult *= art.expedition.durationMult;
                if (art.consumable) {
                    game.resources.removeArtifact(art.key);
                    c.artifact = null;
                    game.eventLog.add(game, `${c.name}'s ${art.name} crumbles to dust as the expedition begins`, 'event', null);
                }
            }
        }
        if (durationMult !== 1.0) duration = Math.floor(duration * durationMult);
        const encounters = this._generateEncounters(dim);

        const expedition = {
            id: nextExpeditionId++,
            dimension: dimensionKey,
            dimensionName: dim.name,
            partyIds: party.map(c => c.id),
            packAnimals,
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
            log: packAnimals.length > 0
                ? [{ tick: 0, text: `Party heading to Rift Gate (${packAnimals.length} pack animal${packAnimals.length > 1 ? 's' : ''})`, type: 'info' }]
                : [{ tick: 0, text: `Party heading to Rift Gate`, type: 'info' }],
            combat: null,
            lastMicroEventTick: 0,
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
                if (exp.combat) {
                    this._updateCombat(exp, game);
                    continue;
                }

                this._regenMana(exp, game);
                this._tryHealSpells(exp, game);

                if (game.tick >= exp.nextEncounterTick && exp.currentEncounter < exp.encounters.length) {
                    this._startEncounter(exp, game);
                    exp.currentEncounter++;
                    exp.nextEncounterTick = game.tick + Math.floor(exp.duration * EXPLORATION_CONFIG.encounterSpacing);
                } else {
                    this._tryMicroEvent(exp, game);
                }

                const allDefeated = exp.partySnapshot.every(p => p.hp <= 0);
                if (allDefeated) {
                    exp.status = 'returning';
                    this._addLog(exp, game, 'All explorers defeated — retreating empty-handed', 'danger');
                    exp.loot = {};
                }

                if (elapsed >= exp.duration && exp.status === 'exploring') {
                    exp.status = 'returning';
                    this._addLog(exp, game, 'Expedition complete — returning home', 'success');
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

    _addLog(exp, game, text, type = 'info') {
        const tick = game ? game.tick : 0;
        exp.log.push({ tick, text, type });
        if (exp.log.length > 50) exp.log.shift();
    }

    _checkExpeditionRevive(exp, member, game) {
        const art = member.artifact;
        if (art?.expedition?.autoReviveHp && !member._reviveUsed) {
            member.hp = Math.floor(member.maxHp * art.expedition.autoReviveHp);
            member._reviveUsed = true;
            member.artifact = null;
            this._addLog(exp, game, `${member.name}'s ${art.name} shatters, bringing them back!`, 'success');
            const colonist = game.getColonist(member.id);
            if (colonist) colonist.artifactBroken = true;
        } else {
            exp.defeated.push(member.id);
            this._addLog(exp, game, pickRandom(EXPLORATION_EVENTS.combatDefeat).replace('{name}', member.name), 'danger');
        }
    }

    _updateGathering(exp, game) {
        const gx = exp.gatePos.x;
        const gy = exp.gatePos.y;
        let allArrived = true;

        for (const id of exp.partyIds) {
            const c = game.getColonist(id);
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
                const c = game.getColonist(id);
                return {
                    id: c.id, name: c.name, hp: c.hp, maxHp: c.maxHp,
                    weapon: c.weapon, armor: c.armor,
                    artifact: c.artifactBroken ? null : c.artifact,
                    knownSpells: c.knownSpells ? [...c.knownSpells] : [],
                    mana: c.mana || 0,
                    maxMana: c.maxMana || 0,
                    spellCooldowns: {},
                    spellDamageBonus: c.weapon && c.weapon.spellDamageBonus ? c.weapon.spellDamageBonus : 0,
                    shieldActive: false,
                    shieldReduction: 0,
                };
            });
            this._addLog(exp, game, `Party entered ${DIMENSIONS[exp.dimension].name}`, 'info');
            game.eventLog.add(game, `Expedition entered ${exp.dimensionName}`, 'event', null);
            exp.lastMicroEventTick = game.tick;
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
                        maxHp: 0,
                        damage: randInt(dim.enemies.damage[0], dim.enemies.damage[1]),
                    });
                }
                for (const e of enemies) e.maxHp = e.hp;
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
                if (entry.artifact) return { artifact: entry.artifact };
                return { resource: entry.resource, amount: randInt(entry.amount[0], entry.amount[1]) };
            }
        }
        const fallback = dim.loot[0];
        if (fallback.artifact) return { artifact: fallback.artifact };
        return { resource: fallback.resource, amount: randInt(fallback.amount[0], fallback.amount[1]) };
    }

    _tryMicroEvent(exp, game) {
        if (game.tick - exp.lastMicroEventTick < 12) return;
        if (Math.random() > EXPLORATION_CONFIG.microEventChance) return;

        exp.lastMicroEventTick = game.tick;
        const alive = exp.partySnapshot.filter(p => p.hp > 0);
        if (alive.length === 0) return;

        const member = alive[randInt(0, alive.length - 1)];
        const dim = DIMENSIONS[exp.dimension];
        const dimEvents = dim.events;

        if (dimEvents && dimEvents.rare) {
            const rareEncounterMult = getPartyExpeditionEffect(exp.partySnapshot, 'rareEncounterMult');
            for (const rare of dimEvents.rare) {
                if (Math.random() < rare.chance * rareEncounterMult) {
                    const msg = rare.text.replace('{name}', member.name);
                    if (rare.loot.artifact) {
                        if (!exp.loot._artifacts) exp.loot._artifacts = [];
                        exp.loot._artifacts.push(rare.loot.artifact);
                        const artName = ARTIFACTS[rare.loot.artifact]?.name || rare.loot.artifact;
                        this._addLog(exp, game, `${msg} (found ${artName}!)`, 'loot');
                    } else {
                        const amount = randInt(rare.loot.amount[0], rare.loot.amount[1]);
                        exp.loot[rare.loot.resource] = (exp.loot[rare.loot.resource] || 0) + amount;
                        this._addLog(exp, game, `${msg} (+${amount} ${rare.loot.resource.replace(/_/g, ' ')})`, 'loot');
                    }
                    return;
                }
            }
        }

        const roll = Math.random();

        if (roll < EXPLORATION_CONFIG.trapChance) {
            const trapMult = getPartyExpeditionEffect(exp.partySnapshot, 'trapDamageMult');
            const baseDmg = randInt(EXPLORATION_CONFIG.trapDamageRange[0], EXPLORATION_CONFIG.trapDamageRange[1]);
            const dmg = Math.floor(baseDmg * trapMult);
            member.hp -= dmg;
            const trapPool = (dimEvents && dimEvents.traps) || EXPLORATION_EVENTS.traps;
            const msg = pickRandom(trapPool).replace('{name}', member.name);
            this._addLog(exp, game, `${msg} (${dmg} dmg)`, 'danger');
            if (member.hp <= 0) {
                this._checkExpeditionRevive(exp, member, game);
            }
        } else if (roll < EXPLORATION_CONFIG.trapChance + EXPLORATION_CONFIG.findItemChance) {
            const lootEntry = this._rollLoot(dim);
            const lootMult = getPartyExpeditionEffect(exp.partySnapshot, 'lootMult');
            const discPool = (dimEvents && dimEvents.discoveries) || EXPLORATION_EVENTS.discoveries;
            const msg = pickRandom(discPool).replace('{name}', member.name);
            if (lootEntry.artifact) {
                if (!exp.loot._artifacts) exp.loot._artifacts = [];
                exp.loot._artifacts.push(lootEntry.artifact);
                const artName = ARTIFACTS[lootEntry.artifact]?.name || lootEntry.artifact;
                this._addLog(exp, game, `${msg} (found ${artName}!)`, 'loot');
            } else {
                const boostedAmount = Math.floor(lootEntry.amount * lootMult);
                exp.loot[lootEntry.resource] = (exp.loot[lootEntry.resource] || 0) + boostedAmount;
                this._addLog(exp, game, `${msg} (+${boostedAmount} ${lootEntry.resource.replace(/_/g, ' ')})`, 'loot');
            }
        } else {
            const ambientPool = (dimEvents && dimEvents.ambient) || EXPLORATION_EVENTS.ambient;
            const msg = pickRandom(ambientPool).replace('{name}', member.name);
            this._addLog(exp, game, msg, 'ambient');
        }
    }

    _startEncounter(exp, game) {
        const encounter = exp.encounters[exp.currentEncounter];
        if (!encounter) return;

        if (encounter.type === 'loot') {
            exp.loot[encounter.resource] = (exp.loot[encounter.resource] || 0) + encounter.amount;
            const member = exp.partySnapshot.find(p => p.hp > 0) || exp.partySnapshot[0];
            const dim = DIMENSIONS[exp.dimension];
            const discPool = (dim.events && dim.events.discoveries) || EXPLORATION_EVENTS.discoveries;
            const msg = pickRandom(discPool).replace('{name}', member.name);
            this._addLog(exp, game, `${msg} (+${encounter.amount} ${encounter.resource.replace(/_/g, ' ')})`, 'loot');
            return;
        }

        const enemies = encounter.enemies.map(e => ({ ...e }));
        const startMsg = pickRandom(EXPLORATION_EVENTS.combatStart);
        this._addLog(exp, game, `${startMsg} (${enemies.length} foes)`, 'combat');

        exp.combat = {
            enemies,
            roundTick: game.tick + EXPLORATION_CONFIG.combatRoundTicks,
            round: 0,
            encounterIndex: exp.currentEncounter,
        };
    }

    _updateCombat(exp, game) {
        const combat = exp.combat;
        if (game.tick < combat.roundTick) return;

        combat.roundTick = game.tick + EXPLORATION_CONFIG.combatRoundTicks;
        combat.round++;

        const alive = exp.partySnapshot.filter(p => p.hp > 0);
        const enemiesAlive = combat.enemies.filter(e => e.hp > 0);

        if (alive.length === 0 || enemiesAlive.length === 0) {
            this._finishCombat(exp, game);
            return;
        }

        const partyDmgMult = getPartyExpeditionEffect(exp.partySnapshot, 'partyDamageMult');
        for (const member of alive) {
            if (member.hp <= 0) continue;
            const target = combat.enemies.find(e => e.hp > 0);
            if (!target) break;
            const weaponDmg = member.weapon ? member.weapon.damage : EXPLORATION_CONFIG.baseFistDamage;
            const dmg = Math.floor((weaponDmg + randInt(0, 3)) * partyDmgMult);

            if (Math.random() < 0.15) {
                const msg = pickRandom(EXPLORATION_EVENTS.combatMiss)
                    .replace('{attacker}', member.name)
                    .replace('{target}', 'an enemy');
                this._addLog(exp, game, msg, 'combat');
            } else {
                target.hp -= dmg;
                const msg = pickRandom(EXPLORATION_EVENTS.combatHit)
                    .replace('{attacker}', member.name)
                    .replace('{target}', 'an enemy')
                    .replace('{dmg}', dmg);
                this._addLog(exp, game, msg, 'combat');
                if (target.hp <= 0) {
                    this._addLog(exp, game, `${member.name} slays a foe!`, 'success');
                }
            }
        }

        this._tryCombatSpells(exp, game, alive, combat);

        for (const enemy of combat.enemies) {
            if (enemy.hp <= 0) continue;
            let target = null;
            let bestScore = Infinity;
            for (const p of alive) {
                if (p.hp <= 0) continue;
                const priority = p.artifact?.expedition?.targetPriority || 0;
                const score = -priority;
                if (score < bestScore) { bestScore = score; target = p; }
            }
            if (!target) break;
            let dmg = enemy.damage + randInt(0, 2);
            if (target.armor) {
                dmg = Math.max(1, Math.floor(dmg * (1 - target.armor.damageReduction)));
            }
            if (target.artifact?.expedition?.damageReduction) {
                dmg = Math.max(1, Math.floor(dmg * (1 - target.artifact.expedition.damageReduction)));
            }
            if (target.shieldActive) {
                dmg = Math.max(1, Math.floor(dmg * (1 - target.shieldReduction)));
            }

            if (Math.random() < 0.15) {
                const msg = pickRandom(EXPLORATION_EVENTS.combatMiss)
                    .replace('{attacker}', 'An enemy')
                    .replace('{target}', target.name);
                this._addLog(exp, game, msg, 'combat');
            } else {
                target.hp -= dmg;
                const msg = pickRandom(EXPLORATION_EVENTS.combatHit)
                    .replace('{attacker}', 'An enemy')
                    .replace('{target}', target.name)
                    .replace('{dmg}', dmg);
                this._addLog(exp, game, msg, 'combat');
                if (target.hp <= 0) {
                    this._checkExpeditionRevive(exp, target, game);
                }
            }
        }

        if (combat.enemies.every(e => e.hp <= 0) || alive.every(p => p.hp <= 0)) {
            this._finishCombat(exp, game);
        }
    }

    _canCastSpell(member, spellKey, game) {
        const spell = SPELLS[spellKey];
        if (!spell) return false;
        if (member.mana < spell.manaCost) return false;
        const lastCast = member.spellCooldowns[spellKey] || 0;
        if (game.tick - lastCast < spell.cooldown) return false;
        return true;
    }

    _tryCombatSpells(exp, game, alive, combat) {
        for (const member of alive) {
            if (member.hp <= 0 || member.knownSpells.length === 0) continue;

            for (const spellKey of member.knownSpells) {
                const spell = SPELLS[spellKey];
                if (!spell || spell.trigger !== 'inCombat') continue;
                if (!this._canCastSpell(member, spellKey, game)) continue;

                member.mana -= spell.manaCost;
                member.spellCooldowns[spellKey] = game.tick;

                if (spell.effect === 'ranged_damage' || spell.effect === 'ranged_damage_aoe') {
                    let dmg = spell.damage;
                    if (member.spellDamageBonus) {
                        dmg = Math.floor(dmg * (1 + member.spellDamageBonus));
                    }
                    if (spell.effect === 'ranged_damage_aoe') {
                        const targets = combat.enemies.filter(e => e.hp > 0).slice(0, 3);
                        for (const t of targets) {
                            t.hp -= dmg;
                        }
                        this._addLog(exp, game, `${member.name} casts ${spell.name}! Hits ${targets.length} foes for ${dmg} each.`, 'combat');
                        for (const t of targets) {
                            if (t.hp <= 0) this._addLog(exp, game, `An enemy is destroyed by the blast!`, 'success');
                        }
                    } else {
                        const target = combat.enemies.find(e => e.hp > 0);
                        if (target) {
                            target.hp -= dmg;
                            this._addLog(exp, game, `${member.name} casts ${spell.name} at an enemy for ${dmg} damage!`, 'combat');
                            if (target.hp <= 0) this._addLog(exp, game, `${member.name}'s spell slays a foe!`, 'success');
                        }
                    }
                    break;
                } else if (spell.effect === 'buff_defense' && !member.shieldActive) {
                    member.shieldActive = true;
                    member.shieldReduction = spell.damageReduction;
                    this._addLog(exp, game, `${member.name} casts ${spell.name} — shielded!`, 'combat');
                    break;
                } else if (spell.effect === 'summon') {
                    const summonDmg = spell.summonDamage || 8;
                    const target = combat.enemies.find(e => e.hp > 0);
                    if (target) {
                        target.hp -= summonDmg;
                        this._addLog(exp, game, `${member.name} summons a familiar that attacks for ${summonDmg}!`, 'combat');
                        if (target.hp <= 0) this._addLog(exp, game, `The familiar finishes off a foe!`, 'success');
                    }
                    break;
                }
            }
        }
    }

    _tryHealSpells(exp, game) {
        const alive = exp.partySnapshot.filter(p => p.hp > 0);
        for (const member of alive) {
            if (member.knownSpells.length === 0) continue;
            const hpRatio = member.hp / member.maxHp;

            for (const spellKey of member.knownSpells) {
                const spell = SPELLS[spellKey];
                if (!spell || spell.effect !== 'heal') continue;
                const threshold = spell.hpThreshold || 0.5;
                if (hpRatio >= threshold) continue;
                if (!this._canCastSpell(member, spellKey, game)) continue;

                member.mana -= spell.manaCost;
                member.spellCooldowns[spellKey] = game.tick;
                const healed = Math.min(spell.healAmount, member.maxHp - member.hp);
                member.hp += healed;
                this._addLog(exp, game, `${member.name} casts ${spell.name} and heals for ${healed} HP.`, 'success');
                break;
            }
        }
    }

    _regenMana(exp, game) {
        if (game.tick % 10 !== 0) return;
        for (const member of exp.partySnapshot) {
            if (member.hp <= 0) continue;
            if (member.mana < member.maxMana) {
                member.mana = Math.min(member.maxMana, member.mana + 1);
            }
        }
    }

    _finishCombat(exp, game) {
        const survived = exp.partySnapshot.filter(p => p.hp > 0).length;
        if (survived > 0) {
            const dim = DIMENSIONS[exp.dimension];
            const lootMult = getPartyExpeditionEffect(exp.partySnapshot, 'lootMult');
            const lootEntry = this._rollLoot(dim);
            if (lootEntry.artifact) {
                if (!exp.loot._artifacts) exp.loot._artifacts = [];
                exp.loot._artifacts.push(lootEntry.artifact);
                const artName = ARTIFACTS[lootEntry.artifact]?.name || lootEntry.artifact;
                this._addLog(exp, game, `Victory! Found ${artName}!`, 'success');
            } else {
                const amount = Math.floor(lootEntry.amount * lootMult);
                exp.loot[lootEntry.resource] = (exp.loot[lootEntry.resource] || 0) + amount;
                this._addLog(exp, game, `Victory! Looted ${amount} ${lootEntry.resource.replace(/_/g, ' ')}.`, 'success');
            }
        } else {
            this._addLog(exp, game, 'The party has been overwhelmed...', 'danger');
        }
        for (const member of exp.partySnapshot) {
            member.shieldActive = false;
            member.shieldReduction = 0;
        }
        exp.combat = null;
    }

    _completeExpedition(exp, game) {
        exp.status = 'complete';

        const allDefeated = exp.partySnapshot.every(p => p.hp <= 0);
        const gx = exp.gatePos.x;
        const gy = exp.gatePos.y;

        for (const snapshot of exp.partySnapshot) {
            const colonist = game.getColonist(snapshot.id);
            if (!colonist) continue;
            colonist.onExpedition = false;
            colonist.x = gx;
            colonist.y = gy;
            if (snapshot.hp <= 0) {
                colonist.hp = 1;
            } else {
                colonist.hp = Math.min(colonist.maxHp, snapshot.hp);
            }
            colonist.mana = Math.min(colonist.maxMana, snapshot.mana);
            colonist.state = 'idle';
        }

        if (exp.packAnimals) {
            for (const pa of exp.packAnimals) {
                const animal = game.tamedAnimals.find(a => a.id === pa.id);
                if (animal) animal.onExpedition = false;
            }
        }

        const artifacts = exp.loot._artifacts || [];
        delete exp.loot._artifacts;
        game.resources.add(exp.loot);
        for (const artKey of artifacts) {
            game.resources.addArtifact({ ...ARTIFACTS[artKey], key: artKey });
        }
        const parts = Object.entries(exp.loot).map(([k, v]) => `${v} ${k}`);
        for (const artKey of artifacts) {
            parts.push(ARTIFACTS[artKey]?.name || artKey);
        }
        const lootSummary = parts.join(', ');
        if (!allDefeated) {
            this._addLog(exp, game, `Returned with: ${lootSummary || 'nothing'}`, 'success');
            game.eventLog.add(game, `Expedition returned from ${exp.dimensionName}: ${lootSummary || 'nothing'}`, 'event', null);
        } else {
            this._addLog(exp, game, `Party defeated — salvaged: ${lootSummary || 'nothing'}`, 'danger');
            game.eventLog.add(game, `Expedition to ${exp.dimensionName} failed — salvaged: ${lootSummary || 'nothing'}`, 'warning', null);
        }

        this.completedExpeditions.push(exp);
        if (this.completedExpeditions.length > 10) {
            this.completedExpeditions.shift();
        }
    }
}

function getPartyExpeditionEffect(partySnapshot, effectKey) {
    let value = effectKey.includes('Mult') ? 1.0 : 0;
    for (const member of partySnapshot) {
        if (member.hp <= 0 || !member.artifact) continue;
        const art = member.artifact;
        if (!art.expedition?.[effectKey]) continue;
        if (effectKey.includes('Mult')) value *= art.expedition[effectKey];
        else value += art.expedition[effectKey];
    }
    return value;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
    return arr[randInt(0, arr.length - 1)];
}
