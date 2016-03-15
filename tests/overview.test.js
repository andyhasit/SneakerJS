
describe('overview', function() {
  
  beforeEach(module('Relate'));
  beforeEach(module('PouchFake'));
  
  var task1, task2, task3, task4, project1, project2;
  
  beforeEach(inject(function( _model_, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    
    db.setData('task', ['name', '__project'], [
      ['task1', null],
      ['task2', 'project_1'],
    ]);
    db.setData('project', ['name'], [
      ['project1'],
      ['project2'],
    ]);
    
    model = _model_;
    model.initialize(db);
    model.collection('project', ['name']);
    model.collection('task', ['name']);
    model.join('project', 'task');
    /* Start conditions:
      project1: [task2]
      project2: []
    */
    model.dataReady();
    flush();
    
    task1 = model.getTask('task_1');
    task2 = model.getTask('task_2');
    project1 = model.getProject('project_1');
    project2 = model.getProject('project_2');
    
  }));
  
  it('creates accessor functions', function() {
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.findTasks).toEqual('function');
    expect(typeof model.getTask).toEqual('function');
    expect(typeof model.allTasks).toEqual('function');
    expect(typeof model.newProject).toEqual('function');
    expect(typeof model.findProjects).toEqual('function');
    expect(typeof model.getProject).toEqual('function');
    expect(typeof model.allProjects).toEqual('function');
    expect(typeof model.getTaskProject).toEqual('function');
    expect(typeof model.getProjectTasks).toEqual('function');
  });
   
  it('getItem works on fresh load', function() {
    expect(typeof task2).toEqual('object');
    expect(task2._id).toEqual('task_2');
  });
  
  it('loaded items have expected properties', function() {
    expect(task2._id).toEqual('task_2');
    expect(task2._rev).toEqual('1-task_2');
    expect(task2.name).toEqual('task2');
  });
  
  it('getParent works on fresh load', function() {
    expect(model.getTaskProject(task2)).toEqual(project1);
  });
  
  it('getChildren works on fresh load', function() {
    expect(model.getProjectTasks(project1)).toEqual([task2]);
  });
  
  /*save delete new */
  
  it('find works with object as query', function() {
    var results = model.findTasks({name: 'task1'});
    expect(results).toEqual([task1]);
  });
  
  it('find with empty object as query returns all objects', function() {
    var results = model.findTasks({});
    expect(results).toEqual([task1, task2]);
  });
  
  it('can create items', function() {
    var task3;
    model.newTask({name: 'unicycle'}).then(function() {
      task3 = model.findTasks({name: 'unicycle'})[0];
    });
    flush();
    expect(task3.name).toEqual('unicycle');
    expect(model.findTasks({}).length).toEqual(3);
  });
  
  it('can link items', function() {
    expect(model.getTaskProject(task2)).toEqual(project1);
    expect(model.getTaskProject(task1)).toEqual(null);
    expect(model.getProjectTasks(project1)).toEqual([task2]);
    
    model.setTaskProject(task1, project1);
    flush();
    expect(model.getTaskProject(task1)).toEqual(project1);
    expect(model.getProjectTasks(project1)).toEqual([task2, task1]);
  });
  
  it('can link and unlink items at will', function() {
    expect(model.getProjectTasks(project1)).toEqual([task2]);
    model.newProject({name: 'newProj'}).then(function(proj) {
      newProject = proj;
    });
    flush();
    expect(newProject.name).toEqual('newProj');
    model.setTaskProject(task2, newProject);
    flush();
    expect(model.getProjectTasks(project1)).toEqual([]);
    expect(model.getTaskProject(task2)).toEqual(newProject);
  });
  
});