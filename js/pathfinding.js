import { isPassable, getMoveCost } from './map.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const MAX_NODES = 1500;

export function findPath(map, startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];
    if (!isPassable(map, endX, endY)) return null;

    const open = [];
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (x, y) => `${x},${y}`;
    const start = key(startX, startY);
    const end = key(endX, endY);

    gScore.set(start, 0);
    fScore.set(start, heuristic(startX, startY, endX, endY));
    open.push({ x: startX, y: startY, f: fScore.get(start) });

    let iterations = 0;
    while (open.length > 0 && iterations < MAX_NODES) {
        iterations++;
        open.sort((a, b) => a.f - b.f);
        const current = open.shift();
        const currentKey = key(current.x, current.y);

        if (currentKey === end) {
            return reconstructPath(cameFrom, current.x, current.y, startX, startY);
        }

        closed.add(currentKey);

        for (const [dx, dy] of DIRS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const nKey = key(nx, ny);

            if (closed.has(nKey)) continue;
            if (!isPassable(map, nx, ny)) continue;

            const tentativeG = gScore.get(currentKey) + getMoveCost(map, nx, ny);
            if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
                cameFrom.set(nKey, { x: current.x, y: current.y });
                gScore.set(nKey, tentativeG);
                const f = tentativeG + heuristic(nx, ny, endX, endY);
                fScore.set(nKey, f);
                if (!open.some(n => n.x === nx && n.y === ny)) {
                    open.push({ x: nx, y: ny, f });
                }
            }
        }
    }

    return null;
}

export function findPathAdjacent(map, startX, startY, targetX, targetY) {
    let bestPath = null;
    for (const [dx, dy] of DIRS) {
        const ax = targetX + dx;
        const ay = targetY + dy;
        if (!isPassable(map, ax, ay)) continue;
        const path = findPath(map, startX, startY, ax, ay);
        if (path && (bestPath === null || path.length < bestPath.length)) {
            bestPath = path;
        }
    }
    return bestPath;
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function reconstructPath(cameFrom, endX, endY, startX, startY) {
    const path = [];
    let current = { x: endX, y: endY };
    const startKey = `${startX},${startY}`;

    while (`${current.x},${current.y}` !== startKey) {
        path.unshift(current);
        const prev = cameFrom.get(`${current.x},${current.y}`);
        if (!prev) break;
        current = prev;
    }

    return path;
}

export function manhattanDist(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
