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
    return new tmpl(function(r) {
      return { value: null, template: s } 
    })
}
function ask(by) {
    return new tmpl(function(r) {
        var value
        if (by !== null)
            value = interpolate(by).run(r).value
        else 
            value = r
        return { value: value, template: mnull() }
    })
}
function value(x) {
    return new tmpl(function(x) {
        return { value: x, template: mnull() }
    })
}
function tmpl(run){ 
    this.run = run
    this.flatMap = function(f) {
        var self = this
        return new tmpl(function(r) {
            var resA = self.run(r)
            var resB = f(resA.value).run(r)
            return { 
                value: resB.value, 
                template: append(resA.template, resB.template)
            }
        })
    }
    this.repeat = function() {
        var self = this
        return new tmpl(function(arr) {
            var tmpl = [], vals = []
            for (var i in arr) {
                var res = self.run(arr[i])
                vals.push(res.value)
                tmpl.push(res.template)
            }
            return { 
                value: vals,
                template: mconcat(tmpl)
            }
        })
    }
    this.then = function(template, f) {
        var self = this
        if (f == null) f = function(x) { return x }
        return new tmpl(function(x) {
            var res = self.run(x)
            return { 
                value: res.value,
                template: append(res.template, f(res.value) ? interpolate(template).run(x).template :  mnull())
            }
        })
    }
    this.otherwise = function(template) {
        return this.then(template, function(x) { return !x })
    }
    this.mapEnv = function(trans) {
        var self = this
        return new tmpl(function(x) {
            return self.run(trans(x))
        })
    }
    this.map = function(f) {
        var self = this
        return new tmpl(function(r) {
            var res = self.run(r)
            return { value: f(res.value), template: res.template }
        })
    }
    this.and = function(other) {
        return this.flatMap(function(_) { return other } )
    }
    this.tell = function() {
        return this.flatMap(tell)
    }
    this.bind = function() { return this }
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
    return new tmpl(function(x) {
        var attrs = ""
        for (var i in arg0) {
            console.log(interpolate(arg0[i]).run(x).template)
            attrs += i + '="'+ interpolate(arg0[i]).run(x).template + '"'
        }
        var c = content.run(x)
        return { value: content.value, template: '<' + tagName + ' ' + attrs + '>' + c.template + '</' + tagName + '>'}
    })
  }
}

function interpolate(str) {
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
            throw new Error('Parse error in template: Missing }}')
        var expression = str.slice(0, j)
        parts.push(new Function('return ' + str.slice(0, j)))
        str = str.slice(j + 2)
    }
    return new tmpl(function(x) {
        var s = ''
        var retVal = null
        for (var i in parts) {
            if (typeof parts[i] === 'string')
                s += parts[i]
            else {
                retVal = parts[i].bind(x)()
                s += retVal
            }
        }
        return { value: retVal, template: s }
    })
}

div   = makeTag('div')
span  = makeTag('span')
table = makeTag('table')
tr    = makeTag('tr')
td    = makeTag('td')

function bind(x, y, z) { return z }

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
           .bind(name, 'name')
}
var person = div('My name is {{this.name}}')
personTable = tableTemplate('person', person)

