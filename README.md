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

## SneakerJS
Entity relationship automation for AngularJS.

[![npm version][npm-version-image]][npm-url]
[![npm downloads][npm-downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]

## What does it do?

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

// This is a simple example, you can do much more

```    
    
### From this SneakerJS will:

##### A) Generate specially named functions for you to work with

These are all generated based on the names of your collections:

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

##### B) Take care of storing your data

If using [PouchDB](https://pouchdb.com/) (which can also connect to [CouchDB](http://couchdb.apache.org/)) then your data will automatically be persisted in a structure which works well for single-user apps.

You don't need to worry about foreign keys for one-to-many joins, or dedicated collections for many-to-many joins. In fact you don't need to do anything other than define your collections and start using the functions (See this [Plunkr](https://embed.plnkr.co/KY2pgdSpg3KWxQrWQhSC/))

If you'd rather have control over your backend, or use data from another API altogether, no problem! There is an easy way to intercept the CRUD calls, so you can use SneakerJS in the front-end with any API you like at the back-end (see [User Guide](User Guide.md))

##### C) Map all the relationships in memory for lightening fast performance

SneakerJS loads the full data at startup and replicates changes to the database (currently no provision for synchronising changes from the db to client, you have to do that manually, but it's in the pipeline)

It also caches every relationship bi-directionally.

E.g for a one-to-many relationship between **customer** and **order**, it stores the array of orders for each customer, and a reference to the customer against each order, and keeps these updated.

While this may seem trivial, caching relationships in this way can make an application which has many joins between it's collections go over 100 times faster than using map-reduce joins (yes, I've measured this before).

What this means it that you can design your collections in a highly normalised relational form and probably not have to worry about performance. Let that sink in for a bit ;-)

##### What else?

SneakerJS takes care of the **angular digest loop** so you don't have to **$scope.$apply()** everywhere. Just call the generated functions and changes will be reflected in the UI once they are confirmed by the database (so it's a bit like firebase but in many cases much faster, and free!)
 
SneakerJS also lets you:
  - Specify constructor functions to initiate collection items, effectively making SneakerJS a mini ORM.
  - Define many-to-many relationships without setting up special tables/collections
  - Use aliases to allow multiple same type relationships between collections
  


## Demo

Here is a simple [Plunkr](https://embed.plnkr.co/KY2pgdSpg3KWxQrWQhSC/). 
There is also a [demo project](demos/demo_1) included.

## Installation

```shell
npm install sneakerjs --save
```

## User Guide

Yes, there is a complete [user guide](User Guide.md)!


## Reporting bugs

Please report any issues in the [issue tracker](https://github.com/andyhasit/SneakerJS/issues).

## Running test

Tests written in Jasmine, run with karma, and code coverage checked with istanbul.

    npm test

Of course, it uses [karma-nicer-reporter](https://github.com/andyhasit/karma-nicer-reporter) ;-)

## Licence

[MIT](https://opensource.org/licenses/MIT)

