import { CONFIG, WAVE_CONFIG } from './config.js';
import { isPassable } from './map.js';
import { manhattanDist } from './pathfinding.js';
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

        for (const c of game.colonists) {
            if (c.hp <= 0) continue;
            if (manhattanDist(enemy.x, enemy.y, c.x, c.y) <= 1) {
                colonistTakeDamage(c, enemy.damage, game);
                return;
            }
        }

        // Pinned: a colonist in fighting state is adjacent — stay and fight
        for (const c of game.colonists) {
            if (c.hp <= 0 || c.state !== 'fighting') continue;
            if (manhattanDist(enemy.x, enemy.y, c.x, c.y) <= 1) return;
        }

        const dist = manhattanDist(enemy.x, enemy.y, this.nexusPosition.x, this.nexusPosition.y);
        if (dist <= 1) {
            this.nexusHp -= enemy.damage;
            game.combatEffects.push({ x: this.nexusPosition.x, y: this.nexusPosition.y, char: '!', color: '#9933ff', ttl: 2 });
            return;
        }

        moveToward(enemy, this.nexusPosition, game.map);
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
            game.roomsDirty = true;
        }

        this.active = false;
        this.enemies = [];
        this.portals = [];
    }
}

function moveToward(entity, target, map) {
    const dx = Math.sign(target.x - entity.x);
    const dy = Math.sign(target.y - entity.y);
    if (Math.random() < 0.5 && dx !== 0) {
        const nx = entity.x + dx;
        if (isPassable(map, nx, entity.y)) { entity.x = nx; return; }
    }
    if (dy !== 0) {
        const ny = entity.y + dy;
        if (isPassable(map, entity.x, ny)) { entity.y = ny; return; }
    }
    if (dx !== 0) {
        const nx = entity.x + dx;
        if (isPassable(map, nx, entity.y)) { entity.x = nx; }
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
