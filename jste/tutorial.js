if (typeof (JSTE) === "undefined") var JSTE = {};

JSTE.WATNS = 'http://suika.fam.cx/ns/wat';
JSTE.SpaceChars = /[\x09\x0A\x0C\x0D\x20]+/;

JSTE.Class = function (constructor, prototype) {
  return JSTE.Subclass (constructor, JSTE.EventTarget, prototype);
}; // Class

JSTE.Class.addClassMethods = function (classObject, methods) {
  new JSTE.Hash (methods).forEach (function (n, v) {
    if (!classObject[n]) {
      classObject[n] = v;
    }
  });
}; // addClassMethods

JSTE.Subclass = function (constructor, superclass, prototype) {
  constructor.prototype = new superclass;
  for (var n in prototype) {
    constructor.prototype[n] = prototype[n];
  }
  constructor.prototype.constructor = constructor;
  constructor.prototype._super = superclass;
  return constructor;
}; // Subclass

JSTE.EventTarget = new JSTE.Subclass (function () {
  
}, function () {}, {
  addEventListener: function (eventType, handler, useCapture) {
    if (useCapture) return;
    if (!this.eventListeners) this.eventListeners = {};
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = new JSTE.List;
    }
    this.eventListeners[eventType].push (handler);
  }, // addEventListener
  removeEventListener: function (eventType, handler, useCapture) {
    if (useCapture) return;
    if (!this.eventListeners) return;
    if (!this.eventListeners[eventType]) return;
    this.eventListeners[eventType].remove (handler);
  }, // removeEventListener
  dispatchEvent: function (e) {
    if (!this.eventListeners) return;
    var handlers = this.eventListeners[e.type];
    if (!handlers) return;
    e.currentTarget = this;
    e.target = this;
    var preventDefault;
    handlers.forEach (function (handler) {
      if (handler.apply (this, [e])) {
        preventDefault = true;
      }
    });
    return preventDefault || e.isDefaultPrevented ();
  } // dispatchEvent
}); // EventTarget

JSTE.Event = new JSTE.Class (function (eventType, canBubble, cancelable) {
  this.type = eventType;
  this.bubbles = canBubble;
  this.cancelable = cancelable;
}, {
  preventDefault: function () {
    this.defaultPrevented = true;
  }, // preventDefault
  isDefaultPrevented: function () {
    return this.defaultPrevented;
  } // isDefaultPrevented
});

JSTE.Observer = new JSTE.Class (function (eventType, target, onevent) {
  this.eventType = eventType;
  this.target = target;
  if (target.addEventListener) {
    this.code = onevent;
  } else if (target.attachEvent) {
    this.code = function () {
      onevent (event);
    };
  } else {
    this.code = onevent;
  }
  this.disabled = true;
  this.start ();
}, {
  start: function () {
    if (!this.disabled) return;
    if (this.target.addEventListener) {
      this.target.addEventListener (this.eventType, this.code, false);
      this.disabled = false;
    } else if (this.target.attachEvent) {
      this.target.attachEvent ("on" + this.eventType, this.code);
      this.disabled = false;
    }
  }, // start
  stop: function () {
    if (this.disabled) return;
    if (this.target.removeEventListener) {
      this.target.removeEventListener (this.eventType, this.code, false);
      this.disabled = true;
    } else if (this.target.detachEvent) {
      this.target.detachEvent ("on" + this.eventType, this.code);
      this.disabled = true;
    }
  } // stop
}); // Observer

new JSTE.Observer ('load', window, function () {
  JSTE.windowLoaded = true;
});



JSTE.Hash = new JSTE.Class (function (hash) {
  this.hash = hash || {};
}, {
  forEach: function (code) {
    for (var n in this.hash) {
      var r = code (n, this.hash[n]);
      if (r && r.stop) break;
    }
  }, // forEach
  clone: function (code) {
    var newHash = {};
    this.forEach (function (n, v) {
      newHash[n] = v;
    });
    return new this.constructor (newHash);
  }, // clone
  
  getNamedItem: function (n) {
    return this.hash[n];
  }, // getNamedItem
  setNamedItem: function (n, v) {
    return this.hash[n] = v;
  }, // setNamedItem

  getNames: function () {
    var r = new JSTE.List;
    for (var n in this.hash) {
      r.push (n);
    }
    return r;
  }, // getNames

  getByNames: function (names) {
    var self = this;
    return names.forEach (function (name) {
      var value = self.getNamedItem (name);
      if (value != null) {
        return new JSTE.List.Return (value);
      } else {
        return null;
      }
    });
  } // getByNames
}); // Hash


JSTE.List = new JSTE.Class (function (arrayLike) {
  this.list = arrayLike || [];
}, {
  getLast: function () {
    if (this.list.length) {
      return this.list[this.list.length - 1];
    } else {
      return null;
    }
  }, // getLast

  forEach: function (code) {
    var length = this.list.length;
    for (var i = 0; i < length; i++) {
      var r = code (this.list[i]);
      if (r && r.stop) return r.returnValue;
    }
    return null;
  }, // forEach
  map: function (code) {
    var newList = new this.constructor;
    var length = this.list.length;
    for (var i = 0; i < length; i++) {
      newList.push (code (this.list[i]));
    }
    return newList;
  }, // map
  mapToHash: function (code) {
    var newHash = new JSTE.Hash;
    var length = this.list.length;
    for (var i = 0; i < length; i++) {
      var nv = code (this.list[i]);
      newHash.setNamedItem (nv[0], nv[1]);
    }
    return newHash;
  }, // mapToHash

  numberToInteger: function () {
    var newList = [];
    this.forEach (function (item) {
      if (typeof item === "number") {
        newList.push (Math.floor (item));
      } else {
        newList.push (item);
      }
    });
    return new this.constructor (newList);
  }, // numberToInteger
    
  clone: function () {
    var newList = [];
    this.forEach (function (item) {
      newList.push (item);
    });
    return new this.constructor (newList);
  }, // clone
  
  grep: function (code) {
    var newList = [];
    this.forEach (function (item) {
      if (code (item)) {
        newList.push (item);
      }
    });
    return new this.constructor (newList);
  }, // grep
  onlyNonNull: function () {
    return this.grep (function (item) {
      return item != null; /* Intentionally "!=" */
    });
  }, // onlyNonNull

  uniq: function (eq) {
    if (!eq) eq = function (i1, i2) { return i1 === i2 };
    var prevItems = [];
    return this.grep (function (item) {
      for (var i = 0; i < prevItems.length; i++) {
        if (eq (item, prevItems[i])) {
          return false;
        }
      }
      prevItems.push (item);
      return true;
    });
  }, // uniq
  
  getFirstMatch: function (code) {
    return this.forEach (function (item) {
      if (code (item)) {
        return new JSTE.List.Return (item);
      }
    });
  }, // getFirstMatch
  
  switchByElementType: function () {
    var cases = new JSTE.List (arguments);
    this.forEach (function (n) {
      cases.forEach (function (c) {
        if (c.namespaceURI == n.namespaceURI) {
          return new JSTE.List.Return (c.execute (n));
        }
      });
    });
  }, // switchByElementType
  
  // destructive
  push: function (item) {
    this.list.push (item);
  }, // push

  // destructive
  pushCloneOfLast: function () {
    this.list.push (this.getLast ().clone ());
  }, // pushCloneOfLast

  // destructive
  append: function (list) {
    var self = this;
    list.forEach (function (n) {
      self.list.push (n);
    });
    return this;
  }, // append
  
  // destructive
  pop: function () {
    return this.list.pop ();
  }, // pop

  // destructive
  remove: function (removedItem) {
    var length = this.list.length;
    for (var i = length - 1; i >= 0; --i) {
      var item = this.list[i];
      if (item == removedItem) { // Intentionally "=="
        this.list.splice (i, 1);
      }
    }
  }, // remove

  // destructive
  clear: function () {
    this.list.splice (0, this.list.length);
  } // clear
  
}); // List

