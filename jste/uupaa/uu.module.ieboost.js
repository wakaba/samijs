/** IE Boost Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

/** IE Boost
 *
 * @class
 */
uu.module.ieboost = uu.klass.singleton();
uu.module.ieboost.prototype = {
  construct:
            function(param /* = { maxmin: true, alphapng: true, opacity: true,
                                  datascheme: true, positionFixed: true, positionAbsolute: true } */) {
              this._param = uu.mix.param(param || {}, {
                maxmin: true, alphapng: true, opacity: true, datascheme: true,
                positionFixed: true, positionAbsolute: true
              });
              uu.event.set(this, uuw, "resize");
              var pa = this._param;

              // IEのバージョンによる機能の不活性化
              switch (uu.ua.version) {
              case 8:
                pa.datascheme       = false; // IE8+でDataScheme不活性化
                pa.maxmin           = false; // IE7+でmaxmin不活性
                pa.alphapng         = false; // IE7+でalphapng不活性
                pa.positionFixed    = false; // IE7+でpositionFixed不活性
                pa.positionAbsolute = false; // IE7+でpositionAbsolute不活性
                break;
              case 7:
                pa.maxmin           = false; // IE7+でmaxmin不活性
                pa.alphapng         = false; // IE7+でalphapng不活性
                pa.positionFixed    = false; // IE7+でpositionFixed不活性
                pa.positionAbsolute = false; // IE7+でpositionAbsolute不活性
                break
              case 6:
                !uu.ua.std && (pa.positionAbsolute = false); // IE6でQuirksモードならpositionAbsolute不活性
                break;
              }

              if (!uu.module.already("datascheme")) {
                pa.datascheme = false;
              }
              uu.msg.post(uu.customEvent, "SET", "FONT_RESIZE", this.uid); // resize font ハンドラの登録

              this._maxmin      = pa.maxmin           ? new uu.module.ieboost.maxmin()   : 0;
              this._alphapng    = pa.alphapng         ? new uu.module.ieboost.alphapng() : 0;
              this._opacity     = pa.opacity          ? new uu.module.ieboost.opacity()  : 0;
              this._datascheme  = pa.datascheme       ? new uu.module.ieboost.datascheme() : 0;
              this._posfix      = pa.positionFixed    ? new uu.module.ieboost.positionFixed() : 0;
              this._posabs      = pa.positionAbsolute ? new uu.module.ieboost.positionAbsolute() : 0;

              if (pa.maxmin) {
                // ポーリングで変化チェック
          //      uu.vtmHighSpeed.set(function() {
          //      }, 2000); // 2000msで無限ループ
              }
              uud.execCommand("BackgroundImageCache", false, true);
            },
  handleEvent:
            function(evt) {
              var type = uu.event.toType(evt);
              switch (type) {
              case "resize": // window resize event
                this._maxmin && this._maxmin.draw();
                this._posfix && this._posfix.recalc();
                break;
              }
            },
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "recalc":
                this._maxmin && this._maxmin.recalc();
                this._opacity && this._opacity.recalc();
                this._posfix && this._posfix.markup();
                this._posabs && this._posabs.recalc();
                break;
              case "FONT_RESIZE": // from customEvent
                this._maxmin && this._maxmin.recalc();
                this._posfix && this._posfix.recalc();
                break;
              }
              return 0;
            }
};

/** CSS2.1 max-width, min-width, max-height, min-height for IE6
 *
 * max-width, min-width, max-height, min-heightを持つブロック要素にマーキング(uuMaxMin)を行い幅と高さを制御する
 * ブロック要素(未処理)   -> element.uuMaxMin プロパティは存在しない
 * ブロック要素(処理対象) -> element.uuMaxMin = {
 *                              min-width: min-width指定値,
 *                              max-width: max-width指定値,
 *                              min-height: min-width指定値,
 *                              max-height: max-width指定値,
 *                              width: マークアップ直前の状態で計算された幅(%またはpx)
 *                              height: マークアップ直前の状態で計算された高さ(%またはpx)
 *                              w0: min-width指定値をルールに基づき事前に計算した値(-1なら,min-widthについては処理対象外)
 *                              w2: max-width指定値をルールに基づき事前に計算した値(-1なら,max-widthについては処理対象外)
 *                              h0: min-height指定値をルールに基づき事前に計算した値(-1なら,min-heightについては処理対象外)
 *                              h2: max-height指定値をルールに基づき事前に計算した値(-1なら,max-heightについては処理対象外)
 *                           }
 * ブロック要素(処理対象外)
 *                        -> element.uuMaxMin = {
 *                              min-width: undefined
 *                              max-width: undefined
 *                              min-height: undefined
 *                              max-height: undefined
 *                              width: マークアップ直前の状態で計算された幅(%またはpx)
 *                              height: マークアップ直前の状態で計算された高さ(%またはpx)
 *                              w0: -1
 *                              w2: -1
 *                              h0: -1
 *                              h2: -1
 *                           }
 * インライン要素(処理対象外) -> element.uuMaxMin プロパティは存在しない
 * @class
 */
