/** Cover Flow Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

uu.module.coverflow = uu.klass.generic();
uu.module.coverflow.prototype = {
  construct: function(elm, padding, coverWidth /* = 160px */) {
    this.coverWidth = coverWidth || 160;
    this.debug = false;
    this.padding = padding;
    this.ctx = elm.getContext("2d");

    // regularize
    if (elm.style.zIndex === void 0) {
      elm.style.zIndex = 0;
    }

    elm.style.left = padding.x + "px";
    elm.style.top  = padding.y + "px";

    // MouseHandler(ui) + ViewLayer(view) + CanvasLayer(ctx)
    this.ui = uud.createElement("div");
    this.ui.style.position  = "absolute";
    this.ui.style.left      = padding.x + "px";
    this.ui.style.top       = padding.y + "px";
    this.ui.style.width     = this.ctx.canvas.width + "px";
    this.ui.style.height    = this.ctx.canvas.height + "px";
    this.ui.style.zIndex    = elm.style.zIndex + 2;
if (1) {
    this.ui.style.border = "1px solid pink"; // ui=pink
}
    uud.body.insertBefore(this.ui, elm);


    this.view = uud.createElement("div");
    this.view.style.position = "absolute";
    this.view.style.left     = padding.x + 230 + "px";
    this.view.style.top      = padding.y + "px";
    this.view.style.width    = this.coverWidth + "px";
    this.view.style.height   = this.coverWidth + "px";
    this.view.style.zIndex   = elm.style.zIndex + 1;
if (0) {
    this.view.style.border = "1px solid white";
}
    uud.body.insertBefore(this.view, elm);

    // create temporary canvas
/*
    this.ctxTmp     = uu.canvas.context(uud.body.appendChild(uu.canvas.create(this.coverWidth, this.coverWidth)));
    this.ctxContTmp = uu.canvas.context(uud.body.appendChild(uu.canvas.create(this.coverWidth, this.coverWidth)));
    this.ctxRef     = uu.canvas.context(uud.body.appendChild(uu.canvas.create(this.coverWidth, this.coverWidth)));
 */
    var e1          = uud.body.appendChild(uud.createElement("canvas"));
    e1.width        = this.coverWidth;
    e1.height       = this.coverWidth;
    this.ctxTmp     = (new uu.module.canvas2d(e1)).ctx;

    var e2          = uud.body.appendChild(uud.createElement("canvas"));
    e2.width        = this.coverWidth;
    e2.height       = this.coverWidth;
    this.ctxContTmp = (new uu.module.canvas2d(e2)).ctx;

    var e3          = uud.body.appendChild(uud.createElement("canvas"));
    e3.width        = this.coverWidth;
    e3.height       = this.coverWidth;
    this.ctxRef     = (new uu.module.canvas2d(e3)).ctx;

    this.grada      = this.__createLinearGradient(this.ctxRef, this.coverWidth);

    this.cvobj = [];
    this.cvid = 0;  // cover id
    this.cvox = 0;  // cover offset x
    this.anime = 0; // anime(-4 < 0 < +4)

    this.center = { gear: 0, anime: 0 };

    // for drag
    this.dragInfo = { dragging: false, x: 0, y: 0 };

    // hitRect
    this.hitRect = [
      { x:   0, w:  50 }, // 0
      { x:  50, w:  50 }, // 1
      { x: 100, w:  50 }, // 2
      { x: 150, w:  80 }, // 3
      { x: 230, w: 160 }, // 4
      { x: 390, w:  80 }, // 5
      { x: 470, w:  50 }, // 6
      { x: 520, w:  50 }, // 7
      { x: 570, w:  50 }  // 8
    ];
    this.centerHitRect = [
      { x:   0          , w: 150     }, // left
      { x: 230 - 160 / 2, w: 160 * 2 }, // center
      { x: 470          , w: 150     }, // right
    ];
    this.animeOffset = [0, -60, -40, -20, 0, 20, 40, 60, 0];

    // addEventListener, removeEventListener
////    this.he = uu.event.handler(this);
//  uu.event.set(this.ui, "mousewheel,mousedown,click,dblclick", this.he);
////    uu.event.set(this.ui, "mousewheel,mousedown,click", this.he);
    uu.event.set(this, this.ui, "mousewheel,mousedown,click");
    uu.event.set(this, uud, "mousemove,mouseup");

    // boing boing + pata pata anime
    var me = this;
    var redraw = false;
//    uuw.setTimeout(function() {
    uu.vtmHighSpeed.set(function onTimer() {
      // anime
      var redraw = false;

      if (me.center.gear) {
        redraw = true;
      } else if (me.anime) {
        me.anime += (me.anime < 0) ? 1 : -1;
        redraw = true;
      }

      // centering
      if (!me.dragInfo.dragging) {
        if (me.cvox) {
          if (me.cvox < 0) {
            me.cvox += Math.abs(me.cvox) >>> 2;
            ++me.cvox;
          } else {
            me.cvox -= me.cvox >>> 2;
            --me.cvox;
          }
          ++redraw;
        }
      }
      if (redraw) {
        me.draw();
        if (me.center.gear) {
          me.center.anime += me.center.gear;
          if (me.center.anime < 0) {
            me.center.anime = 0;
            me.center.gear = 0;
          } else if (me.center.anime > 7) {
            me.center.anime = 7;
            me.center.gear = 0;
            me.cvobj[me.cvid].showView(me.view);
          }
        }
      }
//      uuw.setTimeout(arguments.callee, 10);
    }, 10);
//    }, 10);
  },
  /** <b>イベントハンドラ</b> */
  handleEvent: function(evt) {
    var type = uu.event.toType(evt);
    switch (type) {
    case "mousedown":   uu.event.stop(evt); this.mousedown(evt);  break;
    case "mousemove":   uu.event.stop(evt); this.mousemove(evt);  break;
    case "mouseup":     uu.event.stop(evt); this.mouseup(evt);    break;
    case "mousewheel":  uu.event.stop(evt); this.mousewheel(evt); break;
    case "dblclick":    uu.event.stop(evt); this.dblclick(evt);   break;
    case "click":       uu.event.stop(evt); this.click(evt);      break;
    }
  },
  setContentImage: function(id) {
    this.contobj = new uu.module.coverContent(uu.id(id), this.ctxContTmp);
  },
  /** load image and informations 
   *
   * @param Array data  [{id: id, fn: viewerFunc}, ...]
   */
  load: function(data) {
    var me = this;
    data.forEach(function(v) {
      me.cvobj.push(new uu.module.cover(v, me.ctxTmp, me.ctxRef, me.grada));
    });
  },
  draw: function() {
    var id = this.cvid;
    var ox = this.cvox + this.animeOffset[this.anime + 4];
    var sz = this.cvobj.length;

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    if (id > 3) { this.cvobj[id - 4].draw(this.ctx, { x: ox + 0  , y: 0, w:  50, h: 320 }, 0, 0.25); }
    if (id > 2) { this.cvobj[id - 3].draw(this.ctx, { x: ox + 50 , y: 0, w:  50, h: 320 }, 0, 0.5);  }
    if (id > 1) { this.cvobj[id - 2].draw(this.ctx, { x: ox + 100, y: 0, w:  50, h: 320 }, 0, 0.75); }
    if (id > 0) {
      switch (this.anime) {
      case  3: this.cvobj[id - 1].draw(this.ctx, { x: ox + 140, y: 0, w: 160, h: 320 }, 3, 1.0); break;
      case  2: this.cvobj[id - 1].draw(this.ctx, { x: ox + 146, y: 0, w: 128, h: 320 }, 2, 1.0); break;
      case  1: this.cvobj[id - 1].draw(this.ctx, { x: ox + 150, y: 0, w: 120, h: 320 }, 1, 1.0); break;
      default: this.cvobj[id - 1].draw(this.ctx, { x: ox + 150, y: 0, w:  80, h: 320 }, 0, 1.0); break;
      }
    }
    if (id < sz - 4) { this.cvobj[id + 4].draw(this.ctx, { x: ox + 570, y: 0, w:  50, h: 320 }, 6, 0.25); }
    if (id < sz - 3) { this.cvobj[id + 3].draw(this.ctx, { x: ox + 520, y: 0, w:  50, h: 320 }, 6, 0.5);  }
    if (id < sz - 2) { this.cvobj[id + 2].draw(this.ctx, { x: ox + 470, y: 0, w:  50, h: 320 }, 6, 0.75); }
    if (id < sz - 1) {
      switch (this.anime) {
      case -3: this.cvobj[id + 1].draw(this.ctx, { x: ox + 320, y: 0, w: 160     , h: 320 }, 3, 1.0); break;
      case -2: this.cvobj[id + 1].draw(this.ctx, { x: ox + 344, y: 0, w: 128     , h: 320 }, 4, 1.0); break;
      case -1: this.cvobj[id + 1].draw(this.ctx, { x: ox + 360, y: 0, w: 120 - 10, h: 320 }, 5, 1.0); break;
      default: this.cvobj[id + 1].draw(this.ctx, { x: ox + 390, y: 0, w:  80     , h: 320 }, 6, 1.0); break;
      }
    }
    if (!this.center.gear && !this.center.anime) {
      switch (this.anime) {
      case -3: this.cvobj[id].draw(this.ctx, { x: ox + 230, y: 0, w: 120 - 30, h: 320 }, 1, 1.0); break;
      case -2: this.cvobj[id].draw(this.ctx, { x: ox + 216, y: 0, w: 128     , h: 320 }, 2, 1.0); break;
      case -1: this.cvobj[id].draw(this.ctx, { x: ox + 230, y: 0, w: 160     , h: 320 }, 3, 1.0); break;
      case  3: this.cvobj[id].draw(this.ctx, { x: ox + 300, y: 0, w: 120 - 30, h: 320 }, 5, 1.0); break;
      case  2: this.cvobj[id].draw(this.ctx, { x: ox + 274, y: 0, w: 128     , h: 320 }, 4, 1.0); break;
      case  1: this.cvobj[id].draw(this.ctx, { x: ox + 230, y: 0, w: 160     , h: 320 }, 3, 1.0); break;
      default: this.cvobj[id].draw(this.ctx, { x: ox + 230, y: 0, w: 160     , h: 320 }, 3, 1.0); break;
      }
    } else {
      switch (this.center.anime) {
      case  0: this.cvobj[id].draw(this.ctx, { x: ox + 230         , y: 0, w: 160     , h: 320 }, 3, 1.0 ); break;
      case  1: this.cvobj[id].draw(this.ctx, { x: ox + 230 + 32 / 2, y: 0, w: 128     , h: 320 }, 4, 0.75); break;
      case  2: this.cvobj[id].draw(this.ctx, { x: ox + 230 + 40 / 2, y: 0, w: 120     , h: 320 }, 5, 0.5 ); break;
      case  3: this.cvobj[id].draw(this.ctx, { x: ox + 230 + 80 / 2, y: 0, w:  80     , h: 320 }, 5, 0.25); break;
      case  4: this.contobj.draw(  this.ctx, { x: ox + 230 + 80 / 2, y: 0, w:  80     , h: 160 }, 0, 0.25); break;
      case  5: this.contobj.draw(  this.ctx, { x: ox + 230 + 40 / 2, y: 0, w: 120     , h: 160 }, 1, 0.5 ); break;
      case  6: this.contobj.draw(  this.ctx, { x: ox + 230 + 32 / 2, y: 0, w: 128     , h: 160 }, 2, 0.75); break;
      case  7: this.contobj.draw(  this.ctx, { x: ox + 230 - 160 / 2, y: 0, w: 160*2   , h: 160*2 }, 3, 1); break;
      }
    }
//    window.status = "anime=" + this.anime + ",center.anime=" + this.center.anime;
    if (uuw.cfbtn) { alert(uuw.status); }
  },
  mousedown: function(evt) {
    var mpos = uu.event.mousePos(evt);
    // keep offset
    this.dragInfo = { dragging: true, x: mpos.x - parseInt(this.ui.style.left),
                                      y: mpos.y - parseInt(this.ui.style.top) };
  },
  mousemove: function(evt) {
    if (!this.dragInfo.dragging) { return; }
    var mpos = uu.event.mousePos(evt);

    this.cvox = parseInt(mpos.x - this.dragInfo.x - this.padding.x); // move cover offset

    if (Math.abs(this.cvox) & 0xfffc) { // 11px以上
      this.move((this.cvox > 0) ? 0 : 1, 1);
    }
    this.draw();
  },
  mouseup: function(evt) {
    if (!this.dragInfo.dragging) { return; }
    this.dragInfo.dragging = false;
  },
  mousewheel: function(evt) {
    var mstate = uu.event.mouseState(evt);
    if (mstate.wheel > 0) {
      this.move(1, Math.round(mstate.wheel));
    } else if (mstate.wheel < 0) {
      this.move(0, Math.round(mstate.wheel));
    }
  },
  inHitRect: function(mpos) {
    var cvox = this.cvox;
    var rect = (this.center.anime == 7) ? this.centerHitRect : this.hitRect;
    for (var i = 0; i < rect.length; ++i) {

// デバック用, 当たり判定がある場所に、赤い矩形を表示する
      if (this.debug) {
        this.ctx.rect(cvox + rect[i].x, 100 + i * 10, cvox + rect[i].w, 160);
        this.ctx.strokeStyle = "rgba(255,0,0,1.0)";
        this.ctx.stroke();
      }
      if (mpos.x >= this.padding.x + cvox + rect[i].x &&
          mpos.x <= this.padding.x + cvox + rect[i].x + rect[i].w) { return i; }
    };
    return -1;
  },
