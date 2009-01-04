/** Widget Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu, UU = uuw.UU;

uu.module.widget = function() {};
uu.module.window = function() {};

/*
  <input type="button" class="jswbutton" wbutton="" />
 */


uu.module.widget.button = uu.klass.singleton();
uu.module.widget.button.prototype = {
  construct:
            function() {
            }
};

/** Window Manager
 *
 * @class
 */
uu.module.window.manager = uu.klass.singleton();
uu.module.window.manager.prototype = {
  construct:
            function() {
              this._wuid = { /* wuid: fdc */ };
              this._park = [];
              this._defaultParam = {
                context:      uud.body,
                icon:         "",
                title:        "window",
                titleHeight:  32,
                rect:         { x: 100, y: 100, w: 300, h: 200 },
                resizable:    true,
                resizeLimit:  { minw: 100, maxw: -1, minh: 100, maxh: -1 },
                bodyBevel:    12,
                bodyPadding:  { top: 0, right: 0, bottom: 0, left: 0 },
                skin:         "plasticity",
                bodyCanvas:   true,
                minimizeAnimation: true,
                fn:           uu.mute // callback
              };
              this._defaultSkinParam = {};
            },
  setDefaultParam:
            function(param) {
              uu.mix(this._defaultParam, param);
            },
  setDefaultSkinParam:
            function(skinParam) {
              uu.mix(this._defaultSkinParam, skinParam);
            },
  createWindow:
            function(param, skinParam) {
              var wuid = uu.uid("window"), fdc = new uu.module.fdc();

              fdc.wuid = wuid;
              fdc.manager = this;
              this._wuid[wuid] = fdc;

              param = uu.mix.param(param || {}, this._defaultParam);
              skinParam = uu.mix.param(skinParam || {}, this._defaultSkinParam);
              fdc.initializer = new uu.module.window.initializer(fdc, param, skinParam);
              uu.msg.post(fdc.initializer, "MI_INIT");

              return wuid;
            },
  createDialog:
            function(param, skinParam) {
              var wuid = uu.uid("dialog"), fdc = new uu.module.fdc();

              fdc.wuid = wuid;
              fdc.manager = this;
              this._wuid[wuid] = fdc;

              param = uu.mix.param(param || {}, this._defaultParam, { resizable: false });
              skinParam = uu.mix.param(skinParam || {}, this._defaultSkinParam);
              fdc.initializer = new uu.module.window.initializer(fdc, param, skinParam);
              uu.msg.post(fdc.initializer, "MI_INIT");

              return wuid;
            },
  createModalDialog:
            function() {
              // not impl
            },
  isExist:  function(wuid) {
              return wuid in this._wuid;
            },
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "*M_CLOSE":        this._close(p1); break;      // post(p1 = uid)
              case "LM_PARKING":      return this._parking(p1);    // send(p1 = uid)
              case "MM_PARKING_OUT":
              case "LM_PARKING_OUT":  this._parkingOut(p1); break; // send(p1 = uid)
              }
              return 0;
            },
  _close:   function(wuid) {
              if (wuid in this._wuid) {
                uu.msg.post(this._wuid[wuid].initializer, "MI_CLOSE");
                this.msgbox("MM_PARKING_OUT", wuid);
//                this._wuid[wuid] = null;
                delete this._wuid[wuid];
                uu.vtmHighSpeed.diet();
              }
            },
  _parking: function(wuid) {
              var rv = 0, pos = this._park.indexOf(0);
              if (pos === -1) { // 満室
                rv =  this._park.push(wuid) - 1;
              } else {
                this._park[pos] = wuid;
                rv = pos;
              }
              return rv;
            },
  _parkingOut:
            function(wuid) {
              var me = this;
              uu.mix([], this._park).forEach(function(v, i) {
                (v === wuid) && (me._park[i] = 0);
              });
            }
};

/** Window Initializer
 *
 * @class
 */
