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

  this.initialLeft = rect.getRenderedLeft ();
  this.initialTop = rect.getRenderedTop ();
  this.width = rect.width;
  this.height = rect.height;

  var marker = document.createElement ('div');
  this.element = marker;

  setCSSPosition (marker.style, coords == 'viewport' ? 'fixed' : 'absolute');
  
  this.setPosition (this.initialLeft, this.initialTop);
  this.setMaxZIndex ();

  var bw = 1;
  var diff = 0;
  if (document.all && document.compatMode == 'CSS1Compat') diff = bw * 2;
  if (rect.width >= 0) {
    if (rect.width - diff > 0) {
      marker.style.width = (rect.width - diff) + 'px';
    } else {
      marker.style.height = rect.width + 'px';
    }
  }
  if (rect.height >= 0) {
    if (rect.height - diff > 0) {
      marker.style.height = (rect.height - diff) + 'px';
    } else {
      marker.style.height = rect.height + 'px';
    }
  }
  marker.style.MozBoxSizing = 'border-box';
  marker.style.WebkitBoxSizing = 'border-box';
  marker.style.boxSizing = 'border-box';
  marker.style.border = bw + 'px solid red';
  if (rect instanceof NodeRect.Rect.Vector) {
    marker.style[rect.leftward ? 'borderRightStyle' : 'borderLeftStyle']
        = 'dotted';
    marker.style[rect.upward ? 'borderTopStyle' : 'borderBottomStyle']
        = 'dotted';
  }
  var colors = ['#FFFFCC', '#FFCCCC', '#CC99FF', '#99CCFF'];
  marker.style.backgroundColor = colors[rect.index % colors.length];
  marker.style.opacity = 0.3;
  marker.style.filter = 'alpha(opacity=30)';
  marker.onmouseover = function () {
    this.style.opacity = 0.7;
    this.style.filter = 'alpha(opacity=70)';
    this.firstChild.style.backgroundColor = 'white';
  };
  marker.onmouseout = function () {
    this.style.opacity = 0.3;
    this.style.filter = 'alpha(opacity=30)';
    this.firstChild.style.backgroundColor = 'transparent';
  };
  marker.onmousedown = function (event) {
    self.setMaxZIndex ();
    self.startDrag (event || window.event);
  };
  marker.ondblclick = function () {
    self.setPosition (self.initialLeft, self.initialTop);
  };

  var label = rect.getFullLabel ? rect.getFullLabel () : '';
  this.setDescription (label, rect.toString ());
}; // Box

if (!NodeRectViewer.maxBoxZIndex) NodeRectViewer.maxZIndex = 9999;

NodeRectViewer.Box.prototype.setMaxZIndex = function () {
  this.element.style.zIndex = ++NodeRectViewer.maxZIndex;
}; // setMaxZIndex

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

NodeRectViewer.Box.prototype.setDescription = function (label, desc) {
  this.element.innerHTML = '';

  this.element.title = "*" + label + "* \n" + desc;

  var textEl = this.element.ownerDocument.createElement ('div');
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
  var controller = document.createElement ('article');
  controller.style.display = 'block';
  setCSSPosition (controller.style, 'fixed');
  controller.style.right = 0;
  controller.style.bottom = 0;
  controller.style.backgroundColor = '#FFCCFF';
  controller.style.zIndex = '99999999';
  var cb = ' style="color: green" ';
  controller.innerHTML = '<form>\
  <textarea name=result style="width: 20em; height: 8em"></textarea><br>\
  <input name=selector value="body" onchange=" update(form) " onkeyup=" update(form) " style="width: 15em">\
  <input name=selectorIndex value=0 onchange=update(form) onkeyup=update(form) style=width:3em>\
  <input type=checkbox name=trace title="Show chain" onclick=update(form)>\
  <br>\
  <button type=button onclick=update(form)>update</button>\
  <select name=coords onchange=update(form)>\
  <option selected value=canvas>Canvas\
  <option value=viewport>Viewport</select>\
  <select name=prop onchange=update(form)>\
\
  <optgroup label="Element coordinate">\
  <option value="offset">offset</option>\
  <option value="client">client</option>\
  <option value="scrollableArea">scroll (width, height)\
  <option value="scrollState">scroll (top, left)\
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
  <option value="contentEdge">Content edge</option>\
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
  
  document.body.appendChild (controller);
  update (controller.firstChild);
} // NodeRectOnLoad

var s = document.createElement ('script');
s.src = "http://uupaa-js.googlecode.com/svn/trunk/uupaa.js";
document.body.appendChild (s);

var s = document.createElement ('script');
s.src = "http://suika.fam.cx/www/css/noderect/NodeRect.js?" + Math.random ();
document.body.appendChild (s);