JSTE.Class.addClassMethods (JSTE.List, {
  spaceSeparated: function (v) {
    return new JSTE.List ((v || '').split (JSTE.SpaceChars)).grep (function (v) {
      return v.length;
    });
  }, // spaceSeparated

  getCommonItems: function (l1, l2, cb, eq) {
    if (!eq) eq = function (i1, i2) { return i1 === i2 };

    var common = new JSTE.List;

    l1 = l1.grep (function (i1) {
      var hasI1;
      l2 = l2.grep (function (i2) {
        if (eq (i1, i2)) {
          common.push (i1);
          hasI1 = true;
          return false;
        } else {
          return true;
        }
      });
      return !hasI1;
    });

    cb (common, l1, l2);
  } // getCommonItems
}); // List class methods

JSTE.List.Return = new JSTE.Class (function (rv) {
  this.stop = true;
  this.returnValue = rv;
}, {
  
}); // Return

JSTE.List.SwitchByLocalName = new JSTE.Class (function (ns, cases, ow) {
  this.namespaceURI = ns;
  this.cases = cases;
  this.otherwise = ow || function (n) { };
}, {
  execute: function (n) {
    for (var ln in this.cases) {
      if (JSTE.Element.matchLocalName (n, ln)) {
        return this.cases[ln] (n);
      }
    }
    return this.otherwise (n);
  }
});

JSTE.Set = {};

JSTE.Set.Unordered = new JSTE.Class (function () {
  // this.caseInsensitive
}, {
  addFromList: function (list) {
    var self = this;
    list.forEach (function (name) {
      if (self.caseInsensitive) name = name.toLowerCase ();
      self['value-' + name] = true;
    });
  }, // addFromList

  has: function (name) {
    if (this.caseInsensitive) name = name.toLowerCase ();
    return this['value-' + name] !== undefined;
  } // has
}); // Unordered


if (!JSTE.Node) JSTE.Node = {};

JSTE.Class.addClassMethods (JSTE.Node, {
  querySelector: function (node, selectors) {
    if (node.querySelector) {
      var el;
      try {
        el = node.querySelector (selectors);
      } catch (e) {
        el = null;
      }
      return el;
    } else if (window.uu && uu.css) {
      if (selectors != "") {
        /* NOTE: uu.css return all elements for "" or ",xxx" */
        return uu.css (selectors, node)[0];
      } else {
        return null;
      }
    } else if (window.Ten && Ten.DOM && Ten.DOM.getElementsBySelector) {
      return Ten.DOM.getElementsBySelector (selectors)[0];
    } else {
      return null;
    }
  }, // querySelector
  querySelectorAll: function (node, selectors) {
    if (node.querySelectorAll) {
      var nl;
      try {
        nl = node.querySelectorAll (selectors);
      } catch (e) {
        nl = null;
      }
      return new JSTE.List (nl);
    } else if (window.uu && uu.css) {
      if (selectors != "") {
        /* NOTE: uu.css return all elements for "" or ",xxx". */
        return new JSTE.List (uu.css (selectors, node));
      } else {
        return new JSTE.List;
      }
    } else if (window.Ten && Ten.DOM && Ten.DOM.getElementsBySelector) {
      return new JSTE.List (Ten.DOM.getElementsBySelector (selectors));
    } else {
      return new JSTE.List;
    }
  } // querySelectorAll
});

JSTE.Document = {};

JSTE.Class.addClassMethods (JSTE.Document, {
  getTheHTMLElement: function (doc) {
    var el = doc.documentElement;
// BUG: XML support
    if (el.nodeName.toUpperCase () == 'HTML') {
      return el;
    } else {
      return null;
    }
  }, // getTheHTMLElement
  getTheHeadElement: function (doc) {
// BUG: XML support
    var el = JSTE.Document.getTheHTMLElement (doc);
    if (!el) return null;
    var elc = el.childNodes;
    for (i = 0; i < elc.length; i++) {
      var cel = elc[i];
      if (cel.nodeName.toUpperCase () == 'HEAD') {
        return cel;
      }
    }
    return null;
  }, // getTheHeadElement

  getClassNames: function (doc) {
// BUG: XML support
    var r = new JSTE.Set.Unordered ();
    r.caseInsensitive = doc.compatMode != 'CSS1Compat';
    
    var docEl = doc.documentElement;
    if (docEl) {
      r.addFromList (JSTE.List.spaceSeparated (docEl.className));
    }

    var bodyEl = doc.body;
    if (bodyEl) {
      r.addFromList (JSTE.List.spaceSeparated (bodyEl.className));
    }
    
    return r;
  } // getClassNames
}); // JSTE.Document class methods

if (!JSTE.Element) JSTE.Element = {};