uu.module.window.initializer = uu.klass.generic();
uu.module.window.initializer.prototype = {
  construct:
            function(fdc, param, skinParam) {
              this._fdc = fdc;
              this._run = 0;
              fdc.node        = 0;
              fdc.shim        = 0;
              fdc.skin        = 0;
              fdc.param       = param;
              fdc.skinParam   = skinParam;
              fdc.viewState   = { size: 0, rect: { x: 0, y: 0, w: 0, h: 0 }};
              // node
              fdc.bone        = 0;
              fdc.boneCanvas  = 0;
              fdc.body        = 0;
              fdc.title       = 0;
              fdc.resize      = 0;
              fdc.bodyCanvas  = 0;
              // 2D context
              fdc.bodyCanvas2d = 0;
            },
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "MI_INIT":
                // インスタンスの生成はここで行う
                this._fdc.node   = new uu.module.window.node(this._fdc);
                this._fdc.layout = new uu.module.window.layout(this._fdc);
                this._fdc.skin   = new uu.module.skin[this._fdc.param.skin].window(this._fdc);

                // 初期化や必要なリソースの確保はできるだけこれ以降で行う
                this._build();
                this._defaultStyle();
                // shimの初期化には、ドキュメントツリーにアサイン済みの要素が必要
                this._fdc.shim  = (uu.ua.ie6) ? new uu.module.ieboost.shim(this._fdc.bone, 1) : 0;

                uu.msg.post(this._fdc.node,   "IN_INIT");
                uu.msg.post(this._fdc.layout, "IL_INIT");
                uu.msg.post(this._fdc.skin,   "IS_INIT");
                break;
              case "*I_INIT_OK":
                ++this._run;
                if (this._run >= 3) {
                  uu.msg.post(this._fdc.layout, "*L_RESIZE", this._fdc.param.rect); // 初回はサイズを明示
                  uu.msg.post(this._fdc.layout, "IL_SHOW");
                  uu.msg.post(this._fdc.node,   "IN_INIT_OK");
                }
                break;
              case "*I_INIT_NG":
                uu.msg.post(this._fdc.node, "IN_INIT_NG");
                break;
              case "MI_CLOSE":
                uu.msg.send(this._fdc.layout, "IL_HIDE"); // 廃棄に先立ち構成要素を隠す
                this._fdc.layout.destruct();
                this._fdc.skin.destruct();
                this._destroy();
                break;
              }
            },
  _build:   function() {
              this._fdc.bone        = uud.createElement("div");
              this._fdc.boneCanvas  = uud.createElement("canvas");
              this._fdc.body        = uud.createElement("div");
              this._fdc.title       = uud.createElement("div");
              this._fdc.resize      = this._fdc.param.resizable  ? uud.createElement("div")    : 0;
              this._fdc.bodyCanvas  = this._fdc.param.bodyCanvas ? uud.createElement("canvas") : 0;
              this._fdc.param.context.appendChild(this._fdc.bone);
              this._fdc.bone.appendChild(this._fdc.boneCanvas);
              if (uu.ua.ie) {
                this._fdc.boneCanvas = G_vmlCanvasManager.initElement(this._fdc.boneCanvas);
              }

              // bodyの下にcanvas layerを挿入する
              if (this._fdc.bodyCanvas) {
                this._fdc.bone.appendChild(this._fdc.bodyCanvas);
                if (uu.ua.ie) {
                  this._fdc.bodyCanvas = G_vmlCanvasManager.initElement(this._fdc.bodyCanvas);
                }
                this._fdc.bodyCanvas2d = new uu.module.canvas2d(this._fdc.bodyCanvas);
              }

              this._fdc.bone.appendChild(this._fdc.body);
              this._fdc.bone.appendChild(this._fdc.title);
              this._fdc.resize && this._fdc.bone.appendChild(this._fdc.resize);
              this._fdc.title.innerText = this._fdc.param.title;

            },
  _destroy: function() {
              uu.node.remove(this._fdc.bone);
            },
  _defaultStyle:
            function() {
              uu.css.set(this._fdc.bone,       { position: "absolute", display: "none" });
              uu.css.set(this._fdc.boneCanvas, { position: "absolute" });
              uu.css.set(this._fdc.body,       { position: "absolute", overflow: "auto" });
              uu.css.set(this._fdc.title,      { position: "absolute", cursor: "move", fontWeight: "bold",
                                                 overflow: "hidden" });
              this._fdc.resize &&
                  uu.css.set(this._fdc.resize, { position: "absolute", cursor: "nw-resize",
                                                 bottom: "0", right: "0", width: "16px", height: "16px" });
              this._fdc.bodyCanvas &&
                  uu.css.set(this._fdc.bodyCanvas, { position: "absolute", overflow: "hidden" });

              // タイトルを選択禁止に
              uu.css.unselectable(this._fdc.title);
            }
};

