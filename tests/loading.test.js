
describe('loading', function() {
  
  beforeEach(module('Relate'));
  beforeEach(module('PouchFake'));
  
  var task1, task2, task3, task4, 
      tag1, tag2, tag3, tag4,
      project1, project2, project3;
  
  var Project = function() {};
  Project.prototype.details = function() {
    return 'this is ' + this.name;
  };
  
  beforeEach(inject(function( _model_, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = _model_;
    model.initialize(db);
        
        
    projectCollection = model.collection('project', ['name'], {constructorFunction: Project});
    taskCollection = model.collection('task', ['name']);
    tagCollection = model.collection('tag', ['name']);
    taskProjectJoin = model.join('project', 'task');
    tagProjectJoin = model.join('project', 'tag', {type: 'manyToMany'});
    
    db.setData(taskCollection.dbDocumentType, ['name', taskProjectJoin.foreignKey], [
      ['task1', null],
      ['task2', 'project_1'],
      ['task3', 'project_1'],
      ['task4', 'project_2'],
    ]);
    db.setData(projectCollection.dbDocumentType, ['name'], [
      ['project1'],
      ['project2'],
      ['project3'],
    ]);
    db.setData(tagCollection.dbDocumentType, ['name'], [
      ['work'],
      ['home'],
      ['misc'],
      ['unused'],
    ]);
    db.setData(tagProjectJoin.dbDocumentType, ['left', 'right'], [
      ['project_1', 'tag_1'],
      ['project_1', 'tag_2'],
      ['project_2', 'tag_2'],
      ['project_2', 'tag_3'],
    ]);
      /*
    project1 [task2, task3] [tag1, tag2]
    project2 [task4] [tag2, tag3]
    */
    
    model.dataReady();
    flush();
    
    task1 = model.getTask('task_1');
    task2 = model.getTask('task_2');
    task3 = model.getTask('task_3');
    task4 = model.getTask('task_4');
    tag1 = model.getTag('tag_1');
    tag2 = model.getTag('tag_2');
    tag3 = model.getTag('tag_3');
    tag4 = model.getTag('tag_4');
    project1 = model.getProject('project_1');
    project2 = model.getProject('project_2');
    project3 = model.getProject('project_3');
    
  }));
  
  it('loaded items have expected properties', function() {
    expect(task2._id).toEqual('task_2');
    expect(task2._rev).toEqual('1-task_2');
    expect(tag2.name).toEqual('home');
    expect(project1.name).toEqual('project1');
  });
  
  it('uses constructor function if provided', function() {
    expect(project1).toEqual(jasmine.any(Project));
    expect(project1.details()).toEqual('this is project1');
  });
  
  it('sets up one to many relationships correctly', function() {
    expect(model.getProjectTasks(project1)).toEqual([task2, task3]);
    expect(model.getProjectTasks(project2)).toEqual([task4]);
    expect(model.getProjectTasks(project3)).toEqual([]);
    expect(model.getTaskProject(task1)).toEqual(null);
    expect(model.getTaskProject(task2)).toEqual(project1);
    expect(model.getTaskProject(task3)).toEqual(project1);
    expect(model.getTaskProject(task4)).toEqual(project2);
  }); 
  
  it('sets up many to many relationships correctly', function() {
    expect(model.getProjectTags(project1)).toEqual([tag1, tag2]);
    expect(model.getProjectTags(project2)).toEqual([tag2, tag3]);
    expect(model.getProjectTags(project3)).toEqual([]);
    expect(model.getTagProjects(tag1)).toEqual([project1]);
    expect(model.getTagProjects(tag2)).toEqual([project1, project2]);
    expect(model.getTagProjects(tag3)).toEqual([project2]);
    expect(model.getTagProjects(tag4)).toEqual([]);
  });
  
});