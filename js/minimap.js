import { CONFIG, TILE_COLORS } from './config.js';

const SCALE = 2;

export class Minimap {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.ctx = canvas.getContext('2d');

        canvas.width = CONFIG.MAP_WIDTH * SCALE;
        canvas.height = CONFIG.MAP_HEIGHT * SCALE;
        canvas.style.height = `${CONFIG.MAP_HEIGHT * SCALE}px`;
        canvas.style.maxHeight = '100%';
        canvas.style.width = 'auto';

        canvas.addEventListener('mousedown', (e) => { e.stopPropagation(); this.onClick(e); });
        canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) { e.stopPropagation(); this.onClick(e); }
        });
    }

    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / SCALE);
        const y = Math.floor((e.clientY - rect.top) / SCALE);
        this.game.camera.centerOn(x, y);
    }

    render() {
        const { map, colonists, wildlife, raiders, tamedAnimals, camera, weather } = this.game;
        const ctx = this.ctx;
        const imageData = ctx.createImageData(CONFIG.MAP_WIDTH * SCALE, CONFIG.MAP_HEIGHT * SCALE);
        const data = imageData.data;

        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                const tile = map[y][x];
                const color = this.getTileColor(tile, weather.season);

                for (let dy = 0; dy < SCALE; dy++) {
                    for (let dx = 0; dx < SCALE; dx++) {
                        const px = (x * SCALE + dx);
                        const py = (y * SCALE + dy);
                        const idx = (py * CONFIG.MAP_WIDTH * SCALE + px) * 4;
                        data[idx] = color[0];
                        data[idx + 1] = color[1];
                        data[idx + 2] = color[2];
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        for (const c of colonists) {
            if (c.hp <= 0) continue;
            this.drawDot(data, c.x, c.y, [255, 255, 0]);
        }
        for (const a of wildlife) {
            if (a.hp <= 0) continue;
            this.drawDot(data, a.x, a.y, a.hostile ? [180, 50, 50] : [150, 120, 80]);
        }
        for (const r of raiders) {
            if (r.hp <= 0) continue;
            this.drawDot(data, r.x, r.y, [255, 50, 50]);
        }
        for (const a of tamedAnimals) {
            this.drawDot(data, a.x, a.y, [100, 200, 100]);
        }

        ctx.putImageData(imageData, 0, 0);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            camera.x * SCALE + 0.5,
            camera.y * SCALE + 0.5,
            CONFIG.VIEWPORT_WIDTH * SCALE - 1,
            CONFIG.VIEWPORT_HEIGHT * SCALE - 1
        );
    }

    drawDot(data, x, y, color) {
        for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
                const px = x * SCALE + dx;
                const py = y * SCALE + dy;
                if (px < 0 || px >= CONFIG.MAP_WIDTH * SCALE || py < 0 || py >= CONFIG.MAP_HEIGHT * SCALE) continue;
                const idx = (py * CONFIG.MAP_WIDTH * SCALE + px) * 4;
                data[idx] = color[0];
                data[idx + 1] = color[1];
                data[idx + 2] = color[2];
                data[idx + 3] = 255;
            }
        }
    }

    getTileColor(tile, season) {
        if (tile.onFire) return [255, 68, 0];
        if (tile.structure === 'wall') return [180, 180, 180];
        if (tile.structure === 'floor') return [80, 80, 80];
        if (tile.structure === 'door') return [150, 120, 60];
        if (tile.structure) return [120, 100, 60];
        if (tile.zone) {
            if (tile.zone.state === 'ready') return [220, 200, 0];
            if (tile.zone.state === 'growing') return [60, 150, 30];
            return [80, 60, 0];
        }
        if (tile.resource) {
            if (tile.resource.type === 'tree') return season === 'autumn' ? [180, 120, 30] : [30, 100, 30];
            return [130, 130, 130];
        }
        if (tile.snowCovered) return [200, 200, 210];
        switch (tile.terrain) {
            case 'grass': return [50, 100, 40];
            case 'dirt': return [120, 80, 40];
            case 'rock': return [80, 80, 80];
            case 'water': return [40, 80, 180];
            default: return [30, 30, 30];
        }
    }
}
