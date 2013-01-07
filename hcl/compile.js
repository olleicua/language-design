var template = require('../tools/template.js');
var hcl = require('./hclParser.js');
var types = require('./lib/types.js');

var string2ast = function(string) {
    var tokens = hcl.scan(string);
    var tree = hcl.parse(tokens);
    return hcl.analyze(tree);
};

var macros = {};

var built_ins = ['quote', 'quaziquote', 'unquote', 'js', 'macro-exists'];

// replace word generations (e.g. 'types.word("foo")' with bare words if they
// are defined as an argument in the macro or the mode is 'final-code'
var resolve_words_in_scope = function(js, macro, mode) {
    var words_in_scope = [];
    if (macro) {
        words_in_scope = macro[2].map(function(w) {
            return w.value.replace('\.{3}$', '');
        });
    }
    return js.replace(/types\.word\('([^']+)'\)/g, function(match, word) {
        if (mode === 'final-code' || words_in_scope.indexOf(word) !== -1) {
            return word;
        } else {
            return match;
        }
    });
}

// compile macro arguments
var macro_args = function(macro, ast) {

    var names = macro[2];
    var values = ast.slice(1);

    var result = [];
    // FIXME: add support for splats in both directions
    // TODO: throw a compile warning/error if arg_names and arg_values have
    //       different lengths and there are no splats
    args_loop: for (var i = 0; i < values.length && i < names.length; i++) {
        
        // splat
        var splat = /^(.*)\.\.\.$/.exec(names[i].json());
        //console.log(splat, arg_names[i].json());
        if (splat) {
            var splat_values = values.slice(i).map(function(x) {
                return compile(x) ;
            }).json() ;
            result.push(template.format('~~ = "~~"',
                                        [splat[0], splat_values])) ;
            break args_loop ;
        }
        
        result.push(template.format('~~ = "~~"',
                                    [names[i].json(), compile(values[i])]));
    }
    return 'var ' +  result.join(', ') + ';';
}

// returns a copy of the ast with all macros applied to it.
// calls apply_callback(macro, ast) after each successful macro application.
var apply_macros = function(ast, mode, apply_callback) {

    //console.log(ast.json());
    
    // base case
    if (ast.type !== 'list') {
        //console.log('not a list');
        return ast;
    }
    
    // recurse
    for (var i = 0; i < ast.length; i++) {
        ast[i] = apply_macros(ast[i], mode, apply_callback);
    }
    
    // apply macros
    //console.log('x', JSON.stringify(macros), JSON.stringify(ast[0]));
    if (macros[ast[0].json()] !== undefined) {
        
        var macro = types.list(macros[ast[0].json()]);
        
        //console.log('macro', macro, macro.json());
        //console.log(macro.map.call([1,2,3], function(x) { return x + 1; }).map(function(x) { return x.json(); }));
        //console.log('from', macros[ast[0].json()], macros[ast[0].json()].json());
        
        var args = macro_args(macro, ast);
        
        // compile body
        // TODO: replace all instances of words not defined in the args with
        //       word generations
        var body = macro.slice(3);
        //console.log('b1', body.json());
        for (var i = 0; i < body.length; i++) {
            body[i] = compile(body[i]) + ';';
        }

        //body[body.length - 1] = 'return ' + body[body.length - 1];
        body = body.join('');
        console.log('b', body);
        body = resolve_words_in_scope(body, macro, mode);
        console.log('a', body);
        
        if (typeof(apply_callback) === 'function') {
            apply_callback(macro, ast);
        }
        
        console.log('rewritten by', args + body);
        console.log('rewritten to', eval(args + body));
        console.log('rewritten to', types.list(eval(args + body)).json());
        // FIXME: this needs better sandboxing
        return types.list(eval(args + body));
    }
    
    //console.log('no macros', ast.json());
    return ast;
}

var quaziquote = function(ast) {

    if (ast.type === 'list') {
        
        // unquote
        if (ast[0].json() === 'unquote') {
            return compile(ast[1]);
        }
        
        // quoted list
        return ast.map(quaziquote).json();
    }

    // atom
    return ast.json();
}

var compile = function(ast) {
    
    // lisp expression
    if (ast.type === 'list') {
        
        // formatted javascript
        if (ast[0].json() === 'quote') {
            return ast[1].json();
        }
        
        // formatted javascript
        if (ast[0].json() === 'quaziquote') {
            return quaziquote(ast[1]);
        }
        
        // formatted javascript
        // TODO: better differenciate .json() betweent the two uses here.
        if (ast[0].json() === 'types.word("js")') {
            return template.format(
                ast[1].json(),
                types.list(ast.slice(2)).map(function(value) {
                    return compile(value);
                })
            );
        }
        
        // implement macro-exists
        if (ast[0].json() === 'macro-exists') {
            return macros[ast[1].json()] === undefined ? 'false' : 'true';
        }
        
        // TODO: add compile error handling here
        
        // formatted hcl
        return template.format('~~(~~)', [
            compile(ast[0]),
            types.list(ast.slice(1)).map(function(value) {
                // is this right??
                // (console.log 'foo) should print "foo" but currently doesn't
                return compile(value);
            }).join(', ')
        ]);
    }
    
    // scalar expression
    return ast.json();
    
    // TODO: add more tests
};

exports.compile = function(text) {
    
    macros = {};
    
    //console.log('\n');
    
    var compiled_statements = [];
    var asts = types.list(string2ast(text));
    
    // find macros
    for (var i = 0; i < asts.length; i++) {
        var ast = asts[i];
        if (ast[0].json() === 'macro') {
            var name = ast[1].json();
            if (macros[name] !== undefined) {
                throw new Error('There is already a macro called ' + name);
                // TODO: add line number
            }
            macros[name] = ast;
        }
    }
    
    // apply macros to macros
    var macros_left_to_apply = true;
    var macro_names = Object.keys(macros);
    while (macros_left_to_apply) { // repeat loop until no macros are applied
        macros_left_to_apply = false;
        for (var i = 0; i < macro_names.length; i++) {
            var m = macro_names[i];
            // FIXME: macros should be applied to the body of the macro only
            macros[m] = apply_macros(macros[m], 'macro-expansion', function() {
                macros_left_to_apply = true;
            });
        }
    }
    
    // compile code
    for (var i = 0; i < asts.length; i++) {
        var ast = asts[i];
        if (ast[0].json() !== 'macro') {
            compiled_statements.push(resolve_words_in_scope(compile(apply_macros(asts[i], 'final-code')) + ';', null, 'final-code'));
        }
    }
    
    return compiled_statements.join('\n\n');
};