JSTE.Class.addClassMethods (JSTE.Element, {
  getLocalName: function (el) {
    var localName = el.localName;
    if (!localName) {
      localName = el.nodeName;
      if (el.prefix) {
        localName = localName.substring (el.prefix.length + 1);
      }
    }
    return localName;
  }, // getLocalName
  
  match: function (el, ns, ln) {
    if (el.nodeType !== 1) return false;
    if (el.namespaceURI !== ns) return false;
    return JSTE.Element.matchLocalName (el, ln);
  }, // match
  matchLocalName: function (el, ln) {
    var localName = JSTE.Element.getLocalName (el);
    if (ln instanceof RegExp) {
      if (!localName.match (ln)) return false;
    } else {
      if (localName !== ln) return false;
    }
    return true;
  }, // matchLocalName
  
  getChildElement: function (el, ns, ln) {
    return new JSTE.List (el.childNodes).getFirstMatch (function (item) {
      return JSTE.Element.match (item, ns, ln);
    });
  }, // getChildElement
  getChildElements: function (el, ns, ln) {
    return new JSTE.List (el.childNodes).grep (function (item) {
      return JSTE.Element.match (item, ns, ln);
    });
  }, // getChildElements
  getChildrenClassifiedByType: function (el) {
    var r = new JSTE.ElementHash;
    new JSTE.List (el.childNodes).forEach (function (n) {
      if (n.nodeType == 1) {
        r.getOrCreate (n.namespaceURI, JSTE.Element.getLocalName (n)).push (n);
      } else {
        r.getOrCreate (null, n.nodeType).push (n);
      }
    });
    return r;
  }, // getChildrenClassifiedByType

  isEmpty: function (el) {
    // HTML5 definition of "empty"
    return !new JSTE.List (el.childNodes).forEach (function (n) {
      var nt = n.nodeType;
      if (nt == 1) {
        return new JSTE.List.Return (true /* not empty */);
      } else if (nt == 3 || nt == 4) {
        if (/[^\u0009\u000A\u000C\u000D\u0020]/.test (n.data)) {
          return new JSTE.List.Return (true /* not empty */);
        }
      } else if (nt == 7 || nt == 8) { // comment/pi
        // does not affect emptyness
      } else {
        // We don't support EntityReference.
        return new JSTE.List.Return (true /* not empty */);
      }
    });
  }, // isEmpty
  
  appendText: function (el, s) {
    return el.appendChild (el.ownerDocument.createTextNode (s));
  }, // appendText
  
  appendToHead: function (el) {
    var doc = el.ownerDocument;
    var head = JSTE.Document.getTheHeadElement (doc) || doc.body || doc.documentElement || doc;
    head.appendChild (el);
  }, // appendToHead

  createTemplate: function (doc, node) {
    var df = doc.createDocumentFragment ();
    new JSTE.List (node.childNodes).forEach (function (n) {
      if (n.nodeType == 1) {
        var c = doc.createElement (JSTE.Element.getLocalName (n));
        new JSTE.List (n.attributes).forEach (function (n) {
          c.setAttribute (n.name, n.value);
        });
        c.appendChild (JSTE.Element.createTemplate (doc, n));
        df.appendChild (c);
      } else if (n.nodeType == 3 || n.nodeType == 4) {
        df.appendChild (doc.createTextNode (n.data));
      }
    });
    return df;
  }, // createTemplate
  
  hasAttribute: function (el, localName) {
    if (el.hasAttribute) {
      return el.hasAttribute (localName);
    } else {
      return el.getAttribute (localName) != null;
    }
  }, // hasAttribute
  
  getClassNames: function (el) {
    return new JSTE.List (el.className.split (JSTE.SpaceChars));
  }, // getClassNames
  addClassName: function (el, newClassName) {
    el.className = el.className + ' ' + newClassName;
  }, // deleteClassName
  deleteClassName: function (el, oldClassName) {
    var classNames = el.className.split (JSTE.SpaceChars);
    var newClasses = [];
    for (var n in classNames) {
      if (classNames[n] != oldClassName) {
        newClasses.push (classNames[n]);
      }
    }
    el.className = newClasses.join (' ');
  }, // deleteClassName
  replaceClassName: function (el, oldClassName, newClassName) {
    var classNames = el.className.split (JSTE.SpaceChars);
    var newClasses = [newClassName];
    for (var n in classNames) {
      if (classNames[n] != oldClassName) {
        newClasses.push (classNames[n]);
      }
    }
    el.className = newClasses.join (' ');
  }, // replaceClassName
  
  getIds: function (el) {
    return new JSTE.List (el.id != "" ? [el.id] : []);
  }, // getIds

  /* 
    NR.js <https://suika.suikawiki.org/www/css/noderect/NodeRect.js> must be loaded
    before the invocation.
  */  
  scroll: function (elements) {
    if (!JSTE.windowLoaded) {
      new JSTE.Observer ('load', window, function () {
        JSTE.Element.scroll (elements);
      });
      return;
    }

    var top = Infinity;
    var left = Infinity;
    var topEl;
    var leftEl;
    elements.forEach (function (el) {
      var rect = NR.Element.getRects (el, window).borderBox;
      if (rect.top < top) {
        top = rect.top;
        topEl = el;
      }
      if (rect.left < left) {
        left = rect.left;
        leftEl = el;
      }
    });

    if (!leftEl && !topEl) {
      return;
    }

    var doc = (leftEl || topEl).ownerDocument;
  
    var rect = NR.View.getViewportRects (window, doc).contentBox;
    if (rect.top <= top && top <= rect.bottom) {
      top = rect.top;
    }
    if (rect.left <= left && left <= rect.right) {
      left = rect.left;
    }

    /*
      Set scroll* of both <html> and <body> elements, to support all of 
      four browsers and two (or three) rendering modes.  This might result
      in confusing the user if both <html> and <body> elements have their
      'overflow' properties specified to 'scroll'.

      Note that this code does not do a good job if the |el| is within an
      |overflow: scroll| element.
    */
    doc.body.scrollTop = top;
    doc.body.scrollLeft = left;
    doc.documentElement.scrollTop = top;
    doc.documentElement.scrollLeft = left;
  } // scroll
}); // Element

JSTE.ElementHash = new JSTE.Class (function () {
  this.items = [];
}, {
  get: function (ns, ln) {
    ns = ns || '';
    if (this.items[ns]) {
      return this.items[ns].getNamedItem (ln) || new JSTE.List;
    } else {
      return new JSTE.List;
    }
  }, // get
  getOrCreate: function (ns, ln) {
    ns = ns || '';
    if (this.items[ns]) {
      var l = this.items[ns].getNamedItem (ln);
      if (!l) this.items[ns].setNamedItem (ln, l = new JSTE.List);
      return l;
    } else {
      var l;
      this.items[ns] = new JSTE.Hash;
      this.items[ns].setNamedItem (ln, l = new JSTE.List);
      return l;
    }
  } // getOrCreate
}); // ElementHash



JSTE.Script = {};

JSTE.Class.addClassMethods (JSTE.Script, {
  loadScripts: function (urls, onload) {
    var number = urls.list.length;
    var counter = 0;
    var check = function () {
      if (counter == number) {
        onload ();
      }
    };
    urls.forEach (function (url) {
      if (/\.css(?:\?|$)/.test (url)) {
        JSTE.Style.loadStyle (url, function () {
          counter++;
          check ();
        });
        return;
      }

      var script = document.createElement ('script');
      script.src = url;
      script.onload = function () {
        counter++;
        check ();
        script.onload = null;
        script.onreadystatechange = null;
      };
      script.onreadystatechange = function () {
        if (script.readyState != 'complete' && script.readyState != 'loaded') {
          return;
        }
        counter++;
        check ();
        script.onload = null;
        script.onreadystatechange = null;
      };
      document.body.appendChild (script);
    });
  } // loadScripts
}); // Script class methods

