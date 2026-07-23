import { CONFIG, GAME_VERSION, RESEARCH, BUILDINGS, FOOD_DECAY_CONFIG, SPELL_TOMES, SPELLS, COMBAT_VISUALS, TAMED_ANIMALS, GOLEM_TYPES, ARTIFACTS, WEAPONS, ARMORS, TOOLS, SKILLS, EVENTS } from './config.js';
import { generateMap } from '../world/map.js';
import { Camera } from '../ui/camera.js';
import { Renderer } from '../ui/renderer.js';
import { InputHandler } from '../ui/input.js';
import { createColonist, createGolem, updateColonist, addThought, grantCastXp } from '../entities/colonist.js';
import { TaskQueue } from './tasks.js';
import { ResourceManager } from '../systems/resources.js';
import { detectRooms } from '../world/rooms.js';
import { updateFarming } from '../systems/farming.js';
import { queueCraftingOrder, updateAutoCook } from '../systems/crafting.js';
import { Weather } from '../world/weather.js';
import { updateWildlife, designateHunt, createAnimal } from '../entities/wildlife.js';
import { CombatSystem } from '../entities/combat.js';
import { EventSystem, updateFires } from '../systems/events.js';
import { UI } from '../ui/ui.js';
import { Minimap } from '../ui/minimap.js';
import { ResearchSystem, updateResearch } from '../systems/research.js';
import { updateTamedAnimals, designateTame } from '../entities/taming.js';
import { PowerSystem } from '../systems/power.js';
import { getPedestalEffect } from '../systems/artifacts.js';
import { ExplorationSystem } from '../systems/exploration.js';
import { WaveSystem } from '../entities/waves.js';
import { EventLog } from '../ui/eventlog.js';
import { saveGame, loadGame, hasSave, exportSave, importSave } from './save.js';
import { initResizeHandles } from '../ui/resize.js';
import { SpatialHash } from '../world/spatial.js';
import { MapIndex } from '../world/mapindex.js';
import { renderGlossaryHTML, initGlossaryInteraction } from '../ui/glossary.js';
import { renderChangelogHTML, initChangelogInteraction, renderCreditsHTML } from '../ui/changelog.js';
import { checkComplexStructures } from '../systems/complexBuildings.js';

class Game {
    constructor() {
        this.tick = 74;
        this.paused = false;
        this.speed = 1;
        this.accumulator = 0;
        this.lastTime = 0;
        this.timeOfDay = 75;
        this.settings = {
            autoPauseHostile: true,
            autoPauseEvent: true,
            pauseOnDeath: false,
            uiFontSize: 12,
            autoCookTarget: 0,
            showOverlays: true,
            showNightLighting: true,
            showWeatherParticles: true,
            showColonistNames: 'selected',
            showMinimap: true,
            showFps: false,
            autoSaveInterval: 60,
        };
        this._fpsFrames = 0;
        this._fpsLastTime = 0;
        this._fpsDisplay = 0;

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
        this.exploration = new ExplorationSystem();
        this.eventLog = new EventLog();

        this.colonists = [];
        this._colonistById = new Map();
        this.wildlife = [];
        this.raiders = [];
        this.tamedAnimals = [];
        this.combatEffects = [];
        this.divinationModifiers = [];
        this.activeComplexStructures = [];
        this.overlays = [];
        this.notifications = [];
        this.cursor = null;
        this.selectedColonist = null;
        this.selectedColonists = [];
        this.followingColonist = null;
        this.roomsDirty = true;

        this.spatial = {
            hostiles: new SpatialHash(),
            colonists: new SpatialHash(),
        };
        this.mapIndex = new MapIndex();

        this.spawnStartingColonists();
        this.spawnStartingWildlife();

        const gameContainer = document.getElementById('game');
        this.renderer = new Renderer(gameContainer);
        this.ui = new UI(this);
        this.input = new InputHandler(this, this.renderer.canvas);
        this.minimap = new Minimap(document.getElementById('minimap'), this);
        this.ui.updateModeDisplay(this.input);

        window.game = this;
        this.gameLoop = this.gameLoop.bind(this);
    }

    // O(1) colonist lookup by id — always use this instead of colonists.find()
    getColonist(id) {
        return this._colonistById.get(id) || null;
    }

    addColonist(colonist) {
        this.colonists.push(colonist);
        this._colonistById.set(colonist.id, colonist);
    }

    rebuildColonistIndex() {
        this._colonistById.clear();
        for (const c of this.colonists) this._colonistById.set(c.id, c);
    }

    spawnStartingColonists() {
        const cx = Math.floor(CONFIG.MAP_WIDTH / 2);
        const cy = Math.floor(CONFIG.MAP_HEIGHT / 2);
        const biases = ['building', 'farming', 'crafting'];
        for (let i = 0; i < 3; i++) {
            const existingNames = this.colonists.map(c => c.name);
            const c = createColonist(cx + i - 1, cy, biases[i], existingNames);
            c.priorities[biases[i]] = 1;
            this.addColonist(c);
        }
    }

    spawnStartingWildlife() {
        const types = ['deer', 'deer', 'rabbit', 'rabbit', 'rabbit', 'chicken', 'chicken', 'cow', 'sheep'];
        for (const type of types) {
            const x = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
            const y = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
            const tile = this.map[y][x];
            if (tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'tall_rock' || tile.resource) continue;
            this.wildlife.push(createAnimal(type, x, y));
        }
    }