/** Window Node(content holder)
 *
 * @class
 */
uu.module.window.node = uu.klass.generic();
uu.module.window.node.prototype = {
  construct:
            function(fdc) {
              this._fdc = fdc;
            },
  destruct: function() {},
  msgbox:   function(msg, p1, p2) {
              switch (msg) {
              case "IN_INIT":
                uu.msg.post(this._fdc.initializer, "*I_INIT_OK");
                break;

              case "IN_INIT_OK":
// uu.log("init complete");
                this._fdc.param.fn(200, this.exportData()); // export node-list and rects
                break;

              case "IN_INIT_NG":
// uu.log("uu.module.window.node - init fail");
                this._fdc.param.fn(400, null);
                break;
              }
            },
  exportData:
            function() {
              return {
                wuid:         this._fdc.wuid, // window unique-id
                titleNode:    this._fdc.title,
                bodyNode:     this._fdc.body,
                bodyCanvas:   this._fdc.bodyCanvas,
                bodyCanvas2d: this._fdc.bodyCanvas2d,
                boneRect:     uu.css.rect(this._fdc.bone),
                bodyRect:     uu.css.rect(this._fdc.body)
              };
            }
};

/** Window Layout(visual)
 *
 * @class
 */
uu.module.window.layout = uu.klass.generic();
uu.module.window.layout.prototype = {
  construct:
            function(fdc) {
              this._fdc = fdc;
//              this._hr = uu.event.handler(this);
              this._wired = 0;    // 0: normal, 1: wired
              this._dragging = 0; // 1: title-drag, 2: resize-drag
              this._zindexer = new uu.module.drag.zindexer();
            },
  destruct: function() {
              try {
                this._zindexer.unset(this._fdc.bone);
                uu.event.unset(this, this._fdc.boneCanvas, "click");
                uu.event.unset(this, this._fdc.body,       "click");
                uu.event.unset(this, this._fdc.title,      "mousedown,dblclick");
                this._fdc.resize && uu.event.unset(this, this._fdc.resize, "mousedown");
                this._fdc.shim ? this._fdc.shim.purge() : 0;
              } catch (e) {}
            },
  handleEvent:
            function(evt) {
              uu.event.stop(evt);

              switch (uu.event.toType(evt)) {
              case "mousedown": // title bar, resize handle
                switch (uu.event.target(evt).target) {
                case this._fdc.title:
                      if (this._fdc.viewState.size === 1) { // 最大化中なら何もしない
                        break;
                      }
                      uu.event.set(this, uu.ua.ie ? this._fdc.title : uud, "mousemove,mouseup", true);
                      this._mousedownOnTitleBar(evt);
                      break;
                case this._fdc.resize:
                      uu.event.set(this, uu.ua.ie ? this._fdc.resize : uud, "mousemove,mouseup", true);
                      this._mousedownOnResizeHandle(evt);
                      break;
                }
                break;

              case "mousemove": // title bar, resize handle
                switch (this._dragging) {
                case 1: this._mousemoveOnTitleBar(evt);     break;
                case 2: this._mousemoveOnResizeHandle(evt); break;
                }
                break;

              case "mouseup": // title bar, resize handle
                switch (this._dragging) {
                case 1: uu.event.unset(this, uu.ua.ie ? this._fdc.title : uud, "mousemove,mouseup", true);
                        this._mouseupOnTitleBar(evt);
                        break;
                case 2: uu.event.unset(this, uu.ua.ie ? this._fdc.resize : uud, "mousemove,mouseup", true);
                        this._mouseupOnResizeHandle(evt);
                        break;
                }
                break;

              case "click": // body, canvas
                this._click(evt);
                break;

              case "dblclick": // title bar
                this._dblclick(evt);
                break;
              }
            },
  msgbox:   function(msg, p1, p2) {
              var rect;
              switch (msg) {
              case "IL_INIT":     this._init(); break;
              // p1 = [rect]
              case "FONT_RESIZE":
              case "*L_RESIZE":   rect = p1 || uu.css.rect(this._fdc.bone);
                                  this._resize(rect);
                                  // broadcast
                                  uu.msg.post(0, UU.MSG_RESIZE_WINDOW, this._fdc.node.exportData());
                                  break;
              // p1 = 2:toggle, 1:wire, 0:normal
              case "LL_WIRE":     if (p1 === 2) { p1 = this._wired ? 0 : 1; }
                                  this._wire(!!p1); break;
              case "IL_SHOW":     uu.css.show(this._fdc.bone); break;
              case "IL_HIDE":     uu.css.hide(this._fdc.bone); break;
//              case "LL_MAXIMIZE": this._maximize(); break;
//              case "LL_MINIMIZE": this._minimize(); break;
//              case "LL_REVERT":   this._revert(); break;
              }
            },
  _init:    function() {
              uu.element.toAbsolute(this._fdc.bone);
              this._zindexer.set(this._fdc.bone);
              uu.event.set(this, this._fdc.boneCanvas, "click");
              uu.event.set(this, this._fdc.body,       "click");
              uu.event.set(this, this._fdc.title,      "mousedown,dblclick");
              this._fdc.resize && uu.event.set(this, this._fdc.resize, "mousedown");


              uu.msg.post(uu.customEvent, "SET", "FONT_RESIZE", this.uid); // resize font ハンドラの登録

              uu.msg.post(this._fdc.initializer, "*I_INIT_OK");
            },
  _resize:  function(rect) {
              this._draw(rect); // resize
              uu.msg.send(this._fdc.skin, "LS_UPDATE", rect); // send
            },
  _wire:    function(wired) {
              if (!wired) {
                // normal
                uu.css.set(this._fdc.bone, { border: "", cursor: "" });
                uu.css.show(this._fdc.boneCanvas);
                uu.css.show(this._fdc.title);

                // 最大/最小化中ならbody,resizeはそのまま
                if (this._fdc.viewState.size === 0) {
                  uu.css.show(this._fdc.body);
                  this._fdc.resize && uu.css.show(this._fdc.resize);
                  this._fdc.bodyCanvas && uu.css.show(this._fdc.bodyCanvas);
                }

                this._fdc.shim ? this._fdc.shim.display(1) : 0;
                this._wired = 0;
              } else {
                // wired
                switch (this._dragging) {
                case 1: uu.css.set(this._fdc.bone, { border: "2px dotted gray", cursor: "move" }); break;
                case 2: uu.css.set(this._fdc.bone, { border: "2px dotted gray", cursor: "nw-resize" }); break;
                }
                uu.css.hide(this._fdc.boneCanvas);
                uu.css.hide(this._fdc.title);
                uu.css.hide(this._fdc.body);
                this._fdc.resize && uu.css.hide(this._fdc.resize);
                this._fdc.bodyCanvas && uu.css.hide(this._fdc.bodyCanvas);
                this._fdc.shim ? this._fdc.shim.display(0) : 0;
                this._wired = 1;
              }
            },
  _draw:    function(rect) {
              var th = this._fdc.param.titleHeight,
                  pad = this._fdc.param.bodyPadding,
                  bevel = this._fdc.param.bodyBevel,
                  bw, bh, pixel, center;

              uu.css.setRect(this._fdc.bone, rect); // resize bone
              uu.mix(this._fdc.boneCanvas, { width: rect.w, height: rect.h }); // resize canvas

              // --- resize body element ---
              // paddingを加味しbodyのサイズを調整する
              bw = rect.w - pad.left - pad.right - bevel * 2;
              bh = rect.h - pad.top - pad.bottom - th - bevel;

              if (bw > 0 && bh > 0) {
                uu.css.setRect(this._fdc.body,
                               { x: pad.left + bevel, y: pad.top + th, w: bw, h: bh });
              }
              // --- resize bodyCanvas element ---
              if (this._fdc.param.bodyCanvas) {
                uu.css.setRect(this._fdc.bodyCanvas,
                               { x: pad.left + bevel, y: pad.top + th, w: bw, h: bh });
              }

              // --- resize title element ---
              // title.width, title.height, title.padding-top, (擬似)title.vertical-alignの調整
              // padding-topとheightを調整することで、タイトル文字列の表示位置を vertical-align: middle 相当にする
              pixel = uu.css.measure();
              center = th / 2 - pixel.em / 2;
              uu.css.set(this._fdc.title, { paddingTop: center + "px",
                                            paddingLeft: bevel + "px",
                                            height: (th - 4 - (uu.ua.std ? center : 0)) + "px",
                                            width: (rect.w - 54 - bevel * 2) + "px" }); // 54 = (minimize + maximize + close)
              this._fdc.shim && this._fdc.shim.setRect(rect); // resize shim
            },
  // タイトルバーは、クリック1秒後にワイヤー化する(すぐにワイヤー化しない)
  _mousedownOnTitleBar:
            function(evt) {
              this._wired = 0;
              this._dragging = 1;
              uu.module.drag.save(this._fdc.bone, evt);
              this._zindexer.beginDrag(this._fdc.bone);

              // 1000ms後 + 長押し中 + 非ワイヤー状態 = ワイヤー化
              var me = this;
              uu.vtmLowSpeed.set(function() {
                if (me._dragging === 1 && !me._wired) {
                  me._wired = 1;
                  uu.msg.send(me._fdc.layout, "LL_WIRE", 1)
                }
              }, 1000, 1, "WIRED");
            },
  // リサイズハンドルは、クリック直後にワイヤー化する
  _mousedownOnResizeHandle:
            function(evt) {
              this._wired = 1;
              this._dragging = 2;
              uu.msg.send(this._fdc.layout, "LL_WIRE", 1);
              this._zindexer.beginDrag(this._fdc.bone);

              var mpos = uu.event.mousePos(evt),
                  rect = uu.css.rect(this._fdc.bone);
              this._fdc.bone.uuSaveDragOffset = { x: mpos.x - rect.w,
                                                  y: mpos.y - rect.h };
            },
  _mousemoveOnTitleBar:
            function(evt) {
              if (!this._wired) {
                this._wired = 1;
                uu.msg.send(this._fdc.layout, "LL_WIRE", 1); // ワイヤー化
              }
              var mpos = uu.module.drag.move(this._fdc.bone, evt);
              if (this._fdc.shim) {
                this._fdc.shim.setRect({ x: mpos.x - this._fdc.bone.uuSaveDragOffset.x,
                                         y: mpos.y - this._fdc.bone.uuSaveDragOffset.y });
              }
            },
  _mousemoveOnResizeHandle:
            function(evt) {
              var mpos = uu.event.mousePos(evt), limit,
                  w = mpos.x - this._fdc.bone.uuSaveDragOffset.x,
                  h = mpos.y - this._fdc.bone.uuSaveDragOffset.y;

              // IE Quirks Mode
              if (uu.ua.ie && !uu.ua.std) {
/* ▼▼
                w += 4; // border-width-left + border-width-right
                h += 4; // border-width-top + border-width-bottom
 */
              }

              // resize limit
              limit = this._fdc.param.resizeLimit;
              if (limit.minw !== -1 && w < limit.minw) { w = limit.minw; }
              if (limit.maxw !== -1 && w > limit.maxw) { w = limit.maxw; }
              if (limit.minh !== -1 && h < limit.minh) { h = limit.minh; }
              if (limit.maxh !== -1 && h > limit.maxh) { h = limit.maxh; }

              uu.css.setRect(this._fdc.bone, { w: w, h: h });
            },
  _mouseupOnTitleBar:
            function(evt) {
              var rect = uu.css.rect(this._fdc.bone), forced = 0;

              this._wired = 0;
              uu.msg.send(this._fdc.layout, "LL_WIRE", 0);

              this._dragging = 0;
              this._zindexer.endDrag(this._fdc.bone);

              // position limit(-w+100,0)
              if (rect.x < 0 && rect.x < -rect.w + 100) {
                rect.x = -rect.w + 100;
                ++forced;
              }
              if (rect.y < 0) {
                rect.y = 0;
                ++forced;
              }
              forced && uu.msg.send(this._fdc.layout, "*L_RESIZE", rect);
            },
  _mouseupOnResizeHandle:
            function(evt) {
              var rect = uu.css.rect(this._fdc.bone);

              this._wired = 0;
              uu.msg.send(this._fdc.layout, "LL_WIRE", 0);

              this._dragging = 0;
              this._zindexer.endDrag(this._fdc.bone);

              // IE Quirks Mode
              if (uu.ua.ie && !uu.ua.std) {
/* ▼▼
                rect.w += 2; // border-width-right
                rect.h += 2; // border-width-bottom
 */
              }
              uu.msg.send(this._fdc.layout, "*L_RESIZE", rect);
            },
  _click:   function(evt) { // body, canvas
              var btn = 0, tgt = uu.event.target(evt).target, dist,
                  mpos = uu.event.mousePos(evt), x = mpos.ox, y = mpos.oy;

              this._zindexer.top(this._fdc.bone); // surface

              // IE(excanvas)ではdiv要素やvml要素上でイベントが発生するため、
              // それらとboneとの距離を加算する
              if (tgt !== this._fdc.boneCanvas) {
                dist = uu.element.offsetFromAncestor(tgt, this._fdc.bone);
                x += dist.x;
                y += dist.y;
              }
              // skinに問い合わせを行う
              // btn=1: close, btn=2: maxmize, btn=3: minimize
              btn = uu.msg.send(this._fdc.skin,
                                "LS_QUERY_POSITION",
                                uu.css.rect(this._fdc.bone), { x: x, y: y });
              switch (btn) {
              case 1: // close button
                uu.msg.post(this._fdc.manager, "*M_CLOSE", this._fdc.wuid);
                break;

              case 2: // maxmize button
                switch (this._fdc.viewState.size) {
                case 0: this._maximize(); break; // normal + maxmize -> maximized
                case 1: this._revert();   break; // maximized + maxmize -> normalized
                case 2: uu.msg.post(this._fdc.manager, "LM_PARKING_OUT", this._fdc.wuid);
                        this._maximize(); break; // minimized + maxmize -> maximized
                }
                break;

              case 3: // minimize button
                switch (this._fdc.viewState.size) {
                case 0: this._minimize(); break; // normal + minimize -> minimized
                case 1: this._minimize(); break; // maximized + minimize -> minimized
                case 2: uu.msg.post(this._fdc.manager, "LM_PARKING_OUT", this._fdc.wuid);
                        this._revert();   break; // minimized + minimize -> normalized
                }
                break;
              }
            },
  _dblclick:
            function(evt) { // title bar
              switch (this._fdc.viewState.size) {
              case 0: this._maximize(); break; // normal -> maximized
              case 1: this._revert();   break; // maximized -> normalized
              case 2: uu.msg.post(this._fdc.manager, "LM_PARKING_OUT", this._fdc.wuid);
                      this._revert();   break; // minimized -> normalized
              }
            },
  _maximize:
            function() {
              if (this._fdc.viewState.size === 1) { return; } // 1: maximized
              this._fdc.viewState.size = 1;

              if (!this._fdc.viewState.rect.w && !this._fdc.viewState.rect.h) {
                this._fdc.viewState.rect = uu.css.rect(this._fdc.bone);
              }

              // 2. 最前面に移動
              this._zindexer.top(this._fdc.bone); // surface
              // 3. タイトルバーをドラッグ禁止にしカーソルをデフォルト(移動禁止)に
              uu.event.unset(this, this._fdc.title, "mousedown");
              uu.css.set(this._fdc.title, { cursor: "" });
              // 4. リサイズハンドルを隠す
              this._fdc.resize && uu.css.hide(this._fdc.resize);
              // 5. ブラウザの表示領域一杯にウインドウを拡大する
              if (this._fdc.param.context === uud.body) {
                var vp = uu.viewport.rect();
                uu.msg.send(this._fdc.layout,
                            "*L_RESIZE", { x: vp.x, y: vp.y, w: vp.w, h: vp.h });
              }
              // _minimizeで使用したエフェクト用のリソースをここで開放
              uu.effect.diet();
            },
  _minimize:
            function() {
              if (this._fdc.viewState.size === 2) { return; } // 2: minimized
              this._fdc.viewState.size = 2;

              var me = this, vp = uu.viewport.rect(), rect,
                  parkingIndex = uu.msg.send(this._fdc.manager, "LM_PARKING", this._fdc.wuid);

              if (!this._fdc.viewState.rect.w && !this._fdc.viewState.rect.h) {
                this._fdc.viewState.rect = uu.css.rect(this._fdc.bone);
              }

              // 3. タイトルバーをドラッグ可能にしカーソルをmoveに
              uu.event.set(this, this._fdc.title, "mousedown");
              uu.css.set(this._fdc.title, { cursor: "move" });

              // 4. bodyを隠す
              uu.css.hide(this._fdc.body);

              // 5. リサイズハンドルを隠す
              this._fdc.resize && uu.css.hide(this._fdc.resize);

              // 親がdocument.bodyなら弾丸化
              if (this._fdc.param.context === uud.body) {
                rect = {
                  x: vp.x + vp.w - 140,
                  y: vp.y + (parkingIndex + 1) * 40,
                  w: 120,
                  h: this._fdc.param.titleHeight
                };

                // animation
                uu.effect.bullet(this._fdc.bone, {
                  x: rect.x,
                  y: rect.y,
                  w: rect.w,
                  h: rect.h,
                  speed: this._fdc.param.minimizeAnimation ? "quick" : "now",
                  fn: function() {
                    uu.msg.send(me._fdc.layout, "*L_RESIZE", rect)
                  }
                });
              }
            },
  _revert:  function() {
              if (this._fdc.viewState.size === 0) { return; } // 0: normal
              this._fdc.viewState.size = 0;

              // 1. ウインドウサイズを元に戻す
              uu.msg.send(this._fdc.layout, "*L_RESIZE", this._fdc.viewState.rect);
              this._fdc.viewState.rect = { x: 0, y: 0, w: 0, h: 0 };

              // 3. タイトルバーをドラッグ可能にしカーソルをmoveに
              uu.event.set(this, this._fdc.title, "mousedown");
              uu.css.set(this._fdc.title, { cursor: "move" });
              // 4. リサイズハンドルを表示する
              this._fdc.resize && uu.css.show(this._fdc.resize);
              // 5. bodyを表示する
              uu.css.show(this._fdc.body);

              // Firefox, Safariでタイトルバーのテキストの選択状態を解除する
              if (uu.ua.gecko || uu.ua.webkit) {
                uuw.getSelection().collapse(uud.body, 0);
              }
            }
};

