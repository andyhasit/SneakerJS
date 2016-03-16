var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var shell = require('gulp-shell');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');

details = {
  start: 'src/model.js',
  sources: 'src/**/*.js',
  dest: 'dist',
  outFile: 'sneakerjs',
}

gulp.task('buildNormal', function() { 
  return gulp.src([details.start, details.sources])
    .pipe(ngAnnotate())
    .pipe(concat(details.outFile + '.js'))
    .pipe(gulp.dest(details.dest))
    .on('error', function(e) {console.log(e);})
    ;
});
    
gulp.task('buildMinified', function() { 
  return gulp.src([details.start, details.sources])
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(ngAnnotate())
    .pipe(concat(details.outFile + '.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(details.dest))
    .on('error', function(e) {console.log(e);})
    ;
});

gulp.task('build', ['buildNormal', 'buildMinified'], function() { 
});

gulp.task('patch', ['build'], shell.task([
  'npm version patch',
  'npm publish'
]));

gulp.task('watch', ['build'], function() {
  gulp.watch(buildTask.sources, ['build']);
});
