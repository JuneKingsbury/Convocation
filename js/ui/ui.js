import { CONFIG, TRAITS, BUILDINGS, BUILD_CATEGORIES, TILE_CHARS, TILE_COLORS, RESEARCH, RESEARCH_TABS, ANIMALS, TAMED_ANIMALS, WAVE_CONFIG, RECIPE_CATEGORIES, WEAPONS, ARMORS, TOOLS, ARTIFACTS, POTIONS, SKILLS, MAGIC_SKILLS, MANA_CONFIG, SPELL_TOMES, SPELLS, FOODSTUFFS, WORK_CONFIG, GOLEM_TYPES, TRADE_VALUES, TRADER_MARKUP, TRADER_DISCOUNT, TRADER_EXCLUSIVE_ITEMS, COMPLEX_STRUCTURES, EVENTS } from '../core/config.js';
import { getComplexStructureAt } from '../systems/complexBuildings.js';
import { getTameChance } from '../entities/taming.js';
import { getAvailableRecipes } from '../systems/crafting.js';
import { CROP_RESEARCH_REQS } from '../systems/farming.js';
import { getPedestalEffect } from '../systems/artifacts.js';

export class UI {
    constructor(game) {
        this.game = game;
        this.priorityPanelVisible = false;
        this.craftPanelVisible = false;
        this.researchPanelVisible = false;
        this.inventoryVisible = false;
        this._invTab = 'resources';
        this._researchTab = 'foundations';
        this.tamingPanelVisible = false;
        this.settingsPanelVisible = false;
        this.elements = {};
        this.initElements();
    }

