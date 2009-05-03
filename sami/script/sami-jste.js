/* Requires sami-core.js */

if (typeof (JSTE) === "undefined") var JSTE = {};

JSTE.WATNS = 'http://suika.fam.cx/ns/wat';

/* Events: load, close, shown, hidden */
JSTE.Message = new SAMI.Class (function (doc, template, commandTarget, availCommands) {
  if (!doc) return;
  this._targetDocument = doc;
  this._template = template || doc.createDocumentFragment ();

  this._commandTarget = commandTarget;
  this._availCommands = availCommands || new SAMI.List;

  this.hidden = true;
  this.select = "";
  
  var e = new SAMI.Event ('load');
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
        label = SAMI.Element.createTemplate (doc, cmd.labelTemplate);
      }

      var button = new JSTE.Message.Button
          (label, self._commandTarget, cmd.name, cmd.args, cmd.actions);
      buttonContainer.appendChild (button.element);

      if (cmd.name == 'url') {
        SAMI.Prefetch.URL (cmd.args.url);
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
    
    var e = new SAMI.Event ("close");
    this.dispatchEvent (e);
  }, // remove
  _remove: function () {
    
  }, // remove
  
  show: function () {
    if (!this.hidden) return;
    this.hidden = false;
    if (this._outermostElement) {
      SAMI.Element.replaceClassName
          (this._outermostElement, "jste-hidden", "jste-shown");
    }
    
    var e = new SAMI.Event ("shown");
    this.dispatchEvent (e);
  }, // show
  hide: function () {
    if (this.hidden) return;
    this.hidden = true;
    if (this._outermostElement) {
      SAMI.Element.replaceClassName
          (this._outermostElement, "jste-shown", "jste-hidden");
    }
    
    var e = new SAMI.Event ("hidden");
    this.dispatchEvent (e);
  }, // hide
  
  setTimeout: function () {
    /* TODO: ... */
    
  }
  
}); // Message

/* TODO: button label text should refer message catalog */

JSTE.Message.Button =
new SAMI.Class (function (label, commandTarget, commandName, commandArgs, commandActions) {
  this._label = label != null ? label : "";

  if (commandTarget && commandTarget instanceof Function) {
    this._command = commandTarget;
    this._classNames = new SAMI.List;
  } else if (commandTarget) {
    this._command = function () {
      return commandTarget.executeCommand.apply
          (commandTarget, [commandName, commandArgs, commandActions]);
    };
    this._classNames = new SAMI.List (['jste-command-' + commandName]);
  } else {
    this._command = function () { };
    this._classNames = new SAMI.List;
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
      SAMI.Element.appendText (this.element, this._label);
    }
    this.element.className = this._classNames.list.join (' ');
  
    var self = this;
    new SAMI.Observer ("click", this.element, function (e) {
      self._command (e);
    });
  } // _createElement
}); // Button

