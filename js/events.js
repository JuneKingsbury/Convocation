import { CONFIG, EVENTS, CROPS } from './config.js';
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
            if (eventKey === 'fire' && game.weather.currentWeather !== 'thunderstorm' && Math.random() > 0.01) continue;

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
        switch (eventKey) {
            case 'wanderer': this.eventWanderer(game); break;
            case 'blight': this.eventBlight(game); break;
            case 'caravan': this.eventCaravan(game); break;
            case 'windfall': this.eventWindfall(game); break;
            case 'fire': this.eventFire(game); break;
            case 'cold_snap': this.eventColdSnap(game); break;
            case 'migration': this.eventMigration(game); break;
            case 'inspiration': this.eventInspiration(game); break;
        }
    }

    eventWanderer(game) {
        const edge = getRandomEdge();
        const skills = ['building', 'farming', 'crafting', 'cooking'];
        const bias = skills[Math.floor(Math.random() * skills.length)];
        const wanderer = createColonist(edge.x, edge.y, bias);

        this.pendingEvent = {
            type: 'wanderer',
            text: `A wanderer named ${wanderer.name} (${bias}) wants to join your colony!`,
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
            game.colonists.push(this.pendingEvent.data);
            game.notifications.push({ text: `${this.pendingEvent.data.name} joined!`, tick: game.tick, type: 'success' });
            for (const c of game.colonists) {
                if (c.id !== this.pendingEvent.data.id) {
                    addThought(c, 'New colonist arrived', 5, 200, game.tick);
                }
            }
        }
        this.pendingEvent = null;
    }

    eventBlight(game) {
        let blighted = 0;
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                const tile = game.map[y][x];
                if (tile.zone && tile.zone.state === 'growing' && Math.random() < 0.4) {
                    tile.zone.state = 'empty';
                    tile.zone.growth = 0;
                    blighted++;
                }
            }
        }
        if (blighted > 0) {
            game.notifications.push({ text: `Crop blight! ${blighted} plants destroyed.`, tick: game.tick, type: 'danger' });
            game.eventLog.add(game, `Crop blight destroyed ${blighted} plants`, 'danger', null);
            for (const c of game.colonists) {
                addThought(c, 'Crops died', -15, 300, game.tick);
            }
        }
    }

    eventCaravan(game) {
        this.pendingEvent = {
            type: 'caravan',
            text: 'A trade caravan arrives! Trade resources?',
            choices: ['Trade wood for food (5→4)', 'Trade stone for wood (3→4)', 'Trade food for planks (4→3)', 'Dismiss'],
            data: {},
        };
        game.notifications.push({ text: 'Trade caravan arrived!', tick: game.tick, type: 'event' });
        game.eventLog.add(game, 'Trade caravan arrived', 'event', null);
        if (game.settings.autoPauseEvent && !game.paused) {
            game.togglePause();
        }
    }

    resolveCaravan(game, choice) {
        switch (choice) {
            case 0:
                if (game.resources.stockpile.wood >= 5) {
                    game.resources.deduct({ wood: 5 });
                    game.resources.add({ food: 4 });
                }
                break;
            case 1:
                if (game.resources.stockpile.stone >= 3) {
                    game.resources.deduct({ stone: 3 });
                    game.resources.add({ wood: 4 });
                }
                break;
            case 2:
                if (game.resources.stockpile.food >= 4) {
                    game.resources.deduct({ food: 4 });
                    game.resources.add({ planks: 3 });
                }
                break;
        }
        this.pendingEvent = null;
    }

    eventWindfall(game) {
        const cx = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
        let placed = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) continue;
                const tile = game.map[ny][nx];
                if (tile.terrain === 'grass' && !tile.resource && !tile.structure && Math.random() < 0.6) {
                    tile.resource = { type: 'stone', amount: 3 + Math.floor(Math.random() * 3) };
                    placed++;
                }
            }
        }
        if (placed > 0) {
            game.notifications.push({ text: `Mineral vein discovered! ${placed} new stone deposits.`, tick: game.tick, type: 'event' });
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
            game.notifications.push({ text: 'Fire has broken out!', tick: game.tick, type: 'danger' });
            game.eventLog.add(game, 'Fire has broken out!', 'danger', { type: 'position', x: fireX, y: fireY });
            for (const c of game.colonists) {
                addThought(c, 'Colony on fire!', -20, 200, game.tick);
            }
        }
    }

    eventColdSnap(game) {
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                const tile = game.map[y][x];
                if (tile.zone && tile.zone.state === 'growing') {
                    tile.zone.state = 'empty';
                    tile.zone.growth = 0;
                }
            }
        }
        game.notifications.push({ text: 'Cold snap! All outdoor crops frozen.', tick: game.tick, type: 'danger' });
        game.eventLog.add(game, 'Cold snap froze all outdoor crops', 'danger', null);
        for (const c of game.colonists) {
            addThought(c, 'Freezing cold snap', -12, 300, game.tick);
        }
    }

    eventMigration(game) {
        const count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const edge = getRandomEdge();
            game.wildlife.push(createAnimal('deer', edge.x, edge.y));
        }
        game.notifications.push({ text: `Animal migration! ${count} deer passing through.`, tick: game.tick, type: 'event' });
    }

    eventInspiration(game) {
        const alive = game.colonists.filter(c => c.hp > 0);
        if (alive.length === 0) return;
        const colonist = alive[Math.floor(Math.random() * alive.length)];
        addThought(colonist, 'Feeling inspired!', 25, 300, game.tick);
        game.notifications.push({ text: `${colonist.name} is feeling inspired!`, tick: game.tick, type: 'success' });
    }
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

export function updateFires(game) {
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            const tile = game.map[y][x];
            if (!tile.onFire) continue;

            tile.fireTimer--;

            if (game.weather.currentWeather === 'rain') {
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
