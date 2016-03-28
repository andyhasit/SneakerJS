<p align="center">
<img src="logo.gif" width="300">
</p>

# SneakerJS

Entity relationship automation for AngularJS.

# What does it do?

You define collections and the relationships between them. Like so:

    /*
    Our shopping app has customers
    Each customer has multiple orders
    Each order has multiple items
    */
    db.collection('customer', ['name', 'email'])
    db.collection('order', ['value', 'status'])
    db.collection('item', ['description', 'price'])
    /*
    The default join is read as parent > child
    We can do a lot more than this, such as assign prototypes, many-to-many, and aliases.
    */
    db.join('customer', 'order')
    db.join('order', 'item')
    
    
SneakerJS will then:

##### 1 Generate cleverly named functions

Some of the functions SneakerJS will generate given the above definitions:

    db.getCustomer(<id>)
    db.newCustomer({name: 'joe', email: 'joe@joe.com'})
    db.newOrder({value: 100, customer: <customer>})
    db.findOrders(<function>)      
    db.getCustomerOrders(<customer>)   //Returns all the customer's orders
    db.deleteCustomer(<customer>)      //Deletes customer's orders and items too.
    db.getItemOrder(<shipment>)
    db.getOrderItems(<order>)

This makes writing your app very intuitive and fast.

##### 2 Save changes to your data

Those functions save any changes to the database, and removes the need for you to set up extra fields just to store joins, or extra collections just for many-to-many joins.

