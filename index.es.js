import * as j from "react";
import _e, { forwardRef as de, useContext as U, useRef as se, useMemo as He, useEffect as Ue, memo as ze, createElement as ir, useCallback as ht } from "react";
import Vr from "isomorphic-dompurify";
import { observable as X, tracking as mt, computeSelector as hr, isFunction as ce, isArray as Yr, computed as gt, observe as vt, trackSelector as bt, isPrimitive as yt, isEmpty as St, isObservable as Er, internal as xt, optimized as wt, getNode as Et, findIDKey as Dt, isPromise as kt, opaqueObject as we } from "@legendapp/state";
var $e = { exports: {} }, ye = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Dr;
function _t() {
  if (Dr) return ye;
  Dr = 1;
  var e = Symbol.for("react.transitional.element"), r = Symbol.for("react.fragment");
  function t(n, o, a) {
    var i = null;
    if (a !== void 0 && (i = "" + a), o.key !== void 0 && (i = "" + o.key), "key" in o) {
      a = {};
      for (var c in o)
        c !== "key" && (a[c] = o[c]);
    } else a = o;
    return o = a.ref, {
      $$typeof: e,
      type: n,
      key: i,
      ref: o !== void 0 ? o : null,
      props: a
    };
  }
  return ye.Fragment = r, ye.jsx = t, ye.jsxs = t, ye;
}
var Se = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var kr;
function Ct() {
  return kr || (kr = 1, process.env.NODE_ENV !== "production" && function() {
    function e(b) {
      if (b == null) return null;
      if (typeof b == "function")
        return b.$$typeof === q ? null : b.displayName || b.name || null;
      if (typeof b == "string") return b;
      switch (b) {
        case d:
          return "Fragment";
        case S:
          return "Profiler";
        case m:
          return "StrictMode";
        case h:
          return "Suspense";
        case w:
          return "SuspenseList";
        case M:
          return "Activity";
      }
      if (typeof b == "object")
        switch (typeof b.tag == "number" && console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), b.$$typeof) {
          case s:
            return "Portal";
          case g:
            return (b.displayName || "Context") + ".Provider";
          case E:
            return (b._context.displayName || "Context") + ".Consumer";
          case x:
            var C = b.render;
            return b = b.displayName, b || (b = C.displayName || C.name || "", b = b !== "" ? "ForwardRef(" + b + ")" : "ForwardRef"), b;
          case D:
            return C = b.displayName || null, C !== null ? C : e(b.type) || "Memo";
          case $:
            C = b._payload, b = b._init;
            try {
              return e(b(C));
            } catch {
            }
        }
      return null;
    }
    function r(b) {
      return "" + b;
    }
    function t(b) {
      try {
        r(b);
        var C = !1;
      } catch {
        C = !0;
      }
      if (C) {
        C = console;
        var R = C.error, L = typeof Symbol == "function" && Symbol.toStringTag && b[Symbol.toStringTag] || b.constructor.name || "Object";
        return R.call(
          C,
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          L
        ), r(b);
      }
    }
    function n(b) {
      if (b === d) return "<>";
      if (typeof b == "object" && b !== null && b.$$typeof === $)
        return "<...>";
      try {
        var C = e(b);
        return C ? "<" + C + ">" : "<...>";
      } catch {
        return "<...>";
      }
    }
    function o() {
      var b = H.A;
      return b === null ? null : b.getOwner();
    }
    function a() {
      return Error("react-stack-top-frame");
    }
    function i(b) {
      if (Ae.call(b, "key")) {
        var C = Object.getOwnPropertyDescriptor(b, "key").get;
        if (C && C.isReactWarning) return !1;
      }
      return b.key !== void 0;
    }
    function c(b, C) {
      function R() {
        Oe || (Oe = !0, console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          C
        ));
      }
      R.isReactWarning = !0, Object.defineProperty(b, "key", {
        get: R,
        configurable: !0
      });
    }
    function u() {
      var b = e(this.type);
      return Pe[b] || (Pe[b] = !0, console.error(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), b = this.props.ref, b !== void 0 ? b : null;
    }
    function l(b, C, R, L, Q, G, ge, ve) {
      return R = G.ref, b = {
        $$typeof: f,
        type: b,
        key: C,
        props: G,
        _owner: Q
      }, (R !== void 0 ? R : null) !== null ? Object.defineProperty(b, "ref", {
        enumerable: !1,
        get: u
      }) : Object.defineProperty(b, "ref", { enumerable: !1, value: null }), b._store = {}, Object.defineProperty(b._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(b, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.defineProperty(b, "_debugStack", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: ge
      }), Object.defineProperty(b, "_debugTask", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: ve
      }), Object.freeze && (Object.freeze(b.props), Object.freeze(b)), b;
    }
    function v(b, C, R, L, Q, G, ge, ve) {
      var I = C.children;
      if (I !== void 0)
        if (L)
          if (Qe(I)) {
            for (L = 0; L < I.length; L++)
              p(I[L]);
            Object.freeze && Object.freeze(I);
          } else
            console.error(
              "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
            );
        else p(I);
      if (Ae.call(C, "key")) {
        I = e(b);
        var ne = Object.keys(C).filter(function(er) {
          return er !== "key";
        });
        L = 0 < ne.length ? "{key: someKey, " + ne.join(": ..., ") + ": ...}" : "{key: someKey}", Me[I + L] || (ne = 0 < ne.length ? "{" + ne.join(": ..., ") + ": ...}" : "{}", console.error(
          `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
          L,
          I,
          ne,
          I
        ), Me[I + L] = !0);
      }
      if (I = null, R !== void 0 && (t(R), I = "" + R), i(C) && (t(C.key), I = "" + C.key), "key" in C) {
        R = {};
        for (var be in C)
          be !== "key" && (R[be] = C[be]);
      } else R = C;
      return I && c(
        R,
        typeof b == "function" ? b.displayName || b.name || "Unknown" : b
      ), l(
        b,
        I,
        G,
        Q,
        o(),
        R,
        ge,
        ve
      );
    }
    function p(b) {
      typeof b == "object" && b !== null && b.$$typeof === f && b._store && (b._store.validated = 1);
    }
    var y = _e, f = Symbol.for("react.transitional.element"), s = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), m = Symbol.for("react.strict_mode"), S = Symbol.for("react.profiler"), E = Symbol.for("react.consumer"), g = Symbol.for("react.context"), x = Symbol.for("react.forward_ref"), h = Symbol.for("react.suspense"), w = Symbol.for("react.suspense_list"), D = Symbol.for("react.memo"), $ = Symbol.for("react.lazy"), M = Symbol.for("react.activity"), q = Symbol.for("react.client.reference"), H = y.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, Ae = Object.prototype.hasOwnProperty, Qe = Array.isArray, he = console.createTask ? console.createTask : function() {
      return null;
    };
    y = {
      "react-stack-bottom-frame": function(b) {
        return b();
      }
    };
    var Oe, Pe = {}, Re = y["react-stack-bottom-frame"].bind(
      y,
      a
    )(), me = he(n(a)), Me = {};
    Se.Fragment = d, Se.jsx = function(b, C, R, L, Q) {
      var G = 1e4 > H.recentlyCreatedOwnerStacks++;
      return v(
        b,
        C,
        R,
        !1,
        L,
        Q,
        G ? Error("react-stack-top-frame") : Re,
        G ? he(n(b)) : me
      );
    }, Se.jsxs = function(b, C, R, L, Q) {
      var G = 1e4 > H.recentlyCreatedOwnerStacks++;
      return v(
        b,
        C,
        R,
        !0,
        L,
        Q,
        G ? Error("react-stack-top-frame") : Re,
        G ? he(n(b)) : me
      );
    };
  }()), Se;
}
var _r;
function Tt() {
  return _r || (_r = 1, process.env.NODE_ENV === "production" ? $e.exports = _t() : $e.exports = Ct()), $e.exports;
}
var oe = Tt();
function Bt(e) {
  if (e.sheet)
    return e.sheet;
  for (var r = 0; r < document.styleSheets.length; r++)
    if (document.styleSheets[r].ownerNode === e)
      return document.styleSheets[r];
}
function At(e) {
  var r = document.createElement("style");
  return r.setAttribute("data-emotion", e.key), e.nonce !== void 0 && r.setAttribute("nonce", e.nonce), r.appendChild(document.createTextNode("")), r.setAttribute("data-s", ""), r;
}
var Ot = /* @__PURE__ */ function() {
  function e(t) {
    var n = this;
    this._insertTag = function(o) {
      var a;
      n.tags.length === 0 ? n.insertionPoint ? a = n.insertionPoint.nextSibling : n.prepend ? a = n.container.firstChild : a = n.before : a = n.tags[n.tags.length - 1].nextSibling, n.container.insertBefore(o, a), n.tags.push(o);
    }, this.isSpeedy = t.speedy === void 0 ? !0 : t.speedy, this.tags = [], this.ctr = 0, this.nonce = t.nonce, this.key = t.key, this.container = t.container, this.prepend = t.prepend, this.insertionPoint = t.insertionPoint, this.before = null;
  }
  var r = e.prototype;
  return r.hydrate = function(n) {
    n.forEach(this._insertTag);
  }, r.insert = function(n) {
    this.ctr % (this.isSpeedy ? 65e3 : 1) === 0 && this._insertTag(At(this));
    var o = this.tags[this.tags.length - 1];
    if (this.isSpeedy) {
      var a = Bt(o);
      try {
        a.insertRule(n, a.cssRules.length);
      } catch {
      }
    } else
      o.appendChild(document.createTextNode(n));
    this.ctr++;
  }, r.flush = function() {
    this.tags.forEach(function(n) {
      var o;
      return (o = n.parentNode) == null ? void 0 : o.removeChild(n);
    }), this.tags = [], this.ctr = 0;
  }, e;
}(), W = "-ms-", Ve = "-moz-", B = "-webkit-", qr = "comm", mr = "rule", gr = "decl", Pt = "@import", Hr = "@keyframes", Rt = "@layer", Mt = Math.abs, Ge = String.fromCharCode, Nt = Object.assign;
function $t(e, r) {
  return F(e, 0) ^ 45 ? (((r << 2 ^ F(e, 0)) << 2 ^ F(e, 1)) << 2 ^ F(e, 2)) << 2 ^ F(e, 3) : 0;
}
function Gr(e) {
  return e.trim();
}
function Lt(e, r) {
  return (e = r.exec(e)) ? e[0] : e;
}
function A(e, r, t) {
  return e.replace(r, t);
}
function sr(e, r) {
  return e.indexOf(r);
}
function F(e, r) {
  return e.charCodeAt(r) | 0;
}
function Ee(e, r, t) {
  return e.slice(r, t);
}
function ee(e) {
  return e.length;
}
function vr(e) {
  return e.length;
}
function Le(e, r) {
  return r.push(e), e;
}
function It(e, r) {
  return e.map(r).join("");
}
var Je = 1, ue = 1, Jr = 0, V = 0, N = 0, pe = "";
function Ke(e, r, t, n, o, a, i) {
  return { value: e, root: r, parent: t, type: n, props: o, children: a, line: Je, column: ue, length: i, return: "" };
}
function xe(e, r) {
  return Nt(Ke("", null, null, "", null, null, 0), e, { length: -e.length }, r);
}
function Ft() {
  return N;
}
function Wt() {
  return N = V > 0 ? F(pe, --V) : 0, ue--, N === 10 && (ue = 1, Je--), N;
}
function Y() {
  return N = V < Jr ? F(pe, V++) : 0, ue++, N === 10 && (ue = 1, Je++), N;
}
function te() {
  return F(pe, V);
}
function Fe() {
  return V;
}
function Ce(e, r) {
  return Ee(pe, e, r);
}
function De(e) {
  switch (e) {
    // \0 \t \n \r \s whitespace token
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    // ! + , / > @ ~ isolate token
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    // ; { } breakpoint token
    case 59:
    case 123:
    case 125:
      return 4;
    // : accompanied token
    case 58:
      return 3;
    // " ' ( [ opening delimit token
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    // ) ] closing delimit token
    case 41:
    case 93:
      return 1;
  }
  return 0;
}
function Kr(e) {
  return Je = ue = 1, Jr = ee(pe = e), V = 0, [];
}
function Xr(e) {
  return pe = "", e;
}
function We(e) {
  return Gr(Ce(V - 1, cr(e === 91 ? e + 2 : e === 40 ? e + 1 : e)));
}
function jt(e) {
  for (; (N = te()) && N < 33; )
    Y();
  return De(e) > 2 || De(N) > 3 ? "" : " ";
}
function Ut(e, r) {
  for (; --r && Y() && !(N < 48 || N > 102 || N > 57 && N < 65 || N > 70 && N < 97); )
    ;
  return Ce(e, Fe() + (r < 6 && te() == 32 && Y() == 32));
}
function cr(e) {
  for (; Y(); )
    switch (N) {
      // ] ) " '
      case e:
        return V;
      // " '
      case 34:
      case 39:
        e !== 34 && e !== 39 && cr(N);
        break;
      // (
      case 40:
        e === 41 && cr(e);
        break;
      // \
      case 92:
        Y();
        break;
    }
  return V;
}
function zt(e, r) {
  for (; Y() && e + N !== 57; )
    if (e + N === 84 && te() === 47)
      break;
  return "/*" + Ce(r, V - 1) + "*" + Ge(e === 47 ? e : Y());
}
function Vt(e) {
  for (; !De(te()); )
    Y();
  return Ce(e, V);
}
function Yt(e) {
  return Xr(je("", null, null, null, [""], e = Kr(e), 0, [0], e));
}
function je(e, r, t, n, o, a, i, c, u) {
  for (var l = 0, v = 0, p = i, y = 0, f = 0, s = 0, d = 1, m = 1, S = 1, E = 0, g = "", x = o, h = a, w = n, D = g; m; )
    switch (s = E, E = Y()) {
      // (
      case 40:
        if (s != 108 && F(D, p - 1) == 58) {
          sr(D += A(We(E), "&", "&\f"), "&\f") != -1 && (S = -1);
          break;
        }
      // " ' [
      case 34:
      case 39:
      case 91:
        D += We(E);
        break;
      // \t \n \r \s
      case 9:
      case 10:
      case 13:
      case 32:
        D += jt(s);
        break;
      // \
      case 92:
        D += Ut(Fe() - 1, 7);
        continue;
      // /
      case 47:
        switch (te()) {
          case 42:
          case 47:
            Le(qt(zt(Y(), Fe()), r, t), u);
            break;
          default:
            D += "/";
        }
        break;
      // {
      case 123 * d:
        c[l++] = ee(D) * S;
      // } ; \0
      case 125 * d:
      case 59:
      case 0:
        switch (E) {
          // \0 }
          case 0:
          case 125:
            m = 0;
          // ;
          case 59 + v:
            S == -1 && (D = A(D, /\f/g, "")), f > 0 && ee(D) - p && Le(f > 32 ? Tr(D + ";", n, t, p - 1) : Tr(A(D, " ", "") + ";", n, t, p - 2), u);
            break;
          // @ ;
          case 59:
            D += ";";
          // { rule/at-rule
          default:
            if (Le(w = Cr(D, r, t, l, v, o, c, g, x = [], h = [], p), a), E === 123)
              if (v === 0)
                je(D, r, w, w, x, a, p, c, h);
              else
                switch (y === 99 && F(D, 3) === 110 ? 100 : y) {
                  // d l m s
                  case 100:
                  case 108:
                  case 109:
                  case 115:
                    je(e, w, w, n && Le(Cr(e, w, w, 0, 0, o, c, g, o, x = [], p), h), o, h, p, c, n ? x : h);
                    break;
                  default:
                    je(D, w, w, w, [""], h, 0, c, h);
                }
        }
        l = v = f = 0, d = S = 1, g = D = "", p = i;
        break;
      // :
      case 58:
        p = 1 + ee(D), f = s;
      default:
        if (d < 1) {
          if (E == 123)
            --d;
          else if (E == 125 && d++ == 0 && Wt() == 125)
            continue;
        }
        switch (D += Ge(E), E * d) {
          // &
          case 38:
            S = v > 0 ? 1 : (D += "\f", -1);
            break;
          // ,
          case 44:
            c[l++] = (ee(D) - 1) * S, S = 1;
            break;
          // @
          case 64:
            te() === 45 && (D += We(Y())), y = te(), v = p = ee(g = D += Vt(Fe())), E++;
            break;
          // -
          case 45:
            s === 45 && ee(D) == 2 && (d = 0);
        }
    }
  return a;
}
function Cr(e, r, t, n, o, a, i, c, u, l, v) {
  for (var p = o - 1, y = o === 0 ? a : [""], f = vr(y), s = 0, d = 0, m = 0; s < n; ++s)
    for (var S = 0, E = Ee(e, p + 1, p = Mt(d = i[s])), g = e; S < f; ++S)
      (g = Gr(d > 0 ? y[S] + " " + E : A(E, /&\f/g, y[S]))) && (u[m++] = g);
  return Ke(e, r, t, o === 0 ? mr : c, u, l, v);
}
function qt(e, r, t) {
  return Ke(e, r, t, qr, Ge(Ft()), Ee(e, 2, -2), 0);
}
function Tr(e, r, t, n) {
  return Ke(e, r, t, gr, Ee(e, 0, n), Ee(e, n + 1, -1), n);
}
function le(e, r) {
  for (var t = "", n = vr(e), o = 0; o < n; o++)
    t += r(e[o], o, e, r) || "";
  return t;
}
function Ht(e, r, t, n) {
  switch (e.type) {
    case Rt:
      if (e.children.length) break;
    case Pt:
    case gr:
      return e.return = e.return || e.value;
    case qr:
      return "";
    case Hr:
      return e.return = e.value + "{" + le(e.children, n) + "}";
    case mr:
      e.value = e.props.join(",");
  }
  return ee(t = le(e.children, n)) ? e.return = e.value + "{" + t + "}" : "";
}
function Gt(e) {
  var r = vr(e);
  return function(t, n, o, a) {
    for (var i = "", c = 0; c < r; c++)
      i += e[c](t, n, o, a) || "";
    return i;
  };
}
function Jt(e) {
  return function(r) {
    r.root || (r = r.return) && e(r);
  };
}
function Zr(e) {
  var r = /* @__PURE__ */ Object.create(null);
  return function(t) {
    return r[t] === void 0 && (r[t] = e(t)), r[t];
  };
}
var Kt = function(r, t, n) {
  for (var o = 0, a = 0; o = a, a = te(), o === 38 && a === 12 && (t[n] = 1), !De(a); )
    Y();
  return Ce(r, V);
}, Xt = function(r, t) {
  var n = -1, o = 44;
  do
    switch (De(o)) {
      case 0:
        o === 38 && te() === 12 && (t[n] = 1), r[n] += Kt(V - 1, t, n);
        break;
      case 2:
        r[n] += We(o);
        break;
      case 4:
        if (o === 44) {
          r[++n] = te() === 58 ? "&\f" : "", t[n] = r[n].length;
          break;
        }
      // fallthrough
      default:
        r[n] += Ge(o);
    }
  while (o = Y());
  return r;
}, Zt = function(r, t) {
  return Xr(Xt(Kr(r), t));
}, Br = /* @__PURE__ */ new WeakMap(), Qt = function(r) {
  if (!(r.type !== "rule" || !r.parent || // positive .length indicates that this rule contains pseudo
  // negative .length indicates that this rule has been already prefixed
  r.length < 1)) {
    for (var t = r.value, n = r.parent, o = r.column === n.column && r.line === n.line; n.type !== "rule"; )
      if (n = n.parent, !n) return;
    if (!(r.props.length === 1 && t.charCodeAt(0) !== 58 && !Br.get(n)) && !o) {
      Br.set(r, !0);
      for (var a = [], i = Zt(t, a), c = n.props, u = 0, l = 0; u < i.length; u++)
        for (var v = 0; v < c.length; v++, l++)
          r.props[l] = a[u] ? i[u].replace(/&\f/g, c[v]) : c[v] + " " + i[u];
    }
  }
}, en = function(r) {
  if (r.type === "decl") {
    var t = r.value;
    // charcode for l
    t.charCodeAt(0) === 108 && // charcode for b
    t.charCodeAt(2) === 98 && (r.return = "", r.value = "");
  }
};
function Qr(e, r) {
  switch ($t(e, r)) {
    // color-adjust
    case 5103:
      return B + "print-" + e + e;
    // animation, animation-(delay|direction|duration|fill-mode|iteration-count|name|play-state|timing-function)
    case 5737:
    case 4201:
    case 3177:
    case 3433:
    case 1641:
    case 4457:
    case 2921:
    // text-decoration, filter, clip-path, backface-visibility, column, box-decoration-break
    case 5572:
    case 6356:
    case 5844:
    case 3191:
    case 6645:
    case 3005:
    // mask, mask-image, mask-(mode|clip|size), mask-(repeat|origin), mask-position, mask-composite,
    case 6391:
    case 5879:
    case 5623:
    case 6135:
    case 4599:
    case 4855:
    // background-clip, columns, column-(count|fill|gap|rule|rule-color|rule-style|rule-width|span|width)
    case 4215:
    case 6389:
    case 5109:
    case 5365:
    case 5621:
    case 3829:
      return B + e + e;
    // appearance, user-select, transform, hyphens, text-size-adjust
    case 5349:
    case 4246:
    case 4810:
    case 6968:
    case 2756:
      return B + e + Ve + e + W + e + e;
    // flex, flex-direction
    case 6828:
    case 4268:
      return B + e + W + e + e;
    // order
    case 6165:
      return B + e + W + "flex-" + e + e;
    // align-items
    case 5187:
      return B + e + A(e, /(\w+).+(:[^]+)/, B + "box-$1$2" + W + "flex-$1$2") + e;
    // align-self
    case 5443:
      return B + e + W + "flex-item-" + A(e, /flex-|-self/, "") + e;
    // align-content
    case 4675:
      return B + e + W + "flex-line-pack" + A(e, /align-content|flex-|-self/, "") + e;
    // flex-shrink
    case 5548:
      return B + e + W + A(e, "shrink", "negative") + e;
    // flex-basis
    case 5292:
      return B + e + W + A(e, "basis", "preferred-size") + e;
    // flex-grow
    case 6060:
      return B + "box-" + A(e, "-grow", "") + B + e + W + A(e, "grow", "positive") + e;
    // transition
    case 4554:
      return B + A(e, /([^-])(transform)/g, "$1" + B + "$2") + e;
    // cursor
    case 6187:
      return A(A(A(e, /(zoom-|grab)/, B + "$1"), /(image-set)/, B + "$1"), e, "") + e;
    // background, background-image
    case 5495:
    case 3959:
      return A(e, /(image-set\([^]*)/, B + "$1$`$1");
    // justify-content
    case 4968:
      return A(A(e, /(.+:)(flex-)?(.*)/, B + "box-pack:$3" + W + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + B + e + e;
    // (margin|padding)-inline-(start|end)
    case 4095:
    case 3583:
    case 4068:
    case 2532:
      return A(e, /(.+)-inline(.+)/, B + "$1$2") + e;
    // (min|max)?(width|height|inline-size|block-size)
    case 8116:
    case 7059:
    case 5753:
    case 5535:
    case 5445:
    case 5701:
    case 4933:
    case 4677:
    case 5533:
    case 5789:
    case 5021:
    case 4765:
      if (ee(e) - 1 - r > 6) switch (F(e, r + 1)) {
        // (m)ax-content, (m)in-content
        case 109:
          if (F(e, r + 4) !== 45) break;
        // (f)ill-available, (f)it-content
        case 102:
          return A(e, /(.+:)(.+)-([^]+)/, "$1" + B + "$2-$3$1" + Ve + (F(e, r + 3) == 108 ? "$3" : "$2-$3")) + e;
        // (s)tretch
        case 115:
          return ~sr(e, "stretch") ? Qr(A(e, "stretch", "fill-available"), r) + e : e;
      }
      break;
    // position: sticky
    case 4949:
      if (F(e, r + 1) !== 115) break;
    // display: (flex|inline-flex)
    case 6444:
      switch (F(e, ee(e) - 3 - (~sr(e, "!important") && 10))) {
        // stic(k)y
        case 107:
          return A(e, ":", ":" + B) + e;
        // (inline-)?fl(e)x
        case 101:
          return A(e, /(.+:)([^;!]+)(;|!.+)?/, "$1" + B + (F(e, 14) === 45 ? "inline-" : "") + "box$3$1" + B + "$2$3$1" + W + "$2box$3") + e;
      }
      break;
    // writing-mode
    case 5936:
      switch (F(e, r + 11)) {
        // vertical-l(r)
        case 114:
          return B + e + W + A(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
        // vertical-r(l)
        case 108:
          return B + e + W + A(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
        // horizontal(-)tb
        case 45:
          return B + e + W + A(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
      }
      return B + e + W + e + e;
  }
  return e;
}
var rn = function(r, t, n, o) {
  if (r.length > -1 && !r.return) switch (r.type) {
    case gr:
      r.return = Qr(r.value, r.length);
      break;
    case Hr:
      return le([xe(r, {
        value: A(r.value, "@", "@" + B)
      })], o);
    case mr:
      if (r.length) return It(r.props, function(a) {
        switch (Lt(a, /(::plac\w+|:read-\w+)/)) {
          // :read-(only|write)
          case ":read-only":
          case ":read-write":
            return le([xe(r, {
              props: [A(a, /:(read-\w+)/, ":" + Ve + "$1")]
            })], o);
          // :placeholder
          case "::placeholder":
            return le([xe(r, {
              props: [A(a, /:(plac\w+)/, ":" + B + "input-$1")]
            }), xe(r, {
              props: [A(a, /:(plac\w+)/, ":" + Ve + "$1")]
            }), xe(r, {
              props: [A(a, /:(plac\w+)/, W + "input-$1")]
            })], o);
        }
        return "";
      });
  }
}, tn = [rn], nn = function(r) {
  var t = r.key;
  if (t === "css") {
    var n = document.querySelectorAll("style[data-emotion]:not([data-s])");
    Array.prototype.forEach.call(n, function(d) {
      var m = d.getAttribute("data-emotion");
      m.indexOf(" ") !== -1 && (document.head.appendChild(d), d.setAttribute("data-s", ""));
    });
  }
  var o = r.stylisPlugins || tn, a = {}, i, c = [];
  i = r.container || document.head, Array.prototype.forEach.call(
    // this means we will ignore elements which don't have a space in them which
    // means that the style elements we're looking at are only Emotion 11 server-rendered style elements
    document.querySelectorAll('style[data-emotion^="' + t + ' "]'),
    function(d) {
      for (var m = d.getAttribute("data-emotion").split(" "), S = 1; S < m.length; S++)
        a[m[S]] = !0;
      c.push(d);
    }
  );
  var u, l = [Qt, en];
  {
    var v, p = [Ht, Jt(function(d) {
      v.insert(d);
    })], y = Gt(l.concat(o, p)), f = function(m) {
      return le(Yt(m), y);
    };
    u = function(m, S, E, g) {
      v = E, f(m ? m + "{" + S.styles + "}" : S.styles), g && (s.inserted[S.name] = !0);
    };
  }
  var s = {
    key: t,
    sheet: new Ot({
      key: t,
      container: i,
      nonce: r.nonce,
      speedy: r.speedy,
      prepend: r.prepend,
      insertionPoint: r.insertionPoint
    }),
    nonce: r.nonce,
    inserted: a,
    registered: {},
    insert: u
  };
  return s.sheet.hydrate(c), s;
};
function dr() {
  return dr = Object.assign ? Object.assign.bind() : function(e) {
    for (var r = 1; r < arguments.length; r++) {
      var t = arguments[r];
      for (var n in t) ({}).hasOwnProperty.call(t, n) && (e[n] = t[n]);
    }
    return e;
  }, dr.apply(null, arguments);
}
var Ie = { exports: {} }, O = {};
/** @license React v16.13.1
 * react-is.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ar;
function on() {
  if (Ar) return O;
  Ar = 1;
  var e = typeof Symbol == "function" && Symbol.for, r = e ? Symbol.for("react.element") : 60103, t = e ? Symbol.for("react.portal") : 60106, n = e ? Symbol.for("react.fragment") : 60107, o = e ? Symbol.for("react.strict_mode") : 60108, a = e ? Symbol.for("react.profiler") : 60114, i = e ? Symbol.for("react.provider") : 60109, c = e ? Symbol.for("react.context") : 60110, u = e ? Symbol.for("react.async_mode") : 60111, l = e ? Symbol.for("react.concurrent_mode") : 60111, v = e ? Symbol.for("react.forward_ref") : 60112, p = e ? Symbol.for("react.suspense") : 60113, y = e ? Symbol.for("react.suspense_list") : 60120, f = e ? Symbol.for("react.memo") : 60115, s = e ? Symbol.for("react.lazy") : 60116, d = e ? Symbol.for("react.block") : 60121, m = e ? Symbol.for("react.fundamental") : 60117, S = e ? Symbol.for("react.responder") : 60118, E = e ? Symbol.for("react.scope") : 60119;
  function g(h) {
    if (typeof h == "object" && h !== null) {
      var w = h.$$typeof;
      switch (w) {
        case r:
          switch (h = h.type, h) {
            case u:
            case l:
            case n:
            case a:
            case o:
            case p:
              return h;
            default:
              switch (h = h && h.$$typeof, h) {
                case c:
                case v:
                case s:
                case f:
                case i:
                  return h;
                default:
                  return w;
              }
          }
        case t:
          return w;
      }
    }
  }
  function x(h) {
    return g(h) === l;
  }
  return O.AsyncMode = u, O.ConcurrentMode = l, O.ContextConsumer = c, O.ContextProvider = i, O.Element = r, O.ForwardRef = v, O.Fragment = n, O.Lazy = s, O.Memo = f, O.Portal = t, O.Profiler = a, O.StrictMode = o, O.Suspense = p, O.isAsyncMode = function(h) {
    return x(h) || g(h) === u;
  }, O.isConcurrentMode = x, O.isContextConsumer = function(h) {
    return g(h) === c;
  }, O.isContextProvider = function(h) {
    return g(h) === i;
  }, O.isElement = function(h) {
    return typeof h == "object" && h !== null && h.$$typeof === r;
  }, O.isForwardRef = function(h) {
    return g(h) === v;
  }, O.isFragment = function(h) {
    return g(h) === n;
  }, O.isLazy = function(h) {
    return g(h) === s;
  }, O.isMemo = function(h) {
    return g(h) === f;
  }, O.isPortal = function(h) {
    return g(h) === t;
  }, O.isProfiler = function(h) {
    return g(h) === a;
  }, O.isStrictMode = function(h) {
    return g(h) === o;
  }, O.isSuspense = function(h) {
    return g(h) === p;
  }, O.isValidElementType = function(h) {
    return typeof h == "string" || typeof h == "function" || h === n || h === l || h === a || h === o || h === p || h === y || typeof h == "object" && h !== null && (h.$$typeof === s || h.$$typeof === f || h.$$typeof === i || h.$$typeof === c || h.$$typeof === v || h.$$typeof === m || h.$$typeof === S || h.$$typeof === E || h.$$typeof === d);
  }, O.typeOf = g, O;
}
var P = {};
/** @license React v16.13.1
 * react-is.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Or;
function an() {
  return Or || (Or = 1, process.env.NODE_ENV !== "production" && function() {
    var e = typeof Symbol == "function" && Symbol.for, r = e ? Symbol.for("react.element") : 60103, t = e ? Symbol.for("react.portal") : 60106, n = e ? Symbol.for("react.fragment") : 60107, o = e ? Symbol.for("react.strict_mode") : 60108, a = e ? Symbol.for("react.profiler") : 60114, i = e ? Symbol.for("react.provider") : 60109, c = e ? Symbol.for("react.context") : 60110, u = e ? Symbol.for("react.async_mode") : 60111, l = e ? Symbol.for("react.concurrent_mode") : 60111, v = e ? Symbol.for("react.forward_ref") : 60112, p = e ? Symbol.for("react.suspense") : 60113, y = e ? Symbol.for("react.suspense_list") : 60120, f = e ? Symbol.for("react.memo") : 60115, s = e ? Symbol.for("react.lazy") : 60116, d = e ? Symbol.for("react.block") : 60121, m = e ? Symbol.for("react.fundamental") : 60117, S = e ? Symbol.for("react.responder") : 60118, E = e ? Symbol.for("react.scope") : 60119;
    function g(k) {
      return typeof k == "string" || typeof k == "function" || // Note: its typeof might be other than 'symbol' or 'number' if it's a polyfill.
      k === n || k === l || k === a || k === o || k === p || k === y || typeof k == "object" && k !== null && (k.$$typeof === s || k.$$typeof === f || k.$$typeof === i || k.$$typeof === c || k.$$typeof === v || k.$$typeof === m || k.$$typeof === S || k.$$typeof === E || k.$$typeof === d);
    }
    function x(k) {
      if (typeof k == "object" && k !== null) {
        var rr = k.$$typeof;
        switch (rr) {
          case r:
            var Ne = k.type;
            switch (Ne) {
              case u:
              case l:
              case n:
              case a:
              case o:
              case p:
                return Ne;
              default:
                var wr = Ne && Ne.$$typeof;
                switch (wr) {
                  case c:
                  case v:
                  case s:
                  case f:
                  case i:
                    return wr;
                  default:
                    return rr;
                }
            }
          case t:
            return rr;
        }
      }
    }
    var h = u, w = l, D = c, $ = i, M = r, q = v, H = n, Ae = s, Qe = f, he = t, Oe = a, Pe = o, Re = p, me = !1;
    function Me(k) {
      return me || (me = !0, console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 17+. Update your code to use ReactIs.isConcurrentMode() instead. It has the exact same API.")), b(k) || x(k) === u;
    }
    function b(k) {
      return x(k) === l;
    }
    function C(k) {
      return x(k) === c;
    }
    function R(k) {
      return x(k) === i;
    }
    function L(k) {
      return typeof k == "object" && k !== null && k.$$typeof === r;
    }
    function Q(k) {
      return x(k) === v;
    }
    function G(k) {
      return x(k) === n;
    }
    function ge(k) {
      return x(k) === s;
    }
    function ve(k) {
      return x(k) === f;
    }
    function I(k) {
      return x(k) === t;
    }
    function ne(k) {
      return x(k) === a;
    }
    function be(k) {
      return x(k) === o;
    }
    function er(k) {
      return x(k) === p;
    }
    P.AsyncMode = h, P.ConcurrentMode = w, P.ContextConsumer = D, P.ContextProvider = $, P.Element = M, P.ForwardRef = q, P.Fragment = H, P.Lazy = Ae, P.Memo = Qe, P.Portal = he, P.Profiler = Oe, P.StrictMode = Pe, P.Suspense = Re, P.isAsyncMode = Me, P.isConcurrentMode = b, P.isContextConsumer = C, P.isContextProvider = R, P.isElement = L, P.isForwardRef = Q, P.isFragment = G, P.isLazy = ge, P.isMemo = ve, P.isPortal = I, P.isProfiler = ne, P.isStrictMode = be, P.isSuspense = er, P.isValidElementType = g, P.typeOf = x;
  }()), P;
}
var Pr;
function sn() {
  return Pr || (Pr = 1, process.env.NODE_ENV === "production" ? Ie.exports = on() : Ie.exports = an()), Ie.exports;
}
var tr, Rr;
function cn() {
  if (Rr) return tr;
  Rr = 1;
  var e = sn(), r = {
    childContextTypes: !0,
    contextType: !0,
    contextTypes: !0,
    defaultProps: !0,
    displayName: !0,
    getDefaultProps: !0,
    getDerivedStateFromError: !0,
    getDerivedStateFromProps: !0,
    mixins: !0,
    propTypes: !0,
    type: !0
  }, t = {
    name: !0,
    length: !0,
    prototype: !0,
    caller: !0,
    callee: !0,
    arguments: !0,
    arity: !0
  }, n = {
    $$typeof: !0,
    render: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0
  }, o = {
    $$typeof: !0,
    compare: !0,
    defaultProps: !0,
    displayName: !0,
    propTypes: !0,
    type: !0
  }, a = {};
  a[e.ForwardRef] = n, a[e.Memo] = o;
  function i(s) {
    return e.isMemo(s) ? o : a[s.$$typeof] || r;
  }
  var c = Object.defineProperty, u = Object.getOwnPropertyNames, l = Object.getOwnPropertySymbols, v = Object.getOwnPropertyDescriptor, p = Object.getPrototypeOf, y = Object.prototype;
  function f(s, d, m) {
    if (typeof d != "string") {
      if (y) {
        var S = p(d);
        S && S !== y && f(s, S, m);
      }
      var E = u(d);
      l && (E = E.concat(l(d)));
      for (var g = i(s), x = i(d), h = 0; h < E.length; ++h) {
        var w = E[h];
        if (!t[w] && !(m && m[w]) && !(x && x[w]) && !(g && g[w])) {
          var D = v(d, w);
          try {
            c(s, w, D);
          } catch {
          }
        }
      }
    }
    return s;
  }
  return tr = f, tr;
}
cn();
var dn = !0;
function et(e, r, t) {
  var n = "";
  return t.split(" ").forEach(function(o) {
    e[o] !== void 0 ? r.push(e[o] + ";") : o && (n += o + " ");
  }), n;
}
var br = function(r, t, n) {
  var o = r.key + "-" + t.name;
  // we only need to add the styles to the registered cache if the
  // class name could be used further down
  // the tree but if it's a string tag, we know it won't
  // so we don't have to add it to registered cache.
  // this improves memory usage since we can avoid storing the whole style string
  (n === !1 || // we need to always store it if we're in compat mode and
  // in node since emotion-server relies on whether a style is in
  // the registered cache to know whether a style is global or not
  // also, note that this check will be dead code eliminated in the browser
  dn === !1) && r.registered[o] === void 0 && (r.registered[o] = t.styles);
}, rt = function(r, t, n) {
  br(r, t, n);
  var o = r.key + "-" + t.name;
  if (r.inserted[t.name] === void 0) {
    var a = t;
    do
      r.insert(t === a ? "." + o : "", a, r.sheet, !0), a = a.next;
    while (a !== void 0);
  }
};
function ln(e) {
  for (var r = 0, t, n = 0, o = e.length; o >= 4; ++n, o -= 4)
    t = e.charCodeAt(n) & 255 | (e.charCodeAt(++n) & 255) << 8 | (e.charCodeAt(++n) & 255) << 16 | (e.charCodeAt(++n) & 255) << 24, t = /* Math.imul(k, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16), t ^= /* k >>> r: */
    t >>> 24, r = /* Math.imul(k, m): */
    (t & 65535) * 1540483477 + ((t >>> 16) * 59797 << 16) ^ /* Math.imul(h, m): */
    (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16);
  switch (o) {
    case 3:
      r ^= (e.charCodeAt(n + 2) & 255) << 16;
    case 2:
      r ^= (e.charCodeAt(n + 1) & 255) << 8;
    case 1:
      r ^= e.charCodeAt(n) & 255, r = /* Math.imul(h, m): */
      (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16);
  }
  return r ^= r >>> 13, r = /* Math.imul(h, m): */
  (r & 65535) * 1540483477 + ((r >>> 16) * 59797 << 16), ((r ^ r >>> 15) >>> 0).toString(36);
}
var un = {
  animationIterationCount: 1,
  aspectRatio: 1,
  borderImageOutset: 1,
  borderImageSlice: 1,
  borderImageWidth: 1,
  boxFlex: 1,
  boxFlexGroup: 1,
  boxOrdinalGroup: 1,
  columnCount: 1,
  columns: 1,
  flex: 1,
  flexGrow: 1,
  flexPositive: 1,
  flexShrink: 1,
  flexNegative: 1,
  flexOrder: 1,
  gridRow: 1,
  gridRowEnd: 1,
  gridRowSpan: 1,
  gridRowStart: 1,
  gridColumn: 1,
  gridColumnEnd: 1,
  gridColumnSpan: 1,
  gridColumnStart: 1,
  msGridRow: 1,
  msGridRowSpan: 1,
  msGridColumn: 1,
  msGridColumnSpan: 1,
  fontWeight: 1,
  lineHeight: 1,
  opacity: 1,
  order: 1,
  orphans: 1,
  scale: 1,
  tabSize: 1,
  widows: 1,
  zIndex: 1,
  zoom: 1,
  WebkitLineClamp: 1,
  // SVG-related properties
  fillOpacity: 1,
  floodOpacity: 1,
  stopOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  strokeMiterlimit: 1,
  strokeOpacity: 1,
  strokeWidth: 1
}, fn = /[A-Z]|^ms/g, pn = /_EMO_([^_]+?)_([^]*?)_EMO_/g, tt = function(r) {
  return r.charCodeAt(1) === 45;
}, Mr = function(r) {
  return r != null && typeof r != "boolean";
}, nr = /* @__PURE__ */ Zr(function(e) {
  return tt(e) ? e : e.replace(fn, "-$&").toLowerCase();
}), Nr = function(r, t) {
  switch (r) {
    case "animation":
    case "animationName":
      if (typeof t == "string")
        return t.replace(pn, function(n, o, a) {
          return re = {
            name: o,
            styles: a,
            next: re
          }, o;
        });
  }
  return un[r] !== 1 && !tt(r) && typeof t == "number" && t !== 0 ? t + "px" : t;
};
function ke(e, r, t) {
  if (t == null)
    return "";
  var n = t;
  if (n.__emotion_styles !== void 0)
    return n;
  switch (typeof t) {
    case "boolean":
      return "";
    case "object": {
      var o = t;
      if (o.anim === 1)
        return re = {
          name: o.name,
          styles: o.styles,
          next: re
        }, o.name;
      var a = t;
      if (a.styles !== void 0) {
        var i = a.next;
        if (i !== void 0)
          for (; i !== void 0; )
            re = {
              name: i.name,
              styles: i.styles,
              next: re
            }, i = i.next;
        var c = a.styles + ";";
        return c;
      }
      return hn(e, r, t);
    }
    case "function": {
      if (e !== void 0) {
        var u = re, l = t(e);
        return re = u, ke(e, r, l);
      }
      break;
    }
  }
  var v = t;
  if (r == null)
    return v;
  var p = r[v];
  return p !== void 0 ? p : v;
}
function hn(e, r, t) {
  var n = "";
  if (Array.isArray(t))
    for (var o = 0; o < t.length; o++)
      n += ke(e, r, t[o]) + ";";
  else
    for (var a in t) {
      var i = t[a];
      if (typeof i != "object") {
        var c = i;
        r != null && r[c] !== void 0 ? n += a + "{" + r[c] + "}" : Mr(c) && (n += nr(a) + ":" + Nr(a, c) + ";");
      } else if (Array.isArray(i) && typeof i[0] == "string" && (r == null || r[i[0]] === void 0))
        for (var u = 0; u < i.length; u++)
          Mr(i[u]) && (n += nr(a) + ":" + Nr(a, i[u]) + ";");
      else {
        var l = ke(e, r, i);
        switch (a) {
          case "animation":
          case "animationName": {
            n += nr(a) + ":" + l + ";";
            break;
          }
          default:
            n += a + "{" + l + "}";
        }
      }
    }
  return n;
}
var $r = /label:\s*([^\s;{]+)\s*(;|$)/g, re;
function yr(e, r, t) {
  if (e.length === 1 && typeof e[0] == "object" && e[0] !== null && e[0].styles !== void 0)
    return e[0];
  var n = !0, o = "";
  re = void 0;
  var a = e[0];
  if (a == null || a.raw === void 0)
    n = !1, o += ke(t, r, a);
  else {
    var i = a;
    o += i[0];
  }
  for (var c = 1; c < e.length; c++)
    if (o += ke(t, r, e[c]), n) {
      var u = a;
      o += u[c];
    }
  $r.lastIndex = 0;
  for (var l = "", v; (v = $r.exec(o)) !== null; )
    l += "-" + v[1];
  var p = ln(o) + l;
  return {
    name: p,
    styles: o,
    next: re
  };
}
var mn = function(r) {
  return r();
}, gn = j.useInsertionEffect ? j.useInsertionEffect : !1, nt = gn || mn, ot = /* @__PURE__ */ j.createContext(
  // we're doing this to avoid preconstruct's dead code elimination in this one case
  // because this module is primarily intended for the browser and node
  // but it's also required in react native and similar environments sometimes
  // and we could have a special build just for that
  // but this is much easier and the native packages
  // might use a different theme context in the future anyway
  typeof HTMLElement < "u" ? /* @__PURE__ */ nn({
    key: "css"
  }) : null
);
ot.Provider;
var at = function(r) {
  return /* @__PURE__ */ de(function(t, n) {
    var o = U(ot);
    return r(t, o, n);
  });
}, it = /* @__PURE__ */ j.createContext({}), Te = {}.hasOwnProperty, lr = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__", Sr = function(r, t) {
  var n = {};
  for (var o in t)
    Te.call(t, o) && (n[o] = t[o]);
  return n[lr] = r, n;
}, vn = function(r) {
  var t = r.cache, n = r.serialized, o = r.isStringTag;
  return br(t, n, o), nt(function() {
    return rt(t, n, o);
  }), null;
}, bn = /* @__PURE__ */ at(function(e, r, t) {
  var n = e.css;
  typeof n == "string" && r.registered[n] !== void 0 && (n = r.registered[n]);
  var o = e[lr], a = [n], i = "";
  typeof e.className == "string" ? i = et(r.registered, a, e.className) : e.className != null && (i = e.className + " ");
  var c = yr(a, void 0, j.useContext(it));
  i += r.key + "-" + c.name;
  var u = {};
  for (var l in e)
    Te.call(e, l) && l !== "css" && l !== lr && (u[l] = e[l]);
  return u.className = i, t && (u.ref = t), /* @__PURE__ */ j.createElement(j.Fragment, null, /* @__PURE__ */ j.createElement(vn, {
    cache: r,
    serialized: c,
    isStringTag: typeof o == "string"
  }), /* @__PURE__ */ j.createElement(o, u));
}), xr = bn, ae = oe.Fragment, T = function(r, t, n) {
  return Te.call(t, "css") ? oe.jsx(xr, Sr(r, t), n) : oe.jsx(r, t, n);
}, Xe = function(r, t, n) {
  return Te.call(t, "css") ? oe.jsxs(xr, Sr(r, t), n) : oe.jsxs(r, t, n);
}, Lr = function(r, t) {
  var n = arguments;
  if (t == null || !Te.call(t, "css"))
    return j.createElement.apply(void 0, n);
  var o = n.length, a = new Array(o);
  a[0] = xr, a[1] = Sr(r, t);
  for (var i = 2; i < o; i++)
    a[i] = n[i];
  return j.createElement.apply(null, a);
};
(function(e) {
  var r;
  r || (r = e.JSX || (e.JSX = {}));
})(Lr || (Lr = {}));
function Z() {
  for (var e = arguments.length, r = new Array(e), t = 0; t < e; t++)
    r[t] = arguments[t];
  return yr(r);
}
const Be = _e.createContext(
  {
    index: X(0),
    order: X(0),
    data: X([]),
    width: X(""),
    decorationWidth: X("")
  }
), J = _e.createContext(
  {
    theme: X({}),
    plotData: X([]),
    dataMax: X(0),
    vars: X({}),
    orientation: X(0)
  }
);
var st = { exports: {} }, or = {};
/**
 * @license React
 * use-sync-external-store-shim.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ir;
function yn() {
  if (Ir) return or;
  Ir = 1;
  var e = _e;
  function r(p, y) {
    return p === y && (p !== 0 || 1 / p === 1 / y) || p !== p && y !== y;
  }
  var t = typeof Object.is == "function" ? Object.is : r, n = e.useState, o = e.useEffect, a = e.useLayoutEffect, i = e.useDebugValue;
  function c(p, y) {
    var f = y(), s = n({ inst: { value: f, getSnapshot: y } }), d = s[0].inst, m = s[1];
    return a(function() {
      d.value = f, d.getSnapshot = y, u(d) && m({ inst: d });
    }, [p, f, y]), o(function() {
      return u(d) && m({ inst: d }), p(function() {
        u(d) && m({ inst: d });
      });
    }, [p]), i(f), f;
  }
  function u(p) {
    var y = p.getSnapshot;
    p = p.value;
    try {
      var f = y();
      return !t(p, f);
    } catch {
      return !0;
    }
  }
  function l(p, y) {
    return y();
  }
  var v = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? l : c;
  return or.useSyncExternalStore = e.useSyncExternalStore !== void 0 ? e.useSyncExternalStore : v, or;
}
var ar = {};
/**
 * @license React
 * use-sync-external-store-shim.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Fr;
function Sn() {
  return Fr || (Fr = 1, process.env.NODE_ENV !== "production" && function() {
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
    var e = _e, r = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function t(g) {
      {
        for (var x = arguments.length, h = new Array(x > 1 ? x - 1 : 0), w = 1; w < x; w++)
          h[w - 1] = arguments[w];
        n("error", g, h);
      }
    }
    function n(g, x, h) {
      {
        var w = r.ReactDebugCurrentFrame, D = w.getStackAddendum();
        D !== "" && (x += "%s", h = h.concat([D]));
        var $ = h.map(function(M) {
          return String(M);
        });
        $.unshift("Warning: " + x), Function.prototype.apply.call(console[g], console, $);
      }
    }
    function o(g, x) {
      return g === x && (g !== 0 || 1 / g === 1 / x) || g !== g && x !== x;
    }
    var a = typeof Object.is == "function" ? Object.is : o, i = e.useState, c = e.useEffect, u = e.useLayoutEffect, l = e.useDebugValue, v = !1, p = !1;
    function y(g, x, h) {
      v || e.startTransition !== void 0 && (v = !0, t("You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."));
      var w = x();
      if (!p) {
        var D = x();
        a(w, D) || (t("The result of getSnapshot should be cached to avoid an infinite loop"), p = !0);
      }
      var $ = i({
        inst: {
          value: w,
          getSnapshot: x
        }
      }), M = $[0].inst, q = $[1];
      return u(function() {
        M.value = w, M.getSnapshot = x, f(M) && q({
          inst: M
        });
      }, [g, w, x]), c(function() {
        f(M) && q({
          inst: M
        });
        var H = function() {
          f(M) && q({
            inst: M
          });
        };
        return g(H);
      }, [g]), l(w), w;
    }
    function f(g) {
      var x = g.getSnapshot, h = g.value;
      try {
        var w = x();
        return !a(h, w);
      } catch {
        return !0;
      }
    }
    function s(g, x, h) {
      return x();
    }
    var d = typeof window < "u" && typeof window.document < "u" && typeof window.document.createElement < "u", m = !d, S = m ? s : y, E = e.useSyncExternalStore !== void 0 ? e.useSyncExternalStore : S;
    ar.useSyncExternalStore = E, typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
  }()), ar;
}
(function(e) {
  process.env.NODE_ENV === "production" ? e.exports = yn() : e.exports = Sn();
})(st);
function xn(e) {
  let r = 0, t, n, o, a, i;
  const c = ({ value: u }) => {
    let l = e == null ? void 0 : e.skipCheck;
    if (!l) {
      const v = hr(a);
      (v !== i || !yt(v) && v === u) && (l = !0);
    }
    l && (r++, t == null || t());
  };
  return {
    subscribe: (u) => (t = u, (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") && !n && o && o(), () => {
      n == null || n(), n = void 0;
    }),
    getVersion: () => r,
    run: (u) => {
      a = u, n == null || n();
      const { value: l, dispose: v, resubscribe: p } = bt(
        u,
        c,
        void 0,
        void 0,
        /*createResubscribe*/
        !0,
        /*inRender*/
        !0
      );
      return n = v, o = p, i = l, l;
    }
  };
}
function _(e, r) {
  if (mt.inRender)
    return hr(e);
  const t = se();
  t.current || (t.current = xn(r));
  const { subscribe: n, getVersion: o, run: a } = t.current, i = a(e);
  if (st.exports.useSyncExternalStore(n, o, o), r != null && r.suspend) {
    if (kt(i))
      throw i;
    if (i != null && i.error)
      throw i.error;
  }
  return i;
}
function wn({ children: e }) {
  return _(e, { skipCheck: !0 });
}
const Wr = typeof Symbol == "function" && Symbol.for;
function ct(e, r, t, n) {
  const o = Wr ? Symbol.for("react.forward_ref") : (
    // eslint-disable-next-line react/display-name, @typescript-eslint/no-unused-vars
    typeof de == "function" && de((y) => null).$$typeof
  ), a = Wr ? Symbol.for("react.memo") : (
    // eslint-disable-next-line react/display-name, @typescript-eslint/no-unused-vars
    typeof de == "function" && ze((y) => null).$$typeof
  );
  if (e.__legend_proxied)
    return e;
  let i = !1, c = !1, u = e;
  if (a && u.$$typeof === a && u.type && (c = !0, u = u.type), o && u.$$typeof === o && (i = !0, u = u.render, process.env.NODE_ENV === "development" && typeof u != "function"))
    throw new Error("[legend-state] `render` property of ForwardRef was not a function");
  const l = {
    apply(y, f, s) {
      if (t) {
        const d = s[0], m = {}, S = Object.keys(d);
        for (let E = 0; E < S.length; E++) {
          const g = S[E], x = d[g];
          if (g === "children" && (ce(x) || Er(x)))
            d[g] = _(x, { skipCheck: !0 });
          else if (g.startsWith("$") || g.endsWith("$")) {
            const h = g.endsWith("$") ? g.slice(0, -1) : g.slice(1);
            m[h] = _(x);
            const w = n == null ? void 0 : n[h];
            if (w && Er(x)) {
              w.defaultValue !== void 0 && m[h] === void 0 && (m[h] = w.defaultValue);
              const D = ($) => {
                var M;
                x.set(w.getValue($)), (M = d[w.handler]) === null || M === void 0 || M.call(d, $);
              };
              m[w.handler] = // If in development mode, don't memoize the handler. fix fast refresh bug
              process.env.NODE_ENV === "development" ? D : ht(D, [d[w.handler], n]);
            }
            delete m[g];
          } else m[g] === void 0 && (m[g] = x);
        }
        s[0] = m;
      }
      return r ? _(() => Reflect.apply(y, f, s), { skipCheck: !0 }) : Reflect.apply(y, f, s);
    }
  }, v = new Proxy(u, l);
  let p;
  return i ? (p = de(v), p.__legend_proxied = !0) : p = v, r || c ? ze(p) : p;
}
function En(e) {
  return ct(e, !0);
}
function Dn(e, r) {
  return ct(e, !1, !0, r);
}
const jr = /* @__PURE__ */ new Map();
function K({ each: e, eachValues: r, optimized: t, item: n, itemProps: o, sortValues: a, children: i }) {
  var c;
  if (!e && !r)
    return null;
  r && (e = r, process.env.NODE_ENV === "development" && !xt.globalState.noDepWarn && console.warn('[legend-state]: "eachValues" prop is deprecated and will be removed in version 2.0. Please use "each" prop instead.'));
  const u = e || r, l = _(() => u.get(t ? wt : !0));
  if (!n && i) {
    const y = se();
    y.current = i, n = He(() => En(({ item: f }) => y.current(f)), []);
  } else if (n.$$typeof !== Symbol.for("react.memo")) {
    let y = jr.get(n);
    y || (y = ze(n), jr.set(n, y)), n = y;
  }
  if (!l)
    return null;
  const v = [];
  if (Yr(l)) {
    const y = l[0], f = Et(u), s = l.length, d = s > 0 ? f && Dt(y, f) || (y.id !== void 0 ? "id" : y.key !== void 0 ? "key" : void 0) : void 0, m = ce(d);
    for (let S = 0; S < s; S++)
      if (l[S]) {
        const E = l[S], g = (c = m ? d(E) : E[d]) !== null && c !== void 0 ? c : S, x = { key: g, id: g, item: e[S] };
        v.push(ir(n, o ? Object.assign(x, o) : x));
      }
  } else {
    const y = l instanceof Map, f = y ? Array.from(l.keys()) : Object.keys(l);
    a && f.sort((s, d) => a(y ? l.get(s) : l[s], y ? l.get(d) : l[d], s, d));
    for (let s = 0; s < f.length; s++) {
      const d = f[s];
      if (y ? l.get(d) : l[d]) {
        const m = {
          key: d,
          id: d,
          item: y ? e.get(d) : e[d]
        };
        v.push(ir(n, o ? Object.assign(m, o) : m));
      }
    }
  }
  return v;
}
ze(wn, () => !0);
const kn = /* @__PURE__ */ new Map(), _n = /* @__PURE__ */ new Map();
new Proxy({}, {
  get(e, r) {
    if (!e[r]) {
      const t = kn.get(r) || r, n = de((o, a) => {
        const i = { ...o };
        return a && (ce(a) || !St(a)) && (i.ref = a), ir(t, i);
      });
      e[r] = Dn(n, _n.get(r));
    }
    return e[r];
  }
});
function dt(e, r, t) {
  !t && Yr(r) && (t = r, r = void 0);
  const n = se({});
  return n.current.compute = e, n.current.set = r, He(() => gt(() => ce(n.current.compute) ? n.current.compute() : n.current.compute, r ? (o) => n.current.set(o) : void 0), t || []);
}
const Cn = (e) => {
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    const r = se({ num: 0 });
    Ue(() => {
      var t;
      r.current.num++;
      const n = () => {
        r.current.dispose && r.current.num < 2 && (r.current.dispose(), r.current.dispose = void 0), r.current.num--;
      };
      if (r.current.dispose === void 0) {
        const o = (t = e()) !== null && t !== void 0 ? t : null;
        if (o && ce(o))
          return r.current.dispose = o, () => queueMicrotask(n);
      } else
        return n;
    }, []);
  } else
    Ue(e, []);
};
function z(e) {
  return He(() => X(ce(e) ? e() : e), []);
}
function Tn(e) {
  return Cn(() => e);
}
function ur(e, r, t) {
  let n;
  ce(r) ? n = r : t = r;
  const o = se({});
  return o.current.selector = e, o.current.reaction = n, o.current.dispose || (o.current.dispose = vt((a) => hr(o.current.selector, a), (a) => {
    var i, c;
    return (c = (i = o.current).reaction) === null || c === void 0 ? void 0 : c.call(i, a);
  }, t)), Tn(() => {
    var a, i;
    (i = (a = o.current) === null || a === void 0 ? void 0 : a.dispose) === null || i === void 0 || i.call(a), o.current = void 0;
  }), o.current.dispose;
}
const Bn = ({ item: e }) => {
  const { index: r, data: t } = U(Be), { dataMax: n, orientation: o, vars: a } = U(J), i = _(o), c = _(e.id), u = _(e.barIndex), l = _(e.CSS), v = _(() => {
    const f = n.get(), s = e.barIndex.get(), d = e.order.get(), m = t[s].get();
    return o.get() === 0 ? { flex: "0 0 " + (m > f ? f : m) * 100 / f + "%", order: d, height: "inherit" } : { flex: "0 0 " + (m > f ? f : m) * 100 / f + "%", order: d, width: "inherit" };
  }), p = _(r), y = _(() => {
    var d;
    let f = e.markup.get();
    return e.markup.get() !== void 0 && (Object.keys(a.peek()).forEach((m) => {
      var S;
      if (f != null && f.includes(`{{${m}}}`)) {
        const E = a[m].length, g = a[m].get()[p < E ? p : p % E];
        Array.isArray(g) ? f = f == null ? void 0 : f.replaceAll(`{{${m}}}`, (S = g[u]) == null ? void 0 : S.toString()) : f = f == null ? void 0 : f.replaceAll(`{{${m}}}`, g == null ? void 0 : g.toString());
      }
    }), (f ?? "".includes("{{$dataValue}}")) && (f = f == null ? void 0 : f.replaceAll("{{$dataValue}}", (d = t[u].get()) == null ? void 0 : d.toString()))), Vr.sanitize(f ?? "");
  });
  return /* @__PURE__ */ T(
    "div",
    {
      id: c || "bar-" + p + "-" + u,
      className: "bar" + (i === 0 ? " horizontal" : " vertical"),
      dangerouslySetInnerHTML: { __html: y },
      style: v,
      css: Z(l)
    }
  );
};
var An = /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/, On = /* @__PURE__ */ Zr(
  function(e) {
    return An.test(e) || e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) < 91;
  }
  /* Z+1 */
), Pn = On, Rn = function(r) {
  return r !== "theme";
}, Ur = function(r) {
  return typeof r == "string" && // 96 is one less than the char code
  // for "a" so this is checking that
  // it's a lowercase character
  r.charCodeAt(0) > 96 ? Pn : Rn;
}, zr = function(r, t, n) {
  var o;
  if (t) {
    var a = t.shouldForwardProp;
    o = r.__emotion_forwardProp && a ? function(i) {
      return r.__emotion_forwardProp(i) && a(i);
    } : a;
  }
  return typeof o != "function" && n && (o = r.__emotion_forwardProp), o;
}, Mn = function(r) {
  var t = r.cache, n = r.serialized, o = r.isStringTag;
  return br(t, n, o), nt(function() {
    return rt(t, n, o);
  }), null;
}, Nn = function e(r, t) {
  var n = r.__emotion_real === r, o = n && r.__emotion_base || r, a, i;
  t !== void 0 && (a = t.label, i = t.target);
  var c = zr(r, t, n), u = c || Ur(o), l = !u("as");
  return function() {
    var v = arguments, p = n && r.__emotion_styles !== void 0 ? r.__emotion_styles.slice(0) : [];
    if (a !== void 0 && p.push("label:" + a + ";"), v[0] == null || v[0].raw === void 0)
      p.push.apply(p, v);
    else {
      var y = v[0];
      p.push(y[0]);
      for (var f = v.length, s = 1; s < f; s++)
        p.push(v[s], y[s]);
    }
    var d = at(function(m, S, E) {
      var g = l && m.as || o, x = "", h = [], w = m;
      if (m.theme == null) {
        w = {};
        for (var D in m)
          w[D] = m[D];
        w.theme = j.useContext(it);
      }
      typeof m.className == "string" ? x = et(S.registered, h, m.className) : m.className != null && (x = m.className + " ");
      var $ = yr(p.concat(h), S.registered, w);
      x += S.key + "-" + $.name, i !== void 0 && (x += " " + i);
      var M = l && c === void 0 ? Ur(g) : u, q = {};
      for (var H in m)
        l && H === "as" || M(H) && (q[H] = m[H]);
      return q.className = x, E && (q.ref = E), /* @__PURE__ */ j.createElement(j.Fragment, null, /* @__PURE__ */ j.createElement(Mn, {
        cache: S,
        serialized: $,
        isStringTag: typeof g == "string"
      }), /* @__PURE__ */ j.createElement(g, q));
    });
    return d.displayName = a !== void 0 ? a : "Styled(" + (typeof o == "string" ? o : o.displayName || o.name || "Component") + ")", d.defaultProps = r.defaultProps, d.__emotion_real = d, d.__emotion_base = o, d.__emotion_styles = p, d.__emotion_forwardProp = c, Object.defineProperty(d, "toString", {
      value: function() {
        return "." + i;
      }
    }), d.withComponent = function(m, S) {
      var E = e(m, dr({}, t, S, {
        shouldForwardProp: zr(d, S, !0)
      }));
      return E.apply(void 0, p);
    }, d;
  };
}, $n = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  // SVG
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "foreignObject",
  "g",
  "image",
  "line",
  "linearGradient",
  "mask",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "text",
  "tspan"
], fe = Nn.bind(null);
$n.forEach(function(e) {
  fe[e] = fe(e);
});
const Ln = fe.div``, Ze = ({ item: e }) => {
  const { index: r, data: t } = U(Be), { theme: n, orientation: o, vars: a, dataMax: i } = U(J), c = _(r), u = _(e.CSS), l = _(e.decIndex), v = _(() => {
    var s;
    return (s = e.useData) != null && s.get() ? t.get() : t.peek();
  }), p = _(() => {
    var s;
    return (s = e.useDataMax) != null && s.get() ? i.get() : i.peek();
  }), y = _(() => {
    const s = e.order.get(), d = e.width.get();
    return o.get() === 0 ? d ? { order: s, flex: "0 0 " + d } : { order: s } : d ? { order: s, flex: "0 0 " + d } : { order: s };
  }), f = _(() => {
    var m, S, E;
    let s = e.markup.get();
    if (e.markup.get() !== void 0) {
      if (Object.keys(a.peek()).forEach((g) => {
        var x;
        if (s != null && s.includes(`{{${g}}}`)) {
          const h = a[g].length, w = a[g].get()[c < h ? c : c % h];
          Array.isArray(w) ? s = s == null ? void 0 : s.replaceAll(`{{${g}}}`, (x = w[l]) == null ? void 0 : x.toString()) : s = s == null ? void 0 : s.replaceAll(`{{${g}}}`, w == null ? void 0 : w.toString());
        }
      }), (m = e.useData) != null && m.get()) {
        const g = e.dataIndex.peek();
        (s ?? "".includes("{{$dataValue}}")) && (s = s == null ? void 0 : s.replaceAll("{{$dataValue}}", (S = v[g && g < t.length ? g : 0]) == null ? void 0 : S.toString()));
      }
      (E = e.useDataMax) != null && E.get() && (s ?? "".includes("{{$dataValue}}")) && (s = s == null ? void 0 : s.replaceAll("{{$dataMaxValue}}", p == null ? void 0 : p.toString()));
    }
    return Vr.sanitize(s ?? "");
  });
  return /* @__PURE__ */ T(
    Ln,
    {
      id: "bar-dec-" + c + "-" + l,
      className: "bar-decoration decoration " + (o.get() === 0 ? "horizontal" : "vertical"),
      dangerouslySetInnerHTML: { __html: f },
      style: y,
      css: Z(u)
    }
  );
}, In = fe.div``, Fn = ({ item: e }) => {
  const { theme: r, orientation: t } = U(J), { data: n } = U(Be), o = _(e.barIndex), a = _(e.elements), i = _(e.decorationWidth), c = _(e.order), u = _(e.CSS), l = z(() => {
    const y = n.peek(), f = [];
    return y.forEach((s, d) => {
      const m = a.find((S) => S.type === "bar" && (S.isDefault ?? (S.dataIndex ?? [0]).includes(d)));
      m !== void 0 && f.push({
        id: m.id ?? "bar_" + d,
        barIndex: d,
        order: m.order,
        CSS: m.CSS,
        markup: m.markup
      });
    }), f;
  }), v = _(() => {
    const y = a, f = [];
    return y.filter((s) => s.type === "decoration").forEach((s, d) => {
      f.push({
        id: s.id,
        decIndex: d,
        order: s.order,
        width: i,
        dataIndex: s.dataIndex,
        useData: s.useData,
        useDataMax: s.useDataMax,
        CSS: s.CSS,
        markup: s.markup
      });
    }), f;
  }), p = z(v);
  return /* @__PURE__ */ Xe(
    In,
    {
      id: "bar_dec_cont-" + o,
      className: "bar-dec-cont",
      style: t.get() === 0 ? { display: "flex", flexDirection: "row", width: "100%", order: c, height: "inherit", alignItems: "center", overflowX: "visible" } : { display: "flex", flexDirection: "column-reverse", height: "100%", order: c, width: "inherit", alignItems: "center", overflowY: "visible" },
      css: Z(u),
      children: [
        /* @__PURE__ */ T(K, { each: l, item: Bn, optimized: !0 }),
        /* @__PURE__ */ T(K, { each: p, item: Ze, optimized: !0 })
      ]
    },
    "bar_dec_cont-" + o
  );
}, Wn = fe.div``, lt = ({ item: e }) => {
  const { orientation: r } = U(J), t = _(r), n = _(e.CSS);
  _(e.elements);
  const o = _(e.decorationWidth), a = _(e.order), { newBarAndDecs: i, newContDecs: c } = _(() => {
    const v = e.elements.peek(), p = [], y = [];
    return v.forEach((f, s) => {
      f.type === "bar-dec-container" ? p.push({
        id: "bar-dec-" + s,
        barIndex: s,
        elements: f.elements,
        CSS: f.CSS ?? "",
        decorationWidth: f.decorationWidth ?? "10%",
        order: s
      }) : y.push({
        id: f.id,
        decIndex: s,
        order: f.order,
        width: o,
        CSS: f.CSS,
        markup: f.markup
      });
    }), { newBarAndDecs: p, newContDecs: y };
  }), u = z(i), l = z(c);
  return /* @__PURE__ */ Xe(
    Wn,
    {
      className: "bar-content-container",
      style: t === 0 ? { display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", overflow: "hidden", order: a ?? 1 } : { display: "flex", flexDirection: "row", height: "100%", width: "100%", overflow: "hidden", order: a ?? 1 },
      css: Z(n),
      children: [
        /* @__PURE__ */ T(K, { each: u, item: Fn, optimized: !0 }),
        /* @__PURE__ */ T(K, { each: l, item: Ze, optimized: !0 })
      ]
    }
  );
}, fr = ({ children: e, dataIndex: r, order: t, markup: n, isDefault: o, CSS: a, onClickHandler: i }) => /* @__PURE__ */ T(ae, { children: e }), ie = ({ children: e, dataIndex: r, useData: t, useDataMax: n, order: o, markup: a, CSS: i, onClickHandler: c }) => /* @__PURE__ */ T(ae, { children: e }), pr = ({ children: e, decorationWidth: r, order: t, CSS: n, onClickHandler: o }) => (() => {
  if (Array.isArray(e))
    return e.length ? (e.forEach((i) => {
      const c = i.type;
      if (c !== fr && c !== ie)
        return !1;
    }), !0) : !1;
  {
    const i = e == null ? void 0 : e.type;
    return !(i !== fr && i !== ie);
  }
})() ? /* @__PURE__ */ T(ae, { children: e }) : /* @__PURE__ */ T(ae, { children: "incompatible template component(s)" }), Ye = ({ children: e, decorationWidth: r, order: t, CSS: n, onClickHandler: o }) => (() => {
  if (Array.isArray(e))
    return e.length ? (e.forEach((i) => {
      const c = i.type;
      if (c !== pr && c !== ie)
        return !1;
    }), !0) : !1;
  {
    const i = e == null ? void 0 : e.type;
    return !(i !== pr && i !== ie);
  }
})() ? /* @__PURE__ */ T(ae, { children: e }) : /* @__PURE__ */ T(ae, { children: "incompatible template component(s)" }), jn = ({ children: e, width: r, decorationWidth: t, order: n, CSS: o, onClickHandler: a }) => (() => {
  if (Array.isArray(e))
    return e.length ? (e.forEach((c) => {
      const u = c.type;
      if (u !== Ye && u !== ie)
        return !1;
    }), !0) : !1;
  {
    const c = e == null ? void 0 : e.type;
    return !(c !== Ye && c !== ie);
  }
})() ? /* @__PURE__ */ T(ae, { children: e }) : /* @__PURE__ */ T(ae, { children: "incompatible template component(s)" }), Un = fe.div``, ut = ({ item: e }) => {
  const { orientation: r } = U(J), t = _(e.CSS), n = _(r), o = _(e.width), a = _(e.order), i = _(e.id);
  Ue(() => (console.log("---->Fullbar " + e.index.peek() + " mounted"), () => {
    console.log("---->Fullbar " + e.index.peek() + " unmounted");
  }), []);
  const { newContContainers: c, newFullBarDecs: u } = _(() => {
    const p = e.elements.peek(), y = [], f = [];
    return p.forEach((s, d) => {
      s.type === "bar-content-container" ? y.push({
        id: "bar_cont_cont_" + d,
        elements: s.elements,
        CSS: s.CSS ?? "",
        decorationWidth: s.decorationWidth ?? "10%",
        order: d
      }) : f.push({
        id: s.id,
        decIndex: d,
        order: s.order,
        width: e.decorationWidth.peek(),
        CSS: s.CSS,
        markup: s.markup
      });
    }), { newContContainers: y, newFullBarDecs: f };
  }), l = z(c), v = z(u);
  return /* @__PURE__ */ T(Be.Provider, { value: { index: e.index, order: e.order, data: e.data, width: e.width, decorationWidth: e.decorationWidth }, children: /* @__PURE__ */ Xe(
    Un,
    {
      id: i ?? "full_bar_" + e.index.peek(),
      className: "full-bar" + (n === 0 ? " horizontal" : " vertical"),
      style: n === 0 ? { display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: o, overflow: "hidden", order: a, position: "absolute", left: "0", top: "calc(" + o + "*" + a + ")" } : { display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: o, overflow: "hidden", order: a, position: "absolute", bottom: "0", left: "calc(" + o + "*" + a + ")" },
      css: Z(t),
      children: [
        /* @__PURE__ */ T(K, { each: l, item: lt, optimized: !0 }),
        /* @__PURE__ */ T(K, { each: v, item: Ze, optimized: !0 })
      ]
    },
    "full_bar_" + e.index.peek()
  ) });
}, ft = ({ item: e }) => {
  const { orientation: r, plotData: t } = U(J), n = _(e.CSS), o = _(r), a = _(e.width), i = _(e.order), c = _(e.id), { newContContainers: u, newPlotSegmentDecs: l } = _(() => {
    const y = e.elements.peek(), f = [], s = [];
    return y.forEach((d, m) => {
      d.type === "bar-content-container" ? f.push({
        id: "bar_cont_cont_" + m,
        elements: d.elements,
        CSS: d.CSS ?? "",
        decorationWidth: d.decorationWidth ?? "10%",
        order: m
      }) : s.push({
        id: d.id,
        decIndex: m,
        order: d.order,
        width: e.decorationWidth.peek(),
        CSS: d.CSS,
        markup: d.markup
      });
    }), { newContContainers: f, newPlotSegmentDecs: s };
  }), v = z(u), p = z(l);
  return /* @__PURE__ */ T(Be.Provider, { value: { index: e.varIndex, order: e.order, data: t[e.dataIndex.get()], width: e.width, decorationWidth: e.decorationWidth }, children: /* @__PURE__ */ Xe(
    "div",
    {
      id: c ?? "full_bar_" + e.dataIndex.peek(),
      className: "full-bar" + (o === 0 ? " horizontal" : " vertical"),
      style: o === 0 ? { display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", height: a, overflow: "hidden", order: i, position: "absolute", left: "0", top: "calc(" + a + "*" + i + ")" } : { display: "flex", flexDirection: "column", alignItems: "center", height: "100%", width: a, overflow: "hidden", order: i, position: "absolute", bottom: "0", left: "calc(" + a + "*" + i + ")" },
      css: Z(n),
      children: [
        /* @__PURE__ */ T(K, { each: v, item: lt, optimized: !0 }),
        /* @__PURE__ */ T(K, { each: p, item: Ze, optimized: !0 })
      ]
    },
    "full_bar_" + e.dataIndex.peek()
  ) });
}, zn = [
  {
    type: "bar",
    order: 1,
    isDefault: !0,
    CSS: "background-color: none; height: 13px!important; transition: all 0.4s ease-in-out;border-left: 4px solid #00000011;",
    markup: "<div style='font-weight: bold;font-size: small;height:100%;display: flex; justify-content: flex-start;padding-left: 4px;color: #555555'><span style='margin-top: -4px;'>{{$scaleLabel}}</span></div>"
  },
  {
    type: "decoration",
    order: 20,
    useDataMax: !0,
    CSS: "position:absolute;left: calc(100% - 2rem);width: 3rem;height: 100%;color: #555555; div {font-size: small; text-align: left;border-left: 4px solid #555555;}",
    //We subtract 2rem from `left` to account for padding that impacts where the bars stop
    markup: "<div style='display: flex;font-weight: bold;height: 150%;padding-left: 4px;'><span style='margin-top: -4px;width: 100%;'>{{$dataMaxValue}}</span></div>"
  }
], Vn = [
  {
    type: "bar-dec-container",
    elements: zn,
    CSS: "background: none;align-items: flex-start!important;overflow-x: hidden!important;",
    decorationWidth: "10%",
    order: 1
  }
], Yn = [
  {
    type: "bar-content-container",
    elements: Vn,
    decorationWidth: "10%",
    order: 1,
    CSS: "padding-right: 2rem;& .bar-dec-cont > .bar:first-of-type {border-left: none;} "
    // This element hides content that overflows the bar and so we add 2rem to the right to stop the bars and allow space for decoration to be visible.
  },
  {
    type: "decoration",
    order: 0,
    CSS: "height: inherit;border-right: 4px solid #555555;",
    markup: ""
  }
], co = ({ width: e, height: r, spacing: t, dataMaxLimit: n, scaleData: o, scaleTemplate: a, id: i, style: c, decorationWidth: u, decouple: l = !1, CSS: v }) => {
  const { vars: p } = U(J), y = z(n), f = z({
    id: "full_bar_scale",
    index: 0,
    data: Array(Math.floor(y.get() / t.get())).fill(t.get()),
    order: 0,
    width: "100%",
    decorationWidth: u ?? "6rem",
    elements: a ?? Yn,
    CSS: ""
  }), s = o || f, d = dt(() => {
    const m = t.get();
    return Array(Math.floor(y.get() / m)).fill(0).map((E, g) => g * m);
  });
  return ur(d, ({ value: m }) => {
    var S;
    (S = f.CSS) == null || S.set("& .bar {opacity: 0;}"), setTimeout(() => {
      var E, g;
      (E = f.data) == null || E.set(Array((m ?? [0]).length).fill(t == null ? void 0 : t.get())), (g = p.$scaleLabel) == null || g.set([m ?? [0]]);
    }, 340), setTimeout(() => {
      var E;
      (E = f.CSS) == null || E.set("& .bar {opacity: 1;}");
    }, 840);
  }), /* @__PURE__ */ T("div", { id: i, className: "scale", style: { ...c, width: e, height: r, overflow: "hidden" }, css: Z(v), children: /* @__PURE__ */ T("div", { className: "plot-area", style: { width: "100%", height: "100%", position: "relative" }, children: /* @__PURE__ */ T(ut, { item: s }) }) });
}, lo = {
  "bar-plot": "",
  "full-bar": "&.horizontal { padding-top: 0.5rem; padding-bottom: 0.5rem;} &.vertical {padding-left: 0.5rem; padding-right: 0.5rem;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  bar: "background-color: blue;",
  "bar-decoration": "background-color: blue;"
}, uo = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  bar: "",
  "bar-decoration": ""
}, qn = (e, r) => {
  if (e.length !== r.length) {
    console.log("newOrder.length !== trackedBarsData.length");
    return;
  } else
    e.forEach((t, n) => {
      r[n].order.set(t);
    });
}, fo = (e) => {
  const r = [], t = [], n = [];
  e.peek().forEach((i, c) => {
    r.push(i.order), t.push([e[c].data.get()[0], i.order, c]);
  }), t.sort((i, c) => i[1] - c[1]), t.sort((i, c) => c[0] - i[0]), t.forEach((i, c) => n.push(i[2]));
  const a = n.map((i, c) => c).sort((i, c) => n[i] - n[c]);
  JSON.stringify(a) !== JSON.stringify(r) && qn(a, e);
}, po = ({ width: e, height: r, childrenData: t, children: n, id: o, style: a, CSS: i }) => /* @__PURE__ */ T("div", { id: o, className: "bar-plot", style: { ...a, width: e, height: r, overflow: "hidden" }, css: Z(i), children: /* @__PURE__ */ T("div", { className: "plot-area", style: { width: "100%", height: "100%", position: "relative" }, children: /* @__PURE__ */ T(K, { each: t, item: n, optimized: !0 }) }) }), Hn = {
  "bar-plot": "",
  "full-bar": "&.horizontal { padding-top: 0.5rem; padding-bottom: 0.5rem;} &.vertical {padding-left: 0.5rem; padding-right: 0.5rem;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  bar: "background-color: blue;",
  "bar-decoration": "background-color: blue;"
}, ho = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  bar: "",
  "bar-decoration": ""
}, Gn = [
  {
    type: "bar-content-container",
    elements: [
      {
        type: "bar-dec-container",
        elements: [
          {
            type: "bar",
            order: 1,
            CSS: "box-sizing: border-box;border-radius: 0 1rem 1rem 0;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;&:hover {border: 4px solid black;}& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
            markup: "<div style='background-color: {{color}};height:100%;'>{{fruit-svgs}}</div>"
          },
          {
            type: "decoration",
            order: 2,
            useData: !0,
            CSS: "color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
            markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{$dataValue}}</div>"
          }
        ],
        CSS: "background: none;&>.bar:hover + .decoration>div {color: black!important;}",
        decorationWidth: "10%",
        order: 1
      }
      // {
      //   type: "decoration",
      //   order: 0,
      //   css: "background-color: slategray; color: white; div {text-align: left;}",
      //   markup: "<div style='width: fit-content;'>My text decoration</div>",
      //   onClickHandler: () => console.log("decoration clicked")
      // },
    ],
    decorationWidth: "10%",
    order: 1,
    CSS: "padding-right: 2rem;"
  },
  {
    type: "decoration",
    order: 0,
    CSS: "display: flex; flex-direction: row-reverse;justify-content: center;background: none; color: black; div {text-align: center;}",
    markup: "<div style='width: fit-content;font-weight: 600;color: #555555;'>{{bar-label}}</div>"
  }
], Jn = (e, r) => {
  if (e.length !== r.length) {
    console.log("newOrder.length !== trackedBarsConfig.length");
    return;
  } else
    e.forEach((t, n) => {
      r[n].order.set(t);
    });
}, mo = (e) => {
  const r = [], t = [], n = [];
  e.peek().forEach((i, c) => {
    r.push(i.order), t.push([e[c].data.get()[0], i.order, c]);
  }), t.sort((i, c) => i[1] - c[1]), t.sort((i, c) => c[0] - i[0]), t.forEach((i, c) => n.push(i[2]));
  const a = n.map((i, c) => c).sort((i, c) => n[i] - n[c]);
  JSON.stringify(a) !== JSON.stringify(r) && Jn(a, e);
}, go = ({ width: e, height: r, barsConfig: t, barTemplate: n, decorationWidth: o, id: a, style: i, CSS: c }) => {
  const { plotData: u } = U(J), l = z(() => {
    const p = u.peek(), y = [];
    return p.forEach((f, s) => {
      y.push({
        id: "full_bar_a_" + s,
        index: s,
        data: f,
        order: s,
        width: "calc(100%/" + p.length + ")",
        decorationWidth: o ?? "6rem",
        elements: we(n ?? Gn),
        // Avoid strange unexplainable circular reference errors for each element of this array on first render
        CSS: Hn["full-bar"]
      });
    }), y;
  }), v = t ?? l;
  return /* @__PURE__ */ T("div", { id: a, className: "bar-plot", style: { ...i, width: e, height: r, overflow: "hidden" }, css: Z(c), children: /* @__PURE__ */ T("div", { className: "plot-area", style: { width: "100%", height: "100%", position: "relative" }, children: /* @__PURE__ */ T(K, { each: v, item: ut, optimized: !0 }) }) });
}, Kn = {
  "bar-plot": "",
  "full-bar": "overflow: visible!important; &.vertical {padding-left: 0.5rem; padding-right: 0.5rem;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  bar: "background-color: blue;",
  "bar-decoration": "background-color: blue;"
}, vo = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  bar: "",
  "bar-decoration": ""
}, Xn = [
  {
    type: "bar",
    order: 1,
    CSS: "box-sizing: border-box;border-radius: 0 1rem 1rem 0;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;&:hover {border: 4px solid black;}& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
    markup: "<div style='background-color: {{color}};height:100%;'>{{fruit-svgs}}</div>"
  },
  {
    type: "decoration",
    order: 2,
    useData: !0,
    CSS: "color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
    markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{$dataValue}}</div>"
  }
], Zn = [
  {
    type: "bar-dec-container",
    elements: Xn,
    CSS: "background: none;&>.bar:hover + .decoration>div {color: black!important;}",
    decorationWidth: "10%",
    order: 1
  }
  // {
  //   type: "decoration",
  //   order: 0,
  //   css: "background-color: slategray; color: white; div {text-align: left;}",
  //   markup: "<div style='width: fit-content;'>My text decoration</div>",
  //   onClickHandler: () => console.log("decoration clicked")
  // },
], Qn = [
  {
    type: "bar-content-container",
    elements: Zn,
    decorationWidth: "10%",
    order: 1,
    CSS: "padding-right: 2rem;"
  },
  {
    type: "decoration",
    order: 0,
    CSS: "display: flex; flex-direction: row-reverse;justify-content: center;background: none; color: black; div {text-align: center;}",
    markup: "<div style='width: fit-content;font-weight: 600;color: #555555;'>{{bar-label}}</div>"
  }
], eo = (e, r) => {
  if (e.length !== r.length) {
    console.log("newOrder.length !== trackedBarsConfig.length");
    return;
  } else
    e.forEach((t, n) => {
      r[n].order.set(t);
    });
}, bo = (e, r) => {
  const t = [], n = [], o = [];
  r.peek().map((c, u) => {
    t.push(c.order), n.push([e[u].get()[0], c.order, u]);
  }), n.sort((c, u) => c[1] - u[1]), n.sort((c, u) => u[0] - c[0]), n.forEach((c, u) => o.push(c[2]));
  const i = o.map((c, u) => u).sort((c, u) => o[c] - o[u]);
  JSON.stringify(i) !== JSON.stringify(t) && eo(i, r);
}, qe = (e) => (Array.isArray(e) ? e : [e]).map((r, t) => {
  const { children: n, ...o } = r.props;
  switch (r.type) {
    case ie:
      return {
        type: "decoration",
        ...o
      };
    case Ye:
      return {
        type: "bar-content-container",
        ...o,
        elements: r.props.children ? qe(r.props.children) : []
      };
    case pr:
      return {
        type: "bar-dec-container",
        ...o,
        elements: r.props.children ? qe(r.props.children) : []
      };
    case fr:
      return {
        type: "bar",
        ...o
      };
    default:
      return {};
  }
}), ro = ({ width: e, height: r, dataIndexForOrdering: t, segmentConfig: n, segmentTemplate: o, decorationWidth: a, id: i, style: c, CSS: u, children: l }) => {
  const { plotData: v } = U(J), p = ++se(0).current;
  console.log("SegmentPlot rendered: " + p), z(2);
  const y = z(() => {
    const s = v.peek(), d = [];
    return s.forEach((m, S) => {
      d.push({
        id: "full_segment_" + S,
        dataIndex: S,
        varIndex: S,
        order: S,
        width: "calc(100%/" + s.length + ")",
        decorationWidth: a ?? "6rem",
        elements: we(o ?? Qn),
        // Avoid strange unexplainable circular reference errors for each element of this array on first render
        CSS: Kn["full-bar"]
      });
    }), d;
  }), f = n ?? y;
  if (Array.isArray(l))
    console.warn("No template component provided. Perhaps you mean to close the SegmentPlot tag with /> instead?");
  else if ((l == null ? void 0 : l.type) === jn && (l != null && l.props)) {
    const s = l.props;
    if (s.order && s.order.length === f.length && s.order.forEach((d, m) => {
      f[m].order.set(d);
    }), f.peek().forEach((d, m) => {
      const S = f[m];
      s.width && S.width.set(s.width), s.decorationWidth && S.decorationWidth.set(s.decorationWidth), s.CSS && S.CSS.set(s.CSS);
    }), s.children && Array.isArray(s.children) && s.children.length) {
      const d = qe(s.children);
      d.length && f.peek().forEach((m, S) => {
        f[S].elements.set(we(d));
      });
    } else if (s.children && !Array.isArray(s.children) && (s.children.type === Ye || s.children.type === ie)) {
      const d = qe([s.children]);
      d.length && f.peek().forEach((m, S) => {
        f[S].elements.set(we(d));
      });
    }
  }
  return /* @__PURE__ */ T("div", { id: i, className: "segment-plot", style: { ...c, width: e, height: r, overflow: "hidden" }, css: Z(u), children: /* @__PURE__ */ T("div", { className: "plot-area", style: { width: "100%", height: "100%", position: "relative" }, children: /* @__PURE__ */ T(K, { each: f, item: ft, optimized: !0 }) }) });
}, to = {
  "bar-plot": "",
  "full-bar": "padding-top: 0.5rem; padding-bottom: 0.5rem;transition: all 0.3s ease-in-out;&:hover .decoration>.image img {transform: scale(1.5)!important;}&:hover .decoration>.image {border: 5px solid #555555!important;}&:hover .decoration>div {color: black!important;} &:hover div div.box {border: 5px solid #555555!important;color: #555555!important; font-weight: 500} &:hover div div.whisker {border: 3px solid #555555!important;} & div.bar-content-container div.bar {transition-timing-function: ease-in-out;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  bar: "background-color: blue;",
  "bar-decoration": "background-color: blue;",
  "desaturate-bar": "padding-top: 0.5rem; padding-bottom: 0.5rem;filter: saturate(10%); transition: all 0.3s ease-in-out;&:hover .decoration>img {border: 5px solid #555555!important;}&:hover .decoration>div {color: black!important;} &:hover div div.box {border: 5px solid #555555!important;color: #555555!important; font-weight: 500} &:hover div div.whisker {border: 3px solid #555555!important;}&:hover {filter: saturate(110%);}& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}"
}, yo = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  bar: "",
  "bar-decoration": ""
}, no = [
  {
    type: "bar-content-container",
    elements: [
      {
        type: "bar-dec-container",
        elements: [
          {
            type: "bar",
            order: 1,
            dataIndex: [2],
            CSS: "box-sizing: border-box;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;justify-content: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
            markup: "<div class='box' style='transition: border 0.4s ease-in-out, color 0.4s ease-in-out;border: 4px solid {{color}};color: {{color}};height:100%;'>{{clouds}}</div>"
          },
          {
            type: "bar",
            order: 1,
            dataIndex: [0],
            CSS: "background: none;border: none!important;height: auto; transition-property: flex, border;transition-duration: 0.4s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}",
            markup: ""
          },
          {
            type: "bar",
            order: 1,
            dataIndex: [1],
            CSS: "border: none!important;display: flex;align-items: center;overflow: hidden;height: auto; transition-property: flex;transition-duration: 0.4s;transition-timing-function: ease-in-out;",
            markup: "<div class='whisker' style='transition: border 0.4s ease-in-out;border-left: 4px solid {{color}};height:30%;width: 0%;'></div><div class='whisker' style='transition: border 0.4s ease-in-out;border: 3px solid {{color}};height:0%;width: 100%;'></div>"
          },
          {
            type: "bar",
            order: 1,
            dataIndex: [3],
            CSS: "border: none!important;display: flex;align-items: center;height: auto; transition-property: flex;transition-duration: 0.4s;transition-timing-function: ease-in-out;",
            markup: "<div class='whisker' style='transition: border 0.4s ease-in-out;border: 3px solid {{color}};height:0%;width: 100%;'></div><div class='whisker' style='transition: border 0.4s ease-in-out;border-right: 4px solid {{color}};height:30%;width: 0%;margin-right: -4px;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            useData: !0,
            CSS: "display: inline-flex;align-items: center;margin-bottom: 2px;color: white; div {font-size: small; text-align: left; margin-left: 0.5rem;}",
            markup: "<div style='font-weight: bold;color: {{color}};height: fit-content;'>{{last-whisker-pos}}</div>"
          }
        ],
        CSS: "background: none;",
        decorationWidth: "10%",
        order: 1
      }
    ],
    decorationWidth: "10%",
    order: 1,
    CSS: "padding-right: 2rem;"
  },
  {
    type: "decoration",
    order: 0,
    CSS: "display: flex; flex-direction: row-reverse;justify-content: center;height: 100%;background: none; color: black; div {text-align: center;}",
    markup: "<div class='image' style='height: 100%;aspect-ratio: 1/1;border-radius: 50%;transition: border 0.4s ease-in-out;border: 4px solid #00000011;overflow: hidden;' ><img style= 'height: 100%; width: 100%;object-fit: cover;transition: transform 0.4s ease-in-out;transform: scale(5);' src='{{cloud-img-src}}'  alt='{{clouds}}'></img></div>"
  }
], So = (e) => {
  const r = [];
  return e.forEach((t, n) => {
    r.push([t[0], t[1] - t[0], t[2] - t[1], t[3] - t[2]]);
  }), r;
}, pt = (e, r) => {
  if (e.length !== r.length) {
    console.log("newOrder.length !== trackedBarsData.length");
    return;
  } else
    e.forEach((t, n) => {
      r[n].order.set(t);
    });
}, xo = (e, r, t = 0) => {
  const n = [], o = [], a = [], i = r.peek();
  i.forEach((u, l) => {
    n.push(u.order), o.push([t === 0 ? e[l].get()[0] : e[l].get().slice(0, t + 1).reduce((v, p) => v + p, 0), i[l].order, l]);
  }), o.sort((u, l) => u[1] - l[1]), o.sort((u, l) => l[0] - u[0]), o.forEach((u, l) => a.push(u[2]));
  const c = a.map((u, l) => l).sort((u, l) => a[u] - a[l]);
  JSON.stringify(c) !== JSON.stringify(n) && pt(c, r);
}, wo = ({ width: e, height: r, dataIndexForOrdering: t, boxWhiskerConfig: n, boxWhiskerTemplate: o, decorationWidth: a, id: i, style: c, CSS: u }) => {
  const { plotData: l, vars: v } = U(J), p = ++se(0).current;
  console.log("Box and Whisker Plot renders: " + p);
  const y = z(2), f = t ?? y, s = z(() => {
    const S = l.peek(), E = [];
    return S.forEach((g, x) => {
      E.push({
        id: "full_box_and_whisker_" + x,
        dataIndex: x,
        varIndex: x,
        order: x,
        width: "calc(100%/" + S.length + ")",
        decorationWidth: a ?? "6rem",
        elements: we(o ?? no),
        // Avoid strange unexplainable circular reference errors for each element of this array on first render
        CSS: to["full-bar"]
      });
    }), E;
  }), d = n ?? s, m = dt(() => {
    const S = [], E = [], g = d.peek(), x = f.get();
    return g.map((w, D) => S.push([x === 0 ? l[D].get()[0] : l[D].get().slice(0, x + 1).reduce(($, M) => $ + M, 0), g[D].order, D])), S.sort((w, D) => w[1] - D[1]), S.sort((w, D) => D[0] - w[0]), S.forEach((w, D) => E.push(w[2])), E.map((w, D) => D).sort((w, D) => E[w] - E[D]);
  });
  return ur(m, () => {
    pt(m.peek(), d);
  }), ur(() => {
    l.peek().forEach((E, g) => {
      const h = l[g].get().reduce((w, D) => w + D, 0);
      "last-whisker-pos" in v && v["last-whisker-pos"].peek()[g] !== h && v["last-whisker-pos"][g].set(h);
    });
  }), /* @__PURE__ */ T("div", { id: i, className: "box-whisker-plot", style: { ...c, width: e, height: r, overflow: "hidden" }, css: Z(u), children: /* @__PURE__ */ T("div", { className: "plot-area", style: { width: "100%", height: "100%", position: "relative" }, children: /* @__PURE__ */ T(K, { each: n, item: ft, optimized: !0 }) }) });
}, Eo = {
  "bar-plot": "",
  "full-bar": "overflow: visible!important;transition: all 0.3s ease-in-out;& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}",
  "bar-label": "display: flex; flex-direction: row-reverse;background-color: slategray; color: white; div {text-align: center; text-orientation: sideways-right;writing-mode: vertical-rl;}",
  "bar-content-container": "background-color: green;",
  "bar-dec-container": "",
  bar: "background-color: blue;",
  "bar-decoration": "background-color: blue;",
  "desaturate-bar": "overflow: visible!important;filter: saturate(40%); transition: all 0.3s ease-in-out;&:hover {filter: saturate(110%);}& div.bar-content-container div.bar {transition-timing-function: ease-in-out;}"
}, Do = {
  "bar-label": "<div style='width: fit-content;'>Bar label</div>",
  "bar-content-container": "",
  "bar-dec-container": "",
  bar: "",
  "bar-decoration": ""
}, oo = [
  {
    type: "bar-content-container",
    elements: [
      {
        type: "bar-dec-container",
        elements: [
          {
            type: "bar",
            order: 0,
            CSS: "box-sizing: border-box;border-radius: 26px;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 1s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
            markup: "<div style='background-color: {{second-color}};height:100%;'></div>"
          },
          {
            type: "bar",
            dataIndex: [1],
            order: 4,
            CSS: "box-sizing: border-box;border-radius: 26px;overflow: hidden;height: auto; transition-property: flex, border;transition-duration: 1s;transition-timing-function: ease-in-out;& div {display:flex;align-items: center;}& img {flex-grow: 1; max-width: 300px;min-width: 50px;}",
            markup: "<div style='background-color: {{second-color}};height:100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 1,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 2,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          },
          {
            type: "decoration",
            order: 3,
            CSS: "border-radius: 50%;color: white;height: 100%;",
            markup: "<div style='background-color: {{color}};height: 100%;'></div>"
          }
        ],
        CSS: "padding-top: 4px;padding-bottom: 4px;gap: 8px;background: none;& .decoration:hover>div {box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px; filter: brightness(1.2)} & .decoration>div {border-radius: 50%; box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;",
        decorationWidth: "52px",
        order: 1
      }
      // {
      //   type: "decoration",
      //   order: 0,
      //   css: "background-color: slategray; color: white; div {text-align: left;}",
      //   markup: "<div style='width: fit-content;'>My text decoration</div>",
      //   onClickHandler: () => console.log("decoration clicked")
      // },
    ],
    decorationWidth: "10%",
    order: 1,
    CSS: "overflow: visible!important;"
  },
  {
    type: "decoration",
    order: 0,
    CSS: "",
    markup: ""
  }
], ko = ({ className: e, style: r, widthPreset: t = 0, scale: n = 1, animationDelay: o = 5e3 }) => {
  const { plotData: a, dataMax: i, theme: c, orientation: u, vars: l } = U(J), v = se(null);
  He(() => {
    a.set([[4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9]]), i.set(40), l.set({
      color: [
        "#3D405B",
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#f2cc8f",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        [
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#f2cc8f",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B",
          "#3D405B"
        ],
        "#3D405B"
      ],
      "z-index": ["10"],
      "second-color": ["#444444"]
    });
  }, []), Ue(() => (y(), () => {
    v.current && clearInterval(v.current);
  }), []);
  const p = () => {
    v.current !== null && clearInterval(v.current), a[1][0].set(4), a[2][0].set(4), a[3][0].set(4), a[4][0].set(4), a[5][0].set(4), a[6][0].set(4), a[7][0].set(4);
  }, y = () => {
    const f = setInterval(() => {
      const s = a.peek();
      JSON.stringify(s) !== JSON.stringify([[4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9], [4, 9]]) ? (a[1][0].set(4), a[2][0].set(4), a[3][0].set(4), a[4][0].set(4), a[5][0].set(4), a[6][0].set(4), a[7][0].set(4)) : (a[1][0].set(Math.floor(Math.random() * 10)), a[2][0].set(Math.floor(Math.random() * 10)), a[3][0].set(Math.floor(Math.random() * 10)), a[4][0].set(Math.floor(Math.random() * 10)), a[5][0].set(Math.floor(Math.random() * 10)), a[6][0].set(Math.floor(Math.random() * 10)), a[7][0].set(Math.floor(Math.random() * 10)));
    }, o);
    v.current = f;
  };
  return /* @__PURE__ */ oe.jsx(J.Provider, { value: { plotData: a, dataMax: i, orientation: u, theme: c, vars: l }, children: /* @__PURE__ */ oe.jsx("div", { id: "plot", className: "plot " + e, style: { margin: "auto", width: 660 + t * 120 + "px", minWidth: "660px", maxWidth: "1260px", display: "grid", justifyContent: "center", overflow: "hidden", transform: "scale(" + n + ")", ...r }, onMouseEnter: p, onMouseLeave: y, children: /* @__PURE__ */ oe.jsx(
    ro,
    {
      id: "bar_plot_1",
      width: "2442px",
      height: "540px",
      decorationWidth: "2.9rem",
      style: { margin: "auto", paddingBottom: "4px" },
      segmentTemplate: oo
    }
  ) }) });
};
export {
  Eo as ANIMATED_DOTS_DEFAULT_CSS,
  Do as ANIMATED_DOTS_DEFAULT_MARKUP,
  ko as AnimatedDots,
  Hn as BAR_PLOT_DEFAULT_CSS,
  ho as BAR_PLOT_DEFAULT_MARKUP,
  Gn as BAR_PLOT_DEFAULT_TEMPLATE,
  to as BW_PLOT_DEFAULT_CSS,
  yo as BW_PLOT_DEFAULT_MARKUP,
  no as BW_PLOT_DEFAULT_TEMPLATE,
  Bn as Bar,
  Fn as BarAndDecContainer,
  lt as BarContentContainer,
  Be as BarContext,
  go as BarPlot,
  fr as BarTemplate,
  pr as BarsAndDecsTemplate,
  wo as BoxAndWhiskerPlot,
  ie as DecTemplate,
  Ze as Decoration,
  ut as FullBar,
  lo as PLOT_DEFAULT_CSS,
  uo as PLOT_DEFAULT_MARKUP,
  po as Plot,
  Ye as PlotAreaTemplate,
  J as PlotContext,
  ft as PlotSegment,
  Yn as SCALE_DEFAULT_TEMPLATE,
  Kn as SEGMENT_PLOT_DEFAULT_CSS,
  vo as SEGMENT_PLOT_DEFAULT_MARKUP,
  Qn as SEGMENT_PLOT_DEFAULT_TEMPLATE,
  co as Scale,
  ro as SegmentPlot,
  jn as SegmentTemplate,
  pt as bPChangeBWOrder,
  Jn as bPChangeBarOrder,
  eo as bPChangeSegmentOrder,
  qn as changeOrder,
  So as convertBWData,
  xo as orderBWsByPosition,
  mo as orderBarsByMagnitude,
  fo as orderByMagnitude,
  bo as orderSegmentsByMagnitude
};
