/*jslint browser: true */
/*jshint indent: 2 */
/*jshint devel: true */
/*jshint loopfunc: true */
/*jshint -W054 */

"use strict";

window._ = {};
_.always = function(x) { return function(){ return x } }

function tag(tagName, attributes, content) {
  var el = document.createElement(tagName), i;
  for (i in attributes)
    el.setAttribute(i, attributes[i]);
  el.appendChild(content);
  return el;
}
function raw(str) {
  var frag = document.createDocumentFragment();
  var div = document.createElement('div');
  div.innerHTML = str;
  while (div.firstChild)
    frag.appendChild(div.firstChild);
  return tell(frag);
}
function text(str) {
  return document.createTextNode(str);
}
function append(tmplA, tmplB) {
  if (tmplA === null)
    return tmplB;
  var frag = document.createDocumentFragment();
  frag.appendChild(tmplA);
  frag.appendChild(tmplB);
  return frag;
}
function mnull() {
  return document.createDocumentFragment();
}
function mconcat(tmpls) {
  var frag = document.createDocumentFragment();
  for (var i in tmpls)
    frag.appendChild(tmpls[i]);
  return frag;
}
function mconcatT(tmpls) {
  var t = value(null);
  for (var i in tmpls)
    t = t.and(tmpls[i]);
  return t;
}
function tell(s) {
  return new Tmpl(_.always(_.always(
    { value: null, template: s.cloneNode(true) }
  )));
}
function appl() {
  var fTmpl = arguments[0] instanceof Function 
    ? value(arguments[0]) 
    : arguments[0];
  var fArgs = (arguments.length == 2 && arguments[1].length)
    ? arguments[1]
    : fArgs = [].slice.apply(arguments, [1])
  return new Tmpl(function(c) {
    var fRun = fTmpl.run(c);
    var tmplArgs = map(fArgs, function(t) { return dwim(t).run(c) })
    return function(r) {
      var args = map(tmplArgs, function(t) { return t(r) })
      return fRun(r).value.apply(r, args)
    };
  });
}
function case_() {
  return appl(function(a, b) {
    for (var i in arguments) {
      if (arguments[i].value)
        return arguments[i];
    }
    return empty;
  }, arguments);
}
function ask(by) {
  if (by !== undefined)
    by = dwim(by !== undefined ? by : function() { return this });
  return appl(function(t) {
    return { value: t, template: mnull() }
  }, by);
}
function value(x) {
  return new Tmpl(_.always(_.always(
    { value: x, template: mnull() }
  )));
}
var empty = value(null);
function id(x) {
  return new Tmpl(_.always(_.always(
    { value: x, template: text(x) }
  )));
}
function fromFunc(f) {
  return new Tmpl(_.always(function(r) {
    return f.apply(r);
  }));
}
function concatT(templates) {
  var ts = [], vs = [];
  for (var i in templates) {
    ts.push(templates[i].template);
    vs.push(templates[i].value);
  }
  return { value: vs, template: mconcat(ts) }
}
function Tmpl(run){
  this.run = run;
  this.compile = run;
  this.repeat = function() {
    var self = this;
    return new Tmpl(function(c){
      var run = self.run(c);
      return function(arr) {
        return concatT(map(arr, run));
      };
    });
  };
  this.binding = function(field, selector) {
    return interpolate(selector).map(function(x) {
      return function(y) {
        return x.bindMe(field, y);
      };
    }).appl(this);
  };
  this.by = function(trans) {
    var self = this;
    trans = dwim(trans);
    return new Tmpl(function (c) {
      var run = self.run(c);
      var tr = trans.run(c)
      return function(x) {
        return run(tr(x).value);
      };
    });
  };
  this.when = function(cond) {
    return appl(function (x) { 
        return x.value ? x : empty
    }, this);
  }
  this.map = function(f) {
    return appl(function(f, t) { 
      return { 
        value: f.value(t.value).value, 
        template: t.template
      };
    }, f, this);
  };
  this.and = function(other) {
    return appl(function(a,b) {
      return { 
        value: b.value, 
        template: append(a.template, b.template) 
      };
    }, this, other);
  };
  this.withContext = function(name, value) {
    var self = this;
    return new Tmpl(function(c) {
      return self.run(c.concat([{name: name, value: value}]));
    });
  };
  this.compile = function(c) { return this.run(c); };
}
function dwim(arg) {
  if (typeof arg === 'string')
    return interpolate(arg);
  else if (arg instanceof Function)
    return fromFunc(arg);
  else if (arg instanceof Tmpl)
    return arg;
  return id(arg);
}
function repeat() {
  for (var i in arguments)
    arguments[i] = dwim(arguments[i]);
  return mconcatT(arguments).repeat();
}
function makeTag(tagName) {
  return function(attrs) {

    for (var i in attrs)
      attrs[i] = interpolateStr(attrs[i]);

    return function() {
      var len = arguments.length;
      for (var i = 0; i < len; i++)
        arguments[i] = dwim(arguments[i]);
      var content = mconcatT(arguments);

      return new Tmpl(function(c) {
        var as = {};
        for (var i in attrs) {
          as[i] = attrs[i].run(c);
        }
        var runContent = content.run(c);
        return function(x) {
          var attributes = {};
          for (var i in as) {
            attributes[i] = as[i](x).template;
          }
          var c = runContent(x);
          return {
            value: c.value,
            template: tag(tagName, attributes, c.template)
          };
        };
      });
    };
  };
}
function interpolate(str) {
  return interpolateGen(str, mnull(), append, text);
}
function interpolateStr(str) {
  return interpolateGen(str, '', 
    function(x,y) { return x + y; }, 
    function(x){ return x; });
}
function map(arr, f) {
  if (arr.map) { return arr.map(f); }
  var len = arr.length, res = [];
  for (var i = 0; i < len; i++) res.push(f(arr[i]));
  return res;
}
function interpolateGen(str, none, mappend, wrap) {
  var parts = [];
  while (str) {
    var i = str.indexOf('{{');
    if (i < 0) {
      parts.push(str);
      break;
    }
    parts.push(str.slice(0, i));
    str = str.slice(i + 2);
    var j = str.indexOf('}}');
    if (j < 0)
      throw new Error('Parse error in template: Missing "}}"');

    parts.push((function(body) {
      return function (cs) {
        return new Function(cs, 'return ' + body);
      };
    })(str.slice(0,j).replace(/@([a-zA-Z_]*)/, function(_, s) {
      return s ? 'this.' + s : 'this';
    })));

    str = str.slice(j + 2);
  }
  return new Tmpl(function(c) {
    var cs = map(c, function(x) { return x.name; });
    var vs = map(c, function(x) { return x.value; });
    var ps = map(parts, function(p) { 
        return (p instanceof Function) ? p(cs) : p 
    });
    return function(x) {
      var s = none, retVal = true;
      for (var i in ps) {
        var p = ps[i];
        if (p instanceof Function) 
          retVal = p = p.apply(x, vs);
        s = mappend(s, wrap(p));
      }
      return { value: retVal, template: s };
    };
  });
}

window.just = {};
window.just.div   = makeTag('div');
window.just.span  = makeTag('span');
window.just.table = makeTag('table');
window.just.tr    = makeTag('tr');
window.just.td    = makeTag('td');
window.just.by = function(obj) { return by(obj.value) }
window.just["case"]  = function() { return case_; };
window.just.repeat = function() { return repeat; };
