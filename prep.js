
var scripts = document.getElementsByTagName('script')
var regex = new RegExp(/\<([^ ]+) ((?:[^ ]+[ ]*=[ ]*"[^ ]+" *)*)\>/g)

for (var i in scripts) {

  if (scripts[i].type !== 'text/just.js')
    continue;
  
  var string = scripts[i].innerHTML
  if (!string)
    continue;
  
  var m = string.replace(regex, function(str, tag, attrs) {
    return tag + '({'
      + attrs.replace(/([^ ]+)[ ]*=[ ]*("[^ ]+")/g, function(str, attr, value) {
        return attr + ':' + value + ',';
      }) 
      + '})'
  })
  eval(m)
}
