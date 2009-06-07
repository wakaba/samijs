/* Requires sami-core.js */

if (!self.JSTTL) self.JSTTL = {};

JSTTL.Tokenizer = SAMI.Class (function () {

}, {
  tokenizeTemplate: function (s) {
    /*
      We only support a subset of Template Tooklit's Template language.

      template := *(text / tag) broken-tag?
      text := 1*char - (*char "[%" *char)
      tag := "[%" ["-" / "#"] [(char - ("-" / "#")) [*char (char - "-")] - (*char "%]" *char)] ["-"] "%]"
      broken-tag := "[%" ["-" / "#"] [(char - ("-" / "#")) *char - (*char "%]" *char)]

      [%~~%], [%++%], [%==%] are not supported.  CHOMP and TRIM flags
      are not supported.  INTERPOLATE flag is not supported.  GRAMMER
      is not supported.
    */

    var tokens = new SAMI.List;

    s = s.replace (/\x0D\x0A/g, "\x0A").replace (/\x0D/g, "\x0A");

    var prevPos = 0;
    var state = 'content';
    var i = 0;
    var l = 1;
    var c = 0;
    var tokenL = 1;
    var tokenC = 1;
    var tokenCInner = 1;
    var isComment = false;
    while (i < s.length) {
      if (s.charAt (i) == "\x0A") {
        l++;
        c = 0;
      } else {
        c++;
      }

      if (state != 'tag') {
        if (s.charAt (i) == "[") {
          i++;
          if (s.charAt (i) == "%") {
            var cDiff = 0;
            var valueEnd = i - 1;
            if (s.charAt (i + 1) == "-") {
              i++;
              cDiff = 1;
              var p = valueEnd;
              while (prevPos < p) {
                if (s.charAt (p - 1) == "\x0A") {
                  valueEnd = p - 1;
                  break;
                } else if (/\s/.test (s.charAt (p - 1))) {
                  p--;
                } else {
                  break;
                }
              }
              isComment = false;
            } else if (s.charAt (i + 1) == "#") {
              isComment = true;
            } else {
              isComment = false;
            }
            if (prevPos < valueEnd) {
              tokens.push ({type: 'text',
                            valueRef: s, valueStart: prevPos, valueEnd: valueEnd,
                            line: tokenL, column: tokenC});
            }
            prevPos = ++i;
            tokenL = l;
            tokenC = c++;
            tokenCInner = tokenC + 2 /* [% */ + cDiff /* - */;
            c += cDiff;
            state = 'tag';
          }
        } else {
          i++;
        }
      } else { // state == 'tag'
        if (s.charAt (i) == "%") {
          i++;
          if (s.charAt (i) == "]") {
            var valueEnd = i - 1;
            var newPrevPos = ++i;
            if (prevPos <= i - 3 && s.charAt (i - 3) == "-") {
              valueEnd--;
              var p = newPrevPos;
              while (p < s.length) {
                if (s.charAt (p) == "\x0A") {
                  p++;
                  l++;
                  c = -1;
                  newPrevPos = p;
                  break;
                } else if (/\s/.test (s.charAt (p))) {
                  p++;
                } else {
                  break;
                }
              }
            }
            if (!isComment) {
              tokens.push ({type: 'tag',
                            valueRef: s, valueStart: prevPos, valueEnd: valueEnd,
                            line: tokenL, column: tokenC, columnInner: tokenCInner});
            }
            prevPos = newPrevPos;
            tokenL = l;
            tokenC = ++c + 1;
            tokenCInner = tokenC;
            state = 'content';
          }
        } else {
          i++;
        }
      }
    } // while

    if (prevPos != i || state == 'tag') {
      if (state != 'tag') {
        tokens.push ({type: 'text',
                      valueRef: s, valueStart: prevPos, valueEnd: i,
                      line: tokenL, column: tokenC});
      } else { // state == 'tag'
        if (tokens.list.length) {
          prevPos = tokens.getLast ().valueEnd;
        } else {
          prevPos = 0;
        }

        tokens.push ({type: 'text',
                      valueRef: s, valueStart: prevPos, valueEnd: i,
                      line: tokenL, column: tokenC});
        /* tokenL and tokenC are incorrect when there are spaces before "[%-" */
      }
    }

    return tokens;
  }, // tokenizeTemplate

  tokenizeDirectives: function (s, ln, cn, opts) {
    /*
      We only support a subset of Template Toolkit's directive language.

      comment := '#' *(char - newline) (newline / end-of-directives)
      wsp := *(\s / comment)
      directives := [directive ";" directive]
      directive := get / set / foreach / if / elsif / else / while / switch / case / include / block / macro / wrapper / end / 1*filter / use / goto
      get := ['GET' / 'CALL'] expression *filter [condition]
      set := ['SET' / 'DEFAULT'] *(variable "=" expression / ",") variable "=" (expression *filter [condition] *"," / 'BLOCK')
      foreach := 'FOREACH' [variable ("=" / 'IN')] expression
      if := ('IF' / 'UNLESS') expression
      elsif := 'ELSIF' expression
      else := 'ELSE'
      include := ('INCLUDE' / 'PROCESS' / 'INSERT') path arguments *filter [condition]
      while := 'WHILE' right-expression
      switch := 'SWITCH' expression
      case := 'CASE' [expression / 'DEFAULT']
      goto := ('BREAK' / 'NEXT' / 'LAST') [condition]
      wrapper := 'WRAPPER' scalar-term arguments
      block := 'BLOCK' (atom / number / path)
      macro := 'MACRO' (atom / number / path) ['BLOCK']
      end := 'END'
      filter := ('FILTER' / "|") scalar-term
      use := 'USE' scalar-term
      condition := if / foreach
      arguments := *("," / lvalue "=" right-expression)
      expression := monomial / binomial / trinomial / term / "(" right-expression ")"
      right-expression := expression / lvalue "=" expression
      monomial := ("!" / "not") expression
      binomial := expression ("or" / "and" / "&&" / "||" / "==" / "!=" / "<" / ">" / "<=" / ">=" / "+" / "-" / "*" / "/" / "_" / "mod" / "div" / "%") expression
      trinomial := expression "?" expression ":" expression
      path := scalar-term
      term := scalar-term / list-literal / hash-literal
      scalar-term := lvalue / double-quoted / single-quoted / path / number / ref
      ref := "\" lvalue
      lvalue := (variable / dollar-variable / function) *("." (variable / dollar-variable / function))
      function := atom "(" arguments ")"
      variable := atom
      dollar-variable := "$" atom
      enclosed-dollar-variable := "${" lvalue "}"
      double-quoted := <"> *(char - ("\" / <"> / "$") / "\" char / dollar-variable / enclosed-dollar-variable) <">
      path := (*achar - number) 1*("/" *achar) - "/"
      number := ["-"] 1*DIGIT ["." 1*DIGIT] ;; token
      list-literal := "[" *(term / ",") "]"
      hash-literal := "{" hash-items "}"
      hash-items := *("," / variable "=" right-expression)
      atom = astartchar *achar ;; token
      achar = astartchar / DIGIT
      astartchar = <"A".."Z"> / "_"

      TAGS is not supported.  "." and ".." in path are not supported.
      PERL, RAWPERL, JAVASCRIPT are not supported.
      INSERT/INCLUDE/PROCESS/WRAPPER a + b is not supported.
      xxx WRAPPER yyy is not supported.
      USE Foo.Bar is not supported.  USE foo = bar is not supported.
      MACRO name xxx where xxx is not BLOCK is not supported.
      TRY, THROW, CATCH, FINAL are not supported.
      RETURN and STOP are not supported.  CLEAR is not supported.
      META and DEBUG are not supported.
      VIEW is not supported.
    */

    var self = this;

    ln = ln || 1;
    cn = cn || 1;
    opts = opts || {};

    var tokens = new SAMI.List;

    while (s.length) {
      var match = false;

      s = s.replace (/^\s+/, function (c) {
        match = true;
        if (/\x0A/.test (c)) {
          c = c.replace (/[^\x0A]*\x0A/g, function () {
            ln++;
            cn = 1;
            return '';
          });
          cn += c.length;
        } else {
          cn += c.length;
        }
        return '';
      });
      s = s.replace (/^#[^\x0A]*(?:\x0A|$)/, function (c) {
        match = true;
        if (c.substring (c.length - 1, c.length) == "\x0A") {
          ln++;
          cn = 1;
        } else {
          cn += c.length;
        }
        return '';
      });

      s = s.replace (/^(?:[A-Za-z][A-Za-z_0-9]*|_[A-Za-z_0-9]+)/, function (c) {
        match = true;
        var keyword = JSTTL.Tokenizer.KEYWORDS[c];
        if (keyword === true) {
          tokens.push ({type: c, line: ln, column: cn});
        } else if (keyword) {
          tokens.push ({type: keyword, line: ln, column: cn});
        } else {
          tokens.push ({type: 'identifier', value: c, line: ln, column: cn});
        }
        cn += c.length;
        return '';
      });

      s = s.replace (/^(?:[<>=!]=|\$\{|&&|\|\|)/, function (c) {
        match = true;
        tokens.push ({type: c, line: ln, column: cn});
        cn += c.length;
        return '';
      });

      s = s.replace (/^-?[0-9]+(?:\.[0-9]+)?/, function (c) {
        match = true;
        tokens.push ({type: 'number', value: c,
                      line: ln, column: cn});
        cn += c.length;
        return '';
      });

      s = s.replace (/^"((?:[^"\\]|\\[\s\S])*)("?)/, function (_, c, q) {
        match = true;
        cn++; // "
        
        tokens.push ({type: '(', line: ln, column: cn});
        tokens.push ({type: 'string', value: '', line: ln, column: cn});
        while (c.length) {
          c = c.replace (/^[^\\\$]+/, function (_) {
            tokens.push ({type: '_', line: ln, column: cn});
            tokens.push ({type: 'string', value: _, line: ln, column: cn});
            cn += _.length; // XXX: \x0A
            return '';
          });

          c = c.replace (/^\\(.)/, function (_, v) {
            tokens.push ({type: '_', line: ln, column: cn});
            cn++;
            tokens.push ({type: 'string', value: v, line: ln, column: cn});
            cn++; // XXX: \x0A
            return '';
          });

          var newC = null;
          c = c.replace (/^\$(?:([A-Za-z_0-9]+)|(\{))?/, function (_, i, b) {
            if (b) {
              tokens.push ({type: '_', line: ln, column: cn});
              tokens.push ({type: '${', line: ln, column: cn});
              cn += 2;
              var ts = self.tokenizeDirectives
                  (c.substring (2), ln, cn, {returnAtBrace: true});
              var eof = ts.pop ();
              ln = eof.line;
              cn = eof.column;
              tokens.append (ts);
              newC = ts.c;
            } else if (i != null && i != "") {
              if (i == '0') {
                tokens.push ({type: '_', line: ln, column: cn});
                tokens.push ({type: 'string', value: '$0', line: ln, column: cn});
                cn += 2; // $0
              } else if (/^[0-9]/.test (i)) {
                cn++; // $
                self.reportError ({
                  type: 'not an identifier', level: 'm',
                  line: ln, column: cn
                });
                cn += i.length;
              } else { // $_45 is allowed.
                tokens.push ({type: '_', line: ln, column: cn});
                tokens.push ({type: '$', line: ln, column: cn});
                cn++;
                tokens.push ({type: 'identifier', value: i, line: ln, column: cn});
                cn += i.length;
              }
            } else {
              cn++; // $
            }
            return '';
          });
          if (newC != null) c = newC;
        } // while c
        tokens.push ({type: ')', line: ln, column: cn});
        if (q) {
          cn++; // "
        } else {
          self.reportError ({
            type: 'unclosed string literal', level: 'm',
            line: ln, column: cn
          });
        }
        return '';
      });

      s = s.replace (/^'((?:[^'\\]|\\[\s\S])*)('?)/, function (_, c, q) {
        match = true;
        c = c.replace (/\\([\s\S])/g, '$1');
        tokens.push ({type: 'string', value: c, line: ln, column: cn});
        cn += _.length; // XXX: \x0A in string literal
        if (!q) {
          self.reportError ({
            type: 'unclosed string literal', level: 'm',
            line: ln, column: cn
          });
        }
        return '';
      });

      s = s.replace (/^[+\\\[\]\/%(),{}?:.;*]/, function (c) {
        match = true;
        tokens.push ({type: c, line: ln, column: cn});
        cn += c.length;
        return '';
      });
      if (opts.returnAtBrace && tokens.getLast ().type == '}') {
        break; // while s
      }

      if (!match) {
        s = s.replace (/^[<>=!$&|_-]/, function (c) {
          match = true;
          tokens.push ({type: c, line: ln, column: cn});
          cn += c.length;
          return '';
        });
      }

      if (!match) {
        s = s.replace (/^[\s\S]\S*/, function (c) {
          tokens.push ({type: c, line: ln, column: cn});
          cn += c.length;
          return '';
        });
      }
    } // while s

    if (opts.returnAtBrace && tokens.getLast ().type != '}') {
      this.reportError ({
        type: 'unclosed variable block', level: 'm',
        line: ln, column: cn
      });
      tokens.push ({type: '}', line: ln, column: cn});
    }
    tokens.c = s;

    tokens.push ({type: 'eof', line: ln, column: cn});

    return tokens;
  } // tokenizeDirectives
}); // Tokenizer

