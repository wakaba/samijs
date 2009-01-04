/** Canvas Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 * @see http://developer.apple.com/documentation/GraphicsImaging/Conceptual/drawingwithquartz2d/dq_intro/chapter_1_section_1.html#//apple_ref/doc/uid/TP30001066-CH201-TPXREF101
 */
(function() {
var uuw = window, uu = uuw.uu,
    uum = Math, uump = uum.PI,
    uudeg = 180 / uump /*, uurad = uump / 180 */; // to degree, to radian

if (!("canvas" in uu.module)) {
  uu.module.canvas = function() {};
}

/** 2D canvas
 *
 * @class
 */
uu.module.canvas2d = uu.klass.kiss();
uu.module.canvas2d.prototype = {
  // const member
  _RADIAN:  uump / 180,
  _PI2:     uump * 2,
  _STYLES:  { color:    "color", // default fill/stroke color, IE only
              fill:     "fillStyle",
              stroke:   "strokeStyle", 
              width:    "lineWidth",
              cap:      "lineCap",
              join:     "lineJoin",
              miter:    "miterLimit",
              shadow:   "shadowColor",
              blur:     "shadowBlur",
              ox:       "shadowOffsetX",
              oy:       "shadowOffsetY",
              font:     "font",
              align:    "textAlign",
              baseline: "textBaseline",
              alpha:    "globalAlpha",
              mix:      "globalCompositeOperation",
              ielf:     "ielf" // Linear-gradient fill focus, IE only
            },
  _EXSTYLE: { fit:      "fit",
              degree:   "degree"
            },
  // uu.module.canvas2d.construct - Initialize - 初期化
  construct:
            function(canvas) {
              this.ctx = canvas.getContext("2d");
              this._fit    = false;   // false: no fit, true: fit
              this._degree = true;    // angle || true; // false: RADIAN, true: degree(0～359)
              this._repair = false;

              if (uu.ua.ie && (uu.config.repair & 0x1) && this.ctx.init_) { // excanvas.js
                this._repair = true;
                this.ctx.init_();
              }
            },
  // uu.module.canvas2d.clear - Clear rect - 矩形範囲のクリア
  clear:    function(x /* = 0 */, y /* = 0 */, w /* = canvas.width */, h /* = canvas.height */) {
              this.ctx.clearRect(x || 0, y || 0,
                                 w || this.ctx.canvas.width,
                                 h || this.ctx.canvas.height);
              return this;
            },
// --- environment methods ---
  // uu.module.canvas2d.scale - Scale -  拡大/縮小率を指定
  scale:    function(w, h) {
              this.ctx.scale(w, h);
              return this;
            },
  // uu.module.canvas2d.translate - Offset origin - 原点からのオフセットを指定
  translate:
            function(x, y) {
              this.ctx.translate(x, y);
              return this;
            },
  // uu.module.canvas2d.rotate - Rotate - キャンバスを回転
  rotate:   function(angle) {
              this.ctx.rotate(this._degree ? angle * this._RADIAN : angle);
              return this;
            },
  // uu.module.canvas2d.setStyle - Set style - スタイルを指定
  setStyle: function(name /* or Hash */, value) {
              var me = this;
              uu.forEach(uu.isS(name) ? uu.toPair(name, value) : name, function(v, i) {
                if (i in me._EXSTYLE) {
                  me["_" + i] = v;
                } else {
                  i = (i in me._STYLES) ? me._STYLES[i] : i;
                  if (uu.ua.ie) {
                    switch (i) {
                    case "color":
                      me.ctx.setDefaultColor_ && (v = me.ctx.setDefaultColor_(v));
                      break;
                    case "fillStyle":
                      if (uu.isS(v) || "r" in v) { // "#FFFFFF" or RGBAHash
                        me.ctx.setFillColor_ && (v = me.ctx.setFillColor_(v));
                      }
                      break;
                    case "strokeStyle":
                      if (uu.isS(v) || "r" in v) { // "#FFFFFF" or RGBAHash
                        me.ctx.setStrokeColor_ && (v = me.ctx.setStrokeColor_(v));
                      }
                      break;
                    }
                  }
                  switch (typeof v) {
                  case "string":
                  case "number":
                    break;
                  default:
                    if ("r" in v) { // RGBAHash → "rgba(...)"
                      v = uu.color.rgba(v);
                    }
                    break;
                  }
                  me.ctx[i] = v;
                }
              });
              return this;
            },
  // uu.module.canvas2d.style - Get Style - スタイルを取得
  style: function(name) {
              if (name in this._EXSTYLE) {
                return this["_" + name];
              }
              return (name in this._STYLES) ? this._STYLES[name] : "";
            },
// --- path operation methods ---

  // uu.module.canvas2d.begin - beginPath
  begin:    function(x /* = undefined */, y /* = undefined */) {
              this.ctx.beginPath();
              (x !== void 0 && y !== void 0) && this.ctx.moveTo(x || 0, y || 0);
              return this;
            },
  // uu.module.canvas2d.move - moveTo
  move:     function(x, y) {
              this.ctx.moveTo(x, y); return this;
            },
  // uu.module.canvas2d.line - lineTo
  line:     function(x, y) {
              this.ctx.lineTo(x, y); return this;
            },
  // uu.module.canvas2d.arc - arc
  arc:      function(x, y, r, a0 /* = 0 */, a1 /* = 359 or (Math.PI * 2) */, clock /* = true */) {
              var deg = this._degree, rad = this._RADIAN;
              a0 = a0 || 0, clock = clock === void 0 || clock;
              deg ? this.ctx.arc(x, y, r, a0, (a1 === void 0) ? this._PI2 : a1, !clock)
                  : this.ctx.arc(x, y, r, a0 * rad, ((a1 === void 0) ? 359 : a1) * rad, !clock);
              return this;
            },
  // uu.module.canvas2d.curve - quadraticCurveTo or bezierCurveTo
  curve:    function(/* Arg( cpx, cpy, x, y ) or Arg( cp1x, cp1y, cp2x, cp2y, x, y ) */) {
              var a = arguments, q = a.length === 4;
              q ? this.ctx.quadraticCurveTo(a[0], a[1], a[2], a[3])
                : this.ctx.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
              return this;
            },
  // uu.module.canvas2d.clip - clip
  clip:     function() {
              this.ctx.clip();
              return this;
            },
  // uu.module.canvas2d.stroke - stroke
  stroke:   function() {
              this.ctx.stroke();
              return this;
            },
  // uu.module.canvas2d.fill - fill or stroke
  fill:     function(wire /* = false */) {
              wire ? this.ctx.stroke() : this.ctx.fill();
              return this;
            },
  // uu.module.canvas2d.text
  text:     function(text, x, y, wire /* = false */, maxWidth /* = undefined */) {
              // not impl
              // measureText too
            },
  // uu.module.canvas2d.close - closePath
  close:    function(x /* = undefined */, y /* = undefined */) {
              this.ctx.closePath();
              (x !== void 0 && y !== void 0) && this.ctx.moveTo(x || 0, y || 0);
              return this;
            },
  // uu.module.canvas2d.inPath - isPointInPath
  inPath:   function(x, y) {
              return this.ctx.isPointInPath(x, y);
            },
// --- convenience methods ---

  // box状のパスを作成し内部を塗りつぶす
  //
  //       8   7
  //      ／￣￣＼6
  //    1｜      ｜
  //     ｜      ｜5
  //     2＼＿＿／
  //        3   4
  //
  // uu.module.canvas2d.box - strokeRect, fillRect, curve + line
  box:      function(x, y, w, h, r /* = 0 */, wire /* = false */) {
              if (!r) {
                wire ? this.ctx.strokeRect(x, y, w, h) : this.ctx.fillRect(x, y, w, h);
                return this;
              }
              return this.begin(x, y + r).line(x, y + h - r).                       // 1
                          curve(x, y + h, x + r, y + h).line(x + w - r, y + h).     // 2,3
                          curve(x + w, y + h, x + w, y + h - r).line(x + w, y + r). // 4,5
                          curve(x + w, y, x + w - r, y).line(x + r, y).             // 6,7
                          curve(x, y, x, y + r).fill(wire || false).                // 8
                          close();
            },
  // uu.module.canvas2d.poly - poly line
  poly:     function(point /* PointArray( [x0, y0, x1, y1, ... ] ) */, wire /* = false */) {
              var p = point || [0, 0], i, sz = point.length;
              this.begin(p[0], p[1]);
              for (i = 2; i < sz; i += 2) {
                this.line(p[i], p[i + 1]);
              }
              this.fill(wire || false).close();
            },
  // uu.module.canvas2d.metabolic - metabolic box
  // めたぼ(全体は角丸四角で、下っ腹がたるんとしている感じ)
  // tarun = 0でかまぼこ型
  metabo:   function(x, y, w, h, r /* = 0 */, tarun /* = 10 */, wire /* = false */) {
              r = r || 0, tarun = (tarun === void 0) ? 10 : tarun, wire = wire || false;
              if (tarun) {
                return this.begin(x, y + r).line(x, y + h - r). // 1
                            curve(x + w * 0.5, y + h + tarun, x + w, y + h - r). // 2,3,4
                            line(x + w, y + r). // 5
                            curve(x + w, y, x + w - r, y).line(x + r, y). // 6,7
                            curve(x, y, x, y + r).fill(wire). // 8
                            close();
              }
              // かまぼこ
              return this.begin(x, y + r).line(x, y + h). // 1
                          line(x + w, y + h). // 2,3,4
                          line(x + w, y + r). // 5
                          curve(x + w, y, x + w - r, y).line(x + r, y). // 6,7
                          curve(x, y, x, y + r).fill(wire). // 8
                          close();
            },
// ellipse:
// circle
  // uu.module.canvas2d.oval - oval
  // x,yの位置に半径rの円状(楕円状)のパスを生成し内部を塗りつぶす
  // w !== h なら楕円を描画する
  oval:     function(x, y, w, h, r, wire /* = false */) {
              wire = wire || false;
              if (w === h) { // 円
                if (this._repair && !wire) {
                  if (!uu.isS(this.ctx.fillStyle) && (this.ctx.fillStyle.type_ === "gradientradial")) {
                    this.begin(x, y);
                    this.ctx.radialGradientOval_(x, y, w, h, r)
                    return this;
                  }
                }
                return this.begin(x, y).arc(x, y, r, 0, uump * 2, true).
                            fill(wire).close();
              }
              // 楕円
              // 未実装
              return this;
            },
  // uu.module.canvas2d.dotBlt
  // alpah = 0 のドットは描画しない
  dotBlt:   function(x, y, w, h, ary /* RGBAHashArray */) {
              var i = 0, j = 0;
              try {
                for (; j < h; ++j) {
                  for (i = 0; i < w; ++i) {
                    if (ary[i + j * w].a) {
                      this.setStyle({ fill: ary[i + j * w] });
                      this.ctx.fillRect(x + i, y + j, 1, 1);
                    }
                  }
                }
              } catch(e) { ; }
              return this;
            },
  // uu.module.canvas2d.gradation - gradation
  // グラデーション
  // color は RGBAHashでも指定可能
  gradation:
            function(pos /* Array( [x1, y1, x2, y2] or [x1, y1, r1, x2, y2, r2] ) */,
                     offsetColor /* Array( [offset1, color1, offset2, color2, ...] ) */) {
              var rv, p = pos, oc = offsetColor, c, i = 0, sz = oc.length;
              if (pos.length === 4) {
                rv = this.ctx.createLinearGradient(p[0], p[1], p[2], p[3]);
              } else {
                rv = this.ctx.createRadialGradient(p[0], p[1], p[2], p[3], p[4], p[5]);
              }

              if (uu.ua.ie) {
                // IEには "#coffee" として渡す
                for (; i < sz; i += 2) {
                  c = oc[i + 1];
                  if (uu.isS(c)) {
                    rv.addColorStop(oc[i], uu.color.coffee(uu.color.hash(c)));
                  } else {
                    rv.addColorStop(oc[i], uu.color.coffee(c));
                  }
                }
              } else {
                for (; i < sz; i += 2) {
                  c = oc[i + 1];
                  if (!uu.isS(c)) {
                    c = uu.color.rgba(c);
                  }
                  rv.addColorStop(oc[i], c);
                }
              }
              return rv;
            },
  // uu.module.canvas2d.pattern - pattern
  pattern:  function(image /* image or canvas */, pattern /* = "repeat" */) {
              return this.ctx.createPattern(image, (pattern === void 0) ? "repeat" : pattern);
            },
  // uu.module.canvas2d.image - image
  image:    function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
              if (!this._fit) {
                switch (arguments.length) {
                case 1: this.ctx.drawImage(image, 0, 0); break;
                case 3: this.ctx.drawImage(image, sx, sy); break;
                case 5: this.ctx.drawImage(image, sx, sy, sw, sh); break;
                case 9: this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh); break;
                default: uu.log("bad arg: uu.module.canvas2d.image(args=%d)", arguments.length);
                }
              } else {
                var w = this.ctx.canvas.width, h = this.ctx.canvas.height;
                sw = image.width;
                sh = image.height;
                dx = (sw <= w) ? Math.floor((w - sw) / 2) : 0;
                dy = (sh <= h) ? Math.floor((h - sh) / 2) : 0;
                dw = (sw <= w) ? sw : w;
                dh = (sh <= h) ? sh : h;
                this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
              }
              return this;
            },
// --- for debuggin ---
  grid:     function(param /* = { size: 64, color: "#FFD8BD" } */) {
              var me = this, pa = uu.mix.param(param || {}, { size: 64, color: "#FFD8BD" }),
                  ctx = this.ctx, img = new uu.module.image(),
                  url = uu.config.imagePath + "uu.module.canvas.grid.gif";

              img.load(url, function(uid, step, _img) {
                if (step === 2 && !uu.ua.ie) { // excanvas.js(Rev 0.2)はcreatePattern未実装
                  me.begin().setStyle({ fill: ctx.createPattern(_img, "") }).
                     box(0, 0, me.w, me.h).close();
                  return;
                }
                // 代替
                var x, y;
                me.begin().setStyle({ stroke: pa.color });
                for (y = pa.size; y < me.h; y += pa.size) {
                  me.move(0, y).line(me.w, y);
                }
                for (x = pa.size; x < me.w; x += pa.size) {
                  me.move(x, 0).line(x, me.h);
                }
                me.stroke().close();
              }, 6);
            }
};