// デバック用
  dblclick: function(evt) {
    this.debug = !!!this.debug;
    this.draw();
  },
  click: function(evt) {
    if (this.center.anime == 7) {
      switch (this.inHitRect(uu.event.mousePos(evt))) {
      case 1: // center clickで実行
          this.cvobj[this.cvid].execContent(this.view);
          break;
      case 0: case 2: // center以外をクリックすると選択状態を解除
          this.cvobj[this.cvid].hideView(this.view);
          this.center.gear = -1, this.center.anime = 7; // アニメーション開始
          break;
      }
    } else {
      var hit = this.inHitRect(uu.event.mousePos(evt)), loop = 0;
      if (hit >= 0) {
        loop = this.cvid - 4 + hit;
        if (loop != this.cvid) {
          var i = this.cvid;
          if (loop > this.cvid) {
            for (; i < loop; ++i) { this.move(1, 1); }
          } else {
            for (; i > loop; --i) { this.move(0, 1); }
          }
        } else {
          // click center
          if (!this.center.anime) { // 非選択状態
            this.center.gear = 1, this.center.anime = 0; // アニメーション開始
/*
          } else if (this.center.anime == 7) {
            // 選択済みなら、非選択状態にする
            this.center.gear = -1, this.center.anime = 7; // アニメーション開始
 */
          }
        }
      }
    }
  },
  move: function(leftSide, speed) {
    if (leftSide) {
      ++this.cvid;
      this.anime = 4;
      if (this.cvid > this.cvobj.length - 1) { // bookend
        this.cvid = this.cvobj.length - 1;
        this.anime = 0;
        this.draw(); // quick redraw
      }
    } else {
      --this.cvid;
      this.anime = -4;
      if (this.cvid < 0) { // bookend
        this.cvid = 0;
        this.anime = 0;
        this.draw(); // quick redraw
      }
    }
  },
  /** Create Linear gradient
   *
   * @param   CanvasRenderingContext2D  ctx         canvas context
   * @param   number                    coverWidth
   * @return  CanvasGradient
   */
  __createLinearGradient: function(ctx, coverWidth) {
    var rv = ctx.createLinearGradient(0, 0, 0, coverWidth);
    rv.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
    rv.addColorStop(0,   "rgba(255, 255, 255, 0.5)");
    return rv;
  }
};

