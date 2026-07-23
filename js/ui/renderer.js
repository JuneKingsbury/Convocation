import { CONFIG, TILE_COLORS, BUILDINGS, RENDER_CONFIG, COMBAT_VISUALS } from '../core/config.js';
import { getTileChar, getTileColor, getTileBg } from '../world/map.js';
import { OverlayRenderer } from './overlay-renderer.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.canvas.style.display = 'block';
        container.innerHTML = '';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.overlayRenderer = new OverlayRenderer(container);

        this.charWidth = 0;
        this.charHeight = 0;
        this.fontSize = RENDER_CONFIG.fontSize;
        this._lastViewportW = 0;
        this._lastViewportH = 0;

        // Reusable Maps cleared each frame to avoid GC pressure
        this._entityMap = new Map();
        this._rallySet = new Map();
        this._portalMap = new Map();
        this._portalPathMap = new Map();
        this._shotMap = new Map();
        this._effectMap = new Map();

        this.measureFont(RENDER_CONFIG.fontSize);
    }

    measureFont(fontSize) {
        this.fontSize = fontSize;
        this.ctx.font = `${fontSize}px 'Courier New', monospace`;
        const metrics = this.ctx.measureText('M');
        this._textWidth = Math.ceil(metrics.width);
        this.charHeight = Math.ceil(fontSize * RENDER_CONFIG.fontHeightMult);
        this.charWidth = this.charHeight;
        this._textOffsetX = Math.floor((this.charWidth - this._textWidth) / 2);
        this._resizeCanvas();
    }

    _resizeCanvas() {
        const w = CONFIG.VIEWPORT_WIDTH * this.charWidth;
        const h = CONFIG.VIEWPORT_HEIGHT * this.charHeight;
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this.ctx.font = `${this.fontSize}px 'Courier New', monospace`;
            this.ctx.textBaseline = 'top';
        }
        this.overlayRenderer.resize(w, h);
        this._lastViewportW = CONFIG.VIEWPORT_WIDTH;
        this._lastViewportH = CONFIG.VIEWPORT_HEIGHT;
    }

    getNightDarkness(timeOfDay, season) {
        const t = timeOfDay / CONFIG.TICKS_PER_DAY;
        const daylight = RENDER_CONFIG.seasonDaylight[season] || RENDER_CONFIG.seasonDaylight.default;
        const { dawn, dusk } = daylight;
        const duskEnd = dusk + RENDER_CONFIG.nightDawnDuskOffset.duskEnd;
        const dawnStart = dawn - RENDER_CONFIG.nightDawnDuskOffset.dawnStart;
        const maxDark = RENDER_CONFIG.nightMaxDarkness;

        if (t >= dawn && t <= dusk) return 0;
        if (t > dusk && t <= duskEnd) return ((t - dusk) / (duskEnd - dusk)) * maxDark;
        if (t >= dawnStart && t < dawn) return ((dawn - t) / (dawn - dawnStart)) * maxDark;
        return maxDark;
    }

    render(game) {
        if (this._lastViewportW !== CONFIG.VIEWPORT_WIDTH || this._lastViewportH !== CONFIG.VIEWPORT_HEIGHT) {
            this._resizeCanvas();
        }

        const { map, camera, colonists, wildlife, raiders, tamedAnimals, cursor } = game;
        const ctx = this.ctx;
        const cw = this.charWidth;
        const ch = this.charHeight;
        const selectionRect = game.input.getSelectionRect();
        const spellTargeting = game.input.spellTargeting;
        let spellRangeSet = null;
        if (spellTargeting) {
            const caster = game.getColonist(spellTargeting.colonistId);
            if (caster && caster.hp > 0) {
                spellRangeSet = new Set();
                const range = spellTargeting.spell.range || 1;
                for (let dy = -range; dy <= range; dy++) {
                    for (let dx = -range; dx <= range; dx++) {
                        if (Math.abs(dx) + Math.abs(dy) > range) continue;
                        const tx = caster.x + dx;
                        const ty = caster.y + dy;
                        if (tx >= 0 && ty >= 0 && tx < CONFIG.MAP_WIDTH && ty < CONFIG.MAP_HEIGHT) {
                            spellRangeSet.add(ty * CONFIG.MAP_WIDTH + tx);
                        }
                    }
                }
            }
        }

        ctx.fillStyle = RENDER_CONFIG.bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const entityMap = this._entityMap;
        entityMap.clear();
        for (const a of wildlife) {
            if (a.hp > 0) entityMap.set(a.y * CONFIG.MAP_WIDTH + a.x, { char: a.char, color: a.color });
        }
        if (tamedAnimals) {
            for (const a of tamedAnimals) {
                if (a.hp > 0) entityMap.set(a.y * CONFIG.MAP_WIDTH + a.x, { char: a.char, color: a.color });
            }
        }
        if (game.waves) {
            for (const e of game.waves.enemies) {
                if (e.hp > 0) entityMap.set(e.y * CONFIG.MAP_WIDTH + e.x, { char: e.char, color: e.color });
            }
        }
        for (const r of raiders) {
            if (r.hp > 0) entityMap.set(r.y * CONFIG.MAP_WIDTH + r.x, { char: 'R', color: TILE_COLORS.raider });
        }
        const rallySet = this._rallySet;
        rallySet.clear();
        for (const c of colonists) {
            if (c.hp > 0 && !c.onExpedition) {
                const drafted = c.drafted;
                const pulse = drafted && (game.tick % 20 < 10);
                let color;
                if (drafted) {
                    color = pulse ? '#ff4444' : '#ff8888';
                } else if (c.activeEffects && c.activeEffects.some(e => e.source === 'spell') && game.tick % 16 < 8) {
                    color = COMBAT_VISUALS.spellBuffColor;
                } else {
                    color = c.nameColor || TILE_COLORS.colonist;
                }
                entityMap.set(c.y * CONFIG.MAP_WIDTH + c.x, { char: c.golem ? 'G' : '@', color });
                if (drafted && c.draftTarget) {
                    rallySet.set(c.draftTarget.y * CONFIG.MAP_WIDTH + c.draftTarget.x, true);
                }
            }
        }
        for (const [key] of rallySet) {
            if (!entityMap.has(key)) {
                entityMap.set(key, { char: '⚑', color: '#ff4444' });
            }
        }

        const portalMap = this._portalMap;
        const portalPathMap = this._portalPathMap;
        portalMap.clear();
        portalPathMap.clear();
        if (game.waves && game.waves.active && game.waves.portals.length > 0) {
            for (const p of game.waves.portals) {
                portalMap.set(p.y * CONFIG.MAP_WIDTH + p.x, true);
            }
            const pathPoints = game.waves.getPathPreview(game);
            for (const pt of pathPoints) {
                const key = pt.y * CONFIG.MAP_WIDTH + pt.x;
                if (!portalMap.has(key)) portalPathMap.set(key, true);
            }
        }

        const shotMap = this._shotMap;
        shotMap.clear();
        if (game.power && game.power.activeShots) {
            for (const shot of game.power.activeShots) {
                const points = getLinePoints(shot.fromX, shot.fromY, shot.toX, shot.toY);
                for (const p of points) {
                    shotMap.set(p.y * CONFIG.MAP_WIDTH + p.x, shot.color);
                }
            }
        }

        const effectMap = this._effectMap;
        effectMap.clear();
        if (game.combatEffects) {
            for (const e of game.combatEffects) {
                effectMap.set(e.y * CONFIG.MAP_WIDTH + e.x, e);
            }
        }

        let lastColor = '';
        for (let sy = 0; sy < CONFIG.VIEWPORT_HEIGHT; sy++) {
            for (let sx = 0; sx < CONFIG.VIEWPORT_WIDTH; sx++) {
                const wx = camera.x + sx;
                const wy = camera.y + sy;
                const px = sx * cw;
                const py = sy * ch;

                if (wx < 0 || wx >= CONFIG.MAP_WIDTH || wy < 0 || wy >= CONFIG.MAP_HEIGHT) {
                    continue;
                }

                const tile = map[wy][wx];
                let char = getTileChar(tile, game.weather.season);
                let color = getTileColor(tile, game.weather.season);
                let bg = getTileBg(tile);

                if (tile.designation) {
                    color = TILE_COLORS[`designation_${tile.designation.type}`] || '#ffff00';
                }

                if (tile.structure === 'rift_gate' && game.exploration && game.exploration.expeditions.length > 0) {
                    color = game.tick % 20 < 10 ? '#33ccff' : '#1a6688';
                }

                const tileKey = wy * CONFIG.MAP_WIDTH + wx;

                if (portalMap.has(tileKey)) {
                    char = COMBAT_VISUALS.portalChar;
                    color = COMBAT_VISUALS.portalColor;
                    bg = COMBAT_VISUALS.portalBg;
                } else if (portalPathMap.has(tileKey)) {
                    color = COMBAT_VISUALS.portalPathColor;
                    bg = COMBAT_VISUALS.portalPathBg;
                }

                const entity = entityMap.get(tileKey);
                if (entity) {
                    char = entity.char;
                    color = entity.color;
                }

                const shotColor = shotMap.get(tileKey);
                if (shotColor && !entity) {
                    char = '*';
                    color = shotColor;
                }

                const effect = effectMap.get(tileKey);
                if (effect) {
                    char = effect.char;
                    color = effect.color;
                }

                if (spellRangeSet && spellRangeSet.has(tileKey)) {
                    bg = COMBAT_VISUALS.spellRangePreviewBg;
                }

                const inSelection = selectionRect &&
                    wx >= selectionRect.x1 && wx <= selectionRect.x2 &&
                    wy >= selectionRect.y1 && wy <= selectionRect.y2;

                if (inSelection) {
                    bg = game.input.mode === 'zone' ? RENDER_CONFIG.selectionBgZone : RENDER_CONFIG.selectionBgBuild;
                } else if (cursor && cursor.x === wx && cursor.y === wy) {
                    bg = RENDER_CONFIG.cursorBg;
                }

                if (bg) {
                    ctx.fillStyle = bg;
                    ctx.fillRect(px, py, cw, ch);
                    lastColor = '';
                }

                if (char === '█' || char === '▓' || char === '▒') {
                    if (color !== lastColor) {
                        ctx.fillStyle = color;
                        lastColor = color;
                    }
                    ctx.fillRect(px, py, cw, ch);
                } else {
                    if (color !== lastColor) {
                        ctx.fillStyle = color;
                        lastColor = color;
                    }
                    ctx.fillText(char, px + this._textOffsetX, py);
                }
            }
        }

        if (game.settings.showColonistNames === 'always') {
            ctx.save();
            ctx.font = `${Math.max(8, this.fontSize * 0.6)}px monospace`;
            ctx.textBaseline = 'bottom';
            ctx.globalAlpha = 0.8;
            for (const c of colonists) {
                if (c.hp <= 0 || c.onExpedition) continue;
                const sx = c.x - camera.x;
                const sy = c.y - camera.y;
                if (sx < 0 || sx >= CONFIG.VIEWPORT_WIDTH || sy < 0 || sy >= CONFIG.VIEWPORT_HEIGHT) continue;
                ctx.fillStyle = c.nameColor || '#ffff00';
                ctx.fillText(c.name, sx * cw, sy * ch - 1);
            }
            ctx.restore();
        }

        // Night overlay: precompute light grid to avoid O(viewport * sources) per tile
        const darkness = game.settings.showNightLighting ? this.getNightDarkness(game.timeOfDay, game.weather.season) : 0;
        if (darkness > 0) {
            const lightSources = this._getLightSources(game, camera);
            const steps = RENDER_CONFIG.nightGradientSteps;
            const [nr, ng, nb] = RENDER_CONFIG.nightOverlayColor;
            const darkStyles = [];
            for (let i = 1; i <= steps; i++) {
                darkStyles.push(`rgba(${nr},${ng},${nb},${(darkness * i / steps).toFixed(3)})`);
            }

            const vw = CONFIG.VIEWPORT_WIDTH;
            const vh = CONFIG.VIEWPORT_HEIGHT;

            // Build a flat light-level grid by stamping each source's radius
            if (!this._lightGrid || this._lightGrid.length < vw * vh) {
                this._lightGrid = new Float32Array(vw * vh);
            }
            const lightGrid = this._lightGrid;
            lightGrid.fill(0);

            for (const src of lightSources) {
                const localX = src.x - camera.x;
                const localY = src.y - camera.y;
                const r = src.radius;
                const yStart = Math.max(0, localY - r);
                const yEnd = Math.min(vh - 1, localY + r);
                const xStart = Math.max(0, localX - r);
                const xEnd = Math.min(vw - 1, localX + r);
                for (let sy = yStart; sy <= yEnd; sy++) {
                    const rowOff = sy * vw;
                    const dy = Math.abs(sy - localY);
                    for (let sx = xStart; sx <= xEnd; sx++) {
                        const dist = dy + Math.abs(sx - localX);
                        if (dist > r) continue;
                        const falloff = 1 - (dist / (r + 1));
                        const idx = rowOff + sx;
                        if (falloff > lightGrid[idx]) lightGrid[idx] = falloff;
                    }
                }
            }

            let lastDarkStyle = '';
            for (let sy = 0; sy < vh; sy++) {
                const rowOff = sy * vw;
                for (let sx = 0; sx < vw; sx++) {
                    const shade = Math.round((1 - lightGrid[rowOff + sx]) * steps);
                    if (shade < 1) continue;
                    const style = darkStyles[shade - 1];
                    if (style !== lastDarkStyle) {
                        ctx.fillStyle = style;
                        lastDarkStyle = style;
                    }
                    ctx.fillRect(sx * cw, sy * ch, cw, ch);
                }
            }
        }

        if (game.settings.showOverlays) {
            this.overlayRenderer.render(game, cw, ch, game.camera);
        }
    }

    renderFps(fps) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = 'bold 12px monospace';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ff3333';
        ctx.textAlign = 'left';
        ctx.fillText(`${fps} FPS`, 4, 4);
        ctx.restore();
    }

    _getLightSources(game, camera) {
        const sources = [];
        const margin = RENDER_CONFIG.lightSourceMargin;
        const x0 = camera.x - margin;
        const y0 = camera.y - margin;
        const x1 = camera.x + CONFIG.VIEWPORT_WIDTH + margin;
        const y1 = camera.y + CONFIG.VIEWPORT_HEIGHT + margin;

        const allStructures = game.mapIndex ? game.mapIndex.getAllStructurePositions() : [];
        const noPower = game.power && !game.power.powered;

        for (const { x, y, type } of allStructures) {
            if (x < x0 || x > x1 || y < y0 || y > y1) continue;
            const bDef = BUILDINGS[type];
            if (!bDef || !bDef.lightRadius) continue;
            if (bDef.power && bDef.power.consumes && noPower) continue;
            sources.push({ x, y, radius: bDef.lightRadius });
        }

        const firePositions = game.mapIndex ? game.mapIndex.getFirePositions() : null;
        if (firePositions) {
            for (const { x, y } of firePositions) {
                if (x < x0 || x > x1 || y < y0 || y > y1) continue;
                sources.push({ x, y, radius: RENDER_CONFIG.fireLightRadius });
            }
        }

        return sources;
    }
}

function getLinePoints(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let cx = x0, cy = y0;
    while (cx !== x1 || cy !== y1) {
        if (cx !== x0 || cy !== y0) {
            points.push({ x: cx, y: cy });
        }
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; cx += sx; }
        if (e2 < dx) { err += dx; cy += sy; }
    }
    return points;
}
