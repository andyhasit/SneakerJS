
angular.module('Relate').factory('ValueRegister', function() {
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
