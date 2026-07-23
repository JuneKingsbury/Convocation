import { CONFIG, TILE_CHARS, TILE_COLORS, TERRAIN, RESOURCES, BUILDINGS, IMPASSABLE_STRUCTURES, ENEMY_BLOCKED_STRUCTURES, BREAKABLE_STRUCTURES, MAP_GENERATORS } from '../core/config.js';

export function createTile(terrain) {
    return {
        terrain,
        structure: null,
        floor: null,
        resource: null,
        designation: null,
        zone: null,
        items: [],
        passable: TERRAIN[terrain] ? TERRAIN[terrain].passable.colonist : true,
        roomId: null,
        onFire: false,
        fireTimer: 0,
        snowCovered: false,
    };
}

// --- Generator registry: add new generator functions here ---
const GENERATOR_FUNCTIONS = {
    dirt_patches: generateDirtPatches,
    rock_formations: generateRockFormations,
    mountain_ranges: generateMountainRanges,
    trees: generateTrees,
    river: generateRiver,
    ruins: generateRuins,
};

export function generateMap() {
    const map = [];
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            map[y][x] = createTile('grass');
        }
    }

    for (const gen of MAP_GENERATORS) {
        if (!gen.enabled) continue;
        const fn = GENERATOR_FUNCTIONS[gen.name];
        if (fn) fn(map, gen.params);
    }

    clearStartingArea(map);
    return map;
}

// --- Generator implementations ---

function generateDirtPatches(map, params) {
    const scale = (CONFIG.MAP_WIDTH * CONFIG.MAP_HEIGHT) / (100 * 80);
    const count = Math.floor(params.count * scale);
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
        const radius = params.radiusRange[0] + Math.floor(Math.random() * (params.radiusRange[1] - params.radiusRange[0] + 1));
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                    if (Math.random() < params.fillChance) {
                        map[ny][nx].terrain = 'dirt';
                    }
                }
            }
        }
    }
}

function generateRockFormations(map, params) {
    const scale = (CONFIG.MAP_WIDTH * CONFIG.MAP_HEIGHT) / (100 * 80);
    const count = Math.floor(params.count * scale);
    for (let i = 0; i < count; i++) {
        const cx = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
        const cy = Math.floor(Math.random() * CONFIG.MAP_HEIGHT);
        const size = params.sizeRange[0] + Math.floor(Math.random() * (params.sizeRange[1] - params.sizeRange[0] + 1));
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < CONFIG.MAP_WIDTH && ny >= 0 && ny < CONFIG.MAP_HEIGHT) {
                    if (Math.abs(dx) + Math.abs(dy) <= size && Math.random() < params.fillChance) {
                        map[ny][nx].terrain = 'rock';
                        map[ny][nx].passable = TERRAIN.rock.passable.colonist;
                        if (Math.random() < params.resourceChance) {
                            const isRunite = Math.random() < params.runiteChance;
                            map[ny][nx].resource = {
                                type: isRunite ? 'runite_ore' : 'stone',
                                amount: isRunite
                                    ? params.runiteAmount[0] + Math.floor(Math.random() * (params.runiteAmount[1] - params.runiteAmount[0] + 1))
                                    : params.stoneAmount[0] + Math.floor(Math.random() * (params.stoneAmount[1] - params.stoneAmount[0] + 1))
                            };
                        }
                    }
                }
            }
        }
    }
}

function generateMountainRanges(map, params) {
    if (Math.random() > params.chance) return;

    const length = params.lengthRange[0] + Math.floor(Math.random() * (params.lengthRange[1] - params.lengthRange[0] + 1));
    const width = params.widthRange[0] + Math.floor(Math.random() * (params.widthRange[1] - params.widthRange[0] + 1));

    // Pick a random start point away from center
    const margin = 20;
    let sx = margin + Math.floor(Math.random() * (CONFIG.MAP_WIDTH - 2 * margin));
    let sy = margin + Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - 2 * margin));

    // Random direction for the spine
    const angle = Math.random() * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    for (let step = 0; step < length; step++) {
        const cx = Math.round(sx + dirX * step + (Math.random() - 0.5) * 2);
        const cy = Math.round(sy + dirY * step + (Math.random() - 0.5) * 2);

        for (let dy = -width; dy <= width; dy++) {
            for (let dx = -width; dx <= width; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > width) continue;

                const centerFactor = 1 - (dist / width);
                const isTallRock = centerFactor > 0.5 && Math.random() < params.tallRockChance;
                const terrain = isTallRock ? 'tall_rock' : 'rock';

                map[ny][nx].terrain = terrain;
                map[ny][nx].passable = TERRAIN[terrain].passable.colonist;
                map[ny][nx].resource = null;

                if (!isTallRock && Math.random() < params.resourceChance) {
                    const isRunite = Math.random() < params.runiteChance;
                    map[ny][nx].resource = {
                        type: isRunite ? 'runite_ore' : 'stone',
                        amount: isRunite
                            ? params.runiteAmount[0] + Math.floor(Math.random() * (params.runiteAmount[1] - params.runiteAmount[0] + 1))
                            : params.stoneAmount[0] + Math.floor(Math.random() * (params.stoneAmount[1] - params.stoneAmount[0] + 1))
                    };
                }
            }
        }
    }
}

function generateTrees(map, params) {
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            if (map[y][x].terrain === 'grass' && Math.random() < params.density) {
                map[y][x].resource = {
                    type: 'tree',
                    amount: params.amountRange[0] + Math.floor(Math.random() * (params.amountRange[1] - params.amountRange[0] + 1))
                };
            }
        }
    }
}