/** a cover */
uu.module.cover = uu.klass.generic();
uu.module.cover.prototype = {
  /** initialize
   *
   * @param Object  param   { id: id, show: show, hide: hide, exec: exec }
   * @param canvas  ctxTmp  temporary canvas context
   * @param canvas  ctxRef  reflection canvas context
   * @param Object  grada   gradation object by createLinearGradient()
   */
  construct: function(param, ctxTmp, ctxRef, grada) {
    var e = uu.id(param.id);
    var w = e.width;
    this.param = { elm: e, show: param.show, hide: param.hide, exec: param.exec,
                   coverWidth: w, tmp: ctxTmp, ref: ctxRef, grada: grada };
    this.frameData = [
      { frame: 0, sx: 0    , sy: 30, sw:  80, angle: { w:  4, top: 20, denomi:  8, direction: -1 } }, // x = 0.5(4/8)   , y = 0.125(1/8)
      { frame: 1, sx: w * 1, sy: 20, sw: 120, angle: { w: 12, top: 10, denomi: 16, direction: -1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame: 2, sx: w * 2, sy: 10, sw: 128, angle: { w: 32, top:  4, denomi: 40, direction: -1 } }, // x = 0.8(32/40) , y = 0.025(1/40)
      { frame: 3, sx: w * 3, sy:  0, sw: 160, angle: { w:  0, top:  0, denomi:  0, direction:  0 } }, // center
      { frame: 4, sx: w * 4, sy: 10, sw: 128, angle: { w: 32, top:  0, denomi: 40, direction:  1 } }, // x = 0.8(32/40) , y = 0.025(1/40)
      { frame: 5, sx: w * 5, sy: 20, sw: 120, angle: { w: 12, top:  0, denomi: 16, direction:  1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame: 6, sx: w * 6, sy: 30, sw:  80, angle: { w:  4, top:  0, denomi:  8, direction:  1 } }, // x = 0.5(4/8)   , y = 0.125(1/8)
      { frame: 7, sx: 0    , sy:-30, sw:   0, angle: { w:  4, top: 20, denomi:  8, direction:  1 } }, // x = 0.5(4/8)   , y = 0.125(1/8)
      { frame: 8, sx: w * 1, sy:-20, sw:   0, angle: { w: 12, top: 10, denomi: 16, direction:  1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame: 9, sx: w * 2, sy:-10, sw:   0, angle: { w: 32, top:  4, denomi: 40, direction:  1 } }, // x = 0.8(32/40), y = 0.025(1/40)
      { frame:10, sx: w * 3, sy:  0, sw:   0, angle: { w:  0, top:  0, denomi:  0, direction:  0 } }, // center
      { frame:11, sx: w * 4, sy:-10, sw:   0, angle: { w: 32, top:  0, denomi: 40, direction: -1 } }, // x = 0.8(32/40), y = 0.025(1/40)
      { frame:12, sx: w * 5, sy:-20, sw:   0, angle: { w: 12, top:  0, denomi: 16, direction: -1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame:13, sx: w * 6, sy:-30, sw:   0, angle: { w:  4, top:  0, denomi:  8, direction: -1 } }  // x = 0.5(4/8), y = 0.125(1/8)
    ];
//    this.ctx = this.__createBankCanvas();
    // create bank canvas
/*
    this.ctx = uu.canvas.context(uud.body.appendChild(uu.canvas.create(this.param.coverWidth * 7, this.param.coverWidth * 2)));
 */

    var e1          = uud.body.appendChild(uud.createElement("canvas"));
    e1.width        = this.param.coverWidth * 7;
    e1.height       = this.param.coverWidth * 2;
    this.ctx        = (new uu.module.canvas2d(e1)).ctx;

    var me = this;
    this.frameData.forEach(function(v) { me.__createFrame(v); });
  },
  showView: function(view) {
    this.param.show(view);
  },
  hideView: function(view) {
    this.param.hide(view);
  },
  execContent: function(view) {
    this.param.exec(view);
  },
  /** draw cover
   *
   * @param canvas    ctx     drawing target canvas
   * @param rect      rect    copy rect {x, y, w, h}
   * @param Number    frame   frame no
   *                          0: RightDown(5 degree)
   *                          1: RightDown(15 degree)
   *                          2: RightDown(30 degree)
   *                          3: Center
   *                          4: RightUp(30 degree)
   *                          5: RightUp(15 degree)
   *                          6: RightUp(5 degree)
   * @param Number    alpha   alpha
   * @param Boolean   reflect true: with reflection, false: without reflection
   */
  draw: function(ctx, rect, frame, alpha) {
    ctx.globalAlpha = alpha;
    var sx = this.frameData[frame].sx;
    if (this.frameData[frame].angle.direction > 0) {
      sx += this.frameData[frame].sw - rect.w; // calculate basis from right-side
    }
    ctx.drawImage(this.ctx.canvas, sx, 0, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
  },
  __createFrame: function(data) {
    var cvw = this.param.coverWidth, i = 0, x = 0, y = 0;
    var sx = data.sx, sy = data.sy, w = data.angle.w, dire = data.angle.direction, denomi = data.angle.denomi;
    var img = this.param.elm, tmp = this.param.tmp;

    switch (data.frame) {
    case 0: case 1: case 2:
      for (i = 0; i < cvw; x += w, y += dire, i += denomi) {
        this.ctx.drawImage(img, i, 0, denomi, cvw, sx + x, sy - y - data.angle.top + 1, w, cvw - sy * 2 + y * 2 + data.angle.top * 2 - 2);
      }
      break;
    case 3:
      this.ctx.drawImage(img, 0, 0, cvw, cvw, sx, sy, cvw, cvw);
      break;
    case 4: case 5: case 6:
      for (i = 0; i < cvw; x += w, y += dire, i += denomi) {
        this.ctx.drawImage(img, i, 0, denomi, cvw, sx + x, sy - y, w, cvw - sy * 2 + y * 2);
      }
      break;
    case 7: case 8: case 9:
      tmp.clearRect(0, 0, tmp.canvas.width, tmp.canvas.height);
      for (i = 0; i < cvw; x += w, y += dire, i += denomi) {
        tmp.drawImage(img, i, 0, denomi, cvw, x, y - sy * 2 - data.angle.top + 1, w, cvw + sy * 2);
      }
      this.__createReflection(data);
      break;
    case 10:
      tmp.clearRect(0, 0, tmp.canvas.width, tmp.canvas.height);
      tmp.drawImage(img, 0, 0);
      this.__createReflection(data);
      break;
    case 11: case 12: case 13:
      tmp.clearRect(0, 0, tmp.canvas.width, tmp.canvas.height);
      for (i = 0; i < cvw; x += w, y += dire, i += denomi) {
        tmp.drawImage(img, i, 0, denomi, cvw, x, y - sy * 2, w, cvw + sy * 2);
      }
      this.__createReflection(data);
      break;
    }
  },
  __createReflection: function(data) {
    var cvw = this.param.coverWidth;
    var ref = this.param.ref;
    ref.clearRect(0, 0, ref.canvas.width, ref.canvas.height);
    ref.save();
    ref.translate(0, cvw - 1);
    ref.scale(1, -1);
    ref.drawImage(this.param.tmp.canvas, 0, 0);
    ref.restore();

    ref.save();
    ref.globalCompositeOperation = "destination-out";
    ref.fillStyle = this.param.grada;
    ref.fillRect(0, 0, cvw, cvw);
    ref.restore();
    this.ctx.drawImage(ref.canvas, 0, 0, cvw, cvw, data.sx, data.sy + cvw, cvw, cvw);
  }
};

/** a content */
uu.module.coverContent = uu.klass.generic();
uu.module.coverContent.prototype = {
  /** initialize
   *
   * @param Object  elm
   * @param canvas  ctxTmp  temporary canvas context
   */
  construct: function(elm, ctxTmp) {
    var w = elm.width;
    this.param = { elm: elm, coverWidth: w, tmp: ctxTmp };
    this.frameData = [
      { frame: 0, sx: 0    , sy: 30, sw:  80, angle: { w:  4, top: 20, denomi:  8, direction: -1 } }, // x = 0.5(4/8)   , y = 0.125(1/8)
      { frame: 1, sx: w * 1, sy: 20, sw: 120, angle: { w: 12, top: 10, denomi: 16, direction: -1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame: 2, sx: w * 2, sy: 10, sw: 128, angle: { w: 32, top:  4, denomi: 40, direction: -1 } }, // x = 0.8(32/40) , y = 0.025(1/40)
//    { frame: 3, sx: w * 3, sy:  0, sw: 160, angle: { w:  0, top:  0, denomi:  0, direction:  0 } }, // center
      { frame: 3, sx: w * 3, sy:  0, sw: 160*2, angle: { w:  0, top:  0, denomi:  0, direction:  0 } }, // center
/*

      { frame: 4, sx: w * 4, sy: 10, sw: 128, angle: { w: 32, top:  0, denomi: 40, direction:  1 } }, // x = 0.8(32/40) , y = 0.025(1/40)
      { frame: 5, sx: w * 5, sy: 20, sw: 120, angle: { w: 12, top:  0, denomi: 16, direction:  1 } }, // x = 0.75(12/16), y = 0.0625(1/16)
      { frame: 6, sx: w * 6, sy: 30, sw:  80, angle: { w:  4, top:  0, denomi:  8, direction:  1 } }, // x = 0.5(4/8)   , y = 0.125(1/8)
 */
    ];
//    this.ctx = this.__createBankCanvas();
    // create bank canvas
/*
    this.ctx = uu.canvas.context(uud.body.appendChild(uu.canvas.create(this.param.coverWidth * 7, this.param.coverWidth * 2)));
 */
    var e1          = uud.body.appendChild(uud.createElement("canvas"));
    e1.width        = this.param.coverWidth * 7;
    e1.height       = this.param.coverWidth * 2;
    this.ctx        = (new uu.module.canvas2d(e1)).ctx;



    var me = this;
    this.frameData.forEach(function(v) { me.__createFrame(v); });
  },
  /** draw content
   *
   * @param canvas    ctx     drawing target canvas
   * @param rect      rect    copy rect {x, y, w, h}
   * @param Number    frame   frame no
   *                          0: RightDown(5 degree)
   *                          1: RightDown(15 degree)
   *                          2: RightDown(30 degree)
   *                          3: Center
   *                          4: RightUp(30 degree)
   *                          5: RightUp(15 degree)
   *                          6: RightUp(5 degree)
   * @param Number    alpha   alpha
   * @param Boolean   reflect true: with reflection, false: without reflection
   */
  draw: function(ctx, rect, frame, alpha) {
    ctx.globalAlpha = alpha;
    var sx = this.frameData[frame].sx;
    if (this.frameData[frame].angle.direction > 0) {
      sx += this.frameData[frame].sw - rect.w; // calculate basis from right-side
    }
    ctx.drawImage(this.ctx.canvas, sx, 0, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
  },
  __createFrame: function(data) {
    var cvw = this.param.coverWidth, i = 0, x = 0, y = 0;
    var sx = data.sx, sy = data.sy, w = data.angle.w, dire = data.angle.direction, denomi = data.angle.denomi;
    var img = this.param.elm, tmp = this.param.tmp;

    switch (data.frame) {
    case 0: case 1: case 2:
      for (i = 0; i < cvw; x += w, y += dire, i += denomi) {
        this.ctx.drawImage(img, i, 0, denomi, cvw, sx + x, sy - y - data.angle.top + 1, w, cvw - sy * 2 + y * 2 + data.angle.top * 2 - 2);
      }
      break;
    case 3:
      this.ctx.drawImage(img, 0, 0, cvw, cvw, sx, sy, data.sw, data.sw);
      break;
    }
  }
};

})(); // end (function())()
