


angular.module('Relate').service('util', function($q) {
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

});
