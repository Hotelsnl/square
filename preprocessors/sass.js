"use strict";

/**!
 * [square]
 * @copyright (c) 2012 observe.it (observe.it) <opensource@observe.it>
 * MIT Licensed
 */

/**
 * Native modules
 */
var fs = require('fs')
  , path = require('path');

/**
 * Third party modules.
 */
var canihaz = require('canihaz')('square');

/**
 * Process sass files.
 *
 * @param {String} content the raw file content that needs to be processed
 * @param {Object} context processing details
 * @param {Function} done
 * @api public
 */
var sass = module.exports = function sass(content, context, done) {
  var bundle = this;

  canihaz['node-sass'](function omgktnxbai(err, sass) {
    if (err) return done(err);

    sass.render(content, done);
  });
};

/**
 * Parse our potential import statements from the supplied content. It should
 * also parse the import statements recursively.
 *
 * @param {String} location location of the file that needs to be parsed
 * @param {Array} paths collection to append to
 * @param {Array} current reference to currently found files
 * @returns {Array} absolute paths
 * @api public
 */
sass.imports = function imports(location, paths, current) {
  paths = paths || [];
  current = current || [];
  if (!fs.existsSync(location)) return paths;

  // Get the file, unparsed so we can minimize the overhead of parsing it
  var content = fs.readFileSync(location, 'utf8')
    , directory = path.dirname(location)
    , ext = path.extname(location);

  // Parse out require statements for the files, supporting the following
  // formats: require 'fs', require "fs", require('fs') and require("fs")
  content.replace(/@import\s[\"\']?([^\'\"]+)[\"\']?/gm, function detect(x, match) {
    // If there is no file extension, assume .styl
    if (!path.extname(path.basename(match))) match += ext;
    match = path.join(directory, match);

    if (!~paths.indexOf(match)) {
      paths.push(match);
      current.push(match);
    }
  });

  // Iterate over all the paths to see if required files also contains files
  // that we need to watch.
  current.forEach(function recursive(location) {
    paths = sass.imports(location, paths, []);
  });

  return paths;
};

/**
 * What output extensions does this pre-processor generate once the code has been
 * compiled?.
 *
 * @type {Array}
 */
sass.extensions = [ 'css' ];
