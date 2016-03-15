/*
Andrew Buchan - 21/02/2016
--------------------------

Sneaker brings even more magic to your AngularJS + PouchDB/CouchDB apps.

Just define your model (collections + relationships) and Sneaker will:

  a) Generate functions named after your model elements, which lets you write cleaner, more readable code with less effort.
  b) Persist your data whithout you having to decide how to structure the db (you still can do it entirely your way).
  c) Map all relationships bi-directionally in memory, meaning your model can have 12's of joins, yet run like greased lightning!

This mini demo shows how easily you can tap into the power of Sneaker.

For a more involved example, including wrapping other backends, see the complex demo.
*/

var app = angular.module('app', ['Relate']);

app.run(function(model) {
  /*
  Let's create an instance of PouchDB. This one stores your data to a local database.
  You could equally point this to a CouchDB server URL, or set up
  two way synchronising between your local database and a remote one etc...
  */
  var db = new PouchDB('http://127.0.0.1:5984/kittens_demo');
  
  // model is a service in the Relate module, which we injected above.
  // model is the only object you interact with, and all the functions are at top level.
  model.initialize(db);
  
  // Entirely optional, but you can pass a constructor to pass to the collection
  var Person = function() {};
  Person.prototype.getInfo = function() {
    var catCount = model.getPersonCats(this).length;
    'My name is ' + this.name + ' and I have ' + catCount + ' cats.';
  };
  
  // Now let's define two collections:
  model.collection('cat', ['name', 'color']);   
  model.collection('person', ['name', 'age'], {
    plural:'people',       // optional - just changes findPersons() to findPeople()...
    constructor: Person,   // optional - every item will be initialized with "new Person()"
  });
  //model.printInfo();
  
  // And the relationship between them:
  model.join('person', 'cat', {parentAlias: 'owner'});
  
  /*
  And that is it!!!
  
  You can now call the custom functions like:
  
    model.newPerson({name: 'Alice', age: 9})  // This returns a promise, because it has to save to the db
    model.deleteItem(person)                      // As does this
    model.saveItem(cat)                           // And any other call that makes changes to the db
    model.setCatOwner(cat)                    // Including setting relationships
    model.getPersonCats(person)               // But this doesn't. It just returns a list of cats right away.
    model.findCats({color: 'black'})          // As does this (note: you could also pass it a function)
  
  All the relationships are mapped bi-directionally in memory (but persisted uni-directionally in the db).
  
  This means you can design your application data in a truly relational manner (which a lot of 
  people find easier to work with) except with less constraints, and lightening fast joins!
  
  For a more involved example including many to many relationships, check out the complex demo.
  
  In the meantime, have a look at the controller to see just how fun it is working with the generated functions.
  */
});


app.controller('Ctrl', function($scope, model) {
  /* model.dataReady() returns a promise which resolves once the data is fully loaded. 
  Subsequent calls have no side-effects.
  Putting this in all of your controllers ensures that what you bind to the scope actually exists.
  */
  model.dataReady().then(function() {
    $scope.model = model;
    $scope.data = {
      cats: model.allCats,
      people: model.allPeople
    };
    $scope.getPersonCats = model.getPersonCats;
    /*
    if ($scope.people.length > 0) {
      $scope.data.linkPerson = $scope.people[0];
    }
    if ($scope.cats.length > 0) {
      $scope.data.linkCat = $scope.cats[0];
    }*/
  });
  
  $scope.newPerson = function() {
    model.newPerson({name: $scope.newPersonName});
  };
  
  $scope.getPersonInfo = function(person) {
    alert(person.getInfo());
  };
  
  $scope.newCat = function() {
    model.newCat({name: $scope.newCatName});
  };
  
  $scope.linkCatToPerson = function() {
    c.log($scope.data.linkCat);
    c.log($scope.data.linkPerson);
    model.setCatOwner($scope.data.linkCat, $scope.data.linkPerson);
  };
  
  $scope.unlinkCatFromPerson = function(cat) {
    model.setCatOwner(cat, null);
  };
  
});