/** Parts Factory
 *
 * @class
 */
uu.module.canvasPartsFactory = uu.klass.singleton();
uu.module.canvasPartsFactory.prototype = {
  // styleName = "METABOGLOSSY.BLACK"
  button:   function(c2d, styleName, colorName /* = "BLACK" */, param /* = { x, y, w, h, ... } */) {
              param = param || {};
              colorName = colorName || "BLACK";
              var ary = ((styleName.indexOf(".") === -1) ? styleName + "." : styleName).split(".");
              uu.mix.param(param, this._style[ary[0].toUpperCase()]); // supply param - パラメタを補完
              uu.mix.param(param, this._style[colorName.toUpperCase()]);
              if (ary[1]) { uu.mix(param, this.getStyle(styleName)); } // override style - スタイルで上書

              switch (ary[0].toUpperCase()) {
              case "METABOGLOSSY":
              case "JELLYBEAN":   this.metaboGlossy(c2d, param); break;
              case "ANGLEGLOSSY": this.angleGlossy(c2d, param);  break;
              }
            },
  addStyle: function(name, param) {
              this._style[name] = param;
            },
  getStyle: function(name) {
              return (name in this._style) ? this._style[name] : {};
            },
  // たるんとした光沢
  metaboGlossy:
            function(c2d, param /* { x, y, w, h, r, tarun, color, color2, oa } */) {
              var pa = param,
                  x = pa.x, y = pa.y, w = pa.w, h = pa.h, r = pa.r, tarun = pa.tarun,
                  c1 = uu.color.hash(pa.color), c2 = uu.color.hash(pa.color2),
                  oa = pa.oa, r2 = r > 4 ? r - 4 : 0, b = 3; // bevel size

              c2d.setStyle({ fill: c2d.gradation([x, y, x, y + h], [0.0, c1, 1.0, c2]) }).
                  begin().box(x, y, w, h, r).close().
                  setStyle({ fill: "rgba(255,255,255," + oa + ")" }).
                  begin().metabo(x + b, y + b, w - b * 2, h * 0.5, r2, tarun).close();
            },
  // 角度付きの光沢
  angleGlossy:
            function(c2d, param /* { x, y, w, h, r, angle, color, color2, oa } */) {
              var pa = param,
                  x = pa.x, y = pa.y, w = pa.w, h = pa.h, r = pa.r, angle = pa.angle,
                  c1 = uu.color.hash(pa.color), c2 = uu.color.hash(pa.color2),
                  oa = pa.oa, b = 3, dist = 0; // bevel size

              if (angle < -45) { angle = -45; }
              if (angle >  45) { angle =  45; }

              c2d.setStyle({ fill: c2d.gradation([x, y, x, y + h], [0.0, c1, 1.0, c2]) }).
                  begin().box(x, y, w, h, r).close().
                  setStyle({ fill: "rgba(255,255,255," + oa + ")" });

              switch (angle) {
              case 45:      // ___
                            // |／
                c2d.begin(x + b, y + b + r).line(x + b, y + h - b * 2). // ｜
                    line(x + w - b * 2, y + b).line(x + b + r, y + b).  // ／ ￣
                    curve(x, y, x + b, y + b + r).fill().close();       // (
                break;
              case -45:     // __
                            // ＼|
                c2d.begin(x - b + w, y + b + r).line(x - b + w, y + h - b * 2).  // ｜
                    line(x + b * 2, y + b).line(x - b - r + w, y + b).           // ＼￣
                    curve(x + w, y, x - b + w, y + b + r).fill().close();
                break;
              default:
                dist = ((h - b * 2) / 45 * angle) / 2;
                c2d.begin(x + b, y + b + r).
                    line(x + b, y + (h / 2) - b * 2 + dist).        // ｜
                    line(x + w - b, y + (h / 2) - b * 2 - dist).    // －
                    line(x + w - b, y + b + r).                     // ｜
                    curve(x + w, y, x + w - r, y + b).line(x + b + r, y + b).
                    curve(x, y, x + b, y + b + r).fill().close();
                break;
              }
            },
  _style:   {
    // oa = overlayAlpha
    "METABOGLOSSY":       { x: 0, y: 0, w: 100, h: 50,  r: 12, tarun: 6 },
    "JELLYBEAN":          { x: 0, y: 0, w: 100, h: 30,  r: 16, tarun: 6 },
    "ANGLEGLOSSY":        { x: 0, y: 0, w: 100, h: 100, r: 12, angle: 0 },
    "ANGLEGLOSSY.45":     { angle: 45 },
    "ANGLEGLOSSY.-45":    { angle:-45 },
    "ANGLEGLOSSY.FLAT":   { angle: 0  },
    "ANGLEGLOSSY.OVAL":   { r: 70 },

    BLACK:                { color: "#000",    color2: "#333",    oa: 0.25 },
    BLUE:                 { color: "#0000a0", color2: "#0097ff", oa: 0.38 },
    GREEN:                { color: "#006400", color2: "#00ff00", oa: 0.38 },
    RED:                  { color: "#400000", color2: "#ff0000", oa: 0.38 },
    LEMON:                { color: "#DFCC00", color2: "#FFE900", oa: 0.38 },
    GOLD:                 { color: "lemonchiffon", color2: "gold", oa: 0.45 },
    PEACH:                { color: "violet",  color2: "red",     oa: 0.38 },
    GRAY:                 { color: "black",   color2: "silver",  oa: 0.38 },
    SLIVER:               { color: "gray",    color2: "white",   oa: 0.38 },

    DUMMY:                {}
  }
};

})(); // end (function())()
