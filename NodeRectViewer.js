if (!window.NodeRectViewer) window.NodeRectViewer = {};

function setCSSPosition (style, value) {
  if (value == 'fixed') {
    if (!window.opera &&
        /MSIE/.test (navigator.userAgent) &&
        document.compatMode != 'CSS1Compat') {
      style.position = 'absolute';
    } else {
      style.position = value;
    }
  } else {
    style.position = value;
  }
} // setCSSPosition

function update (form) {
  clearHighlight ();
  form.result.value = '';
  var el = uu.css (form.selector.value)[parseInt (form.selectorIndex.value) || 0];
  if (el) {
    NodeRect.Rect.resetIndex ();
    var rect;
    var position = form.coords.value;
    var type = form.prop.value;
    var rectClass = form.trace.checked ? NodeRect.Rect.Trace : null;
    if (type == '') {
      return;
    } else if (type == 'cumulativeOffset') {
      rect = NodeRect.getCumulativeOffsetRect (el, rectClass);
    } else if (type == 'cumulativeClient') {
      rect = NodeRect.getCumulativeClientRect (el, rectClass);
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
    form.result.value = rect.toString ();
    if (form.trace.checked) {
      showTrace (rect, position);
    } else {
      setHighlight (rect, position);
    }

    if (NodeRectViewer.controller) NodeRectViewer.controller.setMaxZIndex ();
  }
} // update

function showTrace (rect, position) {
  if (rect.prevOp === 'add-offset') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'sub-offset') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'add-vector') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'sub-vector') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'in-edge') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'out-edge') {
    showTrace (rect.prev1, position);
    showTrace (rect.prev2, position);
  } else if (rect.prevOp === 'topleft') {
    showTrace (rect.prev1, position);
  } else if (rect.prevOp === 'topleft-negated') {
    showTrace (rect.prev1, position);
  }
  setHighlight (rect, position);
} // showTrace

NodeRectViewer.Box = function (rect, coords /* viewport or canvas */) {
  var self = this;

  var marker = document.createElement ('div');
  this.element = marker;

  setCSSPosition (marker.style, coords == 'viewport' ? 'fixed' : 'absolute');
  
  this.setInitialPosition (rect.getRenderedLeft (), rect.getRenderedTop ());
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
  marker.ondblclick = function () {
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

NodeRectViewer.Box.prototype.setInitialPosition = function (left, top) {
  this.initialLeft = left;
  this.initialTop = top;
  this.setPosition (this.initialLeft, this.initialTop);
}; // setInitialPosition

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

function setHighlight (rect, coords) {
  var marker = new NodeRectViewer.Box (rect, coords);

  document.body.appendChild (marker.element);
  if (!document.highlightElements) document.highlightElements = [];
  document.highlightElements.push (marker.element);
}; // setHighlight

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

function clearHighlight () {
  if (document.highlightElements) {
    for (var i in document.highlightElements) {
      var el = document.highlightElements[i];
      if (el.parentNode) el.parentNode.removeChild (el);
    }
    document.highlightElements = [];
  }
}

function NodeRectOnLoad () {
  if (NodeRectViewer.controller) {
    NodeRectViewer.controller.remove ();
  }

  var vpRects = NodeRect.getViewportRects ();
  var icb = vpRects.icb;

  var wh = NodeRect.Rect.whCSS (document.body, '20em', '11em');
  var controllerRect
      = new NodeRect.Rect
          (0, icb.width, null, null, wh.width, wh.height);
  controllerRect.label = 'NodeRect viewer';

  var controller = new NodeRectViewer.Box (controllerRect, 'viewport');
  controller.element.style.backgroundColor = '#FFCCFF';
  controller.element.style.whiteSpace = 'nowrap';
  controller.isClickable = function (target) {
    return target.form;
  };
  controller.setOpacity = function () {
    this.constructor.prototype.setOpacity.apply (this, [1.0]);
  };

  var cb = ' style="color: green" ';
  controller.element.innerHTML = '<form>\
\
  <textarea name=result style=width:95%;height:6em></textarea>\
  <br>\
\
  <input name=selector title="Target element selector" value=body \
      onchange=update(form) onkeyup=update(form) \
      style=width:14em>\
  <input name=selectorIndex title="Target element index" value=0 \
      onchange=update(form) onkeyup=update(form) \
      style=width:3em>\
  <input type=checkbox name=trace title="Show box chain" onclick=update(form)>\
  <br>\
\
  <button type=button onclick=update(form)>Update</button>\
  <select name=coords title="Layout box(es) with coordinate ..." \
      onchange=update(form)>\
  <option selected value=canvas>Canvas\
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
  <option selected value="borderEdge"' + cb + '>Border edge</option>\
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
  NodeRectViewer.controller = controller;

  controller.setDimension
      (controller.element.offsetWidth, controller.element.offsetHeight);
  controller.setInitialPosition
      (icb.width - controller.width, icb.height - controller.height);

  update (controller.element.firstChild);
} // NodeRectOnLoad

var s = document.createElement ('script');
s.src = "http://uupaa-js.googlecode.com/svn/trunk/uupaa.js";
document.body.appendChild (s);

var s = document.createElement ('script');
s.src = "http://suika.fam.cx/www/css/noderect/NodeRect.js?" + Math.random ();
document.body.appendChild (s);
