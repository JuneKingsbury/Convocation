import { CONFIG, COLONIST_NAMES, COLONIST_CONFIG, TRAITS, NEED_DECAY, MOOD_THRESHOLDS, MOOD_SPEED_MULT, WEAPONS, ARMORS, TOOLS, ARTIFACTS, POTIONS, BUILDINGS, SKILLS, MAGIC_SKILLS, MANA_CONFIG, MAGIC_STUDY_CONFIG, SPELL_TOMES, SPELLS, RESOURCES, THOUGHTS, IMPASSABLE_STRUCTURES, COMBAT_VISUALS, WORK_CONFIG, TASK_CONFIG } from '../core/config.js';
import { findPath, findPathAdjacent, manhattanDist } from '../world/pathfinding.js';
import { isPassable, getMoveCost } from '../world/map.js';
import { FOODSTUFFS } from '../systems/resources.js';
import { completeTame } from './taming.js';

let nextColonistId = 1;

export function syncColonistIdCounter(colonists) {
    const maxId = colonists.reduce((max, c) => Math.max(max, c.id || 0), 0);
    if (maxId >= nextColonistId) nextColonistId = maxId + 1;
}

export function createColonist(x, y, skillBias, existingNames = []) {
    const id = nextColonistId++;
    const usedNames = new Set(existingNames);
    const available = COLONIST_NAMES.filter(n => !usedNames.has(n));
    let name = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : `Colonist ${id}`;
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

    const skills = {};
    for (const [key, def] of Object.entries(SKILLS)) {
        const [min, max] = def.baseLevel;
        skills[key] = min + Math.floor(Math.random() * (max - min + 1));
    }
    if (skillBias && skills[skillBias] !== undefined) {
        skills[skillBias] = Math.min(10, skills[skillBias] + (SKILLS[skillBias].biasBonus || 3));
    }

    const magicSkills = {};
    for (const [key, def] of Object.entries(MAGIC_SKILLS)) {
        const [min, max] = def.baseLevel;
        magicSkills[key] = min + Math.floor(Math.random() * (max - min + 1));
    }
    let magicBias = null;
    if (Math.random() < COLONIST_CONFIG.magicBiasChance) {
        const magicKeys = Object.keys(MAGIC_SKILLS);
        magicBias = magicKeys[Math.floor(Math.random() * magicKeys.length)];
        magicSkills[magicBias] = Math.min(10, magicSkills[magicBias] + (MAGIC_SKILLS[magicBias].biasBonus || 2));
    }

    const combinedMagicLevel = Object.values(magicSkills).reduce((sum, lvl) => sum + lvl, 0);
    const maxMana = MANA_CONFIG.baseMana + combinedMagicLevel * MANA_CONFIG.manaPerMagicLevel;

    return {
        id, name, x, y, skills, magicSkills, magicBias, traits,
        nameColor: COLONIST_CONFIG.nameColors[(id - 1) % COLONIST_CONFIG.nameColors.length],
        priorities: { ...Object.fromEntries(Object.keys(SKILLS).map(k => [k, 3])), hauling: 4 },
        needs: { hunger: COLONIST_CONFIG.initialHunger[0] + Math.random() * (COLONIST_CONFIG.initialHunger[1] - COLONIST_CONFIG.initialHunger[0]), rest: COLONIST_CONFIG.initialRest[0] + Math.random() * (COLONIST_CONFIG.initialRest[1] - COLONIST_CONFIG.initialRest[0]) },
        mood: COLONIST_CONFIG.initialMood,
        thoughts: [],
        hp: COLONIST_CONFIG.maxHp, maxHp: COLONIST_CONFIG.maxHp,
        mana: maxMana, maxMana,
        knownSpells: [],
        disabledSpells: [],
        equippedTome: null,
        tomeProgress: {},
        state: 'idle',
        currentTaskId: null,
        path: [],
        workProgress: 0,
        assignedBed: null,
        weapon: null,
        armor: null,
        tool: null,
        artifact: null,
        drafted: false,
        draftTarget: null,
        stateTimer: 0,
        wanderCooldown: 0,
        moveCooldown: 0,
    };
}

