# SneakerJS

Sneaker brings even more magic to your AngularJS + PouchDB/CouchDB apps.

Just define your model (collections + relationships) and Sneaker will:

  - Generate intuitively named functions which lets you write cleaner, more readable code with less effort.
  - Persist your data in a logical structure to PouchDB/CouchDB (but you can bypass this and work with any backend)
  - Map all relationships bi-directionally in memory, meaning your model can have 12's of joins, yet run like greased lightning!

Here's how you define models:

    app = angular.module('myApp', ['Sneaker']);
    
    app.run(function(model) {
      var db = new PouchDB('http://localhost:5984/kittens');
      model.initialize(db);
      
      model.collection('person', ['name', 'age']);
      model.collection('cat', ['name', 'colour']);
      model.collection('category', ['name'], {plural: 'categories'});
      model.join('person', 'cat');
      model.join('cat', 'category', {type: 'manyToMany'});
    });
    
Here's the functions you get to play with:

    app.controller('Ctrl', function(model) {   
  
      model.newPerson({name: 'Alice', age: 9})  // This returns a promise, because it has to save to the db
      model.deleteItem(person)                  // As does this.
      model.saveItem(cat)                       // And any other call that makes changes to the db
      model.setCatOwner(cat)                    // Including setting relationships
      
      model.getPersonCats(person)               // But this doesn't. It just returns a list of cats right away.
      model.findCats({color: 'black'})          // As does this (note: you could also pass it a function)
  
      model.addCatCategory(category, cat)       // Many to many relationships
      model.getCategoryCats(category)           // work as you'd expect
      model.getCatCategories(cat)               // Note the spelling, because we specified {plural: 'categories'}) above.
      model.removeCatCategory(category, cat)
      
    });

Still in development, source code coming soon.
