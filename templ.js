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
  while (div.childNodes.length)
    frag.appendChild(div.childNodes[0]);
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
function ask(by) {
  return new Tmpl(function(c) {
    var f = function (r) { return r; };
    if (by !== null) {
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
    return function(x) {
      return { value: x, template: mnull() };
    };
  });
}
function fromFunc(f) {
  return new Tmpl(function(_) {
    return function(r) {
      var result = f.apply(r);
      return { template: text(result), value: result };
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
        return { template: x.template, value: f.value(x) };
      };
    });
  };
  this.log = function() {
    return this.map(function(x) { console.log(x); return x; });
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
  this.then = function(template, f) {
    var self = this;
    if (f === null)
      f = function(x) { return x; };
    return new Tmpl(function(c){
      var run = self.run(c);
      var runT = interpolate(template).run(c);
      return function(x) {
        var res = run(x);
        return {
          value: res.value,
          template: append(res.template, f(res.value) ? runT(x).template :  mnull())
        };
      };
    });
  };
  this.otherwise = function(template) {
    return this.then(template, function(x) { return !x; });
  };
  this.mapEnv = function(trans) {
    var self = this;
    return new Tmpl(function (c) {
      var run = self.run(c);
      return function(x) {
        return run(trans(x));
      };
    });
  };
  this.map = function(f) {
    var self = this;
    return new Tmpl(function(c) {
      var run = self.run(c);
      return function(r) {
        var res = run(r);
        return { value: f(res.value), template: res.template };
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
        var tmpA = document.createElement('divA');
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

function templateDwim(arg) {
  if (typeof arg === 'string')
    return interpolate(arg);
  else if (arg instanceof Function)
    return fromFunc(arg);
  else if (arg instanceof Tmpl)
    return arg;
  throw new Error('Unable to create template from argument.', arg);
}

function repeat() {
  for (var i in arguments)
    arguments[i] = templateDwim(arguments[i]);
  return mconcatT(arguments).repeat();
}

var makeTag = function(tagName) {
  return function(attrs) {

    for (var i in attrs)
      attrs[i] = interpolateStr(attrs[i]);

    return function() {
      var len = arguments.length;
      for (var i = 0; i < len; i++)
        arguments[i] = templateDwim(arguments[i]);
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
};

function interpolate(str) {
  return interpolateGen(str, mnull(), append, text);
}
function interpolateStr(str) {
  return interpolateGen(str, '', function(x,y) { return x + y; }, function(x){ return x; });
}
function map(arr, f) {
  if (Array.prototype.map) { return arr.map(f); }
  var len = arr.length, res = [];
  for (var i = 0; i < len; i++) len.push(f(arr[i]));
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
    })(str.slice(0,j)));

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
      var s = none;
      var retVal = null;
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

window.div   = makeTag('div');
window.span  = makeTag('span');
window.table = makeTag('table');
window.tr    = makeTag('tr');
window.td    = makeTag('td');
