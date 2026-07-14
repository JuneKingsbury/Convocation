import { CONFIG, TRAITS, BUILD_COSTS, RESEARCH, TAMED_ANIMALS } from './config.js';
import { getAvailableRecipes } from './crafting.js';
import { CROP_RESEARCH_REQS } from './farming.js';

export class UI {
    constructor(game) {
        this.game = game;
        this.priorityPanelVisible = false;
        this.craftPanelVisible = false;
        this.researchPanelVisible = false;
        this.inventoryVisible = false;
        this.tamingPanelVisible = false;
        this.settingsPanelVisible = false;
        this.elements = {};
        this.initElements();
    }

    initElements() {
        this.elements.statusBar = document.getElementById('status-bar');
        this.elements.infoPanel = document.getElementById('info-panel');
        this.elements.modeBar = document.getElementById('mode-bar');
        this.elements.notifications = document.getElementById('notifications');
        this.elements.priorityPanel = document.getElementById('priority-panel');
        this.elements.craftPanel = document.getElementById('craft-panel');
        this.elements.eventPanel = document.getElementById('event-panel');
        this.elements.colonistHud = document.getElementById('colonist-hud');
        this.elements.researchPanel = document.getElementById('research-panel');
        this.elements.eventLog = document.getElementById('event-log');
        this.elements.inventoryPanel = document.getElementById('inventory-panel');
        this.elements.tamingPanel = document.getElementById('taming-panel');
        this.elements.settingsPanel = document.getElementById('settings-panel');

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
    }

    update() {
        this.updateStatusBar();
        this.updateNotifications();
        this.updateEventPanel();
        if (this.priorityPanelVisible) this.updatePriorityPanel();
        if (this.craftPanelVisible) this.updateCraftPanel();
        if (this.researchPanelVisible) this.updateResearchPanel();
        this.updateColonistHud();
        this.updateEventLog();
        if (this.inventoryVisible) this.updateInventoryPanel();
        if (this.tamingPanelVisible) this.updateTamingPanel();
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

        this.elements.statusBar.innerHTML =
            `<span class="res">Wood:${r.wood}</span>` +
            `<span class="res">Stone:${r.stone}</span>` +
            `<span class="res">Planks:${r.planks}</span>` +
            `<span class="res">Food:${r.food}</span>` +
            `<span class="res">Meat:${r.meat}</span>` +
            (r.runite > 0 ? `<span class="res">Runite:${r.runite}</span>` : '') +
            (manaStr ? `<span class="res" style="color:${power.hasPower() ? '#aa44ff' : '#ff6666'}">${manaStr}</span>` : '') +
            `<span class="sep">|</span>` +
            `<span class="info">${season}</span>` +
            `<span class="info">${weather} ${temp}°</span>` +
            `<span class="info">${timeStr}</span>` +
            `<span class="sep">|</span>` +
            `<span class="info">Population: ${alive}</span>` +
            `<span class="info">Happiness: ${avgMood}%</span>` +
            (pendingTasks > 0 ? `<span class="info" style="color:#ccaa44">Tasks:${pendingTasks}</span>` : '') +
            `<span class="info">${speed}</span>` +
            (CONFIG.PEACEFUL_MODE ? `<span class="peaceful">PEACEFUL</span>` : '');
    }

    updateModeDisplay(input) {
        let html = `<span class="mode-label">Mode: ${input.mode.toUpperCase()}</span>`;
        if (input.mode === 'build') {
            html += '<span class="mode-opt mode-back" data-mode-action="back">[Esc]Back</span>';
            html += '<span class="mode-options">';
            input.buildOptions.forEach((opt, i) => {
                const active = opt === input.buildType ? ' active' : '';
                const cost = BUILD_COSTS[opt];
                const costStr = Object.entries(cost).map(([k, v]) => `${k}:${v}`).join(' ');
                const keyLabel = i < 9 ? i + 1 : (i === 9 ? '0' : '');
                const locked = this.isBuildingLocked(opt);
                const lockStr = locked ? ' [LOCKED]' : '';
                html += `<span class="mode-opt${active}" data-build-opt="${opt}"${locked ? ' style="opacity:0.4"' : ''}>${keyLabel ? `[${keyLabel}]` : ''}${opt.replace(/_/g,' ')}(${costStr})${lockStr}</span>`;
            });
            html += '</span>';
            html += '<span class="mode-hint">Click item to select | Left-click/drag to place | Right-click/drag to deconstruct</span>';
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
            html += `<span class="mode-opt" data-mode-action="settings">[,]Settings</span>`;
            html += '</span>';
        }
        this.elements.modeBar.innerHTML = html;
    }