uu.module.ieboost.maxmin = uu.klass.kiss();
uu.module.ieboost.maxmin.prototype = {
  construct:
            function() {
              this._lock = 0;
              this._mark = this._markup();
              this.draw();
            },
  // 再計算と再描画
  recalc:   function() {
              if (!this._mark.length) { return; }
              this._mark = this._markup(); // 再マークアップ
              this._mark.length && this.draw();
            },
  // 困ったことにIEから連続でイベントが来る。
  // 一定時間内の同種のイベントを一つにまとめて処理しないと、
  // イベント内でイベントが発生(無限ループ)し、
  // ブラウザがフリーズしたり、勝手にスクロールする。
  draw:     function() {
              if (this._lock) { return; } // lock中なら処理しない
              var me = this;
              function LOCK()   { me._lock = 1; }
              function UNLOCK() { me._lock = 0; }
              function FIX()    { LOCK();
                                  me._mark.forEach(function(e) {
                                    var mm = e.uuMaxMin;
                                    if (mm.w0 !== -1 || mm.w2 !== -1) { me._resizeWidth(e);  }
                                    if (mm.h0 !== -1 || mm.h2 !== -1) { me._resizeHeight(e); }
                                  });
                                  // ちょっと間をおいてロックを解除する(肝心)
                                  uu.delay(UNLOCK, 40); // 40ms後にunlock
                                }
              uu.delay(FIX, 40);
            },
  // ブラウザに再計算させた値を元に、適正範囲内に収まっているかを判断する
  // わかり辛いのでコメント大盛り
  _resizeWidth:
            function(elm) {
              var mm = elm.uuMaxMin, s = elm.style, w;
              function MIN()  { if (mm.w0 === -1) { return false; } // min-widthが指定されていない → 仕事しない
                                s.width = mm.w0;                    // 一時的にmin-widthの値を幅に設定する(再計算/再描画)が走る
                                return (elm.clientWidth > w) ? true : false; } // min-widthで再計算後の幅が元の幅(w)より大きければ
                                                                               // 既にmin-widthを下回っていたことになるため、
                                                                               // style.widthにmin-widthを適用した状態でfalseを返す
              function MAX()  { if (mm.w2 === -1) { return false; } // max-widthが指定されていない → 仕事しない
                                s.width = mm.w2;
                                return (elm.clientWidth < w) ? true : false; }
              s.width = mm.width;  // widthをCSS指定値に戻し、ブラウザに本来の幅を再計算させる
              w = elm.clientWidth; // 本来の幅をwに保存
              if (!MIN() && !MAX()) { s.width = mm.width; } // 範囲内に収まっている場合は、本来の幅に戻す
            },
  _resizeHeight:
            function(elm) {
              var mm = elm.uuMaxMin, s = elm.style, h;
              function MIN()  { if (mm.h0 === -1) { return false; }
                                s.height = mm.h0;
                                return (elm.clientHeight > h) ? true : false; }
              function MAX()  { if (mm.h2 === -1) { return false; }
                                s.height = mm.h2;
                                return (elm.clientHeight < h) ? true : false; }
              s.height = mm.height;
              h = elm.clientHeight;
              if (!MIN() && !MAX()) { s.height = mm.height; }
            },
  // min-height, max-height, min-width, max-width 適用対象を列挙
  // 動的に要素を追加したりCSSを変更するような用法なら、その都度このメソッドを呼ぶ必要があるかもしれない
  // CSS2の仕様上ブロックレベル要素のみに適用する(table要素は除外)
  _markup:  function() {
              var rv = [], cs, mm, w, h, r, rect;
              function F(elm, val, name) { // CSS2の仕様書にあるルールを参考に色々と
                if (!val || val === "auto" || val === "none") { return -1; }
                if (val.lastIndexOf("%") !== -1) { // パーセント指定なら -> 親要素の幅/高さに対する%指定と解釈する
//                return uu.css.get[name](elm.parentNode) * parseFloat(val) / 100; // 親要素の幅/高さから計算
                  switch (name) {
                  case "width":
                    rect = uu.css.rect(elm.parentNode);
                    return rect.w * parseFloat(val) / 100; // 親要素の幅から計算
                  case "height":
                    rect = uu.css.rect(elm.parentNode);
                    return rect.w * parseFloat(val) / 100; // 親要素の高さから計算
                    break;
                  }
                  return -1;
                }
                return (isNaN(val)) ? uu.css.toPixel(elm, val, name) : -1; // 単位付の値(3em)
              }
              uu.forEach(uu.tag("*", document.body), function(v) {
                if (!uu.css.isBlock(v)) { return; } // (min|max)-(width|height)はブロックエレメント限定

                cs = v.currentStyle;
                // 要素に独自プロパティ(uuMaxMin)を追加し計算済みの値を保存する
                if (!v.uuMaxMin) { // 初回
                  r = v.getBoundingClientRect();  // "" 又は "auto" が指定されている場合は、
                                                  // currentStyle.width や clientWidth の値を見ても無駄なので、
                                                  // getBoundingClientRect()から幅と高さを取得する
                  w = cs.width, h = cs.height;
                  if (cs.width.lastIndexOf("%") === -1) { // %指定以外ならpx単位の値を取得する, %指定ならそのまま
                    w = (cs.width === "auto") ? (r.right - r.left) : v.clientWidth;
                    w += "px";
                  }
                  if (cs.height.lastIndexOf("%") === -1) {
                    h = (cs.height === "auto") ? (r.bottom - r.top) : v.clientHeight;
                    h += "px";
                  }
                  // 要素に独自プロパティ(uuMaxMin)を追加し、style要素/インライン属性で指定されたCSSプロパティを一式保存する
                  v.uuMaxMin = { width: w, height: h,
                                 "min-width":  cs["min-width"], "max-width":  cs["max-width"],
                                 "min-height": cs["minHeight"], "max-height": cs["max-height"] };
                }
                // 2回目以降は、style要素/インライン属性で指定されたCSSプロパティについては変動がないはずなので、そのまま。
                // 現在の幅/高さを用いた事前の再計算処理だけ行う。
                mm = v.uuMaxMin;
                uu.mix(mm, { w0: F(v, mm["min-width"],  "width"), w2: F(v, mm["max-width"],  "width"),
                             h0: F(v, mm["min-height"], "height"), h2: F(v, mm["max-height"], "height") });
                // CSS2の仕様にあわせた打ち消し処理(min-width > max-width なら，max-width = min-width)
                if (mm.w0 !== -1 && mm.w2 !== -1 && mm.w0 > mm.w2) { mm.w2 = mm.w0; }
                if (mm.h0 !== -1 && mm.h2 !== -1 && mm.h0 > mm.h2) { mm.h2 = mm.h0; }

                // min-width(w0), max-width(w2), min-height(h0), max-height(h2) の
                // いずれもが指定されていなければ描画対象に含めない
                if (mm.w0 === -1 && mm.w2 === -1 && mm.h0 === -1 && mm.h2 === -1) {
                  return; // 全て -1 なら処理対象外
                }
                rv.push(v); // 描画対象に追加
              });
              return rv; // 処理対象一覧を配列で返す
            }
};

