import { CONFIG } from './config.js';

const SAVE_KEY = 'colony_save';

export function saveGame(game) {
    const data = {
        version: 1,
        tick: game.tick,
        timeOfDay: game.timeOfDay,
        speed: game.speed,
        settings: game.settings,
        peaceful: CONFIG.PEACEFUL_MODE,

        map: serializeMap(game.map),
        colonists: game.colonists,
        wildlife: game.wildlife,
        raiders: game.raiders,
        tamedAnimals: game.tamedAnimals,

        resources: {
            stockpile: game.resources.stockpile,
            weapons: game.resources.weapons,
        },

        weather: {
            season: game.weather.season,
            seasonIndex: game.weather.seasonIndex,
            seasonTick: game.weather.seasonTick,
            temperature: game.weather.temperature,
            currentWeather: game.weather.currentWeather,
            weatherTimer: game.weather.weatherTimer,
            year: game.weather.year,
        },

        combat: {
            nextRaidTick: game.combat.nextRaidTick,
            raidActive: game.combat.raidActive,
            raidStartTick: game.combat.raidStartTick,
        },

        events: {
            cooldowns: game.events.cooldowns,
        },

        research: {
            completed: [...game.research.completed],
            studyPoints: game.research.studyPoints,
        },

        tasks: game.taskQueue.getAll(),
        eventLog: game.eventLog.entries,
    };

    const json = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, json);
    return true;
}

export function loadGame(game) {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return false;

    const data = JSON.parse(json);

    CONFIG.PEACEFUL_MODE = data.peaceful;
    game.tick = data.tick;
    game.timeOfDay = data.timeOfDay;
    game.speed = data.speed;
    game.settings = data.settings;

    deserializeMap(game.map, data.map);

    game.colonists = data.colonists;
    game.wildlife = data.wildlife;
    game.raiders = data.raiders;
    game.tamedAnimals = data.tamedAnimals || [];

    game.resources.stockpile = data.resources.stockpile;
    game.resources.weapons = data.resources.weapons;

    game.weather.season = data.weather.season;
    game.weather.seasonIndex = data.weather.seasonIndex;
    game.weather.seasonTick = data.weather.seasonTick;
    game.weather.temperature = data.weather.temperature;
    game.weather.currentWeather = data.weather.currentWeather;
    game.weather.weatherTimer = data.weather.weatherTimer;
    game.weather.year = data.weather.year;

    game.combat.nextRaidTick = data.combat.nextRaidTick;
    game.combat.raidActive = data.combat.raidActive;
    game.combat.raidStartTick = data.combat.raidStartTick;

    game.events.cooldowns = data.events.cooldowns;

    game.research.completed = new Set(data.research.completed);
    game.research.studyPoints = data.research.studyPoints || 0;

    game.taskQueue.tasks = data.tasks;
    game.eventLog.entries = data.eventLog || [];

    game.roomsDirty = true;

    return true;
}

export function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
}

export function exportSave() {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return false;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colony_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
}

export function importSave(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.version || !data.map || !data.colonists) {
                    resolve(false);
                    return;
                }
                localStorage.setItem(SAVE_KEY, e.target.result);
                resolve(true);
            } catch {
                resolve(false);
            }
        };
        reader.readAsText(file);
    });
}

function serializeMap(map) {
    const rows = [];
    for (let y = 0; y < map.length; y++) {
        const row = [];
        for (let x = 0; x < map[y].length; x++) {
            const tile = map[y][x];
            const t = {
                t: tile.terrain,
                p: tile.passable ? 1 : 0,
            };
            if (tile.structure) t.s = tile.structure;
            if (tile.resource) t.r = tile.resource;
            if (tile.designation) t.d = tile.designation;
            if (tile.zone) t.z = tile.zone;
            if (tile.onFire) { t.f = 1; t.ft = tile.fireTimer; }
            if (tile.snowCovered) t.sn = 1;
            row.push(t);
        }
        rows.push(row);
    }
    return rows;
}

function deserializeMap(map, data) {
    for (let y = 0; y < data.length; y++) {
        for (let x = 0; x < data[y].length; x++) {
            const t = data[y][x];
            const tile = map[y][x];
            tile.terrain = t.t;
            tile.passable = t.p === 1;
            tile.structure = t.s || null;
            tile.resource = t.r || null;
            tile.designation = t.d || null;
            tile.zone = t.z || null;
            tile.onFire = t.f === 1;
            tile.fireTimer = t.ft || 0;
            tile.snowCovered = t.sn === 1;
            tile.roomId = null;
            tile.items = [];
        }
    }
}
