/** Drag and Drop Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var uud = document, uuw = window, uu = uuw.uu;

uu.module.drag = function() {};

/** マウスの座標と要素のオフセット値を取得
 *
 * マウスによるドラッグ操作用のコンビニエンス関数です。
 * 以下の状態を含むhashを返します。
 * x, y: ページ座標(絶対座標)と、マウスカーソルが乗っている要素の原点(左上)とのオフセット値
 *
 * @return Hash - { x, y } を返します。
 */
uu.module.drag.save = function(elm, evt) {
  var mpos = uu.event.mousePos(evt), rect = uu.css.rect(elm);
  elm.uuSaveDragOffset = { x: mpos.x - rect.x,
                           y: mpos.y - rect.y };
};
uu.module.drag.move = function(elm, evt) {
  var mpos = uu.event.mousePos(evt), off = elm.uuSaveDragOffset;
  uu.css.setRect(elm, { x: mpos.x - off.x, y: mpos.y - off.y });
  return mpos;
};

/** Free Drag and Drop
 *
 * @class
 */
uu.module.drag.free = uu.klass.generic();
uu.module.drag.free.prototype = {
  /** 初期化
   *
   * @param Element   elm               - ドラッグする要素を指定します。
   * @param Hash      [param]           - パラメタの指定です。
   * @param Boolean   [param.shim]      - shimを使用する場合にtrueにします。デフォルトはtrueです。
   * @param Boolean   [param.ghost]     - ゴーストエフェクト(fade)を使用する場合にtrueにします。デフォルトはtrueです。
   * @param String    [param.msgto]     - メッセージの受取先を指定します。""を指定するとメッセージを送信しません。
   *                                      "broadcast"を指定するとブロードキャストになります。デフォルトは""です。
   * @param Function  [param.msgFilter] - 送信するメッセージを絞り込むフィルターを指定します。
   *                                      msgFilter(メッセージ名) の形で呼ばれ、falseに評価される値を返すとメッセージは送信されません。
   *                                      デフォルトはundefinedです。
   * @param Boolean   [param.resize]    - ホイールでリサイズする場合にtrueにします。<br />
   *                                      デフォルトは、trueです。
   */
  construct: function(elm, param /* = {} */) {
    this.elm = elm;
    this.param = uu.mix.param(param || {}, {
      ghost: true, cursor: "move",
      opacity: uu.css.opacity(this.elm),
      msgto: "", msgFilter: uu.echo, resize: true, shim: true
    });

    uu.css.set(this.elm, { cursor: this.param.cursor });
    uu.element.toAbsolute(this.elm);

    // ghost effect. 見えない状態から本来の不透明度に戻す
    this.param.ghost && uu.effect.fade(this.elm, { begin: 0, end: 1.0 });

    // z-index初期化
    this.zindexer = new uu.module.drag.zindexer();
    this.zindexer.set(this.elm);

    // shim生成
    this.shim = (this.param.shim && uu.ua.ie6)
              ? new uu.module.ieboost.shim(elm, this.param.ghost) : 0;

    // EventHandler
    uu.event.set(this, this.elm, "mousedown,mousewheel");
  },
  destruct: function() {
    try {
      this.zindexer.unset(this.elm);
      uu.event.unset(this, this.elm, "mousedown,mousewheel");
    } catch (e) {}
  },
  handleEvent: function(evt) {
    var type = uu.event.toType(evt);
    uu.event.stop(evt); // イベントバブルの停止(+テキストの選択を抑止)
    switch (type) {
    case "mousedown": uu.event.set(this, uu.ua.ie ? this.elm : uud, "mousemove,mouseup", true); break;
    case "mouseup": uu.event.unset(this, uu.ua.ie ? this.elm : uud, "mousemove,mouseup", true); break;
    }
    switch (type) {
    case "mousedown":
    case "mousemove":
    case "mouseup":
    case "mousewheel":
      this["_" + type](evt);
      this.param.msgto && uu.msg && this.param.msgFilter(type) &&
        uu.msg.post(this.param.msgto, type, {
          from: "uu.module.drag.free", element: this.elm
        });
      break;
    }
  },
  _mousedown: function(evt) {
    uu.module.drag.save(this.elm, evt);
    this.dragging = true;
    this.zindexer.beginDrag(this.elm); // z-indexの更新
    this.param.ghost && uu.css.setOpacity(this.elm, 0.3); // 不透明度の設定
  },
  _mousemove: function(evt) {
    if (!this.dragging) { return; }
    var mpos = uu.module.drag.move(this.elm, evt);
    if (this.shim) {
      this.shim.setRect({ x: mpos.x - this.elm.uuSaveDragOffset.x,
                          y: mpos.y - this.elm.uuSaveDragOffset.y });
    }
  },
  _mouseup: function(evt) {
    if (!this.dragging) { return; }
    this.dragging = false;
    this.param.ghost && uu.effect.fade(this.elm, { speed: "quick", begin: uu.css.opacity(this.elm), end: 1.0 }); // 不透明度を戻す
    this.zindexer.endDrag(this.elm); // z-indexを戻す
  },
  _mousewheel: function(evt) {
    if (!this.param.resize) { return; }
    var wh = uu.event.mouseState(evt).wheel * 2,
        rect = uu.css.rect(this.elm);
    uu.css.setRect(this.elm, { x: rect.x - wh,
                               y: rect.y - wh,
                               w: rect.w + wh * 2,
                               h: rect.h + wh * 2 });
    if (this.shim) {
      this.shim.setRect(uu.css.rect(this.elm));
    }
  }
};