function generateRiver(map, params) {
    let x = Math.floor(Math.random() * CONFIG.MAP_WIDTH);
    let y = 0;
    const targetX = Math.floor(Math.random() * CONFIG.MAP_WIDTH);

    for (; y < CONFIG.MAP_HEIGHT; y++) {
        const width = params.widthRange[0] + Math.floor(Math.random() * (params.widthRange[1] - params.widthRange[0] + 1));
        for (let dx = -width; dx <= width; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < CONFIG.MAP_WIDTH) {
                map[y][nx] = createTile('water');
            }
        }
        x += Math.sign(targetX - x) + Math.floor(Math.random() * 3) - 1;
        x = Math.max(2, Math.min(CONFIG.MAP_WIDTH - 3, x));
    }

    // River banks
    const waterTiles = new Set();
    for (let wy = 0; wy < CONFIG.MAP_HEIGHT; wy++) {
        for (let wx = 0; wx < CONFIG.MAP_WIDTH; wx++) {
            if (map[wy][wx].terrain === 'water') waterTiles.add((wy << 16) | wx);
        }
    }

    for (let by = 0; by < CONFIG.MAP_HEIGHT; by++) {
        for (let bx = 0; bx < CONFIG.MAP_WIDTH; bx++) {
            const tile = map[by][bx];
            if (tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'tall_rock') continue;

            let minDist = Infinity;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (waterTiles.has(((by + dy) << 16) | (bx + dx))) {
                        const dist = Math.abs(dx) + Math.abs(dy);
                        if (dist < minDist) minDist = dist;
                    }
                }
            }

            if (minDist === 1 && Math.random() < params.bankChance) {
                tile.terrain = 'sand';
                tile.resource = null;
            } else if (minDist === 2 && Math.random() < params.gravelChance) {
                tile.terrain = 'gravel';
                tile.resource = null;
            }
        }
    }
}

function generateRuins(map, params) {
    const count = params.count || 1;
    for (let i = 0; i < count; i++) {
        if (Math.random() > (params.chance ?? 1.0)) continue;

        const margin = params.margin || 30;
        const cx = margin + Math.floor(Math.random() * (CONFIG.MAP_WIDTH - 2 * margin));
        const cy = margin + Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - 2 * margin));

        // Pick a blueprint
        const blueprint = params.blueprints[Math.floor(Math.random() * params.blueprints.length)];
        const decayChance = params.decayChance ?? 0.33;
        const floorDecayChance = params.floorDecayChance ?? 0.15;

        // Place floor terrain under the whole footprint first
        if (blueprint.floorTerrain) {
            for (let dy = 0; dy < blueprint.height; dy++) {
                for (let dx = 0; dx < blueprint.width; dx++) {
                    const wx = cx + dx, wy = cy + dy;
                    if (wx < 0 || wx >= CONFIG.MAP_WIDTH || wy < 0 || wy >= CONFIG.MAP_HEIGHT) continue;
                    const tile = map[wy][wx];
                    if (tile.terrain === 'water') continue;
                    tile.terrain = blueprint.floorTerrain;
                    tile.resource = null;
                }
            }
        }

        // Place structures from the layout
        for (const piece of blueprint.layout) {
            const wx = cx + piece.x, wy = cy + piece.y;
            if (wx < 0 || wx >= CONFIG.MAP_WIDTH || wy < 0 || wy >= CONFIG.MAP_HEIGHT) continue;
            const tile = map[wy][wx];
            if (tile.terrain === 'water') continue;

            const isFloor = BUILDINGS[piece.type] && BUILDINGS[piece.type].structureType === 'floor';
            const decay = isFloor ? floorDecayChance : decayChance;
            if (Math.random() < decay) continue;

            if (isFloor) {
                tile.floor = piece.type;
            } else {
                tile.structure = piece.type;
                tile.passable = !(IMPASSABLE_STRUCTURES.has(piece.type));
                if (BUILDINGS[piece.type] && BUILDINGS[piece.type].hp) {
                    tile.structureHp = BUILDINGS[piece.type].hp;
                }
            }
            tile.resource = null;
        }
    }
}

// --- Always runs last to ensure spawn area is clear ---
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
                    map[ny][nx].structure = null;
                    map[ny][nx].passable = true;
                }
            }
        }
    }
}

// --- Tile query functions ---

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
    if (tile.floor) return TILE_CHARS[tile.floor] || '·';
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
    if (tile.floor) return TILE_COLORS[tile.floor] || '#888';
    if (tile.snowCovered) return TILE_COLORS.snow;
    const tDef = TERRAIN[tile.terrain];
    return tDef ? tDef.color : '#fff';
}

export function getTileBg(tile) {
    if (tile.structure) {
        const bDef = BUILDINGS[tile.structure];
        if (bDef && bDef.bg) return bDef.bg;
    }
    if (tile.floor) {
        const fDef = BUILDINGS[tile.floor];
        if (fDef && fDef.bg) return fDef.bg;
    }
    if (tile.snowCovered && tile.terrain === 'grass') return TILE_COLORS.snowBg;
    const tDef = TERRAIN[tile.terrain];
    return tDef ? tDef.bg || null : null;
}


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
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    const tile = map[y][x];
    if (!tile.passable) return false;
    const tDef = TERRAIN[tile.terrain];
    if (tDef && !tDef.passable.animal) return false;
    if (tile.structure) {
        const bDef = BUILDINGS[tile.structure];
        if (bDef && bDef.passable && !bDef.passable.animal) return false;
    }
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

export function isBreakableByEnemies(map, x, y) {
    if (x < 0 || x >= CONFIG.MAP_WIDTH || y < 0 || y >= CONFIG.MAP_HEIGHT) return false;
    return BREAKABLE_STRUCTURES.has(map[y][x].structure);
}
