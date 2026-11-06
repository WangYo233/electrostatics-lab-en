'use strict';
// Application state and computation context
(function (EL) {
  const V = EL.V, U = EL.U;
  const A = EL.App = {};

  A.defaultStyle = () => ({ lineWidth: 1.2, vecScale: 1, chargeOpacity: 1, chargeSize: 4, surfOpacity: 0.24, geomOpacity: 0.13, surfOpacity2: 0.28, axes: true, grid: false, probeVec: 1 });
  A.LAYERS = [
    ['charges', 'Charges'], ['geom', 'Geometry background'], ['lines', 'Field lines'], ['flow', 'Flow particles'], ['contours', 'Cross-section equipotential lines'], ['surfaces', 'Equipotential surfaces (3D only)'],
    ['surfLabels', 'Potential values on surfaces'], ['probe', 'Probe (field point)'], ['vectors', 'Field vector sampling'], ['frame', 'View frame']
  ];

  A.init = function (m) {
    const st = A.st = {
      model: m, stage: 0, p: {}, hidden: JSON.parse(JSON.stringify(m.hidden || {})), sub: m.sub || null,
      custom: null, view: m.view, plane: (m.display && m.display.plane) || 'xy', planePos: 0,
      layers: Object.assign({ charges: true, geom: true, lines: false, flow: false, contours: false, surfaces: false, surfLabels: false, probe: false, vectors: false, frame: false },
        m.defaultLayers || {}),
      level: 0, spacing: 0.3, count: 1, seeds: m.view === '2d' ? 8 : 12, quality: 'fast',
      style: A.defaultStyle(), anim: { on: false, target: 'probe', path: 'x', r: 1, period: 12, trail: true, eTrail: false, sliceTrail: false, t: 0 },
      comp: { show: false, pick: [], method: 'para', total: false, groups: {}, plane: false }, showSpecial: -1, trail: [], eTrail: [], sliceTrail: [],
      cs: 0, answers: {},
      // Labels: switches for each kind of label, user annotation points
      labels: { charges: true, points: true, levels: true, axes: true, vectors: true, angles: true, scale: 1 },
      notes: [],
      // Geometry helpers: probe–source lines and distances, source–source lines, angle between two source directions
      geo: { probeLines: false, srcLines: false, angle: [] },
      // Field-synthesis guide
      wiz: { on: false, i: 0, ans: {}, hide: true }
    };
    for (const q of m.params) st.p[q.key] = q.val;
    for (const t of m.toggles || []) st.p[t.key] = t.val;
    Object.assign(st, m.display || {});
    if (m.initialSources) st.custom = m.initialSources.map((s, i) => ({ p: s.p.slice(), q: s.q, label: 'Q' + (i + 1) }));
    return st;
  };

  // Apply a teaching stage: parameter presets, view, and display layers
  A.applyStage = function (i, keepLayers) {
    const st = A.st, m = st.model, s = m.stages[i];
    st.stage = i;
    if (s.preset) { Object.assign(st.p, s.preset); if (!m.alwaysCustom) st.custom = null; }
    if (s.display) Object.assign(st, s.display);
    if (s.view) st.view = s.view;
    else if (m.stages.some(x => x.view)) st.view = m.view;
    if (s.layers) Object.assign(st.layers, s.layers);
    if (!keepLayers && m.id !== 7 && m.id !== 8) {
      st.layers.surfaces = false;
    }
    st.trail = []; st.eTrail = []; st.sliceTrail = [];
    if (st.wiz) st.wiz.on = false;
  };

  // ---- Undo / Redo ----
  // Records the serializable model state (parameters, switches, display layers, source charges, probe position, stage, appearance, labels). The camera view, animation trails and the answer progress of the synthesis guide are not recorded.
  // Commit timing: after A.update, merged at the end of the same event round; nothing is committed while a handle is dragged, an animation plays, or a slider is held (input events), and one commit is made on release (change).
  A.HIST_MAX = 100;
  A.hist = { u: [], r: [], cur: null, hold: false, t: 0 };
  const ANIM_KEYS = ['target', 'path', 'r', 'period', 'trail', 'eTrail', 'sliceTrail'];
  A.histState = function () {
    const st = A.st, an = {};
    for (const k of ANIM_KEYS) an[k] = st.anim[k];
    return JSON.stringify({ stage: st.stage, sub: st.sub, p: st.p, hidden: st.hidden, custom: st.custom, view: st.view, plane: st.plane, planePos: st.planePos,
      layers: st.layers, level: st.level, spacing: st.spacing, count: st.count, seeds: st.seeds, quality: st.quality, probeLevel: !!st.probeLevel, vecN: st.vecN || null,
      showSpecial: st.showSpecial, style: st.style, labels: st.labels, notes: st.notes, geo: st.geo, anim: an,
      comp: { show: st.comp.show, pick: st.comp.pick, method: st.comp.method, total: st.comp.total, groups: st.comp.groups, plane: st.comp.plane }, theme: EL.theme,
      colors: U.store.get('colors:' + EL.theme, {}) });
  };
  A.histReset = function () { const H = A.hist; H.u = []; H.r = []; H.cur = A.st ? A.histState() : null; A.histUI(); };
  A.histCommit = function () {
    const H = A.hist;
    if (!A.st || H.hold || A.dragging || A.st.anim.on) return;
    const s = A.histState();
    if (H.cur == null) { H.cur = s; return; }
    if (s === H.cur) return;
    H.u.push(H.cur); if (H.u.length > A.HIST_MAX) H.u.shift();
    H.r = []; H.cur = s;
    A.histUI();
  };
  // Several A.update calls within one action record only one step
  A.histSoon = function () { const H = A.hist; if (H.t) return; H.t = setTimeout(() => { H.t = 0; A.histCommit(); }, 0); };
  A.histApply = function (json) {
    const st = A.st, d = JSON.parse(json), H = A.hist;
    if (st.anim.on) { st.anim.on = false; cancelAnimationFrame(A.raf); }
    H.cur = json;                          // Set the current state first: A.update calls during the restore will not record another step
    const sub0 = st.sub, view0 = st.view, stage0 = st.stage;
    for (const k of ['stage', 'sub', 'hidden', 'custom', 'view', 'plane', 'planePos', 'level', 'spacing', 'count', 'seeds', 'quality', 'probeLevel', 'showSpecial', 'notes']) st[k] = d[k];
    if (d.vecN) st.vecN = d.vecN; else delete st.vecN;
    for (const k of Object.keys(st.p)) delete st.p[k];
    Object.assign(st.p, d.p);
    for (const k of ['layers', 'style', 'labels', 'geo', 'anim', 'comp']) Object.assign(st[k], d[k]);
    st.trail = []; st.eTrail = []; st.sliceTrail = [];
    if (st.stage !== stage0 || !st.layers.probe) st.wiz.on = false;
    if (d.theme && d.theme !== EL.theme && A.setTheme) A.setTheme(d.theme);
    if (d.colors && JSON.stringify(d.colors) !== JSON.stringify(U.store.get('colors:' + EL.theme, {}))) {
      if (Object.keys(d.colors).length) U.store.set('colors:' + EL.theme, d.colors); else U.store.del('colors:' + EL.theme);
      A.applyColors();
    }
    if (st.sub !== sub0) { A.cache.clear(); A.renderTheory(); A.renderExercises(); }
    A.applyLabelScale();
    A.update();
    if (st.view !== view0 || st.stage !== stage0) { A.resetCamera(); A.update(); }
    A.renderStage(); A.renderPanel(); A.renderCaption(true); A.renderDerive();
    if (document.body.dataset.mode === 'analyze') { A.renderReadings(A.c); A.renderCurves(A.c); A.renderWizBox(); A.renderGeo(); A.renderComp(); }
    A.r.draw();
    // Take the actual restored state as the current state and cancel commits queued during the restore, so no extra step is recorded and Redo is not cleared
    if (H.t) { clearTimeout(H.t); H.t = 0; }
    H.cur = A.histState();
    A.histUI();
  };
  // Before undoing, commit any change not yet recorded (e.g. a number just typed), so the most recent step is the one undone
  A.histFlush = function () { const H = A.hist; if (H.t) { clearTimeout(H.t); H.t = 0; } H.hold = false; A.histCommit(); };
  A.undo = function () { const H = A.hist; if (!A.st) return; A.histFlush(); if (!H.u.length) return; H.r.push(H.cur); A.histApply(H.u.pop()); U.toast('Undid the last action.'); };
  A.redo = function () { const H = A.hist; if (!A.st) return; A.histFlush(); if (!H.r.length) return; H.u.push(H.cur); A.histApply(H.r.pop()); U.toast('Redid the undone action.'); };
  A.histUI = function () {
    const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
    if (u) { u.disabled = !A.hist.u.length; u.setAttribute('aria-label', 'Undo (' + A.hist.u.length + ' available)'); }
    if (r) { r.disabled = !A.hist.r.length; r.setAttribute('aria-label', 'Redo (' + A.hist.r.length + ' available)'); }
  };
  A.initHistory = function () {
    const H = A.hist, slow = t => t && (t.type === 'range' || t.type === 'color');
    // Nothing is committed while a slider is held or a color picker is dragged (input events); one commit is made on release (change event). Runs in the capture phase, before the control's own handler
    document.addEventListener('input', e => { if (slow(e.target)) H.hold = true; }, true);
    document.addEventListener('change', e => { if (slow(e.target)) H.hold = false; }, true);
    // A few controls (e.g. label font size) do not call A.update after a change: add a commit in the bubble phase (no step is recorded if the state is unchanged)
    document.addEventListener('change', () => A.histSoon());
    document.addEventListener('click', () => A.histSoon());
    document.addEventListener('pointerup', () => { if (H.hold) setTimeout(() => { H.hold = false; A.histSoon(); }, 0); }, true);
    const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
    if (u) u.addEventListener('click', A.undo);
    if (r) r.addEventListener('click', A.redo);
    document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target, k = e.key.toLowerCase();
      // Text and number inputs keep the browser's own undo
      if (t && (t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|color|button)$/.test(t.type)))) return;
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); A.undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); A.redo(); }
    });
    if (H.t) { clearTimeout(H.t); H.t = 0; }
    A.histReset();
  };

  // ---- Splitters: drag to resize the drawer, the inspector and the contents column of the theory page ----
  // Widths are saved per workspace in U.store('split:<workspace>'); double-click restores the default; once focused, the arrow keys adjust the width (Shift for a larger step), and Home / End go to the minimum / maximum
  const SPLIT = {
    drawer: { name: 'tool panel', min: 220, max: 520, def: () => 300, cssVar: '--drawer-u', grow: 1 },
    insp: { name: 'inspector', min: 260, max: 760, def: m => ({ analyze: 420, record: 560 })[m] || 320, cssVar: '--insp-u', grow: -1 },
    side: { name: 'contents column', min: 240, max: 460, def: () => 300, cssVar: '--tp-side', grow: -1 }
  };
  const STAGE_MIN = 360;
  const splitHost = k => k === 'side' ? document.getElementById('theory') : document.querySelector('.work');
  const splitSaved = mode => U.store.get('split:' + mode, {}) || {};
  // The largest width currently allowed for a column: keeps the canvas (or theory body) at least STAGE_MIN wide
  const splitMax = k => {
    const S = SPLIT[k], host = splitHost(k);
    if (!host) return S.max;
    if (k === 'side') return Math.max(S.min, Math.min(S.max, host.clientWidth - 40 - 24 - 420));
    const W = host.clientWidth, other = k === 'drawer' ? document.getElementById('inspector') : document.getElementById('drawer');
    return Math.max(S.min, Math.min(S.max, W - 56 - (other ? other.getBoundingClientRect().width : 0) - STAGE_MIN));
  };
  const splitWidth = (k, mode) => { const v = splitSaved(mode)[k]; return v != null ? v : SPLIT[k].def(mode); };
  A.applySplit = function (mode) {
    mode = mode || document.body.dataset.mode;
    const d = splitSaved(mode), work = document.querySelector('.work'), th = document.getElementById('theory');
    if (work) for (const k of ['drawer', 'insp']) { if (d[k] != null) work.style.setProperty(SPLIT[k].cssVar, d[k] + 'px'); else work.style.removeProperty(SPLIT[k].cssVar); }
    const side = splitSaved('theory').side;
    if (th) { if (side != null) th.style.setProperty('--tp-side', side + 'px'); else th.style.removeProperty('--tp-side'); }
    A.splitAria && A.splitAria();
  };
  A.setSplit = function (k, w, save) {
    const S = SPLIT[k], mode = k === 'side' ? 'theory' : document.body.dataset.mode, host = splitHost(k);
    w = Math.round(U.clamp(w, S.min, Math.max(S.min, splitMax(k))));
    host.style.setProperty(S.cssVar, w + 'px');
    if (save) { const d = splitSaved(mode); d[k] = w; U.store.set('split:' + mode, d); }
    A.splitAria();
    return w;
  };
  A.resetSplit = function (k) {
    const mode = k === 'side' ? 'theory' : document.body.dataset.mode, d = splitSaved(mode);
    delete d[k]; U.store.set('split:' + mode, d);
    A.applySplit();
    // Redraw the canvas and curves after the column-width transition ends
    setTimeout(() => { if (A.r) A.r.draw(); if (A.c && A.renderCurves) A.renderCurves(A.c); A.splitAria(); }, 400);
  };
  A.splitAria = function () {
    const mode = document.body.dataset.mode;
    document.querySelectorAll('.splitter').forEach(el => {
      const k = el.dataset.split, S = SPLIT[k];
      el.setAttribute('aria-valuemin', S.min);
      el.setAttribute('aria-valuemax', Math.round(splitMax(k)));
      el.setAttribute('aria-valuenow', splitWidth(k, k === 'side' ? 'theory' : mode));
    });
  };
  A.initSplitters = function () {
    const mk = k => {
      const S = SPLIT[k];
      const el = U.h('div.splitter', { role: 'separator', tabindex: 0, 'aria-orientation': 'vertical', 'data-split': k,
        'aria-label': 'Resize the ' + S.name, title: 'Drag to resize the ' + S.name + '; double-click to restore the default width' });
      let x0 = 0, w0 = 0, id = null;
      const cur = () => { const mode = k === 'side' ? 'theory' : document.body.dataset.mode; return splitWidth(k, mode); };
      el.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); id = e.pointerId;
        try { el.setPointerCapture(id); } catch (er) { /* when there is no pointer to capture (e.g. an event dispatched by a script), dragging proceeds as usual */ }
        x0 = e.clientX;
        // Start from the target width (the column may still be in a transition, so the measured width is unreliable)
        const v = parseFloat(getComputedStyle(splitHost(k)).getPropertyValue(S.cssVar));
        w0 = isFinite(v) ? v : cur();
        el.classList.add('dragging'); document.body.classList.add('resizing');
      });
      el.addEventListener('pointermove', e => { if (id !== e.pointerId) return; A.setSplit(k, w0 + S.grow * (e.clientX - x0), false); });
      const end = e => {
        if (id !== e.pointerId) return;
        id = null;
        A.setSplit(k, w0 + S.grow * (e.clientX - x0), true);
        requestAnimationFrame(() => { el.classList.remove('dragging'); document.body.classList.remove('resizing'); if (A.r) A.r.draw(); });
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('dblclick', () => A.resetSplit(k));
      el.addEventListener('keydown', e => {
        const step = e.shiftKey ? 48 : 16;
        let w = null;
        if (e.key === 'ArrowLeft') w = cur() - S.grow * step;
        else if (e.key === 'ArrowRight') w = cur() + S.grow * step;
        else if (e.key === 'Home') w = S.min;
        else if (e.key === 'End') w = splitMax(k);
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); A.resetSplit(k); return; }
        if (w == null) return;
        e.preventDefault(); e.stopPropagation();
        document.body.classList.add('resizing');
        A.setSplit(k, w, true);
        requestAnimationFrame(() => { document.body.classList.remove('resizing'); if (A.r) A.r.draw(); });
      });
      return el;
    };
    const work = document.querySelector('.work'), side = document.querySelector('.tp-side');
    if (work) work.append(mk('drawer'), mk('insp'));
    if (side) side.prepend(mk('side'));
    A.applySplit();
  };

  // Step state of the synthesis guide: a step with a prediction question does not reveal its construction until answered (predict first, verify after)
  A.stepState = function (c) {
    const st = A.st;
    if (!st.wiz.on || !c) return null;
    const steps = A.wizSteps(c);
    if (!steps) return null;
    const i = EL.U.clamp(st.wiz.i, 0, steps.length - 1), step = steps[i];
    const ans = st.wiz.ans[i];
    const revealed = !step.ask || ans != null;
    return { i, n: steps.length, step, steps, ans, revealed, k: revealed ? i : i - 1 };
  };

  A.cache = new Map();
  A.cached = function (key, fn) {
    if (!A.cache.has(key)) { if (A.cache.size > 80) A.cache.delete(A.cache.keys().next().value); A.cache.set(key, fn()); }
    return A.cache.get(key);
  };

  // Actual positions of custom sources (model 07 can bind them to background special points)
  A.resolveSources = function () {
    const st = A.st;
    return st.custom.map((s, i) => {
      let p = s.p;
      if (s.bind) {
        const bg = st.hidden.bgs && st.hidden.bgs[s.bind.bg];
        const sp = bg && EL.GEO.build(bg).special.find(x => x.key === s.bind.key);
        if (sp) p = sp.p; else s.bind = null;
      }
      return { p: p.slice(), q: s.q, label: s.label || 'Q' + (i + 1), i };
    });
  };

  A.ctx = function () {
    const st = A.st, m = st.model, p = st.p, c = { m, st, p, stage: st.stage, hidden: st.hidden, layers: st.layers, rMin: m.rMin || 0, custom: !!st.custom };
    c.set = obj => { Object.assign(p, obj); };
    c.cached = A.cached;
    if (m.analytic) {
      const sub = m.subs[st.sub];
      c.sub = st.sub; c.subP = m.subParams(p, st.sub);
      c.F = EL.Phys.analyticField(x => sub.fn(c.subP, x));
      if (sub.stopAt === 'z0') c.F.segBlocked = (a, b) => c.subP.sigma !== 0 && a[2] * b[2] <= 0;
      if (sub.inner) c.F.segBlocked = (a, b) => V.len(b) < c.subP.a;
      c.sources = [];
    } else {
      c.sources = st.custom ? A.resolveSources() : m.sources(p);
      c.F = EL.Phys.pointField(c.sources, m.rMin);
    }
    c.sample = q => c.F.sample(q);
    const R = m.rangeKey ? p[m.rangeKey] : m.R;
    c.bound = m.rangeKey ? R : Math.max(R, ...c.sources.map(s => Math.max(...s.p.map(Math.abs)) + 2));
    c.levels = m.analytic
      ? EL.Phys.levels([], st.count, st.level, st.spacing, false)
      : EL.Phys.levels(c.sources, st.count, st.level, st.spacing, m.perCharge);
    c.planeName = V.planeBasis(st.plane).nl;
    // Probe
    const pr = m.probe || {};
    const useCustom = pr.customKey && p[pr.customKey];
    let path = null;
    if (!useCustom) path = pr.path || (pr.pathFn && (!pr.when || pr.when(p, st)) ? pr.pathFn(p) : null);
    const fixed = !useCustom && !path && pr.fixedFn ? pr.fixedFn(p, st) : null;
    if (path) c.probe = { path, t: p[path.key], pos: path.pos(p[path.key]), name: pr.nameFn ? pr.nameFn() : 'P' };
    else if (fixed) c.probe = { pos: fixed.pos, name: fixed.name, fixed: true };
    else if (pr.free) c.probe = { pos: pr.free.map(k => p[k]), free: pr.free, name: 'P' };
    if (c.probe) { c.probe.s = c.F.sample(c.probe.pos); c.probe.own = !!pr.ownVectors; }
    // Construction steps
    c.cs = A.stepState(c);
    c.hide = new Set();
    if (c.cs && c.cs.k >= 0 && c.cs.steps[c.cs.k].hide) c.cs.steps[c.cs.k].hide.forEach(x => c.hide.add(x));
    c.probeVisible = !!c.probe && st.layers.probe && (pr.fromStage == null || st.stage >= pr.fromStage || useCustom);
    // Equipotential surface through the probe: add the potential at the probe to the level values; drag the probe to find where the surface "shrinks to a point" (a zero-field point)
    c.probeLevel = st.probeLevel && c.probeVisible && c.probe.s.ok ? +c.probe.s.V.toFixed(6) : null;
    if (c.probeLevel != null && !c.levels.some(v => Math.abs(v - c.probeLevel) < 1e-6)) c.levels = c.levels.concat(c.probeLevel).sort((a, b) => a - b);
    // Display arrow length with nonlinear compression: weak fields stay visible, and the readings give the quantitative values
    c.arrowVec = E => {
      const L = V.len(E);
      if (!(L > 0)) return [0, 0, 0];
      const s = Math.sqrt(L), len = Math.min(c.bound * 0.32, st.style.vecScale * c.bound * 0.16 * s / (1 + s));
      return V.mul(E, len / L);
    };
    c.showSpecial = st.showSpecial;
    return c;
  };

  // Full readings for the current stage: model readings + probe readings
  A.readings = function (c) {
    const out = c.m.readings ? c.m.readings(c) : [];
    if (c.probe && (c.probeVisible || c.probe.path)) {
      const s = c.probe.s, q0 = c.p.q0;
      const n = c.probe.name || 'P';
      out.push([c.probe.fixed || c.probe.own ? '— Field point ' + n + ' —' : '— Probe P —', '', '']);
      if (c.probe.path) out.push(['Path parameter ' + c.probe.path.label, c.probe.t, c.probe.path.unit]);
      out.push(['Position ' + n, c.probe.pos, 'L'], ['V(' + n + ')', s.V, 'kQ/L']);
      if (q0 != null && c.m.id !== 6) out.push(['U(' + n + ')=q₀V', q0 * s.V, 'kQ²/L']);
      if (c.m.id === 6) out.push(['U(P)', (c.p.useB ? c.p.q0B : c.p.q0) * s.V, 'kQ²/L']);
      out.push(['|E(' + n + ')|', V.len(s.E), 'kQ/L²'], ['E(' + n + ')', s.E, 'kQ/L²']);
      if (c.probe.path) out.push(['E∥(' + n + ')', EL.MH.Epar(c.F, c.probe.path, c.probe.t), 'kQ/L²']);
      if (!s.ok) out.push(['Note', c.m.analytic ? 'This position is at a singularity or an interface, so the field is undefined. The reading is the one-sided limit.' : 'The probe is inside the excluded neighborhood of a nonzero source charge, so the potential and field are undefined.', '']);
    }
    return out;
  };
})(window.EL);
