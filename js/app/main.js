'use strict';
// Lab page entry: update loop, stages, animation, drafts, and page events
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, A = EL.App, V = EL.V;

  A.update = function () {
    const st = A.st;
    A.c = A.ctx();
    A.r.cam.mode = st.view; A.r.cam.plane = st.plane; A.r.cam.planePos = st.planePos;
    A.r.setScene(A.buildScene(A.c, () => A.update()));
    A.r.cam.handles = A.handles(A.c);
    const now = performance.now();
    if (!st.anim.on || now - (A.lastRd || 0) > 120) {
      A.lastRd = now;
      A.renderReadings(A.c);
      A.renderCurves(A.c);
      A.renderCaption();
    }
    A.dirty = true;
    A.histSoon && A.histSoon();   // Undo history: several updates within one event round merge into one step (see state.js)
  };
  A.busy = function (on, msg) { const b = U.$('#busy'); b.hidden = !on; if (msg) b.textContent = msg; };
  A.resetCamera = function () {
    const cam = A.r.cam, st = A.st;
    cam.reset(A.c ? A.c.bound : st.model.R, st.view === '2d');
    cam.plane = st.plane;
  };

  // Progressive display: 1 charges → 2 field lines → 3 equipotentials → 4 probe
  A.progressStep = () => { const L = A.st.layers; return L.probe ? 3 : L.contours ? 2 : L.lines ? 1 : 0; };
  // progress(i): turn on layer i (without turning off other open layers); toggleLayer: the buttons along the bottom of the canvas toggle one layer independently
  A.progress = function (i) {
    const L = A.st.layers, had = L.lines;
    L.charges = true;
    if (i >= 1) L.lines = true;
    if (i >= 2) L.contours = true;
    if (i >= 3) L.probe = true;
    A.update(); A.renderPanel(); A.renderStageBar();
    if (L.lines && !had) A.r.playReveal();
  };
  A.LAYER_CHIPS = [['charges', 'Charges'], ['lines', 'Field lines'], ['flow', 'Flow particles'], ['contours', 'Equipotential lines'], ['probe', 'Probe']];
  A.toggleLayer = function (k) {
    const L = A.st.layers;
    L[k] = !L[k];
    if (k === 'probe' && !L[k]) { A.st.comp.show = false; if (A.st.wiz.on) { A.stopWizard(); A.renderPanel(); A.renderStageBar(); return; } }
    A.update(); A.renderPanel(); A.renderStageBar(); A.renderCaption(true); A.renderStepList(); A.renderDerive();
    if (document.body.dataset.mode === 'analyze') { A.renderWizBox(); A.renderGeo(); A.renderComp(); }
    if (k === 'lines' && L[k]) A.r.playReveal();
  };
  A.renderStageBar = function () {
    const st = A.st, m = st.model, n = m.stages.length, L = st.layers;
    U.$('#sbStage').textContent = 'Stage ' + (st.stage + 1) + ' / ' + n + ': ' + m.stages[st.stage].title;
    U.$('#sbFill').style.width = ((st.stage + 1) / n * 100) + '%';
    U.$('#sbLayers').replaceChildren(...A.LAYER_CHIPS.filter(([k]) => k !== 'probe' || A.hasProbe(m)).map(([k, t], i) => h('button', { type: 'button', class: L[k] ? 'on' : '', 'aria-pressed': !!L[k], title: (L[k] ? 'Hide ' : 'Show ') + t.toLowerCase(), onclick: () => A.toggleLayer(k) }, h('i', null, i + 1), t)));
    U.$('#prevStage').disabled = st.stage === 0;
    U.$('#nextStage').disabled = st.stage === n - 1;
  };
  // The legend takes its colors from the current theme and adds text descriptions
  A.renderLegend = function () {
    const C = EL.C, sw = (c, t, line) => '<span><i class="' + (line ? 'line' : '') + '" style="background:' + U.rgb(c) + '"></i>' + t + '</span>';
    U.$('#legend').innerHTML = sw(C.pos, 'Positive charges and positive potential levels +') + sw(C.neg, 'Negative charges and negative potential levels −') + sw(C.zero, 'Zero-potential level 0', true) + sw(C.field, 'Field lines', true) + sw(C.probe, 'Probe (field point) P');
  };
  A.setTheme = function (k) {
    EL.setTheme(k); U.store.set('theme', k); A.applyColors();
    const s = U.$('#stage');
    s.dataset.theme = EL.C.lbl; s.style.setProperty('--stage-bg', EL.C.bgCss); s.style.background = EL.C.bgCss;
    s.querySelectorAll('.hud,.tools,.legend,.stagebar,.caption').forEach(e => e.classList.add('glass'));
    A.renderLegend();
    if (A.c) { A.update(); A.renderPanel(); }
  };
  // Workspaces: Theory / Explore / Analyze / Record; each workspace presents only its own set of functions
  A.setMode = function (mode, now) {
    // Switching to another workspace cross-fades. Only the last requested switch runs, so rapid clicks are not overridden by an older switch;
    // during the cross-fade A.modeTarget is already the new workspace, and code called right afterward (e.g. starting the synthesis guide) relies on that
    if (!now && document.body.dataset.mode !== mode && EL.motion) {
      A.modeTarget = mode;
      return EL.motion.swap(() => { if (A.modeTarget !== mode) return; A.setMode(mode, true); if (mode !== 'theory') A.r.draw(); });
    }
    A.modeTarget = mode;
    document.body.dataset.mode = mode;
    A.applySplit && A.applySplit(mode);
    U.$$('.modes button').forEach(b => { const on = b.dataset.mode === mode; b.setAttribute('aria-selected', on); if (on) { const ink = U.$('.mode-ink'); ink.style.width = b.offsetWidth + 'px'; ink.style.transform = 'translateX(' + (b.offsetLeft - 3) + 'px)'; } });
    if (mode === 'theory') { U.$('#theory').scrollTop = 0; return; }
    requestAnimationFrame(() => {
      A.r.draw();
      if (mode === 'analyze') { A.renderReadings(A.c); A.renderCurves(A.c); A.renderComp(); A.renderGeo(); A.renderStepList(); A.renderDerive(); A.renderWizBox(); }
      if (A.firstView) { A.firstView = false; A.r.playReveal(); }
    });
  };

  A.renderStage = function () {
    const st = A.st, m = st.model, s = m.stages[st.stage];
    A.visited = A.visited || new Set(); A.visited.add(st.stage);
    U.$('#stageTabs').replaceChildren(...m.stages.map((x, i) => h('li', { class: (i === st.stage ? 'on' : '') + (A.visited.has(i) && i !== st.stage ? ' done' : '') },
      h('button', { type: 'button', 'aria-current': i === st.stage ? 'step' : null, onclick: () => A.gotoStage(i) }, h('span.n', null, A.visited.has(i) && i !== st.stage ? '✓' : String(i + 1)), x.title))));
    const g = U.$('#guide'); g.style.animation = 'none'; void g.offsetWidth; g.style.animation = '';
    U.$('#question').innerHTML = U.richMath(s.q);
    const sub = m.analytic ? EL.LESSONS08[st.sub] : null;
    const obs = sub ? (st.stage === 0 ? sub.questions[0] + ' ' + s.obs : st.stage === 1 ? sub.questions[1] + ' Tasks: ' + sub.tasks.join('; ') : sub.questions[2] + ' ' + s.obs) : s.obs;
    U.$('#obs').innerHTML = U.richMath(obs);
    U.$('#rec').innerHTML = U.richMath(s.rec);
    U.$('#hint').innerHTML = U.richMath(s.hint || (sub ? sub.intro : ''));
    U.$('#hintBox').hidden = !(s.hint || sub);
    // Teaching notes (teacher): shown when the stage data has a teacher field
    U.$('#teacher').innerHTML = s.teacher ? U.richMath(s.teacher) : '';
    U.$('#teacherBox').hidden = !s.teacher;
    U.$('#stageActions').replaceChildren(...(s.actions || []).map(a => K.btn(a.label, () => { a.run(A.c); A.update(); A.renderPanel(); }, 'primary')));
    A.renderStageBar(); A.renderStepList();
  };
  A.gotoStage = function (i) {
    const st = A.st;
    if (i < 0 || i >= st.model.stages.length) return;
    A.stopAnim();
    const view0 = st.view;
    A.applyStage(i);
    A.update();
    if (st.view !== view0) A.resetCamera(); else A.r.cam.reset(A.c.bound, st.view === '2d', true);
    A.update();
    A.renderStage(); A.renderPanel(); A.renderCaption(true); A.renderDerive();
    if (st.layers.lines) A.r.playReveal();
  };

  A.onModelChange = function () {
    A.cache.clear();
    A.update(); A.resetCamera(); A.update();
    A.renderStage(); A.renderPanel(); A.renderTheory(); A.renderCaption(true); A.renderDerive();
    if (A.st.layers.lines) A.r.playReveal();
  };

  // Theory page: 1. Fundamentals → 2. The model → 3. Inquiry. Equations never show scroll bars (long equations wrap automatically), and each equation has a symbol note beneath it
  A.theoryOf = () => { const m = A.st.model; return m.theoryFor ? m.theoryFor(A.st.sub) : EL.THEORY[m.id]; };
  A.renderTheory = function () {
    const m = A.st.model, t = A.theoryOf(), c = A.c, B = EL.BASE2, R = U.richMath;
      // Equations (numbered continuously across the page, numbers right-aligned) + collapsible symbol notes
    let eqNo = 0;
    const fm = x => { const i = ++eqNo; return h('div.fm', null, h('div.formula', { html: EL.texEq(x.tex, i) }),
      x.where ? h('details.where', null, h('summary', null, 'Symbols in Eq. (' + i + ')'), h('ul', null, x.where.split(/(?<=[.;])\s+/).map(s => s.trim()).filter(Boolean).map(s => h('li', { html: R(s.replace(/;$/, '.')) })))) : null); };
    const ul = list => h('ul', null, list.map(x => h('li', { html: R(x) })));
    const sec = (id, n, title, ...kids) => h('section.tsec', { id }, h('h2', null, h('span.tn', null, n), title), ...kids);
    // 1. Fundamentals
    const base = h('details.base', { open: m.id === 1 }, h('summary', null, B.title + ' (field, potential, and potential energy of a point charge)'), ...B.formulas.map(fm), ul(B.points), h('p', { html: R(B.units) }));
    const s1 = sec('t-basic', '1', 'Fundamentals', h('p.lead', { html: R(t.intro) }), base,
      h('h3', null, 'Key equations for this section'), ...t.formulas.map(fm),
      h('h3', null, t.pointsTitle || 'Key concepts'), ul(t.points),
      t.questions ? h('h3', null, 'Guiding questions') : null, t.questions ? ul(t.questions) : null);
    // 2. The model: diagram + key points + parameters
    const pts = t.pts ? t.pts(c.p) : [];
    const params = m.params.filter(q => !q.sub || q.sub === A.st.sub).filter(q => !q.probe || !(m.probe && m.probe.free && m.probe.free.includes(q.key)));
    const s2 = sec('t-model', '2', 'The model',
      h('figure.tfig', null, h('div', { html: A.figure(c, t) }), h('figcaption', null, 'Model diagram. Orange dots are positive charges, blue dots are negative charges, black dots are key points, and dashed lines are paths or dimensions.')),
      h('p', { html: R(t.model) }),
      pts.length ? h('table.tbl', null, h('thead', null, h('tr', null, h('th', null, 'Key point'), h('th', null, 'Position and role'))), h('tbody', null, pts.map(q => h('tr', null, h('td', { html: U.rich(q.n) }), h('td', { html: R(q.d) }))))) : null,
      h('h3', null, 'Adjustable parameters'),
      h('table.tbl', null, h('thead', null, h('tr', null, h('th', null, 'Parameter'), h('th', null, 'Range'), h('th', null, 'Default'))),
        h('tbody', null, params.map(q => h('tr', null, h('td', { html: U.rich(q.label) }), h('td', null, q.min + ' – ' + q.max), h('td', null, String(q.val)))))),
      m.rMin != null && !m.analytic ? h('p.note', null, 'Excluded-neighborhood radius rMin = ' + m.rMin + ' L.') : null);
    // 3. Inquiry
    const s3 = sec('t-inquiry', '3', 'Inquiry',
      h('p.note', null, 'In each stage, predict first, then check, then record.'),
      h('table.tbl', null, h('thead', null, h('tr', null, h('th', null, 'Stage'), h('th', null, 'Question'))),
        h('tbody', null, m.stages.map((s, i) => h('tr', null, h('td', null, (i + 1) + ' ' + s.title), h('td', { html: R(s.q) }))))),
      h('h3', null, 'Inquiry tasks'), ul(t.tasks), K.tip(t.record, 'ⓘ What to record'));
    // Analytic-field model: six sub-models on separate tabs; switching a tab also selects that sub-model in the lab
    const tabs = m.analytic ? h('div.th-tabs', { role: 'tablist', 'aria-label': 'Sub-models of the analytic-field model' }, Object.keys(EL.SUB08).map((k, i) => h('button', {
      type: 'button', role: 'tab', class: 'th-tab' + (k === A.st.sub ? ' on' : ''), 'aria-selected': k === A.st.sub ? 'true' : 'false', tabindex: k === A.st.sub ? '0' : '-1',
      onclick: () => { if (k === A.st.sub) return; A.st.sub = k; A.onModelChange(); U.$('#theory').scrollTop = 0; const b = U.$('.th-tab.on'); if (b) b.focus(); },
      onkeydown: e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); const bs = U.$$('.th-tab'), j = (bs.indexOf(e.currentTarget) + d + bs.length) % bs.length; bs[j].click(); }
    }, h('b', null, String(i + 1)), EL.SUB08[k].name))) : null;
    U.$('#theoryBody').replaceChildren(...[tabs, s1, s2, s3].filter(Boolean));
    U.$('#theoryCode').textContent = A.catOf(m) + ' · ' + m.code + (m.analytic ? ' · ' + EL.SUB08[A.st.sub].cat : '');
    U.$('#theoryTitle').textContent = m.analytic ? m.title + ' · ' + EL.SUB08[A.st.sub].name : m.title;
    U.$('#theoryStages').replaceChildren(...[['t-basic', '1. Fundamentals'], ['t-model', '2. The model'], ['t-inquiry', '3. Inquiry']].map(([id, n]) =>
      h('li', null, h('button', { type: 'button', class: 'link', 'data-target': id, onclick: () => U.$('#' + id).scrollIntoView({ behavior: 'smooth', block: 'start' }) }, n))));
    // Inquiry: the 'Worked problems' button opens the worked problems of this model
    const side = U.$('#theory .tp-side'), exA = U.$('.tp-go a[href^="examples.html"]', side);
    if (exA) exA.href = 'examples.html?model=' + encodeURIComponent(m.id);
    // Model preview: placed after the contents and the inquiry buttons; its labels match the symbols of the key equations in this section
    if (A.renderPreview && side) {
      let pv = U.$('#theoryPreview', side);
      if (!pv) { pv = h('section.pv#theoryPreview', { 'aria-label': 'Model preview' }); side.append(pv); }
      A.renderPreview(pv, c, t);
    }
    // Motion: section content fades in as it scrolls into view; the contents highlight with reading position, and the reading progress bar sits at the top of the right column so it does not cover the text
    if (EL.motion) {
      const page = U.$('#theory');
      let bar = U.$('.tp-progress', page);
      if (!bar) { bar = h('div.tp-progress', { 'aria-hidden': 'true' }, h('i')); (side || page).prepend(bar); }
      EL.motion.reveal(U.$('#theoryBody'), '.tsec > h2, .tsec > p, .fm, .tfig, .tbl, details.base, .tsec > h3, .tsec > ul');
      EL.motion.scrollSpy(page, U.$$('#theoryStages .link'), U.$('i', bar));
    }
  };
  A.showTheory = on => { A.setMode(on ? 'theory' : 'explore'); if (on) U.$('#enterLab').focus(); };

  // ---- Animation ----
  // Animation: start / pause (keeps the current state, can resume) / stop (returns to the configuration before the start)
  // The cross-section sweep range matches the "Slice position" slider; the start is the current position and the phase is derived from it, so nothing jumps at the start
  A.sliceRange = c => Math.round(Math.max(c.bound, A.isoDomain(c)) * 10) / 10;
  // On pause, remember the animated quantities; if they were changed by hand before resuming, restart from the new position
  const animSig = () => { const st = A.st; return JSON.stringify([st.anim.target, st.planePos, st.p, st.custom && st.custom.map(s => s.p)]); };
  A.toggleAnim = function (target) {
    const a = A.st.anim;
    if (!target) return A.pauseAnim();
    if (a.paused && a.target === target && a.base && a.sig === animSig()) return A.startAnim(true);
    a.target = target; A.startAnim();
  };
  // Sync the animated quantity to its slider and number box in the panel (without rebuilding the panel)
  const syncCtl = (label, v) => {
    const num = document.querySelector('#panel input.num[aria-label="' + CSS.escape(label) + '"]');
    if (!num) return;
    const rng = num.parentElement.querySelector('input[type=range]'), dec = (String(num.step).split('.')[1] || '').length;
    num.value = (+v).toFixed(dec); if (rng) rng.value = v;
  };
  A.startAnim = function (resume) {
    const st = A.st, a = st.anim, c = A.c;
    cancelAnimationFrame(A.raf);
    if (!A.animTargets(c).some(t => t[0] === a.target)) { a.on = false; a.paused = false; A.renderPanel(); return U.toast('This animation cannot play with the current display settings.'); }
    const now0 = performance.now();
    if (resume && a.paused) a.t0 = now0 - a.elapsed;
    else {
      a.t0 = now0; a.n = 0;
      a.base = { planePos: st.planePos, p: Object.assign({}, st.p), custom: st.custom && JSON.parse(JSON.stringify(st.custom)), probe: c.probe && c.probe.pos.slice() };
      if (/^src/.test(a.target)) { a.base.custom0 = a.base.custom; A.ensureCustom(c); a.base.custom = JSON.parse(JSON.stringify(st.custom)); }
      const R = A.sliceRange(c);
      a.base.sliceAmp = R; a.base.ph = Math.asin(U.clamp(st.planePos / R, -1, 1));
      if (/^par:/.test(a.target)) { const q = st.model.params.find(x => x.key === a.target.slice(4)); if (q) { const mid = (q.min + q.max) / 2, half = (q.max - q.min) / 2; a.base.par = { q, mid, half, ph: Math.asin(U.clamp((st.p[q.key] - mid) / half, -1, 1)) }; } }
      if (c.probe && c.probe.path) { const pa = c.probe.path, mid = (pa.range[0] + pa.range[1]) / 2, half = (pa.range[1] - pa.range[0]) / 2 * 0.98; a.base.pathPh = Math.asin(U.clamp(((st.p[pa.key] ?? mid) - mid) / (half || 1), -1, 1)); }
    }
    a.on = true; a.paused = false;
    A.renderPanel();
    const step = now => {
      if (!a.on) return;
      const th = 2 * Math.PI * (now - a.t0) / 1000 / a.period, B = a.base, cc = A.c;
      // After the displayed content changes (e.g. the probe or equipotential lines are turned off), this object can no longer be animated, so pause automatically
      if (!A.animTargets(cc).some(t => t[0] === a.target)) return A.pauseAnim();
      if (a.target === 'slice') {
        const R = B.sliceAmp;
        st.planePos = +(R * Math.sin(B.ph + th)).toFixed(3);
        syncCtl('Slice position ' + cc.planeName + ' / L', st.planePos);
      } else if (a.target === 'path') {
        const pa = cc.probe.path, mid = (pa.range[0] + pa.range[1]) / 2, half = (pa.range[1] - pa.range[0]) / 2;
        st.p[pa.key] = +(mid + half * 0.98 * Math.sin((B.pathPh || 0) + th)).toFixed(4);
        const q = st.model.params.find(x => x.key === pa.key); if (q) syncCtl(q.label, st.p[pa.key]);
      } else if (/^par:/.test(a.target)) {
        // Parameter sweep: oscillate within the slider range, rounding values to the slider step
        const P = B.par; if (!P) return A.stopAnim();
        const v = P.mid + P.half * Math.sin(P.ph + th), k = Math.round((v - P.q.min) / P.q.step);
        st.p[P.q.key] = +U.clamp(P.q.min + k * P.q.step, P.q.min, P.q.max).toFixed(6);
        syncCtl(P.q.label, st.p[P.q.key]);
      } else {
        const off = a.path === 'x' ? [a.r * Math.sin(th), 0, 0] : a.path === 'xy' ? [a.r * (Math.cos(th) - 1), a.r * Math.sin(th), 0] : [a.r * (Math.cos(th) - 1), 0, a.r * Math.sin(th)];
        if (a.target === 'probe') cc.probe.free.forEach((k, i) => { st.p[k] = +(B.probe[i] + off[i]).toFixed(4); const q = st.model.params.find(x => x.key === k); if (q) syncCtl(q.label, st.p[k]); });
        else { const i = +a.target.slice(3); if (st.custom && st.custom[i] && B.custom && B.custom[i]) st.custom[i].p = V.add(B.custom[i].p, off); }
      }
      A.update();
      const c2 = A.c;
      if (c2.probe && c2.probe.s && a.target !== 'slice' && !/^par:/.test(a.target)) {
        st.trail.push(c2.probe.pos.slice()); if (st.trail.length > 160) st.trail.shift();
        if (a.eTrail && a.n % 6 === 0 && c2.probe.s.ok) { st.eTrail.push({ p: c2.probe.pos.slice(), v: c2.arrowVec(c2.probe.s.E) }); if (st.eTrail.length > 100) st.eTrail.shift(); }
      }
      if (a.target === 'slice' && a.sliceTrail && st.layers.contours && a.n % 4 === 0) {
        st.sliceTrail.push(A.contours(c2, 48).flatMap(g => g.segs)); if (st.sliceTrail.length > 120) st.sliceTrail.shift();
      }
      a.n++;
      A.raf = requestAnimationFrame(step);
    };
    A.raf = requestAnimationFrame(step);
  };
  // pauseAnim keeps the progress and can resume; stopAnim ends the animation and stays at the current position (called when dragging or changing stage); resetAnim ends the animation and returns to the configuration before the start
  A.pauseAnim = function () {
    const a = A.st.anim;
    if (!a.on) return;
    a.on = false; a.paused = true; a.elapsed = performance.now() - a.t0; cancelAnimationFrame(A.raf); a.sig = animSig();
    A.update(); A.renderPanel();
  };
  A.stopAnim = function () {
    const a = A.st.anim, was = a.on || a.paused;
    a.on = false; a.paused = false; cancelAnimationFrame(A.raf);
    if (was) { A.update(); A.renderPanel(); }
  };
  A.resetAnim = function () {
    const st = A.st, a = st.anim, B = a.base;
    a.on = false; a.paused = false; cancelAnimationFrame(A.raf);
    if (B) {
      if (a.target === 'slice') st.planePos = B.planePos;
      else if (a.target === 'path' || a.target === 'probe' || /^par:/.test(a.target)) Object.assign(st.p, B.p);
      else if (/^src/.test(a.target)) st.custom = B.custom0 ? JSON.parse(JSON.stringify(B.custom0)) : B.custom0 === null ? null : st.custom;
    }
    st.trail = []; st.eTrail = []; st.sliceTrail = [];
    A.update(); A.renderPanel();
  };

  // ---- Drafts ----
  const draftKey = () => 'draft:' + A.st.model.id;
  A.snapshot = () => { const st = A.st; return JSON.stringify({ v: 2, model: st.model.id, stage: st.stage, notes: st.notes, labels: st.labels, geo: st.geo, p: st.p, hidden: st.hidden, sub: st.sub, custom: st.custom, view: st.view, plane: st.plane, planePos: st.planePos, layers: st.layers, level: st.level, spacing: st.spacing, count: st.count, probeLevel: !!st.probeLevel, seeds: st.seeds, quality: st.quality, style: st.style, cam: { theta: A.r.cam.theta, phi: A.r.cam.phi, dist: A.r.cam.dist, half: A.r.cam.half } }); };
  A.restore = function (json) {
    const d = typeof json === 'string' ? JSON.parse(json) : json, st = A.st;
    if (String(d.model) !== String(st.model.id)) throw new Error('This draft belongs to a different model and cannot be loaded.');
    A.stopAnim();
    for (const k of ['stage', 'notes', 'hidden', 'sub', 'custom', 'view', 'plane', 'planePos', 'level', 'spacing', 'count', 'probeLevel', 'seeds', 'quality']) if (k in d) st[k] = d[k];
    if (d.labels) Object.assign(st.labels, d.labels);
    if (d.geo) Object.assign(st.geo, d.geo);
    st.wiz.on = false;
    Object.assign(st.p, d.p); Object.assign(st.layers, d.layers); Object.assign(st.style, d.style);
    A.onModelChange();
    if (d.cam) Object.assign(A.r.cam, d.cam);
    A.update();
    if (document.body.dataset.mode === 'theory') A.setMode('explore');
  };

  // The same three categories as the home page (in learning order)
  A.CATS = [['I. Basic models', [1, 2]], ['II. Symmetric models', [4, 6, 5]], ['III. Extensions and authoring', [7, 8, 3]]];
  A.catOf = m => { const c = A.CATS.find(([, ids]) => ids.includes(m.id)); return c ? c[0].replace(/^[IVX]+\.\s*/, '') : ''; };
  A.boot = function () {
    const id = new URLSearchParams(location.search).get('m') || '1', m = EL.model(id) || EL.model(1);
    document.title = m.code + ' ' + m.title + ' · Electrostatics Lab';
    U.$('#labTitle').textContent = m.code + ' ' + m.title;
    const CATS = A.CATS;
    // Same as the home page: "Worked problems" is at the end of "II. Symmetric models" and "Add problems" at the end of "III. Extensions and authoring"; selecting one jumps to the worked-problems page
    const LINKS = { 1: [['link:ex', 'Worked problems']], 2: [['link:add', 'Add problems']] }, HREF = { 'link:ex': 'examples.html', 'link:add': 'examples.html?mode=add' };
    U.$('#modelSel').replaceChildren(...CATS.map(([n, ids], g) => h('optgroup', { label: n }, ids.map(i => EL.model(i)).filter(Boolean).map(x => h('option', { value: x.id, selected: x === m }, x.code + ' ' + x.title)).concat((LINKS[g] || []).map(([v, t]) => h('option', { value: v }, t))))));
    U.$('#modelSel').addEventListener('change', e => { const v = e.target.value; if (HREF[v]) location.href = HREF[v]; else location.search = '?m=' + v; });
    A.init(m);
    A.applyStage(0, true);
    try { A.r = new EL.Renderer(U.$('#gl'), U.$('#labels')); } catch (e) { U.$('#stage').replaceChildren(h('p.err', null, 'Cannot initialize WebGL (' + e.message + '). Use a modern browser that supports WebGL.')); return; }
    const cam = A.r.cam;
    cam.attach(U.$('#gl'), {
      change: () => A.r.draw(),
      pick: (x, y) => { let best = null, bd = 16; for (const hd of cam.handles || []) { const q = cam.toScreen(hd.p); if (!q) continue; const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = hd; } } return best; },
      dragStart: () => { A.stopAnim(); A.dragging = true; U.$('#gl').classList.add('dragging'); },
      dragEnd: () => { A.dragging = false; U.$('#gl').classList.remove('dragging'); A.update(); A.renderPanel(); },
      // Update after a handle moves (throttled to once per frame)
      moved: () => { if (A.pend) return; A.pend = true; requestAnimationFrame(() => { A.pend = false; A.update(); }); }
    });
    window.addEventListener('resize', () => { A.r.draw(); A.setMode(document.body.dataset.mode); });
    new ResizeObserver(() => A.r.draw()).observe(U.$('#stage'));
    new ResizeObserver(() => { if (A.c) A.renderCurves(A.c); }).observe(U.$('#inspector'));
    // Motion preference; particles and breathing are off by default when the system requests reduced motion
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fxs = U.store.get('fx', {}); delete fxs.flow;
    Object.assign(A.r.fx, reduce ? { glow: false, reveal: false, paused: true } : {}, fxs);
    A.applyLabelScale();
    A.firstView = true;
    A.setTheme(U.store.get('theme', 'dark'));
    A.bindHeader();
    A.onModelChange();
    A.renderRecords();
    A.initSplitters && A.initSplitters();
    A.setMode('theory');
    A.initHistory && A.initHistory();
  };

  A.bindHeader = function () {
    const on = (id, f) => U.$(id).addEventListener('click', f);
    on('#prevStage', () => A.gotoStage(A.st.stage - 1));
    on('#nextStage', () => A.gotoStage(A.st.stage + 1));
    on('#enterLab', () => A.setMode('explore'));
    on('#hudMore', () => A.setMode('analyze'));
    on('#drawerClose', () => { A.drawerOff = true; document.body.classList.add('drawer-off'); A.renderPanel(); });
    on('#quickRec', () => A.recordReading());
    on('#wizStart', () => { A.startWizard(); A.renderWizBox(); });
    on('#hudWiz', () => { A.startWizard(); A.renderWizBox(); });
    U.$('#geoBox').addEventListener('toggle', () => A.renderGeo());
    U.$$('.modes button').forEach(b => b.addEventListener('click', () => A.setMode(b.dataset.mode)));
    U.$('#curveBox').addEventListener('toggle', () => A.renderCurves(A.c));
    U.$('#compBox').addEventListener('toggle', () => A.renderComp());
    document.addEventListener('click', e => { const m = U.$('.menu'); if (m.open && !m.contains(e.target)) m.open = false; });
    U.$$('.menu-pop button').forEach(b => b.addEventListener('click', () => { U.$('.menu').open = false; }));
    on('#btnPresent', () => A.togglePresent());
    on('#presentExit', () => A.togglePresent(false));
    on('#btnSheet', () => A.exportWorksheet(false));
    on('#btnSheetT', () => A.exportWorksheet(true));
    // Shortcuts: 1–4 switch workspaces, [ ] switch stages, ← → construction steps, P presentation mode
    document.addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const modes = ['theory', 'explore', 'analyze', 'record'], cs = A.c && A.c.cs;
      if (e.key >= '1' && e.key <= '4') A.setMode(modes[+e.key - 1]);
      if (e.key === '[') A.gotoStage(A.st.stage - 1);
      if (e.key === ']') A.gotoStage(A.st.stage + 1);
      if (e.key === 'p' || e.key === 'P') A.togglePresent();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowRight' ? 1 : -1;
        if (cs) A.gotoStep(cs.i + d); else A.gotoStage(A.st.stage + d);
        e.preventDefault();
      }
      if (e.key === 'Escape' && document.body.classList.contains('present')) A.togglePresent(false);
    });
    on('#btnSave', () => { U.store.set(draftKey(), A.snapshot()) ? U.toast('Draft saved in this browser.') : (U.download('draft_' + A.st.model.code + '.json', A.snapshot()), U.toast('Browser storage is unavailable. Downloaded a JSON backup file instead.')); });
    on('#btnLoad', () => { const d = U.store.get(draftKey(), null); if (!d) return U.toast('This browser has no draft for this model.'); try { A.restore(d); U.toast('Draft loaded.'); } catch (e) { U.toast(e.message); } });
    on('#btnExport', () => U.download('draft_' + A.st.model.code + '_' + A.st.model.title + '.json', A.snapshot(), 'application/json'));
    on('#btnImport', () => U.$('#importFile').click());
    U.$('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { A.restore(t); U.toast('File imported.'); } catch (er) { U.toast('Import failed: ' + er.message); } }); e.target.value = ''; });
    on('#btnPng', () => { const a = h('a', { href: A.r.snapshot(), download: 'canvas_' + A.st.model.code + '.png' }); document.body.append(a); a.click(); a.remove(); });
    on('#btnHome', () => { A.r.cam.reset(A.c.bound, A.st.view === '2d', true); A.r.draw(); });
    on('#btnTop', () => { if (A.st.view === '3d') { A.r.cam.top(); A.r.draw(); } });
    on('#btnZin', () => { A.r.cam.zoom(1 / 1.2); A.r.draw(); });
    on('#btnZout', () => { A.r.cam.zoom(1.2); A.r.draw(); });
    on('#btnReset', () => { if (!confirm('Restore the teaching parameters for this stage?')) return; const st = A.st, m = st.model; for (const q of m.params) st.p[q.key] = q.val; for (const t of m.toggles || []) st.p[t.key] = t.val; if (!m.alwaysCustom) st.custom = null; A.gotoStage(st.stage); });
    on('#btnFull', () => { const el = U.$('#stage'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); });
    on('#btnHelp', () => { U.$('#help').hidden = false; });
    on('#closeHelp', () => { U.$('#help').hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { U.$('#help').hidden = true; U.$('.menu').open = false; } });
  };

  window.addEventListener('DOMContentLoaded', A.boot);
})(window.EL);
