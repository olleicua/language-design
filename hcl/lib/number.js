/* Hot Cocoa Lisp
 *
 * An implementation of Numbers for Hot Cocoa Lisp in Javascript
 * 
 * Sam Auciello | October 2012
 * http://opensource.org/licenses/mit-license.php
 */

var Number = {};
Number.type = "number";

exports.new_number = function(number) {
	// TODO : add fractions (e.g. "1/2")
	var result = Object.create(Number);
	result.value = parseFloat(number);
	result.text = number.toString();
	return result;
}