    showColonistInfo(colonist) {
        const moodLevel = getMoodLabel(colonist.mood);
        const traitNames = colonist.traits.map(t => TRAITS[t]?.name || t).join(', ');
        const thoughts = colonist.thoughts.slice(-5).map(t =>
            `<span class="${t.moodEffect >= 0 ? 'positive' : 'negative'}">${t.text} (${t.moodEffect > 0 ? '+' : ''}${t.moodEffect.toFixed(0)})</span>`
        ).join('<br>');

        let html = `<div class="info-header" style="cursor:pointer" onclick="window.game.selectColonistById(${colonist.id})">${colonist.name} ${colonist.drafted ? '[DRAFTED]' : ''}</div>`;
        html += `<div class="info-row">HP: ${colonist.hp}/${colonist.maxHp}</div>`;
        html += `<div class="info-row">Mood: <span class="mood-${moodLevel}">${colonist.mood.toFixed(0)} (${moodLevel})</span></div>`;
        html += `<div class="info-row">State: ${colonist.state}</div>`;
        html += `<div class="info-row">Traits: ${traitNames}</div>`;
        html += `<div class="info-row">Hunger: ${bar(colonist.needs.hunger)} Rest: ${bar(colonist.needs.rest)}</div>`;
        html += `<div class="info-row">Skills: B:${colonist.skills.building} F:${colonist.skills.farming} C:${colonist.skills.crafting} K:${colonist.skills.cooking}</div>`;
        html += `<div class="info-row">Weapon: ${colonist.weapon?.name || 'Fists'}</div>`;
        html += `<div class="info-row">Bed: ${colonist.assignedBed ? `(${colonist.assignedBed.x},${colonist.assignedBed.y})` : 'None'}</div>`;
        if (thoughts) html += `<div class="info-thoughts"><b>Thoughts:</b><br>${thoughts}</div>`;
        html += `<div class="info-actions">`;
        html += `<button onclick="window.game.toggleDraft(${colonist.id})">Draft/Undraft</button>`;
        html += `<button onclick="window.game.equipWeapon(${colonist.id})">Equip Weapon</button>`;
        html += `<button onclick="window.game.centerOnColonist(${colonist.id})">Center Camera</button>`;
        const isFollowing = this.game.followingColonist === colonist.id;
        html += `<button onclick="window.game.toggleFollow(${colonist.id})">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
        html += `</div>`;

        this.elements.infoPanel.innerHTML = html;
    }

    showAnimalInfo(animal) {
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
        let html = `<div class="info-header">Tile (${x},${y})</div>`;
        html += `<div class="info-row">Terrain: ${tile.terrain}</div>`;
        if (tile.structure) html += `<div class="info-row">Structure: ${tile.structure}</div>`;
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

        this.elements.infoPanel.innerHTML = html;
    }

    showTileEntities(tile, x, y, colonists, animals, raiders = []) {
        let html = '';

        for (const r of raiders) {
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="color:#ff3333;">Raider</div>`;
            html += `<div class="info-row">HP: ${r.hp}/${r.maxHp}</div>`;
            html += `<div class="info-row">Weapon: ${r.weapon?.name || 'Fists'} (${r.damage} dmg)</div>`;
            html += `<div class="info-row">State: ${r.fleeing ? 'Fleeing' : 'Attacking'}</div>`;
            html += `</div>`;
        }

        for (const c of colonists) {
            const moodLevel = getMoodLabel(c.mood);
            const traitNames = c.traits.map(t => TRAITS[t]?.name || t).join(', ');
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="cursor:pointer" onclick="window.game.selectColonistById(${c.id})">${c.name} ${c.drafted ? '[DRAFTED]' : ''}</div>`;
            html += `<div class="info-row">HP: ${c.hp}/${c.maxHp} | Mood: <span class="mood-${moodLevel}">${c.mood.toFixed(0)} (${moodLevel})</span></div>`;
            html += `<div class="info-row">State: ${c.state}</div>`;
            html += `<div class="info-row">Hunger: ${bar(c.needs.hunger)} Rest: ${bar(c.needs.rest)}</div>`;
            html += `<div class="info-row">Traits: ${traitNames}</div>`;
            html += `<div class="info-row">Weapon: ${c.weapon?.name || 'Fists'}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.toggleDraft(${c.id})">${c.drafted ? 'Undraft' : 'Draft'}</button>`;
            html += `<button onclick="window.game.equipWeapon(${c.id})">Equip</button>`;
            const isFollowing = this.game.followingColonist === c.id;
            html += `<button onclick="window.game.toggleFollow(${c.id})">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
            html += `</div></div>`;
        }

        for (const a of animals) {
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header">${a.type} ${a.hostile ? '(hostile)' : ''}</div>`;
            html += `<div class="info-row">HP: ${a.hp}/${a.maxHp}</div>`;
            html += `<div class="info-actions">`;
            if (!a.hostile) html += `<button onclick="window.game.huntAnimal(${a.id})">Hunt</button>`;
            html += `</div></div>`;
        }