JSTE.Style = {};

JSTE.Class.addClassMethods (JSTE.Style, {
  loadStyle: function (url, onload) {
    var link = document.createElement ('link');
    link.rel = 'stylesheet';
    link.href = url;
    if (onload) {
      link.onload = function () {
        onload ();
        link.onload = null;
        link.onreadystatechange = null;
      };
      link.onreadystatechange= function () {
        if (link.readyState != 'complete' && link.readyState != 'loaded') {
          return;
        }
        onload ();
        link.onload = null;
        link.onreadystatechange = null;
      };
    }
    JSTE.Element.appendToHead (link);
  } // loadStyle
}); // Style class methods



JSTE.Prefetch = {};

JSTE.Class.addClassMethods (JSTE.Prefetch, {
  URL: function (url) {
    var link = document.createElement ('link');
    link.rel = 'prefetch';
    link.href = url;
    JSTE.Element.appendToHead (link);
  } // url
}); // JSTE.Prefetch class methods


JSTE.URL = {};

JSTE.Class.addClassMethods (JSTE.URL, {
  eq: function (u1, u2) {
    // TODO: maybe we should once decode URLs and then reencode them
    u1 = (u1 || '').replace (/([^\x21-\x7E]+)/, function (s) { return encodeURI (s) });
    u2 = (u2 || '').replace (/([^\x21-\x7E]+)/, function (s) { return encodeURI (s) });
    return u1 == u2;
  } // eq
}); // URL class methods


JSTE.XHR = new JSTE.Class (function (url, onsuccess, onerror) {
  try {
    this._xhr = new XMLHttpRequest ();
  } catch (e) {
    try {
      this._xhr = new ActiveXObject ('Msxml2.XMLHTTP');
    } catch (e) {
      try {
        this._xhr = new ActiveXObject ('Microsoft.XMLHTTP');
      } catch (e) {
        try {
          this._xhr = new ActiveXObject ('Msxml2.XMLHTTP.4.0');
        } catch (e) {
          this._xhr = null;
        }
      }
    }
  }

  this._url = url;
  this._onsuccess = onsuccess || function () { };
  this._onerror = onerror || function () { };
}, {
  get: function () {
    if (!this._xhr) return;

    var self = this;
    this._xhr.open ('GET', this._url, true);
    this._xhr.onreadystatechange = function () {
      self._onreadystatechange ();
    }; // onreadystatechange
    this._xhr.send (null);
  }, // get

  _onreadystatechange: function () {
    if (this._xhr.readyState == 4) {
      if (this.succeeded ()) {
        this._onsuccess ();
      } else {
        this._onerror ();
      }
    }
  }, // _onreadystatechange

  succeeded: function () {
    return (this._xhr.status < 400);
  }, // succeeded

  getDocument: function () {
    return this._xhr.responseXML;
  } // getDocument
}); // XHR

// An abstract class
JSTE.Storage = new JSTE.Class (function () {
  
}, {
  get: function (name) {
    throw "not implemented";
  }, // get
  getJSON: function (name) {
    var value = this.get (name);
    if (value != null) {
      return JSTE.JSON.parse (value); // XXX: try-catch?
    } else {
      return value;
    }
  }, // getJSON

  set: function (name, value) {
    throw "not implemented";
  }, // set
  setJSON: function (name, obj) {
    this.set (name, JSTE.JSON.stringify (obj));
  }, // setJSON

  has: function (name) {
    return this.get (name) !== undefined;
  }, // has

  del: function (name) {
    throw "del not implemented";
  }, // del

  flushGet: function (name) {
    var v = this.get ('flush-' + name);
    if (v !== undefined) {
      this.del ('flush-' + name);
    }
    return v;
  }, // flushGet
  flushSet: function (name, value) {
    this.set ('flush-' + name, value);
  }, // flushSet
  
  getNames: function () {
    throw "not implemented";
  }, // getNames

  setPrefix: function (newPrefix) {
    throw "not implemented";
  } // setPrefix
}); // Storage

JSTE.Storage.PageLocal = new JSTE.Subclass (function () {
  this.keyPrefix = '';
}, JSTE.Storage, {
  get: function (name) {
    return this['value-' + this.keyPrefix + name];
  }, // get
  set: function (name, value) {
    this['value-' + this.keyPrefix + name] = value;
  }, // set

  getNames: function () {
    var names = new JSTE.List;
    for (var n in this) {
      if (n.substring (0, 6 + this.keyPrefix.length) == 'value-' + this.keyPrefix) {
        names.push (n.substring (6 + this.keyPrefix.length));
      }
    }
    return names;
  }, // getNames
  
  setPrefix: function (newPrefix) {
    this.keyPrefix = newPrefix;
  } // setPrefix
}); // PageLocal

JSTE.Storage.Cookie = JSTE.Subclass (function () {
  this.keyPrefix = '';
  this.domain = null;
  this.path = '/';
  this.persistent = false;
  this.expires = null; // or Date
}, JSTE.Storage, {
  _parse: function () {
    return new JSTE.List (document.cookie.split (/;/)).mapToHash (function (nv) {
      nv = nv.replace (/^\s+/, '').replace (/\s+$/, '').split (/=/, 2);
      nv[0] = decodeURIComponent (nv[0]);
      nv[1] = decodeURIComponent (nv[1]);
      return nv;
    });
  }, // _parse

  get: function (name) {
    return this._parse ().getNamedItem (this.keyPrefix + name);
  }, // get
  set: function (name, value) {
    name = this.keyPrefix + name;
    var r = encodeURIComponent (name) + '=' + encodeURIComponent (value);
    if (this.domain) {
      r += '; domain=' + this.domain;
    }
    if (this.path) {
      r += '; path=' + this.path;
    }
    if (this.persistent) {
      r += '; expires=' + new Date (2030, 1-1, 1).toUTCString ();
    } else if (this.expires) {
      r += '; expires=' + this.expires.toUTCString ();
    }
    document.cookie = r;
  }, // set
  del: function (name) {
    var expires = this.expires;
    var persistent = this.persistent;
    this.expires = new Date (0);
    this.persistent = false;
    this.set (name, '');
    this.expires = expires;
    this.persistent = persistent;
  }, // del

  getNames: function () {
    var self = this;
    return this._parse ().getNames ().grep (function (name) {
      return name.substring (0, self.keyPrefix.length) == self.keyPrefix;
    }).map (function (name) {
      return name.substring (self.keyPrefix.length);
    });
  }, // getNames

  setPrefix: function (newPrefix) {
    this.keyPrefix = newPrefix;
  } // setPrefix
}); // Cookie