JSTTL.Tokenizer.KEYWORDS = {
  GET: true,
  CALL: true,
  SET: true,
  DEFAULT: true,
  INSERT: true,
  INCLUDE: true,
  PROCESS: true,
  WRAPPER: true,
  IF: true,
  UNLESS: true,
  ELSE: true,
  ELSIF: true,
  FOR: true,
  FOREACH: true,
  WHILE: true,
  SWITCH: true,
  CASE: true,
  USE: true,
  PLUGIN: true,
  FILTER: '|',
  MACRO: true,
  PERL: true,
  RAWPERL: true,
  BLOCK: true,
  META: true,
  TRY: true,
  THROW: true,
  CATCH: true,
  FINAL: true,
  NEXT: true,
  LAST: true,
  BREAK: 'last',
  RETURN: true,
  STOP: true,
  CLEAR: true,
  TO: true,
  STEP: true,
  END: true,
  VIEW: true,
  JAVASCRIPT: true,
  'MOD': '%',
  'Mod': '%',
  'mOd': '%',
  'moD': '%',
  'MoD': '%',
  'MOd': '%',
  'mOD': '%',
  'mod': '%',
  'div': 'div',
  'Div': 'div',
  'dIv': 'div',
  'diV': 'div',
  'DiV': 'div',
  'DIv': 'div',
  'dIV': 'div',
  'div': 'div',
  'AND': 'and',
  'And': 'and',
  'aNd': 'and',
  'anD': 'and',
  'ANd': 'and',
  'aND': 'and',
  'AnD': 'and',
  'and': 'and',
  'OR': 'or',
  'Or': 'or',
  'oR': 'or',
  'or': 'or',
  'NOT': 'not',
  'Not': 'not',
  'nOt': 'not',
  'noT': 'not',
  'NoT': 'not',
  'NOt': 'not',
  'noT': 'not',
  'not': 'not'
}; // KEYWORDS

