<p align="center">
<img src="logo.gif" width="300">
</p>

#SneakerJS
Entity relationship automation for AngularJS and CouchDB (or PouchDB etc...)

##What does it do?

####1. Lets you define your model in simple terms

    // Define some collections
    model.collection('customer', ['name', 'email'])
    model.collection('order', ['date', 'status'])
    
    // Create a basic one-to-many join
    model.join('customer', 'order')
      
    // Create a  many-to-many join
    model.define('shipment', ['date'])
    model.join('order', 'shipment', {type: 'manyToMany'})

      

####2. Generates intelligently named functions

Sneaker attaches new functions named after your collections, which makes your code faster to write, and read:

    model.getCustomer(<id>)
    model.newCustomer({name: 'joe', email: 'joe@joe.com'})
    model.newOrder({value: 100, customer: <customer>})
    model.findOrders(<function>)
    model.getCustomerOrders(<customer>)
    model.deleteCustomer(<customer>)
    model.getShipmentOrders(<shipment>)
    model.getOrderShipments(<order>)
    
Notes:

  - Most of these return promises (not shown here for simplicity) but queries return directly.
  - The objects are all plain JavaScript objects, although you can specify prototypes for items in your collections.
  - You can also use aliases to control the generated function names.
  
####3. Saves to database (handling relationships)

Those functions save changes to your CouchDB/PouchDB database automatically. 

Sneaker also understands relationships, so this line creates and saves a join between the new order and the customer as well as creating the order.

    model.newOrder({value: 100, customer: <customer>})
    
 And this line can delete orders which belong to that customer (and any items that belong to the order) before it deletes the customer (if you specify that behaviour when defining the join):

    model.deleteCustomer(<customer>)
    
It handles many-to-many relationships without you having to create separate collections or figure out how to store the joins:

    model.define(person, [name])
    model.define(tag, [title])
    model.join('person', 'tag', {type: 'manyToMany'})
    
    model.getGetPersonTags(<person>)
    model.getTagPersons(<tag>)  // Do you prefer GetTagPeople? You can change that...
    
This seamlessly creates join documents in the db which you never deal with in the app.

####4. Ultra fast in-memory joins

SneakerJS maps all the relationships, so querying accross multiple joins is fast. This lets you build apps with large amounts of interconnected collections that would grind to a halt if your joins were implemented using map reduce.

####5. Removes design decisions for RAD

For most use cases, you can just point to the db and let SneakerJS take care of how the data and joins are stored (it strikes a balance between minimising write operations and db size).

For more control, just pass a proxy DB to Sneaker which exposes **post, put, save** and **delete**. With this you can write to other backends (or stick to CouchDB and store data your way) and still get Sneaker at the front end.

##Status

The source code is currently in another repo ([here](https://github.com/andyhasit/Relate)) but will be moved over here shortly.
