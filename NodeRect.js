(function () {

if (!window.NodeRect) NodeRect = {};

NodeRect.Rect = function (t, r, b, l, w, h) {
  this.top = t;
  this.right = r != null ? r : w == 0 ? l : l + w /* - 1 */;
  this.bottom = b != null ? b : h == 0 ? t : t + h /* - 1 */;
  this.left = l;
  this.width = w != null ? w : r - l /* + 1 */;
  this.height = w != null ? h : b - t /* + 1 */;
  this.index = NodeRect.Rect.index++;
  this.label = null;
  this.supported = false;
}; // Rect

NodeRect.Rect.wh = function (w, h) {
  var r = new NodeRect.Rect (0, null, null, 0, w, h);
  if (!isNaN (w + 0)) r.supported = true;
  return r;
}; // wh

NodeRect.Rect.trbl = function (t, r, b, l) {
  var r = new NodeRect.Rect (t, r, b, l);
  if (!isNaN (t + 0)) r.supported = true;
  return r;
}; // trbl

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

NodeRect.Rect.prototype.addOffset = function (r) {
  var o = new r.constructor
      (this.top + r.top, null, null, this.left + r.left,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'add-offset'; 
  return o;
}; // addOffset

NodeRect.Rect.prototype.addVector = function (r) {
  var o = new r.constructor
      (this.top + r.height, null, null, this.left + r.width,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'add-vector'; 
  return o;
}; // addVector

NodeRect.Rect.prototype.subtractOffset = function (r) {
  var o = new r.constructor
      (this.top - r.top, null, null, this.left - r.left,
       this.width, this.height);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'sub-offset'; 
  return o;
}; // subtractOffset

NodeRect.Rect.prototype.outsideEdge = function (r) {
  var o = new r.constructor
      (this.top - r.top, this.right + r.right,
       this.bottom + r.bottom, this.left - r.left);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'out-edge';
  return o;
}; // outsideEdge

NodeRect.Rect.prototype.insideEdge = function (r) {
  var o = new r.constructor
      (this.top + r.top, this.right - r.right,
       this.bottom - r.bottom, this.left + r.left);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'in-edge';
  return o;
}; // insideEdge

NodeRect.Rect.prototype.extend = function (r) {
  var o = new r.constructor
      (this.top, this.right + r.width, this.bottom + r.height, this.left);
  o.prev1 = this;
  o.prev2 = r;
  o.prevOp = 'extend';
  return o;
}; // extend

NodeRect.Rect.prototype.getFullLabel = function () {
  var label;
  if (this.prevOp) {
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
  if (this.supported) {
    var r = 'Top: ' + this.top + " \n";
    r += 'Right: ' + this.right + " \n";
    r += 'Bottom: ' + this.bottom + " \n";
    r += 'Left: ' + this.left + " \n";
    r += 'Width: ' + this.width + " \n";
    r += 'Height: ' + this.height + " \n";
    return r;
  } else {
    return "Not supported \n";
  }
}; // toString

NodeRect.Rect.Vector = function (x /* width */, y /* height */) {
  var w = x < 0 ? -x : x;
  var h = y < 0 ? -y : y;
  NodeRect.Rect.apply (this, [0, null, null, 0, w, h]);
  if (!isNaN (x + 0)) this.supported = true;
  this.leftward = x < 0;
  this.upward = y < 0;
}; // Vector

NodeRect.Rect.Vector.prototype = new NodeRect.Rect;

NodeRect.Rect.Vector.prototype.toString = function () {
  if (this.supported) {
    var r = '(left, top) = (x, y) = (';
    if (this.leftward) r += '-';
    r += this.width + ', ';
    if (this.upward) r += '-';
    r += this.height + ') \n';
    return r;
  } else {
    return "Not supported \n";
  }
}; // toString

NodeRect.getCumulativeOffsetRect = function (oel, classObject) {
  var el = oel;
  if (!classObject) classObject = NodeRect.Rect;
  var rect = new classObject (0, 0, 0, 0, 0, 0);
  rect.label = 'Origin';

  var offsetChain = [];
  while (el) {
    offsetChain.unshift (el);
    el = el.offsetParent;
  }

  while (offsetChain.length) {
    var el = offsetChain.shift ();

    var offset = new classObject
        (el.offsetTop, null, null, el.offsetLeft,
         el.offsetWidth, el.offsetHeight);
    offset.label = el.nodeName + '.offset';

    rect = rect.addOffset (offset);
    rect.label = el.nodeName + ' cumulative offset';
    
    /* TODO: add border if necessary */

    if (el.offsetParent == el.ownerDocument.body &&
        window.getComputedStyle &&
        getComputedStyle (el, null).position == 'absolute' &&
        /Konqueror|Safari|KHTML/.test (navigator.userAgent)) {
      break;
    }

    el = el.offsetParent;
  }

  if (window.opera && /* Opera 9.52 */
      oel == oel.ownerDocument.body) {
    var cssRects = NodeRect.getComputedRects (oel, classObject);
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

NodeRect.getComputedRects = function (el, classObject) {
  if (!classObject) classObject = NodeRect.Rect;
  var rects = {};
  if (window.getComputedStyle) {
    var cs = getComputedStyle (el, null);
    rects.margin = new classObject (
      parseFloat (cs.marginTop.slice (0, -2)),
      parseFloat (cs.marginRight.slice (0, -2)),
      parseFloat (cs.marginBottom.slice (0, -2)),
      parseFloat (cs.marginLeft.slice (0, -2))
    );
    rects.border = new classObject (
      parseFloat (cs.borderTopWidth.slice (0, -2)),
      parseFloat (cs.borderRightWidth.slice (0, -2)),
      parseFloat (cs.borderBottomWidth.slice (0, -2)),
      parseFloat (cs.borderLeftWidth.slice (0, -2))
    );
    rects.padding = new classObject (
      parseFloat (cs.paddingTop.slice (0, -2)),
      parseFloat (cs.paddingRight.slice (0, -2)),
      parseFloat (cs.paddingBottom.slice (0, -2)),
      parseFloat (cs.paddingLeft.slice (0, -2))
    );
  } else if (el.currentStyle) {

    rects.margin = new classObject (0, 0, 0, 0);
    rects.border = new classObject (0, 0, 0, 0);
    rects.padding = new classObject (0, 0, 0, 0);
  } else {
    rects.margin = new classObject (0, 0, 0, 0);
    rects.border = new classObject (0, 0, 0, 0);
    rects.padding = new classObject (0, 0, 0, 0);
  }
  rects.margin.label = el.nodeName + '.style.margin';
  rects.border.label = el.nodeName + '.style.border';
  rects.padding.label = el.nodeName + '.style.padding';
  return rects;
}; // getComputedRects

NodeRect.getElementAttrRects = function (el) {
  var rects = {};

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

NodeRect.getElementRects = function (el, rectClass) {
  if (!rectClass) rectClass = NodeRect.Rect;
  var rects = {};

  if (el.getBoundingClientRect) {
    var html = el.ownerDocument.documentElement;
    var body = el.ownerDocument.body;
    var vpRect = new rectClass (
      (body.scrollTop || html.scrollTop) - html.clientTop,
      null,
      null,
      (body.scrollLeft || html.scrollLeft) - html.clientLeft,
      html.clientWidth,
      html.clientHeight
    );
    vpRect.label = 'Viewport';

    var bb = el.getBoundingClientRect ();
    rects.boundingClient
        = new rectClass (bb.top, bb.right, bb.bottom, bb.left);
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = vpRect.addOffset (rects.boundingClient);
    rects.borderEdge.label = el.nodeName + ' border edge';
  } else {
    rects.boundingClient = new rectClass (0, 0, 0, 0);
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = NodeRect.getCumulativeOffsetRect (el, rectClass);
  }

  /* Gecko-only, deprecated */
  if (el.ownerDocument.getBoxObjectFor) {
    var bo = el.ownerDocument.getBoxObjectFor (el);
    rects.boxObject
        = new rectClass (bo.y, null, null, bo.x, bo.width, bo.height);
    rects.boxObjectScreen = new rectClass (0, bo.screenX, bo.screenY, 0);
  } else {
    rects.boxObject = new rectClass (0, 0, 0, 0);
    rects.boxObjectScreen = new rectClass (0, 0, 0, 0);
  }
  rects.boxObject.label = el.nodeName + ' boxObject';
  rects.boxObjectScreen.label = el.nodeName + ' boxObject.screen';

  var elRects = NodeRect.getElementAttrRects (el, rectClass);
  rects.offset = elRects.offset;
  rects.client = elRects.client;
  rects.scrollableArea = elRects.scrollableArea;
  rects.scrollState = elRects.scrollState;
  
  var cssRects = NodeRect.getComputedRects (el, rectClass);
  rects.margin = cssRects.margin;
  rects.border = cssRects.border;
  rects.padding = cssRects.padding;

  /* Wrong if |el| has multiple line boxes. */
  rects.marginEdge = rects.borderEdge.outsideEdge (rects.margin);
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

  /* Not supported by Fx3, WebKit, Opera, WinIE */
  /*
  rects.windowClient = NodeRect.Rect.wh (win.clientWidth, win.clientHeight);
  rects.windowClient.label = 'window.client';
  */

  /* Not supported by WinIE */
  rects.windowPageOffset
      = new NodeRect.Rect.Vector (win.pageXOffset, win.pageYOffset);
  rects.windowPageOffset.label = 'window.pageOffset';

  /* Fx3, WebKit: Same as page offset; Not supported by Opera, WinIE */
  rects.windowScrollXY = new NodeRect.Rect.Vector (win.scrollX, win.scrollY);
  rects.windowScrollXY.label = 'window.scroll (x, y)';

  /* Not supported by Fx3, WebKit, Opera, WinIE */
  /*
  rects.windowScrollTL
      = new NodeRect.Rect.Vector (win.scrollLeft, win.scrollTop);
  rects.windowScrollTL.label = 'window.scroll (top, left)';
  */

  /* Not supported by WebKit, Opera, WinIE */
  rects.windowScrollMax
      = new NodeRect.Rect.Vector (win.scrollMaxX, win.scrollMaxY);
  rects.windowScrollMax.label = 'window.scrollMax';

  /* Not supported by Opera, WinIE */
  rects.document = NodeRect.Rect.wh (doc.width, doc.height);
  rects.document.label = 'Document';

  if (docEl) {
    var deRects = NodeRect.getElementAttrRects (docEl);

    /* Fx3: border box of the root element (origin: tl of padding edge) */
    /* S3, O9 (Q): border box of the root element (origin: tl of border edge) */
    /* O9 (S): border box of the root element (origin: tl of margin edge) */
    /* IE7 (S): viewport w/o scroll (origin: tl of viewport) */
    /* IE7 (Q): viewport's border box (origin: tl of border edge of viewport) */
    rects.documentElementOffset = deRects.offset;

    /* Fx3,S3,O9 (S): viewport w/o scroll (origin: tl of viewport) */
    /* Fx3,S3 (Q): padding box of the root element (origin: tl of border edge) */
    /* O9 (Q): top,height: padding of root (origin: border); left,width: viewport w/o scroll (origin: viewport) */
    /* IE7 (S): viewport w/o scroll (origin: (-2, -2) of viewport (-2 = viewport's border) */
    /* IE7 (Q): N/A (value = 0) */
    rects.documentElementClient = deRects.client;

    /* Fx3 (S): visible area of canvas (origin: tl of canvas) */
    /* Fx3 (Q), S3, O9: border box of the root element (origin: tl of border edge) */
    /* IE7 (S): margin area - margin-right, margin-bottom of the root element (origin: tl of margin edge) */
    /* IE7 (Q): same as offset */
    rects.documentElementScrollableArea = deRects.scrollableArea;

    /* Fx3 (S), O9 (S), IE7 (S): viewport scroll top/left */
    /* Fx3 (Q), S3, O9 (Q), IE7 (Q): NOT viewport scroll top/left */
    rects.documentElementScrollState = deRects.scrollState;

  } else {
    rects.documentElementOffset = NodeRect.Rect.nosupport ();
    rects.documentElementClient = NodeRect.Rect.nosupport ();
    rects.documentElementScrollableArea = NodeRect.Rect.nosupport ();
    rects.documentElementScrollState = NodeRect.Rect.nosupport ();
  }
  rects.documentElementOffset.label = 'documentElement.offset';
  rects.documentElementClient.label = 'documentElement.client';
  rects.documentElementScrollableArea.label = 'documentElement.scroll (width, height)';
  rects.documentElementScrollState.label = 'documentElement.scroll (top, left)';

  if (bodyEl) {
    var dbRects = NodeRect.getElementAttrRects (bodyEl);

    /* Fx3: border box of the body element (origin: tl of padding edge) */
    /* S3, O9 (S): border box of the body element (origin: tl of border edge) */
    /* O9 (Q): viewport w/ scroll (origin: tl of viewport) */
    /* IE7 (S): border box of the body element (origin: tl of margin of root) */
    /* IE7 (Q): same as root's offset */
    rects.documentBodyOffset = dbRects.offset;

    /* Fx3,S3,O9,IE7 (S): padding box of the body element (origin: tl of border edge) */
    /* Fx3,S3,O9,IE7 (Q): viewport w/o scroll (origin: tl of viewport) */
    /* S3 (Q): top/left += body's border-top/left */
    rects.documentBodyClient = dbRects.client;

    /* Fx3,O9 (S): border box of the body element (origin: tl of border edge) */
    /* Fx3 (Q), S3, O9 (Q): visible area of canvas (origin: tl of canvas) */
    /* IE7: (extended-)padding box of the body element (origin: tl of padding edge) */
    rects.documentBodyScrollableArea = dbRects.scrollableArea;

    /* Fx3,O9,IE7 (S): NOT viewport scroll top/left */
    /* Fx3 (Q), S3, O9 (Q): viewport scroll top/left */
    rects.documentBodyScrollState = dbRects.scrollState;

    /* Fx3 (S,Q), S3 (S), O9, IE7: NOT stretch html & body elements */
    /* S3 (Q): stretch html & body elements */

    /* IE7 (Q): body's margin => viewport's margin; body's margin +
       border + padding => body's padding(-like area); html's margin +
       border + padding is ignored */
  } else {
    rects.documentBodyOffset = NodeRect.Rect.nosupport ();
    rects.documentBodyClient = NodeRect.Rect.nosupport ();
    rects.documentBodyScrollState = NodeRect.Rect.nosupport ();
    rects.documentBodyScrollableArea = NodeRect.Rect.nosupport ();
  }
  rects.documentBodyOffset.label = 'document.body.offset';
  rects.documentBodyClient.label = 'document.body.client';
  rects.documentBodyScrollableArea.label = 'document.body.scroll (width, height)';
  rects.documentBodyScrollState.label = 'document.body.scroll (top, left)';

  if (document.all) {
    if (quirks) {
      rects.scrollState = rects.documentBodyScrollState;
    } else {
      rects.scrollState = rects.documentElementScrollState;
    }
  } else {
    rects.scrollState = rects.windowPageOffset;
  }

  if (quirks) {
    rects.icb = rects.documentBodyClient;
    rects.icb = rects.icb.subtractOffset (rects.icb);
    /* This is not ICB in Firefox if the document is in the quirks mode
       and both |html| and |body| has scrollbars.  In such cases there
       is no way to obtain ICB (content edge), AFAICT. */
  } else {
    if (document.all) {
      rects.icb = rects.documentElementOffset;
      rects.boundingClientOrigin
          = rects.icb.subtractOffset (rects.documentElementClient);
    } else {
      rects.icb = rects.documentElementClient;
    }
  }

  if (!rects.boundingClientOrigin) {
    rects.boundingClientOrigin = rects.icb;
  }
  rects.boundingClientOrigin.label = 'Bounding client rect origin';

  /* Firefox's initial containing block is the padding box.  There is 
     no reliable way to detect the offset from the tl of canvas in Fx
     while returning zero in any other browsers AFAICT, sniffing Gecko by
     UA string. */
  if (navigator.userAgent.indexOf("Gecko/") >= 0) {
    rects.icb = rects.icb.addOffset (rects.documentElementOffset);
    rects.icb.label = 'ICB (origin: border edge of root element box)';

    var debc = docEl.getBoundingClientRect ();
    debc = NodeRect.Rect.trbl (debc.top, debc.right, debc.bottom, debc.left);
    debc.label = docEl.nodeName + ' boundingClientRect';

    var debcAbs = debc.addVector (rects.scrollState);
    debcAbs.label = docEl.nodeName + ' boundingClientRect (canvas origin)';

    rects.icb = rects.icb.subtractOffset (debcAbs);
    rects.icb.label = 'ICB (origin: margin edge of root element box)';
  }

  rects.contentBox = rects.icb.addVector (rects.scrollState);
  rects.contentBox.label = 'Viewport content box';

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
      = NodeRect.Rect.trbl (s.top || 0, null, null, s.left || 0, s.width, s.height);
  rects.device.label = 'screen device';

  /* top & left not supported by Opera, WinIE */
  rects.avail = NodeRect.Rect.trbl
      (s.availTop || 0, null, null, s.availLeft || 0,
       s.availWidth, s.availHeight);
  rects.avail.label = 'screen.avail';

  return rects;
}; // getScreenRects

if (window.NodeRectOnLoad) {
  NodeRectOnLoad ();
}

})();
