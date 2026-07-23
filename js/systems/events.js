import { CONFIG, EVENTS, CARAVAN_TRADES, WEATHER_TYPES, THOUGHTS, SKILLS, TRADE_VALUES, TRADER_MARKUP, TRADER_DISCOUNT, TRADER_EXCLUSIVE_ITEMS } from '../core/config.js';
import { createColonist, addThought } from '../entities/colonist.js';
import { createAnimal } from '../entities/wildlife.js';
import { getPedestalEffect } from './artifacts.js';

export class EventSystem {
    constructor() {
        this.cooldowns = {};
        this.pendingEvent = null;
    }

    update(game) {
        if (this.pendingEvent) return;

        const mods = game.divinationModifiers || [];

        for (const [eventKey, eventDef] of Object.entries(EVENTS)) {
            if (game.tick < eventDef.minTick) continue;
            if (this.cooldowns[eventKey] && game.tick < this.cooldowns[eventKey]) continue;
            if (eventDef.seasons && !eventDef.seasons.includes(game.weather.season)) continue;

            if (mods.some(m => m.suppressEvents && m.suppressEvents.includes(eventKey))) continue;

            if (eventKey === 'fire') {
                const wDef = WEATHER_TYPES[game.weather.currentWeather];
                if (!(wDef && wDef.fireChance) && Math.random() > 0.01) continue;
            }

            let chance = eventDef.weight / 5000;
            if (eventKey === 'wanderer') {
                const alive = game.colonists.filter(c => c.hp > 0);
                const avgMood = alive.length > 0 ? alive.reduce((s, c) => s + c.mood, 0) / alive.length : 50;
                chance *= Math.max(0.05, avgMood / 70);
                chance *= getPedestalEffect(game, 'wandererChanceMult');
            }

            for (const m of mods) {
                if (m.eventBoost === eventKey) chance *= m.eventMult;
            }

            if (Math.random() < chance) {
                this.triggerEvent(eventKey, game);
                this.cooldowns[eventKey] = game.tick + eventDef.cooldown;
                break;
            }
        }
    }

    triggerEvent(eventKey, game) {
        const def = EVENTS[eventKey];
        switch (def.effect) {
            case 'deposit': this.handleDeposit(def, game); break;
            case 'spawn_animals': this.handleSpawnAnimals(def, game); break;
            case 'mood': this.handleMood(def, game); break;
            case 'crop_damage': this.handleCropDamage(def, game); break;
            case 'custom':
                switch (eventKey) {
                    case 'wanderer': this.eventWanderer(game); break;
                    case 'caravan': this.eventCaravan(game); break;
                    case 'fire': this.eventFire(game); break;
                }
                break;
        }
    }

    // ========================================================================
    // DATA-DRIVEN EFFECT HANDLERS
    // ========================================================================

    handleDeposit(def, game) {
        const center = def.location === 'edge' ? getRandomEdgeZone() : getRandomInterior();
        const r = def.radius;
        let count = 0;

        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const nx = center.x + dx, ny = center.y + dy;
                if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) continue;
                const tile = game.map[ny][nx];
                if (!def.terrain.includes(tile.terrain)) continue;
                if (tile.resource || tile.structure) continue;
                if (Math.random() >= def.fillChance) continue;

