function append(tmplA, tmplB) { 
    if (tmplA == null)
        return tmplB
    return tmplA + tmplB
}
function mnull(){ 
    return ''
}
function mconcat(tmpls) {
    return tmpls.reduce(append, mnull())
}
function tell(s) {
    return new tmpl(function(_) { return function(r) {
      return { value: null, template: s } 
    }})
}
function ask(by) {
    return new tmpl(function(c) { 
        var f = function (r) { return r }
        if (by !== null) 
            f = function(r) { return interpolate(by).run(c)(r).value }
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
        return this.flatMap(function(_) { return other } )
    }
    this.tell = function() {
        return this.flatMap(tell)
    }
    this.withContext = function(name, value) { 
        var self = this;
        return new tmpl(function(c) { 
            console.log(c.concat([{name: name, value: value}]))
            return self.run(c.concat([{name: name, value: value}]))
        })
    }
}

repeat = function(template) {
    return template.repeat()
}

var makeTag = function(tagName) {
  return function() {
    if (arguments.length > 0 && (typeof arguments[0] == 'string' || arguments[0] instanceof tmpl)) {
        [].unshift.call(arguments, {})
    }
    var content = value(null)
    for (var i = 1; i < arguments.length; i++) {
        if (typeof arguments[i] === 'string')
            arguments[i] = interpolate(arguments[i])
        content = content.and(arguments[i])
    }
    
    var arg0 = arguments[0];
    return new tmpl(function(c) { 
        for (var i in arg0)
            arg0[i] = interpolate(arg0[i]).run(c)
        var runContent = content.run(c)
        return function(x) {
            var attrs = ""
            for (var i in arg0) {
                attrs += i + '="'+ arg0[i](x).template + '"'
            }
            var c = runContent(x)
            return { 
                value: content.value, 
                template: '<' + tagName + ' ' + attrs + '>' + c.template + '</' + tagName + '>'
            }
        }
    })
  }
}

function interpolate(str) {
    var parts = []
    return new tmpl(function(c) { 
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
          var expression = str.slice(0, j)
          
          parts.push(new Function(c.map(function(x){return x.name}), 'return ' + str.slice(0, j)))
          str = str.slice(j + 2)
        }
        return function(x) {
            var s = ''
            var retVal = null
            for (var i in parts) {
                if (typeof parts[i] === 'string')
                    s += parts[i]
                else {
                    retVal = parts[i].bind(x).apply(null, c.map(function(x){return x.value}))
                    s += retVal
                }
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

var test =
  div({id: 'container'},
    div({id: 'foo'},
      'MyFoo: ',
      ask('{{this.foo}}')
        .then('My foo is {{this.foo}}')
        .otherwise('I have no foo, my keys are [{{Object.keys(this)}}].')),
    div({id: 'bar'},
      'Bar: {{this.bar}}'))


tableTemplate = 
  function(name, template) {
    return table({'class': '{{name}}-table'}, 
            tr  ({'class': '{{name}}-row'},
             repeat(
              td({'class': '{{name}}-cell'},
               template))))
           .withContext('name', name)
}

var person = div('My name is {{this.name}}')
personTable = tableTemplate('person', person)

