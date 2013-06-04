
var scripts = document.getElementsByTagName('script')

var tagRegex = /'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|<([a-zA-Z-]+)((?: *[a-zA-Z-]+ *= *"[^"\r\n]*")*) *>/g
var attrRegex = /([a-zA-Z-]+) *= *("[^"\r\n]*")/g

for (var i in scripts) {

  if (scripts[i].type !== 'text/just.js')
    continue;
  
  var string = scripts[i].innerHTML
  if (!string)
    continue;
  
  var m = string.replace(tagRegex, function(str, tag, attrs) {
    if (str[0] === "'" || str[0] === '"')
        return str
    return tag + '({'
      + attrs.replace(attrRegex, function(str, attr, value) {
        return '"' + attr + '"' + ':' + value + ',';
      }) 
      + '})'
  })
  eval(m)
}