    start() {
        this.paused = true;
        document.getElementById('game').classList.add('paused');
        document.getElementById('pause-overlay').style.display = 'block';
        this.mapIndex.rebuild(this.map);
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

            if (this.settings.autoSaveInterval > 0) {
                if (!this._lastAutoSaveTime) this._lastAutoSaveTime = timestamp;
                if (timestamp - this._lastAutoSaveTime >= this.settings.autoSaveInterval * 1000) {
                    this._lastAutoSaveTime = timestamp;
                    if (saveGame(this)) {
                        this.notifications.push({ text: 'Auto-saved', tick: this.tick, type: 'success' });
                    }
                }
            }
        }

        if (this.followingColonist) {
            const fc = this.getColonist(this.followingColonist);
            if (fc && fc.hp > 0) {
                this.camera.centerOn(fc.x, fc.y);
            } else {
                this.followingColonist = null;
            }
        }

        this.renderer.render(this);
        if (this.settings.showFps) {
            this._fpsFrames++;
            if (timestamp - this._fpsLastTime >= 1000) {
                this._fpsDisplay = this._fpsFrames;
                this._fpsFrames = 0;
                this._fpsLastTime = timestamp;
            }
            this.renderer.renderFps(this._fpsDisplay);
        }
        if (this.settings.showMinimap) this.minimap.render();
        this.ui.update();
        requestAnimationFrame(this.gameLoop);
    }

    simulationTick() {
        this.tick++;
        this.timeOfDay = this.tick % CONFIG.TICKS_PER_DAY;

        // Rebuild spatial hashes for this tick
        const hostileEntities = [];
        for (const w of this.wildlife) { if (w.hostile && w.hp > 0) hostileEntities.push(w); }
        for (const r of this.raiders) { if (r.hp > 0) hostileEntities.push(r); }
        if (this.waves) { for (const e of this.waves.enemies) { if (e.hp > 0) hostileEntities.push(e); } }
        this.spatial.hostiles.rebuild(hostileEntities);
        this.spatial.colonists.rebuild(this.colonists);

        const prevSeason = this.weather.season;
        this.weather.update(this.tick, this.divinationModifiers);
        if (this.weather.season !== prevSeason) {
            this.eventLog.add(this, `Season changed to ${this.weather.season} (Year ${this.weather.year})`, 'event', null);
        }
        if (this.tick % 50 === 0) {
            this.weather.applySnow(this.map);
        }

        if (this.tick % FOOD_DECAY_CONFIG.decayInterval === 0) {
            const lost = this.resources.decayFood(this);
            if (lost >= 5) {
                this.eventLog.add(this, `${lost} food spoiled`, 'warning', null);
            }
        }

        if (this.roomsDirty) {
            detectRooms(this.map);
            this.mapIndex.rebuild(this.map);
            checkComplexStructures(this);
            this.roomsDirty = false;
        }

        if (this.tick % 5 === 0) {
            updateFarming(this);
            updateResearch(this);
        }

        if (this.tick % 10 === 0) {
            this.power.update(this);
            updateTamedAnimals(this);
            updateAutoCook(this);
            updateAutoRepair(this);
            for (const c of this.colonists) {
                c.pedestalWorkBonus = 0;
                c.pedestalDamageBonus = 1;
                c.pedestalSkillBonus = 0;
                c.activeAuras = [];
            }
            updatePedestals(this);
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
        if (this.divinationModifiers) {
            this.divinationModifiers = this.divinationModifiers.filter(m => m.expiresAt > this.tick);
        }
        this.overlays = this.overlays.filter(o => o.ttl !== undefined && o.ttl-- > 0);

        for (const c of this.colonists) {
            if (c.hp > 0 && c.state === 'working' && c.workProgress > 0) {
                this.overlays.push({
                    type: 'progress_bar', x: c.x, y: c.y,
                    progress: c.workProgress, color: '#44cc44', bgColor: '#222222',
                });
            }
        }

        updateWildlife(this);
        this.combat.update(this);
        this.waves.update(this);
        this.exploration.update(this);
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
        const c = this.getColonist(colonistId);
        if (!c) return;
        c.priorities[skill] = (c.priorities[skill] + 1) % 6;
    }

    toggleDraft(colonistId) {
        const c = this.getColonist(colonistId);
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

    toggleGuard(colonistId) {
        const c = this.getColonist(colonistId);
        if (!c || c.hp <= 0) return;
        c.guardMode = !c.guardMode;
        if (c.guardMode) {
            c.guardPost = { x: c.x, y: c.y };
            c.drafted = false;
            c.draftTarget = null;
            if (c.currentTaskId) {
                this.taskQueue.release(c.currentTaskId);
                c.currentTaskId = null;
            }
            c.state = 'idle';
        } else {
            c.guardPost = null;
            c.state = 'idle';
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
        const c = this.getColonist(colonistId);
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

    placePedestalArtifact(x, y, artifactKey) {
        const tile = this.map[y][x];
        if (tile.structure !== 'artifact_pedestal' || tile.pedestalArtifact) return;
        if (!ARTIFACTS[artifactKey]?.pedestal) return;
        this.resources.removeArtifact(artifactKey);
        tile.pedestalArtifact = artifactKey;
        this.notifications.push({ text: `Placed ${ARTIFACTS[artifactKey].name} on pedestal`, tick: this.tick, type: 'success' });
        this.ui.showTileInfo(tile, x, y);
    }

    retrievePedestalArtifact(x, y) {
        const tile = this.map[y][x];
        if (tile.structure !== 'artifact_pedestal' || !tile.pedestalArtifact) return;
        const key = tile.pedestalArtifact;
        tile.pedestalArtifact = null;
        tile.pedestalInactive = false;
        this.resources.addArtifact(key);
        this.notifications.push({ text: `Retrieved ${ARTIFACTS[key].name} from pedestal`, tick: this.tick, type: 'success' });
        this.ui.showTileInfo(tile, x, y);
    }

    selectColonistById(colonistId) {
        const c = this.getColonist(colonistId);
        if (!c || c.hp <= 0) return;
        this.selectedColonist = c;
        this.selectedColonists = [c];
        this.camera.centerOn(c.x, c.y);
        this.ui.showColonistInfo(c);
    }

    centerOnColonist(colonistId) {
        const c = this.getColonist(colonistId);
        if (!c || c.hp <= 0) return;
        this.camera.centerOn(c.x, c.y);
    }

    setColonistColor(colonistId, color) {
        const c = this.getColonist(colonistId);
        if (!c) return;
        c.nameColor = color;
        this.ui.showColonistInfo(c);
    }

    toggleFollow(colonistId) {
        if (this.followingColonist === colonistId) {
            this.followingColonist = null;
            this.notifications.push({ text: 'Camera unfollowed', tick: this.tick, type: 'success' });
        } else {
            this.followingColonist = colonistId;
            const c = this.getColonist(colonistId);
            if (c) {
                this.notifications.push({ text: `Following ${c.name}`, tick: this.tick, type: 'success' });
            }
        }
        if (this.selectedColonist) this.ui.showColonistInfo(this.selectedColonist);
    }

    // Generic equip: takes item from inventory, swaps with colonist's slot
    _equipItem(colonistId, index, slot, listName, addMethod) {
        const c = this.getColonist(colonistId);
        if (!c) return;
        const list = this.resources[listName];
        if (index === undefined || index < 0 || index >= list.length) return;
        const item = list.splice(index, 1)[0];
        if (c[slot]) this.resources[addMethod](c[slot]);
        c[slot] = item;
        this.notifications.push({ text: `${c.name} equipped ${item.name}`, tick: this.tick, type: 'success' });
        if (slot === 'artifact') this._updateColonistRadiusHighlight(c);
        this.ui.showColonistInfo(c);
    }

    // Generic unequip: returns item to inventory, clears colonist slot
    _unequipItem(colonistId, slot, addMethod, label) {
        const c = this.getColonist(colonistId);
        if (!c || !c[slot]) return;
        this.resources[addMethod](c[slot]);
        c[slot] = null;
        this.notifications.push({ text: `${c.name} unequipped ${label}`, tick: this.tick, type: 'success' });
        if (slot === 'artifact') this._updateColonistRadiusHighlight(c);
        this.ui.showColonistInfo(c);
    }

    _updateColonistRadiusHighlight(c) {
        if (c.artifact && !c.artifactBroken && c.artifact.pedestal?.radius && c.artifact.pedestal.radius !== 'global') {
            this.radiusHighlight = { x: c.x, y: c.y, radius: c.artifact.pedestal.radius, color: '#ccaa4466' };
        } else {
            this.radiusHighlight = null;
        }
    }

    // Generic discard: removes item from inventory
    _discardItem(index, listName) {
        const list = this.resources[listName];
        if (index < 0 || index >= list.length) return;
        const item = list.splice(index, 1)[0];
        this.notifications.push({ text: `Discarded ${item.name}`, tick: this.tick, type: 'event' });
        this.ui.updateInventoryPanel();
    }

    equipWeapon(colonistId, index) { this._equipItem(colonistId, index, 'weapon', 'weapons', 'addWeapon'); }
    unequipWeapon(colonistId) { this._unequipItem(colonistId, 'weapon', 'addWeapon', 'weapon'); }

    huntAnimal(animalId) {
        designateHunt(this, animalId);
    }

    craft(recipeKey) {
        if (queueCraftingOrder(this, recipeKey)) {
            this.notifications.push({ text: `Queued: ${recipeKey.replace(/_/g, ' ')}`, tick: this.tick, type: 'success' });
        }
    }

    craftMultiple(recipeKey, count) {
        let queued = 0;
        for (let i = 0; i < count; i++) {
            if (queueCraftingOrder(this, recipeKey)) queued++;
            else break;
        }
        if (queued > 0) {
            this.notifications.push({ text: `Queued ${queued}x: ${recipeKey.replace(/_/g, ' ')}`, tick: this.tick, type: 'success' });
        }
    }

    resolveEvent(choice) {
        const evt = this.events.pendingEvent;
        if (!evt) return;
        if (evt.type === 'wanderer') {
            this.events.resolveWanderer(this, choice === 0);
            if (this.paused) this.togglePause();
        } else if (evt.type === 'caravan' || evt.type === 'trade') {
            this.events.resolveCaravan(this, choice);
            if (this.paused) this.togglePause();
        } else if (evt.type === 'raid') {
            if (choice === 0) {
                this.camera.centerOn(evt.data.x, evt.data.y);
            }
            this.events.pendingEvent = null;
        }
    }

    openTradePanel() {
        this.ui._tradeOpen = true;
        this.ui._tradeOffer = {};
        this.ui._tradeRequest = {};
        this.ui._tradeDirty = true;
    }

    tradeOffer(resource, amount) {
        if (!this.ui._tradeOffer) this.ui._tradeOffer = {};
        const max = this.resources.stockpile[resource] || 0;
        this.ui._tradeOffer[resource] = Math.min((this.ui._tradeOffer[resource] || 0) + amount, max);
        this.ui._tradeDirty = true;
    }

    tradeRequest(resource, amount) {
        if (!this.ui._tradeRequest) this.ui._tradeRequest = {};
        if (resource === '__exclusive') {
            this.ui._tradeRequest.__exclusive = 1;
        } else {
            const evt = this.events.pendingEvent;
            const max = evt?.data?.traderResources?.[resource] || 0;
            this.ui._tradeRequest[resource] = Math.min((this.ui._tradeRequest[resource] || 0) + amount, max);
        }
        this.ui._tradeDirty = true;
    }

    confirmTrade() {
        const success = this.events.executeBarterTrade(this, this.ui._tradeOffer || {}, this.ui._tradeRequest || {});
        if (success) {
            this.ui._tradeOffer = {};
            this.ui._tradeRequest = {};
        }
        this.ui._tradeDirty = true;
    }

    clearTradeSelection() {
        this.ui._tradeOffer = {};
        this.ui._tradeRequest = {};
        this.ui._tradeDirty = true;
    }

    dismissTrader() {
        this.events.dismissTrader();
        this.ui._tradeOpen = false;
        this.ui._tradeOffer = {};
        this.ui._tradeRequest = {};
    }

    toggleSettingsPanel() {
        this.ui.toggleSettingsPanel();
    }

    showGlossary() {
        const panel = document.getElementById('glossary-panel');
        const backdrop = document.getElementById('modal-backdrop');
        if (panel) panel.style.display = 'block';
        if (backdrop) backdrop.style.display = 'block';
        const search = document.getElementById('glossary-search');
        if (search) search.focus();
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

    showExpeditionSetup(dimensionKey) {
        const available = this.colonists.filter(c => c.hp > 0 && !c.onExpedition && !c.drafted);
        if (available.length === 0) {
            this.notifications.push({ text: 'No colonists available for expedition', tick: this.tick, type: 'danger' });
            return;
        }
        let html = `<div class="info-row" style="color:#33ccff;font-weight:bold;">Select Party</div>`;
        html += `<div class="info-row" style="color:#888;">Choose colonists to send:</div>`;
        for (const c of available) {
            const weaponInfo = c.weapon ? ` (${c.weapon.name})` : ' (unarmed)';
            html += `<div class="info-row"><label><input type="checkbox" class="exp-check" value="${c.id}"> ${c.name}${weaponInfo} HP:${c.hp}/${c.maxHp}</label></div>`;
        }
        const packAnimals = (this.tamedAnimals || []).filter(a => {
            const def = TAMED_ANIMALS[a.type];
            return def && def.packAnimal && a.hp > 0 && !a.onExpedition;
        });
        if (packAnimals.length > 0) {
            html += `<div class="info-row" style="color:#bbaa44;margin-top:6px;"><b>Pack Animals:</b></div>`;
            for (const a of packAnimals) {
                const def = TAMED_ANIMALS[a.type];
                html += `<div class="info-row"><label><input type="checkbox" class="exp-pack-check" value="${a.id}"> ${a.type} (+${Math.round(def.expeditionSpeedBonus * 100)}% speed)</label></div>`;
            }
        }
        html += `<div class="info-actions"><button onclick="window.game.launchExpedition('${dimensionKey}')" style="background:#1a4466;color:#88ddff;">Launch</button></div>`;
        this.ui.elements.infoPanel.innerHTML = html;
    }

    launchExpedition(dimensionKey) {
        const checks = this.ui.elements.infoPanel.querySelectorAll('.exp-check:checked');
        const ids = Array.from(checks).map(cb => parseInt(cb.value));
        if (ids.length === 0) {
            this.notifications.push({ text: 'Select at least one colonist', tick: this.tick, type: 'danger' });
            return;
        }
        const packChecks = this.ui.elements.infoPanel.querySelectorAll('.exp-pack-check:checked');
        const packIds = Array.from(packChecks).map(cb => parseInt(cb.value));
        const result = this.exploration.sendExpedition(this, dimensionKey, ids, packIds);
        if (result) {
            this.notifications.push({ text: `Expedition launched to ${result.dimensionName}!`, tick: this.tick, type: 'success' });
            this.ui._viewingRiftGate = true;
            this.ui._viewingColonistId = null;
        } else {
            this.notifications.push({ text: 'Cannot launch expedition', tick: this.tick, type: 'danger' });
        }
    }

    equipArmor(colonistId, index) { this._equipItem(colonistId, index, 'armor', 'armors', 'addArmor'); }
    unequipArmor(colonistId) { this._unequipItem(colonistId, 'armor', 'addArmor', 'armor'); }
    discardWeapon(index) { this._discardItem(index, 'weapons'); }
    discardArmor(index) { this._discardItem(index, 'armors'); }
    equipTool(colonistId, index) { this._equipItem(colonistId, index, 'tool', 'tools', 'addTool'); }
    unequipTool(colonistId) { this._unequipItem(colonistId, 'tool', 'addTool', 'tool'); }
    discardTool(index) { this._discardItem(index, 'tools'); }
    equipArtifact(colonistId, index) { this._equipItem(colonistId, index, 'artifact', 'artifacts', 'addArtifact'); }
    unequipArtifact(colonistId) { this._unequipItem(colonistId, 'artifact', 'addArtifact', 'artifact'); }

    equipTome(colonistId, index) {
        const c = this.getColonist(colonistId);
        if (!c) return;
        const tome = this.resources.takeTome(index);
        if (!tome) return;
        if (c.equippedTome) this.resources.addTome({ ...SPELL_TOMES[c.equippedTome], key: c.equippedTome });
        c.equippedTome = tome.key;
        this.notifications.push({ text: `${c.name} began studying ${tome.name}`, tick: this.tick, type: 'success' });
        this.ui.showColonistInfo(c);
    }

    unequipTome(colonistId) {
        const c = this.getColonist(colonistId);
        if (!c || !c.equippedTome) return;
        this.resources.addTome({ ...SPELL_TOMES[c.equippedTome], key: c.equippedTome });
        c.equippedTome = null;
        this.notifications.push({ text: `${c.name} stopped studying`, tick: this.tick, type: 'success' });
        this.ui.showColonistInfo(c);
    }

    startSpellTargeting(colonistId, spellKey) {
        this.input.startSpellTargeting(colonistId, spellKey);
    }

    toggleSpell(colonistId, spellKey) {
        const c = this.getColonist(colonistId);
        if (!c) return;
        if (!c.disabledSpells) c.disabledSpells = [];
        const idx = c.disabledSpells.indexOf(spellKey);
        if (idx >= 0) {
            c.disabledSpells.splice(idx, 1);
        } else {
            c.disabledSpells.push(spellKey);
        }
        this.ui.showColonistInfo(c);
    }

    castTargetedSpell(colonist, spell, pos) {
        switch (spell.effect) {
            case 'teleport': {
                colonist.x = pos.x;
                colonist.y = pos.y;
                colonist.path = [];
                this.combatEffects.push({ x: pos.x, y: pos.y, char: COMBAT_VISUALS.spellTeleportChar, color: COMBAT_VISUALS.spellTeleportColor, ttl: 3 });
                this.notifications.push({ text: `${colonist.name} warped!`, tick: this.tick, type: 'success' });
                break;
            }
            case 'boost_crops': {
                let boosted = 0;
                for (let dy = -spell.radius; dy <= spell.radius; dy++) {
                    for (let dx = -spell.radius; dx <= spell.radius; dx++) {
                        const tx = pos.x + dx;
                        const ty = pos.y + dy;
                        if (tx < 0 || ty < 0 || tx >= CONFIG.MAP_WIDTH || ty >= CONFIG.MAP_HEIGHT) continue;
                        const tile = this.map[ty][tx];
                        if (tile.zone && tile.zone.state === 'growing') {
                            if (!tile.zone._growthBoost) tile.zone._growthBoost = { mult: 1, expiresAt: 0 };
                            tile.zone._growthBoost.mult = spell.growthMult;
                            tile.zone._growthBoost.expiresAt = this.tick + spell.duration;
                            boosted++;
                        }
                        this.combatEffects.push({ x: tx, y: ty, char: COMBAT_VISUALS.spellGrowthChar, color: COMBAT_VISUALS.spellGrowthColor, ttl: 4 });
                    }
                }
                this.notifications.push({ text: `${colonist.name} cast ${spell.name} — ${boosted} crops boosted!`, tick: this.tick, type: 'success' });
                break;
            }
            case 'terraform': {
                let changed = 0;
                for (let dy = -spell.radius; dy <= spell.radius; dy++) {
                    for (let dx = -spell.radius; dx <= spell.radius; dx++) {
                        const tx = pos.x + dx;
                        const ty = pos.y + dy;
                        if (tx < 0 || ty < 0 || tx >= CONFIG.MAP_WIDTH || ty >= CONFIG.MAP_HEIGHT) continue;
                        const tile = this.map[ty][tx];
                        if (tile.terrain !== spell.targetTerrain && !tile.structure) {
                            tile.terrain = spell.targetTerrain;
                            tile.resource = null;
                            tile.passable = true;
                            changed++;
                        }
                        this.combatEffects.push({ x: tx, y: ty, char: COMBAT_VISUALS.spellTerraformChar, color: COMBAT_VISUALS.spellTerraformColor, ttl: 4 });
                    }
                }
                this.notifications.push({ text: `${colonist.name} cast ${spell.name} — ${changed} tiles transformed!`, tick: this.tick, type: 'success' });
                break;
            }
        }
        grantCastXp(colonist, spell, this);
        addThought(colonist, 'Cast a spell', 3, 80, this.tick);
    }

    discardArtifact(index) { this._discardItem(index, 'artifacts'); }

    cycleColonist(dir) {
        const alive = this.colonists.filter(c => c.hp > 0);
        if (alive.length === 0) return;
        const currentIdx = this.selectedColonist ? alive.indexOf(this.selectedColonist) : -1;
        const next = (currentIdx + dir + alive.length) % alive.length;
        this.selectColonistById(alive[next].id);
    }

    draftAll() {
        for (const c of this.colonists) {
            if (c.hp > 0 && !c.drafted) this.toggleDraft(c.id);
        }
    }

    undraftAll() {
        for (const c of this.colonists) {
            if (c.hp > 0 && c.drafted) this.toggleDraft(c.id);
        }
    }

    copyPriorities(toId, fromId) {
        const to = this.getColonist(toId);
        const from = this.getColonist(fromId);
        if (!to || !from) return;
        to.priorities = { ...from.priorities };
        this.notifications.push({ text: `${to.name} copied priorities from ${from.name}`, tick: this.tick, type: 'success' });
        this.ui.showColonistInfo(to);
    }

    rallyDrafted(x, y) {
        for (const c of this.colonists) {
            if (c.hp > 0 && c.drafted) {
                c.draftTarget = { x, y };
            }
        }
        this.notifications.push({ text: `Rally point set at (${x},${y})`, tick: this.tick, type: 'success' });
    }

    autoEquipBest(colonistId) {
        const c = this.getColonist(colonistId);
        if (!c) return;
        if (this.resources.weapons.length > 0) {
            this.resources.weapons.sort((a, b) => b.damage - a.damage);
            if (!c.weapon || this.resources.weapons[0].damage > c.weapon.damage) {
                this.equipWeapon(colonistId, 0);
            }
        }
        if (this.resources.armors.length > 0) {
            this.resources.armors.sort((a, b) => b.damageReduction - a.damageReduction);
            if (!c.armor || this.resources.armors[0].damageReduction > c.armor.damageReduction) {
                this.equipArmor(colonistId, 0);
            }
        }
        if (this.resources.tools.length > 0 && !c.tool) {
            this.equipTool(colonistId, 0);
        }
        if (this.resources.artifacts.length > 0 && !c.artifact) {
            this.equipArtifact(colonistId, 0);
        }
        this.ui.showColonistInfo(c);
    }

    tameWildAnimal(animalId) {
        designateTame(this, animalId);
    }

    craftGolem(golemType) {
        if (!this.research.isResearched('golem_craft')) return;
        const def = GOLEM_TYPES[golemType];
        if (!def) return;
        if (!this.resources.has(def.cost)) {
            this.notifications.push({ text: 'Not enough resources for golem', tick: this.tick, type: 'warning' });
            return;
        }
        this.resources.deduct(def.cost);
        const forge = this.findBuilding('golem_forge');
        const x = forge ? forge.x : this.colonists[0]?.x || 128;
        const y = forge ? forge.y : this.colonists[0]?.y || 128;
        const golem = createGolem(golemType, x, y);
        this.addColonist(golem);
        this.notifications.push({ text: `${def.name} animated!`, tick: this.tick, type: 'success' });
        this.eventLog.add(this, `Crafted a ${def.name}`, 'success', { type: 'position', x, y });
    }

    findBuilding(type) {
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                if (this.map[y][x].structure === type) return { x, y };
            }
        }
        return null;
    }

    logEvent(text, type, linkedEntity) {
        this.eventLog.add(this, text, type, linkedEntity);
    }

    jumpToEntity(entityType, entityId) {
        if (entityType === 'colonist') {
            const c = this.getColonist(entityId);
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
        this.notifications.push({ text: '[DEBUG] 999 of all resources granted', tick: this.tick, type: 'success' });
    }

    cheatGrantResearch() {
        this.research.studyPoints = 999;
        for (const key of Object.keys(RESEARCH)) {
            this.research.completed.add(key);
        }
        this.notifications.push({ text: '[DEBUG] All research completed', tick: this.tick, type: 'success' });
    }

    cheatGrantStarterSpells() {
        const starterSpells = Object.entries(SPELLS)
            .filter(([, spell]) => spell.minLevel === 0)
            .map(([key]) => key);
        let count = 0;
        for (const c of this.colonists) {
            if (c.golem || c.hp <= 0) continue;
            if (!c.knownSpells) c.knownSpells = [];
            for (const spellKey of starterSpells) {
                if (!c.knownSpells.includes(spellKey)) {
                    c.knownSpells.push(spellKey);
                }
            }
            for (const school of Object.keys(c.magicSkills || {})) {
                if (c.magicSkills[school] < 1) c.magicSkills[school] = 1;
            }
            count++;
        }
        this.notifications.push({ text: `[DEBUG] ${count} colonists granted ${starterSpells.length} starter spells + magic skills set to 1`, tick: this.tick, type: 'success' });
    }

    cheatSpawnItem(category, key) {
        switch (category) {
            case 'weapon': {
                const def = WEAPONS[key];
                if (!def) return;
                this.resources.addWeapon({ ...def, key });
                this.notifications.push({ text: `[DEBUG] Granted weapon: ${def.name}`, tick: this.tick, type: 'success' });
                break;
            }
            case 'armor': {
                const def = ARMORS[key];
                if (!def) return;
                this.resources.addArmor({ ...def, key });
                this.notifications.push({ text: `[DEBUG] Granted armor: ${def.name}`, tick: this.tick, type: 'success' });
                break;
            }
            case 'tool': {
                const def = TOOLS[key];
                if (!def) return;
                this.resources.addTool({ ...def, key });
                this.notifications.push({ text: `[DEBUG] Granted tool: ${def.name}`, tick: this.tick, type: 'success' });
                break;
            }
            case 'artifact': {
                const def = ARTIFACTS[key];
                if (!def) return;
                this.resources.addArtifact({ ...def, key });
                this.notifications.push({ text: `[DEBUG] Granted artifact: ${def.name}`, tick: this.tick, type: 'success' });
                break;
            }
        }
    }

    cheatAddResource(key, amount) {
        this.resources.add({ [key]: amount });
        this.notifications.push({ text: `[DEBUG] Granted ${amount} ${key}`, tick: this.tick, type: 'success' });
    }

    cheatSpawnColonist() {
        const skillKeys = Object.keys(SKILLS);
        const bias = skillKeys[Math.floor(Math.random() * skillKeys.length)];
        const existingNames = this.colonists.map(c => c.name);
        const edge = { x: Math.floor(CONFIG.MAP_WIDTH / 2), y: Math.floor(CONFIG.MAP_HEIGHT / 2) };
        const c = createColonist(edge.x, edge.y, bias, existingNames);
        this.addColonist(c);
        this.notifications.push({ text: `[DEBUG] Granted colonist: ${c.name} (${bias})`, tick: this.tick, type: 'success' });
    }

    cheatTriggerEvent(eventKey) {
        this.events.triggerEvent(eventKey, this);
        this.notifications.push({ text: `[DEBUG] Triggered event: ${eventKey}`, tick: this.tick, type: 'success' });
    }

    cheatAdvanceTime(ticks) {
        this.tick += ticks;
        this.notifications.push({ text: `[DEBUG] Advanced ${ticks} ticks`, tick: this.tick, type: 'success' });
    }
}

function updatePedestals(game) {
    const pedestals = game.mapIndex.getAllStructurePositions().filter(({ x, y }) => {
        const tile = game.map[y][x];
        return tile.structure === 'artifact_pedestal' && tile.pedestalArtifact;
    });
    for (const { x, y } of pedestals) {
        const tile = game.map[y][x];
        const def = ARTIFACTS[tile.pedestalArtifact];
        if (!def?.pedestal) continue;
        const mana = def.pedestal.manaCost || 0;
        if (mana > 0 && !game.power.hasPower()) {
            tile.pedestalInactive = true;
            continue;
        }
        tile.pedestalInactive = false;
        if (def.pedestal.radius === 'global') {
            for (const c of game.colonists) {
                if (c.hp <= 0) continue;
                c.activeAuras.push({ name: def.name, key: tile.pedestalArtifact, sourceType: 'pedestal', x, y });
            }
            continue;
        }
        const radius = def.pedestal.radius;
        for (const c of game.colonists) {
            if (c.hp <= 0) continue;
            const dist = Math.abs(c.x - x) + Math.abs(c.y - y);
            if (dist <= radius) {
                if (def.pedestal.workSpeedBonus) c.pedestalWorkBonus = (c.pedestalWorkBonus || 0) + def.pedestal.workSpeedBonus;
                if (def.pedestal.damageBonusMult) c.pedestalDamageBonus = (c.pedestalDamageBonus || 1) * def.pedestal.damageBonusMult;
                if (def.pedestal.skillGrowthBonus) c.pedestalSkillBonus = (c.pedestalSkillBonus || 0) + def.pedestal.skillGrowthBonus;
                c.activeAuras.push({ name: def.name, key: tile.pedestalArtifact, sourceType: 'pedestal', x, y });
            }
        }
        if (def.pedestal.blightImmunity) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) > radius) continue;
                    const ty = y + dy, tx = x + dx;
                    if (ty < 0 || ty >= game.map.length || tx < 0 || tx >= game.map[0].length) continue;
                    const cropTile = game.map[ty][tx];
                    if (cropTile.crop) cropTile.blightImmune = true;
                }
            }
        }
    }

    for (const carrier of game.colonists) {
        if (carrier.hp <= 0 || carrier.artifactBroken || carrier.onExpedition) continue;
        const art = carrier.artifact;
        if (!art?.pedestal) continue;
        if (art.pedestal.radius === 'global' || typeof art.pedestal.radius !== 'number') continue;
        const radius = art.pedestal.radius;
        for (const c of game.colonists) {
            if (c.hp <= 0) continue;
            const dist = Math.abs(c.x - carrier.x) + Math.abs(c.y - carrier.y);
            if (dist <= radius) {
                if (art.pedestal.workSpeedBonus) c.pedestalWorkBonus = (c.pedestalWorkBonus || 0) + art.pedestal.workSpeedBonus;
                if (art.pedestal.damageBonusMult) c.pedestalDamageBonus = (c.pedestalDamageBonus || 1) * art.pedestal.damageBonusMult;
                if (art.pedestal.skillGrowthBonus) c.pedestalSkillBonus = (c.pedestalSkillBonus || 0) + art.pedestal.skillGrowthBonus;
                c.activeAuras.push({ name: art.name, key: art.key, sourceType: 'colonist', colonistId: carrier.id });
            }
        }
        if (art.pedestal.blightImmunity) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) > radius) continue;
                    const ty = carrier.y + dy, tx = carrier.x + dx;
                    if (ty < 0 || ty >= game.map.length || tx < 0 || tx >= game.map[0].length) continue;
                    const cropTile = game.map[ty][tx];
                    if (cropTile.crop) cropTile.blightImmune = true;
                }
            }
        }
    }
}

