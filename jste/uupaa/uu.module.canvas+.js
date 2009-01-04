/** Canvas Plus Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

uu.module["canvas+"] = {};

if (!("canvas" in uu.module)) {
  uu.module.canvas = function() {};
}


// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// --- tryout code --- 以下は開発中 ---

/** Canvas Image (2D + 0.5D)
 *
 * @class
 */
// 元画像のImageオブジェクトを受け取り、
// 指定されたcanvasに描画する
uu.module.canvas25dimage = uu.klass.kiss();
uu.module.canvas25dimage.prototype = {
   /* = OffsetHash( { degree: { x, y }, degree: { x, y }, ... } ) */
  construct:
            function(img, w, h, offset) {
              this._img = img;
              this._w = w;
              this._h = h;
              this._off = uu.mix.param(offset || {}, {
/*
                l08: { 0, 0 },
                -15: { 0, 0 },
                 -5: { 0, 0 },
                  0: { 0, 0 },
                  5: { 0, 0 },
                 15: { 0, 0 },
                 30: { 0, 0 }
 */
              });
              if (uu.ua.ie) {
                var sbox = uud.createElement("div"), e;
                uud.body.appendChild(sbox);
                e = uud.createElement("canvas");
                this._can = sbox.appendChild(e);
                uu.css.set(this._can, { position: "absolute", border: "1px dotted green" });
                if (uu.ua.ie) {
                  this._can = G_vmlCanvasManager.initElement(this._can);
                }
              } else {
                this._can = uud.createElement("canvas");
              }
/*
              uu.css.set.left(this._can, 400);
              uu.css.set.top(this._can,  400);
 */
              uu.css.setRect(this._can, { x: 400, y: 400 });

              this._can.width = w;
              this._can.height = h;
              this.ctx = this._can.getContext("2d");
//              this.ctx.drawImage(img, 0, 0, w, h);
              this.fit(w, h);
            },
  fit:      function(w, h) {
              sw = this._img.width;
              sh = this._img.height;
              dx = (sw <= w) ? Math.floor((w - sw) / 2) : 0;
              dy = (sh <= h) ? Math.floor((h - sh) / 2) : 0;
              dw = (sw <= w) ? sw : w;
              dh = (sh <= h) ? sh : h;
              this.ctx.drawImage(this._img, 0, 0, sw, sh, dx, dy, dw, dh);
            },

  fuckie:   function(ctx, offsetX, offsetY) {
              ctx.drawImage(this.ctx.canvas, 0, 0);
            },


  // ctxに対しリアルタイムに描画する
  // w:40pxを32pxで描画

  // 32/40=0.8
  _L40_32:  function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var w = this._w, h = this._h, ox = offsetX, oy = offsetY;
              var b = 40, a = 32;
              var i = 0, sz = w / b | 0;
              for (i = 0; i < sz; ++i) {
                ctx.drawImage(img, i * b, 0, b, h,
                                   ox + i * a, oy + i, a, h - i * 2);
              }
uu.log("i[%d]",i);
            },
  // 12/16=0.75
  _L16_12:  function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var w = this._w, h = this._h, ox = offsetX, oy = offsetY;
              var b = 16, a = 12;
              var i = 0, sz = w / b | 0;
              for (i = 0; i < sz; ++i) {
                ctx.drawImage(img, i * b, 0, b, h,
                                   ox + i * a, oy + i, a, h - i * 2);
              }
uu.log("i[%d]",i);
            },
  // 5/8=0.625
  _L8_5:    function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var w = this._w, h = this._h, ox = offsetX, oy = offsetY;
              var b = 8, a = 5;
              var i = 0, sz = w / b | 0;
              for (i = 0; i < sz; ++i) {
                ctx.drawImage(img, i * b, 0, b, h,
                                   ox + i * a, oy + i, a, h - i * 2);
              }
uu.log("i[%d]",i);
            },
  // 4/8=0.5
  _L8_4:    function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var w = this._w, h = this._h, ox = offsetX, oy = offsetY;
              var b = 8, a = 4;
              var i = 0, sz = w / b | 0;
              for (i = 0; i < sz; ++i) {
                ctx.drawImage(img, i * b, 0, b, h,
                                   ox + i * a, oy + i, a, h - i * 2);
              }
uu.log("i[%d]",i);
            },
  // 2/4=0.5
  _L4_2:    function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var w = this._w, h = this._h, ox = offsetX, oy = offsetY;
              var b = 4, a = 2;
              var i = 0, sz = w / b | 0;
              for (i = 0; i < sz; ++i) {
                ctx.drawImage(img, i * b, 0, b, h,
                                   ox + i * a, oy + i, a, h - i * 2);
              }
uu.log("i[%d]",i);
            },

  _L40_32_160px: function(ctx, offsetX, offsetY) {
              var img = this.ctx.canvas;
              var h = this._h, ox = offsetX, oy = offsetY;
              ctx.drawImage(img, 0,   0, 40, h, ox,       oy,     32, h);
              ctx.drawImage(img, 40,  0, 40, h, ox + 32,  oy + 1, 32, h - 1 * 2);
              ctx.drawImage(img, 80,  0, 40, h, ox + 64,  oy + 2, 32, h - 2 * 2);
              ctx.drawImage(img, 120, 0, 40, h, ox + 96,  oy + 3, 32, h - 3 * 2);
            }
};

})(); // end (function())()
