/** Develop Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu, UU = uuw.UU;

uu.module.dev = function() {};

// ---------------------------
// Performance and Log Module

/** Performance
 *
 * @class
 */
uu.module.perf = uu.klass.kiss();
uu.module.perf.prototype = {
  construct:
            function(antiDispersion /* = true */) { // true: ばらつきを消す
              this._anti = antiDispersion === void 0 || antiDispersion;
              this._diff = [];
              this._lastCost = 0;
            },
  // uu.module.perf.run
  run:      function(fn, loop /* = 1 */, set /* = 1 */) {
              this._diff.length = 0; // 前回のデータを破棄
              loop = loop || 1, set = set || 1;
              set += (this._anti ? 4 : 0);
              var past, sz = 0, cost = this._cost(loop, set), r = 0;

              while (set--) {
                past = uu.time(), sz = loop + 1;
                while (--sz) { fn(); }
                r = uu.time() - past - cost;
                this._diff.push(r < 0 ? 0 : r); // マイナスにならないように
              }
              // 前後2回分(計4回分)の数値を捨てる
              if (this._anti) {
                this._diff.sort(function(a, b) { return a - b; });
                this._diff.pop();
                this._diff.pop();
                this._diff.shift();
                this._diff.shift();
              }
              this._lastCost = cost;
            },
  // uu.module.perf.report
  report:   function() {
              if (!this._diff.length) {
                return { total: 0, avg: 0, set: 0, dump: [], cost: 0 };
              }
              var total = 0;
              this._diff.forEach(function(v) { total += v; });
              return { total: total, avg: total / this._diff.length,
                       set: this._diff.length, dump: this._diff, cost: this._lastCost };
            },
  toString: function() {
              var r = this.report();
              return uu.sprintf("total=%dms avg=%dms set=%d (cost=%dms)", r.total, r.avg, r.set, r.cost);
            },
  // 実処理時間を正確に求めるために、whileループとuu.time()に掛かるコストを求める
  _cost:    function(loop, set) {
              var rv = 0, past, sz = 0, dummy = [], r = 0, fn = uu.mute;
              rv = uu.time();
              while (set--) {
                past = uu.time(), sz = loop + 1;
                while (--sz) { fn(); } // 関数呼び出しコストも含めるためにダミー関数(uu.mute)を呼び出す
                r = uu.time() - past - 0;
                dummy.push(r < 0 ? 0 : r); // 出来るだけ近づけるために無駄な演算を行う
              }
              return uu.time() - rv; // loop cost
            }
};

/** Log2
 *
 * @class
 */
