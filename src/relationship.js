/*
New way:

Specify one relationship per collection.
It knows of the other collection, and how the relationship behaves.

The model is responisble for passing complementary relationships to the collections.

Linking:
   collection ends up with methods:
   setParent
   addChild
   removeChild
   addTag
   removeTag
   
  model.join({type: 'parentChild'... })
    r1 = parentChildRelationship(parent, child)
    r2 = childParentRelationship(parent, child)
    parentCollection.registerRelationship(r1)
    parentCollection.registerRelationship(r2)
    childCollection.registerRelationship(r1)
    childCollection.registerRelationship(r2)
  }
  What does a relationship do:
    create accessor functions (get, set)
    respond to deletions
    respond to new
    
    
  Deletions:
    if has child items: 
      delete:
        chilren
        parent of child links 
        children of parent
    if has parent items:
      delete:
        parent of child links 
        children of parent
    if many to many:
      delete join only
      
    ...but parent child deletions could benefit from not having all the items stripped first. Do I care?
    I could collate operations on the db side (i.e. collect changes to single objects, and flush them after a period)
    
    
      
*/

angular.module('Relate').factory('ParentRelationshipNew', function($q) {

  var Relationship = function(propertyName, parentCollection, parentPopertyName) {
    this.propertyName = propertyName;
    this._parentCollection = parentCollection;
    this._parentPopertyName = parentPopertyName;
  };
  
  Relationship.prototype._convertFromDoc = function(doc) {
    var value = doc[this.propertyName];
    if (value) {
      this._parentCollection.getItem(value);
    }
  };
  
  Relationship.prototype._convertToDoc = function(value) {
    return value.id;
  };
  
  Relationship.prototype._onItemRemove = function(item) {
    var value = doc[this.propertyName];
    if (value) {
      var parentItem = this._parentCollection.getItem(value);
      if (parentItem) {
        parentItem._links[this._parentPopertyName]
      }
    }
  };
  
});