import { CONFIG } from './config.js';
import { generateMap } from './map.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { createColonist, updateColonist } from './colonist.js';
import { TaskQueue } from './tasks.js';
import { ResourceManager } from './resources.js';
import { detectRooms } from './rooms.js';
import { updateFarming } from './farming.js';
import { queueCraftingOrder } from './crafting.js';
import { Weather } from './weather.js';
import { updateWildlife, designateHunt } from './wildlife.js';
import { CombatSystem } from './combat.js';
import { EventSystem, updateFires } from './events.js';
import { UI } from './ui.js';
import { Minimap } from './minimap.js';
import { ResearchSystem, updateResearch } from './research.js';
import { updateTamedAnimals, tameAnimal } from './taming.js';
import { PowerSystem } from './power.js';
import { EventLog } from './eventlog.js';
import { saveGame, loadGame, hasSave, exportSave, importSave } from './save.js';

class Game {
    constructor() {
        this.tick = 0;
        this.paused = false;
        this.speed = 1;
        this.accumulator = 0;
        this.lastTime = 0;
        this.timeOfDay = 50;
        this.settings = {
            autoPauseHostile: true,
            autoPauseEvent: true,
        };

        this.map = generateMap();
        this.camera = new Camera();
        this.taskQueue = new TaskQueue();
        this.resources = new ResourceManager();
        this.weather = new Weather();
        this.combat = new CombatSystem();
        this.events = new EventSystem();
        this.research = new ResearchSystem();
        this.power = new PowerSystem();
        this.eventLog = new EventLog();

        this.colonists = [];
        this.wildlife = [];
        this.raiders = [];
        this.tamedAnimals = [];
        this.notifications = [];
        this.cursor = null;
        this.selectedColonist = null;
        this.selectedColonists = [];
        this.followingColonist = null;
        this.roomsDirty = true;

        this.spawnStartingColonists();

        const preElement = document.getElementById('game');
        this.renderer = new Renderer(preElement);
        this.ui = new UI(this);
        this.input = new InputHandler(this, preElement);
        this.minimap = new Minimap(document.getElementById('minimap'), this);
        this.ui.updateModeDisplay(this.input);

        window.game = this;
        this.gameLoop = this.gameLoop.bind(this);
    }

    spawnStartingColonists() {
        const cx = Math.floor(CONFIG.MAP_WIDTH / 2);
        const cy = Math.floor(CONFIG.MAP_HEIGHT / 2);
        const biases = ['building', 'farming', 'crafting'];
        for (let i = 0; i < 3; i++) {
            const c = createColonist(cx + i - 1, cy, biases[i]);
            c.priorities[biases[i]] = 1;
            this.colonists.push(c);
        }
    }

    start() {
        this.paused = true;
        document.getElementById('game').classList.add('paused');
        document.getElementById('pause-overlay').style.display = 'block';
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }

