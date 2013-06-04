
var scripts = document.getElementsByTagName('script')

var tagRegex = /<([^ ]+) ((?:[^ ]+ *= *"[^ ]+" *)*)>/g
var attrRegex = /([^ ]+) *= *("[^ ]+")/g

for (var i in scripts) {

  if (scripts[i].type !== 'text/just.js')
    continue;
  
  var string = scripts[i].innerHTML
  if (!string)
    continue;
  
  var m = string.replace(tagRegex, function(str, tag, attrs) {
    return tag + '({'
      + attrs.replace(attrRegex, function(str, attr, value) {
        return attr + ':' + value + ',';
      }) 
      + '})'
  })
  eval(m)
}
