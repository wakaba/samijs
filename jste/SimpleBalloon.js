/*

This script requires NR.js
<https://suika.suikawiki.org/www/css/noderect/NodeRect.js> and tutorial.js
<https://suika.suikawiki.org/www/js/jste/tutorial.js>.

*/

var SimpleBalloon = new JSTE.Class (function (messageContainer, refElement) {
  if (!messageContainer) return;

  if (document.all && this.constructor === SimpleBalloon) {
    return new SimpleBalloonVML (messageContainer, refElement);
  }

  this.element = document.createElement ('article');
  this.element.className = 'sbs-container';
  document.body.appendChild (this.element);

  this.contentElement = messageContainer;
  this.element.appendChild (messageContainer);

  this._renderBorder ();

  this.refElement = refElement;
  this._renderPointer ();
  if (refElement) {
    JSTE.Element.addClassName (refElement, 'sbs-selected');
    JSTE.Element.addClassName (this.element, 'sbs-with-refelement');
  } else {
    JSTE.Element.addClassName (this.element, 'sbs-without-refelement');
  }

  this.forceRedraw ();
  
  JSTE.Element.scroll (new JSTE.List ([refElement]).onlyNonNull ());
}, {
  SVGNS: 'http://www.w3.org/2000/svg',

  remove: function () {
    if (this.refElement) {
      JSTE.Element.deleteClassName (this.refElement, 'sbs-selected');
    }
  }, // remove

  _renderBorder: function () {
    var msgRects = NR.Element.getRects (this.contentElement, window);
    var msgRect = msgRects.borderBox;

    var bb = this.getComputedStyle ();

    var bwDelta = bb.marginLeft + bb.borderLeftWidth + bb.paddingLeft;
    var bhDelta = bb.marginTop + bb.borderTopWidth + bb.paddingTop;
    var boxMBWidth = msgRect.width + bwDelta
        + bb.marginRight + bb.borderRightWidth + bb.paddingRight;
    var boxMBHeight = msgRect.height + bhDelta
        + bb.marginBottom + bb.borderBottomWidth + bb.paddingBottom;

    var box = document.createElementNS (this.SVGNS, 'svg');
    box.style.display = 'block';
    box.style.position = 'absolute';
    box.style.top = -bhDelta + 'px';
    box.style.left = -bwDelta + 'px';

    /* This is necessary to render the content element over the border SVG
       element. */
    this.contentElement.style.position = 'relative';

    box.setAttribute ('width', boxMBWidth);
    box.setAttribute ('height', boxMBHeight);

    var bbTop = bb.marginTop + bb.borderTopWidth / 2;
    var bbRight = boxMBWidth - bb.marginLeft - bb.borderLeftWidth / 2
        - bb.marginRight - bb.borderRightWidth / 2;
    var bbLeft = bb.marginLeft + bb.borderLeftWidth / 2;
    var bbBottom = boxMBHeight - bb.marginTop - bb.marginBottom
        - bb.borderTopWidth / 2 - bb.borderBottomWidth / 2;

    var boxBorder = document.createElementNS (this.SVGNS, 'path');
    boxBorder.setAttribute ('d', [
      'M', bbLeft + bb.manakaiBorderTopLeftRadiusHorizontal, bbTop,

      'L', bbRight - bb.manakaiBorderTopRightRadiusHorizontal, bbTop,

      'a',
      bb.manakaiBorderTopRightRadiusHorizontal,
      bb.manakaiBorderTopRightRadiusVertical, 0, 0, 1, 
      bb.manakaiBorderTopRightRadiusHorizontal,
      bb.manakaiBorderTopRightRadiusVertical,

      'L', bbRight, bbBottom - bb.manakaiBorderBottomRightRadiusVertical,
  
      'a',
      bb.manakaiBorderBottomRightRadiusHorizontal,
      bb.manakaiBorderBottomRightRadiusVertical, 0, 0, 1,
      -bb.manakaiBorderBottomRightRadiusHorizontal,
      bb.manakaiBorderBottomRightRadiusVertical,    

      'L', bbLeft + bb.manakaiBorderBottomLeftRadiusHorizontal, bbBottom,

      'a',
      bb.manakaiBorderBottomLeftRadiusHorizontal,
      bb.manakaiBorderBottomLeftRadiusVertical, 0, 0, 1,
      -bb.manakaiBorderBottomLeftRadiusHorizontal,
      -bb.manakaiBorderBottomLeftRadiusVertical,    

      'L', bbLeft, bbTop + bb.manakaiBorderTopLeftRadiusVertical,

      'a',
      bb.manakaiBorderTopLeftRadiusHorizontal,
      bb.manakaiBorderTopLeftRadiusVertical, 0, 0, 1,
      bb.manakaiBorderTopLeftRadiusHorizontal,
      -bb.manakaiBorderTopLeftRadiusVertical
    ].join (' '));
    boxBorder.setAttribute ('stroke', bb.borderColor);
    boxBorder.setAttribute ('stroke-width', bb.borderWidth);
    boxBorder.setAttribute ('fill', bb.backgroundColor);

    box.appendChild (boxBorder);

    this.element.insertBefore (box, this.element.firstChild);
  }, // _renderBorder
  _renderPointer: function () {
    var bb = this.getComputedStyle ();

    if (this.refElement) {
      var rects = NR.Element.getRects (this.refElement, window);
      var rbb = rects.borderBox;

      var left = rbb.left + rbb.width * 3 / 4 - bb.manakaiPointerSource;
      if (left < 0) left = bb.borderLeftWidth + bb.paddingLeft;
      var top = rbb.bottom + bb.manakaiPointerOffset
          + bb.manakaiPointerHeight + bb.paddingTop;

      var elbb = NR.Element.getRects (this.element, window).borderBox;
      var elbbWidth = /* bb.borderLeftWidth + bb.paddingLeft + */ elbb.width
          + bb.paddingRight + bb.borderRightWidth
          + bb.marginRight /* to avoid horizontal scrollbar */;
      var vp = NR.View.getViewportRects (window, document).contentBox;
      if (vp.right < left + elbbWidth && rbb.left <= vp.right - elbbWidth) {
        left = vp.right - elbbWidth;
      }

      this.element.style.top = top + 'px';
      this.element.style.left = left + 'px';
    }

    var pointerSVGElement = document.createElementNS (this.SVGNS, 'svg');
    pointerSVGElement.setAttribute ('width', bb.manakaiPointerWidth);
    pointerSVGElement.setAttribute ('height', bb.manakaiPointerHeight);
    pointerSVGElement.style.display = 'block';
    pointerSVGElement.style.position = 'absolute';
    pointerSVGElement.style.top = -(bb.manakaiPointerHeight + bb.paddingTop) + 'px';
    pointerSVGElement.style.left = (bb.manakaiPointerSource - bb.manakaiPointerWidth / 2) + 'px';
  
    var pointerElement = document.createElementNS (this.SVGNS, 'path');
    if (this.refElement) {
      pointerElement.setAttribute ('d', [
        'M', bb.manakaiPointerWidth, bb.manakaiPointerHeight,
        'Q', bb.manakaiPointerWidth * 3 / 4, bb.manakaiPointerHeight,
        bb.manakaiPointerWidth / 2, 0,
        'Q', bb.manakaiPointerWidth / 4, bb.manakaiPointerHeight,
        0, bb.manakaiPointerHeight].join (' '));
    } else {
      pointerElement.setAttribute ('d', [
        'M', 0, bb.manakaiPointerHeight,
        'L', bb.manakaiPointerWidth, bb.manakaiPointerHeight
      ].join (' '));
    }

    pointerElement.setAttribute ('stroke', bb.borderColor);
    pointerElement.setAttribute ('stroke-width', bb.borderWidth);
    pointerElement.setAttribute ('fill', bb.backgroundColor);

    pointerSVGElement.appendChild (pointerElement);

    this.element.appendChild (pointerSVGElement);
  }, // _renderPointer

  getComputedStyle: function (pseudoEl) {
    if (pseudoEl == null) {
      var boxMargin = 1;
      var boxBorderWidth = 4; // use even number to avoid use of non-integer pixels not supported by VML
      var boxBorderColor = 'green';
      var boxBorderRadiusHorizontal = 10;
      var boxBorderRadiusVertical = 10;
      var boxPadding = 10;
      var pointerBoxMargin = 6;
      var pointerBoxWidth = 20;
      var pointerBoxHeight = 40;
      var pointerBoxLeft = 20;

      return {
        marginTop: boxMargin, marginRight: boxMargin, marginBottom: boxMargin,
        marginLeft: boxMargin,
        borderColor: boxBorderColor,
        borderTopColor: boxBorderColor, borderRightColor: boxBorderColor,
        borderBottomColor: boxBorderColor, borderLeftColor: boxBorderColor,
        borderWidth: boxBorderWidth,
        borderTopWidth: boxBorderWidth, borderRightWidth: boxBorderWidth,
        borderBottomWidth: boxBorderWidth, borderLeftWidth: boxBorderWidth,
        manakaiBorderTopLeftRadiusHorizontal: boxBorderRadiusHorizontal,
        manakaiBorderTopLeftRadiusVertical: boxBorderRadiusVertical,
        manakaiBorderTopRightRadiusHorizontal: boxBorderRadiusHorizontal,
        manakaiBorderTopRightRadiusVertical: boxBorderRadiusVertical,
        manakaiBorderBottomLeftRadiusHorizontal: boxBorderRadiusHorizontal,
        manakaiBorderBottomLeftRadiusVertical: boxBorderRadiusVertical,
        manakaiBorderBottomRightRadiusHorizontal: boxBorderRadiusHorizontal,
        manakaiBorderBottomRightRadiusVertical: boxBorderRadiusVertical,
        paddingTop: boxPadding, paddingRight: boxPadding,
        paddingBottom: boxPadding, paddingLeft: boxPadding,
        backgroundColor: this.getBackgroundColor (),
        manakaiPointerWidth: pointerBoxWidth,
        manakaiPointerHeight: pointerBoxHeight,
        manakaiPointerOffset: pointerBoxMargin,
        manakaiPointerSource: pointerBoxLeft
      };
    } else {
      return {};
    }
  }, // getComputedStyle

  getBackgroundColor: function () {
    var el = this.contentElement;
    if (window.getComputedStyle) {
      return getComputedStyle (el, null).backgroundColor;
    } else if (el.currentStyle) {
      return el.currentStyle.backgroundColor;
    } else {
      return 'white';
    }
  }, // getBackgroundColor

  forceRedraw: function () {
    // Safari 3.2.1 for Windows Vista (Aero enabled) does not always paint
    // SVG borders correctly.  (Chrome does, however.)
    if (SimpleBalloon.isSafari) {
      var rects = NR.View.getViewportRects (window, document);
      var vp = rects.contentBox;
      var el = document.createElement ('non-styled-element');
      el.style.display = 'block';
      el.style.position = 'absolute';
      el.style.top = vp.top + 'px';
      el.style.left = vp.left + 'px';
      el.style.width = vp.width + 'px';
      el.style.height = vp.height + 'px';
      document.body.appendChild (el);
      setTimeout (function () { document.body.removeChild (el) }, 1);
    }
  } // forceRedraw
}); // SimpleBalloon

