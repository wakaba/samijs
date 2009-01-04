/** <b>Pluggable MVC Module</b>
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var /* uud = document, */ uuw = window, uu = uuw.uu;

/** <b>Pluggable MVC</b>
 *
 * @class
 */
uu.module.pmvc = function() {
};

/** <b>Pluggable MVC - Application Model</b>
 *
 * @class
 */
uu.module.pmvc.applicationModel = uu.klass.kiss();

/** <b>Pluggable MVC - Domain Model</b>
 *
 * @class
 */
uu.module.pmvc.domainModel = uu.klass.kiss();

/** <b>Pluggable MVC - Controller</b>
 *
 * @class
 */
uu.module.pmvc.controller = uu.klass.kiss();

/** <b>Pluggable MVC - View</b>
 *
 * @class
 */
uu.module.pmvc.view = uu.klass.kiss();

uu.forEach({
  /** @scope uu.module.pmvc.controller */

  /** <b>初期化</b>
   *
   * @param String id       - ユニークなID(メッセージ配達用のアドレス)を指定します。
   */
  construct: function(uid) {
    this.uid = uid;     // 与えられたUIDで…
    uu.msg.set(this);   // ...メッセージボックスを登録
    this.catalog = { ping: "_ping" }; // msg-name: function-name
    this.activate();
  },
  /** <b>メッセージとハンドラの登録</b>
   *
   * @param Hash handler - hash { msg, function() { ... }, ... } を指定します。
   *                       msgで指定したメッセージが到着すると、
   *                       functionで指定した関数が呼ばれます。
   */
  regist: function(handler) {
    var me = this;
    uu.forEach(handler, function(fn, msg) {
      me.catalog[msg] = msg; // 実名で登録
      me[msg] = fn;
    });
  },
  /** <b>エリアスメッセージカタログの登録</b>
   *
   * メッセージの別名を登録します。
   *
   * @param Hash catalog - エリアス(別名)とメッセージ(実体)のカタログです。
   *                       hash { alias, msg, ... } の形で指定します。
   *                       aliasで指定したメッセージが到着すると、
   *                       msgとリンクしているハンドラが呼ばれます。
   * @throws TypeError "uu.module.pmvc::registArias(catalog) no unsubstantial" 実体が無い
   */
  registArias: function(catalog) {
    var me = this;
    uu.forEach(catalog, function(msg, alias) {
      if (!(msg in me.catalog)) { // 実体が無い
        throw TypeError("uu.module.pmvc::registArias(catalog) no unsubstantial");
      }
      me.catalog[alias] = msg; // { msg-name(alias): function-name }
    });
  },
  /** <b>活性化</b>
   * メッセージの受け取りを開始します。
   */
  activate: function() {
    this.permit = 0x1;
  },
  /** <b>不活性化</b>
   * メッセージの受け取りを停止します。
   */
  deactivate: function() {
    this.permit = 0x0;
  },
  /** <b>メッセージの受信とハンドラの呼び出し</b>
   *
   * @param String msg   - メッセージの名前を指定します。
   * @param Mix [p1] - 引数を指定します。
   * @param Mix [p2] - 引数を指定します。
   * @return Boolean - 呼び出し成功でtrue, 失敗でfalseを返します。
   */
  msgbox: function(msg, p1, p2) {
    if (!this._hook(msg, p1, p2) || !this.permit) { return false; }
    if (!(msg in this.catalog)) { return this._unknown(msg, p1, p2); }
    return this[this.catalog[msg]].call(this, msg, p1, p2);
  },
  _ping:    function(msg, p1, p2) { alert(this.id + " - alive"); },
  _hook:    function(msg, p1, p2) { return true; }, // falseでルーティング終了
  _unknown: function(msg, p1, p2) { return true; }  // 未知のメッセージ用ハンドラ
}, function(v, p) {
  uu.module.pmvc.applicationModel.prototype[p] = v;
  uu.module.pmvc.domainModel.prototype[p] = v;
  uu.module.pmvc.controller.prototype[p] = v;
  uu.module.pmvc.view.prototype[p] = v;
});

/** プライマリインスタンスのアクティベート - Activate primary instance
 */
uu.module.pmvc.activate = function() {
  uu.app    = new uu.module.pmvc.applicationModel("A"); // uid="A"
  uu.domain = new uu.module.pmvc.domainModel("D");      // uid="D"
  uu.view   = new uu.module.pmvc.view("V");             // uid="V"
  uu.ctrl   = new uu.module.pmvc.controller("C");       // uid="C"
};

})(); // end (function())()
