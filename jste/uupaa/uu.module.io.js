/** I/O Module
 *
 * @author Takao Obara <com.gmail@js.uupaa>
 * @license uupaa.js is licensed under the terms and conditions of the MIT licence.
 * @see <a href="http://code.google.com/p/uupaa-js/">Home(Google Code)</a>
 * @see <a href="http://uupaa-js.googlecode.com/svn/trunk/README.htm">README</a>
 */
(function() { var /* uud = document, */ uuw = window, uu = uuw.uu;

if (!("io" in uu.module)) {
  uu.module.io = function() {};
}

/** Codec
 *
 * @class
 */
uu.module.codec = {
  base64:     {},
  json:       {},
  htmlEntity: {},
  lineBreak:  {},
  utf8:       {},
  text:       {}
};

uu.mix(uu.module.codec.base64, {
  _b64str:  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  _b64hash: { "=": 0 },
  _makeHash:
            function() {
              var me = uu.module.codec.base64, i = 0, sz = me._b64str.length;
              for (; i < sz; ++i) {
                me._b64hash[me._b64str.charAt(i)] = i;
              }
            },
  // uu.module.codec.base64.encode - ByteArrayからBase64Stringを生成する
  encode:   function(ary /* ByteArray */, URLSafe64 /* = true */) {
              var rv = [], me = uu.module.codec.base64,
                  pad = 0, str = me._b64str, c = 0, i = 0, sz;

              switch (ary.length % 3) {
                case 1: ary.push(0); ++pad;
                case 2: ary.push(0); ++pad;
              }
              sz = ary.length;
              while (i < sz) {
                c = (ary[i++] << 16) | (ary[i++] <<  8) | (ary[i++]);
                rv.push(str.charAt((c >>> 18) & 0x3f), str.charAt((c >>> 12) & 0x3f),
                        str.charAt((c >>>  6) & 0x3f), str.charAt( c         & 0x3f));
              }
              switch (pad) {
              case 2: rv[rv.length - 2] = "=";
              case 1: rv[rv.length - 1] = "=";
              }
              if (URLSafe64 === void 0 || URLSafe64) {
                return rv.join("").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
              }
              return rv.join(""); // Base64 String
            },
  // uu.module.codec.base64.decode - Base64StringからByteArrayを生成する
  decode:   function(b64 /* Base64String or URLSafe64 */) {
              if (!uu.isS(b64) || !b64.length) { return []; } // empty

              // URLBase64Charcter("-", "_") convert to ("+", "/")
              b64 = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/=/g, "");
              if (/[^A-Za-z0-9\+\/]/.test(b64)) { return []; } // bad data

              var rv = [], me = uu.module.codec.base64, pad = 0,
                  hash = me._b64hash, c = 0, i = 0, sz;

              if (!("A" in me._b64hash)) { me._makeHash(); }

              switch (b64.length % 4) { // pad length( "=" or "==" or "" )
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
});

uu.mix(uu.module.codec.json, {
  encode:   function(mix, fn /* = uu.no */) {
              fn = fn || uu.no;
              var rv = [], re = /[\\"\x00-\x1F\u0080-\uFFFF]/g,
                  esc = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"':  '\\"', "\\": "\\\\" };
              function isFake(mix) { return typeof mix === "object" && uu.isFA(mix); } // FakeArray
              function U(v) { if (v in esc) { return esc[v]; }
                              return "\\u" + ("0000" + v.charCodeAt(0).toString(16)).slice(-4); }
              function F(mix) {
                var i = 0, z = rv.length, sz;
                if (mix === null) { rv[z] = "null"; return; }
                if (uu.isB(mix) || uu.isN(mix)) {
                  rv[z] = mix.toString(); return;
                }
                if (uu.isS(mix)) {
                  rv[z] = '"' + mix.replace(re, U) + '"';
                  return;
                }
                if (uu.isA(mix) || isFake(mix)) {
                  rv[z] = "[";
                  for (sz = mix.length; i < sz; ++i) {
                    F(mix[i]);
                    rv[rv.length] = ",";
                  }
                  rv[rv.length - (i ? 1 : 0)] = "]";
                  return;
                }
                if (typeof mix === "object") {
                  rv[z] = "{";
                  for (i in mix) {
                    rv[rv.length] = '"' + i.replace(re, U) + '":';
                    F(mix[i]);
                    rv[rv.length] = ",";
                  }
                  rv[rv.length - (i ? 1 : 0)] = "}";
                  return;
                }
                if (!fn(rv, mix)) { throw TypeError("dirty"); }
              };
              F(mix);
              return rv.join("");
            },
  decode:   function(str, force /* = false */) {
              var judge = str.replace(/"(\\.|[^"\\])*"/g, "");
              if (!(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(judge))) {
                return uu.module.evaljs(str);
              }
              return false;
            }
});
uu.mix(uu.module.codec.htmlEntity, {
  // uu.module.codec.htmlEntity.encode
  encode:   function(str) { // HTML( "&", "<", ">" ) to HTMLEntity( "&amp;", "&lt;", "&gt;" )
              return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            },
  // uu.module.codec.htmlEntity.decode
  decode:   function(str) { // HTMLEntity( "&amp;", "&lt;", "&gt;" ) to HTML( "&", "<", ">" )
              return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
            }
});
uu.mix(uu.module.codec.lineBreak, {
  encode:   function(str) { // line break( "\n" ) to <br />
              return str.replace(/(\r\n|\r|\n)/g, "<br />");
            },
  decode:   function(str) { // <br /> to line break( "\n" )
              return str.replace(/<br[^>]*?>/ig, "\n");
            }
});
uu.mix(uu.module.codec.utf8, {
  // uu.module.codec.utf8.encode
  encode:   function(ucs2) { // UCS2 to UTF8ByteArray
              if (!uu.isS(ucs2) || !ucs2.length) { return ucs2; }

              var rv = [], sz = ucs2.length, c = 0, i = 0;
              for (; i < sz; ++i) {
                c = ucs2.charCodeAt(i);
                if (c < 0x0080) { // ASCII
                  rv.push(c & 0x7f);
                } else if (c < 0x0800) {
                  rv.push(((c >>>  6) & 0x1f) | 0xc0, (c & 0x3f) | 0x80);
                } else { // if (c < 0x10000)
                  rv.push(((c >>> 12) & 0x0f) | 0xe0,
                          ((c >>>  6) & 0x3f) | 0x80, (c & 0x3f) | 0x80);
                }
              }
              return rv; // UTF8ByteArray
            },
  // uu.module.codec.utf8.decode - UTF8ByteArrayからJavaScript文字列(UCS2)を生成する
  decode:   function(ary /* ByteArray */) {
              if (!ary.length) { return ""; }

              var rv = [], sz = ary.length, c = 0, i = 0;
              for (; i < sz; ++i) {
                c = ary[i]; // 1st byte
                if (c < 0x80) { // ASCII
                  rv.push(String.fromCharCode(c));
                } else if (c < 0xe0) {
                  c = (c & 0x1f) << 6
                    | (ary[++i] & 0x3f);
                  rv.push(String.fromCharCode(c));
                } else if (c < 0xf0) {
                  c = (c & 0x0f) << 12
                    | (ary[++i] & 0x3f) << 6
                    | (ary[++i] & 0x3f);
                  rv.push(String.fromCharCode(c));
                }
              }
              return rv.join(""); // JavaScript String(UCS2)
            }
});
// JavaScript String(UCS2)
uu.mix(uu.module.codec.text, {
  // uu.module.codec.text.encode
  encode:   function(str) { // JavaScript String(UCS2) → UTF8 → URLSafe64
              var me = uu.module.codec;
              return me.base64.encode(me.utf8.encode(str), 1); // URLSafe64String(Base64)
            },
  // uu.module.codec.text.decode
  decode:   function(urlsafe64) { // URLSafe64 → UTF8 → JavaScript String(UCS2)
              var me = uu.module.codec;
              return me.utf8.decode(me.base64.decode(urlsafe64)); // JavaScriptString(UCS2)
            }
});

})(); // end (function())()
