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
    if (type == 'cumulativeOffset') {
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

function setHighlight (rect, coords) {
  var left = rect.getRenderedLeft ();
  var top = rect.getRenderedTop ();

  var marker = document.createElement ('div');
  setCSSPosition (marker.style, coords == 'viewport' ? 'fixed' : 'absolute');
  marker.style.zIndex = '99999';
  marker.nrOriginalLeft = left;
  marker.nrOriginalTop = top;
  if (!isNaN (top)) marker.style.top = top + 'px';
  if (!isNaN (left)) marker.style.left = left + 'px';
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
    if (document.nrDragging) return;
    document.nrDragging = true;
    event = event || window.event;
    this.style.cursor = 'move';
    this.nrInitialX = parseFloat (this.style.left.slice (0, -2));
    this.nrInitialY = parseFloat (this.style.top.slice (0, -2));
    this.nrX = event.clientX;
    this.nrY = event.clientY;
  };
  marker.onmousemove = function (event) {
    if (this.style.cursor != 'move') return;
    event = event || window.event;
    var diffX = event.clientX - this.nrX; 
    var diffY = event.clientY - this.nrY;
    this.style.left = (this.nrInitialX + diffX) + 'px';
    this.style.top = (this.nrInitialY + diffY) + 'px';
  };
  marker.onmouseup = function (event) {
    document.nrDragging = false;
    this.style.cursor = 'default';
  };
  marker.ondblclick = function () {
    this.style.top = this.nrOriginalTop + 'px';
    this.style.left = this.nrOriginalLeft + 'px';
  };

  var label = rect.getFullLabel ? rect.getFullLabel () : '';
  marker.title = "*" + label + "* \n" + rect.toString ();

  var text = marker.appendChild (document.createElement ('div'));
  text.style.position = 'absolute';
  if (!isNaN (rect.width)) text.style.left = (rect.width / 2) + 'px';
  if (!isNaN (rect.height)) text.style.top = (rect.height / 2) + 'px';
  text.style.fontSize = '20px';
  text.appendChild (document.createTextNode (label));

  document.body.appendChild (marker);
  if (!document.highlightElements) document.highlightElements = [];
  document.highlightElements.push (marker);
  return marker;
} // setHighlight

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
  controller.innerHTML = '<form>\
  <textarea name=result style="width: 20em; height: 8em"></textarea><br>\
  <input name=selector value="body" onchange=" update(form) " onkeyup=" update(form) " style="width: 15em">\
  <input name=selectorIndex value=0 onchange=update(form) onkeyup=update(form) style=width:3em>\
  <input type=checkbox name=trace title="Show chain" onclick=update(form)>\
  <br>\
  <button type=button onclick=update(form)>update</button>\
  <select name=coords onchange=update(form)><option selected value=page>Page\
  <option value=viewport>Viewport</select>\
  <select name=prop onchange=update(form)>\
\
  <optgroup label="Screen coordinate">\
  <option value=boxObjectScreen>getBoxObjectFor.screen\
\
  <optgroup label="Canvas coordinate">\
  <option value="marginEdge">Margin edge</option>\
  <option selected value="borderEdge">Border edge</option>\
  <option value="cumulativeOffset">Cumulative offset</option>\
  <option value="paddingEdge">Padding edge</option>\
  <option value="cumulativeClient">Cumulative client</option>\
  <option value="contentEdge">Content edge</option>\
  <option value=boxObject>getBoxObjectFor\
\
  <optgroup label="Viewport coordinate">\
  <option value="boundingClient">getBoundingClientRect</option>\
\
  <optgroup label="Element coordinate">\
  <option value="offset">offset</option>\
  <option value="client">client</option>\
  <option value="scrollableArea">scroll (width, height)\
  <option value="scrollState">scroll (top, left)\
\
  <optgroup label="Box">\
  <option value="margin">margin</option>\
  <option value="border">border</option>\
  <option value="padding">padding</option>\
\
  <optgroup label=Canvas>\
  <option value=vp.canvasOrigin>Origin of canvas\
\
  <optgroup label=Viewport>\
  <option value=vp.contentBox>Content box\
  <!--<option value=vp.windowClient>Client-->\
  <option value=vp.icb>Initial containing block\
  <option value=vp.scrollState>Scroll state\
  <option value=vp.windowScrollXY>Scroll (x, y)\
  <!--<option value=vp.windowScrollTL>Scroll (top, left)-->\
  <option value=vp.windowPageOffset>Page offset\
  <option value=vp.windowScrollMax>Scroll maximum\
  <option value=vp.windowInner>Inner\
  <option value=vp.boundingClientOrigin>Origin of getBoundingClientRect\
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
  <option value=win.outer>Outer\
  <option value=win.screenXY>Screen (x, y)\
  <option value=win.screenTL>Screen (top, left)\
\
  <optgroup label=Screen>\
  <option value=screen.device>Device\
  <option value=screen.avail>Available\
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
