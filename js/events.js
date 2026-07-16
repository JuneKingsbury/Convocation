import { CONFIG, EVENTS, CARAVAN_TRADES, WEATHER_TYPES, THOUGHTS, SKILLS } from './config.js';
import { createColonist, addThought } from './colonist.js';
import { createAnimal } from './wildlife.js';

export class EventSystem {
    constructor() {
        this.cooldowns = {};
        this.pendingEvent = null;
    }

    update(game) {
        if (this.pendingEvent) return;

        for (const [eventKey, eventDef] of Object.entries(EVENTS)) {
            if (game.tick < eventDef.minTick) continue;
            if (this.cooldowns[eventKey] && game.tick < this.cooldowns[eventKey]) continue;
            if (eventDef.seasons && !eventDef.seasons.includes(game.weather.season)) continue;
            if (eventKey === 'fire') {
                const wDef = WEATHER_TYPES[game.weather.currentWeather];
                if (!(wDef && wDef.fireChance) && Math.random() > 0.01) continue;
            }

            let chance = eventDef.weight / 5000;
            if (eventKey === 'wanderer') {
                const alive = game.colonists.filter(c => c.hp > 0);
                const avgMood = alive.length > 0 ? alive.reduce((s, c) => s + c.mood, 0) / alive.length : 50;
                chance *= Math.max(0.05, avgMood / 70);
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
        const aliveColonists = game.colonists.filter(c => c.hp > 0);
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
            const aliveColonists = game.colonists.filter(c => c.hp > 0);
            const cap = game.waves.getColonistCap();
            if (aliveColonists.length >= cap) {
                game.notifications.push({ text: `Colony is at capacity (${cap})! Complete more waves to expand.`, tick: game.tick, type: 'danger' });
                this.pendingEvent = null;
                return;
            }
            game.colonists.push(this.pendingEvent.data);
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
        const choices = CARAVAN_TRADES.map(t => {
            const giveStr = Object.entries(t.give).map(([r, n]) => `${n} ${r}`).join(', ');
            const recvStr = Object.entries(t.receive).map(([r, n]) => `${n} ${r}`).join(', ');
            return `Trade ${giveStr} for ${recvStr}`;
        });
        choices.push('Dismiss');

        this.pendingEvent = {
            type: 'caravan',
            text: 'A trade caravan arrives! Trade resources?',
            choices,
            data: {},
        };
        game.notifications.push({ text: 'Trade caravan arrived!', tick: game.tick, type: 'event' });
        game.eventLog.add(game, 'Trade caravan arrived', 'event', null);
        if (game.settings.autoPauseEvent && !game.paused) {
            game.togglePause();
        }
    }

    resolveCaravan(game, choice) {
        if (choice >= 0 && choice < CARAVAN_TRADES.length) {
            const trade = CARAVAN_TRADES[choice];
            const canAfford = Object.entries(trade.give).every(([r, n]) => game.resources.stockpile[r] >= n);
            if (canAfford) {
                game.resources.deduct(trade.give);
                game.resources.add(trade.receive);
            }
        }
        this.pendingEvent = null;
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