function updateAutoRepair(game) {
    const allStructures = game.mapIndex.getAllStructurePositions();
    for (const { x, y } of allStructures) {
        const tile = game.map[y][x];
        if (tile.structureHp === undefined) continue;
        const maxHp = BUILDINGS[tile.structure]?.hp;
        if (!maxHp || tile.structureHp >= maxHp) continue;
        const existing = game.taskQueue.getByPosition(x, y);
        if (existing) continue;
        game.taskQueue.add({
            type: 'repair',
            skillRequired: 'building',
            x, y,
            workAmount: 15,
        });
    }
    const anvils = allStructures.filter(s => s.type === 'anvil');
    if (anvils.length === 0) return;
    for (const c of game.colonists) {
        if (c.hp <= 0 || !c.artifactBroken || !c.artifact) continue;
        if (c._repairQueued) continue;
        const anvil = anvils[0];
        const existing = game.taskQueue.getAll().find(t => t.type === 'repair_artifact' && t.colonistId === c.id);
        if (existing) continue;
        game.taskQueue.add({
            type: 'repair_artifact',
            skillRequired: 'crafting',
            x: anvil.x, y: anvil.y,
            workAmount: 40,
            colonistId: c.id,
            artifactKey: c.artifact,
        });
        c._repairQueued = true;
    }
}

