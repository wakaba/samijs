/** <b>Evaluate JavaScript Module</b>
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uuw = window, uu = uuw.uu;

/** <b>Evaluate JavaScript Module</b>
 *
 * @class
 */
uu.module.evaljs = function(str) {
  var rv = false;
  try {
    rv = eval("(" + str + ")");
  } catch(e) {
    if (e instanceof SyntaxError) {
      throw SyntaxError("SyntaxError: " + e.message);
    }
    throw e;
  }
  return rv;
};
// uu.module.evaljs = function(str){var rv=false;try{rv=eval("("+str+")");}catch(e){if(e instanceof SyntaxError){throw SyntaxError("SyntaxError: "+e.message);}throw e;}return rv;};

})(); // end (function())()