export function updateColonist(colonist, game) {
    if (colonist.onExpedition) return;

    updateNeeds(colonist, game);
    updateThoughts(colonist, game);
    colonist.mood = computeMood(colonist);

    if (colonist.hp <= 0) return;

    tryUsePotions(colonist, game);
    tickPotionEffects(colonist, game);
    updateMana(colonist);
    tryAutocastSpells(colonist, game);

    if (!CONFIG.PEACEFUL_MODE && colonist.traits.includes('pyromaniac') && Math.random() < TRAITS.pyromaniac.fireChance) {
        const tile = game.map[colonist.y][colonist.x];
        if (!tile.onFire && tile.terrain !== 'water' && tile.terrain !== 'rock' && tile.terrain !== 'tall_rock') {
            tile.onFire = true;
            tile.fireTimer = 0;
            if (game.mapIndex) game.mapIndex.addFire(colonist.x, colonist.y);
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
            applyThought(colonist, 'freezing', game.tick);
        }
    }
}

function updateMana(colonist) {
    if (colonist.mana >= colonist.maxMana) return;
    const combinedLevel = Object.values(colonist.magicSkills).reduce((sum, lvl) => sum + lvl, 0);
    let regen = MANA_CONFIG.baseRegen + combinedLevel * MANA_CONFIG.regenPerMagicLevel;
    if (colonist.state === 'sleeping') regen *= MANA_CONFIG.regenWhileSleeping;
    else if (colonist.state === 'idle') regen *= MANA_CONFIG.regenWhileIdle;
    colonist.mana = Math.min(colonist.maxMana, colonist.mana + regen);
}

export function recalcMaxMana(colonist) {
    const combinedLevel = Object.values(colonist.magicSkills).reduce((sum, lvl) => sum + lvl, 0);
    colonist.maxMana = MANA_CONFIG.baseMana + combinedLevel * MANA_CONFIG.manaPerMagicLevel;
}

function advanceTomeStudy(colonist, game) {
    if (!colonist.equippedTome) return;
    const tomeKey = colonist.equippedTome;
    const tomeDef = SPELL_TOMES[tomeKey];
    if (!tomeDef) return;
    const spellDef = SPELLS[tomeDef.spell];
    if (!spellDef) return;
    if (colonist.knownSpells.includes(tomeDef.spell)) return;

    const school = spellDef.school;
    const currentLevel = colonist.magicSkills[school] || 0;
    if (currentLevel < tomeDef.minSchoolLevel) return;

    if (!colonist.tomeProgress) colonist.tomeProgress = {};
    if (!colonist.tomeProgress[tomeKey]) colonist.tomeProgress[tomeKey] = 0;
    colonist.tomeProgress[tomeKey] += MAGIC_STUDY_CONFIG.studyTicksPerProgress;

    if (!colonist._magicXpAccumulator) colonist._magicXpAccumulator = {};
    if (!colonist._magicXpAccumulator[school]) colonist._magicXpAccumulator[school] = 0;
    colonist._magicXpAccumulator[school] += MAGIC_STUDY_CONFIG.xpPerStudyTick;
    if (colonist._magicXpAccumulator[school] >= 1.0) {
        colonist._magicXpAccumulator[school] -= 1.0;
        colonist.magicSkills[school] = Math.min(10, colonist.magicSkills[school] + 1);
        recalcMaxMana(colonist);
        game.notifications.push({ text: `${colonist.name}'s ${MAGIC_SKILLS[school].name} increased to ${colonist.magicSkills[school]}`, tick: game.tick, type: 'success' });
    }

    if (colonist.tomeProgress[tomeKey] >= tomeDef.learningWork) {
        colonist.knownSpells.push(tomeDef.spell);
        colonist.equippedTome = null;
        delete colonist.tomeProgress[tomeKey];
        applyThought(colonist, 'learned_spell', game.tick);
        game.notifications.push({ text: `${colonist.name} learned ${spellDef.name}!`, tick: game.tick, type: 'success' });
    }
}

