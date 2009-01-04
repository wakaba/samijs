/** Data Scheme Module
 *
 * RFC2397(The "data" URL Scheme) implement
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

/** Data Scheme(DataURI)
 *
 * GIF89a, GIF87aのみ対応, アニメーションGIFは最初の一枚のみ表示
 * 1ファイル当り約3kbまで(Base64換算で約4000byte)
 *
 * @class
 */
uu.module.datascheme = uu.klass.kiss();
uu.module.datascheme.prototype = {
  // Spacer GIF(1px x 1px)
  spacer:   "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw%3D%3D",
  _gifpfx:   "data:image/gif;base64,",
  construct:
            function(maxWidth /* = 32 */, maxHeight /* = 32 */,
                     useCanvas /* = 1 */, delay /* = 0 */) {
              this._maxWidth  = maxWidth  || 32;
              this._maxHeight = maxHeight || 32;
              this._useCanvas = uu.ua.ie ? 0 : (useCanvas === void 0) ? 1 : useCanvas; // IEでは強制的に0
              this._delay     = delay     || 0;
              this._bank = {};
              this._findDataURIResource();
              this._bank = {}; // purge cache
            },
  _findDataURIResource:
            function() {
              var me = this;
              uu.attr('img[@src^="' + this._gifpfx + '"]').forEach(function(img) {
                uu.delay(function() {
                  me._drawGIF(img);
                }, this._delay); // lazy draw
              });
            },
  _drawGIF: function(img) {
              var dp = new uu.module.datascheme.drawPixel(),
                  byteArray, gif, pfxLen = this._gifpfx.length, head50, raw, dim;

              if (img.src === this.spacer) {
                // 伸縮率を求める
                dim = dp.detectDimension(img, 1, 1);
                // スペーサーGIFを描画
                this._drawSpacerGIF(img, dim);
                return;
              }

              // Base64の先頭50byteをキャッシュindexに使う
              head50 = img.src.substring(pfxLen, pfxLen + 50);
              if (head50 in this._bank) {
                // 伸縮率を求める
                raw = this._bank[head50]; // fetch from cache
                dim = dp.detectDimension(img, raw.w, raw.h);
                // 描画
                this._useCanvas ? dp.drawCanvas(img, raw, dim) : dp.drawDOM(img, raw, dim);
              } else {
                byteArray = uu.module.datascheme.dataURI.decode(img.src.substring(pfxLen));
                gif = new uu.module.datascheme.gif();

                // 描画サイズの確認
                dim = gif.dim(byteArray);
                if (!dim.w || dim.w > this._maxWidth ||
                    !dim.h || dim.h > this._maxHeight) {
                  return;
                }

                // decode GIF
                raw = gif.decode(byteArray);

                // swap interlace lines
                if (raw[0].interlace) {
                  raw[0].data = this._decodeGIFInterlace(raw[0].data, raw[0].w, raw[0].h);
                }
                this._bank[head50] = raw[0]; // add cache

                // 伸縮率を求める
                dim = dp.detectDimension(img, raw[0].w, raw[0].h);
                // 描画
                this._useCanvas ? dp.drawCanvas(img, raw[0], dim) : dp.drawDOM(img, raw[0], dim);
              }
            },
  _decodeGIFInterlace:
            function(data, w, h) {
              var i = 0, sz, p1 = 0, p2 = 0, p3 = 0, p4 = 0,
                  pass1 = [], pass2 = [], pass3 = [], pass4 = [],
                  passLine = [1, 4, 3, 4, 2, 4, 3, 4];

              // cut
              for (i = 0; i < h; i += 8) { pass1.push(data.splice(0, w)); }
              for (i = 4; i < h; i += 8) { pass2.push(data.splice(0, w)); }
              for (i = 2; i < h; i += 4) { pass3.push(data.splice(0, w)); }
              for (i = 1; i < h; i += 2) { pass4.push(data.splice(0, w)); }

              // join
              for (i = 0, sz = h; i < sz; ++i) {
                switch (passLine[i % 8]) {
                case 1: Array.prototype.push.apply(data, pass1[p1++]); break;
                case 2: Array.prototype.push.apply(data, pass2[p2++]); break;
                case 3: Array.prototype.push.apply(data, pass3[p3++]); break;
                case 4: Array.prototype.push.apply(data, pass4[p4++]); break;
                }
              }
              return data;
            },
  _drawSpacerGIF:
            function(placeholder, dim) {
              var ph = placeholder, span = uud.createElement("span"),
                  ss = uu.css.get(ph);

              span.id             = ph.id;
              span.className      = ph.className;
              span.title          = ph.title;
              span.style.display  = "inline-block";
              span.style.overflow = "hidden";
              span.style.top      = ss.top;
              span.style.left     = ss.left;
              span.style.width    = dim.style.w + "px";
              span.style.height   = dim.style.h + "px";
              uu.css.unselectable(span);

              // <img src="data:image/gif..."> を <span> に差し替え
              ph.parentNode.replaceChild(span, ph);
            }
};

