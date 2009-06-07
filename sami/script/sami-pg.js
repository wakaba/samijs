/*

  sami-pg.js - SAMI Parser Generator Module

*/

/* Requires sami-core.js */

if (!SAMI.PG) SAMI.PG = {};

/* --- Common Grammer Vocabulary --- */

SAMI.PG.Symbol = new SAMI.Class (function () {

}, {
  isTerminal: false,
  key: null
}); // Symbol

SAMI.PG.TerminalSymbol = new SAMI.Subclass (function (tokenType) {
  this.tokenType = tokenType;
  this.key = /* 'terminal-' + */ tokenType;
}, SAMI.PG.Symbol, {
  isTerminal: true,
  // tokenType
  // key

  isSameSymbol: function (s) {
    if (!s || !s.isTerminal) return false;
    return this.tokenType == s.tokenType;
  }, // isSameSymbol

  getFirsts: function (ruleSet) {
    return new SAMI.List ([this.tokenType]);
  }, // getFirsts

  toString: function () {
    return '"' + this.tokenType.replace (/([\u0022\u005C])/g, '\\$1') + '"';
  } // toString
}); // TerminalSymbol

SAMI.PG.NonTerminalSymbol = new SAMI.Subclass (function (symbolName) {
  this.symbolName = symbolName;
  this.key = 'nonterminal-' + symbolName;
}, SAMI.PG.Symbol, {
  // symbolName
  // key

  isSameSymbol: function (s) {
    if (!s || s.isTerminal) return false;
    return this.symbolName == s.symbolName;
  }, // isSameSymbol


  getFirsts: function (ruleSet) {
    var firstHash = new SAMI.Hash;

    var firstNonTerminals = new SAMI.List ([this.symbolName]);
    var checkedNames = {};
    while (firstNonTerminals.list.length) {
      var first = firstNonTerminals.shift ();
      if (checkedNames['nonterminal-' + first]) continue;
      checkedNames['nonterminal-' + first] = true;

      ruleSet.getRulesByName (first).rules.forEach (function (rule) {
        var ruleFirst = rule.symbols.list[0];
        if (!ruleFirst) return;
        if (ruleFirst.isTerminal) {
          firstHash.set (ruleFirst.tokenType, true);
        } else {
          firstNonTerminals.push (ruleFirst.symbolName);
        }
      });
    }

    return firstHash.mapToList (function (n) { return n });
  }, // getFirsts

  toString: function () {
    return this.symbolName;
  } // toString
}); // NonTerminalSymbol

SAMI.PG.Rule = new SAMI.Class (function (symbolName, symbols) {
  this.symbolName = symbolName;
  this.symbols = new SAMI.List (symbols);
}, {
  // symbolName
  // symbols

  getKey: function () {
    return this.toString ();
  }, // getKey

  clone: function () {
    var newRule = new this.constructor (this.symbolName, this.symbols.clone ());
    return newRule;
  }, // clone

  toString: function () {
    return this.symbolName + ' := ' + this.symbols.list.join (' ');
  } // toString
}); // Rule

SAMI.PG.RuleSet = new SAMI.Class (function (rules) {
  this.rules = new SAMI.List (rules);
}, {
  // rules

  getRulesByName: function (symbolName) {
    return new this.constructor (this.rules.grep (function (r) { return r.symbolName == symbolName }));
  }, // getRulesByName

  getSymbols: function () {
    var symbols = new SAMI.Hash;
    this.rules.forEach (function (rule) {
      rule.symbols.forEach (function (symbol) {
        symbols.set (symbol.key, symbol);
      });
    });
    return symbols;
  }, // getSymbols

  getKey: function () {
    return this.toString ();
  }, // getKey

  toString: function () {
    return this.rules.list.join ("\n");
  } // toString
}); // RuleSet

SAMI.PG.Collection = new SAMI.Class (function (ruleSets) {
  this.ruleSets = new SAMI.List (ruleSets);
}, {
  // ruleSets

  toString: function () {
    return this.ruleSets.list.join ("\n\n");
  } // toString
}); // Collection

/* --- LR(1) Parser Generator --- */

SAMI.PG.LR1 = new SAMI.Class (function () {

}, {

}); // LR1

