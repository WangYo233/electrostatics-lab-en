'use strict';
// Worked problems (student): choose a problem → read → answer (options A, B, C, D) → guided exploration (predict first, then reveal) → view solution
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, X = EL.EX, W = X.W, V = EL.V, VA = EL.VA;
  const S = X.S = { pb: null, sol: null, qi: -1, step: 0, ans: {}, path: 0.3, res: {}, empty: null, pathPlaying: false, pathRaf: 0 };
  X.stopPath = function () { S.pathPlaying = false; if (S.pathRaf) cancelAnimationFrame(S.pathRaf); S.pathRaf = 0; };

  X.renderList = function () {
    const mine = U.store.get('ex:mine', []), item = (pb, tag) => h('button', { type: 'button', class: 'ex-item' + (S.pb && S.pb.id === pb.id ? ' on' : ''), onclick: () => X.open(pb) },
      h('b', null, pb.title), h('span', null, X.modelName(pb) + ' · ' + (pb.qs || []).length + ((pb.qs || []).length === 1 ? ' question' : ' questions') + (tag ? ' · ' + tag : '')));
    U.$('#exList').replaceChildren(h('h3', null, 'Built-in problems'), ...X.BUILTIN.map(pb => item(pb, pb.src)),
      h('h3', null, 'My problems'), ...(mine.filter(X.valid).length ? mine.filter(X.valid).map(pb => item(pb)) : [h('p.note', null, 'Problems saved in "Add problems" appear here.')]));
  };
  X.open = function (pb) {
    X.stopPath();
    S.pb = pb; S.sol = X.solve(pb); S.qi = -1; S.step = 0; S.ans = {}; S.res = {}; S.empty = null;
    X.renderList(); X.renderProblem(); W.r.cam.reset(W.AD * 1.2, false, true); X.focus(null);
  };
  // "Worked problems" jump from the lab: open the first worked problem of that model; if there is none, explain and keep the list
  X.openModel = function (id) {
    const pb = X.findByModel(id);
    if (pb) return X.open(pb);
    S.pb = null; S.sol = null; S.empty = +id; S.qi = -1;
    X.renderList(); X.renderProblem(); X.renderCap();
    W.last = null; W.r.setScene({});
  };
  X.focus = function (f) { S.f = f; if (S.pb) W.show(S.pb, S.sol, f); X.renderCap(); };

  X.renderProblem = function () {
    const box = U.$('#exMain');
    if (!S.pb) {
      const L = X.LABS[S.empty], it = X.firstItem(S.empty);
      return box.replaceChildren(h('h2', null, L ? L.code + ' ' + L.title : 'Worked problems'), h('div.ex-empty', null, h('p', null, 'This model has no worked problems yet. You can add one for it in "Add problems".'),
        it ? K.btn('Add a problem for this model', () => { X.T.start(null, it.key); X.setMode('teacher'); }, 'primary') : null, h('p.note', null, 'You can also choose a worked problem of another model in the list on the left.')));
    }
    const pb = S.pb, sol = S.sol;
    const cards = sol.ans.map((o, i) => {
      const q = o.q, r = S.res[i], right = X.rightOf(o), L = o.options ? X.optLetter(o.options, right) : '';
      const ansT = o.options ? L + '. ' + U.rich(right) : U.rich(o.answer);
      const fb = r && r.pick != null ? h('p', { class: 'fb ' + (r.ok ? 'ok' : 'bad'), html: (r.ok ? '✓ Correct' + (o.options ? '; the answer is ' + L : '') + '.' : '✗ ' + (o.options ? 'Option ' + X.optLetter(o.options, r.pick) + ' ' : 'This answer ') + 'is not correct. Think again.') + (r.show && !r.ok ? ' Answer: ' + ansT + '.' : '') })
        : r && r.show ? h('p.fb.skip', { html: 'Answer: ' + ansT + '.' }) : null;
      let inp;
      if (!o.ok) inp = h('p.note', null, o.err);
      else if (o.options) inp = h('div.opts', { role: 'group', 'aria-label': 'Options' }, o.options.map((v, j) => h('button', { type: 'button', class: 'btn opt' + (r && r.pick === v ? (r.ok ? ' ok' : ' bad') : ''), 'aria-pressed': !!(r && r.pick === v),
        html: '<b class="opt-l">' + X.letter(j) + '.</b> ' + U.rich(v), onclick: () => X.check(i, v) })));
      else { const t = h('input.cell', { type: 'text', placeholder: 'e.g. √3 or 2/3', 'aria-label': 'Enter your answer', style: 'width:9em' }); inp = h('div.row.wrap', null, t, K.btn('Check answer', () => X.check(i, t.value))); }
      return h('section.qcard' + (S.qi === i ? '.on' : ''), null, h('div.qh', null, h('span.qn', null, '(' + (i + 1) + ')'), h('p', { html: U.rich(X.qText2(q, pb)) })), inp, fb,
        o.ok ? h('div.btns', null, K.btn('Guided exploration', () => X.guide(i), S.qi === i ? 'on' : ''), K.btn(r && r.exp ? 'Hide solution' : 'Show solution', () => { S.res[i] = Object.assign(S.res[i] || {}, { exp: !(r && r.exp), show: true }); X.renderProblem(); }), K.btn('Show answer', () => { S.res[i] = Object.assign(S.res[i] || {}, { show: true }); X.renderProblem(); }, 'ghost')) : null,
        r && r.exp ? h('div.exp', null, ...X.explain(o).map(l => h('div', null, h('p', { html: U.rich(l.t) }), l.tex || l.rows ? h('div.formula', { html: VA.stepHTML(l) }) : null))) : null);
    });
    box.replaceChildren(h('h2', null, pb.title), h('div.stem', null, h('p', { html: U.rich(pb.stem || X.stem(pb, sol.R)) }), pb.note ? h('p.note', { html: U.rich(pb.note) }) : null), ...cards);
  };
  X.check = function (i, v) {
    const o = S.sol.ans[i];
    let ok;
    if (o.options) ok = v === X.rightOf(o);
    else { const x = U.parseNum(String(v).replace(/ .*$/, '')); ok = isFinite(x) && Math.abs(x - o.value) <= Math.max(0.002, 0.005 * Math.abs(o.value)); }
    S.res[i] = Object.assign(S.res[i] || {}, { ok, pick: v, show: ok });
    X.renderProblem();
  };

  // Guided exploration: field questions run the 3D synthesis steps; path questions are explored by dragging; potential questions list each term; analytic fields show readings at the field points; disks show the charge pairs
  X.guide = function (i) {
    X.stopPath();
    const o = S.sol.ans[i], R = S.sol.R;
    S.qi = i; S.step = 0; S.ans = {};
    if (o.focus === 'pairs') X.focus({ kind: 'pairs' });
    else if (o.q.t === 'trend') { S.path = 0.3; X.focus({ kind: 'path', a: o.q.a, b: o.q.b, s: S.path }); }
    else if (R.analytic) X.focus({ kind: 'probe', pts: o.probePts || o.probe.map(n => R.pts[n].p), names: o.probePts ? null : o.probe });
    else if (o.plan && (o.q.t === 'E' || o.q.t === 'angle' || o.q.t === 'Ezero')) X.focusStep();
    else if (o.q.t === 'V') X.focus({ kind: 'terms', at: [o.q.at] });
    else X.focus({ kind: 'terms', at: [o.q.a, o.q.b] });
    X.renderProblem();
  };
  X.focusStep = function () {
    const o = S.sol.ans[S.qi], st = o.plan[S.step], rev = !st.ask || S.ans[S.step] != null;
    const k = rev ? S.step : S.step - 1;
    X.focus({ kind: 'plan', plan: o.plan, k: Math.max(0, k), step: S.step, hide: S.step > 0 });
    const v = st.view;
    if (v) W.align(v === 'reset' ? 'reset' : v, st.tetra ? o.plan.d.parts.map(s => W.M(s.p)).concat([W.M(st.tetra.P), W.M(st.tetra.H)]) : null);
  };
  const fmtP = p => '(' + p.map(x => U.fmt(x, 3)).join(', ') + ')';
  function drawPotentialCurve(canvas, R, a, b, s) {
    const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h0 = canvas.clientHeight;
    if (!w || !h0) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h0 * dpr);
    const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h0);
    const vals = Array.from({ length: 101 }, (_, i) => { const x = 0.02 + 0.96 * i / 100, q = V.lerp(R.pts[a].p, R.pts[b].p, x); return [x, R.field(q).V]; }).filter(x => isFinite(x[1]));
    if (!vals.length) return;
    const lo = Math.min(...vals.map(x => x[1])), hi = Math.max(...vals.map(x => x[1])), span = hi - lo || 1;
    const L = 38, T = 10, B = 22, RW = w - L - 8, RH = h0 - T - B;
    const Xp = x => L + (x - 0.02) / 0.96 * RW, Yp = y => T + (hi - y) / span * RH;
    const dark = EL.theme === 'dark'; g.strokeStyle = dark ? '#718096' : '#68778a'; g.fillStyle = dark ? '#e5edf7' : '#263446'; g.lineWidth = 1; g.font = '11px sans-serif';
    g.beginPath(); g.moveTo(L, T); g.lineTo(L, T + RH); g.lineTo(L + RW, T + RH); g.stroke();
    g.fillText('V', 8, 13); g.fillText(a + ' → ' + b, Math.max(L + 4, w - 65), h0 - 4); g.fillText(U.fmt(hi, 3), 3, T + 4); g.fillText(U.fmt(lo, 3), 3, T + RH);
    g.strokeStyle = '#f28e2b'; g.lineWidth = 2; g.beginPath(); vals.forEach((q, i) => i ? g.lineTo(Xp(q[0]), Yp(q[1])) : g.moveTo(Xp(q[0]), Yp(q[1]))); g.stroke();
    const v = R.field(V.lerp(R.pts[a].p, R.pts[b].p, s)).V; if (isFinite(v)) { g.fillStyle = '#d1495b'; g.beginPath(); g.arc(Xp(s), Yp(v), 4, 0, Math.PI * 2); g.fill(); }
  }
  function animatePath() {
    if (!S.pathPlaying) return;
    S.path += 0.003; if (S.path > 0.98) S.path = 0.02;
    updatePath(S.path);
    S.pathRaf = requestAnimationFrame(animatePath);
  }
  function updatePath(value) {
    if (!S.sol || S.qi < 0) return;
    const f = S.f;
    S.path = value; f.s = value;
    W.show(S.pb, S.sol, f);
    const box = U.$('#caption'), range = box.querySelector('input[type="range"]'), number = box.querySelector('input[type="number"]');
    if (range) range.value = value;
    if (number && document.activeElement !== number) number.value = value.toFixed(3);
    const R = S.sol.R, p = V.lerp(R.pts[f.a].p, R.pts[f.b].p, value), field = R.field(p), T = field.ok ? field.E : [0, 0, 0], t = V.norm(V.sub(R.pts[f.b].p, R.pts[f.a].p)), Ep = V.dot(T, t), th = V.len(T) > 1e-12 ? VA.ang(T, t) : 90, u = R.units;
    const tip = !field.ok ? 'The field is undefined at X.' : V.len(T) <= 1e-12 ? 'The net field at X is zero, so the potential has zero rate of change along the path here.'
      : 'The angle between the net field and the path is about ' + VA.f4(th) + '°, and the field component along the path E_∥ is about ' + VA.f4(Ep) + (u.E ? ' ' + u.E : '') + '. ' +
        (Ep > 1e-9 ? 'Since the angle is less than 90°, potential decreases along the path near X.' : Ep < -1e-9 ? 'Since the angle is greater than 90°, potential increases along the path near X.' : 'The field is perpendicular to the path, so the potential has zero rate of change along it near X.');
    const text = box.querySelector('.cap-t'); if (text) text.innerHTML = U.rich(tip);
    const curve = box.querySelector('canvas.potential-curve'); if (curve) drawPotentialCurve(curve, R, f.a, f.b, value);
  }
  X.renderCap = function () {
    const box = U.$('#caption'), f = S.f;
    if (!f || !S.pb) { box.hidden = true; return; }
    box.hidden = false;
    const R = S.sol.R, u = R.units, o = S.sol.ans[S.qi], close = K.btn('Exit exploration', () => { X.stopPath(); S.qi = -1; X.focus(null); X.renderProblem(); W.r.cam.reset(W.AD * 1.2, false, true); }, 'mini');
    if (f.kind === 'plan') {
      const st = o.plan[S.step], ans = S.ans[S.step], n = o.plan.length, kids = [h('div.cap-h', null, h('span.cap-n', null, '3D synthesis ' + (S.step + 1) + ' / ' + n), h('b', { html: U.rich(st.title) }))];
      if (st.ask && ans == null && st.setup) kids.push(h('p.cap-t', { html: U.rich(st.setup) }));
      if (st.ask && ans == null) kids.push(h('p.cap-q', { html: 'Predict first: ' + U.rich(st.ask.q) }), h('div.cap-opts', null, st.ask.options.map((v, j) => { const b = K.btn('', () => { S.ans[S.step] = v; X.focusStep(); }); b.innerHTML = '<b class="opt-l">' + X.letter(j) + '.</b> ' + U.rich(v); return b; }), K.btn('Skip prediction', () => { S.ans[S.step] = ''; X.focusStep(); }, 'mini skip')));
      else {
        const aL = st.ask ? X.optLetter(st.ask.options, st.ask.a) + '. ' + U.rich(st.ask.a) : '';
        if (st.ask) kids.push(h('p', { class: 'cap-fb ' + (ans === '' ? 'skip' : ans === st.ask.a ? 'ok' : 'bad'), html: (ans === '' ? 'Answer: ' + aL + '. ' : ans === st.ask.a ? '✓ Correct. ' : '✗ Answer: ' + aL + '. ') + U.rich(st.ask.why) }));
        kids.push(h('p.cap-t', { html: U.rich(st.text) }), h('div', { html: VA.stepHTML(st) }));
      }
      kids.push(h('div.cap-nav', null, K.btn('‹', () => { if (S.step > 0) { S.step--; X.focusStep(); } }, 'mini'), h('span.cap-dots', null, o.plan.map((_, j) => h('i', { class: j === S.step ? 'on' : j < S.step ? 'done' : '' }))), close,
        K.btn(S.step === n - 1 ? 'Done' : 'Next ›', () => { if (S.step < n - 1) { S.step++; X.focusStep(); } else close.click(); }, 'mini primary')));
      box.replaceChildren(...kids);
    } else if (f.kind === 'path') {
      const a = R.pts[f.a].p, b = R.pts[f.b].p, p = V.lerp(a, b, f.s), s = R.field(p);
      const T = s.ok ? s.E : [0, 0, 0], t = V.norm(V.sub(b, a)), Ep = V.dot(T, t), th = V.len(T) > 1e-12 ? VA.ang(T, t) : 90;
      const sl = K.slider({ label: 'Position of X, ' + f.a + 'X : ' + f.a + f.b, min: 0.02, max: 0.98, step: 0.001, val: f.s, on: v => updatePath(v) });
      const curve = h('canvas.potential-curve', { 'aria-label': 'Potential along the path' });
      requestAnimationFrame(() => drawPotentialCurve(curve, R, f.a, f.b, f.s));
      const tip = !s.ok ? 'The field at X is undefined.' : V.len(T) <= 1e-12 ? 'The net field at X is zero, so the potential does not change along the path here.'
        : 'The angle between the net field and the path direction is about ' + VA.f4(th) + '°, and the component of the net field along the path, E_∥, is about ' + VA.f4(Ep) + (u.E ? ' ' + u.E : '') + '. ' +
          (Ep > 1e-9 ? 'The angle is less than 90°, so the potential decreases along the path near X.' : Ep < -1e-9 ? 'The angle is greater than 90°, so the potential increases along the path near X.' : 'The net field is perpendicular to the path, so the potential does not change along the path near X.');
      box.replaceChildren(h('div.cap-h', null, h('span.cap-n', null, 'Path from ' + f.a + ' to ' + f.b), h('b', null, 'Drag X to watch the angle between the net field and the path direction')), sl,
        h('div.cap-curve-wrap', null, curve), h('div.cap-nav', null, h('span'), K.btn(S.pathPlaying ? 'Pause animation' : 'Play path', () => { S.pathPlaying = !S.pathPlaying; if (S.pathPlaying) S.pathRaf = requestAnimationFrame(animatePath); else { cancelAnimationFrame(S.pathRaf); S.pathRaf = 0; } X.renderCap(); }, 'mini')),
        h('p.cap-t', { html: U.rich(tip) }), h('div.cap-nav', null, h('span'), close));
    } else if (f.kind === 'probe') {
      const rows = [['Field point', 'Coordinates / L', 'Region', 'φ', '|E|']];
      f.pts.forEach((p, i) => { const s = R.field(p); rows.push([f.names ? f.names[i] : 'Point ' + (i + 1), fmtP(p), s.region || '—', isFinite(s.V) ? X.niceNum(s.V).text : 'undefined', s.E.every(isFinite) ? X.niceNum(V.len(s.E)).text : 'undefined']); });
      box.replaceChildren(h('div.cap-h', null, h('span.cap-n', null, EL.SUB08[S.pb.sub].name), h('b', null, 'Readings at the field points (computed from the lab\'s analytic field)')), h('div', { html: VA.stepHTML({ rows }) }),
        h('p.cap-t', null, 'The white arrow shows the direction of the net field at the field point. Turn on "Field lines" and compare the spacing and direction of the field lines in each region.'), h('div.cap-nav', null, h('span'), close));
    } else if (f.kind === 'pairs') {
      const src = R.sources, n = src.length, e = X.diskEnergy(S.pb.disk);
      box.replaceChildren(h('div.cap-h', null, h('span.cap-n', null, 'Total interaction energy'), h('b', null, 'Each pair of charges is counted once')),
        h('p.cap-t', { html: U.rich('In the figure, dashed lines join every pair of charges: ' + n + ' × ' + (n - 1) + ' / 2 = ' + n * (n - 1) / 2 + ' pairs. The total interaction energy U is about ' + VA.f4(e.U) + ' ' + u.U + '.') }), h('div.cap-nav', null, h('span'), close));
    } else {
      const rows = [['Point', ...R.sources.map(s => 'kq_' + s.label + '/r'), 'φ']];
      for (const n of f.at) { const p = R.pts[n].p, ts = R.sources.map(s => s.q / V.dist(p, s.p)); rows.push([n, ...ts.map(VA.f4), VA.txtV(ts.reduce((x, y) => x + y, 0))]); }
      box.replaceChildren(h('div.cap-h', null, h('span.cap-n', null, 'Potential is a scalar'), h('b', null, 'Add the potentials of the sources, signs included')), h('div', { html: VA.stepHTML({ rows }) }), h('div.cap-nav', null, h('span'), close));
    }
  };
})(window.EL);
