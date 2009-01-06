if (!window.NodeRectViewer) window.NodeRectViewer = {};

NodeRectViewer.Box = function (rect, coords, refBox) {
  var self = this;

  var marker = document.createElement ('div');
  this.element = marker;

  var left = rect.getRenderedLeft ();
  var top = rect.getRenderedTop ();

  if (refBox) {
    left += refBox.getSourceLeft ();
    top += refBox.getSourceTop ();
  }

  this.setPositionProperty (coords == 'viewport' ? 'fixed' : 'absolute');
  this.setInitialPosition (left, top);
  this.setMaxZIndex ();

  if (rect instanceof NodeRect.Rect.Vector) {
    this.setBorder (!rect.upward, !rect.leftward, rect.upward, rect.leftward);
  } else {
    this.setBorder (true, true, true, true);
  }

  this.setDimension (rect.width, rect.height);

  this.setColor (rect.index);
  this.setOpacity (0.3);
  this.setLabelColor ('black', 'transparent');

  marker.onmouseover = function () {
    self.setOpacity (0.7);
    self.setLabelColor ('black', 'white');
  };
  marker.onmouseout = function () {
    self.setOpacity (0.3);
    self.setLabelColor ('black', 'transparent');
  };
  marker.onmousedown = function (event) {
    event = event || window.event;
    self.setMaxZIndex ();
    if (!self.isClickable (event.target || event.srcElement)) {
      self.startDrag (event);
    }
  };
  marker.ondblclick = function (event) {
    event = event || window.event;
    if (!self.isClickable (event.target || event.srcElement)) {
      self.setPosition (self.initialLeft, self.initialTop);
    }
  };

  var label = rect.getFullLabel ? rect.getFullLabel () : '';
  this.setDescription (label, rect.toString ());
}; // Box

if (!NodeRectViewer.maxBoxZIndex) NodeRectViewer.maxZIndex = 9999;

NodeRectViewer.Box.prototype.setMaxZIndex = function () {
  this.element.style.zIndex = ++NodeRectViewer.maxZIndex;
}; // setMaxZIndex

NodeRectViewer.Box.prototype.setPositionProperty = function (value) {
  var style = this.element.style;
  if (value == 'fixed') {
    if (document.all && document.compatMode != 'CSS1Compat') {
      style.position = 'absolute';
    } else {
      style.position = value;
    }
  } else {
    style.position = value;
  }
}; // setPositionProperty

NodeRectViewer.Box.prototype.setInitialPosition = function (left, top) {
  this.initialLeft = left;
  this.initialTop = top;
  this.setPosition (this.initialLeft, this.initialTop);
}; // setInitialPosition

NodeRectViewer.Box.prototype.getSourceLeft = function () {
  return this.left;
}; // getSourceLeft

NodeRectViewer.Box.prototype.getSourceTop = function () {
  return this.top;
}; // getSourceTop

NodeRectViewer.Box.prototype.getDestinationLeft = function () {
  return this.left + this.width;
}; // getDestinationLeft

NodeRectViewer.Box.prototype.getDestinationTop = function () {
  return this.top + this.height;
}; // getDestinationTop

NodeRectViewer.Box.prototype.setPosition = function (left, top) {
  if (!isNaN (top + 0)) {
    this.element.style.top = top + 'px';
    this.top = top;
  }
  if (!isNaN (left + 0)) {
    this.element.style.left = left + 'px';
    this.left = left;
  }
}; // setPosition

if (document.all && document.compatMode == 'CSS1Compat') {
  NodeRectViewer.Box.boxSizing = 'content-box';
} else {
  NodeRectViewer.Box.boxSizing = 'border-box';
}

NodeRectViewer.Box.prototype.setDimension = function (w, h) {
  if (w < 0 || (w + 0) != w) w = 0;
  if (h < 0 || (h + 0) != h) h = 0;

  this.width = w;
  this.height = h;

  var ww = w;
  var hh = h;
  if (ww < 20) ww = 20;
  if (hh < 20) hh = 20;

  this.element.style.width = ww + 'px';
  this.element.style.height = hh + 'px';

  var borderEl = this.borderElement;
  if (borderEl) {
    if (NodeRectViewer.Box.boxSizing === 'content-box') {
      var mw = this.borderLeftWidth + this.borderRightWidth;
      var mh = this.borderTopWidth + this.borderBottomWidth;
      if (w < mw) w = mw; else w -= mw;
      if (h < mh) h = mh; else h -= mh;
    }

    borderEl.style.width = w + 'px';
    borderEl.style.height = h + 'px';
  }
}; // setDimension

