'use strict';
// 08 Model extension: six analytic electrostatic models (k = 1, ε₀ = 1/(4π), ε is relative permittivity)
(function (EL) {
  const V = EL.V, P4 = 4 * Math.PI, NAN3 = [NaN, NaN, NaN];
  const golden = (n, f) => Array.from({ length: n }, (_, i) => { const t = (i + 0.5) / n, z = 1 - 2 * t, r = Math.sqrt(1 - z * z), a = i * Math.PI * (3 - Math.sqrt(5)); return f([r * Math.cos(a), r * Math.sin(a), z], i, t); });
  const disk = (n, R, zf) => Array.from({ length: n }, (_, i) => { const r = 0.8 * R * Math.sqrt(i / Math.max(1, n - 1)), a = i * 2.39996; return [r * Math.cos(a), r * Math.sin(a), zf(i)]; });

  const SUB = {
    point: { name: 'Point charge', cat: 'Reference model', params: [{ key: 'q', label: 'Point charge q', min: -10, max: 10, step: 0.1, val: 1 }],
      fn: (p, x) => { const r = V.len(x); if (p.q === 0) return { V: 0, E: [0, 0, 0], region: 'All space' }; if (r < 1e-9) return { V: NaN, E: NAN3, region: 'At the point charge (undefined)' }; return { V: p.q / r, E: V.mul(x, p.q / (r * r * r)), region: 'r>0' }; },
      seeds: (p, R, n) => golden(n, d => V.mul(d, 0.12 * R)), surf: (p, L) => p.q * L > 0 ? { sphere: p.q / L } : null, src: p => p.q, geom: 'point' },
    'infinite-line': { name: 'Infinite uniform line charge', cat: 'Infinite sources', params: [{ key: 'lambda', label: 'Line charge density λ', min: -10, max: 10, step: 0.1, val: 1 }, { key: 'r0', label: 'Reference radius for zero potential ρ₀', min: 0.1, max: 10, step: 0.1, val: 1 }],
      fn: (p, x) => { const rho = Math.hypot(x[0], x[1]); if (rho < 1e-6) return { V: NaN, E: NAN3, region: 'On the line charge (undefined)' }; return { V: -2 * p.lambda * Math.log(rho / p.r0), E: [2 * p.lambda * x[0] / (rho * rho), 2 * p.lambda * x[1] / (rho * rho), 0], region: 'ρ>0' }; },
      seeds: (p, R, n) => golden(n, (d, i, t) => [0.15 * R * Math.cos(i * 2.39996), 0.15 * R * Math.sin(i * 2.39996), 0.7 * R * (2 * t - 1)]),
      surf: (p, L) => p.lambda ? { cyl: p.r0 * Math.exp(-L / (2 * p.lambda)) } : null, src: p => p.lambda, geom: 'line' },
    'infinite-plane': { name: 'Infinite uniformly charged plane', cat: 'Infinite sources', params: [{ key: 'sigma', label: 'Surface charge density σ', min: -10, max: 10, step: 0.1, val: 1 }],
      fn: (p, x) => { if (Math.abs(x[2]) < 1e-9 && p.sigma) return { V: 0, E: NAN3, region: 'On the charged plane (field undefined)' }; return { V: -2 * Math.PI * p.sigma * Math.abs(x[2]), E: [0, 0, 2 * Math.PI * p.sigma * Math.sign(x[2])], region: x[2] > 0 ? 'z>0' : 'z<0' }; },
      seeds: (p, R, n) => disk(n, R, i => (i % 2 ? 1 : -1) * 0.08 * R), surf: (p, L) => p.sigma && -L / (2 * Math.PI * p.sigma) > 0 ? { planes: -L / (2 * Math.PI * p.sigma) } : null,
      src: p => p.sigma, geom: 'plane', stopAt: 'z0' },
    'conductor-sphere': { name: 'Isolated charged conducting sphere', cat: 'Conductor', params: [{ key: 'q', label: 'Total charge on the conducting sphere q', min: -10, max: 10, step: 0.1, val: 1 }, { key: 'a', label: 'Sphere radius a', min: 0.1, max: 5, step: 0.05, val: 1 }],
      fn: (p, x) => { const r = V.len(x); if (Math.abs(r - p.a) < 1e-9) return { V: p.q / p.a, E: NAN3, region: 'On the sphere surface (one-sided limit of the field)' }; if (r < p.a) return { V: p.q / p.a, E: [0, 0, 0], region: 'Inside the conductor' }; return { V: p.q / r, E: V.mul(x, p.q / (r * r * r)), region: 'Outside the sphere' }; },
      seeds: (p, R, n) => golden(n, d => V.mul(d, 1.02 * p.a)), surf: (p, L) => p.q * L > 0 && p.q / L > p.a ? { sphere: p.q / L } : null, src: p => p.q, geom: 'sphere', inner: true },
    'dielectric-interface': { name: 'Planar interface between two dielectrics', cat: 'Dielectric', params: [{ key: 'e1', label: 'Relative permittivity of medium 1 (z>0), ε₁', min: 0.1, max: 100, step: 0.1, val: 2 }, { key: 'e2', label: 'Relative permittivity of medium 2 (z<0), ε₂', min: 0.1, max: 100, step: 0.1, val: 5 }, { key: 'D', label: 'Normal component of the electric displacement D', min: -10, max: 10, step: 0.1, val: 1 }],
      fn: (p, x) => { const e = x[2] >= 0 ? p.e1 : p.e2, Ez = P4 * p.D / e; return { V: -Ez * x[2], E: [0, 0, Ez], region: x[2] >= 0 ? 'Medium 1 (z>0)' : 'Medium 2 (z<0)' }; },
      seeds: (p, R, n) => disk(n, R, () => -Math.sign(p.D || 1) * 0.85 * R), surf: () => null, src: p => p.D, geom: 'plane' },
    'dielectric-sphere': { name: 'Dielectric sphere in a uniform external field', cat: 'Dielectric', params: [{ key: 'ein', label: 'Relative permittivity inside the sphere, ε_in', min: 0.1, max: 100, step: 0.1, val: 4 }, { key: 'eout', label: 'Relative permittivity outside the sphere, ε_out', min: 0.1, max: 100, step: 0.1, val: 1 }, { key: 'a', label: 'Sphere radius a', min: 0.1, max: 5, step: 0.05, val: 1 }, { key: 'E0', label: 'Applied uniform field E₀', min: -10, max: 10, step: 0.1, val: 1 }],
      fn: (p, x) => {
        const be = (p.ein - p.eout) / (p.ein + 2 * p.eout), C = 3 * p.eout / (p.ein + 2 * p.eout), r = V.len(x);
        if (r < p.a) return { V: -C * p.E0 * x[2], E: [0, 0, C * p.E0], region: 'Inside the sphere' };
        const b = be * p.E0 * Math.pow(p.a / r, 3), r2 = r * r;
        return { V: -p.E0 * x[2] + be * p.E0 * p.a * p.a * p.a * x[2] / (r2 * r), E: [3 * b * x[2] * x[0] / r2, 3 * b * x[2] * x[1] / r2, p.E0 + b * (3 * x[2] * x[2] / r2 - 1)], region: 'Outside the sphere' };
      },
      seeds: (p, R, n) => disk(n, R, () => -Math.sign(p.E0 || 1) * 0.85 * R), surf: () => null, src: p => p.E0, geom: 'sphere' }
  };
  EL.SUB08 = SUB;

  const params = [{ key: 'range', label: 'Half-width of the display region / L', min: 1, max: 20, step: 0.5, val: 5 }];
  for (const id in SUB) for (const q of SUB[id].params) params.push(Object.assign({}, q, { key: id + ':' + q.key, sub: id }));
  params.push({ key: 'px', label: 'Probe x coordinate / L', min: -20, max: 20, step: 0.05, val: 2, probe: true }, { key: 'py', label: 'Probe y coordinate / L', min: -20, max: 20, step: 0.05, val: 0, probe: true }, { key: 'pz', label: 'Probe z coordinate / L', min: -20, max: 20, step: 0.05, val: 1, probe: true });

  EL.defModel({
    id: 8, code: 'Ext. 1', order: 7, ext: true, file: '08', title: 'Analytic field models', short: 'Analytic models of an infinite line charge, an infinite charged plane, a conducting sphere, and dielectrics',
    view: '3d', R: 5, rangeKey: 'range', analytic: true, subs: SUB, sub: 'point', perCharge: false,
    params, display: { level: 0, spacing: 0.5, count: 3, seeds: 18, plane: 'xz' },
    defaultLayers: { geom: true, lines: true, contours: true, surfaces: false, vectors: false, frame: true, probe: true },
    probe: { free: ['px', 'py', 'pz'] },
    subParams(p, id) { const o = {}; for (const q of SUB[id].params) o[q.key] = p[id + ':' + q.key]; return o; },
    stages: [
      { title: 'Theory and model', q: 'When you change the parameters of the source, how do the spatial distribution of the field and the equipotential surfaces change?', obs: 'First read the theory of the current model, then observe the geometric background, the field lines, and the equipotential lines on the cross-section.', rec: 'Write a prediction: how does the field vary with position? Where is the zero of potential chosen?', hint: '' },
      { title: 'Setting up and adjusting', q: 'When you change the parameters of the source, how do the spatial distribution of the field and the equipotential surfaces change?', obs: 'In "Adjustable parameters", adjust the physical parameters of the current model, drag the probe or enter its coordinates, and compare the readings in different regions.', rec: 'Record the probe readings task by task.', hint: '' },
      { title: 'Comparing and recording', q: 'When you change the parameters of the source, how do the spatial distribution of the field and the equipotential surfaces change?', obs: 'Check your conclusions against the recording questions. When needed, click "Flip source sign" and compare how the direction of the field changes.', rec: 'Complete the comparison table and the recording questions, and state the conditions under which each conclusion holds.', hint: '' }
    ],
    readings(ctx) {
      const s = ctx.probe && ctx.probe.s;
      return [['Current model', SUB[ctx.sub].name, ''], ['Region', s && s.region ? s.region : '—', '']];
    },
    extra(ctx) {
      const r = ctx.bound, out = { lines: [], meshes: [], spheres: [] }, g = SUB[ctx.sub].geom, sp = ctx.subP, col = EL.C.ring;
      if (ctx.layers.frame) {
        const c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => V.mul(v, r));
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(e => out.lines.push({ pts: [c[e[0]], c[e[1]]], color: EL.C.frame, width: 1 }));
      }
      if (!ctx.layers.geom) return out;
      const op = ctx.st.style.surfOpacity2;
      if (g === 'point') out.spheres.push({ p: [0, 0, 0], r: 0.1, color: sp.q >= 0 ? EL.C.pos : EL.C.neg });
      if (g === 'line') out.lines.push({ pts: [[0, 0, -r], [0, 0, r]], color: sp.lambda >= 0 ? EL.C.pos : EL.C.neg, width: 4 });
      if (g === 'plane') out.meshes.push({ mesh: ctx.cached('pl' + r, () => EL.ISO.polygon([[-r, -r, 0], [r, -r, 0], [r, r, 0], [-r, r, 0]])), color: [...(ctx.sub === 'infinite-plane' ? (sp.sigma >= 0 ? EL.C.pos : EL.C.neg) : EL.C.geom), op] });
      if (g === 'sphere') {
        out.meshes.push({ mesh: ctx.cached('sp' + sp.a, () => EL.ISO.sphere([0, 0, 0], sp.a, 30)), color: [...(ctx.sub === 'conductor-sphere' ? EL.C.conductor : EL.C.pot), op] });
        if (ctx.st.view === '2d') {
          const B = V.planeBasis(ctx.st.plane), h = ctx.st.planePos;
          if (Math.abs(h) < sp.a) { const rr = Math.sqrt(sp.a * sp.a - h * h), c = []; for (let i = 0; i <= 96; i++) { const t = 2 * Math.PI * i / 96; c.push(V.onPlane(B, rr * Math.cos(t), rr * Math.sin(t), h)); } out.lines.push({ pts: c, color: col, width: 1.8 }); }
        }
      }
      return out;
    },
    exercises: null
  });
})(window.EL);