    gameLoop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!this.paused) {
            this.accumulator += dt * this.speed;
            while (this.accumulator >= CONFIG.TICK_RATE) {
                this.simulationTick();
                this.accumulator -= CONFIG.TICK_RATE;
            }
        }

        if (this.followingColonist) {
            const fc = this.colonists.find(c => c.id === this.followingColonist);
            if (fc && fc.hp > 0) {
                this.camera.centerOn(fc.x, fc.y);
            } else {
                this.followingColonist = null;
            }
        }

        this.renderer.render(this);
        this.minimap.render();
        this.ui.update();
        requestAnimationFrame(this.gameLoop);
    }

    simulationTick() {
        this.tick++;
        this.timeOfDay = this.tick % CONFIG.TICKS_PER_DAY;

        this.weather.update(this.tick);
        if (this.tick % 50 === 0) {
            this.weather.applySnow(this.map);
        }

        if (this.roomsDirty) {
            detectRooms(this.map);
            this.roomsDirty = false;
        }

        if (this.tick % 5 === 0) {
            updateFarming(this);
            updateResearch(this);
        }

        if (this.tick % 10 === 0) {
            this.power.update(this);
            updateTamedAnimals(this);
        }

        if (this.tick % 3 === 0 && this.power.hasPower()) {
            this.power.updateTurrets(this);
        }

        for (const colonist of this.colonists) {
            if (colonist.hp > 0) {
                updateColonist(colonist, this);
            }
        }

        updateWildlife(this);
        this.combat.update(this);
        this.events.update(this);
        updateFires(this);

        if (!this._gameOver && this.colonists.length > 0 && this.colonists.every(c => c.hp <= 0)) {
            this._gameOver = true;
            this.paused = true;
            this.notifications.push({ text: 'All colonists have died. Game Over.', tick: this.tick, type: 'danger' });
            this.eventLog.add(this, 'All colonists have died. Game Over.', 'danger', null);
        }
    }

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('game').classList.toggle('paused', this.paused);
        document.getElementById('pause-overlay').style.display = this.paused ? 'block' : 'none';
    }

    speedUp() {
        this.speed = Math.min(5, this.speed + 1);
    }

    speedDown() {
        this.speed = Math.max(1, this.speed - 1);
    }

    setMobileMode(mode) {
        this.input.setMode(mode);
    }

    cyclePriority(colonistId, skill) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c) return;
        c.priorities[skill] = (c.priorities[skill] + 1) % 6;
    }

    toggleDraft(colonistId) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c || c.hp <= 0) return;
        c.drafted = !c.drafted;
        if (c.drafted) {
            c.state = 'drafted';
            if (c.currentTaskId) {
                this.taskQueue.release(c.currentTaskId);
                c.currentTaskId = null;
            }
        } else {
            c.state = 'idle';
            c.draftTarget = null;
        }
        if (this.selectedColonists.length > 1) {
            this.ui.showMultiColonistInfo(this.selectedColonists);
        } else {
            this.ui.showColonistInfo(c);
        }
    }

    draftAllSelected() {
        for (const c of this.selectedColonists) {
            if (c.hp > 0 && !c.drafted) {
                this.toggleDraft(c.id);
            }
        }
    }

    undraftAllSelected() {
        for (const c of this.selectedColonists) {
            if (c.hp > 0 && c.drafted) {
                this.toggleDraft(c.id);
            }
        }
    }

    assignBedFromSelect(x, y, colonistIdStr) {
        const colonistId = parseInt(colonistIdStr);
        if (!colonistId) return;
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c) return;
        c.assignedBed = { x, y };
        this.notifications.push({ text: `${c.name} assigned to bed at (${x},${y})`, tick: this.tick, type: 'success' });
        const tile = this.map[y][x];
        this.ui.showTileInfo(tile, x, y);
    }

    unassignBed(x, y) {
        const c = this.colonists.find(col =>
            col.assignedBed && col.assignedBed.x === x && col.assignedBed.y === y
        );
        if (c) {
            c.assignedBed = null;
            this.notifications.push({ text: `${c.name} unassigned from bed`, tick: this.tick, type: 'success' });
            const tile = this.map[y][x];
            this.ui.showTileInfo(tile, x, y);
        }
    }

    selectColonistById(colonistId) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c || c.hp <= 0) return;
        this.selectedColonist = c;
        this.selectedColonists = [c];
        this.camera.centerOn(c.x, c.y);
        this.ui.showColonistInfo(c);
    }

    centerOnColonist(colonistId) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c || c.hp <= 0) return;
        this.camera.centerOn(c.x, c.y);
    }

    toggleFollow(colonistId) {
        if (this.followingColonist === colonistId) {
            this.followingColonist = null;
            this.notifications.push({ text: 'Camera unfollowed', tick: this.tick, type: 'success' });
        } else {
            this.followingColonist = colonistId;
            const c = this.colonists.find(col => col.id === colonistId);
            if (c) {
                this.notifications.push({ text: `Following ${c.name}`, tick: this.tick, type: 'success' });
            }
        }
        if (this.selectedColonist) this.ui.showColonistInfo(this.selectedColonist);
    }

    equipWeapon(colonistId) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c) return;
        const weapon = this.resources.takeWeapon();
        if (weapon) {
            if (c.weapon) this.resources.addWeapon(c.weapon);
            c.weapon = weapon;
            this.notifications.push({ text: `${c.name} equipped ${weapon.name}`, tick: this.tick, type: 'success' });
            this.ui.showColonistInfo(c);
        } else {
            this.notifications.push({ text: 'No weapons available! Craft some first.', tick: this.tick, type: 'danger' });
        }
    }

    huntAnimal(animalId) {
        designateHunt(this, animalId);
    }

    craft(recipeKey) {
        if (queueCraftingOrder(this, recipeKey)) {
            this.notifications.push({ text: `Queued: ${recipeKey.replace(/_/g, ' ')}`, tick: this.tick, type: 'success' });
        }
    }

    resolveEvent(choice) {
        const evt = this.events.pendingEvent;
        if (!evt) return;
        if (evt.type === 'wanderer') {
            this.events.resolveWanderer(this, choice === 0);
            if (this.paused) this.togglePause();
        } else if (evt.type === 'caravan') {
            this.events.resolveCaravan(this, choice);
            if (this.paused) this.togglePause();
        } else if (evt.type === 'raid') {
            if (choice === 0) {
                this.camera.centerOn(evt.data.x, evt.data.y);
            }
            this.events.pendingEvent = null;
        }
    }

    togglePeaceful() {
        CONFIG.PEACEFUL_MODE = !CONFIG.PEACEFUL_MODE;
        if (CONFIG.PEACEFUL_MODE) {
            this.raiders = [];
            this.wildlife = this.wildlife.filter(a => !a.hostile);
        }
    }

    startResearch(techKey) {
        if (this.research.purchase(techKey)) {
            const name = techKey.replace(/_/g, ' ');
            this.notifications.push({ text: `Unlocked: ${name}!`, tick: this.tick, type: 'success' });
            this.eventLog.add(this, `Research unlocked: ${name}`, 'success', null);
        }
    }

    tameAnimalType(type) {
        tameAnimal(this, type);
    }

    logEvent(text, type, linkedEntity) {
        this.eventLog.add(this, text, type, linkedEntity);
    }

    jumpToEntity(entityType, entityId) {
        if (entityType === 'colonist') {
            const c = this.colonists.find(col => col.id === entityId);
            if (c) {
                this.camera.centerOn(c.x, c.y);
                this.selectedColonist = c;
                this.ui.showColonistInfo(c);
            }
        } else if (entityType === 'position') {
            this.camera.centerOn(entityId.x, entityId.y);
        }
    }

    save() {
        if (saveGame(this)) {
            this.notifications.push({ text: 'Game saved!', tick: this.tick, type: 'success' });
        }
    }

    load() {
        if (loadGame(this)) {
            this.notifications.push({ text: 'Game loaded!', tick: this.tick, type: 'success' });
            this.ui.updateModeDisplay(this.input);
        }
    }

    exportSave() {
        this.save();
        if (exportSave()) {
            this.notifications.push({ text: 'Save exported!', tick: this.tick, type: 'success' });
        }
    }
}