JSTE.Storage.Local = JSTE.Class (function () {
  var self = new JSTE.Storage.Cookie;
  self.keyPrefix = 'localStorage-';
  self.persistent = true;
  self.setPrefix = function (newPrefix) {
    this.keyPrefix = 'localStorage-' + newPrefix;
  }; // setPrefix
  return self;
}); // Local

JSTE.JSON = {};

JSTE.Class.addClassMethods (JSTE.JSON, {
  parse: function (value) {
    if (self.JSON && JSON.parse) {
      return JSON.parse (value); // json2.js or ES3.1
    } else {
      return eval ('(' + value + ')');
    }
  }, // parse

  stringify: function (obj) {
    if (self.JSON && JSON.stringify) {
      return JSON.stringify (obj); // json2.js or ES3.1
    } else {
      throw "JSTE.JSON.stringify not implemented";
    }
  } // serialize
}); // JSON class methods



/* Events: load, close, shown, hidden */
JSTE.Message = new JSTE.Class (function (doc, template, commandTarget, availCommands) {
  if (!doc) return;
  this._targetDocument = doc;
  this._template = template || doc.createDocumentFragment ();

  this._commandTarget = commandTarget;
  this._availCommands = availCommands || new JSTE.List;

  this.hidden = true;
  this.select = "";
  
  var e = new JSTE.Event ('load');
  this.dispatchEvent (e);
}, {
  render: function () {
    var self = this;
    var doc = this._targetDocument;
    
    var msgContainer = doc.createElement ('section');
    msgContainer.appendChild (this._template);

    if (!this._availCommands.list.length) {   
      this._availCommands.push ({name: 'back'});
      this._availCommands.push ({name: 'next'});
    }
 
    this._availCommands = this._availCommands.grep (function (item) {
      return self._commandTarget.canExecuteCommand (item.name, item.args);
    });
    
    this._outermostElement = this._render (msgContainer);
    
    this.show ();
  }, // render
  _render: function (msgContainer, buttonContainer) {
    var doc = this._targetDocument;
    
    var container = doc.createElement ('article');
    
    container.appendChild (msgContainer);

    var buttonContainer = this.createCommandButtons ();
    container.appendChild (buttonContainer);

    doc.documentElement.appendChild (container);
    
    return container;
  }, // _render
  createCommandButtons: function () {
    var self = this;
    var doc = this._targetDocument;
    var buttonContainer = doc.createElement ('menu');
    this._availCommands.forEach (function (cmd) {
      var label = cmd.name;
      if (cmd.labelTemplate) {
        label = JSTE.Element.createTemplate (doc, cmd.labelTemplate);
      }

      var button = new JSTE.Message.Button
          (label, self._commandTarget, cmd.name, cmd.args, cmd.actions);
      buttonContainer.appendChild (button.element);

      if (cmd.name == 'url') {
        JSTE.Prefetch.URL (cmd.args.url);
      }
    });
    return buttonContainer;
  }, // createCommandButtons

  remove: function () {
    this.hide ();
    
    this._remove ();
    
    if (this._outermostElement && this._outermostElement.parentNode) {
      this._outermostElement.parentNode.removeChild (this._outermostElement);
    }
    
    var e = new JSTE.Event ("close");
    this.dispatchEvent (e);
  }, // remove
  _remove: function () {
    
  }, // remove
  
  show: function () {
    if (!this.hidden) return;
    this.hidden = false;
    if (this._outermostElement) {
      JSTE.Element.replaceClassName
          (this._outermostElement, "jste-hidden", "jste-shown");
    }
    
    var e = new JSTE.Event ("shown");
    this.dispatchEvent (e);
  }, // show
  hide: function () {
    if (this.hidden) return;
    this.hidden = true;
    if (this._outermostElement) {
      JSTE.Element.replaceClassName
          (this._outermostElement, "jste-shown", "jste-hidden");
    }
    
    var e = new JSTE.Event ("hidden");
    this.dispatchEvent (e);
  }, // hide
  
  setTimeout: function () {
    /* TODO: ... */
    
  }
  
}); // Message

/* TODO: button label text should refer message catalog */

JSTE.Message.Button =
new JSTE.Class (function (label, commandTarget, commandName, commandArgs, commandActions) {
  this._label = label != null ? label : "";

  if (commandTarget && commandTarget instanceof Function) {
    this._command = commandTarget;
    this._classNames = new JSTE.List;
  } else if (commandTarget) {
    this._command = function () {
      return commandTarget.executeCommand.apply
          (commandTarget, [commandName, commandArgs, commandActions]);
    };
    this._classNames = new JSTE.List (['jste-command-' + commandName]);
  } else {
    this._command = function () { };
    this._classNames = new JSTE.List;
  }
  
  this._createElement ();
}, {
  _createElement: function () {
    try {
      this.element = document.createElement ('button');
      this.element.setAttribute ('type', 'button');
    } catch (e) {
      this.element = document.createElement ('<button type=button>');
    }
    if (this._label.nodeType) {
      this.element.appendChild (this._label);
    } else {
      JSTE.Element.appendText (this.element, this._label);
    }
    this.element.className = this._classNames.list.join (' ');
  
    var self = this;
    new JSTE.Observer ("click", this.element, function (e) {
      self._command (e);
    });
  } // _createElement
}); // Button

