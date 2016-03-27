
angular.module('SneakerJS', []);

angular.module('SneakerJS').service('SneakerInitialize', function($q, SneakerModel) {
  return function(target, dbWrapper, initialLoadQuery) {
    SneakerModel.apply(target, [dbWrapper, initialLoadQuery]);
    return target;
  }
});