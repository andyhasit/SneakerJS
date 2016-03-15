
describe('naming many to many', function() {
  
  beforeEach(module('Relate'));
  beforeEach(module('PouchFake'));
  
  beforeEach(inject(function( _model_, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = _model_;
    model.initialize(db);
  }));
  
  function ready() {
    model.dataReady();
    flush();
  }
  
  it('basic many to many', function() {
    model.collection('project', ['name']);
    model.collection('tag', ['name']);
    model.join('project', 'tag', {type: 'manyToMany'});
    ready();
    
    expect(typeof model.getProjectTags).toEqual('function');
    expect(typeof model.addProjectTag).toEqual('function');
    expect(typeof model.removeProjectTag).toEqual('function');
    expect(typeof model.getTagProjects).toEqual('function');
  });
  
  it('right side has a plural name', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name'], {plural: 'people'});
    model.join('project', 'person', {type: 'manyToMany'});
    ready();
    
    expect(typeof model.getPersonProjects).toEqual('function');
    expect(typeof model.addProjectPerson).toEqual('function');
    expect(typeof model.removeProjectPerson).toEqual('function');
    expect(typeof model.getProjectPeople).toEqual('function');
  });
  
  it('both sides have a plural name', function() {
    model.collection('mouse', ['name'], {plural: 'mice'});
    model.collection('person', ['name'], {plural: 'people'});
    model.join('mouse', 'person', {type: 'manyToMany'});
    ready();
    
    expect(typeof model.getPersonMice).toEqual('function');
    expect(typeof model.addMousePerson).toEqual('function');
    expect(typeof model.removeMousePerson).toEqual('function');
    expect(typeof model.getMousePeople).toEqual('function');
  });
  
  it('with qualifier', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name']);
    model.join('project', 'person', {type: 'manyToMany', qualifier: 'admin'});
    ready();
    
    expect(typeof model.getPersonProjectsAsAdmin).toEqual('function');
    expect(typeof model.addProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.removeProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.getProjectPersonsAsAdmin).toEqual('function');
  });
  
  it('with qualifier and plural', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name'], {plural: 'people'});
    model.join('project', 'person', {type: 'manyToMany', qualifier: 'admin'});
    ready();
    
    expect(typeof model.getPersonProjectsAsAdmin).toEqual('function');
    expect(typeof model.addProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.removeProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.getProjectPeopleAsAdmin).toEqual('function');
  });
   
});