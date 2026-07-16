import { BUILDINGS } from './config.js';

export function designateBuild(game, x, y, buildType) {
    const tile = game.map[y][x];
    if (tile.structure || !tile.passable || tile.resource) return false;
    if (tile.terrain === 'water' || tile.terrain === 'rock') return false;

    const def = BUILDINGS[buildType];
    if (!def) return false;

    if (def.research && !game.research.isResearched(def.research)) return false;
    if (!game.resources.has(def.cost)) return false;

    game.resources.deduct(def.cost);
    tile.designation = { type: 'build', buildType };

    game.taskQueue.add({
        type: 'build',
        skillRequired: 'building',
        x, y,
        workAmount: def.work,
        buildType,
    });

    return true;
}

export function designateChop(game, x, y) {
    const tile = game.map[y][x];
    if (!tile.resource || tile.resource.type !== 'tree') return false;
    if (tile.designation) return false;

    tile.designation = { type: 'chop' };
    game.taskQueue.add({
        type: 'chop',
        skillRequired: 'building',
        x, y,
        workAmount: 12,
    });
    return true;
}

export function designateMine(game, x, y) {
    const tile = game.map[y][x];
    if (!tile.resource || (tile.resource.type !== 'stone' && tile.resource.type !== 'runite_ore')) return false;
    if (tile.designation) return false;

    tile.designation = { type: 'mine' };
    game.taskQueue.add({
        type: 'mine',
        skillRequired: 'building',
        x, y,
        workAmount: tile.resource.type === 'runite_ore' ? 22 : 18,
    });
    return true;
}

export function cancelDesignation(game, x, y) {
    const tile = game.map[y][x];

    if (tile.designation) {
        if (tile.designation.type === 'build') {
            const def = BUILDINGS[tile.designation.buildType];
            if (def) game.resources.add(def.cost);
        }
        const task = game.taskQueue.getByPosition(x, y);
        if (task) game.taskQueue.remove(task.id);
        tile.designation = null;
        return;
    }

    if (tile.structure && !tile.designation) {
        const existing = game.taskQueue.getByPosition(x, y);
        if (existing && existing.type === 'deconstruct') return;

        tile.designation = { type: 'deconstruct' };
        game.taskQueue.add({
            type: 'deconstruct',
            skillRequired: 'building',
            x, y,
            workAmount: 10,
        });
    }
}
