/* Requires sami-core.js */

SAMI.Browser = SAMI.Browser || {};

/* Events: |urlchanged| */
SAMI.Browser.IFrame = new SAMI.Class (function (placeholder) {
  var self = this;
  
  this.iframe = document.createElement ('iframe');
  this.iframe.className = 'sami-browser-iframe';

  new SAMI.Observer ('load', this.iframe, function (ev) {
    var e = new SAMI.Event ('urlchanged');
    self.dispatchEvent (e);
  });

  placeholder.parentNode.replaceChild (this.iframe, placeholder);
}, {
  openURL: function (url) {
    this.iframe.src = url;
  }, // openURL

  getURL: function () {
    return this.iframe.contentWindow.location.href;
  } // getURL

}); // IFrame

/* Events: |urlchanged| */
SAMI.Browser.XHR = new SAMI.Class (function (placeholder) {
  if (!placeholder) return; // for subclasses

  var self = this;

  this.root = document.createElement ('iframe');
  this.root.className = 'sami-browser-iframe';
  
  placeholder.parentNode.replaceChild (this.root, placeholder);

  this._window = new SAMI.Browser.Window;
  this.contentWindow = this._window;

  new SAMI.Observer (this._window.history, 'sami-historygo', function (ev) {
    if (ev.url) {
      self._openURL (ev.url, {noHistory: true});
    }
  });

  this.setReadyState ('sami-uninitialized');
}, {
  openURL: function (url) {
    url = this.convertURL (url);
    this._openURL (url, {});
  }, // openURL
  
  convertURL: function (url) {
    return new SAMI.URL (url);
  }, // convertURL

  _openURL: function (url, args) {
    var scheme = url.getScheme ();
    var schemeHandler = this.schemeHandlers[scheme] ||
        this.schemeHandlers['http'];
    schemeHandler.apply (this, [url, args]);
  }, // openURL

  schemeHandlers: {
    http: function (url, args) {
      var self = this;

      var onresponse = function () {
        var rurl = this.getRequestURL ();
        self._window.location.samiSetURL (rurl);
        self._window.location.samiResponse = self._createResponse (this);
        if (!args.noHistory) self._window.history.samiAddURL (rurl);

        self._handleContent (this);
      
        var e = new SAMI.Event ('urlchanged');
        self.dispatchEvent (e);

        self.setReadyState ('complete');
      };

      this.setReadyState ('sami-startload');
      this._prepareXHR(new SAMI.XHR (url, onresponse, onresponse)).get ();
    } // http
  }, // schemeHandlers

  _prepareXHR: function (xhr) {
    return xhr;
  }, // _prepareXHR

  _createResponse: function (xhr) {
    var res = new SAMI.Browser.Response ();
    res.statusCode = xhr._xhr.status;
    res.statusText = xhr._xhr.statusText;
    return res;
  }, // _createResponse

  setReadyState: function (newReadyState) {
    this.readyState = newReadyState;
    var ev = new SAMI.Event ('readystatechange');
    this.dispatchEvent (ev);
  }, // setReadyState

  _handleContent: function (xhr) {
    var imt = xhr.getMediaTypeNoParam ();
    var contentHandler = this.contentHandlers[imt] ||
        this.contentHandlers['application/octet-stream'];
    contentHandler.apply (this, [xhr]);
  }, // _handleContent

  contentHandlers: {
    'text/html': function (xhr) {
      this.showHTML ({
        url: xhr.getRequestURL (),
        responseBodyText: xhr.getText ()
      });
    }, // text/html

    'application/octet-stream': function (xhr) {
      this.showText ({
        url: xhr.getRequestURL (),
        responseBodyText: xhr.getText (),
        responseContentType: xhr.getMediaTypeNoParam ()
      });
    } // application/octet-stream
  }, // contentHandlers

  showText: function (args) {
    var self = this;

    var html = '<!DOCTYPE HTML>';
    html += '<title>' + SAMI.String.htescape (args.url + '') + '</title>';
    html += '<style>' + this.uass['text/plain'] + '</style>';
    html += '<p class=content-type><code>' + SAMI.String.htescape (args.responseContentType) + '</code></p>';
    html += '<plaintext>' + args.responseBodyText;

    self.root.src = 'about:blank';
    // XXX maybe we should wait until load event is fired...

    var win = self.root.contentWindow;
    var doc = win.document;
    doc.open ();
    doc.write (html);
    doc.close ();
  }, // showText

  showHTML: function (args) {
    var self = this;
    
    var base = '<base href="' + SAMI.String.htescape (args.url + '') + '">';

    self.root.src = 'about:blank';
    // XXX maybe we should wait until load event is fired...

    var win = self.root.contentWindow;
    var doc = win.document;
    doc.open ();
    doc.write (base);
    doc.write ('<style>' + this.uass['text/html'] + '</style>');
    doc.write (args.responseBodyText);
    doc.close ();

    win.samiBrowser = this;

    new SAMI.Observer (win.document.body, 'click', function (be) {
      var ev = new SAMI.Event.Browser (be || win.event);
      var target = ev.target;
      while (target) {
        if (target.href) {
          self.openURL (target.href);
          ev.preventDefault ();
          return false;
        }
        target = target.parentNode;
      }
    });
  }, // showHTML

  uass: {
    'text/html': ' ',
    'text/plain': ' plaintext { white-space: -moz-pre-wrap; white-space: pre-wrap } '
  }, // uass

  getURL: function () {
    return this._window.location.samiURL;
  } // getURL

}); // XHR

SAMI.Browser.Window = new SAMI.Class (function () {
  this.location = new SAMI.Browser.Location;
  this.history = new SAMI.Browser.History;
}, {
  // location
}); // window

/* Evnets: |sami-historygo| */
SAMI.Browser.History = new SAMI.Class (function () {
  this._prevURLs = new SAMI.List;
  this._currentURL = 'about:blank';
  this._nextURLs = new SAMI.List;
}, {
  back: function () {
    this.go (-1);
  }, // back
  forward: function () {
    this.go (1);
  }, // forward
  go: function (delta) {
    var delta = delta || 0;

    var url;
    if (delta == 0) {
      url = this._currentURL;
    } else if (delta < 0) {
      var bl = this._prevURLs.list;
      url = bl[bl.length + delta];
      if (!url) return;
      var nl = this._nextURLs.list;
      nl.unshift (this._currentURL);
      this._nextURLs.prepend (new SAMI.List (bl.splice (bl.length + delta + 1)));
      bl.pop ();
      this._currentURL = url;
    } else {
      // XXX not implemented
      return;
    }

    var e = new SAMI.Event ('sami-historygo');
    e.url = url;
    this.dispatchEvent (e);
  }, // go

  samiAddURL: function (url) {
    this._prevURLs.push (this._currentURL);
    this._currentURL = url;
    this._nextURLs.clear ();
  } // samiAddURL
}); // History

SAMI.Browser.Location = new SAMI.Class (function () {

}, {
  // href, samiResponse, samiURL

  samiSetURL: function (newURL) {
    this.samiURL = newURL;
    this.href = newURL + '';
  } // samiSetURL
}); // Location

SAMI.Browser.Response = new SAMI.Class (function () {

}, {
  // statusCode, statusText
}); // Response

/* --- Onload --- */

if (SAMI.Browser.onLoadFunctions) {
  new SAMI.List (SAMI.Browser.onLoadFunctions).forEach (function (code) {
    code ();
  });
  delete SAMI.Browser.onLoadFunctions;
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
 * The Original Code is sami-browser.js code.
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
