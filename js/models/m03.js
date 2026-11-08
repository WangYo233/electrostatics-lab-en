'use strict';
// 03 Disk charges: total interaction energy and comparison of candidate configurations
(function (EL) {
  const V = EL.V, MH = EL.MH;
  const Uring = (n, q, R) => { if (n < 2) return 0; let s = 0; for (let m = 1; m < n; m++) s += 1 / Math.sin(Math.PI * m / n); return n * q * q * s / (4 * R); };
  const Ucenter = (n, q, qc, R) => Uring(n - 1, q, R) + (n - 1) * q * qc / R;

  function energy(src, rMin) {
    let U = 0, dmin = Infinity;
    for (let i = 0; i < src.length; i++) for (let j = i + 1; j < src.length; j++) {
      const r = V.dist(src[i].p, src[j].p);
      dmin = Math.min(dmin, r);
      U += src[i].q * src[j].q / r;
    }
    return { U: dmin <= rMin ? NaN : U, dmin };
  }
  function forces(src) {
    return src.map((a, i) => {
      let f = [0, 0, 0];
      src.forEach((b, j) => { if (i === j) return; const d = V.sub(a.p, b.p), r = V.len(d); f = V.addS(f, d, a.q * b.q / (r * r * r)); });
      return f;
    });
  }

  EL.defModel({
    id: 3, code: 'Ext. 2', order: 8, ext: true, file: '03', title: 'Charges on a disk', short: 'Total interaction energy, the center configuration, and local perturbations',
    view: '2d', lock2d: false, R: 6, rMin: 0.2, perCharge: false,
    params: [
      { key: 'N', label: 'Total number of point charges N', min: 2, max: 12, step: 1, val: 6 },
      { key: 'R', label: 'Disk radius R / L', min: 1, max: 8, step: 0.1, val: 4 },
      { key: 'q', label: 'Charge of each charge on the circle q / Q', min: 0.1, max: 2, step: 0.1, val: 1 },
      { key: 'phi', label: 'Overall rotation angle φ / rad', min: -3.14, max: 3.14, step: 0.01, val: 0 },
      { key: 'qc', label: 'Charge of the center charge q_c / Q', min: -2, max: 2, step: 0.1, val: 1, show: p => p.center },
      { key: 'mx', label: 'Perturbed charge x coordinate / L', min: -8, max: 8, step: 0.05, val: 4, show: p => p.manual },
      { key: 'my', label: 'Perturbed charge y coordinate / L', min: -8, max: 8, step: 0.05, val: 0, show: p => p.manual }
    ],
    toggles: [
      { key: 'center', label: 'Place one charge at the center', val: false },
      { key: 'manual', label: 'Move charge 1 by hand', val: false },
      { key: 'force', label: 'Show the net electric force on each charge', val: true },
      { key: 'pairs', label: 'Show the line joining charges 1 and 2', val: true }
    ],
    hidden: { cands: [] },
    display: { level: 2, spacing: 0.3, count: 3, plane: 'xy' },
    layerNames: { geom: 'Circle and guide lines' },
    probe: { free: null },
    sources(p) {
      const nr = p.center ? p.N - 1 : p.N, out = [];
      for (let i = 0; i < nr; i++) {
        const th = 2 * Math.PI * i / nr + p.phi;
        out.push({ p: [p.R * Math.cos(th), p.R * Math.sin(th), 0], q: p.q, label: String(i + 1) });
      }
      if (p.manual && out.length) out[0].p = [p.mx, p.my, 0];
      if (p.center) out.push({ p: [0, 0, 0], q: p.qc, label: 'C' });
      return out;
    },
    handles(ctx) {
      if (!ctx.p.manual) return [];
      return [{ p: [ctx.p.mx, ctx.p.my, 0], plane: [0, 0, 1], move: (q, set) => {
        let x = q[0], y = q[1];
        const r = Math.hypot(x, y);
        if (r > ctx.p.R) { x *= ctx.p.R / r; y *= ctx.p.R / r; }
        set({ mx: +x.toFixed(3), my: +y.toFixed(3) });
      } }];
    },
    stages: [
      { title: 'Equally spaced ring configuration', q: 'How many pairs of charges must be counted in the total interaction energy?',
        obs: 'Start from the configuration in which like charges divide the circle equally, and observe the separation of charges 1 and 2 and the total interaction energy.', rec: 'Use N(N−1)/2 to check the number of distinct pairs, and explain why each pair is counted only once.',
        hint: 'The total interaction energy is $U=\\sum_{i<j}kq_iq_j/r_{ij}$. The disk boundary only restricts the positions of the charges, and the constraint force of the boundary is not included in the electrostatic interaction energy.', preset: { center: false, manual: false, pairs: true, N: 6, R: 4, q: 1, phi: 0 } },
      { title: 'Number and scale', q: 'How does the total interaction energy change when you add charges or enlarge the disk?',
        obs: 'Change only one of N, R, and q at a time, and keep the other two fixed.', rec: 'For the same N, compare how U depends on 1/R and on q². When comparing results for different N, note that the total charge changes as well.',
        hint: 'When the shape of the configuration is unchanged, the total interaction energy is proportional to 1/R and to the square of each charge, q².' },
      { title: 'Center configuration', q: 'Keeping the total number of charges N fixed, does moving one charge to the center lower the total interaction energy?',
        obs: 'With one charge at the center, N−1 charges remain on the circle. First set the center charge equal to q, then compare the two configurations.', rec: 'Keep N, R, and the individual charges the same when comparing. Explain the case where the center charge changes sign separately.',
        hint: 'The net electric force on the charge at the center may be zero, but that alone does not prove the configuration is stable, and it certainly does not prove that the total interaction energy is a global minimum.', preset: { center: true, manual: false },
        actions: [{ label: 'Set center charge equal to q', run: ctx => ctx.set({ qc: ctx.p.q }) }] },
      { title: 'Local perturbation', q: 'Can a local perturbation of the symmetric configuration lower the total interaction energy?',
        obs: 'Check "Move charge 1 by hand" and drag the gold control point inside the disk. The other charges stay where they were.', rec: 'Compare U before and after the perturbation, and explain how the net electric force on a charge relates to the boundary constraint force when the net force is not zero.',
        hint: 'Dragging only samples different positions. It does not simulate the motion of the charge. When the perturbed charge enters the excluded neighborhood of another charge, the total interaction energy is undefined.', preset: { manual: true },
        actions: [{ label: 'Return to circle', run: ctx => ctx.set({ mx: +(ctx.p.R * Math.cos(ctx.p.phi)).toFixed(3), my: +(ctx.p.R * Math.sin(ctx.p.phi)).toFixed(3) }) }] },
      { title: 'Comparing configurations', q: 'How far do these comparisons support the conclusion of lowest energy?',
        obs: 'Keep the readings for the equally spaced ring, the center, and the perturbed configurations, and compare them with N, R, and the charges all the same.', rec: 'Cite at least two comparable records, and state clearly the difference between "lower among the configurations compared" and "global minimum".',
        hint: 'A finite set of configurations or local perturbations cannot exhaust all allowed configurations. Records with different center charges or different total numbers of charges are not comparisons of the same problem.',
        actions: [{ label: 'Keep current reading', run: ctx => {
          const p = ctx.p, U = energy(ctx.sources, ctx.rMin).U;
          const name = p.manual ? 'Perturbed configuration' : p.center ? 'Ring and center configuration' : 'Equally spaced ring configuration';
          ctx.hidden.cands = [{ name, N: p.N, R: p.R, q: p.q, qc: p.center ? p.qc : '—', U }].concat(ctx.hidden.cands).slice(0, 6);
        } }] }
    ],
    readings(ctx) {
      const p = ctx.p, src = ctx.sources, e = energy(src, ctx.rMin), f = forces(src);
      const r12 = src.length > 1 ? V.dist(src[0].p, src[1].p) : NaN;
      const out = [['Total interaction energy U', e.U, 'kQ²/L'], ['Unordered pairs N(N−1)/2', src.length * (src.length - 1) / 2, ''],
        ['r₁₂', r12, 'L'], ['Interaction energy of charges 1 and 2, kq²/r₁₂', src.length > 1 ? src[0].q * src[1].q / r12 : NaN, 'kQ²/L'],
        ['Largest net electric force on any charge, max|F|', Math.max(...f.map(V.len)), 'kQ²/L²'], ['Number of charges on the circle', p.center ? p.N - 1 : p.N, ''], ['Smallest distance between two charges', e.dmin, 'L']];
      if (!p.manual) out.push(['Regular-configuration theory', p.center ? Ucenter(p.N, p.q, p.qc, p.R) : Uring(p.N, p.q, p.R), 'kQ²/L']);
      if (ctx.hidden.cands.length) out.push(['— Kept configurations —', '', '']);
      ctx.hidden.cands.forEach(c => out.push([c.name + ' (N=' + c.N + ', R=' + c.R + ', q=' + c.q + ', q_c=' + c.qc + ')', c.U, 'kQ²/L']));
      return out;
    },
    curves(ctx) {
      const p = ctx.p, ns = [], u1 = [], u2 = [];
      for (let n = 2; n <= 12; n++) { ns.push(n); u1.push(Uring(n, p.q, p.R)); u2.push(Ucenter(n, p.q, p.center ? p.qc : p.q, p.R)); }
      return { x: ns, xLabel: 'N', cur: p.N, scatter: true,
        series: [{ name: 'Equally spaced ring', y: u1, color: EL.CHART.V }, { name: 'Ring and center', y: u2, color: EL.CHART.E }],
        points: [{ x: p.N, y: energy(ctx.sources, ctx.rMin).U, color: EL.CHART.U, name: 'Current configuration' }],
        note: 'The horizontal axis is the total number of point charges N, and the vertical axis is the total interaction energy U / (kQ²/L).' };
    },
    extra(ctx) {
      const p = ctx.p, src = ctx.sources, out = { lines: [], arrows: [] };
      if (ctx.layers.geom) {
        const c = [];
        for (let i = 0; i <= 120; i++) { const a = 2 * Math.PI * i / 120; c.push([p.R * Math.cos(a), p.R * Math.sin(a), 0]); }
        out.lines.push({ pts: c, color: EL.C.ring, width: 1.5 });
        out.lines.push({ pts: [[0, 0, 0], [p.R * Math.cos(p.phi), p.R * Math.sin(p.phi), 0]], color: EL.C.guide, width: 1, dash: [0.15, 0.12] });
      }
      if (p.pairs && src.length > 1) out.lines.push({ pts: [src[0].p, src[1].p], color: EL.C.energy, width: 2, dash: [0.2, 0.12] });
      if (p.force) {
        const f = forces(src), mx = Math.max(1e-9, ...f.map(V.len));
        f.forEach((v, i) => { if (V.len(v) > 1e-9) out.arrows.push({ p: src[i].p, v: V.mul(v, 1.6 / mx), color: EL.C.sum, width: 2.2 }); });
      }
      if (p.manual) MH.mark(out, [p.mx, p.my, 0], 'Perturbed charge', EL.C.probe, 0.12);
      return out;
    },
    exercises: [
      { q: 'For N=6, how many distinct pairs of charges are there?', a: 15 },
      { q: 'Four charges divide a circle equally to form a square, with R=1 L and q=1 Q. Find the total interaction energy (in units of kQ²/L).', a: 2 * Math.SQRT2 + 1 },
      { q: 'The disk radius doubles and each charge also doubles, with the shape of the configuration unchanged. Find the ratio of the new to the original total interaction energy, U_new/U_old.', a: 2 },
      { q: 'A configuration has the lowest energy among a finite number of configurations compared. What can you conclude?', options: ['It is lower only among the candidates compared', 'It is proven to be the global minimum', 'It must be stable'], a: 'It is lower only among the candidates compared' }
    ]
  });
})(window.EL);
