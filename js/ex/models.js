'use strict';
// Worked-problem module: catalog of all platform models and problem data. Besides the discrete templates (templates.js) there are three more kinds: free exploration, analytic-field models, charges on a disk
// Problem pb: { id, title, model: lab model id, kind: 'tpl' | 'free' | 'field' | 'disk', pts, qs, stem?, note? }
//   tpl  : tpl (template name), charges: {vertex: coefficient}; length unit a
//   free : srcs: [{label, p:[x,y,z], q, bind?: {bg, key}}], bgs: [{type, w, l, h, x, y, z}] (parameters of EL.GEO.build)
//   field: sub (key of EL.SUB08), sp: {parameters} (λ, σ, q, a, ε, D, E₀, etc.)
//   disk : disk: {N, R, q, center, qc} (passed to sources and readings of EL.model(3))
// Free exploration, analytic-field models and charges on a disk use the length unit L, with the same units as the lab (k = 1)
(function (EL) {
  const V = EL.V, U = EL.U, X = EL.EX;
  const fmtP = p => '(' + p.map(x => U.fmt(x, 3)).join(', ') + ')';

  // ---- Model numbers and names (same grouping and order as the home page and the lab) ----
  X.TPL_MODEL = { pair: 1, tetra: 4, cube: 6, octa: 5, tri: 7, square: 7 };
  X.kindOf = pb => pb.kind || 'tpl';
  X.modelOf = pb => pb.model != null ? +pb.model : ({ free: 7, field: 8, disk: 3 })[X.kindOf(pb)] || X.TPL_MODEL[pb.tpl] || 0;
  X.LABS = {
    1: { code: '01', title: 'Point charges and dipole' }, 2: { code: '02', title: 'Paths and energy' },
    4: { code: '03', title: 'Regular tetrahedron' }, 6: { code: '04', title: 'Cube' }, 5: { code: '05', title: 'Regular octahedron' },
    7: { code: '06', title: 'Free exploration' }, 8: { code: 'Ext. 1', title: 'Analytic field models' }, 3: { code: 'Ext. 2', title: 'Charges on a disk' }
  };
  const GROUPS = [['I. Basic models', [1, 2]], ['II. Symmetric models', [4, 6, 5]], ['III. Extensions and authoring', [7, 8, 3]]];
  X.UNITS = { a: { E: 'kQ/a²', V: 'kQ/a', W: 'kQq/a', L: 'a' }, L: { E: 'kQ/L²', V: 'kQ/L', W: 'kQq/L', U: 'kQ²/L', L: 'L' }, none: { E: '', V: '', W: '', L: 'L' } };

  // ---- Authoring catalog: the items that can be authored under each lab model ----
  const alt = ls => Object.fromEntries(ls.map((n, i) => [n, i % 2 ? 1 : -1]));
  const tplItem = (model, tpl, desc) => ({ key: 'tpl:' + tpl + ':' + model, model, kind: 'tpl', name: X.TEMPLATES[tpl].name, desc: desc || X.TEMPLATES[tpl].desc, make: () => ({ tpl, charges: alt(X.geo(tpl).labels) }) });
  const defaults = sub => Object.fromEntries(EL.SUB08[sub].params.map(q => [q.key, q.val]));
  function items(id) {
    if (id === 1) return [tplItem(1, 'pair', 'Two point charges A and B a distance a apart, which can form an electric dipole')];
    if (id === 2) return [tplItem(2, 'pair', 'Two point charges A and B a distance a apart, suited to questions on potential change, potential comparison and work done by the electric force')];
    if (id === 4) return [tplItem(4, 'tetra')];
    if (id === 6) return [tplItem(6, 'cube')];
    if (id === 5) return [tplItem(5, 'octa')];
    if (id === 7) return [{ key: 'free', model: 7, kind: 'free', name: 'Freely placed point charges', desc: 'Up to 16 point charges; geometric backgrounds can be added and charges placed at special points of a background', make: () => ({ srcs: [{ label: 'Q1', p: [-1, 0, 0], q: 1 }, { label: 'Q2', p: [1, 0, 0], q: -1 }], bgs: [] }) },
      tplItem(7, 'tri', 'The three vertices of an equilateral triangle ABC with side length a'), tplItem(7, 'square', 'The four vertices of a square ABCD with side length a')];
    if (id === 8) return Object.keys(EL.SUB08).map(sub => ({ key: 'field:' + sub, model: 8, kind: 'field', name: EL.SUB08[sub].name, desc: EL.SUB08[sub].cat, make: () => ({ sub, sp: defaults(sub) }) }));
    if (id === 3) return [{ key: 'disk', model: 3, kind: 'disk', name: 'Like charges on a disk', desc: 'N charges equally spaced on a circle, or one charge placed at the center', make: () => ({ disk: { N: 6, R: 2, q: 1, center: false, qc: 1 } }) }];
    return [];
  }
  GROUPS.push(['IV. Problems', []]);
  X.catalog = () => GROUPS.map(([title, ids]) => ({ title, labs: ids.map(id => Object.assign({ id }, X.LABS[id], { items: items(id) })) }));
  X.itemKey = function (pb) {
    const k = X.kindOf(pb);
    return k === 'tpl' ? 'tpl:' + pb.tpl + ':' + X.modelOf(pb) : k === 'field' ? 'field:' + pb.sub : k;
  };
  X.itemOf = key => { for (const g of X.catalog()) for (const L of g.labs) for (const it of L.items) if (it.key === key) return it; return null; };
  X.firstItem = model => (items(+model)[0]) || null;
  // Reset the model data of a problem for an authoring item (keeps the id and the title)
  X.applyItem = function (d, it) {
    for (const k of ['tpl', 'charges', 'srcs', 'bgs', 'sub', 'sp', 'disk']) delete d[k];
    Object.assign(d, { model: it.model, kind: it.kind }, it.make(), { pts: {}, qs: [] });
    return d;
  };
  X.modelName = function (pb) {
    const id = X.modelOf(pb), L = X.LABS[id], k = X.kindOf(pb);
    const v = k === 'tpl' ? ([4, 5, 6].includes(id) ? '' : X.TEMPLATES[pb.tpl].name) : k === 'field' ? EL.SUB08[pb.sub].name : k === 'free' ? 'Freely placed point charges' : 'N = ' + pb.disk.N;
    return (L ? L.code + ' ' + L.title : '') + (v ? ' · ' + v : '');
  };
  X.valid = function (pb) {
    const k = X.kindOf(pb);
    if (k === 'tpl') return !!X.TEMPLATES[pb.tpl];
    if (k === 'free') return Array.isArray(pb.srcs);
    if (k === 'field') return !!(EL.SUB08[pb.sub] && pb.sp);
    if (k === 'disk') return !!(pb.disk && isFinite(pb.disk.N));
    return false;
  };

  // ---- Problem library and lookup by model (used by the jump from the lab's "Worked problems") ----
  X.library = () => X.BUILTIN.concat(U.store.get('ex:mine', []));
  X.findByModel = (id, lib) => (lib || X.library()).find(pb => X.modelOf(pb) === +id) || null;
  // Option letters: A, B, C, D
  X.letter = i => String.fromCharCode(65 + i);
  X.optLetter = (opts, v) => { const i = (opts || []).indexOf(v); return i < 0 ? '' : X.letter(i); };

  // ---- Charges on a disk: calls sources and readings of lab model 03 (EL.model(3)) directly ----
  X.diskParams = d => ({ N: d.N, R: d.R, q: d.q, phi: 0, center: !!d.center, qc: d.qc, manual: false, mx: 0, my: 0 });
  X.diskSources = d => EL.model(3).sources(X.diskParams(d)).map(s => Object.assign({}, s, { label: s.label === 'C' ? 'Qc' : 'Q' + s.label }));
  X.diskEnergy = function (d) {
    const m = EL.model(3), p = X.diskParams(d), src = m.sources(p), rows = m.readings({ p, sources: src, rMin: m.rMin, hidden: { cands: [] } });
    const find = (re, i) => { const r = rows.find(x => re.test(x[0])); return r ? r[1] : rows[i][1]; };
    return { U: find(/^Total interaction energy/, 0), pairs: find(/pairs/, 1), theory: (rows.find(x => /theory/.test(x[0])) || [0, NaN])[1], src };
  };

  // ---- Geometry of free exploration, analytic-field models and charges on a disk (used by X.resolve) ----
  const circle = (c, r) => Array.from({ length: 97 }, (_, i) => { const a = 2 * Math.PI * i / 96; return V.add(c, [r * Math.cos(a), r * Math.sin(a), 0]); });
  X.srcPos = function (g, s) {
    if (s.bind) { const b = g.bgs[s.bind.bg], sp = b && b.special.find(x => x.key === s.bind.key); if (sp) return sp.p.slice(); }
    return s.p.slice();
  };
  X.build = function (pb) {
    const k = X.kindOf(pb), g = { kind: k, unit: 'L', v: {}, faces: [], edges: [], center: [0, 0, 0], labels: [], bgs: [], draw: { segs: [], loops: [], polys: [], balls: [] }, pb };
    if (k === 'free') {
      g.bgs = (pb.bgs || []).map(s => EL.GEO.build(s));
      for (const b of g.bgs) {
        b.edges.forEach(e => g.draw.segs.push([b.verts[e[0]], b.verts[e[1]]]));
        if (b.faces.length) b.faces.forEach(f => g.draw.polys.push(f.map(i => b.verts[i])));
        if (b.sphere) g.draw.balls.push({ c: b.sphere.c, r: b.sphere.r, role: 'geom' });
        if (b.circle) g.draw.loops.push(circle(b.circle.c, b.circle.r));
      }
      for (const s of pb.srcs || []) g.v[s.label] = X.srcPos(g, s);
    } else if (k === 'disk') {
      g.src = X.diskSources(pb.disk);
      for (const s of g.src) g.v[s.label] = s.p;
      g.draw.loops.push(circle([0, 0, 0], pb.disk.R));
    }
    g.labels = Object.keys(g.v);
    return g;
  };

  // ---- Candidate key points ----
  const FIELD_PTS = {
    point: () => [[2, 0, 0], [1, 1, 0], [0, 0, 3], [1, 0, 0]],
    'infinite-line': p => [[2, 0, 0], [1, 0, 1], [0, 3, 0], [p.r0, 0, 0], [1, 1, 0]],
    'infinite-plane': () => [[0, 0, 1], [0, 0, 2], [0, 0, -1], [1, 0, 1]],
    'conductor-sphere': p => [[0, 0, 0], [p.a / 2, 0, 0], [2 * p.a, 0, 0], [0, 0, 3 * p.a], [2 * p.a, 2 * p.a, 0]],
    'dielectric-interface': () => [[0, 0, 1], [0, 0, -1], [1, 0, 2], [0, 0, -2]],
    'dielectric-sphere': p => [[0, 0, 0], [0, 0, p.a / 2], [0, 0, 2 * p.a], [2 * p.a, 0, 0]]
  };
  X.candidatesOf = function (g) {
    const pb = g.pb, out = [], seen = new Set(), add = (def, text) => { const k = JSON.stringify(def); if (!seen.has(k)) { seen.add(k); out.push({ def, text }); } };
    if (g.kind === 'field') {
      for (const p of FIELD_PTS[pb.sub](pb.sp)) {
        const r = EL.SUB08[pb.sub].fn(pb.sp, p), reg = r.region ? ', ' + r.region : '';
        if (isFinite(r.V) && r.E.every(isFinite)) add({ t: 'xyz', p }, 'Coordinates ' + fmtP(p) + reg);
      }
      return out;
    }
    const ls = g.labels.filter(n => g.v[n]);
    if (!ls.some(n => V.len(g.v[n]) < 1e-9)) add({ t: 'center' }, 'The origin O');
    for (let i = 0; i < ls.length && out.length < 12; i++) for (let j = i + 1; j < ls.length && out.length < 12; j++) {
      if (g.kind === 'disk' && j !== i + 1) continue;
      add({ t: 'mid', a: ls[i], b: ls[j] }, 'Midpoint of ' + ls[i] + ls[j]);
    }
    if (g.kind === 'disk') { add({ t: 'xyz', p: [0, 0, pb.disk.R] }, 'Coordinates ' + fmtP([0, 0, pb.disk.R]) + ' (directly above the center)'); add({ t: 'xyz', p: [pb.disk.R / 2, 0, 0] }, 'Coordinates ' + fmtP([pb.disk.R / 2, 0, 0])); }
    g.bgs.forEach((b, bi) => b.special.forEach(s => add({ t: 'sp', bg: bi, key: s.key }, 'The ' + s.name.charAt(0).toLowerCase() + s.name.slice(1) + ' of background ' + (bi + 1) + ' (' + EL.GEO.TYPES[b.type].name + ')')));
    return out;
  };

  // ---- Applicable question types ----
  const BASE = ['E', 'Ezero', 'V', 'Vcmp', 'trend', 'W', 'angle'];
  X.qtypesFor = function (pb) {
    const k = X.kindOf(pb);
    if (k === 'disk') return ['U', 'pairs', 'Ucmp'].concat(BASE);
    if (k === 'field') return /^dielectric/.test(pb.sub) ? BASE.concat('bc') : BASE;
    return X.modelOf(pb) === 2 ? ['trend', 'W', 'Vcmp', 'V', 'E', 'Ezero', 'angle'] : BASE;
  };

  // ---- Stems ----
  const BG_SIZE = s => {
    const L = x => U.fmt(x, 3) + ' L', T = EL.GEO.TYPES[s.type].name;
    switch (s.type) {
      case 'square': return 'a square with side length ' + L(s.w) + ' (parallel to the xy plane)';
      case 'rect': return 'a rectangle of length ' + L(s.w) + ' and width ' + L(s.l) + ' (parallel to the xy plane)';
      case 'triangle': return 'an isosceles triangle with base ' + L(s.w) + ' and height ' + L(s.l) + ' (parallel to the xy plane)';
      case 'circle': return 'a circle of radius ' + L(s.w / 2) + ' (parallel to the xy plane)';
      case 'sphere': return 'a spherical surface of radius ' + L(s.w / 2);
      case 'pyramid': return 'a rectangular pyramid with a ' + L(s.w) + ' × ' + L(s.l) + ' rectangular base and height ' + L(s.h);
      case 'prism': return 'a rectangular prism with a ' + L(s.w) + ' × ' + L(s.l) + ' rectangular base and height ' + L(s.h);
    }
    return 'a ' + T + ' whose circumscribed sphere has radius ' + L(s.w / 2);
  };
  X.bgText = (s, i) => 'Background ' + (i + 1) + ' is ' + BG_SIZE(s) + ', with its ' + (s.type === 'pyramid' || s.type === 'prism' ? 'base center' : 'center') + ' at ' + fmtP([s.x || 0, s.y || 0, s.z || 0]);
  const ptsStem = (pb, R) => {
    const t = Object.keys(pb.pts || {}).map(n => {
      const def = pb.pts[n].def;
      if (def.t === 'xyz') return n + ' is the point with coordinates ' + fmtP(def.p);
      if (def.t === 'center') return n + ' is the origin';
      return n + ' is ' + R.pts[n].text;
    });
    return t.length ? t.join(', ') + '. ' : '';
  };
  const FIELD_STEM = {
    point: p => 'A point charge of ' + U.fmt(p.q) + ' Q is placed at the origin O. Take the potential to be zero at infinity. ',
    'infinite-line': p => 'An infinite uniformly charged line lies along the z axis with linear charge density λ = ' + U.fmt(p.lambda) + ' Q/L. Take the potential to be zero at distance ρ₀ = ' + U.fmt(p.r0) + ' L from the z axis. ',
    'infinite-plane': p => 'The xy plane (z = 0) is an infinite uniformly charged plane with surface charge density σ = ' + U.fmt(p.sigma) + ' Q/L². Take the potential of this plane to be zero. ',
    'conductor-sphere': p => 'An isolated conducting sphere of radius a = ' + U.fmt(p.a) + ' L, centered at the origin O, carries charge q = ' + U.fmt(p.q) + ' Q and is in electrostatic equilibrium. Take the potential to be zero at infinity. ',
    'dielectric-interface': p => 'The plane z = 0 separates two dielectrics: the relative permittivity is ε₁ = ' + U.fmt(p.e1) + ' on the side z > 0 and ε₂ = ' + U.fmt(p.e2) + ' on the side z < 0. There is no free charge on the interface, and the electric displacement is perpendicular to it, with z component D = ' + U.fmt(p.D) + ' Q/L². Take the potential of the interface to be zero. ',
    'dielectric-sphere': p => 'A dielectric sphere of radius a = ' + U.fmt(p.a) + ' L (relative permittivity ε_in = ' + U.fmt(p.ein) + '), centered at the origin O, is placed in a medium of relative permittivity ε_out = ' + U.fmt(p.eout) + '. Far away there is a uniform field of strength E₀ = ' + U.fmt(p.E0) + ' kQ/L² along the z direction. Take the plane z = 0 (through the center of the sphere) to be at zero potential. '
  };
  X.stemOf = function (pb, R) {
    const k = X.kindOf(pb);
    if (k === 'field') return FIELD_STEM[pb.sub](pb.sp) + ptsStem(pb, R) + 'Take k = 1 (that is, ε₀ = 1/(4π)); ε is the relative permittivity and the length unit is L. Give numerical values only.';
    if (k === 'disk') {
      const d = pb.disk, n = d.center ? d.N - 1 : d.N;
      return 'In the xy plane, ' + d.N + ' point charges are placed on a disk of radius R = ' + U.fmt(d.R) + ' L centered at the origin O: ' +
        (d.center ? 'a point charge Qc of ' + X.qText(d.qc) + ' is at the center, and the other ' + n + ' point charges Q1 to Q' + n : 'the ' + n + ' point charges Q1 to Q' + n) + ', each of ' + X.qText(d.q) + ', divide the circle equally, with Q1 on the positive x axis. ' +
        ptsStem(pb, R) + 'Take the potential to be zero at infinity.';
    }
    const by = (pb.srcs || []).filter(s => s.q).map(s => {
      const b = s.bind && R.g.bgs[s.bind.bg], sp = b && b.special.find(x => x.key === s.bind.key);
      return 'a point charge ' + s.label + ' of ' + X.qText(s.q) + ' is placed at ' + (sp ? 'the ' + sp.name.charAt(0).toLowerCase() + sp.name.slice(1) + ' of background ' + (s.bind.bg + 1) + ' ' + fmtP(R.g.v[s.label]) : fmtP(R.g.v[s.label]));
    });
    return 'In a Cartesian coordinate system Oxyz (length unit L), ' + (pb.bgs && pb.bgs.length ? pb.bgs.map(X.bgText).join('; ') + ' (a geometric background is only a positional reference, not a conductor or dielectric). ' : '') +
      (by.length ? by.join('; ').replace(/^a/, 'A') + '. ' : 'No point charge with nonzero charge has been placed yet. ') + ptsStem(pb, R) + 'Take the potential to be zero at infinity.';
  };
})(window.EL);