SAMI.Class.addClassMethods (SAMI.PG.LR1, {
  ruleSetToParsingTable: function (ruleSet, startSymbolName) {
    var col = new SAMI.PG.LR1.RuleSet ([]).getCanonCollection (startSymbolName, ruleSet);
    return col.toParsingTable ();
  }, // ruleSetToParsingTable
  rulesStringToParsingTable: function (s, startSymbolName, onerror) {
    var p = new SAMI.PG.LR1.RulesParser;

    new SAMI.Observer ('error', p, onerror || function (ev) {
      outn ('Error: Unexpected token type {' + ev.token.type + ', ' + ev.token.value + '}; ' + ev.value);
    });

    var ruleSet = p.parseString (s);
    if (!ruleSet) return null;

    if (!startSymbolName && ruleSet.rules.list.length) {
      startSymbolName = ruleSet.rules.list[0].symbolName;
    }

    return this.ruleSetToParsingTable (ruleSet, startSymbolName);
  } // rulesStringToParsingTable
}); // LR1 class methods

SAMI.PG.LR1.Rule = new SAMI.Subclass (function (symbolName, symbols, index, firsts) {
  this._super.apply (this, [symbolName, symbols]);
  this.index = index;
  this.firsts = new SAMI.List (firsts);
}, SAMI.PG.Rule, {
  // index

  getNextSymbol: function () {
    return this.symbols.list[this.index];
  }, // getNextSymbol
  getNextNextSymbol: function () {
    return this.symbols.list[this.index + 1];
  }, // getNextNextSymbol

  // firsts

  clone: function () {
    var newRule = this._super.prototype.clone.apply (this, arguments);
    newRule.index = this.index;
    newRule.firsts = this.firsts.clone ();
    return newRule;
  }, // clone

  toString: function () {
    var suffix = '';
    if (this.firsts) {
      suffix += ', ' + this.firsts.list.join (' / ');
    }
    if (this.index == null) { // Normal production rule
      return this.symbolName + ' := ' + this.symbols.list.join (' ') + suffix;
    } else { // Production rule with a pointer
      return this.symbolName
          + ' := ' + this.symbols.list.slice (0, this.index).join (' ')
          + ' \u30FB ' + this.symbols.list.slice (this.index).join (' ')
          + suffix;
    }
  } // toString
}); // LR1.Rule

