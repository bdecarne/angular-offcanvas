'use strict';

var gulp = require('gulp');
var include  = require('gulp-include');
var concat  = require('gulp-concat');
var plumber  = require('gulp-plumber');
var uglify  = require('gulp-uglify');
var rename  = require('gulp-rename');
var cssmin  = require('gulp-cssmin');
var minifyHtml = require('gulp-minify-html');
var sass  = require('gulp-sass');
var autoprefixer  = require('gulp-autoprefixer')
var ngHtml2Js = require("gulp-ng-html2js");
var karma = require('karma').server;

/**
 * build : template
 */
gulp.task('build:templates', [], function() {
    return gulp.src(['templates/**/*.html'])
        .pipe(plumber())
        .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
        }))
        .pipe(ngHtml2Js({
            moduleName: "angular.dialog",
            prefix: "templates/",
            declareModule: false
        }))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest('./templates'));
});

/**
 * build : scripts
 */
gulp.task('build:scripts', ['build:templates'], function() {
    return gulp.src(['src/dialog.js', 'src/*/**/*.js', 'templates/templates.js'])
        .pipe(plumber())
        .pipe(concat('angular-dialog.js'))
        .pipe(gulp.dest('./dist/'))
        .pipe(uglify())
        .pipe(rename('angular-dialog.min.js'))
        .pipe(gulp.dest('./dist'));
});

/**
 * build : styles
 */
gulp.task('build:styles', [], function() {
    return gulp.src('scss/dialog.scss')
        .pipe(plumber())
        .pipe(sass({style: 'expanded'}))
        .pipe(autoprefixer('last 1 version, ie 9, ie 10, ie 11'))
        .pipe(rename('angular-dialog.css'))
        .pipe(gulp.dest('./dist/'))
        .pipe(cssmin())
        .pipe(rename('angular-dialog.min.css'))
        .pipe(gulp.dest('./dist'));
});

/**
 * test
 */
gulp.task('test', ['build:templates'], function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

/**
 * build
 */
gulp.task('build', ['build:scripts', 'build:styles']);

/**
 * default
 */
gulp.task('default', ['test', 'build']);


/**
 * devel : watch
 */
gulp.task('devel:watch', [] ,function () {
    gulp.watch(['src/**/*', 'templates/**/*'], ['build:scripts']);
    gulp.watch(['scss/**/*'], ['build:styles']);
});

/**
 * devel : serve
 */
gulp.task('devel:serve', ['devel:watch'], function () {
    var options = {
        server: {
            baseDir: ['devel', '.']
        },
        files: "dist/*.js",
        open: false
    };
    require('browser-sync')(options);
});