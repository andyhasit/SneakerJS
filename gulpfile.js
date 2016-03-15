var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');

task = {
  name: 'scripts',
  start: 'src/module.js',
  sources: 'src/**/*.js',
  dest: 'dist',
  outFile: 'relate.js'
}

gulp.task(task.name, function() { 
  return gulp.src([task.start, task.sources])
    .pipe(sourcemaps.init({loadMaps: true}).on('error', function(e) {console.log(e);}))
    .pipe(ngAnnotate().on('error', function(e) {console.log(e);}))
    .pipe(concat(task.outFile).on('error', function(e) {
      console.log(e);
    }))
    //.pipe(uglify().on('error', function(e) {console.log(e);}))
    //.pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(task.dest))
    .pipe(gulp.dest('demos/lib'));
});

gulp.task('watch', [task.name], function() {
  gulp.watch(task.sources, [task.name]);
});
