if (!window.NodeRectViewer) window.NodeRectViewer = {};

NodeRectViewer.Box = function (rect, coords, refBox) {
  var self = this;

  var marker = document.createElement ('div');
  this.element = marker;

  marker.style.margin = 0;
  marker.style.borderWidth = 0;
  marker.style.padding = 0;

  var left = rect.getRenderedLeft ();
  var top = rect.getRenderedTop ();

  if (refBox) {
    left += refBox.getSourceLeft ();
    top += refBox.getSourceTop ();
  }

  this.setPositionProperty (coords == 'viewport' ? 'fixed' : 'absolute');
  this.setInitialPosition (left, top);
  this.setMaxZIndex ();

  if (rect instanceof NR.Vector) {
    this.setBorder (rect.y < 0, rect.x < 0, rect.y >= 0, rect.x >= 0);
  } else {
    this.setBorder (true, true, true, true);
  }

  this.setDimension (rect.getRenderedWidth (), rect.getRenderedHeight ());

  this.sourceLeft = this.left;
  this.sourceTop = this.top;
  this.destLeft = this.left + this.width;
  this.destTop = this.top + this.height;

  if (rect instanceof NR.Vector) {
    if (rect.x < 0) {
      this.sourceLeft = this.left + this.width;
      this.destLeft = this.left;
    }
    if (rect.y < 0) {
      this.sourceTop = this.top + this.height;
      this.destTop = this.top;
    }
    this.addArrow (this.getSourceLeft (), this.getSourceTop (),
                   this.getDestinationLeft (), this.getDestinationTop ());
  }

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
  return this.sourceLeft;
}; // getSourceLeft

NodeRectViewer.Box.prototype.getSourceTop = function () {
  return this.sourceTop;
}; // getSourceTop

NodeRectViewer.Box.prototype.getDestinationLeft = function () {
  return this.destLeft;
}; // getDestinationLeft