    initElements() {
        this.elements.statusBar = document.getElementById('status-bar');
        document.getElementById('btn-speed-down').addEventListener('click', () => this.game.speedDown());
        document.getElementById('btn-pause').addEventListener('click', () => this.game.togglePause());
        document.getElementById('btn-speed-up').addEventListener('click', () => this.game.speedUp());
        document.getElementById('btn-settings').addEventListener('click', () => this.game.toggleSettingsPanel());
        this.elements.infoPanel = document.getElementById('info-content');
        this.elements.infoPanel.addEventListener('mouseleave', () => {
            if (this._pendingColonistInfoHtml) {
                this.elements.infoPanel.innerHTML = this._pendingColonistInfoHtml;
                this._pendingColonistInfoHtml = null;
            }
        });
        this.elements.modeBar = document.getElementById('mode-bar');
        this.elements.notifications = document.getElementById('notifications');
        this.elements.priorityPanel = document.getElementById('priority-panel');
        this.elements.craftPanel = document.getElementById('craft-panel');
        this.elements.eventPanel = document.getElementById('event-panel');
        this.elements.colonistHud = document.getElementById('colonist-hud');
        this._colonistHudHovered = false;
        this.elements.colonistHud.addEventListener('mouseenter', () => { this._colonistHudHovered = true; });
        this.elements.colonistHud.addEventListener('mouseleave', () => {
            this._colonistHudHovered = false;
            if (this._pendingHudHtml) {
                this.elements.colonistHud.innerHTML = this._pendingHudHtml;
                this._pendingHudHtml = null;
            }
        });
        this.elements.researchPanel = document.getElementById('research-panel');
        this.elements.eventLog = document.getElementById('event-log');
        this.elements.inventoryPanel = document.getElementById('inventory-panel');
        this.elements.tamingPanel = document.getElementById('taming-panel');
        this.elements.settingsPanel = document.getElementById('settings-panel');

        this.elements.craftPanel.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-craft-tab]');
            if (tab) {
                this._craftTab = tab.dataset.craftTab;
                this._lastCraftHtml = '';
                this.updateCraftPanel();
            }
        });

        this.elements.researchPanel.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-research-tab]');
            if (tab) {
                this._researchTab = tab.dataset.researchTab;
                this._lastResearchHtml = null;
                this.updateResearchPanel();
                return;
            }
            const badge = e.target.closest('.research-cross-tab[data-jump-tab]');
            if (badge) {
                this._researchTab = badge.dataset.jumpTab;
                this._lastResearchHtml = null;
                this.updateResearchPanel();
            }
        });

        this.elements.colonistHud.addEventListener('click', (e) => {
            const row = e.target.closest('[data-colonist-id]');
            if (row) {
                this.game.selectColonistById(parseInt(row.dataset.colonistId));
            }
        });

        this.elements.eventLog.addEventListener('click', (e) => {
            const row = e.target.closest('[data-entity]');
            if (row) {
                const data = JSON.parse(row.dataset.entity);
                this.game.jumpToEntity(data.type, data.type === 'colonist' ? data.id : data);
            }
        });

        this.elements.modeBar.addEventListener('click', (e) => {
            const catOpt = e.target.closest('[data-build-cat]');
            if (catOpt) {
                this.game.input.setBuildCategory(catOpt.dataset.buildCat);
                return;
            }
            const opt = e.target.closest('[data-build-opt]');
            if (opt) {
                const buildType = opt.dataset.buildOpt;
                this.game.input.buildType = buildType;
                this.updateModeDisplay(this.game.input);
                return;
            }
            const cropOpt = e.target.closest('[data-crop-opt]');
            if (cropOpt) {
                this.game.input.cropType = cropOpt.dataset.cropOpt;
                this.updateModeDisplay(this.game.input);
                return;
            }
            const modeOpt = e.target.closest('[data-mode-action]');
            if (modeOpt) {
                const action = modeOpt.dataset.modeAction;
                switch (action) {
                    case 'back': this.game.input.setMode('normal'); break;
                    case 'build': this.game.input.setMode('build'); break;
                    case 'zone': this.game.input.setMode('zone'); break;
                    case 'gather': this.game.input.setMode('designate'); break;
                    case 'priority': this.togglePriorityPanel(); break;
                    case 'craft': this.toggleCraftPanel(); break;
                    case 'research': this.toggleResearchPanel(); break;
                    case 'tame': this.toggleTamingPanel(); break;
                    case 'inventory': this.toggleInventoryPanel(); break;
                    case 'settings': this.toggleSettingsPanel(); break;
                }
                return;
            }
            const desOpt = e.target.closest('[data-designate-mode]');
            if (desOpt) {
                this.game.input.designateMode = desOpt.dataset.designateMode;
                this.updateModeDisplay(this.game.input);
            }
        });

        this.elements.priorityPanel.addEventListener('click', (e) => {
            const cell = e.target.closest('[data-colonist-id][data-skill]');
            if (cell) {
                const colonistId = parseInt(cell.dataset.colonistId);
                const skill = cell.dataset.skill;
                this.game.cyclePriority(colonistId, skill);
                this._lastPrioHtml = null;
                this.updatePriorityPanel();
            }
        });

        this.elements.inventoryPanel.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('[data-inv-tab]');
            if (tabBtn) {
                this._invTab = tabBtn.dataset.invTab;
                this._lastInvHtml = null;
                this.updateInventoryPanel();
                return;
            }
            const btn = e.target.closest('[data-reserve-food]');
            if (btn) {
                const food = btn.dataset.reserveFood;
                const res = this.game.resources.reservedFoodstuffs;
                res[food] = !res[food];
                this.updateInventoryPanel();
            }
        });

        document.addEventListener('mousedown', (e) => {
            const closeBtn = e.target.closest('[data-panel-close]');
            if (!closeBtn) return;
            e.preventDefault();
            const panel = closeBtn.dataset.panelClose;
            switch (panel) {
                case 'priority': this.togglePriorityPanel(); break;
                case 'craft': this.toggleCraftPanel(); break;
                case 'research': this.toggleResearchPanel(); break;
                case 'inventory': this.toggleInventoryPanel(); break;
                case 'taming': this.toggleTamingPanel(); break;
                case 'settings': this.toggleSettingsPanel(); break;
            }
        });

        const uiTooltip = document.getElementById('ui-tooltip');
        document.addEventListener('mouseover', (e) => {
            const tip = e.target.closest('.skill-tip[data-tip]');
            if (!tip) return;
            uiTooltip.textContent = tip.dataset.tip;
            uiTooltip.style.opacity = '1';
            const rect = tip.getBoundingClientRect();
            let left = rect.left + rect.width / 2 - uiTooltip.offsetWidth / 2;
            let top = rect.top - uiTooltip.offsetHeight - 6;
            if (top < 4) top = rect.bottom + 6;
            if (left < 4) left = 4;
            if (left + uiTooltip.offsetWidth > window.innerWidth - 4) {
                left = window.innerWidth - uiTooltip.offsetWidth - 4;
            }
            uiTooltip.style.left = left + 'px';
            uiTooltip.style.top = top + 'px';
        });
        document.addEventListener('mouseout', (e) => {
            const tip = e.target.closest('.skill-tip[data-tip]');
            if (tip) uiTooltip.style.opacity = '0';
        });
    }

    update() {
        this.updateStatusBar();
        this.updateNotifications();
        this.updateEventPanel();
        this.updateMinimapControls();
        if (this.priorityPanelVisible) this.updatePriorityPanel();
        if (this.craftPanelVisible) this.updateCraftPanel();
        if (this.researchPanelVisible) this.updateResearchPanel();
        this.updateColonistHud();
        this.updateEventLog();
        if (this.inventoryVisible) this.updateInventoryPanel();
        if (this.tamingPanelVisible) this.updateTamingPanel();
        if (this._viewingRiftGate) this._refreshRiftGateInfo();
        if (this._viewingColonistId != null) this._refreshColonistInfo();
    }

    updateMinimapControls() {
        const controls = document.getElementById('minimap-controls');
        if (!controls) return;
        const btns = controls.querySelectorAll('.speed-btn');
        for (const btn of btns) {
            const sp = btn.dataset.speed;
            const active = this.game.paused ? sp === 'pause' : sp === String(this.game.speed);
            btn.classList.toggle('active', active);
        }
    }

    updateStatusBar() {
        const r = this.game.resources.stockpile;
        const season = this.game.weather.getSeasonDisplay();
        const weather = this.game.weather.getWeatherDisplay();
        const temp = Math.round(this.game.weather.temperature);
        const speed = this.game.paused ? 'PAUSED' : `${this.game.speed}x`;
        const aliveColonists = this.game.colonists.filter(c => c.hp > 0);
        const alive = aliveColonists.length;
        const avgMood = alive > 0 ? Math.round(aliveColonists.reduce((sum, c) => sum + c.mood, 0) / alive) : 0;
        const dayProgress = Math.floor((this.game.timeOfDay / CONFIG.TICKS_PER_DAY) * 24);
        const timeStr = `${String(dayProgress).padStart(2, '0')}:00`;
        const power = this.game.power;
        const manaStr = power.totalGenerated > 0 ? `Mana:${power.getNetPower()}` : '';
        const pendingTasks = this.game.taskQueue.getPending().length;

        const waves = this.game.waves;
        const cap = waves.getColonistCap();
        const voidEssence = r.void_essence || 0;
        const waveStr = waves.active ? `Wave:${waves.currentWave}` : '';

        const alerts = CONFIG.STOCKPILE_ALERTS || {};
        const resStyle = (key, val) => (alerts[key] && val <= alerts[key]) ? ' style="color:#ff4444;font-weight:bold"' : '';
        const html =
            `<span class="res"${resStyle('wood', r.wood)}>Wood:${Math.round(r.wood)}</span>` +
            `<span class="res"${resStyle('stone', r.stone)}>Stone:${Math.round(r.stone)}</span>` +
            `<span class="res"${resStyle('food', r.food)}>Food:${Math.round(r.food)}</span>` +
            (voidEssence > 0 ? `<span class="res" style="color:#9933ff">Void:${Math.round(voidEssence)}</span>` : '') +
            (manaStr ? `<span class="res" style="color:${power.hasPower() ? '#aa44ff' : '#ff6666'}">${manaStr}</span>` : '') +
            `<span class="sep">|</span>` +
            `<span class="info">${season}</span>` +
            `<span class="info status-extra">${weather} ${temp}°</span>` +
            `<span class="info">${timeStr}</span>` +
            `<span class="sep status-extra">|</span>` +
            `<span class="info status-extra">Pop:${alive}/${cap}</span>` +
            `<span class="info status-extra">Mood:${avgMood}%</span>` +
            (waveStr ? `<span class="info" style="color:#cc00ff">${waveStr}</span>` : '') +
            (pendingTasks > 0 ? `<span class="info status-extra" style="color:#ccaa44">Tasks:${pendingTasks}</span>` : '') +
            (CONFIG.PEACEFUL_MODE ? `<span class="peaceful">PEACEFUL</span>` : '');

        if (html !== this._lastStatusHtml) {
            this._lastStatusHtml = html;
            document.getElementById('status-info').innerHTML = html;
        }
        const speedEl = document.getElementById('status-speed');
        if (speedEl && speedEl.textContent !== speed) speedEl.textContent = speed;
    }

    updateModeDisplay(input) {
        if (input.spellTargeting) {
            const { spell } = input.spellTargeting;
            let html = `<span class="mode-label" style="color:#bb88ff">SPELL TARGET: ${spell.name}</span>`;
            html += `<span class="mode-hint" style="color:#aa88ff">Click target tile (range: ${spell.range || '∞'}) | [Esc] Cancel</span>`;
            this.elements.modeBar.innerHTML = html;
            return;
        }
        let html = `<span class="mode-label">Mode: ${input.mode.toUpperCase()}</span>`;
        if (input.mode === 'build') {
            html += '<span class="mode-opt mode-back" data-mode-action="back">[Esc]Back</span>';
            html += '<span class="build-categories">';
            BUILD_CATEGORIES.forEach(cat => {
                const catActive = cat === input.buildCategory ? ' active' : '';
                html += `<span class="mode-opt build-cat${catActive}" data-build-cat="${cat}">${cat}</span>`;
            });
            html += '</span>';
            html += '<span class="mode-options">';
            input.buildOptions.forEach((opt, i) => {
                const active = opt === input.buildType ? ' active' : '';
                const def = BUILDINGS[opt];
                const costStr = Object.entries(def.cost).map(([k, v]) => `${k}:${v}`).join(' ');
                const keyLabel = i < 9 ? i + 1 : (i === 9 ? '0' : '');
                const locked = this.isBuildingLocked(opt);
                const lockStr = locked ? ' [LOCKED]' : '';
                html += `<span class="mode-opt${active}" data-build-opt="${opt}"${locked ? ' style="opacity:0.4"' : ''}>${keyLabel ? `[${keyLabel}]` : ''}<span style="color:${def.color}">${def.char}</span> ${opt.replace(/_/g,' ')}(${costStr})${lockStr}</span>`;
            });
            html += '</span>';
            html += '<span class="mode-hint">[Tab]Cycle category | Click item to select | Left-click/drag to place | Right-click/drag to deconstruct</span>';
        } else if (input.mode === 'zone') {
            html += '<span class="mode-opt mode-back" data-mode-action="back">[Esc]Back</span>';
            html += '<span class="mode-options">';
            input.cropOptions.forEach((opt, i) => {
                const req = CROP_RESEARCH_REQS[opt];
                const locked = req && !this.game.research.isResearched(req);
                const active = opt === input.cropType ? ' active' : '';
                if (locked) {
                    html += `<span class="mode-opt" style="opacity:0.4">[${i + 1}]${opt} [LOCKED]</span>`;
                } else {
                    html += `<span class="mode-opt${active}" data-crop-opt="${opt}">[${i + 1}]${opt}</span>`;
                }
            });
            html += '</span>';
            html += '<span class="mode-hint">Click+drag to designate area</span>';
        } else if (input.mode === 'designate') {
            html += '<span class="mode-opt mode-back" data-mode-action="back">[Esc]Back</span>';
            html += '<span class="mode-options">';
            const chopActive = input.designateMode === 'chop' ? ' active' : '';
            const mineActive = input.designateMode === 'mine' ? ' active' : '';
            html += `<span class="mode-opt${chopActive}" data-designate-mode="chop">[Tab]Chop</span>`;
            html += `<span class="mode-opt${mineActive}" data-designate-mode="mine">[Tab]Mine</span>`;
            html += '</span>';
            html += '<span class="mode-hint">Click+drag to select area</span>';
        } else {
            html += '<span class="mode-options">';
            html += `<span class="mode-opt" data-mode-action="build">[B]Build</span>`;
            html += `<span class="mode-opt" data-mode-action="zone">[Z]Zone</span>`;
            html += `<span class="mode-opt" data-mode-action="gather">[G]Gather</span>`;
            html += `<span class="mode-opt" data-mode-action="priority">[P]Priority</span>`;
            html += `<span class="mode-opt" data-mode-action="craft">[C]Craft</span>`;
            html += `<span class="mode-opt" data-mode-action="research">[R]Research</span>`;
            html += `<span class="mode-opt" data-mode-action="tame">[T]Tame</span>`;
            html += `<span class="mode-opt" data-mode-action="inventory">[I]Inventory</span>`;
            html += '</span>';
        }
        this.elements.modeBar.innerHTML = html;
    }

    getWavePreview(waveNum) {
        const enemies = WAVE_CONFIG.baseEnemies + WAVE_CONFIG.enemiesPerWave * (waveNum - 1);
        const hp = WAVE_CONFIG.baseHp + WAVE_CONFIG.hpPerWave * (waveNum - 1);
        return `${enemies} enemies, ${hp} HP each`;
    }

    _refreshRiftGateInfo() {
        if (!this.game.exploration) return;
        const hasActive = this.game.exploration.expeditions.length > 0;
        const hasCompleted = this.game.exploration.completedExpeditions.length > 0;
        if (!hasActive && !hasCompleted) return;
        const riftSection = this.elements.infoPanel.querySelector('[data-rift-info]');
        if (!riftSection) return;
        const html = this._buildRiftGateInnerHtml();
        if (html !== riftSection.innerHTML) {
            riftSection.innerHTML = html;
            const logContainer = riftSection.querySelector('.exp-log-container');
            if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    _refreshColonistInfo() {
        const colonist = this.game.getColonist(this._viewingColonistId);
        if (!colonist) {
            this._viewingColonistId = null;
            return;
        }
        const html = this.buildColonistInfoHtml(colonist);
        if (html !== this._lastColonistInfoHtml) {
            this._lastColonistInfoHtml = html;
            if (this.elements.infoPanel.matches(':hover')) {
                this._pendingColonistInfoHtml = html;
            } else {
                this.elements.infoPanel.innerHTML = html;
                this._pendingColonistInfoHtml = null;
            }
        }
    }

    _buildGolemForgeHtml() {
        if (!this.game.research.isResearched('golem_craft')) {
            return `<div class="info-row" style="color:#888;">Requires Golem Craft research</div>`;
        }
        let html = `<div class="info-row" style="color:#cc8833;font-weight:bold;">Golem Forge</div>`;
        html += `<div class="info-row" style="margin-top:4px;"><b>Craft Golem:</b></div>`;
        for (const [key, def] of Object.entries(GOLEM_TYPES)) {
            const costStr = Object.entries(def.cost).map(([r, n]) => `${n} ${r}`).join(', ');
            const canAfford = this.game.resources.has(def.cost);
            html += `<div class="info-actions"><button ${canAfford ? '' : 'disabled'} onclick="window.game.craftGolem('${key}')" style="background:#553311;color:#ffcc88;">${def.name}</button> <span style="color:#aaa;font-size:0.85em">${costStr}</span></div>`;
            html += `<div class="info-row" style="color:#888;font-size:0.85em;margin-bottom:4px;">Specialty: ${def.specialty} (skill ${def.skillLevel || '-'}), HP: ${def.hp}</div>`;
        }
        return html;
    }

    _buildRiftGateHtml() {
        return `<div data-rift-info="1">${this._buildRiftGateInnerHtml()}</div>`;
    }

    _buildRiftGateInnerHtml() {
        const expl = this.game.exploration;
        let html = `<div class="info-row" style="color:#33ccff;font-weight:bold;">Rift Gate</div>`;

        if (expl.expeditions.length > 0) {
            for (const exp of expl.expeditions) {
                if (exp.status === 'gathering') {
                    const names = exp.partyIds.map(id => {
                        const c = this.game.getColonist(id);
                        return c ? c.name : '?';
                    }).join(', ');
                    html += `<div class="info-row" style="color:#aaddff;">${exp.dimensionName} — assembling</div>`;
                    html += `<div class="info-row" style="color:#888;">Party: ${names}</div>`;
                } else {
                    const elapsed = this.game.tick - exp.startTick;
                    const totalDur = Math.floor(exp.duration * 1.2);
                    const pct = Math.min(100, Math.floor((elapsed / totalDur) * 100));
                    html += `<div class="info-row" style="color:#aaddff;">${exp.dimensionName} — ${exp.status}${exp.combat ? ' [COMBAT]' : ''} (${pct}%)</div>`;

                    const aliveParty = exp.partySnapshot.filter(p => p.hp > 0);
                    html += `<div class="info-row" style="color:#888;">Party (${aliveParty.length}/${exp.partySnapshot.length} alive):</div>`;
                    for (const p of exp.partySnapshot) {
                        const hpPct = Math.max(0, Math.round((p.hp / p.maxHp) * 100));
                        const color = p.hp <= 0 ? '#664444' : hpPct < 30 ? '#ff4444' : hpPct < 60 ? '#ffaa44' : '#88cc88';
                        const status = p.hp <= 0 ? ' [DOWN]' : '';
                        const manaStr = p.maxMana > 0 ? ` | ${Math.round(p.mana)}/${p.maxMana} MP` : '';
                        const shieldStr = p.shieldActive ? ' 🛡' : '';
                        html += `<div class="info-row" style="color:${color}; padding-left:8px;">${p.name} — ${Math.max(0, Math.round(p.hp))}/${p.maxHp} HP${manaStr}${shieldStr}${status}</div>`;
                    }

                    if (exp.combat) {
                        const enemiesAlive = exp.combat.enemies.filter(e => e.hp > 0).length;
                        html += `<div class="info-row" style="color:#ff8844; margin-top:4px;">Enemies remaining: ${enemiesAlive}/${exp.combat.enemies.length}</div>`;
                    }

                    html += `<div class="exp-log-container">`;
                    const logSlice = exp.log.slice(-15);
                    for (const entry of logSlice) {
                        const color = this._expLogColor(entry.type);
                        html += `<div class="exp-log-entry" style="color:${color};">${entry.text}</div>`;
                    }
                    html += `</div>`;
                }
            }
        }

        const dims = expl.getAvailableDimensions(this.game);
        if (dims.length > 0 && this.game.power.powered) {
            html += `<div class="info-row" style="margin-top:6px;"><b>Send Expedition:</b></div>`;
            for (const dim of dims) {
                html += `<div class="info-actions"><button onclick="window.game.showExpeditionSetup('${dim.key}')" style="background:#1a4466;color:#88ddff;">${dim.name} (Diff ${dim.difficulty})</button></div>`;
            }
        } else if (!this.game.power.powered) {
            html += `<div class="info-row" style="color:#ff4444;">No mana — cannot send expeditions</div>`;
        }

        if (expl.completedExpeditions.length > 0 && expl.expeditions.length === 0) {
            const last = expl.completedExpeditions[expl.completedExpeditions.length - 1];
            html += `<div class="info-row" style="margin-top:6px;color:#88ccff;font-size:0.9em;">Last expedition: ${last.dimensionName}</div>`;
            html += `<div class="exp-log-container">`;
            const logSlice = last.log.slice(-10);
            for (const entry of logSlice) {
                const color = this._expLogColor(entry.type);
                html += `<div class="exp-log-entry" style="color:${color};">${entry.text}</div>`;
            }
            html += `</div>`;
        }

        return html;
    }

    _expLogColor(type) {
        switch (type) {
            case 'danger': return '#ff5555';
            case 'combat': return '#ff8844';
            case 'success': return '#88ff88';
            case 'loot': return '#ffcc44';
            case 'ambient': return '#777777';
            default: return '#aaddff';
        }
    }

    _spellTooltip(spell) {
        const parts = [spell.school.charAt(0).toUpperCase() + spell.school.slice(1)];
        switch (spell.effect) {
            case 'ranged_damage': parts.push(`${spell.damage} dmg, range ${spell.range}`); break;
            case 'ranged_damage_aoe': parts.push(`${spell.damage} AoE dmg, range ${spell.range}, radius ${spell.radius}`); break;
            case 'heal': parts.push(`Heals ${spell.healAmount} HP when below ${Math.round((spell.hpThreshold || 0.5) * 100)}%`); break;
            case 'buff_defense': parts.push(`-${Math.round(spell.damageReduction * 100)}% dmg taken, ${spell.duration}t`); break;
            case 'buff_speed': parts.push(`+${spell.workSpeedBonus > 1 ? Math.round((spell.workSpeedBonus - 1) * 100) + '% work speed' : ''}${spell.moveSpeedBonus ? ' +' + spell.moveSpeedBonus + ' move' : ''}, ${spell.duration}t`); break;
            case 'summon': parts.push(`Summon (${spell.summonHp} HP, ${spell.summonDamage} dmg, ${spell.summonDuration}t)`); break;
            case 'teleport': parts.push(`Teleport, range ${spell.range}`); break;
            case 'boost_crops': parts.push(`${spell.growthMult}x growth, radius ${spell.radius}, ${spell.duration}t`); break;
            case 'terraform': parts.push(`Flatten terrain, radius ${spell.radius}`); break;
            case 'divination_modifier': parts.push(`Passive divination effect, ${spell.duration}t`); break;
            default: parts.push(spell.effect.replace(/_/g, ' '));
        }
        if (spell.trigger === 'inCombat') parts.push('Trigger: in combat');
        else if (spell.trigger === 'lowHealth') parts.push('Trigger: low HP');
        else if (spell.trigger === 'hasTask') parts.push('Trigger: while working');
        return parts.join(' | ');
    }

    getStructureDescription(structure) {
        const def = BUILDINGS[structure];
        if (!def) return '';
        const powered = this.game.power.hasPower();
        let html = '';
        if (def.description) {
            html += `<div class="info-row" style="color:#999;font-size:11px;">${def.description}</div>`;
        }
        if (def.power) {
            if (def.power.generates) {
                html += `<div class="info-row" style="color:#88ff88;">Generates ${def.power.generates} mana</div>`;
            }
            if (def.power.consumes) {
                const status = powered ? '<span style="color:#88ff88;">Powered</span>' : '<span style="color:#ff4444;">No power!</span>';
                html += `<div class="info-row">Consumes ${def.power.consumes} mana — ${status}</div>`;
            }
        }
        return html;
    }

    getPedestalEffectDescription(artDef) {
        if (!artDef?.pedestal) return '';
        const p = artDef.pedestal;
        const effects = [];
        if (p.blightImmunity) effects.push('Crops immune to blight');
        if (p.workSpeedBonus) effects.push(`+${Math.round(p.workSpeedBonus * 100)}% work speed`);
        if (p.damageBonusMult) effects.push(`+${Math.round((p.damageBonusMult - 1) * 100)}% damage`);
        if (p.skillGrowthBonus) effects.push(`+${Math.round(p.skillGrowthBonus * 100)}% skill growth`);
        if (p.lightRadius) effects.push(`Light radius: ${p.lightRadius}`);
        if (p.wandererChanceMult) effects.push(`+${Math.round((p.wandererChanceMult - 1) * 100)}% wanderer chance`);
        if (p.cookingBonusFood) effects.push(`+${p.cookingBonusFood} bonus food per cook`);
        if (p.tradeMarkupMult) effects.push(`${Math.round((1 - p.tradeMarkupMult) * 100)}% cheaper trade prices`);
        if (effects.length === 0) return '';
        return `<div class="info-row" style="color:#aaffaa;font-size:11px;">${effects.join(' | ')}</div>`;
    }

    _getArtifactTooltip(art) {
        const lines = [];
        if (art.moveSpeedBonus) lines.push(`Equipped: +${Math.round(art.moveSpeedBonus * 100)}% move speed`);
        if (art.workSpeedBonus) lines.push(`Equipped: +${Math.round(art.workSpeedBonus * 100)}% work speed`);
        if (art.pedestal) {
            const p = art.pedestal;
            const r = p.radius === 'global' ? 'Colony-wide' : `Radius ${p.radius}`;
            const parts = [];
            if (p.blightImmunity) parts.push('blight immunity');
            if (p.workSpeedBonus) parts.push(`+${Math.round(p.workSpeedBonus * 100)}% work`);
            if (p.damageBonusMult) parts.push(`+${Math.round((p.damageBonusMult - 1) * 100)}% dmg`);
            if (p.skillGrowthBonus) parts.push(`+${Math.round(p.skillGrowthBonus * 100)}% skill growth`);
            if (p.lightRadius) parts.push(`light r${p.lightRadius}`);
            if (p.wandererChanceMult) parts.push(`+${Math.round((p.wandererChanceMult - 1) * 100)}% wanderers`);
            if (p.cookingBonusFood) parts.push(`+${p.cookingBonusFood} food/cook`);
            if (p.tradeMarkupMult) parts.push(`${Math.round((1 - p.tradeMarkupMult) * 100)}% cheaper trades`);
            if (parts.length) lines.push(`Aura (${r}): ${parts.join(', ')}`);
            if (p.manaCost) lines.push(`Pedestal mana: -${p.manaCost}`);
        }
        if (art.combat) {
            const parts = [];
            if (art.combat.targetPriority > 0) parts.push('draws enemy fire');
            if (art.combat.targetPriority < 0) parts.push('enemies avoid you');
            if (art.combat.damageReduction) parts.push(`-${Math.round(art.combat.damageReduction * 100)}% dmg taken`);
            if (art.combat.autoReviveHp) parts.push(`auto-revive at ${Math.round(art.combat.autoReviveHp * 100)}% HP`);
            if (parts.length) lines.push(`Combat: ${parts.join(', ')}`);
        }
        if (art.expedition) {
            const parts = [];
            if (art.expedition.lootMult) parts.push(`+${Math.round((art.expedition.lootMult - 1) * 100)}% loot`);
            if (art.expedition.trapDamageMult && art.expedition.trapDamageMult < 1) parts.push(`-${Math.round((1 - art.expedition.trapDamageMult) * 100)}% trap dmg`);
            if (art.expedition.trapDamageMult && art.expedition.trapDamageMult > 1) parts.push(`+${Math.round((art.expedition.trapDamageMult - 1) * 100)}% trap dmg`);
            if (art.expedition.rareEncounterMult) parts.push(`${art.expedition.rareEncounterMult}x rare encounters`);
            if (art.expedition.partyDamageMult) parts.push(`+${Math.round((art.expedition.partyDamageMult - 1) * 100)}% party dmg`);
            if (art.expedition.durationMult) parts.push(`-${Math.round((1 - art.expedition.durationMult) * 100)}% duration`);
            if (art.expedition.targetPriority > 0) parts.push('draws enemy fire');
            if (art.expedition.targetPriority < 0) parts.push('enemies avoid you');
            if (art.expedition.damageReduction) parts.push(`-${Math.round(art.expedition.damageReduction * 100)}% dmg taken`);
            if (art.expedition.autoReviveHp) parts.push(`auto-revive at ${Math.round(art.expedition.autoReviveHp * 100)}% HP`);
            if (parts.length) lines.push(`Expedition: ${parts.join(', ')}`);
        }
        if (art.durability) lines.push(`Breaks after ${art.durability.max} use(s) — repair at Anvil`);
        if (art.consumable) lines.push('Consumed on use');
        return lines.join(' | ') || art.name;
    }

    _switchToInfoTab() {
        const container = document.getElementById('game-container');
        const isTabbed = container.classList.contains('tabbed-mode');
        if (!isTabbed) return;

        const footer = document.getElementById('game-footer');
        if (footer.classList.contains('collapsed')) {
            footer.classList.remove('collapsed');
        }
        const tabs = footer.querySelectorAll('.footer-tab[data-tab]');
        const panels = footer.querySelectorAll('#footer-content > .footer-panel, #minimap-container');
        tabs.forEach(t => { if (t.dataset.tab !== 'collapse') t.classList.remove('active'); });
        panels.forEach(p => p.classList.remove('active'));
        const infoTab = footer.querySelector('.footer-tab[data-tab="info"]');
        if (infoTab) infoTab.classList.add('active');
        const infoPanel = document.getElementById('info-panel');
        if (infoPanel) infoPanel.classList.add('active');
    }

    buildColonistInfoHtml(colonist) {
        const moodLevel = getMoodLabel(colonist.mood);
        const traitSpans = colonist.traits.map(t => {
            const trait = TRAITS[t];
            if (!trait) return t;
            return `<span class="skill-tip" data-tip="${trait.description}">${trait.name}</span>`;
        }).join(', ');
        const thoughts = colonist.thoughts.slice(-5).map(t =>
            `<span class="${t.moodEffect >= 0 ? 'positive' : 'negative'}">${t.text} (${t.moodEffect > 0 ? '+' : ''}${t.moodEffect.toFixed(0)})</span>`
        ).join('<br>');

        const weaponTip = colonist.weapon ? `${colonist.weapon.damage} damage${colonist.weapon.miningSpeed ? `, +${Math.round((colonist.weapon.miningSpeed-1)*100)}% mining` : ''}${colonist.weapon.choppingSpeed ? `, +${Math.round((colonist.weapon.choppingSpeed-1)*100)}% chopping` : ''}` : 'No weapon equipped';
        const armorTip = colonist.armor ? `${Math.round(colonist.armor.damageReduction * 100)}% damage reduction` : 'No armor equipped';
        const toolTip = colonist.tool ? Object.entries(colonist.tool).filter(([k]) => k !== 'name' && k !== 'key').map(([k, v]) => `${k}: ${typeof v === 'number' ? (v > 1 ? `+${Math.round((v-1)*100)}%` : `${Math.round(v*100)}%`) : v}`).join(', ') : 'No tool equipped';
        const artifactTip = colonist.artifact ? this._getArtifactTooltip(colonist.artifact) : 'No artifact equipped';

        const nc = colonist.nameColor || '#ffff00';
        let html = `<div class="info-header" style="cursor:pointer;color:${nc}" onclick="window.game.selectColonistById(${colonist.id})">${colonist.name} ${colonist.drafted ? '[DRAFTED]' : ''}${colonist.guardMode ? '[GUARDING]' : ''}</div>`;
        html += `<div class="info-row">HP: ${Math.round(colonist.hp)}/${colonist.maxHp}</div>`;
        html += `<div class="info-row">Mood: <span class="mood-${moodLevel}">${colonist.mood.toFixed(0)} (${moodLevel})</span></div>`;
        html += `<div class="info-row">State: ${colonist.state}</div>`;
        html += `<div class="info-row">Task: ${this.getColonistTaskDescription(colonist)}</div>`;
        html += `<div class="info-row">Traits: ${traitSpans}</div>`;
        html += `<div class="info-row">Hunger: ${bar(colonist.needs.hunger)} Rest: ${bar(colonist.needs.rest)}</div>`;
        html += `<div class="info-row">Skills: ${Object.entries(SKILLS).map(([k, def]) => `<span class="skill-tip" data-tip="${def.description}">${def.name}:${colonist.skills[k] || 1}</span>`).join(' ')}</div>`;
        const hasMagic = colonist.magicSkills && Object.values(colonist.magicSkills).some(v => v > 0);
        if (hasMagic) {
            html += `<div class="info-row"><span style="color:#aa88ff">Mana: ${bar(colonist.mana / colonist.maxMana * 100)} ${Math.floor(colonist.mana)}/${colonist.maxMana}</span></div>`;
            html += `<div class="info-row">Magic: ${Object.entries(MAGIC_SKILLS).filter(([k]) => colonist.magicSkills[k] > 0).map(([k, def]) => `<span class="skill-tip" data-tip="${def.description}" style="color:#bb88ff">${def.name}:${colonist.magicSkills[k]}</span>`).join(' ')}</div>`;
        }
        html += `<div class="info-row">Weapon: <span class="skill-tip" data-tip="${weaponTip}">${colonist.weapon?.name || 'Fists'}</span></div>`;
        html += `<div class="info-row">Armor: <span class="skill-tip" data-tip="${armorTip}">${colonist.armor?.name || 'None'}</span></div>`;
        html += `<div class="info-row">Tool: <span class="skill-tip" data-tip="${toolTip}">${colonist.tool?.name || 'None'}</span></div>`;
        html += `<div class="info-row">Artifact: <span class="skill-tip" data-tip="${artifactTip}">${colonist.artifact?.name || 'None'}</span></div>`;
        if (colonist.equippedTome) {
            const tomeDef = SPELL_TOMES[colonist.equippedTome];
            const currentProgress = (colonist.tomeProgress && colonist.tomeProgress[colonist.equippedTome]) || 0;
            const progress = Math.floor((currentProgress / tomeDef.learningWork) * 100);
            html += `<div class="info-row"><span style="color:#bb88ff">Studying: ${tomeDef.name} (${progress}%)</span></div>`;
        }
        if (colonist.knownSpells && colonist.knownSpells.length > 0) {
            html += `<div class="info-row" style="color:#aa88ff"><b>Known Spells:</b></div>`;
            for (const spellKey of colonist.knownSpells) {
                const spell = SPELLS[spellKey];
                if (!spell) continue;
                const onCooldown = colonist._spellCooldowns?.[spellKey] && this.game.tick - colonist._spellCooldowns[spellKey] < spell.cooldown;
                const cdRemaining = onCooldown ? spell.cooldown - (this.game.tick - colonist._spellCooldowns[spellKey]) : 0;
                const hasMana = colonist.mana >= spell.manaCost;
                const isDisabled = colonist.disabledSpells && colonist.disabledSpells.includes(spellKey);
                let spellHtml = '';
                if (spell.castType === 'auto') {
                    const checked = !isDisabled ? 'checked' : '';
                    spellHtml += `<input type="checkbox" ${checked} onchange="window.game.toggleSpell(${colonist.id},'${spellKey}')" style="margin-right:4px;vertical-align:middle">`;
                }
                const tipDesc = this._spellTooltip(spell);
                spellHtml += `<span class="skill-tip" data-tip="${tipDesc}" style="color:${isDisabled ? '#666' : '#bb88ff'}">${spell.name}</span> <span style="color:#666;font-size:0.85em">(${spell.manaCost} mana, ${spell.cooldown}t cd)</span>`;
                if (spell.castType === 'targeted') {
                    const disabled = onCooldown || !hasMana;
                    const reason = onCooldown ? `${cdRemaining}t` : !hasMana ? 'low mana' : '';
                    spellHtml += disabled
                        ? ` <span style="color:#666">[${reason}]</span>`
                        : ` <button onclick="window.game.startSpellTargeting(${colonist.id},'${spellKey}')" style="font-size:0.8em">Cast</button>`;
                } else {
                    spellHtml += ` <span style="color:#555;font-size:0.8em">[auto${onCooldown ? `, ${cdRemaining}t` : ''}]</span>`;
                }
                html += `<div class="info-row" style="padding-left:8px">${spellHtml}</div>`;
            }
        }
        if (colonist.activeEffects && colonist.activeEffects.length > 0) {
            const effects = colonist.activeEffects.map(e => `<span style="color:#88ffaa">${e.type} (${e.expiresAt - this.game.tick}t)</span>`).join(', ');
            html += `<div class="info-row">Effects: ${effects}</div>`;
        }
        if (colonist.activeAuras && colonist.activeAuras.length > 0) {
            const auraSpans = colonist.activeAuras.map(a => {
                const def = ARTIFACTS[a.key];
                const tip = def ? this._getArtifactTooltip(def) : a.name;
                const clickAction = a.sourceType === 'pedestal'
                    ? `window.game.camera.centerOn(${a.x},${a.y})`
                    : `window.game.selectColonistById(${a.colonistId})`;
                return `<span class="skill-tip" data-tip="${tip}" style="color:#ccaa44;cursor:pointer;text-decoration:underline" onclick="${clickAction}">${a.name}</span>`;
            }).join(', ');
            html += `<div class="info-row">Auras: ${auraSpans}</div>`;
        }
        html += `<div class="info-row">Bed: ${colonist.assignedBed ? `(${colonist.assignedBed.x},${colonist.assignedBed.y})` : 'None'}</div>`;
        if (thoughts) html += `<div class="info-thoughts"><b>Thoughts:</b><br>${thoughts}</div>`;
        html += `<div class="info-actions">`;
        html += `<button onclick="window.game.toggleDraft(${colonist.id})">${colonist.drafted ? 'Undraft' : 'Draft'}</button>`;
        html += `<button onclick="window.game.toggleGuard(${colonist.id})">${colonist.guardMode ? 'Unguard' : 'Guard'}</button>`;
        html += `<button onclick="window.game.draftAll()">Draft All</button>`;
        html += `<button onclick="window.game.undraftAll()">Undraft All</button>`;
        html += this.buildWeaponDropdown(colonist);
        html += this.buildArmorDropdown(colonist);
        html += this.buildToolDropdown(colonist);
        html += this.buildArtifactDropdown(colonist);
        html += this.buildTomeDropdown(colonist);
        html += `<button onclick="window.game.autoEquipBest(${colonist.id})">Auto-equip Best</button>`;
        const others = this.game.colonists.filter(c => c.hp > 0 && c.id !== colonist.id);
        if (others.length > 0) {
            html += `<select onchange="if(this.value)window.game.copyPriorities(${colonist.id},parseInt(this.value))"><option value="">Copy Priorities From...</option>`;
            for (const o of others) html += `<option value="${o.id}">${o.name}</option>`;
            html += `</select>`;
        }
        html += `<button onclick="window.game.centerOnColonist(${colonist.id})">Center Camera</button>`;
        const isFollowing = this.game.followingColonist === colonist.id;
        html += `<button onclick="window.game.toggleFollow(${colonist.id})">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
        html += `</div>`;
        html += `<div class="info-row">Color: <input type="color" value="${nc}" onchange="window.game.setColonistColor(${colonist.id}, this.value)"></div>`;
        return html;
    }

    showColonistInfo(colonist) {
        this._switchToInfoTab();
        this._viewingRiftGate = false;
        this._viewingColonistId = colonist.id;
        this.elements.infoPanel.innerHTML = this.buildColonistInfoHtml(colonist);
    }

    buildWeaponDropdown(colonist) {
        const weapons = this.game.resources.weapons;
        let html = `<select onchange="if(this.value==='unequip'){window.game.unequipWeapon(${colonist.id})}else if(this.value!==''){window.game.equipWeapon(${colonist.id},parseInt(this.value))}">`;
        html += `<option value="">Weapon: ${colonist.weapon?.name || 'Fists'}</option>`;
        if (colonist.weapon) {
            html += `<option value="unequip">Unequip ${colonist.weapon.name}</option>`;
        }
        weapons.forEach((w, i) => {
            html += `<option value="${i}">${w.name} (${w.damage} dmg)</option>`;
        });
        if (weapons.length === 0 && !colonist.weapon) {
            html += `<option disabled>No weapons available</option>`;
        }
        html += `</select>`;
        return html;
    }

    buildArmorDropdown(colonist) {
        const armors = this.game.resources.armors;
        let html = `<select onchange="if(this.value==='unequip'){window.game.unequipArmor(${colonist.id})}else if(this.value!==''){window.game.equipArmor(${colonist.id},parseInt(this.value))}">`;
        html += `<option value="">Armor: ${colonist.armor?.name || 'None'}</option>`;
        if (colonist.armor) {
            html += `<option value="unequip">Unequip ${colonist.armor.name}</option>`;
        }
        armors.forEach((a, i) => {
            html += `<option value="${i}">${a.name} (${Math.round(a.damageReduction * 100)}% DR)</option>`;
        });
        if (armors.length === 0 && !colonist.armor) {
            html += `<option disabled>No armor available</option>`;
        }
        html += `</select>`;
        return html;
    }

    buildToolDropdown(colonist) {
        const tools = this.game.resources.tools;
        let html = `<select onchange="if(this.value==='unequip'){window.game.unequipTool(${colonist.id})}else if(this.value!==''){window.game.equipTool(${colonist.id},parseInt(this.value))}">`;
        html += `<option value="">Tool: ${colonist.tool?.name || 'None'}</option>`;
        if (colonist.tool) {
            html += `<option value="unequip">Unequip ${colonist.tool.name}</option>`;
        }
        tools.forEach((t, i) => {
            const stats = Object.entries(t).filter(([k]) => k !== 'name' && k !== 'key').map(([k, v]) => typeof v === 'number' ? `+${Math.round((v - 1) * 100)}%` : '').filter(Boolean).join('/');
            html += `<option value="${i}">${t.name}${stats ? ` (${stats})` : ''}</option>`;
        });
        if (tools.length === 0 && !colonist.tool) {
            html += `<option disabled>No tools available</option>`;
        }
        html += `</select>`;
        return html;
    }

    buildArtifactDropdown(colonist) {
        const artifacts = this.game.resources.artifacts;
        let html = `<select onchange="if(this.value==='unequip'){window.game.unequipArtifact(${colonist.id})}else if(this.value!==''){window.game.equipArtifact(${colonist.id},parseInt(this.value))}">`;
        html += `<option value="">Artifact: ${colonist.artifact?.name || 'None'}</option>`;
        if (colonist.artifact) {
            html += `<option value="unequip">Unequip ${colonist.artifact.name}</option>`;
        }
        artifacts.forEach((a, i) => {
            const stats = Object.entries(a).filter(([k]) => k !== 'name' && k !== 'key').map(([k, v]) => typeof v === 'number' ? (v < 1 ? `${Math.round(v*100)}%` : `+${Math.round((v-1)*100)}%`) : '').filter(Boolean).join('/');
            html += `<option value="${i}">${a.name}${stats ? ` (${stats})` : ''}</option>`;
        });
        if (artifacts.length === 0 && !colonist.artifact) {
            html += `<option disabled>No artifacts available</option>`;
        }
        html += `</select>`;
        return html;
    }

    buildTomeDropdown(colonist) {
        const tomes = this.game.resources.tomes || [];
        let html = `<select onchange="if(this.value==='unequip'){window.game.unequipTome(${colonist.id})}else if(this.value!==''){window.game.equipTome(${colonist.id},parseInt(this.value))}">`;
        const currentTome = colonist.equippedTome ? SPELL_TOMES[colonist.equippedTome]?.name : 'None';
        html += `<option value="">Tome: ${currentTome}</option>`;
        if (colonist.equippedTome) {
            html += `<option value="unequip">Unequip</option>`;
        }
        tomes.forEach((t, i) => {
            const def = SPELL_TOMES[t.key];
            if (!def) return;
            const spell = SPELLS[def.spell];
            const canStudy = (colonist.magicSkills[spell?.school] || 0) >= def.minSchoolLevel;
            const alreadyKnown = colonist.knownSpells.includes(def.spell);
            if (alreadyKnown) return;
            html += `<option value="${i}" ${canStudy ? '' : 'disabled'}>${def.name}${canStudy ? '' : ` (need ${MAGIC_SKILLS[spell.school].name} ${def.minSchoolLevel})`}</option>`;
        });
        if (tomes.length === 0 && !colonist.equippedTome) {
            html += `<option disabled>No tomes available</option>`;
        }
        html += `</select>`;
        return html;
    }

    getCraftOutputTip(outputKey) {
        if (WEAPONS[outputKey]) {
            const w = WEAPONS[outputKey];
            let tip = `${w.damage} damage`;
            if (w.miningSpeed) tip += `, +${Math.round((w.miningSpeed-1)*100)}% mining`;
            if (w.choppingSpeed) tip += `, +${Math.round((w.choppingSpeed-1)*100)}% chopping`;
            return tip;
        }
        if (ARMORS[outputKey]) return `${Math.round(ARMORS[outputKey].damageReduction * 100)}% damage reduction`;
        if (TOOLS[outputKey]) {
            const t = TOOLS[outputKey];
            const stats = [];
            if (t.miningSpeed) stats.push(`+${Math.round((t.miningSpeed-1)*100)}% mining`);
            if (t.choppingSpeed) stats.push(`+${Math.round((t.choppingSpeed-1)*100)}% chopping`);
            if (t.farmingSpeed) stats.push(`+${Math.round((t.farmingSpeed-1)*100)}% farming`);
            if (t.moveSpeedBonus) stats.push(`+${Math.round(t.moveSpeedBonus*100)}% move speed`);
            return stats.join(', ');
        }
        if (ARTIFACTS[outputKey]) {
            const a = ARTIFACTS[outputKey];
            const stats = [];
            if (a.miningSpeed) stats.push(`+${Math.round((a.miningSpeed-1)*100)}% mining`);
            if (a.choppingSpeed) stats.push(`+${Math.round((a.choppingSpeed-1)*100)}% chopping`);
            if (a.farmingSpeed) stats.push(`+${Math.round((a.farmingSpeed-1)*100)}% farming`);
            if (a.moveSpeedBonus) stats.push(`+${Math.round(a.moveSpeedBonus*100)}% move speed`);
            if (a.damageReduction) stats.push(`-${Math.round(a.damageReduction*100)}% damage taken`);
            return stats.join(', ');
        }
        if (POTIONS[outputKey]) {
            const p = POTIONS[outputKey];
            if (p.effect === 'heal') return `Heals ${p.healAmount} HP`;
            if (p.effect === 'speed') return `+${Math.round((p.workSpeedBonus-1)*100)}% work, +${Math.round(p.moveSpeedBonus*100)}% move for ${p.duration} ticks`;
            return p.name;
        }
        return null;
    }

    showAnimalInfo(animal) {
        this._switchToInfoTab();
        this._viewingColonistId = null;
        let html = `<div class="info-header">${animal.type}</div>`;
        html += `<div class="info-row">HP: ${animal.hp}/${animal.maxHp}</div>`;
        html += `<div class="info-row">${animal.hostile ? 'Hostile' : 'Passive'}</div>`;
        html += `<div class="info-actions">`;
        if (!animal.hostile) {
            html += `<button onclick="window.game.huntAnimal(${animal.id})">Hunt</button>`;
        }
        html += `</div>`;
        this.elements.infoPanel.innerHTML = html;
    }

    showTileInfo(tile, x, y) {
        this._switchToInfoTab();
        this._viewingColonistId = null;
        this._viewingRiftGate = (tile.structure === 'rift_gate');
        let html = `<div class="info-header">Tile (${x},${y})</div>`;
        html += `<div class="info-row">Terrain: ${tile.terrain}</div>`;
        if (tile.structure) {
            html += `<div class="info-row" style="color:#ddd;font-weight:bold;">${tile.structure.replace(/_/g,' ')}</div>`;
            const maxHp = BUILDINGS[tile.structure]?.hp;
            if (maxHp) {
                const currentHp = tile.structureHp !== undefined ? tile.structureHp : maxHp;
                const hpColor = currentHp >= maxHp ? '#88ff88' : currentHp > maxHp * 0.5 ? '#ffcc00' : '#ff4444';
                html += `<div class="info-row" style="color:${hpColor}">HP: ${currentHp} / ${maxHp}</div>`;
            }
            html += this.getStructureDescription(tile.structure);
        }
        if (tile.floor) {
            html += `<div class="info-row" style="color:#999">Floor: ${tile.floor.replace(/_/g,' ')}</div>`;
        }
        if (tile.resource) html += `<div class="info-row">Resource: ${tile.resource.type} (${tile.resource.amount})</div>`;
        if (tile.zone) html += `<div class="info-row">Zone: ${tile.zone.crop} (${tile.zone.state})</div>`;
        if (tile.roomId !== null) html += `<div class="info-row">Room #${tile.roomId}</div>`;
        if (tile.onFire) html += `<div class="info-row fire">ON FIRE!</div>`;

        if (tile.structure === 'bed') {
            const assigned = this.game.colonists.find(c =>
                c.assignedBed && c.assignedBed.x === x && c.assignedBed.y === y && c.hp > 0
            );
            if (assigned) {
                html += `<div class="info-row">Assigned to: ${assigned.name}</div>`;
                html += `<div class="info-actions"><button onclick="window.game.unassignBed(${x},${y})">Unassign</button></div>`;
            } else {
                html += `<div class="info-row">Unassigned bed</div>`;
                html += `<div class="info-actions">`;
                html += `<label>Assign: </label>`;
                html += `<select id="bed-assign-select" onchange="window.game.assignBedFromSelect(${x},${y},this.value)">`;
                html += `<option value="">-- Select colonist --</option>`;
                for (const c of this.game.colonists) {
                    if (c.hp <= 0) continue;
                    const hasBed = c.assignedBed ? ` (has bed)` : '';
                    html += `<option value="${c.id}">${c.name}${hasBed}</option>`;
                }
                html += `</select>`;
                html += `</div>`;
            }
        }

        if (tile.structure === 'void_nexus') {
            const waves = this.game.waves;
            html += `<div class="info-row" style="color:#9933ff;font-weight:bold;">Void Nexus</div>`;
            html += `<div class="info-row">Highest Wave: ${waves.highestWaveCompleted}</div>`;
            html += `<div class="info-row">Colony Cap: ${waves.getColonistCap()}</div>`;
            if (waves.active) {
                html += `<div class="info-row" style="color:#ff4444;">Wave ${waves.currentWave} in progress!</div>`;
                html += `<div class="info-row">Nexus HP: ${waves.nexusHp}/${waves.nexusMaxHp}</div>`;
                html += `<div class="info-row">Enemies: ${waves.enemies.length} alive, ${waves.enemiesToSpawn - waves.enemiesSpawned} spawning</div>`;
            } else {
                const nextWave = waves.highestWaveCompleted + 1;
                html += `<div class="info-row">Next: Wave ${nextWave} (${this.getWavePreview(nextWave)})</div>`;
                html += `<div class="info-actions"><button onclick="window.game.startWave()" style="background:#6622aa;color:white;">Start Wave ${nextWave}</button></div>`;
            }
        }

        if (tile.structure === 'artifact_pedestal') {
            if (tile.pedestalArtifact) {
                const artDef = ARTIFACTS[tile.pedestalArtifact];
                const broken = tile.pedestalInactive ? ' <span style="color:#ff4444;">(No Power)</span>' : '';
                html += `<div class="info-row" style="color:#ccaa44;">Artifact: ${artDef?.name || tile.pedestalArtifact}${broken}</div>`;
                html += this.getPedestalEffectDescription(artDef);
                if (artDef?.pedestal?.radius && artDef.pedestal.radius !== 'global') {
                    html += `<div class="info-row">Radius: ${artDef.pedestal.radius} | Mana: -${artDef.pedestal.manaCost || 0}</div>`;
                } else if (artDef?.pedestal?.radius === 'global') {
                    html += `<div class="info-row">Effect: Colony-wide | Mana: -${artDef.pedestal.manaCost || 0}</div>`;
                }
                html += `<div class="info-actions"><button onclick="window.game.retrievePedestalArtifact(${x},${y})">Retrieve Artifact</button></div>`;
            } else {
                html += `<div class="info-row" style="color:#888;">Empty — place an artifact</div>`;
                const available = this.game.resources.artifacts.filter(a => a.pedestal);
                if (available.length > 0) {
                    html += `<div class="info-actions"><select id="pedestal-select">`;
                    for (const art of available) {
                        html += `<option value="${art.key}">${art.name}</option>`;
                    }
                    html += `</select>`;
                    html += `<button onclick="window.game.placePedestalArtifact(${x},${y},document.getElementById('pedestal-select').value)">Place</button></div>`;
                } else {
                    html += `<div class="info-row" style="color:#666;">No artifacts with pedestal effects in inventory</div>`;
                }
            }
        }

        if (tile.structure === 'rift_gate') {
            html += this._buildRiftGateHtml();
        }

        if (tile.structure === 'golem_forge') {
            html += this._buildGolemForgeHtml();
        }

        if (tile.structure === 'forge_core' || tile.structure === 'ritual_core') {
            const cs = getComplexStructureAt(this.game, x, y);
            if (cs) {
                html += `<div class="info-row" style="color:#44ff44;font-weight:bold;">Pattern Active!</div>`;
                const def = COMPLEX_STRUCTURES[cs.key];
                if (def) html += `<div class="info-row" style="color:#88ff88;">${def.description}</div>`;
            } else {
                html += `<div class="info-row" style="color:#ff8844;">Pattern incomplete — surround with the required layout to activate</div>`;
            }
        }

        this.elements.infoPanel.innerHTML = html;
    }

    showTileEntities(tile, x, y, colonists, animals, raiders = [], tamedAnimals = []) {
        this._switchToInfoTab();
        this._viewingRiftGate = (tile.structure === 'rift_gate');
        this._viewingColonistId = (colonists.length === 1 && animals.length === 0 && raiders.length === 0 && tamedAnimals.length === 0)
            ? colonists[0].id : null;
        let html = '';

        for (const r of raiders) {
            const isWaveEnemy = r.char === 'E';
            const label = isWaveEnemy ? 'Void Enemy' : 'Raider';
            const color = isWaveEnemy ? '#cc00ff' : '#ff3333';
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="color:${color};">${label}</div>`;
            html += `<div class="info-row">HP: ${r.hp}/${r.maxHp}</div>`;
            html += `<div class="info-row">${isWaveEnemy ? 'Damage' : 'Weapon'}: ${r.weapon?.name || ''} (${r.damage} dmg)</div>`;
            html += `<div class="info-row">State: ${r.fleeing ? 'Fleeing' : 'Attacking'}</div>`;
            html += `</div>`;
        }

        for (const c of colonists) {
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += this.buildColonistInfoHtml(c);
            html += `</div>`;
        }

        for (const a of animals) {
            const def = ANIMALS[a.type];
            const color = def?.color || '#ccaa88';
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="color:${color};">${a.type}${a.hostile ? ' (hostile)' : ''}${def?.tameable ? ' (tameable)' : ''}</div>`;
            html += `<div class="info-row">HP: ${a.hp}/${a.maxHp}</div>`;
            if (def?.meatYield) html += `<div class="info-row">Meat yield: ${def.meatYield}</div>`;
            if (a.hostile && def?.damage) html += `<div class="info-row">Damage: ${def.damage}</div>`;
            if (def?.tameable) {
                const tamedDef = TAMED_ANIMALS[a.type];
                if (tamedDef?.produces) html += `<div class="info-row" style="color:#88cc88">Produces: ${tamedDef.produces} (every ${tamedDef.produceRate} ticks)</div>`;
                if (tamedDef?.packAnimal) html += `<div class="info-row" style="color:#bbaa44">Pack animal (+${Math.round(tamedDef.expeditionSpeedBonus * 100)}% expedition speed)</div>`;
                if (tamedDef?.happinessAura) html += `<div class="info-row" style="color:#ff88cc">Happiness aura (radius ${tamedDef.auraRadius})</div>`;
            }
            html += `<div class="info-row">Speed: ${def?.speed || a.speed}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.huntAnimal(${a.id})">Hunt</button>`;
            if (def?.tameable && this.game.research.isResearched('beast_binding')) {
                const tamedDef = TAMED_ANIMALS[a.type];
                const canAfford = tamedDef && this.game.resources.has({ food: tamedDef.foodToTame });
                if (tamedDef?.dangerousTame) {
                    const bestTamer = this.game.colonists.filter(c => c.hp > 0).sort((a, b) => (b.skills.animals || 0) - (a.skills.animals || 0))[0];
                    const chance = bestTamer ? Math.round(getTameChance(bestTamer, a.type) * 100) : Math.round((tamedDef.baseTameChance || 0.4) * 100);
                    html += `<button ${canAfford ? '' : 'disabled'} onclick="window.game.tameWildAnimal(${a.id})">Tame (${tamedDef.foodToTame} food) — ${chance}%</button>`;
                    html += `<div class="info-row" style="color:#ff6644;font-size:0.85em">⚠ Dangerous! Retaliation: ${tamedDef.retaliationDamage} dmg on failure</div>`;
                } else {
                    html += `<button ${canAfford ? '' : 'disabled'} onclick="window.game.tameWildAnimal(${a.id})">Tame (${tamedDef?.foodToTame || '?'} food)</button>`;
                }
            }
            html += `</div></div>`;
        }

        for (const a of tamedAnimals) {
            const def = TAMED_ANIMALS[a.type];
            const color = def?.color || '#ccaa88';
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="color:${color};">${a.type} (tamed)</div>`;
            html += `<div class="info-row">HP: ${a.hp}/${a.maxHp}</div>`;
            if (def?.produces) {
                html += `<div class="info-row">Produces: ${def.produces} (every ${def.produceRate} ticks)</div>`;
                html += `<div class="info-row">Next in: ${a.produceCooldown} ticks</div>`;
            }
            if (def?.guardAnimal) {
                const stateColor = a.guardState === 'engaging' ? '#ff4444' : a.guardState === 'retreating' ? '#ffaa00' : '#44cc44';
                html += `<div class="info-row" style="color:${stateColor}">Guard: ${(a.guardState || 'patrolling').charAt(0).toUpperCase() + (a.guardState || 'patrolling').slice(1)}</div>`;
            }
            if (def?.packAnimal) html += `<div class="info-row" style="color:#bbaa44">Pack animal (+${Math.round(def.expeditionSpeedBonus * 100)}% expedition speed)</div>`;
            if (def?.happinessAura) html += `<div class="info-row" style="color:#ff88cc">Happiness aura (radius ${def.auraRadius})</div>`;
            if (a.onExpedition) html += `<div class="info-row" style="color:#33ccff">On expedition</div>`;
            html += `</div>`;
        }

        html += `<div class="info-header" style="font-size:11px;color:#aaa;">Tile (${x},${y})</div>`;
        if (tile.onFire) html += `<div class="info-row fire">ON FIRE!</div>`;
        if (tile.structure) {
            html += `<div class="info-row" style="color:#ddd;font-weight:bold;">${tile.structure.replace(/_/g,' ')}</div>`;
            const maxHp = BUILDINGS[tile.structure]?.hp;
            if (maxHp) {
                const currentHp = tile.structureHp !== undefined ? tile.structureHp : maxHp;
                const hpColor = currentHp >= maxHp ? '#88ff88' : currentHp > maxHp * 0.5 ? '#ffcc00' : '#ff4444';
                html += `<div class="info-row" style="color:${hpColor}">HP: ${currentHp} / ${maxHp}</div>`;
            }
            html += this.getStructureDescription(tile.structure);
        }
        if (tile.floor) html += `<div class="info-row" style="color:#999">Floor: ${tile.floor.replace(/_/g,' ')}</div>`;
        if (tile.zone) html += `<div class="info-row">Zone: ${tile.zone.crop} (${tile.zone.state})</div>`;
        if (tile.resource) html += `<div class="info-row">Resource: ${tile.resource.type} (${tile.resource.amount})</div>`;
        html += `<div class="info-row">Terrain: ${tile.terrain}</div>`;
        if (tile.roomId !== null) html += `<div class="info-row">Room #${tile.roomId}</div>`;

        if (tile.structure === 'bed') {
            const assigned = this.game.colonists.find(c =>
                c.assignedBed && c.assignedBed.x === x && c.assignedBed.y === y && c.hp > 0
            );
            if (assigned) {
                html += `<div class="info-row">Assigned to: ${assigned.name}</div>`;
                html += `<div class="info-actions"><button onclick="window.game.unassignBed(${x},${y})">Unassign</button></div>`;
            } else {
                html += `<div class="info-row">Unassigned bed</div>`;
                html += `<div class="info-actions">`;
                html += `<label>Assign: </label>`;
                html += `<select id="bed-assign-select" onchange="window.game.assignBedFromSelect(${x},${y},this.value)">`;
                html += `<option value="">-- Select colonist --</option>`;
                for (const c of this.game.colonists) {
                    if (c.hp <= 0) continue;
                    const hasBed = c.assignedBed ? ` (has bed)` : '';
                    html += `<option value="${c.id}">${c.name}${hasBed}</option>`;
                }
                html += `</select></div>`;
            }
        }

        if (tile.structure === 'void_nexus') {
            const waves = this.game.waves;
            html += `<div class="info-row" style="color:#9933ff;font-weight:bold;">Void Nexus</div>`;
            html += `<div class="info-row">Highest Wave: ${waves.highestWaveCompleted}</div>`;
            html += `<div class="info-row">Colony Cap: ${waves.getColonistCap()}</div>`;
            if (waves.active) {
                html += `<div class="info-row" style="color:#ff4444;">Wave ${waves.currentWave} in progress!</div>`;
                html += `<div class="info-row">Nexus HP: ${waves.nexusHp}/${waves.nexusMaxHp}</div>`;
                html += `<div class="info-row">Enemies: ${waves.enemies.length} alive, ${waves.enemiesToSpawn - waves.enemiesSpawned} spawning</div>`;
            } else {
                const nextWave = waves.highestWaveCompleted + 1;
                html += `<div class="info-row">Next: Wave ${nextWave} (${this.getWavePreview(nextWave)})</div>`;
                html += `<div class="info-actions"><button onclick="window.game.startWave()" style="background:#6622aa;color:white;">Start Wave ${nextWave}</button></div>`;
            }
        }

        if (tile.structure === 'artifact_pedestal') {
            if (tile.pedestalArtifact) {
                const artDef = ARTIFACTS[tile.pedestalArtifact];
                const broken = tile.pedestalInactive ? ' <span style="color:#ff4444;">(No Power)</span>' : '';
                html += `<div class="info-row" style="color:#ccaa44;">Artifact: ${artDef?.name || tile.pedestalArtifact}${broken}</div>`;
                html += this.getPedestalEffectDescription(artDef);
                if (artDef?.pedestal?.radius && artDef.pedestal.radius !== 'global') {
                    html += `<div class="info-row">Radius: ${artDef.pedestal.radius} | Mana: -${artDef.pedestal.manaCost || 0}</div>`;
                } else if (artDef?.pedestal?.radius === 'global') {
                    html += `<div class="info-row">Effect: Colony-wide | Mana: -${artDef.pedestal.manaCost || 0}</div>`;
                }
                html += `<div class="info-actions"><button onclick="window.game.retrievePedestalArtifact(${x},${y})">Retrieve Artifact</button></div>`;
            } else {
                html += `<div class="info-row" style="color:#888;">Empty — place an artifact</div>`;
                const available = this.game.resources.artifacts.filter(a => a.pedestal);
                if (available.length > 0) {
                    html += `<div class="info-actions"><select id="pedestal-select">`;
                    for (const art of available) {
                        html += `<option value="${art.key}">${art.name}</option>`;
                    }
                    html += `</select>`;
                    html += `<button onclick="window.game.placePedestalArtifact(${x},${y},document.getElementById('pedestal-select').value)">Place</button></div>`;
                } else {
                    html += `<div class="info-row" style="color:#666;">No artifacts with pedestal effects in inventory</div>`;
                }
            }
        }

        if (tile.structure === 'rift_gate') {
            html += this._buildRiftGateHtml();
        }

        if (tile.structure === 'golem_forge') {
            html += this._buildGolemForgeHtml();
        }

        this.elements.infoPanel.innerHTML = html;
    }

    showMultiColonistInfo(colonists) {
        this._switchToInfoTab();
        this._viewingColonistId = null;
        const draftedCount = colonists.filter(c => c.drafted).length;
        let html = `<div class="info-header">${colonists.length} Colonists Selected</div>`;
        html += `<div class="info-actions" style="margin-bottom:8px;">`;
        html += `<button onclick="window.game.draftAllSelected()">Draft All</button>`;
        html += `<button onclick="window.game.undraftAllSelected()">Undraft All</button>`;
        html += `</div>`;
        html += `<div class="info-row" style="color:#888">${draftedCount} drafted</div>`;

        for (const c of colonists) {
            const moodLevel = getMoodLabel(c.mood);
            html += `<div style="border-top:1px solid #333;margin-top:4px;padding-top:4px;">`;
            html += `<span class="info-header" style="font-size:12px;cursor:pointer;color:${c.nameColor || '#ffff00'}" onclick="window.game.selectColonistById(${c.id})">${c.name}</span>`;
            html += ` <span class="mood-${moodLevel}">${c.mood.toFixed(0)}</span>`;
            html += ` <span style="color:#888">${c.state}${c.drafted ? ' [D]' : ''}${c.guardMode ? ' [G]' : ''}${c.golem ? ' [Golem]' : ''}</span>`;
            html += `<div class="info-row">HP:${Math.round(c.hp)} H:${c.needs.hunger.toFixed(0)} R:${c.needs.rest.toFixed(0)}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.selectColonistById(${c.id})">Focus</button>`;
            html += `<button onclick="window.game.toggleDraft(${c.id})">${c.drafted ? 'Undraft' : 'Draft'}</button>`;
            html += `<button onclick="window.game.toggleGuard(${c.id})">${c.guardMode ? 'Unguard' : 'Guard'}</button>`;
            html += `</div></div>`;
        }

        this.elements.infoPanel.innerHTML = html;
    }

    _updateOverlay() {
        const anyOpen = this.priorityPanelVisible || this.craftPanelVisible ||
            this.researchPanelVisible || this.inventoryVisible ||
            this.tamingPanelVisible || this.settingsPanelVisible;
        const overlay = document.getElementById('panel-overlay');
        if (overlay) overlay.classList.toggle('visible', anyOpen);
    }

    _closeAllPanels() {
        if (this.priorityPanelVisible) {
            this.priorityPanelVisible = false;
            this.elements.priorityPanel.style.display = 'none';
        }
        if (this.craftPanelVisible) {
            this.craftPanelVisible = false;
            this.elements.craftPanel.style.display = 'none';
        }
        if (this.researchPanelVisible) {
            this.researchPanelVisible = false;
            this.elements.researchPanel.style.display = 'none';
        }
        if (this.inventoryVisible) {
            this.inventoryVisible = false;
            this.elements.inventoryPanel.style.display = 'none';
        }
        if (this.tamingPanelVisible) {
            this.tamingPanelVisible = false;
            this.elements.tamingPanel.style.display = 'none';
        }
        if (this.settingsPanelVisible) {
            this.settingsPanelVisible = false;
            this.elements.settingsPanel.style.display = 'none';
        }
    }

    _panelPause(opening) {
        if (opening) {
            if (!this._panelSessionActive) {
                this._panelSessionActive = true;
                this._wasPausedBeforePanel = this.game.paused;
                if (!this.game.paused) this.game.togglePause();
            }
        } else {
            this._panelSessionActive = false;
            if (!this._wasPausedBeforePanel && this.game.paused) this.game.togglePause();
        }
    }

    togglePriorityPanel() {
        const opening = !this.priorityPanelVisible;
        this._closeAllPanels();
        this.priorityPanelVisible = opening;
        this._panelPause(opening);
        this.elements.priorityPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updatePriorityPanel();
        this._updateOverlay();
    }

    updatePriorityPanel() {
        const skills = [...Object.keys(SKILLS), 'hauling'];
        let html = '<table><tr><th>Colonist</th>';
        skills.forEach(s => { html += `<th>${s.substring(0, 5)}</th>`; });
        html += '</tr>';

        for (const c of this.game.colonists) {
            if (c.hp <= 0) continue;
            html += `<tr><td style="color:${c.nameColor || '#ffff00'}">${c.name}</td>`;
            for (const s of skills) {
                const val = c.priorities[s];
                const display = val === 0 ? '-' : val;
                html += `<td class="prio-cell" data-colonist-id="${c.id}" data-skill="${s}">${display}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        const fullHtml = '<div class="panel-close" data-panel-close="priority">&times;</div><h3>Work Priorities (click to cycle, -=disabled)</h3>' + html;
        if (fullHtml !== this._lastPrioHtml) {
            this._lastPrioHtml = fullHtml;
            this.elements.priorityPanel.innerHTML = fullHtml;
        }
    }

    toggleCraftPanel() {
        const opening = !this.craftPanelVisible;
        this._closeAllPanels();
        this.craftPanelVisible = opening;
        this._panelPause(opening);
        this.elements.craftPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updateCraftPanel();
        this._updateOverlay();
    }

    updateCraftPanel() {
        if (!this._craftTab) this._craftTab = RECIPE_CATEGORIES[0];
        const recipes = getAvailableRecipes(this.game);
        let html = '<div class="panel-close" data-panel-close="craft">&times;</div><h3>Crafting Orders</h3>';
        html += '<div class="craft-tabs">';
        for (const cat of RECIPE_CATEGORIES) {
            const active = cat === this._craftTab ? ' active' : '';
            html += `<button class="craft-tab${active}" data-craft-tab="${cat}">${cat}</button>`;
        }
        html += '</div>';
        const filtered = recipes.filter(r => (r.recipe.category || 'Materials') === this._craftTab);
        for (const { key, recipe, canCraft } of filtered) {
            const inputStr = Object.entries(recipe.input).map(([k, v]) => {
                if (k === 'foodstuffs') return `${v} foodstuffs (have ${this.game.resources.getFoodstuffTotal()})`;
                return `${k}:${v}`;
            }).join(' + ');
            const outputStr = Object.entries(recipe.output).map(([k, v]) => {
                const tip = this.getCraftOutputTip(k);
                if (tip) return `<span class="skill-tip" data-tip="${tip}">${k.replace(/_/g, ' ')}${v > 1 ? ':' + v : ''}</span>`;
                return `${k}:${v}`;
            }).join('+');
            const cls = canCraft ? 'craft-available' : 'craft-unavailable';
            html += `<div class="craft-row ${cls}">`;
            html += `<button ${canCraft ? '' : 'disabled'} onclick="window.game.craft('${key}')">${key.replace(/_/g, ' ')}</button>`;
            html += `<button ${canCraft ? '' : 'disabled'} onclick="window.game.craftMultiple('${key}',5)" class="craft-multi">x5</button>`;
            html += `<span>${inputStr} → ${outputStr}</span>`;
            html += `</div>`;
        }
        if (filtered.length === 0) {
            html += '<div style="color:#666; padding:8px;">No recipes available in this category.</div>';
        }
        if (this._craftTab === 'Food & Potions') {
            const target = this.game.settings.autoCookTarget || 0;
            html += '<div style="margin-top:12px; padding-top:8px; border-top:1px solid #444;">';
            html += `<div style="display:flex; align-items:center; gap:8px;">`;
            html += `<label style="color:#ccc; white-space:nowrap;">Auto-cook target: <span id="autocook-val" style="color:#88cc88; font-weight:bold;">${target || 'Off'}</span></label>`;
            html += `<input type="range" id="set-autocook" min="0" max="100" step="10" value="${target}" style="flex:1" oninput="window.game.settings.autoCookTarget=parseInt(this.value);document.getElementById('autocook-val').textContent=this.value||'Off'">`;
            html += `</div>`;
            html += `<div style="color:#777; font-size:0.83em; margin-top:4px;">Automatically queues cooking when food drops below target.</div>`;
            html += '</div>';
        }
        if (html !== this._lastCraftHtml) {
            this._lastCraftHtml = html;
            this.elements.craftPanel.innerHTML = html;
        }
    }

    updateColonistHud() {
        let html = '<div class="footer-panel-header">Colonists</div>';
        // Show alive colonists first, dead at the bottom
        const sorted = [...this.game.colonists].sort((a, b) => (b.hp > 0 ? 1 : 0) - (a.hp > 0 ? 1 : 0));
        for (const c of sorted) {
            if (c.hp <= 0) {
                html += `<div class="hud-colonist dead"><span class="hud-name" style="color:${c.nameColor || '#ffff00'}">${c.name}</span> <span style="color:#cc4444">DEAD</span></div>`;
                continue;
            }
            if (c.onExpedition) {
                html += `<div class="hud-colonist" data-colonist-id="${c.id}"><span class="hud-name" style="color:${c.nameColor || '#ffff00'}">${c.name}</span> <span style="color:#33ccff">EXPLORING</span></div>`;
                continue;
            }
            const moodLevel = getMoodLabel(c.mood);
            const moodColor = moodLevel === 'inspired' ? '#66ffcc' : moodLevel === 'content' ? '#88cc88' : moodLevel === 'stressed' ? '#cccc44' : '#ff4444';
            const hungerColor = statColor(c.needs.hunger);
            const restColor = statColor(c.needs.rest);
            const hpColor = statColor(c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 100);
            const weapon = c.weapon?.name || 'Fists';
            html += `<div class="hud-colonist" data-colonist-id="${c.id}">`;
            const needsDots = `<span class="hud-dots"><span style="color:${moodColor}">●</span><span style="color:${hungerColor}">●</span><span style="color:${restColor}">●</span><span style="color:${hpColor}">●</span></span>`;
            html += `<span class="hud-name" style="color:${c.nameColor || '#ffff00'}">${c.name}</span> ${needsDots} <span class="hud-weapon">${weapon}</span> <span class="hud-state">${c.state}${c.drafted ? ' [D]' : ''}${c.guardMode ? ' [G]' : ''}</span>`;
            html += `<div class="hud-bars">Mood: <span style="color:${moodColor}">${c.mood.toFixed(0)} (${moodLevel})</span> | Hunger: <span style="color:${hungerColor}">${c.needs.hunger.toFixed(0)}</span> | Rest: <span style="color:${restColor}">${c.needs.rest.toFixed(0)}</span> | HP: <span style="color:${hpColor}">${Math.round(c.hp)}/${c.maxHp}</span></div>`;
            html += `</div>`;
        }
        if (html !== this._lastHudHtml) {
            this._lastHudHtml = html;
            if (this._colonistHudHovered) {
                this._pendingHudHtml = html;
            } else {
                this.elements.colonistHud.innerHTML = html;
                this._pendingHudHtml = null;
            }
        }
    }

    toggleResearchPanel() {
        const opening = !this.researchPanelVisible;
        this._closeAllPanels();
        this.researchPanelVisible = opening;
        this._panelPause(opening);
        this.elements.researchPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updateResearchPanel();
        this._updateOverlay();
    }

    updateResearchPanel() {
        const research = this.game.research;
        const activeTab = this._researchTab || 'foundations';
        let html = '<div class="panel-close" data-panel-close="research">&times;</div><h3>Research</h3>';
        html += `<div class="info-row" style="color:#aa88ff; font-weight:bold; margin-bottom:6px;">Study Points: ${Math.floor(research.studyPoints)}</div>`;

        html += '<div class="research-tabs">';
        for (const tab of RESEARCH_TABS) {
            const tabKeys = Object.keys(RESEARCH).filter(k => RESEARCH[k].tab === tab.key);
            const done = tabKeys.filter(k => research.completed.has(k)).length;
            const active = tab.key === activeTab ? ' active' : '';
            html += `<button class="research-tab-btn${active}" data-research-tab="${tab.key}">${tab.name} (${done}/${tabKeys.length})</button>`;
        }
        html += '</div>';

        const tabKeys = Object.keys(RESEARCH).filter(k => RESEARCH[k].tab === activeTab);
        const layers = this._buildResearchLayers(tabKeys);
        html += `<div class="research-tree">`;
        html += `<svg class="research-lines" id="research-lines"></svg>`;
        for (let depth = 0; depth < layers.length; depth++) {
            html += `<div class="research-layer">`;
            for (const key of layers[depth]) {
                const tech = RESEARCH[key];
                const completed = research.completed.has(key);
                const available = !completed && tech.requires.every(r => research.completed.has(r));
                const canAfford = available && research.studyPoints >= tech.cost;
                let cls = 'research-node';
                if (completed) cls += ' completed';
                else if (canAfford) cls += ' affordable';
                else if (available) cls += ' available';
                else cls += ' locked';
                const sameTabReqs = tech.requires.filter(r => RESEARCH[r]?.tab === activeTab);
                html += `<div class="${cls}" data-key="${key}" data-requires="${sameTabReqs.join(',')}">`;
                html += `<div class="research-node-name">${tech.name}</div>`;
                html += `<div class="research-node-desc">${tech.description}</div>`;
                html += `<div class="research-node-cost">${completed ? 'Researched' : `${tech.cost} pts`}</div>`;
                const crossTabReqs = tech.requires.filter(r => RESEARCH[r]?.tab !== activeTab);
                if (crossTabReqs.length > 0) {
                    html += '<div class="research-cross-tab-row">';
                    for (const req of crossTabReqs) {
                        const reqTech = RESEARCH[req];
                        const reqTab = RESEARCH_TABS.find(t => t.key === reqTech.tab);
                        const reqCompleted = research.completed.has(req);
                        const reqAvailable = !reqCompleted && reqTech.requires.every(r => research.completed.has(r));
                        const badgeColor = reqCompleted ? '#66cc66' : reqAvailable ? '#cc8833' : '#666';
                        html += `<span class="research-cross-tab" data-jump-tab="${reqTech.tab}" style="border-color:${badgeColor}; color:${badgeColor}">${reqTech.name} (${reqTab.name} →)</span>`;
                    }
                    html += '</div>';
                }
                if (canAfford) {
                    html += `<button class="research-node-btn" onclick="window.game.startResearch('${key}')">Research</button>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;

        if (html !== this._lastResearchHtml) {
            this._lastResearchHtml = html;
            this.elements.researchPanel.innerHTML = html;
            requestAnimationFrame(() => this._drawResearchLines());
            this._initResearchHover();
        }
    }

    _initResearchHover() {
        const tree = this.elements.researchPanel.querySelector('.research-tree');
        if (!tree) return;
        let currentKey = null;
        tree.addEventListener('mouseover', (e) => {
            const node = e.target.closest('.research-node[data-key]');
            const key = node?.dataset.key || null;
            if (key !== currentKey) {
                currentKey = key;
                if (key) this._highlightResearchNode(key);
                else this._clearResearchHighlight();
            }
        });
        tree.addEventListener('mouseleave', () => {
            currentKey = null;
            this._clearResearchHighlight();
        });
    }

    _getResearchFamily(key) {
        const activeTab = this._researchTab || 'foundations';
        const family = new Set([key]);
        const findAncestors = (k) => {
            const tech = RESEARCH[k];
            if (!tech) return;
            for (const req of tech.requires) {
                if (RESEARCH[req]?.tab !== activeTab) continue;
                family.add(req);
                findAncestors(req);
            }
        };
        findAncestors(key);
        const findDescendants = (k) => {
            for (const [childKey, childTech] of Object.entries(RESEARCH)) {
                if (childTech.tab !== activeTab) continue;
                if (childTech.requires.includes(k) && !family.has(childKey)) {
                    family.add(childKey);
                    findDescendants(childKey);
                }
            }
        };
        findDescendants(key);
        return family;
    }

    _highlightResearchNode(key) {
        const tree = this.elements.researchPanel.querySelector('.research-tree');
        if (!tree) return;
        const family = this._getResearchFamily(key);
        const nodes = tree.querySelectorAll('.research-node[data-key]');
        for (const node of nodes) {
            node.classList.toggle('dimmed', !family.has(node.dataset.key));
            node.classList.toggle('highlighted', node.dataset.key === key);
        }
        const svg = document.getElementById('research-lines');
        if (svg) {
            for (const path of svg.querySelectorAll('path')) {
                path.classList.add('dimmed');
            }
            this._highlightResearchPaths(tree, family);
        }
    }

    _highlightResearchPaths(tree, family) {
        const svg = document.getElementById('research-lines');
        if (!svg) return;
        const paths = svg.querySelectorAll('path');
        const nodes = tree.querySelectorAll('.research-node[data-key]');
        let idx = 0;
        for (const node of nodes) {
            const key = node.dataset.key;
            const requires = node.dataset.requires;
            if (!requires) continue;
            for (const req of requires.split(',')) {
                if (!req) { idx++; continue; }
                if (family.has(key) && family.has(req)) {
                    paths[idx]?.classList.remove('dimmed');
                    paths[idx]?.classList.add('highlighted');
                }
                idx++;
            }
        }
    }

    _clearResearchHighlight() {
        const tree = this.elements.researchPanel.querySelector('.research-tree');
        if (!tree) return;
        const nodes = tree.querySelectorAll('.research-node[data-key]');
        for (const node of nodes) {
            node.classList.remove('dimmed', 'highlighted');
        }
        const svg = document.getElementById('research-lines');
        if (svg) {
            for (const path of svg.querySelectorAll('path')) {
                path.classList.remove('dimmed', 'highlighted');
            }
        }
    }

    _buildResearchLayers(tabKeys) {
        const tabSet = new Set(tabKeys);
        const depths = {};
        function getDepth(key) {
            if (depths[key] !== undefined) return depths[key];
            const tech = RESEARCH[key];
            if (!tech) { depths[key] = 0; return 0; }
            const sameTabReqs = tech.requires.filter(r => tabSet.has(r));
            if (sameTabReqs.length === 0) {
                depths[key] = 0;
                return 0;
            }
            const d = 1 + Math.max(...sameTabReqs.map(r => getDepth(r)));
            depths[key] = d;
            return d;
        }
        for (const key of tabKeys) getDepth(key);
        const maxDepth = Math.max(...tabKeys.map(k => depths[k] || 0), 0);
        const layers = [];
        for (let i = 0; i <= maxDepth; i++) layers.push([]);
        for (const key of tabKeys) layers[depths[key] || 0].push(key);

        for (let i = 1; i < layers.length; i++) {
            const allPositions = {};
            for (let l = 0; l < i; l++) {
                for (let j = 0; j < layers[l].length; j++) {
                    allPositions[layers[l][j]] = layers[l].length > 1 ? j / (layers[l].length - 1) : 0.5;
                }
            }
            layers[i].sort((a, b) => {
                const aReqs = RESEARCH[a].requires.filter(r => allPositions[r] !== undefined);
                const bReqs = RESEARCH[b].requires.filter(r => allPositions[r] !== undefined);
                const aCenter = aReqs.length > 0 ? aReqs.reduce((s, r) => s + allPositions[r], 0) / aReqs.length : 0.5;
                const bCenter = bReqs.length > 0 ? bReqs.reduce((s, r) => s + allPositions[r], 0) / bReqs.length : 0.5;
                return aCenter - bCenter;
            });
        }

        return layers;
    }

    _drawResearchLines() {
        const svg = document.getElementById('research-lines');
        const tree = svg?.closest('.research-tree');
        if (!svg || !tree) return;
        const treeRect = tree.getBoundingClientRect();
        svg.setAttribute('width', tree.scrollWidth);
        svg.setAttribute('height', tree.scrollHeight);
        let paths = '';
        const nodes = tree.querySelectorAll('.research-node[data-key]');
        const nodeRects = {};
        for (const node of nodes) {
            const r = node.getBoundingClientRect();
            nodeRects[node.dataset.key] = {
                cx: r.left + r.width / 2 - treeRect.left,
                top: r.top - treeRect.top,
                bottom: r.bottom - treeRect.top
            };
        }
        for (const node of nodes) {
            const key = node.dataset.key;
            const requires = node.dataset.requires;
            if (!requires) continue;
            const nodeCompleted = node.classList.contains('completed');
            for (const req of requires.split(',')) {
                if (!req || !nodeRects[req] || !nodeRects[key]) continue;
                const reqNode = tree.querySelector(`.research-node[data-key="${req}"]`);
                const reqCompleted = reqNode?.classList.contains('completed');
                const color = (reqCompleted && nodeCompleted) ? '#66cc66' : reqCompleted ? '#886622' : '#444';
                const from = nodeRects[req];
                const to = nodeRects[key];
                const x1 = from.cx, y1 = from.bottom;
                const x2 = to.cx, y2 = to.top;
                const my = (y1 + y2) / 2;
                paths += `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" stroke="${color}" />`;
            }
        }
        svg.innerHTML = paths;
    }

    toggleEventLog() {}

    updateEventLog() {
        const entries = this.game.eventLog.getRecent(10);
        let html = '<div class="footer-panel-header">Event Log</div>';
        if (entries.length === 0) {
            html += '<div class="event-log-row" style="color:#666">No events yet.</div>';
        }
        for (let i = entries.length - 1; i >= 0; i--) {
            const e = entries[i];
            const colorStyle = e.type === 'danger' ? 'color:#ff6666' : e.type === 'success' ? 'color:#66ff66' : 'color:#ffcc44';
            if (e.linkedEntity) {
                const entityJson = JSON.stringify(e.linkedEntity).replace(/"/g, '&quot;');
                html += `<div class="event-log-row" style="cursor:pointer;${colorStyle}" data-entity="${entityJson}">`;
            } else {
                html += `<div class="event-log-row" style="${colorStyle}">`;
            }
            html += `<span class="event-log-time">[${e.time}]</span> ${e.text}`;
            html += `</div>`;
        }
        if (html !== this._lastEventLogHtml) {
            this._lastEventLogHtml = html;
            this.elements.eventLog.innerHTML = html;
        }
    }

    toggleInventoryPanel() {
        const opening = !this.inventoryVisible;
        this._closeAllPanels();
        this.inventoryVisible = opening;
        this._panelPause(opening);
        this.elements.inventoryPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updateInventoryPanel();
        this._updateOverlay();
    }

    updateInventoryPanel() {
        const activeTab = this._invTab || 'resources';
        const r = this.game.resources.stockpile;
        const weapons = this.game.resources.weapons;
        const armors = this.game.resources.armors;
        const tools = this.game.resources.tools;
        const artifacts = this.game.resources.artifacts;
        const potions = this.game.resources.potions;
        const tomes = this.game.resources.tomes;
        const tamed = this.game.tamedAnimals;

        const equipCount = weapons.length + armors.length + tools.length + artifacts.length;
        const consumeCount = potions.length + tomes.length;

        let html = '<div class="panel-close" data-panel-close="inventory">&times;</div><h3>Inventory</h3>';

        html += '<div class="inv-tabs">';
        html += `<button class="inv-tab-btn${activeTab === 'resources' ? ' active' : ''}" data-inv-tab="resources">Resources</button>`;
        html += `<button class="inv-tab-btn${activeTab === 'equipment' ? ' active' : ''}" data-inv-tab="equipment">Equipment${equipCount ? ` (${equipCount})` : ''}</button>`;
        html += `<button class="inv-tab-btn${activeTab === 'consumables' ? ' active' : ''}" data-inv-tab="consumables">Consumables${consumeCount ? ` (${consumeCount})` : ''}</button>`;
        html += `<button class="inv-tab-btn${activeTab === 'animals' ? ' active' : ''}" data-inv-tab="animals">Animals${tamed.length ? ` (${tamed.length})` : ''}</button>`;
        html += '</div>';

        html += '<div class="inv-tab-content">';
        if (activeTab === 'resources') {
            html += this._buildInvResources(r);
        } else if (activeTab === 'equipment') {
            html += this._buildInvEquipment(weapons, armors, tools, artifacts);
        } else if (activeTab === 'consumables') {
            html += this._buildInvConsumables(potions, tomes);
        } else if (activeTab === 'animals') {
            html += this._buildInvAnimals(tamed);
        }
        html += '</div>';

        if (html !== this._lastInvHtml) {
            this._lastInvHtml = html;
            this.elements.inventoryPanel.innerHTML = html;
        }
    }

    _buildInvResources(r) {
        let html = '';
        const foodChestCount = this.game.mapIndex ? this.game.mapIndex.getStructurePositions('food_chest').size : 0;
        const iceBoxCount = this.game.mapIndex ? this.game.mapIndex.getStructurePositions('ice_box').size : 0;
        const noPower = this.game.power && !this.game.power.powered;
        if (foodChestCount > 0 || iceBoxCount > 0) {
            let reduction = Math.min(0.6, foodChestCount * 0.15);
            if (!noPower) reduction += iceBoxCount * 0.4;
            reduction = Math.min(0.9, reduction);
            const pct = Math.round(reduction * 100);
            const seasonLabel = this.game.weather.season === 'summer' ? ' (summer +50% rot)' : this.game.weather.season === 'winter' ? ' (winter -50% rot)' : '';
            html += `<div class="info-row" style="color:#aa8844;font-size:0.9em;">Food preservation: -${pct}% spoilage${seasonLabel}</div>`;
        }

        const reserved = this.game.resources.reservedFoodstuffs;
        for (const [key, amount] of Object.entries(r)) {
            if (amount <= 0) continue;
            const isFood = FOODSTUFFS.includes(key);
            const isReserved = reserved[key];
            let extra = '';
            if (isFood) {
                const cls = isReserved ? 'inv-reserve active' : 'inv-reserve';
                extra = `<button class="${cls}" data-reserve-food="${key}" title="${isReserved ? 'Unreserve — allow cooking' : 'Reserve — protect from cooking'}">${isReserved ? '🔒' : '🔓'}</button>`;
            }
            html += `<div class="inv-row"><span class="inv-name">${key.replace(/_/g, ' ')}</span>${extra}<span class="inv-amount">${Math.round(amount)}</span></div>`;
        }
        if (!html) html = '<div class="info-row" style="color:#666;">No resources.</div>';
        return html;
    }

    _buildInvEquipment(weapons, armors, tools, artifacts) {
        let html = '';
        if (weapons.length > 0) {
            html += '<div class="info-row" style="color:#cc8888;margin-bottom:4px;"><b>Weapons:</b></div>';
            weapons.forEach((w, i) => {
                let stats = `Dmg: ${w.damage}`;
                if (w.spellDamageBonus) stats += `, +${Math.round(w.spellDamageBonus * 100)}% spell`;
                html += `<div class="inv-row"><span class="inv-name">${w.name}</span><span class="inv-amount">${stats}</span><button class="inv-delete" onclick="if(confirm('Discard ${w.name}?')){window.game.discardWeapon(${i})}">x</button></div>`;
            });
        }
        if (armors.length > 0) {
            html += '<div class="info-row" style="color:#9966cc;margin-top:8px;margin-bottom:4px;"><b>Armor:</b></div>';
            armors.forEach((a, i) => {
                html += `<div class="inv-row"><span class="inv-name">${a.name}</span><span class="inv-amount">-${Math.round(a.damageReduction * 100)}% dmg</span><button class="inv-delete" onclick="if(confirm('Discard ${a.name}?')){window.game.discardArmor(${i})}">x</button></div>`;
            });
        }
        if (tools.length > 0) {
            html += '<div class="info-row" style="color:#88aacc;margin-top:8px;margin-bottom:4px;"><b>Tools:</b></div>';
            tools.forEach((t, i) => {
                const stats = [];
                if (t.miningSpeed) stats.push(`+${Math.round((t.miningSpeed-1)*100)}% mine`);
                if (t.choppingSpeed) stats.push(`+${Math.round((t.choppingSpeed-1)*100)}% chop`);
                if (t.farmingSpeed) stats.push(`+${Math.round((t.farmingSpeed-1)*100)}% farm`);
                if (t.moveSpeedBonus) stats.push(`+${Math.round(t.moveSpeedBonus*100)}% move`);
                html += `<div class="inv-row"><span class="inv-name">${t.name}</span><span class="inv-amount">${stats.join(', ')}</span><button class="inv-delete" onclick="if(confirm('Discard ${t.name}?')){window.game.discardTool(${i})}">x</button></div>`;
            });
        }
        if (artifacts.length > 0) {
            html += '<div class="info-row" style="color:#ccaa44;margin-top:8px;margin-bottom:4px;"><b>Artifacts:</b></div>';
            artifacts.forEach((a, i) => {
                const tip = this._getArtifactTooltip(a);
                html += `<div class="inv-row"><span class="inv-name skill-tip" data-tip="${tip}">${a.name}</span><button class="inv-delete" onclick="if(confirm('Discard ${a.name}?')){window.game.discardArtifact(${i})}">x</button></div>`;
            });
        }
        if (!html) html = '<div class="info-row" style="color:#666;">No equipment in storage.</div>';
        return html;
    }

    _buildInvConsumables(potions, tomes) {
        let html = '';
        if (potions.length > 0) {
            html += '<div class="info-row" style="color:#cc88aa;margin-bottom:4px;"><b>Potions:</b></div>';
            const potionCounts = {};
            for (const p of potions) {
                potionCounts[p.type] = (potionCounts[p.type] || 0) + 1;
            }
            for (const [type, count] of Object.entries(potionCounts)) {
                const def = POTIONS[type];
                html += `<div class="inv-row"><span class="inv-name">${def ? def.name : type}</span><span class="inv-amount">x${count}</span></div>`;
            }
        }
        if (tomes.length > 0) {
            html += '<div class="info-row" style="color:#bb88ff;margin-top:8px;margin-bottom:4px;"><b>Spell Tomes:</b></div>';
            const tomeCounts = {};
            for (const t of tomes) {
                tomeCounts[t.key] = (tomeCounts[t.key] || 0) + 1;
            }
            for (const [key, count] of Object.entries(tomeCounts)) {
                const def = SPELL_TOMES[key];
                const spell = def ? SPELLS[def.spell] : null;
                const schoolName = spell ? MAGIC_SKILLS[spell.school]?.name : '';
                html += `<div class="inv-row"><span class="inv-name">${def ? def.name : key}</span><span class="inv-amount">x${count}${schoolName ? ` (${schoolName})` : ''}</span></div>`;
            }
        }
        if (!html) html = '<div class="info-row" style="color:#666;">No consumables.</div>';
        return html;
    }

    _buildInvAnimals(tamed) {
        let html = '';
        if (tamed.length > 0) {
            const counts = {};
            for (const a of tamed) {
                counts[a.type] = (counts[a.type] || 0) + 1;
            }
            for (const [type, count] of Object.entries(counts)) {
                const def = TAMED_ANIMALS[type];
                let role = def.produces ? `produces: ${def.produces}` : def.packAnimal ? 'pack animal' : def.happinessAura ? 'happiness aura' : def.guardAnimal ? 'guard' : '';
                html += `<div class="inv-row"><span class="inv-name">${type}</span><span class="inv-amount">x${count}${role ? ` (${role})` : ''}</span></div>`;
            }
        }
        if (!html) html = '<div class="info-row" style="color:#666;">No tamed animals.</div>';
        return html;
    }

    toggleTamingPanel() {
        const opening = !this.tamingPanelVisible;
        this._closeAllPanels();
        this.tamingPanelVisible = opening;
        this._panelPause(opening);
        this.elements.tamingPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updateTamingPanel();
        this._updateOverlay();
    }

    updateTamingPanel() {
        let html = '<div class="panel-close" data-panel-close="taming">&times;</div><h3>Beast Binding</h3>';
        if (!this.game.research.isResearched('beast_binding')) {
            html += '<div class="info-row" style="color:#888">Requires research: Beast Binding</div>';
            if (html !== this._lastTamingHtml) {
                this._lastTamingHtml = html;
                this.elements.tamingPanel.innerHTML = html;
            }
            return;
        }

        html += '<div class="info-row" style="color:#aaa;margin-bottom:6px;">Click a tameable animal on the map to tame it. Requires a Beast Circle and food.</div>';

        html += '<div class="info-row" style="margin-top:6px;color:#aaa;"><b>Tameable species:</b></div>';
        for (const [type, def] of Object.entries(TAMED_ANIMALS)) {
            html += `<div class="info-row" style="color:${ANIMALS[type]?.color || '#ccc'}">`;
            html += `${type} — Cost: ${def.foodToTame} food`;
            if (def.produces) html += ` | Produces: ${def.produces} (every ${def.produceRate} ticks)`;
            if (def.packAnimal) html += ` | Pack animal (+${Math.round(def.expeditionSpeedBonus * 100)}% expedition speed)`;
            if (def.happinessAura) html += ` | Happiness aura (radius ${def.auraRadius})`;
            html += `</div>`;
        }

        const tamed = this.game.tamedAnimals;
        if (tamed.length > 0) {
            html += '<div class="info-row" style="margin-top:8px;color:#88cc88"><b>Your Animals:</b></div>';
            for (const a of tamed) {
                const def = TAMED_ANIMALS[a.type];
                let status = `HP:${a.hp}/${a.maxHp}`;
                if (a.onExpedition) status += ' | <span style="color:#33ccff">ON EXPEDITION</span>';
                else if (def?.produces) status += ` | Next ${def.produces}: ${a.produceCooldown} ticks`;
                else if (def?.packAnimal) status += ' | <span style="color:#bbaa44">Pack animal</span>';
                else if (def?.happinessAura) status += ' | <span style="color:#ff88cc">Happiness aura</span>';
                html += `<div class="info-row" style="color:${def?.color || '#ccc'}">${a.type} — ${status}</div>`;
            }
        } else {
            html += '<div class="info-row" style="margin-top:8px;color:#666">No tamed animals yet.</div>';
        }

        if (html !== this._lastTamingHtml) {
            this._lastTamingHtml = html;
            this.elements.tamingPanel.innerHTML = html;
        }
    }

    toggleSettingsPanel() {
        const opening = !this.settingsPanelVisible;
        this._closeAllPanels();
        this.settingsPanelVisible = opening;
        this._panelPause(opening);
        this.elements.settingsPanel.style.display = opening ? 'block' : 'none';
        if (opening) this.updateSettingsPanel();
        this._updateOverlay();
    }

    updateSettingsPanel() {
        const s = this.game.settings;
        let html = '<div class="panel-close" data-panel-close="settings">&times;</div><h3>Settings</h3>';

        html += `<div class="settings-section"><div class="settings-section-title">Gameplay</div>`;
        html += this._settingsCheck('set-pause-hostile', s.autoPauseHostile, 'window.game.settings.autoPauseHostile=this.checked', 'Auto-pause on hostile event (raids)');
        html += this._settingsCheck('set-pause-event', s.autoPauseEvent, 'window.game.settings.autoPauseEvent=this.checked', 'Auto-pause on choice events (wanderers, caravans)');
        html += this._settingsCheck('set-pause-death', s.pauseOnDeath, 'window.game.settings.pauseOnDeath=this.checked', 'Auto-pause on colonist death');
        html += this._settingsCheck('set-peaceful', CONFIG.PEACEFUL_MODE, 'window.game.togglePeaceful()', 'Peaceful mode (no raids/hostile animals)');
        html += `<div class="settings-row">`;
        html += `<label for="set-autocook">Auto-cook meal target:</label>`;
        html += `<select id="set-autocook" onchange="window.game.settings.autoCookTarget=parseInt(this.value)" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;">`;
        for (const val of [0, 5, 10, 20, 50]) {
            html += `<option value="${val}" ${s.autoCookTarget === val ? 'selected' : ''}>${val === 0 ? 'Off' : val + ' meals'}</option>`;
        }
        html += `</select></div>`;
        html += `<div class="settings-row">`;
        html += `<label for="set-autosave">Auto-save interval:</label>`;
        html += `<select id="set-autosave" onchange="window.game.settings.autoSaveInterval=parseInt(this.value)" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;">`;
        for (const [val, label] of [[0, 'Off'], [30, '30s'], [60, '1 min'], [120, '2 min'], [300, '5 min']]) {
            html += `<option value="${val}" ${s.autoSaveInterval === val ? 'selected' : ''}>${label}</option>`;
        }
        html += `</select></div>`;
        html += `</div>`;

        html += `<div class="settings-section"><div class="settings-section-title">Performance</div>`;
        html += this._settingsCheck('set-overlays', s.showOverlays, 'window.game.settings.showOverlays=this.checked', 'Show overlay effects (progress bars, combat)');
        html += this._settingsCheck('set-night', s.showNightLighting, 'window.game.settings.showNightLighting=this.checked', 'Show night lighting/darkness');
        html += this._settingsCheck('set-weather', s.showWeatherParticles, 'window.game.settings.showWeatherParticles=this.checked', 'Show weather particles (future feature)');
        html += this._settingsCheck('set-minimap', s.showMinimap, 'window.game.settings.showMinimap=this.checked;document.getElementById("minimap-container").style.display=this.checked?"":"none"', 'Show minimap');
        html += this._settingsCheck('set-fps', s.showFps, 'window.game.settings.showFps=this.checked', 'Show FPS counter (top-right of game grid)');
        html += `</div>`;

        html += `<div class="settings-section"><div class="settings-section-title">Visual</div>`;
        html += `<div class="settings-row">`;
        html += `<label for="set-names">Colonist names:</label>`;
        html += `<select id="set-names" onchange="window.game.settings.showColonistNames=this.value" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;">`;
        for (const val of ['off', 'selected', 'always']) {
            html += `<option value="${val}" ${s.showColonistNames === val ? 'selected' : ''}>${val.charAt(0).toUpperCase() + val.slice(1)}</option>`;
        }
        html += `</select></div>`;
        const uiSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ui-font-size')) || 12;
        html += `<div class="settings-row">`;
        html += `<label for="set-ui-font-size">UI Font Size: <span id="ui-font-size-val">${uiSize}px</span></label>`;
        html += `<input type="range" id="set-ui-font-size" min="8" max="20" value="${uiSize}" style="width:80px" oninput="document.getElementById('ui-font-size-val').textContent=this.value+'px';window.setUIFontSize(this.value)">`;
        html += `</div>`;
        html += `</div>`;

        html += `<div class="settings-section"><div class="settings-section-title">Save / Load</div>`;
        html += `<div class="settings-row" style="gap:8px;">`;
        html += `<button onclick="window.game.save()" class="settings-btn settings-btn-green">Save Game</button>`;
        html += `<button onclick="window.game.exportSave()" class="settings-btn settings-btn-blue">Export Save</button>`;
        html += `</div></div>`;

        html += `<div class="settings-section">`;
        html += `<button onclick="window.game.showGlossary()" class="settings-btn settings-btn-purple">View Glossary</button>`;
        html += `</div>`;

        html += `<div class="settings-section settings-debug"><div class="settings-section-title" style="color:#ff6666;">Debug / Testing</div>`;
        html += `<button onclick="if(confirm('Grant 999 of all resources?'))window.game.cheatResources()" class="settings-btn settings-btn-danger">Grant 999 Resources</button>`;
        html += `<button onclick="if(confirm('Complete all research?'))window.game.cheatGrantResearch()" class="settings-btn settings-btn-danger">Grant All Research</button>`;
        html += `<button onclick="if(confirm('Grant all starter spells (level 0) to every colonist and set magic skills to 1?'))window.game.cheatGrantStarterSpells()" class="settings-btn settings-btn-danger">Grant All Starter Spells + Magic Lvl 1</button>`;
        html += `<button onclick="window.game.cheatSpawnColonist()" class="settings-btn settings-btn-danger">Grant New Colonist</button>`;
        html += `<div class="settings-row" style="margin-top:8px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-artifact-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:120px;">`;
        for (const [key, def] of Object.entries(ARTIFACTS)) {
            html += `<option value="${key}">${def.name}</option>`;
        }
        html += `</select>`;
        html += `<button onclick="window.game.cheatSpawnItem('artifact',document.getElementById('debug-artifact-select').value)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Grant Artifact</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:4px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-weapon-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:120px;">`;
        for (const [key, def] of Object.entries(WEAPONS)) {
            if (key === 'fists') continue;
            html += `<option value="${key}">${def.name}</option>`;
        }
        html += `</select>`;
        html += `<button onclick="window.game.cheatSpawnItem('weapon',document.getElementById('debug-weapon-select').value)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Grant Weapon</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:4px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-armor-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:120px;">`;
        for (const [key, def] of Object.entries(ARMORS)) {
            html += `<option value="${key}">${def.name}</option>`;
        }
        html += `</select>`;
        html += `<button onclick="window.game.cheatSpawnItem('armor',document.getElementById('debug-armor-select').value)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Grant Armor</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:4px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-tool-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:120px;">`;
        for (const [key, def] of Object.entries(TOOLS)) {
            html += `<option value="${key}">${def.name}</option>`;
        }
        html += `</select>`;
        html += `<button onclick="window.game.cheatSpawnItem('tool',document.getElementById('debug-tool-select').value)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Grant Tool</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:8px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-resource-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:80px;">`;
        for (const key of Object.keys(this.game.resources.stockpile)) {
            html += `<option value="${key}">${key.replace(/_/g, ' ')}</option>`;
        }
        html += `</select>`;
        html += `<input id="debug-resource-amount" type="number" value="50" min="1" max="999" style="width:50px;background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;">`;
        html += `<button onclick="window.game.cheatAddResource(document.getElementById('debug-resource-select').value, parseInt(document.getElementById('debug-resource-amount').value)||50)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Grant Resource</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:8px;gap:4px;flex-wrap:wrap;">`;
        html += `<select id="debug-event-select" style="background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;flex:1;min-width:120px;">`;
        for (const key of Object.keys(EVENTS)) {
            html += `<option value="${key}">${key.replace(/_/g, ' ')}</option>`;
        }
        html += `</select>`;
        html += `<button onclick="window.game.cheatTriggerEvent(document.getElementById('debug-event-select').value)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Trigger Event</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:8px;gap:4px;flex-wrap:wrap;">`;
        html += `<input id="debug-time-amount" type="number" value="300" min="1" max="9999" style="width:60px;background:#1a1a2e;color:#ccc;border:1px solid #444;padding:2px 4px;">`;
        html += `<button onclick="window.game.cheatAdvanceTime(parseInt(document.getElementById('debug-time-amount').value)||300)" class="settings-btn settings-btn-danger" style="white-space:nowrap;">Advance Ticks</button>`;
        html += `<span style="color:#666;font-size:10px;">(300=1 day)</span>`;
        html += `</div>`;
        html += `</div>`;
        this.elements.settingsPanel.innerHTML = html;
    }

    _settingsCheck(id, checked, onchange, label) {
        return `<div class="settings-row"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${onchange}"><label for="${id}">${label}</label></div>`;
    }

    getColonistTaskDescription(colonist) {
        if (!colonist.currentTaskId) return `<span style="color:#666;cursor:pointer" onclick="window.game.camera.centerOn(${colonist.x},${colonist.y})">None</span>`;
        const task = this.game.taskQueue.getAll().find(t => t.id === colonist.currentTaskId);
        if (!task) return `<span style="color:#666;cursor:pointer" onclick="window.game.camera.centerOn(${colonist.x},${colonist.y})">None</span>`;
        let label;
        switch (task.type) {
            case 'build': label = `Building ${(task.buildType || '').replace(/_/g, ' ')}`; break;
            case 'mine': label = 'Mining'; break;
            case 'chop': label = 'Chopping tree'; break;
            case 'deconstruct': label = 'Deconstructing'; break;
            case 'plant': label = 'Planting'; break;
            case 'harvest': label = 'Harvesting'; break;
            case 'craft': label = `Crafting ${task.recipe?.name || 'item'}`; break;
            case 'cook': label = `Cooking ${task.recipe?.name || 'food'}`; break;
            default: label = task.type; break;
        }
        return `<span style="cursor:pointer;text-decoration:underline" onclick="window.game.camera.centerOn(${task.x},${task.y})">${label} at (${task.x},${task.y})</span>`;
    }

    updateTileTooltip(x, y, e) {
        const tooltip = document.getElementById('tile-tooltip');
        const tile = this.game.map[y][x];
        const parts = [`(${x},${y}) ${tile.terrain}`];
        if (tile.structure) parts.push(`Structure: ${tile.structure.replace(/_/g, ' ')}`);
        if (tile.resource) parts.push(`Resource: ${tile.resource.type}${tile.resource.amount > 1 ? ' x' + tile.resource.amount : ''}`);
        if (tile.designation) parts.push(`[${tile.designation.type}]`);
        if (tile.zone) parts.push(`Farm: ${tile.zone.crop}`);
        const nameMode = this.game.settings.showColonistNames;
        if (nameMode === 'selected' || nameMode === 'always') {
            const colHere = this.game.colonists.find(c => c.x === x && c.y === y && c.hp > 0 && !c.onExpedition);
            if (colHere) parts.push(colHere.name);
        }
        tooltip.textContent = parts.join(' | ');
        tooltip.style.display = 'block';
        tooltip.style.left = (e.offsetX + 12) + 'px';
        tooltip.style.top = (e.offsetY - 24) + 'px';
    }

    hideTileTooltip() {
        document.getElementById('tile-tooltip').style.display = 'none';
    }

    isBuildingLocked(buildType) {
        const def = BUILDINGS[buildType];
        return def?.research && !this.game.research.isResearched(def.research);
    }

    updateNotifications() {
        const recent = this.game.notifications.filter(n => this.game.tick - n.tick < 100);
        this.game.notifications = recent;
        this.elements.notifications.innerHTML = recent.slice(-4).map(n =>
            `<div class="notif notif-${n.type}">${n.text}</div>`
        ).join('');
    }

    updateEventPanel() {
        const evt = this.game.events.pendingEvent;
        if (!evt) {
            if (this._lastEventId) {
                this.elements.eventPanel.style.display = 'none';
                this.elements.eventPanel.className = '';
                this._lastEventId = null;
                this._tradeOpen = false;
            }
            return;
        }

        if (evt.type === 'trade' && this._tradeOpen) {
            if (this._tradeDirty) {
                this._tradeDirty = false;
                this._updateTradePanel(evt);
            }
            return;
        }

        const eventId = evt.type + evt.text;
        if (this._lastEventId === eventId) return;
        this._lastEventId = eventId;
        this.elements.eventPanel.style.display = 'block';
        this.elements.eventPanel.className = evt.type === 'raid' ? 'event-panel-raid' : '';
        let html = `<div class="event-text">${evt.text}</div><div class="event-choices">`;
        if (evt.type === 'trade') {
            html += `<button onclick="window.game.openTradePanel()">Open Trade</button>`;
            html += `<button onclick="window.game.dismissTrader()">Dismiss</button>`;
        } else {
            evt.choices.forEach((choice, i) => {
                html += `<button onclick="window.game.resolveEvent(${i})">${choice}</button>`;
            });
        }
        html += '</div>';
        this.elements.eventPanel.innerHTML = html;
    }

    _updateTradePanel(evt) {
        const data = evt.data;
        const stock = this.game.resources.stockpile;
        let html = `<div class="event-text" style="font-size:0.9em;">Trader's Goods — select what to buy and offer</div>`;
        html += `<div style="display:flex;gap:8px;flex-wrap:wrap;max-height:200px;overflow-y:auto;">`;

        const markupMult = getPedestalEffect(this.game, 'tradeMarkupMult');
        const effectiveMarkup = TRADER_MARKUP * markupMult;
        html += `<div style="flex:1;min-width:140px;"><b style="color:#88ddff;">Trader Sells:</b>`;
        for (const [res, amt] of Object.entries(data.traderResources)) {
            const val = Math.ceil((TRADE_VALUES[res] || 1) * effectiveMarkup);
            html += `<div style="font-size:0.85em;">${res}: ${amt} (${val}v ea) <button onclick="window.game.tradeRequest('${res}',1)" style="padding:0 4px;">+1</button></div>`;
        }
        if (data.exclusiveItem) {
            const item = TRADER_EXCLUSIVE_ITEMS[data.exclusiveItem];
            html += `<div style="font-size:0.85em;color:#ffcc00;">${item.name} (${item.tradeValue}v) <button onclick="window.game.tradeRequest('__exclusive',1)" style="padding:0 4px;">Buy</button></div>`;
        }
        html += `</div>`;

        html += `<div style="flex:1;min-width:140px;"><b style="color:#ffaa44;">You Offer:</b>`;
        for (const [res, amt] of Object.entries(stock)) {
            if (typeof amt !== 'number' || amt <= 0 || res.startsWith('_')) continue;
            if (!TRADE_VALUES[res]) continue;
            const val = Math.floor((TRADE_VALUES[res] || 1) * TRADER_DISCOUNT * 10) / 10;
            html += `<div style="font-size:0.85em;">${res}: ${amt} (${val}v ea) <button onclick="window.game.tradeOffer('${res}',1)" style="padding:0 4px;">+1</button></div>`;
        }
        html += `</div></div>`;

        const offer = this._tradeOffer || {};
        const request = this._tradeRequest || {};
        const offerVal = Object.entries(offer).reduce((sum, [r, n]) => sum + (TRADE_VALUES[r] || 1) * n * TRADER_DISCOUNT, 0);
        const reqVal = Object.entries(request).reduce((sum, [r, n]) => {
            if (r === '__exclusive') return sum + (TRADER_EXCLUSIVE_ITEMS[data.exclusiveItem]?.tradeValue || 0);
            return sum + (TRADE_VALUES[r] || 1) * n * effectiveMarkup;
        }, 0);

        html += `<div style="margin-top:4px;font-size:0.85em;">`;
        html += `<span style="color:#ffaa44;">Offering: ${Object.entries(offer).map(([r,n]) => `${n} ${r}`).join(', ') || 'nothing'} (${offerVal.toFixed(1)}v)</span> `;
        html += `<span style="color:#88ddff;">Requesting: ${Object.entries(request).map(([r,n]) => r === '__exclusive' ? TRADER_EXCLUSIVE_ITEMS[data.exclusiveItem]?.name : `${n} ${r}`).join(', ') || 'nothing'} (${reqVal.toFixed(1)}v)</span>`;
        html += `</div>`;

        const canTrade = offerVal >= reqVal && reqVal > 0;
        html += `<div class="event-choices" style="margin-top:4px;">`;
        html += `<button ${canTrade ? '' : 'disabled'} onclick="window.game.confirmTrade()">Confirm Trade</button>`;
        html += `<button onclick="window.game.clearTradeSelection()">Clear</button>`;
        html += `<button onclick="window.game.dismissTrader()">Done</button>`;
        html += `</div>`;

        this.elements.eventPanel.innerHTML = html;
    }
}

function bar(value) {
    const filled = Math.round(value / 10);
    return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]`;
}

function getMoodLabel(mood) {
    if (mood >= 75) return 'inspired';
    if (mood >= 40) return 'content';
    if (mood >= 20) return 'stressed';
    return 'breaking';
}

function statColor(value) {
    if (value >= 70) return '#88cc88';
    if (value >= 40) return '#cccc44';
    if (value >= 20) return '#cc8844';
    return '#cc4444';
}