uu.module.datascheme.dataURI = {
  // uu.module.datascheme.dataURI.decode
  // Base64DataURI → decodeURIComponent → Base64 → ByteArray
  decode:   function(dataURIString) {
              var pos, head, b64 = 1;

              if (dataURIString.substring(0, 5) === "data:") {
                pos = dataURIString.indexOf(",");
                if (pos === -1) {
                  return [];
                }
                head = dataURIString.substring(0, pos);
                b64 = /;base64$/.test(head) ? 1 : 0;
                dataURIString = dataURIString.substring(pos + 1);
              }
              if (b64) {
                return uu.module.datascheme.base64.decode(window.decodeURIComponent(dataURIString));
              }
              // decodeURIは%00をエラーとみなすため%xxのデコードには使えない
//            return uuw.decodeURI(dataURIString);
              return uu.module.datascheme.hex.decode(dataURIString);
            }
};

uu.module.datascheme.hex = { // "%00" -> 0x00
  decode:   function(HexString) {
              var rv = [], hex = HexString, c = 0, i = 0, sz = hex.length,
                  mark = "%".charCodeAt(0);

              if (!hex.length) {
                return [];
              }
              if (hex.length >= 3) {
                if (hex.charAt(hex.length - 1) === "%" || // tail "...%"
                    hex.charAt(hex.length - 2) === "%") { // tail "..%x"
                  return []; // BAD-DATA
                }
              }
              while (i < sz) {
                c = hex.charCodeAt(i++);
                if (c === mark) {
                  rv.push(parseInt(hex.charAt(i) + hex.charAt(i + 1), 16));
                  i += 2;
                } else {
                  rv.push(c);
                }
              }
              return rv;
            }
};

// uu.module.codec.base64 copy
uu.module.datascheme.base64 = {
  _b64str:  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  _b64hash: { "=": 0 },
  _makeHash:
            function() {
              var me = uu.module.datascheme.base64, i = 0, sz = me._b64str.length;

              for (; i < sz; ++i) {
                me._b64hash[me._b64str.charAt(i)] = i;
              }
            },
  decode:   function(b64 /* Base64String or URLSafe64 */) {
              if (typeof b64 !== "string" || !b64.length) {
                return []; // empty
              }

              // URLSafe64("-_" -> "+/")
              b64 = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
              if (/[^A-Za-z0-9\+\/]/.test(b64)) {
                return []; // bad data
              }

              var rv = [], me = uu.module.datascheme.base64, pad = 0, hash = me._b64hash,
                  c = 0, i = 0, sz;

              if (!("A" in me._b64hash)) {
                me._makeHash();
              }

              switch (b64.length % 4) {
                case 2: b64 += '='; ++pad;
                case 3: b64 += '='; ++pad;
              }
              sz = b64.length;
              while (i < sz) {                    // 00000000|00000000|00000000
                c = (hash[b64.charAt(i++)] << 18) // 111111  |        |
                  | (hash[b64.charAt(i++)] << 12) //       11|1111    |
                  | (hash[b64.charAt(i++)] <<  6) //         |    1111|11
                  |  hash[b64.charAt(i++)]        //         |        |  111111
                rv.push((c >>> 16) & 0xff, (c >>> 8) & 0xff, c & 0xff);
              }
              rv.length -= [0,1,2][pad]; // cut tail
              return rv; // ByteArray
            }
};

