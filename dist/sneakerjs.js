"use strict";
angular.module('SneakerJS', []);

angular.module('SneakerJS').factory('BaseContainer', ["$q", function($q) {
  /*
  A collection has an internal index of the objects in the database.
  What it uses as keys and values is up to the derived class.
  */
  var BaseContainer = function()    {var self = this;
    self.__index = null;
    self.__db = null;
    self.dbDocumentType = null;
  };
  var def = BaseContainer.prototype;
  
  def.postInitialLoading = function() {
    //override if container needs to do any post loading operations
  };
  
  def.__postAndLoad = function(doc)  {var self = this;
    var defered = $q.defer();
    self.__db.post(doc).then( function (result) {
      if (result.ok) {
        self.__db.get(result.id).then( function (docFromDb) {
          defered.resolve(self.loadDocumentFromDb(docFromDb));
        });
      } else {
        console.log(result);
        throw "Error fetching data";
      }
    });
    return defered.promise;
  };
  
  return BaseContainer;
}]);

angular.module('SneakerJS').factory('Collection', ["util", "$q", "BaseContainer", function(util, $q, BaseContainer) {

  var Collection = function(db, singleItemName, fieldNames, options)    {var self = this;
    var options = options || {};
    self.itemName = singleItemName;
    self.name = singleItemName; //This is how a relationship references collection
    self.plural = options.plural || singleItemName + 's'
    self.dbDocumentType = options.dbDocumentType || singleItemName;
    self.__db = db;
    self.__proto = options.proto || function(){};
    self.__items = {};
    self.__itemsAsArray = [];
    self.__parentRelationships = {};
    self.__relationships = [];
    self.__fieldNames = fieldNames.slice();
    self.__fullFieldNames = fieldNames.slice();
    self.__fullFieldNames.push('_id');
    self.__fullFieldNames.push('_rev');
  };
  util.inheritPrototype(Collection, BaseContainer);
  var def = Collection.prototype;

  def.registerChildRelationship = function(relationship)    {var self = this;
    self.__relationships.push(relationship);
  };
  
  def.registerParentRelationship = function(relationship, foreignKey, alias)    {var self = this;
    self.__parentRelationships[alias] = relationship;
    self.__relationships.push(relationship);
    self.__fullFieldNames.push(foreignKey);
  };
  
  def.registerManyToManyRelationship = function(relationship)    {var self = this;
    self.__relationships.push(relationship);
  };

  def.loadDocumentFromDb = function(doc)    {var self = this;
    var newItem = new self.__proto();
    util.copyFields(doc, newItem, self.__fullFieldNames);
    newItem.type = self.itemName;
    self.__items[doc._id] = newItem;
    self.__itemsAsArray.push(newItem);
    return newItem;
  };

  def.getAccessFunctionDefinitions = function()    {var self = this;
    var capitalize = util.capitalizeFirstLetter,
        buildFunc = util.createAccessFunctionDefinition,
        single = capitalize(self.itemName),
        plural = capitalize(self.plural);
    return [
      buildFunc('new' + single, self.newItem, true),
      buildFunc('get' + single, self.getItem, false),
      buildFunc('find' + plural, self.findItems, false),
      buildFunc('all' + plural, self.allItems, false),
    ]
  };

  def.getItem = function(id)    {var self = this;
    return self.__items[id];
  };

  def.allItems = function()    {var self = this;
    return self.__itemsAsArray;
  };

  def.findItems = function(query)    {var self = this;
    /*
    query can be:
      a function returning true or false
      an object like {name: 'deirdre'} -- which returns items whose properties match.
      an empty object {} -- which returns all items.
    TODO: what about parent properties?
    */
    var test;
    if (typeof query === 'function') {
      test = query;
    } else if (typeof query === 'object') {
      test = function(item) {
        for (prop in query) {
          if (item[prop] !== query[prop]) {
            return false;
          }
        }
        return true;
      }
    } else {
      throw 'Invalid argument for "find", must be an object or a function.';
    }
    return util.filterIndex(self.__items, test);
  };

  def.newItem = function(data)    {var self = this;
    var deferred = $q.defer();
    var doc = {};
    var relationshipsToLink = {};
    util.copyFields(data, doc, self.__fieldNames);
    doc.type = self.dbDocumentType;
    for (var alias in self.__parentRelationships) {
      var parentItem = data[alias];
      if (data[alias]) {
        doc[alias] = parentItem._id;
        relationshipsToLink[alias] = parentItem;
      }
    }
    self.__postAndLoad(doc).then(function (newItem) {
      for (var alias in relationshipsToLink) { 
        self.__parentRelationships[alias].linkNewlyLoadedChildToParent(newItem, parentItem);
      }
      deferred.resolve(newItem);
    });
    return deferred.promise;
  };

  def.saveItem = function(item)    {var self = this;
    var deferred = $q.defer();
    var doc = {};
    util.copyFields(item, doc, self.__fullFieldNames);
    doc.type = self.dbDocumentType;
    self.__db.put(doc).then(function (result) {
      item._rev = result.rev;
      deferred.resolve(item._rev);
    });
    return deferred.promise;
  };

  def.deleteItem = function(item)    {var self = this;
    var childDeletions = self.__relationships.map(function(relationship) {
      return relationship.respondToItemDeleted(item, self);
    });
    return $q.all(childDeletions).then(function() {
      self.__db.remove(item).then(function (result) {
        delete self.__items[item._id];
        util.removeFromArray(self.__itemsAsArray, item);
      }, util.promiseFailed);
    }, util.promiseFailed);
  };

  return Collection;
}]);

    
/*
  Left and right may be absent from register.
  Both registers will always be equal and complimentary:
  {
     p1: {items: [t6]}
     p2: {items: [t4, t6]}
  }
  {
     t6: {items: [p1, p2]},
     t4: {items: [p2]},
  }
*/
    
