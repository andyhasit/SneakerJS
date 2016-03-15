
angular.module('Relate').factory('QueuedResponseDb', function($q, ValueRegister) {
  /*
  post put get remove
  */
  var QueuedResponseDb = function(db) {
    var self = this;
    self._db = db;
    self.queue = {};
    self._nextId = 0;
    self._latestResolvedId = 1;
    
    self.wrapPromise = function(dbCall, data) {
      var promiseId = self.nextId();
      var hiddenPromise = self._db[dbCall](data);
      var returnPromise = $q.defer();
      self.queuePromise(promiseId, returnPromise);
      hiddenPromise.then(function(response) {
        self.promiseGotResolved(promiseId, response);
      });
      return returnPromise.promise;
    };
    angular.forEach(['post', 'put', 'get', 'remove'], function (dbCall) {
      self[dbCall] = function(data) {
        return self.wrapPromise(dbCall, data);
      }
    });
  };
  
  QueuedResponseDb.prototype.nextId = function (){
    this._nextId ++;
    return this._nextId;
  }
  
  QueuedResponseDb.prototype.queuePromise = function(promiseId, returnPromise) {
    this.queue[promiseId] = {
      returnPromise: returnPromise,
      resolved: false
    };
  };
  
  QueuedResponseDb.prototype.promiseGotResolved = function(promiseId, result) {
    var promise = this.queue[promiseId]
    promise['result'] = result;
    promise.resolved = true;
    this.releasResolvedPromises();
  };
  
  QueuedResponseDb.prototype.releasResolvedPromises = function() {
    var stop = false; // encounteredUnresolvedPromiseOrReachedEndOfQueue
    while (!stop) {
      entry = this.queue[this._latestResolvedId]
      if (entry && entry.resolved) {
        entry.returnPromise.resolve(entry.result);
        this._latestResolvedId ++;
      } else {
        stop = true;
      }
    }
  }
  
  return QueuedResponseDb;
});