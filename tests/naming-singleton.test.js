describe('naming singleton', function() {
  
  beforeEach(module('SneakerJS'));
  beforeEach(module('PouchFake'));
  
  beforeEach(inject(function( _model_, _$rootScope_, FakeDb, $q) {
    $rootScope = _$rootScope_;
    var db = new FakeDb();
    model = _model_;
    model.initialize(db);
  }));
  
  it('creates accessor functions', function() {
    model.singleton('settings');
    ready();
    expect(typeof model.setSettings).toEqual('function');
    expect(typeof model.getSettings).toEqual('function');
  });
  
});