[npm-url]: https://npmjs/package/sneakerjs
[npm-version-image]: https://badge.fury.io/js/sneakerjs.svg
[npm-downloads-image]: https://img.shields.io/npm/dt/sneakerjs.svg
[travis-image]: https://img.shields.io/travis/andyhasit/SneakerJS.svg
[travis-url]: https://travis-ci.org/andyhasit/SneakerJS
[coveralls-image]: https://img.shields.io/coveralls/andyhasit/SneakerJS.svg
[coveralls-url]: https://coveralls.io/github/andyhasit/SneakerJS

<p align="center">
<img src="logo.gif" width="250">
</p>

# SneakerJS
Entity relationship automation for AngularJS.

[![npm version][npm-version-image]][npm-url]
[![npm downloads][npm-downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

# What does it do?

You define collections and the relationships between them:

```javascript
/*
A shopping app has customers
Each customer has multiple orders
Each order has multiple items
*/
db.collection('customer', ['name', 'email'])
db.collection('order', ['value', 'status'])
db.collection('item', ['description', 'price'])
db.oneToMany('customer', 'order')
db.oneToMany('order', 'item')
/*
We can do a lot more than this, such as:
  - specify constructor functions to initiate collection items
  - many-to-many
  - relationship aliases
*/
```    
    
SneakerJS will then:

##### 1 Generate cleverly named functions

Some of the functions SneakerJS will generate given the above definitions:

```javascript
db.getCustomer(id)
db.newCustomer({name: 'joe', email: 'joe@joe.com'})
db.newOrder({value: 100, customer: customer})
db.findOrders(func)      
db.getCustomerOrders(customer) // Return all the customer's orders
db.deleteItem(order)           // Delete an order and its items
db.deleteItem(customer)        // Delete a customer, his orders and their items
db.getItemOrder(shipment)
db.getOrderItems(order)
```

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

```shell
npm install sneakerjs --save
```

# Usage

These steps show you how to get up and running with PouchDB (which can also connect to CouchDB). See **Swapping Backends** for instructions on other providers.

##### 1 Include the sources

```html
    <script src="node_modules/angular/angular.min.js"></script>
    <script src="node_modules/pouchdb/dist/pouchdb.min.js"></script>
    <script src="node_modules/sneakerjs/dist/sneakerjs.min.js"></script>
```

##### 2 Import SneakerJS into your Angular app

```javascript
angular.module('app', ['SneakerJS']);
```

##### 3 Create a SneakerModel instance

The **SneakerModel** object is what you define your collections on. It is also the object on which the generated functions will be attached. I like calling mine **db**:

```javascript
app.run(function(SneakerModel){
  var backend = new PouchDB('my_demo_app')
  var db = new SneakerModel(backend)
  db.collection('customer', ['name'])
  ...
});
```

You can attach it to $rootScope to make it directly available in your templates:

```javascript
$rootScope.db = db;
```
    
A neat trick to make the model available as a service is using JavaScript's **call** on **SneakerModel** passing **this** (which will be your newly instantiated service):

```javascript
app.service('db', function(SneakerModel) {
  var backend = new PouchDB('my_demo_app')
  SneakerModel.call(this, backend);
});
```
You can now inject it into other providers in your app:

```javascript
app.controller('Ctrl', function(db) {
  var customersWithNoOrders = db.findCustomers(function(customer) {
    return db.getCustomerOrders(customer).length == 0;
  });
  ...
});
``` 

##### 4 Define your initial loading function (optional)

By default, SneakerJS will use **allDocs** as the initial loading function (as it is usually a PouchDB object):

```javascript
backend.allDocs({
  include_docs: true,
  attachments: false
});
```
    
However you can specify the query to exectute when initializing the SneakerModel:

```javascript
app.service('db', function(SneakerModel) {
  var backend = new PouchDB('my_demo_app');
  var loadFunction = function() {
    //return a json object similar to allDocs
  };
  SneakerModel.call(this, backend, loadFunction);
});
```

The initial loading function gets called once on **dataReady** (see below).

##### 5 Define your model

Define all your collections, singletons and relationships before calling  **db.dataReady()**.

It is best to do this right after instantiating your SneakerModel, in a section of code that will run early, such as your app's **run** function or in a service.

##### 6 Wait for dataReady

The first call to **db.dataReady()** will call the initial loading function and return a promise, which will resolve once the data is loaded.

Subsequent calls will simply return the same promise. This means you can use it inside controllers to wait for the initial data load to complete:

```javascript
app.controller('Ctrl', function(db) {
  $scope.ready = false; // use this to hide UI elements...
  db.dataReady().then(function(){
    $scope.customers = db.allCustomers(); 
    $scope.ready = true;
  });
  ...
});
```

##### 7 Peek at the generated functions

Use **db.printInfo()** to print out a list of all the generated functions to the console:

```javascript
db.getCustomer()
db.newCustomer()
...
```

##### 8 Start playing!

Once **db.dataReady()** has resolved, you can use the generated functions inside your providers, or directly inside the template if you made **db** available in the scope/rootScope. 

Here's a page to create/delete customers and their orders for our shopping app based on the definitions at the top of this readme.

```html
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
```

This saves changes to direct to the database, no extra code needed!

SneakerJS's changes are wrapped in **$q** promises, meaning they will trigger Angular's digest cycle, so there is no need to use an additional layer such as [angular-pouchdb](https://github.com/angular-pouchdb/angular-pouchdb).

# API details

## Model functions

The SneakerModel starts off with the following functions:

  - **collection** - Defines a collection.
  - **oneToMany** - Defines a one to many relationship between two collections.
  - **manyToMany** - Defines a many to many relationship between two collections.
  - **singleton** - Defines a singleton in the database.
  - **dataReady** - Returns a promise once the data is loaded.
  - **deleteItem** - Generic function for deleting any collection item.
  - **saveItem** - Generic function for saving changes to any collection item.
  - **printInfo** - Prints a list of the generated functions.
  - **reload** - Clears all the collections and rebuilds them from the initial load query.

Defining collections, singletons and relationships adds functions to the SneakerModel instance. These are referred to as the *generated functions*.

### db.collection(name, fields, options)

Defines a collection, i.e. a series of objects of the same type.

#####Parameters

| Name          | Type      | Required  | Comments |
| ------------- | --------- | --------- | ----------------|
| name          | string    | yes       | Must be unique. Use singular (e.g. cat, not cats)
| fields        | [strings] | yes       | Must be unique within array. Don't start with underscores.
| options       | object    | no        | See below

##### Options

| Name          | Type      | Comments |
| ------------- | --------- | ----------------|
| plural        | string    | The string to use for plural form.|
| proto         | function  | Causes all items in this collection to be instantiated with **new** MyFunction().|

##### About 'plural'

This is just cosmetic, and only affects the naming of generated functions where the plural would otherwise just be generated by adding **s**, including relationships.

```javascript
db.collection('country')
db.collection('person', {plural: 'people'})
db.oneToMany('country', 'person')
...
db.getPerson()
db.findPeople()
db.getCountryPeople()
``` 

##### About 'proto'

This is a powerfull feature, essentially turning SneakerJS into an ORM.

```javascript
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
```    


### db.oneToMany(childCollectionName, parentCollectionName, options)

Defines a one to many relationship between two collections.

#####Parameters

| Name          | Type      | Required  | Comments |
| ------------- | --------- | --------- | ----------------|
| childCollectionName   | string    | yes       | Must match the name of a collection  defined previously
| parentCollectionName   | string    | yes       | Must match the name of a collection defined previously
| options       | object    | no        | See below

##### Options

| Name          | Type      | Comments |
| ------------- | --------- | ----------------|
| childAlias    | string    | The name used for the child side of the join.
| parentAlias   | string    | The name used for the parent side of the join.
| cascadeDelete | boolean   | Whether to delete linked child objects when parent is deleted. Defaults to true.

##### About aliases

Aliases can be used to define multiple relationships of the same type between the same two collections without clashes.

```javascript
db.collection('company')
db.collection('person', {plural: 'people'})
db.oneToMany('company', 'person', {parentAlias: 'employer', childAlias: 'employee')
db.oneToMany('company', 'person', {parentAlias: 'favouriteCompany')
```

Aliases affect the generated function names:

```javascript
db.getPersonEmployer()
db.getCompanyEmployees()
db.getPersonFavouriteCompany()
db.getCompanyPeople() // careful, this only returns people linked on the second relationship.
```    

The parentAlias affect how the relationship is stored in the database, so changing it on an existing dataset will break the links.

The parentAlias can also be used when creating child objects:

```javascript
employerA = db.getEmployer('id_001');
db.newPerson({name: 'Bill', employer: employerA});
//This creates a linked between the new person and employerA
```

SneakerJS attempts to prevent ambiguous clashes, but does not currently check for everything.
    

### db.oneToMany(leftCollectionName, rightCollectionName, options)

Defines a many to many relationship between two collections.

#####Parameters

| Name          | Type      | Required  | Comments |
| ------------- | --------- | --------- | ----------------|
| leftCollectionName   | string    | yes       | Must match the name of a collection  defined previously
| rightCollectionName  | string    | yes       | Must match the name of a collection defined previously
| options       | object    | no        | See below

##### Options

| Name          | Type      | Comments |
| ------------- | --------- | ----------------|
| qualifier    | string     | Used to allow multiple many to many joins
| dbDocumentType   | string  | The name used for the parent side of the join


##### About qualifiers

A qualifier can be used to define multiple relationships of the same type between the same two collections without clashes.

```javascript
cat as freidn
``` 

You can always map the generated functions 


## Generated functions
    
### db.allXyzs(function)

Same list

### db.newXyz(data)

### db.getXyz(data)

### db.findXyzs(query)

query can be:
      a function returning true or false
      an object like {name: 'deirdre'} -- which returns items whose properties match.
      an empty object {} -- which returns all items.
    TODO: what about parent properties?

# Contributing

This project is in Alpha stage. It works great but hasn't been seriously battle tested. 

Please report any issue you may find :-)

