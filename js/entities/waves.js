import { CONFIG, WAVE_CONFIG, BUILDINGS } from '../core/config.js';
import { isPassableForEnemies, isBreakableByEnemies } from '../world/map.js';
import { manhattanDist } from '../world/pathfinding.js';
import { colonistTakeDamage } from './colonist.js';

let nextWaveEnemyId = 10000;

export class WaveSystem {
    constructor() {
        this.highestWaveCompleted = 0;
        this.active = false;
        this.currentWave = 0;
        this.nexusPosition = null;
        this.nexusHp = 0;
        this.nexusMaxHp = 0;
        this.enemies = [];
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this.waveStartTick = 0;
        this.portals = [];
    }

    getColonistCap() {
        if (this.highestWaveCompleted === 0) return WAVE_CONFIG.colonistCapBase;
        const bonus = Math.floor(WAVE_CONFIG.colonistCapScale * Math.log2(this.highestWaveCompleted + 1));
        return Math.min(WAVE_CONFIG.colonistCapMax, WAVE_CONFIG.colonistCapBase + bonus);
    }

    canStartWave(game) {
        if (this.active) return false;
        return this.findNexus(game) !== null;
    }

    findNexus(game) {
        if (game.mapIndex) {
            return game.mapIndex.findFirst('void_nexus');
        }
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                if (game.map[y][x].structure === 'void_nexus') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    startWave(game) {
        const nexus = this.findNexus(game);
        if (!nexus || this.active) return false;

        this.active = true;
        this.currentWave = this.highestWaveCompleted + 1;
        this.nexusPosition = nexus;
        this.nexusMaxHp = WAVE_CONFIG.nexusHp + WAVE_CONFIG.nexusHpPerWave * this.currentWave;
        this.nexusHp = this.nexusMaxHp;
        this.enemies = [];
        this.enemiesToSpawn = WAVE_CONFIG.baseEnemies + WAVE_CONFIG.enemiesPerWave * (this.currentWave - 1);
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.waveStartTick = game.tick;
        this.portals = [
            getWaveSpawnPosition(0, nexus),
            getWaveSpawnPosition(1, nexus),
            getWaveSpawnPosition(2, nexus),
            getWaveSpawnPosition(3, nexus),
        ];

        game.notifications.push({ text: `Wave ${this.currentWave} begins! Defend the Void Nexus!`, tick: game.tick, type: 'danger' });
        game.eventLog.add(game, `Wave ${this.currentWave} started — ${this.enemiesToSpawn} enemies incoming!`, 'danger', { type: 'position', ...nexus });

        if (game.settings.autoPauseHostile && !game.paused) {
            game.togglePause();
        }

        return true;
    }

    update(game) {
        if (!this.active) return;

        if (this.enemiesSpawned < this.enemiesToSpawn) {
            this.spawnTimer++;
            if (this.spawnTimer >= WAVE_CONFIG.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy(game);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0) {
                game.resources.add({ void_essence: WAVE_CONFIG.essencePerKill });
                this.enemies.splice(i, 1);
                continue;
            }
            this.updateEnemy(enemy, game);
        }

        if (this.nexusHp <= 0) {
            this.endWave(game, false);
            return;
        }

        if (this.enemiesSpawned >= this.enemiesToSpawn && this.enemies.length === 0) {
            this.endWave(game, true);
        }
    }

    spawnEnemy(game) {
        const portal = this.portals[Math.floor(Math.random() * this.portals.length)];
        const hp = WAVE_CONFIG.baseHp + WAVE_CONFIG.hpPerWave * (this.currentWave - 1);
        const damage = WAVE_CONFIG.baseDamage + WAVE_CONFIG.damagePerWave * (this.currentWave - 1);

        this.enemies.push({
            id: nextWaveEnemyId++,
            x: portal.x, y: portal.y,
            hp, maxHp: hp,
            damage,
            speed: 0.45,
            moveCooldown: 0,
            char: 'E',
            color: '#ff2222',
        });
        this.enemiesSpawned++;
    }

    updateEnemy(enemy, game) {
        enemy.moveCooldown -= enemy.speed;
        if (enemy.moveCooldown > 0) return;
        enemy.moveCooldown = 1;

        const nearbyColonists = game.spatial
            ? game.spatial.colonists.query(enemy.x, enemy.y, 1)
            : game.colonists.filter(c => c.hp > 0 && manhattanDist(enemy.x, enemy.y, c.x, c.y) <= 1);

        for (const c of nearbyColonists) {
            if (c.hp <= 0) continue;
            if (manhattanDist(enemy.x, enemy.y, c.x, c.y) <= 1) {
                colonistTakeDamage(c, enemy.damage, game);
                return;
            }
        }

        for (const c of nearbyColonists) {
            if (c.hp <= 0 || c.state !== 'fighting') continue;
            if (manhattanDist(enemy.x, enemy.y, c.x, c.y) <= 1) return;
        }

        const dist = manhattanDist(enemy.x, enemy.y, this.nexusPosition.x, this.nexusPosition.y);
        if (dist <= 1) {
            this.nexusHp -= enemy.damage;
            game.combatEffects.push({ x: this.nexusPosition.x, y: this.nexusPosition.y, char: '!', color: '#9933ff', ttl: 2 });
            return;
        }

        if (!enemy.path || enemy.path.length === 0 || enemy.pathAge > 20) {
            enemy.path = findEnemyPath(game.map, enemy.x, enemy.y, this.nexusPosition.x, this.nexusPosition.y);
            enemy.pathAge = 0;
        }

        if (enemy.path && enemy.path.length > 0) {
            const next = enemy.path[0];
            if (isBreakableByEnemies(game.map, next.x, next.y)) {
                attackStructure(game, next.x, next.y, enemy.damage);
                enemy.pathAge++;
                return;
            }
            if (isPassableForEnemies(game.map, next.x, next.y)) {
                enemy.x = next.x;
                enemy.y = next.y;
                enemy.path.shift();
                enemy.pathAge++;
            } else {
                enemy.path = null;
            }
        } else {
            moveTowardDirect(enemy, this.nexusPosition, game.map);
        }
    }

    getPathPreview(game) {
        if (!this.active || !this.nexusPosition) return [];
        if (this._pathPreviewCache && this._pathPreviewAge < 30) {
            this._pathPreviewAge++;
            return this._pathPreviewCache;
        }
        const allPoints = [];
        for (const p of this.portals) {
            const path = findEnemyPath(game.map, p.x, p.y, this.nexusPosition.x, this.nexusPosition.y);
            if (path) {
                for (const pt of path) allPoints.push(pt);
            }
        }
        this._pathPreviewCache = allPoints;
        this._pathPreviewAge = 0;
        return allPoints;
    }

    invalidatePathPreview() {
        this._pathPreviewCache = null;
    }

    endWave(game, victory) {
        if (victory) {
            this.highestWaveCompleted = this.currentWave;
            const bonusEssence = this.currentWave * 2;
            game.resources.add({ void_essence: bonusEssence });
            game.notifications.push({ text: `Wave ${this.currentWave} complete! +${bonusEssence} bonus void essence. Colony cap: ${this.getColonistCap()}`, tick: game.tick, type: 'success' });
            game.eventLog.add(game, `Wave ${this.currentWave} defeated! Colony can now support ${this.getColonistCap()} colonists.`, 'success', null);
        } else {
            game.notifications.push({ text: `Wave ${this.currentWave} failed — the Void Nexus was destroyed!`, tick: game.tick, type: 'danger' });
            game.eventLog.add(game, `The Void Nexus was destroyed during wave ${this.currentWave}!`, 'danger', { type: 'position', ...this.nexusPosition });
            const tile = game.map[this.nexusPosition.y][this.nexusPosition.x];
            tile.structure = null;
            tile.passable = true;
            if (game.mapIndex) game.mapIndex.removeStructure(this.nexusPosition.x, this.nexusPosition.y, 'void_nexus');
            game.roomsDirty = true;
        }

        this.active = false;
        this.enemies = [];
        this.portals = [];
    }
}

function moveTowardDirect(entity, target, map) {
    const dx = Math.sign(target.x - entity.x);
    const dy = Math.sign(target.y - entity.y);
    if (Math.random() < 0.5 && dx !== 0) {
        const nx = entity.x + dx;
        if (isPassableForEnemies(map, nx, entity.y)) { entity.x = nx; return; }
    }
    if (dy !== 0) {
        const ny = entity.y + dy;
        if (isPassableForEnemies(map, entity.x, ny)) { entity.y = ny; return; }
    }
    if (dx !== 0) {
        const nx = entity.x + dx;
        if (isPassableForEnemies(map, nx, entity.y)) { entity.x = nx; }
    }
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ENEMY_MAX_NODES = 2000;

class EnemyHeap {
    constructor() { this.data = []; }
    push(node) { this.data.push(node); this._up(this.data.length - 1); }
    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) { this.data[0] = last; this._down(0); }
        return top;
    }
    get length() { return this.data.length; }
    _up(i) {
        const node = this.data[i];
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.data[p].f <= node.f) break;
            this.data[i] = this.data[p];
            i = p;
        }
        this.data[i] = node;
    }
    _down(i) {
        const len = this.data.length;
        const node = this.data[i];
        while (true) {
            let s = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < len && this.data[l].f < this.data[s].f) s = l;
            if (r < len && this.data[r].f < this.data[s].f) s = r;
            if (s === i) break;
            this.data[i] = this.data[s];
            this.data[s] = node;
            i = s;
        }
    }
}