JSTE.Course = new JSTE.Class (function (doc) {
  this._targetDocument = doc;

  this._entryPoints = new JSTE.List;
  this._entryPoints.push
      ({conditions: new JSTE.List ([{type: 'state', value: 'done'}]),
        stepUid: 'special-none'});
  
  this._stepsState = new JSTE.List ([new JSTE.Hash]);
  this._steps = new JSTE.Hash;
  
  var nullState = new JSTE.Step;
  nullState.uid = "special-none";
  this._steps.setNamedItem (nullState.uid, nullState);
  this._initialStepUid = nullState.uid;
}, {
  _processStepsContent: function (el, parentSteps) {
    var self = this;
    new JSTE.List (el.childNodes).switchByElementType (
      new JSTE.List.SwitchByLocalName (JSTE.WATNS, {
        steps: function (n) { self._processStepsElement (n, parentSteps) },
        step: function (n) { self._processStepElement (n, parentSteps) },
        jump: function (n) { self._processJumpElement (n, parentSteps) },
        'entry-point': function (n) { self._processEntryPointElement (n, parentSteps) }
      })
    );
  }, // _processStepsContent
  _processStepsElement: function (e, parentSteps) {
    var steps = new JSTE.Steps ();
    steps.parentSteps = parentSteps;
    this._stepsState.pushCloneOfLast ();
    this._stepsState.getLast ().prevStep = null;

    this._addConditionsFromElement (e, steps.conditions);
    this._processStepsContent (e, steps);

    this._stepsState.pop ();
  }, // _processStepsElement

  _processEntryPointElement: function (e, parentSteps) {
    var conds = parentSteps ? parentSteps.conditions.clone () : new JSTE.List;
    this._addConditionsFromElement (e, conds);

    var stepUid = e.getAttribute ('step');
    if (stepUid != null) stepUid = 'id-' + stepUid;
    this._entryPoints.push ({conditions: conds, stepUid: stepUid});
  }, // _processEntryPointElement

  _addConditionsFromElement: function (e, conds) {
    var urls = e.getAttribute ('document-url');
    if (urls != null) {
      JSTE.List.spaceSeparated (urls).forEach (function (url) {
        conds.push ({type: 'url', value: encodeURI (url)});
// TODO: resolve relative URL, URL->URI
      });
    }

    var urls = e.getAttribute ('not-document-url');
    if (urls != null) {
      JSTE.List.spaceSeparated (urls).forEach (function (url) {
        conds.push ({type: 'url', value: encodeURI (url), not: true});
// TODO: resolve relative URL
      });
    }

    var classNames = e.getAttribute ('document-class');
    if (classNames != null) {
      JSTE.List.spaceSeparated (classNames).forEach (function (className) {
        conds.push ({type: 'class', value: className});
      });
    }

    var classNames = e.getAttribute ('not-document-class');
    if (classNames != null) {
      JSTE.List.spaceSeparated (classNames).forEach (function (className) {
        conds.push ({type: 'class', value: className, not: true});
      });
    }

    var stateNames = e.getAttribute ('state');
    if (stateNames != null) {
      JSTE.List.spaceSeparated (stateNames).forEach (function (stateName) {
        conds.push ({type: 'state', value: stateName});
      });
    }

    var stateNames = e.getAttribute ('not-state');
    if (stateNames != null) {
      JSTE.List.spaceSeparated (stateNames).forEach (function (stateName) {
        conds.push ({type: 'state', value: stateName, not: true});
      });
    }
  }, // _addConditionsFromElement

  findEntryPoint: function (doc, states) {
    var self = this;

    var td = this._targetDocument;
    var docURL = td.URL; // TODO: drop fragments?
    var docClassNames = JSTE.Document.getClassNames (td);

    var stepUid = this._entryPoints.forEach (function (ep) {
      if (ep.conditions.forEach (function (cond) {
        var matched;
        if (cond.type == 'state') {
          matched = states.has (cond.value);
        } else if (cond.type == 'class') {
          matched = docClassNames.has (cond.value);
        } else if (cond.type == 'url') {
          matched = JSTE.URL.eq (cond.value, docURL);
        } else {
          //
        }
        if (cond.not) matched = !matched;
        if (!matched) return new JSTE.List.Return (true);
      })) return; // true = not matched

      // matched
      return new JSTE.List.Return (ep.stepUid);
    });

// TODO: multiple elements with same ID

    if (stepUid != null) {
      return stepUid;
    } else {
      return this._initialStepUid;
    }
  }, // findEntryPoint
  
  _processStepElement: function (e, parentSteps) {
    var self = this;

    var step = new JSTE.Step (e.getAttribute ('id'));
    step.parentSteps = parentSteps;
    step.setPreviousStep (this._stepsState.getLast ().prevStep);
    step.select = e.getAttribute ('select') || "";
    step.nextEvents.append
        (JSTE.List.spaceSeparated (e.getAttribute ('next-event')));

    step.noHistory = JSTE.Element.hasAttribute (e, 'nohistory');

    var cs = JSTE.Element.getChildrenClassifiedByType (e);

    var msgEl = cs.get (JSTE.WATNS, 'message').list[0];
    if (msgEl) {
      var msg = JSTE.Element.createTemplate (this._targetDocument, msgEl);
      step.setMessageTemplate (msg);
    }

    var nextEls = cs.get (JSTE.WATNS, 'next-step');
    if (nextEls.list.length) {
      nextEls.forEach (function (nextEl) {
        step.addNextStep
            (nextEl.getAttribute ('if'), nextEl.getAttribute ('step'));
      });
      this._stepsState.getLast ().prevStep = null;
    } else {
      this._stepsState.getLast ().prevStep = step;
    }

    cs.get (JSTE.WATNS, 'command').forEach (function (bEl) {
      var cmd = {
        name: bEl.getAttribute ('type') || 'gotoStep'
      };
      if (cmd.name == 'gotoStep') {
        cmd.args = {stepUid: 'id-' + bEl.getAttribute ('step')};
      } else if (cmd.name == 'url') {
// TODO: relative URL
        cmd.args = {url: bEl.getAttribute ('href')};
      }
      cmd.actions = {
        saveStateNames: JSTE.List.spaceSeparated (bEl.getAttribute ('save-state')),
        clearStateNames: JSTE.List.spaceSeparated (bEl.getAttribute ('clear-state'))
      };
      if (!JSTE.Element.isEmpty (bEl)) {
        cmd.labelTemplate = JSTE.Element.createTemplate (self._targetDocument, bEl);
      }
      step.availCommands.push (cmd);
    }); // wat:command

    cs.get (JSTE.WATNS, 'save-state').forEach (function (bEl) {
      var ss = new JSTE.SaveState
          (bEl.getAttribute ('name'), bEl.getAttribute ('value'));
      step.saveStates.push (ss);
    }); // wat:save-state

    var evs = JSTE.List.spaceSeparated (e.getAttribute ('entry-event'));
    if (evs.list.length) {
      var jump = new JSTE.Jump (step.select, evs, step.uid);
      if (parentSteps) parentSteps._jumps.push (jump);
    }
    
    this._steps.setNamedItem (step.uid, step);
    /*if (!this._initialStepUid) {
      this._initialStepUid = step.uid;
    }*/
  }, // _processStepElement
  
  _processJumpElement: function (e, parentSteps) {
    var target = e.getAttribute ('target') || '';
    var evs = JSTE.List.spaceSeparated (e.getAttribute ('event'));
    var stepName = e.getAttribute ('step') || '';

    var jump = new JSTE.Jump (target, evs, 'id-' + stepName);
    if (parentSteps) parentSteps._jumps.push (jump);
  }, // _processJumpElement
  
  getStep: function (uid) {
    return this._steps.getNamedItem (uid);
  } // getStep
}); // Course

JSTE.Class.addClassMethods (JSTE.Course, {
  createFromDocument: function (doc, targetDoc) {
    var course = new JSTE.Course (targetDoc);
    var docEl = doc.documentElement;
    if (!docEl) return course;
    if (!JSTE.Element.match (docEl, JSTE.WATNS, 'course')) return course;
    course._processStepsContent (docEl, null);
    var name = docEl.getAttribute ('name');
    if (name != null) {
      course.name = name + '-';
    } else {
      course.name = '';
    }
    return course;
  }, // createFromDocument
  createFromURL: function (url, targetDoc, onload, onerror) {
    new JSTE.XHR (url, function () {
      var course = JSTE.Course.createFromDocument
          (this.getDocument (), targetDoc);
      if (onload) onload (course);
    }, onerror).get ();
  } // creatFromURL
}); // Course class methods

