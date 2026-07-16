import { CONFIG, TILE_CHARS, TILE_COLORS, TERRAIN, RESOURCES } from '../core/config.js';

export function createTile(terrain) {
    return {
        terrain,
        structure: null,
        resource: null,
        designation: null,
        zone: null,
        items: [],
        passable: true,
        roomId: null,
        onFire: false,
        fireTimer: 0,
        snowCovered: false,
    };
}

export function generateMap() {
    const map = [];
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            map[y][x] = createTile('grass');
        }
    }

    scatterDirt(map);
    placeRockFormations(map);
    placeTrees(map);
    placeWater(map);
    placeRiverBanks(map);
    clearStartingArea(map);

    return map;
}

function scatterDirt(map) {
    const count = Math.floor(12 * (CONFIG.MAP_WIDTH * CONFIG.MAP_HEIGHT) / (100 * 80));
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
        const radius = 2 + Math.floor(Math.random() * 4);
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                    if (Math.random() < 0.6) {
                        map[ny][nx].terrain = 'dirt';
                    }
                }
            }
        }
    }
}

function placeRockFormations(map) {
    const count = Math.floor(6 * (CONFIG.MAP_WIDTH * CONFIG.MAP_HEIGHT) / (100 * 80));
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
        const size = 2 + Math.floor(Math.random() * 3);
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                    if (Math.abs(dx) + Math.abs(dy) <= size && Math.random() < 0.7) {
                        map[ny][nx].terrain = 'rock';
                        if (Math.random() < 0.5) {
                            const isRunite = Math.random() < 0.2;
                            map[ny][nx].resource = {
                                type: isRunite ? 'runite_ore' : 'stone',
                                amount: isRunite ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3)
                            };
                        }
                    }
                }
            }
        }
    }
}

function placeTrees(map) {
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            if (map[y][x].terrain === 'grass' && Math.random() < 0.12) {
                map[y][x].resource = { type: 'tree', amount: 3 + Math.floor(Math.random() * 3) };
            }
        }
    }
}

function placeWater(map) {
    let x = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
    let y = 0;
    const targetX = Math.floor(Math.random() * CONFIG.MAP_WIDTH);

    for (; y < CONFIG.MAP_HEIGHT; y++) {
        const width = 2 + Math.floor(Math.random() * 2);
        for (let dx = -width; dx <= width; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < CONFIG.MAP_WIDTH) {
                map[y][nx] = createTile('water');
            }
        }
        x += Math.sign(targetX - x) + Math.floor(Math.random() * 3) - 1;
        x = Math.max(2, Math.min(CONFIG.MAP_WIDTH - 3, x));
    }
}

function placeRiverBanks(map) {
    const waterTiles = new Set();
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            if (map[y][x].terrain === 'water') {
                waterTiles.add(`${x},${y}`);
            }
        }
    }

    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            const tile = map[y][x];
            if (tile.terrain === 'water' || tile.terrain === 'rock') continue;

            let minDist = Infinity;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (waterTiles.has(`${x + dx},${y + dy}`)) {
                        const dist = Math.abs(dx) + Math.abs(dy);
                        if (dist < minDist) minDist = dist;
                    }
                }
            }

            if (minDist === 1 && Math.random() < 0.85) {
                tile.terrain = 'sand';
                tile.resource = null;
            } else if (minDist === 2 && Math.random() < 0.5) {
                tile.terrain = 'gravel';
                tile.resource = null;
            }
        }
    }
}

function clearStartingArea(map) {
    const cx = Math.floor(CONFIG.MAP_WIDTH / 2);
    const cy = Math.floor(CONFIG.MAP_HEIGHT / 2);
    const radius = 6;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                if (Math.abs(dx) + Math.abs(dy) <= radius) {
                    map[ny][nx].terrain = 'grass';
                    map[ny][nx].resource = null;
                    map[ny][nx].passable = true;
                }
            }
        }
    }
}

export function getTileChar(tile, season) {
    if (tile.onFire) return '^';
    if (tile.structure) return TILE_CHARS[tile.structure] || '?';
    if (tile.zone) {
        if (tile.zone.state === 'ready') return TILE_CHARS.farm_ready;
        if (tile.zone.state === 'growing') return TILE_CHARS.farm_growing;
        return TILE_CHARS.farm_empty;
    }
    if (tile.resource) {
        const rDef = RESOURCES[tile.resource.type];
        if (rDef) return rDef.char;
    }
    if (tile.snowCovered && tile.terrain === 'grass') return TILE_CHARS.snow;
    const tDef = TERRAIN[tile.terrain];
    return tDef ? tDef.char : '?';
}

export function getTileColor(tile, season) {
    if (tile.onFire) return '#ff4400';
    if (tile.structure) return TILE_COLORS[tile.structure] || '#fff';
    if (tile.zone) {
        if (tile.zone.state === 'ready') return '#ffdd00';
        if (tile.zone.state === 'growing') return TILE_COLORS.farm_growing;
        return TILE_COLORS.farm_empty;
    }
    if (tile.resource) {
        const rDef = RESOURCES[tile.resource.type];
        if (rDef) {
            if (rDef.autumnColor && season === 'autumn') return rDef.autumnColor;
            return rDef.color;
        }
    }
    if (tile.snowCovered) return TILE_COLORS.snow;
    const tDef = TERRAIN[tile.terrain];
    return tDef ? tDef.color : '#fff';
}

export function getTileBg(tile) {
    const tDef = TERRAIN[tile.terrain];
    return tDef ? tDef.bg || null : null;
}

export const IMPASSABLE_STRUCTURES = new Set(['wall', 'fence', 'mana_crystal', 'arcane_sentinel', 'void_nexus', 'void_wall', 'void_turret']);
const ENEMY_BLOCKED_STRUCTURES = new Set(['wall', 'fence', 'mana_crystal', 'arcane_sentinel', 'void_nexus', 'void_wall', 'void_turret', 'door', 'void_door']);

export function isPassable(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    const tile = map[y][x];
    if (!tile.passable) return false;
    if (IMPASSABLE_STRUCTURES.has(tile.structure)) return false;
    return true;
}

export function getMoveCost(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return Infinity;
    const tDef = TERRAIN[map[y][x].terrain];
    return tDef ? tDef.moveCost : 1;
}

export function isPassableForAnimals(map, x, y) {
    if (!isPassable(map, x, y)) return false;
    const tile = map[y][x];
    const tDef = TERRAIN[tile.terrain];
    if (tDef && !tDef.passable.animal) return false;
    if (tile.structure === 'door' || tile.structure === 'void_door') return false;
    return true;
}

export function isPassableForEnemies(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    const tile = map[y][x];
    if (!tile.passable) return false;
    const tDef = TERRAIN[tile.terrain];
    if (tDef && !tDef.passable.enemy) return false;
    if (ENEMY_BLOCKED_STRUCTURES.has(tile.structure)) return false;
    return true;
}

const BREAKABLE_STRUCTURES = new Set(['wall', 'door', 'fence', 'void_wall', 'void_door']);

export function isBreakableByEnemies(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    return BREAKABLE_STRUCTURES.has(map[y][x].structure);
}
