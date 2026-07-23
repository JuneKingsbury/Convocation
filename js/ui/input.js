import { CONFIG, CROPS, BUILDINGS, BUILD_CATEGORIES, DRAG_BUILD_TYPES, SINGLE_PLACE_TYPES, SPELLS, ARTIFACTS } from '../core/config.js';
import { designateBuild, designateChop, designateMine, cancelDesignation } from '../systems/building.js';
import { designateFarmZone, removeFarmZone, CROP_RESEARCH_REQS } from '../systems/farming.js';
import { isPassable } from '../world/map.js';

export class InputHandler {
    constructor(game, preElement) {
        this.game = game;
        this.pre = preElement;
        this.mode = 'normal';
        this.buildType = 'wood_wall';
        this.cropType = 'wheat';
        this.dragStart = null;
        this.dragEnd = null;
        this.dragging = false;
        this.keysDown = new Set();
        this.touchPanMode = false;

        this.buildCategories = BUILD_CATEGORIES;
        this.buildCategory = BUILD_CATEGORIES[0];
        this.buildOptions = Object.keys(BUILDINGS).filter(k => BUILDINGS[k].category === this.buildCategory);
        this.dragBuildTypes = DRAG_BUILD_TYPES;
        this.singlePlaceTypes = SINGLE_PLACE_TYPES;
        this.cropOptions = Object.keys(CROPS);
        this.designateMode = 'chop';
        this.spellTargeting = null;

        this.charWidth = 0;
        this.charHeight = 0;
        this.measureCharSize();

        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        preElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        preElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        preElement.addEventListener('mouseup', (e) => this.onMouseUp(e));
        preElement.addEventListener('contextmenu', (e) => e.preventDefault());

        preElement.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        preElement.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        preElement.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

        this._lastPinchDist = 0;
        preElement.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        preElement.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

        preElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) window.zoomIn?.();
            else if (e.deltaY > 0) window.zoomOut?.();
        }, { passive: false });
    }

    measureCharSize() {
        const renderer = this.game.renderer;
        if (renderer && renderer.charWidth > 0) {
            const canvas = renderer.canvas;
            const rect = canvas.getBoundingClientRect();
            this.charWidth = rect.width / CONFIG.VIEWPORT_WIDTH;
            this.charHeight = rect.height / CONFIG.VIEWPORT_HEIGHT;
        } else {
            const gameEl = document.getElementById('game');
            const computedSize = gameEl
                ? getComputedStyle(gameEl).fontSize
                : '14px';

            const pre = document.createElement('pre');
            pre.style.fontFamily = "'Courier New', monospace";
            pre.style.fontSize = computedSize;
            pre.style.lineHeight = '1.15';
            pre.style.position = 'absolute';
            pre.style.visibility = 'hidden';
            pre.style.padding = '0';
            pre.style.margin = '0';
            pre.innerHTML = '<span>X</span>';
            document.body.appendChild(pre);
            const span = pre.querySelector('span');
            this.charWidth = span.getBoundingClientRect().width;
            this.charHeight = pre.getBoundingClientRect().height;
            document.body.removeChild(pre);
        }
        if (this.charWidth === 0) this.charWidth = 8.4;
        if (this.charHeight === 0) this.charHeight = 16.1;
    }

    getMouseTile(e) {
        const rect = this.pre.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const sx = Math.max(0, Math.floor(px / this.charWidth));
        const sy = Math.max(0, Math.floor(py / this.charHeight));
        return this.game.camera.screenToWorld(sx, sy);
    }

    getSelectionRect() {
        if (!this.dragging || !this.dragStart || !this.dragEnd) return null;
        return {
            x1: Math.min(this.dragStart.x, this.dragEnd.x),
            y1: Math.min(this.dragStart.y, this.dragEnd.y),
            x2: Math.max(this.dragStart.x, this.dragEnd.x),
            y2: Math.max(this.dragStart.y, this.dragEnd.y),
        };
    }

    onKeyDown(e) {
        this.keysDown.add(e.key.toLowerCase());

        switch (e.key.toLowerCase()) {
            case 'w': case 'arrowup': this.game.camera.pan(0, -3); break;
            case 's': case 'arrowdown': this.game.camera.pan(0, 3); break;
            case 'a': case 'arrowleft': this.game.camera.pan(-3, 0); break;
            case 'd': case 'arrowright': this.game.camera.pan(3, 0); break;
            case 'b': this.setMode(this.mode === 'build' ? 'normal' : 'build'); break;
            case 'z': this.setMode(this.mode === 'zone' ? 'normal' : 'zone'); break;
            case 'g': this.setMode(this.mode === 'designate' ? 'normal' : 'designate'); break;
            case 'escape': {
                if (this.spellTargeting) {
                    this.cancelSpellTargeting();
                    break;
                }
                const ui = this.game.ui;
                const hadPanel = ui.priorityPanelVisible || ui.craftPanelVisible ||
                    ui.researchPanelVisible || ui.inventoryVisible ||
                    ui.tamingPanelVisible || ui.settingsPanelVisible;
                if (hadPanel) {
                    if (ui.priorityPanelVisible) ui.togglePriorityPanel();
                    if (ui.craftPanelVisible) ui.toggleCraftPanel();
                    if (ui.researchPanelVisible) ui.toggleResearchPanel();
                    if (ui.inventoryVisible) ui.toggleInventoryPanel();
                    if (ui.tamingPanelVisible) ui.toggleTamingPanel();
                    if (ui.settingsPanelVisible) ui.toggleSettingsPanel();
                } else if (this.mode !== 'normal') {
                    this.setMode('normal');
                }
                break;
            }
            case 'p': this.game.ui.togglePriorityPanel(); break;
            case 'c': this.game.ui.toggleCraftPanel(); break;
            case 'r':
                if (this.mode === 'normal') this.game.ui.toggleResearchPanel();
                break;
            case 't': this.game.ui.toggleTamingPanel(); break;
            case 'i': this.game.ui.toggleInventoryPanel(); break;
            case ',': this.game.ui.toggleSettingsPanel(); break;
            case ' ':
                e.preventDefault();
                this.game.togglePause();
                break;
            case '=': case '+': window.zoomIn?.(); break;
            case '-': window.zoomOut?.(); break;
            case '>': this.game.speedUp(); break;
            case '<': this.game.speedDown(); break;
            case '/': window.resetMinimapSize?.(); break;
            case '[': this.game.cycleColonist(-1); break;
            case ']': this.game.cycleColonist(1); break;
            case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
                this.handleNumberKey(e.key === '0' ? 10 : parseInt(e.key));
                break;
            case 'tab':
                e.preventDefault();
                if (this.mode === 'build') {
                    this.cycleBuildCategory(e.shiftKey ? -1 : 1);
                } else if (this.mode === 'designate') {
                    this.designateMode = this.designateMode === 'chop' ? 'mine' : 'chop';
                    this.game.ui.updateModeDisplay(this);
                }
                break;
        }
    }

    onKeyUp(e) {
        this.keysDown.delete(e.key.toLowerCase());
    }

    handleNumberKey(num) {
        if (this.mode === 'build') {
            const idx = num - 1;
            if (idx < this.buildOptions.length) {
                this.buildType = this.buildOptions[idx];
                this.game.ui.updateModeDisplay(this);
            }
        } else if (this.mode === 'zone') {
            const idx = num - 1;
            if (idx < this.cropOptions.length) {
                const crop = this.cropOptions[idx];
                const req = CROP_RESEARCH_REQS[crop];
                if (req && !this.game.research.isResearched(req)) return;
                this.cropType = crop;
                this.game.ui.updateModeDisplay(this);
            }
        }
    }

    cycleBuildCategory(dir) {
        const idx = this.buildCategories.indexOf(this.buildCategory);
        const next = (idx + dir + this.buildCategories.length) % this.buildCategories.length;
        this.setBuildCategory(this.buildCategories[next]);
    }

    setBuildCategory(cat) {
        this.buildCategory = cat;
        this.buildOptions = Object.keys(BUILDINGS).filter(k => BUILDINGS[k].category === cat);
        if (this.buildOptions.length > 0 && !this.buildOptions.includes(this.buildType)) {
            this.buildType = this.buildOptions[0];
        }
        this.game.ui.updateModeDisplay(this);
    }

    setMode(mode) {
        this.mode = mode;
        this.dragStart = null;
        this.dragEnd = null;
        this.dragging = false;
        this.game.ui.updateModeDisplay(this);
    }

    onMouseDown(e) {
        if (e.button === 1) {
            e.preventDefault();
            this._middleDrag = true;
            this._middleLast = { x: e.clientX, y: e.clientY };
            return;
        }

        const pos = this.getMouseTile(e);
        if (pos.x < 0 || pos.x >= CONFIG.MAP_WIDTH || pos.y < 0 || pos.y >= CONFIG.MAP_HEIGHT) return;

        if (this.spellTargeting) {
            if (e.button === 0) {
                this.executeSpellTarget(pos);
            } else {
                this.cancelSpellTargeting();
            }
            return;
        }

        if (e.button === 2) {
            if (this.mode === 'build') {
                this.dragStart = pos;
                this.dragEnd = pos;
                this.dragging = true;
                this._rightDrag = true;
                return;
            }
            this.handleRightClick(pos);
            return;
        }

        if (this.mode === 'zone' || this.mode === 'designate') {
            this.dragStart = pos;
            this.dragEnd = pos;
            this.dragging = true;
            return;
        }

        if (this.mode === 'build' && this.dragBuildTypes.has(this.buildType)) {
            this.dragStart = pos;
            this.dragEnd = pos;
            this.dragging = true;
            return;
        }

        if (this.mode === 'normal') {
            this.dragStart = pos;
            this.dragEnd = pos;
            this.dragging = true;
            this._clickPos = pos;
            return;
        }

        this.handleLeftClick(pos);
    }

    onMouseMove(e) {
        if (this._middleDrag) {
            const dx = e.clientX - this._middleLast.x;
            const dy = e.clientY - this._middleLast.y;
            const tilesX = Math.round(dx / this.charWidth);
            const tilesY = Math.round(dy / this.charHeight);
            if (tilesX !== 0 || tilesY !== 0) {
                this.game.camera.pan(-tilesX, -tilesY);
                this._middleLast.x += tilesX * this.charWidth;
                this._middleLast.y += tilesY * this.charHeight;
            }
            return;
        }

        const pos = this.getMouseTile(e);
        if (pos.x >= 0 && pos.x < CONFIG.MAP_WIDTH && pos.y >= 0 && pos.y < CONFIG.MAP_HEIGHT) {
            this.game.cursor = pos;
            if (this.dragging) {
                this.dragEnd = pos;
            }
            this.game.ui.updateTileTooltip(pos.x, pos.y, e);
        } else {
            this.game.ui.hideTileTooltip();
        }
    }

    onMouseUp(e) {
        if (e.button === 1) {
            this._middleDrag = false;
            return;
        }

        if (this.dragging && this.dragStart) {
            const pos = this.getMouseTile(e);
            if (this._rightDrag && this.mode === 'build') {
                this.deconstructArea(this.dragStart, pos);
            } else if (this.mode === 'build' && this.dragBuildTypes.has(this.buildType)) {
                this.buildArea(this.dragStart, pos);
            } else if (this.mode === 'zone') {
                designateFarmZone(this.game, this.dragStart.x, this.dragStart.y, pos.x, pos.y, this.cropType);
            } else if (this.mode === 'designate') {
                this.designateArea(this.dragStart, pos);
            } else if (this.mode === 'normal') {
                const wasDrag = this.dragStart.x !== pos.x || this.dragStart.y !== pos.y;
                if (wasDrag) {
                    this.selectColonistsInRect(this.dragStart, pos);
                } else {
                    this.selectAt(this._clickPos);
                }
            }
            this.dragStart = null;
            this.dragEnd = null;
            this.dragging = false;
            this._clickPos = null;
            this._rightDrag = false;
        }
    }

    getTouchTile(touch) {
        const rect = this.pre.getBoundingClientRect();
        const px = touch.clientX - rect.left;
        const py = touch.clientY - rect.top;
        const sx = Math.max(0, Math.floor(px / this.charWidth));
        const sy = Math.max(0, Math.floor(py / this.charHeight));
        return this.game.camera.screenToWorld(sx, sy);
    }

    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this._lastPinchDist = Math.hypot(dx, dy);
            this._isPinching = true;
            this._touchPanning = false;
            this.dragging = false;
            this.dragStart = null;
            this.dragEnd = null;
            return;
        }
        if (e.touches.length !== 1) return;
        this._isPinching = false;
        this._touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this._touchMoved = false;

        if (this.touchPanMode) {
            this._touchPanning = true;
            this._touchPanLast = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            return;
        }

        const pos = this.getTouchTile(e.touches[0]);
        if (pos.x < 0 || pos.x >= CONFIG.MAP_WIDTH || pos.y < 0 || pos.y >= CONFIG.MAP_HEIGHT) return;

        this.game.cursor = pos;
        if (this.mode === 'zone' || this.mode === 'designate' ||
            (this.mode === 'build' && this.dragBuildTypes.has(this.buildType)) ||
            this.mode === 'normal') {
            this.dragStart = pos;
            this.dragEnd = pos;
            this.dragging = true;
            this._clickPos = pos;
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            if (this._lastPinchDist > 0) {
                const delta = dist - this._lastPinchDist;
                if (delta > 20) {
                    window.zoomIn?.();
                    this._lastPinchDist = dist;
                } else if (delta < -20) {
                    window.zoomOut?.();
                    this._lastPinchDist = dist;
                }
            }
            this._lastPinchDist = dist;
            this._isPinching = true;
            return;
        }
        if (e.touches.length !== 1 || this._isPinching) return;

        this._touchMoved = true;

        if (this._touchPanning) {
            const dx = e.touches[0].clientX - this._touchPanLast.x;
            const dy = e.touches[0].clientY - this._touchPanLast.y;
            const tilesX = Math.round(dx / this.charWidth);
            const tilesY = Math.round(dy / this.charHeight);
            if (tilesX !== 0 || tilesY !== 0) {
                this.game.camera.pan(-tilesX, -tilesY);
                this._touchPanLast.x += tilesX * this.charWidth;
                this._touchPanLast.y += tilesY * this.charHeight;
            }
            return;
        }

        const pos = this.getTouchTile(e.touches[0]);
        if (pos.x >= 0 && pos.x < CONFIG.MAP_WIDTH && pos.y >= 0 && pos.y < CONFIG.MAP_HEIGHT) {
            this.game.cursor = pos;
            if (this.dragging) {
                this.dragEnd = pos;
            }
        }
    }

    onTouchEnd(e) {
        e.preventDefault();
        if (this._isPinching) {
            if (e.touches.length === 0) {
                this._isPinching = false;
                this._lastPinchDist = 0;
            }
            return;
        }

        if (this._touchPanning) {
            this._touchPanning = false;
            return;
        }

        const pos = this.game.cursor;
        if (!pos) return;

        if (this.dragging && this.dragStart) {
            const wasDrag = this._touchMoved && (this.dragStart.x !== pos.x || this.dragStart.y !== pos.y);
            if (wasDrag) {
                if (this.mode === 'build' && this.dragBuildTypes.has(this.buildType)) {
                    this.buildArea(this.dragStart, pos);
                } else if (this.mode === 'zone') {
                    designateFarmZone(this.game, this.dragStart.x, this.dragStart.y, pos.x, pos.y, this.cropType);
                } else if (this.mode === 'designate') {
                    this.designateArea(this.dragStart, pos);
                } else if (this.mode === 'normal') {
                    this.selectColonistsInRect(this.dragStart, pos);
                }
            } else {
                this.handleLeftClick(this._clickPos || pos);
            }
            this.dragStart = null;
            this.dragEnd = null;
            this.dragging = false;
            this._clickPos = null;
        } else {
            this.handleLeftClick(pos);
        }
    }

    toggleTouchPanMode() {
        this.touchPanMode = !this.touchPanMode;
        const btn = document.getElementById('touch-pan-btn');
        if (btn) btn.classList.toggle('active', this.touchPanMode);
    }

    designateArea(start, end) {
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) continue;
                if (this.designateMode === 'chop') {
                    designateChop(this.game, x, y);
                } else {
                    designateMine(this.game, x, y);
                }
            }
        }
    }

    buildArea(start, end) {
        if (!this.buildType) return;
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) continue;
                designateBuild(this.game, x, y, this.buildType);
            }
        }
    }

    deconstructArea(start, end) {
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) continue;
                cancelDesignation(this.game, x, y);
            }
        }
    }

    handleLeftClick(pos) {
        if (this.spellTargeting) {
            this.executeSpellTarget(pos);
            return;
        }
        switch (this.mode) {
            case 'normal':
                this.selectAt(pos);
                break;
            case 'build':
                if (!this.buildType) break;
                designateBuild(this.game, pos.x, pos.y, this.buildType);
                if (this.singlePlaceTypes.has(this.buildType)) {
                    this.buildType = null;
                    this.game.ui.updateModeDisplay(this);
                }
                break;
        }
    }

    startSpellTargeting(colonistId, spellKey) {
        const spell = SPELLS[spellKey];
        if (!spell || spell.castType !== 'targeted') return;
        this.spellTargeting = { colonistId, spellKey, spell };
        this.game.notifications.push({ text: `Select target for ${spell.name} (Esc to cancel)`, tick: this.game.tick, type: 'event' });
        this.game.ui.updateModeDisplay(this);
    }

    cancelSpellTargeting() {
        this.spellTargeting = null;
        this.game.notifications.push({ text: 'Spell targeting cancelled', tick: this.game.tick, type: 'event' });
        this.game.ui.updateModeDisplay(this);
    }

    executeSpellTarget(pos) {
        const { colonistId, spellKey, spell } = this.spellTargeting;
        const colonist = this.game.getColonist(colonistId);
        if (!colonist || colonist.hp <= 0) {
            this.spellTargeting = null;
            return;
        }

        if (colonist.mana < spell.manaCost) {
            this.game.notifications.push({ text: `${colonist.name} doesn't have enough mana`, tick: this.game.tick, type: 'danger' });
            this.spellTargeting = null;
            return;
        }

        if (!colonist._spellCooldowns) colonist._spellCooldowns = {};
        if (colonist._spellCooldowns[spellKey] && this.game.tick - colonist._spellCooldowns[spellKey] < spell.cooldown) {
            this.game.notifications.push({ text: `${spell.name} is on cooldown`, tick: this.game.tick, type: 'danger' });
            this.spellTargeting = null;
            return;
        }

        const dist = Math.abs(colonist.x - pos.x) + Math.abs(colonist.y - pos.y);
        if (spell.range && dist > spell.range) {
            this.game.notifications.push({ text: `Target out of range (max ${spell.range})`, tick: this.game.tick, type: 'danger' });
            return;
        }

        colonist.mana -= spell.manaCost;
        colonist._spellCooldowns[spellKey] = this.game.tick;
        this.game.castTargetedSpell(colonist, spell, pos);
        this.spellTargeting = null;
        this.game.ui.updateModeDisplay(this);
    }

    handleRightClick(pos) {
        if (this.mode === 'build' || this.mode === 'designate') {
            cancelDesignation(this.game, pos.x, pos.y);
        } else if (this.mode === 'zone') {
            removeFarmZone(this.game, pos.x, pos.y);
        } else if (this.mode === 'normal') {
            const drafted = this.game.colonists.filter(c => c.drafted && c.hp > 0);
            if (drafted.length <= 1) {
                for (const c of drafted) {
                    c.draftTarget = { x: pos.x, y: pos.y };
                    c.path = [];
                }
            } else {
                const targets = this.getSpreadPositions(pos.x, pos.y, drafted.length);
                for (let i = 0; i < drafted.length; i++) {
                    drafted[i].draftTarget = targets[i];
                    drafted[i].path = [];
                }
            }
        }
    }

    getSpreadPositions(cx, cy, count) {
        const positions = [{ x: cx, y: cy }];
        let radius = 1;
        while (positions.length < count) {
            for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
                for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const nx = cx + dx, ny = cy + dy;
                    if (isPassable(this.game.map, nx, ny)) {
                        positions.push({ x: nx, y: ny });
                    }
                }
            }
            radius++;
            if (radius > 5) break;
        }
        return positions;
    }

    selectColonistsInRect(start, end) {
        const minX = Math.min(start.x, end.x), maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y), maxY = Math.max(start.y, end.y);
        const inRect = (e) => e.hp > 0 && e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY;

        const colonists = this.game.colonists.filter(inRect);
        const animals = this.game.wildlife.filter(inRect);
        const tamed = (this.game.tamedAnimals || []).filter(inRect);
        const raiders = this.game.raiders.filter(inRect);
        const waveEnemies = this.game.waves ? this.game.waves.enemies.filter(inRect) : [];

        if (colonists.length === 0 && animals.length === 0 && tamed.length === 0 && raiders.length === 0 && waveEnemies.length === 0) return;

        if (colonists.length > 0) {
            this.game.selectedColonist = colonists[0];
            this.game.selectedColonists = colonists;
            if (colonists.length > 1 && animals.length === 0 && tamed.length === 0 && raiders.length === 0 && waveEnemies.length === 0) {
                this.game.ui.showMultiColonistInfo(colonists);
                this.game.notifications.push({ text: `Selected ${colonists.length} colonists`, tick: this.game.tick, type: 'success' });
                return;
            }
        } else {
            this.game.selectedColonist = null;
            this.game.selectedColonists = [];
        }

        // Mixed selection or non-colonist selection - show as tile entities view
        const cx = Math.floor((minX + maxX) / 2);
        const cy = Math.floor((minY + maxY) / 2);
        const tile = this.game.map[cy][cx];
        this.game.ui.showTileEntities(tile, cx, cy, colonists, animals, [...raiders, ...waveEnemies], tamed);
    }

    selectAt(pos) {
        const colonistsHere = this.game.colonists.filter(c => c.x === pos.x && c.y === pos.y && c.hp > 0);
        const animalsHere = this.game.wildlife.filter(a => a.x === pos.x && a.y === pos.y && a.hp > 0);
        const tamedHere = (this.game.tamedAnimals || []).filter(a => a.x === pos.x && a.y === pos.y && a.hp > 0);
        const raidersHere = this.game.raiders.filter(r => r.x === pos.x && r.y === pos.y && r.hp > 0);
        const waveEnemiesHere = this.game.waves ? this.game.waves.enemies.filter(e => e.x === pos.x && e.y === pos.y && e.hp > 0) : [];
        const tile = this.game.map[pos.y][pos.x];

        if (colonistsHere.length > 0) {
            this.game.selectedColonist = colonistsHere[0];
            this.game.selectedColonists = colonistsHere;
        } else {
            this.game.selectedColonist = null;
            this.game.selectedColonists = [];
        }

        this.game.radiusHighlight = this._getRadiusHighlight(pos, tile, colonistsHere);
        this.game.ui.showTileEntities(tile, pos.x, pos.y, colonistsHere, animalsHere, [...raidersHere, ...waveEnemiesHere], tamedHere);
    }

    _getRadiusHighlight(pos, tile, colonistsHere) {
        if (tile.structure === 'artifact_pedestal' && tile.pedestalArtifact) {
            const def = ARTIFACTS[tile.pedestalArtifact];
            if (def?.pedestal?.radius && def.pedestal.radius !== 'global') {
                return { x: pos.x, y: pos.y, radius: def.pedestal.radius, color: '#ccaa4466' };
            }
        }
        if (colonistsHere.length > 0) {
            const c = colonistsHere[0];
            if (c.artifact && !c.artifactBroken && c.artifact.pedestal?.radius && c.artifact.pedestal.radius !== 'global') {
                return { x: pos.x, y: pos.y, radius: c.artifact.pedestal.radius, color: '#ccaa4466' };
            }
        }
        const bDef = BUILDINGS[tile.structure];
        if (bDef?.power?.damage) {
            const radius = bDef.power.range || 6;
            return { x: pos.x, y: pos.y, radius, color: '#ff444466' };
        }
        if (bDef?.power?.warmRadius) {
            return { x: pos.x, y: pos.y, radius: bDef.power.warmRadius, color: '#ff884466' };
        }
        return null;
    }
}
