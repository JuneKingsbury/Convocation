import { CONFIG } from '../core/config.js';

export function detectRooms(map) {
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            map[y][x].roomId = null;
        }
    }

    let roomId = 0;
    const visited = new Set();

    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            const tile = map[y][x];
            if (isWall(tile)) continue;
            if (tile.terrain === 'water' || tile.terrain === 'rock') continue;
            if (!tile.passable) continue;

            const result = floodFill(map, x, y, visited);
            if (result.enclosed && result.tiles.length <= 100) {
                for (const pos of result.tiles) {
                    map[pos.y][pos.x].roomId = roomId;
                }
                roomId++;
            }
        }
    }

    return roomId;
}

function floodFill(map, startX, startY, visited) {
    const tiles = [];
    const queue = [{ x: startX, y: startY }];
    let enclosed = true;
    const localVisited = new Set();

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;
        if (localVisited.has(key)) continue;
        localVisited.add(key);
        visited.add(key);

        if (x <= 0 || x >= CONFIG.MAP_WIDTH - 1 || y <= 0 || y >= CONFIG.MAP_HEIGHT - 1) {
            enclosed = false;
            continue;
        }

        const tile = map[y][x];
        tiles.push({ x, y });

        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            const nKey = `${nx},${ny}`;
            if (localVisited.has(nKey)) continue;
            if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) {
                enclosed = false;
                continue;
            }
            const neighbor = map[ny][nx];
            if (isWall(neighbor)) continue;
            if (neighbor.structure === 'door') {
                localVisited.add(nKey);
                visited.add(nKey);
                tiles.push({ x: nx, y: ny });
                continue;
            }
            if (neighbor.terrain === 'water') continue;
            if (neighbor.terrain === 'rock') {
                enclosed = false;
                continue;
            }
            queue.push({ x: nx, y: ny });
        }
    }

    return { enclosed, tiles };
}

function isWall(tile) {
    return tile.structure === 'wall' || tile.structure === 'fence';
}

export function getRoomContents(map, roomId) {
    const contents = { beds: [], stations: [], size: 0 };
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            if (map[y][x].roomId !== roomId) continue;
            contents.size++;
            if (map[y][x].structure === 'bed') contents.beds.push({ x, y });
            if (map[y][x].structure === 'workbench') contents.stations.push({ x, y, type: 'workbench' });
            if (map[y][x].structure === 'cauldron') contents.stations.push({ x, y, type: 'cauldron' });
        }
    }
    return contents;
}
