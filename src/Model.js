
angular.module('SneakerJS', []);

angular.module('SneakerJS').factory('SneakerModel', function($q, SnjsCollection, 
    SnjsSingleton, SnjsParentChildRelationship, SnjsManyToManyRelationship){
  
  var SneakerModel = function(dbWrapper, initialLoadQuery) {var self = this;
    self.__db = dbWrapper;
    self.__loadQuery = initialLoadQuery || function() {
      return dbWrapper.allDocs({
        include_docs: true,
        attachments: false
      });
    };
    self.__containers = {};
    self.__dbDocumentTypeLoaders = {};
    self.__lastPromiseInQueue = $q.when();
    self.__relationshipDefinitionFunctions = {};
    self.__dataReady = undefined;
    self.changeCount = 0;

    self.dataReady = function() {
      if (self.__dataReady === undefined) {
        self.__dataReady = self.__initializeModel();
      }
      return self.__dataReady;
    };

    self.reload = function() {
      self.__dataReady = undefined;
      angular.forEach(self.__containers, function(container) {
        container.clear();
      });
      return self.dataReady();
    };

    self.printInfo = function() {
      angular.forEach(self.__containers, function(container) {
        angular.forEach(container.getAccessFunctionDefinitions(), function(accessFunc) {
          console.log('db.' + accessFunc.ModelFunctionName);
        });
      });
    };

    /************* MODEL DEFINITION FUNCTIONS *************/

    self.collection = function(singleItemName, fieldNames, options) {
      var container = new SnjsCollection(self.__db, singleItemName, fieldNames, options);
      self.__registerContainer(container);
      return container;
    };

    self.singleton = function(name, data) {
      var container = new SnjsSingleton(self.__db, name, data);
      self.__registerContainer(container);
      return container;
    };
    
    self.oneToMany = function(parentCollectionName, childCollectionName, options) {
      self.__ensureCollectionsExist([parentCollectionName, childCollectionName]);
      var parentCollection = self.__containers[parentCollectionName];
      var childCollection = self.__containers[childCollectionName];
      var container = new SnjsParentChildRelationship(self.__db, parentCollection, childCollection, options);
      return self.__registerContainer(container);
    };
    
    self.manyToMany = function(leftCollectionName, rightCollectionName, options) {
      self.__ensureCollectionsExist([leftCollectionName, rightCollectionName]);
      var leftCollection = self.__containers[leftCollectionName];
      var rightCollection = self.__containers[rightCollectionName];
      container = new SnjsManyToManyRelationship(self.__db, leftCollection, rightCollection, options);
      return self.__registerContainer(container);
    };

    self.__ensureCollectionsExist = function(collectionNames) {
      angular.forEach(collectionNames, function(name) {
        if (self.__containers[name] === undefined) {
          throw 'Failed to create relationship, container not found: "' + name + '" ';
        }
      });
    };
    
    self.__registerContainer = function(container) {
      var name = container.name;
      if (self.__containers[name] !== undefined) {
        throw 'Trying to create containers with name: ' + name + ' on model but it already exists.';
      }
      self.__containers[name] = container;
      self.__registerDocumentTypeLoader(container);
      self.__createAccessFunctions(container);
      return container;
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
      return $q.when(self.__containers[item.type].saveItem(item));
    };

    self.deleteItem = function(item) {
      self.changeCount ++;
      return $q.when(self.__containers[item.type].deleteItem(item));
    };

    self.__createAccessFunctions = function(container) {
      angular.forEach(container.getAccessFunctionDefinitions(), function(accessFunc) {
        var func, fnName = accessFunc.ModelFunctionName;
        if (accessFunc.queuedPromise) {
          func = self.__getQueuedFunction(container, accessFunc.containerFunction);
        } else {
          func = self.__getNonQueuedFunction(container, accessFunc.containerFunction);
        }
        if (self[fnName] !== undefined) {
          throw 'Container ' + container.name + ' trying to create function ' +
                  fnName + ' on model but it already exists.';
        }
        self[fnName] = func;
      });
    };

    self.__getNonQueuedFunction = function(container, containerFunction) {
      return function() {
        return containerFunction.apply(container, arguments);
      }
    };

    self.__getQueuedFunction = function(container, containerFunction) {
      /*This returns the function which actually gets called on e.g. mode.newPerson()
      Keep the the $q.defer() so it wraps it in a $q promise.
      */
      return function() {
        var originalArgs = arguments;
        var deferred = $q.defer();
        self.__lastPromiseInQueue.then( function() {
          self.__lastPromiseInQueue = containerFunction.apply(container, originalArgs);
          self.__lastPromiseInQueue.then(function(result) {
            self.changeCount ++;
            deferred.resolve(result);
          });
        });
        return deferred.promise;
      }
    };

    /************* INITIAL LOADING FUNCTIONALITY *************/

    self.__registerDocumentTypeLoader = function(container) {
      /* If container has field 'dbDocumentType' then every document whose 'type' field matches that
      will be passed to the container's loadDocumentFromDb() function at loading.
      */
      var dbDocumentType = container.dbDocumentType;
      if (dbDocumentType !== undefined) {
        if (dbDocumentType in self.__dbDocumentTypeLoaders) {
          var claimedBy = self.__dbDocumentTypeLoaders[dbDocumentType];
          throw 'More than one container attempting to register database document type: "' + dbDocumentType + '".';
        } else {
          self.__dbDocumentTypeLoaders[dbDocumentType] = container;
        }
      }
    };

    self.__initializeModel = function() {
      return self.__loadQuery().then(function (result) {
        angular.forEach(result.rows, function(row){
          self.__addDocumentToCollection(row.doc);
        });
        self.__postInitialLoading();
        return result.rows.length;
      }).catch(function (err) {
        console.log(err);
      });
    };

    self.__addDocumentToCollection = function(document) {
      var dbDocumentType = document.type;
      if (dbDocumentType) {
        var container = self.__dbDocumentTypeLoaders[dbDocumentType];
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

    self.__postInitialLoading = function() {
      angular.forEach(self.__containers, function(container) {
        container.postInitialLoading();
      });
    };
  
  };
  return SneakerModel;
  
});