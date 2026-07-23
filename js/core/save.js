import { CONFIG, SKILLS, MAGIC_SKILLS, MANA_CONFIG, COLONIST_CONFIG } from './config.js';
import { syncColonistIdCounter } from '../entities/colonist.js';
import { syncAnimalIdCounter } from '../entities/wildlife.js';
import { syncTamedIdCounter } from '../entities/taming.js';

const SAVE_KEY = 'colony_save';

export function saveGame(game) {
    const layout = captureLayout();
    const data = {
        version: 2,
        tick: game.tick,
        timeOfDay: game.timeOfDay,
        speed: game.speed,
        settings: game.settings,
        peaceful: CONFIG.PEACEFUL_MODE,
        layout,

        map: serializeMap(game.map),
        colonists: game.colonists,
        wildlife: game.wildlife,
        raiders: game.raiders,
        tamedAnimals: game.tamedAnimals,

        resources: {
            stockpile: game.resources.stockpile,
            weapons: game.resources.weapons,
            armors: game.resources.armors,
            tools: game.resources.tools,
            artifacts: game.resources.artifacts,
            potions: game.resources.potions,
            tomes: game.resources.tomes,
            _decayAccumulators: game.resources._decayAccumulators,
            reservedFoodstuffs: game.resources.reservedFoodstuffs,
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

        divinationModifiers: game.divinationModifiers || [],

        waves: {
            highestWaveCompleted: game.waves.highestWaveCompleted,
            active: game.waves.active,
            currentWave: game.waves.currentWave,
            nexusPosition: game.waves.nexusPosition,
            nexusHp: game.waves.nexusHp,
            nexusMaxHp: game.waves.nexusMaxHp,
            enemies: game.waves.enemies,
            enemiesSpawned: game.waves.enemiesSpawned,
            enemiesToSpawn: game.waves.enemiesToSpawn,
            spawnTimer: game.waves.spawnTimer,
            portals: game.waves.portals,
        },

        events: {
            cooldowns: game.events.cooldowns,
        },

        exploration: {
            expeditions: game.exploration.expeditions,
            completedExpeditions: game.exploration.completedExpeditions,
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
    game.settings = { ...game.settings, ...data.settings };

    deserializeMap(game.map, data.map);

    game.colonists = data.colonists;
    for (const c of game.colonists) {
        if (!c.nameColor) c.nameColor = '#ffff00';
        for (const [key, def] of Object.entries(SKILLS)) {
            if (c.skills && c.skills[key] === undefined) {
                const [min, max] = def.baseLevel;
                c.skills[key] = min + Math.floor(Math.random() * (max - min + 1));
            }
            if (c.priorities && c.priorities[key] === undefined) c.priorities[key] = 3;
        }
        if (!c.magicSkills) {
            c.magicSkills = {};
            for (const [key, def] of Object.entries(MAGIC_SKILLS)) {
                const [min, max] = def.baseLevel;
                c.magicSkills[key] = min + Math.floor(Math.random() * (max - min + 1));
            }
            if (Math.random() < COLONIST_CONFIG.magicBiasChance) {
                const magicKeys = Object.keys(MAGIC_SKILLS);
                c.magicBias = magicKeys[Math.floor(Math.random() * magicKeys.length)];
                c.magicSkills[c.magicBias] = Math.min(10, c.magicSkills[c.magicBias] + (MAGIC_SKILLS[c.magicBias].biasBonus || 2));
            }
        } else {
            for (const [key, def] of Object.entries(MAGIC_SKILLS)) {
                if (c.magicSkills[key] === undefined) {
                    const [min, max] = def.baseLevel;
                    c.magicSkills[key] = min + Math.floor(Math.random() * (max - min + 1));
                }
            }
        }
        if (c.mana === undefined || c.maxMana === undefined) {
            const combinedLevel = Object.values(c.magicSkills).reduce((sum, lvl) => sum + lvl, 0);
            c.maxMana = MANA_CONFIG.baseMana + combinedLevel * MANA_CONFIG.manaPerMagicLevel;
            c.mana = c.maxMana;
        }
        if (!c.knownSpells) c.knownSpells = [];
        if (!c.disabledSpells) c.disabledSpells = [];
        if (c.equippedTome === undefined) c.equippedTome = null;
        if (!c.tomeProgress || typeof c.tomeProgress === 'number') c.tomeProgress = {};
    }
    game.rebuildColonistIndex();
    game.wildlife = data.wildlife;
    game.raiders = data.raiders;
    game.tamedAnimals = data.tamedAnimals || [];

    game.resources.stockpile = data.resources.stockpile;
    game.resources.weapons = data.resources.weapons;
    game.resources.armors = data.resources.armors || [];
    game.resources.tools = data.resources.tools || [];
    game.resources.artifacts = data.resources.artifacts || [];
    game.resources.potions = data.resources.potions || [];
    game.resources.tomes = data.resources.tomes || [];
    game.resources._decayAccumulators = data.resources._decayAccumulators || {};
    game.resources.reservedFoodstuffs = data.resources.reservedFoodstuffs || {};

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
    game.divinationModifiers = data.divinationModifiers || [];

    game.events.cooldowns = data.events.cooldowns;

    if (data.waves) {
        game.waves.highestWaveCompleted = data.waves.highestWaveCompleted || 0;
        game.waves.active = data.waves.active || false;
        game.waves.currentWave = data.waves.currentWave || 0;
        game.waves.nexusPosition = data.waves.nexusPosition || null;
        game.waves.nexusHp = data.waves.nexusHp || 0;
        game.waves.nexusMaxHp = data.waves.nexusMaxHp || 0;
        game.waves.enemies = data.waves.enemies || [];
        game.waves.enemiesSpawned = data.waves.enemiesSpawned || 0;
        game.waves.enemiesToSpawn = data.waves.enemiesToSpawn || 0;
        game.waves.spawnTimer = data.waves.spawnTimer || 0;
        game.waves.portals = data.waves.portals || [];
    }

    game.research.completed = new Set(data.research.completed);
    game.research.studyPoints = data.research.studyPoints || 0;

    if (data.exploration) {
        game.exploration.expeditions = data.exploration.expeditions || [];
        game.exploration.completedExpeditions = data.exploration.completedExpeditions || [];
        for (const exp of [...game.exploration.expeditions, ...game.exploration.completedExpeditions]) {
            if (exp.log && exp.log.length > 0 && typeof exp.log[0] === 'string') {
                exp.log = exp.log.map(text => ({ tick: 0, text, type: 'info' }));
            }
            if (!exp.combat) exp.combat = null;
            if (!exp.lastMicroEventTick) exp.lastMicroEventTick = 0;
            if (exp.partySnapshot) {
                for (const p of exp.partySnapshot) {
                    if (!p.knownSpells) p.knownSpells = [];
                    if (p.mana === undefined) p.mana = 0;
                    if (p.maxMana === undefined) p.maxMana = 0;
                    if (!p.spellCooldowns) p.spellCooldowns = {};
                    if (p.spellDamageBonus === undefined) p.spellDamageBonus = 0;
                    if (p.shieldActive === undefined) p.shieldActive = false;
                    if (p.shieldReduction === undefined) p.shieldReduction = 0;
                }
            }
        }
    }

    game.taskQueue.tasks = data.tasks;
    game.taskQueue.syncIdCounter();
    game.eventLog.entries = data.eventLog || [];

    syncColonistIdCounter(game.colonists);
    syncAnimalIdCounter(game.wildlife);
    syncTamedIdCounter(game.tamedAnimals);

    game.roomsDirty = true;

    if (data.layout) {
        restoreLayout(data.layout);
    }

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
            if (tile.structureHp !== undefined) t.shp = tile.structureHp;
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
            tile.structure = t.s === 'storage_chest' ? 'food_chest' : (t.s || null);
            tile.structureHp = t.shp !== undefined ? t.shp : undefined;
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

function captureLayout() {
    const container = document.getElementById('game-container');
    const footer = document.getElementById('game-footer');
    const colonistHud = document.getElementById('colonist-hud');
    const eventLog = document.getElementById('event-log');
    const uiFontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ui-font-size')) || 12;

    return {
        gridColumns: container?.style.gridTemplateColumns || null,
        footerHeight: footer?.style.height || null,
        colonistHudFlex: colonistHud?.style.flex || null,
        eventLogFlex: eventLog?.style.flex || null,
        uiFontSize,
    };
}

export function restoreLayout(layout) {
    if (!layout) return;
    const container = document.getElementById('game-container');
    const footer = document.getElementById('game-footer');
    const colonistHud = document.getElementById('colonist-hud');
    const eventLog = document.getElementById('event-log');

    if (layout.gridColumns) container.style.gridTemplateColumns = layout.gridColumns;
    if (layout.footerHeight) footer.style.height = layout.footerHeight;
    if (layout.colonistHudFlex) colonistHud.style.flex = layout.colonistHudFlex;
    if (layout.eventLogFlex) eventLog.style.flex = layout.eventLogFlex;
    if (layout.uiFontSize) window.setUIFontSize(layout.uiFontSize);
}
