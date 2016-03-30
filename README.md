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

//(This is a simple example, you can do much more!)

```    
    
### From this, SneakerJS will:

##### 1 Generate cleverly named functions

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

##### 2 Persist your data

These functions persist your changes back to the database, without you having to do anything!

SneakerJS is was designed for single-user apps using [PouchDB](https://pouchdb.com/) (which can also connect to [CouchDB](http://couchdb.apache.org/)) as a backend.

For such use cases, SneakerJS can take care of your database, without you having to set up foreign keys for one-to-many joins, or dedicated collections for many-to-many joins.

If that's not your use case don't worry!

It is really easy to make SneakerJS work with other APIs (see [User Guide/#Other Backends](User Guide.md/#Other Backends)) which gives you full control over your backend, while still letting you use SneakerJS on the front end.

##### 3 Map all the relationships in-memory

SneakerJS caches every relationship bi-directionally. 

E.g for a one-to-many relationship between **customer** and **order**, it stores the array of orders for each customer, and a reference to the customer against each order, and keeps these updated.

This dramatically improves performance for applications which rely on a large number of joins between collections, which might otherwise grind to a halt.

##### 4 What else?

SneakerJS also:
  - Lets you specify constructor functions to initiate collection items, effectively making SneakerJS a mini ORM.
  - Define many-to-many relationships without setting up special tables/collections
  - Use aliases to allow multiple same type relationships between collections
  - Takes care of the **angular digest loop** so you don't have to **$scope.$apply()** everywhere.


# Demo

Here is a simple [Plunkr](https://embed.plnkr.co/KY2pgdSpg3KWxQrWQhSC/). 
There is also a [demo project](demos/demo_1) included.

# Installation

```shell
npm install sneakerjs --save
```

# User Guide

Yes, there is a complete [user guide](User Guide.md)!


# Reporting bugs

Please report any issues in the [issue tracker](https://github.com/andyhasit/SneakerJS/issues).

# Running test

Tests written in Jasmine, run with karma, and code coverage checked with istanbul.

    npm test

Of course, it uses [karma-nicer-reporter](https://github.com/andyhasit/karma-nicer-reporter) ;-)

# Licence

MIT

