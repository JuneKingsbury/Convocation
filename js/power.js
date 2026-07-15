import { POWER_BUILDINGS } from './config.js';
import { manhattanDist } from './pathfinding.js';

export class PowerSystem {
    constructor() {
        this.totalGenerated = 0;
        this.totalConsumed = 0;
        this.powered = true;
        this.heaters = [];
        this.lamps = [];
        this.turrets = [];
        this.voidTurrets = [];
        this.activeShots = [];
    }

    update(game) {
        this.totalGenerated = 0;
        this.totalConsumed = 0;
        this.heaters = [];
        this.lamps = [];
        this.turrets = [];
        this.voidTurrets = [];

        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                const structure = game.map[y][x].structure;
                if (!structure) continue;
                const def = POWER_BUILDINGS[structure];
                if (!def) continue;

                if (def.generates) this.totalGenerated += def.generates;
                if (def.consumes) this.totalConsumed += def.consumes;

                if (structure === 'ember_ward') this.heaters.push({ x, y });
                else if (structure === 'glowstone') this.lamps.push({ x, y });
                else if (structure === 'arcane_sentinel') this.turrets.push({ x, y });
                else if (structure === 'void_turret') this.voidTurrets.push({ x, y });
            }
        }

        this.powered = this.totalGenerated >= this.totalConsumed;
    }

    hasPower() {
        return this.powered;
    }

    getNetPower() {
        return this.totalGenerated - this.totalConsumed;
    }

    isTileWarmed(game, x, y) {
        if (!this.powered) return false;
        for (const h of this.heaters) {
            if (manhattanDist(x, y, h.x, h.y) <= POWER_BUILDINGS.ember_ward.warmRadius) {
                return true;
            }
        }
        return false;
    }

    isTileLit(game, x, y) {
        if (!this.powered) return false;
        for (const l of this.lamps) {
            if (manhattanDist(x, y, l.x, l.y) <= POWER_BUILDINGS.glowstone.radius) {
                return true;
            }
        }
        return false;
    }

    updateTurrets(game) {
        if (!this.powered) return;

        this.activeShots = this.activeShots.filter(s => s.ttl > 0);
        for (const s of this.activeShots) s.ttl--;

        const allTurrets = [
            ...this.turrets.map(t => ({ ...t, type: 'arcane_sentinel' })),
            ...this.voidTurrets.map(t => ({ ...t, type: 'void_turret' })),
        ];

        for (const t of allTurrets) {
            const def = POWER_BUILDINGS[t.type];
            const range = def.range;
            const damage = def.damage;

            let target = null;
            let bestDist = Infinity;
            for (const r of game.raiders) {
                if (r.hp <= 0) continue;
                const d = manhattanDist(t.x, t.y, r.x, r.y);
                if (d <= range && d < bestDist) {
                    bestDist = d;
                    target = r;
                }
            }
            if (!target && game.waves) {
                for (const e of game.waves.enemies) {
                    if (e.hp <= 0) continue;
                    const d = manhattanDist(t.x, t.y, e.x, e.y);
                    if (d <= range && d < bestDist) {
                        bestDist = d;
                        target = e;
                    }
                }
            }
            if (!target) {
                for (const w of game.wildlife) {
                    if (w.hp <= 0 || !w.hostile) continue;
                    const d = manhattanDist(t.x, t.y, w.x, w.y);
                    if (d <= range && d < bestDist) {
                        bestDist = d;
                        target = w;
                    }
                }
            }
            if (target) {
                target.hp -= damage;
                const color = t.type === 'void_turret' ? '#cc00ff' : '#ff4444';
                this.activeShots.push({ fromX: t.x, fromY: t.y, toX: target.x, toY: target.y, color, ttl: 2 });
            }
        }
    }
}
