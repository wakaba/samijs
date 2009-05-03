/* Requires sami-core.js */

if (!SAMI.Test) SAMI.Test = {};

// Events: error
SAMI.Class.addClassMethods (SAMI.Test, {
  parseTestData: function (fieldProps, s) {
    var tests = new SAMI.List;

    var s = s.replace (/\x0D\x0A/g, "\x0A")
        .replace (/\x0D/g, "\x0A")
        .replace (/^\x0A*#/, '')
        .replace (/\x0A+$/, '')
        .split (/\x0A\x0A#/);
    s = new SAMI.List (s);
    s.forEach (function (_) {
      var test = new SAMI.Test.Item;

      new SAMI.List (_.split (/\x0A#/)).forEach (function (v) {
        var fieldName = '';
        var fieldOpt = new SAMI.List;
        v = v.replace (/^([A-Za-z0-9-]+)/, function (s) {
          fieldName = s;
          return '';
        }).replace (/^([^\x0A]*)(?:\x0A|$)/, function (_, s) {
          fieldOpt = SAMI.List.spaceSeparated (s);
          return '';
        });

        var fieldProp = fieldProps[fieldName] || {};
        if (fieldProp.isPrefixed) {
          v = v.replace (/^\| /, '').replace (/\x0A\| /g, "\x0A");
        }

        if (fieldProp.isList) {
          v = new SAMI.List (v.split (/\x0A/));
          if (fieldOpt.getLast () == 'escaped') {
            fieldOpt.pop ();
            v = v.map (function (item) {
              return SAMI.String.uUnescape (item);
            });
          }
        } else { // Not a list filed
          if (fieldOpt.getLast () == 'escaped') {
            fieldOpt.pop ();
            v = SAMI.String.uUnescape (v);
          }
        }

        if (test.hasField (fieldName)) {
          var e = new SAMI.Event ('error');
          e.type = 'duplicate field';
          e.text = fieldName;
          e.value = v;
          e.level = 'w';
          this.dispatchEvent (e);
        } else {
          test.setField (fieldName, v, fieldOpt);
        }
      }); // field

      tests.push (test);
    }); // test

    return tests;
  }, // parseTestData

  executeTestsByURL: function (url, fieldProps, code, onsuccess, onfail) {
    new SAMI.XHR (url, function () {
      var results = new SAMI.Test.Results;
      SAMI.Test.parseTestData (fieldProps, this.getText ()).forEach (function (test) {
        var result = code (test);
        results.add (result);
      });
      results.report (onsuccess, onfail);
    }, function () {
      var e = new SAMI.Event ('error');
      e.type = 'cannot retrieve test file';
      e.text = this.getSimpleErrorInfo ();
      e.label = 'm';
      this.dispatchEvent (e);
    }).get ();
  }
}); // SAMI.Test class methods

SAMI.Test.Item = new SAMI.Class (function () {
  this.fields = new SAMI.Hash;
}, {
  getField: function (fieldName) {
    return this.fields.get (fieldName);
  }, // getField
  hasField: function (fieldName) {
    return this.fields.has (fieldName);
  }, // hasField
  setField: function (fieldName, fieldValue, fieldOpt) {
    fieldValue.options = fieldOpt;
    this.fields.set (fieldName, fieldValue);
  } // setField
});

SAMI.Test.Results = new SAMI.Class (function () {
  //this.results = new SAMI.List;
  this.successCount = 0;
  this.failCount = 0;
}, {
  add: function (result) {
    if (result === true) {
      result = new Boolean (true);
      result.success = true;
    } else if (result === false) {
      result = new Boolean (true);
      result.success = false;
    } else if (!result) {
    //  result = new SAMI.Test.Result (false, 'Test code did not return the result');
    }

    //this.results.push (result);
    if (result && result.success) {
      this.successCount++;
    } else {
      this.failCount++;
    }
  }, // add
  report: function (onsuccess, onfail) {
    if (this.failCount == 0) {
      if (onsuccess) onsuccess.apply (this);
    } else {
      if (onfail) onfail.apply (this);
    }
  } // report
}); // Results

SAMI.Result = new SAMI.Class (function (isSuccess, message) {
  this.success = isSuccess;
  this.message = message || 'Null';
}, {

}); // Result

/* --- Onload --- */

if (SAMI.Test.onLoadFunctions) {
  new SAMI.List (SAMI.Test.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete SAMI.Test.onLoadFunctions;
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
