import { BUILD_COSTS, BUILD_WORK } from './config.js';

const BUILDING_RESEARCH_REQS = {
    beast_circle: 'beast_binding',
    mana_crystal: 'ley_channeling',
    glowstone: 'luminance',
    enchanting_table: 'arcane_infusion',
    ember_ward: 'ember_magic',
    arcane_sentinel: 'warding',
};

export function designateBuild(game, x, y, buildType) {
    const tile = game.map[y][x];
    if (tile.structure || !tile.passable || tile.resource) return false;
    if (tile.terrain === 'water') return false;

    const researchReq = BUILDING_RESEARCH_REQS[buildType];
    if (researchReq && !game.research.isResearched(researchReq)) return false;

    const cost = BUILD_COSTS[buildType];
    if (!cost || !game.resources.has(cost)) return false;

    game.resources.deduct(cost);
    tile.designation = { type: 'build', buildType };

    game.taskQueue.add({
        type: 'build',
        skillRequired: 'building',
        x, y,
        workAmount: BUILD_WORK[buildType] || 15,
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
            const cost = BUILD_COSTS[tile.designation.buildType];
            if (cost) game.resources.add(cost);
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
