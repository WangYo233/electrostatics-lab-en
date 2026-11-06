'use strict';
// Right-hand tool panels: parameters, display, style
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, A = EL.App, V = EL.V;

  // Left toolbar: categories "modeling → display → style → animation", only one open at a time
  const IC = {
    params: '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4M7 5v4M7 15v4M17 5v4M17 15v4"/></svg>',
    display: '<svg viewBox="0 0 24 24"><path d="M3 12c3-5 6-7 9-7s6 2 9 7c-3 5-6 7-9 7s-6-2-9-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    style: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 3-2 3-5a9 9 0 0 0-9-7z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="11" cy="7" r="1.2"/><circle cx="16" cy="8.5" r="1.2"/></svg>',
    anim: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></svg>'
  };
  A.TABS = [['params', 'Model', 'Model and parameters'], ['display', 'Display', 'Display'], ['style', 'Style', 'Style and effects'], ['anim', 'Animation', 'Animation settings']];
  A.tab = 'params';

  A.renderPanel = function () {
    const c = A.c;
    U.$('#rail').replaceChildren(...A.TABS.map(t => {
      const b = h('button', { type: 'button', class: A.tab === t[0] && !A.drawerOff ? 'on' : '', title: t[2], 'aria-pressed': A.tab === t[0] && !A.drawerOff, onclick: () => {
        if (A.tab === t[0] && !A.drawerOff) A.drawerOff = true; else { A.tab = t[0]; A.drawerOff = false; }
        document.body.classList.toggle('drawer-off', !!A.drawerOff); A.renderPanel();
      } });
      b.innerHTML = IC[t[0]] + '<span>' + t[1] + '</span>' + (t[0] === 'anim' && c.st.anim.on ? '<i class="dot"></i>' : '');
      return b;
    }));
    U.$('#drawerTitle').textContent = A.TABS.find(t => t[0] === A.tab)[2];
    const f = { params: A.pParams, display: A.pDisplay, style: A.pStyle, anim: A.pAnim }[A.tab];
    U.$('#panel').replaceChildren(...[].concat(f(c)).filter(Boolean));
    A.renderComp();
  };
  // Vector synthesis is in the Analyze workspace
  A.renderComp = function () {
    const c = A.c, box = U.$('#compBox');
    box.hidden = !A.canCompose(c);
    if (!box.hidden && document.body.dataset.mode === 'analyze') U.$('#comp').replaceChildren(...[].concat(A.pComp(c)).filter(Boolean));
  };
  A.canCompose = c => !c.m.analytic && !!c.probe && c.sources.filter(s => s.q).length > 1;
  // Whether the model really has a probe (the disk model has probe {free:null}, so it has none)
  A.hasProbe = m => !!m.probe && !!(m.probe.free || m.probe.path || m.probe.pathFn || m.probe.fixedFn);

  // Parameter change: only redraw while dragging; after release, rebuild the panel if control visibility is affected
  A.onParam = function (key, v, live) {
    const st = A.st;
    st.p[key] = v;
    A.update();
    if (!live) { if (st.model.params.some(q => q.show)) A.renderPanel(); else A.renderComp(); }
  };

  A.pParams = function (c) {
    const st = c.st, m = c.m, out = [];
    if (m.analytic) {
      out.push(K.group('Model settings',
        K.select('Analytic model', Object.keys(m.subs).map(k => [k, m.subs[k].cat + ' · ' + m.subs[k].name]), st.sub, v => { st.sub = v; A.onModelChange(); }),
        ...m.params.filter(q => q.sub === st.sub).map(q => K.slider(Object.assign({}, q, { val: st.p[q.key], on: (v, l) => A.onParam(q.key, v, l) }))),
        h('div.btns', null,
          K.btn('Flip source sign', () => { const s = m.subs[st.sub]; const k = st.sub + ':' + s.params.find(q => /^(q|lambda|sigma|D|E0)$/.test(q.key)).key; st.p[k] = -st.p[k]; A.update(); A.renderPanel(); }, '', 'Reverse the sign of the source charge or the external field'),
          K.btn('Restore default parameters', () => { for (const q of m.params.filter(q => q.sub === st.sub)) st.p[q.key] = q.val; A.update(); A.renderPanel(); }))));
    }
    // Probe-related controls (probe coordinates, path parameter, test charge, custom probe) appear only after the probe is opened
    const probeKeys = ((m.probe && m.probe.free) || []).concat(m.params.filter(q => q.probe).map(q => q.key));
    const probeOn = c.probeVisible || (!!c.probe && st.layers.probe);
    const sliders = m.params.filter(q => !q.sub && (!q.show || q.show(st.p, st)) && !(q.hideCustom && st.custom));
    const main = sliders.filter(q => !probeKeys.includes(q.key)), pr = sliders.filter(q => probeKeys.includes(q.key));
    const togs = (m.toggles || []).filter(t => !t.probe), ptogs = (m.toggles || []).filter(t => t.probe);
    if (main.length) out.push(K.group(m.analytic ? 'View range' : 'Model parameters', ...main.map(q => K.slider(Object.assign({}, q, { val: st.p[q.key], on: (v, l) => A.onParam(q.key, v, l) })))));
    if (togs.length) out.push(K.group('Model options', ...togs.map(t => K.check(t.label, st.p[t.key], v => { st.p[t.key] = v; A.update(); A.renderPanel(); }))));
    if (m.editor) out.push(A.sourceEditor(c));
    if (m.id === 7) out.push(A.bgEditor(c));
    if (A.hasProbe(m) && (pr.length || ptogs.length || m.probe.free)) {
      if (!probeOn) out.push(K.group('Probe (field point)', K.btn('Open probe', () => { st.layers.probe = true; A.update(); A.renderPanel(); A.renderStageBar(); }, 'primary')));
      else {
        const kp = A.keyPoints(c).filter(x => x.p);
        out.push(K.group('Probe (field point)',
          ...ptogs.map(t => K.check(t.label, st.p[t.key], v => { st.p[t.key] = v; A.update(); A.renderPanel(); })),
          ...pr.map(q => K.slider(Object.assign({}, q, { val: +(+st.p[q.key]).toFixed(3), on: (v, l) => A.onParam(q.key, v, l) }))),
          c.probe && c.probe.free && kp.length ? h('div.row.wrap', null, K.select('Move probe to a key point', [['', 'Select a key point…']].concat(kp.map((x, i) => [i, x.name])), '', v => {
            if (v === '') return;
            const q = kp[+v].p; c.probe.free.forEach((k, i) => { st.p[k] = +q[i].toFixed(4); }); A.update(); A.renderPanel();
          })) : null,
          K.slider({ label: 'Field-vector display scale', min: 0.25, max: 4, step: 0.05, val: st.style.probeVec || 1, tip: 'Changes only the displayed length of the field arrows at the probe and of the synthesis drawing; the readings are unchanged.', on: v => { st.style.probeVec = v; A.update(); } }),
          K.note('You can also drag the probe on the canvas.')));
      }
    }
    return out;
  };
  // Key points of the model: used for "move to key point" and annotations
  A.keyPoints = function (c) {
    const m = c.m, pts = m.keyPts ? m.keyPts(c.p, c) : [];
    return pts.concat(c.sources.filter(s => s.q).map(s => ({ name: 'Near source charge ' + s.label + ' (offset 0.5 L along x)', p: V.add(s.p, [0.5, 0, 0]) })));
  };

  A.sourceEditor = function (c) {
    const st = c.st, m = c.m, ed = m.editor;
    const rows = c.sources.map((s, i) => {
      const cs = st.custom && st.custom[i];
      const edit = (fn) => { A.ensureCustom(c); fn(st.custom[i]); A.update(); A.renderPanel(); };
      return h('tr', null, h('td', null, s.label),
        h('td', null, K.cell(s.q, 0.1, v => edit(x => { x.q = U.clamp(v, ed.qRange[0], ed.qRange[1]); }))),
        ...[0, 1, 2].map(k => h('td', null, cs && cs.bind ? h('span.muted', null, U.fmt(s.p[k], 3)) : K.cell(+s.p[k].toFixed(3), 0.1, v => edit(x => { x.p[k] = U.clamp(v, -ed.xyz, ed.xyz); x.bind = null; })))),
        h('td', null, cs && cs.bind ? K.btn('Unbind', () => edit(x => { x.p = s.p.slice(); x.bind = null; }), 'mini', 'Remove the binding to the background special point and use free coordinates') : null));
    });
    const kids = [h('table.src', null, h('thead', null, h('tr', null, ...['Source charge', 'q', 'x', 'y', 'z', ''].map(t => h('th', null, t)))), h('tbody', null, rows))];
    kids.push(h('p.note', null, st.custom || m.alwaysCustom ? 'Custom configuration: you can place up to ' + ed.max + ' source charges and drag them on the canvas.' : 'Standard configuration. Changing any charge switches to a custom configuration.'));
    const btns = [K.btn('Add charge', () => {
      A.ensureCustom(c);
      if (st.custom.length >= ed.max) return U.toast('You can place at most ' + ed.max + ' source charges.');
      st.custom.push({ p: [0, 0, 0], q: 1, label: 'Q' + (st.custom.length + 1) });
      A.update(); A.renderPanel();
    }), K.btn('Delete last charge', () => { A.ensureCustom(c); if (st.custom.length > 1) st.custom.pop(); A.update(); A.renderPanel(); })];
    if (!m.alwaysCustom) btns.push(K.btn('Restore standard configuration', () => { st.custom = null; A.update(); A.renderPanel(); }));
    kids.push(h('div.btns', null, btns));
    if (ed.placements) {
      const pl = ed.placements(st.p);
      let sel = 0, q = 1;
      kids.push(h('div.place', null, K.select('Placement', pl.map((x, i) => [i, x.name]), 0, v => { sel = +v; }),
        h('div.row', null, h('label', null, 'q'), K.cell(1, 0.1, v => { q = v; }), K.btn('Add charge here', () => {
          A.ensureCustom(c);
          if (st.custom.length >= ed.max) return U.toast('You can place at most ' + ed.max + ' source charges.');
          st.custom.push({ p: pl[sel].p.map(x => +x.toFixed(4)), q: U.clamp(q, ed.qRange[0], ed.qRange[1]), label: 'Q' + (st.custom.length + 1) });
          A.update(); A.renderPanel();
        }))));
    }
    return K.group('Source charges', ...kids);
  };

  // Style: theme, model colors, labels, lines and opacity, effects
  A.COLOR_ROLES = [['pos', 'Positive charges and positive potential levels'], ['neg', 'Negative charges and negative potential levels'], ['zero', 'Zero-potential level'], ['field', 'Field lines'], ['flow', 'Flow particles'], ['probe', 'Probe'], ['geom', 'Geometry background'], ['part', 'Partial-sum vectors'], ['ang', 'Angle labels']];
  A.pStyle = function (c) {
    const st = c.st, s = st.style, L = st.layers, lb = st.labels, set = (k, v) => { s[k] = v; A.update(); };
    const sl = (k, label, min, max, step) => K.slider({ label, min, max, step, val: s[k], on: v => set(k, v) });
    const sw = k => {
      const T = EL.THEMES[k], dot = (col, x) => h('i', { style: 'left:' + x + 'px;background:' + U.rgb(col) });
      return h('button', { type: 'button', class: 'swatch' + (EL.theme === k ? ' on' : ''), 'aria-pressed': EL.theme === k, onclick: () => A.setTheme(k) },
        h('div.sw-v', { style: 'background:' + T.bgCss }, dot(T.pos, 12), dot(T.neg, 32), dot(T.probe, 52), dot(T.zero, 72)), h('span', null, T.name));
    };
    const ov = U.store.get('colors:' + EL.theme, {});
    const colors = h('div.colors', null, A.COLOR_ROLES.map(([k, n]) => {
      const inp = h('input', { type: 'color', value: U.toHex(EL.C[k]), 'aria-label': n });
      inp.addEventListener('input', () => { ov[k] = inp.value; U.store.set('colors:' + EL.theme, ov); A.applyColors(); A.update(); });
      return h('label.color', null, inp, h('span', null, n));
    }));
    const notes = st.notes.map((nt, i) => h('div.row.wrap', null, h('span.note-dot'), h('span', null, nt.text + ' (' + U.fmtVec(nt.p, 3) + ')'),
      K.btn('Delete label', () => { st.notes.splice(i, 1); A.update(); A.renderPanel(); }, 'mini')));
    let nText = '';
    const nInput = h('input.cell', { type: 'text', placeholder: 'Label text, such as "strongest field"', style: 'width:100%', oninput: e => { nText = e.target.value; } });
    return [
      K.group('Canvas theme', h('div.swatches', null, sw('dark'), sw('light')),
        K.tip('Colorblind-friendly palette: positive is orange "+", negative is blue "−". The light theme suits projection and printing.')),
      K.group('Model colors', colors, h('div.btns', null, K.btn('Restore default colors', () => { U.store.del('colors:' + EL.theme); A.applyColors(); A.update(); A.renderPanel(); }, 'mini')),
        K.tip('Changes apply to the current theme only.')),
      K.group('Label text',
        K.check('Show charge labels', lb.charges, v => { lb.charges = v; A.update(); }),
        K.check('Show key point labels', lb.points, v => { lb.points = v; A.update(); }),
        L.contours ? K.check('Show equipotential level values', lb.levels, v => { lb.levels = v; A.update(); }) : null,
        K.check('Show vector labels', lb.vectors, v => { lb.vectors = v; A.update(); }),
        K.check('Show angle labels', lb.angles, v => { lb.angles = v; A.update(); }),
        K.check('Show axis labels', lb.axes, v => { lb.axes = v; A.update(); }),
        K.slider({ label: 'Label size', min: 0.8, max: 1.8, step: 0.05, val: lb.scale, on: v => { lb.scale = v; A.applyLabelScale(); } })),
      K.group('Annotations', nInput,
        h('div.btns', null, K.btn('Label at probe', () => {
          if (!c.probe || !c.probeVisible) return U.toast('Open the probe first.');
          st.notes.push({ p: c.probe.pos.slice(), text: nText.trim() || 'Label ' + (st.notes.length + 1) }); A.update(); A.renderPanel();
        }, 'primary')), ...notes),
      K.group('Lines and markers',
        L.lines ? sl('lineWidth', 'Field line width', 1, 5, 0.1) : null,
        sl('vecScale', 'Vector display scale', 0.2, 2.5, 0.05), sl('chargeSize', 'Charge marker size', 2, 8, 0.5), sl('chargeOpacity', 'Charge marker opacity', 0.2, 1, 0.05),
        L.surfaces && st.view === '3d' ? sl('surfOpacity', 'Equipotential surface opacity', 0.05, 0.6, 0.01) : null,
        L.geom && c.m.id !== 1 && c.m.id !== 2 ? sl('geomOpacity', 'Geometry background opacity', 0.02, 0.5, 0.01) : null,
        K.check('Show axes', s.axes, v => set('axes', v)), K.check('Show ground grid', s.grid, v => set('grid', v)),
        K.tip('Arrow lengths are compressed. Compare magnitudes using the readings.')),
      K.group('Effects',
        K.check('Show charge glow', A.r.fx.glow, v => A.setFx('glow', v)),
        K.check('Animate field line drawing', A.r.fx.reveal, v => A.setFx('reveal', v)),
        K.note('Turn flow particles on or off in the Display panel.'))];
  };
  A.setFx = function (k, v) { const fx = A.r.fx; fx[k] = v; U.store.set('fx', fx); A.update(); A.renderPanel(); };
  // Custom colors apply to the current theme
  A.applyColors = function () {
    EL.setTheme(EL.theme);
    const ov = U.store.get('colors:' + EL.theme, {});
    for (const k in ov) EL.C[k] = U.hex(ov[k]);
    A.renderLegend && A.renderLegend();
  };
  A.applyLabelScale = function () { U.$('#labels').style.setProperty('--lbl', A.st.labels.scale); };
})(window.EL);
