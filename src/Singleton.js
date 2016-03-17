
angular.module('SneakerJS').factory('Singleton', function(util, BaseContainer) {

  var Singleton = function(db, name)    {var self = this;
    self.name = name;
    self.dbDocumentType = 'singleton__' + name;
    self.__db = db;
    self.__doc = null;
  };
  util.inheritPrototype(Singleton, BaseContainer);
  var def = Singleton.prototype;
  
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
  
  return Singleton; 
});