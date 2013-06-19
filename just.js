
var parser = require('./parser.js')


process.argv.slice(2).forEach(function(val) {
    console.log(parser.expandFile(val));
})
