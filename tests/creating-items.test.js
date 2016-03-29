
describe('creating items', function() {
  
  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));
  
  beforeEach(inject(function(SneakerModel, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = new SneakerModel(db);
    model.collection('person', ['name', 'age']);
    model.collection('cat', ['name']);
    model.oneToMany('person', 'cat', {parentAlias: 'owner'});
    ready();
  }));
  
  it('creates item saves as expected', function() {
    var person;
    model.newPerson({name: 'Andrew', age: 4}).then(function(item){
      person = item;
    });
    flush();
    var people = model.allPersons();
    expect(people.length).toEqual(1);
    expect(person.type).toEqual('person');
    expect(person.name).toEqual('Andrew');
    expect(person.age).toEqual(4);
  });
  
  it('creates item with parentCollection link creates join', function() {
    var person, cat;
    model.newPerson({name: 'Andrew', age: 4}).then(function(item){
      person = item;
    });
    flush();
    model.newCat({name: 'Mog', owner: person}).then(function(item){
      cat = item;
    });
    flush();
    expect(cat.type).toEqual('cat');
    expect(model.getCatOwner(cat)).toEqual(person);
  });
});