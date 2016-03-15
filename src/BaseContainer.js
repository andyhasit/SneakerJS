
angular.module('Relate').factory('BaseContainer', function($q) {
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
});