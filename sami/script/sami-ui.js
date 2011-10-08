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

/* ------ Drag and drop ------ */

SAMI.DND = new SAMI.Class (function (el, opts) {
  if (typeof (document.body.draggable) != 'undefined') {
    return new SAMI.DND.Native (el, opts);
  } else {
    return new SAMI.DND.Emulated (el, opts);
  }
}); // DND

SAMI.Class.addClassMethods (SAMI.DND, {
  Base: {},

  /* Common dragenter/dragover configurations */
  CHOOSE_BOX: {
    ondragenter: function (el, ds, oldPointed, newPointed, opts) {
      if (newPointed) {
        var rect = NR.Element.getRects (newPointed, window).borderBox;
        ds.setDropGuide ({rect: rect});
      } else if (oldPointed) {
        ds.hideDropGuide ();
      }
    }, // ondragenter
    ondragover: null
  }, // CHOOSE_BOX
  CHOOSE_LEFT_RIGHT: {
    ondragenter: function (el, ds, oldPointed, newPointed, opts) {
      if (newPointed) {
        var rect = NR.Element.getRects (newPointed, window).borderBox;
        ds.setDropGuide ({
          rect: rect,
          classNames: (ds.pointingLeftHalfOf (newPointed) ? 'sami-dnd-left' : 'sami-dnd-right')
        });
      } else if (oldPointed) {
        ds.hideDropGuide ();
      }
    }, // ondragenter
    ondragover: function (el, ds, pointed, opts) {
      ds.setDropGuide ({
        classNames: (ds.pointingLeftHalfOf (pointed) ? 'sami-dnd-left' : 'sami-dnd-right')
      });
    } // ondragover
  }, // CHOOSE_LEFT_RIGHT
  CHOOSE_TOP_BOTTOM: {
    ondragenter: function (el, ds, oldPointed, newPointed, opts) {
      if (newPointed) {
        var rect = NR.Element.getRects (newPointed, window).borderBox;
        ds.setDropGuide ({
          rect: rect,
          classNames: (ds.pointingUpperHalfOf (newPointed) ? 'sami-dnd-top' : 'sami-dnd-bottom')
        });
      } else if (oldPointed) {
        ds.hideDropGuide ();
      }
    }, // ondragenter
    ondragover: function (el, ds, pointed, opts) {
      ds.setDropGuide ({
        classNames: (ds.pointingUpperHalfOf (pointed) ? 'sami-dnd-top' : 'sami-dnd-bottom')
      });
    } // ondragover
  }, // CHOOSE_TOP_BOTTOM

  CHOOSE_DROPZONE: {
    determineDropTarget: function (dropzone, eventTarget) {
      return dropzone;
    }, // determineDropTarget
  }, // CHOOSE_DROPZONE
  CHOOSE_BY_CLASSNAME: function (className) {
    return {
      determineDropTarget: function (dropzone, eventTarget) {
        while (eventTarget) {
          if (SAMI.Element.hasClassName (eventTarget, className)) {
            return eventTarget;
          }
          if (eventTarget == dropzone) return null;
          eventTarget = eventTarget.parentNode;
        }
        return null;
      } // determineDropTarget
    };
  } // CHOOSE_BY_CLASSNAME
}); // SAMI.DND class methods

