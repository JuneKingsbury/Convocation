import { RESEARCH, WORK_CONFIG } from '../core/config.js';

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

export function findResearchDesks(game) {
    const desks = [];
    for (let y = 0; y < game.map.length; y++) {
        for (let x = 0; x < game.map[y].length; x++) {
            if (game.map[y][x].structure === 'research_desk') {
                desks.push({ x, y });
            }
        }
    }
    return desks;
}

export function updateResearch(game) {
    const desks = findResearchDesks(game);
    if (!desks.length) return;

    for (const desk of desks) {
        const task = game.taskQueue.getAll().find(t => t.type === 'research' && t.x === desk.x && t.y === desk.y);
        if (!task) {
            game.taskQueue.add({
                type: 'research',
                skillRequired: 'research',
                x: desk.x,
                y: desk.y,
                workAmount: WORK_CONFIG.researchWork,
            });
        }
    }
}
