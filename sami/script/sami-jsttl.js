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

    tokens.push ({type: 'EOF', line: l, column: c});

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
      block := 'BLOCK' block-name
      macro := 'MACRO' block-name ['BLOCK']
      block-name := atom / number / path
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
      term := scalar-term / list-literal / hash-literal
      scalar-term := lvalue / double-quoted / single-quoted / path / number / ref
      ref := "\" lvalue
      lvalue := (variable / dollar-variable / function) *("." (variable / dollar-variable / function))
      function := atom "(" arguments ")"
      variable := atom
      dollar-variable := "$" atom
      enclosed-dollar-variable := "${" lvalue "}"
      double-quoted := <"> *(char - ("\" / <"> / "$") / "\" char / dollar-variable / enclosed-dollar-variable) <">
      path := atom 1*("/" (atom / number)) ;; XXX abspath, relpath
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
              tokens.push ({type: '(', line: ln, column: cn});
              cn += 2;
              var ts = self.tokenizeDirectives
                  (c.substring (2), ln, cn, {returnAtBrace: true});
              var eof = ts.pop ();
              ln = eof.line;
              cn = eof.column;
              ts.getLast ().type = ')'; // '}' -> ')'
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
                tokens.push ({type: '_', line: ln, column: cn});
                tokens.push ({type: 'string', value: '$' + i, line: ln, column: cn});
                cn += i.length;
              } else { // $_45 is allowed.
                tokens.push ({type: '_', line: ln, column: cn});
                //tokens.push ({type: '$', line: ln, column: cn});
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

    tokens.push ({type: 'EOF', line: ln, column: cn});

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
  'MOD': 'mod',
  'Mod': 'mod',
  'mOd': 'mod',
  'moD': 'mod',
  'MoD': 'mod',
  'MOd': 'mod',
  'mOD': 'mod',
  'mod': 'mod',
  '%': 'mod',
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
  '&&': 'and',
  'OR': 'or',
  'Or': 'or',
  'oR': 'or',
  'or': 'or',
  '||': 'or',
  'NOT': 'not',
  'Not': 'not',
  'nOt': 'not',
  'noT': 'not',
  'NoT': 'not',
  'NOt': 'not',
  'noT': 'not',
  'not': 'not',
  '!': 'not'
}; // KEYWORDS

/* --- Parser --- */

