if (!self.NR) self.NR = {};

if (!NR.index) NR.index = 0;

NR.resetIndex = function () {
  NR.index = 0;
}; // resetIndex


/* --- NR.Rect - Rectangle area --- */

/* Constructors */

NR.Rect = function (t, r, b, l, w, h) {
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
  this.index = NR.index++;
  this.label = null;
  this.invalid = isNaN (this.top + this.right + this.bottom + this.left + 0);
}; // Rect

NR.Rect.wh = function (w, h) {
  return new NR.Rect (0, null, null, 0, w, h);
}; // wh

NR.Rect.whCSS = function (el, w, h) {
  var px = NR.Element.getPixelWH (el, w, h);
  return NR.Rect.wh (px.width, px.height);
}; // whCSS

NR.Rect.trbl = function (t, r, b, l) {
  return new NR.Rect (t, r, b, l);
}; // trbl

NR.Rect.trblCSS = function (el, t, r, b, l) {
  var lt = NR.Element.getPixelWH (el, l, t);
  var rb = NR.Element.getPixelWH (el, r, b);
  return NR.Rect.trbl (lt.height, rb.width, rb.height, lt.width);
}; // trblCSS

NR.Rect.tlwh = function (t, l, w, h) {
  return new NR.Rect (t, null, null, l, w, h);
}; // tlwh

/* Box rendering properties */

NR.Rect.prototype.getRenderedLeft = function () {
  return this.left;
}; // getRenderedLeft

NR.Rect.prototype.getRenderedTop = function () {
  return this.top;
}; // getRenderedTop

NR.Rect.prototype.getRenderedWidth = function () {
  return this.width;
}; // getRenderedWidth

NR.Rect.prototype.getRenderedHeight = function () {
  return this.height;
}; // getRenderedHeight

/* Operations */

NR.Rect.prototype.add = function (arg) {
  var r;
  if (arg instanceof NR.Vector) {
      r = new this.constructor
          (this.top + arg.y, null, null, this.left + arg.x,
           this.width, this.height);
    r.prevOp = 'add-vector'; 
  } else if (arg instanceof NR.Band) {
    r = new this.constructor
        (this.top - Math.abs (arg.top),
         this.right + Math.abs (arg.right),
         this.bottom + Math.abs (arg.bottom),
         this.left - Math.abs (arg.left));
    r.prevOp = 'out-edge'; 
  } else {
    throw (arg + " is not a NR.Vector or NR.Band");
  }

  r.prev1 = this;
  r.prev2 = arg;
  r.invalid = this.invalid && arg.invalid;
  return r;
}; // add

NR.Rect.prototype.subtract = function (arg) {
  var r;
  if (arg instanceof NR.Vector) {
      r = new this.constructor
          (this.top - arg.y, null, null, this.left - arg.x,
           this.width, this.height);
    r.prevOp = 'add-vector'; 
  } else if (arg instanceof NR.Band) {
      r = new this.constructor
          (this.top + Math.abs (arg.top),
           this.right - Math.abs (arg.right),
           this.bottom - Math.abs (arg.bottom),
           this.left + Math.abs (arg.left));
      r.prevOp = 'in-edge'; 
  } else {
    throw (arg + " is not a NR.Vector or NR.Band");
  }

  r.prev1 = this;
  r.prev2 = arg;
  r.invalid = this.invalid && arg.invalid;
  return r;
}; // subtract

NR.Rect.prototype.getTopLeft = function () {
  var o = new NR.Vector (this.left, this.top);
  o.prevOp = 'topleft';
  o.prev1 = this;
  o.invalid = this.invalid;
  o.label = this.label + ', top-left corner';
  return o;
}; // getTopLeft

/* Stringifications */

