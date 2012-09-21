/* Javascript Parser
 * 
 * This is a simple recursive decent parser using an abstract JSON grammar
 * notation of my own design.  The grammar consists of an object relating a
 * non-terminal to an array of arrays of strings.  Each of the inner arrays
 * represents one of the possible expansions of the non-terminal and consists of
 * both non-terminals and terminals.  The non-terminals are distinguished only
 * by their inclusion as keys in the grammar.
 * 
 * The scanner should generate an array of token objects.  Each token object
 * must have a "type" property which will be used in the grammar, and may
 * optionally also have a text property specifying the text of the token as well
 * as a position token specifying the position of the token in the text for
 * debugging purposes.
 * 
 * The parser operates on the scanned array of tokens in place replacing it
 * with the parse tree.
 * 
 * Example Usage:
 *   var parser = require('./parser.js');
 *   var tokens = [{"type":"a"}, {"type":"b"}];
 *   var grammar = {
 *       "ab": [
 *   	       ["a", "b"]
 *       ]
 *   };
 *   var tree = parser.parse(tokens, grammar, "ab");
 * 
 * The abover generates the parse tree:
 *   [{type:"ab", tree:[{type:"a"}, {type:"b"}]}]
 * 
 * Sam Auciello | September 2012 | http://opensource.org/licenses/mit-license.php
 */

var can_expand = function(node, token) {
	if (token.type === node) {
		return true;
	}
	if (grammar[node] === undefined) {
		return false
		// errors thrown from here??
	}
	for (var i = 0; i < grammar[node].length; i++) {
		if (can_expand(grammar[node][i][0], token)) {
			return true;
		}
	}
	return false;
}

var guess = function(guess_node, tokens, grammar, position) {
	console.log(guess_node, position);
	if (tokens[position].type === guess_node) { // token already matches
		return true
	}
	if (grammar[guess_node] === undefined) { // token doesn't match and can't be expanded
		return false
	}
	for (var i = 0; i < grammar[guess_node].length; i++) { // look for matching expansion
		var posibility = grammar[guess_node][i];
		if (can_expand(posibility[0], tokens[position])) { // assume this expansion if possible
			var subtree = [];
			for (var j = 0; j < posibility.length; j++) {
				var node = posibility[j];
				if (guess(node, tokens, grammar, position + j)) {
					subtree.push(tokens[position + j]);
				} else {
					return false;
				}
			}
			tokens.splice(position, subtree.length, {type:guess_node, tree:subtree});
			return true;
		}
	}
	return false;
}

exports.parse = function(tokens, grammar, start_node) {
	if (guess(start_node, tokens, grammar, 0)) {
		return tokens;
	} else {
		throw 'parse error';
	}
}
