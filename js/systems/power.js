import { BUILDINGS, COMBAT_VISUALS } from '../core/config.js';
import { manhattanDist } from '../world/pathfinding.js';

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
        this.poweredLamps = [];
        this.turrets = [];
        this.voidTurrets = [];

        const allStructures = game.mapIndex.getAllStructurePositions();
        for (const { x, y, type } of allStructures) {
            const bDef = BUILDINGS[type];
            if (!bDef) continue;

            if (bDef.power) {
                const pwr = bDef.power;
                if (pwr.generates) this.totalGenerated += pwr.generates;
                if (pwr.consumes) this.totalConsumed += pwr.consumes;

                if (pwr.warmRadius) this.heaters.push({ x, y, radius: pwr.warmRadius });
                else if (pwr.damage && type === 'arcane_sentinel') this.turrets.push({ x, y });
                else if (pwr.damage && type === 'void_turret') this.voidTurrets.push({ x, y });
            }

            if (bDef.lightRadius) {
                if (bDef.power && bDef.power.consumes) {
                    this.poweredLamps.push({ x, y, radius: bDef.lightRadius });
                } else {
                    this.lamps.push({ x, y, radius: bDef.lightRadius });
                }
            }
        }

        this.powered = this.totalGenerated >= this.totalConsumed;
        if (this.powered) {
            this.lamps.push(...this.poweredLamps);
        }
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
            if (manhattanDist(x, y, h.x, h.y) <= h.radius) {
                return true;
            }
        }
        return false;
    }

    isTileLit(game, x, y) {
        for (const l of this.lamps) {
            if (manhattanDist(x, y, l.x, l.y) <= l.radius) {
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
            const pwr = BUILDINGS[t.type].power;
            const range = pwr.range;
            const damage = pwr.damage;

            let target = null;
            if (game.spatial) {
                target = game.spatial.hostiles.findNearest(t.x, t.y, range, null);
            } else {
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
            }

            if (target && manhattanDist(t.x, t.y, target.x, target.y) <= range) {
                target.hp -= damage;
                const color = t.type === 'void_turret' ? COMBAT_VISUALS.shotColorVoid : COMBAT_VISUALS.shotColorArcane;
                this.activeShots.push({ fromX: t.x, fromY: t.y, toX: target.x, toY: target.y, color, ttl: 2 });
            }
        }
    }
}
