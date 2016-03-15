<img src="logo.gif" width="200" style="text-align:center">

#SneakerJS
--------

Entity relationship automation for AngularJS and CouchDB (or PouchDB etc...)

##What does it do?

####1. Lets you define your model in simple terms

Define your model (collections & relationships) using simple syntax:

      // Define two collections
      model.collection('customer', ['name', 'email'])
      model.collection('order', ['date', 'status'])
      
      // Create a basic one-to-many join (you can do much more, see later)
      model.join('customer', 'order')
      
(You can also define many-to-many joins, and control behaviour etc...)

####2. Generates intelligently named functions

Sneaker attaches new functions named after your collections, which makes your code faster to write, and read:

    model.getCustomer(<id>)
    model.newOrder({value: 100, customer: <customer>})
    model.findOrders(<function>)
    model.getCustomerOrders(<customer>)
    model.getOrderCustomer(<order>)
    model.deleteCustomer(<customer>)
    
(You can control how plurals appear, use aliases and more...)

####3. Saves to database (handling relationships)

Those functions save changes to your CouchDB/PouchDB database automatically. 

Sneaker also understands relationships, so this line:

    model.newOrder({value: 100, customer: <customer>})
    
Creates and saves a join between the new order and the customer as well as creating the order. And this line:

    model.deleteCustomer(<customer>)
    
can delete orders which belong to that customer (and any items that belong to the order) before it deletes the customer (if you specify that behaviour when defining the join)

It also handles many-to-many relationships without you having to create separate collections or figure out how to store the joins:

    model.define(person, [name])
    model.define(tag, [title])
    model.join('person', 'tag', {type: 'manyToMany'})
    
    model.getGetPersonTags(<person>)
    model.getTagPersons(<tag>)  // Do you prefer GetTagPeople? You can change that...
    
(This seamlessly creates join documents in the db which you never deal with in the app)

####4. Ultra fast in-memory joins

SneakerJS keeps track of all the relationships, so querying accross multiple joins is ultra fast. This lets you build apps with large amounts of interconnected collections that would grind to a halt if your joins were implemented using map reduce.

####5. Removes design decisions for RAD

For most use cases, you can just point and shoot, letting SneakerJS take care of how the data is stored (it strikes a balance between minimising write operations and db size) so you never have to look at the database.

For more control, just pass a proxy DB to Sneaker which exposes **post, put, save** and **delete**. With this you can write to other backends (or stick to CouchDB but store data your way) and still get Sneaker at the front end.

##Status

The source code is currently in another repo ([here](https://github.com/andyhasit/Relate)) but will be moved over here shortly.
