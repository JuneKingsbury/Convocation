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
        const entityMap = new Map();
        for (const c of colonists) {
            if (c.hp > 0) entityMap.set(c.y * CONFIG.MAP_WIDTH + c.x, { char: '@', color: TILE_COLORS.colonist });
        }
        for (const r of raiders) {
            if (r.hp > 0) entityMap.set(r.y * CONFIG.MAP_WIDTH + r.x, { char: 'R', color: TILE_COLORS.raider });
        }
        for (const a of wildlife) {
            if (a.hp > 0) entityMap.set(a.y * CONFIG.MAP_WIDTH + a.x, { char: a.char, color: a.color });
        }
        if (tamedAnimals) {
            for (const a of tamedAnimals) {
                if (a.hp > 0) entityMap.set(a.y * CONFIG.MAP_WIDTH + a.x, { char: a.char, color: a.color });
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

                const entity = entityMap.get(wy * CONFIG.MAP_WIDTH + wx);
                if (entity) {
                    char = entity.char;
                    color = entity.color;
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