/** Alpha png image transparent for IE6
 *
 * @class
 */
uu.module.ieboost.alphapng = uu.klass.kiss();
uu.module.ieboost.alphapng.prototype = {
  construct:
            function() {
              uu.css.insertRule("img { behavior: expression(uu.module.ieboost.alphapng._expression(this)) }");
              uu.css.insertRule(".png { behavior: expression(uu.module.ieboost.alphapng._expression(this)) }");
              uu.css.insertRule("input { behavior: expression(uu.module.ieboost.alphapng._expression(this)) }");
              uu.css.insertRule(".alpha { behavior: expression(uu.module.ieboost.alphapng._expression(this)) }");
            }
};
uu.mix(uu.module.ieboost.alphapng, { // prototypeではなく、クラスメソッドを追加する
  _expression:
            function(elm) {
              var path = uu.config.imagePath, spacer = "b32.png", reg = RegExp(spacer),
                  url, w, h, run = 0;

              switch (elm.tagName.toLowerCase()) {
              case "img":
                if (/.png$/i.test(elm.src)) {
                  if (reg.test(elm.src)) {
                    break; // nop
                  }
                  elm.uuIEBoostAlphapngSrc = elm.src;

                  w = elm.width;
                  h = elm.height;

                  uu.module.ieboost.alphapng._setAlphaLoader(elm, elm.src, "image");

                  elm.src = path + spacer;
                  elm.width = w; // hasLayout = true
                  elm.height = h;
                  ++run;
                } else {
                  // <img src="*.png">  ->  <img src="*.gif">
                  // 内部的に使用しているpngファイル(b32.png)と、DataSchmeは除外する
                  if (!reg.test(elm.src) && !(/^data:/.test(elm.src))) {
                    elm.uuIEBoostAlphapngSrc = elm.src;

                    // disable filter and make it original size
                    uu.module.ieboost.alphapng._unsetAlphaLoader(elm);
                    elm.style.width = "auto";
                    elm.style.height = "auto";
                    // ここでDataSchemeを持つ要素のwidth,heightが上書されてしまうと
                    // ieboost.datascheme の処理に支障がでる
                  }
                }
                break;
              case "input":
                if (elm.type !== "image") { break; }
                if (/.png$/i.test(elm.src)) {
                  if (reg.test(elm.src)) {
                    break; // nop
                  }
                  elm.uuIEBoostAlphapngSrc = elm.src;

                  uu.module.ieboost.alphapng._setAlphaLoader(elm, elm.src, "image");

                  elm.src = path + spacer;
                  elm.style.zoom = 1; // hasLayout = true

                  ++run;
                } else {
                  // <input type="image" src="*.png">  ->  <input type="image" src="*.gif">
                  if (!reg.test(elm.src)) {
                    elm.uuIEBoostAlphapngSrc = elm.src;

                    // disable filter
                    uu.module.ieboost.alphapng._unsetAlphaLoader(elm);
                    elm.style.width = "auto";
                    elm.style.height = "auto";
                  }
                }
                break;
              default:
                url = uu.css.backgroundImage(elm);
                if (url === "none") {
                  uu.module.ieboost.alphapng._unsetAlphaLoader(elm);
                  break;
                }
                if (reg.test(url)) {
                  break; // nop
                }
                if (/.png$/i.test(url)) {
                  uu.module.ieboost.alphapng._setAlphaLoader(elm, url, "crop");
                  elm.style.backgroundImage = "url(" + path + spacer + ")";

                  elm.style.zoom = 1; // hasLayout = true
                  ++run;
                } else { // *.png → *.jpg
                  uu.module.ieboost.alphapng._unsetAlphaLoader(elm);
                }
              }

              if (run) {
                uu.module.ieboost.alphapng._bugfix(elm);
              }
              // attach spy and purge behavior
              if (!("uuIEBoostAlphapngSpy" in elm)) {
                elm.attachEvent("onpropertychange", uu.module.ieboost.alphapng._onpropertychange);
                elm.uuIEBoostAlphapngSpy = 1;
              }
              elm.style.behavior = "none";
            },
  // spy
  _onpropertychange:
            function() {
              var evt = uuw.event;
              switch (evt.propertyName) {
              case "style.backgroundImage":
              case "src":  // <img src="1.png"> → <input type="2.png">
                uu.module.ieboost.alphapng._expression(evt.srcElement);
                break;
              }
            },
// set alpha image loader
  _setAlphaLoader:
            function(elm, src, method) {
              var aloader = "DXImageTransform.Microsoft.AlphaImageLoader";
              if (elm.filters.length && aloader in elm.filters) {
                elm.filters[aloader].enabled = 1;
                elm.filters[aloader].src = src;
              } else {
                elm.style.filter += " progid:" + aloader
                                 +  "(src='" + src + "', sizingMethod='" + method + "')";
              }
            },
  // unset alpha image loader
  _unsetAlphaLoader:
            function(elm) {
              var aloader = "DXImageTransform.Microsoft.AlphaImageLoader";
              if (elm.filters.length && aloader in elm.filters) {
                elm.filters[aloader].enabled = 0;
              }
            },
  // 透過された画像の上に配置した要素[a, input, textarea, select ]をクリック可能にする
  _bugfix:  function(elm) {
              var i = 0, sz = elm.childNodes.length, c;

              function FIX(e) {
                switch (e.tagName.toLowerCase()) {
                case "a":        e.style.cursor = "pointer"; // break through;
                case "input":
                case "select":
                case "textarea": !e.style.position && (e.style.position = "relative");
                }
              }

              FIX(elm);
              for (; i < sz; ++i) {
                c = elm.childNodes[i];
                if (c.nodeType === 1) {
                  FIX(c);
                  c.firstChild && uu.module.ieboost.alphapng._bugfix(c);
                }
              }
            }
});