JSTE.Jump = new JSTE.Class (function (selectors, eventNames, stepUid) {
  this.selectors = selectors;
  this.eventNames = eventNames;
  this.stepUid = stepUid;
  // this.parentSteps
}, {
  startObserver: function (doc, commandTarget) {
    var self = this;
    var observers = new JSTE.List;

    var onev = function () {
      commandTarget.gotoStep ({stepUid: self.stepUid});
    };

    JSTE.Node.querySelectorAll (doc, this.selectors).forEach
    (function (el) {
      self.eventNames.forEach (function (evName) {
        var ob = new JSTE.Observer (evName, el, onev);
        ob._stepUid = self.stepUid;
        observers.push (ob);
      });
    });

    return observers;
  } // startObserver
}); // Jump

JSTE.Steps = new JSTE.Class (function () {
  this._jumps = new JSTE.List;
  this._jumpHandlers = new JSTE.List;
  this.conditions = new JSTE.List;
}, {
  setCurrentStepByUid: function (uid) {
    this._jumpHandlers.forEach (function (jh) {
      if (jh._stepUid != uid && jh.disabled) {
        jh.start ();
      } else if (jh._stepUid == uid && !jh.disabled) {
        jh.stop ();
      }
    });
  }, // setCurrentStepByUid

  installJumps: function (doc, commandTarget) {
    if (this._jumpHandlers.list.length) return;
    var self = this;
    this._jumps.forEach (function (j) {
      self._jumpHandlers.append (j.startObserver (doc, commandTarget));
    });
  }, // installJumps

  uninstallJumps: function () {
    this._jumpHandlers.forEach (function (jh) {
      jh.stop ();
    });
    this._jumpHandlers.clear ();
  } // uninstallJumps
}); // Steps

JSTE.Step = new JSTE.Class (function (id) {
  if (id != null && id != '') {
    this.uid = 'id-' + id;
  } else {
    this.uid = 'rand-' + Math.random ();
  }
  this._nextSteps = new JSTE.List;
  this.nextEvents = new JSTE.List;
  this.availCommands = new JSTE.List;
  this.saveStates = new JSTE.List;
  this.select = "";
  // this._messageTemplate
}, {
  setMessageTemplate: function (msg) {
    this._messageTemplate = msg;
  }, // setMessageTemplate
  hasMessage: function () {
    return this._messageTemplate ? true : false;
  }, // hasMessage
  createMessage: function (msg, doc, commandTarget) {
    var msg;
    if (this._messageTemplate) {
      var clone = JSTE.Element.createTemplate (doc, this._messageTemplate);
      msg = new msg (doc, clone, commandTarget, this.availCommands.clone ());
    } else {
      msg = new msg (doc, null, commandTarget, this.availCommands.clone ());
    }
    msg.select = this.select;
    return msg;
  }, // createMessage
  
  addNextStep: function (condition, stepId) {
    if (stepId != null) this._nextSteps.push ([condition, stepId]);
  }, // addNextStep
  setPreviousStep: function (prevStep) {
    if (!prevStep) return;
    if (prevStep._defaultNextStepUid) return;
    prevStep._defaultNextStepUid = this.uid;
  }, // setPreviousStep
  
  getNextStepUid: function (doc) {
    var m = this._nextSteps.getFirstMatch (function (item) {
      var condition = item[0];
      if (condition) {
        return JSTE.Node.querySelector (doc, condition) != null;
      } else {
        return true;
      }
    });
    if (m) {
      return 'id-' + m[1];
    } else if (this._defaultNextStepUid) {
      return this._defaultNextStepUid;
    } else {
      return null;
    }
  }, // getNextStepUid

  getAncestorStepsObjects: function () {
    var steps = new JSTE.List;
    var s = this.parentSteps;
    while (s != null) {
      steps.push (s);
      s = s.parentSteps;
    }
    return steps;
  } // getAncestorStepsObjects
}); // Step

JSTE.SaveState = new JSTE.Class (function (name, value) {
  this.name = name || '';
  this.value = value || '';
}, {
  save: function (tutorial) {
    var name = this.name;
    var value = this.value;
    if (name == 'back-state') return;
    tutorial._states.set (name, value);
  } // save
}); // SaveState

