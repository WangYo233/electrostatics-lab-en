'use strict';
// Worked-problem module: geometric templates (unit models with edge length a=1), point definitions and resolution
(function (EL) {
  const V = EL.V, X = EL.EX = EL.EX || {};
  const s3 = Math.sqrt(3), s6 = Math.sqrt(6);
  const avg = ps => V.mul(ps.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / ps.length);
  const edgesOf = faces => { const m = new Map(); faces.forEach(f => f.forEach((a, i) => { const b = f[(i + 1) % f.length], k = [a, b].sort().join(''); if (!m.has(k)) m.set(k, [a, b].sort()); })); return [...m.values()]; };

  // Regular tetrahedron: face BCD horizontal, A on top; center of the inscribed sphere at the origin
  function tetra() {
    const h = s6 / 3, R = 1 / s3, z0 = -h / 4, at = a => [R * Math.cos(a), R * Math.sin(a), z0];
    const v = { A: [0, 0, h + z0], B: at(-Math.PI / 2), C: at(Math.PI / 6), D: at(5 * Math.PI / 6) };
    return { v, faces: [['A', 'B', 'C'], ['A', 'C', 'D'], ['A', 'D', 'B'], ['B', 'C', 'D']], sphere: h / 4, center: [0, 0, 0], faceNote: ' (point of tangency with the inscribed sphere)' };
  }
  function cube() {
    const H = 0.5, v = { A: [-H, -H, -H], B: [H, -H, -H], C: [H, H, -H], D: [-H, H, -H], 'A′': [-H, -H, H], 'B′': [H, -H, H], 'C′': [H, H, H], 'D′': [-H, H, H] };
    return { v, faces: [['A', 'B', 'C', 'D'], ['A′', 'B′', 'C′', 'D′'], ['A', 'B', 'B′', 'A′'], ['B', 'C', 'C′', 'B′'], ['C', 'D', 'D′', 'C′'], ['D', 'A', 'A′', 'D′']], center: [0, 0, 0] };
  }
  function octa() {
    const r = 1 / Math.SQRT2, v = { A: [r, 0, 0], B: [0, r, 0], C: [-r, 0, 0], D: [0, -r, 0], E: [0, 0, r], F: [0, 0, -r] };
    const fs = []; for (const t of ['E', 'F']) for (const [a, b] of [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']]) fs.push([t, a, b]);
    return { v, faces: fs, sphere: 1 / s6, center: [0, 0, 0], faceNote: ' (point of tangency with the inscribed sphere)' };
  }
  function tri() { const R = 1 / s3, at = a => [R * Math.cos(a), R * Math.sin(a), 0]; return { v: { A: at(Math.PI / 2), B: at(Math.PI / 2 + 2 * Math.PI / 3), C: at(Math.PI / 2 + 4 * Math.PI / 3) }, faces: [['A', 'B', 'C']], center: [0, 0, 0], flat: true }; }
  function square() { const H = 0.5; return { v: { A: [-H, -H, 0], B: [H, -H, 0], C: [H, H, 0], D: [-H, H, 0] }, faces: [['A', 'B', 'C', 'D']], center: [0, 0, 0], flat: true }; }
  function pair() { return { v: { A: [-0.5, 0, 0], B: [0.5, 0, 0] }, faces: [], edges: [['A', 'B']], center: [0, 0, 0] }; }
  X.TEMPLATES = {
    tetra: { name: 'regular tetrahedron', make: tetra, desc: 'A regular tetrahedron ABCD with edge length a' },
    cube: { name: 'cube', make: cube, desc: 'A cube ABCD-A′B′C′D′ with edge length a' },
    octa: { name: 'regular octahedron', make: octa, desc: 'A regular octahedron with edge length a (E and F are the top and bottom vertices)' },
    tri: { name: 'equilateral triangle', make: tri, desc: 'An equilateral triangle ABC with side length a' },
    square: { name: 'square', make: square, desc: 'A square ABCD with side length a' },
    pair: { name: 'pair of point charges', make: pair, desc: 'Two points A and B a distance a apart' }
  };
  X.geo = function (tid) {
    const g = X.TEMPLATES[tid].make();
    g.edges = g.edges || edgesOf(g.faces);
    g.labels = Object.keys(g.v);
    return g;
  };
  // Point definition → coordinates and text. def: {t:'v',a} | {t:'mid',a,b} | {t:'face',f:[..]} | {t:'center'} | {t:'div',a,b,k} | {t:'xyz',p}
  // Free exploration also has {t:'sp', bg, key}: a special point of the bg-th geometric background (EL.GEO.special). Returns null when the referenced point does not exist
  X.pointPos = function (g, def, pts) {
    const P = n => g.v[n] || (pts && pts[n] && X.pointPos(g, pts[n].def, pts));
    const two = (a, b, k) => { const p = P(a), q = P(b); return p && q ? V.lerp(p, q, k) : null; };
    switch (def.t) {
      case 'v': return g.v[def.a] || null;
      case 'mid': return two(def.a, def.b, 0.5);
      case 'face': { const ps = def.f.map(P); return ps.every(Boolean) ? avg(ps) : null; }
      case 'center': return g.center.slice();
      case 'div': return two(def.a, def.b, def.k);
      case 'xyz': return def.p.slice();
      case 'sp': { const b = g.bgs && g.bgs[def.bg], s = b && b.special.find(x => x.key === def.key); return s ? s.p.slice() : null; }
    }
    return [0, 0, 0];
  };
  X.pointText = function (g, def) {
    const u = g.unit || 'a';
    switch (def.t) {
      case 'v': return 'vertex ' + def.a;
      case 'mid': return 'the midpoint of ' + def.a + def.b;
      case 'face': return 'the center of ' + (g.flat ? (def.f.length === 3 ? 'triangle ' : 'square ') : 'face ') + def.f.join('') + (g.faceNote || '');
      case 'center': return g.kind && g.kind !== 'tpl' ? 'the origin O' : 'the center of the model';
      case 'div': return 'the point X on segment ' + def.a + def.b + ' with ' + def.a + 'X : ' + def.a + def.b + ' = ' + EL.U.fmt(def.k, 3);
      case 'xyz': return 'the point with coordinates (' + def.p.map(x => EL.U.fmt(x, 3)).join(', ') + ')·' + u;
      case 'sp': { const b = g.bgs && g.bgs[def.bg], s = b && b.special.find(x => x.key === def.key); return s ? 'the ' + s.name.charAt(0).toLowerCase() + s.name.slice(1) + ' of background ' + (def.bg + 1) + ' (' + EL.GEO.TYPES[b.type].name + ')' : 'a deleted background special point'; }
    }
    return '';
  };
  // Candidate key points: edge midpoints, face centers, center (other models are given by X.candidatesOf in models.js)
  X.candidates = function (g) {
    if (g.kind && g.kind !== 'tpl') return X.candidatesOf(g);
    const out = [];
    g.edges.forEach(([a, b]) => out.push({ def: { t: 'mid', a, b }, text: 'Midpoint of ' + a + b }));
    g.faces.forEach(f => { if (f.length >= 3 && !g.flat) out.push({ def: { t: 'face', f }, text: 'Center of face ' + f.join('') }); });
    if (g.faces.length && g.flat) out.push({ def: { t: 'face', f: g.faces[0] }, text: 'Center of the model' });
    else out.push({ def: { t: 'center' }, text: 'Center of the model' });
    return out;
  };
  // Charge text: 1 → Q, -1 → −Q, 2 → 2Q, 0.5 → Q/2
  X.qText = function (q, unit) {
    unit = unit || 'Q';
    const s = q < 0 ? '−' : '+', a = Math.abs(q);
    for (let d = 1; d <= 12; d++) {
      const n = Math.round(a * d);
      if (n && Math.abs(n / d - a) < 1e-9) return s + (n === 1 ? '' : n) + unit + (d === 1 ? '' : '/' + d);
    }
    return s + EL.U.fmt(a, 3) + unit;
  };
})(window.EL);
