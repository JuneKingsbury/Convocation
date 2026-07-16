let nextTaskId = 1;

export class TaskQueue {
    constructor() {
        this.tasks = [];
        this._byPosition = new Map();
        this._pending = [];
        this._pendingDirty = true;
    }

    _posKey(x, y) {
        return (y << 16) | x;
    }

    add(task) {
        task.id = nextTaskId++;
        task.workDone = 0;
        task.assignedTo = null;
        task.status = 'pending';
        this.tasks.push(task);
        this._byPosition.set(this._posKey(task.x, task.y), task);
        this._pendingDirty = true;
        return task;
    }

    syncIdCounter() {
        const maxId = this.tasks.reduce((max, t) => Math.max(max, t.id || 0), 0);
        if (maxId >= nextTaskId) nextTaskId = maxId + 1;
        this._rebuildIndices();
    }

    _rebuildIndices() {
        this._byPosition.clear();
        for (const t of this.tasks) {
            this._byPosition.set(this._posKey(t.x, t.y), t);
        }
        this._pendingDirty = true;
    }

    remove(taskId) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx >= 0) {
            const task = this.tasks[idx];
            this._byPosition.delete(this._posKey(task.x, task.y));
            this.tasks.splice(idx, 1);
            this._pendingDirty = true;
        }
    }

    findBestTask(colonist, tick) {
        const failedTasks = colonist._failedTasks;
        if (this._pendingDirty) {
            this._pending = this.tasks.filter(t => t.status === 'pending' && t.assignedTo === null);
            this._pendingDirty = false;
        }

        let best = null;
        let bestScore = Infinity;

        for (const t of this._pending) {
            if (t.status !== 'pending' || t.assignedTo !== null) continue;
            if (colonist.priorities[t.skillRequired] <= 0) continue;
            if (failedTasks && failedTasks[t.id] !== undefined && tick - failedTasks[t.id] < 30) continue;
            if ((t.type === 'craft' || t.type === 'cook') && this.isStationBusy(t.x, t.y)) continue;

            const prio = colonist.priorities[t.skillRequired];
            const dist = Math.abs(colonist.x - t.x) + Math.abs(colonist.y - t.y);
            const score = prio * 10000 + dist;

            if (score < bestScore) {
                bestScore = score;
                best = t;
            }
        }

        return best;
    }

    isStationBusy(x, y) {
        const k = this._posKey(x, y);
        for (const t of this.tasks) {
            if ((t.type === 'craft' || t.type === 'cook') && t.status === 'in_progress' && this._posKey(t.x, t.y) === k) {
                return true;
            }
        }
        return false;
    }

    claim(taskId, colonistId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignedTo = colonistId;
            task.status = 'in_progress';
            this._pendingDirty = true;
        }
    }

    release(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignedTo = null;
            task.status = 'pending';
            task.workDone = 0;
            this._pendingDirty = true;
        }
    }

    complete(taskId) {
        const idx = this.tasks.findIndex(t => t.id === taskId);
        if (idx >= 0) {
            const task = this.tasks[idx];
            this._byPosition.delete(this._posKey(task.x, task.y));
            this.tasks.splice(idx, 1);
            this._pendingDirty = true;
        }
    }

    getByPosition(x, y) {
        return this._byPosition.get(this._posKey(x, y)) || null;
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

    updatePosition(taskId, x, y) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this._byPosition.delete(this._posKey(task.x, task.y));
            task.x = x;
            task.y = y;
            this._byPosition.set(this._posKey(x, y), task);
        }
    }
}
