'use strict';
// Core 3D vector analysis (shared by the lab and the worked-problem module)
// Geometric method: list component fields → symmetric grouping → angle by law of cosines → combine pairs or coplanar sets → combine partial sums → coordinate check
// Coordinate method: list component fields → relative position vectors → component table → sum and check
(function (EL) {
  const V = EL.V, U = EL.U, R = String.raw;
  const VA = EL.VA = {};
  const SUBS = '₀₁₂₃₄₅₆₇₈₉', sub = i => String(i).split('').map(d => SUBS[+d]).join('');
  const deg = x => x * 180 / Math.PI, f4 = x => U.fmt(x, 4), r1 = x => Math.round(x * 10) / 10;
  const tol = (a, b) => Math.abs(a - b) <= 1e-7 * Math.max(Math.abs(a), Math.abs(b), 1e-12);
  VA.f4 = f4;
  VA.ang = (a, b) => deg(Math.acos(U.clamp(V.dot(a, b) / (V.len(a) * V.len(b)), -1, 1)));
  // Angle options: the correct value plus two clearly different distractors
  VA.angOpts = function (th, extra) {
    const out = [r1(th)];
    for (const x of (extra || []).concat([180 - th, 90, 60, 120, 45, 135, 30, 150])) { const y = r1(x); if (out.length < 3 && y >= 0 && y <= 180 && out.every(z => Math.abs(z - y) > 4)) out.push(y); }
    return out.sort((a, b) => a - b).map(x => x + '°');
  };

  // ---- Exact-value recognition: x = (m/d)√n (identified numerically, for reference) ----
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  function rat(y, maxQ) {
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, x = y;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(x), h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxQ) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(h1 / k1 - y) < 1e-12 * Math.max(1, y)) break;
      const fr = x - a; if (fr < 1e-12) break; x = 1 / fr;
    }
    return k1 ? { p: h1, q: k1 } : null;
  }
  // maxQ and rel are optional: tables use a larger denominator limit together with a stricter relative error, so that ordinary decimals are not mistaken for radicals
  VA.nice = function (x, maxQ, rel) {
    if (!isFinite(x)) return null;
    if (Math.abs(x) < 1e-9) return { text: '0', tex: '0' };
    const y = x * x, r = rat(y, maxQ || 3000);
    // Tiny nonzero values (e.g. numerical residue near a zero-field point) are not written as radicals, to avoid "√0"
    if (!r || !r.p || Math.abs(r.p / r.q - y) > (rel ? rel * y : 1e-9 * Math.max(1, y))) return null;
    let inn = r.p * r.q, out = 1;
    if (inn > 1e12) return null;
    for (let f = 2; f * f <= inn; f++) while (inn % (f * f) === 0) { inn /= f * f; out *= f; }
    const g = gcd(out, r.q), num = out / g, den = r.q / g;
    if (inn > 5000 || den > 500 || num > 2000) return null;
    const s = x < 0 ? '−' : '', st = x < 0 ? '-' : '';
    const nT = num === 1 && inn !== 1 ? '' : String(num), rad = inn === 1 ? '' : '√' + inn, radT = inn === 1 ? '' : R`\sqrt{${inn}}`;
    return { text: s + nT + rad + (den !== 1 ? '/' + den : ''), tex: st + (den !== 1 ? R`\frac{${nT + radT || '1'}}{${den}}` : nT + radT) };
  };
  // Try the usual limit first; if nothing is recognized, retry with a larger denominator limit and a stricter tolerance (e.g. 32/125, √6/144)
  const niceX = x => VA.nice(x) || VA.nice(x, 40000, 1e-13);
  VA.texV = x => { const n = niceX(x); return n ? n.tex : f4(x); };
  VA.txtV = x => { const n = niceX(x); return n ? n.text : '≈' + f4(x); };
  // For body text: "is 2√3" or "is approximately 3.4641"
  const isV = x => { const n = niceX(x); return n ? 'is ' + n.text : 'is approximately ' + f4(x); };
  // For tables and readouts: only simple radicals (radicand at most 200, coefficient and denominator at most 999) are written as radicals; otherwise four significant digits
  VA.cell = function (x) {
    if (typeof x !== 'number' || !isFinite(x)) return U.fmt(x);
    const n = niceX(x), m =n && n.text.replace(/^−/, '').match(/^(\d*)(?:√(\d+))?(?:\/(\d+))?$/);
    if (m && +(m[1] || 1) <= 999 && +(m[2] || 1) <= 200 && +(m[3] || 1) <= 999) return n.text;
    return f4(x).replace(/^-/, '−');
  };
  // Vectors with the same direction that coincide are shifted slightly in the perpendicular direction so each one stays visible (returns an offset array the same length as vs; .rank is the index within the group)
  VA.offsets = function (vs, gap) {
    const out = vs.map(() => [0, 0, 0]), seen = new Set();
    out.rank = vs.map(() => 0);
    for (let i = 0; i < vs.length; i++) {
      if (seen.has(i) || !(V.len(vs[i]) > 1e-12)) continue;
      const ui = V.norm(vs[i]), grp = [i];
      for (let j = i + 1; j < vs.length; j++) if (!seen.has(j) && V.len(vs[j]) > 1e-12 && V.dot(ui, V.norm(vs[j])) > 0.9995) grp.push(j);
      if (grp.length < 2) continue;
      grp.forEach(j => seen.add(j));
      let n = V.cross(ui, [0, 0, 1]);
      if (V.len(n) < 0.3) n = V.cross(ui, [1, 0, 0]);
      n = V.norm(n);
      grp.forEach((j, k) => { out[j] = V.mul(n, (k - (grp.length - 1) / 2) * gap); out.rank[j] = k; });
    }
    return out;
  };

  // ---- Component fields ----
  VA.parts = function (sources, P, rMin) {
    const out = [];
    for (const s of sources) {
      if (!s.q) continue;
      const d = V.sub(P, s.p), r = V.len(d);
      if (r <= (rMin || 1e-9)) return null;
      const u = V.mul(d, Math.sign(s.q) / r), mag = Math.abs(s.q) / (r * r);
      out.push({ label: s.label, q: s.q, p: s.p, d, r, mag, u, E: V.mul(u, mag), n: 'E_' + s.label });
    }
    return out;
  };
  VA.sum = list => list.reduce((s, x) => V.add(s, x.E || x), [0, 0, 0]);
  // Whether P and the given points are coplanar: returns {n} (n is null when all are collinear); returns null when not coplanar
  VA.planeOf = function (P, pts) {
    const vs = pts.map(q => V.sub(q, P));
    let n = null;
    for (let i = 0; i < vs.length && !n; i++) for (let j = i + 1; j < vs.length && !n; j++) {
      const c = V.cross(vs[i], vs[j]);
      if (V.len(c) > 1e-6 * V.len(vs[i]) * V.len(vs[j])) n = V.norm(c);
    }
    if (!n) return { n: null };
    for (const v of vs) if (Math.abs(V.dot(v, n)) > 1e-6 * Math.max(1, V.len(v))) return null;
    return { n };
  };
  // Direction description: along the line through two named points, or perpendicular to the plane through three
  VA.describe = function (v, named, refs) {
    const L = V.len(v);
    if (!(L > 1e-12)) return 'zero';
    const u = V.mul(v, 1 / L), N = (named || []).slice(0, 16);
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const d = V.sub(N[j].p, N[i].p), l = V.len(d);
      if (l < 1e-9) continue;
      const c = V.dot(u, d) / l;
      if (c > 0.99999) { if (refs) refs.push(N[i], N[j]); return 'along ' + N[i].n + '→' + N[j].n; }
      if (c < -0.99999) { if (refs) refs.push(N[i], N[j]); return 'along ' + N[j].n + '→' + N[i].n; }
    }
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) for (let k = j + 1; k < N.length; k++) {
      const n = V.cross(V.sub(N[j].p, N[i].p), V.sub(N[k].p, N[i].p)), l = V.len(n);
      if (l < 1e-9) continue;
      if (Math.abs(V.dot(u, n)) / l > 0.99999) { if (refs) refs.push(N[i], N[j], N[k]); return 'perpendicular to plane ' + N[i].n + N[j].n + N[k].n; }
    }
    return null;
  };
  // ---- Symmetric grouping: component fields of equal magnitude form groups (a group of 3 or more that is coplanar → plane group; otherwise pairs), the rest form the "rest" group ----
  VA.group = function (parts, P) {
    const used = new Set(), groups = [];
    const cls = [];
    for (const x of parts) { const c = cls.find(k => tol(k[0].mag, x.mag)); if (c) c.push(x); else cls.push([x]); }
    cls.sort((a, b) => b.length - a.length || b[0].mag - a[0].mag);
    for (const c of cls) {
      if (c.length < 2) continue;
      if (c.length >= 3) { const pl = VA.planeOf(P, c.map(x => x.p)); if (pl && pl.n) { groups.push({ type: 'plane', items: c, n: pl.n }); c.forEach(x => used.add(x)); continue; } }
      for (let i = 0; i + 1 < c.length; i += 2) { groups.push({ type: 'pair', items: [c[i], c[i + 1]] }); used.add(c[i]); used.add(c[i + 1]); }
    }
    const rest = parts.filter(x => !used.has(x));
    if (!groups.length && rest.length >= 2) { const s = rest.slice().sort((a, b) => b.mag - a.mag); groups.push({ type: 'pair', items: [s[0], s[1]], unequal: true }); used.add(s[0]); used.add(s[1]); }
    const left = parts.filter(x => !used.has(x));
    if (left.length === 1) groups.push({ type: 'single', items: left });
    else if (left.length > 1) groups.push({ type: 'rest', items: left });
    const multi = groups.length > 1;
    groups.forEach((g, i) => { g.S = VA.sum(g.items); g.name = multi ? 'Σ' + sub(i + 1) : 'E'; g.tex = multi ? R`\vec\Sigma_{${i + 1}}` : R`\vec E`; g.i = i; });
    return groups;
  };
  const combos = (arr, k) => { const out = []; const rec = (s, a) => { if (a.length === k) return out.push(a); for (let i = s; i < arr.length && out.length < 40; i++) rec(i + 1, a.concat(arr[i])); }; rec(0, []); return out; };

  // ---- Synthesis plan: returns an array of steps (each {id, title, text, tex, ask, rows, view, hide}) with .d attached ----
  VA.plan = function (o) {
    const parts = o.parts, P = o.P, named = o.named || [], unit = o.unit || 'kQ/L²', rU = o.rUnit || 'L', pn = o.pName || 'P';
    const T = VA.sum(parts), groups = VA.group(parts, P), hide = o.hide ? ['lines', 'contours', 'surfaces', 'flow'] : null;
    const d = { P, parts, groups, T, named, pn, partial: !!o.partial }, steps = [];
    const dir = v => VA.describe(v, named);
    steps.push({ id: 'list', title: 'List the component fields', text: (o.partial ? 'Only ' + parts.map(x => x.n).join(', ') + ', selected in free synthesis, are combined this time. The result is their vector sum, not the net field at ' + pn + '. ' : '') + 'The electric field that each source produces alone at ' + pn + ' is a component field, with magnitude |E_i| = k|q_i|/r_i². The component field of a positive source points away from that source, and that of a negative source points toward it.',
      rows: [['Source', 'q', 'r / ' + rU, '|E_i| / ' + unit, 'Direction']].concat(parts.map(x => [x.label, VA.cell(x.q), VA.cell(x.r), VA.txtV(x.mag), (x.q > 0 ? 'away from ' : 'toward ') + x.label])) });
    if (o.method === 'coord') return VA.coordSteps(o, d, steps);
    const g0 = groups.find(g => g.type === 'pair' && !g.unequal || g.type === 'plane');
    if (parts.length > 2 && g0) {
      const right = g0.items.map(x => x.n).join(', '), wrong = combos(parts, g0.items.length).filter(c => !c.every((x, i) => tol(x.mag, c[0].mag))).slice(0, 2).map(c => c.map(x => x.n).join(', '));
      const sameRQ = g0.items.every(x => tol(x.r, g0.items[0].r) && tol(Math.abs(x.q), Math.abs(g0.items[0].q)));
      steps.push({ id: 'group', title: 'Find the equal component fields', text: 'Sources that are the same distance from ' + pn + ' and have charges of the same magnitude produce component fields of equal magnitude at ' + pn + '. Combine these equal component fields first.',
        ask: wrong.length ? { q: 'Which set of component fields has equal magnitudes?', options: [right].concat(wrong).sort(), a: right,
          why: sameRQ ? 'These sources are all at distance ' + VA.cell(g0.items[0].r) + ' ' + rU + ' from ' + pn + ' and their charges have the same magnitude.' : 'The magnitude of each of these component fields ' + isV(g0.items[0].mag) + ' ' + unit + '.' } : null });
    }
    for (const g of groups) {
      if (g.type === 'pair' && VA.isSim(g, P)) steps.push(VA.simStep(g, d), VA.simSumStep(g, d, hide, dir));
      else if (g.type === 'pair') steps.push(VA.angleStep(g, d), VA.pairStep(g, d, hide, dir));
      else if (g.type === 'plane') steps.push(VA.planeStep(g, d, hide), VA.chainStep(g, d, hide, dir, unit));
      else if (g.type === 'rest') steps.push(VA.chainStep(g, d, hide, dir, unit));
    }
    if (groups.length > 1) steps.push(...(VA.tetraSteps(d, hide) || [VA.combineStep(d, hide, dir, unit)]));
    steps.push(VA.checkStep(d, unit));
    steps.d = d;
    return steps;
  };

  // Angle between two component fields: the law of cosines in triangle S_i P S_j gives ∠S_iPS_j, then the signs of the two sources give the angle between the fields
  VA.angleStep = function (g, d) {
    const [a, b] = g.items, pn = d.pn, ab = V.dist(a.p, b.p), cg = (a.r * a.r + b.r * b.r - ab * ab) / (2 * a.r * b.r), geo = deg(Math.acos(U.clamp(cg, -1, 1)));
    const same = Math.sign(a.q) === Math.sign(b.q), th = same ? geo : 180 - geo;
    const geoName = '∠' + a.label + pn + b.label, inl = V.len(V.cross(a.d, b.d)) > 1e-10 * a.r * b.r;
    // Three collinear points: the two component fields lie on one line, so the angle follows directly from the directions (no law of cosines)
    if (!inl) {
      const between = geo >= 90, par = th < 90;
      return { id: 'angle', g, title: 'Find the directions of ' + a.n + ' and ' + b.n, th,
        text: pn + ', ' + a.label + ' and ' + b.label + ' are collinear, and ' + pn + (between ? ' lies between ' + a.label + ' and ' + b.label : ' lies on the extension of segment ' + a.label + b.label) + ', so ' + a.n + ' and ' + b.n + ' both lie along this line. ' +
          'The two sources have ' + (same ? 'the same sign' : 'opposite signs') + ', so the two component fields point ' + (par ? 'the same way and the angle between them is 0°.' : 'in opposite directions and the angle between them is 180°.'),
        tex: R`\theta=${par ? '0' : '180'}^\circ` };
    }
    return { id: 'angle', g, title: 'Find the angle between ' + a.n + ' and ' + b.n, th,
      text: 'In triangle ' + a.label + pn + b.label + ', the law of cosines gives ' + geoName + '. ' +
        (same ? 'The two sources have the same sign, so the angle between ' + a.n + ' and ' + b.n + ' equals ' + geoName + '.' : 'The two sources have opposite signs, so the angle between ' + a.n + ' and ' + b.n + ' is the supplement of ' + geoName + '.'),
      tex: R`\cos\angle ${a.label}${pn}${b.label}=\frac{r_{${a.label}}^2+r_{${b.label}}^2-|${a.label}${b.label}|^2}{2r_{${a.label}}r_{${b.label}}}=${VA.texV(cg)}\quad\theta=${same ? '' : '180^\\circ-'}\angle ${a.label}${pn}${b.label}=${f4(th)}^\circ`,
      view: inl ? V.cross(V.sub(a.p, d.P), V.sub(b.p, d.P)) : null };
  };
  // ---- Similar-triangle method: two sources at equal distance from the field point, with charges of equal magnitude, not collinear with the field point ----
  // Opposite signs: E₊ ∥ (P − positive source), E₋ ∥ (negative source − P). The tip-to-tail vector triangle is a scaled copy of triangle "positive source, P, negative source", with ratio E/r,
  //       so Σ points from the positive source to the negative source and |Σ| = E·|ab|/r.
  // Same sign: half of the rhombus (sides E_a and Σ/2) is similar to triangle a M P (M is the midpoint of ab), and |Σ| = 2E·|PM|/r.
  VA.isSim = function (g, P) {
    const [a, b] = g.items;
    if (g.unequal || !tol(a.r, b.r) || !tol(Math.abs(a.q), Math.abs(b.q))) return false;
    return V.len(V.cross(V.sub(a.p, P), V.sub(b.p, P))) > 1e-6 * a.r * b.r;
  };
  const simInfo = function (g, d) {
    const [a, b] = g.items, opp = Math.sign(a.q) !== Math.sign(b.q), E = a.mag, r = a.r, ab = V.dist(a.p, b.p);
    const pos = opp ? (a.q > 0 ? a : b) : a, neg = opp ? (a.q > 0 ? b : a) : b;
    const mid = V.lerp(a.p, b.p, 0.5), pm = V.dist(d.P, mid);
    const known = (d.named || []).find(x => x.n !== d.pn && !d.parts.some(p => p.label === x.n) && V.dist(x.p, mid) < 1e-9);
    const used = new Set((d.named || []).map(x => x.n).concat(d.parts.map(x => x.label), [d.pn], d.groups.map(g => g.midName)));
    let mn = g.midName || (known && known.n) || ['M', 'N', 'K', 'H'].find(x => !used.has(x));
    for (let i = 1; !mn; i++) if (!used.has('M' + i)) mn = 'M' + i;
    g.midName = mn;
    const apex = deg(Math.acos(U.clamp((2 * r * r - ab * ab) / (2 * r * r), -1, 1)));
    return { a, b, opp, E, r, ab, pos, neg, mn, mid, pm, apex, th: opp ? 180 - apex : apex };
  };
  VA.simStep = function (g, d) {
    const s = simInfo(g, d), pn = d.pn, { pos, neg, mn } = s, nm = g.name;
    const tri = s.opp ? pos.label + pn + neg.label : s.a.label + mn + pn, apexN = '∠' + s.a.label + pn + s.b.label;
    let text, tex, ask;
    if (s.opp) {
      const base = '∠' + pn + pos.label + neg.label, right = 'from ' + pos.label + ' to ' + neg.label;
      text = pos.n + ' points from ' + pos.label + ' to ' + pn + ' and ' + neg.n + ' points from ' + pn + ' to ' + neg.label + '. Both have magnitude E₀, and ' + pn + pos.label + ' = ' + pn + neg.label + ' = r. ' +
        'Translate ' + neg.n + ' to the tip of ' + pos.n + '. Two sides of the vector triangle are parallel to ' + pos.label + pn + ' and ' + pn + neg.label + ', and their ratio equals ' + pn + pos.label + ' : ' + pn + neg.label + ', so the vector triangle is similar to triangle ' + tri + ', with similarity ratio E₀/r. ' +
        'Corresponding angles of similar triangles are equal: the angle between ' + nm + ' and ' + pos.n + ' equals ' + base + ', and the angle θ between the two component fields is the supplement of ' + apexN + '.';
      tex = R`\cos\angle ${pn}${pos.label}${neg.label}=\frac{|${pos.label}${neg.label}|/2}{r}=${VA.texV(s.ab / 2 / s.r)}\qquad\cos\angle ${s.a.label}${pn}${s.b.label}=${VA.texV((2 * s.r * s.r - s.ab * s.ab) / (2 * s.r * s.r))}\quad\theta=180^\circ-\angle ${s.a.label}${pn}${s.b.label}=${f4(s.th)}^\circ`;
      ask = { q: 'In which direction does ' + nm + ' point?', options: [right, 'from ' + neg.label + ' to ' + pos.label, 'from ' + pn + ' to the midpoint of ' + pos.label + neg.label].sort(), a: right,
        why: 'The vector triangle is similar to triangle ' + tri + ', and ' + nm + ' corresponds to side ' + pos.label + neg.label + ', so ' + nm + ' points ' + right + '.' };
    } else {
      const toP = s.a.q > 0, right = toP ? 'from ' + mn + ' to ' + pn : 'from ' + pn + ' to ' + mn;
      text = 'Let ' + mn + ' be the midpoint of ' + s.a.label + s.b.label + '. The two component fields have magnitude E₀, so the parallelogram with them as adjacent sides is a rhombus, and its diagonal ' + nm + ' bisects the angle between them. ' +
        'The triangle formed by half of the rhombus (sides ' + s.a.n + ' and ' + nm + '/2) is similar to triangle ' + tri + ', with similarity ratio E₀/r. ' +
        'Corresponding angles of similar triangles are equal: the angle between ' + nm + ' and ' + s.a.n + ' equals ∠' + s.a.label + pn + mn + ', and the angle θ between the two component fields equals ' + apexN + '.';
      tex = R`|${pn}${mn}|=\sqrt{r^2-(|${s.a.label}${s.b.label}|/2)^2}=${VA.texV(s.pm)}\qquad\cos\angle ${s.a.label}${pn}${mn}=\frac{|${pn}${mn}|}{r}=${VA.texV(s.pm / s.r)}\quad\theta=\angle ${s.a.label}${pn}${s.b.label}=${f4(s.th)}^\circ`;
      ask = { q: 'In which direction does ' + nm + ' point?', options: [right, toP ? 'from ' + pn + ' to ' + mn : 'from ' + mn + ' to ' + pn, 'from ' + s.a.label + ' to ' + s.b.label].sort(), a: right,
        why: 'The diagonal ' + nm + ' of the rhombus corresponds to side ' + mn + pn + ' of triangle ' + tri + '. Both sources are ' + (toP ? 'positive, so ' : 'negative, so ') + nm + ' points ' + right + '.' };
    }
    return { id: 'similar', g, sim: s, th: s.th, title: 'Combine ' + s.a.n + ' and ' + s.b.n + ' using similar triangles', text, tex, ask,
      setup: 'Let ' + mn + ' be the midpoint of segment ' + s.a.label + s.b.label + '.',
      view: V.cross(V.sub(s.a.p, d.P), V.sub(s.b.p, d.P)) };
  };
  VA.simSumStep = function (g, d, hide, dir) {
    const s = simInfo(g, d), pn = d.pn, nm = g.name, L = V.len(g.S), D = dir(g.S);
    const text = s.opp
      ? 'In similar triangles corresponding sides are proportional, so |' + nm + '| : E₀ = ' + s.pos.label + s.neg.label + ' : r. Hence |' + nm + '| = E₀ × ' + s.pos.label + s.neg.label + '/r, and |' + nm + '| ' + isV(L) + '.'
      : 'In similar triangles corresponding sides are proportional, so |' + nm + '|/2 : E₀ = ' + pn + s.mn + ' : r. Hence |' + nm + '| = 2E₀ × ' + pn + s.mn + '/r, and |' + nm + '| ' + isV(L) + '.';
    const tex = s.opp
      ? R`|${g.tex}|=E_0\cdot\frac{|${s.pos.label}${s.neg.label}|}{r}=${VA.texV(s.E)}\times${VA.texV(s.ab / s.r)}=${VA.texV(L)}`
      : R`|${g.tex}|=2E_0\cdot\frac{|${pn}${s.mn}|}{r}=2\times${VA.texV(s.E)}\times${VA.texV(s.pm / s.r)}=${VA.texV(L)}`;
    return { id: 'pairSum', g, sim: s, title: 'Find the magnitude and direction of ' + nm, hide, view: V.cross(s.a.E, s.b.E), text: text + (D ? ' ' + nm + ' points ' + D + '.' : ''), tex };
  };
  VA.pairStep = function (g, d, hide, dir) {
    const [a, b] = g.items, eq = tol(a.mag, b.mag), zero = V.len(g.S) < 1e-12, D = zero ? null : dir(g.S);
    const col = V.len(V.cross(a.E, b.E)) <= 1e-9 * a.mag * b.mag, para = V.dot(a.E, b.E) > 0;
    return { id: 'pairSum', g, title: 'Combine ' + a.n + ' and ' + b.n, hide, view: V.len(V.cross(a.E, b.E)) > 1e-12 ? V.cross(a.E, b.E) : null,
      text: zero ? a.n + ' and ' + b.n + ' have equal magnitudes and opposite directions, so their vector sum ' + g.name + ' is zero.' :
        (col ? a.n + ' and ' + b.n + ' lie on the same line and point ' + (para ? 'the same way, so the magnitude of ' + g.name + ' is the sum of their magnitudes.' : 'in opposite directions, so the magnitude of ' + g.name + ' is the difference of their magnitudes, and ' + g.name + ' points the same way as the larger component field.')
          : 'Take ' + a.n + ' and ' + b.n + ' as adjacent sides of a parallelogram. The diagonal represents their vector sum ' + g.name + '.' + (eq ? ' The two component fields have equal magnitudes, so ' + g.name + ' lies along the bisector of the angle between them.' : '')) + (D ? ' ' + g.name + ' points ' + D + '.' : ''),
      tex: col && !zero ? R`|${g.tex}|=${para ? 'E_1+E_2' : '|E_1-E_2|'}=${VA.texV(V.len(g.S))}` : eq ? R`|${g.tex}|=2E\cos\frac{\theta}{2}=${VA.texV(V.len(g.S))}` : R`|${g.tex}|=\sqrt{E_1^2+E_2^2+2E_1E_2\cos\theta}=${VA.texV(V.len(g.S))}` };
  };
  VA.planeStep = function (g, d, hide) {
    const lb = g.items.map(x => x.label).join(''), pn = d.pn;
    const ns = g.items.map(x => x.n).join(', ');
    return { id: 'plane', g, title: 'Check that these component fields are coplanar', hide, view: g.n,
      text: pn + ' and ' + g.items.map(x => x.label).join(', ') + ' lie in one plane, so ' + ns + ' all lie in that plane. Next derive the vector sum from distances; no angle needs to be estimated from the view.',
      ask: { q: 'In which plane do ' + ns + ' lie?', options: ['Plane ' + lb + ' (containing ' + pn + ')', 'A plane perpendicular to it', 'They are not coplanar'], a: 'Plane ' + lb + ' (containing ' + pn + ')', why: pn + ' and ' + g.items.map(x => x.label).join(', ') + ' are coplanar, and each component field lies along the line from ' + pn + ' to its source, so all of them lie in that plane.' } };
  };
  // Law of cosines on source triangles, then distributivity of the scalar product.
  const lengthProof = function (items, other) {
    const pairs = [];
    items.forEach((a, i) => (other || items.slice(i + 1)).forEach(b => {
      const distance = V.dist(a.p, b.p), cosine = U.clamp((a.r * a.r + b.r * b.r - distance * distance) / (2 * a.r * b.r), -1, 1);
      pairs.push({ a, b, distance, c: Math.sign(a.q * b.q) * a.mag * b.mag * cosine });
    }));
    const dot = pairs.reduce((sum, p) => sum + p.c, 0);
    return { pairs, dot, squared: items.reduce((sum, a) => sum + a.mag * a.mag, 0) + 2 * dot };
  };
  const proofRows = p => [['Source pair', 'r_i', 'r_j', 'd_ij', 'C_ij']].concat(p.pairs.map(x => [x.a.label + ' / ' + x.b.label, VA.cell(x.a.r), VA.cell(x.b.r), VA.cell(x.distance), VA.cell(x.c)]));
  const proofTex = R`d_{ij}=|S_iS_j|,\quad C_{ij}=\vec E_i\cdot\vec E_j=\frac{k^2q_iq_j(r_i^2+r_j^2-d_{ij}^2)}{2r_i^3r_j^3}`;
  const proofText = 'Let r_i be the distance from the field point to source S_i, and d_ij the source separation. The law of cosines in the triangle formed by the two sources and the field point, with the charge signs, gives C_ij. The table lists the three lengths and C_ij in normalized platform units, k=1. Decimal readings are rounded; calculations use unrounded values.';
  VA.chainStep = function (g, d, hide, dir, unit) {
    const proof = lengthProof(g.items), D = V.len(g.S) > 1e-12 ? dir(g.S) : null;
    return { id: 'chainSum', g, proof, title: 'Find from distances: ' + g.name, hide, view: g.n || null,
      text: proofText + ' Place the component fields tip to tail. Expanding the squared vector sum determines its magnitude from lengths, without first finding a numerical angle.' + (D ? ' ' + g.name + ' points ' + D + '.' : ''), rows: proofRows(proof),
      tex: proofTex + R`\qquad |${g.tex}|^2=\sum_i E_i^2+2\sum_{i<j}C_{ij}=${VA.texV(g.items.reduce((s, a) => s + a.mag * a.mag, 0))}+2(${VA.texV(proof.dot)})=${VA.texV(Math.max(0, proof.squared))}\qquad |${g.tex}|=${VA.texV(V.len(g.S))}` };
  };

  // This construction applies only when all six edges form a regular tetrahedron.
  VA.tetraSteps = function (d, hide) {
    if (d.parts.length !== 3 || d.groups.length !== 2) return null;
    const pair = d.groups.find(g => g.type === 'pair'), single = d.groups.find(g => g.type === 'single');
    if (!pair || !single) return null;
    const [a, b] = pair.items, c = single.items[0], edge = a.r;
    if (!d.parts.every(x => tol(x.q, a.q) && tol(x.r, edge)) || ![V.dist(a.p, b.p), V.dist(a.p, c.p), V.dist(b.p, c.p)].every(x => tol(x, edge))) return null;
    const m = simInfo(pair, d), G = V.mul(V.add(V.add(a.p, b.p), c.p), 1 / 3), H = V.addS(d.P, V.sub(d.P, c.p), 0.5);
    const used = new Set(d.named.map(x => x.n).concat(d.parts.map(x => x.label), [d.pn, m.mn]));
    const name = (base, p) => {
      const known = d.named.find(x => !d.parts.some(s => s.label === x.n) && x.n !== d.pn && V.dist(x.p, p) < 1e-9);
      if (known) return known.n;
      let n = base, i = 0; while (used.has(n)) n = base + (++i); used.add(n); return n;
    };
    const gn = name('G', G), hn = name('H', H), pn = d.pn, mn = m.mn, cn = c.label;
    const tetra = { P: d.P, C: c.p, mid: m.mid, G, H, mn, gn, hn, edge };
    const shared = { tetra, hide, view: V.cross(V.sub(m.mid, d.P), V.sub(c.p, d.P)) };
    return [
      { ...shared, id: 'tetraHeight', title: 'Derive the tetrahedron lengths first',
        text: a.label + b.label + cn + pn + ' has six equal edges a, so it is a regular tetrahedron. ' + mn + ' is the midpoint of ' + a.label + b.label + ' and ' + gn + ' the base centroid. Each isosceles median is an altitude; the centroid divides a median in the ratio 2:1. Since ' + pn + ' is equidistant from the base vertices, its perpendicular foot is the base center ' + gn + '. Use Pythagoras for the height.',
        tex: R`a=|${pn}${a.label}|=|${pn}${b.label}|=|${pn}${cn}|=|${a.label}${b.label}|=|${a.label}${cn}|=|${b.label}${cn}|\qquad |${pn}${mn}|=|${cn}${mn}|=\frac{\sqrt3}{2}a,\quad |${cn}${gn}|=\frac23|${cn}${mn}|=\frac{a}{\sqrt3}\qquad |${pn}${gn}|=\sqrt{a^2-|${cn}${gn}|^2}=\sqrt{\frac23}a` },
      { ...shared, id: 'tetraSimilar', title: 'Construct a similar vector triangle',
        text: 'Extend ' + cn + pn + ' beyond ' + pn + ' to ' + hn + ', with ' + pn + hn + '=a/2. Points ' + cn + ', ' + gn + ', ' + mn + ' are collinear, as are ' + cn + ', ' + pn + ', ' + hn + '. The triangles share the included angle at ' + cn + ' and both adjacent-side ratios are 3/2. SAS similarity therefore gives the third side.',
        tex: R`|${pn}${hn}|=\frac a2,\quad |${cn}${hn}|=\frac32a,\quad\frac{|${cn}${mn}|}{|${cn}${gn}|}=\frac{|${cn}${hn}|}{|${cn}${pn}|}=\frac32\qquad △ ${cn}${mn}${hn}\sim△ ${cn}${gn}${pn},\quad |${mn}${hn}|=\frac32|${gn}${pn}|=\frac{\sqrt6}{2}a` },
      { ...shared, id: 'combine', title: 'Obtain the resultant from side ratios',
        text: pair.name + ' corresponds to ' + mn + '→' + pn + '; after translation ' + single.name + ' corresponds to ' + pn + '→' + hn + ' with the same scale factor. Their sum corresponds to ' + mn + '→' + hn + '. The side ratio √3:1:√6 gives the resultant magnitude directly. For negative charges all corresponding vectors reverse, preserving the lengths.',
        tex: R`E_0=\frac{k|q|}{a^2},\quad ${pair.tex}=\frac{2kq}{a^3}\vec{${mn}${pn}},\quad ${single.tex}=\frac{2kq}{a^3}\vec{${pn}${hn}}\qquad |${pair.tex}|:|${single.tex}|:|\vec E|=|${mn}${pn}|:|${pn}${hn}|:|${mn}${hn}|=\sqrt3:1:\sqrt6\qquad |\vec E|=\sqrt6 E_0=${VA.texV(V.len(d.T))}` }
    ];
  };
  VA.combineStep = function (d, hide, dir, unit) {
    const G = d.groups, two = G.length === 2 && G.every(g => V.len(g.S) > 1e-12);
    const proof = two ? lengthProof(G[0].items, G[1].items) : lengthProof(d.parts);
    const base = two ? V.dot(G[0].S, G[0].S) + V.dot(G[1].S, G[1].S) : d.parts.reduce((sum, a) => sum + a.mag * a.mag, 0);
    proof.squared = base + 2 * proof.dot;
    const square = two ? R`D=${G[0].tex}\cdot ${G[1].tex}=\sum C_{ij}=${VA.texV(proof.dot)}\qquad |\vec E|^2=|${G[0].tex}|^2+|${G[1].tex}|^2+2D` : R`|\vec E|^2=\sum_i E_i^2+2\sum_{i<j}C_{ij}`;
    const D = V.len(d.T) > 1e-12 ? dir(d.T) : null;
    return { id: 'combine', proof, title: 'Combine partial sums using known distances', hide,
      view: two && V.len(V.cross(G[0].S, G[1].S)) > 1e-12 ? V.cross(G[0].S, G[1].S) : null,
      text: proofText + (two ? ' By distributivity, adding C_ij across the two groups gives their scalar product D. Expand the squared resultant to find its magnitude; the Pythagorean theorem applies when D=0.' : ' Expand the squared sum of all component fields. This distance identity also covers vanishing groups and more than two remaining partial sums.') + (D ? ' The net field points ' + D + '.' : ''), rows: proofRows(proof),
      tex: proofTex + R`\qquad ` + square + R`=${VA.texV(base)}+2(${VA.texV(proof.dot)})=${VA.texV(Math.max(0, proof.squared))}\qquad |\vec E|=${VA.texV(V.len(d.T))}` };
  };
  VA.checkStep = function (d, unit) {
    const D = VA.describe(d.T, d.named), T = d.T;
    return { id: 'check', title: 'Check the result with the coordinate method', view: 'reset',
      text: (V.len(T) < 1e-12 ? (d.partial ? 'The vector sum of the selected component fields is zero.' : 'The net field at ' + d.pn + ' is zero.') : (d.partial ? 'The magnitude of the vector sum of the selected component fields ' : 'The magnitude of the net field at ' + d.pn + ' ') + isV(V.len(T)) + ' ' + unit + (D ? ', and it points ' + D : '') + '.') + ' Adding the x, y and z components of the component fields separately gives the same result as the geometric method.',
      rows: [['', 'E_x', 'E_y', 'E_z']].concat(d.parts.map(x => [x.n, VA.cell(x.E[0]), VA.cell(x.E[1]), VA.cell(x.E[2])]), [['Total', VA.cell(T[0]), VA.cell(T[1]), VA.cell(T[2])]]),
      tex: R`|\vec E|=\sqrt{E_x^2+E_y^2+E_z^2}=${VA.texV(V.len(T))}` };
  };
  VA.coordSteps = function (o, d, steps) {
    const T = d.T;
    steps.push({ id: 'coordR', title: 'Find the relative position vectors', text: 'The vector from each source to ' + d.pn + ' is d_i. It equals the position vector of ' + d.pn + ' minus the position vector of the source, and its length is the distance r_i.',
      rows: [['Source', 'd_x', 'd_y', 'd_z', 'r']].concat(d.parts.map(x => [x.label, VA.cell(x.d[0]), VA.cell(x.d[1]), VA.cell(x.d[2]), VA.cell(x.r)])), tex: R`\vec E_i=\frac{kq_i\,\vec d_i}{r_i^3}` });
    steps.push({ id: 'coordE', title: 'Sum the components', text: 'Adding the x, y and z components of the component fields separately gives the x, y and z components of the net field.',
      rows: [['', 'E_x', 'E_y', 'E_z']].concat(d.parts.map(x => [x.n, VA.cell(x.E[0]), VA.cell(x.E[1]), VA.cell(x.E[2])]), [['Total', VA.cell(T[0]), VA.cell(T[1]), VA.cell(T[2])]]) });
    const D = VA.describe(T, d.named);
    steps.push({ id: 'check', title: 'Find the magnitude and direction of the net field', view: 'reset', text: V.len(T) < 1e-12 ? 'All three component sums are zero, so ' + (d.partial ? 'the vector sum of the selected component fields is zero.' : 'the net field at ' + d.pn + ' is zero.') : (d.partial ? 'The magnitude of the vector sum of the selected component fields ' : 'The magnitude of the net field at ' + d.pn + ' ') + isV(V.len(T)) + ' ' + (o.unit || 'kQ/L²') + (D ? ', and it points ' + D : '') + '.',
      tex: R`|\vec E|=\sqrt{E_x^2+E_y^2+E_z^2}=${VA.texV(V.len(T))}` });
    steps.d = d;
    return steps;
  };

  // ---- Construction objects, added step by step as steps are revealed. o: {map(p)→display coordinates, scale, MH, C, R} ----
  VA.draw = function (steps, k, out, o) {
    const d = steps.d, MH = o.MH, C = o.C, M = o.map || (p => p), P = M(d.P), Rr = o.R;
    const ids = steps.slice(0, k + 1).map(s => s.id), at = id => ids.lastIndexOf(id), cur = steps[k] ? steps[k].id : '';
    const mx = Math.max(...d.parts.map(x => x.mag), ...d.groups.map(g => V.len(g.S)), V.len(d.T)), sc = 0.34 * Rr / mx * (o.vs || 1), S = v => V.mul(v, sc);
    const done = new Set();
    steps.slice(0, k + 1).forEach(s => { if ((s.id === 'pairSum' || s.id === 'chainSum') && s.g) s.g.items.forEach(x => done.add(x)); });
    const finished = at('combine') >= 0 || (at('check') >= 0 && d.groups.length === 1);
    const active = steps[o.step == null ? k : o.step], pending = o.step > k;
    const focus = active && active.g ? new Set(active.g.items) : null;
    const al = x => finished ? 0.2 : done.has(x) && !(focus && focus.has(x)) ? 0.25 : focus && !focus.has(x) ? 0.3 : 1;
    // Labeled vector: lf is the label position along the vector (1.06 is just outside the arrowhead); labels of coincident vectors are staggered
    const vec = (p, v, color, text, cls, width, lf) => {
      if (!(V.len(v) > 1e-9)) return;
      MH.vec(out, p, v, color, null, null, width);
      if (text) (out.labels = out.labels || []).push({ p: V.addS(p, v, lf || 1.06), text, cls: (cls || '') + ' vec', kind: 'vectors' });
    };
    // Reference geometry is visible before a prediction; the solution construction stays gated by k.
    if (active && pending && active.sim) {
      const m = active.sim;
      MH.tri(out, [M(m.a.p), P, M(m.b.p)], C.pot, 0.04);
      MH.dash(out, P, M(m.mid), C.ang);
      MH.mark(out, M(m.mid), m.mn, C.mark, Rr * 0.018);
    }
    if (active && active.id === 'combine' && pending) for (const g of d.groups) {
      if (g.type === 'single') vec(P, S(g.S), C.part, g.name, 'part', 2.8);
    }
    if (active && !pending) {
      const refs = [], vectors = active.id === 'combine' ? d.groups.map(g => g.S) : active.g ? [active.g.S] : active.id === 'check' ? [d.T] : [];
      vectors.forEach(v => VA.describe(v, d.named, refs));
      for (const q of refs) {
        if (d.parts.some(x => x.label === q.n) || q.n === d.pn || (out.labels || []).some(l => l.text === q.n)) continue;
        MH.mark(out, M(q.p), q.n, C.mark, Rr * 0.018);
        MH.dash(out, P, M(q.p), C.guide);
      }
    }
    if (active && active.tetra) {
      const t = active.tetra;
      const points = [{ n: t.mn, p: t.mid }, { n: t.gn, p: t.G }];
      const segments = [[t.C, t.mid], [t.G, t.P], [t.mid, t.P]];
      if (active.id !== 'tetraHeight') { points.push({ n: t.hn, p: t.H }); segments.push([t.C, t.H], [t.mid, t.H]); }
      for (const q of points) if (!(out.labels || []).some(l => l.text === q.n)) MH.mark(out, M(q.p), q.n, C.mark, Rr * 0.018);
      for (const [a, b] of segments) MH.dash(out, M(a), M(b), C.ang);
      if (active.id !== 'tetraHeight') MH.tri(out, [M(t.mid), P, M(t.H)], C.pot, 0.07);
      MH.right(out, M(t.G), V.sub(t.P, t.G), V.sub(t.mid, t.G), Rr * 0.025);
    }
    if (cur === 'list' || cur === 'coordR') for (const x of d.parts) { MH.dash(out, P, M(x.p), C.guide); (out.labels = out.labels || []).push({ p: V.lerp(P, M(x.p), 0.55), text: 'r=' + VA.cell(x.r), cls: 'pt', kind: 'vectors' }); }
    // Component fields with the same direction (e.g. collinear E_T1, E_T2) are offset perpendicular to it; labels go outside the arrowhead and at mid-length respectively
    const offs = VA.offsets(d.parts.map(x => x.E), Rr * 0.035), rank = offs.rank;
    d.parts.forEach((x, i) => { const a = al(x); vec(V.add(P, offs[i]), S(x.E), [...(x.q > 0 ? C.pos : C.neg), a], a > 0.5 ? x.n : null, x.q > 0 ? 'pos' : 'neg', 2.4, rank[i] % 2 ? 0.55 : 1.06); });
    const s = pending ? null : steps[k];
    if (s && s.id === 'angle') {
      const [a, b] = s.g.items;
      MH.tri(out, [P, M(a.p), M(b.p)], C.pot, 0.08);
      MH.arc(out, P, V.sub(M(a.p), P), V.sub(M(b.p), P), Rr * 0.1, '∠' + a.label + d.pn + b.label);
      MH.arc(out, P, a.E, b.E, Rr * 0.06, 'θ=' + r1(s.th) + '°');
    }
    // Similar triangles: the geometric triangle (light) and the tip-to-tail vector triangle
    if (s && (s.id === 'similar' || s.id === 'pairSum') && s.sim) {
      const m = s.sim, g = s.g;
      if (m.opp) {
        MH.mark(out, M(m.mid), m.mn, C.mark, Rr * 0.018);
        MH.tri(out, [M(m.pos.p), P, M(m.neg.p)], C.pot, 0.08);
        vec(V.add(P, S(m.pos.E)), S(m.neg.E), [...(m.neg.q > 0 ? C.pos : C.neg), 0.9], m.neg.n + '′', 'neg', 2, 0.55);
        if (s.id === 'similar') MH.arc(out, M(m.pos.p), V.sub(P, M(m.pos.p)), V.sub(M(m.neg.p), M(m.pos.p)), Rr * 0.08, '∠' + d.pn + m.pos.label + m.neg.label);
      } else {
        MH.tri(out, [M(m.a.p), M(m.mid), P], C.pot, 0.08);
        MH.dash(out, P, M(m.mid), C.ang);
        MH.mark(out, M(m.mid), m.mn, C.mark, Rr * 0.018);
        MH.dash(out, V.add(P, S(m.a.E)), V.add(P, S(g.S))); MH.dash(out, V.add(P, S(m.b.E)), V.add(P, S(g.S)));
      }
      if (s.id === 'similar') { MH.arc(out, P, m.a.E, m.b.E, Rr * 0.06, 'θ=' + r1(m.th) + '°'); MH.dash(out, P, V.add(P, S(g.S)), C.sum); }
    }
    if (s && s.id === 'plane') MH.tri(out, s.g.items.map(x => M(x.p)), C.pot, 0.14);
    steps.slice(0, k + 1).forEach(st => {
      if (!st.g) return;
      const g = st.g;
      if (st.id === 'pairSum') {
        const [a, b] = g.items, col = V.len(V.cross(a.E, b.E)) <= 1e-9 * a.mag * b.mag;
        if (st === s && !st.sim) {
          // Collinear: show tip to tail; otherwise draw the parallelogram
          if (col) vec(V.add(P, S(a.E)), S(b.E), [...(b.q > 0 ? C.pos : C.neg), 0.9], b.n + '′', b.q > 0 ? 'pos' : 'neg', 2, 0.55);
          else { MH.dash(out, V.add(P, S(a.E)), V.add(P, S(g.S))); MH.dash(out, V.add(P, S(b.E)), V.add(P, S(g.S))); }
        }
        if (!finished) vec(P, S(g.S), d.groups.length > 1 ? C.part : C.sum, g.name, d.groups.length > 1 ? 'part' : 'sum', 2.8);
      }
      if (st.id === 'chainSum') {
        if (st === s) { let q = P; for (const x of g.items) { vec(q, S(x.E), x.q > 0 ? C.pos : C.neg, null); q = V.add(q, S(x.E)); } }
        if (!finished) vec(P, S(g.S), d.groups.length > 1 ? C.part : C.sum, g.name, d.groups.length > 1 ? 'part' : 'sum', 2.8);
      }
    });
    if (finished || at('check') >= 0) {
      if (d.groups.length === 2) {
        const [a, b] = d.groups;
        vec(P, S(a.S), [...C.part, 0.7], a.name, 'part', 2.2); vec(P, S(b.S), [...C.part, 0.7], b.name, 'part', 2.2);
        MH.dash(out, V.add(P, S(a.S)), V.add(P, S(d.T))); MH.dash(out, V.add(P, S(b.S)), V.add(P, S(d.T)));
        if (V.len(a.S) * V.len(b.S) > 1e-24 && Math.abs(V.dot(a.S, b.S)) <= 1e-9 * V.len(a.S) * V.len(b.S)) MH.right(out, P, a.S, b.S, Rr * 0.035);
      }
      vec(P, S(d.T), C.sum, d.partial ? 'Σ (selected)' : 'E_net', 'sum', 3.2);
    }
    if (cur === 'check' || cur === 'coordE') ['x', 'y', 'z'].forEach((n, i) => { const v = [0, 0, 0]; v[i] = d.T[i] * sc; if (Math.abs(v[i]) > 1e-9) vec(P, v, [...C.guide, 0.8], 'E_' + n, '', 1.4, 0.6); });
    return out;
  };

  // HTML for one step (table + formula), shared by the lab and the worked-problem module
  VA.stepHTML = function (s) {
    let html = '';
    if (s.rows) html += '<table class="cap-tbl">' + s.rows.map((r, i) => '<tr>' + r.map(c => (i ? '<td>' : '<th>') + U.rich(c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('') + '</table>';
    if (s.tex) html += '<div class="cap-m' + (s.proof || s.tetra ? ' cap-proof' : '') + '">' + EL.texBlock(s.tex) + '</div>';
    return html;
  };
})(window.EL);