angular.module('SneakerJS').factory('ManyToManyRelationship', ["$q", "BaseContainer", "util", function($q, BaseContainer, util) {
  
  var ManyToManyRelationship = function(db, leftCollection, rightCollection, options)    {var self = this;
    var options = options || {};
    self.__rightCollection = rightCollection;
    self.__leftCollection = leftCollection;
    var defaultDbDocumentTypeName = ('lnk_' + leftCollection.itemName + '_' + rightCollection.itemName).toLowerCase();
    self.__functionNameEnd = '';
    if (options.qualifier) {
      self.__functionNameEnd = 'As' + util.capitalizeFirstLetter(options.qualifier);
      defaultDbDocumentTypeName += '_as_' + options.qualifier.toLowerCase();
    }
    self.dbDocumentType = options.dbDocumentType || defaultDbDocumentTypeName;
    self.name = self.dbDocumentType;
    self.__db = db;
    self.__leftCollection = leftCollection;
    self.__rightCollection = rightCollection;
    self.__leftRights = {};
    self.__rightLefts = {};
    self.__docsForReuse = [];
    rightCollection.registerManyToManyRelationship(self);
    leftCollection.registerManyToManyRelationship(self);
  };
  util.inheritPrototype(ManyToManyRelationship, BaseContainer);
  var def = ManyToManyRelationship.prototype;
  
  def.getAccessFunctionDefinitions = function()  {var self = this;
    var capitalize = util.capitalizeFirstLetter,
        buildFunc = util.createAccessFunctionDefinition,
        leftName = capitalize(self.__leftCollection.itemName),
        leftPlural = capitalize(self.__leftCollection.plural),
        rightName = capitalize(self.__rightCollection.itemName),
        rightPlural = capitalize(self.__rightCollection.plural),
        end = self.__functionNameEnd,
        getLeftRightsFnName = 'get' + leftName + rightPlural + end,
        getRightLeftsFnName = 'get' + rightName + leftPlural + end,
        addLeftRightFnName = 'add' + leftName + rightName + end,
        removeLeftRightFnName = 'remove' + leftName + rightName + end,
        isLeftLinkedToRightFnName = 'is' + leftName + 'LinkedTo' + rightName + end;
    return [
      buildFunc(getLeftRightsFnName, self.getLeftRights, false),
      buildFunc(getRightLeftsFnName, self.getRightLefts, false),
      buildFunc(addLeftRightFnName, self.addLink, true),
      buildFunc(removeLeftRightFnName, self.removeLink, true),
      buildFunc(isLeftLinkedToRightFnName, self.isLinked, false)
    ];
  };
  
  def.loadDocumentFromDb = function(doc)  {var self = this;
    if (doc.right && 
        doc.left && 
        self.__updateOneRegisterWithDocument(self.__leftRights, doc.left, doc.right, doc)
        ){
      self.__updateOneRegisterWithDocument(self.__rightLefts, doc.right, doc.left, doc);
      return true;
    } else {
      self.__sendDocumentToReusePile(doc);
      return false;
    }
  };
  
  def.__updateOneRegisterWithDocument = function(register, key, id, doc)  {var self = this;
    var entry = register[key];
    if (entry === undefined) {
      var docs = {};
      docs[id] = doc;
      register[key] = {docs: docs, items: []};
    } else {
      if (entry.docs[id]) {
        return false;
      }
      entry.docs[id] = doc;
    }
    return true;
  };
  
  def.getLeftRights = function (leftItem)  {var self = this;
    return self.__getInitialisedEntry(self.__leftRights, leftItem._id).items;
  };
  
  def.getRightLefts = function (rightItem)  {var self = this;
    return self.__getInitialisedEntry(self.__rightLefts, rightItem._id).items;
  };
  
  //TODO: assert they are of correct type?
  def.addLink = function (leftItem, rightItem)    {var self = this;
    if (self.isLinked(leftItem, rightItem)) {
      return $q.when();
    } else {
      var deferred = $q.defer();
      self.__writeLinkToDatabase(leftItem, rightItem).then(function(){
        //will have gone through loadDocumentFromDb succesfully.
        var leftEntry = self.__getInitialisedEntry(self.__leftRights, leftItem._id),
            rightEntry = self.__getInitialisedEntry(self.__rightLefts, rightItem._id);
        util.addUnique(leftEntry.items, rightItem);
        util.addUnique(rightEntry.items, leftItem);
        deferred.resolve()
      });
      return deferred.promise; 
    };
  };
  
  def.removeLink = function (leftItem, rightItem)    {var self = this;
    var leftEntry = self.__getInitialisedEntry(self.__leftRights, leftItem._id);
    var rightEntry = self.__getInitialisedEntry(self.__rightLefts, rightItem._id);
    var doc1 = self.__removeFromEntry(leftEntry, rightItem);
    var doc2 = self.__removeFromEntry(rightEntry, leftItem);
    if (doc1 !== doc2) {
      throw "This is strange..."
    }
    return self.__db.remove(doc1);
  };
  
  def.__removeFromEntry = function(entry, item)  {var self = this;
    var doc = entry.docs[item._id];
    util.removeFromArray(entry.items, item);
    delete entry.docs[item._id];
    return doc;
  }
   
  def.isLinked = function (leftItem, rightItem)  {var self = this;
    var leftEntry = self.__getInitialisedEntry(self.__leftRights, leftItem._id);
    return util.arrayContains(leftEntry.items, rightItem);
  };
  
  def.respondToItemDeleted = function (item, collection)     {var self = this;
    var opposites, itemIsFromRight;
    if (collection === self.__rightCollection) {
      itemIsFromRight = true;
      opposites = self.getRightLefts(item);
    } else if (collection === self.__leftCollection) {
      itemIsFromRight = false;
      opposites = self.getLeftRights(item);
    }
    opposites = opposites.slice();
    var operations = [];
    angular.forEach(opposites, function(oppositeItem) {
      if (itemIsFromRight) {
        var leftItem = oppositeItem;
        var rightItem = item;
      } else {
        var leftItem = item;
        var rightItem = oppositeItem;
      }
      operations.push(self.removeLink(leftItem, rightItem));
    });
    return $q.all(operations);
  };
  
  /*
  Should only be called if sure that items are not linked. Will reuse a document if one is available.
  */
  def.__writeLinkToDatabase = function(leftItem, rightItem)  {var self = this;
    var deferred = $q.defer(),
        doc = self.__docsForReuse.pop();
    function finish(succesfullyLoaded) {
      if (succesfullyLoaded) {
        deferred.resolve();
      } else {
        throw 'ManyToManyRelationship.__writeLinkToDatabase failed to load document. This should not have happened.'
      }
    }
    if (doc) {
      doc.left = leftItem._id;
      doc.right = rightItem._id;
      self.__db.put(doc).then(function (result) {
        doc._rev = result.rev;
        finish(self.loadDocumentFromDb(doc));        
      });
    } else {
      doc = {left: leftItem._id, right:rightItem._id};
      self.__postAndLoad(doc).then(function (result) {
        finish(result);
      });
    }
    return deferred.promise;
  };
  
  def.__sendDocumentToReusePile = function(doc)  {var self = this;
    self.__docsForReuse.push(doc);
  };
  
  def.__getInitialisedEntry = function (register, id)  {var self = this;
    var entry = register[id];
    if (entry === undefined) {
      entry = {docs: {}, items: []};
      register[id] = entry;
    } else {
      if (entry.items.length !== Object.keys(entry.docs).length) {
        var collection = (register === self.__leftRights)? self.__rightCollection : self.__leftCollection; 
        entry.items.length = 0;
        angular.forEach(entry.docs, function(doc, id) {
          //TODO: what if item doesn't exist?
          var item = collection.getItem(id);
          if (item) {
            entry.items.push(item);
          }
        });
      }
    }
    return entry;
  };
  
  return ManyToManyRelationship;
}]);