JSTE.Course = new SAMI.Class (function (doc) {
  this._targetDocument = doc;

  this._entryPoints = new SAMI.List;
  this._entryPoints.push
      ({conditions: new SAMI.List ([{type: 'state', value: 'done'}]),
        stepUid: 'special-none'});
  
  this._stepsState = new SAMI.List ([new SAMI.Hash]);
  this._steps = new SAMI.Hash;
  
  var nullState = new JSTE.Step;
  nullState.uid = "special-none";
  this._steps.setNamedItem (nullState.uid, nullState);
  this._initialStepUid = nullState.uid;
}, {
  _processStepsContent: function (el, parentSteps) {
    var self = this;
    new SAMI.List (el.childNodes).switchByElementType (
      new SAMI.List.SwitchByLocalName (JSTE.WATNS, {
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
    var conds = parentSteps ? parentSteps.conditions.clone () : new SAMI.List;
    this._addConditionsFromElement (e, conds);

    var stepUid = e.getAttribute ('step');
    if (stepUid != null) stepUid = 'id-' + stepUid;
    this._entryPoints.push ({conditions: conds, stepUid: stepUid});
  }, // _processEntryPointElement

  _addConditionsFromElement: function (e, conds) {
    var urls = e.getAttribute ('document-url');
    if (urls != null) {
      SAMI.List.spaceSeparated (urls).forEach (function (url) {
        conds.push ({type: 'url', value: encodeURI (url)});
// TODO: resolve relative URL, URL->URI
      });
    }

    var urls = e.getAttribute ('not-document-url');
    if (urls != null) {
      SAMI.List.spaceSeparated (urls).forEach (function (url) {
        conds.push ({type: 'url', value: encodeURI (url), not: true});
// TODO: resolve relative URL
      });
    }

    var classNames = e.getAttribute ('document-class');
    if (classNames != null) {
      SAMI.List.spaceSeparated (classNames).forEach (function (className) {
        conds.push ({type: 'class', value: className});
      });
    }

    var classNames = e.getAttribute ('not-document-class');
    if (classNames != null) {
      SAMI.List.spaceSeparated (classNames).forEach (function (className) {
        conds.push ({type: 'class', value: className, not: true});
      });
    }

    var stateNames = e.getAttribute ('state');
    if (stateNames != null) {
      SAMI.List.spaceSeparated (stateNames).forEach (function (stateName) {
        conds.push ({type: 'state', value: stateName});
      });
    }

    var stateNames = e.getAttribute ('not-state');
    if (stateNames != null) {
      SAMI.List.spaceSeparated (stateNames).forEach (function (stateName) {
        conds.push ({type: 'state', value: stateName, not: true});
      });
    }
  }, // _addConditionsFromElement

  findEntryPoint: function (doc, states) {
    var self = this;

    var td = this._targetDocument;
    var docURL = td.URL; // TODO: drop fragments?
    var docClassNames = SAMI.Document.getClassNames (td);

    var stepUid = this._entryPoints.forEach (function (ep) {
      if (ep.conditions.forEach (function (cond) {
        var matched;
        if (cond.type == 'state') {
          matched = states.has (cond.value);
        } else if (cond.type == 'class') {
          matched = docClassNames.has (cond.value);
        } else if (cond.type == 'url') {
          matched = SAMI.URL.eq (cond.value, docURL);
        } else {
          //
        }
        if (cond.not) matched = !matched;
        if (!matched) return new SAMI.List.Return (true);
      })) return; // true = not matched

      // matched
      return new SAMI.List.Return (ep.stepUid);
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
        (SAMI.List.spaceSeparated (e.getAttribute ('next-event')));

    step.noHistory = SAMI.Element.hasAttribute (e, 'nohistory');

    var cs = SAMI.Element.getChildrenClassifiedByType (e);

    var msgEl = cs.get (JSTE.WATNS, 'message').list[0];
    if (msgEl) {
      var msg = SAMI.Element.createTemplate (this._targetDocument, msgEl);
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
        saveStateNames: SAMI.List.spaceSeparated (bEl.getAttribute ('save-state')),
        clearStateNames: SAMI.List.spaceSeparated (bEl.getAttribute ('clear-state'))
      };
      if (!SAMI.Element.isEmpty (bEl)) {
        cmd.labelTemplate = SAMI.Element.createTemplate (self._targetDocument, bEl);
      }
      step.availCommands.push (cmd);
    }); // wat:command

    cs.get (JSTE.WATNS, 'save-state').forEach (function (bEl) {
      var ss = new JSTE.SaveState
          (bEl.getAttribute ('name'), bEl.getAttribute ('value'));
      step.saveStates.push (ss);
    }); // wat:save-state

    var evs = SAMI.List.spaceSeparated (e.getAttribute ('entry-event'));
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
    var evs = SAMI.List.spaceSeparated (e.getAttribute ('event'));
    var stepName = e.getAttribute ('step') || '';

    var jump = new JSTE.Jump (target, evs, 'id-' + stepName);
    if (parentSteps) parentSteps._jumps.push (jump);
  }, // _processJumpElement
  
  getStep: function (uid) {
    return this._steps.getNamedItem (uid);
  } // getStep
}); // Course

SAMI.Class.addClassMethods (JSTE.Course, {
  createFromDocument: function (doc, targetDoc) {
    var course = new JSTE.Course (targetDoc);
    var docEl = doc.documentElement;
    if (!docEl) return course;
    if (!SAMI.Element.match (docEl, JSTE.WATNS, 'course')) return course;
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
    new SAMI.XHR (url, function () {
      var course = JSTE.Course.createFromDocument
          (this.getDocument (), targetDoc);
      if (onload) onload (course);
    }, onerror).get ();
  } // creatFromURL
}); // Course class methods

JSTE.Jump = new SAMI.Class (function (selectors, eventNames, stepUid) {
  this.selectors = selectors;
  this.eventNames = eventNames;
  this.stepUid = stepUid;
  // this.parentSteps
}, {
  startObserver: function (doc, commandTarget) {
    var self = this;
    var observers = new SAMI.List;

    var onev = function () {
      commandTarget.gotoStep ({stepUid: self.stepUid});
    };

    SAMI.Node.querySelectorAll (doc, this.selectors).forEach
    (function (el) {
      self.eventNames.forEach (function (evName) {
        var ob = new SAMI.Observer (evName, el, onev);
        ob._stepUid = self.stepUid;
        observers.push (ob);
      });
    });

    return observers;
  } // startObserver
}); // Jump

JSTE.Steps = new SAMI.Class (function () {
  this._jumps = new SAMI.List;
  this._jumpHandlers = new SAMI.List;
  this.conditions = new SAMI.List;
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

JSTE.Step = new SAMI.Class (function (id) {
  if (id != null && id != '') {
    this.uid = 'id-' + id;
  } else {
    this.uid = 'rand-' + Math.random ();
  }
  this._nextSteps = new SAMI.List;
  this.nextEvents = new SAMI.List;
  this.availCommands = new SAMI.List;
  this.saveStates = new SAMI.List;
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
      var clone = SAMI.Element.createTemplate (doc, this._messageTemplate);
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
        return SAMI.Node.querySelector (doc, condition) != null;
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
    var steps = new SAMI.List;
    var s = this.parentSteps;
    while (s != null) {
      steps.push (s);
      s = s.parentSteps;
    }
    return steps;
  } // getAncestorStepsObjects
}); // Step

JSTE.SaveState = new SAMI.Class (function (name, value) {
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
JSTE.Tutorial = new SAMI.Class (function (course, doc, args) {
  this._course = course;
  this._targetDocument = doc;
  this._messageClass = JSTE.Message;
  if (args) {
    if (args.messageClass) this._messageClass = args.messageClass;
    if (args.states) this._states = args.states;
  }
  if (!this._states) this._states = new SAMI.Storage.PageLocal;
  this._states.setPrefix (course.name);
  
  this._currentMessages = new SAMI.List;
  this._currentObservers = new SAMI.List;
  this._currentStepsObjects = new SAMI.List;

  this._prevStepUids = new SAMI.List;
  this._loadBackState ();

  var stepUid;
  if (this._states.flushGet ('is-back') && this._prevStepUids.list.length) {
    stepUid = this._prevStepUids.pop ();
  } else {
    stepUid = this._course.findEntryPoint (document, this._states);
  }

  this._currentStep = this._getStepOrError (stepUid);
  if (this._currentStep) {
    var e = new SAMI.Event ('load');
    this.dispatchEvent (e);

    this._saveBackState ();

    var self = this;
    new SAMI.Observer ('cssomready', this, function () {
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
      var e = new SAMI.Event ('error');
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
    var selectedNodes = SAMI.Node.querySelectorAll
        (this._targetDocument, step.select);
    var handler = function () {
      self.executeCommand ("next");
    };
    selectedNodes.forEach (function (node) {
      step.nextEvents.forEach (function (eventType) {
        self._currentObservers.push
            (new SAMI.Observer (eventType, node, handler));
      });
    });

    SAMI.List.getCommonItems (this._currentStepsObjects,
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
              self._prevStateUids = new SAMI.List;
              self._prevPages = new SAMI.List;
            }
            self._states.del (stateName);
          });
        }
      }

      return this[commandName].apply (this, [commandArgs || {}]);
    } else {
      var e = new SAMI.Event ('error');
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
      if (!SAMI.URL.eq (prevPage.url, location.href)) { // TODO: fragment?
        this._saveBackState (true);
        this._states.flushSet ('is-back', true);
        if (SAMI.URL.eq (document.referrer, prevPage.url)) { // TODO: fragment?
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
    var e = new SAMI.Event ('closed');
    this.dispatchEvent (e);
  }, // close

  _loadBackState: function () {
    var self = this;
    this._prevPages = new SAMI.List;
    var bs = this._states.getJSON ('back-state');
    new SAMI.List (bs).forEach (function (b) {
      var i = new SAMI.List (b.stepUids);
      i.url = b.url;
      self._prevPages.push (i);
    });
    if (SAMI.URL.eq ((this._prevPages.getLast () || {}).url, location.href)) { // TODO: fragment?
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
    var e = new SAMI.Event ('cssomready');
    if (window.opera && document.readyState != 'complete') {
      new SAMI.Observer ('readystatechange', document, function () {
        if (document.readyState == 'complete') {
          self.dispatchEvent (e);
        }
      });
    } else {
      this.dispatchEvent (e);
    }
  } // dispatchCSSOMReadyEvent
   
}); // Tutorial

SAMI.Class.addClassMethods (JSTE.Tutorial, {
  createFromURL: function (url, doc, args, onload) {
    JSTE.Course.createFromURL (url, doc, function (course) {
      var tutorial = new JSTE.Tutorial (course, doc, args);
      if (onload) onload (tutorial);
    });
  } // createFromURL
}); // Tutorial class methods

/* --- Onload --- */

if (JSTE.onLoadFunctions) {
  new SAMI.List (JSTE.onLoadFunctions).forEach (function (code) {
    code ();
  });
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