uu.module.datascheme.lzw = {
  decode:   function(ary, w, h, lzwMinimumCodeSize) { // lzwMinimumCodeSize = 6
              lzwMinimumCodeSize = (lzwMinimumCodeSize === void 0) ? 6 : lzwMinimumCodeSize;
              var rv = [], imageReadPos = 0, // ary read position
                  dict = [],
                  clearCode = Math.pow(2, lzwMinimumCodeSize),
                  endCode = clearCode + 1,
                  dictPos = endCode + 1,
                  lastLen = 0,
                  lastPos = 0,
                  codeSize = lzwMinimumCodeSize + 1,
                  restCode = codeSize,
                  used = 0, // 使用済みの領域
                  code = 0,
                  i = 0,
                  k = 0,
                  j = 0,
                  pow2 = Math.pow(2, codeSize);

              function next() {
                var shiftWidth = 8 - restCode, old;
                // coordinate width - 幅を調整
                if (shiftWidth < 0) {
                  shiftWidth = 0;
                }

                code += ((ary[imageReadPos] >> used) & (0xff >> shiftWidth)) << (codeSize - restCode);
                old = used + restCode;
                restCode -= (8 - used);
                if (restCode < 0) { restCode = 0; }
                used = old;
                if (used > 8) {
                  used = 0;
                  ++imageReadPos;
                }
                return restCode;
              }

              for (j = 0; j < 4096; ++j) {
                if (!next()) {
                  if (code === endCode) { // finish
                    break; // finish
                  } else if (code === clearCode) { // init dict
                    codeSize = lzwMinimumCodeSize + 1;
                    pow2 = Math.pow(2, codeSize); // recalc
                    dictPos  = endCode + 1;
                  } else if (code < clearCode) {
                    if (i) {
                      dict[dictPos++] = [lastPos, lastLen + 1];
                    }
                    rv[i] = code;
                    lastPos = i;
                    lastLen = 1;
                    ++i;
                  } else if (code > endCode) {
                    dict[dictPos++] = [lastPos, lastLen + 1];
                    for (k = 0; k < dict[code][1]; ++k) {
                      rv[i + k] = rv[dict[code][0] + k];
                    }
                    lastPos = i;
                    lastLen = dict[code][1];
                    i += dict[code][1];
                  }
                  if (dictPos === pow2) {
                    ++codeSize;
                    pow2 = Math.pow(2, codeSize); // recalc
                  }
                  code = 0;
                  restCode = codeSize;
                }
              }
              return rv; // ByteArray
            }
};

