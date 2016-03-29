
describe('deleting many to many', function() {

  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));

  beforeEach(inject(function(SneakerModel, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = new SneakerModel(db);

    projectCollection = model.collection('project', ['name']);
    taskCollection = model.collection('task', ['name']);
    tagCollection = model.collection('tag', ['name']);
    taskProjectJoin = model.oneToMany('project', 'task');
    tagProjectJoin = model.manyToMany('project', 'tag');
    model.dataReady();
    flush();
  }));

  it('can delete from right', function() {

    project1 = newItem('project');
    project2 = newItem('project');
    tag1 = newItem('tag');
    tag2 = newItem('tag');
    tag3 = newItem('tag');

    model.addProjectTag(project1, tag2);
    model.addProjectTag(project1, tag3);
    flush();

    expect(model.isProjectLinkedToTag(project1, tag2)).toEqual(true);
    expect(model.isProjectLinkedToTag(project1, tag3)).toEqual(true);
    expect(model.getProjectTags(project1)).toEqual([tag2, tag3]);
    expect(model.getTagProjects(tag1)).toEqual([]);
    expect(model.getTagProjects(tag2)).toEqual([project1]);
    expect(model.getTagProjects(tag3)).toEqual([project1]);

    //now delete.
    model.deleteItem(project1);
    flush();
    expect(model.getTagProjects(tag2)).toEqual([]);
    expect(model.getTagProjects(tag3)).toEqual([]);
    
  });
  
   it('can delete from left', function() {

    project1 = newItem('project');
    project2 = newItem('project');
    tag1 = newItem('tag');
    tag2 = newItem('tag');
    tag3 = newItem('tag');

    model.addProjectTag(project1, tag2);
    model.addProjectTag(project1, tag3);
    flush();

    expect(model.isProjectLinkedToTag(project1, tag2)).toEqual(true);
    expect(model.isProjectLinkedToTag(project1, tag3)).toEqual(true);
    expect(model.getProjectTags(project1)).toEqual([tag2, tag3]);
    expect(model.getTagProjects(tag1)).toEqual([]);
    expect(model.getTagProjects(tag2)).toEqual([project1]);
    expect(model.getTagProjects(tag3)).toEqual([project1]);

    //now delete.
    model.deleteItem(tag2);
    flush();
    expect(model.getProjectTags(project1)).toEqual([tag3]);
    
  });

});