uu.module.log2 = uu.klass.singleton();
uu.module.log2.prototype = {
  construct:
            function(id /* = "uuLog" */, uparound /* = 100 */) {
              this._id = id || "uuLog";
              this._uparound = uparound || 100;
              this._sort = false;
              this._stock = [];
              this._line = 0;
              this._depth = 1;
              this._enableFilter = false;
              this._filterExpr = null; // RegExp object
              this._e = 0;
              var me = this;
              uu.ready(function() {
                me._createViewPort()
                me._applyViewPortStyle();
                me._put(); // 溜まっているログを出力
              }, "D");
            },
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "SET":
                this._set(p1[0] || "", p1[1] || 0, p1[2] || 0);
                break;
              }
              return 0;
            },
  _set:     function(cmd, p1, p2) {
              // SORT:    p1=Boolean enable
              // FILTER:  p1=Boolean enable, p2=[RegExp Object]
              // RECT:    p1=RectHash
              // DEPTH:   p1=Number depth
              switch (cmd) {
              case "SORT":    this._sort = !!p1; break;
              case "FILTER":  this._enableFilter = !!p1;
                              rgexp && (this._filterExpr = p2); break;
              case "RECT":    uu.css.setRect(this._e, p1); break;
              case "DEPTH":   this._depth = p1; break;
              }
            },
  clear:    function() {
              if (this._e) { this._e.innerHTML = ""; }
              this._stock = [];
              this._line = 0;
            },
  // uu.module.log2.log - Logging - ログ出力
  log:      function(fmt /*, arg, ... */) {
              this._stock.push(this._sprintf.apply(this, arguments));
              this._put();
            },
  // uu.module.log2.inspect - Humanize output, Object Reflection - オブジェクトを人間用に加工し出力する
  inspect:  function(/* mix, ... */) {
              var me = this, nest = 0, max = this._depth, i = 0, sz = arguments.length;
              for (; i < sz; ++i) {
                me._stock.push(me._inspect(arguments[i], me._sort, nest, max));
              }
              this._put();
            },
  // uu.module.log2.hex - Hex dump
  hex:      function(byteArray) {
              var rv = [], rb, b = byteArray, p = 0, fmtHex = ["<br />"], fmtAscii = [" "],
                  i, sz = parseInt(b.length / 16);
              for (i = 0; i < sz; p += 16, ++i) {
                rv.push(uu.sprintf(
                            "<br />%02X %02X %02X %02X %02X %02X %02X %02X  %02X %02X %02X %02X %02X %02X %02X %02X  %A%A%A%A%A%A%A%A%A%A%A%A%A%A%A%A",
                            b[p + 0], b[p + 1], b[p + 2], b[p + 3], b[p + 4], b[p + 5], b[p + 6], b[p + 7],
                            b[p + 8], b[p + 9], b[p +10], b[p +11], b[p +12], b[p +13], b[p +14], b[p +15],
                            b[p + 0], b[p + 1], b[p + 2], b[p + 3], b[p + 4], b[p + 5], b[p + 6], b[p + 7],
                            b[p + 8], b[p + 9], b[p +10], b[p +11], b[p +12], b[p +13], b[p +14], b[p +15]));
              }
              // 16byteに満たない場合は、後ろに詰め物をした配列に値をコピーしdumpする
              if (b.length % 16) {
                rb = Array(16);

                for (i = 0; i < b.length % 16; ++i) {
                  rb[i] = b[p + i];
                  (i === 8) && fmtHex.push(" ");
                  fmtHex.push("%02X ");
                  fmtAscii.push("%A");
                }
                for (; i < 16; ++i) {
                  rb[i] = 0;
                  fmtHex.push("   ");
                  fmtAscii.push(" ");
                }
                rv.push(uu.sprintf(fmtHex.join(""),
                                   rb[ 0], rb[ 1], rb[ 2], rb[ 3], rb[ 4], rb[ 5], rb[ 6], rb[ 7],
                                   rb[ 8], rb[ 9], rb[10], rb[11], rb[12], rb[13], rb[14], rb[15]));
                rv.push(uu.sprintf(fmtAscii.join(""),
                                   rb[ 0], rb[ 1], rb[ 2], rb[ 3], rb[ 4], rb[ 5], rb[ 6], rb[ 7],
                                   rb[ 8], rb[ 9], rb[10], rb[11], rb[12], rb[13], rb[14], rb[15]));
              }
              this._stock.push(rv.join(""));
              this._put();
            },
  _sprintf: function(format /*, ... */) {
              var av = arguments, next = 1, idx = 0, prefix = { o: "0", x: "0x", X: "0X" },
                  I = parseInt, F = parseFloat, N = isNaN, C = String.fromCharCode, me = this;
              function FORMAT(m, ai, f, w, p, sz, t, v) { // m(match), sz(size)未使用, vはundefined
                idx = ai ? I(ai) : next++;
                switch (t) {
                case "i":
                case "d": v = I(T(idx)).toString(); break;
                case "u": v = I(T(idx)); !N(v) && (v = U(v).toString()); break;
//              case "o": v = I(T(idx)); !N(v) && (v = P(t, U(v).toString(8), f)); break;
                case "o": v = I(T(idx)); !N(v) && (v = me.inspect(v)); break;
                case "x": v = I(T(idx)); !N(v) && (v = P(t, U(v).toString(16), f)); break;
                case "X": v = I(T(idx)); !N(v) && (v = P(t, U(v).toString(16).toUpperCase(), f)); break;
                case "f": v = F(T(idx)).toFixed(p); break;
                case "c": w = 0; v = T(idx); v = (typeof v === "number") ? C(v) : ""; break;
                case "A": w = 0; v = T(idx); v = (typeof v === "number") ? ASCII(v) : ""; break;
                case "s": /* w = 0; */ v = T(idx).toString(); p && (v = v.substring(0, p)); break;
                case "%": v = "%"; break;
                }
                return (v.length < w) ? PAD(t, v, f || " ", w - v.length) : v;
              }
              function ASCII(v) { return (v < 0x20 || v > 0x7e) ? "." : C(v); } // ASCII(0x20～0x7e)以外ならドット(".")を返す
              function PAD(t, v, f, sz) {
                if (f === "0" && (t === "d" || t === "f") && v.indexOf("-") !== -1) {
                  return "-" + Array(sz + 1).join("0") + v.substring(1); // "-123" -> "-00123"
                }
                return Array(sz + 1).join((f === "#") ? " " : f) + v;
              }
              function P(t, v, f) { return (f !== "#") ? v : prefix[t] + v; } // add prefix
              function T(i) { return (av[i] === void 0) ? "undefined" : av[i]; } // "undefined" trap
              function U(v) { return (v >= 0) ? v : v % 0x100000000 + 0x100000000; } // to unsigned

              return format.replace(/%(?:([\d]+)\$)?(#|0)?([\d]+)?(?:\.([\d]+))?(l)?([%iduoxXfcAs])/g, FORMAT);
            },
  _createViewPort: function() {
              this._e = uud.getElementById(this._id);
              if (!this._e) {
                this._e = uu.mix(uud.body.appendChild(uud.createElement("pre")), { id: this._id });
              }
            },
  _applyViewPortStyle: function() {
              var rule = "background-color: powderblue; color: black; display: none; "
                       + "position: absolute; width: 40em; height: 20em; right: 1em; bottom: 1em; "
                       + "overflow: auto;";
              uu.css.insertRule(uu.sprintf("#%s { %s }", this._id, rule));
              uu.css.setOpacity(this._e, 0.75);
            },
  _put:     function() {
              if (this._e && this._stock.length) {
                uu.css.show(this._e);
                this._e.innerHTML += "<br />" + this._stock.join(", ");
                this._stock.length = 0; // clear
                if (this._uparound && ++this._line > this._uparound) {
                  this.clear(); // clear log
                }
              }
            },
  _inspect: function(mix, sort, nest, max) {
              try {
                if (mix === null)   { return "null"; }
                if (mix === void 0) { return "undefined"; }
                if (uu.isB(mix) ||
                    uu.isN(mix))    { return mix.toString(); }
                if (uu.isS(mix))    { return '"' + mix + '"'; }
                if (uu.isF(mix))    { return this._getFunctionName(mix); }
                if (uu.isE(mix))    { return this._inspectNode(mix, sort, nest, max); }
                if (!uu.ua.ie && mix instanceof NodeList) {
                                      return this._inspectNodeList(mix, sort, nest, max); }
                if (uu.ua.gecko && mix instanceof HTMLCollection) {
                                      return this._inspectNodeList(mix, sort, nest, max); }
                if (uu.isA(mix))    { return this._inspectArray(mix, sort, nest, max); }
                if (uu.isFA(mix))   { return this._inspectFakeArray(mix, sort, nest, max); }
                if ("r" in mix && "g" in mix && "b" in mix && "a" in mix) {
                                      return this._inspectRGBAHash(mix, sort, nest, max); }
                return this._inspectObject(mix, sort, nest, max);
              } catch(e) { ; }
              return "*** catch Exception ***";
            },
  _inspectRGBAHash:
            function(mix, sort, nest, max) {
              return uu.sprintf("[%02X %02X %02X %.1f]", mix.r, mix.g, mix.b, mix.a);
            },
  _inspectNodeList:
            function(mix, sort, nest, max) {
              var rv = [], i, sz;
              if (nest + 1 > max) { return uu.sprintf("ElementArray@%d[...]", mix.length); }

              for (i = 0, sz = mix.length; i < sz; ++i) {
                rv.push(this._inspectNode(mix[i], sort, nest + 1, max));
              }
              if (rv.length <= 1) {
                return uu.sprintf("ElementArray@%d[%s]", mix.length, rv.join(", <br /> "));
              }
              if (rv.length <= 4) {
                return uu.sprintf("ElementArray@%d[%s]", mix.length, rv.join(", "));
              }
              return uu.sprintf("ElementArray@%d[<br /> %s<br />]", mix.length, rv.join(", <br /> "));
            },
  _inspectArray:
            function(mix, sort, nest, max) {
              var rv = [], i, sz;
              if (nest + 1 > max) { return uu.sprintf("Array@%d[...]", mix.length); }

              for (i = 0, sz = mix.length; i < sz; ++i) {
                rv.push(this._inspect(mix[i], sort, nest + 1, max));
              }
              if (rv.length <= 1) {
                return uu.sprintf("Array@%d[%s]", mix.length, rv.join(", <br /> "));
              }
              if (rv.length <= 4) {
                return uu.sprintf("Array@%d[%s]", mix.length, rv.join(", "));
              }
              return uu.sprintf("Array@%d[<br /> %s<br />]", mix.length, rv.join(", <br /> "));
            },
  _inspectFakeArray:
            function(mix, sort, nest, max) {
              var rv = [], i;
              if (nest + 1 > max) { return uu.sprintf("FakeArray@%d[...]", mix.length); }

              for (i in mix) {
                rv.push(uu.sprintf("%s: %s", i, this._inspect(mix[i], sort, nest + 1, max))); // FakeArray
              }
              sort && rv.sort();
              if (uu.size(rv) <= 1) {
                return uu.sprintf("FakeArray@%d[%s]", mix.length, rv.join(", <br /> "));
              }
              return uu.sprintf("FakeArray@%d[<br /> %s<br />]", mix.length, rv.join(", <br /> "));
            },
  _inspectObject:
            function(mix, sort, nest, max) {
              var rv = [], i;
              if (nest + 1 > max) { return uu.sprintf("Hash@%d{...}", uu.size(mix)); }

              for (i in mix) {
                rv.push(uu.sprintf("%s: %s", i, this._inspect(mix[i], sort, nest + 1, max))); // Object
              }
              sort && rv.sort();
              if (uu.size(rv) <= 1) {
                return uu.sprintf("Hash@%d{%s}", uu.size(rv), rv.join(", <br /> "));
              }
              return uu.sprintf("Hash@%d{<br /> %s<br />}", uu.size(rv), rv.join(", <br /> "));
            },
  _inspectNode:
            function(mix, sort, nest, max) {
              var rv = [], name = [], i;
              if (nest + 1 > max) { return uu.sprintf("%s", this._node2XPath(mix)); }

              switch (mix.nodeType) {
              case 1:  name.push("(ELEMENT_NODE)"); break;
              case 3:  return "(TEXT_NODE)[\""    + this._chopNodeValue(mix, 32) + "\"]";
              case 8:  return "(COMMENT_NODE)[\"" + this._chopNodeValue(mix, 32) + "\"]";
              case 9:  return "(DOCUMENT_NODE)";
              default: return uu.sprintf("(NODE[type:%d])", mix.nodeType);
              }
              name.push(this._node2XPath(mix));
              mix.id && name.push(" #" + mix.id); // add "#id"
              mix.className && name.push(" ." + mix.className); // add ".className"

              for (i in mix) {
                if (this._enableFilter && !this._filterExpr.test(i)) { continue; }

                switch (i) {
                case "style":
                case "innerHTML":
                case "innerText":
                case "outerHTML":
                  rv.push(uu.sprintf("%s: ...", i));
                  break;
                default:
                  rv.push(uu.sprintf("%s: %s", i, this._inspect(mix[i], sort, nest + 1, max))); // Object
                }
              }
              sort && rv.sort();
              return name.join("") + "{<br /> " + rv.join(", <br /> ") + "<br />}";
            },
  _getFunctionName:
            function(mix) { // {{
              return mix.toString().replace(/function\s*([^\(]*)\([^}]*}/, "$1(){}"); // ))
            },
  _chopNodeValue:
            function(mix, size /* = 32 */) {
              return mix.nodeValue.substring(0, size || 32).replace(/\n/, "\\n");
            },
  _node2XPath:
            function(elm) {
              if (!elm.parentNode || elm.nodeType !== 1) { return "/html"; }
              function F(e, tag) {
                var rv = 0, i = 0, c = e.parentNode.childNodes, sz = c.length;
                for (; i < sz; ++i) { if (c[i].nodeType !== 1) { continue; }
                                      if (c[i].tagName === tag) { ++rv; }
                                      if (c[i] === e) { return rv; } }
                return -1;
              }
              var rv = [], pos = F(elm, elm.tagName);
              while (elm && elm.nodeType === 1) {
                rv.push(elm.tagName.toLowerCase());
                elm = elm.parentNode;
              }
              rv.reverse();
              return "/" + rv.join("/") + "[" + pos + "]";
            }
};
uu.syslog = new uu.module.log2();
// --- uu.log::Override ---
uu.log = function(fmt /*, arg, ... */ /* or */ /* mix */) {
  var m = (uu.isS(fmt) && fmt.indexOf("%") >= 0 && arguments.length > 1)
        ? "log" : "inspect";
  uu.syslog[m].apply(uu.syslog, arguments);
};
uu.mix(uu.log, {
  debug:    function(fmt /*, arg, ... */) { uu.log.apply(uu.syslog, arguments); },
  error:    function(fmt /*, arg, ... */) { uu.log.apply(uu.syslog, arguments); },
  warn:     function(fmt /*, arg, ... */) { uu.log.apply(uu.syslog, arguments); },
  info:     function(fmt /*, arg, ... */) { uu.log.apply(uu.syslog, arguments); },
  dir:      function() { uu.syslog.inspect.apply(uu.syslog, arguments); },
  clear:    function() { uu.syslog.clear(); },
  hex:      function() { uu.syslog.hex.apply(uu.syslog, arguments); },
  set:      function() { uu.msg.post(uu.syslog, "SET", arguments); }
});


// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// --- tryout code --- 以下は開発中 ---


uu.mix(uu.mix, {
  // uu.mix.prefix - prefix付きのミックスイン - Object mixin with/without prefix
  prefix:   function(base, flavor, prefix /* = "" */, add /* = true */) {
              var i, p = prefix || "", sz = p.length;
              if (!sz) {
                return uu.mix(base, flavor);
              }
              if (add === void 0 || add) {
                for (i in flavor) {
                  base[p + i] = flavor[i];
                }
              } else {
                for (i in flavor) {
                  (i.indexOf(p) !== -1) ? (base[i.substring(sz)] = flavor[i])
                                        : (base[i] = flavor[i]);
                }
              }
              return base;
            }
});

uu.mix(uu.ajax, {
  // uu.ajax.loadSync - 同期通信 - Ajax sync request
  loadSync:
            function(url, fn /* = undefined */, data /* = undefined */, callbackFilter /* = undefined */) {
              !url && uu.die("uu.ajax.loadSync", "url", url);
              url = uu.url.abs(url), fn = fn || uu.mute, data = data || null;
              var rq = uu.request, cf = callbackFilter || rq.callbackFilter, uid = uu.uid("ajax"),
                  filescheme = url.indexOf("file://") !== -1, // file スキームでtrue
                  xhr = uuw.XMLHttpRequest ? new XMLHttpRequest()
                      : uuw.ActiveXObject  ? new ActiveXObject('Microsoft.XMLHTTP') : null;
              function H(v, k) { ("setRequestHeader" in xhr) && xhr.setRequestHeader(k, v); } // Opera8にはsetRequestHeader()メソッドが無い
              function fail(state) { (cf & 4) && fn(uid, 4, "", state || 400, url, 1); } // 400 "Bad Request"

              if (!xhr) { fail(); return; }

              try {
                xhr.open(data ? "POST" : "GET", url.replace(/&amp;/, "&"), false); // false = Sync
              } catch(e) { fail(); return; }

              uu.forEach(rq.header, H);
              data && H("application/x-www-form-urlencoded", "Content-Type");
              (cf & 1) && fn(uid, 1, "", 0, url, 0);
              xhr.send(data);
              // fileスキームでは成功時にstatusが0になる(Firefox2,Safari3,Opera9.5,IE6)
              if (xhr.status === 200 || filescheme && !xhr.status) {
                (cf & 2) && fn(uid, 2, xhr.responseText, 200, url, 0);
              } else {
                fail(xhr.status);
              }
            }
});
/** uu.script.load - スクリプトの読み込み - Load Script
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/DOCUMENT.htm#uu.script.load">uu.script.load</a>
 */
//uu.script.load = function(type /* = "text/x-uu-form" */, fn /* = undefined */, callbackFilter /* = undefined */) {
/*
  type = type || "text/x-uu-form", fn = fn || uu.mute;
  var uid = uu.uid("scriptLoad"), cf = callbackFilter || uu.request.callbackFilter;
  uu.attr('script[@type="' + type + '"]').forEach(function(v) {
    if (!v.src) { // sync
      v.data = uu.module.evaljs(v.text.replace(/[\n]/mg, ""));
      (cf & 1) && fn(uid, 1, "",       0, "", 0);
      (cf & 2) && fn(uid, 2, v.data, 200, "", 0, v); // eval後のデータを渡す
    } else { // async
      v.data = v.text = "";
      uu.ajax(v.src, function(uid, step, text) {
        switch (step) {
        case 1: (cf & 1) && fn(uid, 1, "",     0,   "", 0); break;
        case 2: v.text = text, v.data = uu.module.evaljs(v.text.replace(/[\n]/mg, ""));
                (cf & 2) && fn(uid, 2, v.data, 200, "", 0, v); break; // responseにeval後のデータを渡す
        case 4: (cf & 4) && fn(uid, 4, v.data, 200, "", 0, v); break;
        }
      }, 0, 7); // callbackFilter = SEND + OK + NG
    }
  });
};
 */

})(); // end (function())()
