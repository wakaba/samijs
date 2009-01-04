/** Effect Plus Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

uu.module["effect+"] = {};

uu.mix(uu.module.effect.prototype, {
  // uu.module.effect.sunset, uu.effect.sunset
  sunset:   function(elm, param /* = { speed, fn, keep: false, revert: false, scanLine: false, roundRect: true } */) {
              var pp = this._prepare(elm, uu.mix.param(param || {}, { scanLine: false, roundRect: true })),
                  run = 0, R = this._revert;
              uu.css.show(elm);

              if (!("uuEffectWaveResource" in elm)) { this.createWaveResource(elm, pp.scanLine); }

              function next() { (++run === 2) && (R(elm, pp.revert), pp.fn(elm)); }
              this._wave(elm, 0, pp.speed, next, pp.roundRect);
              this._fade(elm.uuEffectWaveResource.c2d.ctx.canvas, 0, pp.speed * 3, next, 1, 0);
            },
  // uu.module.effect.wave, uu.effect.wave
  wave:     function(elm, param /* = { speed, fn, keep: false, revert: false, scanLine: false, roundRect: false } */) {
              var pp = this._prepare(elm, uu.mix.param(param || {}, { scanLine: false, roundRect: false }));

              if (!("uuEffectWaveResource" in elm)) { this.createWaveResource(elm, pp.scanLine); }

              this._wave(elm, pp.revert, pp.speed, pp.fn, pp.roundRect);
            },
  // wave使用前にデータを用意するためのI/F
  // hzは波(山)の数(4なら4つの波形)
  // 左右への振れ幅はswingで表現する, 4 なら (-4～4)までの揺れ(sin波)が取得できる
  createWaveResource:
            function(elm, scanLine /* = false */) {
              scanLine = scanLine || false;
              if ("uuEffectWaveResource" in elm) { return; }

              // regist function
              this._hasResourceElement.push([elm, this._deleteWaveResource]);

              var me = this, rect = uu.css.rect(elm), 
                  can = uud.createElement("canvas"), c2d, pattern = [],
                  i = 0, hz = 4, swing = 4;

              uud.body.appendChild(can);
              can.width = rect.w + 8;  // 左右に+4pxのゆれ
              can.height = rect.h;
              can.style.cssText = uu.sprintf("display:none;position:absolute;left:%dpx;top:%dpx;" +
                                             "overflow:hidden;z-index:%d",
                                             rect.x - 4 + 400, rect.y, uu.css.get(elm, "zIndex"));
              c2d = new uu.module.canvas2d(can);

              // 24パターンをサンプリング
              for (i = 0.00; i < 0.24; i += 0.01) {
                pattern.push(c2d.pattern(PREDRAW(0.00 + i, 1.00 + i, hz, swing), "no-repeat"));
              }

              function PREDRAW(begin, end, hz, swing) {
                var tbl = me._createWaveTable(begin, end, rect.h, hz, swing), // サンプリング数 = 画像の高さ
                    i = 0, sz = rect.h, x, w = rect.w;

                c2d.clear();
                if (scanLine) {
                  for (i = 0; i < sz; i += 2) {
                    x = tbl[i] + 4; // -4 to 0
                    c2d.image(elm,   0, i, w, 1,   x, i, w, 1);
                  }
                } else {
                  for (i = 0; i < sz; i += 2) {
                    x = tbl[i] + 4; // -4 to 0
                    c2d.image(elm,   0, i, w, 2,   x, i, w, 2);
                  }
                }
                return c2d.ctx.canvas;
              }
              // attach resource
              elm.uuEffectWaveResource = { c2d: c2d, pattern: pattern };
            },
  _wave:    function(elm, revert, speed, fn, roundRect) {
              var rect = uu.css.show(elm, 1), me = this, delta = 1 / (speed / 10), time = 0, phase = 0,
                  c2d = elm.uuEffectWaveResource.c2d,
                  pattern = elm.uuEffectWaveResource.pattern,
                  r = 0, // 角丸の初期値
                  cs, ox = 0, oy = 0;

              function DRAW(index, r) {
                c2d.clear().setStyle({ fill: pattern[index] }).box(0, 0, rect.w + 8, rect.h, parseInt(r > 60 ? 60: r));
              }

              function FIN() {
                uu.css.hide(c2d.ctx.canvas);
                me._revert(elm, revert); fn(elm);
              }

              // margin,padding,border分のoffsetをtop,leftに加算する
              cs = uu.css.get(elm);
              ox = parseInt(cs.marginLeft) + parseInt(cs.paddingLeft) + parseInt(cs.borderLeftWidth);
              oy = parseInt(cs.marginTop)  + parseInt(cs.paddingTop)  + parseInt(cs.borderTopWidth);

              DRAW(0, 0); // 前回の描画が残らないようにリセット
              uu.css.setRect(c2d.ctx.canvas, { x: rect.x + ox + - 4, y: rect.y + oy });
              uu.css.show(c2d.ctx.canvas);

              function loop(step) {
                switch (step) {
                case 0: uu.css.hide(elm); break;
                case 1: time += delta;
                        r += delta * 70; // 70という数値はトライ&エラーから
                        return time < 1.0;
                case 2: DRAW(++phase % pattern.length, roundRect ? r : 0);
                        break;
                case 4: FIN();
                }
                return true;
              }
              this._core(30, loop);
            },

