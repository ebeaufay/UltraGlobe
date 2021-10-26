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
        this._workerCount = 4 ;

        this._workers = [] ;

        const self = this ;

        for (let i = 0 ; i < this._workerCount ; ++i)
        {
            const worker = new Worker ("src/worker/WorkerLogic.js") ;
            worker.postMessage({_type : WORK_TYPE.INIT}) ;
            this._workers.push(worker) ;

            // Set callback so that it checks which tile was attached and call right callback
            worker.onmessage = function (result)
                {
                    self._callbackRepo.get(result.data._index)(result) ;
                    self._callbackRepo.delete(result.data._index) ;
                } ;
        }

        // Active worker for next work load
        this._nextWorker = 0 ;
    }

    requestWork (data, callback)
    {
        // Request processing on right worker
        const currentWorker = this._workers[this._nextWorker] ;
        this._callbackRepo.set(data._index, callback) ;
        currentWorker.postMessage(data) ;

        // For next call
        this._nextWorker = (this._nextWorker + 1) % this._workerCount ;
    }
}

export {Workers} ;