const CHAR_RATIO = 0.6;
const LINE_HEIGHT = 1.15;
const MIN_FONT = 5;
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
        currentZoomFont = isSmall ? 8 : 14;
    }

    const fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, currentZoomFont));
    currentZoomFont = fontSize;

    const cellSize = fontSize * LINE_HEIGHT;
    CONFIG.VIEWPORT_WIDTH = Math.max(20, Math.floor(availWidth / cellSize));
    CONFIG.VIEWPORT_HEIGHT = Math.max(10, Math.floor(availHeight / cellSize));

    document.documentElement.style.setProperty('--game-font-size', fontSize + 'px');

    if (window.game?.renderer) {
        window.game.renderer.measureFont(fontSize);
    }
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
    const exportBtn = document.getElementById('export-game');

    const versionLabel = document.getElementById('version-label');
    if (versionLabel) versionLabel.textContent = `v${GAME_VERSION}`;

    if (hasSave()) {
        loadBtn.disabled = false;
        exportBtn.disabled = false;
    }

    const glossaryPanel = document.getElementById('glossary-panel');
    const creditsPanel = document.getElementById('credits-panel');
    const changelogPanel = document.getElementById('changelog-panel');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const glossaryBody = document.getElementById('glossary-body');
    if (glossaryBody) {
        glossaryBody.innerHTML = renderGlossaryHTML();
        initGlossaryInteraction();
    }
    const creditsBody = document.getElementById('credits-body');
    if (creditsBody) {
        creditsBody.innerHTML = renderCreditsHTML();
    }
    const changelogBody = document.getElementById('changelog-body');
    if (changelogBody) {
        changelogBody.innerHTML = renderChangelogHTML();
        initChangelogInteraction();
    }

    function closeModals() {
        settingsPanel.style.display = 'none';
        glossaryPanel.style.display = 'none';
        creditsPanel.style.display = 'none';
        changelogPanel.style.display = 'none';
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

    document.getElementById('start-credits').addEventListener('click', () => {
        const opening = creditsPanel.style.display === 'none';
        closeModals();
        if (opening) {
            creditsPanel.style.display = 'block';
            modalBackdrop.style.display = 'block';
        }
    });

    document.getElementById('start-changelog').addEventListener('click', () => {
        const opening = changelogPanel.style.display === 'none';
        closeModals();
        if (opening) {
            changelogPanel.style.display = 'block';
            modalBackdrop.style.display = 'block';
        }
    });

    modalBackdrop.addEventListener('click', closeModals);

    // Shared transition from start screen into active game
    function launchGame(setup) {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'grid';
        initFooterTabs();
        initPanelOverlay();
        initResizeHandles(fitGameFont);
        if (window.innerWidth <= 768) setFooterMode(true);
        requestAnimationFrame(() => {
            fitGameFont();
            const game = new Game();
            setup(game);
            fitGameFont();
            game.start();
        });
    }

    document.getElementById('start-game').addEventListener('click', () => {
        CONFIG.PEACEFUL_MODE = document.getElementById('start-peaceful-check').checked;
        const startSettings = {
            autoPauseHostile: document.getElementById('start-autopause-hostile').checked,
            autoPauseEvent: document.getElementById('start-autopause-event').checked,
            pauseOnDeath: document.getElementById('start-pause-death').checked,
            autoCookTarget: parseInt(document.getElementById('start-autocook').value) || 0,
            autoSaveInterval: parseInt(document.getElementById('start-autosave').value) || 0,
            showOverlays: document.getElementById('start-overlays').checked,
            showNightLighting: document.getElementById('start-night').checked,
            showWeatherParticles: document.getElementById('start-weather').checked,
            showMinimap: document.getElementById('start-minimap').checked,
            showFps: document.getElementById('start-fps').checked,
            showColonistNames: document.getElementById('start-names').value,
            uiFontSize: parseInt(document.getElementById('start-ui-font-size').value) || 12,
        };
        setUIFontSize(startSettings.uiFontSize);
        launchGame(game => Object.assign(game.settings, startSettings));
    });

    loadBtn.addEventListener('click', () => {
        launchGame(game => game.load());
    });

    document.getElementById('start-blueprint').addEventListener('click', () => {
        import('../editor/blueprint-editor.js').then(({ launchBlueprintEditor }) => {
            launchBlueprintEditor();
        });
    });

    const importFileInput = document.getElementById('import-file');
    document.getElementById('import-game').addEventListener('click', () => {
        importFileInput.click();
    });
    exportBtn.addEventListener('click', () => {
        exportSave();
    });

    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const success = await importSave(file);
        if (success) {
            loadBtn.disabled = false;
            exportBtn.disabled = false;
            launchGame(game => game.load());
        } else {
            alert('Invalid save file.');
        }
        importFileInput.value = '';
    });

    window.addEventListener('resize', () => {
        fitGameFont();
        const footer = document.getElementById('game-footer');
        if (!footer) return;
        const isTabbed = footer.classList.contains('tabbed');
        const shouldTab = window.innerWidth <= 768;
        if (shouldTab && !isTabbed) setFooterMode(true);
        else if (!shouldTab && isTabbed) setFooterMode(false);
    });
});
