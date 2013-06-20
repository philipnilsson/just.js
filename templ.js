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
  var n = tmpls.length;
  for (var i = 0; i < n; i++) 
    frag.appendChild(tmpls[i]);
  return frag;
}
function mconcatT(tmpls) {
  var n = tmpls.length;
  if (n <= 1)
    return n == 0 ? value(null) : tmpls[0];
  return new Tmpl(function(r){ 
    var ts = []
    for (var i = 0; i < n; i++) 
      ts.push(tmpls[i].run(r).template);
    return { value: null, template: mconcat(ts) };
  });
}
function tell(s) {
  return new Tmpl(_.always(
    { value: null, template: s.cloneNode(true) }
  ));
}
function appl() {
  var fTmpl = arguments[0] instanceof Function 
    ? value(arguments[0]) 
    : arguments[0];
  var fArgs = (arguments.length == 2 && arguments[1].length)
    ? arguments[1]
    : fArgs = [].slice.apply(arguments, [1])
  fArgs = map(fArgs, dwim);
  return new Tmpl(function(r) {
      var args = map(fArgs, function(t) { return t.run(r) })
      return fTmpl.run(r).value.apply(r, args)
  });
}
function case_() {
  return appl(function(a, b) {
    var n = arguments.length;
    for (var i = 0; i < n; i++) {
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
  return new Tmpl(_.always(
    { value: x, template: f(x) }));
}
function value(x) {
  return unit(x, _.always(mnull()))
}
var empty = value(null);
function id(x) {
  return unit(x, text)
}
function fromFunc(f) {
  return new Tmpl(function(r) {
    var res = f.apply(r)
    return { value: res, template: text(res) };
  });
}
function concatT(templates) {
  var ts = [], vs = [], n = templates.length;
  for (var i = 0; i < n; i++) {
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
    return new Tmpl(function(arr) {
      return concatT(map(arr, function(r) { 
        return self.run(r) 
      }));
    });
  };
  this.by = function(trans) {
    var self = this;
    trans = dwim(trans);
    return new Tmpl(function(r) {
      return self.run(trans.run(r).value);
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
    var self = this;
    return new Tmpl(function(r) {
        var a = self.run(r)
        var b = other.run(r)
        return { value: b.value, template: append(a.template, b.template) }
    });
  };
}
function dwim(arg) {
  if (typeof arg === 'string') 
    return id(arg);
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

    for (var i in attrs) {
        attrs[i] = appl(function() { 
            return { value: map(arguments, function(x) { return x.value}).join("") };
        }, map(attrs[i], dwim));
    }

    return function() {
      var content = mconcatT(map(arguments, dwim));

      return new Tmpl(function(r) {
        
        var attributes = {}
        for (var i in attrs)
            attributes[i] = attrs[i].run(r).value;
        var c = content.run(r);
        return {
          value: c.value,
          template: tag(tagName, attributes, c.template)
        };
      });
    };
  };
}

function map(arr, f) {
  var n = arr.length || 0, i = -1;
  var res = Array(n);
  while (++i < n)
      res[i] = f(arr[i])
  return res;
}


window.just = {};
window.just.div   = makeTag('div');
window.just.span  = makeTag('span');
window.just.table = makeTag('table');
window.just.tr    = makeTag('tr');
window.just.td    = makeTag('td');

window.just.ul    = makeTag('ul');
window.just.li    = makeTag('li');

window.just.h1    = makeTag('h1');
window.just.h2    = makeTag('h2');
window.just.h3    = makeTag('h3');
window.just.h4    = makeTag('h4');
window.just.h5    = makeTag('h5');
window.just.h6    = makeTag('h6');

window.just.by = function(obj) { return by(obj.value) }
window.just["case"]  = function() { return case_; };
window.just.repeat = function() { return repeat; };