if (!uu.ua.ie || !(uu.config.repair & 0x1)) {
  return;
}
if (!("CanvasRenderingContext2D" in window)) {
  throw Error("need excanvas.js");
}
// excanvas.js(version 0.2) Hack
// - createLinearGradient
// -- support angle
// - createRadialGradient
// -- support draw concentric circle
// - drawImage
// -- better resize and opacity
// 
uu.mix(CanvasRenderingContext2D.prototype, {
  createLinearGradient:
            function(x0, y0, x1, y1) {
              var rv = new CanvasGradient("gradient");
              rv.param_ = { x0: x0, y0: y0,
                            x1: x1, y1: y1 };
              return rv;
            },
  createRadialGradient: function(x0, y0, r0, x1, y1, r1) {
              var rv = new CanvasGradient("gradientradial");
              rv.param_ = { x0: x0, y0: y0, r0: r0,
                            x1: x1, y1: y1, r1: r1 };
              return rv;
            },
  createPattern: function(image, repetition) {
              return new CanvasPattern(image, repetition);
            },
  // VMLではグラデーション/パターンは描線できないため単色のcolorで線を描く
  stroke:   function() {
              this.element_.insertAdjacentHTML("beforeEnd", this.colorStroke_());
              this.currentPath_ = [];
            },
  fill:     function() {
              var vml = "";
              if (!uu.isS(this.fillStyle)) {
                switch (this.fillStyle.type_) {
                case "gradient":
                  vml = this.linearGradientFill_();
                  break;
                case "tile":
                  vml = this.patternFill_();
                  break;
                }
              } else {
                vml = this.colorFill_();
              }
              if (vml) {
                this.element_.insertAdjacentHTML("beforeEnd", vml);
              }
              this.currentPath_ = [];
            },
  colorStroke_:
            function() {
              var rv = [], color, opacity,
                  path        = this.buildPath_(),
                  weight      = this.lineWidth + "px",
                  joinstyle   = this.lineJoin,
                  miterlimit  = this.miterLimit,
                  endcap      = (this.lineCap in this.caps_) ? this.caps_[this.lineCap]
                                                             : this.caps_.square;
              if (uu.isS(this.strokeStyle)) { // "#COFFEE"
                color = this.strokeStyleCOFFEE_;
                opacity = this.strokeStyleRGBA_.a * this.globalAlpha;
              } else {
                color = this.colorCOFFEE_;
                opacity = this.colorRGBA_.a * this.globalAlpha;
              }

              rv.push('<g_vml_:shape style="position:absolute;width:10;height:10"',
                          ' filled="f" stroked="t" coordorigin="0,0" coordsize="100,100"',
                          ' path="', path, '">');
              rv.push('<g_vml_:stroke color="', color, '" weight="', weight, '"',
                          ' endcap="', endcap, '" opacity="', opacity, '"',
                          ' joinstyle="', joinstyle, '" miterlimit="', miterlimit, '" />');
              rv.push("</g_vml_:shape>");
//alert(rv.join(""));
              return rv.join("");
            },
  colorFill_:
            function() {
              var rv = [], color, opacity, path = this.buildPath_();

              if (uu.isS(this.fillStyle)) { // "#COFFEE"
                color = this.fillStyleCOFFEE_;
                opacity = this.fillStyleRGBA_.a * this.globalAlpha;
              } else {
                color = this.colorCOFFEE_;
                opacity = this.colorRGBA_.a * this.globalAlpha;
              }

              rv.push('<g_vml_:shape style="position:absolute;width:10;height:10"',
                          ' filled="t" stroked="f" coordorigin="0,0" coordsize="100,100"',
                          ' path="', path, '">');
              rv.push('<g_vml_:fill type="solid" color="', color, '" opacity="', opacity, '" />');
              rv.push("</g_vml_:shape>");
//alert("colorFill_:" + rv.join(""));
              return rv.join("");
            },
  // pathのwidthとheightが異なると、伸張した状態で描画されるため、他のブラウザと描画結果が異なってしまう
  // 伸張させないためには、widthとheightを1:1で指定する必要がある。→ あった。
  linearGradientFill_:
            function() {
              var rv = [], fs = this.fillStyle, fp = fs.param_,
                  path    = this.buildPath_(),
                  colors  = this.buildColors_(fs.colors_),
                  // @see http://d.hatena.ne.jp/uupaa/20080803/1217693950
                  angle   = Math.atan2(Math.pow(fp.x1 - fp.x0, 2),
                                       Math.pow(fp.y1 - fp.y0, 2)) * uudeg,
                  opacity = this.globalAlpha;

              rv.push('<g_vml_:shape style="position:absolute;width:10;height:10"',
                        ' filled="t" stroked="f" coordorigin="0,0" coordsize="100,100"',
                        ' path="', path, '">');
              rv.push('<g_vml_:fill type="gradient" method="sigma"',
                        ' focus="', this.ielf, '" ',
                        ' colors="', colors, '" opacity="', opacity, '" angle="', angle, '" />');
              rv.push("</g_vml_:shape>");
//alert("linearGradientFill_:" + rv.join(""));
              return rv.join("");
            },
  // パターンの描画
  // 画像がぼやける
  // パターン開始位置が他のブラウザと異なる
  // 200～300個の塗りつぶされたshapeを一つの画面内に配置すると、塗りつぶしがされないケースが頻発する
  patternFill_:
            function() {
              var rv = [], fs = this.fillStyle,
                  path    = this.buildPath_(),
//                src     = fs.img_.src,
                  src     = fs.src_,
                  color   = this.colorCOFFEE_;
                  opacity = this.globalAlpha;

              rv.push('<g_vml_:shape style="position:absolute;width:10;height:10"',
                        ' filled="t" stroked="f" coordorigin="0,0" coordsize="100,100"',
                        ' path="', path, '">');
              rv.push('<g_vml_:fill type="tile" color="', color, '"',
                        ' opacity="', opacity, '" src="', src, '" />');
              rv.push("</g_vml_:shape>");
// alert("patternFill_:" + rv.join(""));
              return rv.join("");
            },
// VMLでは円形グラデーションを描画するシェイプはovalのみ
// 複雑なパスを描画し円形グラデーションで切りぬくような描画ができない。
// グラデーションのサイズと、ovalのx,yがずれている場合も、他のブラウザと描画結果がことなる。
// ovalは必ずx,y,rのサイズの中心にグラデーションを描画するが、他のブラウザはクリッピングされる。
  radialGradientOval_:
            function(x, y, w, h, r) {
              var rv = [], fs = this.fillStyle, fp = fs.param_, fsize, fposX, fposY,
                  colors  = this.buildColors_(fs.colors_),
                  opacity = this.globalAlpha;

              fsize = fp.r0 / fp.x0; // focus size
              fposX = (1 - fsize + (fp.x0 - fp.x1) / fp.r1) / 2; // forcus position x
              fposY = (1 - fsize + (fp.y0 - fp.y1) / fp.r1) / 2; // forcus position y

              rv.push('<g_vml_:oval',
                        ' style="position:absolute',
                                ';left:',  x - fp.r1, ';top:',    y - fp.r1,
                                ';width:', fp.r1,     ';height:', fp.r1, '"',
//                      ' stroked="f" coordorigin="0,0" coordsize="10500,10500">'); // -5%
                        ' stroked="f" coordorigin="0,0" coordsize="11000,11000">'); // -10%
              rv.push('<g_vml_:fill type="gradientradial" method="sigma"',
                        ' focussize="', fsize , ',', fsize, '"',
                        ' focusposition="', fposX, ',', fposY, '"',
                        ' colors="', colors, '" opacity="', opacity, '" />');
              rv.push("</g_vml_:oval>");

//alert("radialGradientOval_:" + rv.join(""));
              this.element_.insertAdjacentHTML("beforeEnd", rv.join(""));

              this.currentPath_ = [];
            },
  // drawImage(image, dx, dy)
  // drawImage(image, dx, dy, dw, dh)
  // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
  drawImage:
            function(image) {
              var rv = "", a = arguments, asz = a.length,
                  sz = { w: 0, h: 0 }, dx, dy, dw, dh, sx, sy, sw, sh,
                  method = "image", elmType = 0; // 0 is Image, 1 is Canvas

              if ("src" in image) {               // image is HTMLImageElement
                sz = this.getOriginalElementSize_(image);
              } else if ("getContext" in image) { // image is HTMLCanvasElement
                ++elmType;
                // sz = this.getOriginalElementSize_(image);
              }
              if (!elmType) {
                switch (asz) {
                case 3: dx = a[1], dy = a[2], dw = sz.w, dh = sz.h,
                        sx = 0,    sy = 0,    sw = sz.w, sh = sz.h, method = "image"; break;
                case 5: dx = a[1], dy = a[2], dw = a[3], dh = a[4],
                        sx = 0,    sy = 0,    sw = sz.w, sh = sz.h, method = "scale"; break;
                case 9: dx = a[5], dy = a[6], dw = a[7], dh = a[8],
                        sx = a[1], sy = a[2], sw = a[3], sh = a[4], method = "scale"; break;
                default:
                  (uu.config.debug & 0x1) &&
                    uu.die("CanvasRenderingContext2D.prototype.drawImage",
                           "arguments.length", asz);
                }
              }
              rv = elmType ? this.drawCanvas_(image, sx, sy, sw, sh,
                                                     dx, dy, dw, dh, sz.w, sz.h, method)
                           : this.drawImage_(image, sx, sy, sw, sh,
                                                    dx, dy, dw, dh, sz.w, sz.h, method);
              if (rv) {
                this.element_.insertAdjacentHTML("BeforeEnd", rv);
              }
            },
  drawImage_:
            function(image, sx, sy, sw, sh, dx, dy, dw, dh, ew, eh, method) {
              var rv = [], c = this.getCoords_(dx, dy),
                  Z = 10, mc = Math.ceil, mr = Math.round,
                  pfx ="filter:progid:DxImageTransform.Microsoft", // filter prefix
                  sizeTrans = (sx || sy); // 0: none size transform, 1: size transform

              if (this.m_[0][0] != 1 || this.m_[0][1]) { // transform
                rv.push('<div style="position:absolute;',
                          this.getImageTransformationMatrixStyle_(dx, dy, dw, dh), '">');
              } else {
                rv.push('<div style="position:absolute;', // 1:1 scale
                                    "top:", mr(c.y / Z), "px;left:", mr(c.x / Z), "px", '">')
              }
              rv.push('<div style="position:relative;overflow:hidden;width:',
                                   mr(dw), 'px;height:', mr(dh), 'px">');

              if (sizeTrans) {
                rv.push('<div style="width:',  mc(dw + sx * dw / sw), 'px;',
                                    'height:', mc(dh + sy * dh / sh), 'px;',
                                    pfx, '.Matrix(Dx=', -sx * dw / sw, ',Dy=', -sy * dh / sh, ')">');
              }
              rv.push('<div style="width:', mr(ew * dw / sw), 'px;',
                                  'height:', mr(eh * dh / sh), 'px;',
                                  pfx, '.AlphaImageLoader(src=', image.src, ',sizingMethod=' + method + ')"></div>');
              rv.push(sizeTrans ? "</div>" : "", "</div></div>");
//alert(rv.join(""));
              return rv.join("");
            },
  drawCanvas_:
            function(image, sx, sy, sw, sh, dx, dy, dw, dh, ew, eh) {
              // not impl
//            throw Error("drawImage(canvas, ...) not implement");
              return "";
            },
  init_:    function() {
              this.caps_ = { square: "square", butt: "flat", round: "round" };
              this.ielf  = "0%"; // "-100%", "0", "100%" フォーカスの中心を調整
              this.color = this.setDefaultColor_("black");
              this.fillStyle = this.setFillColor_("black");
              this.strokeStyle = this.setStrokeColor_("black");
            },
  setDefaultColor_:
            function(color /* or RGBAHash */) {
              var rgba = uu.isS(color) ? uu.color.hash(color) : color;
              this.colorCOFFEE_ = uu.color.coffee(rgba);
              this.colorRGBA_   = rgba;
              return uu.color.rgba(rgba); // "rgba(r,g,b,a)"
            },
  setFillColor_:
            function(color /* or RGBAHash */) {
              var rgba = uu.isS(color) ? uu.color.hash(color) : color;
              this.fillStyleCOFFEE_ = uu.color.coffee(rgba);
              this.fillStyleRGBA_   = rgba;
              return uu.color.rgba(rgba); // "rgba(r,g,b,a)"
            },
  setStrokeColor_:
            function(color /* or RGBAHash */) {
              var rgba = uu.isS(color) ? uu.color.hash(color) : color;
              this.strokeStyleCOFFEE_ = uu.color.coffee(rgba);
              this.strokeStyleRGBA_   = rgba;
              return uu.color.rgba(rgba); // "rgba(r,g,b,a)"
            },
  buildColors_:
            function(ary) {
              var rv = [], i = 0, sz = ary.length;
              function SORT_COLOR_OFFSET(a, b) { return a.offset - b.offset; }

              ary.sort(SORT_COLOR_OFFSET);
              for (; i < sz; ++i) {
                rv.push(ary[i].offset + " " + ary[i].color[0]);
              }
              return rv.join(",");
            },
  buildPath_:
            function(calcSize /* = false */) {
              calcSize = calcSize || false;

              var rv = [], i = 0, sz = this.currentPath_.length, p, c, c1, c2,
                  mr = Math.round, rx, ry,
                  ix, iy, ax, ay; // min{x|y}, max{x|y}
              function RESIZE(x, y) {
                if (ix === void 0 || x < ix) { ix = x; }
                if (iy === void 0 || y < iy) { iy = y; }
                if (ax === void 0 || x > ax) { ax = x; }
                if (ay === void 0 || y > ay) { ay = y; }
              }
              for (; i < sz; ++i) {
                p = this.currentPath_[i];
                switch (p.type) {
                  case "moveTo":
                    c = this.getCoords_(p.x, p.y);
                    rv.push("m ", mr(c.x), ",", mr(c.y));
                    calcSize && RESIZE(c.x, c.y);
                    break;
                  case "lineTo":
                    c = this.getCoords_(p.x, p.y);
                    rv.push("l ", mr(c.x), ",", mr(c.y));
                    calcSize && RESIZE(c.x, c.y);
                    break;
                  case "bezierCurveTo":
                    c  = this.getCoords_(p.x, p.y);
                    c1 = this.getCoords_(p.cp1x, p.cp1y);
                    c2 = this.getCoords_(p.cp2x, p.cp2y);
                    rv.push("c ", mr(c1.x), ",", mr(c1.y), ",",
                                  mr(c2.x), ",", mr(c2.y), ",",
                                  mr(c.x),  ",", mr(c.y));
                    calcSize && RESIZE(c.x, c.y);
                    break;
                  case "at": // arc
                  case "wa":
                    c  = this.getCoords_(p.x, p.y);
                    c1 = this.getCoords_(p.xStart, p.yStart);
                    c2 = this.getCoords_(p.xEnd, p.yEnd);
                    rx = this.arcScaleX_ * p.radius;
                    ry = this.arcScaleY_ * p.radius;
                    rv.push(p.type, " ",
                            mr(c.x - rx), ",", mr(c.y - ry), " ",
                            mr(c.x + rx), ",", mr(c.y + ry), " ",
                            mr(c1.x), ",", mr(c1.y), " ",
                            mr(c2.x), ",", mr(c2.y));
                    calcSize && RESIZE(c.x, c.y);
                    break;
                  case "close":
                    rv.push("x ");
                    break;
                }
              }
              if (calcSize) {
                return [rv.join(""), ax - ix, ay - iy];
              }
              return rv.join("");
            },
  getOriginalElementSize_:
            function(elm) {
              var rv = { w: 0, h: 0 },
                  ow = elm.runtimeStyle.width,
                  oh = elm.runtimeStyle.height;
              elm.runtimeStyle.width  = "auto";
              elm.runtimeStyle.height = "auto";
              rv.w = elm.width;
              rv.h = elm.height;
              elm.runtimeStyle.width  = ow;
              elm.runtimeStyle.height = oh;
              return rv;
            },
  getImageTransformationMatrixStyle_:
            function(x, y, w, h) {
              var m = this.m_, Z = 10, mr = Math.round,
                  c1 = this.getCoords_(x    , y    ),
                  c2 = this.getCoords_(x + w, y    ),
                  c3 = this.getCoords_(x    , y + h),
                  c4 = this.getCoords_(x + w, y + h),
                  mx = ["M11='", m[0][0], "',", "M12='", m[1][0], "',",
                        "M21='", m[0][1], "',", "M22='", m[1][1], "',",
                        "Dx='",  mr(c1.x / Z),  "',", "Dy='",  mr(c1.y / Z),   "'"],
                  rv = ["padding:0 ", mr(Math.max(c1.x, c2.x, c3.x, c4.x) / Z), "px ",
                                      mr(Math.max(c1.y, c2.y, c3.y, c4.y) / Z), "px 0;",
                        "filter:progid:DXImageTransform.Microsoft.Matrix(", mx.join(""), ",sizingmethod='clip')"];
              return rv.join("");
            }
});