NodeRectViewer.Box.prototype.setBorder = function (t, r, b, l) {
  var borderEl = this.borderElement;
  if (!borderEl) {
    borderEl = this.element.ownerDocument.createElement ('div');
    borderEl.style.position = 'absolute';
    borderEl.style.top = 0;
    borderEl.style.left = 0;
    borderEl.style.MozBoxSizing = 'border-box';
    borderEl.style.WebkitBoxSizing = 'border-box';
    borderEl.style.boxSizing = 'border-box';
    this.borderElement = borderEl;
    this.element.appendChild (borderEl);
  }

  var bw = 1;
  borderEl.style.border = bw + 'px red none';
  if (t) {
    borderEl.style.borderTopStyle = 'solid';
    this.borderTopWidth = bw;
  } else {
    this.borderTopWidth = 0;
  }
  if (r) {
    borderEl.style.borderRightStyle = 'solid';
    this.borderRightWidth = bw;
  } else {
    this.borderRightWidth = 0;
  }
  if (b) {
    borderEl.style.borderBottomStyle = 'solid';
    this.borderBottomWidth = bw;
  } else {
    this.borderBottomWidth = 0;
  }
  if (l) {
    borderEl.style.borderLeftStyle = 'solid';
    this.borderLeftWidth = bw;
  } else {
    this.borderLeftWidth = 0;
  }
}; // setBorder

NodeRectViewer.Box.colors = ['#FFFFCC', '#FFCCCC', '#CC99FF', '#99CCFF'];

NodeRectViewer.Box.prototype.setColor = function (index) {
  var colors = NodeRectViewer.Box.colors;
  this.element.style.backgroundColor = colors[index % colors.length];
}; // setColor

NodeRectViewer.Box.prototype.setOpacity = function (opacity) {
  this.element.style.opacity = opacity;
  this.element.style.filter = 'alpha(opacity=' + (opacity * 100) + ')';
}; // setOpacity

NodeRectViewer.Box.prototype.setLabelColor = function (fg, bg) {
  var textEl = this.labelElement;
  if (!textEl) return;
  textEl.style.color = fg;
  textEl.style.backgroundColor = bg;
}; // setLabelColor

NodeRectViewer.Box.prototype.setDescription = function (label, desc) {
  this.element.title = "*" + label + "* \n" + desc;

  var textEl = this.labelElement;
  if (textEl) {
    textEl.innerHTML = '';
  } else {
    textEl = this.element.ownerDocument.createElement ('div');
    this.labelElement = textEl;
  }
  textEl.style.position = 'absolute';
  if (!isNaN (this.width)) textEl.style.left = (this.width / 2) + 'px';
  if (!isNaN (this.height)) textEl.style.top = (this.height / 2) + 'px';
  textEl.style.fontSize = '20px';
  textEl.appendChild (textEl.ownerDocument.createTextNode (label));

  this.element.appendChild (textEl);
}; // setDescription

NodeRectViewer.Box.dragging = null;

if (!NodeRectViewer.Box.activeHandlers) NodeRectViewer.Box.activeHandlers = {};

NodeRectViewer.Box.mousemoveHandler = function (event) {
  if (NodeRectViewer.Box.dragging) {
    NodeRectViewer.Box.dragging.handleDrag (event || window.event);
  }
}; // mousemoveHandler

NodeRectViewer.Box.mouseupHandler = function (event) {
  if (NodeRectViewer.Box.dragging) {
    NodeRectViewer.Box.dragging.endDrag (event || window.event);
  }
}; // mouseupHandler

