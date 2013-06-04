function tag(tagName, attributes, content) {
    var el = document.createElement(tagName)
    for (var i in attributes)
        el[i] = attributes[i]
    el.appendChild(content)
    return el
}
function text(str) {
    return document.createTextNode(str);
}
function append(tmplA, tmplB) { 
    if (tmplA == null)
        return tmplB
    var frag = document.createDocumentFragment()
    frag.appendChild(tmplA)
    frag.appendChild(tmplB)
    return frag
}
function mnull(){ 
    return document.createDocumentFragment()
}
function mconcat(tmpls) {
    var frag = document.createDocumentFragment()
    for (var i in tmpls)
        frag.appendChild(tmpls[i])
    return frag
}
function tell(s) {
    return new tmpl(function(_) { return function(r) {
      return { value: null, template: s } 
    }})
}
function ask(by) {
    return new tmpl(function(c) { 
        var f = function (r) { return r }
        if (by !== null) {
            var run = interpolate(by).run(c)
            f = function(r) { return run(r).value }
        }
        return function(r) {
            return { value: f(r), template: mnull() }
        }
    })
}
function value(x) {
    return new tmpl(function(_) { return function(x) {
        return { value: x, template: mnull() }
    }})
}
function fromFunc(f) {
  return new tmpl(function(_) { return function(r) { 
      var result = f.bind(r).apply(null)
      return { template: text(result), value: result } 
  }})
}
function tmpl(run){  
    this.run = run
    this.compile = run
    this.flatMap = function(f) {
        var self = this
        return new tmpl(function(c) { 
            var runA = self.run(c)
            return function(r) {
                var resA = runA(r)
                var resB = f(resA.value).run(c)(r)
                return { 
                    value: resB.value, 
                    template: append(resA.template, resB.template)
            }
        }})
    }
    this.repeat = function() {
        var self = this
        return new tmpl(function(c){ 
            var run = self.run(c)
            return function(arr) {
                var tmpl = [], vals = []
                for (var i in arr) {
                    var res = run(arr[i])
                    vals.push(res.value)
                    tmpl.push(res.template)
                }
                return { 
                    value: vals,
                    template: mconcat(tmpl)
                }
            }})
    }
    this.then = function(template, f) {
        var self = this
        if (f == null) f = function(x) { return x }
        return new tmpl(function(c){ 
            var run = self.run(c)
            var runT = interpolate(template).run(c)
            return function(x) {
                var res = run(x)
                return { 
                    value: res.value,
                    template: append(res.template, f(res.value) ? runT(x).template :  mnull())
                }
            }
        })
    }
    this.otherwise = function(template) {
        return this.then(template, function(x) { return !x })
    }
    this.mapEnv = function(trans) {
        var self = this
        return new tmpl(function (c) { 
            var run = self.run(c)
            return function(x) {
                return run(trans(x))
            }})
    }
    this.map = function(f) {
        var self = this
        return new tmpl(function(c) { 
            var run = self.run(c)
            return function(r) {
                var res = run(r)
                return { value: f(res.value), template: res.template }
            }})
    }
    this.and = function(other) {
        var self = this
        return new tmpl(function(c) {
            var runA = self.run(c)
            var runB = other.run(c)
            return function(r) {
                var resA = runA(r)
                var resB = runB(r)
                var tmpA = document.createElement('divA')
                return {
                    value: resB.value, 
                    template: append(resA.template, resB.template)
                }
            }
        })
        return this.flatMap(function(_) { return other } )
    }
    this.tell = function() {
        return this.flatMap(tell)
    }
    this.withContext = function(name, value) { 
        var self = this;
        return new tmpl(function(c) { 
            return self.run(c.concat([{name: name, value: value}]))
        })
    }
    this.compile = function(c) { return this.run(c) }
}

repeat = function(template) {
    return template.repeat()
}

var makeTag = function(tagName) {
  return function(attrs) {
    
    for (var i in attrs) 
        attrs[i] = interpolateStr(attrs[i])
    
    return function() {
      var content = value(null)
      var len = arguments.length;
      for (var i = 0; i < len; i++) {
          if (typeof arguments[i] === 'string')
              arguments[i] = interpolate(arguments[i])
          if (typeof arguments[i] === 'function') {
              arguments[i] = fromFunc(arguments[i])
          }
          content = content.and(arguments[i])
      }
      
      return new tmpl(function(c) { 
          var as = {}
          for (var i in attrs) {
              as[i] = attrs[i].run(c)
          }
          var runContent = content.run(c)
          return function(x) {
              var attributes = {}
              for (var i in as) {
                  attributes[i] = as[i](x).template
              }
              var c = runContent(x)
              return { 
                  value: c.value, 
                  template: tag(tagName, attributes, c.template)
              }
          }
      })
    } 
}}

function interpolate(str) { 
    return interpolateGen(str, mnull(), append, text) 
}
function interpolateStr(str) { 
    return interpolateGen(str, '', function(x,y) { return x + y}, function(x){return x}) 
}
function interpolateGen(str, none, mappend, wrap) {
    var parts = []
    while (str) {
        var i = str.indexOf('{{')
        if (i < 0) {
            parts.push(str)
            break
        }
        parts.push(str.slice(0, i))
        str = str.slice(i + 2)
        var j = str.indexOf('}}')
        if (j < 0)
            throw new Error('Parse error in template: Missing "}}"')
        
        parts.push((function(body) { return function (cs) { 
            return new Function(cs, 'return ' + body)
        }})(str.slice(0,j)))
        
        str = str.slice(j + 2)
    }
    return new tmpl(function(c) { 
          
        var cs = c.map(function(x) { return x.name })
        var vs = c.map(function(x) { return x.value })
        var ps = []
        for (var i in parts){
            ps[i] = parts[i]
            if (ps[i] instanceof Function)
                ps[i] = (ps[i])(cs)
        }
        
        return function(x) {
            var s = none
            var retVal = null
            for (var i in ps) {
                var p = ps[i]
                if (p instanceof Function) {
                    p = p.bind(x).apply(null, vs)
                    retVal = p
                }
                
                s = mappend(s, wrap(p))
            }
            return { value: retVal, template: s }
        }
    })
}

div   = makeTag('div')
span  = makeTag('span')
table = makeTag('table')
tr    = makeTag('tr')
td    = makeTag('td')

// var test =
//   div({id: 'container'},
//     div({id: 'foo'},
//       'MyFoo: ',
//       ask('{{this.foo}}')
//         .then('My foo is {{this.foo}}')
//         .otherwise('I have no foo, my keys are [{{Object.keys(this)}}].')),
//     div({id: 'bar'},
//       'Bar: {{this.bar}}'))

// tableTemplate = 
//   function(name, template) {
//     return (
//       div({'class': '{{name}}-table table-def'},
//         repeat(
//           div ({'class': '{{name}}-row table-row'},
//             span({'class': '{{name}}-cell table-cell'},
//               template))))
//       .withContext('name', name)
//     )
//   }

// var person = div('My name is {{this.name}}')
// personTable = tableTemplate('person', person).run([])

// app = function(id, x) {
//     document.getElementById(id).innerHTML = x.template;
// }

// cycle = function(x, i) {
//     if (i == 0) return []
//     return x.concat(cycle(x, i- 1))
// }
