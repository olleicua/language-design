/* Tests
 */

var string = require('../string.js');

var tests = [
    [ string.new('"foo"').bare(),
      "foo" ],
    [ string.new('" \\" "').bare(),
      ' " ' ],
    [ string.new('""').bool().bare(),
      false ]
];

require('../../../../tools/test.js').test(tests);
