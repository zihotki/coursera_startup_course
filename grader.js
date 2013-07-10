#!/usr/bin/env node

/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:
+ cheerio
- https://github.com/MatthewMueller/cheerio
- http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
- http://maxogden.com/scraping-with-node.html

+ commander.js
- https://github.com/visionmedia/commander.js
- http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

+ JSON
- http://en.wikipedia.org/wiki/JSON
- https://developer.mozilla.org/en-US/docs/JSON
- https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var restler = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";;

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if (!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html (search for process exit code)
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile){
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksFile) {
    return JSON.parse(fs.readFileSync(checksFile));
};

var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for (var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

// This function initializes and returns a function that can be used
// by the restler .on event. I chose to add a callback function since this
// function is asynchronous. Evidently checkHtmlFile and checkHtmlUrl behave differently
// which can be bad if we use grader.js mostly as a module instead of standalone.
var checkHtmlUrl = function(checksfile, callback) {
    var response = function(result, response) {
        if (result instanceof Error) {
            console.error('Error: ' + util.format(response.message));
        } else {
            $ = cheerio.load(result);
            var checks = loadChecks(checksfile).sort();
            var out = {};
            for (var ii in checks) {
                var present = $(checks[ii]).length > 0;
                out[checks[ii]] = present;
            }
            callback(out);
        }
    };
    return response;
};

var clone = function(fn) {
    // Workaround for commander.js issue. <http://stackoverflow.com/a/6772648>
    return fn.bind({});
};

if ( require.main == module ) {
    program
      .version('1.99.1')
      .option('-c --checks <check_file>', 'path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
      .option('-f, --file <html_file>', 'path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
      .option('-u, --url <url>', 'url to check instead of file')
      .parse(process.argv);
    if ( program.url && program.file == HTMLFILE_DEFAULT) {
        var printJson = function(checkJson){
            var outJson = JSON.stringify(checkJson, null, 4);
            console.log(outJson);
        };
        var checkJson = checkHtmlUrl(program.checks,printJson);
        restler.get(program.url).on('complete', checkJson);
    } else if ( program.url && program.file != HTMLFILE_DEFAULT) {
        console.log("You gave me both an url and a file on disk but I can't check both on the same time.");
        process.exit(1);
    } else {
        checkJson = checkHtmlFile(program.file, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkHtmlUrl = checHtmlUrl;
}