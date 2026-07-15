import { CONFIG, RESEARCH } from './config.js';
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
import { WaveSystem } from './waves.js';
import { EventLog } from './eventlog.js';
import { saveGame, loadGame, hasSave, exportSave, importSave } from './save.js';
import { initResizeHandles } from './resize.js';

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
            tabbedFooter: false,
            uiFontSize: 12,
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
        this.waves = new WaveSystem();
        this.eventLog = new EventLog();

        this.colonists = [];
        this.wildlife = [];
        this.raiders = [];
        this.tamedAnimals = [];
        this.combatEffects = [];
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
            const existingNames = this.colonists.map(c => c.name);
            const c = createColonist(cx + i - 1, cy, biases[i], existingNames);
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
        requestAnimationFrame(() => resetMinimapSize());
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

        const prevSeason = this.weather.season;
        this.weather.update(this.tick);
        if (this.weather.season !== prevSeason) {
            this.eventLog.add(this, `Season changed to ${this.weather.season} (Year ${this.weather.year})`, 'event', null);
        }
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

        this.combatEffects = this.combatEffects.filter(e => e.ttl-- > 0);

        updateWildlife(this);
        this.combat.update(this);
        this.waves.update(this);
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

    setSpeed(val) {
        this.speed = Math.max(1, Math.min(5, val));
        if (this.paused) this.togglePause();
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

    startWave() {
        if (this.waves.startWave(this)) {
            this.camera.centerOn(this.waves.nexusPosition.x, this.waves.nexusPosition.y);
        } else if (this.waves.active) {
            this.notifications.push({ text: 'A wave is already in progress!', tick: this.tick, type: 'danger' });
        } else {
            this.notifications.push({ text: 'Build a Void Nexus first!', tick: this.tick, type: 'danger' });
        }
    }

    equipArmor(colonistId) {
        const c = this.colonists.find(col => col.id === colonistId);
        if (!c) return;
        const armor = this.resources.takeArmor();
        if (armor) {
            if (c.armor) this.resources.addArmor(c.armor);
            c.armor = armor;
            this.notifications.push({ text: `${c.name} equipped ${armor.name}`, tick: this.tick, type: 'success' });
            this.ui.showColonistInfo(c);
        } else {
            this.notifications.push({ text: 'No armor available! Craft some first.', tick: this.tick, type: 'danger' });
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

    cheatResources() {
        for (const key of Object.keys(this.resources.stockpile)) {
            this.resources.stockpile[key] = 999;
        }
        this.research.studyPoints = 999;
        for (const key of Object.keys(RESEARCH)) {
            this.research.completed.add(key);
        }
        this.notifications.push({ text: '[DEBUG] 999 resources + all research granted', tick: this.tick, type: 'success' });
    }
}

const CHAR_RATIO = 0.6;
const LINE_HEIGHT = 1.15;
const MIN_FONT = 6;
const MAX_FONT = 24;
const ZOOM_STEP = 2;

let currentZoomFont = null;

function fitGameFont() {
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;

    const availWidth = gameArea.clientWidth - 4;
    const availHeight = gameArea.clientHeight - 4;

    if (currentZoomFont === null) {
        const isSmall = window.innerWidth <= 768;
        currentZoomFont = isSmall ? 10 : 14;
    }

    const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, currentZoomFont));
    currentZoomFont = fontSize;

    CONFIG.VIEWPORT_WIDTH = Math.max(20, Math.floor(availWidth / (fontSize * CHAR_RATIO)));
    CONFIG.VIEWPORT_HEIGHT = Math.max(10, Math.floor(availHeight / (fontSize * LINE_HEIGHT)));

    document.documentElement.style.setProperty('--game-font-size', fontSize + 'px');

    if (window.game?.input) {
        window.game.input.measureCharSize();
    }
    if (window.game?.camera) {
        window.game.camera.clamp();
    }
}

function zoomIn() {
    if (currentZoomFont === null) currentZoomFont = 14;
    currentZoomFont = Math.min(MAX_FONT, currentZoomFont + ZOOM_STEP);
    fitGameFont();
}

function zoomOut() {
    if (currentZoomFont === null) currentZoomFont = 14;
    currentZoomFont = Math.max(MIN_FONT, currentZoomFont - ZOOM_STEP);
    fitGameFont();
}

window.zoomIn = zoomIn;
window.zoomOut = zoomOut;

function resetMinimapSize() {
    const container = document.getElementById('minimap-container');
    const canvas = document.getElementById('minimap');
    const controls = document.getElementById('minimap-controls');
    if (!container || !canvas || !controls) return;

    const footerContent = document.getElementById('footer-content');
    const availHeight = footerContent.clientHeight - 10;
    const aspect = canvas.width / canvas.height;
    const fittedWidth = Math.ceil(availHeight * aspect);
    const minWidth = controls.offsetWidth + 14;
    const controlsWidth = controls.offsetWidth + 4 + 10;

    const totalWidth = footerContent.clientWidth;
    const resizeHandles = footerContent.querySelectorAll('.footer-panel-resize');
    const handleSpace = resizeHandles.length * 5;
    const panels = footerContent.querySelectorAll('.footer-panel');
    const gapTotal = 4 * (footerContent.children.length - 1);
    const minPanelSpace = panels.length * 60;
    const maxWidth = totalWidth - minPanelSpace - handleSpace - gapTotal;

    const idealWidth = Math.max(minWidth, Math.min(maxWidth, fittedWidth + controlsWidth));

    container.style.flex = `0 0 ${idealWidth}px`;
}

window.resetMinimapSize = resetMinimapSize;

function setUIFontSize(size) {
    document.documentElement.style.setProperty('--ui-font-size', size + 'px');
    const label = document.getElementById('ui-font-size-val');
    if (label) label.textContent = size + 'px';
    window.resetMinimapSize?.();
}

