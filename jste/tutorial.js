
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

/* Events: load, close, shown, hidden */
JSTE.Message = new JSTE.Class (function (doc, template, commandTarget) {
  if (!doc) return;
  this._targetDocument = doc;
  this._template = template || doc.createDocumentFragment ();
  this._commandTarget = commandTarget;
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
    
    var buttonContainer = doc.createElement ('menu');
    
    var backButton = new JSTE.Message.Button
        ("Back", this._commandTarget, "back");
    buttonContainer.appendChild (backButton.element);
    
    var nextButton = new JSTE.Message.Button
        ("Next", this._commandTarget, "next");
    buttonContainer.appendChild (nextButton.element);
    
    this._outermostElement = this._render (msgContainer, buttonContainer);
    
    this.show ();
  }, // render
  _render: function (msgContainer, buttonContainer) {
    var doc = this._targetDocument;
    
    var container = doc.createElement ('article');
    var style = doc.createElement ('style');
    style.innerHTML = this.select + ' { outline: red 2px solid }';
    container.appendChild (style);
    
    container.appendChild (msgContainer);
    container.appendChild (buttonContainer);
    doc.documentElement.appendChild (container);
    
    return container;
  }, // _render
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

JSTE.Message.Button =
new JSTE.Class (function (labelText, commandTarget, commandName, commandArgs) {
  labelText = labelText != null ? labelText : "";
  var className;
  if (commandTarget && commandTarget instanceof Function) {
    this._command = commandTarget;
  } else if (commandTarget) {
    this._command = function () {
      return commandTarget.executeCommand.apply
          (commandTarget, [commandName, commandArgs]);
    };
    className = 'jste-command-' + commandName;
  } else {
    this._command = function () { };
  }
  
  try {
    this.element = document.createElement ('button');
    this.element.setAttribute ('type', 'button');
  } catch (e) {
    this.element = document.createElement ('<button type=button>');
  }
  JSTE.Element.appendText (this.element, labelText);
  if (className) this.element.className = className;
  
  var self = this;
  new JSTE.Observer ("click", this.element, function (e) {
    self._command.apply (self, [e]);
  });
}, {
  
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
  _processStepsContent: function (el) {
    var self = this;
    new JSTE.List (el.childNodes).switchByElementType (
      new JSTE.List.SwitchByLocalName (JSTE.WATNS, {
        steps: function (n) { self._processStepsElement (n) },
        step: function (n) { self._processStepElement (n) },
        jump: function (n) { self._processJumpElement (n) },
        entry: function (n) { self._processEntryElement (n) }
      })
    );
  }, // _processStepsContent
  _processStepsElement: function (e) {
    this._stepsState.pushCloneOfLast ();
    this._stepsState.getLast ().prevStep = null;
    this._processStepsContent (e);
    this._stepsState.pop ();
  }, // _processStepsElement

  _processEntryElement: function (e) {
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
  }, // _processEntryElement
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
  
  _processStepElement: function (e) {
    var step = new JSTE.Step (e.getAttribute ('id'));
    step.setPreviousStep (this._stepsState.getLast ().prevStep);
    step.select = e.getAttribute ('select') || "";
    step.nextEvents.append
        (JSTE.List.SpaceSeparated (e.getAttribute ('next-event')));
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
    
    this._steps.setNamedItem (step.uid, step);
    if (!this._initialStepUid) {
      this._initialStepUid = step.uid;
    }
  }, // _processStepElement
  
  _processJumpElement: function (e) {
  
  }, // _processJumpElement
  
  getStep: function (uid) {
    return this._steps.getNamedItem (uid);
  } // getStep
}); // Course

JSTE.Course.createFromDocument = function (doc, targetDoc) {
  var course = new JSTE.Course (targetDoc);
  var docEl = doc.documentElement;
  if (!docEl) return course;
  if (!JSTE.Element.match (docEl, JSTE.WATNS, 'course')) return course;
  course._processStepsContent (docEl);
  return course;
}; // createFromDocument

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
  } // getNextStepUid
  
}); // Step

/* Events: load, error */
JSTE.Tutorial = new JSTE.Class (function (doc, course, args) {
  this._course = course;
  this._targetDocument = doc;
  this._messageClass = JSTE.Message;
  if (args) {
    if (args.messageClass) this._messageClass = args.messageClass;
  }
  
  this._currentMessages = new JSTE.List;
  this._currentObservers = new JSTE.List;
  this._prevStepUids = new JSTE.List;
  
  var stepUid = this._course.findEntryPoint (document);
  this._currentStep = this._getStepOrError (stepUid);
  if (this._currentStep) {
    var e = new JSTE.Event ('load');
    this.dispatchEvent (e);
    
    this._renderCurrentStep ();
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
  next: function () {
    var nextStepUid = this._currentStep.getNextStepUid (this._targetDocument);
    var nextStep = this._getStepOrError (nextStepUid);
    if (nextStep) {
      this._prevStepUids.push (this._currentStep.uid);
      this.clearMessages ();
      this._currentStep = nextStep;
      this._renderCurrentStep ();
    }
  } // next
  
}); // Tutorial

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
