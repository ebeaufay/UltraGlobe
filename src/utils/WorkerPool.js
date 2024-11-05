// WorkerPool.js

export default class WorkerPool {
    constructor(workers) {
      this.poolSize = workers.length;
      this.workers = [];
      this.taskQueue = [];
      this.idleWorkers = [];
  
      // Initialize the pool with workers
      workers.forEach(worker=>{
        worker.onmessage = (e) => this._onWorkerMessage(worker, e);
        this.workers.push(worker);
        this.idleWorkers.push(worker);
      })
      /* for (let i = 0; i < poolSize; i++) {
        const worker = new WorkerConstructor();
        worker.onmessage = (e) => this._onWorkerMessage(worker, e);
        this.workers.push(worker);
        this.idleWorkers.push(worker);
      } */
    }
  
    _onWorkerMessage(worker, e) {
      const task = worker.currentTask;
      task.resolve(e.data);
      worker.currentTask = null;
  
      // Assign a new task if any exist in the queue
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this._assignTask(worker, nextTask);
      } else {
        this.idleWorkers.push(worker);
      }
    }
  
    _assignTask(worker, task) {
      worker.currentTask = task;
      worker.postMessage(task.data);
    }
  
    runTask(data) {
      return new Promise((resolve, reject) => {
        const task = { data, resolve, reject };
  
        if (this.idleWorkers.length > 0) {
          const worker = this.idleWorkers.shift();
          this._assignTask(worker, task);
        } else {
          this.taskQueue.push(task);
        }
      });
    }
  
    terminate() {
      this.workers.forEach((worker) => worker.terminate());
    }
  }
