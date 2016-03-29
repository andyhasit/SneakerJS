
/*
This suite not only tests the model.reload function, but by inference that items and relationships 
are saved correctly, i.e. a complete reload results in the same as before.
*/
describe('reloading', function() {
  
  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));
  
  beforeEach(inject(function(SneakerModel, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = new SneakerModel(db);
    model.collection('person', ['name', 'age']);
    model.collection('cat', ['name']);
    model.collection('tag', ['name']);
    model.oneToMany('person', 'cat', {parentAlias: 'owner'});
    model.manyToMany('cat', 'tag');
    ready();
  }));
  
  it('retains created items', function() {
    model.newPerson({name: 'Bob', age: 4});
    model.newPerson({name: 'Jane', age: 4});
    model.reload();
    flush();
    var people = model.allPersons();
    expect(people[0].name).toEqual('Bob');
    expect(people[0].type).toEqual('person');
    expect(people[1].name).toEqual('Jane');
    expect(people[1].type).toEqual('person');
  });
  
  it('retains created singleton', function() {
    model.singleton('settings');
    model.setSettings({userName: 'Jane', preferences: {offset: 4, height: 68}, colours: ['blue', 'red', 'purple']});
    flush();
    model.reload();
    flush();
    var settings = model.getSettings();
    expect(settings.userName).toEqual('Jane');
    expect(settings.preferences).toEqual({offset: 4, height: 68});
    expect(settings.colours).toEqual(['blue', 'red', 'purple']);
  });
  
  it('retains parent child relationship', function() {
    var bob = newItem('person', {name: 'Bob', age: 4});
    var jane = newItem('person', {name: 'Jane', age: 4});
    var cat = newItem('cat', {name: 'Mog', owner: jane});
    model.reload();
    flush();
    var cat = model.allCats()[0];
    expect(model.getCatOwner(cat).name).toEqual('Jane');
  });
  
  it('retains many to many relationship', function() {
    var jane = newItem('person', {name: 'Jane', age: 4});
    var mog = newItem('cat', {name: 'Mog', owner: jane});
    var fritz = newItem('cat', {name: 'Fritz', owner: jane});
    var shy = newItem('tag', {name: 'Shy'});
    var tabby = newItem('tag', {name: 'Tabby'});
    model.addCatTag(fritz, tabby);
    flush();
    expect(model.isCatLinkedToTag(fritz, tabby)).toBeTruthy();
    model.reload();
    flush();
    var fritz = model.allCats()[1];
    var tabby = model.allTags()[1];
    expect(fritz.name).toEqual('Fritz');
    expect(tabby.name).toEqual('Tabby');
    expect(model.isCatLinkedToTag(fritz, tabby)).toBeTruthy();
  });
  
  /*
  It's worth being paranoid and checking this works too.
  */
  it('retains items on save', function() {
    var jane = newItem('person', {name: 'Jane', age: 4});
    var cat = newItem('cat', {name: 'Mog', owner: jane});
    cat.name = 'Mr Simmons';
    model.saveItem(cat);
    flush();
    model.reload();
    flush();
    var cat = model.allCats()[0];
    expect(cat.name).toEqual('Mr Simmons');
    expect(model.getCatOwner(cat).name).toEqual('Jane');
  });
  
  it('retains parent child relationship changes', function() {
    var bob = newItem('person', {name: 'Bob', age: 4});
    var jane = newItem('person', {name: 'Jane', age: 4});
    var cat = newItem('cat', {name: 'Mog', owner: jane});
    expect(model.getCatOwner(cat).name).toEqual('Jane');
    cat.name = 'Mr Simmons';
    model.setCatOwner(cat, bob);
    model.saveItem(cat);
    flush();
    model.reload();
    flush();
    var cat = model.allCats()[0];
    expect(cat.name).toEqual('Mr Simmons');
    expect(model.getCatOwner(cat).name).toEqual('Bob');
  });
  
  
  
});