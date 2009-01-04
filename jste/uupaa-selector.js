/** uupaa-selector.js
 *  - uupaa.js spin-off project
 *
 * @author Takao Obara <uupaa.js@gmail.com>
 * @license uupaa-selector.js is licensed under the terms and conditions of the MIT licence.
 * @version 2.0
 * @date 2008-12-01
 * @see <a href="http://code.google.com/p/uupaa-js/">uupaa.js Home(Google Code)</a>
 * @see <a href="http://code.google.com/p/uupaa-js-spinoff/">uupaa.js SpinOff Project Home(Google Code)</a>
 */
if (!uuClass.Selector) {

/** Selector
 *
 * @class
 */
uuClass.Selector = function() {};

// uuClass.Selector.enableCache
uuClass.Selector.enableCache = true;

uuConst.Selector = {
  APIUnsupported: {
    ie:     /(?:\:link|\:visited|\!\=|\?\=)/,                             // for IE8b2
    gecko:  /(?:\:contains|\-letter|\-line|\:before|\:after|\!\=|\?\=)/,  // for Firefox3.1
    webkit: /(?:\:contains|\:target|\!\=|\?\=)/                           // for WebKit
  }
};

// --- local scope ------------------------------------------------------
(function() {
var _win = window, _doc = document,
    _ArrayProto = Array.prototype,
    _classAPI = !!_doc.getElementsByClassName,
    _cstyle = _doc.uniqueID ? 0 : _doc.defaultView.getComputedStyle,
    _ua = uuClass.Detect, _etraverse = _ua.etraverse,
    _textContent = _ua.ie || _ua.opera90 ? "innerText" : "textContent",
    _styleSheet = null,
    _uuid       = 0, // unique ID counter
    _useCache   = uuClass.Selector.enableCache,
    _idCache    = { /* id:         element, ...    */ },
    _tagCache   = { /* tag/uuid:   [elements], ... */ },
    _classCache = { /* class/uuid: [elements], ... */ },
    _cssCache   = { /* css/uuid:   [elements], ... */ },
    _xpathCache = { /* xpath/uuid: [elements], ... */ },
    _age        = 0,
    _mu         = null, // ref uuClass.MutationEventLite
    htmlTag     = {},
    xmlTag      = {}, // a: "A", A: "A", ...
    UUID        = _ua.ie ? "uniqueID" : "uuid",
    UNSUPPORTED = /^.*$/,

    // --- Const ---
    //                    2:".|#" 3: "id|class"           4:"E"         5:"E,F"      6:"E,F,G"   7:"E"    8:"E F"  9:"E F G"  10:"*:root"
    CSS_QUICK       = /^\s*((\.|#)((?:[a-z_])(?:[\w\-]*))|(\w+)(?:\s*,\s*(\w+)(?:\s*,\s*(\w+))?)?|(\w+)\s+(\w+)(?:\s+(\w+))?|((\*)?:root))\s*$/i,
    CSS_ID          = /^#([a-z_\u00C0-\uFFEE\-][\w\u00C0-\uFFEE\-]*)/i,   // #id
    CSS_CLASS       = /^\.([a-z_\u00C0-\uFFEE\-][\w\u00C0-\uFFEE\-]*)/i,  // .class // [[ // fix #175a(.13 fail)
    CSS_CLASS2      = /^ *([\w\-]+)(?: +([\w\-]+))? *$/i,
    CSS_ATTR1       = /^\[\s*([^\~\^\$\*\|\=\!\?\s]+)\s*([\~\^\$\*\|\!\?]?\=)\s*(\"[^\"]*\"|\'[^\']*\'|(\/[^\/]*\/)([ig]?)|[^\]]*)\s*\]/, // [A=V]
    CSS_ATTR2       = /^\[\s*([^\]\s]*)\s*\]/,            // [A]
    CSS_QUOTE       = /^\s*[\"\']?|[\"\']?\s*$/g,         // "..." or '...'
    CSS_PSEUDO      = /^\:{1,2}([\w\-]+)(?:\((?:(\"[^\"]+\")|(\'[^\']+\')|([^\(\)]+))\))?/, // :nth-child(an+b) or ::before
    CSS_ANB         = /^((even)|(odd)|([\d]+)|(1n\+0|n\+0|n)|((-?\d*)n((?:\+|-)?\d*)))$/, // an+b
    CSS_COMBO1      = /^\s*([\>\+\~])\s*(\*|\w*)/,        // E>F   E+F   E~F
    CSS_COMBO2      = /^\s*(\*|\w*)/,                     // E F
    CSS_GROUP       = /^\s*,\s*/,                         // E,F
    CSS_GUARD       = { title: 0, id: 0, name: 0, "for": 0, "class": 0 },
    CSS_IE_ATTR1    = { "class": "className", "for": "htmlFor" },
    CSS_IE_ATTR2    = { href: 1, src: 1 },
    CSS_ICPA        = { "#": 1, ".": 2, ":": 3,  "[": 4 }, // ]
    CSS_COMBO       = { ">": 1, "+": 2, "~": 3 },
    CSS_OP          = { "=": 1, "!=": 2, "?=": 3, "*=": 4, "^=": 5, "$=": 6, "~=": 7, "|=": 8 },

    CSS_NTH = function(anb) {
      var a, b, c, m = anb.match(CSS_ANB);
      if (!m) { throw TypeError("%s unsupported".replace("%s", anb)); }
      if (m[2]) { return { a: 2, b: 0, k: 3 }; } // nth(even)
      if (m[3]) { return { a: 2, b: 1, k: 3 }; } // nth(odd)
      if (m[4]) { return { a: 0, b: parseInt(m[4], 10), k: 1 }; } // nth(1)
      if (m[5]) { return { a: 0, b: 0, k: 2 }; } // nth(1n+0), nth(n+0), nht(n)
      a = (m[7] === "-" ? -1 : m[7] || 1) - 0;
      b = (m[8] || 0) - 0;
      c = a < 2;
      return { a: c ? 0 : a, b: b, k: c ? a + 1 : 3 }; // a=0=k=1,a=1=k=2,a=-1=k=0
    },
    CSS_FUNC = {
      root:             function(cx, cz)    { return cz ? [] : [_ua.docroot]; }, // fix 27b (* html, * root) as IE6 CSS Hack
      enabled:          function(cx, cz)    { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i];!v.disabled&&(r[++q]=v);}return r; },
      disabled:         function(cx, cz)    { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i]; v.disabled&&(r[++q]=v);}return r; },
      checked:          function(cx, cz)    { var r=[],q=-1,i=0,v;for(;i<cz;++i){v=cx[i]; v.checked &&(r[++q]=v);}return r; },
      target:           function(cx, cz)    { var r=[],q=-1,i=0,v,f=location.hash.slice(1);if(!f){return[];}
                                              for(;i<cz;++i){v=cx[i];(v.id===f||("name"in v&&v.name===f))&&(r[++q]=v);}return r; },
      contains:         function(cx, cz, m) { var r=[],q=-1,i=0,v,f=m[2].replace(CSS_QUOTE,""),_t=_textContent;
                                              for(;i<cz;++i){v=cx[i];(v[_t].indexOf(f)>-1)&&(r[++q]=v);}return r; },
      empty:            function(cx, cz)    { var r=[],q=-1,i=0,v,c,f,_t=_textContent;if(_etraverse){for(;i<cz;++i){v=cx[i];!v.firstElementChild&&!v[_t]&&(r[++q]=v);}}else{for(;i<cz;++i){v=cx[i];if(!v[_t]){for(f=0,c=v.firstChild;c&&!f;c=c.nextSibling){(c.nodeType===1)&&++f;}!f&&(r[++q]=v);}}}return r; },
      lang:             function(cx, cz, m) { var _d=_doc,r=[],q=-1,i=0,v,f=RegExp("^("+m[2]+"$|"+m[2]+"-)","i");
                                              for(;i<cz;++i){v=cx[i];while(v&&v!==_d&&!v.getAttribute("lang")){v=v.parentNode;}((v&&v!==_d)&&f.test(v.getAttribute("lang")))&&(r[++q]=cx[i]);}return r; },
      "first-child":    function(cx, cz, m, tg, xm, last) {
                                              if(cx[0]===_ua.docroot){return[];}var r=[],q=-1,i=0,v,c,f,d1;if(_etraverse){d1=!last?"previousElementSibling":"nextElementSibling";for(;i<cz;++i){v=cx[i];!v[d1]&&(r[++q]=v);}}else{d1=!last?"previousSibling":"nextSibling";for(;i<cz;++i){for(v=cx[i],f=0,c=v[d1];c;c=c[d1]){if(c.nodeType===1){++f;break;}}!f&&(r[++q]=v);}}return r; },
      "last-child":     function(cx, cz)    { return CSS_FUNC["first-child"](cx, cz, 0, 0, 0, 1); },
      "only-child":     function(cx, cz)    { if(cx[0]===_ua.docroot){return[];}
                                              var r=[],q=-1,i=0,v,c,f;
                                              if(_etraverse){for(;i<cz;++i){v=cx[i];!v.nextElementSibling&&!v.previousElementSibling&&(r[++q]=v);}}else{for(;i<cz;++i){v=cx[i],f=0;for(c=v.nextSibling;c;c=c.nextSibling){if(c.nodeType===1){++f;break;}}if(!f){for(c=v.previousSibling;c;c=c.previousSibling){if(c.nodeType===1){++f;break;}}}!f&&(r[++q]=v);}}return r; },
      "nth-child":      function(cx, cz, m, tg, xm, last) {
                                              if(cx[0]===_ua.docroot){return[];}if(m[2]==="n"){return cx;}
                                              var r=[],q=-1,i=0,c,f,u,p,j,t,tn,_et=_etraverse,g={},a,b,k,d1,d2,ps,_U=UUID;
                                              f=CSS_NTH(m[2]);tn=cx[0].tagName;a=f.a;b=f.b;k=f.k;t=tg[tn]||addTag(tn,xm);
                                              if(_et){ps="previousElementSibling";!last?(d1="firstElementChild",d2="nextElementSibling"):(d1="lastElementChild",d2="previousElementSibling");}else{ps="previousSibling";!last?(d1="firstChild",d2="nextSibling"):(d1="lastChild",d2="previousSibling");}
                                              for(;i<cz;++i){p=cx[i].parentNode;u=p[_U]||(p[_U]=++_uuid);if(!(u in g)){g[u]=1;for(j=0,c=p[d1];c;c=c[d2]){if(_et||c.nodeType===1){++j;(k===1?(j===b):k===2?(j>=b):k===3?(!((j-b)%a)&&(j-b)/a>=0):(j<=b))&&(c.tagName===t)&&(r[++q]=c);}}}}return r; },
      "nth-last-child": function(cx, cz, m, tg, xm, last, really) { return CSS_FUNC["nth-child"](cx,cz,m,tg,xm,1,really); },
      "nth-last-of-type":function(cx, cz, m){ cx.reverse();return CSS_FUNC["nth-of-type"](cx,cz,m); },
      "nth-of-type":    function(cx, cz, m) { if(cx[0]===_ua.docroot){return[];}var r=[],q=-1,i=0,j,v,p,f=CSS_NTH(m[2]),f2=null,g={},tn,a=f.a,b=f.b,k=f.k;for(;i<cz;++i){v=cx[i];p=v.parentNode;(f2!==p)&&(f2=p,g={});tn=v.tagName;(tn in g)?++g[tn]:(g[tn]=1);j=g[tn];(k===1?(j===b):k===2?(j>=b):k===3?(!((j-b)%a)&&(j-b)/a>=0):(j<=b))&&(r[++q]=v);}return r; },
      "last-of-type":   function(cx, cz)    { cx.reverse();return CSS_FUNC["first-of-type"](cx,cz); },
      "first-of-type":  function(cx, cz)    { if(cx[0]===_ua.docroot){return[];}
                                              var r=[],q=-1,i=0,v,p,f=null,g={};
                                              for(;i<cz;++i){v=cx[i];p=v.parentNode;f!==p&&(f=p,g={});(v.tagName in g)?++g[v.tagName]:(g[v.tagName]=1);g[v.tagName]===1&&(r[++q]=v);}return r; },
      "only-of-type":   function(cx, cz, m, tg, xm) {
                                              if(cx[0]===_ua.docroot){return[];}
                                              var r=[],q=-1,i=0,v,c,f,t,tn;
                                              for(;i<cz;++i){f=0;v=cx[i],tn=v.tagName,t=tg[tn]||addTag(tn,xm);for(c=v.nextSibling;c;c=c.nextSibling){if(c.nodeType===1&&c.tagName===t){++f;break;}}if(!f){for(c=v.previousSibling;c;c=c.previousSibling){if(c.nodeType===1&&c.tagName===t){++f;break;}}}!f&&(r[++q]=v);}return r; },
      before:           function(cx, cz)    { return cx; },
      after:            function(cx, cz)    { return cx; },
      "first-letter":   function(cx, cz)    { return cx; },
      "first-line":     function(cx, cz)    { return cx; },
      not:              function(cx, cz, m, tg, xm) {
                                              var r=[],q=-1,i=0,v,w,n=m[2].slice(1),mm,tn,t;
                                              switch (m[2].charAt(0)) {
                                              case "*": return r;
                                              case "#": for(;i<cz;++i){v=cx[i];if(v.id!==n){r[++q]=v;}}return r;
                                              case ".": n=" "+n+" ";
                                                        for(;i<cz;++i){v=cx[i];w=" "+v.className+" ";if(w.indexOf(n)===-1){r[++q]=v;}}return r;
                                              default:  if((mm=m[2].match(/^(\w+)$/i))){tn=mm[1];t=tg[tn]||addTag(tn,xm);for(;i<cz;++i){v=cx[i];if(v.nodeType===1&&v.tagName!==t){r[++q]=v;}}break;}
                                                        throw TypeError(":not(%s) unsupported".replace("%s", m[0]));
                                              }
                                              return r;
                                            },
      link:             function(cx, cz, m) { return CSS_FUNC["visited"](cx,cz,m); },
      visited:          function(cx, cz, m) { var link=m[1]==="link",p=CSS_MARK("a:visited"),fake=_doc.links,i=0,iz=fake.length,ary=Array(iz),w;
                                              for (;i<iz;++i){ary[i]=fake[i];}w=ary.filter(function(v){return link?!CSS_SPY(v):CSS_SPY(v);});
                                              deleteRule(p);
                                              return cx.filter(function(v){return w.indexOf(v)>-1;}); },
      hover:            function(cx, cz, m) { return CSS_FUNC["focus"](cx,cz,m); },
      focus:            function(cx, cz, m) { var p=CSS_MARK(":"+m[1]),w=uu.tag("*",_doc.body).filter(function(v){return CSS_SPY(v);});
                                              deleteRule(p);
                                              return cx.filter(function(v){return w.indexOf(v)>-1;}); }
    },

    // http://d.hatena.ne.jp/uupaa/20080928/1222543331
    CSS_SPY  = function(elm) { var cs=_ua.ie?(elm.currentStyle||elm.style):_cstyle(elm,"");
                               return _ua.ie?cs.rubyAlign==="center":cs.outlineWidth==="0px"&&cs.outlineStyle==="solid"; },
    CSS_MARK = function(sel) { return insertRule(sel,(_ua.ie?"ruby-align:center":"outline:0 solid #000")); };

// --- Array.prototype Cross Browser ---
_ArrayProto.lastIndexOf || (_ArrayProto.lastIndexOf = function(v, i) { var sz=this.length;i=(i<0)?i+sz:sz-1;for(;i>-1;--i){if(i in this&&this[i]===v){return i;}}return -1; });
_ArrayProto.indexOf || (_ArrayProto.indexOf = function(v, i) { i=i||0;var sz=this.length;i=(i<0)?i+sz:i;for(;i<sz;++i){if(i in this&&this[i]===v){return i;}}return -1; });
_ArrayProto.forEach || (_ArrayProto.forEach = function(fn, me) { for(var i=0,sz=this.length;i<sz;++i){(i in this)&&fn.call(me,this[i],i,this);} });
_ArrayProto.filter || (_ArrayProto.filter = function(fn, me) { var rv=[],i=0,sz=this.length,v;for(;i<sz;++i){if(i in this){v= this[i],(fn.call(me,v,i,this))&&rv.push(v);}}return rv; });
_ArrayProto.every || (_ArrayProto.every = function(fn, me) { for(var i=0,sz=this.length;i<sz;++i){if(i in this&&!fn.call(me,this[i],i,this)){return false;}}return true; });
_ArrayProto.some || (_ArrayProto.some = function(fn, me) { for(var i=0,sz=this.length;i<sz;++i){if(i in this&&fn.call(me,this[i],i,this)){return true;}}return false; });
_ArrayProto.map || (_ArrayProto.map = function(fn, me) { var rv=Array(this.length),i=0,sz=this.length;for(;i<sz;++i){(i in this)&&(rv[i]=fn.call(me,this[i],i,this));}return rv; });

// --- ID Selector ---
function IDSelectorAPI(id, really /* = false */) {
  var rv, ctx = _doc, n, cache = !really && _useCache;
  if (cache) {
    if (_age !== _mu.age) {
      _age = _mu.age;
      _idCache = {};
    } else {
      if ( (n = _idCache[id]) ) { return n; }
    }
  }
  rv = ctx.getElementById(id);
  return cache ? (_idCache[id] = rv) : rv;
}

// --- Tag Selector ---
function TagSelectorAPI(tagName, context /* = document */, really /* = false */) { // for Firefox2+, Safari3+, Opera9+, Chrome
  var rv, ctx = context || _doc, id, n, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? tagName : (tagName + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _tagCache = {};
    } else if ( (n = _tagCache[id]) ) {
      return n;
    }
  }
  rv = Array.prototype.slice.call(ctx.getElementsByTagName(tagName));
  return cache ? (_tagCache[id] = rv) : rv;
}

// --- ClassName Selector ---
function ClassSelectorAPI(className, context /* = document */, really /* = false */) { // for Firefox3+, Safari3+, Opera9.5+, Chrome
  var rv, ctx = context || _doc, id, n, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? className : (className + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _classCache = {};
    } else if ( (n = _classCache[id]) ) {
      return n;
    }
  }
  rv = Array.prototype.slice.call(ctx.getElementsByClassName(className));
  return cache ? (_classCache[id] = rv) : rv;
}

// --- CSS Selector ---
function CSSSelector(expr, context /* = document */, really /* = false */) {
  var rv, ctx = context || _doc, id, n, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? expr : (expr + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _cssCache = {};
    } else if ( (n = _cssCache[id]) ) {
      return n;
    }
  }
  if (!_ua.selector || UNSUPPORTED.test(expr)) {
    rv = CSSSelectorJS(expr, ctx, really || 0);
  } else {
    try {
      rv = Array.prototype.slice.call(ctx.querySelectorAll(expr));
    } catch(e) {
      rv = CSSSelectorJS(expr, ctx, really || 0); // case: extend pseudo class / operators
    }
  }
  return cache ? (_cssCache[id] = rv) : rv;
}

// --- CSS Selector impl ---
function CSSSelectorJS(expr, context, really) {
  var rv = [], x = expr, cx = [context], lastX = 0, lastXX = 0, m, r, v, E, F, uuid, attr, match,
      ii = 0, jj = 0, iz, jz, n1, m1, m2, f1, cn, ri = -1, cz = 0, _ie = _ua.ie, _ie8mode8 = _ua.ie8mode8,
      mixed = 0, gd = {}, ggd = {}, // double registration guard
      _root, xmlmode, tags, kk = 0, kz, n2, n3, m3, _et, _fc, _ns, _slice,
      _U = UUID;

  // Quick Phase
  if ( (m = x.match(CSS_QUICK)) ) {
    if (m[2]) { // "#id" or ".class"
      if (CSS_ICPA[m[2]] === 2) { return uu.className(m[3], context, really); }
      n1 = (context.ownerDocument || _doc).getElementById(m[3]);
      return n1 ? [n1] : [];
    }
    _slice = Array.prototype.slice; // see http://d.hatena.ne.jp/uupaa/20081005/1223196093
    if (m[6]) { // "E,F,G"
      m1 = m[4], m2 = m[5], m3 = m[6];
      if (m1 !== m2 && m1 !== m3 && m2 !== m3) { // skip illegal case: uu.css("div,div,a") uu.css("div,a,div") uu.css("a,div,div")
        if (!_ie) {
          return _slice.call(context.getElementsByTagName(m1)).concat(_slice.call(context.getElementsByTagName(m2)), _slice.call(context.getElementsByTagName(m3)));
        }
        for (n1 = context.getElementsByTagName(m1), ii = 0, iz = n1.length; ii < iz; ++ii) { rv[++ri] = n1[ii]; }
        for (n1 = context.getElementsByTagName(m2), ii = 0, iz = n1.length; ii < iz; ++ii) { rv[++ri] = n1[ii]; }
        for (n1 = context.getElementsByTagName(m3), ii = 0, iz = n1.length; ii < iz; ++ii) { rv[++ri] = n1[ii]; }
        return rv;
      }
    } else if (m[5]) { // "E,F"
      m1 = m[4], m2 = m[5];
      if (m1 !== m2) { // skip illegal case: uu.css("div,div")
        if (!_ie) {
          return _slice.call(context.getElementsByTagName(m1)).concat(_slice.call(context.getElementsByTagName(m2)));
        }
        for (n1 = context.getElementsByTagName(m1), ii = 0, iz = n1.length; ii < iz; ++ii) { rv[++ri] = n1[ii]; }
        for (n1 = context.getElementsByTagName(m2), ii = 0, iz = n1.length; ii < iz; ++ii) { rv[++ri] = n1[ii]; }
        return rv;
      }
    } else if (m[4]) { // "E"
      return uu.tag(x, context);
    } else if (m[9]) { // "E F G"
      m1 = m[7], m2 = m[8], m3 = m[9];
      for (n1 = context.getElementsByTagName(m1), ii = 0, iz = n1.length; ii < iz; ++ii) {
        for (n2 = n1[ii].getElementsByTagName(m2), jj = 0, jz = n2.length; jj < jz; ++jj) {
          for (n3 = n2[jj].getElementsByTagName(m3), kk = 0, kz = n3.length; kk < kz; ++kk) {
            cn = n3[kk];
            uuid = cn[_U] || (cn[_U] = ++_uuid);
            if (!(uuid in gd)) { rv[++ri] = cn, gd[uuid] = 1; }
          }
        }
      }
      return rv;
    } else if (m[8]) { // "E F"
      m1 = m[7], m2 = m[8];
      for (n1 = context.getElementsByTagName(m1), ii = 0, iz = n1.length; ii < iz; ++ii) {
        for (n2 = n1[ii].getElementsByTagName(m2), jj = 0, jz = n2.length; jj < jz; ++jj) {
          cn = n2[jj];
          uuid = cn[_U] || (cn[_U] = ++_uuid);
          if (!(uuid in gd)) { rv[++ri] = cn, gd[uuid] = 1; }
        }
      }
      return rv;
    } else if (m[10]) {
      return [_ua.docroot]; // fix 27 (*:root)
    }
  }

  _root = context.ownerDocument || _doc;
  // see http://d.hatena.ne.jp/uupaa/20081010/1223630689 [THX! id:os0x]
  xmlmode = _root.createElement("p").tagName !== _root.createElement("P").tagName;
  tags = xmlmode ? xmlTag : htmlTag;
  _et = _etraverse;
  _fc = _et ? "firstElementChild"  : "firstChild";
  _ns = _et ? "nextElementSibling" : "nextSibling";

  // Generic Phase
  while (x.length && x.length !== lastX) {
    lastX = x.length, m = null;

    // "E > F"  "E + F"  "E ~ F" phase
    if ( (m = x.match(CSS_COMBO1)) ) {
      m1 = m[1], m2 = m[2];
      F = m2 ? (tags[m2] || addTag(m2, xmlmode)) : "*";
      f1 = F === "*";
      r = [], ri = -1, gd = {}, ii = 0, iz = cx.length;
      switch (CSS_COMBO[m1]) {
      case 1: // "E > F"
              for (; ii < iz; ++ii) {
                for (cn = cx[ii][_fc]; cn; cn = cn[_ns]) {
                  if (_et || cn.nodeType === 1) {
                    if (f1 || cn.tagName === F) {
                      !((uuid = cn[_U] || (cn[_U] = ++_uuid)) in gd) && (r[++ri] = cn, gd[uuid] = 1);
                    }
                  }
                }
              }
              cx = r;
              break;
      case 2: // "E + F"
              for (; ii < iz; ++ii) {
                for (cn = cx[ii][_ns]; cn; cn = cn[_ns]) {
                  if (_et || cn.nodeType === 1) {
                    if (_ie && cn.tagName.charAt(0) === "/") { continue; } // fix #25
                    (f1 || cn.tagName === F) && (r[++ri] = cn);
                    break;
                  }
                }
              }
              cx = r;
              break;
      case 3: // "E ~ F"
              for (; ii < iz; ++ii) {
                for (cn = cx[ii][_ns]; cn; cn = cn[_ns]) {
                  if (_et || cn.nodeType === 1) {
                    if (f1 || cn.tagName === F) {
                      if ( (uuid = cn[_U] || (cn[_U] = ++_uuid)) in gd) { break; }
                      r[++ri] = cn;
                      gd[uuid] = 1;
                    }
                  }
                }
              }
              cx = r;
              break;
      }
    } else if ( (m = x.match(CSS_COMBO2)) ) {
      // "E" or "*" phase
      m1 = m[1];
      E = m1 ? (tags[m1] || addTag(m1, xmlmode)) : "*";
      f1 = E === "*";
      for (r = [], ri = -1, gd = {}, ii = 0, iz = cx.length; ii < iz; ++ii) {
        for (n1 = cx[ii].getElementsByTagName(E), jj = 0, jz = n1.length; jj < jz; ++jj) {
          cn = n1[jj];
          if (!f1 || cn.nodeType === 1) {
            if (f1 || cn.tagName === E) {
              !((uuid = cn[_U] || (cn[_U] = ++_uuid)) in gd) && (r[++ri] = cn, gd[uuid] = 1);
            }
          }
        }
      }
      cx = r;
    }
    m && (x = x.slice(m[0].length));

    // Attribute, Class, Pseudo, ID Phase
    while (x.length && x.length !== lastXX) {
      lastXX = x.length, m = null;

      switch (CSS_ICPA[x.charAt(0)]) {
      case 1: if ( (m = x.match(CSS_ID)) ) { // m[1] = id
                m1 = m[1];
                for (r = [], ri = -1, ii = 0, iz = cx.length; ii < iz; ++ii) {
                  v = cx[ii], f1 = v.id;
                  (f1 && f1 === m1) && (r[++ri] = v);
                }
                cx = r;
              }
              break;
      case 2: if ( (m = x.match(CSS_CLASS)) ) {
                for (m1 = " " + m[1] + " ", r = [], ri = -1, ii = 0, iz = cx.length; ii < iz; ++ii) {
                  v = cx[ii], f1 = v.className;
                  (f1 && (" " + f1 + " ").indexOf(m1) > -1) && (r[++ri] = v);
                }
                cx = r;
                if (!cx.length) { break; } // fix #176
              }
              break;
      case 3: if ( (m = x.match(CSS_PSEUDO)) ) {
                cz = cx.length;
                if (cz) {
                  if (m[1] in CSS_FUNC) {
                    m[2] = m[2] || m[3] || m[4];
                    cx = CSS_FUNC[m[1]](cx, cz, m, tags, xmlmode, 0, really);
                    if (!cx.length) { break; } // fix #176
                  } else {
                    throw TypeError(":%s unsupported".replace("%s", m[1]));
                  }
                }
              }
              break;
      case 4: if ( (m = x.match(CSS_ATTR1)) ) {
                m1 = m[1], m2 = CSS_OP[m[2]], v = m[3].replace(CSS_QUOTE, ""), f1 = m1 in CSS_GUARD;
                if (_ie && !_ie8mode8 && m1 in CSS_IE_ATTR1) { m1 = CSS_IE_ATTR1[m1]; }
                if (!f1) { v = v.toLowerCase(); }
                if (m2 === 7) { // 7: "~="
                  if (v.indexOf(" ") > -1) { cx = []; break; } // fix #7b
                  v = " " + v + " ";
                } else if (m2 === 3) { // 3: "?="
                  if (m[4]) {
                    v = RegExp(m[4].replace(/^\/|\/$/g, ""), m[5] || "");
                  } else {
                    v = RegExp(v);
                  }
                }

                for (r = [], ri = -1, ii = 0, iz = cx.length; ii < iz; ++ii) {
                  if (_ie && (_ie8mode8 || CSS_IE_ATTR2[m1])) {
                    attr = cx[ii].getAttribute(m1, 2) || null;
                  } else {
                    attr = cx[ii].getAttribute(m1) || null;
                  }
                  if (attr) {
                    match = 0;
                    !f1 && (attr = attr.toLowerCase());

                    switch (m2) {
                    case 1: (v === attr) && ++match; break;
                    case 2: (v !== attr) && ++match; break;
                    case 3: v.test(attr) && ++match; break;
                    case 4: (attr.indexOf(v) > -1) && ++match; break;
                    case 5: !attr.indexOf(v) && ++match; break;
                    case 6: (attr.lastIndexOf(v) + v.length === attr.length) && ++match; break;
                    case 7: ((" " + attr + " ").indexOf(v) !== -1) && ++match; break;
                    case 8: (v === attr || attr.substring(0, v.length + 1) === v + "-") && ++match; break;
                    }
                    match && (r[++ri] = cx[ii]);
                  }
                }
                cx = r;
              } else if ( (m = x.match(CSS_ATTR2)) ) { // m[1] = "A"
                for (r = [], ri = -1, ii = 0, iz = cx.length; ii < iz; ++ii) {
                  v = cx[ii];
                  if (_ie) {
                    n1 = v.getAttributeNode(m[1]);
                    if (n1 && n1.specified) { r[++ri] = v; }
                  } else if (v.hasAttribute(m[1])) {
                    r[++ri] = v;
                  }
                }
                cx = r;
              }
              if (!cx.length) { break; } // fix #176
      }
      m && (x = x.slice(m[0].length));
    }
    if (x && (m = x.match(CSS_GROUP)) ) {
      // mix
      for (++mixed, ri = rv.length - 1, ii = 0, iz = cx.length; ii < iz; ++ii) {
        v = cx[ii];
        !((uuid = v[_U] || (v[_U] = ++_uuid)) in ggd) && (rv[++ri] = v, ggd[uuid] = 1);
      }
      cx = [context], lastX = 0, lastXX = 0;
      x = x.slice(m[0].length);
    }
  }

  if (x.length) {
    throw TypeError(":%s unsupported".replace("%s", x));
  }
  if (!mixed) { return cx; } // only

  // mix results
  for (ri = rv.length - 1, ii = 0, iz = cx.length; ii < iz; ++ii) {
    v = cx[ii];
    !((uuid = v[_U] || (v[_U] = ++_uuid)) in ggd) && (rv[++ri] = v, ggd[uuid] = 1);
  }
  return rv;
}

// --- XPath Selector ---
function XPathSelectorAPI(expr, context /* = document */, really /* = false */) { // for Firefox2+, Safari3+, Opera9.5+, Chrome
  var rv, ctx = context || _doc, id, n, i, iz, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? expr : (expr + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _xpathCache = {};
    } else if ( (n = _xpathCache[id]) ) {
      return n;
    }
  }
  try {
    n = _doc.evaluate(expr, ctx, null, 7, null); // 7: SORT
    for (i = 0, iz = n.snapshotLength, rv = Array(iz); i < iz; ++i) {
      rv[i] = n.snapshotItem(i);
    }
    return cache ? (_xpathCache[id] = rv) : rv;
  } catch(e) { rv = []; }
  return rv;
}

// === utility functions ===
function insertRule(selector, declaration) {
  var rv = -1, ss, e;
  if (!_styleSheet) {
    if (_ua.ie) {
      _styleSheet = _doc.createStyleSheet();
    } else {
      e = _doc.createElement("style");
      e.appendChild(_doc.createTextNode(""));
      _styleSheet = _doc.getElementsByTagName("head")[0].appendChild(e);
    }
  }
  ss = _styleSheet;

  if (!_ua.ie) { // for Firefox, Opera, Safari
    rv = ss.sheet.insertRule(selector + "{" + declaration + "}", ss.sheet.cssRules.length); // return inserted index
    if (_ua.opera90) { rv = ss.sheet.cssRules.length - 1; } // Opera Bug
    return rv;
  }
  rv = ss.rules.length;
  ss.addRule(selector, declaration, rv);
  return rv; // return inserted index
}
function deleteRule(index) {
  _ua.ie ? _styleSheet.removeRule(index)
         : _styleSheet.sheet.deleteRule(index);
}

// --- override functions ---
function TagSelectorJS(tagName, context, really /* = false */) { // for IE
  var rv, ri, ctx = context || _doc, v, i, iz, id, n, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? tagName : (tagName + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _tagCache = {};
    } else if ( (n = _tagCache[id]) ) {
      return n;
    }
  }
  rv = [], ri = -1, n = ctx.getElementsByTagName(tagName);
  for (i = 0, iz = n.length; i < iz; ++i) {
    v = n[i];
    (v.nodeType === 1) && (rv[++ri] = v);
  }
  return cache ? (_tagCache[id] = rv) : rv;
}

function ClassSelectorJS(className, context, really /* = false */) { // Firefox2, Opera9.2x, IE
  var rv, ri, ctx = context || _doc, c, v, i, iz, cn, m, m1, m2, ary, j, jz, id, n, cache = !really && _useCache;
  if (cache) {
    id = (context === void 0) ? className : (className + "/" + (ctx[UUID] || (ctx[UUID] = ++_uuid)));
    if (_age !== _mu.age) {
      _age = _mu.age;
      _classCache = {};
    } else if ( (n = _classCache[id]) ) {
      return n;
    }
  }
  rv = [], ri = -1, n = ctx.getElementsByTagName("*"), i = 0, iz = n.length;

  if ( (m = className.match(CSS_CLASS2)) ) {
    m1 = " " + m[1] + " ";
    m[2] && (m2 = " " + m[2] + " ");
    for (; i < iz; ++i) {
      v = n[i];
      c = v.className;
      if (c) {
        cn = " " + c + " ";
        if (cn.indexOf(m1) > -1) {
          if (!m2 || (m2 && cn.indexOf(m2) > -1)) {
            rv[++ri] = v;
          }
        }
      }
    }
  } else {
    ary = className.replace(/^[\s]*|[\s]*$/g, "").split(" ");
    j = 0, jz = ary.length;
    if (jz === 1 && ary[0] === "") { return []; }
    for(; j < jz; ++j) {
      ary[j] = " " + ary[j] + " ";
    }
    for (; i < iz; ++i) {
      v = n[i];
      c = v.className;
      if (c) {
        cn = " " + c + " ";
        for (j = 0, jz = ary.length, m = 0; j < jz; ++j) {
          if (cn.indexOf(ary[j]) > -1 && ++m === jz) {
            rv[++ri] = v;
            break;
          }
        }
      }
    }
  }
  return cache ? (_classCache[id] = rv) : rv;
}

function addTag(tag, xml) { // xml = false
  var lo = tag.toLowerCase(), up = tag.toUpperCase();
  if (!(lo in htmlTag)) {
    xmlTag[up] = htmlTag[lo] = htmlTag[up] = up;
    xmlTag[lo] = lo;
  }
  return xml ? tag : up;
}

function initMutationEvent() {
  _mu(uuClass.Selector.clearCache);
}

// --- export ---
uu.id         = IDSelectorAPI;
uu.tag        = _ua.ie ? TagSelectorJS : TagSelectorAPI;
uu.className  = !_classAPI ? ClassSelectorJS : ClassSelectorAPI;
uu.css        = CSSSelector;
uu.xpath      = XPathSelectorAPI;

uuClass.Selector.clearCache = function() {
  _idCache    = {};
  _tagCache   = {};
  _classCache = {};
  _cssCache   = {};
  _xpathCache = {};
};

uuClass.Selector.rebuild = function() {
  UNSUPPORTED = _ua.ie    ? uuConst.Selector.APIUnsupported.ie :
                _ua.gecko ? uuConst.Selector.APIUnsupported.gecko :
                            uuConst.Selector.APIUnsupported.webkit;
};

uuConst.Selector.PseudoFunction = CSS_FUNC;

// === init ===
(function(){
  // create tag dict.
  var ary = "*,div,p,a,ul,ol,li,span,td,tr,dl,dt,dd,h1,h2,h3,h4,iframe,form,input,textarea,select,body,style,script".split(","),
      v, i = 0, iz = ary.length, node, env = { cache: 1 };
  for (; i < iz; ++i) { addTag(ary[i]); }

  uuClass.Selector.rebuild();

  // invalidated cache system
  uuClass.Detect.env("uupaa-selector.js", env);
  if (env.cache == "0" || !_useCache || _ua.webkit || _ua.selector || _ua.ie8 ||
      !uuClass.MutationEventLite) {
    _useCache = false;
    UUID = "uuid";
  }

  // element.uuid or element.uniqueID prebuild
  node = _doc.getElementsByTagName("*");
  for (i = 0, iz = node.length; i < iz; ++i) {
    v = node[i];
    v[UUID] || (v[UUID] = ++_uuid);
  }

  if (_useCache) {
    _mu = uuClass.MutationEventLite;
    _ua.ie ? _win.attachEvent("onload", initMutationEvent) :
             _win.addEventListener("load", initMutationEvent, false);
  }
})();

})(); // end (function())() scope

} // if (!uuClass.Selector)
