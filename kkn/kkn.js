
if (typeof (JSTE) === "undefined") var JSTE = {};

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
  if (target.addEventListener) {
    this.target = target;
    this.code = onevent;
    target.addEventListener (eventType, this.code, false);
  } else if (target.attachEvent) {
    this.code = function () {
      onevent (event);
    };
    this.target = target;
    target.attachEvent ("on" + eventType, this.code);
  }
}, {
  stop: function () {
    if (this.target.removeEventListener) {
      this.target.removeEventListener (this.eventType, this.code, false);
    } else if (this.detachEvent) {
      this.target.detachEvent ("on" + this.eventType, this.code);
    }
  } // stop
}); // Observer

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
  
  push: function (item) {
    this.list.push (item);
  }, // push
  pushCloneOfLast: function () {
    this.list.push (this.getLast ().clone ());
  }, // pushCloneOfLast
  append: function (list) {
    var self = this;
    list.forEach (function (n) {
      self.list.push (n);
    });
  }, // append
  
  pop: function () {
    return this.list.pop ();
  }, // pop
  remove: function (removedItem) {
    var length = this.list.length;
    for (var i = length - 1; i >= 0; --i) {
      var item = this.list[i];
      if (item == removedItem) { // Intentionally "=="
        this.list.splice (i, 1);
      }
    }
  }, // remove
  clear: function () {
    this.list.splice (0, this.list.length);
  } // clear
  
}); // List

JSTE.List.Return = new JSTE.Class (function (rv) {
  this.stop = true;
  this.returnValue = rv;
}, {
  
}); // Return

JSTE.List.SpaceSeparated = function (v) {
  return new JSTE.List ((v || '').split (JSTE.SpaceChars)).grep (function (v) {
    return v.length;
  });
}; // SpaceSeparated

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
  } // setNamedItem
});

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
        /* NOTE: uu.css return all elements for "" or ",xxx" */
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
  
  appendText: function (el, s) {
    return el.appendChild (el.ownerDocument.createTextNode (s));
  }, // appendText
  
  createTemplate: function (doc, node) {
    var df = doc.createDocumentFragment ();
    new JSTE.List (node.childNodes).forEach (function (n) {
      if (n.nodeType == 1) {
        var c = doc.createElement (JSTE.Element.getLocalName (n));
        new JSTE.List (c.attributes).forEach (function (n) {
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
  } // getIds
  
}); // JSTE.Element