NR.Rect.prototype.getFullLabel = function () {
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

NR.Rect.prototype.toString = function () {
  var r = '';
  if (this.invalid) {
    r += "Invalid \n";
  }
  r += 'Top: ' + this.top + " \n";
  r += 'Right: ' + this.right + " \n";
  r += 'Bottom: ' + this.bottom + " \n";
  r += 'Left: ' + this.left + " \n";
  r += 'Width: ' + this.width + " \n";
  r += 'Height: ' + this.height + " \n";
  return r;
}; // toString

/* Invalid */

NR.Rect.invalid = new NR.Rect (0, 0, 0, 0);
NR.Rect.invalid.label = 'Invalid';
NR.Rect.invalid.invalid = true;


/* --- NR.Vector - Vector --- */

/* Constructor */

NR.Vector = function (x /* width */, y /* height */) {
  this.x = x;
  this.y = y;
  this.width = Math.abs (x);
  this.height = Math.abs (y);
  this.invalid = isNaN (x + y + 0);
  this.index = NR.index++;
  this.label = null;
}; // Vector

/* Box rendering properties */

NR.Vector.prototype.getRenderedLeft = function () {
  return this.x < 0 ? -this.width : 0;
}; // getRenderedLeft

NR.Vector.prototype.getRenderedTop = function () {
  return this.y < 0 ? -this.height : 0;
}; // getRenderedTop

NR.Vector.prototype.getRenderedWidth = function () {
  return this.width;
}; // getRenderedWidth

NR.Vector.prototype.getRenderedHeight = function () {
  return this.height;
}; // getRenderedHeight

/* Operations */

NR.Vector.prototype.negate = function () {
  var r = new this.constructor (-this.x, -this.y);
  r.invalid = this.invalid;
  r.prevOp = 'negate';
  r.prev1 = this;
  r.label = this.label + ', negated';
  return r;
}; // negate

NR.Vector.prototype.add = function (arg) {
  if (!arg instanceof NR.Vector) {
    throw (arg + " is not a NR.Vector");
  }
  var r = new arg.constructor (this.x + arg.x, this.y + arg.y);
  r.invalid = this.invalid && arg.invalid;
  r.prevOp = 'add-vector';
  r.prev1 = this;
  r.prev2 = arg;
  return r;
}; // add

NR.Vector.prototype.subtract = function (arg) {
  if (!arg instanceof NR.Vector) {
    throw (arg + " is not a NR.Vector");
  }
  var r = new arg.constructor (this.x - arg.x, this.y - arg.y);
  r.invalid = this.invalid && arg.invalid;
  r.prevOp = 'sub-vector';
  r.prev1 = this;
  r.prev2 = arg;
  return r;
}; // subtract

/* Stringifications */

NR.Vector.prototype.getFullLabel = function () {
  var label;
  if (this.prevOp === 'topleft' || this.prevOp === 'negate') {
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

NR.Vector.prototype.toString = function () {
  var r = '';
  if (this.invalid) {
    r = 'Invalid \n';
  }
  r += '(horizontal, vertical) = (x, y) = (';
  r += this.x + ', ';
  r += this.y + ') \n';
  return r;
}; // toString

/* Invalid */

NR.Vector.invalid = new NR.Vector (0, 0);
NR.Vector.invalid.label = 'Invalid';
NR.Vector.invalid.invalid = true;


/* --- NR.Band - Rectangle area with rectangle hole --- */

/* Constructors */

NR.Band = function (t, r, b, l) {
  this.top = t;
  this.right = r;
  this.bottom = b;
  this.left = l;
  this.invalid = isNaN (t + r + b + l + 0);
  this.index = NR.index++;
  this.label = null;
}; // Band

NR.Band.css = function (el, t, r, b, l) {
  var lt = NR.Element.getPixelWH (el, l, t);
  var rb = NR.Element.getPixelWH (el, r, b);
  return new NR.Band (lt.top, rb.right, rb.bottom, lt.left);
}; // css

/* Box rendering properties */

NR.Band.prototype.getRenderedLeft = function () {
  return -this.left;
}; // getRenderedLeft

NR.Band.prototype.getRenderedTop = function () {
  return -this.top;
}; // getRenderedTop

NR.Band.prototype.getRenderedWidth = function () {
  return this.left + this.right;
}; // getRenderedWidth

NR.Band.prototype.getRenderedHeight = function () {
  return this.top + this.bottom;
}; // getRenderedHeight

/* Operations */

NR.Band.prototype.getTopLeft = function () {
  var r = new NR.Vector (-this.left, -this.top);
  r.invalid = this.invalid;
  r.prevOp = 'topleft';
  r.prev1 = this;
  r.label = this.label + ', outside edge top-left corner, from inside edge';
  return r;
}; // getTopLeft

NR.Band.prototype.add = function (arg) {
  if (!arg instanceof NR.Band) {
    throw (arg + " is not a NR.Band");
  }
  var r = new arg.constructor
      (this.top + arg.top, this.right + arg.right,
       this.bottom + arg.bottom, this.left + arg.left);
  r.invalid = this.invalid && arg.invalid;
  r.prevOp = 'out-edge';
  r.prev1 = this;
  r.prev2 = arg;
  return r;
}; // add

NR.Band.prototype.and = function (arg) {
  if (!arg instanceof NR.Band) {
    throw (arg + " is not a NR.Band");
  }
  var r = new arg.constructor
      (arg.top != 0 ? this.top : 0, arg.right != 0 ? this.right : 0,
       arg.bottom != 0 ? this.bottom : 0, arg.left != 0 ? this.left : 0);
  r.invalid = this.invalid && arg.invalid;
  r.prevOp = 'and';
  r.prev1 = this;
  r.prev2 = arg;
  return r;
}; // and

/* Stringifications */

NR.Band.prototype.getFullLabel = function () {
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

NR.Band.prototype.toString = function () {
  var r = '';
  if (this.invalid) {
    r = 'Invalid \n';
  }
  r += 'Top: ' + this.top + ' \n';
  r += 'Right: ' + this.right + ' \n';
  r += 'Bottom: ' + this.bottom + ' \n';
  r += 'Left: ' + this.left + ' \n';
  return r;
}; // toString

/* Invalid */

NR.Band.invalid = new NR.Band (0, 0, 0, 0);
NR.Band.invalid.label = 'Invalid';
NR.Band.invalid.invalid = true;


/* --- NR.Element --- */

if (!NR.Element) NR.Element = {};

NR.Element.getPixelWH = function (el, w, h) {
  var testEl = el.ownerDocument.createElement ('div');
  testEl.style.display = 'block';
  testEl.style.position = 'absolute';
  testEl.style.margin = 0;
  testEl.style.borderWidth = 0;
  testEl.style.padding = 0;
  var icw = testEl.clientWidth;
  var ich = testEl.clientHeight;
  var ws = 1;
  w = (w + '').replace (/^-/, function () { ws = -1; return '' });
  if (w == 'auto') w = 0;
  var hs = 1;
  h = (h + '').replace (/^-/, function () { hs = -1; return '' });
  if (h == 'auto') h = 0;
  try {
    testEl.style.width = w;
    testEl.style.height = h;
  } catch (e) {
  }
  el.appendChild (testEl);
  var px = {width: testEl.clientWidth - icw, height: testEl.clientHeight - ich};
  px.width *= ws;
  px.height *= hs;
  el.removeChild (testEl);
  return px;
}; // getPixelWH

NR.Element.getCumulativeOffsetRect = function (oel, view) {
  var el = oel;

  var en = new NR.Band (0, 0, 0, 0);
  en.label = 'Zero-width band';

  if (/WebKit/.test (navigator.userAgent)) {
    var docEl = el.ownerDocument.documentElement;
    var bodyEl = el.ownerDocument.body;

    /* This correction does not always work when margin collapse
       occurs - to take that effect into account, all children in the layout
       structure have to be checked. */

    if (docEl) {
      var rects = NR.Element.getBoxAreas (docEl, view);

      if (docEl == oel) {
        /* BUG: If viewport is not the root element, this should not be added. */
        en = rects.padding;
      } else if (bodyEl == oel) {
        en = rects.border.add (rects.margin);
        en.label = docEl.nodeName + ' margin + border';
        en = en.add (rects.padding);
        en.label = docEl.nodeName + ' margin + border + padding';
      } else {
        en = rects.padding.add (rects.border);
        en.label = docEl.nodeName + ' border + padding';
        en = en.and (rects.border);
        en.label = docEl.nodeName + ' border ? border + padding : 0';
      }
    }

    if (bodyEl) {
      var rects = NR.Element.getBoxAreas (bodyEl, view);
      
      if (bodyEl == oel) {
        en = en.add (rects.margin);
        en.label += ', with ' + bodyEl.nodeName + ' margin';
      } else {
        en = en.add (rects.border);
        en.label += ', with ' + bodyEl.nodeName + ' border';
      }
    }

    /* td:first-child's offsetTop might not be correct - no idea when this
       occurs and how to fix this. */
  }

  var origin = en.getTopLeft ().negate ();

  var offsetChain = [];
  while (el) {
    offsetChain.unshift (el);
    el = el.offsetParent;
  }

  while (offsetChain.length) {
    var el = offsetChain.shift ();

    var offset = new NR.Vector (el.offsetLeft, el.offsetTop);
    offset.label = el.nodeName + '.offset';

    origin = origin.add (offset);
    origin.label = el.nodeName + ' cumulative offset';
    
    el = el.offsetParent;
  }

  if (view.opera && /* Opera 9.52 */
      oel == oel.ownerDocument.body) {
    var cssRects = NR.Element.getBoxAreas (oel, view);
    origin = origin.add (cssRects.margin.getTopLeft ());
    origin.label = oel.nodeName + ' adjusted offset';
  }

  var offsetBox = NR.Rect.wh (oel.offsetWidth, oel.offsetHeight);
  offsetBox.label = oel.nodeName + ' offset box (width/height)';

  var rect = offsetBox.add (origin);
  rect.label = oel.nodeName + ' cumulative offset box';

  return rect;
}; // getCumulativeOffsetRect

NR.Element.getBoxAreas = function (el, view) {
  var rects = {};
  if (view.getComputedStyle) {
    var cs = view.getComputedStyle (el, null);
    rects.margin = new NR.Band (
      parseFloat (cs.marginTop.slice (0, -2)),
      parseFloat (cs.marginRight.slice (0, -2)),
      parseFloat (cs.marginBottom.slice (0, -2)),
      parseFloat (cs.marginLeft.slice (0, -2))
    );
    rects.border = new NR.Band (
      parseFloat (cs.borderTopWidth.slice (0, -2)),
      parseFloat (cs.borderRightWidth.slice (0, -2)),
      parseFloat (cs.borderBottomWidth.slice (0, -2)),
      parseFloat (cs.borderLeftWidth.slice (0, -2))
    );
    rects.padding = new NR.Band (
      parseFloat (cs.paddingTop.slice (0, -2)),
      parseFloat (cs.paddingRight.slice (0, -2)),
      parseFloat (cs.paddingBottom.slice (0, -2)),
      parseFloat (cs.paddingLeft.slice (0, -2))
    );
    rects.margin.label = el.nodeName + ' computedStyle.margin';
    rects.border.label = el.nodeName + ' computedStyle.border';
    rects.padding.label = el.nodeName + ' computedStyle.padding';
  } else if (el.currentStyle) {
    var cs = el.currentStyle;
    rects.margin = NR.Band.css
        (el, cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft);
    var bs = [cs.borderTopStyle, cs.borderRightStyle,
              cs.borderBottomStyle, cs.borderLeftStyle];
    rects.border = NR.Band.css
        (el,
         bs[0] == 'none' ? 0 : cs.borderTopWidth,
         bs[1] == 'none' ? 0 : cs.borderRightWidth,
         bs[2] == 'none' ? 0 : cs.borderBottomWidth,
         bs[3] == 'none' ? 0 : cs.borderLeftWidth);
    rects.padding = NR.Band.css
        (el, cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft);
    rects.margin.label = el.nodeName + ' computedStyle.margin';
    rects.border.label = el.nodeName + ' computedStyle.border';
    rects.padding.label = el.nodeName + ' computedStyle.padding';
  } else {
    rects.margin = NR.Band.invalid;
    rects.border = NR.Band.invalid;
    rects.padding = NR.Band.invalid;
  }
  return rects;
}; // getBoxAreas

NR.Element.getAttrRects = function (el) {
  var rects = {};

  /* See <http://suika.fam.cx/%7Ewakaba/wiki/sw/n/offset%2A> for
     compatibility problems. */

  rects.offset = NR.Rect.tlwh
      (el.offsetTop, el.offsetLeft, el.offsetWidth, el.offsetHeight);
  rects.offset.label = el.nodeName + '.offset';

  rects.client = NR.Rect.tlwh
      (el.clientTop, el.clientLeft, el.clientWidth, el.clientHeight);
  rects.client.label = el.nodeName + '.client';

  rects.scrollableArea = NR.Rect.wh (el.scrollWidth, el.scrollHeight);
  rects.scrollableArea.label = el.nodeName + '.scroll (width, height)';

  rects.scrollState = new NR.Vector (el.scrollLeft, el.scrollTop);
  rects.scrollState.label = el.nodeName + '.scroll (left, top)';

  return rects;
}; // getAttrRects

NR.Element.getRects = function (el, view) {
  var rects = {};

  if (el.getBoundingClientRect) {
    var origin = NR.View.getViewportRects (view).boundingClientOrigin;

    var bb = el.getBoundingClientRect ();
    rects.boundingClient
        = NR.Rect.trbl (bb.top, bb.right, bb.bottom, bb.left);
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = rects.boundingClient.add (origin);
    rects.borderEdge.label = el.nodeName + ' border edge';
  } else {
    rects.boundingClient = NR.Rect.invalid;
    rects.boundingClient.label = el.nodeName + '.boundingClient';

    rects.borderEdge = NR.Element.getCumulativeOffsetRect (el, view);
  }

  /* Gecko-only, deprecated */
  if (el.ownerDocument.getBoxObjectFor) {
    var bo = el.ownerDocument.getBoxObjectFor (el);
    rects.boxObject = NR.Rect.tlwh (bo.y, bo.x, bo.width, bo.height);
    rects.boxObjectScreen = new NR.Vector (bo.screenX, bo.screenY);
    rects.boxObject.label = el.nodeName + ' boxObject';
    rects.boxObjectScreen.label = el.nodeName + ' boxObject.screen';
  } else {
    rects.boxObject = NR.Rect.invalid;
    rects.boxObjectScreen = NR.Vector.invalid;
  }

  var elRects = NR.Element.getAttrRects (el);
  rects.offset = elRects.offset;
  rects.client = elRects.client;
  rects.scrollableArea = elRects.scrollableArea;
  rects.scrollState = elRects.scrollState;
  
  var cssRects = NR.Element.getBoxAreas (el, view);
  rects.margin = cssRects.margin;
  rects.border = cssRects.border;
  rects.padding = cssRects.padding;

  /* Wrong if |el| has multiple line boxes. */
  rects.marginEdge = rects.borderEdge.add (rects.margin);
  rects.marginEdge.label = el.nodeName + ' margin edge';

  return rects;
}; // getRects


/* --- NR.View --- */

if (!NR.View) NR.View = {};

NR.View.getViewportRects = function (view) {
  var doc = view.document;
  var docEl = doc.documentElement;
  var bodyEl = doc.body;

  var quirks = doc.compatMode != 'CSS1Compat';
  
  var rects = {};

  /* Fx, WebKit, Opera: entire viewport (including scrollbars),
     Not supported by WinIE */
  rects.windowInner = NR.Rect.wh (view.innerWidth, view.innerHeight);
  rects.windowInner.label = 'window.inner';

  /* Not supported by WinIE */
  rects.windowPageOffset = new NR.Vector (view.pageXOffset, view.pageYOffset);
  rects.windowPageOffset.label = 'window.pageOffset';

  /* Fx3, WebKit: Same as page offset; Not supported by Opera, WinIE */
  rects.windowScrollXY = new NR.Vector (view.scrollX, view.scrollY);
  rects.windowScrollXY.label = 'window.scroll (x, y)';

  /* Not supported by WebKit, Opera, WinIE */
  rects.windowScrollMax = new NR.Vector (view.scrollMaxX, view.scrollMaxY);
  rects.windowScrollMax.label = 'window.scrollMax';

  /* Not supported by Opera, WinIE */
  rects.document = NR.Rect.wh (doc.width, doc.height);
  rects.document.label = 'Document';

  if (docEl) {
    var deRects = NR.Element.getAttrRects (docEl);
    rects.deOffset = deRects.offset;
    rects.deClient = deRects.client;
    rects.deScrollableArea = deRects.scrollableArea;
    rects.deScrollState = deRects.scrollState;
  } else {
    rects.deOffset = NR.Rect.invalid;
    rects.deClient = NR.Rect.invalid;
    rects.deScrollableArea = NR.Rect.invalid;
    rects.deScrollState = NR.Vector.invalid;
  }

  if (bodyEl) {
    var dbRects = NR.Element.getAttrRects (bodyEl);
    rects.bodyOffset = dbRects.offset;
    rects.bodyClient = dbRects.client;
    rects.bodyScrollableArea = dbRects.scrollableArea;
    rects.bodyScrollState = dbRects.scrollState;
  } else {
    rects.bodyOffset = NR.Rect.invalid;
    rects.bodyClient = NR.Rect.invalid;
    rects.bodyScrollState = NR.Rect.invalid;
    rects.bodyScrollableArea = NR.Vector.invalid;
  }

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
    rects.icb = rects.icb.subtract (rects.icb.getTopLeft ()); // Safari
    /* This is not ICB in Firefox if the document is in the quirks mode
       and both |html| and |body| has scrollbars.  In such cases there
       is no way to obtain ICB (content edge), AFAICT. */

    if (document.all) {
      var docElRects = NodeRect.getBoxAreas (bodyEl, view);
      rects.boundingClientOrigin = docElRects.border.getTopLeft ();
      rects.boundingClientOrigin.label = 'Viewport border offset';
    }
  } else {
    if (document.all) {
      rects.icb = rects.deOffset;

      rects.boundingClientOrigin = rects.icb.subtract (rects.deClient.getTopLeft ());
      rects.boundingClientOrigin.label
          = rects.icb.label + ' - documentElement.client';

      rects.boundingClientOrigin = rects.boundingClientOrigin.getTopLeft ();
    } else {
      rects.icb = rects.deClient;
    }
  }

  /* Firefox's initial containing block is the padding box.  There is 
     no reliable way to detect the offset from the tl of canvas in Fx
     while returning zero in any other browsers AFAICT, sniffing Gecko by
     UA string. */
  if (navigator.userAgent.indexOf("Gecko/") >= 0) {
    var deBorder = rects.deOffset.getTopLeft ();
    deBorder.label = 'padding edge -> border edge of root element box';

    var debc = docEl.getBoundingClientRect ();
    debc = NR.Rect.trbl (debc.top, debc.right, debc.bottom, debc.left);
    debc.label = docEl.nodeName + ' boundingClientRect';

    var debcAbs = debc.add (rects.scrollState);
    debcAbs.label = debc.label + ', canvas origin';

    var deMargin = debcAbs.getTopLeft ();
    deMargin.label = 'margin edge -> border edge of root element box';

    rects.canvasOrigin = deBorder.add (deMargin.negate ());
    rects.canvasOrigin.label = 'Canvas origin';

    rects.icb = rects.icb.subtract (rects.canvasOrigin);
    rects.icb.label = 'ICB (origin: margin edge of root element box)';
  } else {
    rects.canvasOrigin = new NR.Vector (0, 0);
    rects.canvasOrigin.label = 'Canvas origin';
  }

  rects.contentBox = rects.icb.add (rects.scrollState);
  rects.contentBox.label = 'Viewport content box';

  if (rects.boundingClientOrigin) {
    rects.boundingClientOrigin
        = rects.boundingClientOrigin.add (rects.scrollState);
    rects.boundingClientOrigin.label = 'Bounding client rect origin';
  } else {
    rects.boundingClientOrigin = rects.scrollState;
  }

  rects.boundingClientOrigin
      = rects.boundingClientOrigin.add (rects.canvasOrigin);
  rects.boundingClientOrigin.label = 'Bounding client rect origin (canvas origin)';

  return rects;
}; // getViewportRects

NR.View.getWindowRects = function (view) {
  var rects = {};

  /* Not supported by WinIE */
  rects.outer = NR.Rect.wh (view.outerWidth, view.outerHeight);
  rects.outer.label = 'window.outer';

  /* Opera: Wrong; Not supported by WinIE */
  rects.screenXY = new NR.Vector (view.screenX, view.screenY);
  rects.screenXY.label = 'window.screen (x, y)';

  /* Not supported by Fx3 */
  rects.screenTL = new NR.Vector (view.screenLeft, view.screenTop);
  rects.screenTL.label = 'window.screen (top, left)';

  return rects;
}; // getWindowRects

NR.View.getScreenRects = function (view) {
  var s = view.screen;

  var rects = {};
 
  /* top & left not supported by Opera, WinIE, WebKit */
  rects.device = NR.Rect.tlwh (s.top || 0, s.left || 0, s.width, s.height);
  rects.device.label = 'screen device';

  /* top & left not supported by Opera, WinIE */
  rects.avail = NR.Rect.tlwh
      (s.availTop || 0, s.availLeft || 0, s.availWidth, s.availHeight);
  rects.avail.label = 'screen.avail';

  return rects;
}; // getScreenRects



if (self.NROnLoad) {
  NROnLoad ();
}
