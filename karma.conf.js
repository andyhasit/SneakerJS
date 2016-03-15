// Karma configuration
// Generated on Tue Feb 10 2015 14:46:14 GMT+0000 (GMT Standard Time)

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/pouchdb/dist/pouchdb.js',
      //Your app scripts {pattern: 'users/**/*.html', included: false, served: true},
      'src/module.js',
      'src/**/*.js',
      //And your specs
      'tests/test-helpers.js',
      'tests/**/*.test.js'
    ],
    exclude: [
    ],
    reporters: ['nicer'], //'dots', 'progress'
    port: 9876,
    colors: true,
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_ERROR,
    autoWatch: false,
    browsers: ['PhantomJS'],//'Chrome' PhantomJS
    singleRun: true,
    concurrency: Infinity
  });
};
