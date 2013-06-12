
function result(str, i, out, val) {
  return { str: str, i: i, out: out, val: val };
}
function appendOrPush(arrOrStr, strOrElem) {
    if (typeof strOrElem === 'string')
        return arrOrStr + strOrElem;
    arrOrStr.push(strOrElem);
    return arrOrStr;
}

// Base Parsers
var FAIL = '<<failed parse>>';

var match = function(f) {
    return new Parser(function(st) {
        var r = this.eat(st);
        if (r === FAIL)
            return r;
        return f(r.val) ? r : FAIL;
    });
};
var chr = function(c) {
   return match(function(d) { return c === d; });
};
var noneOf = function(str) {
    return match(function(c) { return str.indexOf(c) < 0} )
};
var tagChar = match(function(c) {
    return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c === '-';
});
var whitespace = match(function(c) {
   return ' \t\r\n'.indexOf(c) >= 0;
})
var string = function(str) { 
    return new Parser(function(st) {
        for (var i = 0; i < str.length; i++) {
            st = this.eat(st);
            if (st === FAIL || st.val !== str.charAt(i))
                return FAIL;
        }
        st.val = str;
        return st;
    });
};
function Parser(f) {
    this.parse = function(st) {
        return f.bind(this)(st);
    };
}
Parser.prototype.eat = function(st) {
  if (st.i >= st.str.length) {
      return FAIL;
  }
  var c = st.str.charAt(st.i);
  return result(st.str, st.i + 1, st.out + c, c);
}
Parser.prototype.many = function() {
    var self = this;
    return new Parser(function(r){ 
        var vs = [], tmp;
        while((tmp = self.parse(r)) !== FAIL) {
            r = tmp;
            vs = appendOrPush(vs, r.val);
        }
        r.val = vs;
        return r;
    });
}
Parser.prototype.or = function(other) {
    var self = this;
    return new Parser(function(st) {
        var st2 = self.parse(st);
        if (st2 === FAIL)
            return other.parse(st);
        return st2;
    });
}
apply = function() {
  var f = arguments[0];
  var ps = [].slice.apply(arguments, [1])
  return new Parser(function(st) {
      var rs = []
      for (var i = 0; i < ps.length; i++) {
          st = ps[i].parse(st);
          if (st === FAIL)
              return FAIL;
          rs.push(st.val);
      }
      st.val = f.apply(null, rs)
      return st;
  });
}
Parser.prototype.then = function(other) {
    return apply(function(x, y) { return y }, this, other);
}
Parser.prototype.before = function(other) {
   return apply(function(x, y) { return x }, this, other);
}
Parser.prototype.some = Parser.prototype.many1 = function() {
    return apply(appendOrPush, this, this.many());
}
Parser.prototype.token = function() {
  return this.before(whitespace.many());
}

var jsExpr = tagChar.many();

var splice = string("${").then(jsExpr).before(string("}"));

var stringLit = 
    chr('"').then(noneOf('\\"$').or(splice).or(string('\\"')).or(chr('\\')).many())
            .before(chr('"'))
            .token();

var id = apply(
    function(x, y) { return { attr: x, value: y } },
    tagChar.some().token().before(chr('=').token()),
    stringLit);

var tag = chr('<').then(
    apply(
        function(x,y) { return { tag: x, attrs: y } },
        tagChar.some().token(),
        id.many()))
    .before(chr('>').token());



var test = function(p, input) {
    var res = p.parse(result(input, 0, []));
    if (res === FAIL)
        console.log(res);
    else {
      console.log('out: "' +  res.out + '"');
      if (typeof res.val === 'string')
          console.log('val: "' + res.val + '"');
      else
          console.log('val: ', res.val);
    }
}


//test(p, input);
//test(stringLit, '"\\"click(hello)\\"foo"')
//test(tag, '<foo bar  = "\\"click(hello)"    cux  =  "wat"  >    ')

test(splice, '${foo}')
test(tag, '<foo class="test-${foo}"> ')
