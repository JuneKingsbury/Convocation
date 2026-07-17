import { CROPS } from '../core/config.js';

// Derived from the 'research' field on each crop entry
export const CROP_RESEARCH_REQS = Object.fromEntries(
    Object.entries(CROPS).filter(([, c]) => c.research).map(([k, c]) => [k, c.research])
);

export function designateFarmZone(game, x1, y1, x2, y2, cropType) {
    const crop = CROPS[cropType];
    if (!crop) return false;

    const req = CROP_RESEARCH_REQS[cropType];
    if (req && !game.research.isResearched(req)) return false;

    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);

    let count = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const tile = game.map[y][x];
            if (tile.terrain !== 'grass' && tile.terrain !== 'dirt') continue;
            if (tile.structure || tile.resource || tile.zone) continue;

            tile.zone = {
                type: 'growing',
                crop: cropType,
                state: 'empty',
                growth: 0,
                harvestYield: crop.harvestYield,
            };
            if (game.mapIndex) game.mapIndex.addZone(x, y);
            count++;
        }
    }
    return count > 0;
}

export function removeFarmZone(game, x, y) {
    const tile = game.map[y][x];
    if (!tile.zone) return;
    tile.zone = null;
    if (game.mapIndex) game.mapIndex.removeZone(x, y);
    const task = game.taskQueue.getByPosition(x, y);
    if (task && (task.type === 'plant' || task.type === 'harvest')) {
        game.taskQueue.remove(task.id);
    }
}

export function updateFarming(game) {
    const season = game.weather.season;
    const growthMult = game.weather.getGrowthMultiplier();

    const zonePositions = game.mapIndex ? game.mapIndex.getZonePositions() : null;

    if (zonePositions) {
        for (const { x, y } of zonePositions) {
            updateFarmTile(game, x, y, season, growthMult);
        }
    } else {
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                if (!game.map[y][x].zone) continue;
                updateFarmTile(game, x, y, season, growthMult);
            }
        }
    }
}

function updateFarmTile(game, x, y, season, growthMult) {
    const tile = game.map[y][x];
    if (!tile.zone) return;

    const crop = CROPS[tile.zone.crop];
    if (!crop) return;

    if (tile.zone.state === 'empty') {
        if (!crop.seasons.includes(season)) return;
        const existingTask = game.taskQueue.getByPosition(x, y);
        if (!existingTask) {
            game.taskQueue.add({
                type: 'plant',
                skillRequired: 'farming',
                x, y,
                workAmount: 5,
            });
        }
    } else if (tile.zone.state === 'growing') {
        if (growthMult > 0) {
            tile.zone.growth += growthMult;
            if (tile.zone.growth >= crop.growthTicks) {
                tile.zone.state = 'ready';
                const existingTask = game.taskQueue.getByPosition(x, y);
                if (!existingTask) {
                    game.taskQueue.add({
                        type: 'harvest',
                        skillRequired: 'farming',
                        x, y,
                        workAmount: 8,
                    });
                }
            }
        }
    } else if (tile.zone.state === 'ready') {
        const existingTask = game.taskQueue.getByPosition(x, y);
        if (!existingTask) {
            game.taskQueue.add({
                type: 'harvest',
                skillRequired: 'farming',
                x, y,
                workAmount: 8,
            });
        }
    }
}
