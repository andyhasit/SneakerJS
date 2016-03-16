
angular.module('SneakerJS').factory('ParentChildRelationship', function($q, BaseContainer, util) {

  var ParentChildRelationship = function(db, parentCollection, childCollection, options)    {var self = this;
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
});
