'use strict';
// Point charges at the face centers of a cube (internal ID 6, navigation number 04): 3D field synthesis along the space diagonal A′C, judging the potential from the net-field direction, and comparison with calculation
(function (EL) {
  const V = EL.V, MH = EL.MH, s3 = Math.sqrt(3), D2R = 180 / Math.PI;
  const NAMES = ['A', 'B', 'C', 'D', 'A′', 'B′', 'C′', 'D′'];
  const verts = a => [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]].map(v => V.mul(v, a / 2));
  const FACES = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  const pathA = a => ({ key: 's', label: 's', unit: '', range: [0, 1], pos: s => V.mul([1, 1, 1], -a / 2 + a * s), d: () => [a, a, a] });
  const pathB = a => ({ key: 't', label: 't', unit: '', range: [0, 1], pos: t => [-a / 2 + a * t, a / 2 - a * t, a / 2 - a * t], d: () => [a, -a, -a] });
  const ang = (u, v) => V.len(u) > 1e-12 && V.len(v) > 1e-12 ? Math.acos(EL.U.clamp(V.dot(u, v) / V.len(u) / V.len(v), -1, 1)) * D2R : NaN;
  const base = { removeGH: false, useB: false, a: 2, q: 1, q0: 1, customProbe: false, field: false };
  const probeLines = on => ({ label: on ? 'Show lines from the probe to each source' : 'Hide lines from the probe to each source', run: ctx => { ctx.st.geo.probeLines = on; } });
  const wizard = { label: 'Start synthesis guide', run: () => { const A = EL.App; if (A.setMode) A.setMode('analyze'); if (A.startWizard) A.startWizard(); } };
  const freeProbe = { label: 'Use the free probe', run: ctx => { const x = pathA(ctx.p.a).pos(ctx.p.s); ctx.set({ customProbe: true, px: +x[0].toFixed(3), py: +x[1].toFixed(3), pz: +(x[2] + 0.4).toFixed(3) }); } };
  const backToPath = { label: 'Back to the path point', run: ctx => ctx.set({ customProbe: false }) };
  EL.defModel({
    id: 6, code: '04', order: 4, file: '06', title: 'Cube', short: 'Point charges at face centers: field synthesis on the space diagonal A′C, the angle between the net field and the path, the potential curve, and a perturbation',
    view: '3d', R: 6, rMin: 0.2, perCharge: true, editor: { max: 24, qRange: [-10, 10], xyz: 6, placements: p => MH.placements(verts(p.a), FACES, s3 * p.a / 2) },
    params: [
      { key: 'a', label: 'Edge length a / L', min: 1, max: 5, step: 0.05, val: 2 },
      { key: 'q', label: 'Source charge q / Q', min: -2, max: 2, step: 0.1, val: 1 },
      { key: 'q0', label: 'Test charge on path A, q₀ / Q', min: -2, max: 2, step: 0.1, val: -1, show: p => !p.useB, probe: true },
      { key: 'q0B', label: 'Test charge on path B, q₀B / Q', min: -2, max: 2, step: 0.1, val: 1, show: p => p.useB, probe: true },
      { key: 's', label: 'Path A parameter s (from A′ to C)', min: 0, max: 1, step: 0.01, val: 0, show: p => !p.useB && !p.customProbe, probe: true },
      { key: 't', label: 'Path B parameter t (from D to B′)', min: 0, max: 1, step: 0.01, val: 0, show: p => p.useB && !p.customProbe, probe: true },
      ...MH.customProbe(6)
    ],
    toggles: [{ key: 'useB', label: 'Probe moves along path B (from D to B′)', val: false }, { key: 'removeGH', label: 'Remove the sources at G and H', val: false },
      { key: 'faces', label: 'Show shaded faces', val: true }, { key: 'field', label: 'Show the field vectors at D and B′', val: false }, MH.customToggle],
    display: { level: 0, spacing: 0.3, count: 1 },
    probe: { pathFn: p => p.useB ? pathB(p.a) : pathA(p.a), free: ['px', 'py', 'pz'], customKey: 'customProbe', fromStage: 0, nameFn: () => 'S' },
    paths: p => [pathA(p.a), pathB(p.a)],
    keyPts: p => { const v = verts(p.a); return [{ name: 'Center O', p: [0, 0, 0] }, { name: 'Vertex A', p: v[0] }, { name: 'Vertex C', p: v[2] }, { name: 'Vertex D', p: v[3] }, { name: 'Vertex A′', p: v[4] }, { name: 'Vertex B′', p: v[5] }]; },
    sources(p) {
      const h = p.a / 2, g = p.removeGH ? 0 : -p.q;
      return [{ p: [0, 0, h], q: p.q, label: 'E' }, { p: [0, 0, -h], q: p.q, label: 'F' }, { p: [-h, 0, 0], q: g, label: 'G' }, { p: [h, 0, 0], q: g, label: 'H' }];
    },
    stages: [
      { title: 'Geometry and symmetry', q: 'How are the distances from a point S on the space diagonal A′C to the four source charges related?',
        obs: 'The centers E and F of the top and bottom faces carry +q, and the centers G and H of the left and right faces carry −q. The colored faces are only a geometric reference and carry no charge. The probe (path point S) is on the space diagonal A′C. Click "Show lines from the probe to each source" to read the distances, then drag s.',
        rec: 'Record the distances from S to E, F, G, and H at two or three positions, find the two pairs of distances that are always equal, and write the charge of each pair of sources.',
        hint: 'The three coordinates of S are equal, so swapping x and z leaves S fixed while E and H, and F and G, trade places. Hence SE=SH and SF=SG, and each pair consists of one positive and one negative source of equal magnitude.',
        teacher: 'Have students first explain the equal distances by coordinate symmetry, then check them against the line readings. A′C is a space diagonal of length √3a.',
        preset: Object.assign({}, base, { s: 0.25 }), layers: { probe: true }, actions: [probeLines(true), probeLines(false)] },
      { title: 'Field synthesis at the path point', q: 'Which way does the net field at the path point S point, and how does it relate to the space diagonal A′C?',
        obs: 'The probe is at s=0.25. Click "Start synthesis guide": first combine E_F and E_G, whose sources are equidistant, then combine E_E and E_H, and finally combine the two partial sums.',
        rec: 'Record the magnitudes and directions of the two partial sums, the magnitude of the net field, and the angle between the net field and the direction of A′C.',
        hint: 'F and G are equidistant with opposite charges, so their partial sum points along the direction from F to G; the partial sum of E and H points along the direction from E to H. Both directions are perpendicular to the space-diagonal direction (1,1,1), so the net field is perpendicular to A′C.',
        teacher: 'The net field is not zero, but it is perpendicular to the path. This is the basis for judging the potential in the next step.',
        preset: Object.assign({}, base, { s: 0.25 }), layers: { probe: true }, actions: [wizard] },
      { title: 'Judging the potential from the net-field direction', q: 'As a positive test charge moves along A′C from A′ to C, how does the potential change? Does the electric force do work?',
        obs: 'Drag s and watch the angle between the net field and the displacement direction, without looking at the curve yet. Then click "Use the free probe", drag the free probe P anywhere in space, and compare how the potential changes after it moves a short distance along the field direction.',
        rec: 'Record the angle at several positions on the path, and predict the shape of the V(s) curve and the work done by the electric force from A′ to C. Record the free probe\'s "Potential change after moving 0.05 L along E".',
        hint: 'At each point, the rate at which the electric force does work is set by the cosine of the angle between the field and the displacement. When the angle is 90° everywhere, the electric force does no work and the potential is constant along the path. The potential always drops when the free probe moves along E, which shows that the field points from higher toward lower potential.',
        teacher: 'A common mistake is to assume the potential changes monotonically along the space diagonal. Here the net field is not zero, but it is always perpendicular to the path.',
        preset: Object.assign({}, base, { s: 0.25 }), layers: { probe: true }, actions: [freeProbe, backToPath] },
      { title: 'Comparison with calculation', q: 'Does V(s) computed by substituting the distances into $V=\\sum kq_i/r_i$ agree with the prediction?',
        obs: 'The readout lists the distances from the path point S to the four sources and the potential computed from the formula; the chart shows V(s) and the component E∥(s) of the field along the path.',
        rec: 'Pick any s, write the expression for V(S) in terms of the distances and compute its value. Record V(A′), V(C), and the work done by the electric force from A′ to C, and change q₀ to check that the work is still zero.',
        hint: 'SE=SH and SF=SG, so $V=kq(1/SE+1/SF-1/SG-1/SH)=0$. V(s) is a horizontal line and E∥(s) is zero everywhere, in agreement with the prediction from the angle.',
        teacher: 'Remind students to distinguish "zero potential" from "zero field": the potential is zero everywhere on the path, but the field is zero only at the center O.',
        preset: Object.assign({}, base, { s: 0.25 }), layers: { probe: true } },
      { title: 'Perturbation: remove G and H', q: 'With only the two positive charges E and F kept, is the potential along A′C still constant?',
        obs: 'The sources at G and H have been removed. Drag s, first watch how the angle between the net field and the displacement direction changes, and then look at the V(s) curve.',
        rec: 'Record the range of the angle for s below 0.5 and above 0.5, V(A′), V(O), V(C), and the sign of the work done by the electric force on a positive charge from A′ to O and from O to C.',
        hint: 'In the first half the angle is greater than 90° and the potential rises; in the second half the angle is less than 90° and the potential falls. V(s) reaches its maximum at the center O, so the potential is not monotonic along A′C. A′ and C are symmetric about the center, so the end potentials are equal and the total work is still zero.',
        teacher: 'On the same path, removing one pair of sources changes the symmetry condition, and the potential curve changes from a horizontal line to one that rises and then falls. Use this to show that the conclusion depends on the charge configuration.',
        preset: Object.assign({}, base, { removeGH: true, s: 0.25 }), layers: { probe: true } },
      { title: 'Extension: path B and inversion about the center', q: 'Before and after G and H are removed, are the fields at vertices D and B′ equal in magnitude and opposite in direction?',
        obs: 'The probe moves along the other space diagonal DB′. First keep all four sources, then remove G and H, and in each case compare the magnitudes of the fields at D and B′ and the sum of the two field vectors.',
        rec: 'Record the magnitudes of the two fields, the magnitude of the sum of the two field vectors, and the work done by the electric force from D to B′, and explain the conclusion and the reason in both cases.',
        hint: 'D and B′ are symmetric about the center. E and F are a pair of like sources, and G and H are also a pair of like sources; under inversion through the center each pair swaps places. So the potential is an even function about the center and the field is an odd function.',
        teacher: 'This can be set as a follow-up task. Equal magnitudes of the two fields do not by themselves show that they are opposite, so check whether the vector sum of the two fields is zero.',
        preset: Object.assign({}, base, { useB: true, q0B: 1, t: 0.25, field: true }), layers: { probe: true } }
    ],
    readings(ctx) {
      const p = ctx.p, S = ctx.sample, v = verts(p.a), out = [];
      const A = S(v[0]), C = S(v[2]), Ap = S(v[4]), D = S(v[3]), Bp = S(v[5]), O = S([0, 0, 0]);
      if (ctx.stage === 0) out.push(['V(A)', A.V, 'kQ/L'], ['ΔV(A,C)=V(C)−V(A)', C.V - A.V, 'kQ/L']);
      if (ctx.probe && !p.customProbe && !p.useB && ctx.probeVisible) {
        const x = ctx.probe.pos, r = ctx.sources.map(s => [s.label, V.dist(x, s.p), s.q]);
        for (const [n, d] of r) out.push(['S' + n, d, 'L']);
        out.push(['Σkqᵢ/rᵢ (from the distances)', r.reduce((t, [, d, q]) => t + (q ? q / d : 0), 0), 'kQ/L'], ['Angle between E(S) and the direction of A′C', ang(ctx.probe.s.E, [1, 1, 1]), '°']);
      }
      if (!p.useB) out.push(['V(A′)', Ap.V, 'kQ/L'], ['V(O)', O.V, 'kQ/L'], ['V(C)', C.V, 'kQ/L'], ['ΔU(A′→C)=q₀[V(C)−V(A′)]', p.q0 * (C.V - Ap.V), 'kQ²/L'],
        ['W_field(A′→O)=q₀[V(A′)−V(O)]', p.q0 * (Ap.V - O.V), 'kQ²/L'], ['W_field(O→C)=q₀[V(O)−V(C)]', p.q0 * (O.V - C.V), 'kQ²/L']);
      if (p.customProbe && ctx.probe && ctx.probe.s.ok && V.len(ctx.probe.s.E) > 1e-9) {
        const y = S(V.addS(ctx.probe.pos, V.norm(ctx.probe.s.E), 0.05));
        out.push(['Potential change after moving 0.05 L along E', y.ok ? y.V - ctx.probe.s.V : NaN, 'kQ/L']);
      }
      if (p.useB) {
        out.push(['W_field(D→B′)=q₀B[V(D)−V(B′)]', p.q0B * (D.V - Bp.V), 'kQ²/L'], ['|E(D)|', V.len(D.E), 'kQ/L²'], ['|E(B′)|', V.len(Bp.E), 'kQ/L²'],
          ['|E(D)+E(B′)|', V.len(V.add(D.E, Bp.E)), 'kQ/L²']);
      }
      out.push(['Path length √3a', s3 * p.a, 'L']);
      return out;
    },
    curves(ctx) {
      const p = ctx.p;
      if (p.customProbe) return null;
      const path = p.useB ? pathB(p.a) : pathA(p.a), d = MH.alongPath(ctx.F, path, 200), q0 = p.useB ? p.q0B : p.q0;
      return { x: d.xs, xLabel: p.useB ? 't (from D to B′, dimensionless)' : 's (from A′ to C, dimensionless)', cur: p.useB ? p.t : p.s,
        series: [{ name: 'V', y: d.Vs, color: EL.CHART.V }, { name: 'U', y: d.Vs.map(v => q0 * v), color: EL.CHART.U }, { name: 'E∥', y: d.Es, color: EL.CHART.E }],
        points: p.useB ? [] : [{ x: 0.5, y: ctx.sample([0, 0, 0]).V, name: 'O', color: EL.CHART.mark }],
        note: 'Potential V, potential energy U, and the component E∥ of the field along ' + (p.useB ? 'path B' : 'path A') + ' (per unit arc length). The horizontal axis is a dimensionless path parameter, and the arc length equals the parameter times √3a.' };
    },
    extra(ctx) {
      const p = ctx.p, v = verts(p.a), out = MH.poly(v, FACES, { faces: p.faces && ctx.layers.geom, opacity: 0.12 });
      if (!ctx.layers.geom) out.lines = [];
      v.forEach((q, i) => { if (![1, 6, 7].includes(i)) MH.mark(out, q, NAMES[i], null, 0.06); });
      MH.mark(out, [0, 0, 0], 'O', null, 0.05);
      out.lines.push(...MH.pathLine(ctx.F, pathA(p.a), EL.C.path), ...MH.pathLine(ctx.F, pathB(p.a), EL.C.energy, [0.2, 0.14]));
      if (p.field) {
        out.arrows = [];
        for (const q of [v[3], v[5]]) { const s = ctx.sample(q); if (s.ok) out.arrows.push({ p: q, v: ctx.arrowVec(s.E), color: EL.C.vec, width: 2.4 }); }
      }
      return out;
    },
    exercises: [
      { q: 'For a=2 L, what is the length of each space diagonal (in units of L)?', a: 2 * s3 },
      { q: 'For a=2 L, along path A dV/ds=−2√3 kQ/L. Find the component E∥ of the field along path A (in units of kQ/L²).', a: 1 },
      { q: 'With all four sources present, a positive test charge moves along the space diagonal from A′ to C. What is the work done by the electric force?', options: ['Zero', 'Positive', 'Negative'], a: 'Zero' },
      { q: 'With only the sources at E and F kept, how does the potential vary along the space diagonal A′C?', options: ['Rises then falls', 'Decreases throughout', 'Stays constant'], a: 'Rises then falls' },
      { q: 'When only the sources at E and F are kept, how are the field vectors at D and B′ related?', options: ['Equal in magnitude, opposite in direction', 'Identical', 'Unequal in magnitude'], a: 'Equal in magnitude, opposite in direction' },
      { q: 'What role do the colored faces in the figure play?', options: ['A geometric reference, not continuously charged', 'Uniformly charged surfaces', 'A conducting shield'], a: 'A geometric reference, not continuously charged' }
    ]
  });
})(window.EL);
