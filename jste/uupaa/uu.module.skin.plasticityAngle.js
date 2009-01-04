/** Window Skin Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uuw = window, uu = uuw.uu;

uu.module.skin.plasticityAngle = {};

/** Window Skin
 *
 * @class
 */
uu.module.skin.plasticityAngle.window = uu.klass.generic();
uu.module.skin.plasticityAngle.window.prototype = {
  construct:
            function(fdc) {
              this._fdc = fdc;
              this._c2d = 0;
              this._img = 0;
              this._file = [uu.config.imagePath + "window.btn1.png"];
              this._color = { bone:    uu.color.zero,
                              resize1: uu.color.zero,
                              resize2: uu.color.zero };
            },
  destruct: function() {},
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "IS_INIT":
                var pa = this._fdc.skinParam;
                uu.mix.param(pa, { titleColor: "white", boneColor: "black", boneRadius: 8,
                                   boneShadow: 5, bodyStyle: "auto" });
                this._color.title = uu.color.coffee(uu.color.hash(pa.titleColor));
                // boneColorをベースに、明度+50%,-50%な色を生成しドラッグハンドラカラーとする
                this._color.bone = uu.color.hash(pa.boneColor);
                this._color.resize1 = uu.color.ratio(this._color.bone, 0, 0,  50);
                this._color.resize1.a = 1.0;
                this._color.resize2 = uu.color.ratio(this._color.bone, 0, 0, -50);
                this._color.resize2.a = 0.3;

                this._c2d = new uu.module.canvas2d(this._fdc.boneCanvas);
                uu.msg.post(uu.imageset, "PRELOAD_IMAGE", this, this._file);
                break;
              case "PRELOAD_IMAGE_OK": // p1 = uu.module.image
                this._img = p1;
                uu.msg.post(this._fdc.initializer, "*I_INIT_OK");
                break;
              case "PRELOAD_IMAGE_NG":
                this._img = p1;
                uu.msg.post(this._fdc.initializer, "*I_INIT_NG");
                break;
              case "LS_UPDATE":
                this._bone(p1);
                this._button(p1.w - 60 - this._fdc.skinParam.boneShadow, 10);
                this._fdc.resize && this._fdc.viewState.size === 0 &&
                                    this._resizeHandle(p1.w - 17, p1.h - 17);
                break;

              // 座標上に何かあれば0以外の戻り値を返す
              case "LS_QUERY_POSITION": // send(p1 = { x,y,w,h }, p2 = {x,y})
          // uu.log("x[%d],y[%d]", p2.x, p2.y);

                if (uu.inRect({ x: p1.w - 60 - this._fdc.skinParam.boneShadow,
                                y: 10, w: 18, h: 18} , p2)) {
                  return 3;
                }
                if (uu.inRect({ x: p1.w - 60 + 18 - this._fdc.skinParam.boneShadow,
                                y: 10, w: 18, h: 18} , p2)) {
                  return 2;
                }
                if (uu.inRect({ x: p1.w - 60 + 36 - this._fdc.skinParam.boneShadow,
                                y: 10, w: 18, h: 18} , p2)) {
                  return 1;
                }
                return 0;
                break;
              }
              return 0;
            },
  _bone:    function(rect) {
              var pa = this._fdc.skinParam, w = rect.w, h = rect.h, i,
                  br = pa.boneRadius, bs = pa.boneShadow, pad, bevel,
                  c  = uu.mix({}, this._color.bone), // clone
                  shadowWidth = (uu.ua.ie) ? 2 : 1; // IEではshape数を減らすため幅2で描画する

              this._fdc.title.style.color = this._color.title;

              this._c2d.setStyle({ alpha: 0.9, lineWidth: shadowWidth });

              for (i = 0; i < bs; i += shadowWidth) {
                c.a = i * 0.05 + 0.1;
          //      this._c2d.setStyle({ fill: c }).box(i, i, w - (i * 2), h - (i * 2), br + (bs - i), 0);
                this._c2d.setStyle({ stroke: c }).box(i, i, w - (i * 2), h - (i * 2), br + (bs - i), 1);
              }
              --i;

              this._c2d.setStyle({ alpha: uu.ua.ie ? 0.75 : 1.0 });

              this._c2d.setStyle({ fill: this._boneStyle(rect, this._color.bone) });
              this._c2d.box(i, i, w - (i * 2), h - (i * 2), br + (bs - i), 0);
              this._c2d.setStyle({ alpha: 1.0 });

              if (pa.bodyStyle !== "none") {
                switch (pa.bodyStyle) {
                case "auto": this._c2d.setStyle({ fill: this._bodyStyle(rect) }); break; // "auto"
                default:     this._c2d.setStyle({ fill: pa.bodyStyle }); break; // "#color"
                }
                ++i;
                pad = this._fdc.param.bodyPadding, bevel = this._fdc.param.bodyBevel - i;
                this._c2d.box(i +  pad.left + bevel,
                              this._fdc.param.titleHeight + pad.top,
                              w - (i * 2) - pad.left - pad.right - bevel * 2,
                              h - i - this._fdc.param.titleHeight - pad.top - pad.bottom - bevel,
                              br + (bs - i), 0);
              }
              this._c2d.setStyle({ alpha: 1.0 });
            },
  _button:  function(x, y) {
              this._c2d.image(this._img.item(0), x, y);
            },
  _resizeHandle:
            function(x, y) {
              this._c2d.begin(x + 0, y + 12).line(x + 12, y + 0).
                        move(x + 4, y + 12).line(x + 12, y + 4).
                        setStyle({ stroke: this._color.resize1 }).stroke().close();
              this._c2d.begin(x + 1, y + 12).line(x + 12, y + 1).
                        move(x + 5, y + 12).line(x + 12, y + 5).
                        setStyle({ stroke: this._color.resize2 }).stroke().close();
            },
  // Plastic gradation + angle
  _boneStyle:
            function(rect, rgba /* RGBAHash( {r,g,b,a} ) */ ) {
              var r = rgba.r, g = rgba.g, b = rgba.b;
//              return this._c2d.gradation([0, 0, rect.h, rect.h * 4.5],
              return this._c2d.gradation([0, 0, 80, 360],
                                         [0.0,  { r: r, g: g, b: b, a: 0.7 },
                                          0.15, "white",
                                          0.6,  { r: r, g: g, b: b, a: 0.3 },
                                          1.0,  { r: r, g: g, b: b, a: 0.3 }]);
            },
  // マット + 不透明度0.8
  _bodyStyle:
            function(rect) {
              var c = uu.color.ratio(this._color.bone, 10, 5, 0);
              c.a = 1.0;
              return c;
            }
};

})(); // end (function())()

