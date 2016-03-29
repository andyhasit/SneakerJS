
angular.module('SneakerJS').factory('SnjsBaseContainer', ["$q", function($q) {
  /*
  A collection has an internal index of the objects in the database.
  What it uses as keys and values is up to the derived class.
  */
  var SnjsBaseContainer = function()    {var self = this;
    self.__db = null;
  };
  var def = SnjsBaseContainer.prototype;
  
  def.postInitialLoading = function() {
    //override if container needs to do any post loading operations
  };
  
  def.clear = function() {
    //must implement to clear items
  }
  
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
  
  return SnjsBaseContainer;
}]);

angular.module('SneakerJS').factory('SnjsCollection', ["SnjsUtil", "$q", "SnjsBaseContainer", function(SnjsUtil, $q, SnjsBaseContainer) {
  
  var util = SnjsUtil;
  var SnjsCollection = function(db, singleItemName, fieldNames, options)    {var self = this;
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
  util.inheritPrototype(SnjsCollection, SnjsBaseContainer);
  var def = SnjsCollection.prototype;

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

  def.clear = function() {var self = this;
    self.__items = {};
    self.__itemsAsArray = [];
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
    var doc = {};
    var relationshipsToLink = {};
    util.copyFields(data, doc, self.__fieldNames);
    doc.type = self.dbDocumentType;
    for (var alias in self.__parentRelationships) {
      var parentItem = data[alias];
      var foreignKey = self.__parentRelationships[alias].foreignKey;
      if (data[alias]) {
        doc[foreignKey] = parentItem._id;
        relationshipsToLink[alias] = parentItem;
      }
    }
    return self.__postAndLoad(doc).then(function (newItem) {
      for (var alias in relationshipsToLink) {
        self.__parentRelationships[alias].linkNewlyLoadedChildToParent(newItem, parentItem);
      }
      return newItem;
    });
  };

  def.saveItem = function(item)    {var self = this;
    var doc = {};
    util.copyFields(item, doc, self.__fullFieldNames);
    doc.type = self.dbDocumentType;
    return self.__db.put(doc).then(function (result) {
      item._rev = result.rev;
      return item._rev;
    });
  };

  def.deleteItem = function(item)    {var self = this;
    var childDeletions = self.__relationships.map(function(relationship) {
      return relationship.respondToItemDeleted(item, self);
    });
    return $q.all(childDeletions).then(function() {
      return self.__db.remove(item).then(function (result) {
        delete self.__items[item._id];
        util.removeFromArray(self.__itemsAsArray, item);
      });
    });
  };

  return SnjsCollection;
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
    
angular.module('SneakerJS').factory('SnjsManyToManyRelationship', ["$q", "SnjsBaseContainer", "SnjsUtil", function($q, SnjsBaseContainer, SnjsUtil) {
  
  var util = SnjsUtil;
  var SnjsManyToManyRelationship = function(db, leftCollection, rightCollection, options)    {var self = this;
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
  util.inheritPrototype(SnjsManyToManyRelationship, SnjsBaseContainer);
  var def = SnjsManyToManyRelationship.prototype;
  
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
  
  def.clear = function() {var self = this;
    self.__leftRights = {};
    self.__rightLefts = {};
    self.__docsForReuse = [];
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
      return self.__writeLinkToDatabase(leftItem, rightItem).then(function(){
        //will have gone through loadDocumentFromDb succesfully.
        var leftEntry = self.__getInitialisedEntry(self.__leftRights, leftItem._id),
            rightEntry = self.__getInitialisedEntry(self.__rightLefts, rightItem._id);
        util.addUnique(leftEntry.items, rightItem);
        util.addUnique(rightEntry.items, leftItem);
      });
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
  //TODO: tidy this mess not to have var deferred = $q.defer()
  def.__writeLinkToDatabase = function(leftItem, rightItem)  {var self = this;
    var deferred = $q.defer(),
        doc = self.__docsForReuse.pop();
    function finish(succesfullyLoaded) {
      if (succesfullyLoaded) {
        deferred.resolve();
      } else {
        throw 'SnjsManyToManyRelationship.__writeLinkToDatabase failed to load document. This should not have happened.'
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
      doc = {left: leftItem._id, right:rightItem._id, type:self.dbDocumentType};
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
  
  return SnjsManyToManyRelationship;
}]);

angular.module('SneakerJS').factory('SneakerModel', ["$q", "SnjsCollection", "SnjsSingleton", "SnjsParentChildRelationship", "SnjsManyToManyRelationship", function($q, SnjsCollection, 
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
          console.log('model.' + accessFunc.ModelFunctionName);
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

    self.join = function(firstCollection, secondCollection, options) {
      var options = options || {};
      var container;
      var relationshipType = options.type || 'parentChild';
      angular.forEach([firstCollection, secondCollection], function(name) {
        if (self.__containers[name] === undefined) {
          throw 'Failed to create join, container not found: "' + name + '" ';
        }
      });
      if (relationshipType === 'parentChild') {
        var parentCollection = self.__containers[firstCollection];
        var childCollection = self.__containers[secondCollection];
        container = new SnjsParentChildRelationship(self.__db, parentCollection, childCollection, options);
      } else if (relationshipType.toLowerCase() === 'many-to-many') {
        var leftCollection = self.__containers[firstCollection];
        var rightCollection = self.__containers[secondCollection];
        container = new SnjsManyToManyRelationship(self.__db, leftCollection, rightCollection, options);
      } else {
        throw '"' + relationshipType + '" is not a valid relationship type';
      }
      return self.__registerContainer(container);
    };
    
    self.parentChild = function(parentCollectionName, childCollectionName, options) {
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
  
}]);

angular.module('SneakerJS').factory('SnjsParentChildRelationship', ["$q", "SnjsBaseContainer", "SnjsUtil", function($q, SnjsBaseContainer, SnjsUtil) {

  var util = SnjsUtil;
  var SnjsParentChildRelationship = function(db, parentCollection, childCollection, options)    {var self = this;
    var options = options || {};
    self.__db = db;
    self.__parentCollection = parentCollection;
    self.__childCollection = childCollection;
    self.__childAlias = options.childAlias || childCollection.plural;
    self.__parentAlias = options.parentAlias || parentCollection.itemName;
    self.__cascadeDelete = (options.cascadeDelete === undefined)? true : options.cascadeDelete;
    self.__itemParent = {};
    self.__itemChildren = {};
    self.name = 'relationship_' + childCollection.itemName + '_as_' + self.__childAlias + '_' +
          parentCollection.itemName + '_as_' + self.__parentAlias;
    self.foreignKey = 'fk__' + self.__parentAlias;
    parentCollection.registerChildRelationship(self);
    childCollection.registerParentRelationship(self, self.foreignKey, self.__parentAlias);
  };
  util.inheritPrototype(SnjsParentChildRelationship, SnjsBaseContainer);
  var def = SnjsParentChildRelationship.prototype;

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
  
  def.clear = function() {var self = this;
    self.__itemParent = {};
    self.__itemChildren = {};
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

  return SnjsParentChildRelationship;
}]);


angular.module('SneakerJS').factory('SnjsSingleton', ["SnjsUtil", "SnjsBaseContainer", function(SnjsUtil, SnjsBaseContainer) {
  
  var util = SnjsUtil;
  var SnjsSingleton = function(db, name)    {var self = this;
    self.name = name;
    self.dbDocumentType = 'singleton__' + name;
    self.__db = db;
    self.__doc = null;
  };
  util.inheritPrototype(SnjsSingleton, SnjsBaseContainer);
  var def = SnjsSingleton.prototype;
  
  def.loadDocumentFromDb = function(doc)    {var self = this;
    if (self.__doc !== null) {
      throw 'found singleton of type ' + self.name + ' more than once in db';
    }
    if (doc._id !== self.dbDocumentType) {
      throw 'Expected singleton type ' + self.name + ' to have _id: ' + self.dbDocumentType;
    }
    self.__doc = doc;
    return self.__doc.data;
  };
  
  def.clear = function() {var self = this;
    self.__doc = null;
  };

  def.getAccessFunctionDefinitions = function()    {var self = this;
    return [
      util.createAccessFunctionDefinition('get' + util.capitalizeFirstLetter(self.name), self.getData, false),
      util.createAccessFunctionDefinition('set' + util.capitalizeFirstLetter(self.name), self.setData, false)
    ]
  };
  
  def.getData = function() {var self = this;
    return (self.__doc)? self.__doc.data : {};
  };
  
  def.setData = function(data) {var self = this;
    if (!self.__doc){
      self.__doc = {
        type: self.dbDocumentType,
        _id: self.dbDocumentType,
        data: {}
      }
    }
    angular.copy(data, self.__doc.data);
    return self.__db.put(self.__doc).then(function (result) {
      self.__doc._rev = result.rev;
      return result.rev;
    });
  };
  
  return SnjsSingleton; 
}]);

angular.module('SneakerJS').service('SnjsUtil', ["$q", function($q) {
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
