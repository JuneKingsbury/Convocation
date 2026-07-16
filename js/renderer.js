import { CONFIG, TILE_COLORS } from './config.js';
import { getTileChar, getTileColor } from './map.js';

export class Renderer {
    constructor(preElement) {
        this.pre = preElement;
        this.lastFrame = '';
    }

    render(game) {
        const { map, camera, colonists, wildlife, raiders, tamedAnimals, cursor } = game;
        const selectionRect = game.input.getSelectionRect();
        const parts = [];

        // Build entity position map for O(1) lookup per tile
        // Render order: lower priority first, higher priority overwrites (colonists always on top)
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
            if (c.hp > 0) entityMap.set(c.y * CONFIG.MAP_WIDTH + c.x, { char: '@', color: TILE_COLORS.colonist });
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

        for (let sy = 0; sy < CONFIG.VIEWPORT_HEIGHT; sy++) {
            for (let sx = 0; sx < CONFIG.VIEWPORT_WIDTH; sx++) {
                const wx = camera.x + sx;
                const wy = camera.y + sy;

                if (wx < 0 || wx >= CONFIG.MAP_WIDTH || wy < 0 || wy >= CONFIG.MAP_HEIGHT) {
                    parts.push('<span style="color:#333"> </span>');
                    continue;
                }

                const tile = map[wy][wx];
                let char = getTileChar(tile, game.weather.season);
                let color = getTileColor(tile, game.weather.season);
                let bg = '';

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
                    parts.push(`<span style="color:${color};background:${bg}">${escapeChar(char)}</span>`);
                } else {
                    parts.push(`<span style="color:${color}">${escapeChar(char)}</span>`);
                }
            }
            parts.push('\n');
        }
        const output = parts.join('');

        if (output !== this.lastFrame) {
            this.pre.innerHTML = output;
            this.lastFrame = output;
        }
    }
}

function escapeChar(ch) {
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '&') return '&amp;';
    return ch;
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
