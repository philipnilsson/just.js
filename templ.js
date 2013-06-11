/*jslint browser: true */
/*jshint indent: 2 */
/*jshint devel: true */
/*jshint loopfunc: true */
/*jshint -W054 */

"use strict";

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
  return new Tmpl(function(_) {
    return function(r) {
      return { value: null, template: s.cloneNode(true) };
    };
  });
}
function case_() {
  var cases = arguments;
  return new Tmpl(function(c) {
    var cs = [], n = cases.length;
    for (var i = 0; i < n; i++)
      cs.push(dwim(cases[i]).run(c));
    return function(r) {
      for (var i = 0; i < n; i++) {
        var result = cs[i](r);
        if (result.value)
          return result;
      }
      return { value: false, template: mnull() };
    };
  });
}
function ask(by) {
  return new Tmpl(function(c) {
    var f = function (r) { return r; };
    if (by !== undefined) {
      var run = interpolate(by).run(c);
      f = function(r) { return run(r).value; };
    }
    return function(r) {
      return { value: f(r), template: mnull() };
    };
  });
}
function value(x) {
  return new Tmpl(function(_) {
    return function(_) {
      return { value: x, template: mnull() };
    };
  });
}
function id(x) {
  return new Tmpl(function(_) {
    return function(_) {
      return { value: x, template: text(x) };
    };
  });
}
function fromFunc(f) {
  return new Tmpl(function(c) {
    return function(r) {
      return f.apply(r);
    };
  });
}
function Tmpl(run){
  this.run = run;
  this.compile = run;
  this.appl = function(template) {
    var self = this;
    return new Tmpl(function(c) {
      var run = self.run(c);
      var runT = template.run(c);
      return function(r) {
        var f = run(r);
        var x = runT(r);
        return { 
          template: x.template, 
          value: f.value(x) 
        };
      };
    });
  };
  this.log = function() {
    return this.map(function(x) {
      console.log(x);
      return x;
    });
  };
  this.repeat = function() {
    var self = this;
    return new Tmpl(function(c){
      var run = self.run(c);
      return function(arr) {
        var tmpl = [], vals = [];
        for (var i in arr) {
          var res = run(arr[i]);
          vals.push(res.value);
          tmpl.push(res.template);
        }
        return {
          value: vals,
          template: mconcat(tmpl)
        };
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
        var e = tr(x).value;
        return run(e);
      };
    });
  };
  this.when = function(cond) {
    var self = this;
    cond = dwim(cond);
    return new Tmpl(function(c) {
        var runCond = cond.run(c)
        var runSelf = self.run(c)
        return function(r) {
            if (runCond(r).value)
                return runSelf(r);
            return { template: mnull(), value: false };
        };
    });
  }
  this.map = function(f) {
    var self = this;
    return new Tmpl(function(c) {
      var run = self.run(c);
      return function(r) {
        var res = run(r);
        return { 
          value: f(res.value), 
          template: res.template 
        };
      };
    });
  };
  this.and = function(other) {
    var self = this;
    return new Tmpl(function(c) {
      var runA = self.run(c);
      var runB = other.run(c);
      return function(r) {
        var resA = runA(r);
        var resB = runB(r);
        return {
          value: resB.value,
          template: append(resA.template, resB.template)
        };
      };
    });
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
    var ps = [];
    for (var i in parts) {
      ps[i] = parts[i];
      if (ps[i] instanceof Function)
        ps[i] = (ps[i])(cs);
    }

    return function(x) {
      var s = none, retVal = true;
      for (var i in ps) {
        var p = ps[i];
        if (p instanceof Function) {
          p = p.apply(x, vs);
          retVal = p;
        }
        s = mappend(s, wrap(p));
      }
      return { value: retVal, template: s };
    };
  });
}
function by(sel) {
   sel = dwim(sel);
   return function() {
     return mconcatT(map(arguments, dwim)).by(sel);
   };
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
window.just["else"] = function() {
  return function(t) { 
      return dwim(t).map(function(x) { return true; }); 
  };
}
