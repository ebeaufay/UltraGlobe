// Imports
import "./WorkType" ;

// Class
class Workers
{
    // Definitions

    // Functions
    constructor ()
    {
        // Prepare web workers
        this._callbackRepo = new Map () ;
        this._waitingWork = new Map () ;
        this._workerCount = 4 ;

        this._workers = [] ;
        this._availableWorkers = [] ;

        const self = this ;

        for (let i = 0 ; i < this._workerCount ; ++i)
        {
            const worker = new Worker ("src/worker/WorkerLogic.js") ;
            worker.postMessage({_type : WORK_TYPE.INIT}) ;
            this._workers.push(worker) ;
            this._availableWorkers.push(worker) ;

            // Set callback so that it checks which tile was attached and call right callback
            worker.onmessage = function (result)
                {
                    // Fire back data to caller
                    self._callbackRepo.get(result.data._index)(result) ;
                    self._callbackRepo.delete(result.data._index) ;

                    // This worker becomes free
                    self._availableWorkers.push(worker) ;

                    // Check if we need to schedule more work
                    if (self._waitingWork.size)
                    {
                        const nextWork = self._waitingWork.entries().next().value ;
                        self._waitingWork.delete(nextWork[0]) ;
                        self.requestWork(nextWork[1]._data, nextWork[1]._callback) ;
                    }
                } ;
        }

        // Active worker for next work load
        this._nextWorker = 0 ;
    }

    requestWork (data, callback)
    {
        // Check if a worker is ready
        if (this._availableWorkers.length)
        {
            // Fire work right away
            const currentWorker = this._availableWorkers.shift() ;
            this._callbackRepo.set(data._index, callback) ;
            currentWorker.postMessage(data) ;
        }
        else
        {
            // Wait for it
            this._waitingWork.set(data._index, {_data : data, _callback : callback}) ;
        }        
    }

    cancelWork (index)
    {
        this._waitingWork.delete(index) ;
    }
}

export {Workers} ;