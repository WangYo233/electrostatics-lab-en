'use strict';
// Geometry backgrounds: planar shapes, pyramids, prisms, spheres, and regular polyhedra; provides edges, faces, and special points
(function (EL) {
  const V = EL.V;
  const GEO = {};
  const phi = (1 + Math.sqrt(5)) / 2;

  // Find the convex hull faces from the vertices (vertices of each face in cyclic order)
  GEO.hullFaces = function (pts) {
    const n = pts.length, faces = [], seen = new Set(), eps = 1e-6;
    const c = V.mul(pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      let nm = V.cross(V.sub(pts[j], pts[i]), V.sub(pts[k], pts[i]));
      if (V.len(nm) < eps) continue;
      nm = V.norm(nm);
      let d = V.dot(nm, pts[i]);
      if (V.dot(nm, c) > d) { nm = V.mul(nm, -1); d = -d; }
      let ok = true;
      const on = [];
      for (let m = 0; m < n; m++) {
        const s = V.dot(nm, pts[m]) - d;
        if (s > eps) { ok = false; break; }
        if (s > -eps) on.push(m);
      }
      if (!ok) continue;
      const key = on.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const fc = V.mul(on.reduce((s, m) => V.add(s, pts[m]), [0, 0, 0]), 1 / on.length);
      const u = V.norm(V.sub(pts[on[0]], fc)), w = V.cross(nm, u);
      on.sort((a, b) => Math.atan2(V.dot(V.sub(pts[a], fc), w), V.dot(V.sub(pts[a], fc), u)) - Math.atan2(V.dot(V.sub(pts[b], fc), w), V.dot(V.sub(pts[b], fc), u)));
      faces.push(on);
    }
    return faces;
  };
  GEO.edgesOf = function (faces) {
    const set = new Map();
    for (const f of faces) for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length], k = Math.min(a, b) + '-' + Math.max(a, b);
      if (!set.has(k)) set.set(k, [Math.min(a, b), Math.max(a, b)]);
    }
    return [...set.values()];
  };

  const perms = (a, b, c) => [[a, b, c], [b, c, a], [c, a, b]];
  const signs = (p) => {
    const out = [];
    for (const sx of p[0] ? [1, -1] : [1]) for (const sy of p[1] ? [1, -1] : [1]) for (const sz of p[2] ? [1, -1] : [1]) out.push([p[0] * sx, p[1] * sy, p[2] * sz]);
    return out;
  };
  const RAW = {
    tetra: () => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
    cube: () => signs([1, 1, 1]),
    octa: () => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
    dodeca: () => [...signs([1, 1, 1]), ...perms(0, 1 / phi, phi).flatMap(signs)],
    icosa: () => perms(0, 1, phi).flatMap(signs),
    truncIcosa: () => [...perms(0, 1, 3 * phi), ...perms(1, 2 + phi, 2 * phi), ...perms(phi, 2, phi * phi * phi)].flatMap(signs)
  };
  const POLY_CACHE = {};
  GEO.unitPoly = function (k) {
    if (!POLY_CACHE[k]) {
      const raw = RAW[k](), R = V.len(raw[0]);
      const verts = raw.map(p => V.mul(p, 1 / R)), faces = GEO.hullFaces(verts);
      POLY_CACHE[k] = { verts, faces, edges: GEO.edgesOf(faces) };
    }
    return POLY_CACHE[k];
  };

  GEO.TYPES = {
    square: { name: 'Square', dim: 2 }, rect: { name: 'Rectangle', dim: 2 }, triangle: { name: 'Triangle', dim: 2 }, circle: { name: 'Circle', dim: 2 },
    pyramid: { name: 'Square pyramid', dim: 3 }, prism: { name: 'Square prism', dim: 3 }, sphere: { name: 'Sphere', dim: 3 },
    tetra: { name: 'Regular tetrahedron', dim: 3 }, cube: { name: 'Cube', dim: 3 }, octa: { name: 'Regular octahedron', dim: 3 },
    dodeca: { name: 'Regular dodecahedron', dim: 3 }, icosa: { name: 'Regular icosahedron', dim: 3 }, truncIcosa: { name: 'Soccer ball (truncated icosahedron)', dim: 3 }
  };

  // Build a background: shape = {type, w, l, h, x, y, z}
  GEO.build = function (s) {
    const c = [s.x || 0, s.y || 0, s.z || 0], w = s.w / 2, l = (s.type === 'square' ? s.w : s.l) / 2, H = s.h;
    let verts = [], faces = [], sphere = null, circle = null;
    const add = p => V.add(c, p);
    switch (s.type) {
      case 'square': case 'rect': verts = [[-w, -l, 0], [w, -l, 0], [w, l, 0], [-w, l, 0]].map(add); faces = [[0, 1, 2, 3]]; break;
      case 'triangle': verts = [[-w, -l, 0], [w, -l, 0], [0, l, 0]].map(add); faces = [[0, 1, 2]]; break;
      case 'circle': circle = { c, r: w }; break;
      case 'sphere': sphere = { c, r: w }; break;
      case 'pyramid': verts = [[-w, -l, 0], [w, -l, 0], [w, l, 0], [-w, l, 0], [0, 0, H]].map(add); faces = [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]; break;
      case 'prism': verts = [[-w, -l, 0], [w, -l, 0], [w, l, 0], [-w, l, 0], [-w, -l, H], [w, -l, H], [w, l, H], [-w, l, H]].map(add);
        faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]; break;
      default: {
        const P = GEO.unitPoly(s.type);
        verts = P.verts.map(p => add(V.mul(p, w))); faces = P.faces;
      }
    }
    const edges = faces.length ? GEO.edgesOf(faces) : [];
    return { type: s.type, verts, faces, edges, sphere, circle, special: GEO.special(s, verts, faces, edges, sphere || circle, c) };
  };

  // Special points: keys are unique, for charge binding
  GEO.special = function (s, verts, faces, edges, round, c) {
    const out = [], mean = ps => V.mul(ps.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / ps.length);
    if (round) {
      const r = round.r;
      out.push({ key: 'center', name: 'Center', p: c.slice() });
      [['right', [r, 0, 0]], ['left', [-r, 0, 0]], ['top', [0, r, 0]], ['bottom', [0, -r, 0]]].forEach(([n, d], i) => out.push({ key: 'end' + i, name: 'Endpoint (' + n + ')', p: V.add(c, d) }));
      if (s.type === 'sphere') { out.push({ key: 'pz', name: 'Pole on +z', p: V.add(c, [0, 0, r]) }, { key: 'nz', name: 'Pole on −z', p: V.add(c, [0, 0, -r]) }); }
      return out;
    }
    verts.forEach((p, i) => out.push({ key: 'v' + i, name: 'Vertex ' + (i + 1), p }));
    edges.forEach((e, i) => out.push({ key: 'e' + i, name: 'Edge midpoint ' + (i + 1), p: V.lerp(verts[e[0]], verts[e[1]], 0.5) }));
    if (GEO.TYPES[s.type].dim === 3) faces.forEach((f, i) => out.push({ key: 'f' + i, name: 'Face center ' + (i + 1), p: mean(f.map(k => verts[k])) }));
    const dim = GEO.TYPES[s.type].dim;
    out.push({ key: 'center', name: dim === 2 ? 'Centroid' : 'Vertex-average center', p: mean(verts) });
    if (s.type === 'pyramid') out.push({ key: 'cg', name: 'Center of volume', p: V.add(c, [0, 0, s.h / 4]) });
    return out;
  };

  // Intersection lines of the cross-section with the background (2D view): returns a list of segments
  GEO.slice = function (b, B, pos) {
    const segs = [];
    const sd = p => V.dot(p, B.n) - pos;
    if (b.sphere || b.circle) {
      const R = b.sphere || b.circle, h = sd(R.c);
      let rr;
      if (b.circle) {
        if (B.name === 'xy') { if (Math.abs(h) > 1e-6) return segs; rr = R.r; }
        else {
          // A horizontal circle meets a vertical cross-section in a chord
          if (Math.abs(h) >= R.r) return segs;
          const hw = Math.sqrt(R.r * R.r - h * h), m = V.addS(R.c, B.n, -h);
          segs.push([V.addS(m, B.u, -hw), V.addS(m, B.u, hw)]);
          return segs;
        }
      } else {
        if (Math.abs(h) >= R.r) return segs;
        rr = Math.sqrt(R.r * R.r - h * h);
      }
      const m = V.addS(R.c, B.n, -h);
      for (let i = 0; i < 72; i++) {
        const a = 2 * Math.PI * i / 72, b2 = 2 * Math.PI * (i + 1) / 72;
        segs.push([V.add(m, V.add(V.mul(B.u, rr * Math.cos(a)), V.mul(B.v, rr * Math.sin(a)))), V.add(m, V.add(V.mul(B.u, rr * Math.cos(b2)), V.mul(B.v, rr * Math.sin(b2))))]);
      }
      return segs;
    }
    // Draw the outline when a planar shape lies entirely within the cross-section
    if (b.verts.length && b.verts.every(p => Math.abs(sd(p)) < 1e-6)) {
      b.edges.forEach(e => segs.push([b.verts[e[0]], b.verts[e[1]]]));
      return segs;
    }
    for (const f of b.faces) {
      const hits = [];
      for (let i = 0; i < f.length; i++) {
        const a = b.verts[f[i]], c = b.verts[f[(i + 1) % f.length]], da = sd(a), dc = sd(c);
        if ((da <= 0 && dc > 0) || (da > 0 && dc <= 0)) hits.push(V.lerp(a, c, da / (da - dc)));
      }
      if (hits.length >= 2) segs.push([hits[0], hits[1]]);
    }
    return segs;
  };

  EL.GEO = GEO;
})(window.EL);
