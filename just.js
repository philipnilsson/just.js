
var fs = require('fs');
var _  = require('./parser.js')

var expandFile = function(fileName) {
    var data = fs.readFileSync(fileName, "utf8");
    return _.expandStr(data);
}

process.argv.slice(2).forEach(function(val) {
    console.log(expandFile(val));
})
