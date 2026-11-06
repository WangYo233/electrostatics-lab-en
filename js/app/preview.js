'use strict';
// "Model preview" in the right column of the theory page: a diagram that can be dragged to rotate, with labels matching the symbols in the key equations of this section one to one
// Hovering or clicking a symbol in the legend, the diagram, the equations or the symbol notes highlights the matching elements in the other two places
(function (EL) {
  const V = EL.V, U = EL.U, A = EL.App, h = U.h;
  const C = { dim: '#8A6D00', vec: '#B4235A', vec2: '#2E7D32', ring: '#0072B2', note: '#22303F' };
  const ring = (o, r, u, v, n) => Array.from({ length: (n || 48) + 1 }, (_, i) => { const a = 2 * Math.PI * i / (n || 48); return V.add(o, V.add(V.mul(u || [1, 0, 0], r * Math.cos(a)), V.mul(v || [0, 1, 0], r * Math.sin(a)))); });
  const ex = [1, 0, 0], ey = [0, 1, 0], ez = [0, 0, 1];
  // Displayed vector length: only the direction is meaningful, and the length is a fixed illustrative value
  const arrow = (from, dir, len) => V.add(from, V.mul(V.norm(dir), len));
  const Ei = (s, P) => { const d = V.sub(P, s.p), r = V.len(d); return r > 1e-9 ? V.mul(d, s.q / (r * r * r)) : [0, 0, 0]; };
  // Legend: k is the key (same as data-k in the diagram), s the symbol (TeX), d the description, and mt the text of the matching symbol in the equations (used for highlighting between equations and diagram)
  const L = (k, s, d, mt) => ({ k, s, d, mt: mt || [] });

  const SPEC = {
    1: c => {
      const p = c.p, q1 = [-p.d / 2, 0, 0], P = c.probe ? c.probe.pos : [0, 1, 0], rs = Math.max(0.6, p.d * 0.3);
      return { extra: { pts: [{ n: 'P', p: P, k: 'P' }], dims: [{ a: 'Q1', b: 'Q2', t: 'd', k: 'd' }],
        lines: [{ pts: [q1, P], t: 'R', k: 'R', col: C.vec, at: 0.55 }, { pts: ring(q1, rs, ex, ez), t: 'R_{sphere}', k: 'Rs', col: C.ring, at: 0.62, solid: true, w: 1 }] },
        legend: [L('Q1', 'Q_1', 'Source charge, located at $(-d/2,0,0)$.', ['Q1', 'q']), L('Q2', 'Q_2', 'Source charge, located at $(d/2,0,0)$.', ['Q2']), L('d', 'd', 'Distance between the two source charges.', ['d']),
          L('O', 'O', 'Coordinate origin, the midpoint of the line joining the two charges.', ['O']), L('B', 'B', 'Located at $(d/2,0,0)$, used to compare readings after the distance is doubled.', ['B']), L('P', 'P', 'Probe (field point).', []),
          L('R', 'R', 'Distance from the field point to the point charge $Q_1$.', ['R']), L('Rs', 'R_{\\rm sphere}', 'Radius of the equipotential sphere centered on $Q_1$ (illustrative in the diagram).', ['Rsphere'])] };
    },
    2: c => {
      const P = c.probe.pos, E = c.probe.s && c.probe.s.ok ? c.probe.s.E[0] : 1;
      return { extra: { pts: [{ n: 'P', p: P, k: 'P' }], dims: [{ a: 'Q1', b: 'Q2', t: 'd', k: 'd' }],
        lines: [{ pts: [[0, 0, 0], P], t: 's', k: 's', col: C.dim, solid: true, w: 2 }], vecs: [{ from: P, to: V.add(P, [Math.sign(E || 1) * 1.4, 0, 0]), t: 'E_{∥}', k: 'Epar', col: C.vec }] },
        legend: [L('Q1', 'Q_1', 'Source charge, located at $(-d/2,0,0)$.', ['Q1']), L('Q2', 'Q_2', 'Source charge, located at $(d/2,0,0)$.', ['Q2']), L('d', 'd', 'Distance between the two source charges.', ['d']),
          L('O', 'O', 'Coordinate origin, corresponding to $s=0$.', ['O']), L('P', 'P', 'Probe (field point), located at $(s,0,0)$.', ['P']), L('s', 's', 'Arc-length coordinate measured along the $x$ axis.', ['s', 'ds']),
          L('Epar', 'E_\\parallel', 'Component of the field along the direction of travel on the path ($+x$); the arrow shows direction only.', ['E∥', 'E‖'])] };
    },
    3: c => {
      const s = c.sources, srcK = {};
      s.forEach(q => { if (/^\d+$/.test(q.label)) srcK[q.label] = 'q'; });
      const lines = s.length > 1 ? [{ pts: [s[0].p, s[1].p], t: 'R_{12}', k: 'Rij', col: C.vec, solid: true, at: 0.5 }] : [];
      return { extra: { srcK, lines },
        legend: [L('q', 'q', 'Charge of each point charge on the circle; there are $N$ of them, numbered in order in the diagram.', ['q', 'qi', 'qj', 'N']), L('O', 'O', 'Center of the disk.', []), L('R', 'R', 'Radius of the disk, which is also the distance from the center to a charge on the circle.', ['R']),
          L('Rij', 'R_{ij}', 'Distance between charges $i$ and $j$; the diagram shows $R_{12}$.', ['Rij'])] };
    },
    4: c => {
      const a = c.p.a, s = c.sources.find(q => q.label === 'T2');
      return { extra: { dims: [{ a: 'O', b: 'T1', t: '√3a', k: 'R_OT' }, { a: 'O', b: 'M₁₂', t: 'a', k: 'a' }], vecs: s ? [{ from: [0, 0, 0], to: V.mul(s.p, 0.62), t: 'r_i', k: 'ri', col: C.vec }] : [] },
        legend: [L('T1', 'T_1', 'Vertex $(a,a,a)$.', ['T1']), L('T2', 'T_2', 'Vertex $(a,-a,-a)$.', ['T2']), L('T3', 'T_3', 'Vertex $(-a,a,-a)$.', ['T3']), L('T4', 'T_4', 'Vertex $(-a,-a,a)$.', ['T4']),
          L('O', 'O', 'Center of the regular tetrahedron (the origin).', ['O', 'E(O)', 'V(O)']), L('a', 'a', 'Coordinate scale: the distance from the center to the edge midpoint $M_{12}$; the edge length is $2\\sqrt2\\,a$.', ['a']),
          L('R_OT', '\\sqrt3\\,a', 'Distance from the center to each vertex, $R_{O,T_i}$.', ['RO,Ti', '3a', '3']), L('ri', '\\vec r_i', 'Position vector of vertex $i$; the diagram shows the direction of $\\vec r_2$.', ['ri', 'r1']),
          L('M₁₂', 'M_{12}', 'Midpoint of edge $T_1T_2$, the field point in the alternating-charge stage.', [])] };
    },
    5: c => {
      const a = c.p.a, r = a / Math.sqrt(3), n = V.norm([-1, 1, 1]);
      return { extra: { dims: [{ a: 'O', b: 'P', t: 'a', k: 'a' }, { a: 'O', b: 'T_PMN', t: 'r_{in}', k: 'rin' }], notes: [{ at: V.mul(n, -r * 0.45), t: 'τ', k: 'tau', it: true }] },
        legend: [L('M', 'M,\\ N', 'Vertices carrying $+q$.', ['M', 'N']), L('F', 'F,\\ Q', 'Vertices carrying $-q$.', ['F', 'Q']), L('P', 'P,\\ R', 'Uncharged vertices, symmetric about the $y=0$ plane.', ['P', 'R']),
          L('O', 'O', 'Center of the regular octahedron.', []), L('a', 'a', 'Distance from a vertex to the center.', ['a']), L('rin', 'r_{\\rm in}', 'Radius of the inscribed sphere, equal to $a/\\sqrt3$.', ['rin']),
          L('T_PMN', 'T_{PMN}', 'Point of tangency of the inscribed sphere with face PMN, $\\tau=+1$.', ['TPMN']), L('T_QRF', 'T_{QRF}', 'Point of tangency of the inscribed sphere with face QRF, $\\tau=-1$.', ['TQRF']),
          L('tau', '\\tau', 'Dimensionless parameter along the line joining the two points of tangency (dashed).', ['τ', 'dτ', 't', 'dt'])], srcK: { N: 'M', Q: 'F' }, ptK: { R: 'P' } };
    },
    6: c => {
      const hh = c.p.a / 2, E = c.sources.find(q => q.label === 'E');
      return { extra: { dims: [{ a: 'A', b: 'D', t: 'a', k: 'a' }], lines: [{ pts: [[-hh, -hh, -hh], [hh, hh, hh]], t: 'ℓ', k: 'l', col: C.vec, at: 0.72 }],
        vecs: E ? [{ from: [0, 0, 0], to: V.mul(E.p, 0.75), t: 'r_i', k: 'ri', col: C.vec2 }] : [] },
        legend: [L('E', 'E,\\ F', 'Centers of the top and bottom faces, carrying $+q$.', ['E', 'F']), L('G', 'G,\\ H', 'Centers of the left and right faces, carrying $-q$.', ['G', 'H']), L('ri', '\\vec r_i', 'Position vector of a face center; the diagram shows the position vector of E.', ['ri']),
          L('O', 'O', 'Center of the cube, the center of inversion.', []), L('a', 'a', 'Edge length of the cube.', ['a']), L('l', '\\ell', 'Length of the space diagonal, $\\sqrt3\\,a$; the dashed line is path A (A′ to C).', ['ℓ', 'ell', 'l']),
          L('A′', 'A′,\\ C', 'Start and end of path A.', ['A′', 'C']), L('D', 'D,\\ B′', 'Start and end of path B, symmetric about the center.', ['D', 'B′'])], srcK: { F: 'E', H: 'G' }, ptK: { C: 'A′', 'B′': 'D' } };
    },
    7: c => {
      const st = c.st, B = V.planeBasis(st.plane), R = Math.min(c.bound, 4) * 0.7, r0 = V.mul(B.n, st.planePos || 0);
      const P = c.probe ? c.probe.pos : [0, 1.5, 0], s = c.sources.filter(q => q.q).slice(0, 2);
      const rect = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([u, v]) => V.add(r0, V.add(V.mul(B.u, u * R), V.mul(B.v, v * R))));
      const vecs = [{ from: r0, to: V.add(r0, V.mul(B.u, R * 0.4)), t: 'e_1', k: 'e1', col: C.dim }, { from: r0, to: V.add(r0, V.mul(B.v, R * 0.4)), t: 'e_2', k: 'e2', col: C.dim }];
      s.forEach((q, i) => vecs.push({ from: P, to: arrow(P, Ei(q, P), 1.3), t: 'E_' + (i + 1), k: 'E' + (i + 1), col: i ? C.vec2 : C.vec }));
      return { extra: { pts: [{ n: 'r_0', p: r0, k: 'r0' }, { n: 'P', p: P, k: 'P' }], lines: [{ pts: rect, t: 'Slice', k: 'slice', col: C.ring, solid: true, w: 1, at: 0.1 }], vecs },
        legend: [L('slice', '(u,v)', 'Plane coordinates on the slice (blue frame); the slice position matches the setting in View.', ['u', 'v', 'Vslice']), L('r0', '\\vec r_0', 'Reference point on the slice.', ['r0']),
          L('e1', '\\vec e_1', 'Unit vector in the slice.', ['e1']), L('e2', '\\vec e_2', 'Unit vector in the slice perpendicular to $\\vec e_1$.', ['e2']), L('P', 'P', 'Probe (field point).', []),
          L('E1', '\\vec E_1', 'Component field at P due to the first source charge; the arrow shows direction only.', ['E1']), L('E2', '\\vec E_2', 'Component field at P due to the second source charge.', ['E2'])] };
    }
  };
  // The six sub-models of the analytic-field model (08)
  const SPEC8 = {
    point: (c, sp) => { const P = [1.6, 0, 0.9]; return { extra: { pts: [{ n: 'P', p: P, k: 'P' }], lines: [{ pts: [[0, 0, 0], P], t: 'r', k: 'r', col: C.dim, solid: true }, { pts: ring([0, 0, 0], 1.1, ex, ez), t: 'r_{V*}', k: 'rv', col: C.ring, solid: true, w: 1, at: 0.6 }],
      vecs: [{ from: P, to: arrow(P, V.mul(P, sp.q || 1), 1), t: 'E', k: 'E', col: C.vec }] },
      legend: [L('q', 'q', 'Point charge, located at the origin.', ['q']), L('r', '\\vec r', 'Position vector of the field point relative to the point charge; $r$ is its length.', ['r']), L('E', '\\vec E', 'Electric field at the field point, directed radially.', ['E']),
        L('rv', 'r_{V_*}', 'Radius of the equipotential sphere on which the potential is $V_*$ (illustrative in the diagram).', ['rV']), L('P', 'P', 'Field point.', [])] }; },
    'infinite-line': (c, sp) => { const P = [1.6, 0, 1], F = [0, 0, 1]; return { extra: { pts: [{ n: 'P', p: P, k: 'P' }], lines: [{ pts: [F, P], t: 'ρ', k: 'rho', col: C.dim, solid: true }, { pts: ring([0, 0, 0], Math.min(sp.r0, 2.5), ex, ey), t: 'ρ_0', k: 'rho0', col: C.ring, solid: true, w: 1, at: 0.68 }],
      vecs: [{ from: P, to: V.add(P, [0.9, 0, 0]), t: 'e_{ρ}', k: 'erho', col: C.vec }], notes: [{ at: [0, 0, -2.2], t: 'λ', k: 'lambda', it: true }] },
      legend: [L('lambda', '\\lambda', 'Linear charge density of the infinite line charge along the $z$ axis.', ['λ']), L('rho', '\\rho', 'Perpendicular distance from the field point to the $z$ axis.', ['ρ']), L('erho', '\\hat e_\\rho', 'Unit vector perpendicular to the $z$ axis and pointing away from it.', ['eρ', 'e^ρ', 'e^']),
        L('rho0', '\\rho_0', 'Reference radius of the cylinder on which the potential is zero.', ['ρ0']), L('P', 'P', 'Field point.', [])] }; },
    'infinite-plane': (c, sp) => { const s = Math.sign(sp.sigma || 1), P = [0.8, 0.8, 1.4], Q = [0.8, 0.8, -1.4]; return { extra: { pts: [{ n: 'P', p: P, k: 'P' }, { n: 'P′', p: Q, k: 'P' }],
      dims: [{ a: [0.8, 0.8, 0], b: P, t: 'z', k: 'z' }], vecs: [{ from: P, to: V.add(P, [0, 0, s]), t: 'E', k: 'E', col: C.vec }, { from: Q, to: V.add(Q, [0, 0, -s]), t: 'E', k: 'E', col: C.vec }], notes: [{ at: [-2.1, 2.1, 0], t: 'σ', k: 'sigma', it: true }] },
      legend: [L('sigma', '\\sigma', 'Surface charge density of the charged plane $z=0$.', ['σ']), L('z', 'z', 'Signed distance from the field point to the charged plane.', ['z', '|z|']), L('E', '\\vec E', 'The field has equal magnitude and opposite direction on the two sides, independent of distance.', ['E', 'E(z)']),
        L('P', 'P,\\ P′', 'Two field points on either side of the plane, symmetric about it.', [])] }; },
    'conductor-sphere': (c, sp) => { const P = V.mul(V.norm([1, 0, 0.6]), sp.a * 1.8); return { extra: { pts: [{ n: 'P', p: P, k: 'P' }], dims: [{ a: [0, 0, 0], b: [0, -sp.a, 0], t: 'a', k: 'a' }],
      lines: [{ pts: [[0, 0, 0], P], t: 'r', k: 'r', col: C.dim, solid: true }], vecs: [{ from: P, to: arrow(P, V.mul(P, sp.q || 1), sp.a * 0.8), t: 'E', k: 'E', col: C.vec }], notes: [{ at: [0, 0, sp.a * 1.22], t: 'q', k: 'q', it: true }] },
      legend: [L('a', 'a', 'Radius of the conducting sphere.', ['a']), L('q', 'q', 'Total charge on the conducting sphere, distributed over its surface.', ['q']), L('r', 'r', 'Distance from the field point to the center of the sphere.', ['r']), L('E', '\\vec E', 'Field outside the sphere, the same as if the charge were concentrated at the center; zero inside.', ['E']), L('P', 'P', 'Field point outside the sphere.', [])] }; },
    'dielectric-interface': (c, sp) => { const s = Math.sign(sp.D || 1), k1 = 1.6 / Math.max(sp.e1, sp.e2), P1 = [0.6, 0.6, 1.2], P2 = [0.6, 0.6, -1.2]; return { extra: { pts: [],
      vecs: [{ from: [-1.2, -1.2, -0.9], to: [-1.2, -1.2, -0.9 + s * 1.8], t: 'D', k: 'D', col: C.vec2 }, { from: P1, to: V.add(P1, [0, 0, s * 1.6 * Math.max(sp.e1, sp.e2) / sp.e1 * k1 * 0.9]), t: 'E_1', k: 'E1', col: C.vec }, { from: P2, to: V.add(P2, [0, 0, s * 1.6 * Math.max(sp.e1, sp.e2) / sp.e2 * k1 * 0.9]), t: 'E_2', k: 'E2', col: C.vec }],
      notes: [{ at: [-1.8, 1.8, 1.4], t: 'ε₁', k: 'e1', it: true }, { at: [-1.8, 1.8, -1.4], t: 'ε₂', k: 'e2', it: true }] },
      legend: [L('e1', '\\varepsilon_1', 'Relative permittivity of medium 1 ($z>0$).', ['ε1']), L('e2', '\\varepsilon_2', 'Relative permittivity of medium 2 ($z<0$).', ['ε2']), L('D', 'D', 'Component of the electric displacement along $z$, the same on both sides.', ['D', 'D1n', 'D2n']),
        L('E1', '\\vec E_1', 'Field in medium 1; its length is proportional to $1/\\varepsilon_1$.', ['E1', 'E1n']), L('E2', '\\vec E_2', 'Field in medium 2; its length is proportional to $1/\\varepsilon_2$.', ['E2', 'E2n'])] }; },
    'dielectric-sphere': (c, sp) => { const a = sp.a, s = Math.sign(sp.E0 || 1), P = V.mul(V.norm([1, 0, 0.7]), a * 1.9), Cc = 3 * sp.eout / (sp.ein + 2 * sp.eout); return { extra: { pts: [{ n: 'P', p: P, k: 'P' }],
      dims: [{ a: [0, 0, 0], b: [0, -a, 0], t: 'a', k: 'a' }], lines: [{ pts: [[0, 0, 0], P], t: 'r', k: 'r', col: C.dim, solid: true }],
      vecs: [{ from: [-a * 2, 0, -s * a], to: [-a * 2, 0, s * a], t: 'E_0', k: 'E0', col: C.vec2 }, { from: [a * 0.25, 0, -s * a * 0.4 * Cc], to: [a * 0.25, 0, s * a * 0.4 * Cc + s * 0.01], t: 'E_{in}', k: 'Ein', col: C.vec }],
      notes: [{ at: [-a * 0.35, 0, a * 0.45], t: 'ε_{in}', k: 'ein', it: true }, { at: [a * 1.5, 0, -a * 1.3], t: 'ε_{out}', k: 'eout', it: true }] },
      legend: [L('E0', 'E_0', 'Field of the uniform external field far away, along the $z$ direction.', ['E0']), L('a', 'a', 'Radius of the dielectric sphere.', ['a']), L('ein', '\\varepsilon_{\\rm in}', 'Relative permittivity of the dielectric inside the sphere.', ['εin']),
        L('eout', '\\varepsilon_{\\rm out}', 'Relative permittivity of the dielectric outside the sphere.', ['εout']), L('Ein', '\\vec E_{\\rm in}', 'Uniform field inside the sphere, equal to $CE_0$.', ['Ein', 'C', 'CE0']), L('r', 'r', 'Distance from the field point to the center of the sphere; $z$ is the $z$ coordinate of the field point.', ['r', 'z']), L('P', 'P', 'Field point outside the sphere.', [])] }; }
  };

  // Text of the symbols in the equations (MathML text; math letters are normalized to plain letters)
  const norm = s => String(s).normalize('NFKC').replace(/\s+/g, '').replace(/[⃗→]/g, '');
  let cur = null;   // { box, keys: Map(mt → k), legend }
  const mark = k => {
    if (!cur) return;
    const root = U.$('#theory');
    U.$$('.hl', root).forEach(e => e.classList.remove('hl'));
    if (cur.show) cur.show(k);
    if (!k) return;
    U.$$('[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]', root).forEach(e => e.classList.add('hl'));
    U.$$('#theoryBody math [data-mk="' + k + '"]').forEach(e => e.classList.add('hl'));
  };
  // In the equations and symbol notes, add data-mk to the symbols that match a legend entry
  const tagMath = keys => {
    for (const mth of U.$$('#theoryBody .formula math, #theoryBody .where math')) {
      for (const el of mth.querySelectorAll('msub, msup, msubsup, mover, mi, mn')) {
        if (el.closest('[data-mk]')) continue;
        const k = keys.get(norm(el.textContent));
        if (k && !(el.tagName.toLowerCase() === 'mn' && el.parentElement.tagName.toLowerCase() !== 'msqrt')) el.setAttribute('data-mk', k);
      }
    }
  };

  A.renderPreview = function (host, c, t) {
    const m = c.m, fn = m.analytic ? SPEC8[c.sub] : SPEC[m.id];
    if (!host) return;
    if (!fn) { host.replaceChildren(); host.hidden = true; return; }
    host.hidden = false;
    let sp;
    try { sp = fn(c, c.subP); } catch (e) { host.replaceChildren(); host.hidden = true; return; }
    const extra = Object.assign({ srcK: sp.srcK }, sp.extra);
    // Keys of key points: one legend entry can match several points (e.g. P and R)
    if (sp.ptK) extra.pts = (extra.pts || []).concat((t.pts ? t.pts(c.p) : []).filter(q => sp.ptK[q.n]).map(q => ({ n: q.n, p: q.p, k: sp.ptK[q.n] })));
    const flat = m.view === '2d' && m.id === 3;
    const V0 = { th: -0.95, ph: 0.42, z: 1 };
    const view = host._view && host._view.id === (m.id + ':' + c.sub) ? host._view : Object.assign({ id: m.id + ':' + c.sub }, V0);
    host._view = view;
    const fig = h('div.pv-fig', { tabindex: '0', role: 'img', 'aria-label': m.title + ': model preview. ' + (flat ? '' : 'Drag or use the arrow keys to rotate; ') + 'scroll or press +/− to zoom; double-click to reset.' });
    // The SVG sits in a zoomable layer: zoom is a CSS transform (no relayout); rotation only redraws the SVG
    const layer = h('div.pv-layer');
    fig.append(layer);
    let hot = null;
    const lk = new Set(sp.legend.map(x => x.k)), ptK = sp.ptK || {};
    const th = Object.assign({}, t, { pts: p => (t.pts ? t.pts(p) : []).filter(q => !ptK[q.n] && lk.has(q.n)) });
    const draw = () => {
      // Only key points in the legend are drawn, so labels match the formula symbols one to one; labels are pinned next to their points and turn with the model
      layer.innerHTML = A.figure(c, th, { th0: view.th, ph0: view.ph, extra, fixed: !flat, pin: true, W: 300, aspect: flat ? 0.86 : 0.8, idp: 'pv' });
      if (hot) mark(hot);
    };
    const zl = h('span.pv-zl', { 'aria-live': 'polite' }, '100%');
    const zoomTo = z => { view.z = U.clamp(z, 0.6, 4); layer.style.transform = 'scale(' + view.z + ')'; zl.textContent = Math.round(view.z * 100) + '%'; };
    draw();
    // Rotation: dragging has inertia; arrow keys and reset use an eased animation; several requests in one frame redraw once
    let raf = 0, vel = [0, 0], anim = null;
    const frame = () => {
      raf = 0;
      if (anim) {
        const k = Math.min(1, (performance.now() - anim.t0) / 320), e = 1 - Math.pow(1 - k, 3);
        view.th = anim.a.th + (anim.b.th - anim.a.th) * e; view.ph = anim.a.ph + (anim.b.ph - anim.a.ph) * e;
        if (anim.b.z != null) zoomTo(anim.a.z + (anim.b.z - anim.a.z) * e);
        if (k >= 1) anim = null;
      } else if (!drag && (Math.abs(vel[0]) > 1e-4 || Math.abs(vel[1]) > 1e-4)) {
        view.th += vel[0]; view.ph = U.clamp(view.ph + vel[1], -1.45, 1.45); vel = [vel[0] * 0.9, vel[1] * 0.9];
      } else if (!drag) { draw(); return; }
      draw();
      if (anim || (!drag && (Math.abs(vel[0]) > 1e-4 || Math.abs(vel[1]) > 1e-4))) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const ease = to => { anim = { t0: performance.now(), a: { th: view.th, ph: view.ph, z: view.z }, b: to }; vel = [0, 0]; kick(); };
    let drag = null;
    if (!flat) {
      fig.addEventListener('pointerdown', e => { if (e.button) return; drag = [e.clientX, e.clientY, performance.now()]; anim = null; vel = [0, 0]; try { fig.setPointerCapture(e.pointerId); } catch (er) { /* synthetic events */ } fig.classList.add('drag'); });
      fig.addEventListener('pointermove', e => {
        if (!drag) return;
        const dt = -(e.clientX - drag[0]) * 0.01, dp = (e.clientY - drag[1]) * 0.01;
        view.th += dt; view.ph = U.clamp(view.ph + dp, -1.45, 1.45); vel = [dt, dp]; drag = [e.clientX, e.clientY, performance.now()];
        kick();
      });
      const up = () => { if (!drag) return; if (performance.now() - drag[2] > 80) vel = [0, 0]; drag = null; fig.classList.remove('drag'); kick(); };
      fig.addEventListener('pointerup', up); fig.addEventListener('pointercancel', up);
    }
    fig.addEventListener('dblclick', () => ease(Object.assign({}, V0)));
    fig.addEventListener('wheel', e => { e.preventDefault(); zoomTo(view.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    fig.addEventListener('keydown', e => {
      const d = flat ? null : { ArrowLeft: [0.35, 0], ArrowRight: [-0.35, 0], ArrowUp: [0, 0.25], ArrowDown: [0, -0.25] }[e.key];
      if (d) { e.preventDefault(); ease({ th: view.th + d[0], ph: U.clamp(view.ph + d[1], -1.45, 1.45) }); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(view.z * 1.25); }
      if (e.key === '-') { e.preventDefault(); zoomTo(view.z / 1.25); }
      if (e.key === '0') { e.preventDefault(); zoomTo(1); }
    });
    // Zoom buttons and enlarged view
    const big = () => { const on = !host.classList.contains('pv-big'); host.classList.toggle('pv-big', on); fs.textContent = on ? 'Close' : 'Enlarge'; fs.setAttribute('aria-pressed', on); if (on) fig.focus(); };
    const fs = h('button.btn.mini', { type: 'button', 'aria-pressed': 'false', onclick: big }, 'Enlarge');
    const tools = h('div.pv-tools', null,
      h('button.btn.mini', { type: 'button', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => zoomTo(view.z / 1.25) }, '−'), zl,
      h('button.btn.mini', { type: 'button', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => zoomTo(view.z * 1.25) }, '+'),
      h('button.btn.mini', { type: 'button', title: 'Restore view and zoom', onclick: () => ease(Object.assign({}, V0)) }, 'Reset'), fs);
    host.onkeydown = e => { if (e.key === 'Escape' && host.classList.contains('pv-big')) big(); };
    zoomTo(view.z || 1);
    // Legend: symbols and descriptions
    // Legend: symbols laid out as rows of small tags, with the description (of the hovered, focused or clicked symbol) shown below
    const desc = h('p.pv-desc', { 'aria-live': 'polite' });
    const D0 = 'Hover over or click a symbol to see its description and highlight it in the diagram.';
    const legend = h('ul.pv-leg', { 'aria-label': 'Symbols in the diagram' }, sp.legend.map(x => h('li', { 'data-k': x.k, tabindex: '0', role: 'button' }, h('span.pv-s', { html: EL.tex(x.s, false) }))));
    const byK = new Map(sp.legend.map(x => [x.k, x]));
    const keys = new Map();
    for (const x of sp.legend) for (const s of x.mt) if (!keys.has(norm(s))) keys.set(norm(s), x.k);
    host.replaceChildren(h('h2', null, 'Model preview'), fig, tools, h('p.pv-tip', null, (flat ? '' : 'Drag to rotate; ') + 'scroll to zoom; double-click to reset.'), legend, desc);
    cur = { keys, show: k => { const x = byK.get(k); desc.innerHTML = x ? '<b>' + EL.tex(x.s, false) + '</b> ' + U.richMath(x.d) : D0; } };
    cur.show(null);
    tagMath(keys);
    // Hover and click: the legend, the diagram elements and the equation symbols highlight each other; a click keeps the highlight, and clicking again clears it
    let pinned = null;
    const keyOf = e => { const el = e.target.closest && e.target.closest('[data-k], [data-mk]'); return el ? el.getAttribute('data-k') || el.getAttribute('data-mk') : null; };
    const page = U.$('#theory');
    if (page._pvOff) page._pvOff();
    const over = e => { if (!e.target.closest('.pv, #theoryBody math')) return; const k = keyOf(e); hot = k || pinned; mark(hot); };
    const click = e => { if (!e.target.closest('.pv-leg, .pv-fig, #theoryBody math')) return; const k = keyOf(e); if (!k) return; pinned = pinned === k ? null : k; hot = pinned; mark(hot); };
    const focus = e => { if (e.target.closest && e.target.closest('.pv-leg li')) { hot = e.target.getAttribute('data-k'); mark(hot); } };
    page.addEventListener('mouseover', over); page.addEventListener('click', click); page.addEventListener('focusin', focus);
    page._pvOff = () => { page.removeEventListener('mouseover', over); page.removeEventListener('click', click); page.removeEventListener('focusin', focus); };
  };
  A.previewSpecs = { SPEC, SPEC8 };
})(window.EL);
