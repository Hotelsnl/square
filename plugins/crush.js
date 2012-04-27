"use strict";

var uglify = require('uglify-js')
  , child = require('./lib/child')
  , _ = require('underscore')._;

/**
 * Compression levels, the lower the faster, the higher the better.
 *
 * @type {Array}
 * @api private
 */

var level = [
    ['yui']                       // level 0
  , ['uglify']                    // level 1
  , ['closure']                   // level 2
  , ['yui', 'uglify']             // level 3
  , ['yui', 'closure']            // level 4
  , ['yui', 'closure', 'uglify']  // level 5
];

/**
 * Compiles the code as small as possible.
 *
 * Options:
 *
 * - `aggressive` use the most aggressive crushing, boolean.
 * - `level` crush level, number.
 * - `disabled` disabled a crushing mode, array.
 *
 * @param {Object} options
 * @returns {Function} middleware
 * @api public
 */

module.exports = function setup (options) {
  var settings = {
      aggressive: true
    , level: 5
    , disabled: []
  };

  _.extend(settings, options);

  /**
   * The build middleware.
   *
   * @param {Object} output
   * @param {Function} next
   * @api private
   */

  return function crush (output, next) {
    // setup the configuration based on the plugin configuration
    var configuration = _.extend(
        settings
      , this.package.configuration.plugins.crush || {}
    );

    // setup
    var logger = this.logger
      , steps = level[configuration.level]
      , compiled = output.content
      , errs = [];

    /**
     * Simple async helper function, no need to ship a 100kb async library for
     * this.
     *
     * @api private
     */

    function walk () {
      if (!steps.length || errs.lenght) {
        if (errs.length) return next(new Error(errs.toString()), output);

        output.content = compiled;
        return next(null, output);
      }

      var step = steps.shift()
        , crusher = exports[step];

      // check if this crusher supports this file type, or if this type has been
      // disabled by the user
      if (!crusher[output.extension] || ~configuration.disabled.indexOf(step)) {
        return process.nextTick(walk);
      }

      // process the data
      crusher(compiled, output.extension, configuration.aggressive, function min (err, code) {
        if (err) {
          errs.push(err.message);
        } else {
          compiled = code || compiled;
        }

        // we need to go deeper
        walk();
      });
    }

    // start processing content
    walk();
  };
};

/**
 * Closure compile all the code.
 *
 * @param {String} content
 * @param {String} extension
 * @param {Boolean} aggressive
 * @param {Function} fn
 * @api private
 */

exports.closure = function googleclosure (content, extension, aggressive, fn) {
  child.closure('js', content, {}, fn);
};

exports.closure.js = true;

/**
 * YUI minify all the code.
 *
 * @param {String} content
 * @param {String} extension
 * @param {Boolean} aggressive
 * @param {Function} fn
 * @api private
 */

exports.yui = function yui (content, extension, aggressive, fn) {
  child.yui(extension, content, {}, fn);
};

exports.yui.js = true;
exports.yui.css = true;

/**
 * Uglify the code.
 *
 * @param {String} extension
 * @param {Boolean} aggressive
 * @param {Function} fn
 * @api private
 */

exports.uglify = function ugly (content, extension, aggressive, fn) {
  var err, ast, code;

  try {
    ast = uglify.parser.parse(content);
    ast = uglify.uglify.ast_mangle(ast);
    ast = uglify.uglify.ast_squeeze(ast);

    // do even more aggressive optimizing
    if (aggressive) {
      ast = uglify.uglify.ast_lift_variables(ast);
      ast = uglify.uglify.ast_squeeze_more(ast);
    }

    // the ascii makes sure we don't fuck up Socket.IO's utf8 message
    // separators.
    code = uglify.uglify.gen_code(ast, {
        ascii_only: true
    });
  } catch (e) {
    err = e;
  }

  process.nextTick(function nextTick () {
    fn(err, code || content);
  });
};

exports.uglify.js = true;