angular.module('SneakerJS').service('model', ["$q", "Collection", "ParentChildRelationship", "ManyToManyRelationship", function($q, Collection, ParentChildRelationship, ManyToManyRelationship) {

  var self = this,
      __db,
      __loadQuery,
      __containers = {},
      __dbDocumentTypeLoaders = {},
      __lastPromiseInQueue = $q.when(),
      __relationshipDefinitionFunctions = {};

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
      __dataReady = $q.defer();
      __initializeModel().then( function () {
        __dataReady.resolve();
      });
    }
    return __dataReady.promise;
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

  self.join = function(firstCollection, secondCollection, options){
    var options = options || {},
        container,
        relationshipType = options.type || 'parentChild';
    angular.forEach([firstCollection, secondCollection], function(name) {
      if (__containers[name] === undefined) {
        throw 'Failed to create join, container not found: "' + name + '" ';
      }
    });
    if (relationshipType === 'parentChild') {
      var parentCollection = __containers[firstCollection];
      var childCollection = __containers[secondCollection];
      container = new ParentChildRelationship(__db, parentCollection, childCollection, options);
    } else if (relationshipType === 'manyToMany') {
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
      throw 'Trying to create two containers with the same name: ' + name + ' on model but it already exists.';
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
    return __containers[item.type].saveItem(item);
  };

  self.deleteItem = function(item) {
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

  function __getQueuedFunction(container, containerFunction){
    return function() {
      var originalArgs = arguments;
      var deferred = $q.defer();
      __lastPromiseInQueue.then( function() {
        __lastPromiseInQueue = containerFunction.apply(container, originalArgs);
        __lastPromiseInQueue.then(function(result) {
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

  function __initializeModel(){
    var defer = $q.defer();
    var loadQuery = __loadQuery();
    loadQuery.then(function (result) {
      angular.forEach(result.rows, function(row){
        __addDocumentToCollection(row.doc);
      });
      __postInitialLoading();
      defer.resolve();
    }).catch(function (err) {
      console.log(err);
    });
    return defer.promise;
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

}]);



angular.module('SneakerJS').factory('ParentChildRelationship', ["$q", "BaseContainer", "ValueRegister", "util", function($q, BaseContainer, ValueRegister, util) {

  var ParentChildRelationship = function(db, parentCollection, childCollection, options)    {var self = this;
    var options = options || {};
    self.__db = db;
    self.__parentCollection = parentCollection;
    self.__childCollection = childCollection;
    self.__childAlias = options.childAlias || childCollection.plural;
    self.__parentAlias = options.parentAlias || parentCollection.itemName;
    self.__parentDeleteInProgress = new ValueRegister();
    self.__cascadeDelete = (options.cascadeDelete === undefined)? true : options.cascadeDelete;
    self.__itemParent = {};
    self.__itemChildren = {};
    self.name = 'relationship_' + childCollection.itemName + '_as_' + self.__childAlias + '_' +
          parentCollection.itemName + '_as_' + self.__parentAlias;
    self.foreignKey = 'fk__' + self.__parentAlias;
    parentCollection.registerChildRelationship(self);
    childCollection.registerParentRelationship(self, self.foreignKey, self.__parentAlias);
  };
  util.inheritPrototype(ParentChildRelationship, BaseContainer);
  var def = ParentChildRelationship.prototype;

  def.getAccessFunctionDefinitions = function()  {var self = this;
    var capitalize = util.capitalizeFirstLetter,
        buildFunc = util.createAccessFunctionDefinition,
        childName = capitalize(self.__childCollection.itemName),
        childAlias = capitalize(self.__childAlias),
        parentName = capitalize(self.__parentCollection.itemName),
        parentAlias = capitalize(self.__parentAlias);
    return [
      buildFunc('get' + childName + parentAlias, self.getParent, false),
      buildFunc('get' + parentName + childAlias, self.getChildren, false),
      buildFunc('set' + childName + parentAlias, self.setChildParent, true),
    ];
  };

  def.postInitialLoading = function()  {var self = this;
    var key = self.foreignKey;
    angular.forEach(self.__parentCollection.__items, function(parentItem) {
      self.__itemChildren[parentItem._id] = [];
    });
    angular.forEach(self.__childCollection.__items, function(childItem) {
      var parentId = childItem[key];
      if (parentId) {
        var parentItem = self.__parentCollection.getItem(parentId);
        self.linkNewlyLoadedChildToParent(childItem, parentItem, parentId);
      }
    });
  };
  
  def.linkNewlyLoadedChildToParent = function(childItem, parentItem, parentId)    {var self = this;
    var parentId = parentId || parentItem._id;
    self.__itemParent[childItem._id] = parentItem;
    var parentChildren = self.__itemChildren[parentId];
    if (parentChildren === undefined) {
      self.__itemChildren[parentId] = [childItem];
    } else {
      parentChildren.push(childItem);
    }
  };

  def.getParent = function (childItem)    {var self = this;
    return self.__itemParent[childItem._id] || null;
  };

  def.getChildren = function (parentItem)    {var self = this;
    return self.__itemChildren[parentItem._id] || [];
  };

  def.setChildParent = function (childItem, parentItem)    {var self = this;
    //TODO: assert they are of correct type?
    var oldParent = self.__itemParent[childItem._id];
    var parentItemId = parentItem? parentItem._id : null;
    if (oldParent) {
      util.removeFromArray(self.__itemChildren[oldParent._id], childItem);
    }
    if (parentItem) {
      if (self.__itemChildren[parentItem._id] === undefined) {
        self.__itemChildren[parentItem._id] = [childItem];
      } else {
        self.__itemChildren[parentItem._id].push(childItem);
      }
    }
    self.__itemParent[childItem._id] = parentItem;
    childItem[self.foreignKey] = parentItemId;
    return self.__childCollection.saveItem(childItem);
  };

  def.respondToItemDeleted = function (item, collection)     {var self = this;
    if (collection === self.__parentCollection) {
      return self.__respondToParentDeleted(item);
    } else if (collection === self.__childCollection) {
      return self.__respondToChildDeleted(item);
    }
  };

  def.__respondToParentDeleted = function (parentItem)     {var self = this;
    var action = (self.__cascadeDelete)?
        function(childItem) {return self.__childCollection.deleteItem(childItem)} :
        function(childItem) {return self.setChildParent(childItem, null)};
    var children = self.getChildren(parentItem).slice(); //slice() is imortant!
    return $q.all(children.map(action)).then(function() {
      delete self.__itemChildren[parentItem._id];
      return $q.when(true);
    }, util.promiseFailed);
  };

  def.__respondToChildDeleted = function (childItem)     {var self = this;
    var parentItem = self.getParent(childItem);
    if (parentItem) {
      util.removeFromArray(self.__itemChildren[parentItem._id], childItem);
    }
    delete self.__itemParent[childItem._id];
    return $q.when(true);
  };

  return ParentChildRelationship;
}]);


angular.module('SneakerJS').factory('QueuedResponseDb', ["$q", "ValueRegister", function($q, ValueRegister) {
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
}]);



angular.module('SneakerJS').service('util', ["$q", function($q) {
  var self = this;

  self.capitalizeFirstLetter = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  self.createAccessFunctionDefinition = function(name, fn, queuedPromise) {
    return {
      ModelFunctionName: name,
      containerFunction: fn,
      queuedPromise: queuedPromise
    }
  };

  self.arrayContains = function(myArray, item) {
    for (var i = 0, len = myArray.length; i < len; i++) {
      if (item === myArray[i]) {
        return true;
      }
    }
    return false;
  };

  self.addUnique = function(myArray, item) {
    if(!self.arrayContains(myArray, item)){
      myArray.push(item);
    }
  }

  self.addAsItem = function(object, key, item) {
    //Where object[key] = [items...]
    if (object[key] === undefined) {
      object[key] = [item];
    } else {
      object[key].push(item);
    }
  };

  self.removeFromArray = function(myArray, item) {
    var index = myArray.indexOf(item);
    if (index > -1) {
      myArray.splice(index, 1);
    }
  };

  self.filterIndex = function(index, test) {
    //accepts an object like array.
    var filteredItems = [];
    angular.forEach(index, function(item) {
      if (test(item)) {
        filteredItems.push(item);
      }
    });
    return filteredItems;
  };

  self.inheritPrototype = function(Child, Parent) {
    var childProto = Child.prototype;
    var parentProto = Parent.prototype;
    for (var prop in parentProto) {
      if (typeof parentProto[prop] == 'function') {
        childProto[prop] = parentProto[prop];
      }
    }
  };

  self.copyFields = function(source, target, fields) {
    angular.forEach(fields, function(field) {
      target[field] = source[field];
    });
  };

  self.promiseFailed = function(error) {
    console.log('Promise failed!');
    console.log(error);
  }

}]);


angular.module('SneakerJS').factory('ValueRegister', function() {
  //
  var ValueRegister = function() {
    this._register = {};
  };
  ValueRegister.prototype.set = function(key, value) {
    this._register[key] = value;
  };
  ValueRegister.prototype.get = function(key) {
    return this._register[key];
  };
  
  return ValueRegister;
});
