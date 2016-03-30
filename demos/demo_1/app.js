/*
Demo showing how to use SneakerJS
*/

var app = angular.module('app', ['SneakerJS']);

app.service('db', function(SneakerModel) {
  /*
  First create an instance of PouchDB.
  This stores your data to a local database in your browser.
  Note that you could also set up automatic replication to a CouchDB instance:
    backend.replicate.to('http://example.com/mydb');
  Or point PouchDB directly to a CouchDB url:
    var backend = new PouchDB('http://127.0.0.1:5984/sneakerjs_demo_1');
  */
  var backend = new PouchDB('sneakerjs_demo_1');
  /*
  "db" is a service in the SneakerJS module, which we injected above.
  It is the only object you interact with
  */
  SneakerModel.call(this, backend);
  var db = this;

  /*
  (This step is entirely optional)
  Create a prototype which we pass when defining the a collection, so that
  all instances in that collection will be created using the "new" keyword
  and inherit the prototype.
  */
  var Person = function() {};
  Person.prototype.howManyCats = function() {
    var catCount = db.getPersonCats(this).length;
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
  db.collection('cat', ['name']);
  db.collection('dog', ['name']);
  db.collection('person', ['name'], {
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
  db.oneToMany('person', 'dog', {parentAlias: 'owner'});
  db.manyToMany('person', 'cat', {
    qualifier: 'owner'
  });
  db.manyToMany('person', 'cat', {
    qualifier: 'friend'
  });

  /*
  Here we print out a list of all the functions SneakerJS has generated on the
  db object to the console. Hit F12 in your browser and have a look!
  */
  db.printInfo();

  /*
  You should see something like this:

      db.newCat
      db.getCat
      db.findCats
      db.allCats
      db.newDog
      db.getDog
      db.findDogs
      db.allDogs
      db.newPerson
      db.getPerson
      db.findPeople
      db.allPeople
      db.getDogOwner
      db.getPersonDogs
      db.setDogOwner
      db.getPersonCatsAsOwner
      db.getCatPeopleAsOwner
      db.addPersonCatAsOwner
      db.removePersonCatAsOwner
      db.isPersonLinkedToCatAsOwner
      db.getPersonCatsAsFriend
      db.getCatPeopleAsFriend
      db.addPersonCatAsFriend
      db.removePersonCatAsFriend
      db.isPersonLinkedToCatAsFriend

  And that is it!!!

  You can now call the custom functions like:

    db.newPerson({name: 'Alice'})  // This returns a promise, because it has to save to the db
    db.deleteItem(person)          // As does this
    db.saveItem(cat)               // And any other call that makes changes to the db
    db.setCatOwner(cat)            // Including setting relationships
    db.getPersonCats(person)       // But this doesn't. It just returns a list of cats right away.
    db.findCats({color: 'black'})  // As does this (note: you could also pass it a function)

  All the relationships are mapped bi-directionally in memory making cross
  join queries orders of magnitude faster than map-reduce.

  This means you can design your application data in a relational manner which
  feels natural.

  Have a look at the controller to see the generated functions in action.
  */
});

app.controller('Ctrl', function($scope, db) {
  $scope.newPersonName = '';
  $scope.newCatName = '';

  /*
  Here we call db.dataReady() which loads all the data from PouchDb using
  allDocs, or the query function.
  It returns a promise which lets you know when the data is loaded. Subsequent
  calls have no side-effects and will simply resolve.

  Putting this in all of your controllers ensures that what you bind to the scope
  actually exists.

  In our scenario we have just bound the db service to a scope variable,
  meaning we can call the collection functions directly from the HTML.

  See index.html
  */

  db.dataReady().then(function() {
    $scope.db = db;
  });

});