/** Limited Drag and Drop
 *
 * idとclass="draggable"を持つdiv要素がドラッグ移動可能となり、
 * class="droppable"を持つdiv要素にドロップ可能になります。
 * droppable以外の場所でドロップしようとすると、元の場所に戻します。
 *
 * @class
 */
uu.module.drag.limited = uu.klass.generic();
uu.module.drag.limited.prototype = {
  /** <b>ドラッグ可能要素の列挙とイベントハンドラのアサイン</b>
   *
   * @param Hash      [param]       - パラメタの指定です。
   * @param Boolean   [param.ghost] - ゴーストエフェクト(fade)を使用する場合にtrueにします。デフォルトはtrueです。
   * @param String    [param.msgto] - メッセージの受取先を指定します。""を指定するとメッセージを送信しません。
   *                                  "broadcast"を指定するとブロードキャストになります。デフォルトは""です。
   * @param Function  [param.msgFilter] - 送信するメッセージを絞り込むフィルターを指定します。
   *                                      msgFilter(メッセージ名) の形で呼ばれ、falseに評価される値を返すとメッセージは送信されません。
   *                                      デフォルトはundefinedです。
   * @param Boolean   [param.resize]    - ホイールでリサイズする場合にtrueにします。<br />
   *                                      デフォルトは、trueです。
   * @param Boolean   [param.dropAllowColor] - ドロップ可能な要素の背景色の指定です。デフォルトは"bisque"です。
   */
  construct: function(param /* = {} */) {
    var me = this;
    this.elm = null; // drag target
    this.param = uu.mix.param(param || {}, {
      ghost: true, cursor: "move",
      msgto: "", msgFilter: uu.echo, resize: true,
      dropAllowColor: "bisque"
    });

    this.draggable = uu.toArray(uu.klass("draggable", 0, "div"));
    this.droppable = uu.toArray(uu.klass("droppable", 0, "div"));
    this.zindexer = new uu.module.drag.zindexer(); // instantiate
    // ドラッグ可能要素にマウスカーソルとイベントハンドラを設定する
    uu.forEach(this.draggable, function(v) {
      v.style.cursor = me.param.cursor;
      uu.event.set(me, v, "mousedown,mousewheel");
    });
    // ドロップ可能要素の背景色と矩形を独自のプロパティとして保存する
    uu.forEach(this.droppable, function(v) {
      v._uu_drag_bgcolor = uu.css.get(v, "backgroundColor");
      v._uu_drag_rect = uu.element.rect(v);
    });
  },
  destruct: function() {
    var me = this;
    uu.forEach(this.draggable, function(v) {
      uu.event.unset(me, v, "mousedown,mousewheel");
    });
  },
  handleEvent: function(evt) {
    var type = uu.event.toType(evt);
    uu.event.stop(evt); // イベントバブルの停止(+テキストの選択を抑止)
    switch (type) {
    case "mousedown":
      uu.event.set(this, uu.ua.ie ? uu.event.target(evt).target : uud, "mousemove,mouseup", true);
      break;
    case "mouseup":
      uu.event.unset(this, uu.ua.ie ? this.elm : uud, "mousemove,mouseup", true);
      break;;
    }
    switch (type) {
    case "mousedown":
    case "mousemove":
    case "mouseup":
    case "mousewheel":
      this["_" + type](evt);
      this.param.msgto && uu.msg && this.param.msgFilter(type) &&
        uu.msg.post(this.param.msgto, type, { sender: "uu.module.drag.limited", element: this.elm });
      break;
    }
  },
  _mousedown: function(evt) {
    this.elm = uu.event.target(evt).target; // ドラッグターゲットの設定
    // ドラッグ可能要素を絶対座標化
    uu.css.setOpacity(this.elm, this.param.ghost ? 0.5 : 1.0);
    uu.element.toAbsolute(this.elm);

    // z-indexの管理を開始
    this.zindexer.set(this.elm); // z-index初期化
    this.zindexer.beginDrag(this.elm); // z-indexの更新

    uu.module.drag.save(this.elm, evt);
  },
  _mousemove: function(evt) {
    this._inDroppableRect(uu.module.drag.move(this.elm, evt));
  },
  _mouseup: function(evt) {
    // ドラッグ可能要素を静的座標化
    uu.css.set(this.elm, { position: "static", opacity: 1.0 });
    uu.css.setRect(this.elm, { x: 0, y: 0 });

    // z-indexの管理を終了
    this.zindexer.endDrag(this.elm);
    this.zindexer.unset(this.elm);

    // droppable要素にドロップ可能かを判断する
    var e = this._inDroppableRect(uu.event.mousePos(evt));
    if (e) {
      this._drop(e, this.elm);
    }
  },
  _mousewheel: function(evt) {
    if (!this.param.resize) { return; }
    var wh = uu.event.mouseState(evt).wheel * 2,
        rect = uu.css.rect(this.elm);
    uu.css.setRect(this.elm, { x: rect.x - wh,
                               y: rect.y - wh,
                               w: rect.w + wh * 2,
                               h: rect.h + wh * 2 });
  },
  // Drop Action
  _drop: function(droppable, draggable) {
    // 先客がいるならドロップ失敗
    if (!uu.klass("draggable", droppable, "div").length) {
      if (droppable.hasChildNodes()) {
        droppable.insertBefore(draggable, droppable.firstChild); // droppable.lastChild
      } else {
        droppable.appendChild(draggable);
      }
      this.param.msgto && uu.msg && this.param.msgFilter("drop") &&
        uu.msg.post(this.param.msgto, "drop", { sender: "uu.module.drag.limited", element: this.elm });
    }
  },
  // ドロップ可能領域内なら背景色を差し替え
  _inDroppableRect: function(mpos) {
    var rv = null, bg = this.param.dropAllowColor;
    uu.forEach(this.droppable, function(v) {
      if (uu.inRect(v._uu_drag_rect, mpos)) {
        v.style.backgroundColor = bg;
        rv = v;
        return;
      }
      v.style.backgroundColor = v._uu_drag_bgcolor;
    });
    return rv;
  }
};

