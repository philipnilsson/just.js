
var Parser = function Parser(f) {
    this.parse = function(st) {
        if (typeof st === 'string')
            st = { str: st, i: 0 };
        return f.bind(this)(st);
    };
}

var _ = exports;

_.Parser = Parser;

_.always = function always(x) {
   return function() { return x; };
}
_.join = function join(arr) {
    return arr.reduce(function(x, y) { return x + y }, '');
}
_.ensureParser = function ensureParser(x) {
    return x instanceof Parser ? x : unit(x);
}
_.ensureFunction = function ensureFunction(x) {
    return x instanceof Function ? x : _.always(x);
}
_.makeObject = makeObject = function() {
    var names = arguments
    return function() {
        var res = {}
        for (var i = 0; i < arguments.length; i++) {
            res[names[i]] = arguments[i];
        }
        return res;
    }
}
// Base Parsers

var FAIL = _.FAIL = '<<failed parse>>';

var unit = _.unit = function(x) {
    return new Parser(function(st) {
        return {str: st.str, i: st.i, value: x};
    });
}
var match = _.match = function(f) {
    return new Parser(function(st) {
        if (st.i >= st.str.length || !f(st.str.charAt(st.i)))
            return FAIL;
        return { str: st.str, i: st.i + 1, value: st.str.charAt(st.i) };
    });
};
var fromRegex = _.fromRegex = function(r) {
    if (r.source.charAt(0) != '^')
        r = new RegExp('^' + r.source);
    return new Parser(function(st) {
        var str = st.str.slice(st.i);
        var match = str.match(r);
        if (match === null)
            return FAIL;
        return { str: st.str, i: st.i + match[0].length, value: match[1] }
    });
}
var chr = _.chr = function(c) {
   return match(function(d) { return c === d; });
};
var token = _.token = function(c) {
  return chr(c).token();
};
var oneOf = _.oneOf = function(str) {
    return match(function(c) { return str.indexOf(c) >= 0} )
}
var noneOf = _.noneOf = function(str) {
    return match(function(c) { return str.indexOf(c) < 0} )
};
var alpha = _.alpha = match(function(c) {
    return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z'
});
var num = _.num = match(function(c) {
    return c >= '0' && c <= '9';
});
var whitespace = _.whitespace = match(function(c) {
   return ' \t\r\n'.indexOf(c) >= 0;
});
var string = _.string = function(str) { 
    return new Parser(function(st) {
        for (var i = 0; i < str.length; i++) 
            if (st.str.charAt(st.i + i) !== str.charAt(i))
                return FAIL;
        return { str: st.str, i: st.i + i, value: str };
    });
};
Parser.prototype.mapToMatch = function() {
    var self = this;
    return new Parser(function(st) {
        var newSt = self.parse(st);
        if (newSt === FAIL)
            return FAIL;
        newSt.value = newSt.str.slice(st.i, newSt.i);
        return newSt;
    });
};
Parser.prototype.log = function(message) {
    var self = this;
    return new Parser(function(st) {
        var st = self.parse(st);
        var msg = st;
        if (st !== FAIL) 
            msg = st.str.substr(0, st.i) + '^' + st.str.substr(st.i);
        console.log(message || 'log', st.value || st, '\nmsg: ', msg);
        return st;
    });
}
Parser.prototype.flatMap = function(f) {
    var self = this;
    return new Parser(function(st) {
        st = self.parse(st);
        if (st === FAIL)
            return FAIL;
        return f(st.value).parse(st);
    });
}
Parser.prototype.many = function(f) {
    f = f || function(x) { return x };
    var self = this;
    return new Parser(function(st){ 
        var vs = [], tmp;
        while((tmp = self.parse(st)) !== FAIL) {
            st = tmp;
            vs.push(st.value);
        }
        st.value = f(vs);
        return st;
    });
}
Parser.prototype.optionally = function(x) {
    var self = this;
    return new Parser(function(st) {
        var newSt = self.parse(st);
        if (newSt === FAIL)
            return { str: st.str, i: st.i, value: x };
        return newSt;
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
Parser.prototype.map = function(f) {
    return apply(_.ensureFunction(f), this);
}
var apply = function() {
    var ps = arguments;
    return new Parser(function(st) {
        var rs = []
        for (var i = 0; i < ps.length; i++) {
            st = _.ensureParser(ps[i]).parse(st);
            if (st === FAIL)
                return FAIL;
            rs.push(st.value);
        }
        st.value = rs[0].apply(null, rs.slice(1))
        return st;
    });
}
Parser.prototype.apply = function() {
    return apply.apply(null, [].concat.apply(this, arguments));
}
Parser.prototype.then = function(other) {
    return _.unit(function(x, y) { return y }).apply(this, other);
}
Parser.prototype.before = function(other) {
    return apply(function(x, y) { return x }, this, other);
}
Parser.prototype.and = function(other, f) {
    f = f || function(x) { return x };
    var g = function(x,y) { return f([x].concat(y)); };
    return apply(g, this, other);
}
Parser.prototype.andStr = function(other) {
    return this.and(other, _.join);
}
Parser.prototype.some = Parser.prototype.many1 = function(f) {
    return this.and(this.many(f), f)
}
Parser.prototype.sepBy = function(sep) {
    return this.sepBy1(sep).optionally([]);
}
Parser.prototype.sepBy1 = function(sep) {
    return this.and(sep.then(this).many())
}
Parser.prototype.manyStr = function() {
    return this.many(_.join);
}
Parser.prototype.someStr = function() {
    return this.some(_.join);
}
var lazy = _.lazy = function(p) {
    return new Parser(function(st) {
        return p().parse(st);
    });
}

// just.js specific

Parser.prototype.token = function() {
    return this.before(whitespace.many());
}

var alphaNum    = alpha.or(num);
var jsIdentChar = alpha.or(chr('_')).andStr(alphaNum.or(chr('_')).manyStr());
var tagChar     = alpha.or(chr('-'));
var jsChar      = noneOf('{}\'"');

var jsStringTick =
    chr("'").then(noneOf("\\'").or(string("\\'").map("'").or(chr('\\'))).manyStr().before(chr("'")));

var jsStringQuote =
    chr('"').then(noneOf('\\"').or(string('\\"').map('"').or(chr('\\'))).manyStr().before(chr('"')));

var jsExpr = function() { return jsExpr; }
jsExpr = 
    jsChar.someStr()
    .or(chr('{').andStr(lazy(jsExpr)).andStr(chr('}')))
    .or(jsStringTick)
    .manyStr();

var jsString = _.jsString = 
    jsStringQuote.or(jsStringTick);

var jsComment = _.jsComment = string('//').then(noneOf('\r\n').manyStr()).before(oneOf('\r\n').some())
    .or(fromRegex(new RegExp("^/\\*(([^*]|\\*[^/])*)\\*/")));

var splice = string("${")
    .then(jsExpr)
    .before(string("}"))
    .map(makeObject('splice'));

var justStringLit = 
    chr('"').then(splice
                .or(noneOf('\\"$').or(string('\\"').map('"')).or(chr('\\')).someStr())
                .or(chr('$'))
                .many())
            .before(chr('"'))
            .token();

var htmlIdent = tagChar.someStr().token();
var jsIdent = jsIdentChar.someStr().token();

var attribute = apply(
    function(x, y) { return { attr: x, value: y } },
    htmlIdent.before(token('=')),
    justStringLit);

var content = function() { return content; }

var tag = _.tag = chr('<')
    .then(apply(makeObject('tag', 'attrs', 'content'),
        htmlIdent,
        attribute.many().before(token('>')),
        lazy(content)))
    .flatMap(function(tag) {
        return string("</>").or(string("</" + tag.tag + ">")).map(tag);
    });

var just = _.just = 
    noneOf("/<'\"").someStr()
    .or(jsString.mapToMatch())
    .or(jsComment.mapToMatch())
    .or(tag.map(makeObject('tag')))
    .or(oneOf("/<"))
    .many();

content = noneOf('$\\@<>').someStr()
    .or(string('\\@').map('@'))
    .or(string('\\$').map('$'))
    .or(chr('@').andStr(jsIdent).map(makeObject('splice')))
    .or(chr('@').map(makeObject('splice')))
    .or(splice)
    .or(tag)
    .many();
