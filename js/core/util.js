'use strict';
// General utilities: DOM, number formatting, storage, and downloads
(function (EL) {
  const U = {};
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  // h('div.cls#id', {attrs}, children...)
  U.h = function (tag, attrs, ...kids) {
    const m = tag.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement(m && m[1] ? m[1] : 'div');
    if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => { if (t === '.') el.classList.add(n); else el.id = n; });
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  };

  // Uniform reading format: undefined values show as "undefined", with no zero padding
  U.fmt = function (x, d) {
    if (x == null || typeof x !== 'number' || !isFinite(x)) return 'undefined';
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-4) return x.toExponential(3);
    return (+x.toPrecision(d || 5)).toString();
  };
  U.fmtVec = (v, d) => v && v.every(isFinite) ? '(' + v.map(x => U.fmt(x, d || 4)).join(', ') + ')' : 'undefined';

  U.download = function (name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  U.store = {
    get(k, def) { try { const s = localStorage.getItem('ejp-lab-en:' + k); return s == null ? def : JSON.parse(s); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('ejp-lab-en:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('ejp-lab-en:' + k); } catch (e) { /* ignore */ } }
  };

  U.toast = function (msg, ms) {
    let t = U.$('#toast');
    if (!t) { t = U.h('div#toast'); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(U.toast._t);
    U.toast._t = setTimeout(() => t.classList.remove('show'), ms || 2200);
  };

  U.csv = rows => '﻿' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');

  // Subscripts and superscripts in text: E_A → E<sub>A</sub>, E_{AB} → E<sub>AB</sub>, r^2 → r<sup>2</sup>; escape first to avoid raw underscores
  U.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // When svg is true, output markup usable inside SVG <text> (radicals use tspan, see U.svgRad)
  U.rich = function (s, svg) {
    const keep = [];
    const out = U.esc(U.radMark(String(s), keep, svg))
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
      .replace(/([A-Za-zΣθαφρλσε′])_([A-Za-z0-9′]+)/g, '$1<sub>$2</sub>')
      .replace(/([A-Za-z0-9)])\^([0-9\-]+)/g, '$1<sup>$2</sup>');
    return out.replace(/\u0001(\d+)\u0001/g, (_, i) => keep[i]);
  };
  // Radicals in text: 16√21/9, √(28/27), (q/a²)√(1+1/27), √3a, √|E|
  // Uses MathML <msqrt>, so the math font (Cambria Math) draws the full radical from its font parameters; the coefficient, radicand and denominator form one formula that does not break across lines.
  // Matches: [coefficient]√(radicand)[single letter][/denominator]; the radicand is a number, (…) or |…|
  const RAD = /([0-9]+(?:\.[0-9]+)?)?√(?:\(([^()]+)\)|\|([^|]+)\||([0-9]+(?:\.[0-9]+)?))([a-zA-Z](?![a-zA-Z0-9+\-]))?(?:\/([0-9]+)(?![0-9.]))?/g;
  const radTeX = (k, g, abs, n, v, d) => {
    // A fraction a/b in the radicand is set as a fraction; ² and ³ are recognized as superscripts by EL.tex
    const inner = g != null ? g.replace(/([0-9]+)\/([0-9]+)/g, '\\frac{$1}{$2}').replace(/−/g, '-') : abs != null ? '|' + abs + '|' : n;
    const top = (k || '') + '\\sqrt{' + inner + '}' + (v || '');
    return d ? '\\frac{' + top + '}{' + d + '}' : top;
  };
  // Replace each radical with a placeholder \u0001n\u0001, and put it back after escaping and sub/superscript handling
  U.radMark = (s, keep, svg) => s.replace(RAD, (all, k, g, abs, n, v, d) => {
    let html;
    if (svg) html = U.svgRad(all);
    else if (EL.tex) html = EL.tex(radTeX(k, g, abs, n, v, d), false).replace(/^<math>/, '<math class="rm">');
    else return all;
    keep.push(html);
    return '\u0001' + (keep.length - 1) + '\u0001';
  });
  // MathML cannot be embedded in SVG text: the radical is written as a √ glyph with an overbar on the radicand. Both use Times New Roman:
  // in that font the top stroke of the √ glyph is at the same height and thickness as the overbar, so they join into one line (measured pixel by pixel in Chrome/Edge; Cambria Math is off by about 0.05em)
  const CM = 'font-family="Times New Roman, serif"';
  U.svgRad = s => s.replace(RAD, (all, k, g, abs, n, v, d) =>
    (k || '') + '<tspan class="svg-rs" ' + CM + '>√</tspan><tspan class="svg-rb" ' + CM + ' text-decoration="overline">' + U.esc(g != null ? g : abs != null ? '|' + abs + '|' : n) + '</tspan>' +
    (v ? '<tspan font-style="italic">' + v + '</tspan>' : '') + (d ? '/' + d : ''));
  U.rad = h => U.rich(h);
  // Inline $…$ formulas embedded in text (requires EL.tex to be loaded)
  U.richMath = s => String(s).split(/(\$[^$]+\$)/).map(part => /^\$[^$]+\$$/.test(part) ? EL.tex(part.slice(1, -1), false) : U.rich(part)).join('');
  // Numbers typed by students: √3, 2/3, 2√2, and π are allowed
  U.parseNum = function (s) {
    s = String(s).trim().replace(/−/g, '-').replace(/×/g, '*').replace(/([0-9)])\s*(√|π)/g, '$1*$2')
      .replace(/√\s*\(?([0-9.]+)\)?/g, 'Math.sqrt($1)').replace(/π/g, 'Math.PI');
    if (!s || !/^[-+*/(). 0-9eMathsqrPI]*$/.test(s)) return NaN;
    try { return Function('"use strict";return (' + s + ')')(); } catch (e) { return NaN; }
  };
  U.plain = s => String(s).replace(/_\{([^}]*)\}/g, '$1').replace(/_/g, '').replace(/\^\{([^}]*)\}/g, '^$1');
  U.rgb = c => 'rgb(' + c.map(x => Math.round(x * 255)).join(',') + ')';
  U.toHex = c => '#' + c.slice(0, 3).map(x => Math.round(U.clamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
  U.hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

  EL.U = U;
})(window.EL);
