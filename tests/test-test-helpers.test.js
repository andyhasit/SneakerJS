

describe('test test-helpers', function() {
  
  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));
  
  var Project = function() {};
  Project.prototype.details = function() {
    return 'this is ' + this.name;
  };
  
  beforeEach(inject(function(SneakerModel, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = SneakerModel(db);
    
    projectCollection = model.collection('project', ['name'], {proto: Project});
    taskCollection = model.collection('task', ['name']);
    tagCollection = model.collection('tag', ['name']);
    taskProjectJoin = model.join('project', 'task');
    tagProjectJoin = model.join('project', 'tag', {type: 'many-to-many'});
    
    model.dataReady();
    flush();    
  }));
  
  it('newItem works', function() {
    project1 = newItem('project', {name: 'project1'});
    expect(project1).toEqual(jasmine.any(Project));
    expect(project1.details()).toEqual('this is project1');
    
    project2 = newItem('project');
    expect(project2).toEqual(jasmine.any(Project));
  });
});