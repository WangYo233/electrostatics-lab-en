'use strict';
// 07 Open inquiry: up to 16 point charges, geometry backgrounds and binding to special points
(function (EL) {
  const V = EL.V, MH = EL.MH;
  const step = (title, q, obs, rec, hint, layers) => ({ title, q, obs, rec, hint, layers });
  EL.defModel({
    id: 7, code: '06', order: 6, file: '07', title: 'Open inquiry', short: 'Place point charges freely, bind them to special points of a geometric background, and switch between 2D and 3D',
    view: '2d', R: 6, rangeKey: 'range', rMin: 0.12, perCharge: true, alwaysCustom: true,
    editor: { max: 16, qRange: [-10, 10], xyz: 30, bind: true },
    initialSources: [{ p: [-2, 0, 0], q: 1 }, { p: [2, 0, 0], q: -1 }],
    params: [
      { key: 'range', label: 'Radius of the display region / L', min: 1, max: 30, step: 0.5, val: 6 },
      { key: 'px', label: 'Probe x coordinate / L', min: -30, max: 30, step: 0.05, val: 0, probe: true },
      { key: 'py', label: 'Probe y coordinate / L', min: -30, max: 30, step: 0.05, val: 1.5, probe: true },
      { key: 'pz', label: 'Probe z coordinate / L', min: -30, max: 30, step: 0.05, val: 0, probe: true }
    ],
    hidden: { bgs: [] },
    display: { level: 0, spacing: 0.3, count: 2, seeds: 6 },
    probe: { free: ['px', 'py', 'pz'] },
    keyPts: () => [{ name: 'Origin O', p: [0, 0, 0] }],
    sources: () => [],
    stages: [
      step('Placing charges', 'What electric field do the point charges you place produce? Write down a prediction first.',
        'In "Model", add or delete point charges (up to 16) and edit their positions and charges. You can also add a geometric background first, then place point charges at its vertices, edge midpoints, face centers, or center.',
        'Record the charge, the 3D coordinates, and the binding to the background of every source with nonzero charge.', 'The geometric background is only a geometric reference. It does not model a conductor or a dielectric. Binding only makes a point charge move together with the background.',
        { charges: true, lines: false, contours: false, surfaces: false, probe: false }),
      step('Field lines', 'Where do the field lines start, and where do they end?',
        'Show the field lines and compare the 2D cross-section with the 3D view. The 2D cross-section shows the streamlines of the in-plane component of the electric field. The field lines in the 3D view are obtained by integrating the electric field in space step by step.', 'Record the source where each field line starts and ends, and how densely the field lines are spaced.',
        'Switching from the 2D cross-section to the 3D view is not a rotation of the planar picture. A source that is not in the cross-section affects the 2D picture only through the in-plane component of its electric field.', { lines: true }),
      step('Equipotential lines and surfaces', 'What is the geometric relation between the equipotential lines (surfaces) and the field lines?',
        'Show the equipotential lines on the cross-section. In the 3D view you can choose an xy, xz, or yz cross-section and show the equipotential surfaces. Each point charge can have 1 to 5 equipotential surfaces. When there are many sources, start with the fast precision setting.', 'Record the actual potential values of the equipotential surfaces, and the orientation and position of the cross-section.',
        'Wherever the field is not zero, the field lines are perpendicular to the equipotential surfaces. The number of potential values of the surfaces is not always the same as the number of connected parts of the surfaces.', { contours: true }),
      step('Probe', 'How is the net field at a point made up of the component fields of the sources?',
        'Drag the probe or enter its coordinates, switch to "Vector sum" in the Analyze workspace, choose two component fields, and compare the angle between them with the result of their sum.', 'Record the probe position and V, |E|, and each component field at that point.',
        'The net field of two component fields satisfies $|\\vec E_1+\\vec E_2|^2=E_1^2+E_2^2+2E_1E_2\\cos\\theta$. When drawing, start every component field from the same point and use the same scale.', { probe: true })
    ],
    readings(ctx) {
      const src = ctx.sources.filter(s => s.q);
      return [['Number of sources with nonzero charge', src.length, ''], ['Total charge Σq', src.reduce((a, s) => a + s.q, 0), 'Q'], ['Number of geometric backgrounds', ctx.hidden.bgs.length, '']];
    },
    extra(ctx) {
      const out = { lines: [], meshes: [], spheres: [], labels: [] };
      if (!ctx.layers.geom) return out;
      const is2d = ctx.st.view === '2d', B = V.planeBasis(ctx.st.plane), col = EL.C.ring;
      ctx.hidden.bgs.forEach((s, bi) => {
        const b = EL.GEO.build(s);
        if (is2d) {
          const segs = EL.GEO.slice(b, B, ctx.st.planePos);
          if (segs.length) out.lines.push(...segs.map(q => ({ pts: q, color: col, width: 1.6 })));
        } else if (b.sphere) {
          out.meshes.push({ mesh: ctx.cached('bgs' + JSON.stringify(s), () => EL.ISO.sphere(b.sphere.c, b.sphere.r, 28)), color: [...EL.C.geom, ctx.st.style.geomOpacity] });
        } else if (b.circle) {
          const c = [];
          for (let i = 0; i <= 96; i++) { const a = 2 * Math.PI * i / 96; c.push(V.add(b.circle.c, [b.circle.r * Math.cos(a), b.circle.r * Math.sin(a), 0])); }
          out.lines.push({ pts: c, color: col, width: 1.6 });
        } else {
          const m = MH.poly(b.verts, b.faces, { opacity: ctx.st.style.geomOpacity, faceColors: [EL.C.geom], edge: col });
          out.lines.push(...m.lines); out.meshes.push(...m.meshes);
        }
        if (ctx.showSpecial === bi) b.special.forEach(sp => out.spheres.push({ p: sp.p, r: 0.05, color: EL.C.probe }));
      });
      return out;
    },
    exercises: [
      { q: 'A source is at (0, 0, 2 L), and you view the cross-section z=0. Which source coordinates should you use to compute the field at points of the cross-section?', options: ['(0,0,2L)', '(0,0,0)', 'Its projection onto the cross-section'], a: '(0,0,2L)' },
      { q: 'A source with charge q=+1 Q is at (0, 0, 2 L). Find the z component E_z of the field at the origin O (in units of kQ/L²).', a: -0.25 },
      { q: 'At a point the two component fields are (1, 0, 0) and (0, 1, 0) (in units of kQ/L²). Find the magnitude of the net field.', a: Math.SQRT2 },
      { q: 'If you add only a closed polyhedron background and no charge, what happens to the existing field?', options: ['It is unchanged; shielding is not modeled', 'The field inside is zero', 'The field strength is halved'], a: 'It is unchanged; shielding is not modeled' }
    ]
  });
})(window.EL);
