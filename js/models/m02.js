'use strict';
// 02 Paths and energy
(function (EL) {
  const V = EL.V, MH = EL.MH;
  const path = { key: 's', label: 's', unit: 'L', range: [-6, 6], pos: s => [s, 0, 0], d: () => [1, 0, 0] };
  EL.defModel({
    id: 2, code: '02', order: 2, file: '02', title: 'Paths and energy', short: 'Potential V(s), potential energy U(s), and the tangential field component E∥(s) along the x axis',
    view: '3d', R: 6, rMin: 0.25, perCharge: true,
    params: [
      { key: 'q1', label: 'Charge of source Q₁ (at (−d/2, 0, 0)) / Q', min: -2, max: 2, step: 0.1, val: 1 },
      { key: 'q2', label: 'Charge of source Q₂ (at (d/2, 0, 0)) / Q', min: -2, max: 2, step: 0.1, val: -1 },
      { key: 'q0', label: 'Test charge q₀ / Q', min: -2, max: 2, step: 0.1, val: 1, probe: true },
      { key: 'd', label: 'Separation of the two sources d / L', min: 1, max: 8, step: 0.1, val: 4 },
      { key: 's', label: 'Probe arc-length coordinate s / L', min: -6, max: 6, step: 0.05, val: 0, probe: true }
    ],
    hidden: { s0: null },
    display: { level: 0, spacing: 0.3, count: 1 },
    defaultLayers: { probe: true },
    probe: { path },
    paths: () => [path],
    sources: p => [{ p: [-p.d / 2, 0, 0], q: p.q1, label: 'Q1' }, { p: [p.d / 2, 0, 0], q: p.q2, label: 'Q2' }],
    stages: [
      { title: 'Sampling along a path', q: 'How does the potential change as you move along the x axis?',
        obs: 'Move the probe along the directed arc-length coordinate s, and watch both the probe position and the curve V(s).', rec: 'Choose three positions outside the neighborhoods of the sources, and record and compare V and |E| at each.',
        hint: '|E| is the magnitude of the electric field vector. You cannot judge the size of |E| from the sign of V.', preset: { q1: 1, q2: -1, q0: 1, d: 4, s: 1 } },
      { title: 'Slope of the potential curve', q: 'Does the direction of decreasing potential agree with the direction of the electric field?',
        obs: 'On a single continuous segment of the curve, compare the slope of V(s) with the signed E∥(s).', rec: 'Take points near a position of positive slope and near a position of negative slope, and check whether $E_\\parallel=-\\diff V/\\diff s$ holds.',
        hint: 'In this model the arc-length coordinate of the path is the x coordinate, so $E_\\parallel=-\\diff V/\\diff s$. The gradient residual comes from finite-difference error and is not exactly zero.', preset: { s: 1 } },
      { title: 'Reversing the test charge', q: 'Does changing the test charge q₀ change the potential and the electric field produced by the sources?',
        obs: 'Keep the sources and the probe position fixed, and change q₀ from positive through zero to negative. Compare the change in the potential energy $U=q_0V$ with the changes in the potential and the field.', rec: 'Write down how V, E, and U each change when q₀ changes sign.',
        hint: 'U is proportional to q₀, while V and E are determined by the sources alone. When q₀ is zero, U is zero everywhere except at the sources.' },
      { title: 'Work done by the electric force', q: 'How much work does the electric force do as a test charge moves from one position to another?',
        obs: 'First move the probe to the starting point and click "Mark as start", then move the probe along the same continuous segment of the curve to the end point.', rec: 'Change the sign of q₀ and check that $W=q_0(V_\\text{i}-V_\\text{f})=-\\Delta U$.',
        hint: 'Both the start and the end must lie in the domain. If the path between them crosses the excluded region near a source, you cannot compute the work from the potential difference between the end points, because the path contains a singularity.',
        actions: [{ label: 'Mark as start', run: ctx => { ctx.hidden.s0 = ctx.p.s; } }] },
      { title: 'Singularities and readings', q: 'Why can a reading near a source not be treated as zero?',
        obs: 'Move the probe near x=±d/2, then set the charge of the corresponding source to zero, and compare the excluded region with the break in the curve.', rec: 'Distinguish three cases: the reading is undefined, the reading is zero, and the source has been removed. Then summarize the relations among E, V, and U.',
        hint: 'Only the location of a source with nonzero charge is a singularity. A break in the curve marks an excluded region. It does not mean the potential is zero, and it is not an actual path that can cross the singularity.' }
    ],
    readings(ctx) {
      const p = ctx.p, F = ctx.F, s = F.sample(path.pos(p.s)), out = [];
      const Ep = s.ok ? s.E[0] : NaN, h = 1e-4, g = Math.abs(Ep + (F.V([p.s + h, 0, 0]) - F.V([p.s - h, 0, 0])) / (2 * h));
      out.push(['V(s)', s.V, 'kQ/L'], ['U(s)=q₀V', p.q0 * s.V, 'kQ²/L'], ['|E|', V.len(s.E), 'kQ/L²'], ['E∥(s)', Ep, 'kQ/L²']);
      if (ctx.stage === 1) out.push(['Gradient residual |E∥+dV/ds|', g, 'kQ/L²']);
      if (ctx.stage === 3) {
        const s0 = ctx.hidden.s0;
        if (s0 == null) out.push(['Start point', 'Start point not yet marked', '']);
        else {
          const a = F.sample(path.pos(s0)), bad = MH.pathBlocked(F, path, s0, p.s);
          const dU = bad ? NaN : p.q0 * (s.V - a.V);
          out.push(['Start point s₀', s0, 'L'], ['V_i', a.V, 'kQ/L'], ['V_f', s.V, 'kQ/L'], ['ΔU', dU, 'kQ²/L'], ['W_field=−ΔU', -dU, 'kQ²/L']);
          if (bad) out.push(['Note', 'The path between the start and the end crosses an excluded region, so the work cannot be computed from the end-point potential difference.', '']);
        }
      }
      return out;
    },
    curves(ctx) {
      const d = MH.alongPath(ctx.F, path, 240), q0 = ctx.p.q0;
      return { x: d.xs, xLabel: 's / L', cur: ctx.p.s,
        series: [{ name: 'V(s)', y: d.Vs, color: EL.CHART.V }, { name: 'U(s)', y: d.Vs.map(v => q0 * v), color: EL.CHART.U }, { name: 'E∥(s)', y: d.Es, color: EL.CHART.E }],
        bands: ctx.sources.filter(s => s.q).map(s => [s.p[0] - ctx.rMin, s.p[0] + ctx.rMin]),
        note: 'The horizontal axis is s / L. The curves have different vertical units, so compare them by color. Gray bands are the excluded regions near the sources.' };
    },
    extra(ctx) {
      const out = { lines: MH.pathLine(ctx.F, path) };
      MH.mark(out, [0, 0, 0], 'O');
      if (ctx.stage === 3 && ctx.hidden.s0 != null) MH.mark(out, path.pos(ctx.hidden.s0), 'Start', EL.C.energy, 0.09);
      return out;
    },
    exercises: [
      { q: 'The potential at the start is V_i=3 kQ/L and at the end is V_f=1 kQ/L. The test charge is q₀=−2 Q. Find the work W done by the electric force (in units of kQ²/L).', a: -4 },
      { q: 'Along a path, dV/ds=−0.6 kQ/L². Find the component E∥ of the field along the path (in units of kQ/L²).', a: 0.6 },
      { q: 'If only the sign of the test charge is changed, which quantities stay the same?', options: ['V and E', 'U and E', 'Only U'], a: 'V and E' },
      { q: 'The potentials at the start and the end both have definite values, but the path passes through a point charge with nonzero charge. Can the work done by the electric force be computed from the potential difference between the end points?', options: ['Yes', 'No, the path contains a singularity'], a: 'No, the path contains a singularity' }
    ]
  });
})(window.EL);