function updateThoughts(colonist, game) {
    colonist.thoughts = colonist.thoughts.filter(t => {
        if (t.duration === -1) return true;
        return game.tick - t.tickAdded < t.duration;
    });

    if (colonist.traits.includes('socialite')) {
        const nearOthers = game.colonists.some(c => c.id !== colonist.id && c.hp > 0 &&
            manhattanDist(colonist.x, colonist.y, c.x, c.y) <= COLONIST_CONFIG.socialRange);
        if (nearOthers) {
            addThought(colonist, 'Enjoying company', TRAITS.socialite.nearOthersMoodBonus, 20, game.tick);
        } else {
            addThought(colonist, 'Feeling lonely', TRAITS.socialite.aloneMoodPenalty, 20, game.tick);
        }
    }
    if (colonist.traits.includes('loner')) {
        const nearOthers = game.colonists.some(c => c.id !== colonist.id && c.hp > 0 &&
            manhattanDist(colonist.x, colonist.y, c.x, c.y) <= COLONIST_CONFIG.socialRange);
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

function applyThought(colonist, thoughtKey, tick) {
    const t = THOUGHTS[thoughtKey];
    if (t) addThought(colonist, t.text, t.moodEffect, t.duration, tick);
}

function computeMood(colonist) {
    let mood = COLONIST_CONFIG.baseMood;
    for (const thought of colonist.thoughts) {
        mood += thought.moodEffect;
    }
    if (colonist.needs.hunger < COLONIST_CONFIG.hungerMoodThreshold) mood += COLONIST_CONFIG.hungerMoodPenalty;
    if (colonist.needs.rest < COLONIST_CONFIG.restMoodThreshold) mood += COLONIST_CONFIG.restMoodPenalty;
    if (colonist.assignedBed) mood += COLONIST_CONFIG.bedMoodBonus;
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

    const t = game.timeOfDay / CONFIG.TICKS_PER_DAY;
    const isNight = t > 0.7 || t < 0.2;
    if (colonist.traits.includes('night_owl')) {
        speed *= isNight ? TRAITS.night_owl.nightSpeedMult : TRAITS.night_owl.daySpeedMult;
    }
    if (colonist.traits.includes('early_bird')) {
        speed *= isNight ? TRAITS.early_bird.nightSpeedMult : TRAITS.early_bird.daySpeedMult;
    }

    return speed;
}

function getMoveSpeedBonus(colonist) {
    let bonus = 0;
    if (colonist.tool && colonist.tool.moveSpeedBonus) bonus += colonist.tool.moveSpeedBonus;
    if (colonist.artifact && colonist.artifact.moveSpeedBonus) bonus += colonist.artifact.moveSpeedBonus;
    if (colonist.activeEffects) {
        for (const e of colonist.activeEffects) {
            if (e.type === 'speed' && e.moveSpeedBonus) bonus += e.moveSpeedBonus;
        }
    }
    return Math.min(bonus, 0.8);
}

function getEquipmentWorkBonus(colonist, task) {
    let mult = 1.0;
    const items = [colonist.weapon, colonist.tool, colonist.artifact];
    for (const item of items) {
        if (!item) continue;
        if (task.type === 'mine' && item.miningSpeed) mult *= item.miningSpeed;
        if (task.type === 'chop' && item.choppingSpeed) mult *= item.choppingSpeed;
        if ((task.type === 'plant' || task.type === 'harvest') && item.farmingSpeed) mult *= item.farmingSpeed;
    }
    return mult;
}

function tryUsePotions(colonist, game) {
    if (!colonist._potionCooldowns) colonist._potionCooldowns = {};

    for (const [key, potion] of Object.entries(POTIONS)) {
        if (colonist._potionCooldowns[key] && game.tick - colonist._potionCooldowns[key] < potion.cooldown) continue;
        if (game.resources.getPotionCount(key) <= 0) continue;

        let shouldUse = false;
        if (potion.trigger === 'lowHealth') {
            shouldUse = colonist.hp < colonist.maxHp * potion.hpThreshold;
        } else if (potion.trigger === 'hasTask') {
            shouldUse = colonist.currentTaskId !== null && (colonist.state === 'moving' || colonist.state === 'working');
        }

        if (shouldUse) {
            game.resources.takePotion(key);
            colonist._potionCooldowns[key] = game.tick;

            if (potion.effect === 'heal') {
                colonist.hp = Math.min(colonist.maxHp, colonist.hp + potion.healAmount);
            } else if (potion.effect === 'speed') {
                if (!colonist.activeEffects) colonist.activeEffects = [];
                colonist.activeEffects.push({
                    type: 'speed',
                    moveSpeedBonus: potion.moveSpeedBonus,
                    workSpeedBonus: potion.workSpeedBonus,
                    expiresAt: game.tick + potion.duration,
                });
            }

            game.notifications.push({ text: `${colonist.name} used ${potion.name}`, tick: game.tick, type: 'success' });
        }
    }
}

function tickPotionEffects(colonist, game) {
    if (!colonist.activeEffects) return;
    colonist.activeEffects = colonist.activeEffects.filter(e => game.tick < e.expiresAt);
}

export function grantCastXp(colonist, spell, game) {
    const school = spell.school;
    if (!school || colonist.magicSkills[school] >= 10) return;
    if (!colonist._magicXpAccumulator) colonist._magicXpAccumulator = {};
    if (!colonist._magicXpAccumulator[school]) colonist._magicXpAccumulator[school] = 0;
    colonist._magicXpAccumulator[school] += MAGIC_STUDY_CONFIG.xpPerCast;
    if (colonist._magicXpAccumulator[school] >= 1.0) {
        colonist._magicXpAccumulator[school] -= 1.0;
        colonist.magicSkills[school] = Math.min(10, colonist.magicSkills[school] + 1);
        recalcMaxMana(colonist);
        game.notifications.push({ text: `${colonist.name}'s ${MAGIC_SKILLS[school].name} increased to ${colonist.magicSkills[school]}`, tick: game.tick, type: 'success' });
    }
}

function tryAutocastSpells(colonist, game) {
    if (!colonist.knownSpells || colonist.knownSpells.length === 0) return;
    if (!colonist._spellCooldowns) colonist._spellCooldowns = {};

    for (const spellKey of colonist.knownSpells) {
        const spell = SPELLS[spellKey];
        if (!spell || spell.castType !== 'auto') continue;
        if (colonist.disabledSpells && colonist.disabledSpells.includes(spellKey)) continue;
        if (colonist._spellCooldowns[spellKey] && game.tick - colonist._spellCooldowns[spellKey] < spell.cooldown) continue;
        if (colonist.mana < spell.manaCost) continue;

        if (!shouldCastSpell(colonist, spell, game)) continue;

        colonist.mana -= spell.manaCost;
        colonist._spellCooldowns[spellKey] = game.tick;
        applySpellEffect(colonist, spell, game);
        grantCastXp(colonist, spell, game);
        applyThought(colonist, 'cast_spell', game.tick);
    }
}

function shouldCastSpell(colonist, spell, game) {
    switch (spell.trigger) {
        case 'inCombat': {
            const hostile = findNearestHostile(colonist, game);
            if (!hostile) return false;
            const dist = manhattanDist(colonist.x, colonist.y, hostile.x, hostile.y);
            return dist <= (spell.range || COLONIST_CONFIG.fightEngageDistance);
        }
        case 'lowHealth':
            return colonist.hp < colonist.maxHp * (spell.hpThreshold || 0.5);
        case 'allyLowHealth': {
            const range = spell.range || COLONIST_CONFIG.hostileSearchRadius;
            return game.colonists.some(c => c.id !== colonist.id && c.hp > 0 &&
                c.hp < c.maxHp * (spell.hpThreshold || 0.5) &&
                manhattanDist(colonist.x, colonist.y, c.x, c.y) <= range);
        }
        case 'hasTask':
            if (spell.idleExclude && colonist.state === 'idle') return false;
            return colonist.currentTaskId !== null && (colonist.state === 'moving' || colonist.state === 'working');
        case 'always':
            if (spell.idleExclude && colonist.state === 'idle') return false;
            return true;
        default:
            return false;
    }
}

function applySpellEffect(colonist, spell, game) {
    switch (spell.effect) {
        case 'ranged_damage': {
            const target = findNearestHostile(colonist, game);
            if (!target) return;
            const dist = manhattanDist(colonist.x, colonist.y, target.x, target.y);
            if (dist > spell.range) return;
            target.hp -= spell.damage;
            game.combatEffects.push({ x: target.x, y: target.y, char: spell.projectileChar || '*', color: spell.projectileColor || '#ff44ff', ttl: 3 });
            break;
        }
        case 'ranged_damage_aoe': {
            const target = findNearestHostile(colonist, game);
            if (!target) return;
            const dist = manhattanDist(colonist.x, colonist.y, target.x, target.y);
            if (dist > spell.range) return;
            const allHostiles = [...game.raiders, ...(game.waves ? game.waves.enemies : []), ...game.wildlife.filter(w => w.hostile)];
            for (const h of allHostiles) {
                if (h.hp <= 0) continue;
                if (manhattanDist(target.x, target.y, h.x, h.y) <= spell.radius) {
                    h.hp -= spell.damage;
                    game.combatEffects.push({ x: h.x, y: h.y, char: spell.projectileChar || '●', color: spell.projectileColor || '#ff6600', ttl: 3 });
                }
            }
            break;
        }
        case 'heal':
            if (spell.targetSelf) {
                colonist.hp = Math.min(colonist.maxHp, colonist.hp + spell.healAmount);
            }
            game.combatEffects.push({ x: colonist.x, y: colonist.y, char: COMBAT_VISUALS.spellHealChar, color: COMBAT_VISUALS.spellHealColor, ttl: 3 });
            break;
        case 'buff_speed': {
            if (!colonist.activeEffects) colonist.activeEffects = [];
            colonist.activeEffects.push({
                type: 'speed',
                source: 'spell',
                moveSpeedBonus: spell.moveSpeedBonus || 0,
                workSpeedBonus: spell.workSpeedBonus || 1.0,
                expiresAt: game.tick + spell.duration,
            });
            game.combatEffects.push({ x: colonist.x, y: colonist.y, char: COMBAT_VISUALS.spellBuffChar, color: COMBAT_VISUALS.spellBuffColor, ttl: 2 });
            break;
        }
        case 'buff_defense': {
            if (!colonist.activeEffects) colonist.activeEffects = [];
            colonist.activeEffects.push({
                type: 'shield',
                source: 'spell',
                damageReduction: spell.damageReduction || 0.3,
                expiresAt: game.tick + spell.duration,
            });
            game.combatEffects.push({ x: colonist.x, y: colonist.y, char: COMBAT_VISUALS.spellShieldChar, color: COMBAT_VISUALS.spellShieldColor, ttl: 3 });
            break;
        }
        case 'summon': {
            if (!game.summons) game.summons = [];
            game.summons.push({
                x: colonist.x + (Math.random() > 0.5 ? 1 : -1),
                y: colonist.y + (Math.random() > 0.5 ? 1 : -1),
                ownerId: colonist.id,
                hp: spell.summonHp,
                maxHp: spell.summonHp,
                damage: spell.summonDamage,
                char: spell.summonChar || 'f',
                color: spell.summonColor || '#9966ff',
                expiresAt: game.tick + spell.summonDuration,
                hostile: false,
            });
            game.combatEffects.push({ x: colonist.x, y: colonist.y, char: spell.summonChar || 'f', color: spell.summonColor || '#9966ff', ttl: 3 });
            break;
        }
    }
}

function updateIdle(colonist, game) {
    if (colonist.expeditionPending) return;

    if (colonist.drafted) {
        colonist.state = 'drafted';
        return;
    }

    if (getMoodLevel(colonist.mood) === 'breaking') {
        colonist.state = 'wandering';
        colonist.stateTimer = COLONIST_CONFIG.breakingWanderDuration[0] + Math.floor(Math.random() * (COLONIST_CONFIG.breakingWanderDuration[1] - COLONIST_CONFIG.breakingWanderDuration[0]));
        return;
    }

    const waveActive = game.waves && game.waves.active && game.waves.enemies.length > 0;
    const threat = findNearestHostile(colonist, game);
    if (threat) {
        const dist = manhattanDist(colonist.x, colonist.y, threat.x, threat.y);
        if (waveActive || dist <= COLONIST_CONFIG.fightEngageDistance) {
            colonist.state = 'fighting';
            return;
        }
    }

    if (colonist.needs.hunger < COLONIST_CONFIG.hungerMoodThreshold &&
        (game.resources.stockpile.food > 0 || game.resources.getFoodstuffTotal() > 0)) {
        colonist.state = 'eating';
        return;
    }
    if (colonist.needs.rest < COLONIST_CONFIG.restMoodThreshold) {
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

            /*if (!task._unreachableFailers) task._unreachableFailers = new Set();
            task._unreachableFailers.add(colonist.id);

            if (task._unreachableFailers.size >= TASK_CONFIG.unreachableFailThreshold) {
                game.taskQueue.remove(task.id);
                const tile = game.map[task.y] && game.map[task.y][task.x];
                if (tile) tile.designation = null;
                game.notifications.push({ text: `Cancelled unreachable ${task.type} task`, tick: game.tick, type: 'warning' });
            } else if (!colonist._lastPathFailNotify || game.tick - colonist._lastPathFailNotify > TASK_CONFIG.unreachableCheckInterval) {
                colonist._lastPathFailNotify = game.tick;
                game.notifications.push({ text: `${colonist.name} can't reach ${task.type} task`, tick: game.tick, type: 'danger' });
            }*/
        }
        return;
    }

    colonist.wanderCooldown--;
    if (colonist.wanderCooldown <= 0) {
        wander(colonist, game);
        colonist.wanderCooldown = COLONIST_CONFIG.wanderCooldown[0] + Math.floor(Math.random() * (COLONIST_CONFIG.wanderCooldown[1] - COLONIST_CONFIG.wanderCooldown[0]));
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
        if (colonist._expeditionMove) {
            colonist.state = 'idle';
            return;
        }
        if (colonist._sleepAfterMove) {
            delete colonist._sleepAfterMove;
            colonist.state = 'sleeping';
            colonist.stateTimer = COLONIST_CONFIG.sleepAfterMoveDuration;
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
            let moveCost = cost - 1;
            const moveBonus = getMoveSpeedBonus(colonist);
            if (moveBonus > 0) moveCost = Math.max(0, Math.round(moveCost * (1 - moveBonus)));
            colonist.moveCooldown = moveCost;
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
    speed *= (1 + skill * COLONIST_CONFIG.skillWorkBonus);

    if (task.skillRequired === 'farming' && colonist.traits.includes('green_thumb')) {
        speed *= TRAITS.green_thumb.farmingSpeedMult;
    }

    speed *= getEquipmentWorkBonus(colonist, task);

    if (colonist.activeEffects) {
        for (const e of colonist.activeEffects) {
            if (e.type === 'speed' && e.workSpeedBonus) speed *= e.workSpeedBonus;
        }
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
            if (game.mapIndex) game.mapIndex.addStructure(task.x, task.y, task.buildType);
            game.roomsDirty = true;
            if (game.waves && game.waves.active) game.waves.invalidatePathPreview();
            applyThought(colonist, 'built_something', game.tick);
            break;
        }
        case 'chop':
        case 'mine': {
            const tile = game.map[task.y][task.x];
            if (tile.resource) {
                const rDef = RESOURCES[tile.resource.type];
                if (rDef) {
                    const output = {};
                    for (const [res, amt] of Object.entries(rDef.yield)) {
                        output[res] = rDef.perAmount ? tile.resource.amount * amt : amt;
                    }
                    game.resources.add(output);
                }
                tile.resource = null;
                if (task.type === 'mine') {
                    tile.terrain = 'dirt';
                    tile.passable = true;
                }
            }
            tile.designation = null;
            applyThought(colonist, 'good_work', game.tick);
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
                applyThought(colonist, 'harvested', game.tick);
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
                    } else if (TOOLS[key]) {
                        game.resources.addTool({ ...TOOLS[key], key });
                        handled = true;
                    } else if (ARTIFACTS[key]) {
                        game.resources.addArtifact({ ...ARTIFACTS[key], key });
                        handled = true;
                    } else if (POTIONS[key]) {
                        game.resources.addPotion({ ...POTIONS[key], type: key });
                        handled = true;
                    } else if (SPELL_TOMES[key]) {
                        game.resources.addTome({ ...SPELL_TOMES[key], key });
                        handled = true;
                    }
                }
                if (!handled) {
                    game.resources.add(output);
                }
                applyThought(colonist, 'crafted', game.tick);
            }
            break;
        }
        case 'cook': {
            if (task.recipe) {
                const output = { ...task.recipe.output };
                let handled = false;
                for (const key of Object.keys(output)) {
                    if (POTIONS[key]) {
                        game.resources.addPotion({ ...POTIONS[key], type: key });
                        handled = true;
                    }
                }
                if (!handled) {
                    if (output.food && game.research.isResearched('alchemy')) {
                        output.food += WORK_CONFIG.alchemyFoodBonus;
                    }
                    game.resources.add(output);
                }
                applyThought(colonist, 'cooked', game.tick);
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
            if (game.mapIndex) game.mapIndex.removeFire(task.x, task.y);
            applyThought(colonist, 'put_out_fire', game.tick);
            break;
        }
        case 'research': {
            game.research.addProgress(colonist.skills.research + 2);
            advanceTomeStudy(colonist, game);
            break;
        }
        case 'tame': {
            if (task.targetAnimalId) {
                if (completeTame(game, task.targetAnimalId)) {
                    applyThought(colonist, 'tamed_animal', game.tick);
                }
            }
            break;
        }
        case 'repair': {
            const tile = game.map[task.y][task.x];
            if (tile.structure && tile.structureHp !== undefined) {
                tile.structureHp = undefined;
                applyThought(colonist, 'repaired', game.tick);
            }
            break;
        }
        case 'deconstruct': {
            const tile = game.map[task.y][task.x];
            if (tile.structure) {
                const oldStructure = tile.structure;
                const def = BUILDINGS[oldStructure];
                if (def) {
                    const partial = {};
                    for (const [res, amt] of Object.entries(def.cost)) {
                        partial[res] = Math.ceil(amt * COLONIST_CONFIG.deconstructRecovery);
                    }
                    game.resources.add(partial);
                }
                tile.structure = null;
                tile.passable = true;
                tile.designation = null;
                if (game.mapIndex) game.mapIndex.removeStructure(task.x, task.y, oldStructure);
                game.roomsDirty = true;
                applyThought(colonist, 'deconstructed', game.tick);
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
        colonist.needs.hunger = COLONIST_CONFIG.cookedFoodRestore;
        colonist.state = 'idle';
        if (colonist.traits.includes('gourmand')) {
            addThought(colonist, 'Delicious meal', TRAITS.gourmand.cookedFoodMoodBonus, COLONIST_CONFIG.mealMoodDuration, game.tick);
        } else {
            addThought(colonist, 'Ate a meal', COLONIST_CONFIG.mealMoodBonus, COLONIST_CONFIG.mealMoodDuration, game.tick);
        }
    } else {
        const eaten = eatRawFoodstuff(game);
        if (eaten) {
            colonist.needs.hunger = Math.min(100, colonist.needs.hunger + COLONIST_CONFIG.rawFoodRestore);
            colonist.state = 'idle';
            if (colonist.traits.includes('gourmand')) {
                addThought(colonist, 'Ate raw food', TRAITS.gourmand.rawFoodMoodPenalty, COLONIST_CONFIG.rawFoodMoodDuration, game.tick);
            } else {
                addThought(colonist, 'Ate raw food', COLONIST_CONFIG.rawFoodMoodPenalty, COLONIST_CONFIG.rawFoodMoodDuration, game.tick);
            }
        } else {
            colonist.state = 'idle';
            addThought(colonist, 'Starving', COLONIST_CONFIG.starvingMoodPenalty, COLONIST_CONFIG.starvingMoodDuration, game.tick);
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
    colonist.stateTimer = COLONIST_CONFIG.sleepDuration;
}

function updateSleeping(colonist, game) {
    colonist.stateTimer--;
    colonist.needs.rest = Math.min(100, colonist.needs.rest + COLONIST_CONFIG.restPerTick);
    if (colonist.stateTimer <= 0 || colonist.needs.rest >= 100) {
        colonist.state = 'idle';
        const inBed = colonist.assignedBed &&
            colonist.x === colonist.assignedBed.x && colonist.y === colonist.assignedBed.y;
        if (inBed) {
            const roomId = game.map[colonist.y][colonist.x].roomId;
            if (roomId !== null) {
                addThought(colonist, 'Slept in nice room', COLONIST_CONFIG.sleptInRoomMoodBonus, COLONIST_CONFIG.sleptInRoomMoodDuration, game.tick);
            } else {
                addThought(colonist, 'Slept in bed', COLONIST_CONFIG.sleptInBedMoodBonus, COLONIST_CONFIG.sleptInBedMoodDuration, game.tick);
            }
        } else {
            addThought(colonist, 'Slept on the ground', COLONIST_CONFIG.sleptOnGroundMoodPenalty, COLONIST_CONFIG.sleptOnGroundMoodDuration, game.tick);
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
    if (dist > COLONIST_CONFIG.fightEngageDistance && !waveActive) {
        colonist.state = 'idle';
        return;
    }

    if (colonist.hp < COLONIST_CONFIG.fleeHpThreshold) {
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
    const dmg = weaponDmg + Math.floor(Math.random() * COLONIST_CONFIG.combatDamageVariance);
    target.hp -= dmg;
    game.combatEffects.push({ x: target.x, y: target.y, char: COMBAT_VISUALS.hitChar, color: COMBAT_VISUALS.hitColor, ttl: COMBAT_VISUALS.hitTtl });

    if (target.hp <= 0) {
        addThought(colonist, 'Won a fight', COLONIST_CONFIG.victoryMoodBonus, COLONIST_CONFIG.victoryMoodDuration, game.tick);
        colonist.state = 'idle';
    }
}

function updateFleeing(colonist, game) {
    const threat = findNearestHostile(colonist, game);
    if (!threat || manhattanDist(colonist.x, colonist.y, threat.x, threat.y) > COLONIST_CONFIG.fleeDisengageDistance) {
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
                    let moveCost = cost - 1;
                    const moveBonus = getMoveSpeedBonus(colonist);
                    if (moveBonus > 0) moveCost = Math.max(0, Math.round(moveCost * (1 - moveBonus)));
                    colonist.moveCooldown = moveCost;
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
    if (Math.random() < COLONIST_CONFIG.wanderChance) wander(colonist, game);
}

function findNearestHostile(colonist, game) {
    if (game.spatial) {
        return game.spatial.hostiles.findNearest(colonist.x, colonist.y, COLONIST_CONFIG.hostileSearchRadius, null);
    }
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
    if (colonist.activeEffects) {
        for (const e of colonist.activeEffects) {
            if (e.type === 'shield' && e.damageReduction) mult *= (1 - e.damageReduction);
        }
    }
    const actualDmg = Math.floor(damage * mult);
    colonist.hp -= actualDmg;
    game.combatEffects.push({ x: colonist.x, y: colonist.y, char: COMBAT_VISUALS.hitChar, color: COMBAT_VISUALS.damageTakenColor, ttl: COMBAT_VISUALS.hitTtl });

    if (colonist.state !== 'fighting' && colonist.state !== 'fleeing' && colonist.hp > 0) {
        game.eventLog.add(game, `${colonist.name} is under attack!`, 'danger', { type: 'colonist', id: colonist.id });
    }

    if (colonist.hp <= 0) {
        colonist.hp = 0;
        colonist.state = 'dead';
        game.eventLog.add(game, `${colonist.name} has died!`, 'danger', { type: 'colonist', id: colonist.id });
        for (const other of game.colonists) {
            if (other.id !== colonist.id && other.hp > 0) {
                addThought(other, `${colonist.name} died`, COLONIST_CONFIG.deathMoodPenalty, COLONIST_CONFIG.deathMoodDuration, game.tick);
            }
        }
    } else if (colonist.state !== 'fighting' && colonist.state !== 'fleeing') {
        colonist.state = 'fighting';
    }
}