SneakerJS works out of the box with [PouchDB](https://pouchdb.com/) (Which can connect to [CouchDB](http://couchdb.apache.org/)) but you can easily make it work with other APIs.

##### 3 Map all the relationships in-memory

A data model which has a dozen collections and relationships often performs very poorly when using map-reduce joins, meaning you have to implement some form of relationship caching to salvage performance, which means extra code, planning, testing, and sources of error.

SneakerJS caches every relationship bi-directionally. So for the **customer > order** relationship it stores an array of orders against each customer, and a reference to the customer against every order, and updates these as changes are made or items deleted.

This means SneakerJS often performs extremely well with relatively complex models, without having to add a custom caching strategy.


# What is it good for?

SneakerJS works by loading all the data from the initial query, storing it in memory, and replicating changes to the db. It does not yet have the capacity to respond to changes from the source to the client (but PouchDB can notify your app when this happens).

Therefore SneakerJS is best for cases where the data is only edited by one client at a time, such as:

  - Personal data applications (Calendar, Organisers, Planners)
  - Document-based applications (Writing software?)
  - Management systems where users obtain a lock on a dataset (e.g. a project, data model)
 
Although the intended usage is to load on SneakerModel for your whole app, there is nothing stopping you having multiple models loaded.

# Demo

You can find a Plunkr here:

There is also an included demo project setup with npm & gulp inside the repo.

# Installation

    npm install sneakerjs --save

# Usage

These steps show you how to get up and running with PouchDB (which can also connect to CouchDB). See **Swapping Backends** for instructions on other providers.

##### 1 Include the sources

    <script src="node_modules/angular/angular.min.js"></script>
    <script src="node_modules/pouchdb/dist/pouchdb.min.js"></script>
    <script src="node_modules/sneakerjs/dist/sneakerjs.min.js"></script>

##### 2 Import SneakerJS into your Angular app

    angular.module('app', ['SneakerJS']);

##### 3 Create a SneakerModel instance

The **SneakerModel** object is what you define your collections on. It is also the object on which the generated functions will be attached. I like calling mine **db**:

    app.run(function(SneakerModel){
      var backend = new PouchDB('my_demo_app')
      var db = new SneakerModel(backend)
      db.collection('customer', ['name'])
      ...
    });

You can attach it to $rootScope to make it directly available in your templates:

    $rootScope.db = db;
    
A neat trick to make the model available as a service is using JavaScript's **call** on **SneakerModel** passing **this** (which will be your newly instantiated service):

    app.service('db', function(SneakerModel) {
      var backend = new PouchDB('my_demo_app')
      SneakerModel.call(this, backend);
    });

You can now inject it into other providers in your app:

    app.controller('Ctrl', function(db) {
      var customersWithNoOrders = db.findCustomers(function(customer) {
        return db.getCustomerOrders(customer).length == 0;
      });
      ...
    });
 

##### 4 Define your initial loading function (optional)

By default, SneakerJS will use **allDocs** as the initial loading function (as it is usually a PouchDB object):

    backend.allDocs({
      include_docs: true,
      attachments: false
    });
    
However you can specify the query to exectute when initializing the SneakerModel:

    app.service('db', function(SneakerModel) {
      var backend = new PouchDB('my_demo_app');
      var loadFunction = function() {
        //return a json object similar to allDocs
      };
      SneakerModel.call(this, backend, loadFunction);
    });

The initial loading function gets called once on **dataReady** (see below).

##### 5 Define your model

Define all your collections, singletons and relationships before calling  **db.dataReady()**.

It is best to do this right after instantiating your SneakerModel, in a section of code that will run early, such as your app's **run** function or in a service.

##### 6 Wait for dataReady

The first call to **db.dataReady()** will call the initial loading function and return a promise, which will resolve once the data is loaded.

Subsequent calls will simply return the same promise. This means you can use it inside controllers to wait for the initial data load to complete:
   
    app.controller('Ctrl', function(db) {
      $scope.ready = false; // use this to hide UI elements...
      db.dataReady().then(function(){
        $scope.customers = db.allCustomers(); 
        $scope.ready = true;
      });
      ...
    });

##### 7 Peek at the generated functions

Use **db.printInfo()** to print out a list of all the generated functions to the console:

    db.getCustomer()
    db.newCustomer()
    ...
    

##### 8 Start playing!

Once **db.dataReady()** has resolved, you can use the generated functions inside your providers, or directly inside the template if you made **db** available in the scope/rootScope. 

Here's a page to create/delete customers and their orders for our shopping app based on the definitions at the top of this readme.

    <input ng-model="newCustomerName">
    <button ng-click="db.newCustomer({name: newCustomerName})">Add</button>
    <div ng-repeat"customer in db.allCustomers()">
      {{customer.name}}
      <button ng-click="db.deleteItem(customer)">Remove</button>
      <div ng-repeat"order in db.getCustomerOrders(customer)">
        {{order.value}}
        <button ng-click="db.deleteItem(order)">Remove</button>
      </div>
      <input ng-model="newOrderValue">
      <button ng-click="db.newOrder({value: newOrderValue, customer: customer})">Add</button>
    </div>

This saves changes to direct to the database, no extra code needed!

SneakerJS's changes are wrapped in **$q** promises, meaning they will trigger Angular's digest cycle, so there is no need to use an additional layer such as [angular-pouchdb](https://github.com/angular-pouchdb/angular-pouchdb).

# API details

## Model functions

The SneakerModel starts off with the following functions:

  - **collection** - For defining collections.
  - **join** - For defining relationships between collections.
  - **singleton** - For defining a singleton in the database.
  - **dataReady** - Returns a promise once the data is loaded.
  - **deleteItem** - generic function for deleting any collection item.
  - **saveItem** - generic function for saving changes to any collection item.
  - **printInfo** - Prints a list of the generated functions.
  - **reload** - Clears all the collections and rebuilds them from the initial load query.

Defining collections, singletons and relationships adds functions to the SneakerModel instance. These are referred to as the *generated functions*.

### db.collection(name, fields, options)

For defining collections.

#####Parameters

| Name          | Type      | Required  | Comments |
| ------------- | --------- | --------- | ----------------|
| name          | string    | yes       | Must be unique. Use singular (e.g. cat, not cats)
| fields        | [strings] | yes       | Must be unique within array. Don't start with underscores.
| options       | object    | no        | See below

##### Options

| Name          | Type      | Comments |
| ------------- | --------- | ----------------|
| plural        | string    | The string to use for plural form (e.g. 'people' if your collection is 'person'). This affects generated function names for the collection and affected relationships.
| proto         | function  | Causes all items in this collection to be instantiated with **new** MyFunction().

##### Note about proto

This is a powerfull feature, essentially turning SneakerJS into an ORM.

    var Customer = function() {};
    //fields will be added after call to "new Customer()"
    Customer.prototype.getOrderValue = function() {
      var total = 0;
      db.getCustomerOrders(this).forEach(function(order){
        db.getOrderItems(order).forEach(item) {
          total += item.price;
        }
      });
      return total;
    };
    db.collection('customer', {proto: Customer});
    ...
    c1 = db.getCustomer('id_0001');
    c1.getOrderValue();
    


### db.join(collectionA, collectionB, options)

For defining relationships between collections. 

#####Parameters

| Name          | Type      | Required  | Comments |
| ------------- | --------- | --------- | ----------------|
| collectionA   | string    | yes       | Must match the name of a collection already defined
| collectionB   | string    | yes       | Must match the name of a collection already defined
| options       | object    | no        | See below

##### Options

| Name          | Type      | Comments |
| ------------- | --------- | ----------------|
| childAlias    | string    | The name used for the child side of the join.
| parentAlias   | string    | The name used for the parent side of the join.
| cascadeDelete | boolean   | Whether to delete linked child objects when parent is deleted. Defaults to true.

##### Note about aliases

Aliases can be used to define multiple ParentChild relationships between the same two collections without clashes.

Aliases affect the generates

By default this becomes a parent > child join

    

# Status

This project is in Alpha stage. It works great but hasn't been seriously battle tested. 

Please report any issue you may find :-)

