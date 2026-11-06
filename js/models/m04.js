'use strict';
// 03 Regular tetrahedron: a submitted problem explored in the order "3D field synthesis -> judge the potential change from the net-field direction -> compare with calculation"
// Vertices T1, T2, T3, T4 correspond to A, B, C, D in the worked problem; P is the midpoint of edge T1T2 (AB), M is the center of face T1T2T3 (ABC)
(function (EL) {
  const V = EL.V, MH = EL.MH, s3 = Math.sqrt(3), D2R = 180 / Math.PI;
  const FACES = [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
  const verts = a => [[a, a, a], [a, -a, -a], [-a, a, -a], [-a, -a, a]];
  const midP = a => V.lerp(verts(a)[0], verts(a)[1], 0.5);
  const cenM = a => { const v = verts(a); return V.mul(V.add(V.add(v[0], v[1]), v[2]), 1 / 3); };
  const path = { key: 'lam', label: 'λ', unit: 'L', range: [-2, 2], pos: l => [l / s3, l / s3, l / s3], d: () => [1 / s3, 1 / s3, 1 / s3] };
  // Segment from P to C (T3): u=0 is P, u=1/3 is M, u=1 is C
  const pathPC = a => { const P = midP(a), C = verts(a)[2], d = V.sub(C, P); return { key: 'u', label: 'u', unit: '', range: [0, 1], pos: u => V.addS(P, d, u), d: () => d }; };
  const curPath = p => p.pc ? pathPC(p.a) : path;
  const ang = (u, v) => V.len(u) > 1e-12 && V.len(v) > 1e-12 ? Math.acos(EL.U.clamp(V.dot(u, v) / V.len(u) / V.len(v), -1, 1)) * D2R : NaN;
  const base = { alt: false, f: 1, customProbe: false, pc: false };
  const paper = { alt: true, f: 1, a: 2, q: 1, q0: 1, customProbe: false, pc: true };
  const probeLines = on => ({ label: on ? 'Show lines from the probe to each source' : 'Hide lines from the probe to each source', run: ctx => { ctx.st.geo.probeLines = on; } });
  const wizard = { label: 'Start synthesis guide', run: () => { const A = EL.App; if (A.setMode) A.setMode('analyze'); if (A.startWizard) A.startWizard(); } };
  EL.defModel({
    id: 4, code: '03', order: 3, file: '04', title: 'Regular tetrahedron', short: 'Three-dimensional field synthesis at the edge midpoint P and the face center M, judging the potential change from the net-field direction, and comparison with calculation',
    view: '3d', R: 6, rMin: 0.2, perCharge: true, editor: { max: 24, qRange: [-10, 10], xyz: 6, placements: p => MH.placements(verts(p.a), FACES, s3 * p.a) },
    params: [
      { key: 'a', label: 'Vertex coordinate scale a / L (edge length ℓ=2√2a)', min: 0.5, max: 4, step: 0.05, val: 2 },
      { key: 'q', label: 'Source charge q / Q', min: -2, max: 2, step: 0.1, val: 1 },
      { key: 'f', label: 'Multiplier of the T1 charge f', min: 0, max: 2, step: 0.05, val: 1 },
      { key: 'q0', label: 'Test charge q₀ / Q', min: -2, max: 2, step: 0.1, val: 1, probe: true },
      { key: 'lam', label: 'Probe position on the axis λ / L', min: -2, max: 2, step: 0.05, val: 0, show: p => !p.customProbe && !p.pc, probe: true },
      { key: 'u', label: 'Probe position on segment PC, u (P is 0, M is 1/3, C is 1)', min: 0, max: 0.95, step: 0.01, val: 0, show: p => !p.customProbe && p.pc, probe: true },
      ...MH.customProbe(6)
    ],
    toggles: [{ key: 'alt', label: 'Alternating charges (−q at T1 and T3, +q at T2 and T4)', val: false }, { key: 'faces', label: 'Show shaded faces', val: true },
      { key: 'pc', label: 'Move the probe along segment PC (from the midpoint P of edge T1T2 to vertex T3)', val: false, probe: true }, MH.customToggle],
    display: { level: 0, spacing: 0.3, count: 1 },
    probe: { pathFn: p => curPath(p), free: ['px', 'py', 'pz'], customKey: 'customProbe', fromStage: 0,
      nameFn: () => { const p = EL.App.st && EL.App.st.p; if (!p || !p.pc) return 'X'; return Math.abs(p.u) < 1e-6 ? 'P' : Math.abs(p.u - 1 / 3) < 1e-6 ? 'M' : 'X'; } },
    paths: p => [path, pathPC(p.a)],
    sources: p => verts(p.a).map((x, i) => ({ p: x, q: (p.alt && i % 2 === 0 ? -1 : 1) * (i === 0 ? p.q * p.f : p.q), label: 'T' + (i + 1) })),
    keyPts: p => { const v = verts(p.a); return [{ name: 'Midpoint P of edge T1T2 (AB)', p: midP(p.a) }, { name: 'Center M of face T1T2T3 (ABC)', p: cenM(p.a) },
      { name: 'Center N of face T1T3T4 (ACD)', p: V.mul(V.add(V.add(v[0], v[2]), v[3]), 1 / 3) }, { name: 'Center O', p: [0, 0, 0] }, { name: 'Midpoint of edge T3T4', p: V.lerp(v[2], v[3], 0.5) }]; },
    stages: [
      { title: 'Geometry and symmetry', q: 'How are the distances from P and M to the four source charges related? Which component fields have equal magnitudes?',
        obs: 'Vertices T1, T2, T3, T4 correspond to A, B, C, D in the worked problem: T1 and T3 carry −q, and T2 and T4 carry +q. P is the midpoint of edge T1T2, and M is the center of face T1T2T3 (the point of tangency with the inscribed sphere). The probe is already at P. Click "Show lines from the probe to each source" to read off each distance, then set u to 1/3 to move the probe to M.',
        rec: 'Write the distances from P to the four vertices and from M to the four vertices in terms of the edge length ℓ, and state which component fields have equal magnitudes.',
        hint: 'P is at distance ℓ/2 from both T1 and T2, and at distance √3ℓ/2 from both T3 and T4. M is at distance ℓ/√3 from each of T1, T2, T3, and at distance √(2/3)ℓ (the height of the regular tetrahedron) from T4. Source charges that are equally distant and have charges of equal magnitude produce component fields of equal magnitude.',
        teacher: 'Have students decide using geometry alone, without looking at the field readings. The coordinate scale a and the edge length are related by ℓ=2√2a, and the readout shows both lengths.',
        preset: Object.assign({}, paper, { u: 0 }), layers: { probe: true }, actions: [probeLines(true), probeLines(false)] },
      { title: 'Field synthesis at P', q: 'Is the net field at P zero? In what order should the four component fields be combined?',
        obs: 'The probe is at P. Click "Start synthesis guide": first combine the collinear E_T1 and E_T2, then combine E_T3 and E_T4 in the plane containing T3, T4 and P, and finally combine the two partial sums.',
        rec: 'Record the magnitudes and directions of the two partial sums, the angle between them, and the ratio of the net field |E(P)| to kq/ℓ².',
        hint: 'E_T1 and E_T2 both point from T2 toward T1, and their partial sum is 8kq/ℓ². E_T3 and E_T4 both have magnitude 4kq/(3ℓ²), and their partial sum is 8kq/(3√3ℓ²), directed from T4 toward T3. The opposite edges T1T2 and T3T4 are perpendicular, so $|\\vec E(P)|=\\frac{16\\sqrt{21}}{9}\\frac{kq}{\\ell^2}$, which is not zero.',
        teacher: 'This step targets the projection error: students often conclude that the net field is zero because P looks central in the drawing. Option B of the worked problem is ruled out this way.',
        preset: Object.assign({}, paper, { u: 0 }), layers: { probe: true }, actions: [wizard] },
      { title: 'Field synthesis at M', q: 'At the center M of face T1T2T3, is the net field perpendicular to that face?',
        obs: 'The probe has been moved to M (u=1/3). Click "Start synthesis guide": first combine the three component fields of equal magnitude within face T1T2T3, then combine the result with E_T4, which is perpendicular to that face.',
        rec: 'Record the magnitudes of the in-plane partial sum and the perpendicular component, and the angle between the net field and the normal of face T1T2T3.',
        hint: 'The three in-plane component fields each have magnitude 3kq/ℓ², and their vector sum is 6kq/ℓ², lying in the face and pointing toward edge T1T3. E_T4 is perpendicular to the face, with magnitude 1.5kq/ℓ². The angle between the net field and the normal is arctan 4, about 76°, so the net field is not perpendicular to face T1T2T3.',
        teacher: 'This corresponds to option C of the worked problem. Let students first guess that only the component field of T4 leaves the plane, then reach the conclusion from the nonzero in-plane partial sum.',
        preset: Object.assign({}, paper, { u: 1 / 3 }), layers: { probe: true }, actions: [wizard] },
      { title: 'Potential from the net-field direction', q: 'When a positive test charge moves from P toward C (T3), does the potential rise or fall? Does the electric force do positive or negative work?',
        obs: 'The probe moves along segment PC; do not look at the curves yet. Drag u and watch the angle between the net field and the displacement direction. M lies on this segment (u=1/3).',
        rec: 'Record the angle between the net field and the PC direction at several positions. From it, predict how V(P) compares with V(M), and the sign of the work done by the electric force when a positive charge moves from P to M.',
        hint: 'The potential decreases along the field direction. When the angle between the net field and the displacement is less than 90°, the electric force does positive work on a positive charge and the potential energy decreases. At P the angle is about 84°, close to a right angle, so read it off rather than judging by eye.',
        teacher: 'This corresponds to options A and D of the worked problem. M is the centroid of triangle T1T2T3 and lies on the median CP, so the path from P to C passes through M.',
        preset: Object.assign({}, paper, { u: 0 }), layers: { probe: true } },
      { title: 'Comparison with calculation', q: 'Do V(P) and V(M) computed from $V=\\sum kq_i/r_i$ support the prediction of the previous step?',
        obs: 'The readout lists the distances from P and M to each vertex and the potentials at the two points. P and M are marked on the V(u) curve, and the orange vertical line is the probe position.',
        rec: 'Write expressions for V(P) and V(M) in terms of the distances and evaluate them, compare with the readout and the curve, then write W(P→M)=q₀[V(P)−V(M)].',
        hint: 'V(P)=kq(−2/ℓ+2/ℓ−2/(√3ℓ)+2/(√3ℓ))=0. V(M)=kq(−√3/ℓ+√(3/2)/ℓ)≈−0.507kq/ℓ. So V(P) is greater than V(M), and the electric force does positive work when a positive charge moves from P to M. The potential at P is zero while the field is not, which shows that a zero potential does not imply a zero field.',
        teacher: 'Have students write the conclusions of the direction method and the distance-substitution method side by side. If they contradict each other, first check the angle readings and the distances.',
        preset: Object.assign({}, paper, { u: 1 / 3 }), layers: { probe: true } },
      { title: 'Counterexample: four like charges', q: 'With +q at all four vertices, does the potential still decrease monotonically along PC? Is V(P) still greater than V(M)?',
        obs: 'Alternating charges are off, so all four vertices carry +q. Drag u and compare the angle between the net field and the PC direction with the V(u) curve. Then turn off "Move the probe along segment PC" so the probe moves along the axis through the center O.',
        rec: 'Record the angle at P, V(P), and V(M), and explain which charge configuration the previous conclusion depends on. Then record V and |E| at the center O.',
        hint: 'For like charges the angle at P is about 145°, and the potential first rises along PC, so V(M) is greater than V(P) and the conclusion is reversed. At the center O the vector sum of the four component fields is zero, but $V(O)=4kq/(\\sqrt3 a)$ is not zero.',
        teacher: 'Use the same geometry with a different charge configuration to bound the conclusion: symmetry only tells us which quantities are equal, while the signs determine the direction of the net field.',
        preset: Object.assign({}, paper, { alt: false, u: 0 }), layers: { probe: true } }
    ],
    readings(ctx) {
      const p = ctx.p, S = ctx.sample, v = verts(p.a), l = 2 * Math.SQRT2 * p.a, O = S([0, 0, 0]);
      const out = [['V(O)', O.V, 'kQ/L'], ['|E(O)|', V.len(O.E), 'kQ/L²'], ['E(O)', O.E, 'kQ/L²']];
      if (!p.alt && p.f === 1 && !ctx.custom) out.push(['Theory 4kq/(√3a)', 4 * p.q / (s3 * p.a), 'kQ/L'], ['Center-check residual', Math.abs(O.V - 4 * p.q / (s3 * p.a)) + V.len(O.E), '']);
      const Pp = midP(p.a), Mp = cenM(p.a), P = S(Pp), M = S(Mp), n = V.norm(V.cross(V.sub(v[1], v[0]), V.sub(v[2], v[0])));
      out.push(['Edge length ℓ=2√2a', l, 'L']);
      if (ctx.stage === 0 || ctx.stage === 4) {
        out.push(['PT1=PT2（ℓ/2）', V.dist(Pp, v[0]), 'L'], ['PT3=PT4（√3ℓ/2）', V.dist(Pp, v[2]), 'L'],
          ['MT1=MT2=MT3（ℓ/√3）', V.dist(Mp, v[0]), 'L'], ['MT4（√(2/3)ℓ）', V.dist(Mp, v[3]), 'L']);
      }
      out.push(['V(P)', P.V, 'kQ/L'], ['V(M)', M.V, 'kQ/L'], ['V(P)−V(M)', P.V - M.V, 'kQ/L'], ['W_field(P→M)=q₀[V(P)−V(M)]', p.q0 * (P.V - M.V), 'kQ²/L'],
        ['|E(P)|', V.len(P.E), 'kQ/L²'], ['|E(P)|·ℓ²/|kq|', V.len(P.E) * l * l / Math.abs(p.q || NaN), '']);
      if (p.alt && p.f === 1 && !ctx.custom) out.push(['Theory 16√21/9', 16 * Math.sqrt(21) / 9, '']);
      out.push(['|E(M)|', V.len(M.E), 'kQ/L²'], ['Angle between E(M) and the normal of face T1T2T3', Math.min(ang(M.E, n), 180 - ang(M.E, n)), '°'],
        ['Angle between E(P) and the PC direction', ang(P.E, V.sub(v[2], Pp)), '°']);
      if (ctx.probe && ctx.probe.path) out.push(['Angle between E at the probe and the path direction', ang(ctx.probe.s.E, ctx.probe.path.d(ctx.probe.t)), '°']);
      return out;
    },
    curves(ctx) {
      const p = ctx.p;
      if (p.customProbe) return null;
      const pt = curPath(p), d = MH.alongPath(ctx.F, pt, 200), q0 = p.q0;
      if (p.pc) {
        const S = ctx.sample, l = V.len(pt.d());
        return { x: d.xs, xLabel: 'u (from P to C, dimensionless; arc length is u·√6a)', cur: p.u,
          series: [{ name: 'V(u)', y: d.Vs, color: EL.CHART.V }, { name: 'U(u)', y: d.Vs.map(x => q0 * x), color: EL.CHART.U }, { name: 'E∥(u)', y: d.Es, color: EL.CHART.E }],
          points: [{ x: 0, y: S(midP(p.a)).V, name: 'P', color: EL.CHART.mark }, { x: 1 / 3, y: S(cenM(p.a)).V, name: 'M', color: EL.CHART.mark }],
          note: 'Potential, potential energy, and the component of the field along the path, along segment PC. The length of PC is ' + EL.U.fmt(l, 4) + ' L; near C the probe enters the excluded neighborhood.' };
      }
      return { x: d.xs, xLabel: 'λ / L', cur: p.lam,
        series: [{ name: 'V(λ)', y: d.Vs, color: EL.CHART.V }, { name: 'U(λ)', y: d.Vs.map(v => q0 * v), color: EL.CHART.U }, { name: 'E∥(λ)', y: d.Es, color: EL.CHART.E }],
        note: 'The horizontal axis is λ / L, where λ is the directed arc length measured along the line from vertex T1 to the center.' };
    },
    extra(ctx) {
      const p = ctx.p, vs = verts(p.a), out = MH.poly(vs, FACES, { faces: p.faces && ctx.layers.geom, opacity: 0.2 });
      if (!ctx.layers.geom) out.lines = [];
      MH.mark(out, [0, 0, 0], 'O');
      if (p.alt || p.pc) { MH.mark(out, midP(p.a), 'P', null, 0.06); MH.mark(out, cenM(p.a), 'M', null, 0.06); }
      if (!p.customProbe) out.lines.push(...MH.pathLine(ctx.F, curPath(p), EL.C.path, [0.18, 0.12]));
      return out;
    },
    exercises: [
      { q: 'For a=2 L, what is the distance from the center to a vertex (in units of L)?', a: 2 * s3 },
      { q: 'For a=2 L and q=1 Q, find the potential V(O) at the center (in units of kQ/L).', a: 2 / s3 },
      { q: 'When the charges of all four sources change sign together, what happens to the field at the center?', options: ['It is still zero', 'It becomes nonzero', 'It cannot be determined'], a: 'It is still zero' },
      { q: 'When only the T1 charge changes from +q to −q, what is the direction of the field at the center?', options: ['Toward T1', 'Away from T1', 'Zero'], a: 'Toward T1' },
      { q: 'With −q at T1 and T3 and +q at T2 and T4, and a=2 L and q=1 Q, find the magnitude of the field at the midpoint P of edge T1T2 (in units of kQ/L²).', a: Math.sqrt(1 + 1 / 27) / 4 },
      { q: 'With −q at T1 and T3 and +q at T2 and T4, what work does the electric force do when a positive test charge moves from P to the center M of face T1T2T3?', options: ['Positive work', 'Negative work', 'No work'], a: 'Positive work' }
    ]
  });
})(window.EL);
