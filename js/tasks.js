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

    remove(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
    }

    findBestTask(colonist, tick) {
        const failedTasks = colonist._failedTasks;
        const available = this.tasks.filter(t => {
            if (t.status !== 'pending' || t.assignedTo !== null) return false;
            if (colonist.priorities[t.skillRequired] <= 0) return false;
            if (failedTasks && failedTasks[t.id] !== undefined && tick - failedTasks[t.id] < 30) return false;
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
