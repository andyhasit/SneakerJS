
describe('naming one to many', function() {
  
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
  
  it('two collections and a relationship', function() {
    model.collection('project', ['name']);
    model.collection('task', ['name']);
    model.join('project', 'task');
    ready();
    
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.findTasks).toEqual('function');
    expect(typeof model.getTaskProject).toEqual('function');
    expect(typeof model.getProjectTasks).toEqual('function');
  });
  
  it('two collections with plural name', function() {
    model.collection('project', ['name']);
    model.collection('person', ['name'], {plural: 'people'});
    model.join('project', 'person');
    ready();
    
    expect(typeof model.newPerson).toEqual('function');
    expect(typeof model.getPerson).toEqual('function');
    expect(typeof model.findPeople).toEqual('function');
    expect(typeof model.getPersonProject).toEqual('function');
    expect(typeof model.getProjectPeople).toEqual('function');
  });
  
  it('collections with multiple parents different type', function() {
    model.collection('project', ['name']);
    model.collection('task', ['name']);
    model.collection('calendarDay', ['date']);
    model.join('project', 'task');
    model.join('calendarDay', 'task');
    ready();
    
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.newCalendarDay).toEqual('function');
    expect(typeof model.getTaskProject).toEqual('function');
    expect(typeof model.getTaskCalendarDay).toEqual('function');
    expect(typeof model.getProjectTasks).toEqual('function');
    expect(typeof model.getCalendarDayTasks).toEqual('function');
  });
  
  it('relationship with parent alias', function() {
    model.collection('task', ['name']);
    model.collection('calendarDay', ['date']);
    model.join('calendarDay', 'task', {parentAlias: 'plannedDate'});
    ready();
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.newCalendarDay).toEqual('function');
    expect(typeof model.getTaskPlannedDate).toEqual('function');
    expect(typeof model.setTaskPlannedDate).toEqual('function');
    expect(typeof model.getCalendarDayTasks).toEqual('function');
  });
  
  it('relationship with child alias', function() {
    model.collection('task', ['name']);
    model.collection('calendarDay', ['date']);
    model.join('calendarDay', 'task', {childAlias: 'plannedTasks'});
    ready();
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.newCalendarDay).toEqual('function');
    expect(typeof model.setTaskCalendarDay).toEqual('function');
    expect(typeof model.getCalendarDayPlannedTasks).toEqual('function');
  });
  
  it('collections with multiple parents same type to fail without aliases', function() {
    model.collection('task', ['name']);
    model.collection('calendarDay', ['date']);
    model.join('calendarDay', 'task');
    function joinWithClash (){
      model.join('calendarDay', 'task');
    }        
    expect(joinWithClash).toThrow(
      'Trying to create two containers with the same name: relationship_task_as_tasks_calendarDay_as_calendarDay on model but it already exists.'
    );
  });
   
  it('collections with multiple parents same type succeeds using aliases', function() {
    model.collection('task', ['name']);
    model.collection('calendarDay', ['date']);
    model.join('calendarDay', 'task', {
      childAlias: 'actualTasks', 
      parentAlias: 'ActualDate'
    });
    model.join('calendarDay', 'task', {
      childAlias: 'plannedTasks', 
      parentAlias: 'plannedDate'
    });
    ready();
    expect(typeof model.newTask).toEqual('function');
    expect(typeof model.newCalendarDay).toEqual('function');
    expect(typeof model.getTaskActualDate).toEqual('function');
    expect(typeof model.getTaskPlannedDate).toEqual('function');
    expect(typeof model.getCalendarDayPlannedTasks).toEqual('function');
    expect(typeof model.getCalendarDayActualTasks).toEqual('function');
  });
   
});