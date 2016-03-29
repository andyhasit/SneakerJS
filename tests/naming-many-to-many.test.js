
describe('naming many to many', function() {
  
  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));
  
  beforeEach(inject(function(SneakerModel, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = new SneakerModel(db);
  }));
  
  function ready() {
    model.dataReady();
    flush();
  }
  
  it('basic many to many', function() {
    model.collection('project', ['name']);
    model.collection('tag', ['name']);
    model.manyToMany('project', 'tag');
    ready();
    
    expect(typeof model.getProjectTags).toEqual('function');
    expect(typeof model.addProjectTag).toEqual('function');
    expect(typeof model.removeProjectTag).toEqual('function');
    expect(typeof model.getTagProjects).toEqual('function');
    expect(typeof model.isProjectLinkedToTag).toEqual('function');
  });
  
  it('right side has a plural name', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name'], {plural: 'people'});
    model.manyToMany('project', 'person');
    ready();
    
    expect(typeof model.getPersonProjects).toEqual('function');
    expect(typeof model.addProjectPerson).toEqual('function');
    expect(typeof model.removeProjectPerson).toEqual('function');
    expect(typeof model.getProjectPeople).toEqual('function');
  });
  
  it('both sides have a plural name', function() {
    model.collection('mouse', ['name'], {plural: 'mice'});
    model.collection('person', ['name'], {plural: 'people'});
    model.manyToMany('mouse', 'person');
    ready();
    
    expect(typeof model.getPersonMice).toEqual('function');
    expect(typeof model.addMousePerson).toEqual('function');
    expect(typeof model.removeMousePerson).toEqual('function');
    expect(typeof model.getMousePeople).toEqual('function');
  });
  
  it('with qualifier', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name']);
    model.manyToMany('project', 'person', {qualifier: 'admin'});
    ready();
    
    expect(typeof model.getPersonProjectsAsAdmin).toEqual('function');
    expect(typeof model.addProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.removeProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.getProjectPersonsAsAdmin).toEqual('function');
  });
  
  it('with qualifier and plural', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name'], {plural: 'people'});
    model.manyToMany('project', 'person', {qualifier: 'admin'});
    ready();
    
    expect(typeof model.getPersonProjectsAsAdmin).toEqual('function');
    expect(typeof model.addProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.removeProjectPersonAsAdmin).toEqual('function');
    expect(typeof model.getProjectPeopleAsAdmin).toEqual('function');
  });
   
});