function getBreakCost(map, x, y) {
    const tile = map[y][x];
    const hp = tile.structureHp !== undefined ? tile.structureHp : (BUILDINGS[tile.structure]?.hp || 50);
    return Math.max(2, Math.ceil(hp / 5));
}

function findEnemyPath(map, startX, startY, endX, endY) {
    const open = new EnemyHeap();
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    const key = (x, y) => (y << 16) | x;
    const start = key(startX, startY);

    gScore.set(start, 0);
    open.push({ x: startX, y: startY, f: manhattanDist(startX, startY, endX, endY) });

    let iterations = 0;
    while (open.length > 0 && iterations < ENEMY_MAX_NODES) {
        iterations++;
        const current = open.pop();
        const currentKey = key(current.x, current.y);

        if (closed.has(currentKey)) continue;

        if (manhattanDist(current.x, current.y, endX, endY) <= 1) {
            const path = [];
            let ck = currentKey;
            while (ck !== start) {
                path.push({ x: ck & 0xFFFF, y: ck >> 16 });
                const prev = cameFrom.get(ck);
                if (prev === undefined) break;
                ck = prev;
            }
            path.reverse();
            return path;
        }

        closed.add(currentKey);

        for (const [dx, dy] of DIRS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) continue;
            const nKey = key(nx, ny);
            if (closed.has(nKey)) continue;

            let cost = 1;
            if (isBreakableByEnemies(map, nx, ny)) {
                cost = getBreakCost(map, nx, ny);
            } else if (!isPassableForEnemies(map, nx, ny)) {
                continue;
            }

            const tentativeG = gScore.get(currentKey) + cost;
            if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
                cameFrom.set(nKey, currentKey);
                gScore.set(nKey, tentativeG);
                const f = tentativeG + manhattanDist(nx, ny, endX, endY);
                open.push({ x: nx, y: ny, f });
            }
        }
    }

    return null;
}