window.setUIFontSize = setUIFontSize;

function initFooterTabs() {
    const footer = document.getElementById('game-footer');
    const container = document.getElementById('game-container');
    const infoPanel = document.getElementById('info-panel');
    const footerContent = document.getElementById('footer-content');

    if (window.innerWidth <= 768) {
        container.classList.add('tabbed-mode');
        footerContent.insertBefore(infoPanel, footerContent.firstChild);
        infoPanel.classList.add('active');
        footer.querySelector('.footer-tab[data-tab="info"]').classList.add('active');
    }

    footer.addEventListener('transitionend', () => fitGameFont());

    footer.addEventListener('click', (e) => {
        const tab = e.target.closest('.footer-tab[data-tab]');
        if (!tab) return;

        const target = tab.dataset.tab;


        const isTabbed = footer.classList.contains('tabbed') || window.innerWidth <= 768;
        if (!isTabbed) return;

        if (footer.classList.contains('collapsed')) {
            footer.classList.remove('collapsed');
        }

        const tabs = footer.querySelectorAll('.footer-tab[data-tab]');
        const panels = footer.querySelectorAll('#footer-content > .footer-panel, #minimap-container');
        tabs.forEach(t => {
            if (t.dataset.tab !== 'collapse') t.classList.remove('active');
        });
        tab.classList.add('active');
        panels.forEach(p => p.classList.remove('active'));

        if (target === 'info') {
            infoPanel.classList.add('active');
        } else if (target === 'colonists') {
            document.getElementById('colonist-hud').classList.add('active');
        } else if (target === 'log') {
            document.getElementById('event-log').classList.add('active');
        } else if (target === 'minimap') {
            document.getElementById('minimap-container').classList.add('active');
        }
    });
}

function setFooterMode(tabbed) {
    const footer = document.getElementById('game-footer');
    const container = document.getElementById('game-container');
    const infoPanel = document.getElementById('info-panel');
    const footerContent = document.getElementById('footer-content');

    if (tabbed) {
        footer.classList.add('tabbed');
        container.classList.add('tabbed-mode');
        footerContent.insertBefore(infoPanel, footerContent.firstChild);
        const panels = footer.querySelectorAll('#footer-content > .footer-panel, #minimap-container');
        panels.forEach(p => p.classList.remove('active'));
        infoPanel.classList.add('active');
        const tabs = footer.querySelectorAll('.footer-tab[data-tab]');
        tabs.forEach(t => { if (t.dataset.tab !== 'collapse') t.classList.remove('active'); });
        footer.querySelector('.footer-tab[data-tab="info"]').classList.add('active');
    } else {
        footer.classList.remove('tabbed');
        container.classList.remove('tabbed-mode');
        container.insertBefore(infoPanel, footer);
        infoPanel.classList.remove('active');
    }
    fitGameFont();
}

window.setFooterMode = setFooterMode;

function initPanelOverlay() {
    const overlay = document.getElementById('panel-overlay');
    overlay.addEventListener('click', () => {
        if (!window.game?.ui) return;
        const ui = window.game.ui;
        if (ui.priorityPanelVisible) ui.togglePriorityPanel();
        if (ui.craftPanelVisible) ui.toggleCraftPanel();
        if (ui.researchPanelVisible) ui.toggleResearchPanel();
        if (ui.inventoryVisible) ui.toggleInventoryPanel();
        if (ui.tamingPanelVisible) ui.toggleTamingPanel();
        if (ui.settingsPanelVisible) ui.toggleSettingsPanel();
    });
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
    const modalBackdrop = document.getElementById('modal-backdrop');

    function closeModals() {
        settingsPanel.style.display = 'none';
        glossaryPanel.style.display = 'none';
        modalBackdrop.style.display = 'none';
    }

    document.getElementById('start-settings').addEventListener('click', () => {
        const opening = settingsPanel.style.display === 'none';
        closeModals();
        if (opening) {
            settingsPanel.style.display = 'block';
            modalBackdrop.style.display = 'block';
        }
    });

    document.getElementById('start-glossary').addEventListener('click', () => {
        const opening = glossaryPanel.style.display === 'none';
        closeModals();
        if (opening) {
            glossaryPanel.style.display = 'block';
            modalBackdrop.style.display = 'block';
        }
    });

    modalBackdrop.addEventListener('click', closeModals);

    document.getElementById('start-game').addEventListener('click', () => {
        CONFIG.PEACEFUL_MODE = document.getElementById('start-peaceful-check').checked;
        const autoPauseHostile = document.getElementById('start-autopause-hostile').checked;
        const autoPauseEvent = document.getElementById('start-autopause-event').checked;
        const tabbedFooter = document.getElementById('start-tabbed-footer').checked;
        const uiFontSize = parseInt(document.getElementById('start-ui-font-size').value) || 12;

        startScreen.style.display = 'none';
        gameContainer.style.display = 'grid';
        initFooterTabs();
        initPanelOverlay();
        initResizeHandles(fitGameFont);
        if (tabbedFooter) setFooterMode(true);
        setUIFontSize(uiFontSize);
        requestAnimationFrame(() => {
            fitGameFont();
            const game = new Game();
            game.settings.autoPauseHostile = autoPauseHostile;
            game.settings.autoPauseEvent = autoPauseEvent;
            game.settings.tabbedFooter = tabbedFooter;
            game.settings.uiFontSize = uiFontSize;
            game.start();
        });
    });

    loadBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'grid';
        initFooterTabs();
        initPanelOverlay();
        initResizeHandles(fitGameFont);
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
            initFooterTabs();
            initPanelOverlay();
            initResizeHandles(fitGameFont);
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
