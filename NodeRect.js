(function () {

if (!window.NodeRect) NodeRect = {};

NodeRect.getPixelWH = function (el, w, h) {
  var testEl = document.createElement ('div');
  testEl.style.display = 'block';
  testEl.style.position = 'absolute';
  testEl.style.margin = 0;
  testEl.style.borderWidth = 0;
  testEl.style.padding = 0;
  try {
    testEl.style.width = w;
    testEl.style.height = h;
  } catch (e) {
  }
  el.appendChild (testEl);
  var px = {width: testEl.clientWidth, height: testEl.clientHeight};
  el.removeChild (testEl);
  return px;
}; // getPixelWH

NodeRect.Rect = function (t, r, b, l, w, h) {
  if (t != null) {
    this.top = t;
    this.bottom = b != null ? b : t + h;
    this.height = h != null ? h : b - t;
  } else {
    this.bottom = b;
    this.top = b - h;
    this.height = h;
  }
  if (l != null) {
    this.left = l;
    this.right = r != null ? r : l + w;
    this.width = w != null ? w : r - l;
  } else {
    this.right = r;
    this.left = r - w;
    this.width = w;
  }
  this.index = NodeRect.Rect.index++;
  this.label = null;
  this.supported = false;
}; // Rect

NodeRect.Rect.wh = function (w, h) {
  var r = new NodeRect.Rect (0, null, null, 0, w, h);
  if (!isNaN (w + 0)) r.supported = true;
  return r;
}; // wh

NodeRect.Rect.whCSS = function (el, w, h) {
  var px = NodeRect.getPixelWH (el, w, h);
  return NodeRect.Rect.wh (px.width, px.height);
}; // whCSS

NodeRect.Rect.trbl = function (t, r, b, l) {
  var o = new NodeRect.Rect (t, r, b, l);
  if (!isNaN (t + r + b + l + 0)) o.supported = true;
  return o;
}; // trbl

var parseLength = function (s) {
  /* TODO: parse any <length> supported by IE */
  var m;
  if (s == 'thin') {
    return 4;
  } else if (s == 'medium') {
    return 8;
  } else if (s == 'thick') {
    return 16;
  } else if (s == 'auto') {
    return 0; /* Hard to compute, give up! */
  } else if (m = s.match (/^(-?[0-9.]+)([A-Za-z%]+)$/)) {
    if (m[2] == 'px') {
      return parseFloat (m[1]);
    } else {
      return null;
    }
  } else {
    return null;
  }
}; // parseLength

NodeRect.Rect.trblIE = function (t, r, b, l) {
  return NodeRect.Rect.trbl
      (parseLength (t), parseLength (r), parseLength (b), parseLength (l));
}; // trblIE

NodeRect.Rect.tlwh = function (t, l, w, h) {
  var r = new NodeRect.Rect (t, null, null, l, w, h);
  if (!isNaN (t + 0) && !isNaN (w + 0)) r.supported = true;
  return r;
}; // tlwh

NodeRect.Rect.nosupport = function () {
  return new NodeRect.Rect (0, 0, 0, 0);
}; // nosupport

NodeRect.Rect.resetIndex = function () {
  NodeRect.Rect.index = 0;
}; // resetIndex

NodeRect.Rect.prototype.getRenderedLeft = function () {
  return this.left;
}; // getRenderedLeft

NodeRect.Rect.prototype.getRenderedTop = function () {
  return this.top;
}; // getRenderedTop

NodeRect.Rect.prototype.addOffset = function (r) {
  var o = new this.constructor
      (this.top + r.top, null, null, this.left + r.left,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'add-offset'; 
  o.supported = this.supported && r.supported;
  return o;
}; // addOffset

NodeRect.Rect.prototype.addVector = function (r) {
  var width = r.getX ? r.getX () : r.width;
  var height = r.getY ? r.getY () : r.height;
  var o = new this.constructor
      (this.top + height, null, null, this.left + width,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'add-vector'; 
  o.supported = this.supported && r.supported;
  return o;
}; // addVector

NodeRect.Rect.prototype.subtractOffset = function (r) {
  var o = new this.constructor
      (this.top - r.top, null, null, this.left - r.left,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'sub-offset'; 
  o.supported = this.supported && r.supported;
  return o;
}; // subtractOffset

NodeRect.Rect.prototype.subtractVector = function (r) {
  var o = new this.constructor
      (this.top - r.height, null, null, this.left - r.width,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'sub-vector'; 
  o.supported = this.supported && r.supported;
  return o;
}; // subtractVector

NodeRect.Rect.prototype.addBandOutside = function (r) {
  var o = new this.constructor
      (this.top - r.top, this.right + r.right,
       this.bottom + r.bottom, this.left - r.left);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'out-edge';
  o.supported = this.supported && r.supported;
  return o;
}; // addBandOutside

NodeRect.Rect.prototype.getTLVector = function () {
  var o = new NodeRect.Rect.Vector (this.left, this.top);
  o.prevOp = 'topleft';
  o.prev1 = this;
  o.supported = this.supported;
  o.label = this.label + ', top-left corner';
  return o;
}; // getTLVector

NodeRect.Rect.prototype.getNegatedTLVector = function () {
  var o = new NodeRect.Rect.Vector (-this.left, -this.top);
  o.prevOp = 'topleft-negated';
  o.prev1 = this;
  o.supported = this.supported;
  o.label = this.label + ', top-left corner, negated';
  return o;
}; // getNegatedTLVector

NodeRect.Rect.prototype.getFullLabel = function () {
  var label;
  if (this.prevOp === 'topleft' || this.prevOp === 'topleft-negated') {
    label = this.index + ' = ' +
        this.prevOp +
        ' (' + this.prev1.index + ') ' +
        this.label;
  } else if (this.prevOp) {
    label = this.index + ' = ' +
        this.prevOp +
        ' (' + this.prev1.index + ', ' + this.prev2.index + ') ' +
        this.label;
  } else {
    label = this.index + ' ' + this.label;
  }
  return label;
}; // getFullLabel

NodeRect.Rect.prototype.toString = function () {
  var r = '';
  if (!this.supported) {
    r += "Not supported \n";
  }
  r += 'Top: ' + this.top + " \n";
  r += 'Right: ' + this.right + " \n";
  r += 'Bottom: ' + this.bottom + " \n";
  r += 'Left: ' + this.left + " \n";
  r += 'Width: ' + this.width + " \n";
  r += 'Height: ' + this.height + " \n";
  return r;
}; // toString

NodeRect.Rect.Vector = function (x /* width */, y /* height */) {
  var w = x < 0 ? -x : x;
  var h = y < 0 ? -y : y;
  NodeRect.Rect.apply (this, [0, null, null, 0, w, h]);
  if (!isNaN (x + 0)) this.supported = true;
  this.leftward = x < 0;
  this.upward = y < 0;
  this.constructor = NodeRect.Rect.Vector;
}; // Vector

NodeRect.Rect.Vector.prototype = new NodeRect.Rect;

NodeRect.Rect.Vector.prototype.getX = function () {
  return this.leftward ? -this.width : this.width;
}; // getX

NodeRect.Rect.Vector.prototype.getY = function () {
  return this.upward ? -this.height : this.height;
}; // getY

NodeRect.Rect.Vector.prototype.getRenderedLeft = function () {
  return this.leftward ? -this.width : 0;
}; // getRenderedLeft

NodeRect.Rect.Vector.prototype.getRenderedTop = function () {
  return this.upward ? -this.height : 0;
}; // getRenderedTop

NodeRect.Rect.Vector.prototype.addVector = function (r) {
  var o = new this.constructor
      (this.getX () + r.getX (), this.getY () + r.getY ());
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'add-vector'; 
  o.supported = this.supported && r.supported;
  return o;
}; // addVector

NodeRect.Rect.Vector.prototype.toString = function () {
  var r = '';
  if (!this.supported) {
    r = "Not supported \n";
  }
  r += '(left, top) = (x, y) = (';
  r += this.getX () + ', ';
  r += this.getY () + ') \n';
  return r;
}; // toString

NodeRect.Rect.Band = function (t, r, b, l) {
  NodeRect.Rect.apply (this, [t, r, b, l]);
  if (!isNaN (t + 0)) this.supported = true;
  this.constructor = NodeRect.Rect.Band;
}; // Band

NodeRect.Rect.Band.prototype = new NodeRect.Rect;

NodeRect.Rect.Band.prototype.getNegatedTLVector = function () {
  var o = new NodeRect.Rect.Vector (-this.left, -this.top);
  o.prevOp = 'topleft-negated';
  o.prev1 = this;
  o.supported = this.supported;
  o.label = this.label + ', top-left corner, negated';
  return o;
}; // getNegatedTLVector

NodeRect.getCumulativeOffsetRect = function (oel) {
  var el = oel;
  var rect = NodeRect.Rect.trbl (0, 0, 0, 0);
  rect.label = 'Origin';

  if (/WebKit/.test (navigator.userAgent)) {
    var docEl = el.ownerDocument.documentElement;
    var bodyEl = el.ownerDocument.body;

    if (docEl) {
      var rects = NodeRect.getBoxAreaRects (docEl);

      if (docEl == oel) {
        /* If viewport is not the root element, this should not be added. */
        rect = rects.padding;
      } else if (bodyEl == oel) {
        rect = rects.padding.addOffset (rects.border.addOffset (rects.margin));
      } else {
        rect = rects.padding.addOffset (rects.border);
      }
    }

    if (bodyEl) {
      var rects = NodeRect.getBoxAreaRects (bodyEl);
      
      if (bodyEl == oel) {
        rect = rect.addOffset (rects.margin);
      } else {
        rect = rect.addOffset (rects.border);
      }
    }
  }

  var offsetChain = [];
  while (el) {
    offsetChain.unshift (el);
    el = el.offsetParent;
  }

  while (offsetChain.length) {
    var el = offsetChain.shift ();

    var offset = NodeRect.Rect.tlwh
        (el.offsetTop, el.offsetLeft, el.offsetWidth, el.offsetHeight);
    offset.label = el.nodeName + '.offset';

    rect = offset.addOffset (rect);
    rect.label = el.nodeName + ' cumulative offset';
    
    /* TODO: add border if necessary */

    if (el.offsetParent == el.ownerDocument.body &&
        window.getComputedStyle &&
        getComputedStyle (el, null).position == 'absolute' &&
        /Konqueror|Safari|KHTML/.test (navigator.userAgent)) {
//      break;
    }

    el = el.offsetParent;
  }

  if (window.opera && /* Opera 9.52 */
      oel == oel.ownerDocument.body) {
    var cssRects = NodeRect.getBoxAreaRects (oel);
    rect = rect.addOffset (cssRects.margin);
    rect.label = oel.nodeName + ' adjusted offset';
  }

  return rect;
}; // getCumulativeOffsetRect

NodeRect.getCumulativeClientRect = function (el, classObject) {
  if (!classObject) classObject = NodeRect.Rect;
  var offsetRect = NodeRect.getCumulativeOffsetRect (el, classObject);

  var client = new classObject
      (el.clientTop, null, null, el.clientLeft,
       el.clientWidth, el.clientHeight);
  client.label = el.nodeName + '.client';

  var rect = offsetRect.addOffset (client);
  rect.label = el.nodeName + ' cumulative client';
  return rect;
}; // getCumulativeClientRect

NodeRect.getBoxAreaRects = function (el) {
  var rects = {};
  if (window.getComputedStyle) {
    var cs = getComputedStyle (el, null);
    rects.margin = NodeRect.Rect.trbl (
      parseFloat (cs.marginTop.slice (0, -2)),
      parseFloat (cs.marginRight.slice (0, -2)),
      parseFloat (cs.marginBottom.slice (0, -2)),
      parseFloat (cs.marginLeft.slice (0, -2))
    );
    rects.border = NodeRect.Rect.trbl (
      parseFloat (cs.borderTopWidth.slice (0, -2)),
      parseFloat (cs.borderRightWidth.slice (0, -2)),
      parseFloat (cs.borderBottomWidth.slice (0, -2)),
      parseFloat (cs.borderLeftWidth.slice (0, -2))
    );
    rects.padding = NodeRect.Rect.trbl (
      parseFloat (cs.paddingTop.slice (0, -2)),
      parseFloat (cs.paddingRight.slice (0, -2)),
      parseFloat (cs.paddingBottom.slice (0, -2)),
      parseFloat (cs.paddingLeft.slice (0, -2))
    );
  } else if (el.currentStyle) {
    var cs = el.currentStyle;
    rects.margin = NodeRect.Rect.trblIE
        (cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft);
    rects.border = NodeRect.Rect.trblIE
        (cs.borderTopWidth, cs.borderRightWidth,
         cs.borderBottomWidth, cs.borderLeftWidth);
    rects.padding = NodeRect.Rect.trblIE
        (cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft);
  } else {
    rects.margin = NodeRect.Rect.nosupport ();
    rects.border = NodeRect.Rect.nosupport ();
    rects.padding = NodeRect.Rect.nosupport ();
  }
  rects.margin.label = el.nodeName + ' computedStyle.margin';
  rects.border.label = el.nodeName + ' computedStyle.border';
  rects.padding.label = el.nodeName + ' computedStyle.padding';
  return rects;
}; // getBoxAreaRects

NodeRect.getElementAttrRects = function (el) {
  var rects = {};

  /* See <http://suika.fam.cx/%7Ewakaba/wiki/sw/n/offset%2A> for
     compatibility problems. */

  rects.offset = NodeRect.Rect.tlwh
      (el.offsetTop, el.offsetLeft, el.offsetWidth, el.offsetHeight);
  rects.offset.label = el.nodeName + '.offset';

  rects.client = NodeRect.Rect.tlwh
      (el.clientTop, el.clientLeft, el.clientWidth, el.clientHeight);
  rects.client.label = el.nodeName + '.client';

  rects.scrollableArea = NodeRect.Rect.wh (el.scrollWidth, el.scrollHeight);
  rects.scrollableArea.label = el.nodeName + '.scroll (width, height)';

  rects.scrollState = new NodeRect.Rect.Vector (el.scrollLeft, el.scrollTop);
  rects.scrollState.label = el.nodeName + '.scroll (left, top)';

  return rects;
}; // getElementAttrRects

NodeRect.getElementRects = function (el) {
  var rects = {};

  if (el.getBoundingClientRect) {
    var origin = NodeRect.getViewportRects (window).boundingClientOrigin;

    var bb = el.getBoundingClientRect ();
    rects.boundingClient
        = NodeRect.Rect.trbl (bb.top, bb.right, bb.bottom, bb.left);
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = rects.boundingClient.addVector (origin);
    rects.borderEdge.label = el.nodeName + ' border edge';
  } else {
    rects.boundingClient = NodeRect.Rect.nosupport ();
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = NodeRect.getCumulativeOffsetRect (el);
  }

  /* Gecko-only, deprecated */
  if (el.ownerDocument.getBoxObjectFor) {
    var bo = el.ownerDocument.getBoxObjectFor (el);
    rects.boxObject = NodeRect.Rect.tlwh (bo.y, bo.x, bo.width, bo.height);
    rects.boxObjectScreen = new NodeRect.Rect.Vector (bo.screenX, bo.screenY);
  } else {
    rects.boxObject = NodeRect.Rect.nosupport ();
    rects.boxObjectScreen = NodeRect.Rect.nosupport ();
  }
  rects.boxObject.label = el.nodeName + ' boxObject';
  rects.boxObjectScreen.label = el.nodeName + ' boxObject.screen';

  var elRects = NodeRect.getElementAttrRects (el);
  rects.offset = elRects.offset;
  rects.client = elRects.client;
  rects.scrollableArea = elRects.scrollableArea;
  rects.scrollState = elRects.scrollState;
  
  var cssRects = NodeRect.getBoxAreaRects (el);
  rects.margin = cssRects.margin;
  rects.border = cssRects.border;
  rects.padding = cssRects.padding;

  /* Wrong if |el| has multiple line boxes. */
  rects.marginEdge = rects.borderEdge.addBandOutside (rects.margin);
  rects.marginEdge.label = el.nodeName + ' margin edge';

  return rects;
}; // getElementRects

NodeRect.getViewportRects = function (win) {
  if (!win) win = window;

  var doc = win.document;
  var docEl = doc.documentElement;
  var bodyEl = doc.body;

  var quirks = doc.compatMode != 'CSS1Compat';
  
  var rects = {};

  /* Fx, WebKit, Opera: entire viewport (including scrollbars),
     Not supported by WinIE */
  rects.windowInner = NodeRect.Rect.wh (win.innerWidth, win.innerHeight);
  rects.windowInner.label = 'window.inner';

  /* Not supported by WinIE */
  rects.windowPageOffset
      = new NodeRect.Rect.Vector (win.pageXOffset, win.pageYOffset);
  rects.windowPageOffset.label = 'window.pageOffset';

  /* Fx3, WebKit: Same as page offset; Not supported by Opera, WinIE */
  rects.windowScrollXY = new NodeRect.Rect.Vector (win.scrollX, win.scrollY);
  rects.windowScrollXY.label = 'window.scroll (x, y)';

  /* Not supported by WebKit, Opera, WinIE */
  rects.windowScrollMax
      = new NodeRect.Rect.Vector (win.scrollMaxX, win.scrollMaxY);
  rects.windowScrollMax.label = 'window.scrollMax';

  /* Not supported by Opera, WinIE */
  rects.document = NodeRect.Rect.wh (doc.width, doc.height);
  rects.document.label = 'Document';

  if (docEl) {
    var deRects = NodeRect.getElementAttrRects (docEl);
    rects.deOffset = deRects.offset;
    rects.deClient = deRects.client;
    rects.deScrollableArea = deRects.scrollableArea;
    rects.deScrollState = deRects.scrollState;
  } else {
    rects.deOffset = NodeRect.Rect.nosupport ();
    rects.deClient = NodeRect.Rect.nosupport ();
    rects.deScrollableArea = NodeRect.Rect.nosupport ();
    rects.deScrollState = NodeRect.Rect.nosupport ();
  }
  rects.deOffset.label = 'documentElement.offset';
  rects.deClient.label = 'documentElement.client';
  rects.deScrollableArea.label = 'documentElement.scroll (width, height)';
  rects.deScrollState.label = 'documentElement.scroll (top, left)';

  if (bodyEl) {
    var dbRects = NodeRect.getElementAttrRects (bodyEl);
    rects.bodyOffset = dbRects.offset;
    rects.bodyClient = dbRects.client;
    rects.bodyScrollableArea = dbRects.scrollableArea;
    rects.bodyScrollState = dbRects.scrollState;
  } else {
    rects.bodyOffset = NodeRect.Rect.nosupport ();
    rects.bodyClient = NodeRect.Rect.nosupport ();
    rects.bodyScrollState = NodeRect.Rect.nosupport ();
    rects.bodyScrollableArea = NodeRect.Rect.nosupport ();
  }
  rects.bodyOffset.label = 'document.body.offset';
  rects.bodyClient.label = 'document.body.client';
  rects.bodyScrollableArea.label = 'document.body.scroll (width, height)';
  rects.bodyScrollState.label = 'document.body.scroll (top, left)';

  if (document.all) {
    if (quirks) {
      rects.scrollState = rects.bodyScrollState;
    } else {
      rects.scrollState = rects.deScrollState;
    }
  } else {
    rects.scrollState = rects.windowPageOffset;
  }

  if (quirks) {
    rects.icb = rects.bodyClient;
    rects.icb = rects.icb.subtractOffset (rects.icb); // Safari
    /* This is not ICB in Firefox if the document is in the quirks mode
       and both |html| and |body| has scrollbars.  In such cases there
       is no way to obtain ICB (content edge), AFAICT. */

    if (document.all) {
      var docElRects = NodeRect.getBoxAreaRects (bodyEl);
      rects.boundingClientOrigin = docElRects.border.getNegatedTLVector ();
      rects.boundingClientOrigin.label = 'Viewport border offset';
    }
  } else {
    if (document.all) {
      rects.icb = rects.deOffset;

      rects.boundingClientOrigin = rects.icb.subtractOffset (rects.deClient);
      rects.boundingClientOrigin.label
          = rects.icb.label + ' - documentElement.client';

      rects.boundingClientOrigin = rects.boundingClientOrigin.getTLVector ();
    } else {
      rects.icb = rects.deClient;
    }
  }

  /* Firefox's initial containing block is the padding box.  There is 
     no reliable way to detect the offset from the tl of canvas in Fx
     while returning zero in any other browsers AFAICT, sniffing Gecko by
     UA string. */
  if (navigator.userAgent.indexOf("Gecko/") >= 0) {
    var deBorder = rects.deOffset.getTLVector ();
    deBorder.label = 'padding edge -> border edge of root element box';

    var debc = docEl.getBoundingClientRect ();
    debc = NodeRect.Rect.trbl (debc.top, debc.right, debc.bottom, debc.left);
    debc.label = docEl.nodeName + ' boundingClientRect';

    var debcAbs = debc.addVector (rects.scrollState);
    debcAbs.label = debc.label + ', canvas origin';

    var deMargin = debcAbs.getNegatedTLVector ();
    deMargin.label = 'border edge -> margin edge of root element box';

    rects.canvasOrigin = deBorder.addVector (deMargin);
    rects.canvasOrigin.label = 'Canvas origin';

    rects.icb = rects.icb.subtractVector (rects.canvasOrigin);
    rects.icb.label = 'ICB (origin: margin edge of root element box)';
  } else {
    rects.canvasOrigin = new NodeRect.Rect.Vector (0, 0);
    rects.canvasOrigin.label = 'Canvas origin';
  }

  rects.contentBox = rects.icb.addVector (rects.scrollState);
  rects.contentBox.label = 'Viewport content box';

  if (rects.boundingClientOrigin) {
    rects.boundingClientOrigin
        = rects.boundingClientOrigin.addVector (rects.scrollState);
    rects.boundingClientOrigin.label = 'Bounding client rect origin';
  } else {
    rects.boundingClientOrigin = rects.scrollState;
  }

  rects.boundingClientOrigin
      = rects.boundingClientOrigin.addVector (rects.canvasOrigin);
  rects.boundingClientOrigin.label = 'Bounding client rect origin (canvas origin)';

  return rects;
}; // getViewportRects

NodeRect.getWindowRects = function (win) {
  if (!win) win = window;

  var rects = {};

  /* Not supported by WinIE */
  rects.outer = NodeRect.Rect.wh (win.outerWidth, win.outerHeight);
  rects.outer.label = 'window.outer';

  /* Opera: Wrong; Not supported by WinIE */
  rects.screenXY = new NodeRect.Rect.Vector (win.screenX, win.screenY);
  rects.screenXY.label = 'window.screen (x, y)';

  /* Not supported by Fx3 */
  rects.screenTL
      = new NodeRect.Rect.Vector (win.screenLeft, win.screenTop);
  rects.screenTL.label = 'window.screen (top, left)';

  return rects;
}; // getWindowRects

NodeRect.getScreenRects = function (win) {
  if (!win) win = window;

  var s = win.screen;

  var rects = {};
 
  /* top & left not supported by Opera, WinIE, WebKit */
  rects.device
      = NodeRect.Rect.tlwh (s.top || 0, s.left || 0, s.width, s.height);
  rects.device.label = 'screen device';

  /* top & left not supported by Opera, WinIE */
  rects.avail = NodeRect.Rect.tlwh
      (s.availTop || 0, s.availLeft || 0, s.availWidth, s.availHeight);
  rects.avail.label = 'screen.avail';

  return rects;
}; // getScreenRects

if (window.NodeRectOnLoad) {
  NodeRectOnLoad ();
}

})();
