import { RESEARCH } from './config.js';

export class ResearchSystem {
    constructor() {
        this.completed = new Set();
        this.studyPoints = 0;
    }

    getAvailable() {
        const available = [];
        for (const [key, tech] of Object.entries(RESEARCH)) {
            if (this.completed.has(key)) continue;
            const prereqsMet = tech.requires.every(r => this.completed.has(r));
            if (prereqsMet) available.push({ key, ...tech });
        }
        return available;
    }

    purchase(key) {
        if (this.completed.has(key)) return false;
        const tech = RESEARCH[key];
        if (!tech) return false;
        if (!tech.requires.every(r => this.completed.has(r))) return false;
        if (this.studyPoints < tech.cost) return false;
        this.studyPoints -= tech.cost;
        this.completed.add(key);
        return true;
    }

    addProgress(amount) {
        this.studyPoints += amount;
    }

    isResearched(key) {
        return this.completed.has(key);
    }
}

export function findResearchBench(game) {
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            if (game.map[y][x].structure === 'arcanum') {
                return { x, y };
            }
        }
    }
    return null;
}

export function updateResearch(game) {
    const bench = findResearchBench(game);
    if (!bench) return;

    const existingTask = game.taskQueue.getAll().find(t => t.type === 'research');
    if (!existingTask) {
        game.taskQueue.add({
            type: 'research',
            skillRequired: 'crafting',
            x: bench.x,
            y: bench.y,
            workAmount: 10,
        });
    }
}