NodeRectViewer.Box.addDragHandlers = function () {
  if (window.addEventListener) {
    if (!NodeRectViewer.Box.activeHandlers.mousemove) {
      window.addEventListener
          ('mousemove', NodeRectViewer.Box.mousemoveHandler, false);
      NodeRectViewer.Box.activeHandlers.mousemove
          = NodeRectViewer.Box.mousemoveHandler;
    }
    if (!NodeRectViewer.Box.activeHandlers.mouseup) {
      window.addEventListener
          ('mouseup', NodeRectViewer.Box.mouseupHandler, false);
      NodeRectViewer.Box.activeHandlers.mouseup
          = NodeRectViewer.Box.mouseupHandler;
    }
  } else if (document.attachEvent) {
    if (!NodeRectViewer.Box.activeHandlers.mousemove) {
      document.attachEvent ('onmousemove', NodeRectViewer.Box.mousemoveHandler);
      NodeRectViewer.Box.activeHandlers.mousemove
          = NodeRectViewer.Box.mousemoveHandler;
    }
   if (!NodeRectViewer.Box.activeHandlers.mouseup) {
      document.attachEvent ('onmouseup', NodeRectViewer.Box.mouseupHandler);
      NodeRectViewer.Box.activeHandlers.mouseup
          = NodeRectViewer.Box.mouseupHandler;
    }
  }
}; // addDragHandlers

NodeRectViewer.Box.removeDragHandlers = function () {
  if (window.removeEventListener) {
    if (NodeRectViewer.Box.activeHandlers.mousemove) {
      window.removeEventListener
          ('mousemove', NodeRectViewer.Box.activeHandlers.mousemove, false);
    }
    if (NodeRectViewer.Box.activeHandlers.mouseup) {
      window.removeEventListener
          ('mouseup', NodeRectViewer.Box.activeHandlers.mouseup, false);
    }
  } else if (document.detachEvent) {
    if (NodeRectViewer.Box.activeHandlers.mousemove) {
      document.detachEvent ('onmousemove', NodeRectViewer.Box.mousemoveHandler);
    }
    if (NodeRectViewer.Box.activeHandlers.mouseup) {
      document.detachEvent ('onmouseup', NodeRectViewer.Box.mouseupHandler);
    }
  }
  NodeRectViewer.Box.activeHandlers.mousemove = null;
  NodeRectViewer.Box.activeHandlers.mouseup = null;
}; // removeDragHandlers

NodeRectViewer.Box.removeDragHandlers ();

NodeRectViewer.Box.prototype.startDrag = function (event) {
  if (NodeRectViewer.Box.dragging) return;
  NodeRectViewer.Box.dragging = this;
  NodeRectViewer.Box.addDragHandlers ();

  this.element.style.cursor = 'move';

  this.dragStartLeft = this.left;
  this.dragStartTop = this.top;
  this.dragStartX = event.clientX;
  this.dragStartY = event.clientY;

  if (event.preventDefault) {
    event.preventDefault ();
  } else {
    event.returnValue = false;
  }
}; // startDrag

NodeRectViewer.Box.prototype.handleDrag = function (event) {
  if (NodeRectViewer.Box.dragging != this) return;

  var diffX = event.clientX - this.dragStartX; 
  var diffY = event.clientY - this.dragStartY;
  this.setPosition (this.dragStartLeft + diffX, this.dragStartTop + diffY);

  if (event.preventDefault) {
    event.preventDefault ();
  } else {
    event.returnValue = false;
  }
}; // handleDrag

NodeRectViewer.Box.prototype.endDrag = function (event) {
  if (NodeRectViewer.Box.dragging != this) return;

  NodeRectViewer.Box.dragging = null;
  NodeRectViewer.Box.removeDragHandlers ();

  this.element.style.cursor = 'default';

  if (event.preventDefault) {
    event.preventDefault ();
  } else {
    event.defaultValue = false;
  }
}; // endDrag

NodeRectViewer.Box.prototype.isClickable = function (target) {
  return false;
}; // isClickable

NodeRectViewer.Box.prototype.remove = function () {
  this.element.parentNode.removeChild (this.element);
}; // remove