                const deposit = pickWeighted(def.deposits);
                tile.resource = { type: deposit.type, amount: randRange(deposit.amount) };
                count++;
            }
        }

        if (count > 0) {
            const msg = def.notification.replace('{count}', count);
            game.notifications.push({ text: msg, tick: game.tick, type: 'event' });
            game.eventLog.add(game, def.logMessage.replace('{count}', count), def.logType, { type: 'position', x: center.x, y: center.y });
        }
    }

    handleSpawnAnimals(def, game) {
        let totalCount = 0;
        for (const entry of def.animals) {
            const count = randRange(entry.count);
            for (let i = 0; i < count; i++) {
                const edge = getRandomEdge();
                game.wildlife.push(createAnimal(entry.type, edge.x, edge.y));
            }
            totalCount += count;
        }
        const msg = def.notification.replace('{count}', totalCount);
        game.notifications.push({ text: msg, tick: game.tick, type: 'event' });
        game.eventLog.add(game, def.logMessage.replace('{count}', totalCount), def.logType, null);
    }

    handleMood(def, game) {
        const alive = game.colonists.filter(c => c.hp > 0);
        if (alive.length === 0) return;
        const colonist = alive[Math.floor(Math.random() * alive.length)];
        addThought(colonist, def.thought, def.moodChange, def.moodDuration, game.tick);
        const msg = def.notification.replace('{name}', colonist.name);
        game.notifications.push({ text: msg, tick: game.tick, type: 'success' });
        game.eventLog.add(game, def.logMessage.replace('{name}', colonist.name), def.logType, { type: 'colonist', id: colonist.id });
    }

    handleCropDamage(def, game) {
        let count = 0;
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                const tile = game.map[y][x];
                if (tile.zone && tile.zone.state === 'growing' && Math.random() < def.chance) {
                    tile.zone.state = 'empty';
                    tile.zone.growth = 0;
                    count++;
                }
            }
        }
        if (count > 0) {
            const msg = def.notification.replace('{count}', count);
            game.notifications.push({ text: msg, tick: game.tick, type: 'danger' });
            game.eventLog.add(game, def.logMessage.replace('{count}', count), def.logType, null);
            if (def.thought) {
                for (const c of game.colonists) {
                    addThought(c, def.thought, def.moodChange, def.moodDuration, game.tick);
                }
            }
        }
    }

    // ========================================================================
    // CUSTOM EVENT HANDLERS (complex logic that can't be data-driven)
    // ========================================================================

    eventWanderer(game) {
        const aliveColonists = game.colonists.filter(c => c.hp > 0 && !c.golem);
        const cap = game.waves.getColonistCap();
        if (aliveColonists.length >= cap) {
            return;
        }

        const edge = getRandomEdge();
        const skillKeys = Object.keys(SKILLS);
        const bias = skillKeys[Math.floor(Math.random() * skillKeys.length)];
        const existingNames = game.colonists.map(c => c.name);
        const wanderer = createColonist(edge.x, edge.y, bias, existingNames);

        this.pendingEvent = {
            type: 'wanderer',
            text: `A wanderer named ${wanderer.name} (${bias}) wants to join your colony! (${aliveColonists.length + 1}/${cap} cap)`,
            choices: ['Accept', 'Reject'],
            data: wanderer,
        };
        game.notifications.push({ text: `A wanderer approaches!`, tick: game.tick, type: 'event' });
        game.eventLog.add(game, `A wanderer named ${wanderer.name} approaches`, 'event', { type: 'position', x: edge.x, y: edge.y });
        if (game.settings.autoPauseEvent && !game.paused) {
            game.togglePause();
        }
    }

    resolveWanderer(game, accept) {
        if (accept && this.pendingEvent?.data) {
            const aliveColonists = game.colonists.filter(c => c.hp > 0 && !c.golem);
            const cap = game.waves.getColonistCap();
            if (aliveColonists.length >= cap) {
                game.notifications.push({ text: `Colony is at capacity (${cap})! Complete more waves to expand.`, tick: game.tick, type: 'danger' });
                this.pendingEvent = null;
                return;
            }
            game.addColonist(this.pendingEvent.data);
            game.notifications.push({ text: `${this.pendingEvent.data.name} joined!`, tick: game.tick, type: 'success' });
            game.eventLog.add(game, `${this.pendingEvent.data.name} joined the colony`, 'success', { type: 'colonist', id: this.pendingEvent.data.id });
            const t = THOUGHTS.new_colonist;
            for (const c of game.colonists) {
                if (c.id !== this.pendingEvent.data.id) {
                    addThought(c, t.text, t.moodEffect, t.duration, game.tick);
                }
            }
        }
        this.pendingEvent = null;
    }

    eventCaravan(game) {
        const traderResources = {};
        const available = Object.keys(TRADE_VALUES);
        const numItems = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numItems; i++) {
            const res = available[Math.floor(Math.random() * available.length)];
            traderResources[res] = (traderResources[res] || 0) + 3 + Math.floor(Math.random() * 8);
        }

        let exclusiveItem = null;
        if (Math.random() < 0.3) {
            const keys = Object.keys(TRADER_EXCLUSIVE_ITEMS);
            exclusiveItem = keys[Math.floor(Math.random() * keys.length)];
        }

        this.pendingEvent = {
            type: 'trade',
            text: 'A trade caravan arrives! Barter resources with the merchant.',
            choices: ['Open Trade', 'Dismiss'],
            data: { traderResources, exclusiveItem, traderCredit: 0 },
        };
        game.notifications.push({ text: 'Trade caravan arrived!', tick: game.tick, type: 'event' });
        game.eventLog.add(game, 'Trade caravan arrived', 'event', null);
        if (game.settings.autoPauseEvent && !game.paused) {
            game.togglePause();
        }
    }

    resolveCaravan(game, choice) {
        if (choice === 1 || choice === 'Dismiss') {
            this.pendingEvent = null;
            return;
        }
        // choice 0 = Open Trade — handled by UI, keep event open
    }

    executeBarterTrade(game, offering, requesting) {
        if (!this.pendingEvent || this.pendingEvent.type !== 'trade') return false;
        const data = this.pendingEvent.data;

        let offerValue = 0;
        for (const [res, amt] of Object.entries(offering)) {
            if (amt <= 0) continue;
            if ((game.resources.stockpile[res] || 0) < amt) return false;
            offerValue += (TRADE_VALUES[res] || 1) * amt * TRADER_DISCOUNT;
        }

        let requestValue = 0;
        for (const [res, amt] of Object.entries(requesting)) {
            if (amt <= 0) continue;
            if (res === '__exclusive') {
                if (!data.exclusiveItem) return false;
                requestValue += TRADER_EXCLUSIVE_ITEMS[data.exclusiveItem].tradeValue;
            } else {
                if ((data.traderResources[res] || 0) < amt) return false;
                requestValue += (TRADE_VALUES[res] || 1) * amt * TRADER_MARKUP;
            }
        }

        if (offerValue < requestValue) return false;

        for (const [res, amt] of Object.entries(offering)) {
            if (amt > 0) game.resources.deduct({ [res]: amt });
        }
        for (const [res, amt] of Object.entries(requesting)) {
            if (res === '__exclusive') {
                const item = TRADER_EXCLUSIVE_ITEMS[data.exclusiveItem];
                if (item.type === 'weapon') game.resources.addWeapon({ ...item, key: data.exclusiveItem });
                else if (item.type === 'armor') game.resources.addArmor({ ...item, key: data.exclusiveItem });
                else if (item.type === 'artifact') game.resources.addArtifact({ ...item, key: data.exclusiveItem });
                data.exclusiveItem = null;
            } else {
                game.resources.add({ [res]: amt });
                data.traderResources[res] -= amt;
                if (data.traderResources[res] <= 0) delete data.traderResources[res];
            }
        }

        game.notifications.push({ text: 'Trade complete!', tick: game.tick, type: 'success' });
        return true;
    }

    dismissTrader() {
        if (this.pendingEvent?.type === 'trade') {
            this.pendingEvent = null;
        }
    }

    eventFire(game) {
        let fireX = -1, fireY = -1;
        for (let attempts = 0; attempts < 20; attempts++) {
            const x = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
            const y = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
            const tile = game.map[y][x];
            if (tile.resource?.type === 'tree' || (tile.structure && tile.structure !== 'wall')) {
                fireX = x; fireY = y;
                break;
            }
        }
        if (fireX >= 0) {
            game.map[fireY][fireX].onFire = true;
            game.map[fireY][fireX].fireTimer = 20;
            if (game.mapIndex) game.mapIndex.addFire(fireX, fireY);
            game.notifications.push({ text: 'Fire has broken out!', tick: game.tick, type: 'danger' });
            game.eventLog.add(game, 'Fire has broken out!', 'danger', { type: 'position', x: fireX, y: fireY });
            const t = THOUGHTS.fire_panic;
            for (const c of game.colonists) {
                addThought(c, t.text, t.moodEffect, t.duration, game.tick);
            }
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randRange(arr) {
    return arr[0] + Math.floor(Math.random() * (arr[1] - arr[0] + 1));
}

function pickWeighted(entries) {
    if (entries.length === 1) return entries[0];
    const totalWeight = entries.reduce((s, e) => s + (e.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const entry of entries) {
        roll -= entry.weight || 1;
        if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
}

function getRandomEdge() {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
        case 0: return { x: Math.floor(Math.random() * CONFIG.MAP_WIDTH), y: 0 };
        case 1: return { x: CONFIG.MAP_WIDTH - 1, y: Math.floor(Math.random() * CONFIG.MAP_HEIGHT) };
        case 2: return { x: Math.floor(Math.random() * CONFIG.MAP_WIDTH), y: CONFIG.MAP_HEIGHT - 1 };
        case 3: return { x: 0, y: Math.floor(Math.random() * CONFIG.MAP_HEIGHT) };
    }
}

function getRandomEdgeZone() {
    const margin = 15;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
        case 0: return { x: margin + Math.floor(Math.random() * (CONFIG.MAP_WIDTH - margin * 2)), y: 3 + Math.floor(Math.random() * margin) };
        case 1: return { x: CONFIG.MAP_WIDTH - 3 - Math.floor(Math.random() * margin), y: margin + Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - margin * 2)) };
        case 2: return { x: margin + Math.floor(Math.random() * (CONFIG.MAP_WIDTH - margin * 2)), y: CONFIG.MAP_HEIGHT - 3 - Math.floor(Math.random() * margin) };
        case 3: return { x: 3 + Math.floor(Math.random() * margin), y: margin + Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - margin * 2)) };
    }
}