/** z-index Management
 *
 * @class
 */
uu.module.drag.zindexer = uu.klass.singleton();
uu.module.drag.zindexer.prototype = {
  construct: function() {
    this._elm = [];                // 登録済みのドラッガブルオブジェクト
    this._boost = 5000;            // ドラッグ中のオブジェクトに一時的に設定されるz-index
    this._top = 20;                // 現在の最上位z-index
  },
  // uu.module.drag.zindexer.set - regist - 登録
  set: function(elm) {
    if (this._elm.indexOf(elm) !== -1) { return; }
    this._elm.push(elm);
    elm.style.zIndex = ++this._top; // top+1を設定
  },
  // uu.module.drag.zindexer.unset - unregist - 登録抹消
  unset: function(elm) {
    if (this._elm.indexOf(elm) === -1) { return; }
    delete this._elm[this._elm.indexOf(elm)];
    --this._top;
  },
  // uu.module.drag.zindexer.beginDrag - ドラッグ開始
  beginDrag: function(elm) {
    if (this._elm.indexOf(elm) === -1) { return; }
    this._sink(elm);
    elm.style.zIndex = this._boost + 1;
  },
  // uu.module.drag.zindexer.endDrag - ドラッグ終了
  endDrag: function(elm) {
    if (this._elm.indexOf(elm) === -1) { return; }
    elm.style.zIndex = this._top; // 最上位に移動
  },
  // uu.module.drag.zindexer.top - 最上位に再配置
  top: function(elm) {
    if (this._elm.indexOf(elm) === -1) { return; }
    this._sink(elm);
    elm.style.zIndex = this._top; // 最上位に移動
  },
  _sink: function(elm) {
    var thresh = elm.style.zIndex || 10; // 閾値
    uu.forEach(this._elm, function(v) {
      (v.style.zIndex > thresh) && (v.style.zIndex -= 1);
    });
  }
};

})(); // end (function())()