/* Events: load, error, cssomready, close */
JSTE.Tutorial = new JSTE.Class (function (course, doc, args) {
  this._course = course;
  this._targetDocument = doc;
  this._messageClass = JSTE.Message;
  if (args) {
    if (args.messageClass) this._messageClass = args.messageClass;
    if (args.states) this._states = args.states;
  }
  if (!this._states) this._states = new JSTE.Storage.PageLocal;
  this._states.setPrefix (course.name);
  
  this._currentMessages = new JSTE.List;
  this._currentObservers = new JSTE.List;
  this._currentStepsObjects = new JSTE.List;

  this._prevStepUids = new JSTE.List;
  this._loadBackState ();

  var stepUid;
  if (this._states.flushGet ('is-back') && this._prevStepUids.list.length) {
    stepUid = this._prevStepUids.pop ();
  } else {
    stepUid = this._course.findEntryPoint (document, this._states);
  }

  this._currentStep = this._getStepOrError (stepUid);
  if (this._currentStep) {
    var e = new JSTE.Event ('load');
    this.dispatchEvent (e);

    this._saveBackState ();

    var self = this;
    new JSTE.Observer ('cssomready', this, function () {
      self._renderCurrentStep ();
    });
    this._dispatchCSSOMReadyEvent ();
    return this;
  } else {
    return {};
  }
}, {
  _getStepOrError: function (stepUid) {
    if (stepUid == 'special-none') {
      return null;
    }

    var step = this._course.getStep (stepUid);
    if (step) {
      return step;
    } else {
      var e = new JSTE.Event ('error');
      e.errorMessage = 'Step not found';
      e.errorArguments = [this._currentStepUid];
      this.dispatchEvent (e);
      return null;
    }
  }, // _getStepOrError

  _renderCurrentStep: function () {
    var self = this;
    var step = this._currentStep;

    step.saveStates.forEach (function (ss) { ss.save (self) });
    
    /* Message */
    var msg = step.createMessage
        (this._messageClass, this._targetDocument, this);
    msg.render ();
    this._currentMessages.push (msg);
    
    /* Next-events */
    var selectedNodes = JSTE.Node.querySelectorAll
        (this._targetDocument, step.select);
    var handler = function () {
      self.executeCommand ("next");
    };
    selectedNodes.forEach (function (node) {
      step.nextEvents.forEach (function (eventType) {
        self._currentObservers.push
            (new JSTE.Observer (eventType, node, handler));
      });
    });

    JSTE.List.getCommonItems (this._currentStepsObjects,
                              step.getAncestorStepsObjects (), 
    function (common, onlyInOld, onlyInNew) {
      common.forEach (function (item) {
        item.setCurrentStepByUid (step.uid);
      });
      onlyInOld.forEach (function (item) {
        item.uninstallJumps ();
      });
      onlyInNew.forEach (function (item) {
        item.installJumps (self._targetDocument, self);
      });
      self._currentStepsObjects = common.append (onlyInNew);
    });
  }, // _renderCurrentStep
  clearMessages: function () {
    this._currentMessages.forEach (function (msg) {
      msg.remove ();
    });
    this._currentMessages.clear ();
    
    this._currentObservers.forEach (function (ob) {
      ob.stop ();
    });
    this._currentObservers.clear ();
  }, // clearMessages
  clearStepsHandlers: function () {
    this._currentStepsObjects.forEach (function (item) {
      item.uninstallJumps ();
    });
    this._currentStepsObjects.clear ();
  }, // clearStepsHandlers
  
  executeCommand: function (commandName, commandArgs, commandActions) {
    if (this[commandName]) {
      // Common actions
      if (commandActions) {
        var self = this;
        if (commandActions.saveStateNames) {
          commandActions.saveStateNames.forEach (function (stateName) {
            self._states.set (stateName, '');
          });
        }
        if (commandActions.clearStateNames) {
          commandActions.clearStateNames.forEach (function (stateName) {
            if (stateName == 'back-state') {
              self._prevStateUids = new JSTE.List;
              self._prevPages = new JSTE.List;
            }
            self._states.del (stateName);
          });
        }
      }

      return this[commandName].apply (this, [commandArgs || {}]);
    } else {
      var e = new JSTE.Event ('error');
      e.errorMessage = 'Command not found';
      e.errorArguments = [commandName];
      return null;
    }
  }, // executeCommand
  canExecuteCommand: function (commandName, commandArgs) {
    if (this[commandName]) {
      var can = this['can' + commandName.substring (0, 1).toUpperCase ()
          + commandName.substring (1)];
      if (can) {
        return can.apply (this, arguments);
      } else {
        return true;
      }
    } else {
      return false;
    }
  }, // canExecuteCommand
  
  back: function () {
    while (this._prevStepUids.list.length == 0 &&
           this._prevPages.list.length > 0) {
      var prevPage = this._prevPages.pop ();
      if (!JSTE.URL.eq (prevPage.url, location.href)) { // TODO: fragment?
        this._saveBackState (true);
        this._states.flushSet ('is-back', true);
        if (JSTE.URL.eq (document.referrer, prevPage.url)) { // TODO: fragment?
          history.back ();
        } else {
          location.href = prevPage.url;
        }
// TODO: maybe we should not return if locaton.href and prevPage.,url only differs their fragment ids?
        return;
      }
      this._prevStepUids = prevPage;
    }

    var prevStepUid = this._prevStepUids.pop ();
    var prevStep = this._getStepOrError (prevStepUid);
    if (prevStep) {
      this.clearMessages ();
      this._saveBackState ();
      this._currentStep = prevStep;
      this._renderCurrentStep ();
    }
  }, // back
  canBack: function () {
    return this._prevStepUids.list.length > 0 || this._prevPages.list.length > 0;
  }, // canBack
  next: function () {
    var nextStepUid = this._currentStep.getNextStepUid (this._targetDocument);
    var nextStep = this._getStepOrError (nextStepUid);
    if (nextStep) {
      if (!this._currentStep.noHistory) {
        this._prevStepUids.push (this._currentStep.uid);
      }
      this.clearMessages ();
      this._saveBackState ();
      this._currentStep = nextStep;
      this._renderCurrentStep ();
    }
  }, // next
  canNext: function () {
    return this._currentStep.getNextStepUid (this._targetDocument) != null;
  }, // canNext
  gotoStep: function (args) {
    var nextStep = this._getStepOrError (args.stepUid);
    if (nextStep) {
      if (!this._currentStep.noHistory) {
        this._prevStepUids.push (this._currentStep.uid);
      }
      this._saveBackState ();
      this.clearMessages ();
      this._currentStep = nextStep;
      this._renderCurrentStep ();
    }
  }, // gotoStep

  url: function (args) {
    location.href = args.url;
  }, // url

  close: function () {
    this.clearMessages ();
    var e = new JSTE.Event ('closed');
    this.dispatchEvent (e);
  }, // close

  _loadBackState: function () {
    var self = this;
    this._prevPages = new JSTE.List;
    var bs = this._states.getJSON ('back-state');
    new JSTE.List (bs).forEach (function (b) {
      var i = new JSTE.List (b.stepUids);
      i.url = b.url;
      self._prevPages.push (i);
    });
    if (JSTE.URL.eq ((this._prevPages.getLast () || {}).url, location.href)) { // TODO: fragment?
      this._prevStepUids = this._prevPages.pop ();
    }
  }, // loadBackState
  _saveBackState: function (ignoreCurrentPage) {
    var bs = [];
    this._prevPages.forEach (function (pp) {
      bs.push ({url: pp.url, stepUids: pp.list});
    });
    if (!ignoreCurrentPage) {
      var uids = this._prevStepUids.clone ();
      if (!this._currentStep.noHistory) {
        uids.push (this._currentStep.uid);
      }
      if (uids.list.length) {
        bs.push ({url: location.href, stepUids: uids.list});
      }
    }
    this._states.setJSON ('back-state', bs);
  }, // _saveBackState

  // <http://twitter.com/waka/status/1129513097> 
  _dispatchCSSOMReadyEvent: function () {
    var self = this;
    var e = new JSTE.Event ('cssomready');
    if (window.opera && document.readyState != 'complete') {
      new JSTE.Observer ('readystatechange', document, function () {
        if (document.readyState == 'complete') {
          self.dispatchEvent (e);
        }
      });
    } else {
      this.dispatchEvent (e);
    }
  } // dispatchCSSOMReadyEvent
   
}); // Tutorial

JSTE.Class.addClassMethods (JSTE.Tutorial, {
  createFromURL: function (url, doc, args, onload) {
    JSTE.Course.createFromURL (url, doc, function (course) {
      var tutorial = new JSTE.Tutorial (course, doc, args);
      if (onload) onload (tutorial);
    });
  } // createFromURL
}); // Tutorial class methods



if (JSTE.onLoadFunctions) {
  new JSTE.List (JSTE.onLoadFunctions).forEach (function (code) {
    code ();
  });
}

if (JSTE.isDynamicallyLoaded) {
  JSTE.windowLoaded = true;
}

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2008-2009 Wakaba <wakaba@suikawiki.org>.  All rights reserved.
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
 * The Original Code is JSTE code.
 *
 * The Initial Developer of the Original Code is Wakaba.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Wakaba <wakaba@suikawiki.org>
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