function getRandomInterior() {
    return {
        x: Math.floor(Math.random() * CONFIG.MAP_WIDTH),
        y: Math.floor(Math.random() * CONFIG.MAP_HEIGHT),
    };
}

export function updateFires(game) {
    const firePositions = game.mapIndex ? game.mapIndex.getFirePositions() : null;

    if (!firePositions) {
        _updateFiresFallback(game);
        return;
    }

    for (const { x, y } of firePositions) {
        const tile = game.map[y][x];
        if (!tile.onFire) {
            game.mapIndex.removeFire(x, y);
            continue;
        }

        tile.fireTimer--;

        const wDef = WEATHER_TYPES[game.weather.currentWeather];
        if (wDef && wDef.extinguishesFire) {
            tile.onFire = false;
            tile.fireTimer = 0;
            game.mapIndex.removeFire(x, y);
            continue;
        }

        if (tile.fireTimer <= 0) {
            tile.onFire = false;
            game.mapIndex.removeFire(x, y);
            if (tile.resource?.type === 'tree') {
                tile.resource = null;
            } else if (tile.structure && tile.structure !== 'wall') {
                const oldStructure = tile.structure;
                tile.structure = null;
                game.mapIndex.removeStructure(x, y, oldStructure);
            }
        }

        if (tile.onFire && Math.random() < 0.05) {
            const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            const dir = dirs[Math.floor(Math.random() * 4)];
            const nx = x + dir[0], ny = y + dir[1];
            if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                const neighbor = game.map[ny][nx];
                if (!neighbor.onFire && (neighbor.resource?.type === 'tree' || (neighbor.structure && neighbor.structure !== 'wall'))) {
                    neighbor.onFire = true;
                    neighbor.fireTimer = 15 + Math.floor(Math.random() * 10);
                    game.mapIndex.addFire(nx, ny);
                }
            }
        }

        if (tile.onFire) {
            const existingTask = game.taskQueue.getByPosition(x, y);
            if (!existingTask) {
                game.taskQueue.add({
                    type: 'extinguish',
                    skillRequired: 'building',
                    x, y,
                    workAmount: 5,
                });
            }
        }
    }
}

