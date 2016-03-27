<p align="center">
<img src="logo.gif" width="300">
</p>

#SneakerJS
Entity relationship automation for AngularJS and CouchDB (or PouchDB etc...)


#What does it do?

###1. Lets you define your model in simple terms

    // Define some collections as <collectionName, [fields]>
    model.collection('customer', ['name', 'email'])
    model.collection('shipment', ['date'])
    model.collection('order', ['value', 'status'], {
      proto: Order 
    }) 
    /*
    Items in the 'order' collection will be initialised with prototype 'Order'
    which you will have defined elsewhere.
    */
    
    /*
    Define the relationships.
    You can do a lot more with joins, see demo app.
    */
    model.join('customer', 'order')
    model.join('order', 'shipment', {type: 'many-to-many'})

      

###2. Generates intelligently named functions

Sneaker generates functions based on your collections, such as:

    model.getCustomer(<id>)
    model.newCustomer({name: 'joe', email: 'joe@joe.com'})
    model.newOrder({value: 100, customer: <customer>})
    model.findOrders(<function>)
    model.getCustomerOrders(<customer>)
    model.deleteCustomer(<customer>)
    model.getShipmentOrders(<shipment>)
    model.getOrderShipments(<order>)
    
This makes it easier to write highly readable code.

###3. Persists changes to PouchDB/CouchDB

Those functions save changes to your CouchDB/PouchDB database, and eliminate the need for you to do decide how to store joins, or create and extra collection when you just to have a many-to-many join.

###4. Handles relationships

SneakerJS understands relationships.

    model.newOrder({value: 100, customer: <customer>})

The above creates and saves a join between the new order and the customer as well as creating the order.
   
    
    model.deleteCustomer(<customer>)
    
This would delete orders which belong to that customer (and any items that belong to the order) before it deletes the customer (if you specify that behaviour when defining the join)

Many-to-many relationships seamlessly creates join documents in the db which you never deal with in the app.


###4. Provides super fast querying

SneakerJS maps all the relationships bi-directionally in memory, so querying accross multiple joins is lightening fast compared to a map/reduce approach.

This lets you build apps with large amounts of joined collections that would otherwise perform very slowly or require a lot of extra work to avoid that.

###5. Doesn't tie you down

Although it works with PouchDB out of the box, switching backends is easy. 

SneakerJS just needs an object which exposes **post, put, save** and **delete**, so you could simply pass your own object which routes those calls to an API, meaning you can structure the data how you want it on the database, but still get SneakerJS functionality in your app.

If you don't like the idea of passing the **model** object to controllers, you can implement your own functions in your prototypes and ask them to call those instead.


#####More information:

  - Action functions (new, save etc...) return $q promises which automatically trigger angular's digest loop, so no need to use $apply() all over the place.
  - Query functions (get, find etc...) return arrays, not promises, which makes binding to scopes very easy.
  - The objects in these collections are plain JavaScript objects, but you can tell SneakerJS to use specific prototypes when creating them if you like.
  - You can use aliases to control the generated function names and allow multiple same-type relationships between the same two collections. 
  

#Installation

    npm install sneakerjs --save

#Usage

The included demo project is set up to show you exactly how to use SneakerJS, and also acts as a good seed project.

#Status

This project is in Alpha stage. It works great but hasn't been seriously battle tested. 

Please report any issue you may find :-)

