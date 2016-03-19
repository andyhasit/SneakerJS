<p align="center">
<img src="logo.gif" width="300">
</p>

#SneakerJS
Entity relationship automation for AngularJS and CouchDB (or PouchDB etc...)

####Update 19 03 2016:

I uploaded this to **npm** to make it easier to copy in and out of personal projects, I did not expect 100's of downloads. So just to clarify:
  - This project is at **alpha** stage, so might be making sweeping changes to the design.
  - For usage documentation, see the included demo (which I will endeavour to keep up to date now that people are actually looking at it)
  - Although I use SneakerJS successfully in a few personal projects the demo is currently broken as I couldn't resolve a **$scope.$digest** issue and don't have time right now, and am thinking of how SneakerJS could solve that instead of you having to do that in the controller (contributions welcome).
  - Do come back and check (**npm update sneakerjs**) as it is being refined.


##What does it do?

###1. Lets you define your model in simple terms

    // Define some collections (collectionName, [fields])
    model.collection('customer', ['name', 'email'])
    model.collection('order', ['value', 'status'])
    model.define('shipment', ['date'])
    
    // Create a one-to-many join
    model.join('customer', 'order')
      
    // Create a many-to-many join
    model.join('order', 'shipment', {type: 'manyToMany'})

    // Joins can be customised

      

###2. Generates intelligently named functions

Sneaker generates functions named after your collections (how cool is that?!)

    model.getCustomer(<id>)
    model.newCustomer({name: 'joe', email: 'joe@joe.com'})
    model.newOrder({value: 100, customer: <customer>})
    model.findOrders(<function>)
    model.getCustomerOrders(<customer>)
    model.deleteCustomer(<customer>)
    model.getShipmentOrders(<shipment>)
    model.getOrderShipments(<order>)
    
This makes it easier to write highly readable code.

#####About these functions:
  - Functions that change the database return promises (not shown here for simplicity) 
  - Queries return directly (which helps with databinding)
  - The objects are all plain JavaScript objects (but you can specify prototypes for items in your collections)
  - You can also use aliases to control the generated function names.
  
###3. Saves to database (handling relationships)

Those functions save changes to your CouchDB/PouchDB database automatically. 

Sneaker also understands relationships.

    model.newOrder({value: 100, customer: <customer>})

The above creates and saves a join between the new order and the customer as well as creating the order.
   
    
    model.deleteCustomer(<customer>)
    
This would delete orders which belong to that customer (and any items that belong to the order) before it deletes the customer (if you specify that behaviour when defining the join)

Many-to-many relationships seamlessly creates join documents in the db which you never deal with in the app.


###4. Provides ultra fast in-memory joins

SneakerJS maps all the relationships, so querying accross multiple joins is fast.

This lets you build apps with large amounts of interconnected collections that would grind to a halt if your joins were implemented using map reduce.

###5. Removes design decisions for RAD

For most use cases, you can just point to the db and let SneakerJS take care of how the data and joins are stored (it strikes a balance between minimising write operations and db size).

For more control, just pass a proxy DB to Sneaker which exposes **post, put, save** and **delete**. With this you can write to other backends (or stick to CouchDB and store data your way) and still get Sneaker at the front end.

##Detailed examples

Check the included demo project.

##Overall Status

This project is in Alpha stage. A good number of tests are passing but more are needed.
