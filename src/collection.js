
angular.module('Relate').factory('Collection', function(util, $q, BaseContainer) {

  var Collection = function(db, singleItemName, fieldNames, options)    {var self = this;
    var options = options || {};
    self.itemName = singleItemName;
    self.name = singleItemName; //This is how a relationship references collection
    self.plural = options.plural || singleItemName + 's'
    self.dbDocumentType = options.dbDocumentType || singleItemName;
    self.__db = db;
    self.__constructorFunction = options.constructorFunction || function(){};
    self.__items = {};
    self.__relationships = [];
    self.__fieldNames = fieldNames.slice();
    self.__fullFieldNames = fieldNames.slice();
    self.__fullFieldNames.push('_id');
    self.__fullFieldNames.push('_rev');
  };
  util.inheritPrototype(Collection, BaseContainer);
  var def = Collection.prototype;

  def.registerRelationship = function(relationship, fieldName)    {var self = this;
    self.__relationships.push(relationship);
    if (fieldName) {
      self.__fullFieldNames.push(fieldName);
    }
  };

  def.loadDocumentFromDb = function(doc)    {var self = this;
    var item = new self.__constructorFunction();
    util.copyFields(doc, item, self.__fullFieldNames);
    item.type = self.itemName;
    self.__items[doc._id] = item;
    return item;
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
    return Object.keys(self.__items).map(function(i){
      return self.__items[i];
    });
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
    if (data === undefined) {
      throw 'newItem expects an object as its first argument.'
    }
    var deferred = $q.defer();
    var doc = {};
    util.copyFields(data, doc, self.__fieldNames);
    doc.type = self.dbDocumentType;
    self.__postAndLoad(doc).then(function (newItem) {
      //TODO: link relationships...
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
      }, util.promiseFailed);
    }, util.promiseFailed);
  };

  return Collection;
});