        html += `<div class="info-header" style="font-size:11px;color:#aaa;">Tile (${x},${y})</div>`;
        if (tile.onFire) html += `<div class="info-row fire">ON FIRE!</div>`;
        if (tile.structure) html += `<div class="info-row">Structure: ${tile.structure}</div>`;
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

        this.elements.infoPanel.innerHTML = html;
    }

    showMultiColonistInfo(colonists) {
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
            html += `<span class="info-header" style="font-size:12px;cursor:pointer" onclick="window.game.selectColonistById(${c.id})">${c.name}</span>`;
            html += ` <span class="mood-${moodLevel}">${c.mood.toFixed(0)}</span>`;
            html += ` <span style="color:#888">${c.state}${c.drafted ? ' [D]' : ''}</span>`;
            html += `<div class="info-row">HP:${c.hp} H:${c.needs.hunger.toFixed(0)} R:${c.needs.rest.toFixed(0)}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.selectColonistById(${c.id})">Focus</button>`;
            html += `<button onclick="window.game.toggleDraft(${c.id})">${c.drafted ? 'Undraft' : 'Draft'}</button>`;
            html += `</div></div>`;
        }

        this.elements.infoPanel.innerHTML = html;
    }

    togglePriorityPanel() {
        this.priorityPanelVisible = !this.priorityPanelVisible;
        this.elements.priorityPanel.style.display = this.priorityPanelVisible ? 'block' : 'none';
        if (this.priorityPanelVisible) this.updatePriorityPanel();
    }

    updatePriorityPanel() {
        const skills = ['building', 'farming', 'crafting', 'cooking', 'hauling'];
        let html = '<table><tr><th>Colonist</th>';
        skills.forEach(s => { html += `<th>${s.substring(0, 5)}</th>`; });
        html += '</tr>';

        for (const c of this.game.colonists) {
            if (c.hp <= 0) continue;
            html += `<tr><td>${c.name}</td>`;
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
        this.craftPanelVisible = !this.craftPanelVisible;
        this.elements.craftPanel.style.display = this.craftPanelVisible ? 'block' : 'none';
        if (this.craftPanelVisible) this.updateCraftPanel();
    }

    updateCraftPanel() {
        const recipes = getAvailableRecipes(this.game);
        let html = '<div class="panel-close" data-panel-close="craft">&times;</div><h3>Crafting Orders</h3>';
        for (const { key, recipe, canCraft } of recipes) {
            const inputStr = Object.entries(recipe.input).map(([k, v]) => `${k}:${v}`).join('+');
            const outputStr = Object.entries(recipe.output).map(([k, v]) => `${k}:${v}`).join('+');
            const cls = canCraft ? 'craft-available' : 'craft-unavailable';
            html += `<div class="craft-row ${cls}">`;
            html += `<button ${canCraft ? '' : 'disabled'} onclick="window.game.craft('${key}')">${key.replace(/_/g, ' ')}</button>`;
            html += `<span>${inputStr} → ${outputStr}</span>`;
            html += `</div>`;
        }
        this.elements.craftPanel.innerHTML = html;
    }

    updateColonistHud() {
        let html = '<div class="hud-header">Colonists</div>';
        for (const c of this.game.colonists) {
            if (c.hp <= 0) {
                html += `<div class="hud-colonist dead"><span class="hud-name">${c.name}</span> <span style="color:#cc4444">DEAD</span></div>`;
                continue;
            }
            const moodLevel = getMoodLabel(c.mood);
            const moodColor = moodLevel === 'inspired' ? '#66ffcc' : moodLevel === 'content' ? '#88cc88' : moodLevel === 'stressed' ? '#cccc44' : '#ff4444';
            html += `<div class="hud-colonist" data-colonist-id="${c.id}">`;
            html += `<span class="hud-name">${c.name}</span> `;
            html += `<span style="color:${moodColor}">${c.mood.toFixed(0)}</span> `;
            html += `<span class="hud-state">${c.state}${c.drafted ? ' [D]' : ''}</span>`;
            html += `<div class="hud-bars">H:${c.needs.hunger.toFixed(0)} R:${c.needs.rest.toFixed(0)} HP:${c.hp}</div>`;
            html += `</div>`;
        }
        if (html !== this._lastHudHtml) {
            this._lastHudHtml = html;
            this.elements.colonistHud.innerHTML = html;
        }
    }

    toggleResearchPanel() {
        this.researchPanelVisible = !this.researchPanelVisible;
        this.elements.researchPanel.style.display = this.researchPanelVisible ? 'block' : 'none';
        if (this.researchPanelVisible) this.updateResearchPanel();
    }

    updateResearchPanel() {
        const research = this.game.research;
        let html = '<div class="panel-close" data-panel-close="research">&times;</div><h3>Research</h3>';
        html += `<div class="info-row" style="color:#aa88ff; font-weight:bold; margin-bottom:6px;">Study Points: ${Math.floor(research.studyPoints)}</div>`;
        html += `<div class="info-row" style="color:#888; margin-bottom:8px;">Colonists generate study points at the Arcanum. Spend them to unlock new knowledge.</div>`;

        const available = research.getAvailable();
        if (available.length === 0) {
            html += `<div class="info-row">All research completed!</div>`;
        }
        for (const tech of available) {
            const canAfford = research.studyPoints >= tech.cost;
            const cls = canAfford ? 'craft-available' : 'craft-unavailable';
            html += `<div class="craft-row ${cls}">`;
            html += `<button ${canAfford ? '' : 'disabled'} onclick="window.game.startResearch('${tech.key}')">${tech.name}</button>`;
            html += `<span style="color:#aaa">${tech.description} (${tech.cost} pts)</span>`;
            html += `</div>`;
        }

        const completed = [...research.completed];
        if (completed.length > 0) {
            html += `<div class="info-row" style="margin-top:8px;color:#66cc66;">Completed: ${completed.map(k => RESEARCH[k]?.name || k).join(', ')}</div>`;
        }

        if (html !== this._lastResearchHtml) {
            this._lastResearchHtml = html;
            this.elements.researchPanel.innerHTML = html;
        }
    }

    toggleEventLog() {}

    updateEventLog() {
        const entries = this.game.eventLog.getRecent(10);
        let html = '<div class="log-header">Event Log</div>';
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
        this.inventoryVisible = !this.inventoryVisible;
        this.elements.inventoryPanel.style.display = this.inventoryVisible ? 'block' : 'none';
        if (this.inventoryVisible) this.updateInventoryPanel();
    }

    updateInventoryPanel() {
        const r = this.game.resources.stockpile;
        const weapons = this.game.resources.weapons;
        let html = '<div class="panel-close" data-panel-close="inventory">&times;</div><h3>Inventory</h3>';

        html += '<div class="info-row" style="color:#88cc88;margin-bottom:4px;"><b>Resources:</b></div>';
        for (const [key, amount] of Object.entries(r)) {
            if (amount <= 0) continue;
            html += `<div class="inv-row"><span class="inv-name">${key.replace(/_/g, ' ')}</span><span class="inv-amount">${amount}</span></div>`;
        }

        if (weapons.length > 0) {
            html += '<div class="info-row" style="color:#cc8888;margin-top:8px;margin-bottom:4px;"><b>Weapons in Storage:</b></div>';
            for (const w of weapons) {
                html += `<div class="inv-row"><span class="inv-name">${w.name}</span><span class="inv-amount">Dmg: ${w.damage}</span></div>`;
            }
        }

        const tamed = this.game.tamedAnimals;
        if (tamed.length > 0) {
            html += '<div class="info-row" style="color:#aacc88;margin-top:8px;margin-bottom:4px;"><b>Tamed Animals:</b></div>';
            const counts = {};
            for (const a of tamed) {
                counts[a.type] = (counts[a.type] || 0) + 1;
            }
            for (const [type, count] of Object.entries(counts)) {
                const def = TAMED_ANIMALS[type];
                html += `<div class="inv-row"><span class="inv-name">${type}</span><span class="inv-amount">x${count} (produces: ${def.produces})</span></div>`;
            }
        }

        this.elements.inventoryPanel.innerHTML = html;
    }

    toggleTamingPanel() {
        this.tamingPanelVisible = !this.tamingPanelVisible;
        this.elements.tamingPanel.style.display = this.tamingPanelVisible ? 'block' : 'none';
        if (this.tamingPanelVisible) this.updateTamingPanel();
    }

    updateTamingPanel() {
        let html = '<div class="panel-close" data-panel-close="taming">&times;</div><h3>Beast Binding</h3>';
        if (!this.game.research.isResearched('beast_binding')) {
            html += '<div class="info-row" style="color:#888">Requires research: Beast Binding</div>';
            this.elements.tamingPanel.innerHTML = html;
            return;
        }

        html += '<div class="info-row" style="color:#aaa;margin-bottom:6px;">Bind creatures to produce resources. Requires a beast circle and food.</div>';

        for (const [type, def] of Object.entries(TAMED_ANIMALS)) {
            const canAfford = this.game.resources.has({ food: def.foodToTame });
            const cls = canAfford ? 'craft-available' : 'craft-unavailable';
            html += `<div class="craft-row ${cls}">`;
            html += `<button ${canAfford ? '' : 'disabled'} onclick="window.game.tameAnimalType('${type}')">Tame ${type}</button>`;
            html += `<span>Cost: ${def.foodToTame} food | Produces: ${def.produces} every ${def.produceRate} ticks</span>`;
            html += `</div>`;
        }

        const tamed = this.game.tamedAnimals;
        if (tamed.length > 0) {
            html += '<div class="info-row" style="margin-top:8px;color:#88cc88"><b>Your Animals:</b></div>';
            for (const a of tamed) {
                html += `<div class="info-row">${a.type} - HP:${a.hp}/${a.maxHp}</div>`;
            }
        }

        this.elements.tamingPanel.innerHTML = html;
    }

    toggleSettingsPanel() {
        this.settingsPanelVisible = !this.settingsPanelVisible;
        this.elements.settingsPanel.style.display = this.settingsPanelVisible ? 'block' : 'none';
        if (this.settingsPanelVisible) this.updateSettingsPanel();
    }

    updateSettingsPanel() {
        const s = this.game.settings;
        let html = '<div class="panel-close" data-panel-close="settings">&times;</div><h3>Settings</h3>';
        html += `<div class="settings-row">`;
        html += `<input type="checkbox" id="set-pause-hostile" ${s.autoPauseHostile ? 'checked' : ''} onchange="window.game.settings.autoPauseHostile=this.checked">`;
        html += `<label for="set-pause-hostile">Auto-pause on hostile event (raids)</label>`;
        html += `</div>`;
        html += `<div class="settings-row">`;
        html += `<input type="checkbox" id="set-pause-event" ${s.autoPauseEvent ? 'checked' : ''} onchange="window.game.settings.autoPauseEvent=this.checked">`;
        html += `<label for="set-pause-event">Auto-pause on choice events (wanderers, caravans)</label>`;
        html += `</div>`;
        html += `<div class="settings-row">`;
        html += `<input type="checkbox" id="set-peaceful" ${CONFIG.PEACEFUL_MODE ? 'checked' : ''} onchange="window.game.togglePeaceful()">`;
        html += `<label for="set-peaceful">Peaceful mode (no raids/hostile animals)</label>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:12px; border-top:1px solid #444; padding-top:8px; gap:8px;">`;
        html += `<button onclick="window.game.save()" style="padding:6px 12px;font-family:inherit;font-size:12px;background:#2a4a2a;border:1px solid #4a4;color:#8c8;cursor:pointer;border-radius:3px;">Save Game</button>`;
        html += `<button onclick="window.game.exportSave()" style="padding:6px 12px;font-family:inherit;font-size:12px;background:#2a2a4a;border:1px solid #55a;color:#aaf;cursor:pointer;border-radius:3px;">Export Save</button>`;
        html += `</div>`;
        this.elements.settingsPanel.innerHTML = html;
    }

    isBuildingLocked(buildType) {
        const reqs = {
            beast_circle: 'beast_binding',
            mana_crystal: 'ley_channeling',
            glowstone: 'luminance',
            enchanting_table: 'arcane_infusion',
            ember_ward: 'ember_magic',
            arcane_sentinel: 'warding',
        };
        const req = reqs[buildType];
        return req && !this.game.research.isResearched(req);
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
            }
            return;
        }
        const eventId = evt.type + evt.text;
        if (this._lastEventId === eventId) return;
        this._lastEventId = eventId;
        this.elements.eventPanel.style.display = 'block';
        this.elements.eventPanel.className = evt.type === 'raid' ? 'event-panel-raid' : '';
        let html = `<div class="event-text">${evt.text}</div><div class="event-choices">`;
        evt.choices.forEach((choice, i) => {
            html += `<button onclick="window.game.resolveEvent(${i})">${choice}</button>`;
        });
        html += '</div>';
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