/** CSS3 opacity for IE6
 *
 * @class
 */
uu.module.ieboost.opacity = uu.klass.kiss();
uu.module.ieboost.opacity.prototype = {
  // 全要素から以下の条件にマッチするものを検索しopacityを設定する
  // 条件1. currentStyleに"opacity"が定義されているが、styleに定義が無いもの
  // 条件2. 値が妥当な範囲(0.0～1.0)
  construct:
            function() {
              this.recalc();
            },
  recalc:   function() {
              var val, opa;
              uu.forEach(uu.tag("*", uud.body), function(e) {
                opa = e.style.opacity || e.currentStyle.opacity;
                if (opa) {
                  val = parseFloat(opa);
                  if (val >= 0.0 && val <= 1.0) {
                    uu.css.setOpacity(e, val);
                  }
                }
              });
            }
};

/** Data Scheme(DataURI) for IE5 - IE7
 *
 * @class
 */
uu.module.ieboost.datascheme = uu.klass.kiss();
uu.module.ieboost.datascheme.prototype = {
  construct:
            function() {
              this._obj = new uu.module.datascheme(48, 48, 0, 100); // MAX DIM(48 x 48), no canvas, delay 200ms
            }
};

/** position: fixed for IE6
 *
 * @class
 */
uu.module.ieboost.positionFixed = uu.klass.kiss();
uu.module.ieboost.positionFixed.prototype = {
  construct:
            function() {
              this._recalc = []; // reclacで再計算する要素, em単位指定 or bottom
              uu.ua.std ? uu.css.insertRule(".positionfixed { behavior: expression(uu.module.ieboost.positionFixed._expression(this)) }")
                        : uu.css.insertRule(".positionfixed { behavior: expression(uu.module.ieboost.positionFixed._expressionQuirks(this)) }");
              this.markup();
            },
  // フォントリサイズでpx値を再計算する
  recalc:   function() {
              var badElm = [];
              this._recalc.forEach(function(v, i) {
                if (!v || v.nodeType !== 1) { badElm.push(i); return; } // 不正な要素のindexをマーク

                if (!v || !("uuIEBoostPositionFixed" in v)) { return; }
                var cs = v.currentStyle, vp;
                if (v.uuIEBoostPositionFixed.top) { // top:
                  if (v.uuIEBoostPositionFixed.value.lastIndexOf("em") > -1) {
                    v.uuIEBoostPositionFixed.px = uu.css.toPixel(v, cs["paddingTop"]) + parseFloat(v.uuIEBoostPositionFixed.value) * uu.css.measure().em;
                  }
                } else { // bottom:
                  vp = uu.viewport.rect(), rect = uu.element.rect(v);
                  if (v.uuIEBoostPositionFixed.value.lastIndexOf("em") > -1) {
                    v.uuIEBoostPositionFixed.px = vp.h - rect.oh - (parseFloat(v.uuIEBoostPositionFixed.value) * uu.css.measure().em);
                  } else { // em以外でwindow resizeやfont resizeが発生した
                    v.uuIEBoostPositionFixed.px = vp.h - rect.oh - uu.css.toPixel(v, v.uuIEBoostPositionFixed.value);
                  }
                }
              });
              if (this._recalc.length) {
                // すばやく再描画するため、古の呪文を使う
                // http://www.microsoft.com/japan/msdn/columns/dude/dude061198.aspx
                uud.recalc(1);
              }
              // 既に存在しない要素を掃除する
              if (badElm.length) {
                badElm.forEach(function(v) { // v = 不正な要素のindex
                  delete this._recalc[v];
                });
                this._recalc = uu.diet(this._recalc);
              }
            },
  markup:  function() {
              var me = this, tag = uu.tag("*"), fxd = 0, html, vp, rect;

              // 1. position: fixed の要素を列挙する, 
              // 2. topの値をelm.uuIEBoostPositionFixedに退避する
              // 3. positionfixedクラスを追加する
              tag.forEach(function(v) {
                if (!v || v.nodeType !== 1) { return; }

                var cs = v.currentStyle, top, bottom;
                if (cs["position"] === "fixed" && !("uuIEBoostPositionFixed" in v)) {
                  ++fxd;
                  top = cs["top"] || v.style.top || 0;
                  bottom = cs["bottom"] || v.style.bottom || 0;

                  if (top !== "auto") { // case top:
                    if (uu.isS(top) && top.lastIndexOf("em") > -1) { me._recalc.push(v); } // em単位で指定された要素を記録する
                    v.uuIEBoostPositionFixed = {
                      top: 1,
                      value: top,
                      px: uu.css.toPixel(v, cs["paddingTop"]) + uu.css.toPixel(v, top)
                    };
                  } else { // case bottom:
                    vp = uu.viewport.rect();
                    rect = uu.element.rect(v);
                    me._recalc.push(v);
                    v.uuIEBoostPositionFixed = {
                      top: 0,
                      value: bottom,
                      px: vp.h - rect.oh - uu.css.toPixel(v, bottom)
                    };
                  }
                  uu.klass.toggle(v, "positionfixed");
                  v.style.position = "absolute";
                }
              });
              // スクロールをスムーズにするため、html, body { background-attachment: fixed } を設定する
              if (fxd) {
                if (uu.css.backgroundImage(uud.body) === "none") {
                  uu.css.setBackgroundImage(uud.body, "none");
                }
                uud.body.style.backgroundAttachment = "fixed";

                html = uu.tag("html")[0];
                if (uu.css.backgroundImage(html) === "none") {
                  uu.css.setBackgroundImage(html, "none");
                }
                html.style.backgroundAttachment = "fixed";
              }
            }
};
uu.mix(uu.module.ieboost.positionFixed, { // prototypeではなく、クラスメソッドを追加する
  _expression:
            function(elm) {
              elm.style.top = (document.documentElement.scrollTop + elm.uuIEBoostPositionFixed.px) + "px";
            },
  _expressionQuirks:
            function(elm) {
              elm.style.top = (document.body.scrollTop + elm.uuIEBoostPositionFixed.px) + "px";
            }
});

