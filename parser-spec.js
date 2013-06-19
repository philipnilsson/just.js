var ly = require('./parser.js')

describe('Just.js Parser', function() {

    function tag(str) { return ly.tag.parse(str) }

    it('should be defined', function() {
        expect(ly.Parser).not.toBeUndefined();
        expect(ly.token).not.toBeUndefined();
        expect(ly.tag).not.toBeUndefined();
    });
    
    it('should parse a simple tag correctly', function() {
        var res = tag('<foo></>');
        expect(res.value.tag).toBe('foo');
        expect(res.value.attrs).toEqual([]);
        expect(res.value.content).toEqual([]);
        expect(res.i).toBe(8);
    });

    it('should parse attributes', function() {
        var as = tag('<foo bar="cux"></>').value.attrs;
        expect(as).toEqual([{ 
            attr: 'bar',
            value: ['cux'],
        }]);
    });

    it('should parse multiple attributes in the right order', function() {
        var as = tag('<foo bar="cux" baz="biz"></>').value.attrs;
        expect(as).toEqual([{ 
            attr: 'bar',
            value: ['cux'],
        }, {
            attr: 'baz',
            value: ['biz']
        }]);
    });
    
    it('should parse splices', function() {
        var as = tag('<foo bar="${test}"></>').value.attrs;
        expect(as).toEqual([{
            attr: 'bar',
            value: [ {splice: 'test' }]
        }]);
    });

    it('should allow to close tags', function() {
        var as = tag('<foo></foo>');
        expect(as.value).toBeDefined();
        expect(as.value.tag).toEqual('foo');
    });

    it('should require correctly closed tags', function() {
        var as = tag('<foo></bar>');
        expect(as).toBe(ly.FAIL);
    });

    it('should parse content correctly', function() {
        var input = '<foo>\n' +
            '  bar \n' +
            '</foo>';
        expect(tag(input).value).toEqual(
            { tag: 'foo', attrs: [], content: ['bar \n'] }
        );
        
    });

    it('should parse content with splices', function() {
        var input = '<foo>\n' +
            '  bar ${@test}\n' +
            '</foo>';
        expect(tag(input).value.content).toEqual(
            ['bar ', { splice: '@test' }, '\n']
        );
    });

    it('should handle escaped $', function() {
        var input = '<foo>\n' +
            '  bar \\${test}\n' +
            '</foo>';
        expect(tag(input).value.content).toEqual(
            ['bar ', '$', '{test}\n']
        );
        
    });
    
    it('should handle escaped @', function() {
        var input = '<foo>\n' +
            '  bar \\@test\n' +
            '</foo>';
        expect(tag(input).value.content).toEqual(
            ['bar ', '@', 'test\n']
        );
        
    });
    
    it('should lex a javascript string correctly', function() {
        expect(ly.jsString.parse('"fooo\\"bar"').value).toEqual('fooo"bar');
        expect(ly.jsString.parse("'fooo\\'bar'").value).toEqual("fooo'bar");
    });

    it('should lex javascript // comments correctly', function() {
        var res = ly.jsComment.parse('//foobar\ncux');
        expect(res.value).toBe('foobar');
        expect(res.str.slice(res.i)).toBe('cux');
    });

    it('should lex javascript /* */ comments correctly', function() {
        var res = ly.jsComment.parse('/* foobar /* cux */bla');
        expect(res.value).toBe(' foobar /* cux ');
        expect(res.str.slice(res.i)).toBe('bla');
    });

    it('should fail to parse empty string for js-comment', function() {
        var res = ly.jsComment.parse('');
        expect(res).toBe(ly.FAIL);
    });
    
    it('should handle unfinished block comments', function() {
        var res = ly.jsComment.parse('/* df a variable asd ldsakf jlkdsa jflkdsa jflksadjfl jdsa \n ');
        expect(res).toBe(ly.FAIL);
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
        expect(res.value).toEqual(
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
        expect(ly.printTag(x)).toBe('just.div({})()');
    });

    it('should print a tag with attributes correctly', function() {
        var x = tag('<div class="test"></>').value;
        expect(ly.printTag(x)).toBe('just.div({"class":"test"})()');
    });

    it('should print a tag with content correctly', function() {
        var x = tag('<div class="test"> Foo Bar </>').value;
        expect(ly.printTag(x)).toBe('just.div({"class":"test"})("Foo Bar ")');
    });

    it('should correctly print a splice in an attribute', function() {
        var x = tag('<div class="${foo}"></>').value;
        expect(ly.printTag(x)).toBe('just.div({"class":foo})()');
    });

    it('should correctly print multiple attributes', function() {
        var x = tag('<div class="${foo}" id="bar"></>').value;
        expect(ly.printTag(x)).toBe('just.div({"class":foo,"id":"bar"})()');
    });

    it('should correctly print content with newlines in it', function() {
        var x = tag('<span> Foo \n Bar \r\n Cux </span>').value;
        expect(ly.printTag(x)).toBe('just.span({})("Foo \\n Bar \\n Cux ")')
    });

    it('should collapse newlines when printing', function() {
        var x = tag('<span> Foo \r\r\n\n\n Bar </span>').value;
        expect(ly.printTag(x)).toBe('just.span({})("Foo \\n Bar ")')
    });

    it('should print nested tags', function() {
        var x = tag('<div> Foo <span> Bar </> </>').value;
        expect(ly.printTag(x)).toBe(
            'just.div({})("Foo ",just.span({})("Bar "))');
    });
    
    it('should replace tags correctly in javascript', function() {
        var x = 'var x = <span> Foo \r\r\n\n\n Bar </span>';
        expect(ly.expandStr(x)).toBe('var x = just.span({})("Foo \\n Bar ")');
    });
    
    it('should be able to parse js-like expressions', function() {
        
        expect(ly.jsExpr.parse('foo.bar').value).toBe('foo.bar');
        expect(ly.jsExpr.parse('foo[bar].cux().fizz  bar').value).toBe('foo[bar].cux().fizz');
        
        expect(ly.jsExpr.parse('foo[bar]. cux().fizz  bar').value).toBe('foo[bar]');
    });

    it('shoudl map to match correctly', function() {
        expect(ly.jsString.mapToMatch().parse('"foo"').value).toBe('"foo"');
    });
});
