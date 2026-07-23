import { ARTIFACTS } from '../core/config.js';

export function getPedestalEffect(game, effectKey) {
    let value = effectKey.includes('Mult') ? 1.0 : 0;
    const allStructures = game.mapIndex.getAllStructurePositions();
    for (const { x, y, type } of allStructures) {
        if (type !== 'artifact_pedestal') continue;
        const tile = game.map[y][x];
        if (!tile.pedestalArtifact || tile.pedestalInactive) continue;
        const def = ARTIFACTS[tile.pedestalArtifact];
        if (!def?.pedestal) continue;
        if (def.pedestal.radius !== 'global') continue;
        if (def.pedestal[effectKey] !== undefined) {
            if (effectKey.includes('Mult')) value *= def.pedestal[effectKey];
            else value += def.pedestal[effectKey];
        }
    }
    return value;
}