JSTTL.Parser = new SAMI.Subclass (function () {

  // XXX
  //this.createParsingTableFromGrammer ();
  //$('grammer').textContent = this._parsingTable.toSource ();

}, SAMI.Parser.LR1, {

  // For development
  createParsingTableFromGrammer: function () {
    var grammer = $('grammer').textContent;

    this._parsingTable = SAMI.PG.LR1.rulesStringToParsingTable (grammer, null, function (ev) {
      out ('Error: Unexpected token type {' + ev.token.type + ', ' + ev.token.value + '}; ' + ev.value);
    });
  }, // createParsingTableFromGrammer

  _processLR1StackObjects: function (key, objs) {
    var pr = this._processParsingNode[key];
    if (pr) {
      return {type: key, value: pr (objs)};
    } else {
      return {type: key, value: /* key + */ "{\n  " + objs.map (function (s) {
        return s.type + ': ' + s.value;
      }).list.join (',\n').replace (/\n/g, "\n  ") + '\n}'};
    }
  }, // _processLR1StackObjects

  _processParsingNode: {
    content: function (objs) {
      if (objs.list.length == 2) {
        return objs.list[1].value;
      } else {
        return new JSTTL.Action.ActionList;
      }
    }, // content

    template: function (objs) {
      if (objs.list.length == 2) {
        var al;
        if (objs.list[0].value instanceof JSTTL.Action.ActionList) {
          al = objs.list[0].value;
        } else {
          al = new JSTTL.Action.ActionList;
          al.push (objs.list[0].value);
        }

        if (objs.list[1].type == 'text') {
          al.push (new JSTTL.Action.AppendString (objs.list[1].value));
        } else {
          al.push (objs.list[1].value);
        }
        
        return al;
      } else {
        if (objs.list[0].type == 'text') {
          return new JSTTL.Action.AppendString (objs.list[0].value);
        } else {
          return objs.list[0].value;
        }
      }
    }, // template

    tag: function (objs) {
      if (objs.list.length == 2) {
        return objs.list[0].value;
      } else {
        return new JSTTL.Action.ActionList;
      }
    }, // tag

    directives: function (objs) {
      if (objs.list.length == 3) { // directive ; directive
        var al;
        if (objs.list[0].value instanceof JSTTL.Action.ActionList) {
          al = objs.list[0].value;
        } else {
          al = new JSTTL.Action.ActionList;
          al.push (objs.list[0].value);
        }

        al.push (objs.list[2].value);
        return al;
      } else {
        return objs.list[0].value;
      }
    }, // directives

    directive: function (objs) {
      return objs.list[0].value;
    }, // directive

    get: function (objs) {
      if (objs.list.length == 2) { // GET foo
        return new JSTTL.Action.AppendValueOf (objs.list[1].value);
      } else { // foo
        return new JSTTL.Action.AppendValueOf (objs.list[0].value);
      }
    }, // get

    set: function (objs) {
      if (objs.list.length == 2) { // SET foo
        return objs.list[1].value;
      } else { // foo
        return objs.list[0].value;
      }
    }, // set

    'set-expression': function (objs) {
      var left;
      if (objs.list[0].value instanceof JSTTL.Action) {
        left = objs.list[0].value;
      } else if (objs.list[0].type == 'variable-name') {
        left = new JSTTL.Action.GetLValue (objs.list[0].value);
      } else {
        left = new JSTTL.Action.String (objs.list[0].value);
      }

      return new JSTTL.Action.Assign (left, objs.list[2].value);
    }, // set-expression

    righthand: function (objs) {
      // XXX

      return objs.list[0].value;
    }, // objs

    block: function (objs) {
      if (objs.list.length == 5) { // BLOCK block-name eod template END
        return new JSTTL.Action.Block
            (objs.list[1].value, objs.list[3].value);
      } else { // BLOCK block-name eod END
        return new JSTTL.Action.Block
            (objs.list[1].value, new JSTTL.Action.ActionList);
      }
    }, // block

    'block-name': function (objs) {
      return objs.list[0].value;
    }, // block-name

    'if': function (objs) {
      var cond = objs.list[1].value;
      if (objs.list[0].value == 'UNLESS') {
        cond = new JSTTL.Action.UnaryOperation ('not', cond);
      }

      if (objs.list.length == 5) { // IF exp opt-content else END
        return new JSTTL.Action.If
            (cond, objs.list[2].value, objs.list[3].value);
      } else { // IF exp opt-content END
        return new JSTTL.Action.If
            (cond, objs.list[2].value);
      }
    }, // if

    'if-unless': function (objs) {
      return objs.list[0].type;
    }, // if-unless

    'else': function (objs) {
      if (objs.list.length == 2) { // ELSE optional-content
        return objs.list[1].value;
      } else { // elsif
        return objs.list[0].value;
      }
    }, // else

    'elsif': function (objs) {
      if (objs.list.length == 4) { // ELSIF expression opt-content else
        return new JSTTL.Action.If
            (objs.list[1].value, objs.list[2].value, objs.list[3].value);
      } else { // ELSIF exp opt-content
        return new JSTTL.Action.If
            (objs.list[1].value, objs.list[2].value);
      }
    }, // elsif

    'optional-content': function (objs) {
      if (objs.list.length == 4) { // ';' directives 'eod' template
        if (objs.list[1].value instanceof JSTTL.Action.ActionList) {
          objs.list[1].value.append (objs.list[3].value);
          return objs.list[1].value;
        } else {
          var l = new JSTTL.Action.ActionList;
          l.push (objs.list[1].value);
          l.push (objs.list[3].value);
          return l;
        }
      } else if (objs.list.length == 3) { // ';' directives ('eod' | ';')
        return objs.list[1].value;
      } else if (objs.list.length == 2) { // 'eod' template
        return objs.list[1].value;
      } else { // 'eod', ';'
        return new JSTTL.Action.ActionList;
      }
    }, // optional-content

    expression: function (objs) {
      if (objs.list.length == 3) {
        return new JSTTL.Action.BinaryOperation
            (objs.list[1].type, objs.list[0].value, objs.list[2].value);
      } else {
        return objs.list[0].value;
      }
    }, // expression
    expression1: function (objs) {
      if (objs.list.length == 3) {
        return new JSTTL.Action.BinaryOperation
            (objs.list[1].type, objs.list[0].value, objs.list[2].value);
      } else {
        return objs.list[0].value;
      }
    }, // expression1
    expression2: function (objs) {
      if (objs.list.length == 3) {
        return new JSTTL.Action.BinaryOperation
            (objs.list[1].type, objs.list[0].value, objs.list[2].value);
      } else {
        return objs.list[0].value;
      }
    }, // expression2
    expression3: function (objs) {
      if (objs.list.length == 3) {
        return new JSTTL.Action.BinaryOperation
            (objs.list[1].type, objs.list[0].value, objs.list[2].value);
      } else {
        return objs.list[0].value;
      }
    }, // expression3
    expression4: function (objs) {
      if (objs.list.length == 2) {
        return new JSTTL.Action.UnaryOperation
            (objs.list[0].type, objs.list[1].value);
      } else {
        return objs.list[0].value;
      }
    }, // expression4

    term: function function (objs) {
      if (objs.list.length == 3) {
        return objs.list[1].value;
      } else {
        return objs.list[0].value;
      }
    }, // term
    'scalar-term': function (objs) {
      if (objs.list[0].type == 'string') {
        return new JSTTL.Action.String (objs.list[0].value);
      } else if (objs.list[0].type == 'number') {
        return new JSTTL.Action.Number (objs.list[0].value);
      } else {
        return objs.list[0].value;
      }
    }, // scalar-term

    lvalue: function (objs) {
      // variable-name
      return new JSTTL.Action.GetLValue (objs.list[0].value);
    }, // lvalue

    'variable-name': function (objs) {
      return objs.list[0].value;
    } // variable-name
  }, // _processParsingNode

  _onParseError: function (stack, token, tokens) {
    this.reportError ({
      type: 'unexpected token', level: 'm',
      token: token,
      line: token.line, column: token.column,
      text: token.type, value: token.value
    });

    // discard all states and tokens in the current (opening) directive tag.
    while (stack.list.length > 1) {
      var state = stack.pop (); // state
      var stoken = stack.pop ();
      if (stoken.type == 'template' || stoken.type == 'text' || stoken.type == 'content-start') {
        stack.push (stoken);
        stack.push (state);
        break;
      }
    }

    // discard all tokens until 'eod' or 'EOF' appears.
    while (token.type != 'eod' && token.type != 'EOF') {
      token = tokens.shift ();
    }

    //// dummy
    //if (tokens.list.length < 4) {
      if (tokens.list.length == 0) {
        tokens.unshift (token); // EOF
      }
    //  tokens.unshift ({type: 'text', value: ''});
    //}

    return true; // continue processing
  }, // _onParseError

  parseString: function (s) {
    var self = this;

    outn (s);

    var tokens = new SAMI.List;
    tokens.push ({type: 'content-start', line: 1, column: 1});

    this.tokenizeTemplate (s).forEach (function (t) {
      if (t.type == 'text') {
        tokens.push ({type: 'text',
                      value: t.valueRef.substring (t.valueStart, t.valueEnd)});
      } else if (t.type == 'tag') {
        tokens.append (self.tokenizeDirectives
            (t.valueRef.substring (t.valueStart, t.valueEnd),
             t.line, t.columnInner));
        tokens.getLast ().type = 'eod';
      } else if (t.type == 'EOF') {
        tokens.push (t);
      } else {
        this.die ('Unknown token type: ' + t.type);
      }
    });

    outn (tokens.toSource());

    var r = this._parseTokens (tokens);
    return r != null ? r.value : null;
  } // parseString

}); // Parser
SAMI.Class.mix (JSTTL.Parser, JSTTL.Tokenizer);

