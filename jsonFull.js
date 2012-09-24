/* A JSON parser that returns JSON objects.
 * 
 * Good for all your eval evading needs.
 * 
 * Sam Auciello | September 2012
 * http://opensource.org/licenses/mit-license.php
 */

var scanner = require('./scanner.js');
var parser = require('./parser.js');
var analyzer = require('./analyzer.js');

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
    'value': [
        ['object'],
        ['array'],
        ['string'],
        ['number'],
        ['atom']
    ],
    'object': [
        ['{', 'string', ':', 'value', 'object-tail']
    ],
    'object-tail': [
        [',', 'string', ':', 'value', 'object-tail'],
        ['}']
    ],
    'array': [
        ['[', 'value', 'array-tail']
    ],
    'array-tail': [
        [',', 'value', 'array-tail'],
        [']']
    ]
};

var attributeGrammar = analyzer.analyzer({
    'value': function(tree) {
        return this.analyze(tree[0]);
    },
    'object': function(tree) {
        var first_key = this.analyze(tree[1]);
        var first_value = this.analyze(tree[3]);
        var tail = this.analyze(tree[4]);
        tail[first_key] = first_value;
        return tail;
    },
    'object-tail': function(tree) {
        if (tree[0].type === '}') {
            return {};
        }
        return this.object(tree);
    },
    'array': function(tree) {
        var first_value = this.analyze(tree[1]);
        var tail = this.analyze(tree[2]);
        tail.unshift(first_value);
        return tail;
    },
    'array-tail': function(tree) {
        if (tree[0].type === ']') {
            return [];
        }
        return this.array(tree);
    },
    'string': function(node) {
        // this is sort of cheating..
        return new Function('return ' + node.text + ';')();
    },
    'number': function(node) {
        return parseFloat(node.text);
    },
    'atom': function(node) {
        return {"true":true, "false":false, "null":null}[node.text];
    }
});

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
    var tree = parser.parse(tokens, parseGrammar, "value");
    var results = attributeGrammar.apply(tree);
    console.log(JSON.stringify(results[0]));
}