SAMI.PG.LR1.RuleSet = new SAMI.Subclass (function () {
  this._super.apply (this, arguments);
  this.rules = this.rules.map (function (rule) {
    return rule instanceof SAMI.PG.LR1.Rule ? rule : new SAMI.PG.LR1.Rule (rule.symbolName, rule.symbols, 0);
  });
  this.goTo = new SAMI.Hash;
}, SAMI.PG.RuleSet, {
  // ruleSetId

  getClosureLR0: function (ruleSet) {
    var closureHash = new SAMI.Hash ();

    var rulesToBeAdded = this.rules.clone ();
    while (rulesToBeAdded.list.length) {
      var rule = rulesToBeAdded.shift ();
      var ruleKey = rule.getKey ();
      if (closureHash.has (ruleKey)) continue;
      closureHash.set (ruleKey, rule);

      var nextSymbol = rule.getNextSymbol ();
      if (nextSymbol) {
        if (!nextSymbol.isTerminal) {
          rulesToBeAdded.append (ruleSet.getRulesByName (nextSymbol.symbolName).rules.map (function (rule) {
            return new SAMI.PG.LR1.Rule (rule.symbolName, rule.symbols, 0);
          }));
        }
      }
    }

    return new SAMI.PG.LR1.RuleSet (closureHash.mapToList (function (n, v) { return v }));
  }, // getClosureLR0


  getClosure: function (ruleSet) {
    var closureHash = new SAMI.Hash ();

    var rulesToBeAdded = this.rules.clone ();
    while (rulesToBeAdded.list.length) {
      var rule = rulesToBeAdded.shift ();
      var ruleKey = rule.getKey ();
      if (closureHash.has (ruleKey)) continue;
      closureHash.set (ruleKey, rule);

      var nextSymbol = rule.getNextSymbol ();
      if (nextSymbol) {
        if (!nextSymbol.isTerminal) {
          var firsts;
          var nextNextSymbol = rule.getNextNextSymbol ();
          if (nextNextSymbol) {
            firsts = nextNextSymbol.getFirsts (ruleSet) || rule.firsts;
          } else {
            firsts = rule.firsts;
          }

          rulesToBeAdded.append (ruleSet.getRulesByName (nextSymbol.symbolName).rules.map (function (rule) {
            return new SAMI.PG.LR1.Rule (rule.symbolName, rule.symbols, 0, firsts);
          }));
        }
      }
    }

    return new SAMI.PG.LR1.RuleSet (closureHash.mapToList (function (n, v) { return v }));
  }, // getClosure

  // goTo
  getGoTo: function (symbol, allRuleSet) {
    var reduction = false;
    var goTo = new this.constructor (this.rules.grep (function (rule) {
      if (rule.index == rule.symbols.list.length) reduction = true;
      return symbol.isSameSymbol (rule.getNextSymbol ());
    }).map (function (rule) {
      var newRule = rule.clone ();
      newRule.index++;
      return newRule;
    })).getClosure (allRuleSet);
    return goTo;
  }, // getGoTo

  toParsingTableRow: function () {
    var hash = new SAMI.Parser.LR1.ParsingTableRow;
    this.goTo.forEach (function (n, v) {
      var sk = v.symbolKey;
      if (sk != null) sk = sk.replace (/^nonterminal-/, '');
      hash.set (n.replace (/^nonterminal-/, ''),
          new SAMI.Parser.LR1.ParsingTableCell (v.isReduction, sk, v.symbolsLength, v.ruleSetId));
    });
    return hash;
  }, // toParsingTableEntry

  getCanonCollection: function (startSymbolName, allRuleSet) {
    var startRule = new SAMI.PG.LR1.Rule ('$start', [new SAMI.PG.NonTerminalSymbol (startSymbolName)], 0, ['EOF']);
    var startRuleSet = new SAMI.PG.LR1.RuleSet ([startRule]);
    this.rules.push (startRule);

    var endRule = startRule.clone ();
    endRule.index = endRule.symbols.list.length;
    var endRuleSet = new SAMI.PG.LR1.RuleSet ([endRule]);
    this.rules.push (endRule);

    var startClosure = startRuleSet.getClosure (allRuleSet);
    startClosure.ruleSetId = 0;
    var endClosure = endRuleSet.getClosure (allRuleSet);
    endClosure.ruleSetId = 1;
    var errorClosure = new SAMI.PG.LR1.RuleSet;
    errorClosure.ruleSetId = 2;

    var closures = [startClosure, endClosure, errorClosure];
    var closureToId = {};
    closureToId[startClosure.getKey ()] = 0;
    closureToId[endClosure.getKey ()] = 1;
    closureToId[errorClosure.getKey ()] = 2;

    var symbols = allRuleSet.getSymbols ();
    symbols.set (startRule.symbols.list[0].key, startRule.symbols.list[0]);

    var i = 0;
    while (i < closures.length) {
      var currentClosure = closures[i];

      symbols.forEach (function (symbolKey, symbol) {
        var goTo = currentClosure.getGoTo (symbol, allRuleSet);
        if (goTo) {
          var goToKey = goTo.getKey ();
          if (closureToId[goToKey] == null) {
            goTo.ruleSetId = closures.length;
            closureToId[goToKey] = goTo.ruleSetId;
            closures.push (goTo);
          }
        }

        if (goTo) {
          var id = closureToId[goTo.getKey ()];
          if (id != 2 /* error */) {
            currentClosure.goTo.set (symbol.key, new SAMI.PG.LR1.GoToRuleSet (id));
          }
        }
      });

      currentClosure.rules.forEach (function (rule) {
        if (rule.symbols.list.length == rule.index) {
          rule.firsts.forEach (function (firstSymbol) {
            currentClosure.goTo.set
                (/* 'terminal-' + */ firstSymbol,
                 new SAMI.PG.LR1.GoToReduction ('nonterminal-' + rule.symbolName, rule.symbols.list.length));
          });
        }
      });

      i++;
    }

    this.rules.pop (); // end
    this.rules.pop (); // start

    return new SAMI.PG.LR1.Collection (closures);
  }, // getCanonCollection

  getKey: function () {
    return this._super.prototype.toString.apply (this, []);
  }, // getKey

  toString: function () {
    return this.ruleSetId + ":\n"
        + this._super.prototype.toString.apply (this, []) + "\n"
        + this.goTo.mapToList (function (n, v) { return n + ' -> ' + v }).list.join ("\n");
  } // toString
}); // LR1.RuleSet

SAMI.PG.LR1.Collection = new SAMI.Subclass (function () {
  this._super.apply (this, arguments);
}, SAMI.PG.Collection, {
  toParsingTable: function () {
    var index = 0;
    return new SAMI.Parser.LR1.ParsingTable (this.ruleSets.map (function (ruleSet) {
      var row = ruleSet.toParsingTableRow ();
      row.index = index++;
      return row;
    }).list);
  } // toParsingTable
}); // Collection

SAMI.PG.LR1.GoToEntry = new SAMI.Class (function () {

}, {
  isReduction: false
}); // GoToEntry

SAMI.PG.LR1.GoToRuleSet = new SAMI.Subclass (function (id) {
  this.ruleSetId = id;
}, SAMI.PG.LR1.GoToEntry, {
  // ruleSetId

  toString: function () {
    return "goto #" + this.ruleSetId;
  } // toString
}); // GoToRuleSet

