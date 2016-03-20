angular.module('SneakerJS', []);

angular.module('SneakerJS').service('model', function($q, $rootScope,
    Collection, Singleton, ParentChildRelationship, ManyToManyRelationship) {
  var __db, __loadQuery;
  var self = this;
  var __containers = {};
  var __dbDocumentTypeLoaders = {};
  var __lastPromiseInQueue = $q.when();
  var __relationshipDefinitionFunctions = {};
  self.changeCount = 0;
  $rootScope.$watch(self.changeCount, function() {

  });

  self.initialize = function(db, query) {
    __db = db;
    __loadQuery = query || function() {
      return __db.allDocs({
        include_docs: true,
        attachments: false
      });
    }
  };

  var __dataReady;
  self.dataReady = function (){
    if (__dataReady === undefined) {
      __dataReady = __initializeModel();
    }
    return __dataReady;
  };

  self.reload = function (){
    __dataReady = undefined;
    angular.forEach(__containers, function(container) {
      container.clear();
    });
    return self.dataReady();
  };

  self.printInfo = function (){
    angular.forEach(__containers, function(container) {
      angular.forEach(container.getAccessFunctionDefinitions(), function(accessFunc) {
        console.log('model.' + accessFunc.ModelFunctionName);
      });
    });
  };

  /************* MODEL DEFINITION FUNCTIONS *************/

  self.collection = function(singleItemName, fieldNames, options){
    var container = new Collection(__db, singleItemName, fieldNames, options);
    __registerContainer(container);
    return container;
  };

  self.singleton = function(name, data){
    var container = new Singleton(__db, name, data);
    __registerContainer(container);
    return container;
  };

  self.join = function(firstCollection, secondCollection, options){
    var options = options || {};
    var container;
    var relationshipType = options.type || 'parentChild';
    angular.forEach([firstCollection, secondCollection], function(name) {
      if (__containers[name] === undefined) {
        throw 'Failed to create join, container not found: "' + name + '" ';
      }
    });
    if (relationshipType === 'parentChild') {
      var parentCollection = __containers[firstCollection];
      var childCollection = __containers[secondCollection];
      container = new ParentChildRelationship(__db, parentCollection, childCollection, options);
    } else if (relationshipType.toLowerCase() === 'many-to-many') {
      var leftCollection = __containers[firstCollection];
      var rightCollection = __containers[secondCollection];
      container = new ManyToManyRelationship(__db, leftCollection, rightCollection, options);
    } else {
      throw '"' + relationshipType + '" is not a valid relationship type';
    }
    __registerContainer(container);
    return container;
  };

  function __registerContainer(container) {
    var name = container.name;
    if (__containers[name] !== undefined) {
      throw 'Trying to create containers with name: ' + name + ' on model but it already exists.';
    }
    __containers[name] = container;
    __registerDocumentTypeLoader(container);
    __createAccessFunctions(container);
  };

  /************* COLLECTION ACCESS FUNCTIONALITY ************

    __createAccessFunctions() creates methods like:

      model.newTask({})
      model.getProjectTasks(project)

    Query functions (getX, findX) return directly. Data changing functions (all other prefixed) return promises.

    Query data may be dirty while a promise is waiting to complete, so you need to do this:

    model.newTask({}).then(function(){
      angular.copy($scope.tasks, model.getProjectTasks($scope.project));
    });

    Data changing functions are queued internally, so you can do this.
    model.newTask({});
    model.newTask({});
    model.newTask({}).then(function(){
      angular.copy($scope.tasks, model.getProjectTasks($scope.project));
    });

  */
  self.saveItem = function(item) {
    self.changeCount ++;
    return __containers[item.type].saveItem(item);
  };

  self.deleteItem = function(item) {
    self.changeCount ++;
    return __containers[item.type].deleteItem(item);
  };

  function __createAccessFunctions(container){
    angular.forEach(container.getAccessFunctionDefinitions(), function(accessFunc) {
      var func, fnName = accessFunc.ModelFunctionName;
      if (accessFunc.queuedPromise) {
        func = __getQueuedFunction(container, accessFunc.containerFunction);
      } else {
        func = __getNonQueuedFunction(container, accessFunc.containerFunction);
      }
      if (self[fnName] !== undefined) {
        throw 'Container ' + container.name + ' trying to create function ' + fnName + ' on model but it already exists.';
      }
      self[fnName] = func;
    });
  };

  function __getNonQueuedFunction(container, containerFunction){
    return function() {
      return containerFunction.apply(container, arguments);
    }
  };

  function safeApply(fn) {
    ($rootScope.$$phase) ? fn() : $rootScope.$apply(fn);
  }

  function __getQueuedFunction(container, containerFunction){
    return function() {
      var originalArgs = arguments;
      var deferred = $q.defer();
      __lastPromiseInQueue.then( function() {
        __lastPromiseInQueue = containerFunction.apply(container, originalArgs);
        __lastPromiseInQueue.then(function(result) {
          self.changeCount ++;
          deferred.resolve(result);
        });
      });
      return deferred.promise;
    }
  };

  /************* INITIAL LOADING FUNCTIONALITY *************/

  function __registerDocumentTypeLoader(container) {
    /* If container has field 'dbDocumentType' then every document whose 'type' field matches that
    will be passed to the container's loadDocumentFromDb() function at loading.
    */
    var dbDocumentType = container.dbDocumentType;
    if (dbDocumentType !== undefined) {
      if (dbDocumentType in __dbDocumentTypeLoaders) {
        var claimedBy = __dbDocumentTypeLoaders[dbDocumentType];
        throw 'More than one container attempting to register database document type: "' + dbDocumentType + '".';
      } else {
        __dbDocumentTypeLoaders[dbDocumentType] = container;
      }
    }
  };

  function __initializeModel() {
    return __loadQuery().then(function (result) {
      angular.forEach(result.rows, function(row){
        __addDocumentToCollection(row.doc);
      });
      __postInitialLoading();
      return result.rows.length;
    }).catch(function (err) {
      console.log(err);
    });
  };

  function __addDocumentToCollection(document){
    var dbDocumentType = document.type;
    if (dbDocumentType) {
      var container = __dbDocumentTypeLoaders[dbDocumentType];
      if (container) {
        container.loadDocumentFromDb(document, dbDocumentType);
      } else {
        console.log(document);
        console.log('Could not load document \"' + document._id + '\" as type was not recognised (' + dbDocumentType + ')');
      }
    } else {
      console.log('Could not load document \"' + document._id + '\" as it has no \"type\" field.');
    }
  };

  function __postInitialLoading() {
    angular.forEach(__containers, function(container) {
      container.postInitialLoading();
    });
  }

});
