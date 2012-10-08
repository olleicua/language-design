/* Hot Cocoa Lisp
 *
 * An implementation of Hot Cocoa Lisp in Javascript
 * 
 * Sam Auciello | October 2012
 * http://opensource.org/licenses/mit-license.php
 */

var number = require('./lib/number.js');
var string = require('./lib/string.js');
var word = require('./lib/word.js');
var list = require('./lib/list.js');
var scanner = require('../scanner.js');
var parser = require('../parser.js');
var analyzer = require('../analyzer.js');

var tokenTypes = [ // TODO: add T and NIL
    { t:'number', re:/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/ },
    { t:'string', re:/^"(\\"|[^"])*"/ },
    { t:'word', re:/^[a-zA-Z_!?$%&*+-=\/<>^~][a-zA-Z0-9_!?$%&*+-=\/<>^~]*\b/ },
    { t:'(', re:/^\(/ },
    { t:')', re:/^\)/ },
    { t:'[', re:/^\[/ },
    { t:']', re:/^\]/ },
    { t:'{', re:/^{/ },
    { t:'}', re:/^}/ },
    { t:'\'', re:/^'/ },
    { t:'`', re:/^`/ },
    { t:',', re:/^,/ },
    { t:'whitespace', re:/^\s+/ }
];

var parseGrammar = {
    '_program': [
        ['_expression', '_program-tail'],
    ],
	'_program-tail': [
		['_program'],
		[]
	],
    '_expression': [
		['_puncuated-list'],
        ['_list'],
        ['_atom']
    ],
	'_puncuated-list': [
		['\'', '_expression'],
		['`', '_expression'],
		[',', '_expression']
	],
	// TODO : add lists and objects
	'_list': [
		['(', '_list-tail']
	],
	'_list-tail': [
		['_expression', '_list-tail'],
		[')']
	],
	'_atom': [
		['word'],
		['string'],
		['number']
	]
};

// generate an array of HCL expressions
var attributeGrammar = analyzer.analyzer({
	// Do we want this??
	// 'variables': {},
    '_program': function(tree) {
        return this.analyze(tree[1], this.analyze(tree[0]));
    },
	'_program-tail': function(tree, beginning) {
		if (tree[0] && tree[0].type === '_program') {
			var result = this.analyze(tree[0]);
		} else {
			var result = [];
		}
		result.unshift(beginning);
		return result;
	},
    '_expression': function(tree) {
		return this.analyze(tree[0]);
	},
    '_puncuated-list': function(tree) {
		var result = list.new_list();
		switch (tree[0]) {
		case '\'' :
			result.push(word.new_word('quote'));
			break;
		case '`' :
			result.push(word.new_word('quaziquote'));
			break;
		case ',' :
			result.push(word.new_word('unquote'));
			break;
		}
		result.push(this.analyze(tree[1]));
		return result;
	},
    '_list': function(tree) {
		return this.analyze(tree[1]);
	},
    '_list-tail': function(tree, beginning) {
		if (tree[0].type === '_expression') {
			var result = this.analyze(tree[1], this.analyze(tree[0]));
		} else {
			var result = list.new_list();
		}
		if (beginning) {
			result.unshift(beginning);
		}
		return result;
	},
    '_atom': function(tree) {
		switch (tree[0].type) {
		case 'word' :
			return word.new_word(tree[0].text);
			break;
		case 'string' :
			return string.new_string(tree[0].text);
			break;
		case 'number' :
			return number.new_number(tree[0].text);
			break;
		}
	},
});

exports.scan = function(text) {
	var tokens = scanner.scan(tokenTypes, text);
	return tokens;
};
exports.parse = function(tokens) {
	return parser.parse(tokens, parseGrammar, "_program");
};
exports.analyze = function(tree) {
	return attributeGrammar.apply(tree)[0];
};

if (! module.parent) {
	var tests = [
		'(console.log "Hello World!")'
	];

	for (var i = 0; i < tests.length; i++) {
		console.log('---');
		var tokens = scanner.scan(tokenTypes, tests[i]);
		console.log(JSON.stringify(tokens));
		console.log('---');
		var tree = parser.parse(tokens, parseGrammar, "_program");
		console.log(JSON.stringify(tree));
		console.log('---');
		var lists = attributeGrammar.apply(tree)[0];
		console.log(JSON.stringify(lists));
	}
}