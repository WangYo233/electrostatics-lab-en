'use strict';
// Add problems: choose a model → place charges → select key points → set questions → generate and publish. The assistant computes answers live and gives diagnostics, suggestions, the stem, distractors and solutions
// Questions can be added for every model of the platform: symmetric models and point-charge templates, free exploration (freely placed point charges and geometric backgrounds), analytic-field models, charges on a disk
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, X = EL.EX, W = X.W, V = EL.V;
  const STEPS = ['Choose a model', 'Place charges', 'Select key points', 'Set questions', 'Generate and publish'];
  const T = X.T = { step: 0, d: null };
  const blank = key => X.applyItem({ id: 'my-' + Date.now().toString(36), title: 'New problem' }, X.itemOf(key || 'tpl:pair:1'));
  const freeName = d => { const used = new Set(X.resolve(d).g.labels.concat(Object.keys(d.pts))); return 'PMNOEFGHKSTUW'.split('').find(c => !used.has(c)) || 'X' + Object.keys(d.pts).length; };
  const PRESET = {
    alt: ['Alternating signs', ls => Object.fromEntries(ls.map((n, i) => [n, i % 2 ? 1 : -1]))],
    pos: ['All +Q', ls => Object.fromEntries(ls.map(n => [n, 1]))],
    one: ['One −Q, the rest +Q', ls => Object.fromEntries(ls.map((n, i) => [n, i ? 1 : -1]))],
    none: ['Clear charges', () => ({})]
  };
  // pb: the problem being adapted; key: the item to author for (a key in X.catalog), used to enter directly from the lab or from "This model has no worked problems yet"
  T.start = function (pb, key) {
    T.d = pb ? JSON.parse(JSON.stringify(pb)) : blank(key);
    if (pb) { T.d.model = X.modelOf(pb); T.d.kind = X.kindOf(pb); }
    if (pb && !String(pb.id).startsWith('my-')) { T.d.id = 'my-' + Date.now().toString(36); T.d.title = pb.title + ' (adapted)'; delete T.d.src; }
    T.step = pb ? 3 : key ? 1 : 0; T.focus = null; T.render();
  };
  T.sol = () => X.solve(T.d);
  T.render = function () {
    const d = T.d, sol = T.sol();
    U.$('#tSteps').replaceChildren(...STEPS.map((s, i) => h('li', { class: (i === T.step ? 'on' : '') + (i < T.step ? ' done' : '') }, h('button', { type: 'button', onclick: () => { T.step = i; T.render(); } }, h('span.n', null, i + 1), s))));
    const f = [T.f0, T.f1, T.f2, T.f3, T.f4][T.step];
    U.$('#tForm').replaceChildren(h('h2', null, STEPS[T.step]), h('p.t-model', null, 'Current model: ' + X.modelName(d)), ...f(d, sol).filter(Boolean), h('div.btns.tnav', null,
      T.step > 0 ? K.btn('‹ Back', () => { T.step--; T.render(); }) : null, T.step < 4 ? K.btn('Next ›', () => { T.step++; T.render(); }, 'primary') : null));
    T.assist(d, sol);
    W.show(d, sol, T.focus || null);
  };
  const upd = () => { T.render(); };

  // ---- Step 1: all models, grouped like the home page ----
  T.f0 = d => {
    const cur = X.itemKey(d);
    return [...X.catalog().map(g => h('section.t-cat', null, h('h3', null, g.title), ...g.labs.map(L => h('div.t-lab', null, h('h4', null, L.code + ' ' + L.title),
      h('div.tpls', null, L.items.map(it => h('button', { type: 'button', class: 'tpl' + (cur === it.key ? ' on' : ''), 'aria-pressed': cur === it.key, onclick: () => {
        if (cur === it.key) return; X.applyItem(d, it); T.focus = null; W.r.cam.reset(W.AD * 1.2, false, true); upd();
      } }, h('b', null, it.name), h('span', null, it.desc)))))))),
    K.note('Switching models clears the key points and questions you have added.')];
  };

  // ---- Step 2: sources ----
  T.f1 = function (d) {
    const k = X.kindOf(d);
    if (k === 'free') return T.srcFree(d);
    if (k === 'field') return T.srcField(d);
    if (k === 'disk') return T.srcDisk(d);
    const ls = X.geo(d.tpl).labels;
    return [h('div.btns', null, Object.keys(PRESET).map(k2 => K.btn(PRESET[k2][0], () => { d.charges = PRESET[k2][1](ls); upd(); }, 'mini'))),
      h('table.src', null, h('thead', null, h('tr', null, h('th', null, 'Vertex'), h('th', null, 'Charge q / Q'))), h('tbody', null, ls.map(n => h('tr', null, h('td', null, n),
        h('td', null, K.seg([[-2, '−2'], [-1, '−1'], [0, '0'], [1, '+1'], [2, '+2']], d.charges[n] || 0, v => { d.charges[n] = +v; upd(); })))))),
      K.note('Charges are in units of Q. Choose 0 to leave a vertex uncharged.')];
  };
  // Free exploration: point charges (by coordinates or bound to a special point of a background) and geometric backgrounds
  const BG_DIMS = { square: ['w'], rect: ['w', 'l'], triangle: ['w', 'l'], circle: ['w'], sphere: ['w'], pyramid: ['w', 'l', 'h'], prism: ['w', 'l', 'h'] };
  const DIM_LABEL = t => ({ w: ['circle', 'sphere'].includes(t) ? 'Diameter' : ['square', 'rect', 'triangle', 'pyramid', 'prism'].includes(t) ? 'Length (x direction)' : 'Circumscribed sphere diameter', l: t === 'triangle' ? 'Height' : 'Width (y direction)', h: 'Height' });
  T.srcFree = function (d) {
    const g = X.resolve(d).g;
    const nextLabel = () => { const used = new Set(d.srcs.map(s => s.label)); for (let i = 1; ; i++) if (!used.has('Q' + i)) return 'Q' + i; };
    const bindOpts = [['', 'Not bound (use coordinates)']].concat(...g.bgs.map((b, bi) => b.special.map(s => [bi + ':' + s.key, 'Background ' + (bi + 1) + ' · ' + s.name])));
    const delSrc = i => { const n = d.srcs[i].label; d.srcs.splice(i, 1); d.qs = d.qs.filter(q => ![q.at, q.a, q.b].includes(n)); for (const p in d.pts) if (JSON.stringify(d.pts[p].def).includes('"' + n + '"')) delete d.pts[p]; upd(); };
    const rows = d.srcs.flatMap((s, i) => {
      const p = X.srcPos(g, s);
      return [h('tr', null, h('td', null, s.label),
        ...[0, 1, 2].map(j => h('td', null, s.bind ? h('span.muted', null, U.fmt(p[j], 3)) : K.cell(s.p[j], 0.1, v => { s.p[j] = v; upd(); }, 3.6))),
        h('td', null, K.cell(s.q, 0.5, v => { s.q = v; upd(); }, 3.6)),
        h('td', null, K.btn('×', () => delSrc(i), 'mini', 'Delete this point charge'))),
        g.bgs.length ? h('tr.t-bind', null, h('td'), h('td', { colspan: 5 }, K.select('', bindOpts, s.bind ? s.bind.bg + ':' + s.bind.key : '', v => { if (!v) { s.p = p; delete s.bind; } else { const [bg, key] = v.split(':'); s.bind = { bg: +bg, key }; } upd(); }))) : null].filter(Boolean);
    });
    const delBg = i => {
      d.bgs.splice(i, 1);
      d.srcs.forEach(s => { if (!s.bind) return; if (s.bind.bg === i) { s.p = X.srcPos(g, s); delete s.bind; } else if (s.bind.bg > i) s.bind.bg--; });
      for (const n in d.pts) { const df = d.pts[n].def; if (df.t === 'sp') { if (df.bg === i) { delete d.pts[n]; d.qs = d.qs.filter(q => ![q.at, q.a, q.b].includes(n)); } else if (df.bg > i) df.bg--; } }
      upd();
    };
    const bgRows = d.bgs.map((b, i) => h('div.t-bg', null, h('div.row.wrap', null, h('b', null, 'Background ' + (i + 1)),
      K.select('', Object.keys(EL.GEO.TYPES).map(t => [t, EL.GEO.TYPES[t].name]), b.type, v => { b.type = v; b.l = b.l || b.w; b.h = b.h || b.w; upd(); }),
      K.btn('×', () => delBg(i), 'mini', 'Delete this geometric background')),
      h('div.row.wrap', null, ...(BG_DIMS[b.type] || ['w']).map(k => h('label.mini', null, DIM_LABEL(b.type)[k] + ' / L', K.cell(b[k] || b.w, 0.1, v => { if (v > 0) b[k] = v; upd(); }, 3.6))),
        ...['x', 'y', 'z'].map(k => h('label.mini', null, (b.type === 'pyramid' || b.type === 'prism' ? 'Base center ' : 'Center ') + k, K.cell(b[k] || 0, 0.1, v => { b[k] = v; upd(); }, 3.4))))));
    return [h('h4', null, 'Point charges (up to 16)'),
      h('table.src', null, h('thead', null, h('tr', null, h('th', null, 'Name'), h('th', null, 'x / L'), h('th', null, 'y / L'), h('th', null, 'z / L'), h('th', null, 'q / Q'), h('th'))), h('tbody', null, rows)),
      g.bgs.length ? K.note('The drop-down below each point charge binds it to a special point of a geometric background.') : null,
      h('div.btns', null, K.btn('Add point charge', () => { if (d.srcs.length >= 16) return U.toast('At most 16 point charges can be placed.'); d.srcs.push({ label: nextLabel(), p: [0, 0, 1], q: 1 }); upd(); }, 'mini')),
      h('h4', null, 'Geometric backgrounds'), ...bgRows,
      h('div.btns', null, K.btn('Add geometric background', () => { d.bgs.push({ type: 'cube', w: 2, l: 2, h: 2, x: 0, y: 0, z: 0 }); upd(); }, 'mini')),
      K.note('A geometric background is only a positional reference; it does not model a conductor or a dielectric. A point charge bound to a special point of a background moves with it.')];
  };
  // Analytic-field models: switch the sub-model and adjust the parameters (the same as in the lab)
  T.srcField = function (d) {
    const sub = EL.SUB08[d.sub];
    return [K.select('Analytic model', Object.keys(EL.SUB08).map(k => [k, EL.SUB08[k].cat + ' · ' + EL.SUB08[k].name]), d.sub, v => { X.applyItem(d, X.itemOf('field:' + v)); upd(); }),
      ...sub.params.map(q => K.slider(Object.assign({}, q, { val: d.sp[q.key], on: (v, live) => { d.sp[q.key] = v; if (!live) upd(); } }))),
      K.note('The parameters are the same as in the lab\'s "Ext. 1 Analytic field models": k = 1, ε₀ = 1/(4π), and ε is the relative permittivity. The answers are recomputed automatically when a parameter changes.')];
  };
  // Charges on a disk: N, R, q and the center charge
  T.srcDisk = function (d) {
    const k = d.disk, m = EL.model(3), P = key => m.params.find(p => p.key === key);
    const sl = (key, label) => K.slider(Object.assign({}, P(key), { label: label || P(key).label, val: k[key], on: (v, live) => { k[key] = v; if (!live) upd(); } }));
    return [sl('N'), sl('R'), sl('q'), K.check('Place one charge at the center', k.center, v => { k.center = v; upd(); }), k.center ? sl('qc') : null,
      K.note('The same as the lab\'s "Ext. 2 Charges on a disk": the charges on the circle are equally spaced, with Q1 on the positive x axis. With "Place one charge at the center" selected, the circle carries N − 1 charges.')];
  };
  // ---- Step 3: key points ----
  T.f2 = function (d, sol) {
    const g = sol.R.g, sug = X.suggest(d), used = Object.values(d.pts).map(p => JSON.stringify(p.def)), unit = X.kindOf(d) === 'tpl' ? 'a' : 'L';
    const add = def => { const n = freeName(d); d.pts[n] = { def }; T.focus = { kind: 'point', at: n }; upd(); };
    const rows = Object.keys(d.pts).map(n => h('tr', null, h('td', null, h('input.cell', { type: 'text', value: n, 'aria-label': 'Name of the key point', style: 'width:3em', onchange: e => {
      const v = e.target.value.trim(); if (!v || v === n || d.pts[v] || g.labels.includes(v)) return U.toast('That name is empty or already in use. Choose another name.');
      d.pts[v] = d.pts[n]; delete d.pts[n]; d.qs.forEach(q => ['at', 'a', 'b'].forEach(k => { if (q[k] === n) q[k] = v; })); upd(); } })),
      h('td', { html: U.rich(X.pointText(g, d.pts[n].def)) }), h('td', null, K.btn('×', () => { delete d.pts[n]; d.qs = d.qs.filter(q => ![q.at, q.a, q.b].includes(n)); upd(); }, 'mini', 'Delete this key point'))));
    const cand = X.candidates(g).filter(c => !used.includes(JSON.stringify(c.def)));
    let sel = 0; const xyz = [0, 0, 0];
    return [
      sug.length ? h('div.sug', null, h('h4', null, 'Suggested key points'), ...sug.filter(s => !used.includes(JSON.stringify(s.c.def))).slice(0, 4).map(s => h('div.row.wrap', null, h('span', null, s.c.text), h('em', null, s.why), K.btn('Add this point', () => add(s.c.def), 'mini primary')))) : null,
      rows.length ? h('table.src', null, h('thead', null, h('tr', null, h('th', null, 'Name'), h('th', null, 'Position'), h('th'))), h('tbody', null, rows)) : K.note('No key points have been added yet.'),
      cand.length ? h('div.row.wrap', null, K.select('', cand.map((c, i) => [i, c.text]), 0, v => { sel = +v; }), K.btn('Add key point', () => cand[sel] && add(cand[sel].def), 'mini')) : null,
      h('details.tip', { open: X.kindOf(d) === 'field' }, h('summary', null, 'Add a key point by coordinates'), h('div.row.wrap', null, ...['x', 'y', 'z'].map((k, i) => h('label.mini', null, k, K.cell(0, 0.05, v => { xyz[i] = v; }, 3.4))),
        K.btn('Add this point', () => add({ t: 'xyz', p: xyz.slice() }), 'mini')), K.note('Coordinates are in units of ' + unit + ', with the origin at ' + (unit === 'a' ? 'the center of the model' : 'the coordinate origin O') + '.'))];
  };

  // ---- Step 4: questions (only the types that apply to this model are listed) ----
  T.f3 = function (d, sol) {
    const names = Object.keys(sol.R.pts).filter(n => sol.R.pts[n].p), sel = (q, k) => K.select('', names.map(n => [n, n]), q[k], v => { q[k] = v; upd(); });
    const types = X.qtypesFor(d).map(k => [k, X.qtype(k).name]);
    const cards = d.qs.map((q, i) => {
      const o = sol.ans[i], need = (X.qtype(q.t) || { need: [] }).need;
      return h('div.tq', null, h('div.row.wrap', null, h('b', null, '(' + (i + 1) + ')'), K.select('', types, q.t, v => { Object.assign(q, X.defQ(v, d, sol)); upd(); }),
        need.includes('at') ? sel(q, 'at') : null, need.includes('a') ? sel(q, 'a') : null, need.includes('b') ? sel(q, 'b') : null,
        need.includes('q0') ? h('label.mini', null, 'q =', K.cell(q.q0 || 1, 0.5, v => { q.q0 = v || 1; upd(); }, 3.4)) : null,
        K.btn('×', () => { d.qs.splice(i, 1); upd(); }, 'mini', 'Delete this question')),
        h('p.tq-q', { html: U.rich(X.qText2(q, d)) }),
        h('p.tq-ans', { html: o.ok ? 'Answer: ' + (o.options ? X.optLetter(o.options, X.rightOf(o)) + '. ' : '') + U.rich(o.answer) : '<span class="bad">' + U.esc(o.err) + '</span>' }));
    });
    let nt = types[0][0];
    return [...cards, h('div.row.wrap', null, K.select('', types, nt, v => { nt = v; }),
      K.btn('Add question', () => { d.qs.push(X.defQ(nt, d, sol)); upd(); }, 'primary')), names.length < 2 && X.kindOf(d) !== 'disk' ? K.note('First add a field point in the "Select key points" step.') : null];
  };
  X.defQ = function (t, d, sol) {
    const need = (X.qtype(t) || { need: [] }).need, srcN = new Set(sol.R.sources.map(s => s.label)), nNeed = need.includes('b') ? 2 : need.length ? 1 : 0;
    const free = () => Object.keys(sol.R.pts).filter(n => sol.R.pts[n].p && !srcN.has(n));
    // If there are not enough field points (e.g. every vertex is charged), add a candidate point automatically
    if (free().length < nNeed) {
      const used = Object.values(d.pts).map(p => JSON.stringify(p.def)), c = X.candidates(sol.R.g).find(c0 => !used.includes(JSON.stringify(c0.def)));
      if (c) { d.pts[freeName(d)] = { def: c.def }; sol = X.solve(d); U.toast('Not enough field points, so "' + c.text + '" was added as one.'); }
    }
    const ns = Object.keys(d.pts).filter(n => sol.R.pts[n].p), all = Object.keys(sol.R.pts).filter(n => sol.R.pts[n].p);
    const at = ns[0] || all.find(n => !srcN.has(n)) || all[0], b = all.find(n => n !== at && !srcN.has(n)) || all.find(n => n !== at);
    return { t, at, a: at, b, q0: t === 'W' ? 1 : undefined };
  };
  // ---- Step 5: generate and publish ----
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '_');
  T.f4 = function (d, sol) {
    const auto = X.stem(d, sol.R);
    return [h('label', { for: 'tTitle' }, 'Title'), h('input.cell.wide#tTitle', { type: 'text', value: d.title, oninput: e => { d.title = e.target.value; } }),
      h('label', { for: 'tStem' }, 'Problem statement (leave blank to use the generated statement)'), h('textarea.wide#tStem', { rows: 5, placeholder: auto, value: d.stem || '', oninput: e => { d.stem = e.target.value; } }),
      h('label', { for: 'tNote' }, 'Additional note'), h('input.cell.wide#tNote', { type: 'text', value: d.note || '', oninput: e => { d.note = e.target.value; } }),
      h('div.btns', null, K.btn('Save problem', () => T.save(), 'primary'), K.btn('Preview student edition', () => { T.save(true); X.setMode('student'); X.open(JSON.parse(JSON.stringify(T.d))); })),
      h('div.btns', null, K.btn('Export student edition', () => X.print(d, false)), K.btn('Export teacher edition', () => X.print(d, true)), K.btn('Export JSON', () => U.download('problem_' + safe(d.title) + '.json', JSON.stringify(d, null, 1), 'application/json')))];
  };
  T.save = function (quiet) {
    const mine = U.store.get('ex:mine', []), i = mine.findIndex(x => x.id === T.d.id), c = JSON.parse(JSON.stringify(T.d));
    c.model = X.modelOf(c); c.kind = X.kindOf(c);
    if (i >= 0) mine[i] = c; else mine.push(c);
    U.store.set('ex:mine', mine); X.renderList(); if (!quiet) U.toast('Saved to "My problems".');
  };

  // Assistant: diagnostics, next-step hints, and the answer and distractors for each question
  T.assist = function (d, sol) {
    const k = X.kindOf(d), tips = [];
    const nQ = k === 'field' ? 1 : sol.R.sources.length;
    if (!nQ) tips.push({ k: 'bad', t: 'No point charge with a nonzero charge has been placed yet.' });
    if (T.step >= 2 && !Object.keys(d.pts).length && k !== 'disk') tips.push({ k: 'info', t: 'Add a field point, or use one of the suggested points.' });
    if (T.step >= 3 && !d.qs.length) tips.push({ k: 'info', t: 'Add at least one question.' });
    const diag = X.diagnose(d, sol).concat(tips);
    const ans = sol.ans.map((o, i) => o.ok ? h('div.ta', null, h('b', null, '(' + (i + 1) + ') ' + X.qtype(o.q.t).name),
      h('p', { html: (o.options ? X.optLetter(o.options, X.rightOf(o)) + '. ' : '') + U.rich(o.answer) }),
      o.distractors && o.distractors.length ? h('ul', null, o.distractors.map(x => h('li', { html: (o.options ? X.optLetter(o.options, x.v) + '. ' : '') + U.rich(x.v) + ' <span class="muted">— ' + U.esc(x.why) + '</span>' }))) : null) : null);
    U.$('#tAssist').replaceChildren(...[h('h3', null, 'Authoring assistant'), h('ul.diag', null, diag.map(x => h('li', { class: x.k, html: U.rich(x.t) }))),
      sol.ans.length ? h('h4', null, 'Answers and distractors') : null, ...ans].filter(Boolean));
  };

  // Printable worksheet: options are lettered A, B, C, D
  X.print = function (pb, teacher) {
    const sol = X.solve(pb), esc = U.esc;
    let html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(pb.title) + '</title><style>body{font-family:"Times New Roman","Microsoft YaHei",serif;max-width:760px;margin:24px auto;padding:0 20px;line-height:1.7;color:#142033}h1{font-size:20px}.q{margin:14px 0}.ln{border-bottom:1px solid #9aa6b2;height:26px}.ans{color:#2c41ad;font-size:14px}.mut{color:#6a7a90}.ops{display:flex;flex-wrap:wrap;gap:4px 28px;margin:4px 0 0 1.6em}math,.rad{font-family:"Cambria Math","STIX Two Math","Latin Modern Math",serif}.rad{white-space:nowrap}.rad-b{border-top:.075em solid currentColor;padding:.06em .08em 0 .04em;margin-left:-.06em}math[display=block]{display:block math;margin:6px auto;text-align:center}</style></head><body>';
    html += '<h1>' + esc(pb.title) + (teacher ? ' (teacher edition)' : '') + '</h1><p class="mut">' + esc(X.modelName(pb)) + '</p><p>Name ________ &nbsp; Class ________</p><div style="text-align:center">' + X.svg(pb, sol.R) + '</div><p>' + U.rich(pb.stem || X.stem(pb, sol.R)) + '</p>' + (pb.note ? '<p class="mut">' + U.rich(pb.note) + '</p>' : '');
    sol.ans.forEach((o, i) => {
      html += '<div class="q"><b>(' + (i + 1) + ')</b> ' + U.rich(X.qText2(o.q, pb)) + (o.options ? '<div class="ops">' + o.options.map((x, j) => '<span>' + X.letter(j) + '. ' + U.rich(x) + '</span>').join('') + '</div>' : '') + (teacher ? '' : '<div class="ln"></div><div class="ln"></div>');
      if (teacher && o.ok) html += '<p class="ans">Answer: ' + (o.options ? X.optLetter(o.options, X.rightOf(o)) + '. ' : '') + U.rich(o.answer) + '</p>' + X.explain(o).map(l => '<p class="ans">' + U.rich(l.t) + '</p>' + (l.tex ? EL.texBlock(l.tex) : '')).join('') +
        (o.distractors && o.distractors.length ? '<p class="mut">Distractors: ' + o.distractors.map(x => (o.options ? X.optLetter(o.options, x.v) + '. ' : '') + U.rich(x.v) + ' (' + esc(x.why.replace(/\.$/, '')) + ')').join('; ') + '.</p>' : '');
      if (teacher && !o.ok) html += '<p class="mut">' + esc(o.err) + '</p>';
      html += '</div>';
    });
    U.download('worksheet_' + safe(pb.title) + (teacher ? '_teacher' : '_student') + '.html', html + '</body></html>', 'text/html;charset=utf-8');
  };
})(window.EL);
