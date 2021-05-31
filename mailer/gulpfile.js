var gulp = require('gulp');
var inky = require('inky');
var inlinesource = require('gulp-inline-source');
var inlineCss = require('gulp-inline-css');

gulp.task('build', function() {
  return gulp.src('./inline/*.html')
    .pipe(inlinesource())
    .pipe(inky())
    .pipe(inlineCss())
    .pipe(gulp.dest('./output/'));
});
gulp.task('watch', function() {
  gulp.watch(['./inline/*.html'], ['build']);
});
gulp.task('default', ['build', 'watch']);