uu.module.datascheme.gif = uu.klass.kiss();
uu.module.datascheme.gif.prototype = {
  // uu.module.datascheme.dim
  // 画像の幅と高さを取得する, このメソッドはsetやdecode実行前に使用可能
  dim:      function(byteArray) {
              return { w: (byteArray[7] << 8) | byteArray[6],
                       h: (byteArray[9] << 8) | byteArray[8] };
            },
  decode:   function(byteArray) {
              this._byteArray = byteArray;
              this._format = "";
              this._decodePos = 0; // 解析中の現在位置
              this._head = this._defaultGIFHeader();
              this._imageBlock = []; // 解析済みのImageBlock(複数の画像がありうるが、現在は1つの画像のみサポート)
              // 直近のGraphicControlExtensionBlockの値
              this._lastTransparentColorFlag  = 0;
              this._lastTransparentColorIndex = 0;

              var rv = [], me = this,
                  b = this._byteArray, /* p, */ i = 0, j = 0, sz, sz2 = 0, v, vv,
                  rgba, tbl, indexArray, transColorIndex, F = uu.color.hash;

              switch (String.fromCharCode(b[0], b[1], b[2], b[3], b[4], b[5])) {
              case "GIF87a": this._format = "GIF87a"; break;
              case "GIF89a": this._format = "GIF89a"; break;
              default: return []; // サポート外
              }

              // GIF Headerをデコード, 各種フラグ, グローバルカラーテーブルを読み込む
              this._decodePos += this._format.length; // "GIF89a".length
              this._decodeHeader();

              // ブロックを順次読み込む
              sz = this._byteArray.length;
              while (this._decodePos < sz) {
                switch (b[this._decodePos]) {
                case 0x2c: this._decodeImageBlock(); break;
                case 0x21:
                  switch (b[this._decodePos + 1]) {
                  case 0xf9: this._decodeGraphicBlock(); break;
                  case 0xfe: this._decodeCommentBlock(); break;
                  case 0x01: this._decodeTextBlock(); break;
                  case 0xff: this._decodeApplicationBlock(); break;
                  default: return []; // 未知のブロック
                  }
                  break;
                // Trailer(End Of GIF)
                case 0x3b: this._decodePos = sz; break; // loop out
                default: return []; // 未知のブロック
                }
              }

              // head image only(drop animation data)
              if (this._imageBlock.length) {
                this._imageBlock.length = 1;
              }

              // LZWをデコード + 透過色処理 + 描画すべきピクセル数の最適化 を施したRGBAHashを返す
              i = 0, sz = this._imageBlock.length;
              for (; i < sz; ++i) {
                v = this._imageBlock[i];
                rgba = [];
                tbl = me._head.globalColorTableFlag
                    ? me._head.globalColorTable : v.localColorTable;
                indexArray = uu.module.datascheme.lzw.decode(
                    v.imageData[0], v.imageWidth, v.imageHeight,
                    v.LZWMinimumCodeSize);

                // 透過色(背景色)を取得する
                if (v.transparentColorFlag) {
                  transColorIndex = v.transparentColorIndex; // 透過色のindex
                } else {
                  transColorIndex = me._mustColor(indexArray, tbl); // 最も多用されている色のindex
                }

                // Decrease Pixcel trick
                // 透過指定あり
                //    → ドットを減らすために何ができるか
                //        → 透過色が使用されているドットは、αを0に設定する。
                //           描画時に、αが0なら描画しないようにする
                //           これでドット数を減らせる
                // 透過指定なし
                //    → ドットを減らすために何ができるか
                //        → 最も多用されている色のαを0に設定する。
                //           描画時に、多用されている色を背景色として先にべた塗りしてしまう。
                //           αが0のドットは描画しない。
                //           これでドット数を減らせる
                j = 0, sz2 = indexArray.length;
                for (; j < sz2; ++j) {
                  vv = indexArray[j];
                  rgba.push(F(tbl[vv][0], tbl[vv][1], tbl[vv][2], vv === transColorIndex ? 0 : 1));
                };
                indexArray = undefined;
                rv.push({ w: v.imageWidth, h: v.imageHeight, data: rgba,
                          transparent: v.transparentColorFlag,
                          interlace: v.interlaceFlag,
                          backgroundColor: F(tbl[transColorIndex][0],
                                             tbl[transColorIndex][1],
                                             tbl[transColorIndex][2], 1) });
              }
              return rv; // [ { w, h, pixels, RGBAHash }, ... ]
            },
  // 最も多用されている色を抽出する
  _mustColor:
            function(indexArray, colorTable) {
              var rv = 0, tbl = Array(colorTable.length), i, sz, idx = 0;

              for (i = 0, sz = colorTable.length; i < sz; ++i) {
                tbl[i] = 0; // init zero
              }
              for (i = 0, sz = indexArray.length; i < sz; ++i) {
                idx = indexArray[i];
                ++tbl[idx];
                if (tbl[idx] > rv) {
                  rv = idx;
                }
              }
              return rv; // color index
            },
  _decodeHeader:
            function() {
              var head = this._head,
                  b = this._byteArray,
                  p = this._decodePos,
                  i = 0, sz = 0;

              head.logicalScreenWidth   = (b[p + 1] << 8) | b[p]; p += 2;
              head.logicalScreenHeight  = (b[p + 1] << 8) | b[p]; p += 2;
              head.globalColorTableFlag = !!(b[p] & 0x80);
              head.colorResolution      = (b[p] >>> 4) & 0x07;
              head.sortFlag             = !!(b[p] & 0x08);
              head.globalColorTableSize = 1 << ((b[p++] & 0x07) + 1);
              head.backgroundColorIndex = b[p++];
              head.pixelAspectRatio     = !b[p] ? 0 : (b[p] + 15) / 64; ++p;
              if (head.globalColorTableFlag) { // グローバルカラーテーブルの読み込み
                sz = head.globalColorTableSize;
                for (i = 0; i < sz; p += 3, ++i) {
                  head.globalColorTable.push([b[p], b[p + 1], b[p + 2]]);
                }
              }
              this._decodePos = p; // 解析位置を更新
            },
  _decodeImageBlock:
            function() {
              var rv = this._defaultImageBlock(),
                  b = this._byteArray,
                  p = this._decodePos,
                  i = 0, sz = 0, subBlockSize = 0, imageData = [];

              rv.transparentColorFlag  = this._lastTransparentColorFlag;
              rv.transparentColorIndex = this._lastTransparentColorIndex;
              // 直近の拡張画像制御ブロックで指定された透過フラグと透過色indexを消費
              this._lastTransparentColorFlag  = 0;
              this._lastTransparentColorIndex = 0;

              ++p;
              rv.imageLeftPosition   = (b[p + 1] << 8) | b[p]; p += 2;
              rv.imageTopPosition    = (b[p + 1] << 8) | b[p]; p += 2;
              rv.imageWidth          = (b[p + 1] << 8) | b[p]; p += 2;
              rv.imageHeight         = (b[p + 1] << 8) | b[p]; p += 2;
              rv.localColorTableFlag = !!(b[p] & 0x80);
              rv.interlaceFlag       = !!(b[p] & 0x40);
              rv.sortFlag            = !!(b[p] & 0x20);
              rv.localColorTableSize = 1 << ((b[p++] & 0x07) + 1);
              if (rv.localColorTableFlag) {
                sz = rv.localColorTableSize;
                for (i = 0; i < sz; p += 3, ++i) {
                  rv.localColorTable.push([b[p], b[p + 1], b[p + 2]]);
                }
              }
              rv.LZWMinimumCodeSize = b[p++];

              while ( (subBlockSize = b[p++]) ) { // (strict)
                while (subBlockSize--) { imageData.push(b[p++]); }
              }
              rv.imageData.push(imageData);

              this._decodePos = p;
              this._imageBlock.push(rv);
            },
  // 直後のImageBlockの動作に影響を与える情報を含んだ拡張画像制御ブロック
  _decodeGraphicBlock:
            function() {
              var b = this._byteArray, p = this._decodePos;

              this._lastTransparentColorFlag  = !!(b[p + 3] & 0x1);
              this._lastTransparentColorIndex = b[p + 6];
              this._decodePos += 8; // 解析位置を更新
            },
  _decodeCommentBlock:
            function() {
              var b = this._byteArray, p = this._decodePos,
                  subBlockSize = 0;

              p += 2; // 0x21, 0xfe
              while ( (subBlockSize = b[p++]) ) {
                p += subBlockSize; // skip
              }
              this._decodePos = p; // 解析位置を更新
            },
  _decodeTextBlock:
            function() {
              this._decodeCommentBlock();
            },
  _decodeApplicationBlock:
            function() {
              this._decodeCommentBlock();
            },
  // GIF Headerの雛形を返す
  _defaultGIFHeader:
            function() {
              return uu.mix({}, {
                logicalScreenWidth:     0,  // 2byte
                logicalScreenHeight:    0,  // 2byte
                globalColorTableFlag:   0,  // 1bit, true: globalColorTable exist
                colorResolution:        0,  // 3bit,
                sortFlag:               0,  // 1bit, true: sorted globalColorTable
                globalColorTableSize:   0,  // 3bit, 
                backgroundColorIndex:   0,  // 1byte,
                pixelAspectRatio:       0,  // 1byte,
                globalColorTable:       []  // 3byte(r,g,b) x globalColorTableSize
              });
            },
  // ImageBlockの雛形を返す
  _defaultImageBlock:
            function() {
              return uu.mix({}, {
                transparentColorFlag:   0,
                transparentColorIndex:  0,
                imageLeftPosition:      0,  // 2byte
                imageTopPosition:       0,  // 2byte
                imageWidth:             0,  // 2byte
                imageHeight:            0,  // 2byte
                localColorTableFlag:    0,  // 1bit
                interlaceFlag:          0,  // 1bit
                sortFlag:               0,  // 1bit
                localColorTableSize:    0,  // 3bit
                localColorTable:        [], // 3byte(r,g,b) x localColorTableSize
                LZWMinimumCodeSize:     0,  // 1byte
                imageData:              []  // LZW packed data
              });
            }
};