NodeRectViewer.Controller = function () {
  var self = this;

  var vpRects = NodeRect.getViewportRects ();
  var icb = vpRects.icb;

  var wh = NodeRect.Rect.whCSS (document.body, '20em', '11em');
  var controllerRect
      = new NodeRect.Rect
          (0, icb.width, null, null, wh.width, wh.height);
  controllerRect.label = 'NodeRect viewer';

  var controller = new NodeRectViewer.Box (controllerRect, 'viewport');
  this.box = controller;
  controller.element.style.backgroundColor = '#FFCCFF';
  controller.element.style.whiteSpace = 'nowrap';
  controller.isClickable = function (target) {
    return target !== self.box.element && target !== self.formElement;
  };
  controller.setOpacity = function () {
    this.constructor.prototype.setOpacity.apply (this, [1.0]);
  };
  controller.setOpacity (1.0);

  var cb = ' style="color: green" ';
  controller.element.innerHTML = '<form onsubmit="return false"><div \
      style="width:98%;height:8em; overflow: auto;\
      border: groove 2px gray;\
      background-color:white;color:black;\
      line-height: 1.1;\
      white-space: pre;\
      white-space: -moz-pre-wrap;\
      white-space: pre-wrap"></div>\
\
\
  <input name=selector title="Target element selector" \
      onkeypress=commandInputChanged(event) \
      style=width:70%>\
  <input type=checkbox name=trace title="Show box chain" onclick=update(form)>\
  <br>\
\
  <button type=button onclick=update(form)>Update</button>\
  <select name=coords title="Layout box(es) with coordinate ..." \
      onchange=update(form)>\
  <option value=canvas>Canvas\
  <option value=viewport>Viewport\
  </select>\
\
  <select name=prop title="Show box(es) of ..." onchange=update(form)>\
\
  <optgroup label="Element coordinate">\
  <option value=offset title="offset* attributes">offset\
  <option value=client title="client* attributes">client\
  <option value=scrollableArea title="scroll* attributes">scroll (width/height)\
  <option value=scrollState title="scroll* attributes">scroll (top/left)\
\
  <optgroup label="Viewport coordinate">\
  <option value="boundingClient">getBoundingClientRect</option>\
\
  <optgroup label="Canvas coordinate">\
  <option value="marginEdge"' + cb + '>Margin edge</option>\
  <option value="borderEdge"' + cb + '>Border edge</option>\
  <option value="cumulativeOffset">Cumulative offset</option>\
  <option value="paddingEdge">Padding edge</option>\
  <option value="cumulativeClient">Cumulative client</option>\
  <option value=boxObject>getBoxObjectFor\
\
  <optgroup label="Screen coordinate">\
  <option value=boxObjectScreen>getBoxObjectFor.screen\
\
  </optgroup><option value>----------\
\
  <optgroup label="Box">\
  <option value="margin">margin</option>\
  <option value="border">border</option>\
  <option value="padding">padding</option>\
\
  <optgroup label=Canvas>\
  <option value=vp.canvasOrigin' + cb + '>Origin of canvas\
\
  <optgroup label=Viewport>\
  <option value=vp.contentBox' + cb + '>Content box\
  <option value=vp.icb' + cb + '>Initial containing block\
  <option value=vp.scrollState' + cb + '>Scroll state\
  <option value=vp.windowScrollXY>Scroll (x, y)\
  <option value=vp.windowPageOffset>Page offset\
  <option value=vp.windowScrollMax>Scroll maximum\
  <option value=vp.windowInner>Window inner\
  <option value=vp.boundingClientOrigin' + cb + '>Origin of getBoundingClientRect\
\
  <option value=vp.document>Document\
  <option value=vp.deOffset>documentElement.offset\
  <option value=vp.deClient>documentElement.client\
  <option value=vp.deScrollableArea>documentElement.scroll (width, height)\
  <option value=vp.deScrollState>documentElement.scroll (top, left)\
  <option value=vp.bodyOffset>document.body.offset\
  <option value=vp.bodyClient>document.body.client\
  <option value=vp.bodyScrollableArea>document.body.scroll (width, height)\
  <option value=vp.bodyScrollState>document.body.scroll (top, left)\
\
  <optgroup label=Window>\
  <option value=win.outer>Window outer\
  <option value=win.screenXY>Screen (x, y)\
  <option value=win.screenTL>Screen (top, left)\
\
  <optgroup label=Screen>\
  <option value=screen.device' + cb + '>Device\
  <option value=screen.avail' + cb + '>Available\
\
  </select>\
  </form>';
  
  controller.element.style.width = 'auto';
  controller.element.style.height = 'auto';
  document.body.appendChild (controller.element);

  controller.setDimension
      (controller.element.offsetWidth, controller.element.offsetHeight);
  controller.setInitialPosition
      (icb.width - controller.width, icb.height - controller.height);

  this.formElement = controller.element.firstChild;

  this.logElement = this.formElement.firstChild;

  this.formElement.update = function (form) {
    self.updateProps (form);
    self.update ();
  };
  this.formElement.commandInputChanged = function (event) {
    if (event.keyCode == 13 || event.keyCode == 10) {
      self.invokeCommand (self.formElement.selector.value);
      self.formElement.selector.value = '';
      if (event.preventDefault) event.preventDefault ();
      event.returnValue = false;
    }
  };


  this.selectorIndex = 0;
  this.boxType = 'borderEdge';
  this.boxCoord = 'canvas';
  this.showChain = false;
  this.selector = 'body';
  this.addInputLog ('selector = body');
  this.updateForm ();
  this.update ();

  this.formElement.selector.focus ();
}; // Controller

