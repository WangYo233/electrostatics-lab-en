'use strict';
// Field-synthesis guide (shared by all point-charge models) and geometry helpers. For the analysis logic see js/core/vec3d.js
(function (EL) {
  const V = EL.V, U = EL.U, A = EL.App, MH = EL.MH, K = EL.UI, h = U.h, VA = EL.VA;
  const ang = VA.ang, f4 = VA.f4;

  // Named points around the field point that can describe directions: sources, model key points, the field point
  A.namedPts = function (c) {
    const T = A.theoryOf ? A.theoryOf() : null, out = c.sources.filter(s => s.q).map(s => ({ n: s.label, p: s.p }));
    if (T && T.pts) for (const q of T.pts(c.p)) if (q.p && !out.some(o => o.n === q.n)) out.push({ n: q.n, p: q.p });
    if (c.probe) out.push({ n: c.probe.name || 'P', p: c.probe.pos });
    return out;
  };
  A.wizData = function (c) {
    if (!c.probe || c.m.analytic) return null;
    // When started from "Free synthesis", only the selected component fields are combined
    const only = c.st.wiz.on && c.st.wiz.only, src = only ? c.sources.filter((s, i) => only.includes(i)) : c.sources;
    const parts = VA.parts(src, c.probe.pos, c.rMin);
    return parts && parts.length >= 2 ? parts : null;
  };
  // Display scale of the field vector at the probe (a probe parameter, default 1)
  A.probeVecK = c => (c.st.style.probeVec || 1);
  A.wizSteps = function (c) {
    const parts = A.wizData(c);
    if (!parts) return null;
    return VA.plan({ parts, P: c.probe.pos, named: A.namedPts(c), pName: c.probe.name || 'P', unit: 'kQ/L²', rUnit: 'L', method: c.st.wiz.method, hide: c.st.wiz.hide, partial: !!(c.st.wiz.on && c.st.wiz.only) });
  };
  // Construction objects of the guide: added step by step as steps are revealed
  A.drawWizard = function (c, sc) {
    const cs = c.cs;
    if (!cs || !cs.steps.d) return;
    const out = VA.draw(cs.steps, cs.k, { labels: [] }, { MH, C: EL.C, R: c.bound, vs: c.st.style.vecScale * A.probeVecK(c) });
    for (const key in out) sc[key] = (sc[key] || []).concat(out[key]);
  };
  A.startWizard = function (method, only) {
    const st = A.st;
    if (!A.c.probeVisible) { st.layers.probe = true; A.update(); }
    if (method) st.wiz.method = method;
    st.wiz.only = only && only.length ? only.slice() : null;
    st.wiz.on = true;
    if (!A.wizSteps(A.c)) { st.wiz.on = false; st.wiz.only = null; A.update(); return U.toast(only ? 'Select at least two component fields from charges with nonzero charge, then start the synthesis.' : 'Synthesis needs at least two source charges with nonzero charge and a probe outside the excluded neighborhoods.'); }
    Object.assign(st.wiz, { on: true, i: 0, ans: {} });
    A.afterStep();
  };
  A.stopWizard = function () {
    A.st.wiz.on = false; A.st.wiz.only = null;
    A.update(); A.r.cam.reset(A.c.bound, A.st.view === '2d', true);
    A.renderCaption(true); A.renderStepList(); A.renderDerive();
    if (document.body.dataset.mode === 'analyze') A.renderWizBox();
  };

  // ---- Geometry helpers: between the field point and sources, and between sources ----
  A.addGeoAids = function (c, sc) {
    const g = c.st.geo, out = { labels: [] }, C = EL.C;
    if (!c.probeVisible || c.m.analytic) return;
    const P = c.probe.pos, src = c.sources.filter(s => s.q);
    if (g.probeLines) for (const s of src) { MH.dash(out, P, s.p, C.guide); out.labels.push({ p: V.lerp(P, s.p, 0.5), text: 'r=' + f4(V.dist(P, s.p)), cls: 'pt', kind: 'points' }); }
    if (g.srcLines && src.length <= 8) for (let i = 0; i < src.length; i++) for (let j = i + 1; j < src.length; j++) {
      out.lines = out.lines || [];
      out.lines.push({ pts: [src[i].p, src[j].p], color: [...C.geom, 0.7], width: 1, dash: [0.06, 0.06] });
      out.labels.push({ p: V.lerp(src[i].p, src[j].p, 0.5), text: f4(V.dist(src[i].p, src[j].p)), cls: 'pt', kind: 'points' });
    }
    if (g.angle.length === 2 && document.body.dataset.mode === 'analyze') {
      const a = src.find(s => s.label === g.angle[0]), b = src.find(s => s.label === g.angle[1]);
      if (a && b) { MH.dash(out, P, a.p, C.ang); MH.dash(out, P, b.p, C.ang); MH.arc(out, P, V.sub(a.p, P), V.sub(b.p, P), c.bound * 0.08); }
    }
    if (g.showDec && g.dec && c.probe.s.ok) {
      const N = A.namedPts(c), A0 = N.find(q => q.n === g.dec[0]), B0 = N.find(q => q.n === g.dec[1]);
      if (A0 && B0) {
        const u = V.norm(V.sub(B0.p, A0.p)), E = c.probe.s.E, k = c.bound * 0.3 / Math.max(1e-9, V.len(E)) * A.probeVecK(c), par = V.mul(u, V.dot(E, u) * k), tot = V.mul(E, k);
        MH.dash(out, A0.p, B0.p, C.guide);
        MH.vec(out, P, tot, C.sum, 'E', 'sum', 2.6); MH.vec(out, P, par, C.part, 'E_∥', 'part', 2.2); MH.vec(out, V.add(P, par), V.sub(tot, par), C.part, 'E_⊥', 'part', 2.2);
        MH.right(out, V.add(P, par), V.mul(par, -1), V.sub(tot, par), c.bound * 0.03);
      }
    }
    for (const key in out) sc[key] = (sc[key] || []).concat(out[key]);
  };

  A.pGeo = function (c) {
    const st = c.st, g = st.geo;
    if (!c.probeVisible) return [K.btn('Open probe', () => { st.layers.probe = true; A.update(); A.renderPanel(); A.renderGeo(); }, 'primary')];
    const P = c.probe.pos, n = c.probe.name || 'P', src = c.sources.filter(s => s.q), out = [];
    out.push(h('table.src', null, h('thead', null, h('tr', null, ...['Source charge', 'q', 'Distance r', '|E_i|=k|q|/r²', 'Component field direction'].map(t => h('th', { html: U.rich(t) })))),
      h('tbody', null, src.map(s => { const r = V.dist(P, s.p); return h('tr', null, h('td', null, s.label), h('td', null, VA.cell(s.q)), h('td', null, VA.cell(r)), h('td', null, VA.cell(Math.abs(s.q) / (r * r))), h('td', null, s.q > 0 ? 'Away from ' + s.label : 'Toward ' + s.label)); }))));
    out.push(K.check('Show lines from the field point to each source charge', g.probeLines, v => { g.probeLines = v; A.update(); }),
      K.check('Show lines between source charges', g.srcLines, v => { g.srcLines = v; A.update(); }, 'Lines are shown only when there are at most 8 source charges.'));
    // Angle: relation between ∠QiPQj and the angle between the two component fields
    const labels = src.map(s => s.label);
    if (src.length >= 2) {
      if (g.angle.length !== 2 || !g.angle.every(x => labels.includes(x))) g.angle = labels.slice(0, 2);
      const a = src.find(s => s.label === g.angle[0]), b = src.find(s => s.label === g.angle[1]);
      const geoAng = ang(V.sub(a.p, P), V.sub(b.p, P)), fieldAng = Math.sign(a.q) === Math.sign(b.q) ? geoAng : 180 - geoAng;
      out.push(K.group('Angle',
        h('div.row.wrap', null, K.select('', labels.map(x => [x, x]), g.angle[0], v => { g.angle[0] = v; A.update(); A.renderGeo(); }), h('span', null, 'and'),
          K.select('', labels.map(x => [x, x]), g.angle[1], v => { g.angle[1] = v; A.update(); A.renderGeo(); })),
        h('p', { html: U.rich('∠' + a.label + n + b.label + ' = ' + U.fmt(geoAng, 4) + '°. The angle between E_' + a.label + ' and E_' + b.label + ' is ' + U.fmt(fieldAng, 4) + '°.') }),
        K.tip('For sources of the same sign, the angle between the component fields equals the angle between the lines. For opposite signs, it is the supplement.')));
    }
    // Symmetry relations
    const hints = [];
    for (let i = 0; i < src.length; i++) for (let j = i + 1; j < src.length; j++) {
      const a = src[i], b = src[j], ra = V.dist(P, a.p), rb = V.dist(P, b.p);
      if (Math.abs(ra - rb) < 1e-6 * Math.max(1, ra) && Math.abs(Math.abs(a.q) - Math.abs(b.q)) < 1e-9) hints.push(`E_${a.label} and E_${b.label} have equal magnitude (r = ${f4(ra)}).`);
      const cr = V.len(V.cross(V.sub(a.p, P), V.sub(b.p, P)));
      if (cr < 1e-6 * ra * rb) hints.push(`${n} lies on line ${a.label}${b.label}, so the two component fields are collinear.`);
    }
    out.push(K.group('Symmetry', ...(hints.length ? hints.map(t => h('p', { html: '· ' + U.rich(t) })) : [K.note('No component fields of equal magnitude or collinear fields were found.')])));
    // Resolution: parallel and perpendicular components of the net field along a line
    const N = A.namedPts(c).filter(q => q.n !== n), E = c.probe.s.E;
    if (N.length >= 2 && E.every(isFinite)) {
      if (!g.dec || !N.some(q => q.n === g.dec[0]) || !N.some(q => q.n === g.dec[1])) g.dec = [N[0].n, N[1].n];
      const A0 = N.find(q => q.n === g.dec[0]).p, B0 = N.find(q => q.n === g.dec[1]).p, u = V.norm(V.sub(B0, A0));
      const par = V.dot(E, u), perp = V.len(V.sub(E, V.mul(u, par)));
      out.push(K.group('Resolve net field along a line',
        h('div.row.wrap', null, h('span', null, 'from'), K.select('', N.map(q => [q.n, q.n]), g.dec[0], v => { g.dec[0] = v; A.update(); A.renderGeo(); }), h('span', null, 'to'),
          K.select('', N.map(q => [q.n, q.n]), g.dec[1], v => { g.dec[1] = v; A.update(); A.renderGeo(); })),
        K.check('Show resolution on canvas', g.showDec, v => { g.showDec = v; A.update(); }),
        h('p', { html: U.rich('E_∥ = ' + VA.cell(par) + ' kQ/L²，E_⊥ = ' + VA.cell(perp) + ' kQ/L²') }),
        K.tip('When E_∥ is greater than zero, the potential decreases along the chosen direction.')));
    }
    if (src.length <= 6) {
      const rows = [];
      for (let i = 0; i < src.length; i++) for (let j = i + 1; j < src.length; j++) rows.push(h('tr', null, h('td', null, src[i].label + src[j].label), h('td', null, U.fmt(V.dist(src[i].p, src[j].p), 4))));
      if (rows.length) out.push(K.group('Distances between source charges', h('table.src', null, h('tbody', null, rows))));
    }
    return out;
  };
  // Guide description and options in the Analyze workspace
  A.renderWizBox = function () {
    const c = A.c, box = U.$('#wizBox');
    box.hidden = !!c.m.analytic || !A.hasProbe(c.m);
    U.$('#geoBox').hidden = box.hidden;
    if (box.hidden) return;
    const ok = !!A.wizData(c) && c.probeVisible, on = !!c.cs, w = c.st.wiz;
    const intro = [
      h('p.note', null, on ? 'Follow the steps below the canvas. Click a step to jump to it.' : !c.probeVisible ? 'The guide uses the probe position as the field point.' : ok ? 'The field point is ' + (c.probe.name || 'P') + '. In each step, write a prediction first, then reveal the construction.' : 'At least two source charges with nonzero charge are required.'),
      on ? null : K.seg([['geo', 'Geometric method'], ['coord', 'Coordinate method']], w.method || 'geo', v => { w.method = v; A.renderWizBox(); }),
      on ? null : h('p.note', null, (w.method || 'geo') === 'geo' ? 'The geometric method groups fields by symmetry and finds angles, combines them in pairs, then combines the partial sums of the groups.' : 'The coordinate method finds the position difference between the field point and each source charge, lists the components of each component field, then sums them.')];
    // replaceChildren turns null into the text "null", so drop empty items first
    U.$('#wizIntro').replaceChildren(...intro.filter(Boolean));
    U.$('#wizStart').disabled = !ok && c.probeVisible;
    U.$('#wizStart').textContent = c.probeVisible ? 'Start synthesis' : 'Open probe and start';
    U.$('#wizOpts').replaceChildren(K.check('Hide field lines and equipotential lines during synthesis', w.hide, v => { w.hide = v; A.update(); A.renderCaption(true); }));
  };
  A.renderGeo = function () { if (document.body.dataset.mode === 'analyze' && U.$('#geoBox').open) U.$('#geo').replaceChildren(...A.pGeo(A.c).filter(Boolean)); };
})(window.EL);
