'use strict';
// 01 Point charges and dipoles
(function (EL) {
  const V = EL.V, MH = EL.MH;
  const probe = ['px', 'py', 'pz'];
  EL.defModel({
    id: 1, code: '01', order: 1, file: '01', title: 'Point charges and dipoles', short: 'A single point charge, distance ratios, the electric dipole, and equipotential cross-sections',
    view: '3d', R: 6, rMin: 0.25, perCharge: true, editor: { max: 6, qRange: [-2, 2], xyz: 8 },
    params: [
      { key: 'n', label: 'Number of source charges N', min: 1, max: 6, step: 1, val: 2, hideCustom: true },
      { key: 'd', label: 'Separation of the two sources d / L', min: 1, max: 8, step: 0.1, val: 4, hideCustom: true },
      { key: 'q1', label: 'Charge of source Q₁ / Q', min: -2, max: 2, step: 0.1, val: 1, hideCustom: true },
      { key: 'q2', label: 'Charge of source Q₂ / Q', min: -2, max: 2, step: 0.1, val: -1, hideCustom: true },
      { key: 'px', label: 'Probe x coordinate / L', min: -6, max: 6, step: 0.05, val: 0, probe: true },
      { key: 'py', label: 'Probe y coordinate / L', min: -6, max: 6, step: 0.05, val: 1, probe: true },
      { key: 'pz', label: 'Probe z coordinate / L', min: -6, max: 6, step: 0.05, val: 0, probe: true }
    ],
    display: { level: 0, spacing: 0.25, count: 1 },
    probe: { free: probe },
    keyPts: p => [{ name: 'Origin O (midpoint of the line joining the two sources)', p: [0, 0, 0] }, { name: 'Point B (d/2, 0, 0)', p: [p.d / 2, 0, 0] }, { name: 'Point P+ (0, d/2, 0)', p: [0, p.d / 2, 0] }, { name: 'Point P− (0, −d/2, 0)', p: [0, -p.d / 2, 0] }],
    sources(p) {
      const d = p.d, def = [[-d / 2, 0, 0], [d / 2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, 2], [0, 0, -2]];
      const qs = [p.q1, p.q2, 1, 1, 1, 1];
      return def.slice(0, p.n).map((x, i) => ({ p: x, q: qs[i], label: 'Q' + (i + 1) }));
    },
    stages: [
      { title: 'A single point charge', q: 'What shape are the equipotential surfaces of a single point charge?',
        obs: 'Set the charge of Q₂ to zero so that only source Q₁ remains. Write down a prediction, then display the field lines and equipotential surfaces to check it. You can also change the charges or add sources.',
        rec: 'Record V(O) and |E(O)|. Change the potential value of the selected equipotential surface and compare how the surface changes. After adding sources, check the single-charge conclusion again.',
        hint: 'The potential of a single point charge is $V=kq/r$. An equipotential surface is a sphere of finite radius only when its potential has the same sign as q and is nonzero. Use the readings for the field-strength ratio.',
        preset: { n: 2, q1: 1, q2: 0, d: 4 }, display: { level: 0, spacing: 0.25, count: 2 } },
      { title: 'Distance, potential, and field', q: 'When the distance from a point charge doubles, how do the potential and the field change?',
        obs: 'Keep the standard positions and set the charge of Q₂ to zero. Point O is at distance d/2 from Q₁, and point B (d/2, 0, 0) is at distance d from Q₁.',
        rec: 'Compare V and |E| at the two points, then change d or the charge of Q₁. If you move a source or add one, this distance ratio no longer applies.',
        hint: 'With a single nonzero source in its standard position, V(O)/V(B) equals 2 and |E(O)|/|E(B)| equals 4. When the charge is zero, these ratios have no meaning.',
        preset: { n: 2, q1: 1, q2: 0, d: 4 } },
      { title: 'Electric dipole', q: 'If the potential is zero at a point, must the field be zero there?',
        obs: 'Restore the standard pair of equal and opposite sources. Compare the potential and field at the midpoint O, then use the equipotential lines and the 3D equipotential surfaces to see how the potential is distributed in space.',
        rec: 'Find the readings where V(O) is zero but |E(O)| is not. Change the charges or positions and check which conclusions still hold.',
        hint: 'Between the standard equal and opposite sources, the two component fields point the same way at O, while the potentials of the two sources cancel at O. The zero-potential surface is the perpendicular bisector plane of the line joining the sources, and it is unbounded. So zero potential does not imply zero field.',
        preset: { n: 2, q1: 1, q2: -1, d: 4 }, display: { level: 0, spacing: 0.3, count: 1 } },
      { title: 'Equipotential cross-sections', q: 'How does the same potential distribution change across cross-sections at different heights?', view: '2d',
        obs: 'In the 3D view or the 2D cross-section, adjust the slice position, the offset of the potential values, and the number of equipotential surfaces per source (1 to 5). The field lines and equipotential surfaces can be shown separately.',
        rec: 'Compare the equipotential lines on cross-sections at different heights. When a region has no equipotential line, decide whether the potential value has no solution, the line lies outside the window, or the region is inside the undefined neighborhood of a source.',
        hint: 'The equipotential lines are computed from the 3D potential of the current sources. The 3D view shows the field lines in space, and the 2D cross-section shows the streamlines of the in-plane component of the electric field. The number of connected parts of an equipotential surface is determined by the actual potential distribution.',
        preset: { n: 2, q1: 1, q2: -1, d: 4 } },
      { title: 'Symmetric-point check', q: 'For two points symmetric about the xz plane, which readings are the same?',
        obs: 'First compare P+ (0, d/2, z) and P− (0, −d/2, z) with the standard two sources. Then edit the source coordinates or add sources, and check whether the reflection symmetry about the xz plane still holds.',
        rec: 'Compare V, |E|, and E_y at the two points, and state whether the current source configuration is symmetric about the xz plane.',
        hint: 'V and |E| are the same at the two points, and the E_y values are opposite, only when both the positions and the charges of the sources are symmetric about the xz plane. A custom source configuration must be checked again.',
        preset: { n: 2, q1: 1, q2: -1, d: 4 } }
    ],
    readings(ctx) {
      const p = ctx.p, S = ctx.sample, O = S([0, 0, 0]), out = [];
      if (ctx.stage === 0) {
        const one = ctx.sources.filter(s => s.q);
        const R = one.length === 1 && ctx.levels.length ? one[0].q / ctx.levels.find(v => v * one[0].q > 0) : NaN;
        out.push(['V(O)', O.V, 'kQ/L'], ['|E(O)|', V.len(O.E), 'kQ/L²'], ['Radius of the first equipotential surface (sphere)', R > ctx.rMin ? R : NaN, 'L']);
      } else if (ctx.stage === 1) {
        const B = S([p.d / 2, 0, 0]);
        out.push(['V(O)', O.V, 'kQ/L'], ['|E(O)|', V.len(O.E), 'kQ/L²'], ['V(B)', B.V, 'kQ/L'], ['|E(B)|', V.len(B.E), 'kQ/L²'],
          ['V(O)/V(B)', O.V / B.V, ''], ['|E(O)|/|E(B)|', V.len(O.E) / V.len(B.E), '']);
      } else if (ctx.stage === 2) {
        out.push(['V(O)', O.V, 'kQ/L'], ['|E(O)|', V.len(O.E), 'kQ/L²'], ['E(O)', O.E, 'kQ/L²']);
      } else if (ctx.stage === 3) {
        out.push(['Potential of the first equipotential surface', ctx.levels[0], 'kQ/L'], ['Cross-section', ctx.st.plane + ' plane, ' + ctx.planeName + '=' + EL.U.fmt(ctx.st.planePos), '']);
      } else {
        const z = ctx.st.plane === 'xy' ? ctx.st.planePos : 0;
        const a = S([0, p.d / 2, z]), b = S([0, -p.d / 2, z]);
        out.push(['V(P+)', a.V, 'kQ/L'], ['V(P−)', b.V, 'kQ/L'], ['|E(P+)|', V.len(a.E), 'kQ/L²'], ['|E(P−)|', V.len(b.E), 'kQ/L²'],
          ['Ey(P+)', a.E[1], 'kQ/L²'], ['Ey(P−)', b.E[1], 'kQ/L²']);
      }
      return out;
    },
    extra(ctx) {
      const p = ctx.p, out = {};
      MH.mark(out, [0, 0, 0], 'O');
      if (ctx.stage === 1) MH.mark(out, [p.d / 2, 0, 0], 'B');
      if (ctx.stage === 4) {
        const z = ctx.st.plane === 'xy' ? ctx.st.planePos : 0;
        MH.mark(out, [0, p.d / 2, z], 'P+', EL.C.probe); MH.mark(out, [0, -p.d / 2, z], 'P−', EL.C.probe);
      }
      return out;
    },
    exercises: [
      { q: 'A single point charge has charge q=+1 Q. Find the potential V at a distance of 2 L from it (in units of kQ/L).', a: 0.5 },
      { q: 'The distance from a single point charge changes from 2 L to 4 L. Find the ratio of the new field strength to the original.', a: 0.25 },
      { q: 'At the midpoint O of the line joining two equal and opposite point charges, which statement about the potential and the field is true?', options: ['V=0, E≠0', 'V=0, E=0', 'V≠0, E=0'], a: 'V=0, E≠0' },
      { q: 'A single point charge has charge q=+1 Q. The equipotential surface at potential 0.5 kQ/L is cut by a plane at distance 1 L from the charge, giving a circle. Find the radius of this circle (in units of L).', a: Math.sqrt(3) }
    ]
  });
})(window.EL);