/* --- Parser --- */

JSTTL.Parser = new SAMI.Subclass (function () {

}, JSTTL.Tokenizer, {

  parseString: function (s) {
    var r = new JSTTL.Action.ActionList;

    var self = this;

    var stack = new SAMI.List;
    stack.push ({type: '*bottommost'});

    var actionTypes = { // actionTypes[stackTopType][newTokenType]
      '*bottommost': {
        'eof': '*nop'
      },

      'GET': {
        'identifier': 'GetVariable/push'
      },

      'getOrSet': {
        'identifier': 'GetOrSetVariable/push',
      },

      'GetVariable': {
        'eof': 'pop/AppendValueOf/pop'
      },

      'GetOrSetVariable': {
        'eof': 'pop/AppendValueOf/pop'
      },

      'default': {
        'GET': 'push',
        'string': 'AppendString',
        'identifier': 'push-getOrSet/redo'
      },

      'error': {
        'eof': 'recoverFromError',
        'default': '*nop'
      }
    };

    var tokens = new SAMI.List;
    this.tokenizeTemplate (s).forEach (function (t) {
      if (t.type == 'text') {
        tokens.push ({type: 'string',
                      value: t.valueRef.substring (t.valueStart, t.valueEnd)});
      } else if (t.type == 'tag') {
        tokens.append (self.tokenizeDirectives
            (t.valueRef.substring (t.valueStart, t.valueEnd),
             t.line, t.columnInner));
      } else {
        this.die ('Unknown token type: ' + t.type);
      }
    });

    while (tokens.list.length || stack.list.length > 1) {
      var t = tokens.shift () || {type: 'eof'};

      var actionType = (actionTypes[stack.getLast ().type] || actionTypes['default'])[t.type]
          || (actionTypes[stack.getLast ().type] || {})['default']
          || actionTypes['default'][t.type]
          || '*unexpectedToken';
out('stacktop: ' + stack.getLast ().type + ', token: ' + t.type + ' -> ' + actionType);

      if (actionType == 'GetOrSetVariable/push') {
        var a = new JSTTL.Action.GetVariable (t.value);
        a.type = 'GetOrSetVariable';
        stack.push (a);
      } else if (actionType == 'GetVariable/push') {
        var a = new JSTTL.Action.GetVariable (t.value);
        stack.push (a);
      } else if (actionType == 'pop/AppendValueOf/pop') {
        var a = new JSTTL.Action.AppendValueOf (stack.pop ());
        r.push (a);
        stack.pop (); // 'GET' / 'getOrSet'
      } else if (actionType == 'pop/AppendValueOf') {
        var a = new JSTTL.Action.AppendValueOf (stack.pop ());
        r.push (a);
      } else if (actionType == 'AppendString') {
        var a = new JSTTL.Action.AppendString (t.value);
        r.push (a);
      } else if (actionType == 'push') {
        stack.push (t);
      } else if (actionType == 'push-getOrSet/redo') {
        stack.push ({type: 'getOrSet'});
        tokens.unshift (t);
      } else if (actionType == 'recoverFromError') {
        while (stack.list.length > 1) {
          stack.pop ();
        }
      } else if (actionType == '*nop') {
        //
      } else if (actionType == '*end') {
out(stack.list);
        break;
      } else if (actionType == '*unexpectedToken') {
        this.reportError ({
          type: 'unexpected token', level: 'm',
          text: t.type, value: t.value,
          line: t.line, column: t.column
        });
        stack.push ({type: 'error'});
        if (t.type == 'eof') tokens.unshift (t);
      } else {
        this.die ('Unknown action type: actionTypes[' + stack.getLast ().type + '][' + t.type + '] = ' + actionType);
      }
    }

    return r;
  } // parseString

}); // Parser