// begin = 波形の初期値(0.0～1.0まで、0.0以外なら、山の途中から始まる)
// end   = 波形の終了値(0.0～1.0まで, 1.0以外なら、山の途中で終わる)
// size  = サンプリング数(begin～endまでの区間でデータを取得する数)
// hz    = 波形(山)の数
// swing = 上下(左右)への振れ幅(4を指定すると、数値は、-4～+4の範囲に収まる)
  _createWaveTable:
            function(begin, end, size, hz, swing) {
              var rv = [], i = begin, step = (end - begin) / size;
              for (; i < end; i += step) {
                rv.push(Math.round(Math.sin(2.0 * Math.PI * hz * i) * swing));
              }
              return rv;
            },
  _deleteWaveResource:
            function(elm) {
              if ("uuEffectWaveResource" in elm) {
                delete elm.uuEffectWaveResource;
              }
            }
});

uu.ua.ie && uu.mix(uu.module.effect.prototype, {
  sunset:   function(elm, param /* = { speed, fn, keep: false, revert: false, scanLine: false, roundRect: true } */) {
              var pp = this._prepare(elm, uu.mix.param(param || {}, { scanLine: false, roundRect: true })),
                  run = 0, R = this._revert;
              uu.css.show(elm);

              function next() { (++run === 2) && (R(elm, pp.revert), pp.fn(elm)); }
              this._wave(elm, 0, pp.speed, next, pp.roundRect);
              this._fade(elm, 0, pp.speed * 2, next, 1, 0);
            },
  wave:     function(elm, param /* = { speed, fn, keep: false, revert: false, scanLine: false, roundRect: false } */) {
              var pp = this._prepare(elm, uu.mix.param(param || {}, { scanLine: false, roundRect: false }));

              this._wave(elm, pp.revert, pp.speed, pp.fn, pp.roundRect);
            },
  _wave:    function(elm, revert, speed, fn, roundRect) {
              var rect = uu.css.show(elm, 1), me = this, delta = 1 / (speed / 10), time = 0,
                  id = "DXImageTransform.Microsoft.Wave";

              uu.css.setRect(elm, { x: rect.x - 4 }); // -4px
              elm.style.filter += uu.sprintf(" progid:%s(add=0,freq=%d,lightstrength=0,phase=0,strength=%d)",
                                             id, rect.h / 30, 5);

              function FIN() {
                uu.css.setRect(elm, { x: rect.x });
                elm.filters[id].enabled = 0;
                me._revert(elm, revert); fn(elm);
              }
              function NEXT(time) {
                elm.filters[id].phase = parseFloat(time * 100);
              }
              function loop(step) {
                switch (step) {
                case 1: time += delta;
                        return time < 1.0;
                case 2: NEXT(time);
                        break;
                case 4: FIN();
                }
                return true;
              }
              this._core(20, loop);
            },
  createWaveResource:
            function() {},
  _createWaveTable:
            function() {},
  _deleteWaveResource:
            function() {}
});

})(); // end (function())()
