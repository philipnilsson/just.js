var ly = require('./parser.js')
var mocha = require('mocha')
var assert = require('assert')

var expect = require('expect.js')

function tag(str) { return ly.tag.parse(str) }

describe('Just.js Parser', function() {

  it('should be defined', function() {
    expect(ly.Parser).not.to.be(undefined);
    expect(ly.token).not.to.be(undefined);
    expect(ly.tag).not.to.be(undefined);
  });

  it('should parse a simple tag correctly', function() {
    var res = tag('<foo></>');
    expect(res.value.tag).to.be('foo');
    expect(res.value.attrs).to.eql([]);
    expect(res.value.content).to.eql([]);
    expect(res.i).to.be(8);
  });


  it('should parse attributes', function() {
    var as = tag('<foo bar="cux"></>').value.attrs;
    expect(as).to.eql([{ 
      attr: 'bar',
      value: ['cux'],
    }]);
  });

  it('should parse multiple attributes in the right order', function() {
    var as = tag('<foo bar="cux" baz="biz"></>').value.attrs;
    expect(as).to.eql([{ 
      attr: 'bar',
      value: ['cux'],
    }, {
      attr: 'baz',
      value: ['biz']
    }]);
  });
  
  it('should parse splices', function() {
    var as = tag('<foo bar="${test}"></>').value.attrs;
    expect(as).to.eql([{
      attr: 'bar',
      value: [ {splice: 'test' }]
    }]);
  });

  it('should allow to close tags', function() {
    var as = tag('<foo></foo>');
    expect(as.value).not.to.be(undefined);
    expect(as.value.tag).to.eql('foo');
  });

  it('should require correctly closed tags', function() {
    var as = tag('<foo></bar>');
    expect(as).to.be(ly.FAIL);
  });

  it('should parse content correctly', function() {
    var input = '<foo>\n' +
      '  bar \n' +
      '</foo>';
    expect(tag(input).value).to.eql(
      { tag: 'foo', attrs: [], content: ['bar \n'] }
    );
    
  });

  it('should parse content with splices', function() {
    var input = '<foo>\n' +
      '  bar ${test}\n' +
      '</foo>';
    expect(tag(input).value.content).to.eql(
      ['bar ', { splice: 'test' }, '\n']
    );
  });

  it('should handle escaped $', function() {
    var input = '<foo>\n' +
      '  bar \\${test}\n' +
      '</foo>';
    expect(tag(input).value.content).to.eql(
      ['bar ', '$', '{test}\n']
    );
    
  });
  
  it('should handle escaped @', function() {
    var input = '<foo>\n' +
      '  bar \\@test\n' +
      '</foo>';
    expect(tag(input).value.content).to.eql(
      ['bar ', '@', 'test\n']
    );
    
  });
  
  it('should lex a javascript string correctly', function() {
    expect(ly.jsString.parse('"fooo\\"bar"').value).to.eql('fooo"bar');
    expect(ly.jsString.parse("'fooo\\'bar'").value).to.eql("fooo'bar");
  });

  it('should lex javascript // comments correctly', function() {
    var res = ly.jsComment.parse('//foobar\ncux');
    expect(res.value).to.be('foobar');
    expect(res.str.slice(res.i)).to.be('cux');
  });

  it('should lex javascript /* */ comments correctly', function() {
    var res = ly.jsComment.parse('/* foobar /* cux */bla');
    expect(res.value).to.be(' foobar /* cux ');
    expect(res.str.slice(res.i)).to.be('bla');
  });

  it('should fail to parse empty string for js-comment', function() {
    var res = ly.jsComment.parse('');
    expect(res).to.be(ly.FAIL);
  });
  
  it('should handle unfinished block comments', function() {
    var res = ly.jsComment.parse('/* df a variable asd ldsakf jlkdsa jflkdsa jflksadjfl jdsa \n ');
    expect(res).to.be(ly.FAIL);
  });

  it('should parse tags inside javascript', function() {
    var input =
      'var x = $foo@bar; /* declare a variable \n' +
      '*/' +
      '// testing\n' +
      'var y = <foo> bar${cux}</foo>\n' +
      '"<foo></foo>"\n' +
      'if (x < 3 && x > 10) console.log("hello")';
    var res = ly.just.parse(input);
    expect(res.value).to.eql(
      [ 'var x = $foo@bar; ',
        '/* declare a variable \n*/',
        '// testing\n',
        'var y = ',
        { tag : { tag : 'foo', attrs : [  ], content : [ 'bar', { splice: 'cux'} ] } },
        '"<foo></foo>"',
        '\nif (x ',
        '<',
        ' 3 && x > 10) console.log(',
        '"hello"',
        ')' ]);
  });

  it('should print a simple tag correctly', function() {
    var x = tag('<div></>').value;
    expect(ly.printTag(x)).to.be('just.div({})()');
  });

  it('should print a tag with attributes correctly', function() {
    var x = tag('<div class="test"></>').value;
    expect(ly.printTag(x)).to.be('just.div({"class":["test"]})()');
  });

  it('should print a tag with content correctly', function() {
    var x = tag('<div class="test"> Foo Bar </>').value;
    expect(ly.printTag(x)).to.be('just.div({"class":["test"]})("Foo Bar ")');
  });

  it('should correctly print a splice in an attribute', function() {
    var x = tag('<div class="${foo}"></>').value;
    expect(ly.printTag(x)).to.be('just.div({"class":[foo]})()');
  });

  it('should correctly print multiple attributes', function() {
    var x = tag('<div class="${foo}" id="bar"></>').value;
    expect(ly.printTag(x)).to.be('just.div({"class":[foo],"id":["bar"]})()');
  });

  it('should correctly print content with newlines in it', function() {
    var x = tag('<span> Foo \n Bar \r\n Cux </span>').value;
    expect(ly.printTag(x)).to.be('just.span({})("Foo \\n Bar \\n Cux ")')
  });

  it('should collapse newlines when printing', function() {
    var x = tag('<span> Foo \r\r\n\n\n Bar </span>').value;
    expect(ly.printTag(x)).to.be('just.span({})("Foo \\n Bar ")')
  });

  it('should print nested tags', function() {
    var x = tag('<div> Foo <span> Bar </> </>').value;
    expect(ly.printTag(x)).to.be(
      'just.div({})("Foo ",just.span({})("Bar "))');
  });
  
  it('should replace tags correctly in javascript', function() {
    var x = 'var x = <span> Foo \r\r\n\n\n Bar </span>';
    expect(ly.expandStr(x)).to.be('var x = just.span({})("Foo \\n Bar ")');
  });
  
  it('should be able to parse js-like expressions', function() {
    
    expect(ly.jsExpr.parse('foo.bar').value).to.be('foo.bar');
    expect(ly.jsExpr.parse('foo[bar].cux().fizz  bar').value).to.be('foo[bar].cux().fizz');
    
    expect(ly.jsExpr.parse('foo[bar]. cux().fizz  bar').value).to.be('foo[bar]');
  });

  it('should map to match correctly', function() {
    expect(ly.jsString.mapToMatch().parse('"foo"').value).to.be('"foo"');
  });

  it('should parse :calls() with one parameter', function() {
    expect(ly.specialAttribute.parse(':charge(foo)').value).to.eql({
      specialAttr: 'charge',
      value: [ 'foo' ]
    });
  });

  it('should parse :calls() with muliple parameters', function() {
    expect(ly.specialAttribute.parse(':charge(foo, bar)').value).to.eql({
      specialAttr: 'charge',
      value: [ 'foo', 'bar' ]
    });
  });
  
  it('should parse :calls() with no parameter', function() {
    expect(ly.specialAttribute.parse(':charge()').value).to.eql({
      specialAttr: 'charge',
      value: [ ]
    });
  });

  it('should print :calls() correctly', function() {
    var x = tag('<div :call(foo)></>').value;
    expect(ly.printTag(x)).to.be('just.div({})().call(foo)');
  });

});