/* --- Actions --- */

JSTTL.Action = new SAMI.Class (function () {

}, {
  type: 'Action',
  toString: function () {
    var v = '[' + this.type + (this.value != undefined ? ' ' + this.value : '') + ']';
    if (this.action != null) {
      v += "\n  " + this.action.toString ();
    }
    return v;
  } // toString
}); // Action

// JSTTL.Action.ActionList is not a subclass of JSTTL.Action.
JSTTL.Action.ActionList = new SAMI.Subclass (function () {
  this._super.apply (this, arguments);
}, SAMI.List, {
  type: 'ActionList',

  toString: function () {
    return this.list.join ("\n");
  } // toString
}); // ActionList

JSTTL.Action.AppendString = new SAMI.Subclass (function (s) {
  this.value = s;
}, JSTTL.Action, {
  type: 'AppendString'
}); // AppendString

JSTTL.Action.AppendValueOf = new SAMI.Subclass (function (s) {
  this.action = s;
}, JSTTL.Action, {
  type: 'AppendValueOf'
}); // AppendValueOf

JSTTL.Action.GetVariable = new SAMI.Subclass (function (s) {
  this.value = s;
}, JSTTL.Action, {
  type: 'GetVariable'
}); // GetVariable

/* --- Onload --- */

if (JSTTL.onLoadFunctions) {
  new SAMI.List (JSTTL.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete JSTTL.onLoadFunctions;
}

/* 

TODO:

  ".." (same as Perl)
  "=>"
  a.${b.c}

*/

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2008-2009 Wakaba <w@suika.fam.cx>.  All rights reserved.
 *
 * This program is free software; you can redistribute it and/or 
 * modify it under the same terms as Perl itself.
 *
 * Alternatively, the contents of this file may be used 
 * under the following terms (the "MPL/GPL/LGPL"), 
 * in which case the provisions of the MPL/GPL/LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of the MPL/GPL/LGPL, and not to allow others to
 * use your version of this file under the terms of the Perl, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the MPL/GPL/LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the Perl or the MPL/GPL/LGPL.
 *
 * "MPL/GPL/LGPL":
 *
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * <http://www.mozilla.org/MPL/>
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is sami-test.js code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Wakaba <w@suika.fam.cx>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