NodeRectViewer.Controller.prototype.remove = function () {
  this.clearHighlight ();
  this.box.remove ();
}; // remove

NodeRectViewer.Controller.prototype.updateForm = function () {
  var form = this.formElement;
  form.prop.value = this.boxType;
  form.coords.value = this.boxCoord;
  form.trace.checked = this.showChain;
}; // updateForm

NodeRectViewer.Controller.prototype.updateProps = function (form) {
  var newBoxType = form.prop.value;
  if (newBoxType != this.boxType) {
    this.boxType = newBoxType;
    this.addInputLog ("boxType = " + newBoxType);
  }

  var newShowChain = form.trace.checked;
  if (this.showChain != newShowChain) {
    this.showChain = newShowChain;
    this.addInputLog ('showChain = ' + newShowChain);
  }

  var newBoxCoord = form.coords.value;
  if (newBoxCoord != this.boxCoord) {
    this.boxCoord = newBoxCoord;
    this.addInputLog ('boxCoord = ' + newBoxCoord);
  }
}; // updateProps

NodeRectViewer.Controller.prototype.update = function () {
  this.clearHighlight ();

  var el = uu.css (this.selector)[this.selectorIndex];
  if (el) {
    NodeRect.Rect.resetIndex ();
    var rect;
    var position = this.boxCoord;
    var type = this.boxType;
    if (type == '') {
      return;
    } else if (type == 'cumulativeOffset') {
      rect = NodeRect.getCumulativeOffsetRect (el);
    } else if (type == 'cumulativeClient') {
      rect = NodeRect.getCumulativeClientRect (el);
    } else if (type.substring (0, 3) === 'vp.') {
      var rects = NodeRect.getViewportRects (window);
      rect = rects[type.substring (3)];
    } else if (type.substring (0, 4) === 'win.') {
      var rects = NodeRect.getWindowRects (window);
      rect = rects[type.substring (4)];
    } else if (type.substring (0, 7) === 'screen.') {
      var rects = NodeRect.getScreenRects (window);
      rect = rects[type.substring (7)];
    } else {
      var rects = NodeRect.getElementRects (el);
      rect = rects[type];
    }

    if (!rect) {
      rect = NodeRect.Rect.nosupport ();
    }

    this.addOutputLog (rect.toString ());

    if (this.showChain) {
      this.showTrace (rect, position);
    } else {
      this.setHighlight (rect, position);
    }

    this.box.setMaxZIndex ();
  }
}; // update

