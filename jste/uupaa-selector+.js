/** uupaa-selector+.js
 *
 * @author Takao Obara <uupaa.js@gmail.com>
 * @license uupaa-selector.js is licensed under the terms and conditions of the MIT licence.
 */

// --- local scope ------------------------------------------------------
(function() {
var _doc = document,
    _fn = uuConst.Selector.PseudoFunction, _ua = uuClass.Detect,
    _ie = _ua.ie || _ua.opera90,
    _cstyle = _doc.uniqueID ? 0 : _doc.defaultView.getComputedStyle,

    DIGIT     = /^\s*(?:[\-\+]?)[\d\,\.]+\s*$/,
    NEGATIVE  = /^\s*\-[\d\,\.]+\s*$/;

function clip(cx, cz, fn) {
  var r = [], q = -1, i = 0, v;
  for(; i < cz; ++i) {
    v = cx[i];
    fn(v) && (r[++q]=v);
  }
  return r;
}

function hidden(elm) {
  var cs = _ie ? (elm.currentStyle || elm.style) : _cstyle(elm, "");
  return cs.display === "none" || cs.visibility === "hidden";
}


// --- accounts part ---
_fn["digit"]    = function(cx, cz, m)         { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i];if(v.nodeType===1){DIGIT.test(_ie?v.innerText:v.textContent)&&(r[++q]=v);}}return r; };
_fn["negative"] = function(cx, cz, m)         { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i];if(v.nodeType===1){NEGATIVE.test(_ie?v.innerText:v.textContent)&&(r[++q]=v);}}return r; };

// --- tween ---
_fn["tween"]    = function(cx, cz, m)         { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i];if(v.nodeType===1){v.uuTween&&(r[++q]=v);}}return r; };
_fn["playing"]  = function(cx, cz, m)         { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i];if(v.nodeType===1){v.uuTween&&v.uuTween.playing()&&(r[++q]=v);}}return r; };

// --- jQuery part ---
_fn["first"]    = _fn["first-child"];
_fn["last"]     = _fn["last-child"];
_fn["even"]     = function(cx, cz, m, tg, xm) { m[2]="odd";return _fn["nth-child"](cx,cz,m,tg,xm); };
_fn["odd"]      = function(cx, cz, m, tg, xm) { m[2]="even";return _fn["nth-child"](cx,cz,m,tg,xm); };
_fn["eq"]       = function(cx, cz, m)         { var r=cx[parseInt(m[2])];return r?[r]:[]; };
_fn["gt"]       = function(cx, cz, m)         { var r=[],q=-1,i=parseInt(m[2])+1;for(;i<cz;++i){r[++q]=cx[i];}return r; };
_fn["lt"]       = function(cx, cz, m)         { var r=[],q=-1,i=0,m2=parseInt(m[2])-1;for(;i<cz;++i){if(i>m2){break;}r[++q]=cx[i];}return r; };
_fn["parent"]   = function(cx, cz)            { return clip(cx,cz,function(v){ return v.firstChild }); };
_fn["header"]   = function(cx, cz, m, tg, xm) { return clip(cx,cz,function(v){ return xm?/h[1-6]/.test(v.tagName):/h[1-6]/i.test(v.tagName); }); };
_fn["input"]    = function(cx, cz, m, tg, xm) { return clip(cx,cz,function(v){ return xm?/(input|textarea|select|button)/.test(v.tagName):/(input|textarea|select|button)/i.test(v.tagName); }); };
_fn["button"]   = function(cx, cz, m, tg, xm) { return clip(cx,cz,function(v){ return (xm?v.tagName==="button":/button/i.test(v.tagName))||v.type==="button"; }); };
_fn["text"]     = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="text";     }); };
_fn["password"] = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="password"; }); };
_fn["radio"]    = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="radio";    }); };
_fn["checkbox"] = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="checkbox"; }); };
_fn["submit"]   = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="submit";   }); };
_fn["image"]    = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="image";    }); };
_fn["reset"]    = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="reset";    }); };
_fn["file"]     = function(cx, cz)            { return clip(cx,cz,function(v){ return v.type==="file";     }); };
_fn["hidden"]   = function(cx, cz)            { return clip(cx,cz,function(v){ return (v.type==="hidden"|| hidden(v)); }); };
_fn["visible"]  = function(cx, cz)            { return clip(cx,cz,function(v){ return (v.type!=="hidden"&&!hidden(v)); }); };
_fn["selected"] = function(cx, cz)            { return clip(cx,cz,function(v){ return v.selected;          }); };

uuConst.Selector.APIUnsupported = {
  ie:     /(?:\:digit|\:negative|\:tween|\:playing|\:link|\:visited|\!\=|\?\=)/,                             // for IE8b2
  gecko:  /(?:\:digit|\:negative|\:tween|\:playing|\:contains|\-letter|\-line|\:before|\:after|\!\=|\?\=)/,  // for Firefox3.1
  webkit: /(?:\:digit|\:negative|\:tween|\:playing|\:contains|\:target|\!\=|\?\=)/                           // for WebKit
};

uuClass.Selector.rebuild(); // update APIUnsupported

})(); // end (function())() scope

