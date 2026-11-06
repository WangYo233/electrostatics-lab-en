'use strict';
// Page self-check: when the URL has #audit, click every function one by one, record script errors and abnormal states, and show the result at the bottom right of the page where it can be copied
(function () {
  if (typeof location === 'undefined' || !/audit/.test(location.hash + location.search)) return;
  const errs = [], issues = [], log = [], t0 = Date.now();
  window.addEventListener('error', e => errs.push(e.message + ' @ ' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', e => errs.push('Promise: ' + (e.reason && e.reason.message || e.reason)));
  window.confirm = () => true; window.alert = () => {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = b => b.isConnected && !b.disabled && b.offsetParent !== null;
  const clickAll = async (sel, tag) => { for (const b of [...document.querySelectorAll(sel)]) { if (!vis(b)) continue; try { b.click(); } catch (e) { issues.push(tag + ' click error: ' + e.message); } await sleep(2); } };
  // English prose uses "undefined" as a word ("the field is undefined there"), so only flag code leftovers:
  // NaN, [object …], null/undefined glued to other text by string concatenation
  const BAD = /NaN|\[object|nullnull|undefined(?=[A-Za-z0-9])|(?<=[A-Za-z0-9])undefined|(?<=[A-Za-z0-9])null\b/;
  const nanText = (sel, tag) => { const el = document.querySelector(sel); const t = el ? el.innerText : ''; if (BAD.test(t)) issues.push(tag + ' text contains NaN/undefined: ' + t.match(new RegExp('.{0,30}(' + BAD.source + ').{0,20}'))[0]); };

  async function auditLab() {
    const EL = window.EL, A = EL.App, U = EL.U;
    U.download = () => {}; U.toast = () => {};
    const order = EL.MODELS.slice().sort((a, b) => (a.order || 99) - (b.order || 99));
    for (const m of order) {
      try {
        A.init(m); A.applyStage(0, true); A.onModelChange();
        A.setMode('theory'); await sleep(10); nanText('#theoryBody', m.code + ' theory page');
        if (!document.querySelector('#theoryBody svg.fig')) issues.push(m.code + ' theory page has no diagram');
        await clickAll('#theoryBody details > summary', m.code + ' theory page');
        A.setMode('explore');
        for (let i = 0; i < m.stages.length; i++) {
          const tag = m.code + ' stage ' + (i + 1);
          A.gotoStage(i);
          await clickAll('#sbLayers button', tag + ' layer button'); await clickAll('#sbLayers button', tag + ' layer button');
          Object.assign(A.st.layers, { lines: true, flow: true, contours: true, probe: A.hasProbe(m) }); A.update();
          for (const t of ['params', 'display', 'style', 'anim']) {
            A.tab = t; A.drawerOff = false; A.renderPanel();
            await clickAll('#panel .seg button', tag + ' ' + t);
            await clickAll('#panel input[type=checkbox]', tag + ' ' + t); await clickAll('#panel input[type=checkbox]', tag + ' ' + t);
            nanText('#panel', tag + ' panel ' + t);
          }
          await clickAll('#stageActions button', tag + ' stage button');
          Object.assign(A.st.layers, { lines: true, probe: A.hasProbe(m) }); A.update();
          A.setMode('analyze'); await sleep(5);
          for (const id of ['#geoBox', '#compBox', '#curveBox']) { const d = document.querySelector(id); if (d) d.open = true; }
          A.renderGeo(); A.renderComp();
          await clickAll('#geo input[type=checkbox]', tag + ' geometry'); await clickAll('#comp input[type=checkbox]', tag + ' free synthesis');
          nanText('#readings', tag + ' readings'); nanText('#geo', tag + ' geometry');
          if (A.wizData(A.c) && A.c.probeVisible) for (const meth of ['geo', 'coord']) {
            A.st.wiz.method = meth; A.startWizard();
            const cs = A.c.cs;
            if (!cs) { issues.push(tag + ' guide cannot start (' + meth + ')'); continue; }
            for (let k = 0; k < cs.n; k++) { A.gotoStep(k); const o = [...document.querySelectorAll('#caption .cap-opts .btn')]; if (o.length) o[0].click(); nanText('#caption', tag + ' guide ' + meth + ' step ' + (k + 1)); await sleep(2); }
            A.stopWizard();
          }
          if (!A.st.layers.lines) issues.push(tag + ' field lines turned off after analysis');
          if (A.c.sources.some(s => s.q) && !A.r.scene.lines.some(l => l.reveal)) issues.push(tag + ' no field lines in the Analyze workspace');
          A.setMode('record'); await clickAll('#exercises .ex button', tag + ' exercises'); A.setMode('explore');
        }
        // Show flow particles only
        Object.assign(A.st.layers, { lines: false, flow: true }); A.update(); await sleep(30);
        if (A.c.sources.some(s => s.q) && !A.r.flow.n) issues.push(m.code + ' flow particles hidden after field lines turned off');
        if (A.r.scene.lines.some(l => l.reveal)) issues.push(m.code + ' field lines still drawn after being turned off');
        log.push(m.code + ' ✓');
      } catch (e) { issues.push(m.code + ' runtime error: ' + e.message + ' ' + String(e.stack || '').split('\n')[1]); }
    }
    try {
      const snap = A.snapshot(); A.st.notes.push({ p: [0, 0, 0], text: 'x' }); A.restore(snap);
      if (A.st.notes.length) issues.push('Annotations not restored after loading draft');
      A.exportWorksheet(false); A.exportWorksheet(true); A.togglePresent(true); await sleep(450); A.togglePresent(false);
      log.push('draft / worksheet / present ✓');
    } catch (e) { issues.push('Draft or worksheet error: ' + e.message); }
  }

  async function auditEx() {
    const EL = window.EL, X = EL.EX, U = EL.U;
    U.download = () => {}; U.toast = () => {};
    for (const pb of X.BUILTIN) {
      try {
        X.setMode('student'); X.open(pb); await sleep(10);
        X.S.sol.ans.forEach((o, i) => { if (!o.ok) issues.push(pb.id + ' part ' + (i + 1) + ' cannot be solved: ' + o.err); });
        for (let i = 0; i < X.S.sol.ans.length; i++) {
          const o = X.S.sol.ans[i];
          if (!o.ok) continue;
          X.guide(i); await sleep(5);
          if (X.S.f && X.S.f.kind === 'plan') for (let k = 0; k < o.plan.length; k++) { X.S.step = k; if (o.plan[k].ask) X.S.ans[k] = o.plan[k].ask.a; X.focusStep(); nanText('#caption', pb.id + ' part ' + (i + 1) + ' guide step ' + (k + 1)); await sleep(2); }
          if (o.options) { X.check(i, o.q.t === 'E' ? o.mag : o.answer); if (!X.S.res[i].ok) issues.push(pb.id + ' part ' + (i + 1) + ': correct option marked wrong'); }
          X.S.res[i] = { exp: true, show: true }; X.renderProblem(); nanText('#exMain', pb.id + ' explanation');
        }
        log.push(pb.id + ' ✓');
      } catch (e) { issues.push(pb.id + ' runtime error: ' + e.message); }
    }
    try {
      X.setMode('teacher'); X.T.start();
      for (const tpl of Object.keys(X.TEMPLATES)) {
        X.T.d.tpl = tpl; X.T.d.charges = Object.fromEntries(X.geo(tpl).labels.map((n, i) => [n, i % 2 ? 1 : -1])); X.T.d.pts = {}; X.T.d.qs = [];
        const sug = X.suggest(X.T.d); if (sug[0]) X.T.d.pts.P = { def: sug[0].c.def };
        for (const t of Object.keys(X.QTYPES)) X.T.d.qs.push(X.defQ(t, X.T.d, X.T.sol()));
        for (let s = 0; s < 5; s++) { X.T.step = s; X.T.render(); nanText('#tForm', tpl + ' authoring step ' + (s + 1)); nanText('#tAssist', tpl + ' authoring assistant'); await sleep(3); }
        await clickAll('#tForm .seg button', tpl + ' charge button');
        X.print(X.T.d, false); X.print(X.T.d, true);
        log.push('authoring ' + tpl + ' ✓');
      }
      X.setMode('student');
    } catch (e) { issues.push('Problem authoring error: ' + e.message + ' ' + String(e.stack || '').split('\n')[1]); }
  }

  function report(page) {
    const ok = !errs.length && !issues.length, txt = '[' + page + ' audit] ' + (ok ? 'All passed' : 'Problems found') + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s\n' +
      (errs.length ? 'Script errors:\n' + [...new Set(errs)].join('\n') + '\n' : '') + (issues.length ? 'Issues:\n' + [...new Set(issues)].join('\n') + '\n' : '') + 'Checked: ' + log.join(', ');
    try { localStorage.setItem('ejp-lab-en:audit:' + page, txt); } catch (e) {}
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:999;width:min(560px,90vw);max-height:60vh;overflow:auto;background:#fff;color:#142033;border:2px solid ' + (ok ? '#009e73' : '#b4233c') + ';border-radius:12px;padding:12px 14px;font:13px/1.6 "Microsoft YaHei",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3);white-space:pre-wrap';
    box.textContent = txt;
    const bar = document.createElement('div'); bar.style.marginTop = '8px';
    const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'margin-right:8px;padding:4px 10px;border:1px solid #ccd;border-radius:6px;background:#f4f6fd;cursor:pointer'; b.onclick = f; bar.append(b); };
    btn('Copy result', () => { navigator.clipboard && navigator.clipboard.writeText(txt); b0.textContent = 'Copied'; });
    const b0 = bar.lastChild;
    if (page === 'Lab') btn('Continue to the worked problems page →', () => { location.href = 'examples.html#audit'; });
    btn('Close', () => box.remove());
    box.append(bar); document.body.append(box);
  }

  window.addEventListener('load', () => setTimeout(async () => {
    const isEx = !!(window.EL && window.EL.EX && window.EL.EX.T);
    try { if (isEx) await auditEx(); else await auditLab(); } catch (e) { issues.push('Audit error: ' + e.message); }
    await sleep(300);
    report(isEx ? 'Worked problems' : 'Lab');
  }, 600));
})();
