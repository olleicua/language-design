/* A JSON parser that returns JSON objects.
 * 
 * Good for all your eval evading needs.
 * 
 * Sam Auciello | September 2012
 * http://opensource.org/licenses/mit-license.php
 */

var scanner = require('../tools/scanner.js');
var parser = require('../tools/parser.js');
var analyzer = require('../tools/analyzer.js');

var tokenTypes = [
    { t:'atom', re:/^(true|false|null)/ },
    { t:'number', re:/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/ },
    { t:'string', re:/^"(\\"|[^"])*"/ },
    { t:'{', re:/^{/ },
    { t:'}', re:/^}/ },
    { t:'[', re:/^\[/ },
    { t:']', re:/^\]/ },
    { t:',', re:/^,/ },
    { t:':', re:/^:/ },
    { t:'whitespace', re:/^\s*/ }
];

var parseGrammar = {
    '_value': [
        ['_object'],
        ['_array'],
        ['string'],
        ['number'],
        ['atom']
    ],
    '_object': [
        ['{', 'string', ':', '_value', '_object-tail']
    ],
    '_object-tail': [
        [',', 'string', ':', '_value', '_object-tail'],
        ['}']
    ],
    '_array': [
        ['[', '_value', '_array-tail']
    ],
    '_array-tail': [
        [',', '_value', '_array-tail'],
        [']']
    ]
};

var attributeGrammar = analyzer.analyzer({
    '_value': function(tree) {
        return this.analyze(tree[0]);
    },
    '_object': function(tree) {
        var first_key = this.analyze(tree[1]);
        var first_value = this.analyze(tree[3]);
        var tail = this.analyze(tree[4]);
        tail[first_key] = first_value;
        return tail;
    },
    '_object-tail': function(tree) {
        if (tree[0].type === '}') {
            return {};
        }
        return this._object(tree);
    },
    '_array': function(tree) {
        var first_value = this.analyze(tree[1]);
        var tail = this.analyze(tree[2]);
        tail.unshift(first_value);
        return tail;
    },
    '_array-tail': function(tree) {
        if (tree[0].type === ']') {
            return [];
        }
        return this._array(tree);
    },
    'string': function(node) {
        return new Function('return ' + node.text + ';')();
    },
    'number': function(node) {
        return parseFloat(node.text);
    },
    'atom': function(node) {
        return {"true":true, "false":false, "null":null}[node.text];
    }
});

exports.scan = function(text) { return scanner.scan(tokenTypes, text); };
exports.parse = function(tokens, different_parser) {
    var _parser = different_parser || parser;
    return _parser.parse(tokens, parseGrammar, "_value"); };
exports.analyze = function(tree) { return attributeGrammar.apply(tree); };

if (! module.parent) {
    var tests = [
        'true',
        '"crazystring"',
        '"this string has escapes in it \\" \\\\ \\\/"',
        '10.34',
        '982e-10',
        '1.2e3',
        '[1,2,3]',
        '{"x":1, "y":[true, false, null]}',
        '[{"a":1, "b":2}, {"a":[null, null, null], "b":4.5}]'
    ];

    for (var i = 0; i < tests.length; i++) {
        var tokens = scanner.scan(tokenTypes, tests[i]);
        var tree = parser.parse(tokens, parseGrammar, "_value");
        var results = attributeGrammar.apply(tree);
        console.log(JSON.stringify(results[0]));
    }
}