SAMI.DND.Native = new SAMI.Class (function (el, opts) {
  this.targetElement = el;
  el.draggable = true;
  this.ondragstart = opts.ondragstart;
  this.ondragenter = opts.ondragenter;
  this.ondragover = opts.ondragover;
  this.ondrop = opts.ondrop;
  this.setDNDEvents ();
}, {
  setDNDEvents: function () {
    var self = this;
    var el = this.targetElement;
    new SAMI.Observer (el, 'dragstart', function (event) {
      SAMI.Element.addClassName (self.targetElement, 'sami-dnd-active');
      event.dataTransfer.setData ('application/x-sami-dnd-flag', 1);
      self.lastDragState = new SAMI.DND.Native.DragState (event.dataTransfer);
      self.dispatchDragstart (event.target, self.lastDragState);
    });
    new SAMI.Observer (el, 'dragend', function (event) {
      var ds = self.lastDragState;
      if (ds) {
        ds.setPointedElement (null, function (oldEl, newEl) {
          self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
        });
        SAMI.Element.deleteClassName (self.targetElement, 'sami-dnd-active');
        ds.discard ();
        delete self.lastDragState;
      }
    });
  }, // setDNDEvents

  addDropzone: function (dropzone, params, determineDropTarget) {
    var self = this;
    determineDropTarget = determineDropTarget || SAMI.DND.CHOOSE_DROPZONE.determineDropTarget;
    new SAMI.Observer (dropzone, 'dragenter', function (event) {
      var ds = self.lastDragState;
      if (ds) {
        var vector = NR.Event.getRects (event, window).client;
        ds.setVector (vector);
        var pointed = event.target;
        while (pointed && pointed.nodeType != 1) {
          pointed = pointed.parentNode;
        }
        if (!pointed) return;
        pointed = determineDropTarget (dropzone, pointed);
        ds.setPointedElement (pointed, function (oldEl, newEl) {
          self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, params);
        });
      }
      event.preventDefault ();
    });
    new SAMI.Observer (dropzone, 'dragleave', function (event) {
      var ds = self.lastDragState;
      if (ds) {
        if (event.target != ds.pointedElement) return;
        ds.setPointedElement (null, function (oldEl, newEl) {
          self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
        });
      }
    });
    new SAMI.Observer (dropzone, 'dragover', function (event) {
      var ds = self.lastDragState;
      if (ds) {
        var vector = NR.Event.getRects (event, window).client;
        ds.setVector (vector);
        var target = determineDropTarget (dropzone, event.target);
        if (target) {
          self.dispatchDragover (self.targetElement, ds, target, params);
        }
        event.preventDefault ();
      }
    });
    new SAMI.Observer (dropzone, 'drop', function (event) {
      var ds = self.lastDragState;
      if (ds) {
        ds.setDataTransfer (event.dataTransfer);

        ds.setPointedElement (null, function (oldEl, newEl) {
          self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
        });

        var target = determineDropTarget (dropzone, event.target);
        if (target) {
          self.dispatchDrop (self.targetElement, ds, target, params);
        }
      }
    });
  }, // addDropzone

  dispatchDragstart: function (el, ds) {
    var code = this.ondragstart;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragstart
  dispatchDragenter: function () {
    var code = this.ondragenter;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragenter
  dispatchDragover: function () {
    var code = this.ondragover;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragover
  dispatchDrop: function (el, ds) {
    var code = this.ondrop;
    if (code) {
      code.apply (this, arguments);
    }
  } // dispatchDragstart
}); // Native

SAMI.DND.Emulated = new SAMI.Class (function (el, opts) {
  this.targetElement = el;
  this.ondragstart = opts.ondragstart;
  this.ondragenter = opts.ondragenter;
  this.ondragover = opts.ondragover;
  this.ondrop = opts.ondrop;
  this.dragStates = {};
  this.setMouseEvents ();
}, {
  setMouseEvents: function () {
    var self = this;
    var el = this.targetElement;
    var noselect = new SAMI.Observer (document, 'selectstart', function (event) {
      event.returnValue = false;
    }, {disabled: true});
    new SAMI.Observer (el, 'mousedown', function (event) {
      var ds = new SAMI.DND.Emulated.DragState (
        NR.Element.getRects (el, window).borderBox,
        NR.Event.getRects (event, window).client
      );
      self.dragStates['mouse'] = ds;
      ds.showDragGuide ();

      SAMI.Element.addClassName (el, 'sami-dnd-active');

      var ev = new SAMI.Event.Browser (event);
      ev.preventDefault (); // Non-IE

      self.dispatchDragstart(el, ds);
      noselect.start ();
    });
    new SAMI.Observer (document, 'mousemove', function (event) {
      var ds = self.dragStates['mouse'];
      if (ds) {
        var vector = NR.Event.getRects (event, window).client;
        ds.setVector (vector);
        if (Math.random () < 0.3 && self.ondragenter) {
          ds.hideGuides ();
          var pointed = SAMI.Viewport.top.getElementFromVector (vector);
          ds.restoreGuides ();
          if (pointed) {
            var invoked = false;
            var ev = new SAMI.Event.Browser.Custom ({
              type: 'samiDragenterEmulated',
              bubbles: true,
              args: {dragState: ds, invoked: function () { invoked = true }}
            });
            ev.fireOn (pointed);
            if (!invoked) {
              ds.setPointedElement (null, function (oldEl, newEl) {
                self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
              });
            }
          } else {
            ds.setPointedElement (null, function (oldEl, newEl) {
              self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
            });
          }
        }
      }
    });
    new SAMI.Observer (document, 'mouseup', function (event) {
      var ds = self.dragStates['mouse'];
      if (ds) {
        var vector = NR.Event.getRects (event, window).client;
        ds.hideGuides ();
        var el = SAMI.Viewport.top.getElementFromVector (vector);

        ds.setPointedElement (null, function (oldEl, newEl) {
          self.dispatchDragenter (el, ds, oldEl, newEl, null);
        });

        var ev = new SAMI.Event.Browser.Custom ({
          type: 'samiDroppedEmulated',
          bubbles: true,
          args: {dragState: ds}
        });
        ev.fireOn (el);

        SAMI.Element.deleteClassName (self.targetElement, 'sami-dnd-active');
        ds.discard ();
        delete self.dragStates['mouse'];
        noselect.stop ();
      }
    });
  }, // setMouseEvents

  addDropzone: function (dropzone, params, determineDropTarget) {
    var self = this;
    var el = this.targetElement;
    determineDropTarget = determineDropTarget || SAMI.DND.CHOOSE_DROPZONE.determineDropTarget;
    new SAMI.Observer.Custom (dropzone, 'samiDragenterEmulated', function (event) {
      event.invoked ();
      var ds = event.dragState;
      var target = determineDropTarget (dropzone, event.target || event.srcElement);
      ds.setPointedElement (target, function (oldEl, newEl) {
        self.dispatchDragenter (el, ds, oldEl, newEl, params);
      }, function (newEl) {
        self.dispatchDragover (el, ds, newEl, params);
      });
    });
    new SAMI.Observer.Custom (dropzone, 'samiDroppedEmulated', function (event) {
      var target = determineDropTarget (dropzone, event.target || event.srcElement);
      if (target) {
        self.dispatchDrop(el, event.dragState, target, params);
      }
    });
  }, // addDropzone

  dispatchDragstart: function () {
    var code = this.ondragstart;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragstart
  dispatchDragenter: function () {
    var code = this.ondragenter;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragenter
  dispatchDragover: function () {
    var code = this.ondragover;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragover
  dispatchDrop: function () {
    var code = this.ondrop;
    if (code) {
      code.apply (this, arguments);
    }
  } // dispatchDragstart
}); // Emulated

SAMI.DND.Emulated.Touch = new SAMI.Class (function (el, opts) {
  this.targetElement = el;
  this.ondragstart = opts.ondragstart;
  this.ondragenter = opts.ondragenter;
  this.ondragover = opts.ondragover;
  this.ondrop = opts.ondrop;
  this.dragStates = {};
  this.setMouseEvents ();
}, {
  setMouseEvents: function () {
    var self = this;
    var el = this.targetElement;
    var noselect = new SAMI.Observer (document, 'selectstart', function (event) {
      event.returnValue = false;
    }, {disabled: true});
    new SAMI.Observer (el, 'touchstart', function (event) {
      var ds = new SAMI.DND.Emulated.DragState (
        NR.Element.getRects (el, window).borderBox,
        NR.Event.getRects (event.touches[0], window).client
      );
      self.dragStates['mouse'] = ds;
      ds.showDragGuide ();

      SAMI.Element.addClassName (el, 'sami-dnd-active');

      var ev = new SAMI.Event.Browser (event);
      ev.preventDefault (); // Non-IE

      self.dispatchDragstart(el, ds);
      noselect.start ();
    });
    new SAMI.Observer (document, 'touchmove', function (event) {
      var ds = self.dragStates['mouse'];
      if (ds) {
        var vector = NR.Event.getRects (event.touches[0], window).client;
        ds.setVector (vector);
        if (Math.random () < 0.3 && self.ondragenter) {
          ds.hideGuides ();
          var pointed = SAMI.Viewport.top.getElementFromVector (vector);
          ds.restoreGuides ();
          if (pointed) {
            var invoked = false;
            var ev = new SAMI.Event.Browser.Custom ({
              type: 'samiDragenterEmulated',
              bubbles: true,
              args: {dragState: ds, invoked: function () { invoked = true }}
            });
            ev.fireOn (pointed);
            if (!invoked) {
              ds.setPointedElement (null, function (oldEl, newEl) {
                self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
              });
            }
          } else {
            ds.setPointedElement (null, function (oldEl, newEl) {
              self.dispatchDragenter (self.targetElement, ds, oldEl, newEl, null);
            });
          }
        }
      }
    });
    new SAMI.Observer (document, 'touchend', function (event) {
      var ds = self.dragStates['mouse'];
      if (ds) {
        var vector = event.touches.length ? NR.Event.getRects (event.touches[0], window).client : ds.getVector();
        ds.hideGuides ();
        var el = SAMI.Viewport.top.getElementFromVector (vector);

        ds.setPointedElement (null, function (oldEl, newEl) {
          self.dispatchDragenter (el, ds, oldEl, newEl, null);
        });

        var ev = new SAMI.Event.Browser.Custom ({
          type: 'samiDroppedEmulated',
          bubbles: true,
          args: {dragState: ds, samiDND: self}
        });
        ev.fireOn (el);

        SAMI.Element.deleteClassName (self.targetElement, 'sami-dnd-active');
        ds.discard ();
        delete self.dragStates['mouse'];
        noselect.stop ();
      }
    });
  }, // setMouseEvents

  addDropzone: function (dropzone, params, determineDropTarget) {
    var self = this;
    var el = this.targetElement;
    determineDropTarget = determineDropTarget || SAMI.DND.CHOOSE_DROPZONE.determineDropTarget;
    new SAMI.Observer.Custom (dropzone, 'samiDragenterEmulated', function (event) {
      event.invoked ();
      var ds = event.dragState;
      var target = determineDropTarget (dropzone, event.target || event.srcElement);
      ds.setPointedElement (target, function (oldEl, newEl) {
        self.dispatchDragenter (el, ds, oldEl, newEl, params);
      }, function (newEl) {
        self.dispatchDragover (el, ds, newEl, params);
      });
    });
    new SAMI.Observer.Custom (dropzone, 'samiDroppedEmulated', function (event) {
      if (event.samiDND != self) return;
      var target = determineDropTarget (dropzone, event.target || event.srcElement);
      if (target) {
        self.dispatchDrop(el, event.dragState, target, params);
      }
    });
  }, // addDropzone

  dispatchDragstart: function () {
    var code = this.ondragstart;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragstart
  dispatchDragenter: function () {
    var code = this.ondragenter;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragenter
  dispatchDragover: function () {
    var code = this.ondragover;
    if (code) {
      code.apply (this, arguments);
    }
  }, // dispatchDragover
  dispatchDrop: function () {
    var code = this.ondrop;
    if (code) {
      code.apply (this, arguments);
    }
  } // dispatchDragstart
}); // Emulated.Touch

SAMI.DND.Base.DragState = new SAMI.Class (function () {

}, {
  setDropGuide: function (opts) {
    var box = this.dropGuide;
    if (!box) {
      box = new SAMI.Box ({
        rect: opts.rect,
        classNames: 'sami-dnd-drop-guide'
      });
      this.dropGuide = box;
    } else if (opts.rect) {
      box.setInitialRect (opts.rect);
    }
    if (opts.classNames) box.applyClassNamesDiff (opts.classNames);
    box.show ();
  }, // setDropGuide
  hideDropGuide: function (opts) {
    var box = this.dropGuide;
    if (box) {
      box.hide ();
    }
  }, // hideDropGuide

  hideGuides: function () {
    if (this.dragGuide) this.dragGuide.hide ();
    if (this.dropGuide) this.dropGuide.hide ();
  }, // hideGuides
  restoreGuides: function () {
    if (this.dragGuide) this.dragGuide.restore ();
    if (this.dropGuide) this.dropGuide.restore ();
  }, // restoreGuides

  setPointedElement: function (newElement, enterCode, overCode) {
    if (this.pointedElement != newElement) {
      var oldElement = this.pointedElement;
      this.pointedElement = newElement;
      if (enterCode) {
        enterCode.apply (this, [oldElement, newElement]);
      }
      return true;
    } else if (newElement) {
      if (overCode) {
        overCode.apply (this, [newElement]);
      }
      return false;
    } else {
      return false;
    }
  }, // setPointedElement

  getVector: function () {
    return this.currentVector; // or |null|
  }, // getVector
  setVector: function (currentVector) {
    this.currentVector = currentVector;
  }, // setVector

  pointingUpperHalfOf: function (el) {
    var vector = this.getVector ();
    var rect = NR.Element.getRects (el, window).borderBox;
    return (vector.y < rect.top + rect.height / 2);
  }, // pointingUpperHalfOf
  pointingLeftHalfOf: function (el) {
    var vector = this.getVector ();
    var rect = NR.Element.getRects (el, window).borderBox;
    return (vector.x < rect.left + rect.width / 2);
  }, // pointingLeftHalfOf

  discard: function () {
    if (this.dragGuide) this.dragGuide.discard ();
    if (this.dropGuide) this.dropGuide.discard ();
  } // discard
}); // DragState

SAMI.DND.Native.DragState = new SAMI.Subclass (function (dataTransfer) {
  this.dataTransfer = dataTransfer;
}, SAMI.DND.Base.DragState, {
  setDataTransfer: function (dt) {
    this.dataTransfer = dt;
  }, // setDataTransfer

  getData: function () {
    var json = this.dataTransfer.getData ('application/x-sami-dnd+json');
    if (json) {
      return SAMI.JSON.parse (json);
    } else if (this.samiApplicationData) {
      return SAMI.JSON.parse (this.samiApplicationData);
    }
  }, // getData
  setData: function (newData) {
    var json = SAMI.JSON.stringify (newData);
    this.dataTransfer.setData ('application/x-sami-dnd+json', json);
    var json2 = this.dataTransfer.getData ('application/x-sami-dnd+json');
    if (json != json2) { // WebKit's impl is broken at the moment
      this.samiApplicationData = json;
    }
  } // setData
}); // DragState

SAMI.DND.Emulated.DragState = new SAMI.Subclass (function (draggedRect, initialVector) {
  this.draggedRect = draggedRect;
  this.initialVector = initialVector;
}, SAMI.DND.Base.DragState, {
  showDragGuide: function () {
    var box = new SAMI.Box ({
      rect: this.draggedRect,
      classNames: 'sami-dnd-drag-guide'
    });
    box.show ();
    this.dragGuide = box;
  }, // createDragGuide

  getVector: function () {
    return this.currentVector || this.initialVector;
  }, // getVector
  setVector: function (currentVector) {
    this.currentVector = currentVector;
    var box = this.dragGuide;
    if (box) {
      var diff = currentVector.subtract (this.initialVector);
      box.applyPositionDiff (diff);
    }
  }, // setVector

  getData: function () {
    return this.data;
  }, // getData
  setData: function (newData) {
    this.data = newData;
  } // setData
}); // DragState

/* ------ Onload ------ */

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
