javascript:

var code = function () {
  var formName = 'fdh-demo';
  if (self.Ten && Ten.AsyncLoader) {
    Ten.AsyncLoader.executeWhenFragmentLoadedOrNow (function (root) {
      var forms = root.getElementsByTagName ('form');
      var formsL = forms.length;
      for (var i = 0; i < formsL; i++) (function (form) {
        var f = new FDH.Form (form, formName);
        f.watch ();
      }) (forms[i]);
    });

    if (self.Hatena && Hatena.Haiku) {
      var origHReply = Hatena.Haiku.EntryForm.createReplyForm;
      Hatena.Haiku.EntryForm.createReplyForm = function () {
        var form = origHReply.apply (this, arguments);
        var f = new FDH.Form (form, formName);
        f.watch ();
        return form;
      };
    }
  } else {
    var forms = document.forms;
    var formsL = forms.length;
    for (var i = 0; i < formsL; i++) (function (form) {
      var f = new FDH.Form (form, formName);
      f.watch ();
    }) (forms[i]);
  }

  if (self.Hatena && Hatena.Diary && Hatena.Diary.NewSection) {
    var origDInsert = Hatena.Diary.NewSection.prototype.insertForm;
    Hatena.Diary.NewSection.prototype.insertForm = function (form) {
      var result = origDInsert.apply (this, arguments);
      var f = new FDH.Form (form, formName);
      f.watch ();
      return result;
    };
  }
}; // code

if (self.Ten && Ten.AsyncLoader) {
  Ten.AsyncLoader.loadScripts
      ([
          // 'http://suika.fam.cx/www/js/formdatahistory/scripts/formdatahistory.js'
          'https://raw.github.com/wakaba/samijs/master/formdatahistory/scripts/formdatahistory.js'
       ], function () {
         code ();
       });
} else {
  var script = document.createElement ('script');
  // script.src = 'http://suika.fam.cx/www/js/formdatahistory/scripts/formdatahistory.js';
  script.src = 'https://raw.github.com/wakaba/samijs/master/formdatahistory/scripts/formdatahistory.js';
  script.onload = function () {
    code ();
  };
  document.body.appendChild (script);
}

var link = document.createElement ('link');
link.rel = 'stylesheet';
link.href = 'http://suika.fam.cx/www/js/formdatahistory/styles/defaultui.css';
// link.href = 'https://raw.github.com/wakaba/samijs/master/formdatahistory/styles/defaultui.css';
document.body.appendChild (link);

if (document.compatMode == 'BackCompat') {
  var style = document.createElement ('style');
  style.textContent = '.fdh-history-list menu { display: block }';
  document.body.appendChild (style);
}

void (0);

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2011 Wakaba <w@suika.fam.cx>.  All rights reserved.
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
 * The Original Code is FDH code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2011
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