uu.module.datascheme.drawPixel = uu.klass.kiss();
uu.module.datascheme.drawPixel.prototype = {
  // ieboostでは未使用
  drawCanvas:
            function(placeholder,
                     image /* { w, h, data:RGBAHashArray, backgroundColor, transparent } */,
                     dim /* { style: { w, h }, scale: { w, h } } */) {
              var ph = placeholder,
                  c2d,
                  span = uud.body.appendChild(uud.createElement("span")), // コンテナとしてのspan
                  can  = span.appendChild(uud.createElement("canvas")),
                  ss = uu.css.get(ph);
              if (uu.ua.ie) {
                can = G_vmlCanvasManager.initElement(can); // excanvas初期化
              }
              can.width  = dim.style.w;
              can.height = dim.style.h;

              span.id             = ph.id;
              span.className      = ph.className;
              span.title          = ph.title;
              span.style.display  = "inline-block";
              span.style.overflow = "hidden";
              span.style.top      = ss.top;
              span.style.left     = ss.left;
              span.style.width    = dim.style.w + "px";
              span.style.height   = dim.style.h + "px";
              uu.css.unselectable(span);

              // <img src="data:image/gif..."> を <canvas> に差し替え
              uu.node.replace(span, ph);

              c2d = new uu.module.canvas2d(can);
              c2d.scale(dim.scale.w, dim.scale.h); // 伸縮率を指定
              if (!image.transparent) {
                c2d.setStyle({ fill: image.backgroundColor }); // 背景色でべた塗り
                c2d.box(0, 0, image.w, image.h);
              }
              c2d.dotBlt(0, 0, image.w, image.h, image.data);
            },
  // draw DOM(span + div)
  drawDOM:  function(placeholder,
                     image /* { w, h, data:RGBAHashArray, backgroundColor, transparent } */,
                     dim /* { style: { w, h }, scale: { w, h } } */) {
              var ph = placeholder,
                  span = uud.body.appendChild(uud.createElement("span")), // コンテナとしてのspan
                  ss = uu.css.get(ph),
                  bg;

              span.width  = dim.style.w;
              span.height = dim.style.h;

              span.id             = ph.id;
              span.className      = ph.className;
              span.title          = ph.title;
              span.style.display  = "inline-block";
              span.style.overflow = "hidden";
              span.style.position = (ss.position === "absolute") ? "absolute" : "relative";
              span.style.top      = ss.top;
              span.style.left     = ss.left;
              span.style.width    = dim.style.w + "px";
              span.style.height   = dim.style.h + "px";
              uu.css.unselectable(span);

              if (!image.transparent) {
                // 背景色描画用にdivを一枚追加する
                bg = span.appendChild(uud.createElement("div"));
                bg.style.position = "absolute";
                bg.style.top = "0px";
                bg.style.left = "0px";
                bg.style.width = (image.w * dim.scale.w) + "px",
                bg.style.height = (image.h * dim.scale.h) + "px",
                bg.style.backgroundColor = uu.color.coffee(image.backgroundColor);
                uu.css.unselectable(bg);
              }
              // <img src="data:image/gif..."> を <span> に差し替え
              ph.parentNode.replaceChild(span, ph);

              if (dim.scale.w === 1 && dim.scale.h === 1) {
                this._dotBlt(span, 0, 0, image.w, image.h, image.data);
              } else {
                this._dotBltWithScale(span, 0, 0, image.w, image.h,
                                      image.data, dim.scale.w, dim.scale.h);
              }
            },
  _dotBlt:  function(parent, x, y, w, h, ary /* RGBAHashArray */) {
              var i = 0, j = 0, dotCount = 0;

              function dot(x, y, rgba) {
                var e = parent.appendChild(uud.createElement("div"));
                e.style.borderTopWidth  = "1px";
                e.style.borderTopStyle  = "solid";
                e.style.borderTopColor  = uu.color.coffee(rgba);
                e.style.position        = "absolute";
                e.style.width           = "1px";
                e.style.height          = "1px";
                e.style.left            = x + "px";
                e.style.top             = y + "px";
              }
              try {
                for (; j < h; ++j) {
                  for (i = 0; i < w; ++i) {
                    if (ary[i + j * w].a) {
                      dot(x + i, y + j, ary[i + j * w]);
                      ++dotCount;
                    }
                  }
                }
              } catch(e) { ; }
            },
  _dotBltWithScale:
            function(parent, x, y, w, h, ary /* RGBAHashArray */, scaleWidth, scaleHeight) {
              var i = 0, j = 0, sw = scaleWidth, sh = scaleHeight, dotCount = 0;

              function dot(x, y, rgba) {
                var e = parent.appendChild(uud.createElement("div"));
                e.style.borderTopWidth  = Math.max(Math.ceil(sw), Math.ceil(sh)) + "px";
                e.style.borderTopStyle  = "solid";
                e.style.borderTopColor  = uu.color.coffee(rgba);
                e.style.position        = "absolute";
                e.style.width           = Math.ceil(sw) + "px";
                e.style.height          = Math.ceil(sh) + "px";
                e.style.left            = x + "px";
                e.style.top             = y + "px";
              }
              try {
                for (; j < h; ++j) {
                  for (i = 0; i < w; ++i) {
                    if (ary[i + j * w].a) {
                      dot(x + i * sw, y + j * sh, ary[i + j * w]);
                      ++dotCount;
                    }
                  }
                }
              } catch(e) { ; }
            },
  // HTML文字列およびcurentStyleからwidthとheightを求める
  // IEが勝手にバッテンアイコンのサイズ(28x30)に上書してしまうため正攻法では、
  // <img width="..." height="..."> の値が取得できない
  // ゴリゴリやって取得する

  // 資料:
  //      CASE1. img要素に明示的に幅と高さを与えない場合
  //              → 最初にHTMLを走査する → 見つからない
  //              → currentStyleを調べる → "auto"
  //              → GIF画像本来のサイズを使用する
  //                  → 伸縮はしない
  //
  //      <img src="data:gif...">
  //        img.width = 28
  //        img.height = 30
  //        img.currentStyle.width = "auto"
  //        img.currentStyle.height = "auto"

  //      CASE2. HTMLレベルでimg要素に明示的に幅と高さを与えた場合
  //              → 最初にHTMLを走査する → 見つかった
  //                  → HTMLのwidthとheight, GIF本来の画像サイズを計算し画像を伸縮させる
  //
  //      <img src="data:gif..." width="100" height="100">
  //        img.width = 100
  //        img.height = 100
  //        img.currentStyle.width = "auto"
  //        img.currentStyle.height = "auto"

  //      CASE3. style属性でimg要素に明示的に幅と高さを与えた場合
  //              → 最初にHTMLを走査する → 見つからない
  //              → currentStyleを調べる → "100px"
  //                → currentStyleのwidthとheight, GIF本来の画像サイズを計算し画像を伸縮させる
  //
  //      <img src="data:gif..." style="width:100px; height:100px">
  //        img.width = 100
  //        img.height = 100
  //        img.currentStyle.width = "100px"
  //        img.currentStyle.height = "100px"
  detectDimension:
            function(placeholder, gw, gh) { // gw = GIF width, gh = GIF height
              var ph = placeholder,
                  sw = 0, sh = 0, // style width, height
                  cw = 1, ch = 1; // scale width, height 初期倍率は1

              // ユーザが幅と高さを属性で直接指定している場合は属性値を取得する
              if (uu.ua.ie) {
                sw = parseInt(this._getWidth(ph));
                sh = parseInt(this._getHeight(ph));
              } else {
                sw = ph.width  || uu.css.get(ph, "width");
                sh = ph.height || uu.css.get(ph, "height");
              }

              // GIF画像の本来のサイズから、表示に必要な伸縮率を決める
              // width または heightの片方だけが指定された場合は、
              // 指定されていないほうの倍率は引きづられて設定される(IE以外のブラウザがそうなっている)。
              if (sw === 0 && sh === 0) {
                sw = gw; // gif本来のサイズ
                sh = gh; // gif本来のサイズ
              } else if (sw === 0 && sh !== 0) {
                ch = parseInt((sh / gh) * 10) / 10; // 0.xまで求める(端数がでるとdotがずれるので予防する)
                cw = ch; // chにあわせる
                sw = parseInt(gw * cw); // gif本来のサイズ x 倍率
              } else if (sw !== 0 && sh === 0) {
                cw = parseInt((sw / gw) * 10) / 10; // 0.xまで求める(端数がでるとdotがずれるので予防する)
                ch = cw; // cwにあわせる
                sh = parseInt(gh * ch); // gif本来のサイズ x 倍率
              } else { // sw !== 0 && sh !== 0
                cw = parseInt((sw / gw) * 10) / 10;
                ch = parseInt((sh / gh) * 10) / 10;
              }
              return { style: { w: sw, h: sh },
                       scale: { w: cw, h: ch } };
            },
  _getWidth:
            function(placeholder) {
              var ph = placeholder,
                  html = ph.outerHTML,
                  m = html.match(/ width=([\d]+)/);

              if (m) {
                return m[1]; // 要素の属性で指定されたwidthを返す <img width="this">
              }
              if (ph.currentStyle.width !== "auto") {
                return parseInt(ph.currentStyle.width); // styleで指定された単位がpx以外ならどうする? → 何がしたいのはわからないので何もしない
              }
              return 0;
            },
  _getHeight:
            function(placeholder) {
              var ph = placeholder,
                  html = ph.outerHTML,
                  m = html.match(/ height=([\d]+)/);

              if (m) {
                return m[1]; // 要素の属性で指定されたheightを返す <img height="this">
              }
              if (ph.currentStyle.height !== "auto") {
                return parseInt(ph.currentStyle.height); // styleで指定された単位がpx以外ならどうする?  → 何がしたいのはわからないので何もしない
              }
              return 0;
            }
};

})(); // end (function())()
