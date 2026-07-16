let nextTaskId = 1;

export class TaskQueue {
    constructor() {
        this.tasks = [];
    }

    add(task) {
        task.id = nextTaskId++;
        task.workDone = 0;
        task.assignedTo = null;
        task.status = 'pending';
        this.tasks.push(task);
        return task;
    }

    syncIdCounter() {
        const maxId = this.tasks.reduce((max, t) => Math.max(max, t.id || 0), 0);
        if (maxId >= nextTaskId) nextTaskId = maxId + 1;
    }

    remove(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
    }

    findBestTask(colonist, tick) {
        const failedTasks = colonist._failedTasks;
        const available = this.tasks.filter(t => {
            if (t.status !== 'pending' || t.assignedTo !== null) return false;
            if (colonist.priorities[t.skillRequired] <= 0) return false;
            if (failedTasks && failedTasks[t.id] !== undefined && tick - failedTasks[t.id] < 30) return false;
            if ((t.type === 'craft' || t.type === 'cook') && this.isStationBusy(t.x, t.y)) return false;
            return true;
        });

        if (available.length === 0) return null;

        available.sort((a, b) => {
            const prioA = colonist.priorities[a.skillRequired];
            const prioB = colonist.priorities[b.skillRequired];
            if (prioA !== prioB) return prioA - prioB;
            const distA = Math.abs(colonist.x - a.x) + Math.abs(colonist.y - a.y);
            const distB = Math.abs(colonist.x - b.x) + Math.abs(colonist.y - b.y);
            return distA - distB;
        });

        return available[0];
    }

    isStationBusy(x, y) {
        return this.tasks.some(t => (t.type === 'craft' || t.type === 'cook') && t.status === 'in_progress' && t.x === x && t.y === y);
    }

    claim(taskId, colonistId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignedTo = colonistId;
            task.status = 'in_progress';
        }
    }

    release(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignedTo = null;
            task.status = 'pending';
            task.workDone = 0;
        }
    }

    complete(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
    }

    getByPosition(x, y) {
        return this.tasks.find(t => t.x === x && t.y === y);
    }

    getAssignedTo(colonistId) {
        return this.tasks.find(t => t.assignedTo === colonistId);
    }

    getPending() {
        return this.tasks.filter(t => t.status === 'pending');
    }

    getAll() {
        return this.tasks;
    }
}
