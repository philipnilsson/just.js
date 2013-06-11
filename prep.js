
var scripts = document.getElementsByTagName('script')

var tagRegex = /'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|<\/>|<([a-zA-Z-]+)((?: *:?[a-zA-Z-]+ *= *"[^"\r\n]*")*) *>/g
var attrRegex = /(:?[a-zA-Z-]+) *= *("[^"\r\n]*")/g

for (var i in scripts) {

  if (scripts[i].type !== 'text/just.js')
    continue;
  
  var string = scripts[i].innerHTML
  if (!string)
    continue;
  
  var tstack = []

  string = string.replace(/<\/>[ \r\n\t]*(..)/g, function(str, c){
    if (c.charAt(0) == '<' && c.charAt(1) != '/' || c.charAt(0) == "'" )
        return '</>, ' + c;
    return str;
  });
  
  string = string.replace(tagRegex, function(str, tag, attrs) {
    if (str == "</>") {
      var res = '';
      var args = tstack.pop() || []
      for (var i in args) 
        res += '["' + args[i].attr.slice(1) + '"](function() { return ' + 
            args[i].value.replace('@', 'this.') + ' })';
      return ")" + res;
    }
    if (str.charAt(0) === "'" || str.charAt(0) === '"')
        return str
    var targs = []
    var res = 'just.' + tag + '({'
      + attrs.replace(attrRegex, function(str, attr, value) {
        if (attr.charAt(0) == ':') {
          targs.push({attr:attr, value:value.slice(1,value.length-1)})
          return ''
        }
        return '"' + attr + '"' + ':' + value + ',';
      }) 
      + '})';
    tstack.push(targs);
    return res + '('; 
  })
  
  string = string.replace(/['](.*)[']/g, function(_, str) {
    var res = str.replace(/{{([^}]*)}}/g, function(_, exp) {
      return "', function(){ return " + exp.replace('@', 'this.') + "},'"
    });
    return "'" + res + "'"; 
  });
  
  console.log(string)
  eval(string)
}
