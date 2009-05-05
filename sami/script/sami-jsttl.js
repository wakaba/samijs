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
                            line: tokenL, column: tokenC});
            }
            prevPos = newPrevPos;
            tokenL = l;
            tokenC = ++c + 1;
            state = 'content';
          }
        } else {
          i++;
        }
      }
    } // while

    if (prevPos != i) {
      if (state != 'tag') {
        tokens.push ({type: 'text',
                      valueRef: s, valueStart: prevPos, valueEnd: i,
                      line: tokenL, column: tokenC});
      } else { // state == 'tag'
        this.reportError ({type: 'unclosed tag at eof', line: l, column: c + 1});
        tokens.push ({type: 'tag',
                      valueRef: s, valueStart: prevPos, valueEnd: i,
                      line: tokenL, column: tokenC});
      }
    }

    return tokens;
  }, // tokenizeTemplate

  tokenizeDirectives: function (s) {
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

  } // tokenizeDirectives
}); // Tokenizer

/* --- Onload --- */

if (JSTTL.onLoadFunctions) {
  new SAMI.List (JSTTL.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete JSTTL.onLoadFunctions;
}

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
