import { CONFIG, TILE_CHARS, TILE_COLORS } from './config.js';

export function createTile(terrain) {
    return {
        terrain,
        structure: null,
        resource: null,
        designation: null,
        zone: null,
        items: [],
        passable: terrain !== 'rock',
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
                        map[ny][nx].passable = false;
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
        if (tile.resource.type === 'tree') return TILE_CHARS.tree;
        if (tile.resource.type === 'stone') return TILE_CHARS.stone_resource;
        if (tile.resource.type === 'runite_ore') return TILE_CHARS.stone_resource;
    }
    if (tile.snowCovered && tile.terrain === 'grass') return TILE_CHARS.snow;
    return TILE_CHARS[tile.terrain] || '?';
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
        if (tile.resource.type === 'tree') {
            return season === 'autumn' ? TILE_COLORS.tree_autumn : TILE_COLORS.tree;
        }
        if (tile.resource.type === 'runite_ore') return TILE_COLORS.runite_ore;
        return TILE_COLORS.stone_resource;
    }
    if (tile.snowCovered) return TILE_COLORS.snow;
    return TILE_COLORS[tile.terrain] || '#fff';
}

const IMPASSABLE_STRUCTURES = new Set(['wall', 'fence', 'mana_crystal', 'arcane_sentinel', 'void_nexus', 'void_wall', 'void_turret']);

export function isPassable(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    const tile = map[y][x];
    if (!tile.passable) return false;
    if (IMPASSABLE_STRUCTURES.has(tile.structure)) return false;
    return true;
}

export function getMoveCost(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return Infinity;
    return map[y][x].terrain === 'water' ? 3 : 1;
}

export function isPassableForAnimals(map, x, y) {
    if (!isPassable(map, x, y)) return false;
    const tile = map[y][x];
    if (tile.structure === 'door') return false;
    return true;
}
