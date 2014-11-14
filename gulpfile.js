'use strict';

var gulp        = require('gulp');
var wiredep     = require('wiredep');
var inject      = require('gulp-inject');
var browserSync = require('browser-sync');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var cp          = require('child_process');
var rename      = require('gulp-rename');
var minifyCSS   = require('gulp-minify-css');
var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var imagemin    = require('gulp-imagemin');
var bower       = require('gulp-bower');
var deploy = require('gulp-gh-pages');


var config = {
    bowerDir: './bower_components'
}

var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

gulp.task('vendor-scripts', ['jekyll-build'], function() {

  return gulp.src(wiredep().js)
    .pipe(gulp.dest('_site/js/vendor'));

});

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn('bundle', ['exec','jekyll','build'], { stdio: 'inherit' })
        .on('close', done);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['build', 'index'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['build', 'index'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});

gulp.task('index', ['vendor-scripts'], function() {

  return gulp.src('_site/index.html')
    .pipe(wiredep.stream({
      fileTypes: {
        html: {
          replace: {
            js: function(filePath) {
              return '<script src="' + 'js/vendor/' + filePath.split('/').pop() + '"></script>';
            },
            css: function(filePath) {
              return '<link rel="stylesheet" href="' + 'js/vendor/' + filePath.split('/').pop() + '"/>';
            }
          }
        }
      }
    }))

    .pipe(inject(
      gulp.src(['_site/js/*.js'], { read: false }), {
        addRootSlash: false,
        transform: function(filePath, file, i, length) {
          return '<script src="' + filePath.replace('_site/', '') + '"></script>';
        }
      }))

//    .pipe(plugins.inject(
//      gulp.src(['build/assets/**/*.css'], { read: false }), {
//        addRootSlash: false,
//        transform: function(filePath, file, i, length) {
//          return '<link rel="stylesheet" href="' + filePath.replace('build/', '') + '"/>';
//        }
//      }))

    .pipe(gulp.dest('_site'));
});

gulp.task('build', ['js', 'css']);

/**
 * Compile files from src into both _site/dist/css (for live injecting) and dist/css (for future jekyll builds)
 */
gulp.task('css', function () {
    gulp.src('css/**/*.css')
        .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('_site/css'))
        .pipe(rename('build.min.css'))
        .pipe(browserSync.reload({stream:true}))
        .pipe(gulp.dest('./dist/css'));
});


gulp.task('js', function() {
    gulp.src('js/**/*.js')
        .pipe(gulp.dest('_site/js'))
        .pipe(concat('build.js'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(browserSync.reload({ stream: true }))
        .pipe(gulp.dest('./dist/js'));
});

// gulp.task('images', function() {
//     gulp.src('src/images/**/*.+(png|jpeg|jpg|gif|svg)')
//         .pipe(imagemin())
//         .pipe(gulp.dest('_site/dist/img'))
//         .pipe(browserSync.reload({ stream: true }))
//         .pipe(gulp.dest('dist/img'));
// })


/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
    gulp.watch('css/*.css', ['css']);
    gulp.watch(['index.html', '_layouts/*.html', '_posts/*', '_config.yml'], ['jekyll-rebuild']);
    gulp.watch('js/*.js', ['js']);
    // gulp.watch('src/images/**/*.+(png|jpeg|jpg|gif|svg)', ['images']);
});

gulp.task('deploy', function () {
    return gulp.src('./dist/**/*')
        .pipe(deploy(options));
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['browser-sync', 'watch']);
