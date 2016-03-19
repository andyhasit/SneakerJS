/*
Andrew Buchan - 19/0/2016
--------------------------
This mini demo shows how to use SneakerJS as at version 0.2.1

Note: demo is currently broken as I can't resolve an issue with $scope.$digest.

*/

var app = angular.module('app', ['SneakerJS']);

app.run(function(model) {
  /*
  First create an instance of PouchDB.
  This stores your data to a local database in your browser.
  */
  var db = new PouchDB('sneakerjs_demo_1');
  /*
  Note that you could also set up automatic replication to a CouchDB instance:
    db.replicate.to('http://example.com/mydb');
  Or point PouchDB directly to a CouchDB url:
    var db = new PouchDB('http://127.0.0.1:5984/sneakerjs_demo_1');
  */

  /*
  "model" is a service in the SneakerJS module, which we injected above.
  It is the only object you interact with
  */
  model.initialize(db);

  /*
  (This step is entirely optional)
  Create a prototype which we pass when defining the a collection, so that
  all instances in that collection will be created using the "new" keyword
  and inherit the prototype.
  */
  var Person = function() {};
  Person.prototype.howManyCats = function() {
    var catCount = model.getPersonCats(this).length;
    'My name is ' + this.name + ' and I have ' + catCount + ' cats.';
  };

  /*
  Here we define our collections.
  The first argument is the collection name.
  The second argument is an array of fields.
  The third argument is an optional set of options, where you can define the prototype
  to use, and change the plural name used for generating functions.
  Only those fields will be saved to the db. Do not start field names with underscores
  PouchDb doesn't like that.
  All items get an _id and _rev field added automatically.
  */
  model.collection('cat', ['name']);
  model.collection('dog', ['name']);
  model.collection('person', ['name'], {
    plural: 'people', // Means we get findPeople() instead of findPersons()
    proto: Person,   // Means every item will be initialized with "new Person()"
  });

  /*
  Here we define relationships between our collections.
  The first argument is the parent collection name.
  The second argument is the child collection name.
  The third is an optional set of options, where you can:
    specify that it is a many-to-many collection.
    change the parent or child alias
    set the qualifer for many-to-many relationships
  For many-to-many relationships, both collections are treated equally, the order
  which you pass them as arguments only affects the name of some of the methods
  that are generated.
  The "qualifer" allows you to have multiple many-to-many relationships between
  two collections.
  E.g. In our world a cat has many owners, so that's a many-to-many between the
  person and the cat collections. But a cat also has human friendts, so that's
  another many-to-many between those. The qualifier (owner or friend) keeps
  those separate.
  Similarly if you want more than one parent-child relationships, modify the
  the parent or child aliases.
  */
  model.join('person', 'dog', {parentAlias: 'owner'});
  model.join('person', 'cat', {
    type:'many-to-many',
    qualifier: 'owner'
  });
  model.join('person', 'cat', {
    type:'many-to-many',
    qualifier: 'friend'
  });

  /*
  Here we print out a list of all the functions SneakerJS has generated on the
  model object to the console. Hit F12 in your browser and have a look!
  */
  model.printInfo();

  /*
  You should see something like this:

      model.newCat
      model.getCat
      model.findCats
      model.allCats
      model.newDog
      model.getDog
      model.findDogs
      model.allDogs
      model.newPerson
      model.getPerson
      model.findPeople
      model.allPeople
      model.getDogOwner
      model.getPersonDogs
      model.setDogOwner
      model.getPersonCatsAsOwner
      model.getCatPeopleAsOwner
      model.addPersonCatAsOwner
      model.removePersonCatAsOwner
      model.isPersonLinkedToCatAsOwner
      model.getPersonCatsAsFriend
      model.getCatPeopleAsFriend
      model.addPersonCatAsFriend
      model.removePersonCatAsFriend
      model.isPersonLinkedToCatAsFriend

  And that is it!!!

  You can now call the custom functions like:

    model.newPerson({name: 'Alice'})  // This returns a promise, because it has to save to the db
    model.deleteItem(person)          // As does this
    model.saveItem(cat)               // And any other call that makes changes to the db
    model.setCatOwner(cat)            // Including setting relationships
    model.getPersonCats(person)       // But this doesn't. It just returns a list of cats right away.
    model.findCats({color: 'black'})  // As does this (note: you could also pass it a function)

  All the relationships are mapped bi-directionally in memory making cross
  join queries orders of magnitude faster than map-reduce.

  This means you can design your application data in a relational manner which
  feels natural.

  Have a look at the controller to see the generated functions in action.
  */
});

function safeApply(scope, fn) {
    (scope.$$phase || scope.$root.$$phase) ? fn() : scope.$apply(fn);
}

app.controller('Ctrl', function($scope, $timeout, model) {
  $scope.newPersonName = '';
  $scope.newCatName = '';

  /*
  Here we call model.dataReady() which loads all the data from PouchDb using
  allDocs, or the query function.
  It returns a promise which lets you know when the data is loaded. Subsequent
  calls have no side-effects and will simply resolve.

  Putting this in all of your controllers ensures that what you bind to the scope
  actually exists.
  You will need to call $scope.$digest();

  In our scenario we have just bound the model service to a scope variable,
  meaning we can call the collection functions directly from the HTML.

  See index.html
  */

  model.dataReady().then(function() {
    $scope.model = model;
    $scope.$digest();
  });

  $scope.deleteItem = function(item) {
     model.deleteItem(item).then(function() {
       /*
       Attempts to get apply working have failed.
       $timeout(function(){
         $scope.$apply()
       });
       */
     });
  };

  $scope.getPersonInfo = function(person) {
    alert(person.getInfo());
  };

});