NodeRectViewer.Controller.prototype.invokeCommand = function (commandStr) {
  var command = {};
  var m;
  if (m = commandStr.match (/^\s*([a-zA-Z0-9]+)\s*=\s*(\S+)\s*$/)) {
    command.type = m[1];
    command.arg = m[2];
  } else if (commandStr.match (/^\s*clear\s*$/)) {
    command.type = 'clear';
  } else {
    command.type = 'selector';
    command.arg = commandStr;
  }

  if (command.type === 'boxType' ||
      command.type === 'boxCoord') {
    this[command.type] = command.arg;
    this.addInputLog (command.type + ' = ' + this[command.type]);
    this.updateForm ();
    this.update (this.formElement);
  } else if (command.type === 'selectorIndex') {
    this[command.type] = parseInt (command.arg) || 0;
    this.addInputLog (command.type + ' = ' + this[command.type]);
    this.updateForm ();
    this.update (this.formElement);
  } else if (command.type === 'showChain') {
    this[command.type] = command.arg && command.arg != "false" ? true : false;
    this.addInputLog (command.type + ' = ' + this[command.type]);
    this.updateForm ();
    this.update (this.formElement);
  } else if (command.type === 'selector') {
    this.selector = command.arg;
    this.addInputLog (command.type + ' = ' + this[command.type]);
    this.update (this.formElement);
  } else if (command.type === 'clear') {
    this.logElement.innerHTML = '';
  } else {
    this.addOutputLog (command.type + ': Command not found');
  }
}; // invokeCommand

NodeRectViewer.Controller.prototype.addInputLog = function (s) {
  var doc = this.logElement.ownerDocument;
  var entryEl = doc.createElement ('div');
  entryEl.style.color = 'blue';
  entryEl.appendChild (doc.createTextNode ('> ' + s));
  this.logElement.appendChild (entryEl);
  this.logElement.scrollTop = this.logElement.scrollHeight;
}; // addInputLog

NodeRectViewer.Controller.prototype.addOutputLog = function (s) {
  var doc = this.logElement.ownerDocument;
  var entryEl = doc.createElement ('div');
  var lines = s.split (/\r?\n/); // to avoid IE bug
  for (var i = 0; i < lines.length; i++) {
    entryEl.appendChild (doc.createTextNode (lines[i]));
    entryEl.appendChild (doc.createElement ('br'));
  }
  this.logElement.appendChild (entryEl);
  this.logElement.scrollTop = this.logElement.scrollHeight;
}; // addOutputLog

NodeRectViewer.Controller.prototype.showTrace =
function (rect, position, refBox) {
  if (rect.prevOp === 'add-offset') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'sub-offset') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'add-vector') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'sub-vector') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'and') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'in-edge') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'out-edge') {
    var b1 = this.showTrace (rect.prev1, position);
    this.showTrace (rect.prev2, position, b1);
  } else if (rect.prevOp === 'topleft') {
    this.showTrace (rect.prev1, position);
  } else if (rect.prevOp === 'topleft-negated') {
    this.showTrace (rect.prev1, position);
  }

  return this.setHighlight (rect, position, refBox);
}; // showTrace

NodeRectViewer.Controller.prototype.setHighlight =
function (rect, coords, refBox) {
  var marker = new NodeRectViewer.Box (rect, coords, refBox);

  document.body.appendChild (marker.element);
  if (!this.highlightElements) this.highlightElements = [];
  this.highlightElements.push (marker.element);

  return marker;
}; // setHighlight

NodeRectViewer.Controller.prototype.clearHighlight = function () {
  if (this.highlightElements) {
    for (var i in this.highlightElements) {
      var el = this.highlightElements[i];
      if (el.parentNode) el.parentNode.removeChild (el);
    }
    this.highlightElements = [];
  }
}; // clearHighlight

function NodeRectOnLoad () {
  if (NodeRectViewer.controller) {
    NodeRectViewer.controller.remove ();
  }

  NodeRectViewer.controller = new NodeRectViewer.Controller ();
} // NodeRectOnLoad

var s = document.createElement ('script');
s.src = "http://uupaa-js.googlecode.com/svn/trunk/uupaa.js";
document.body.appendChild (s);

var s = document.createElement ('script');
s.src = "http://suika.fam.cx/www/css/noderect/NodeRect.js?" + Math.random ();
document.body.appendChild (s);
