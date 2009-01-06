/* Events: uncatchedexception, executed */
KKN.Interpreter = new KKN.Class (function () {
  this.globalObject = new KKN.Interpreter.Object.Object;

}, {
  execute: function (command) {
    this.currentException = null;
    command.run (this);
    if (this.isInterrupted) {
      //if (this.currentException) {
        var e = new KKN.Event ('uncatchedexception');
        e.exception = this.currentException;
        this.dispatchEvent (e);
      //}
    } else {
      var e = new KKN.Event ('executed');
      this.dispatchEvent (e);
    }
  }, // execute

  throw: function (e) {
    this.currentException = e;
  }, // throw
  isInterrupted: function () {
    return this.currentException != null;
  }, // isInterrupted

  getVariable: function (name) {
    var activation = this.globalObject;
    var value = activation.get (name);
    if (value) {
      return value;
    } else {
      return new KKN.Interpreter.Object.Null;
    }
  }, // getVariable
  setVariable: function (name, value) {
    var activation = this.globalObject;
    activation.set (name, value);
  } // setVariable

}); // KKN.Interpreter

if (!KKN.Interpreter.Lang) KKN.Interpreter.Lang = {};

KKN.Interpreter.Lang.Command = new KKN.Class (function () {

}, {
  run: function (m) {
    m.throw (new KNN.Interpreter.Object.ImplError (this, 'Not implemented'));
  }
}); // Command

KKN.Interpreter.Lang.CommandList = new KKN.Subclass (function () {
  return this._super.apply (this, arguments);
}, KKN.List, {
  run: function (m) {
    this.forEach (function (c) {
      c.run (m);
      if (m.isInterrupted ()) {
        return new KNN.List.Return ();
      }
    });
  }
}); // CommandList


if (!KNN.Interpreter.Object) KNN.Interpreter.Object = {};

KNN.Interpreter.Object.Null = new KNN.Class (function () {

}, {
  isNull: true,

  get: function (name) { },
  set: function (name, value) { }
}); // Null

KNN.Interpreter.Object.Object = new KNN.Class (function () {
  this.properties = {};
}, {
  isNull: false,
  
  get: function (name) {
    return this.properties[name];
  }, // get
  set: function (name, value) {
    if (value.isNull) {
      delete this.properties[name];
    } else {
      this.properties[name] = value;
    }
  } // set
}); // Object

KNN.Interpreter.Object.Error = new KNN.Sublass (function () {

}, KNN.Interpreter.Object.Object, {

}); // Error

KNN.Interpreter.Object.ImplError = new KNN.Sublass (function (cmd, msg) {
  this.command = cmd;
  this.message = msg;
}, KNN.Interpreter.Object.Error, {

}); // ImplError

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
 * The Original Code is KKN code.
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