/** position: absolute bug(cannot select text) fix for IE6 Standard mode
 *
 * @class
 */
uu.module.ieboost.positionAbsolute = uu.klass.kiss();
uu.module.ieboost.positionAbsolute.prototype = {
  construct:
            function() {
              this._find = 0;
              this.recalc();
            },
  recalc:   function() {
              if (this._find) { return; }
              var abs = 0, ss, tag = uu.tag("*", uud.body), i = 0, sz = tag.length;
              for (; i < sz; ++i) {
                ss = tag[i].currentStyle || tag[i].style;
                if (ss.position === "absolute") { // found  position: absolute
                  ++abs;
                  break;
                }
              }
              if (abs) {
                uud.body.style.height = "100%";
                uu.tag("html")[0].style.height = "100%";
                ++this._find;
              }
            }
};

/** THE SHIM(bugfix: selectbox stays in the top(ignore z-index)) for IE6
 *  IEで一部の要素(select等)がz-indexを無視して最上位に居座るバグをFix
 *
 * @class
 */
uu.module.ieboost.shim = uu.klass.kiss();
uu.module.ieboost.shim.prototype = {
  construct:
            function(elm, transparent /* = false */) {
              this.elm = elm;
              this.shim = 0;
              if (uu.ua.ie6) { // IE6 only
                this.shim = uud.createElement('<iframe scrolling="no" frameborder="0" style="position:absolute;top:0;left:0"></iframe>');
                elm.parentNode.appendChild(this.shim); // sibl
                uu.css.setRect(this.shim, uu.css.rect(elm));
                if (transparent) {
                  this.shim.style.filter += " alpha(opacity=0)";
                }
              }
            },
  enable:   function() {
              return !!this.shim;
            },
  display:  function(disp) {
              this.shim.style.display = disp ? "" : "none";
            },
  setRect:  function(rect) {
              if (!this.shim) { return; }
              uu.css.setRect(this.shim, rect);
            },
  purge:    function() {
              if (!this.shim) { return; }
              this.elm.parentNode.removeChild(this.shim);
              this.shim = 0;
            }
};



uu.ieboost = 0;

if (!uu.ua.ie) { return; }

uu.ready(function() {
  uu.ieboost = new uu.module.ieboost();
}, "D");

uu.mix(uu.css, {
  // uu.css.recalc - Recalc element style - スタイルを再評価する
  recalc:   function(elm /* = undefined */) {
              uu.msg.post(uu.ieboost, "recalc", elm || 0);
            }
});

})(); // end (function())()

