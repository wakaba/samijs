/* Requires sami-core.js, NodeRect.js */

SAMI.UI = SAMI.UI || {};

/* ------ Basic UI components ------ */

SAMI.Box = new SAMI.Class (function (opts) {
  this.element = document.createElement ('div');

  if (opts.rect) {
    this.setInitialRect (opts.rect);
  }

  if (opts.classNames) {
    this.initialClassNames = opts.classNames;
    this.element.className = opts.classNames;
  }

  if (opts.id) {
    this.element.id = opts.id;
  }
}, {
  show: function () {
    var el = this.element;
    if (!el.parentNode) {
      if (window.Ten && Ten.AsyncLoader) {
        Ten.AsyncLoader.insertToBody (el);
      } else {
        document.body.appendChild (el);
      }
    } else {
      if (el.style.display == 'none') el.style.display = '';
    }
    delete this.prevShown;
  }, // show
  hide: function () {
    if (!this.element) {
      delete this.prevShown;
    } else if (this.element.style.display != 'none') {
      this.element.style.display = 'none';
      this.prevShown = true;
    } else {
      delete this.prevShown;
    }
  }, // hide
  restore: function () {
    if (this.prevShown) {
      this.show ();
    } else {
      this.hide ();
    }
  }, // restore
  discard: function () {
    var parent = this.element.parentNode;
    if (parent) {
      this.prevShown = this.element.style.display != 'none';
      parent.removeChild (this.element);
    } else {
      delete this.prevShown;
    }
  }, // discard

  setInitialRect: function (rect) {
    this.initialRect = rect;
    var style = this.element.style;
    style.top = rect.top + 'px';
    style.left = rect.left + 'px';
    style.width = rect.width + 'px';
    style.height = rect.height + 'px';
  }, // setPositionByRect

  applyPositionDiff: function (vector) {
    var initial = this.initialRect;
    var style = this.element.style;
    style.top = (initial ? initial.top : 0) + vector.y + 'px';
    style.left = (initial ? initial.left : 0) + vector.x + 'px';
  }, // applyPositionDiff
  applyClassNamesDiff: function (classNames) {
    this.element.className = (this.initialClassNames || '') + ' ' + (classNames || '');
  } // applyClassNamesDiff
}); // Box

/* --- Onload --- */

if (SAMI.UI.onLoadFunctions) {
  new SAMI.List (SAMI.UI.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete SAMI.UI.onLoadFunctions;
}

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2010-2011 Wakaba <w@suika.fam.cx>.  All rights reserved.
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
 * The Original Code is sami-core.js code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2010
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
