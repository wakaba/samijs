  var FDH = function () { };

  FDH.compat = {
    check: function () {
      return (self.localStorage && self.JSON);
    }, // check

    observe: function (obj, eventType, code) {
      if (obj.addEventListener) {
        obj.addEventListener (eventType, code, false);
      } else if (obj.attachEvent) {
        obj.attachEvent ('on' + eventType, code);
      }
    } // observe
  }; // compat

  FDH.Form = function () {
    if (arguments.length) {
      this.init.apply (this, arguments);
    }
  }; // Form

  FDH.Form.prototype = {
    init: function (form, formName) {
      this.form = form;
      this.formName = formName;
      this.createHistoryList ();
    }, // init

    WATCH_DELAY: 3000,
    watch: function () {
      if (!FDH.compat.check ()) return;
      var self = this;
      var saveLater = function () {
        clearTimeout (self.saveFormDataTimer);
        self.saveFormDataTimer = setTimeout (function () {
          self.saveDataSet ();
        }, self.WATCH_DELAY);
      }; // saveLater

      self.saveDataSet ();
      FDH.compat.observe (self.form, 'input', saveLater);
      FDH.compat.observe (self.form, 'keypress', saveLater);
      FDH.compat.observe (self.form, 'change', saveLater);
      FDH.compat.observe (self.form, 'submit', function () { self.saveDataSet () });
    }, // watch

    getDataSet: function () {
      var controls = this.form.elements;
      var controlsL = controls.length;
      var formData = [];
      for (var j = 0; j < controlsL; j++) {
        var control = controls[j];
        if (control.readOnly || control.disabled) continue;
        if (!control.name) continue;
        if (!control.value) continue;
        if (control.type == 'text' || control.type == 'textarea') {
          var c = {name: control.name, value: control.value};
          formData.push (c);
        }
      }
      return formData;
    }, // getDataSet

    getDataSetDiffType: function (oldData, newData) {
      if (oldData.length != newData.length) {
        return {diff: true};
      }

      var result = {added: 0, deleted: 0};
      for (var i = 0; i < oldData.length; i++) {
        var oldC = oldData[i];
        var newC = newData[i];
        if (oldC.name != newC.name) {
          return {diff: true};
        }

        if (oldC.value == newC.value) {
          //
        } else if (newC.value.indexOf (oldC.value) > -1) {
          result.added++;
        } else if (oldC.value.indexOf (newC.value) > -1) {
          result.deleted++;
        } else {
          return {diff: true};
        }
      }

      if (result.added || result.deleted) return result;
      return {same: true};
    }, // getDataSetDiffType

    MAX_HISTORY_COUNT: 5,
    saveDataSet: function () {
      var formData = this.getDataSet ();
      if (formData.length) {
        var oldDataList = JSON.parse (localStorage["fdhHistory-" + this.formName]|| '[]');
        if (oldDataList && oldDataList[oldDataList.length - 1]) {
          var result = this.getDataSetDiffType (oldDataList[oldDataList.length - 1], formData);
          if (result.same) return;
          if (result.deleted && !result.added) return;
          if (result.added) {
            oldDataList[oldDataList.length - 1] = formData;
          } else {
            oldDataList.push (formData);
          }
          while (oldDataList.length > this.MAX_HISTORY_COUNT) {
            oldDataList.shift ();
          }
        } else {
          oldDataList = [formData];
        }
        localStorage["fdhHistory-" + this.formName] = JSON.stringify (oldDataList);
        this.createHistoryList ();
      }
    }, // saveDataSet

    applyDataSet: function (dataSet) {
      var controls = this.form.elements;
      var controlsL = controls.length;
      for (var i = 0; i < controlsL; i++) {
        var name = controls[i].name;
        for (var j = 0; j < dataSet.length; j++) {
          if (dataSet[j].name == name) {
            controls[i].value = dataSet[j].value;
            break;
          }
        }
      }
    }, // applyDataSet

    HISTORY_LIST_CLASS_NAME: 'fdh-history-list',
    HISTORY_LIST_ITEM_CONTROL_CLASS_NAME: 'fdh-history-list-item-control',
    HISTORY_LIST_ITEM_CONTROL_MAX_LENGTH: 70,
    TEXT_BACKUP: 'バックアップ',
    createHistoryList: function () {
      var self = this;
      var formDataList = JSON.parse (localStorage["fdhHistory-" + this.formName]|| '[]');
      if (!this.historyList && !formDataList.length) return;
      var container = this.historyList || document.createElement ('div');
      container.tabIndex = 0;
      container.innerHTML = '<span class=fdh-history-button>A <span>▼</span></span><menu></menu>';
      container.firstChild.firstChild.data = this.TEXT_BACKUP + ' ';
      var menu = container.lastChild;
      for (var i = formDataList.length - 1; i >= 0; i--) (function (formData) {
        var li = document.createElement ('li');
        li.tabIndex = 0;
        self.createHistoryListItem (formData, li);
        menu.appendChild (li);
        FDH.compat.observe (li, 'click', function () {
          self.saveDataSet ();
          self.applyDataSet (formData);
        });
      }) (formDataList[i]);
      if (!this.historyList) {
        container.className = this.HISTORY_LIST_CLASS_NAME;
        this.historyList = container;
        this.form.appendChild (container);
      }
    }, // createHistoryList
    createHistoryListItem: function (formData, parent) {
      var max = this.HISTORY_LIST_ITEM_CONTROL_MAX_LENGTH;
      for (var j = 0; j < formData.length; j++) {
        var control = formData[j];
        var el = document.createElement ('span');
        el.className = this.HISTORY_LIST_ITEM_CONTROL_CLASS_NAME;
        el.innerHTML = 'a';
        el.firstChild.data = control.value.substring (0, max);
        if (control.value.length > max) el.firstChild.data += '...';
        el.title = control.name + '=' + control.value;
        parent.appendChild (el);
        parent.appendChild (document.createTextNode (' '));
      }
    }, // createHistoryListItem
  }; // Form

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