NodeRectViewer.Box.prototype.getDestinationTop = function () {
  return this.destTop;
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
    borderEl.style.margin = 0;
    borderEl.style.padding = 0;
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


NodeRectViewer.Box.prototype._initCanvas = function () {
  var canvas = this.element.ownerDocument.createElement ('canvas');
  if (window.uuClass && uuClass.Canvas) {
//    uuClass.Canvas (canvas);
  }

  canvas.width = this.width + 20;
  canvas.height = this.height + 20;
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.zIndex = 10;
  if (!canvas.getContext) {
    this.canvas = {notSupported: true};
    return;
  }
  var ctx = canvas.getContext ('2d');
  this.canvas = ctx;
  this.element.appendChild (canvas);
}; // _initCanvas

NodeRectViewer.Box.prototype.addArrow = function (x1, y1, x2, y2) {
  if (!this.canvas) this._initCanvas ();
  if (this.canvas.notSupported) return;
  var ctx = this.canvas;

  ctx.beginPath ();

  ctx.moveTo (x1, y1);
  ctx.lineTo (x2, y2);

  var arrowHeadAngle = Math.PI / 12;
  var arrowHeadLength = 40;

  var t = Math.PI + Math.atan2 (y2 - y1, x2 - x1);

  var ax = Math.cos (arrowHeadAngle);
  var ay = Math.sin (arrowHeadAngle);

  var ax_ = ax * Math.cos (t) - ay * Math.sin (t);
  var ay_ = ax * Math.sin (t) + ay * Math.cos (t);

  ax_ *= arrowHeadLength;
  ay_ *= arrowHeadLength;

  var bx = Math.cos (-arrowHeadAngle);
  var by = Math.sin (-arrowHeadAngle);

  var bx_ = bx * Math.cos (t) - by * Math.sin (t);
  var by_ = bx * Math.sin (t) + by * Math.cos (t);

  bx_ *= arrowHeadLength;
  by_ *= arrowHeadLength;

  ctx.lineTo (x2 + ax_, y2 + ay_);

  ctx.moveTo (x2, y2);
  ctx.lineTo (x2 + bx_, y2 + by_);

  ctx.stroke ();
}; // addArrow



NodeRectViewer.Controller = function () {
  var self = this;

  var vpRects = NR.View.getViewportRects (window);
  var icb = vpRects.icb;

  var wh = NR.Rect.whCSS (document.body, '20em', '11em');
  var controllerRect
      = new NR.Rect (0, icb.width, null, null, wh.width, wh.height);
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
      text-align: left;\
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
  <optgroup label="Mouse event">\
  <option value=ev.viewport' + cb + '>Viewport coordinate\
  <option value=ev.canvas' + cb + '>Canvas coordinate\
  <option value=ev.client>Client\
  <option value=evx.xy>x, y\
  <option value=ev.offset>Offset\
  <option value=evx.layer>Layer\
  <option value=evx.page>Page\
  <option value=evx.wh>width, height\
  <option value=evx.screen>Screen\
\
\ </optgroup><option value>---------\
\
\ <optgroup label=Lines>\
  <option value=lx.clients>getClientRects\
  <option value=lx.rangeClients>Range.getClientRects\
\
\ </optgroup><option value>---------\
\
  <optgroup label="Element coordinate">\
  <option value=client title="client* attributes">client\
  <option value=scrollableArea title="scroll* attributes">scroll (width/height)\
  <option value=scrollState title="scroll* attributes">scroll (top/left)\
\
  <optgroup label="Containing block coordinate">\
  <option value=offset title="offset* attributes">offset\
  <option value=x.px>style.pixel\
  <option value=x.pos>style.pos\
  <option value=x.currentPx>currentStyle.pixel\
  <option value=x.currentPos>currentStyle.pos\
  <option value=x.computedPx>getComputedStyle.pixel\
  <option value=x.computedPos>getComputedStyle.pos\
\
  <optgroup label="Viewport coordinate">\
  <option value="boundingClient">getBoundingClientRect</option>\
\
  <optgroup label="Canvas coordinate">\
  <option value=marginBox' + cb + '>Margin box\
  <option value=borderBox' + cb + '>Border box\
  <option value="cumulativeOffset">Cumulative offset</option>\
  <option value=x.boxObject>getBoxObjectFor\
  <option value=paddingBox' + cb + '>Padding box\
  <option value=clientAbs>Client (canvas coordinate)</option>\
  <option value=contentBox' + cb + '>Content box\
  <option value=x.textRangeBounding>createTextRange.bounding\
  <option value=x.textRangeOffset>createTextRange.offset\
\
  <optgroup label="Screen coordinate">\
  <option value=x.boxObjectScreen>getBoxObjectFor.screen\
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
  <option value=vpx.windowScrollXY>Scroll (x, y)\
  <option value=vp.windowPageOffset>Page offset\
  <option value=vpx.windowScrollMax>Scroll maximum\
  <option value=vpx.windowInner>Window inner\
  <option value=vp.boundingClientOrigin' + cb + '>Origin of getBoundingClientRect (calc)\
  <option value=boundingClientOrigin>Origin of getBoundingClientRect (element)\
\
  <option value=vpx.document>Document\
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
    if (self.boxType.substring (0, 2) == 'ev') {
      setTimeout (function () {
        self.startCapture ();
        self.addInputLog ('startCapture');
      }, 100); /* Wait a bit to avoid <option>.onclick being captured by IE */
    } else {
      self.update ();
    }
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
  this.boxType = 'borderBox';
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

  var type = this.boxType;
  var el = uu.css (this.selector)[this.selectorIndex];
  if ((type.substring (0, 2) != 'ev' && el) ||
      (type.substring (0, 2) == 'ev' && this.lastEvent)) {
    NR.resetIndex ();
    var rect;
    var position = this.boxCoord;
    if (type == '') {
      return;
    } else if (type == 'cumulativeOffset') {
      rect = NR.Element.getCumulativeOffsetRect (el, window);
    } else if (type == 'boundingClientOrigin') {
      rect = NR.View.getBoundingClientRectOrigin (window, document);
    } else if (type.substring (0, 3) === 'vp.') {
      var rects = NR.View.getViewportRects (window);
      rect = rects[type.substring (3)];
    } else if (type.substring (0, 4) === 'vpx.') {
      var rects = NR.View.getViewportRectsExtra (window);
      rect = rects[type.substring (4)];
    } else if (type.substring (0, 4) === 'win.') {
      var rects = NR.View.getWindowRects (window);
      rect = rects[type.substring (4)];
    } else if (type.substring (0, 7) === 'screen.') {
      var rects = NR.View.getScreenRects (window);
      rect = rects[type.substring (7)];
    } else if (type.substring (0, 2) === 'x.') {
      var rects = NR.Element.getRectsExtra (el, window);
      rect = rects[type.substring (2)];
    } else if (type.substring (0, 3) === 'lx.') {
      var rects = NR.Element.getLineRects (el, window);
      rect = rects[type.substring (3)];
    } else if (type.substring (0, 3) === 'ev.' || !el) {
      var rects = NR.Event.getRects (this.lastEvent, window);
      rect = rects[type.substring (3)];
    } else if (type.substring (0, 4) === 'evx.' || !el) {
      var rects = NR.Event.getRectsExtra (this.lastEvent, window);
      rect = rects[type.substring (4)];
    } else {
      var rects = NR.Element.getRects (el, window);
      rect = rects[type];
    }

    if (!rect) {
      rect = NR.Rect.invalid;
    }

    if (type.substring (0, 3) == 'lx.') {
      this.addOutputLog ('Length: ' + rect.length);

      for (var i = 0; i < rect.length; i++) {
        var r = rect[i];

        this.addOutputLog (r.toString ());

        if (this.showChain) {
          this.showTrace (r, position);
        } else {
          this.setHighlight (r, position);
        }
      }
    } else {
      this.addOutputLog (rect.toString ());

      if (this.showChain) {
        this.showTrace (rect, position);
      } else {
        this.setHighlight (rect, position);
      }
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
  } else if (m = commandStr.match (/^\s*(clear|startCapture|endCapture)\s*$/)) {
    command.type = m[1];
  } else if (commandStr == '') {
    return;
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
  } else if ({startCapture: true, endCapture: true}[command.type]) {
    this.addInputLog (command.type);
    this[command.type] ();
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
  } else if (rect.prevOp === 'negate') {
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

NodeRectViewer.Controller.prototype.startCapture = function () {
  NodeRectViewer.addClickHandler ();
}; // startCapture

NodeRectViewer.Controller.prototype.endCapture = function () {
  NodeRectViewer.removeClickHandler ();
}; // endCapture

NodeRectViewer.Controller.prototype.onclick = function (ev) {
  var cbox = this.box.element;
  var el = ev.target;
  while (el) {
    if (el == cbox) return;
    el = el.parentNode;
  }

  this.lastEvent = ev;
  this.update ();

  this.endCapture ();
  this.addInputLog ('endCapture');

  ev.returnValue = false;
  if (ev.stopPropagation) ev.stopPropagation ();
  if (ev.preventDefault) ev.preventDefault ();
}; // onclick

if (!NodeRectViewer.activeHandlers) NodeRectViewer.activeHandlers = {};

NodeRectViewer.removeClickHandler = function () {
  if (NodeRectViewer.activeHandlers.clickHandler) {
    if (window.removeEventListener) {
      window.removeEventListener
          ('click', NodeRectViewer.activeHandlers.clickHandler, true);
    } else if (document.detachEvent) {
      document.detachEvent
          ('onclick', NodeRectViewer.activeHandlers.clickHandler);
    }
    delete NodeRectViewer.activeHandlers.clickHandler;
  }
}; // removeClickHandler
NodeRectViewer.removeClickHandler ();

NodeRectViewer.addClickHandler = function () {
  if (NodeRectViewer.activeHandlers.clickHandler) {
    NodeRectViewer.removeClickHandler ();
  }
  if (window.addEventListener) {
    window.addEventListener ('click', NodeRectViewer.clickHandler, true);
    NodeRectViewer.activeHandlers.clickHandler = NodeRectViewer.clickHandler;
  } else if (document.attachEvent) {
    document.attachEvent ('onclick', NodeRectViewer.clickHandler);
    NodeRectViewer.activeHandlers.clickHandler = NodeRectViewer.clickHandler;
  }
}; // addClickHandler

NodeRectViewer.clickHandler = function (event) {
  if (NodeRectViewer.controller) {
    NodeRectViewer.controller.onclick (event || window.event);
  }
}; // clickHandler



function NROnLoad () {
  if (NodeRectViewer.controller) {
    NodeRectViewer.controller.remove ();
  }

  NodeRectViewer.controller = new NodeRectViewer.Controller ();
} // NROnLoad

var s = document.createElement ('script');
s.src = "http://uupaa-js.googlecode.com/svn/trunk/uupaa.js";
document.body.appendChild (s);

var s = document.createElement ('script');
if (NodeRectViewer.DEBUG) {
  s.src = "http://suika.fam.cx/www/css/noderect/NodeRect.js?" + Math.random ();
} else {
  s.src = "http://suika.fam.cx/www/css/noderect/NodeRect.js";
}
document.body.appendChild (s);

/*

NodeRectViewer.js - Interactive user interface for NR.js

Bookmarklets loading NodeRectViewer.js are available at
<http://suika.fam.cx/%7Ewakaba/wiki/sw/n/NodeRectViewer%2Ejs>.

NR.js is available at
<http://suika.fam.cx/www/css/noderect/NodeRect.js>.

Author: Wakaba <w@suika.fam.cx>.

*/

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
 * The Original Code is NodeRect code.
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
