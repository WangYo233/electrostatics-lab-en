'use strict';
// Point charges at the vertices of a regular octahedron (internal ID 5, navigation number 05): 3D field synthesis at P and at the points of tangency, judging the potential change between the two points of tangency from the net-field direction, and comparison with calculation
(function (EL) {
  const V = EL.V, MH = EL.MH, s3 = Math.sqrt(3), D2R = 180 / Math.PI;
  // Vertex order: M N F Q P R
  const verts = a => [[0, 0, a], [-a, 0, 0], [0, 0, -a], [a, 0, 0], [0, a, 0], [0, -a, 0]];
  const FACES = [[4, 0, 1], [3, 5, 2], [4, 0, 3], [4, 2, 1], [4, 2, 3], [5, 0, 1], [5, 0, 3], [5, 2, 1]];
  const mkPath = a => { const r = a / s3; return { key: 'tau', label: 'τ', unit: '', range: [-1, 1], pos: t => [-t * r / s3, t * r / s3, t * r / s3], d: () => [-r / s3, r / s3, r / s3] }; };
  const ang = (u, v) => V.len(u) > 1e-12 && V.len(v) > 1e-12 ? Math.acos(EL.U.clamp(V.dot(u, v) / V.len(u) / V.len(v), -1, 1)) * D2R : NaN;
  const base = { mode: true, removeM: false, a: 2, q: 1, q0: 1, customProbe: false, field: false };
  const atP = a => ({ customProbe: true, px: 0, py: a, pz: 0 });
  const probeLines = on => ({ label: on ? 'Show lines from the probe to each source' : 'Hide lines from the probe to each source', run: ctx => { ctx.st.geo.probeLines = on; } });
  const wizard = { label: 'Start synthesis guide', run: () => { const A = EL.App; if (A.setMode) A.setMode('analyze'); if (A.startWizard) A.startWizard(); } };
  const toP = { label: 'Put the probe at P', run: ctx => ctx.set(atP(ctx.p.a)) };
  const toT = { label: 'Put the probe at the tangency point T_PMN', run: ctx => ctx.set({ customProbe: false, mode: true, tau: 1 }) };
  EL.defModel({
    id: 5, code: '05', order: 5, file: '05', title: 'Regular octahedron', short: 'Three-dimensional field synthesis at P and at the points of tangency of the inscribed sphere, the potential change between the two points of tangency, and the reflection symmetry of P and R',
    view: '3d', R: 6, rMin: 0.2, perCharge: true, editor: { max: 24, qRange: [-10, 10], xyz: 6, placements: p => MH.placements(verts(p.a), FACES, p.a) },
    params: [
      { key: 'a', label: 'Center-to-vertex distance a / L', min: 1, max: 4, step: 0.05, val: 2 },
      { key: 'q', label: 'Magnitude of the source charge q / Q', min: 0.1, max: 2, step: 0.1, val: 1 },
      { key: 'q0', label: 'Test charge q₀ / Q', min: -2, max: 2, step: 0.1, val: -1, probe: true },
      { key: 'tau', label: 'Path parameter τ (from +1 to −1)', min: -1, max: 1, step: 0.02, val: 0, show: p => p.mode && !p.customProbe, probe: true },
      ...MH.customProbe(6)
    ],
    toggles: [{ key: 'mode', label: 'Probe moves along a diameter of the inscribed sphere', val: false }, { key: 'removeM', label: 'Remove the source at vertex M', val: false },
      { key: 'sphere', label: 'Show the inscribed sphere', val: true }, { key: 'faces', label: 'Show shaded faces', val: true }, { key: 'field', label: 'Show the field vectors at P, R, and the two points of tangency', val: false }, MH.customToggle],
    display: { level: 0, spacing: 0.3, count: 1 },
    probe: { pathFn: p => mkPath(p.a), free: ['px', 'py', 'pz'], customKey: 'customProbe', fromStage: 0, when: p => p.mode || p.customProbe,
      nameFn: () => { const p = EL.App.st && EL.App.st.p; return p && Math.abs(p.tau - 1) < 1e-6 ? 'T_PMN' : p && Math.abs(p.tau + 1) < 1e-6 ? 'T_QRF' : 'X'; } },
    paths: p => [mkPath(p.a)],
    keyPts: p => { const v = verts(p.a); return [{ name: 'Center O', p: [0, 0, 0] }, { name: 'Uncharged vertex P', p: v[4] }, { name: 'Uncharged vertex R', p: v[5] }, { name: 'Point of tangency T_PMN on face PMN', p: [-p.a / 3, p.a / 3, p.a / 3] }, { name: 'Point of tangency T_QRF on face QRF', p: [p.a / 3, -p.a / 3, -p.a / 3] }]; },
    sources(p) {
      const v = verts(p.a);
      return [{ p: v[0], q: p.removeM ? 0 : p.q, label: 'M' }, { p: v[1], q: p.q, label: 'N' }, { p: v[2], q: -p.q, label: 'F' }, { p: v[3], q: -p.q, label: 'Q' }];
    },
    stages: [
      { title: 'Geometry and symmetry', q: 'How are the distances from P and from the point of tangency T_PMN to the four source charges related?',
        obs: 'M and N carry +q, and F and Q carry −q. All four charged vertices lie in the plane y=0, and P and R are uncharged. The probe is already at P. Click "Show lines from the probe to each source" to read the distances, then click "Put the probe at the tangency point T_PMN".',
        rec: 'Write, in terms of a, the distances from P to the four source charges and from T_PMN to M, N and to F, Q, and state which component fields have equal magnitudes.',
        hint: 'P is at distance √2a from all four source charges. T_PMN is the center of face PMN; it is at distance √6a/3 from both M and N, and at distance √2a from both F and Q. The center O is at distance a from all four source charges.',
        teacher: 'Have students decide using geometry first, then check against the distances read from the lines. Note that P and R are mirror images of each other in the plane y=0.',
        preset: Object.assign({}, base, atP(2)), layers: { probe: true }, actions: [probeLines(true), probeLines(false), toT, toP] },
      { title: 'Field synthesis at P and at a point of tangency', q: 'Along which direction does the net field at P point? How is the net field at the point of tangency T_PMN synthesized?',
        obs: 'The probe is at P. Click "Start synthesis guide": first combine E_M and E_N, then combine E_F and E_Q, and finally combine the two partial sums. When done, click "Put the probe at the tangency point T_PMN" and repeat.',
        rec: 'Record the magnitudes of the two partial sums at P, the angle between them, and the magnitude and direction of the net field; at T_PMN record the magnitudes of the two partial sums and the net field.',
        hint: 'At P the four component fields all have magnitude kq/(2a²), the two partial sums have equal magnitude; derive their relation from the source distances in the synthesis guide (109.5° is a numerical check), and the net field has magnitude kq/a², parallel to MQ and perpendicular to PR. At T_PMN the partial sum of M and N is larger than that of F and Q, and the net field points into the octahedron, at an angle of about 66° to the direction from T_PMN to T_QRF.',
        teacher: 'Stress combining component fields of equal magnitude in pairs first. The net field at P being perpendicular to PR is the basis for comparing V(P) and V(R) in the next step.',
        preset: Object.assign({}, base, atP(2)), layers: { probe: true }, actions: [wizard, toT, toP] },
      { title: 'Judging the potential from the net-field direction', q: 'As a positive test charge moves along a diameter of the inscribed sphere from T_PMN to T_QRF, does the potential rise or fall? What about from P to R?',
        obs: 'The probe moves along a diameter of the inscribed sphere; do not look at the curve yet. Drag τ from +1 to −1 and watch the angle between the net field and the displacement direction.',
        rec: 'Record the angle between the net field and the displacement direction at several positions, and predict which point of tangency is at the higher potential and the sign of the work done by the electric force on a positive charge. Then, from the direction of the net field at P, predict how V(P) and V(R) are related.',
        hint: 'The potential decreases along the field direction. Between the two points of tangency the angle always stays below 90° (about 35° to 66°), so the potential decreases monotonically and the electric force does positive work on a positive charge. On the y axis the net field has no y component and is perpendicular to PR, so P and R are at the same potential.',
        teacher: 'The same model shows two cases: the potential decreases when the angle is acute, and stays constant when the angle is a right angle.',
        preset: Object.assign({}, base, { tau: 1 }), layers: { probe: true } },
      { title: 'Comparison with calculation', q: 'Do the potentials at the two points of tangency and the work, calculated from $V=\\sum kq_i/r_i$, agree with the predictions?',
        obs: 'The readout shows the potentials at the two points of tangency, the work done by the electric force between them, and the potentials at P and R; the curve area shows V(t) along the diameter. Change the sign of q₀ and look again.',
        rec: 'Write V(T_PMN) in terms of the distances and compute its value, then compare with the readout and the curve. Write $W=q_0[V(T_{PMN})-V(T_{QRF})]$ and state which quantities change when q₀ changes sign.',
        hint: '$V(T_{PMN})=kq(2\\cdot\\frac{3}{\\sqrt6 a}-2\\cdot\\frac{1}{\\sqrt2 a})=(\\sqrt6-\\sqrt2)\\frac{kq}{a}$. By inversion antisymmetry, $V(T_{QRF})=-V(T_{PMN})$. P is equidistant from the four source charges, and the positive and negative charges sum to zero, so V(P)=V(R)=0.',
        teacher: 'Changing q₀ changes only U and W, not the V and E produced by the sources.',
        preset: Object.assign({}, base, { tau: 0 }), layers: { probe: true } },
      { title: 'Perturbation: remove M', q: 'After the source at M is removed, which conclusions still hold?',
        obs: 'The source at M has been removed. Compare the potentials at the two points of tangency, the change in potential between them, and the potentials at P and R.',
        rec: 'Check separately whether P and R are still at the same potential, whether the potentials at the two points of tangency are still opposites, and whether the potential still decreases monotonically between the two points of tangency; cite the readings.',
        hint: 'After M is removed, the symmetry in which the charges change sign under inversion through the center is broken, so the potentials at the two points of tangency are no longer opposites. The three remaining sources still lie in the plane y=0, so the reflection symmetry about that plane still holds and P and R remain at the same potential.',
        teacher: 'Ask students to address the two symmetries separately; do not say loosely that all the symmetries are gone.',
        preset: Object.assign({}, base, { removeM: true, tau: 1 }), layers: { probe: true } }
    ],
    readings(ctx) {
      const p = ctx.p, S = ctx.sample, v = verts(p.a), path = mkPath(p.a), out = [];
      const O = S([0, 0, 0]), P = S(v[4]), R = S(v[5]);
      out.push(['V(O)', O.V, 'kQ/L'], ['E(O)', O.E, 'kQ/L²'], ['V(P)', P.V, 'kQ/L'], ['V(R)', R.V, 'kQ/L'], ['ΔV(P,R)=V(R)−V(P)', R.V - P.V, 'kQ/L'], ['ΔU(P→R)=q₀ΔV', p.q0 * (R.V - P.V), 'kQ²/L'],
        ['|E(P)|', V.len(P.E), 'kQ/L²'], ['Angle between E(P) and the PR direction', ang(P.E, V.sub(v[5], v[4])), '°']);
      if (!p.removeM) out.push(['Theory kq/a²', p.q / (p.a * p.a), 'kQ/L²']);
      if (ctx.probe && ctx.probeVisible && (ctx.stage === 0 || ctx.stage === 3)) for (const s of ctx.sources) if (s.q) out.push(['Distance from the probe to ' + s.label, V.dist(ctx.probe.pos, s.p), 'L']);
      if (p.mode) {
        const a = S(path.pos(1)), b = S(path.pos(-1)), W = p.q0 * (a.V - b.V);
        out.push(['V(T_PMN)', a.V, 'kQ/L'], ['V(T_QRF)', b.V, 'kQ/L'], ['W_field (τ: +1→−1)', W, 'kQ²/L'], ['ΔU_T=−W', -W, 'kQ²/L'],
          ['Inversion residual |V(−0.7)+V(0.7)|', Math.abs(S(path.pos(-0.7)).V + S(path.pos(0.7)).V), 'kQ/L'], ['Inscribed-sphere radius a/√3', p.a / s3, 'L'], ['Current arc length t=τa/√3', p.tau * p.a / s3, 'L']);
        if (!p.removeM) out.push(['Theory (√6−√2)kq/a', (Math.sqrt(6) - Math.SQRT2) * p.q / p.a, 'kQ/L']);
        if (ctx.probe && ctx.probe.path) out.push(['Angle between E at the probe and the displacement direction (τ decreasing)', ang(ctx.probe.s.E, V.mul(path.d(p.tau), -1)), '°']);
      }
      return out;
    },
    curves(ctx) {
      const p = ctx.p;
      if (!p.mode || p.customProbe) return null;
      const path = mkPath(p.a), d = MH.alongPath(ctx.F, path, 200), r = p.a / s3;
      return { x: d.xs.map(t => t * r), xLabel: 't / L (t=τa/√3)', cur: p.tau * r,
        series: [{ name: 'V(t)', y: d.Vs, color: EL.CHART.V }, { name: 'U(t)', y: d.Vs.map(v => p.q0 * v), color: EL.CHART.U }, { name: 'E∥(t)', y: d.Es, color: EL.CHART.E }],
        points: [{ x: r, y: ctx.sample(path.pos(1)).V, name: 'T_PMN', color: EL.CHART.mark }, { x: -r, y: ctx.sample(path.pos(-1)).V, name: 'T_QRF', color: EL.CHART.mark }],
        note: 'Potential, potential energy, and the component of the field in the direction of increasing t along a diameter of the inscribed sphere. τ=+1 corresponds to the point of tangency on face PMN.' };
    },
    extra(ctx) {
      const p = ctx.p, v = verts(p.a), out = MH.poly(v, FACES, { faces: p.faces && ctx.layers.geom, opacity: 0.16 });
      if (!ctx.layers.geom) out.lines = [];
      MH.mark(out, [0, 0, 0], 'O'); MH.mark(out, v[4], 'P'); MH.mark(out, v[5], 'R');
      const path = mkPath(p.a), T1 = path.pos(1), T2 = path.pos(-1);
      if (p.mode) {
        if (p.sphere && ctx.layers.geom) out.meshes.push({ mesh: ctx.cached('insph' + p.a, () => EL.ISO.sphere([0, 0, 0], p.a / s3, 28)), color: [EL.C.pot[0], EL.C.pot[1], EL.C.pot[2], 0.12] });
        MH.mark(out, T1, 'T_PMN', EL.C.energy); MH.mark(out, T2, 'T_QRF', EL.C.energy);
        out.lines.push(...MH.pathLine(ctx.F, path, EL.C.path));
      }
      if (p.field) {
        out.arrows = [];
        for (const q of [v[4], v[5], T1, T2]) { const s = ctx.sample(q); if (s.ok) out.arrows.push({ p: q, v: ctx.arrowVec(s.E), color: EL.C.vec, width: 2.2 }); }
      }
      return out;
    },
    exercises: [
      { q: 'For a=3 L, find the radius of the inscribed sphere (in units of L).', a: s3 },
      { q: 'For a=√3 L, along the path dV/dτ=−2 kQ/L. Find the component E∥ of the field along the path (in units of kQ/L²).', a: 2 },
      { q: 'After the source at M is removed, what is true of the potentials at P and R?', options: ['They are still equal', 'They are no longer equal', 'Both are zero'], a: 'They are still equal' },
      { q: 'The potentials at the two points of tangency are +2 kQ/L (at τ=+1) and −2 kQ/L (at τ=−1), and q₀=−1 Q. Find the work W done by the electric force as the test charge moves from τ=+1 to τ=−1 (in units of kQ²/L).', a: -4 },
      { q: 'For a=2 L and q=1 Q, find the magnitude of the field at the uncharged vertex P (in units of kQ/L²).', a: 0.25 }
    ]
  });
})(window.EL);
