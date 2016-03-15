function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/*
  Synchronously creates an item, to make writing tests cleaner.
  Requires model and $rootScope to be global, which isn't a problem in a test environment.
*/
function newItem(type, data){
  var item, data = data || {};
  model['new' + capitalizeFirstLetter(type)](data).then(function(result) {
    item = result;
  });
  flush();
  return item;
}

function flush() {
  $rootScope.$apply();
}

pretty = function(obj) {
  console.log(JSON.stringify(obj, null, 2));
};

angular.module('PouchFake', []).factory('FakeDb', function($q) {

  var FakeDb = function()  {var self = this;
    self.__docs = {};
    self.__idBank = {};
  };
  var def = FakeDb.prototype;

  def.__newId = function(type)  {var self = this;
    if (self.__idBank[type] === undefined) {
      self.__idBank[type] = 0;
    }
    self.__idBank[type] ++;
    return type + '_' + self.__idBank[type];
  }

  def.setData = function(type, fields, rows) {var self = this;
    if (fields.indexOf('_id') >= 0) {
      throw "Don't specify the id field, as new objects well seed at 1 and you may get clashes"
    }
    angular.forEach(rows, function(row) {
      doc = {};
      angular.forEach(fields, function(field, key) {
        doc[field] = row[key];
      });
      id = self.__newId(type);
      doc.type = type;
      doc._id = id;
      doc._rev = "1-" + id;
      self.__docs[id] = doc;
    });
  };

  def.post = function(data) {var self = this;
    var doc = angular.copy(data);
    var id = data._id || self.__newId(doc.type);
    doc._id = id;
    doc._rev = "1-" + id;
    self.__docs[id] = doc;
    return $q.when({
          "ok": true,
          "id": doc._id,
          "rev": doc._rev
        }
    );
  };

  def.extractRev = function(str) {
    return parseInt(str.substr(0, str.indexOf('-')));
  }

  def.put = function(data) {var self = this;
    //c.log('DB PUT');
    //c.log(data);
    var doc = angular.copy(data);
    var id = doc._id;
    var newRev = self.extractRev(doc._rev) + 1 + "-" + id;
    doc._rev = newRev;
    self.__docs[id] = doc;
    return $q.when({
          "ok": true,
          "id": doc._id,
          "rev": doc._rev
        }
    );
  };

  def.put_clone = function(data) {var self = this;
    var doc = angular.copy(data);
    var id = doc._id;
    var newRev = self.extractRev(doc._rev) + 1 + "-" + id;
    doc._rev = newRev;
    self.__docs[id] = doc;
    return $q.when({
          "ok": true,
          "id": doc._id,
          "rev": doc._rev
        }
    );
  };

  def.remove = function(data) {var self = this;
    var doc = angular.copy(data);
    var id = doc._id;
    var newRev = "2-" + id;
    doc._rev = newRev;
    doc._deleted = true;
    delete self.__docs[id];
    return $q.when({
          "ok": true,
          "id": doc._id,
          "rev": doc._rev
        }
    );
  };

  def.get = function(id) {var self = this;
    return $q.when(self.__docs[id]);
  };

  def.allDocs = function(id) {var self = this;
    var doc,
        rows =  Object.keys(self.__docs).map(function(key) {
          doc = self.__docs[key];
          return {id: doc._id, doc: doc};
        }),
        data = {
          "offset": 0,
          "total_rows": 1,
          "rows": rows
        };
    return $q.when(data);
  };

  /*
  exampleData = {
    "offset": 0,
    "total_rows": 1,
    "rows": [{
      "doc": {
        "_id": "0B3358C1-BA4B-4186-8795-9024203EB7DD",
        "_rev": "1-5782E71F1E4BF698FA3793D9D5A96393",
        "title": "Sound and Vision",
        "_attachments": {
          "attachment/its-id": {
            "content_type": "image/jpg",
            "data": "R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
            "digest": "md5-57e396baedfe1a034590339082b9abce"
          }
        }
      },
     "id": "0B3358C1-BA4B-4186-8795-9024203EB7DD",
     "key": "0B3358C1-BA4B-4186-8795-9024203EB7DD",
     "value": {
      "rev": "1-5782E71F1E4BF698FA3793D9D5A96393"
     }
   }]
  };
  */

  return FakeDb;
});