function attackStructure(game, x, y, damage) {
    const tile = game.map[y][x];
    if (!tile.structure) return;

    if (tile.structureHp === undefined) {
        tile.structureHp = BUILDINGS[tile.structure]?.hp || 50;
    }

    tile.structureHp -= damage;
    game.combatEffects.push({ x, y, char: '!', color: '#ff8800', ttl: 2 });

    if (tile.structureHp <= 0) {
        const oldStructure = tile.structure;
        tile.structure = null;
        tile.structureHp = undefined;
        tile.passable = true;
        if (game.mapIndex) game.mapIndex.removeStructure(x, y, oldStructure);
        game.roomsDirty = true;
        for (const enemy of game.waves.enemies) {
            enemy.path = null;
        }
        game.waves.invalidatePathPreview();
    }
}

function getWaveSpawnPosition(side, nexus) {
    const offset = Math.floor(Math.random() * 10) - 5;
    switch (side) {
        case 0: return { x: Math.max(0, Math.min(CONFIG.MAP_WIDTH - 1, nexus.x + offset)), y: Math.max(0, nexus.y - 25) };
        case 1: return { x: Math.min(CONFIG.MAP_WIDTH - 1, nexus.x + 50), y: Math.max(0, Math.min(CONFIG.MAP_HEIGHT - 1, nexus.y + offset)) };
        case 2: return { x: Math.max(0, Math.min(CONFIG.MAP_WIDTH - 1, nexus.x + offset)), y: Math.min(CONFIG.MAP_HEIGHT - 1, nexus.y + 25) };
        case 3: return { x: Math.max(0, nexus.x - 50), y: Math.max(0, Math.min(CONFIG.MAP_HEIGHT - 1, nexus.y + offset)) };
    }
}
