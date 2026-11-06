'use strict';
// Right-hand tool panels: field and equipotentials, animation, vector synthesis, geometry background
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, A = EL.App, V = EL.V;

  A.pDisplay = function (c) {
    const st = c.st, m = c.m, is2d = st.view === '2d', L = st.layers, fx = A.r.fx;
    const names = Object.assign({}, m.layerNames || {});
    if (is2d) names.contours = 'equipotential lines';
    const allow = k => {
      const surfOk = !is2d && !(m.analytic && m.subs[st.sub].surf(c.subP, 1) === null && m.subs[st.sub].surf(c.subP, -1) === null);
      if (k === 'surfaces') return surfOk;
      if (k === 'surfLabels') return surfOk && L.surfaces;
      if (k === 'vectors' || k === 'frame') return !!m.analytic;
      if (k === 'geom') return m.id !== 1 && m.id !== 2;
      if (k === 'probe') return A.hasProbe(m);
      return true;
    };
    const setL = (k, v) => { L[k] = v; if (k === 'probe' && !v) { st.comp.show = false; if (st.wiz.on) A.stopWizard(); } A.update(); A.renderPanel(); A.renderStageBar(); if (k === 'lines' && v) A.r.playReveal(); };
    const out = [K.group('View', K.seg([['3d', '3D'], ['2d', '2D cross-section']], st.view, v => { st.view = v; A.resetCamera(); A.update(); A.renderPanel(); }),
      K.tip(is2d ? 'The 2D view shows the equipotential lines on the cross-section and the in-plane components of the electric field. Source charges off the plane appear as faint projections.' : 'The 3D view shows field lines in space. Cross-section equipotential lines are drawn on the selected plane.'))];
    // Checkboxes name the object being shown: "Show + object"
    out.push(K.group('Display', ...A.LAYERS.filter(([k]) => allow(k)).map(([k, n]) => K.check('Show ' + (names[k] || n).toLowerCase(), L[k], v => setL(k, v)))));
    if (L.contours || (L.surfaces && !is2d)) {
      const R = Math.round(Math.max(c.bound, A.isoDomain(c)) * 10) / 10, g = [];
      if (L.contours || is2d) {
        g.push(K.select('Slice orientation', [['xy', 'Parallel to the xy plane'], ['xz', 'Parallel to the xz plane'], ['yz', 'Parallel to the yz plane']], st.plane, v => { st.plane = v; st.sliceTrail = []; A.resetCamera(); A.update(); A.renderPanel(); }));
        // Put the play button in the slider row, aligned with the number box on the right
        const sOn = st.anim.on && st.anim.target === 'slice', sl = K.slider({ label: 'Slice position ' + c.planeName + ' / L', min: -R, max: R, step: 0.05, val: +st.planePos.toFixed(2), on: (v, live) => {
          // Dragging the slice by hand ends the slice animation (the panel is not rebuilt while dragging; the play button is refreshed on release)
          const an = st.anim;
          if (an.target === 'slice' && (an.on || an.paused)) { an.on = false; an.paused = false; cancelAnimationFrame(A.raf); A.sliceDragStop = true; }
          st.planePos = v; A.update();
          if (!live && A.sliceDragStop) { A.sliceDragStop = false; A.renderPanel(); }
        } });
        U.$('.row', sl).append(K.btn(sOn ? '⏸' : '⏵', () => { A.toggleAnim(sOn ? null : 'slice'); }, 'mini play', sOn ? 'Pause the back-and-forth slice sweep' : 'Play the back-and-forth slice sweep'));
        g.push(h('div.ctl-play', null, sl));
      }
      g.push(K.slider({ label: m.perCharge ? 'Equipotential levels per source' : 'Equipotential levels', min: 1, max: 5, step: 1, val: st.count, on: v => { st.count = v; A.update(); } }));
      g.push(K.slider({ label: 'Level offset V₀ / (kQ/L)', min: -5, max: 5, step: 0.05, val: st.level, on: v => { st.level = v; A.update(); } }));
      g.push(K.slider({ label: 'Level spacing ΔV / (kQ/L)', min: 0.05, max: 2, step: 0.05, val: st.spacing, on: v => { st.spacing = v; A.update(); } }));
      if (c.probeVisible) g.push(K.check('Add the equipotential level through the probe', !!st.probeLevel, v => { st.probeLevel = v; A.update(); A.renderPanel(); }),
        st.probeLevel && c.probeLevel != null ? h('p.note', null, 'Level through the probe: V = ' + U.fmt(c.probeLevel, 5) + '. At a zero-field point, this equipotential surface shrinks to a point.') : null);
      g.push(h('p.note', null, 'Potential of each level: ' + c.levels.map(v => U.fmt(v, 3)).join(', ') + ' (in units of kQ/L).'), K.tip('Unbounded equipotential surfaces are truncated at the boundary, which is drawn as a dashed box.'));
      out.push(K.group('Cross-section and equipotential lines', ...g));
    }
    if (L.lines || L.flow) out.push(K.group(L.lines ? 'Field lines' : 'Field line count',
      K.slider({ label: m.analytic ? 'Field line start points' : 'Field lines per source', min: m.analytic ? 6 : 2, max: m.analytic ? 48 : 32, step: 1, val: st.seeds, on: v => { st.seeds = v; A.update(); } }),
      m.analytic ? null : K.tip('The number of field lines is proportional to |q|. Line density reflects field strength.')));
    if (L.flow) out.push(K.group('Flow particles',
      h('div.btns', null, K.btn(fx.paused ? '⏵ Resume flow' : '⏸ Pause flow', () => A.setFx('paused', !fx.paused), 'mini')),
      K.seg([['sqrt', 'Speed ∝ √|E|'], ['linear', 'Speed ∝ |E|']], fx.map, v => A.setFx('map', v)),
      K.slider({ label: 'Flow speed', min: 0.2, max: 3, step: 0.1, val: fx.speed, on: v => { fx.speed = v; U.store.set('fx', fx); } }),
      K.slider({ label: 'Particle density', min: 0.3, max: 2, step: 0.1, val: fx.density, on: (v, l) => { fx.density = v; if (!l) A.setFx('density', v); } }),
      K.tip('Dots move along the field lines. Faster dots mean a stronger field. The dots are not trajectories of charged particles.')));
    if (L.vectors && m.analytic) out.push(K.group('Field vector sampling', K.slider({ label: 'Samples per axis', min: 3, max: 6, step: 1, val: st.vecN || 3, on: v => { st.vecN = v; A.update(); } })));
    if (L.lines || L.flow || L.contours || L.surfaces) out.push(K.group('Computation accuracy', K.seg([['fast', 'Fast'], ['fine', 'Fine']], st.quality, v => { st.quality = v; A.update(); A.renderPanel(); })));
    return out;
  };

  // Animation: movable objects and paths
  A.animTargets = function (c) {
    const t = [], m = c.m, st = c.st;
    // In the 2D view the slice position determines the field lines and equipotential lines drawn, so the slice can be swept even when equipotential lines are off
    if (st.layers.contours || st.view === '2d') t.push(['slice', 'Slice (back and forth)']);
    if (c.probeVisible && c.probe.path) t.push(['path', 'Probe (along the model path ' + c.probe.path.label + ')']);
    else if (c.probeVisible && c.probe.free) t.push(['probe', 'Probe P']);
    if (m.editor && (m.id === 1 || m.id === 7)) c.sources.forEach((s, i) => { if (!(st.custom && st.custom[i] && st.custom[i].bind)) t.push(['src' + i, 'Source charge ' + s.label]); });
    for (const q of A.sweepParams(c)) t.push(['par:' + q.key, 'Parameter sweep: ' + q.label.replace(/<[^>]+>/g, '')]);
    return t;
  };
  // Model parameters that can be swept: numeric parameters visible in the panel and unrelated to the probe
  A.sweepParams = function (c) {
    const m = c.m, st = c.st, free = (m.probe && m.probe.free) || [];
    return m.params.filter(q => !q.probe && !free.includes(q.key) && (!q.sub || q.sub === st.sub) && (!q.show || q.show(st.p, st)) && !(q.hideCustom && st.custom) && q.max > q.min);
  };
  A.pAnim = function (c) {
    const a = c.st.anim, T = A.animTargets(c);
    if (!T.length) return [K.note('Open the probe or the cross-section equipotential lines to set up an animation.')];
    if (!T.some(x => x[0] === a.target)) { A.stopAnim(); a.target = T[0][0]; }
    const freeMotion = /^(probe|src)/.test(a.target), running = a.on, paused = !a.on && a.paused;
    // Control row: start (or resume) / pause, stop and reset, clear trails; three equal-width buttons in one row
    const ctlRow = h('div.btns.anim-ctl', { style: 'display:grid;grid-template-columns:repeat(3,1fr);align-items:stretch' },
      K.btn(running ? '⏸ Pause animation' : paused ? '⏵ Resume animation' : '⏵ Play animation', () => A.toggleAnim(running ? null : a.target), 'primary'),
      Object.assign(K.btn('⏹ Stop animation', () => A.resetAnim(), '', 'Stop the animation and return to the configuration before the start'), { disabled: !running && !paused }),
      K.btn('Clear trails', () => { const s = c.st; s.trail = []; s.eTrail = []; s.sliceTrail = []; A.update(); }));
    return [K.group('Animation settings',
      K.select('Moving object', T, a.target, v => { A.stopAnim(); a.target = v; A.renderPanel(); }),
      freeMotion ? K.select('Path', [['x', 'Back and forth along x'], ['xy', 'Circle in the xy plane'], ['xz', 'Circle in the xz plane']], a.path, v => { A.stopAnim(); a.path = v; }) : null,
      freeMotion ? K.slider({ label: 'Amplitude / L', min: 0.1, max: 4, step: 0.1, val: a.r, on: v => { a.r = v; } }) : null,
      // Keep the current phase when the period changes, so the animation does not jump
      K.slider({ label: 'Period T / s', min: 3, max: 60, step: 1, val: a.period, on: v => { if (a.on) { const now = performance.now(); a.t0 = now - (now - a.t0) * v / a.period; } else if (a.paused) a.elapsed *= v / a.period; a.period = v; } }),
      ctlRow,
      K.check('Show position trail', a.trail, v => { a.trail = v; A.update(); }), K.check('Show field arrow trail', a.eTrail, v => { a.eTrail = v; A.update(); }),
      K.check('Show equipotential line trail', a.sliceTrail, v => { a.sliceTrail = v; A.update(); })),
    K.tip('The animation steps through a series of electrostatic configurations. It does not show charged particles moving. After pausing, you can resume; after stopping, the configuration before the start is restored.')];
  };

  A.pComp = function (c) {
    const st = c.st, cp = st.comp, parts = c.F.parts(c.probe.pos).filter(x => x.q);
    if (!c.probeVisible) return [K.btn('Open probe', () => A.progress(3), 'primary')];
    if (!parts.every(x => x.E.every(isFinite))) return [K.note('The probe is inside the excluded neighborhood of a source charge, so the component fields cannot be combined.')];
    cp.visible = cp.visible || parts.map(x => x.i);
    const re = () => { A.update(); A.renderComp(); };
    // Start the field-synthesis guide with the component fields checked in the Show column (same as "Start synthesis" in the guide)
    const startBtn = h('div.btns', null, K.btn(st.wiz.on ? 'Exit synthesis guide' : 'Start synthesis', () => {
      if (st.wiz.on) { A.stopWizard(); A.renderComp(); return; }
      const sel = cp.visible.filter(i => parts.some(x => x.i === i));
      A.startWizard(null, sel.length === parts.length ? null : sel);
      if (A.renderWizBox) A.renderWizBox();
      A.renderComp();
    }, 'primary', 'Combine step by step below the canvas, using the component fields checked in the Show column'));
    const out = [startBtn, K.check('Show component fields', cp.show, v => { cp.show = v; A.update(); }),
      K.seg([['para', 'Parallelogram rule'], ['tri', 'Triangle rule'], ['chain', 'Tip-to-tail']], cp.method, v => { cp.method = v; cp.show = true; re(); })];
    out.push(h('table.src', null, h('thead', null, h('tr', null, ...['Show', 'Component field', '|E_i|', 'Direction', 'Pair', 'Group'].map(t => h('th', { html: U.rich(t) })))),
      h('tbody', null, parts.map(x => h('tr', null,
        h('td', null, K.check('', cp.visible.includes(x.i), v => { cp.visible = v ? cp.visible.concat(x.i) : cp.visible.filter(i => i !== x.i); A.update(); })),
        h('td', { html: U.rich('E_' + x.label) }), h('td', null, EL.VA.cell(V.len(x.E))), h('td', null, U.fmtVec(V.norm(x.E), 3)),
        h('td', null, h('input', { type: 'checkbox', 'aria-label': 'Include E' + x.label + ' in the pairwise sum', checked: cp.pick.includes(x.i), onchange: e => { cp.pick = e.target.checked ? cp.pick.concat(x.i).slice(-2) : cp.pick.filter(i => i !== x.i); cp.show = true; re(); } })),
        h('td', null, h('select', { 'aria-label': 'Group for E' + x.label, onchange: e => { cp.groups[x.i] = +e.target.value || 0; cp.show = true; re(); } },
          ...[[0, '—'], [1, 'Σ₁'], [2, 'Σ₂']].map(([v, t]) => h('option', { value: v, selected: (cp.groups[x.i] || 0) === v }, t)))))))));
    // Groups: first combine partial sums by symmetry, then combine the total field
    const g = [1, 2].map(gi => parts.filter(x => cp.groups[x.i] === gi));
    if (g[0].length && g[1].length) {
      const s1 = g[0].reduce((a, x) => V.add(a, x.E), [0, 0, 0]), s2 = g[1].reduce((a, x) => V.add(a, x.E), [0, 0, 0]);
      const th = Math.acos(U.clamp(V.dot(s1, s2) / (V.len(s1) * V.len(s2)), -1, 1)) * 180 / Math.PI;
      out.push(K.group('Grouped partial sums',
        h('p', null, 'Σ₁ = ' + g[0].map(x => 'E' + x.label).join('+') + '，|Σ₁| = ' + EL.VA.cell(V.len(s1))),
        h('p', null, 'Σ₂ = ' + g[1].map(x => 'E' + x.label).join('+') + '，|Σ₂| = ' + EL.VA.cell(V.len(s2))),
        h('p', null, 'The angle between Σ₁ and Σ₂ is ' + U.fmt(th, 4) + '°' + (Math.abs(th - 90) < 0.05 ? ', so they are perpendicular.' : '.'))));
    } else out.push(K.tip('In the Group column, put symmetric component fields into Σ₁ and Σ₂. Find the partial sum of each group, then combine them.', 'ⓘ Grouped sum'));
    const pick = cp.pick.map(i => parts.find(x => x.i === i)).filter(Boolean);
    if (pick.length === 2) {
      const a = pick[0].E, b = pick[1].E, la = V.len(a), lb = V.len(b), cs = U.clamp(V.dot(a, b) / (la * lb), -1, 1), deg = Math.acos(cs) * 180 / Math.PI;
      const ex = K.exactTrig(deg), m2 = la * la + lb * lb + 2 * la * lb * cs, n = V.cross(a, b);
      const others = parts.filter(x => !pick.includes(x)).map(x => 'E' + x.label + ' makes an angle with that plane of ' + U.fmt(Math.asin(U.clamp(Math.abs(V.dot(V.norm(x.E), V.norm(n))), 0, 1)) * 180 / Math.PI, 3) + '°');
      out.push(K.group('Pairwise sum: E' + pick[0].label + ' and E' + pick[1].label,
        K.check('Show their plane', cp.plane, v => { cp.plane = v; A.update(); }),
        V.len(n) > 1e-12 ? K.btn('View plane head-on', () => A.alignView(n), 'mini') : null,
        others.length && V.len(n) > 1e-12 ? h('p.note', null, others.join('; ') + ' (an angle of 0° means coplanar).') : null,
        h('p', null, 'Angle θ = ' + U.fmt(deg, 4) + '°'),
        h('p', null, 'cos θ = ' + (ex ? ex.cos + ' (exact)' : U.fmt(cs, 4) + ' (approximate)') + ', sin θ = ' + (ex ? ex.sin : U.fmt(Math.sin(deg * Math.PI / 180), 4))),
        h('div.formula', { html: EL.texBlock(String.raw`|\vec E_1+\vec E_2|^2=E_1^2+E_2^2+2E_1E_2\cos\theta`) }),
        h('p', null, '|E' + pick[0].label + '+E' + pick[1].label + '| = √' + U.fmt(m2, 5) + ' = ' + EL.VA.cell(Math.sqrt(m2)) + ' kQ/L²')));
    } else out.push(K.note('Check two component fields in the Pair column to see their sum.'));
    const tot = parts.reduce((s, x) => V.add(s, x.E), [0, 0, 0]);
    out.push(K.group('Net field', K.check('Show net field E net', cp.total, v => { cp.total = v; cp.show = true; A.update(); }),
      h('p', null, 'E net = ' + U.fmtVec(tot, 4) + ', |E net| = ' + EL.VA.cell(V.len(tot)) + ' kQ/L²')));
    return out;
  };

  A.bgEditor = function (c) {
    const st = c.st, bgs = st.hidden.bgs, G = EL.GEO;
    let type = 'cube';
    const list = bgs.map((s, bi) => {
      const b = G.build(s), dim = G.TYPES[s.type].dim;
      let sp = 0, q = 1;
      const upd = (k, v) => { s[k] = v; A.update(); };
      return h('div.bg', null, h('div.bg-h', null, h('b', null, (bi + 1) + '. ' + G.TYPES[s.type].name),
        K.btn('Show special points', () => { st.showSpecial = st.showSpecial === bi ? -1 : bi; A.update(); }, 'mini', 'Show or hide the special points of this background'),
        K.btn('Delete background', () => { bgs.splice(bi, 1); st.custom.forEach(x => { if (x.bind) { if (x.bind.bg === bi) { x.bind = null; } else if (x.bind.bg > bi) x.bind.bg--; } }); A.update(); A.renderPanel(); }, 'mini')),
        h('div.row.wrap', null, ...[['w', s.type === 'circle' || s.type === 'sphere' ? 'Diameter' : 'Width'], ['l', 'Length'], ['h', 'Height'], ['x', 'x'], ['y', 'y'], ['z', 'z']]
          .filter(([k]) => !(k === 'l' && !['rect', 'triangle', 'pyramid', 'prism'].includes(s.type)) && !(k === 'h' && !['pyramid', 'prism'].includes(s.type)))
          .map(([k, n]) => h('label.mini', null, n, K.cell(s[k], 0.1, v => { upd(k, k === 'w' || k === 'l' || k === 'h' ? Math.max(0.1, v) : v); A.renderPanel(); }, 3.4)))),
        h('div.row.wrap', null, K.select('', b.special.map((x, i) => [i, x.name]), 0, v => { sp = +v; }), h('label.mini', null, 'q', K.cell(1, 0.1, v => { q = v; }, 3)),
          K.btn('Place charge at special point', () => {
            if (st.custom.length >= 16) return U.toast('You can place at most 16 point charges.');
            const x = b.special[sp];
            st.custom.push({ p: x.p.slice(), q, label: 'Q' + (st.custom.length + 1), bind: { bg: bi, key: x.key } });
            A.update(); A.renderPanel();
          }, 'mini')),
        dim === 2 ? h('p.note', null, 'This planar figure lies in the plane z = ' + (s.z || 0) + '.') : null);
    });
    return K.group('Geometry background',
      h('div.row', null, K.select('', Object.keys(G.TYPES).map(k => [k, G.TYPES[k].name]), type, v => { type = v; }),
        K.btn('Add background', () => { bgs.push({ type, w: 4, l: 3, h: 3, x: 0, y: 0, z: 0 }); st.layers.geom = true; A.update(); A.renderPanel(); })),
      ...list, K.tip('Geometry backgrounds are for reference only. Charges bound to special points move with the background.'));
  };
})(window.EL);
