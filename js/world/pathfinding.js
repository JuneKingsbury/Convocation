import { isPassable, getMoveCost, isPassableForEnemies, isBreakableByEnemies } from './map.js';
import { CONFIG } from '../core/config.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const MAX_NODES = 1500;

class MinHeap {
    constructor() {
        this.data = [];
    }

    push(node) {
        this.data.push(node);
        this._bubbleUp(this.data.length - 1);
    }

    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    get length() {
        return this.data.length;
    }

    _bubbleUp(i) {
        const node = this.data[i];
        while (i > 0) {
            const parentIdx = (i - 1) >> 1;
            if (this.data[parentIdx].f <= node.f) break;
            this.data[i] = this.data[parentIdx];
            i = parentIdx;
        }
        this.data[i] = node;
    }

    _sinkDown(i) {
        const length = this.data.length;
        const node = this.data[i];
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < length && this.data[left].f < this.data[smallest].f) smallest = left;
            if (right < length && this.data[right].f < this.data[smallest].f) smallest = right;
            if (smallest === i) break;
            this.data[i] = this.data[smallest];
            this.data[smallest] = node;
            i = smallest;
        }
    }
}

export function findPath(map, startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];
    if (!isPassable(map, endX, endY)) return null;

    const open = new MinHeap();
    const inOpen = new Set();
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    const key = (x, y) => (y << 16) | x;
    const start = key(startX, startY);
    const end = key(endX, endY);

    gScore.set(start, 0);
    open.push({ x: startX, y: startY, f: heuristic(startX, startY, endX, endY) });
    inOpen.add(start);

    let iterations = 0;
    while (open.length > 0 && iterations < MAX_NODES) {
        iterations++;
        const current = open.pop();
        const currentKey = key(current.x, current.y);
        inOpen.delete(currentKey);

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
                cameFrom.set(nKey, currentKey);
                gScore.set(nKey, tentativeG);
                const f = tentativeG + heuristic(nx, ny, endX, endY);
                if (!inOpen.has(nKey)) {
                    open.push({ x: nx, y: ny, f });
                    inOpen.add(nKey);
                } else {
                    // Update f score in heap by pushing duplicate (old one will be skipped via closed set)
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

export function findPathForEnemies(map, startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];

    const open = new MinHeap();
    const inOpen = new Set();
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    const key = (x, y) => (y << 16) | x;
    const start = key(startX, startY);
    const end = key(endX, endY);

    gScore.set(start, 0);
    open.push({ x: startX, y: startY, f: heuristic(startX, startY, endX, endY) });
    inOpen.add(start);

    let iterations = 0;
    while (open.length > 0 && iterations < MAX_NODES) {
        iterations++;
        const current = open.pop();
        const currentKey = key(current.x, current.y);
        inOpen.delete(currentKey);

        if (currentKey === end) {
            return reconstructPath(cameFrom, current.x, current.y, startX, startY);
        }

        closed.add(currentKey);

        for (const [dx, dy] of DIRS) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (nx < 0 || nx >= CONFIG.MAP_WIDTH || ny < 0 || ny >= CONFIG.MAP_HEIGHT) continue;
            const nKey = key(nx, ny);

            if (closed.has(nKey)) continue;
            if (!isPassableForEnemies(map, nx, ny) && !isBreakableByEnemies(map, nx, ny)) continue;

            let cost = getMoveCost(map, nx, ny);
            if (isBreakableByEnemies(map, nx, ny)) cost += 10;

            const tentativeG = gScore.get(currentKey) + cost;
            if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
                cameFrom.set(nKey, currentKey);
                gScore.set(nKey, tentativeG);
                const f = tentativeG + heuristic(nx, ny, endX, endY);
                if (!inOpen.has(nKey)) {
                    open.push({ x: nx, y: ny, f });
                    inOpen.add(nKey);
                } else {
                    open.push({ x: nx, y: ny, f });
                }
            }
        }
    }

    return null;
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function reconstructPath(cameFrom, endX, endY, startX, startY) {
    const path = [];
    const startKey = (startY << 16) | startX;
    let currentKey = (endY << 16) | endX;

    while (currentKey !== startKey) {
        path.push({ x: currentKey & 0xFFFF, y: currentKey >> 16 });
        const prev = cameFrom.get(currentKey);
        if (prev === undefined) break;
        currentKey = prev;
    }

    path.reverse();
    return path;
}

export function manhattanDist(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