SAMI.PG.LR1.GoToReduction = new SAMI.Subclass (function (symbolKey, symbolsLength) {
  this.symbolKey = symbolKey;
  this.symbolsLength = symbolsLength;
}, SAMI.PG.LR1.GoToEntry, {
  isReduction: true,

  // symbolKey, symbolsLength

  toString: function () {
    return "reduction " + this.symbolsLength + ' -> ' + this.symbolKey;
  } // toString
}); // GoToReduction


SAMI.PG.LR1.RulesParser = new SAMI.Subclass (function () {

}, SAMI.Parser.LR1, {
  _patterns: new SAMI.List ([
    {pattern: /[\w_-]+/, type: 'non-terminal-symbol', code: function (t, v) { t.value = v }},
    {
      pattern: /'(?:[^\u0027\\]|\\[\s\S])+'|"(?:[^\u0022\\]|\\[\s\S])+"/,
      type: 'terminal-symbol',
      code: function (t, v) {
        t.value = v.replace (/^./, '').replace (/.$/, '').replace (/\\(.)/g, function (_, v) { return v });
      }
    },
    {pattern: /\s+/, ignore: true},
    {pattern: /:=/}
  ]), // _patterns

  _processLR1StackObjects: function (key, objs) {
    if (key == 'symbol') {
      var t = objs.list[0];
      var v;
      if (t.type == 'non-terminal-symbol') {
        v = new SAMI.PG.NonTerminalSymbol (t.value);
      } else { // terminal-symbol
        v = new SAMI.PG.TerminalSymbol (t.value);
      }
      return {type: key, value: v};
    } else if (key == 'righthand') {
      if (objs.list.length == 2) {
        var v = objs.list[0];
        v.value.push (objs.list[1].value);
        return v;
      } else {
        return {type: key, value: new SAMI.List ([objs.list[0].value])};
      }
    } else if (key == 'expression') {
      return {type: key, value: new SAMI.PG.Rule (objs.list[0].value, objs.list[2].value)};
    } else if (key == 'rules') {
      if (objs.list.length == 2) {
        var v = objs.list[0].value;
        v.rules.push (objs.list[1].value);
        return {type: key, value: v};
      } else {
        return {type: key, value: new SAMI.PG.RuleSet ([objs.list[0].value])};
      }
    }
    return {type: key, value: key + '{ ' + objs.map (function (s) { return s.type + ',' + s.value }).list.join (', ') + ' }'};
  }, // _processLR1StackObjects

/*

  rules := expression ;
  expression := 'non-terminal-symbol' ':=' righthand ;
  righthand := righthand symbol ;
  righthand := symbol ;
  symbol := 'non-terminal-symbol' ;
  symbol := 'terminal-symbol' ;

*/
  _parsingTable:
  /* Parsing Table */
new SAMI.Parser.LR1.ParsingTable ([
  new SAMI.Parser.LR1.ParsingTableRow ({
    "rules": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 3),
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 4),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 5)
  }).setIndex (0), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "$start", 1)
  }).setIndex (1), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    
  }).setIndex (2), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "expression": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 6),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 5),
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "$start", 1)
  }).setIndex (3), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "rules", 1),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "rules", 1)
  }).setIndex (4), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ":=": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 7)
  }).setIndex (5), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "rules", 2),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "rules", 2)
  }).setIndex (6), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 8),
    "righthand": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 9),
    "symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 10),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11)
  }).setIndex (7), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1)
  }).setIndex (8), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 8),
    ";": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 12),
    "symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 13),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (false, undefined, undefined, 11)
  }).setIndex (9), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 1),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 1),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 1)
  }).setIndex (10), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "symbol", 1)
  }).setIndex (11), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    "EOF": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 4),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "expression", 4)
  }).setIndex (12), 
  new SAMI.Parser.LR1.ParsingTableRow ({
    ";": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2),
    "non-terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2),
    "terminal-symbol": new SAMI.Parser.LR1.ParsingTableCell (true, "righthand", 2)
  }).setIndex (13)
])
  ,/* Parsing Table */

  parseString: function (s) {
    var tokens = this.tokenizeString (s);
    var result = this._parseTokens (tokens);
    return result != null ? result.value : null;
  } // parseString
}); // RulesParser
SAMI.Class.mix (SAMI.PG.LR1.RulesParser, SAMI.Parser.SimpleTokenizer);

/* --- Onload --- */

if (SAMI.PG.onLoadFunctions) {
  new SAMI.List (SAMI.PG.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete SAMI.PG.onLoadFunctions;
}

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2009 Wakaba <w@suika.fam.cx>.  All rights reserved.
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
 * The Original Code is sami-pg.js code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2009
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

