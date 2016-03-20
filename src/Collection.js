
angular.module('SneakerJS').factory('Collection', function(util, $q, BaseContainer) {

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

  return Collection;
});