SimpleBalloon.isSafari = navigator.userAgent.indexOf ("Safari") > -1;

var SimpleBalloonVML = new JSTE.Subclass (function () {
  if (!document.namespaces._vml_) {
    document.namespaces.add ('_vml_', 'urn:schemas-microsoft-com:vml');
  }

  if (!SimpleBalloonVML.vmlEnabled) {
    SimpleBalloonVML.vmlEnabled = true;
    var ss = document.createStyleSheet ();
    ss.cssText = '_vml_\\:* { behavior: url(#default#VML) }';
  }

  this._super.apply (this, arguments);
}, SimpleBalloon, {
  _renderBorder: function () {
    var msgRects = NR.Element.getRects (this.contentElement, window);
    var msgRect = msgRects.borderBox;

    var bb = this.getComputedStyle ();

    var bwDelta = bb.marginLeft + bb.borderLeftWidth + bb.paddingLeft;
    var bhDelta = bb.marginTop + bb.borderTopWidth + bb.paddingTop;
    var boxMBWidth = msgRect.width + bwDelta
        + bb.marginRight + bb.borderRightWidth + bb.paddingRight;
    var boxMBHeight = msgRect.height + bhDelta
        + bb.marginBottom + bb.borderBottomWidth + bb.paddingBottom;

    var vShape = document.createElement ('_vml_:shape');
    vShape.style.display = 'block';
    vShape.style.position = 'absolute';
    vShape.style.top = -bhDelta + 'px';
    vShape.style.left = -bwDelta + 'px';

    /* This is necessary to render the content element over the border SVG
       element. */
    this.contentElement.style.position = 'relative';

    vShape.style.width = boxMBWidth + 'px';
    vShape.style.height = boxMBHeight + 'px';

    var bbTop = bb.marginTop + bb.borderTopWidth / 2;
    var bbRight = boxMBWidth - bb.marginLeft - bb.borderLeftWidth / 2
        - bb.marginRight - bb.borderRightWidth / 2;
    var bbLeft = bb.marginLeft + bb.borderLeftWidth / 2;
    var bbBottom = boxMBHeight - bb.marginTop - bb.marginBottom
        - bb.borderTopWidth / 2 - bb.borderBottomWidth / 2;

    var vPath = document.createElement ('_vml_:path');
    vPath.setAttribute ('v', new JSTE.List ([
      'm', bb.marginLeft + bb.borderLeftWidth + bb.paddingLeft + bb.manakaiPointerSource + bb.manakaiPointerWidth / 2, bbTop,

      'l', bbRight - bb.manakaiBorderTopRightRadiusHorizontal, bbTop,

      'qx',
      bbRight,
      bbTop + bb.manakaiBorderTopRightRadiusVertical,

      'l', bbRight, bbBottom - bb.manakaiBorderBottomRightRadiusVertical,

      'qy',
      bbRight - bb.manakaiBorderBottomRightRadiusHorizontal,
      bbBottom,

      'l', bbLeft + bb.manakaiBorderBottomLeftRadiusHorizontal, bbBottom,

      'qx',
      bbLeft,
      bbBottom - bb.manakaiBorderBottomLeftRadiusVertical,

      'l', bbLeft, bbTop + bb.manakaiBorderTopLeftRadiusVertical,

      'qy',
      bbLeft + bb.manakaiBorderTopLeftRadiusHorizontal,
      bbTop,

      'l', bb.marginLeft + bb.borderLeftWidth + bb.paddingLeft + bb.manakaiPointerSource - bb.manakaiPointerWidth / 2, bbTop,

      'e'
    ]).numberToInteger ().list.join (' '));
    vShape.setAttribute ('stroke', 'true');
    vShape.setAttribute ('strokecolor', bb.borderColor);
    vShape.setAttribute ('strokeweight', bb.borderWidth);
    vShape.setAttribute ('filled', 'true');
    vShape.setAttribute ('fillcolor', bb.backgroundColor);
    vShape.setAttribute ('coordorigin', '0 0');
    vShape.setAttribute ('coordsize', boxMBWidth + ' ' + boxMBHeight);

    vShape.appendChild (vPath);

    this.element.insertBefore (vShape, this.element.firstChild);
  }, // _renderBorder
  _renderPointer: function () {
    var bb = this.getComputedStyle ();
      
    if (this.refElement) {
      var rects = NR.Element.getRects (this.refElement, window);
      var rbb = rects.borderBox;

      var left = rbb.left + rbb.width * 3 / 4 - bb.manakaiPointerSource;
      if (left < 0) left = bb.borderLeftWidth + bb.paddingLeft;
      var top = rbb.bottom + bb.manakaiPointerOffset
          + bb.manakaiPointerHeight + bb.borderTopWidth + bb.paddingTop;

      var elbb = NR.Element.getRects (this.element, window).borderBox;
      var elbbWidth = /* bb.borderLeftWidth + bb.paddingLeft + */ elbb.width
          + bb.paddingRight + bb.borderRightWidth
          + bb.marginRight /* to avoid horizontal scrollbar */;
      var vp = NR.View.getViewportRects (window, document).contentBox;
      if (vp.right < left + elbbWidth && rbb.left <= vp.right - elbbWidth) {
        left = vp.right - elbbWidth;
      }

      this.element.style.top = top + 'px';
      this.element.style.left = left + 'px';
    }

    var vShape = document.createElement ('_vml_:shape');
    vShape.style.width = bb.manakaiPointerWidth + 'px';
    vShape.style.height = bb.manakaiPointerHeight + 'px';
    vShape.style.display = 'block';
    vShape.style.position = 'absolute';
    vShape.style.top = -(bb.manakaiPointerHeight + bb.paddingTop + bb.borderTopWidth / 2) + 'px';
    vShape.style.left = (bb.manakaiPointerSource - bb.manakaiPointerWidth / 2) + 'px';
  
    var vPath = document.createElement ('_vml_:path');
    if (this.refElement) {
      vPath.setAttribute ('v', new JSTE.List ([
        'm', bb.manakaiPointerWidth, bb.manakaiPointerHeight,
        'c',
        bb.manakaiPointerWidth * 3 / 4, bb.manakaiPointerHeight,
        bb.manakaiPointerWidth * 3 / 4, bb.manakaiPointerHeight,
        bb.manakaiPointerWidth / 2, 0,
        'c',
        bb.manakaiPointerWidth / 4, bb.manakaiPointerHeight,
        bb.manakaiPointerWidth / 4, bb.manakaiPointerHeight,
        0, bb.manakaiPointerHeight,
        'e']).numberToInteger ().list.join (' '));
    } else {
      vPath.setAttribute ('v', new JSTE.List ([
        'm', 0, bb.manakaiPointerHeight,
        'l', bb.manakaiPointerWidth, bb.manakaiPointerHeight,
        'e']).numberToInteger ().list.join (' '));
    }

    vShape.setAttribute ('stroke', 'true');
    vShape.setAttribute ('strokecolor', bb.borderColor);
    vShape.setAttribute ('strokeweight', bb.borderWidth);
    vShape.setAttribute ('filled', 'true');
    vShape.setAttribute ('fillcolor', bb.backgroundColor);
    vShape.setAttribute ('coordorigin', '0 0');
    vShape.setAttribute ('coordsize', bb.manakaiPointerWidth + ' ' + bb.manakaiPointerHeight);

    vShape.appendChild (vPath);

    this.element.appendChild (vShape);
  } // _renderPointer

}); // SimpleBalloonVML

SimpleBalloon.Message = new JSTE.Subclass (function () {
  return this._super.apply (this, arguments);
}, JSTE.Message, {
  _render: function (msgContainer) {
    var doc = this._targetDocument;

    var container = doc.createElement ('article');
    container.className = 'mm-container';

    container.appendChild (msgContainer);

    var buttonContainer = this.createCommandButtons ();
    container.appendChild (buttonContainer);

    var refElement = JSTE.Node.querySelector (document, this.select);
    this._simpleBalloon = new SimpleBalloon (container, refElement);

    return this._simpleBalloon.element;
  }, // _render

  _remove: function () {
    this._simpleBalloon.remove ();
  } // _remove
}); // Message

/* ***** BEGIN LICENSE BLOCK *****
 * Copyright 2008-2009 Wakaba <wakaba@suikawiki.org>.  All rights reserved.
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
 *   Wakaba <wakaba@suikawiki.org>
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
