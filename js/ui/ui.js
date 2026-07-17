import { CONFIG, TRAITS, BUILDINGS, BUILD_CATEGORIES, TILE_CHARS, TILE_COLORS, RESEARCH, ANIMALS, TAMED_ANIMALS, WAVE_CONFIG, RECIPE_CATEGORIES, WEAPONS, ARMORS, TOOLS, ARTIFACTS, POTIONS, SKILLS } from '../core/config.js';
import { getAvailableRecipes } from '../systems/crafting.js';
import { CROP_RESEARCH_REQS } from '../systems/farming.js';

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
        this.elements.infoPanel = document.getElementById('info-content');
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

        this.elements.craftPanel.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-craft-tab]');
            if (tab) {
                this._craftTab = tab.dataset.craftTab;
                this._lastCraftHtml = '';
                this.updateCraftPanel();
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
        this.updateMinimapControls();
        if (this.priorityPanelVisible) this.updatePriorityPanel();
        if (this.craftPanelVisible) this.updateCraftPanel();
        if (this.researchPanelVisible) this.updateResearchPanel();
        this.updateColonistHud();
        this.updateEventLog();
        if (this.inventoryVisible) this.updateInventoryPanel();
        if (this.tamingPanelVisible) this.updateTamingPanel();
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

        this.elements.statusBar.innerHTML =
            `<span class="res">Wood:${r.wood}</span>` +
            `<span class="res">Stone:${r.stone}</span>` +
            `<span class="res">Food:${r.food}</span>` +
            (voidEssence > 0 ? `<span class="res" style="color:#9933ff">Void:${voidEssence}</span>` : '') +
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
            `<span class="info">${speed}</span>` +
            (CONFIG.PEACEFUL_MODE ? `<span class="peaceful">PEACEFUL</span>` : '');
    }

    updateModeDisplay(input) {
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
            html += `<span class="mode-opt" data-mode-action="settings">[,]Settings</span>`;
            html += '</span>';
        }
        this.elements.modeBar.innerHTML = html;
    }

    getWavePreview(waveNum) {
        const enemies = WAVE_CONFIG.baseEnemies + WAVE_CONFIG.enemiesPerWave * (waveNum - 1);
        const hp = WAVE_CONFIG.baseHp + WAVE_CONFIG.hpPerWave * (waveNum - 1);
        return `${enemies} enemies, ${hp} HP each`;
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
        const artifactTip = colonist.artifact ? Object.entries(colonist.artifact).filter(([k]) => k !== 'name' && k !== 'key').map(([k, v]) => `${k}: ${typeof v === 'number' ? (v > 1 ? `+${Math.round((v-1)*100)}%` : `${Math.round(v*100)}%`) : v}`).join(', ') : 'No artifact equipped';

        const nc = colonist.nameColor || '#ffff00';
        let html = `<div class="info-header" style="cursor:pointer;color:${nc}" onclick="window.game.selectColonistById(${colonist.id})">${colonist.name} ${colonist.drafted ? '[DRAFTED]' : ''}</div>`;
        html += `<div class="info-row">HP: ${colonist.hp}/${colonist.maxHp}</div>`;
        html += `<div class="info-row">Mood: <span class="mood-${moodLevel}">${colonist.mood.toFixed(0)} (${moodLevel})</span></div>`;
        html += `<div class="info-row">State: ${colonist.state}</div>`;
        html += `<div class="info-row">Task: ${this.getColonistTaskDescription(colonist)}</div>`;
        html += `<div class="info-row">Traits: ${traitSpans}</div>`;
        html += `<div class="info-row">Hunger: ${bar(colonist.needs.hunger)} Rest: ${bar(colonist.needs.rest)}</div>`;
        html += `<div class="info-row">Skills: ${Object.entries(SKILLS).map(([k, def]) => `<span class="skill-tip" data-tip="${def.description}">${def.name}:${colonist.skills[k] || 1}</span>`).join(' ')}</div>`;
        html += `<div class="info-row">Weapon: <span class="skill-tip" data-tip="${weaponTip}">${colonist.weapon?.name || 'Fists'}</span></div>`;
        html += `<div class="info-row">Armor: <span class="skill-tip" data-tip="${armorTip}">${colonist.armor?.name || 'None'}</span></div>`;
        html += `<div class="info-row">Tool: <span class="skill-tip" data-tip="${toolTip}">${colonist.tool?.name || 'None'}</span></div>`;
        html += `<div class="info-row">Artifact: <span class="skill-tip" data-tip="${artifactTip}">${colonist.artifact?.name || 'None'}</span></div>`;
        if (colonist.activeEffects && colonist.activeEffects.length > 0) {
            const effects = colonist.activeEffects.map(e => `<span style="color:#88ffaa">${e.type} (${e.expiresAt - this.game.tick}t)</span>`).join(', ');
            html += `<div class="info-row">Effects: ${effects}</div>`;
        }
        html += `<div class="info-row">Bed: ${colonist.assignedBed ? `(${colonist.assignedBed.x},${colonist.assignedBed.y})` : 'None'}</div>`;
        if (thoughts) html += `<div class="info-thoughts"><b>Thoughts:</b><br>${thoughts}</div>`;
        html += `<div class="info-actions">`;
        html += `<button onclick="window.game.toggleDraft(${colonist.id})">${colonist.drafted ? 'Undraft' : 'Draft'}</button>`;
        html += this.buildWeaponDropdown(colonist);
        html += this.buildArmorDropdown(colonist);
        html += this.buildToolDropdown(colonist);
        html += this.buildArtifactDropdown(colonist);
        html += `<button onclick="window.game.centerOnColonist(${colonist.id})">Center Camera</button>`;
        const isFollowing = this.game.followingColonist === colonist.id;
        html += `<button onclick="window.game.toggleFollow(${colonist.id})">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
        html += `</div>`;
        html += `<div class="info-row">Color: <input type="color" value="${nc}" onchange="window.game.setColonistColor(${colonist.id}, this.value)"></div>`;
        return html;
    }

    showColonistInfo(colonist) {
        this._switchToInfoTab();
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

        this.elements.infoPanel.innerHTML = html;
    }

    showTileEntities(tile, x, y, colonists, animals, raiders = [], tamedAnimals = []) {
        this._switchToInfoTab();
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
                if (tamedDef) html += `<div class="info-row" style="color:#88cc88">Produces: ${tamedDef.produces} (every ${tamedDef.produceRate} ticks)</div>`;
            }
            html += `<div class="info-row">Speed: ${def?.speed || a.speed}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.huntAnimal(${a.id})">Hunt</button>`;
            if (def?.tameable && this.game.research.isResearched('beast_binding')) {
                const tamedDef = TAMED_ANIMALS[a.type];
                const canAfford = tamedDef && this.game.resources.has({ food: tamedDef.foodToTame });
                html += `<button ${canAfford ? '' : 'disabled'} onclick="window.game.tameWildAnimal(${a.id})">Tame (${tamedDef?.foodToTame || '?'} food)</button>`;
            }
            html += `</div></div>`;
        }

        for (const a of tamedAnimals) {
            const def = TAMED_ANIMALS[a.type];
            const color = def?.color || '#ccaa88';
            html += `<div style="border-bottom:1px solid #444;margin-bottom:6px;padding-bottom:6px;">`;
            html += `<div class="info-header" style="color:${color};">${a.type} (tamed)</div>`;
            html += `<div class="info-row">HP: ${a.hp}/${a.maxHp}</div>`;
            if (def) {
                html += `<div class="info-row">Produces: ${def.produces} (every ${def.produceRate} ticks)</div>`;
                html += `<div class="info-row">Next in: ${a.produceCooldown} ticks</div>`;
            }
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

        this.elements.infoPanel.innerHTML = html;
    }

    showMultiColonistInfo(colonists) {
        this._switchToInfoTab();
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
            html += ` <span style="color:#888">${c.state}${c.drafted ? ' [D]' : ''}</span>`;
            html += `<div class="info-row">HP:${c.hp} H:${c.needs.hunger.toFixed(0)} R:${c.needs.rest.toFixed(0)}</div>`;
            html += `<div class="info-actions">`;
            html += `<button onclick="window.game.selectColonistById(${c.id})">Focus</button>`;
            html += `<button onclick="window.game.toggleDraft(${c.id})">${c.drafted ? 'Undraft' : 'Draft'}</button>`;
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
        for (const c of this.game.colonists) {
            if (c.hp <= 0) {
                html += `<div class="hud-colonist dead"><span class="hud-name" style="color:${c.nameColor || '#ffff00'}">${c.name}</span> <span style="color:#cc4444">DEAD</span></div>`;
                continue;
            }
            const moodLevel = getMoodLabel(c.mood);
            const moodColor = moodLevel === 'inspired' ? '#66ffcc' : moodLevel === 'content' ? '#88cc88' : moodLevel === 'stressed' ? '#cccc44' : '#ff4444';
            const hungerColor = statColor(c.needs.hunger);
            const restColor = statColor(c.needs.rest);
            const hpColor = statColor(c.maxHp > 0 ? (c.hp / c.maxHp) * 100 : 100);
            const weapon = c.weapon?.name || 'Fists';
            html += `<div class="hud-colonist" data-colonist-id="${c.id}">`;
            html += `<span class="hud-name" style="color:${c.nameColor || '#ffff00'}">${c.name}</span> <span class="hud-weapon">${weapon}</span> <span class="hud-state">${c.state}${c.drafted ? ' [D]' : ''}</span>`;
            html += `<div class="hud-bars">Mood: <span style="color:${moodColor}">${c.mood.toFixed(0)} (${moodLevel})</span> | Hunger: <span style="color:${hungerColor}">${c.needs.hunger.toFixed(0)}</span> | Rest: <span style="color:${restColor}">${c.needs.rest.toFixed(0)}</span> | HP: <span style="color:${hpColor}">${c.hp}/${c.maxHp}</span></div>`;
            html += `</div>`;
        }
        if (html !== this._lastHudHtml) {
            this._lastHudHtml = html;
            this.elements.colonistHud.innerHTML = html;
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
        let html = '<div class="panel-close" data-panel-close="research">&times;</div><h3>Research</h3>';
        html += `<div class="info-row" style="color:#aa88ff; font-weight:bold; margin-bottom:6px;">Study Points: ${Math.floor(research.studyPoints)}</div>`;
        html += `<div class="info-row" style="color:#888; margin-bottom:8px;">Colonists generate study points at the Arcanum. Spend them to unlock new knowledge.</div>`;

        const layers = this._buildResearchLayers();
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
                html += `<div class="${cls}" data-key="${key}" data-requires="${tech.requires.join(',')}">`;
                html += `<div class="research-node-name">${tech.name}</div>`;
                html += `<div class="research-node-desc">${tech.description}</div>`;
                html += `<div class="research-node-cost">${completed ? 'Researched' : `${tech.cost} pts`}</div>`;
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
        const family = new Set([key]);
        // Ancestors
        const findAncestors = (k) => {
            const tech = RESEARCH[k];
            if (!tech) return;
            for (const req of tech.requires) {
                family.add(req);
                findAncestors(req);
            }
        };
        findAncestors(key);
        // Descendants
        const findDescendants = (k) => {
            for (const [childKey, childTech] of Object.entries(RESEARCH)) {
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
            // Redraw highlighted connections
            this._highlightResearchPaths(tree, family, key);
        }
    }

    _highlightResearchPaths(tree, family, hoveredKey) {
        const svg = document.getElementById('research-lines');
        if (!svg) return;
        const paths = svg.querySelectorAll('path');
        const nodes = tree.querySelectorAll('.research-node[data-key]');
        const nodeRects = {};
        const treeRect = tree.getBoundingClientRect();
        for (const node of nodes) {
            const r = node.getBoundingClientRect();
            nodeRects[node.dataset.key] = {
                cx: r.left + r.width / 2 - treeRect.left,
                top: r.top - treeRect.top,
                bottom: r.bottom - treeRect.top
            };
        }
        // Mark paths as highlighted if both endpoints are in the family
        let idx = 0;
        for (const node of nodes) {
            const key = node.dataset.key;
            const requires = node.dataset.requires;
            if (!requires) continue;
            for (const req of requires.split(',')) {
                if (!req || !nodeRects[req] || !nodeRects[key]) { idx++; continue; }
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

    _buildResearchLayers() {
        const depths = {};
        function getDepth(key) {
            if (depths[key] !== undefined) return depths[key];
            const tech = RESEARCH[key];
            if (!tech || tech.requires.length === 0) {
                depths[key] = 0;
                return 0;
            }
            const d = 1 + Math.max(...tech.requires.map(r => getDepth(r)));
            depths[key] = d;
            return d;
        }
        for (const key of Object.keys(RESEARCH)) getDepth(key);
        const maxDepth = Math.max(...Object.values(depths), 0);
        const layers = [];
        for (let i = 0; i <= maxDepth; i++) layers.push([]);
        for (const [key, d] of Object.entries(depths)) layers[d].push(key);

        // Barycenter heuristic: sort each layer so nodes are near their parents
        for (let i = 1; i < layers.length; i++) {
            const parentPositions = {};
            for (let j = 0; j < layers[i - 1].length; j++) {
                parentPositions[layers[i - 1][j]] = j;
            }
            layers[i].sort((a, b) => {
                const aReqs = RESEARCH[a].requires;
                const bReqs = RESEARCH[b].requires;
                const aCenter = aReqs.length > 0 ? aReqs.reduce((s, r) => s + (parentPositions[r] ?? 0), 0) / aReqs.length : 0;
                const bCenter = bReqs.length > 0 ? bReqs.reduce((s, r) => s + (parentPositions[r] ?? 0), 0) / bReqs.length : 0;
                return aCenter - bCenter;
            });
        }

        // Also sort layer 0 so their children cluster well
        const childCount = {};
        for (const key of layers[0]) childCount[key] = 0;
        if (layers.length > 1) {
            for (const key of layers[1]) {
                for (const req of RESEARCH[key].requires) {
                    if (childCount[req] !== undefined) childCount[req]++;
                }
            }
        }
        layers[0].sort((a, b) => childCount[b] - childCount[a]);

        // Re-run barycenter using positions from ALL ancestor layers
        for (let i = 1; i < layers.length; i++) {
            const allPositions = {};
            for (let l = 0; l < i; l++) {
                for (let j = 0; j < layers[l].length; j++) {
                    // Normalize position to 0-1 range for cross-layer comparison
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
            weapons.forEach((w, i) => {
                html += `<div class="inv-row"><span class="inv-name">${w.name}</span><span class="inv-amount">Dmg: ${w.damage}</span><button class="inv-delete" onclick="if(confirm('Discard ${w.name}?')){window.game.discardWeapon(${i})}">x</button></div>`;
            });
        }

        const armors = this.game.resources.armors;
        if (armors.length > 0) {
            html += '<div class="info-row" style="color:#9966cc;margin-top:8px;margin-bottom:4px;"><b>Armor in Storage:</b></div>';
            armors.forEach((a, i) => {
                html += `<div class="inv-row"><span class="inv-name">${a.name}</span><span class="inv-amount">-${Math.round(a.damageReduction * 100)}% dmg</span><button class="inv-delete" onclick="if(confirm('Discard ${a.name}?')){window.game.discardArmor(${i})}">x</button></div>`;
            });
        }

        const tools = this.game.resources.tools;
        if (tools.length > 0) {
            html += '<div class="info-row" style="color:#88aacc;margin-top:8px;margin-bottom:4px;"><b>Tools in Storage:</b></div>';
            tools.forEach((t, i) => {
                const stats = [];
                if (t.miningSpeed) stats.push(`+${Math.round((t.miningSpeed-1)*100)}% mine`);
                if (t.choppingSpeed) stats.push(`+${Math.round((t.choppingSpeed-1)*100)}% chop`);
                if (t.farmingSpeed) stats.push(`+${Math.round((t.farmingSpeed-1)*100)}% farm`);
                if (t.moveSpeedBonus) stats.push(`+${Math.round(t.moveSpeedBonus*100)}% move`);
                html += `<div class="inv-row"><span class="inv-name">${t.name}</span><span class="inv-amount">${stats.join(', ')}</span><button class="inv-delete" onclick="if(confirm('Discard ${t.name}?')){window.game.discardTool(${i})}">x</button></div>`;
            });
        }

        const artifacts = this.game.resources.artifacts;
        if (artifacts.length > 0) {
            html += '<div class="info-row" style="color:#ccaa44;margin-top:8px;margin-bottom:4px;"><b>Artifacts in Storage:</b></div>';
            artifacts.forEach((a, i) => {
                const stats = [];
                if (a.miningSpeed) stats.push(`+${Math.round((a.miningSpeed-1)*100)}% mine`);
                if (a.choppingSpeed) stats.push(`+${Math.round((a.choppingSpeed-1)*100)}% chop`);
                if (a.farmingSpeed) stats.push(`+${Math.round((a.farmingSpeed-1)*100)}% farm`);
                if (a.moveSpeedBonus) stats.push(`+${Math.round(a.moveSpeedBonus*100)}% move`);
                if (a.damageReduction) stats.push(`-${Math.round(a.damageReduction*100)}% dmg`);
                html += `<div class="inv-row"><span class="inv-name">${a.name}</span><span class="inv-amount">${stats.join(', ')}</span><button class="inv-delete" onclick="if(confirm('Discard ${a.name}?')){window.game.discardArtifact(${i})}">x</button></div>`;
            });
        }

        const potions = this.game.resources.potions;
        if (potions.length > 0) {
            html += '<div class="info-row" style="color:#cc88aa;margin-top:8px;margin-bottom:4px;"><b>Potions:</b></div>';
            const potionCounts = {};
            for (const p of potions) {
                potionCounts[p.type] = (potionCounts[p.type] || 0) + 1;
            }
            for (const [type, count] of Object.entries(potionCounts)) {
                const def = POTIONS[type];
                html += `<div class="inv-row"><span class="inv-name">${def ? def.name : type}</span><span class="inv-amount">x${count}</span></div>`;
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
            html += `${type} — Cost: ${def.foodToTame} food | Produces: ${def.produces} (every ${def.produceRate} ticks)`;
            html += `</div>`;
        }

        const tamed = this.game.tamedAnimals;
        if (tamed.length > 0) {
            html += '<div class="info-row" style="margin-top:8px;color:#88cc88"><b>Your Animals:</b></div>';
            for (const a of tamed) {
                const def = TAMED_ANIMALS[a.type];
                html += `<div class="info-row" style="color:${def?.color || '#ccc'}">${a.type} — HP:${a.hp}/${a.maxHp} | Next ${def?.produces}: ${a.produceCooldown} ticks</div>`;
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
        const uiSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ui-font-size')) || 12;
        html += `<div class="settings-row">`;
        html += `<label for="set-ui-font-size">UI Font Size: <span id="ui-font-size-val">${uiSize}px</span></label>`;
        html += `<input type="range" id="set-ui-font-size" min="8" max="20" value="${uiSize}" oninput="window.setUIFontSize(this.value)">`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:12px; border-top:1px solid #444; padding-top:8px; gap:8px;">`;
        html += `<button onclick="window.game.save()" style="padding:6px 12px;font-family:inherit;font-size:12px;background:#2a4a2a;border:1px solid #4a4;color:#8c8;cursor:pointer;border-radius:3px;">Save Game</button>`;
        html += `<button onclick="window.game.exportSave()" style="padding:6px 12px;font-family:inherit;font-size:12px;background:#2a2a4a;border:1px solid #55a;color:#aaf;cursor:pointer;border-radius:3px;">Export Save</button>`;
        html += `</div>`;
        html += `<div class="settings-row" style="margin-top:16px; border-top:1px solid #633; padding-top:10px; flex-direction:column; align-items:flex-start;">`;
        html += `<div style="color:#ff6666; font-size:10px; font-weight:bold; margin-bottom:4px;">⚠ DEBUG / TESTING ONLY ⚠</div>`;
        html += `<button onclick="window.game.cheatResources()" style="padding:6px 12px;font-family:inherit;font-size:11px;background:#4a1a1a;border:1px solid #a33;color:#f99;cursor:pointer;border-radius:3px;">Grant 999 of All Resources + Research</button>`;
        html += `</div>`;
        this.elements.settingsPanel.innerHTML = html;
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

function statColor(value) {
    if (value >= 70) return '#88cc88';
    if (value >= 40) return '#cccc44';
    if (value >= 20) return '#cc8844';
    return '#cc4444';
}