/* --- Actions --- */

JSTTL.Action = new SAMI.Class (function () {

}, {
  type: 'Action',
  toString: function (indent) {
    if (indent == null) indent = '';
    var v = '[' + this.type + (this.value != undefined ? ' ' + this.value : '') + ']';
    if (this.action != null) {
      v += "\n  " + indent + this.action.toString (indent + '  ');
    }
    if (this.action2 != null) {
      v += "\n  " + indent + this.action2.toString (indent + '  ');
    }
    if (this.action3 != null) {
      v += "\n  " + indent + this.action3.toString (indent + '  ');
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

JSTTL.Action.Block = new SAMI.Subclass (function (name, actions) {
  this.name = name;
  this.action = actions;
}, JSTTL.Action, {
  type: 'Block',

  // name

  toString: function (indent) {
    if (indent == null) indent = '';
    var r = '[' + this.type + ' ' + this.name + ']';
    var c = this.action.toString (indent + '  ');
    if (c.length) {
      r += "\n  " + indent + c;
    }
    return r;
  } // toString
}); // Block

JSTTL.Action.If = new SAMI.Subclass (function (c, t, f) {
  this.action = c;
  this.action2 = t;
  this.action3 = f;
}, JSTTL.Action, {
  type: 'If'
}); // If

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

JSTTL.Action.Assign = new SAMI.Subclass (function (s, t) {
  this.action = s;
  this.action2 = t;
}, JSTTL.Action, {
  type: 'Assign'
}); // Assign

JSTTL.Action.UnaryOperation = new SAMI.Subclass (function (op, a) {
  this.action = a;
  this.type = op;
}, JSTTL.Action, {
  
}); // UnaryOperation

JSTTL.Action.BinaryOperation = new SAMI.Subclass (function (op, a, b) {
  this.action = a;
  this.action2 = b;
  this.type = op;
}, JSTTL.Action, {
  
}); // BinaryOperation

JSTTL.Action.GetLValue = new SAMI.Subclass (function (s) {
  this.value = s;
}, JSTTL.Action, {
  type: 'GetLValue'
}); // GetLValue

JSTTL.Action.String = new SAMI.Subclass (function (s) {
  this.value = s;
}, JSTTL.Action, {
  type: 'String'
}); // String

JSTTL.Action.Number = new SAMI.Subclass (function (s) {
  this.value = s;
}, JSTTL.Action, {
  type: 'Number'
}); // Number

/* --- JSTTL.Parser parsing table --- */

JSTTL.Parser.prototype._parsingTable =
new SAMI.Parser.LR1.ParsingTable ([
  new SAMI.Parser.LR1.ParsingTableRow ({
    "content-start": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 3),
    "content": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 1)
  }).setIndex (0), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "$start", 1)
  }).setIndex (1), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    
  }).setIndex (2), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 4),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 5),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 6),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 7),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 8),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "content", 1)
  }).setIndex (3), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 36),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 37),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 7),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 8),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "content", 2)
  }).setIndex (4), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (5), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (6), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 38),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 39)
  }).setIndex (7), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1)
  }).setIndex (8), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 1)
  }).setIndex (9), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1)
  }).setIndex (10), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1)
  }).setIndex (11), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1)
  }).setIndex (12), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directive", 1)
  }).setIndex (13), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 40),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (14), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "get", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "get", 1)
  }).setIndex (15), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "filters": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 43),
    "conditions": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 44),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 45),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 46),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 1)
  }).setIndex (16), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 47),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 48),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 49)
  }).setIndex (17), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "set", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "set", 1)
  }).setIndex (18), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 50),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1)
  }).setIndex (19), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "block-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 51),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 52),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 53),
    "path": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 54)
  }).setIndex (20), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1)
  }).setIndex (21), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (22), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 55),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 59),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 60),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (23), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1)
  }).setIndex (24), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "if-unless", 1)
  }).setIndex (25), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 69),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 70),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 71),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 72),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 73),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 74),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1)
  }).setIndex (26), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1)
  }).setIndex (27), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 78),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 79),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 80),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 81),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1)
  }).setIndex (28), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1)
  }).setIndex (29), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 82),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (30), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1)
  }).setIndex (31), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1)
  }).setIndex (32), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 83),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 87),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 88),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (33), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ".": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 97),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (34), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (35), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (36), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (37), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2)
  }).setIndex (38), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 98),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2)
  }).setIndex (39), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "get", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "get", 2)
  }).setIndex (40), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1)
  }).setIndex (41), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1)
  }).setIndex (42), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "conditions": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 99),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2)
  }).setIndex (43), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2)
  }).setIndex (44), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 100),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (45), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 101),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (46), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "set", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "set", 2)
  }).setIndex (47), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 50)
  }).setIndex (48), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1)
  }).setIndex (49), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 102),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (50), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 103)
  }).setIndex (51), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "block-name", 1)
  }).setIndex (52), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "block-name", 1)
  }).setIndex (53), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "block-name", 1)
  }).setIndex (54), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 104),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 105),
    "optional-content": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 106),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 107),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 108)
  }).setIndex (55), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1)
  }).setIndex (56), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1)
  }).setIndex (57), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (58), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 109),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 110),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 111),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 112),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 113),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 114),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1)
  }).setIndex (59), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1)
  }).setIndex (60), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 118),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 119),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 120),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 121),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1)
  }).setIndex (61), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1)
  }).setIndex (62), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 122),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (63), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1)
  }).setIndex (64), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1)
  }).setIndex (65), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 123),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 87),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 88),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (66), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ".": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 124),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (67), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (68), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 125),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (69), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 126),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (70), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 127),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (71), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 128),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (72), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 129),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (73), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 130),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (74), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 131),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (75), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 132),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (76), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 133),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (77), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 134),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (78), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 135),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (79), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 136),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (80), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 41),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 137),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (81), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2)
  }).setIndex (82), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 138),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 139),
    ")": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 140)
  }).setIndex (83), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 1)
  }).setIndex (84), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "variable-name", 1)
  }).setIndex (85), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (86), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 141),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 142),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 143),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 144),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 145),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 146),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 1)
  }).setIndex (87), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 1)
  }).setIndex (88), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 150),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 151),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 152),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 153),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 1)
  }).setIndex (89), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 1)
  }).setIndex (90), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 154),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (91), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 1)
  }).setIndex (92), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 1)
  }).setIndex (93), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 155),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 87),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 88),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (94), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ".": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 156),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (95), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "scalar-term", 1)
  }).setIndex (96), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 157),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 42)
  }).setIndex (97), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 3)
  }).setIndex (98), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 3)
  }).setIndex (99), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 69),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 70),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 71),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 72),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 73),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 74),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (100), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 69),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 70),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 71),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 72),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 73),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 74),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (101), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "set-expression", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "set-expression", 3)
  }).setIndex (102), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 158),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 159),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 160),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "END": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 163),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (103), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 164),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 165),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 166),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 167),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 168),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1)
  }).setIndex (104), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 169),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1)
  }).setIndex (105), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 170),
    "else": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 171),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 172),
    "elsif": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 173),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 174)
  }).setIndex (106), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 175),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 60),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (107), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 176),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 60),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (108), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 177),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (109), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 178),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (110), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 179),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (111), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 180),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (112), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 181),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (113), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 182),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (114), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 183),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (115), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 184),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (116), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 185),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (117), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 186),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (118), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 187),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (119), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 188),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (120), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 189),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (121), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2)
  }).setIndex (122), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 138),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 139),
    ")": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 190)
  }).setIndex (123), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 191),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57)
  }).setIndex (124), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (125), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (126), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (127), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (128), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (129), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 75),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 76),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 77),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (130), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 78),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 79),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 80),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 81),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (131), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 78),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 79),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 80),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 81),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (132), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 78),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 79),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 80),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 81),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (133), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (134), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (135), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (136), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (137), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 192),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 88),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (138), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 193),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 88),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (139), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3)
  }).setIndex (140), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 194),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (141), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 195),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (142), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 196),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (143), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 197),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (144), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 198),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (145), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 199),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 89),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (146), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 200),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (147), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 201),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (148), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 202),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 90),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (149), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 203),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (150), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 204),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (151), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 205),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (152), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 84),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 86),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 206),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 91),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 92),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 93),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 94),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 95),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 96)
  }).setIndex (153), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression4", 2)
  }).setIndex (154), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 138),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 139),
    ")": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 207)
  }).setIndex (155), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 208),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 85)
  }).setIndex (156), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3)
  }).setIndex (157), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 209),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 210),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "END": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 211),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35)
  }).setIndex (158), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (159), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (160), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 212),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 39)
  }).setIndex (161), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1)
  }).setIndex (162), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "block", 4),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "block", 4)
  }).setIndex (163), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 213),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 214),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 167),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 168),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 2),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 2),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 2)
  }).setIndex (164), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (165), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 1)
  }).setIndex (166), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 215),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 39)
  }).setIndex (167), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 1)
  }).setIndex (168), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 216),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 217)
  }).setIndex (169), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "if", 4),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "if", 4)
  }).setIndex (170), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 218)
  }).setIndex (171), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 219),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 220),
    "optional-content": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 221)
  }).setIndex (172), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "else", 1)
  }).setIndex (173), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 222),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 56),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 57),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 58),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 59),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 60),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 61),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 62),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 63),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 64),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 65),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 66),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 67),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 68)
  }).setIndex (174), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 109),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 110),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 111),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 112),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 113),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 114),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (175), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 109),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 110),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 111),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 112),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 113),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 114),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (176), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (177), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (178), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (179), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (180), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (181), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 115),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 116),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 117),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (182), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 118),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 119),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 120),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 121),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (183), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 118),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 119),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 120),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 121),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (184), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 118),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 119),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 120),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 121),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (185), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (186), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (187), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (188), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (189), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3)
  }).setIndex (190), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3)
  }).setIndex (191), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 141),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 142),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 143),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 144),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 145),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 146),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (192), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "==": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 141),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 142),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 143),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 144),
    "<": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 145),
    ">": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 146),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 3)
  }).setIndex (193), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (194), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (195), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (196), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (197), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (198), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "+": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 147),
    "-": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 148),
    "_": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 149),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression1", 3)
  }).setIndex (199), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 150),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 151),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 152),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 153),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (200), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 150),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 151),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 152),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 153),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (201), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "*": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 150),
    "/": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 151),
    "div": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 152),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 153),
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression2", 3)
  }).setIndex (202), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (203), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (204), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (205), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "expression3", 3)
  }).setIndex (206), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "term", 3)
  }).setIndex (207), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ")": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "||": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "==": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "!=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">=": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "<": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ">": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "+": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "-": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "_": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "*": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "/": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "div": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    "mod": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3),
    ".": new SAMI.Parser.LR1.ParsingTableCell (true, "lvalue", 3)
  }).setIndex (208), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (209), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (210), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "block", 5),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "block", 5)
  }).setIndex (211), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2)
  }).setIndex (212), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (213), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "template", 2)
  }).setIndex (214), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "not": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "(": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "string": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "number": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2),
    "text": new SAMI.Parser.LR1.ParsingTableCell (true, "tag", 2)
  }).setIndex (215), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 223),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 165),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 166),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 167),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 168),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3)
  }).setIndex (216), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 98),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2)
  }).setIndex (217), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "if", 5),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "if", 5)
  }).setIndex (218), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 224),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 159),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 160),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1)
  }).setIndex (219), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 225),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 1)
  }).setIndex (220), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "else", 2)
  }).setIndex (221), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 104),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 105),
    "optional-content": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 226),
    "&&": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 107),
    "||": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 108)
  }).setIndex (222), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 213),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 214),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 167),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 168),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 4),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 4),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 4)
  }).setIndex (223), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 209),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 210),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 2)
  }).setIndex (224), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 227),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 228)
  }).setIndex (225), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "else": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 229),
    "ELSE": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 172),
    "elsif": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 173),
    "ELSIF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 174),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "elsif", 3)
  }).setIndex (226), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "template": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 230),
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 159),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 160),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3)
  }).setIndex (227), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 98),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 3),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2),
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "directives", 2)
  }).setIndex (228), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "elsif", 4)
  }).setIndex (229), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "tag": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 209),
    "text": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 210),
    "directives": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 161),
    "eod": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 162),
    "directive": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "get": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "set": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11),
    "block": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "if": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "GET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 14),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 15),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 16),
    "SET": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 17),
    "set-expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 18),
    "variable-name": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 19),
    "BLOCK": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 20),
    "identifier": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 21),
    "number": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 22),
    "if-unless": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 23),
    "IF": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 24),
    "UNLESS": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 25),
    "expression1": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 26),
    "expression2": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 27),
    "expression3": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 28),
    "expression4": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 29),
    "not": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 30),
    "term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 31),
    "scalar-term": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 32),
    "(": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 33),
    "lvalue": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 34),
    "string": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 35),
    "END": new SAMI.Parser.LR1.ParsingTableCell (true, "optional-content", 4)
  }).setIndex (230)
])
;/* _parsingTable */

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
