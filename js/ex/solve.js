'use strict';
// Worked-problem module: computes answers from a problem definition and generates stems, distractors, solutions and diagnostics
// Problem data are described in models.js. Discrete templates use a=1, Q=1, k=1: field unit kQ/a², potential kQ/a, work kQq/a;
// free exploration and disk charges use the length unit L; answers for the analytic-field models (field) are computed by answers.js
(function (EL) {
  const V = EL.V, U = EL.U, VA = EL.VA, X = EL.EX;
  const f4 = VA.f4, ang = VA.ang;
  X.QTYPES = {
    E: { name: 'Magnitude and direction of the field', need: ['at'] }, Ezero: { name: 'Whether the field is zero', need: ['at'] }, V: { name: 'Potential at a point', need: ['at'] },
    Vcmp: { name: 'Compare the potentials at two points', need: ['a', 'b'] }, trend: { name: 'Potential change along a line', need: ['a', 'b'] }, W: { name: 'Work done by the electric force', need: ['a', 'b', 'q0'] },
    angle: { name: 'Angle between the field and a line', need: ['at', 'a', 'b'] }
  };
  // Question types that apply only to some models (X.qtypesFor decides which are shown)
  X.QTYPES2 = {
    U: { name: 'Total interaction energy', need: [] }, pairs: { name: 'Number of distinct charge pairs', need: [] }, Ucmp: { name: 'Compare the total interaction energy of two configurations', need: [] },
    bc: { name: 'Boundary condition (field ratio)', need: [] }
  };
  X.qtype = t => X.QTYPES[t] || X.QTYPES2[t];

  // Resolve a problem: geometry, sources, all named points, units, field function
  X.resolve = function (pb) {
    const kind = X.kindOf(pb), g = kind === 'tpl' ? X.geo(pb.tpl) : X.build(pb), pts = {};
    if (kind === 'tpl') g.kind = 'tpl';
    for (const n of g.labels) pts[n] = { n, p: g.v[n], text: kind === 'tpl' ? 'vertex ' + n : 'the position of point charge ' + n, vertex: true };
    for (const n in pb.pts || {}) pts[n] = { n, p: X.pointPos(g, pb.pts[n].def, pb.pts), text: X.pointText(g, pb.pts[n].def), def: pb.pts[n].def };
    let sources = [];
    if (kind === 'tpl') sources = Object.keys(pb.charges || {}).filter(n => pb.charges[n] && pts[n]).map(n => ({ p: pts[n].p, q: pb.charges[n], label: n }));
    else if (kind === 'free') sources = (pb.srcs || []).filter(s => s.q).map(s => ({ p: g.v[s.label], q: s.q, label: s.label }));
    else if (kind === 'disk') sources = g.src.filter(s => s.q).map(s => ({ p: s.p, q: s.q, label: s.label }));
    const named = Object.values(pts).filter(x => x.p).map(x => ({ n: x.n, p: x.p }));
    const R = { g, pts, sources, named, kind, units: X.UNITS[kind === 'tpl' ? 'a' : kind === 'field' ? 'none' : 'L'] };
    if (kind === 'field') {
      const sub = EL.SUB08[pb.sub];
      R.field = p => { const r = sub.fn(pb.sp, p); return { V: r.V, E: r.E, ok: isFinite(r.V) && r.E.every(isFinite), region: r.region }; };
      R.analytic = true;
    } else {
      const F = EL.Phys.pointField(sources, 1e-9);
      R.field = p => { const s = F.sample(p); return { V: s.V, E: s.E, ok: s.ok }; };
    }
    const ext = named.concat(sources).map(x => V.len(x.p)).concat(g.draw ? g.draw.segs.flat().concat(g.draw.polys.flat()).map(V.len) : []);
    if (kind === 'field') ext.push(pb.sp.a || 0, 1.5); if (kind === 'disk') ext.push(pb.disk.R);
    R.ext = Math.max(1, ...ext.filter(isFinite));
    return R;
  };
  const Vat = (src, p) => src.reduce((s, x) => s + x.q / V.dist(p, x.p), 0);
  const num = (x, u) => { const n = VA.nice(x); return (n ? n.text : f4(x).replace(/^-/, '−')) + (u ? ' ' + u : ''); };
  X.num = num;
  const numTex = x => VA.texV(x);
  const near = (p, src) => src.some(s => V.dist(p, s.p) < 1e-9);

  // One question: answer, options (with distractors), solution and diagnostics
  X.answer = function (pb, R, q) {
    if (!X.qtypesFor(pb).includes(q.t)) return { q, ok: false, err: 'This model cannot ask questions of the type "' + (X.qtype(q.t) ? X.qtype(q.t).name : q.t) + '".' };
    if (R.analytic) return X.anaAnswer(pb, R, q);
    if (R.kind === 'disk' && X.QTYPES2[q.t]) return X.diskAnswer(pb, R, q);
    const P = n => R.pts[n] && R.pts[n].p, src = R.sources, o = { q, ok: true, diag: [] }, u = R.units, unitE = u.E, unitV = u.V, unitW = u.W;
    // Distractors are de-duplicated by value ("0" and "0 kQ/a²" count as the same)
    const kk = v => String(v).replace(/ .*$/, '').replace(/^−0$/, '0');
    const opts = (right, wrongs) => { const seen = new Set([kk(right)]); const w = wrongs.filter(x => x && !seen.has(kk(x.v)) && seen.add(kk(x.v))).slice(0, 3); o.distractors = w; if (w.length) o.options = [right].concat(w.map(x => x.v)).sort(); };
    if (q.t === 'E' || q.t === 'Ezero' || q.t === 'angle') {
      const p = P(q.at);
      if (!p) return { q, ok: false, err: 'No field point has been selected.' };
      if (near(p, src)) return { q, ok: false, err: q.at + ' coincides with a source, so the electric field there is undefined.' };
      const parts = VA.parts(src, p), T = VA.sum(parts), m = V.len(T);
      o.parts = parts; o.T = T; o.plan = VA.plan({ parts, P: p, named: R.named, pName: q.at, unit: unitE, rUnit: u.L });
      o.value = m; o.dir = VA.describe(T, R.named);
      if (q.t === 'E') {
        o.answer = m < 1e-9 ? '0' : num(m, unitE) + (o.dir ? ', pointing ' + o.dir : '');
        o.mag = m < 1e-9 ? '0' : num(m, unitE);
        if (m < 1e-9) o.diag.push({ k: 'info', t: 'The field at this point is zero. Consider asking whether the field is zero, or compare potentials instead.' });
        const sc = parts.reduce((s, x) => s + x.mag, 0), g = o.plan.d.groups, part = g.length > 1 ? V.len(g[0].S) : NaN;
        opts(o.mag, [{ v: num(sc, unitE), why: 'The magnitudes of the component fields were added directly instead of as vectors.' }, { v: g.length > 1 ? num(part, unitE) : null, why: 'Only one group of component fields was combined and the rest were left out.' },
          { v: g.length > 1 ? num(V.len(V.sub(g[0].S, g[1].S)), unitE) : num(m * Math.SQRT2, unitE), why: g.length > 1 ? 'The angle φ between the two partial sums was mistaken for 180° − φ.' : 'The angle between the component fields was wrong.' }].filter(x => x.v));
      } else if (q.t === 'Ezero') { o.answer = m < 1e-9 ? 'Yes' : 'No'; o.options = ['Yes', 'No']; }
      else {
        const pa = P(q.a), pb2 = P(q.b);
        if (!pa || !pb2) return { q, ok: false, err: 'Select the two points that define the line.' };
        const d = V.sub(pb2, pa);
        if (m < 1e-9) return { q, ok: false, err: 'The field at ' + q.at + ' is zero and has no direction, so the angle is meaningless.' };
        if (V.len(d) < 1e-9) return { q, ok: false, err: q.a + ' and ' + q.b + ' are the same point, so they do not define a line and the angle is meaningless.' };
        const th = ang(T, d); o.value = th; o.answer = (Math.round(th * 10) / 10) + '°'; o.options = VA.angOpts(th);
      }
    } else if (q.t === 'V') {
      const p = P(q.at);
      if (!p) return { q, ok: false, err: 'No field point has been selected.' };
      if (near(p, src)) return { q, ok: false, err: q.at + ' coincides with a source, so the potential there is undefined.' };
      const v = Vat(src, p), nv = num(v, unitV);
      o.value = v; o.answer = nv;
      o.terms = src.map(s => ({ label: s.label, q: s.q, r: V.dist(p, s.p), v: s.q / V.dist(p, s.p) }));
      if (Math.abs(v) < 1e-9) o.diag.push({ k: 'good', t: 'The potential here is zero, which suits the question of whether the field must also be zero where the potential is zero.' });
      opts(nv, [{ v: num(src.reduce((s, x) => s + Math.abs(x.q) / V.dist(p, x.p), 0), unitV), why: 'The signs of the source charges were ignored.' }, { v: num(src.reduce((s, x) => s + x.q / Math.pow(V.dist(p, x.p), 2), 0), unitV), why: 'The 1/r² of the field formula was used to compute the potential.' }, { v: num(-v, unitV), why: 'The sign of the potential is reversed.' }]);
    } else if (q.t === 'Vcmp' || q.t === 'W' || q.t === 'trend') {
      const a = P(q.a), b = P(q.b);
      if (!a || !b) return { q, ok: false, err: 'Select two points.' };
      const ea = near(a, src), eb = near(b, src);
      if (q.t !== 'trend' && (ea || eb)) return { q, ok: false, err: (ea ? q.a : q.b) + ' coincides with a source, so the potential there is undefined.' };
      if (q.t === 'trend' && ea && eb) return { q, ok: false, err: 'Both endpoints coincide with sources, so the potential change cannot be discussed.' };
      const va = ea ? NaN : Vat(src, a), vb = eb ? NaN : Vat(src, b);
      o.va = va; o.vb = vb; o.endSrc = ea ? q.a : eb ? q.b : null;
      if (o.endSrc) { const ep = ea ? a : b, s0 = src.find(s => V.dist(ep, s.p) < 1e-9); o.endQ = s0 ? s0.q : 0; }
      if (q.t === 'Vcmp') X.cmpAnswer(o, q, va, vb);
      if (q.t === 'W') {
        const q0 = q.q0 || 1, w = q0 * (va - vb); o.value = w; o.answer = num(w, unitW);
        opts(o.answer, [{ v: num(-w, unitW), why: 'The order of the potential difference was reversed, using W = q(φ_final − φ_initial).' }, { v: num(Math.abs(w), unitW), why: 'The sign of the test charge was ignored.' }, { v: Math.abs(w) > 1e-9 ? '0' : null, why: 'The potentials were assumed equal just because the two points look symmetric.' }].filter(x => x.v));
        if (Math.abs(w) < 1e-9) o.diag.push({ k: 'good', t: 'The start and end points are at the same potential, so the work is zero. This suits a question on the path independence of the work.' });
      }
      if (q.t === 'trend') {
        // If an endpoint is a source, stop at 2% of the path length from it (the potential there tends to ±∞)
        const N = 200, vs = [], t0 = ea ? 0.02 : 0, t1 = eb ? 0.98 : 1, tol = 0.015 * (R.kind === 'tpl' ? 1 : V.dist(a, b));
        for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N, p = V.lerp(a, b, t); if (src.some(s => V.dist(p, s.p) < tol)) return { q, ok: false, err: 'The path passes through a source, where the potential is undefined, so the potential change cannot be discussed.' }; vs.push(Vat(src, p)); }
        X.trendAnswer(o, vs);
        o.plan = (() => { const mid = V.lerp(a, b, 0.4), parts = VA.parts(src, mid); return parts ? VA.plan({ parts, P: mid, named: R.named, pName: 'X', unit: unitE, rUnit: u.L }) : null; })();
      }
    }
    return o;
  };
  X.cmpAnswer = function (o, q, va, vb) {
    o.answer = Math.abs(va - vb) < 1e-9 ? 'φ_' + q.a + ' = φ_' + q.b : va > vb ? 'φ_' + q.a + ' > φ_' + q.b : 'φ_' + q.a + ' < φ_' + q.b;
    o.options = ['φ_' + q.a + ' > φ_' + q.b, 'φ_' + q.a + ' = φ_' + q.b, 'φ_' + q.a + ' < φ_' + q.b];
  };
  X.trendAnswer = function (o, vs) {
    const dv = vs.slice(1).map((v, i) => v - vs[i]), eps = 1e-10, up = dv.every(x => x > -eps), dn = dv.every(x => x < eps);
    const flat = dv.every(x => Math.abs(x) < eps), turns = dv.reduce((n, x, i) => i && Math.sign(x) !== Math.sign(dv[i - 1]) && Math.abs(x) > eps ? n + 1 : n, 0);
    o.answer = flat ? 'stays constant' : up ? 'increases throughout' : dn ? 'decreases throughout' : turns === 1 ? (dv[0] > 0 ? 'rises then falls' : 'falls then rises') : 'fluctuates';
    o.options = ['increases throughout', 'decreases throughout', 'rises then falls', 'falls then rises'];
    // There are always exactly four options, A to D: when the answer is not one of the usual four, it replaces "falls then rises"
    if (!o.options.includes(o.answer)) o.options[3] = o.answer;
    o.samples = vs;
  };
  // The correct option of a multiple-choice question: the magnitude for field questions, the answer itself otherwise
  X.rightOf = o => o.right != null ? o.right : o.q.t === 'E' ? o.mag : o.answer;
  X.solve = function (pb) {
    const R = X.resolve(pb), ans = (pb.qs || []).map(q => {
      if (q.t === 'trend' && R.pts[q.a]?.p && R.pts[q.b]?.p) {
        const a = R.pts[q.a].p, b = R.pts[q.b].p, d = V.sub(b, a), length2 = V.dot(d, d);
        if (length2 < 1e-18) return { q, ok: false, err: 'The path endpoints coincide; a direction cannot be defined.' };
        if (!R.analytic && R.sources.some(source => { const s = V.dot(V.sub(source.p, a), d) / length2; return s > 1e-9 && s < 1 - 1e-9 && V.dist(source.p, V.addS(a, d, s)) < 1e-9; })) return { q, ok: false, err: 'The path passes through a source charge where potential is undefined.' };
      }
      const o = X.answer(pb, R, q);
      if (o.ok && q.t === 'trend') o.expl = X.pathSteps(pb, R, o, 0.3).map(st => ({ t: st.title + ': ' + st.text, tex: st.tex, rows: st.rows }));
      return o;
    });
    return { R, ans };
  };

  // ---- Text: stem, questions, solutions ----
  X.stem = function (pb, R) {
    if (X.kindOf(pb) !== 'tpl') return X.stemOf(pb, R);
    // Vertices with the same charge are described together: "a point charge of −Q is placed at each of A and C"
    const T = X.TEMPLATES[pb.tpl], by = new Map();
    Object.keys(pb.charges || {}).filter(n => pb.charges[n]).forEach(n => { const k = X.qText(pb.charges[n]); if (!by.has(k)) by.set(k, []); by.get(k).push(n); });
    const ch = [...by].map(([k, ns]) => ns.length > 1 ? 'a point charge of ' + k + ' is placed at each of ' + ns.slice(0, -1).join(', ') + (ns.length > 2 ? ',' : '') + ' and ' + ns[ns.length - 1] : 'a point charge of ' + k + ' is placed at ' + ns[0]);
    const ptsT = Object.keys(pb.pts || {}).map(n => {
      const def = pb.pts[n].def, t = R.pts[n].text;
      if (def.t === 'xyz') return n + ' is ' + t + ' (origin at the center of the model)';
      if (def.t === 'div') return n + ' is ' + t.replace(/^the point X on segment (\S+) with/, 'a point on segment $1 with').replace(/X/, n);
      if (def.t === 'center') return n + ' is the center of the ' + T.name;
      return n + ' is ' + t;
    });
    return T.desc + (ch.length ? '. ' + ch.join(', and ').replace(/^a/, 'A') + '. ' : '. None of the vertices carries charge. ') + (ptsT.length ? ptsT.join('; ') + '. ' : '') + 'Take the potential to be zero at infinity.';
  };
  X.qText2 = function (q, pb) {
    switch (q.t) {
      case 'E': return 'Find the magnitude and direction of the electric field at ' + q.at + '.';
      case 'Ezero': return 'Is the electric field at ' + q.at + ' zero?';
      case 'V': return 'Find the electric potential at ' + q.at + '.';
      case 'Vcmp': return 'Compare the potentials at ' + q.a + ' and ' + q.b + '.';
      case 'trend': return 'How does the potential change along the straight line from ' + q.a + ' to ' + q.b + '?';
      case 'W': return 'A test charge of ' + X.qText(q.q0 || 1, 'q') + ' is moved from ' + q.a + ' to ' + q.b + '. How much work does the electric force do?';
      case 'angle': return 'Find the angle between the electric field at ' + q.at + ' and the direction from ' + q.a + ' to ' + q.b + '.';
      case 'U': return 'Find the total interaction energy U of this set of point charges.';
      case 'pairs': return 'How many distinct pairs of charges must be counted in the total interaction energy?';
      case 'Ucmp': return 'Keep the total number of charges N, the disk radius R and the charge of each point charge fixed, and compare two configurations: N charges equally spaced around the circle, or one charge moved to the center with the other N − 1 equally spaced around the circle. Which configuration has the smaller total interaction energy?';
      case 'bc': return pb && pb.sub === 'dielectric-sphere' ? 'Find the ratio E_in/E₀ of the field inside the sphere to the applied field.' : 'Find the ratio E_1n/E_2n of the normal components of the field on the two sides of the interface.';
    }
    return '';
  };
  // Solution: short sentences + formulas (one per line)
  X.explain = function (o) {
    const q = o.q, L = [];
    if (!o.ok) return [{ t: o.err }];
    if (o.expl) return o.expl;
    if (q.t === 'E' || q.t === 'Ezero' || q.t === 'angle') {
      for (const s of o.plan) if (s.id !== 'list' && s.id !== 'group') L.push({ t: s.title + ': ' + s.text, tex: s.tex, rows: s.rows });
      if (q.t === 'angle') L.push({ t: 'For direction ' + q.a + '→' + q.b + ', let u be its displacement vector. The scalar product gives the angle after the resultant has been derived: ' + o.answer + '.', tex: String.raw`\vec u=\vec r_{${q.b}}-\vec r_{${q.a}},\qquad\cos\alpha=\frac{\vec E\cdot\vec u}{|\vec E||\vec u|}=${numTex(Math.cos(o.value * Math.PI / 180))},\qquad\alpha=${f4(o.value)}^\circ` });
    } else if (q.t === 'V') {
      L.push({ t: 'Potential is a scalar. The potential at ' + q.at + ' is the algebraic sum of the potentials that each source produces there alone. Positive sources contribute positively and negative sources negatively.', tex:String.raw`\varphi_{${q.at}}=\sum_i\frac{kq_i}{r_i}=` + o.terms.map(x => (x.q < 0 ? '-' : '+') + numTex(Math.abs(x.v))).join('').replace(/^\+/, '') + '=' + numTex(o.value) });
    } else if (q.t === 'Vcmp') {
      L.push({ t: 'Calculate the potentials at ' + q.a + ' and ' + q.b + ' separately.', tex: String.raw`\varphi_{${q.a}}=${numTex(o.va)},\quad\varphi_{${q.b}}=${numTex(o.vb)}` }, { t: 'Therefore ' + o.answer + '.' });
    } else if (q.t === 'W') {
      L.push({ t: 'The work done by the electric force equals the test charge times the potential difference between the start and end points: W = q(φ_' + q.a + ' − φ_' + q.b + ').', tex:String.raw`W=q(\varphi_{${q.a}}-\varphi_{${q.b}})=${numTex(q.q0 || 1)}\times(${numTex(o.va)}-(${numTex(o.vb)}))=${numTex(o.value)}` });
    } else if (q.t === 'trend') {
      L.push({ t: 'Let E_∥ be the component of the net field along the path. Where E_∥ is positive, the potential decreases along the path. Where E_∥ is negative, the potential increases. Click "Guided exploration" and drag the point X along the path to watch the angle between the net field and the path direction.' },
        { t: 'So from ' + q.a + ' to ' + q.b + ', the potential ' + o.answer + '.' + (o.endSrc ? ' The endpoint ' + o.endSrc + ' is a ' + (o.endQ > 0 ? 'positive' : 'negative') + ' source, and the potential tends to ' + (o.endQ > 0 ? 'positive' : 'negative') + ' infinity as the path approaches it.' : '') });
    }
    return L;
  };
  // Difficulty and teaching hints
  X.diagnose = function (pb, sol) {
    const out = [];
    sol.ans.forEach((o, i) => {
      if (!o.ok) { out.push({ k: 'bad', t: 'Question ' + (i + 1) + ': ' + o.err }); return; }
      (o.diag || []).forEach(d => out.push({ k: d.k, t: 'Question ' + (i + 1) + ': ' + d.t }));
      if (o.plan && o.plan.d && (o.q.t === 'E' || o.q.t === 'angle')) {
        const g = o.plan.d.groups, sym = g.filter(x => x.type !== 'rest' && !x.unequal).length;
        const nice = !!VA.nice(V.len(o.T));
        out.push({ k: sym ? 'good' : 'info', t: 'Question ' + (i + 1) + ': ' + (sym ? (g.length > 1 ? 'Symmetry lets you split the component fields into ' + g.length + ' groups and combine them group by group' : 'Symmetry lets you combine the equal component fields directly') : 'There are no equal component fields, so the coordinate method suits this question') + (nice ? ', and the result is an exact value.' : ', and the result is not a simple radical.') });
      }
    });
    if (!sol.ans.length) out.push({ k: 'info', t: 'No questions have been added yet.' });
    return out;
  };
  // Suggestions: points worth asking about
  X.suggest = function (pb) {
    const R = X.resolve(pb), g = R.g, out = [];
    for (const c of X.candidates(g)) {
      const p = X.pointPos(g, c.def, pb.pts);
      if (!p || near(p, R.sources)) continue;
      let m, v, grp = 0;
      if (R.analytic) { const s = R.field(p); if (!s.ok) continue; m = V.len(s.E); v = s.V; }
      else {
        const parts = VA.parts(R.sources, p);
        if (!parts || !parts.length) continue;
        m = V.len(VA.sum(parts)); v = Vat(R.sources, p); grp = VA.group(parts, p).filter(x => x.type !== 'rest' && !x.unequal).length;
      }
      let score = 0, why = [];
      if (m < 1e-9) { score += 3; why.push('the field is zero'); }
      if (Math.abs(v) < 1e-9 && m > 1e-9) { score += 3; why.push('the potential is zero but the field is not'); }
      if (grp >= 2) { score += 2; why.push('the component fields form symmetric groups'); }
      if (m > 1e-9 && (VA.nice(m) || R.analytic && X.niceNum(m).exact)) { score += 1; why.push('the field has an exact value'); }
      if (score) out.push({ c, score, why: why.join('; ').replace(/^./, ch => ch.toUpperCase()) + '.', E: m, V: v });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 6);
  };
})(window.EL);
