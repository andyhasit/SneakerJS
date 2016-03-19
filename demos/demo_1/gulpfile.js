var gulp = require('gulp');
var concat = require('gulp-concat');

function compileFiles(files, name, dest) {
  return gulp.src(files)
    .pipe(concat(name))
    .pipe(gulp.dest(dest))
}

var settings = {
  baseDir: 'build'
};

// This creates property settings.jsDir, settings.cssDir for output dirs
['js', 'css', 'templates', 'img', 'fonts'].forEach(function(subDir) {
  settings[subDir + 'Dir'] = settings.baseDir + '/' + subDir;
});
//settings.jsDir = 'someOtherLocation' //overrid.

gulp.task('buildLibJs', function() {
  files = [
    'node_modules/angular/angular.js',
    'node_modules/angular-ui-router/release/angular-ui-router.js',
    'node_modules/angular-ui-bootstrap/dist/ui-bootstrap.js',
    'node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js',
    'node_modules/pouchdb/dist/pouchdb.min.js',
    'node_modules/sneakerjs/dist/sneakerjs.js',
    'node_modules/angular-unsavedchanges/lib/unsavedChanges.js'
  ];
  return compileFiles(files, 'lib.js', settings.jsDir);
});

gulp.task('buildLibCSS', function() {
  files = [
    'node_modules/bootstrap/dist/css/bootstrap.min.css',
    'node_modules/angular-ui-bootstrap/dist/ui-bootstrap-csp.css'
  ];
  return compileFiles(files, 'lib.css', settings.cssDir);
});

gulp.task('copyFonts', function() {
  gulp.src('node_modules/bootstrap/fonts/**/*').pipe(gulp.dest(settings.fontsDir));
});

gulp.task('buildLib', ['buildLibJs', 'buildLibCSS', 'copyFonts']);

gulp.task('buildAppCSS', function () {
  return gulp.src(['src/css/**/*.css'])
   .pipe(concat('app.css'))
   .pipe(gulp.dest(settings.cssDir))
});

gulp.task('buildAppJs', function() {
  return compileFiles(['src/js/app.js', 'src/js/**/*.js'], 'app.js', settings.jsDir);
});

gulp.task('copyIndex', function() {
  gulp.src('src/index.html').pipe(gulp.dest(settings.baseDir));
});

gulp.task('copyImgs', function() {
  gulp.src('src/img/**/*').pipe(gulp.dest(settings.imgDir));
});

gulp.task('copyTemplates', function() {
  gulp.src('src/templates/**/*').pipe(gulp.dest(settings.templatesDir));
});

gulp.task('buildAppStatic', ['copyIndex', 'copyImgs', 'copyTemplates']);

gulp.task('buildApp', ['buildAppJs', 'buildAppCSS', 'buildAppStatic']);

gulp.task('buildAll', ['buildApp', 'buildLib']);

gulp.task('watch', ['buildApp', 'buildLibJs'], function() {
  gulp.watch('src/**/*', ['buildApp']);
});
