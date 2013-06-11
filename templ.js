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
  frag.appendChild(tmplA.cloneNode(true));
  frag.appendChild(tmplB.cloneNode(true));
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
function unit(x, f) {
  return new Tmpl(_.always(_.always(
    { value: x, template: f(x) })));
}
function value(x) {
  return unit(x, _.always(mnull()))
}
var empty = value(null);
function id(x) {
  return unit(x, text)
}
function fromFunc(f) {
  return new Tmpl(_.always(function(r) {
    var res = f.apply(r)
    return { value: res, template: text(res) };
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
  this.by = function(trans) {
    var self = this;
    return new Tmpl(function (c) {
      var run = self.run(c);
      var tr = dwim(trans).run(c)
      return function(x) {
        return run(tr(x).value);
      };
    });
  };
  this.when = function(cond) {
    return appl(function (cond, x) { 
        return cond.value ? x : empty
    }, dwim(cond), this);
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
  this.compile = function(c) { return this.run(c); };
}
function dwim(arg) {
  if (typeof arg === 'string') {
    return id(arg);
  }
  else if (arg instanceof Function)
    return fromFunc(arg);
  else if (arg instanceof Tmpl)
    return arg;
  return id(arg);
}
function repeat() {
  return mconcatT(map(arguments, dwim)).repeat();
}
function makeTag(tagName) {
  return function(attrs) {

    attrs = mapObj(attrs, dwim)

    return function() {
      var content = mconcatT(map(arguments, dwim));

      return new Tmpl(function(c) {
        var as = mapObj(attrs, function(a) { 
            return a.run(c) 
        });
        var runContent = content.run(c);
        return function(x) {
          var attributes = mapObj(as, function(a) { 
              return a(x).value
          });
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
function map(arr, f) {
  if (arr.map) { return arr.map(f); }
  var len = arr.length, res = [];
  for (var i = 0; i < len; i++) res.push(f(arr[i]));
  return res;
}
function mapObj(obj, f) {
  var res = {};
  for (var i in obj) 
    res[i] = f(obj[i]);
  return res;
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
