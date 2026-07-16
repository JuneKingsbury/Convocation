import { CONFIG, TILE_COLORS } from '../core/config.js';
import { getTileChar, getTileColor, getTileBg } from '../world/map.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.canvas.style.display = 'block';
        container.innerHTML = '';
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        this.charWidth = 0;
        this.charHeight = 0;
        this.fontSize = 14;
        this._lastViewportW = 0;
        this._lastViewportH = 0;
        this.measureFont(14);
    }

    measureFont(fontSize) {
        this.fontSize = fontSize;
        this.ctx.font = `${fontSize}px 'Courier New', monospace`;
        const metrics = this.ctx.measureText('M');
        this._textWidth = Math.ceil(metrics.width);
        this.charHeight = Math.ceil(fontSize * 1.15);
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
        this._lastViewportW = CONFIG.VIEWPORT_WIDTH;
        this._lastViewportH = CONFIG.VIEWPORT_HEIGHT;
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

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const entityMap = new Map();
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
        for (const c of colonists) {
            if (c.hp > 0) entityMap.set(c.y * CONFIG.MAP_WIDTH + c.x, { char: '@', color: c.nameColor || TILE_COLORS.colonist });
        }

        const portalMap = new Map();
        const portalPathMap = new Map();
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

        const shotMap = new Map();
        if (game.power && game.power.activeShots) {
            for (const shot of game.power.activeShots) {
                const points = getLinePoints(shot.fromX, shot.fromY, shot.toX, shot.toY);
                for (const p of points) {
                    shotMap.set(p.y * CONFIG.MAP_WIDTH + p.x, shot.color);
                }
            }
        }

        const effectMap = new Map();
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

                const tileKey = wy * CONFIG.MAP_WIDTH + wx;

                if (portalMap.has(tileKey)) {
                    char = 'Ø';
                    color = '#ff55ff';
                    bg = '#440044';
                } else if (portalPathMap.has(tileKey)) {
                    color = '#663388';
                    bg = '#1a001a';
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

                const inSelection = selectionRect &&
                    wx >= selectionRect.x1 && wx <= selectionRect.x2 &&
                    wy >= selectionRect.y1 && wy <= selectionRect.y2;

                if (inSelection) {
                    bg = game.input.mode === 'zone' ? '#2a3a2a' : '#3a2a2a';
                } else if (cursor && cursor.x === wx && cursor.y === wy) {
                    bg = '#444';
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
