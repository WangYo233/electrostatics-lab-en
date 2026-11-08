'use strict';
// Teaching flow: construction steps (predict first, reveal after), canvas caption bar, derivation, head-on plane view, classroom presentation mode, worksheet export
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, A = EL.App, V = EL.V;

  // View a plane head-on along its normal n (turns 3D vector synthesis into a plane construction)
  A.alignView = function (n) {
    const cam = A.r.cam;
    if (n === 'reset') return cam.reset(A.c.bound, A.st.view === '2d', true);
    if (A.st.view !== '3d') return;
    let d = V.norm(n);
    if (V.dot(d, V.sub(cam.eye(), cam.target)) < 0) d = V.mul(d, -1);
    cam.tween({ theta: Math.atan2(d[1], d[0]), phi: U.clamp(Math.asin(U.clamp(d[2], -1, 1)), -1.5, 1.5), target: [0, 0, 0] }, 750);
  };

  // Caption bar below the canvas: step title, description, equations, and prediction question
  A.renderCaption = function (force) {
    const box = U.$('#caption'), cs = A.c && A.c.cs;
    if (!cs) { box.hidden = true; A.capSig = null; return; }
    const sig = cs.i + ':' + cs.ans + ':' + U.fmtVec(A.c.probe.pos, 3) + ':' + A.c.sources.map(s => s.q + U.fmtVec(s.p, 3)).join();
    if (!force && sig === A.capSig) return;
    A.capSig = sig;
    box.hidden = false;
    box.replaceChildren(...A.capNodes(cs, ans => { A.st.wiz.ans[cs.i] = ans; A.afterStep(); }, {
      prev: () => A.gotoStep(cs.i - 1), next: () => cs.i === cs.n - 1 ? A.stopWizard() : A.gotoStep(cs.i + 1), stop: () => A.stopWizard(),
      label: (A.st.wiz.method === 'coord' ? 'Coordinate method ' : 'Geometric method ') + (cs.i + 1) + ' / ' + cs.n, hideNote: A.st.wiz.hide }).filter(Boolean));
  };
  // Caption bar content (shared by the lab and worked problems): predict → feedback → description, table, equations → navigation
  A.capNodes = function (cs, onAns, nav) {
    const s = cs.step, kids = [h('div.cap-h', null, h('span.cap-n', null, nav.label), h('b', { html: U.rich(s.title) }))];
    if (s.ask && cs.ans == null) {
      kids.push(h('p.cap-q', { html: 'Predict first: ' + U.rich(s.ask.q) }),
        h('div.cap-opts', null, s.ask.options.map(o => { const b = K.btn('', () => onAns(o)); b.innerHTML = U.rich(o); return b; }), K.btn('Skip prediction', () => onAns(''), 'mini skip')));
    } else {
      if (s.ask) {
        const ok = cs.ans === s.ask.a;
        kids.push(h('p', { class: 'cap-fb ' + (cs.ans === '' ? 'skip' : ok ? 'ok' : 'bad'), html: (cs.ans === '' ? 'Answer: ' + U.rich(s.ask.a) + '. ' : ok ? '✓ Correct prediction. ' : '✗ Incorrect prediction. The answer is ' + U.rich(s.ask.a) + '. ') + U.rich(s.ask.why) }));
      }
      kids.push(h('p.cap-t', { html: U.rich(s.text) }), h('div', { html: EL.VA.stepHTML(s) }));
    }
    const last = cs.i === cs.n - 1;
    kids.push(h('div.cap-nav', null, K.btn('‹', nav.prev, 'mini', 'Previous step'),
      h('span.cap-progress', null, 'Step ' + (cs.i + 1) + ' / ' + cs.n),
      nav.stop ? K.btn('Exit guide', nav.stop, 'mini') : null, K.btn(last ? 'Finish synthesis' : 'Next step ›', nav.next, 'mini primary')));
    return kids;
  };

  A.gotoStep = function (i) {
    const cs = A.c && A.c.cs;
    if (!cs) return;
    A.st.wiz.i = EL.U.clamp(i, 0, cs.n - 1);
    A.afterStep();
  };
  A.afterStep = function () {
    A.update();
    const cs = A.c.cs;
    if (cs && cs.k >= 0) { const v = cs.steps[cs.k].view; if (v) A.alignView(typeof v === 'function' ? v(A.c) : v); }
    A.renderCaption(true); A.renderStepList(); A.renderDerive(); A.renderComp();
  };
  // Overview of guide steps in the Analyze workspace
  A.renderStepList = function () {
    const cs = A.c && A.c.cs, box = U.$('#stepList');
    if (!box) return;
    U.$('#wizStart').hidden = !!cs;
    if (!cs) { box.replaceChildren(); return; }
    box.replaceChildren(...cs.steps.map((x, i) => {
      const ans = A.st.wiz.ans[i];
      return h('li', { class: (i === cs.i ? 'on' : '') + (i < cs.i ? ' done' : '') }, h('button', { type: 'button', onclick: () => A.gotoStep(i) },
        h('span.n', null, i + 1), h('span', { html: U.rich(x.title) }), x.ask ? h('em', { class: ans == null ? 'q' : ans === x.ask.a ? 'ok' : 'bad', title: ans == null ? 'This step has a prediction question that is not yet answered' : '' }, ans == null ? '?' : ans === x.ask.a ? '✓' : '✗') : null));
    }));
  };
  // Derivation summary of the revealed steps
  A.renderDerive = function () {
    const cs = A.c && A.c.cs, box = U.$('#deriveBox');
    box.hidden = !cs;
    if (!cs) return;
    const rows = cs.steps.slice(0, cs.k + 1).filter(x => x.tex).map(x => h('div.der', null, h('b', { html: U.rich(x.title) }), h('div.formula', { html: EL.texBlock(x.tex) })));
    U.$('#derive').replaceChildren(...(rows.length ? rows : [K.note('After you complete synthesis steps below the canvas, the calculation for each step is summarized here in order.')]));
  };

  // Classroom presentation: hide the tools and inspector, enlarge the canvas and caption bar, and advance step by step with the arrow keys
  A.togglePresent = function (on) {
    on = on == null ? !document.body.classList.contains('present') : on;
    document.body.classList.toggle('present', on);
    if (on && !/explore|analyze/.test(document.body.dataset.mode)) A.setMode('explore');
    U.$('#btnPresent').setAttribute('aria-pressed', on);
    setTimeout(() => { A.r.draw(); A.setMode(document.body.dataset.mode); }, 380);
  };

  // Export the worksheet (printable HTML); with teacher=true, add reference answers and teaching notes
  A.exportWorksheet = function (teacher) {
    const m = A.st.model, sub = A.st.sub, t = A.theoryOf(), ex = m.exercisesFor ? m.exercisesFor(sub) : m.exercises || [];
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const lines = n => '<div class="ln"></div>'.repeat(n);
    let html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(m.code + ' ' + m.title) + ' worksheet</title><style>' +
      'body{font-family:"Times New Roman","Microsoft YaHei",serif;max-width:800px;margin:24px auto;padding:0 20px;color:#142033;line-height:1.6}' +
      'h1{font-size:22px}h2{font-size:16px;border-left:4px solid #3d55d1;padding-left:8px;margin-top:26px}h3{font-size:14px;margin:14px 0 4px}' +
      '.ln{border-bottom:1px solid #9aa6b2;height:26px}.q{margin:8px 0}.box{border:1px solid #cdd5df;border-radius:6px;padding:8px 12px;margin:8px 0}' +
      'table{border-collapse:collapse;width:100%}td,th{border:1px solid #9aa6b2;height:30px;padding:4px}.ans{color:#2c41ad}math{font-family:"Cambria Math","STIX Two Math","Latin Modern Math",serif}math.rm{font-size:1em}' +
      '.eqn{display:grid;grid-template-columns:minmax(3em,1fr) auto minmax(3em,1fr);align-items:center;margin:8px 0}.eqn-m{grid-column:2;text-align:center}.eqn-n{grid-column:3;justify-self:end;font-family:"Times New Roman",serif}math[display=block]{display:block math;margin:4px auto}' +
      '@media print{body{margin:0}h2{break-after:avoid}.st{break-inside:avoid}}</style></head><body>';
    html += '<h1>' + esc(m.code + ' ' + m.title + (m.analytic ? ' · ' + EL.SUB08[sub].name : '')) + ' worksheet' + (teacher ? ' (teacher edition)' : '') + '</h1>';
    const R = U.richMath;
    html += '<p>Name ________　Class ________　Date ________</p><h2>I. Fundamentals</h2><p>' + R(t.intro) + '</p>' +
      t.formulas.map((x, i) => EL.texEq(x.tex, i + 1) + '<p style="font-size:13px;color:#3a4a60"><b>Eq. (' + (i + 1) + ')</b>　' + R(x.where) + '</p>').join('');
    html += '<h2>II. The model</h2>' + A.figure(A.c, t).replace('<svg ', '<svg style="max-width:420px;display:block;margin:6px auto" ') + '<p>' + R(t.model) + '</p>';
    html += '<h2>III. Inquiry</h2>';
    m.stages.forEach((s, i) => {
      html += '<div class="st"><h3>Stage ' + (i + 1) + '　' + esc(s.title) + '</h3><p class="q"><b>Question: </b>' + R(s.q) + '</p><p><b>What to observe: </b>' + R(s.obs) + '</p>';
      html += '<div class="box"><b>My prediction: </b>' + lines(2) + '</div><p><b>What to record: </b>' + R(s.rec) + '</p>' + lines(3);
      if (teacher && s.hint) html += '<p class="ans">Reasoning hint: ' + R(s.hint) + '</p>';
      html += '</div>';
    });
    if (!m.analytic) html += '<h3>Field synthesis record (use the field-synthesis guide in the Analyze workspace)</h3><table><tr><th>Field point</th><th>Magnitudes of the component fields</th><th>First pair combined and their angle</th><th>Partial sums Σ₁, Σ₂</th><th>Net field</th></tr>' + '<tr><td></td><td></td><td></td><td></td><td></td></tr>'.repeat(3) + '</table>';
    html += '<h2>Predictions and checks</h2>' + ex.map((e, i) => '<p class="q">' + (i + 1) + '. ' + R(e.q) + (e.options ? '<br>' + e.options.map(o => '□ ' + R(o)).join('　') : '　Answer: __________') +
      (teacher ? '<br><span class="ans">Answer: ' + R(e.options ? e.a : U.fmt(e.a, 6)) + (e.why ? '. ' + R(e.why) : '') + '</span>' : '') + '</p>').join('');
    html += '<h2>Study log</h2><table><tr><th>Configuration / position</th><th>Prediction</th><th>Measured V, E</th><th>Explanation / conclusion</th></tr>' + '<tr><td></td><td></td><td></td><td></td></tr>'.repeat(5) + '</table></body></html>';
    U.download('worksheet_' + m.code + '_' + m.title + (teacher ? '_teacher' : '') + '.html', html, 'text/html;charset=utf-8');
  };
})(window.EL);
