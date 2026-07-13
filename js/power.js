import { CONFIG, POWER_BUILDINGS } from './config.js';
import { manhattanDist } from './pathfinding.js';

export class PowerSystem {
    constructor() {
        this.totalGenerated = 0;
        this.totalConsumed = 0;
        this.powered = true;
        this.heaters = [];
        this.lamps = [];
        this.turrets = [];
    }

    update(game) {
        this.totalGenerated = 0;
        this.totalConsumed = 0;
        this.heaters = [];
        this.lamps = [];
        this.turrets = [];

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
        if (!this.powered || CONFIG.PEACEFUL_MODE) return;

        for (const t of this.turrets) {
            const range = POWER_BUILDINGS.arcane_sentinel.range;
            const damage = POWER_BUILDINGS.arcane_sentinel.damage;

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
            }
        }
    }
}