function _updateFiresFallback(game) {
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            const tile = game.map[y][x];
            if (!tile.onFire) continue;

            tile.fireTimer--;

            const wDef = WEATHER_TYPES[game.weather.currentWeather];
            if (wDef && wDef.extinguishesFire) {
                tile.onFire = false;
                tile.fireTimer = 0;
                continue;
            }

            if (tile.fireTimer <= 0) {
                tile.onFire = false;
                if (tile.resource?.type === 'tree') {
                    tile.resource = null;
                } else if (tile.structure && tile.structure !== 'wall') {
                    tile.structure = null;
                }
            }

            if (Math.random() < 0.05) {
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * 4)];
                const nx = x + dir[0], ny = y + dir[1];
                if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                    const neighbor = game.map[ny][nx];
                    if (!neighbor.onFire && (neighbor.resource?.type === 'tree' || (neighbor.structure && neighbor.structure !== 'wall'))) {
                        neighbor.onFire = true;
                        neighbor.fireTimer = 15 + Math.floor(Math.random() * 10);
                    }
                }
            }

            const existingTask = game.taskQueue.getByPosition(x, y);
            if (!existingTask && tile.onFire) {
                game.taskQueue.add({
                    type: 'extinguish',
                    skillRequired: 'building',
                    x, y,
                    workAmount: 5,
                });
            }
        }
    }
}
