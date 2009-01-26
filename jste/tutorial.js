
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
  } // setNamedItem
});


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
    NR.js <http://suika.fam.cx/www/css/noderect/NodeRect.js> must be loaded
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

}); // JSTE.Element

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


/* Events: load, close, shown, hidden */
JSTE.Message = new JSTE.Class (function (doc, template, commandTarget) {
  if (!doc) return;
  this._targetDocument = doc;
  this._template = template || doc.createDocumentFragment ();

  this._commandTarget = commandTarget;
  this._availCommands = new JSTE.List;

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
    
    if (this._commandTarget.canBack ()) {
      this._availCommands.push ({name: 'back'});
    }
    
    if (this._commandTarget.canNext ()) {
      this._availCommands.push ({name: 'next'});
    }
    
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
    var buttonContainer = this._targetDocument.createElement ('menu');
    this._availCommands.forEach (function (cmd) {
      var button = new JSTE.Message.Button
          (cmd.name, self._commandTarget, cmd.name);
      buttonContainer.appendChild (button.element);
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
new JSTE.Class (function (labelText, commandTarget, commandName, commandArgs) {
  this._labelText = labelText != null ? labelText : "";

  if (commandTarget && commandTarget instanceof Function) {
    this._command = commandTarget;
    this._classNames = new JSTE.List;
  } else if (commandTarget) {
    this._command = function () {
      return commandTarget.executeCommand.apply
          (commandTarget, [commandName, commandArgs]);
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
    JSTE.Element.appendText (this.element, this._labelText);
    this.element.className = this._classNames.list.join (' ');
  
    var self = this;
    new JSTE.Observer ("click", this.element, function (e) {
      self._command (e);
    });
  } // _createElement
}); // Button

JSTE.Course = new JSTE.Class (function (doc) {
  this._targetDocument = doc;

  this._entryPointsByURL = {};
  this._entryPointsById = {};
  this._entryPointsByClassName = {};
  
  this._stepsState = new JSTE.List ([new JSTE.Hash]);
  this._steps = new JSTE.Hash;
  
  var nullState = new JSTE.Step;
  nullState.uid = "";
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
        entryPoint: function (n) { self._processEntryPointElement (n, parentSteps) }
      })
    );
  }, // _processStepsContent
  _processStepsElement: function (e, parentSteps) {
    var steps = new JSTE.Steps ();
    steps.parentSteps = parentSteps;
    this._stepsState.pushCloneOfLast ();
    this._stepsState.getLast ().prevStep = null;
    this._processStepsContent (e, steps);
    this._stepsState.pop ();
  }, // _processStepsElement

  _processEntryPointElement: function (e, parentSteps) {
    if (JSTE.Element.hasAttribute (e, 'url')) {
      this.setEntryPointByURL
          (e.getAttribute ('url'), e.getAttribute ('step'));
    } else if (JSTE.Element.hasAttribute (e, 'root-id')) {
      this.setEntryPointById
          (e.getAttribute ('root-id'), e.getAttribute ('step'));
    } else if (JSTE.Element.hasAttribute (e, 'root-class')) {
      this.setEntryPointByClassName
          (e.getAttribute ('root-class'), e.getAttribute ('step'));
    }
  }, // _processEntryPointElement
  setEntryPointByURL: function (url, stepName) {
    this._entryPointsByURL[url] = stepName || '';
  }, // setEntryPointByURL
  setEntryPointById: function (id, stepName) {
    this._entryPointsById[id] = stepName || '';
  }, // setEntryPointById
  setEntryPointByClassName: function (className, stepName) {
    this._entryPointsByClassName[className] = stepName || '';
  }, // setEntryPointByClassName
  findEntryPoint: function (doc) {
    var self = this;
    var td = this._targetDocument;
    var stepName;
    
    var url = doc.URL;
    if (url) {
      stepName = self._entryPointsByURL[url];
      if (stepName) return 'id-' + stepName;
    }
    
    var docEl = td.documentElement;
    if (docEl) {
      var docElId = JSTE.Element.getIds (docEl).forEach (function (i) {
        stepName = self._entryPointsById[i];
        if (stepName) return new JSTE.List.Return (stepName);
      });
      if (stepName) return 'id-' + stepName;
      
      stepName = JSTE.Element.getClassNames (docEl).forEach (function (c) {
        stepName = self._entryPointsByClassName[c];
        if (stepName) return new JSTE.List.Return (stepName);
      });
      if (stepName) return 'id-' + stepName;
    }
    
    var bodyEl = td.body;
    if (bodyEl) {
      var bodyElId = JSTE.Element.getIds (bodyEl).forEach (function (i) {
        stepName = self._entryPointsById[i];
        if (stepName) return new JSTE.List.Return (stepName);
      });
      if (stepName) return 'id-' + stepName;
      
      stepName = JSTE.Element.getClassNames (bodyEl).forEach (function (c) {
        stepName = self._entryPointsByClassName[c];
        if (stepName) return new JSTE.List.Return (stepName);
      });
      if (stepName) return 'id-' + stepName;
    }
    
    return this._initialStepUid;
  }, // findEntryPoint
  
  _processStepElement: function (e, parentSteps) {
    var step = new JSTE.Step (e.getAttribute ('id'));
    step.parentSteps = parentSteps;
    step.setPreviousStep (this._stepsState.getLast ().prevStep);
    step.select = e.getAttribute ('select') || "";
    step.nextEvents.append
        (JSTE.List.spaceSeparated (e.getAttribute ('next-event')));
    var msgEl = JSTE.Element.getChildElement (e, JSTE.WATNS, 'message');
    if (msgEl) {
      var msg = JSTE.Element.createTemplate (this._targetDocument, msgEl);
      step.setMessageTemplate (msg);
    }
    var nextEls = JSTE.Element.getChildElements (e, JSTE.WATNS, 'next-step');
    if (nextEls.length) {
      nextEls.forEach (function (nextEl) {
        step.addNextStep
            (nextEl.getAttribute ('if'), nextEl.getAttribute ('step'));
      });
      this._stepsState.getLast ().prevStep = null;
    } else {
      this._stepsState.getLast ().prevStep = step;
    }
    /* TODO: @save */

    var evs = JSTE.List.spaceSeparated (e.getAttribute ('entry-event'));
    if (evs.list.length) {
      var jump = new JSTE.Jump (step.select, evs, step.uid);
      if (parentSteps) parentSteps._jumps.push (jump);
    }
    
    this._steps.setNamedItem (step.uid, step);
    if (!this._initialStepUid) {
      this._initialStepUid = step.uid;
    }
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
      commandTarget.gotoStep (self.stepUid);
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
  this.select = "";
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
      msg = new msg (doc, clone, commandTarget);
    } else {
      msg = new msg (doc, null, commandTarget);
    }
    msg.select = this.select;
    return msg;
  }, // createMessage
  
  addNextStep: function (condition, stepId) {
    this._nextSteps.push ([condition, stepId]);
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

/* Events: load, error, cssomready */
JSTE.Tutorial = new JSTE.Class (function (course, doc, args) {
  this._course = course;
  this._targetDocument = doc;
  this._messageClass = JSTE.Message;
  if (args) {
    if (args.messageClass) this._messageClass = args.messageClass;
  }
  
  this._currentMessages = new JSTE.List;
  this._currentObservers = new JSTE.List;
  this._prevStepUids = new JSTE.List;
  this._currentStepsObjects = new JSTE.List;
  
  var stepUid = this._course.findEntryPoint (document);
  this._currentStep = this._getStepOrError (stepUid);
  if (this._currentStep) {
    var e = new JSTE.Event ('load');
    this.dispatchEvent (e);
    
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
  
  executeCommand: function (commandName, commandArgs) {
    if (this[commandName]) {
      return this[commandName].apply (this, commandArgs || []);
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

  startTutorial: function () {
    this.resetVisited ();
  
  }, // startTutorial
  continueTutorial: function () {
  
  }, // continueTutorial
  
  saveVisited: function () {
  
  }, // saveVisited
  resetVisited: function () {
  
  }, // resetVisited
  
  back: function () {
    var prevStepUid = this._prevStepUids.pop ();
    var prevStep = this._getStepOrError (prevStepUid);
    if (prevStep) {
      this.clearMessages ();
      this._currentStep = prevStep;
      this._renderCurrentStep ();
    }
  }, // back
  canBack: function () {
    return this._prevStepUids.list.length > 0;
  }, // canBack
  next: function () {
    var nextStepUid = this._currentStep.getNextStepUid (this._targetDocument);
    var nextStep = this._getStepOrError (nextStepUid);
    if (nextStep) {
      this._prevStepUids.push (this._currentStep.uid);
      this.clearMessages ();
      this._currentStep = nextStep;
      this._renderCurrentStep ();
    }
  }, // next
  canNext: function () {
    return this._currentStep.getNextStepUid (this._targetDocument) != null;
  }, // canNext
  gotoStep: function (uid) {
    var nextStep = this._getStepOrError (uid);
    if (nextStep) {
      this._prevStepUids.push (this._currentStep.uid);
      this.clearMessages ();
      this._currentStep = nextStep;
      this._renderCurrentStep ();
    }
  }, // gotoStep

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
 * The Original Code is JSTE code.
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
