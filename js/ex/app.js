'use strict';
// Worked-problem module entry: mode switching (Worked problems / Add problems), URL parameters, display toggles, import, theme
// URL: examples.html?mode=add (?mode=teacher is also accepted) opens Add problems; examples.html?model=<lab model id> opens the first worked problem of that model
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, X = EL.EX, W = X.W;
  // The internal mode name is still 'teacher' (the style selectors body[data-exmode] depend on it); the interface text is "Add problems"
  X.setMode = function (m, now) {
    if (!now && document.body.dataset.exmode !== m && EL.motion) return EL.motion.swap(() => X.setMode(m, true));
    document.body.dataset.exmode = m;
    U.$$('.modes button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
    const b = U.$('.modes button[data-mode="' + m + '"]'), ink = U.$('.mode-ink');
    if (b) { ink.style.width = b.offsetWidth + 'px'; ink.style.transform = 'translateX(' + (b.offsetLeft - 3) + 'px)'; }
    document.title = (m === 'teacher' ? 'Add problems' : 'Worked problems') + ' · Electrostatics Lab';
    if (m === 'teacher' && X.stopPath) X.stopPath();
    if (m === 'teacher') { if (!X.T.d) X.T.start(); else X.T.render(); }
    else { U.$('#caption').hidden = true; if (X.S.pb) { X.focus(null); X.renderProblem(); } else { X.renderProblem(); W.r.setScene({}); } }
    requestAnimationFrame(() => W.r.draw());
  };
  X.renderChips = function () {
    const L = W.layers, items = [['geom', 'Geometry'], ['sphere', 'Inscribed sphere'], ['lines', 'Field lines'], ['flow', 'Flow animation'], ['labels', 'Labels']];
    U.$('#sbLayers').replaceChildren(...items.map(([k, t]) => h('button', { type: 'button', class: L[k] ? 'on' : '', 'aria-pressed': L[k], onclick: () => { L[k] = !L[k]; X.renderChips(); if (W.last) W.show(...W.last); } }, t)));
  };
  function openElementStyle(e) {
    e.preventDefault();
    const canvas = U.$('#gl'), rect = canvas.getBoundingClientRect(), hit = W.pickContext(e.clientX - rect.left, e.clientY - rect.top);
    const menu = U.$('#elementStyle'), look = W.appearance[hit.key] || {}, isCharge = hit.type === 'charge', isPoint = hit.type === 'point', isGeometry = hit.type === 'geometry';
    const source = isCharge && W.last && W.last[1].R.sources.find(s => s.label === hit.key);
    const defaultColor = source ? (source.q > 0 ? EL.C.pos : EL.C.neg) : isPoint ? EL.C.mark : EL.C.geom;
    const saveLook = changes => { W.appearance[hit.key] = Object.assign({}, W.appearance[hit.key], changes); U.store.set('ex:appearance', W.appearance); if (W.last) W.show(...W.last); };
    const children = [h('b', null, hit.title)];
    if (isCharge || isPoint || isGeometry) {
      const color = h('input', { type: 'color', value: look.color || U.toHex(defaultColor), 'aria-label': 'Color' });
      color.addEventListener('input', () => saveLook({ color: color.value }));
      children.push(h('label.row.wrap', null, h('span', null, 'Color'), color));
    }
    if (isCharge || isPoint) children.push(K.slider({ label: isCharge ? 'Charge display size' : 'Probe marker size', min: 0.6, max: 2.4, step: 0.1, val: look.size || 1, on: v => saveLook({ size: v }) }));
    const fx = U.store.get('ex:fx', { glow: W.r.fx.glow, reveal: W.r.fx.reveal });
    const glow = K.check('Pulse charge glow (canvas-wide)', W.r.fx.glow, v => { W.r.fx.glow = v; fx.glow = v; U.store.set('ex:fx', fx); if (W.last) W.show(...W.last); });
    const reveal = K.check('Animate field-line drawing (when enabled)', W.r.fx.reveal, v => { W.r.fx.reveal = v; fx.reveal = v; U.store.set('ex:fx', fx); if (v) W.r.playReveal(); });
    children.push(h('hr'), h('small', null, 'Animation settings apply to the whole canvas. They do not change the charge, field, or potential.'), glow, reveal);
    menu.replaceChildren(...children); menu.dataset.theme = EL.theme; menu.hidden = false; menu.style.left = '0px'; menu.style.top = '0px';
    const box = menu.getBoundingClientRect(), x = Math.max(8, Math.min(e.clientX, innerWidth - box.width - 8)), y = Math.max(8, Math.min(e.clientY, innerHeight - box.height - 8));
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
  }
  // URL parameters → initial state (a pure function, easy to test)
  X.route = function (search) {
    const q = new URLSearchParams(search || ''), mode = q.get('mode'), model = q.get('model'), problem = q.get('problem'), guide = q.get('guide');
    return { mode: mode === 'add' || mode === 'teacher' ? 'teacher' : 'student', model: model && X.LABS[+model] ? +model : null, problem: problem || null, guide: guide || null };
  };
  window.addEventListener('DOMContentLoaded', () => {
    try { W.init(); } catch (e) { U.$('#stage').replaceChildren(h('p.err', null, 'WebGL could not be initialized, so the 3D view cannot be shown. Reason: ' + e.message)); return; }
    U.$('#stage').after(U.$('#caption')); U.$('#caption').classList.add('glass');
    U.$('#gl').addEventListener('contextmenu', openElementStyle);
    document.addEventListener('pointerdown', e => { if (!U.$('#elementStyle').contains(e.target)) U.$('#elementStyle').hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') U.$('#elementStyle').hidden = true; });
    X.renderChips(); X.renderList();
    U.$$('.modes button').forEach(b => b.addEventListener('click', () => X.setMode(b.dataset.mode)));
    U.$('#btnTheme').addEventListener('click', () => W.setTheme(EL.theme === 'dark' ? 'light' : 'dark'));
    U.$('#btnHome').addEventListener('click', () => W.r.cam.reset(W.AD * 1.2, false, true));
    U.$('#btnTop').addEventListener('click', () => W.align([0, 0, 1]));
    U.$('#btnZin').addEventListener('click', () => { W.r.cam.zoomAt(1 / 1.3, W.r.cam.w / 2, W.r.cam.h / 2); W.r.draw(); });
    U.$('#btnZout').addEventListener('click', () => { W.r.cam.zoomAt(1.3, W.r.cam.w / 2, W.r.cam.h / 2); W.r.draw(); });
    U.$('#btnFull').addEventListener('click', () => { const el = U.$('#stage').closest('.view'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); });
    U.$('#btnNew').addEventListener('click', () => { X.T.start(null, X.S.pb ? X.itemKey(X.S.pb) : X.S.empty ? (X.firstItem(X.S.empty) || {}).key : null); X.setMode('teacher'); });
    U.$('#btnEdit').addEventListener('click', () => { if (!X.S.pb) return U.toast('Select a problem first.'); X.T.start(X.S.pb); X.setMode('teacher'); });
    U.$('#btnImport').addEventListener('click', () => U.$('#importFile').click());
    U.$('#importFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        try {
          const pb = JSON.parse(t); if (!pb || !X.valid(pb)) throw new Error('The file contains no recognizable model');
          pb.id = 'my-' + Date.now().toString(36); pb.model = X.modelOf(pb); pb.kind = X.kindOf(pb); pb.pts = pb.pts || {}; pb.qs = pb.qs || [];
          const mine = U.store.get('ex:mine', []); mine.push(pb); U.store.set('ex:mine', mine); X.setMode('student'); X.open(pb); U.toast('Imported into "My problems".');
        } catch (er) { U.toast('Import failed: ' + er.message); }
      });
      e.target.value = '';
    });
    U.$('#btnDel').addEventListener('click', () => {
      const pb = X.S.pb; if (!pb || !String(pb.id).startsWith('my-')) return U.toast('Built-in problems cannot be deleted. Only problems under "My problems" can be deleted.');
      if (!confirm('Delete "' + pb.title + '"? This cannot be undone.')) return;
      U.store.set('ex:mine', U.store.get('ex:mine', []).filter(x => x.id !== pb.id)); X.S.pb = null; X.renderList(); X.open(X.BUILTIN[0]);
    });
    const r = X.route(location.search);
    const linked = r.problem && X.BUILTIN.find(pb => pb.id === r.problem);
    if (linked) X.open(linked); else if (r.model) X.openModel(r.model); else X.open(X.BUILTIN[0]);
    if (r.mode === 'teacher') X.T.start(null, r.model ? (X.firstItem(r.model) || {}).key : null);
    const modelSel = U.$('#modelSel'), groups = [['I. Basic models', [1, 2]], ['II. Symmetric models', [4, 6, 5]], ['III. Extensions and authoring', [7, 8, 3]], ['IV. Problems', []]];
    modelSel.replaceChildren(...groups.map(([title, ids], i) => h('optgroup', { label: title }, ids.map(id => h('option', { value: String(id) }, X.LABS[id].code + ' ' + X.LABS[id].title)).concat(i === 3 ? [h('option', { value: 'problems' }, 'Worked problems'), h('option', { value: 'add' }, 'Add problems')] : []))));
    modelSel.value = String(X.modelOf(X.S.pb || X.BUILTIN[0]));
    modelSel.addEventListener('change', e => { const v = e.target.value; if (v === 'problems') { X.setMode('student'); X.open(X.BUILTIN[0]); } else if (v === 'add') location.href = 'examples.html?mode=add'; else location.href = 'examples.html?model=' + v; });
    X.setMode(r.mode, true);
    if (r.mode === 'student' && linked && r.guide) {
      const i = Number(r.guide) - 1;
      if (Number.isInteger(i) && i >= 0 && i < linked.qs.length) X.guide(i);
    }
  });
})(window.EL);
