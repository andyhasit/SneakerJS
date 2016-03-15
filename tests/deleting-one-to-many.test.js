
describe('deleting one to many', function() {

  beforeEach(module('Relate'));
  beforeEach(module('PouchFake'));

  beforeEach(inject(function( _model_, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    //var db = new PouchDB('http://localhost:5984/test_karma');
    model = _model_;
    model.initialize(db);
  }));

  it('can delete normal items', function() {
    projectCollection = model.collection('project', ['name']);
    model.dataReady();
    flush();
    project1 = newItem('project');
    project2 = newItem('project');
    project3 = newItem('project');
    flush();
    expect(model.allProjects()).toEqual([project1, project2, project3]);
    deferred1 = model.deleteItem(project1);
    deferred2 = model.deleteItem(project3);
    deferred3 = model.saveItem(project2);
    flush();
    expect(model.allProjects()).toEqual([project2]);
  });

  it('cascades one to many at one level', function() {

    projectCollection = model.collection('project', ['name']);
    taskCollection = model.collection('task', ['name']);
    taskProjectJoin = model.join('project', 'task'); // in other words: {cascadeDelete: true} //TODO: test default sticks
    model.dataReady();
    flush();

    project1 = newItem('project');
    project2 = newItem('project');
    task1 = newItem('task');
    task2 = newItem('task');
    task3 = newItem('task');
    task4 = newItem('task');
    task5 = newItem('task');
    model.setTaskProject(task1, project2);
    model.setTaskProject(task2, project2);
    model.setTaskProject(task3, project2);
    flush();
    
    expect(model.getProjectTasks(project2)).toEqual([task1, task2, task3]);
    expect(model.allTasks()).toEqual([task1, task2, task3, task4, task5]);

    model.deleteItem(project1);
    flush();
    
    expect(model.allProjects()).toEqual([project2]);
    expect(model.allTasks()).toEqual([task1, task2, task3, task4, task5]);
    
    project3 = newItem('project');
    model.setTaskProject(task4, project3);
    model.setTaskProject(task5, project3);
    flush();
    
    expect(model.getProjectTasks(project3)).toEqual([task4, task5]);
    
    model.deleteItem(project2);
    flush();
    
    expect(model.getProjectTasks(project3)).toEqual([task4, task5]);
    expect(model.allTasks()).toEqual([task4, task5]);

  });
  
  it('cascades deletes to two levels', function() {

    projectCollection = model.collection('project', ['name']);
    taskCollection = model.collection('task', ['name']);
    subtaskCollection = model.collection('subtask', ['name']);
    model.join('project', 'task');
    model.join('task', 'subtask');
    model.dataReady();
    flush();
    
    project1 = newItem('project');
    task1 = newItem('task');
    subtask1 = newItem('subtask');
    subtask2 = newItem('subtask');
    model.setTaskProject(task1, project1);
    model.setSubtaskTask(subtask1, task1);
    model.setSubtaskTask(subtask2, task1);
    
    project2 = newItem('project');
    task2 = newItem('task');
    subtask3 = newItem('subtask');
    subtask4 = newItem('subtask');
    model.setTaskProject(task2, project2);
    model.setSubtaskTask(subtask3, task2);
    model.setSubtaskTask(subtask4, task2);
    flush();
    
    expect(model.allSubtasks()).toEqual([subtask1, subtask2, subtask3, subtask4]);
    
    model.deleteItem(project1);
    flush();
    expect(model.allTasks()).toEqual([task2]);
    expect(model.allSubtasks()).toEqual([subtask3, subtask4]);
  });
  
  it('does not cascadeDelete if cascadeDelete set to false', function() {

    projectCollection = model.collection('project', ['name']);
    taskCollection = model.collection('task', ['name']);
    taskProjectJoin = model.join('project', 'task', {cascadeDelete: false});
    model.dataReady();
    flush();
    
    project1 = newItem('project');
    project2 = newItem('project');
    task1 = newItem('task');
    task2 = newItem('task');
    task3 = newItem('task');
    model.setTaskProject(task1, project1);
    model.setTaskProject(task2, project2);
    model.setTaskProject(task3, project2);
    flush();
    
    expect(model.getTaskProject(task1)).toBe(project1);
    expect(model.getTaskProject(task2)).toBe(project2);
    expect(model.getTaskProject(task3)).toBe(project2);
    
    model.deleteItem(project2);
    flush();
    
    expect(model.allTasks()).toEqual([task1, task2, task3]);
    expect(model.getTaskProject(task1)).toBe(project1);
    expect(model.getTaskProject(task2)).toBe(null);
    expect(model.getTaskProject(task3)).toBe(null);
    
  });

});