CanvasGradient.prototype.addColorStop = function(offset, color) {
  this.colors_.push({ offset: 1 - offset, color: [color, 1] });
};

function CanvasPattern(image /* HTMLImageElement or HTMLCanvasElement */, repetition /* = undefined */) {
  repetition = repetition || "repeat";
  switch (repetition) {
  case "repeat":
//  case "repeat-x":
//  case "repeat-y":
//  case "no-repeat": // あとで、imagedata で実装可能か検討する
    break;
  default: throw SyntaxError("bad argument");
  }
  this.type_ = "tile";

  if ("src" in image) {               // HTMLImageElement
    if (!image.complete) {
      throw Error("INVALID_STATE_ERR"); // IE is DOMException(DOM Lv2) not impl
    }
//    this.img_ = new Image();
//    this.img_.src = image.src;
    // uu.module.ieboost との連携
    if ("uuIEBoostAlphapngSrc" in image) {
      this.src_ = image.uuIEBoostAlphapngSrc; // 透過処理済みのimage要素の元々の画像
    } else {
      this.src_ = image.src; // 透過処理されていない画像
    }
    this.repeat_ = repetition;
  } else if ("getContext" in image) { // HTMLCanvasElement
//    return null; // not impl
    throw Error("not impl");
  }
}

/*
function TextMetrics(width) {
  this.width = width;
}

function copyState(src, tgt) {
  var hash = {
    strokeStyle:              0,
    strokeStyleCOFFEE_:       0,
    strokeStyleRGBA_:         0,
    fillStyle:                0,
    fillStyleCOFFEE_:         0,
    fillStyleRGBA_:           0,
    color:                    0,
    colorCOFFEE_:             0,
    colorRGBA_:               0,
    lineWidth:                0,
    lineCap:                  0,
    lineJoin:                 0,
    miterLimit:               0,
    shadowColor:              0,
    shadowBlur:               0,
    shadowOffsetX:            0,
    shadowOffsetY:            0,
    arcScaleX_:               0,
    arcScaleY_:               0,
    globalAlpha:              0,
    globalCompositeOperation: 0
  };
  uu.forEach(hash, function(v, i) { // v is dummy
    (i in src) && (tgt[i] = src[i]);
  });
}
 */

})(); // end (function())()