function fitGameFont() {
    const gameArea = document.getElementById('game-area');
    const gameEl = document.getElementById('game');
    if (!gameArea || !gameEl) return;

    const availWidth = gameArea.clientWidth - 4;
    const availHeight = gameArea.clientHeight - 4;

    const charRatio = 0.6;
    const lineHeight = 1.15;

    const fontFromWidth = availWidth / (CONFIG.VIEWPORT_WIDTH * charRatio);
    const fontFromHeight = availHeight / (CONFIG.VIEWPORT_HEIGHT * lineHeight);

    const fontSize = Math.max(5, Math.min(18, Math.floor(Math.min(fontFromWidth, fontFromHeight) * 10) / 10));

    document.documentElement.style.setProperty('--game-font-size', fontSize + 'px');

    if (window.game?.input) {
        window.game.input.measureCharSize();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const settingsPanel = document.getElementById('start-settings-panel');
    const loadBtn = document.getElementById('load-game');

    if (hasSave()) {
        loadBtn.style.display = '';
    }

    const glossaryPanel = document.getElementById('glossary-panel');

    document.getElementById('start-settings').addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        glossaryPanel.style.display = 'none';
    });

    document.getElementById('start-glossary').addEventListener('click', () => {
        glossaryPanel.style.display = glossaryPanel.style.display === 'none' ? 'block' : 'none';
        settingsPanel.style.display = 'none';
    });

    document.getElementById('start-game').addEventListener('click', () => {
        CONFIG.PEACEFUL_MODE = document.getElementById('start-peaceful-check').checked;
        const autoPauseHostile = document.getElementById('start-autopause-hostile').checked;
        const autoPauseEvent = document.getElementById('start-autopause-event').checked;

        startScreen.style.display = 'none';
        gameContainer.style.display = 'grid';
        requestAnimationFrame(() => {
            fitGameFont();
            const game = new Game();
            game.settings.autoPauseHostile = autoPauseHostile;
            game.settings.autoPauseEvent = autoPauseEvent;
            game.start();
        });
    });

    loadBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'grid';
        requestAnimationFrame(() => {
            fitGameFont();
            const game = new Game();
            game.load();
            game.start();
        });
    });

    const importFileInput = document.getElementById('import-file');
    document.getElementById('import-game').addEventListener('click', () => {
        importFileInput.click();
    });
    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const success = await importSave(file);
        if (success) {
            loadBtn.style.display = '';
            startScreen.style.display = 'none';
            gameContainer.style.display = 'grid';
            requestAnimationFrame(() => {
                fitGameFont();
                const game = new Game();
                game.load();
                game.start();
            });
        } else {
            alert('Invalid save file.');
        }
        importFileInput.value = '';
    });

    window.addEventListener('resize', fitGameFont);
});
