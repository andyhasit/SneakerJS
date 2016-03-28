
angular.module('SneakerJS').factory('SnjsBaseContainer', function($q) {
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
});