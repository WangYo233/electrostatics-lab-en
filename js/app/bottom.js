'use strict';
// Below the canvas: live readings, linked function curves, study log table
(function (EL) {
  const U = EL.U, h = U.h, K = EL.UI, A = EL.App;

  const fmtV = v => Array.isArray(v) ? U.fmtVec(v) : typeof v === 'number' ? U.fmt(v) : String(v);
  A.prevRd = {};
  // Full readings (Analyze workspace) and floating readings (top left of the canvas, 6 selected items); a value briefly highlights when it changes
  A.renderReadings = function (c) {
    const all = A.readings(c), prev = A.prevRd, next = {};
    const flash = (el, k, val) => { next[k] = val; if (prev[k] != null && prev[k] !== val && !A.st.anim.on) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } };
    const rows = all.map(([k, v, u]) => {
      if (v === '' && u === '') return h('div.rd-h', { html: U.rich(k) });
      const val = fmtV(v), el = h('div.rd', null, h('span.k', { html: U.rich(k) }), h('span', { class: 'v' + (val === 'undefined' ? ' undef' : '') }, val), h('span.u', null, u || ''));
      flash(el, 'r:' + k, val);
      return el;
    });
    U.$('#readings').replaceChildren(...rows);
    const pi = all.findIndex(r => /^— (Probe|Field point) /.test(r[0]));
    let pick = pi >= 0 ? all.slice(pi + 1).filter(r => /^(V\(\w\)|\|E\(\w\)\||U\(\w|E∥|Path parameter)/.test(r[0])) : [];
    pick = all.filter(r => r[1] !== '' && !String(r[0]).startsWith('—')).slice(0, Math.max(0, 6 - pick.length)).concat(pick).slice(0, 6);
    const hw = U.$('#hudWiz'); hw.hidden = !(c.probeVisible && !c.cs && A.wizData(c));
    U.$('#hudBody').replaceChildren(...(pick.length ? pick.map(([k, v, u]) => {
      const val = fmtV(v), el = h('div.r', null, h('span', { html: U.rich(k) }), h('span', { class: val === 'undefined' ? 'undef' : '' }, val + (u ? ' ' + u : '')));
      flash(el, 'h:' + k, val);
      return el;
    }) : [h('div.r', null, h('span', null, 'Readings appear here after you open the probe.'))]));
    A.prevRd = next;
  };

  // ---- Linked curves ----
  // Vertical axes are grouped by unit: curves with the same unit share one axis; different units go on the left and right sides (a third unit adds another axis further out).
  // Ticks are 1, 2, 5 × 10ⁿ; when every axis includes 0, 0 is aligned with a grid line. When curves coincide, the one drawn later is dashed and the one drawn first is thickened, so both stay visible.
  const UNIT = { V: 'kQ/L', U: 'kQ²/L', E: 'kQ/L²' };
  let curveZoom = 1;
  const unitOf = (s, d) => s.unit || d.yUnit || UNIT[String(s.name).trim()[0]] || ((d.note || '').match(/vertical axis is[^/]*\/\s*\(([^)]+)\)/) || [])[1] || '';
  const niceStep = raw => {
    if (!(raw > 0) || !isFinite(raw)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  };
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const fmtTick = (v, step) => {
    if (Math.abs(v) < step * 1e-6) return '0';
    const e = Math.floor(Math.log10(step));
    let s;
    if (e >= 4 || e <= -4) {
      const p = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, p);
      s = (+m.toFixed(Math.max(0, p - e))) + '×10' + String(p).split('').map(ch => SUP[ch]).join('');
    } else s = v.toFixed(Math.max(0, -e));
    return s.replace('-', '−');
  };
  // Robust range: for polylines, drop the extreme 3% of spikes and include 0; for scatter plots, add only a little padding
  const rangeOf = (vals, scatter) => {
    const ys = vals.filter(isFinite);
    if (!ys.length) return null;
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (!scatter) {
      if (ys.length > 10) { const s = ys.slice().sort((a, b) => a - b), q = k => s[Math.floor(k * (s.length - 1))]; lo = q(0.03); hi = q(0.97); }
      lo = Math.min(lo, 0); hi = Math.max(hi, 0);
    }
    if (hi - lo < 1e-12) { const e = Math.abs(hi) * 0.1 || 1; lo -= e; hi += e; }
    if (scatter) { const p = (hi - lo) * 0.08; lo -= p; hi += p; }
    return [lo, hi];
  };

  A.renderCurves = function (c) {
    const box = U.$('#curveBox'), d = c && c.m.curves ? c.m.curves(c) : null;
    box.hidden = !d;
    if (!d || document.body.dataset.mode !== 'analyze' || !box.open) return;
    const cv = U.$('#curves'), dpr = window.devicePixelRatio || 1;
    cv.style.height = (document.fullscreenElement === U.$('#curveBox') ? '74vh' : Math.round(210 * curveZoom) + 'px');
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const dark = EL.theme === 'dark', FONT = (document.fullscreenElement === U.$('#curveBox') ? '14px' : '11px') + ' "Times New Roman", "Microsoft YaHei", sans-serif', INK = dark ? '#e3eaf3' : '#263446', GRID = dark ? '#48576c' : '#d2d9e2', AXIS = dark ? '#9baabd' : '#7d8998';
    g.font = FONT;
    const series = d.series.map((s, i) => Object.assign({}, s, { i, col: U.rgb(s.color), unit: unitOf(s, d) }));

    // 1. Group by unit and find the robust range of each group
    const groups = [];
    for (const s of series) {
      let gr = groups.find(x => x.unit === s.unit);
      if (!gr) { gr = { unit: s.unit, series: [] }; groups.push(gr); }
      gr.series.push(s); s.g = gr;
    }
    for (const gr of groups) {
      const vals = gr.series.flatMap(s => s.y);
      if (gr === series[0].g) for (const p of d.points || []) vals.push(p.y);
      gr.r = rangeOf(vals, d.scatter);
    }
    const live = groups.filter(gr => gr.r);
    if (!live.length) { U.$('#curveLegend').replaceChildren(h('span.muted', null, 'No values can be plotted for the current parameters.')); return; }

    // 2. Vertical-axis ticks: first take a 1–2–5 step for the target number of divisions; when every axis includes 0, use a common division count so 0 lines up with a grid line
    const T = 20, B = 32, plotH = H - T - B, target = Math.max(3, Math.min(6, Math.floor(plotH / 34)));
    const allZero = live.every(gr => gr.r[0] <= 0 && gr.r[1] >= 0);
    for (let n = target; n >= 2; n--) {
      for (const gr of live) gr.step = niceStep((gr.r[1] - gr.r[0]) / n);
      if (allZero) {
        const below = Math.max(...live.map(gr => Math.ceil(-gr.r[0] / gr.step - 1e-9))), above = Math.max(...live.map(gr => Math.ceil(gr.r[1] / gr.step - 1e-9)));
        for (const gr of live) { gr.lo = -below * gr.step; gr.hi = above * gr.step; }
      } else for (const gr of live) { gr.lo = Math.floor(gr.r[0] / gr.step + 1e-9) * gr.step; gr.hi = Math.ceil(gr.r[1] / gr.step - 1e-9) * gr.step; }
      if (live.every(gr => (gr.hi - gr.lo) / gr.step <= target + 2)) break;
    }
    for (const gr of live) {
      gr.ticks = [];
      for (let v = gr.lo, k = 0; v <= gr.hi + gr.step * 1e-6 && k < 40; v = gr.lo + (++k) * gr.step) gr.ticks.push(v);
      gr.labels = gr.ticks.map(v => fmtTick(v, gr.step));
      gr.col = gr.series.length === 1 ? gr.series[0].col : INK;
      gr.w = Math.ceil(Math.max(g.measureText(gr.unit).width, ...gr.labels.map(t => g.measureText(t).width))) + 12;
    }
    // 3. Axis positions: group 1 on the left, group 2 on the right, the rest alternating outward
    live.forEach((gr, i) => { gr.side = i % 2 ? 'R' : 'L'; });
    const Ls = live.filter(gr => gr.side === 'L'), Rs = live.filter(gr => gr.side === 'R');
    const L = Math.max(30, Ls.reduce((a, gr) => a + gr.w, 0) + 4), R = W - Math.max(12, Rs.reduce((a, gr) => a + gr.w, 0) + 4);
    let acc = L; for (const gr of Ls) { gr.x = acc; acc -= gr.w; }
    acc = R; for (const gr of Rs) { gr.x = acc; acc += gr.w; }
    const plotW = R - L;
    if (plotW < 60) return;
    for (const gr of live) gr.Y = y => T + (gr.hi - y) / (gr.hi - gr.lo) * plotH;

    // 4. Horizontal axis: 1–2–5 ticks, with labels at least about 56 px apart
    const x0 = Math.min(...d.x), x1 = Math.max(...d.x), xs = x1 - x0 || 1;
    const X = x => L + (x - x0) / xs * plotW;
    let xstep = niceStep(xs / Math.max(2, Math.floor(plotW / 56)));
    if (d.scatter) xstep = Math.max(1, Math.round(xstep));
    const xticks = [];
    for (let v = Math.ceil(x0 / xstep - 1e-9) * xstep; v <= x1 + xstep * 1e-6; v += xstep) xticks.push(+v.toFixed(10));

    // 5. Excluded regions, grid lines, zero lines
    g.save(); g.beginPath(); g.rect(L, T, plotW, plotH); g.clip();
    g.fillStyle = 'rgba(120,130,140,0.16)';
    for (const [a, b] of d.bands || []) g.fillRect(X(a), T, X(b) - X(a), plotH);
    g.strokeStyle = GRID; g.lineWidth = 1;
    const prim = live[0];
    g.beginPath();
    for (const v of prim.ticks) { const y = Math.round(prim.Y(v)) + 0.5; g.moveTo(L, y); g.lineTo(R, y); }
    for (const v of xticks) { const x = Math.round(X(v)) + 0.5; g.moveTo(x, T); g.lineTo(x, T + plotH); }
    g.stroke();
    const zeros = new Set();
    for (const gr of live) if (gr.lo < 0 && gr.hi > 0) zeros.add(Math.round(gr.Y(0)));
    g.strokeStyle = '#7d8996'; g.lineWidth = 1;
    for (const y of zeros) { g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(R, y + 0.5); g.stroke(); }
    g.restore();

    // 6. Axes and tick labels (label color matches the curves of that axis; the unit is written at the top of the axis)
    g.strokeStyle = AXIS; g.lineWidth = 1;
    g.beginPath(); g.moveTo(L, T + plotH + 0.5); g.lineTo(R, T + plotH + 0.5); g.stroke();
    g.textBaseline = 'middle';
    for (const gr of live) {
      const left = gr.side === 'L', ax = Math.round(gr.x) + 0.5;
      g.strokeStyle = AXIS; g.beginPath(); g.moveTo(ax, T); g.lineTo(ax, T + plotH);
      let lastY = -1e9;
      gr.ticks.forEach(v => { const y = gr.Y(v); g.moveTo(ax, y); g.lineTo(ax + (left ? -4 : 4), y); });
      g.stroke();
      g.fillStyle = gr.col; g.textAlign = left ? 'right' : 'left';
      gr.ticks.forEach((v, k) => { const y = gr.Y(v); if (Math.abs(y - lastY) < 12) return; lastY = y; g.fillText(gr.labels[k], ax + (left ? -6 : 6), y); });
      g.textBaseline = 'alphabetic'; g.fillText(gr.unit, ax + (left ? -6 : 6), T - 7); g.textBaseline = 'middle';
    }
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'top';
    let lastX = -1e9;
    for (const v of xticks) {
      const x = X(v), t = fmtTick(v, xstep), w = g.measureText(t).width;
      g.beginPath(); g.strokeStyle = AXIS; g.moveTo(Math.round(x) + 0.5, T + plotH); g.lineTo(Math.round(x) + 0.5, T + plotH + 4); g.stroke();
      if (x - w / 2 < lastX + 6) continue;
      g.fillText(t, x, T + plotH + 6); lastX = x + w / 2;
    }
    g.textBaseline = 'alphabetic';
    g.fillText(d.xLabel, (L + R) / 2, H - 3);

    // 7. Curves: compute screen coordinates first, and decide which curves coincide with earlier ones
    const pts = series.map(s => {
      const gr = s.g; if (!gr.r) return null;
      const span = gr.hi - gr.lo;
      return d.x.map((x, i) => { const y = s.y[i]; return isFinite(y) && y > gr.lo - 2 * span && y < gr.hi + 2 * span ? [X(x), gr.Y(y)] : null; });
    });
    series.forEach((s, si) => {
      s.over = null;
      if (!pts[si] || d.scatter) return;
      for (let j = 0; j < si && !s.over; j++) {
        if (!pts[j]) continue;
        let n = 0, same = 0;
        pts[si].forEach((p, k) => { const q = pts[j][k]; if (p && q) { n++; if (Math.abs(p[1] - q[1]) < 1.5) same++; } });
        if (n && same / n > 0.85) s.over = series[j];
      }
    });
    const covered = new Set(series.filter(s => s.over).map(s => s.over));
    g.save(); g.beginPath(); g.rect(L, T - 1, plotW, plotH + 2); g.clip();
    // Scatter: group 1 is drawn as hollow rings and drawn last, so it is not covered by other markers when values are close
    const marker = (k, x, y) => {
      g.beginPath();
      if (k % 3 === 0) { g.lineWidth = 2; g.arc(x, y, 4.6, 0, 7); g.stroke(); return; }
      if (k % 3 === 1) g.rect(x - 3, y - 3, 6, 6);
      else { g.moveTo(x, y - 4); g.lineTo(x + 3.8, y + 3); g.lineTo(x - 3.8, y + 3); g.closePath(); }
      g.fill();
    };
    if (d.scatter) for (let si = series.length - 1; si >= 0; si--) { const P = pts[si]; if (!P) continue; g.strokeStyle = g.fillStyle = series[si].col; P.forEach(p => p && marker(si, p[0], p[1])); }
    series.forEach((s, si) => {
      const P = pts[si]; if (!P) return;
      g.strokeStyle = s.col; g.fillStyle = s.col;
      if (d.scatter) return;
      g.lineWidth = covered.has(s) ? 3.6 : 2; g.setLineDash(s.over ? [7, 5] : []); g.lineJoin = 'round';
      g.beginPath();
      let pen = false;
      for (const p of P) { if (!p) { pen = false; continue; } if (pen) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); pen = true; }
      g.stroke();
    });
    g.setLineDash([]);
    // Current configuration (scatter plot)
    const g0 = series[0].g;
    if (g0.r) for (const p of d.points || []) {
      if (!isFinite(p.y)) continue;
      const px = X(p.x), py = g0.Y(p.y);
      g.fillStyle = U.rgb(p.color); g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(px, py, 5.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = INK; g.textAlign = px > (L + R) / 2 ? 'right' : 'left'; g.fillText(p.name, px + (px > (L + R) / 2 ? -8 : 8), py - 7);
    }
    // Current position: a vertical dashed line, with the current value marked on each curve
    if (d.cur != null && isFinite(d.cur) && !d.scatter) {
      const cx = X(d.cur);
      g.strokeStyle = '#4b5563'; g.lineWidth = 1; g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(Math.round(cx) + 0.5, T); g.lineTo(Math.round(cx) + 0.5, T + plotH); g.stroke(); g.setLineDash([]);
      series.forEach((s, si) => {
        if (!pts[si]) return;
        let k = 0, best = Infinity;
        d.x.forEach((x, i) => { const e = Math.abs(x - d.cur); if (e < best) { best = e; k = i; } });
        const p = pts[si][k]; if (!p) return;
        g.fillStyle = s.col; g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(p[0], p[1], 3.6, 0, 7); g.fill(); g.stroke();
      });
    }
    g.restore();
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'Linked curves: horizontal axis is ' + d.xLabel + '; ' + series.map(s => s.name + (s.unit ? ' (' + s.unit + ')' : '')).join(', ') + '.');

    // 8. Legend: line style and color, vertical axis and unit; coinciding curves are noted
    const multi = live.length > 1, sideName = s => !multi || !s.g.r ? '' : s.g.side === 'L' ? (s.g === live[0] ? 'left axis' : 'outer left axis') : (s.g === live[1] ? 'right axis' : 'outer right axis');
    const sw = s => d.scatter ? (s.i % 3 === 0 ? 'background:transparent;border:2px solid ' + s.col + ';box-sizing:border-box;height:9px;width:9px;border-radius:50%' : 'background:' + s.col + ';height:7px;width:7px;border-radius:' + (s.i % 3 === 1 ? '1px' : '0'))
      : s.over ? 'background:repeating-linear-gradient(90deg,' + s.col + ' 0 5px,transparent 5px 8px)' : 'background:' + s.col + (covered.has(s) ? ';height:4px' : '');
    const items = series.map(s => h('span', null, h('i', { style: sw(s) }), s.name,
      h('span.muted', null, [sideName(s), s.unit].filter(Boolean).length ? ' (' + [sideName(s), s.unit].filter(Boolean).join(', ') + ')' : ''),
      s.over ? h('span.muted', null, ', overlaps ' + s.over.name + ', drawn dashed') : null));
    if ((d.bands || []).length) items.push(h('span', null, h('i', { style: 'background:rgba(120,130,140,0.35);height:9px' }), 'Excluded region near the source charges'));
    if (d.cur != null && !d.scatter) items.push(h('span', null, h('i', { style: 'background:repeating-linear-gradient(90deg,#4b5563 0 3px,transparent 3px 5px)' }), 'Current position'));
    U.$('#curveLegend').replaceChildren(...items, d.note ? h('span.muted', null, d.note) : null);
  };

  // ---- Study log: saved in this browser and exportable as CSV ----
  // When browser storage is unavailable, the log is kept in this page's memory and the user is prompted to export it
  const recKey = () => 'records:' + A.st.model.id, mem = {};
  const loadRecs = () => { const r = U.store.get(recKey(), null); return Array.isArray(r) ? r : (mem[recKey()] || []); };
  const saveRecs = recs => { mem[recKey()] = recs; return U.store.set(recKey(), recs); };
  const COLS = ['Configuration / position', 'Prediction', 'Measured V, E', 'Explanation / conclusion'];

  // Read the current configuration and readings and append a row; "Record current reading" in both the Analyze and Record workspaces calls this
  A.recordReading = function () {
    const c = A.c;
    if (!c) return false;
    const st = c.st, s = c.probe && c.probe.s ? c.probe.s : null;
    const cfg = 'Stage ' + (st.stage + 1) + ' "' + c.m.stages[st.stage].title + '"; ' + (c.m.analytic ? EL.SUB08[st.sub].name + ' ' : '') +
      Object.entries(st.p).filter(([k, v]) => typeof v === 'number' && !/^p[xyz]$/.test(k) && (!c.m.analytic || k.startsWith(st.sub) || k === 'range')).map(([k, v]) => k.replace(/^.*:/, '') + '=' + U.fmt(v, 4)).join(', ') +
      (st.custom ? '; custom sources ' + c.sources.map(x => x.label + '(' + x.q + ')@' + U.fmtVec(x.p, 3)).join(' ') : '') +
      (c.probe && c.probeVisible ? '; P=' + U.fmtVec(c.probe.pos, 3) : '');
    const meas = s && c.probeVisible ? (s.ok === false || !isFinite(s.V) ? 'Potential and field are undefined at this point' : 'V=' + U.fmt(s.V) + ' kQ/L, |E|=' + U.fmt(EL.V.len(s.E)) + ' kQ/L², E=' + U.fmtVec(s.E))
      : A.readings(c).filter(r => r[1] !== '' && !String(r[0]).startsWith('—')).slice(0, 3).map(r => String(r[0]).replace(/<[^>]+>/g, '') + '=' + fmtV(r[1]) + (r[2] ? ' ' + r[2] : '')).join(', ');
    const recs = loadRecs();
    recs.push([cfg, '', meas, '']);
    const ok = saveRecs(recs);
    A.renderRecords();
    U.toast(ok ? 'Recorded reading in row ' + recs.length + '. You can review it and add a prediction and conclusion in the Record workspace.'
      : 'Recorded reading in row ' + recs.length + ', but browser storage is unavailable, so the log will be lost when you close the page. Export a CSV file to keep it.', 3200);
    return ok;
  };

  if (typeof document !== 'undefined' && U.$('#curveZoomIn')) U.$('#curveZoomIn').addEventListener('click', () => { curveZoom = Math.min(2.8, curveZoom + 0.25); if (A.c) A.renderCurves(A.c); });
  if (typeof document !== 'undefined' && U.$('#curveZoomOut')) U.$('#curveZoomOut').addEventListener('click', () => { curveZoom = Math.max(1, curveZoom - 0.25); if (A.c) A.renderCurves(A.c); });
  if (typeof document !== 'undefined' && U.$('#curveFull')) {
    U.$('#curveFull').addEventListener('click', () => { const el = U.$('#curveBox'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); });
    document.addEventListener('fullscreenchange', () => { if (A.c) A.renderCurves(A.c); });
  }
  A.renderRecords = function () {
    const recs = loadRecs(), save = () => saveRecs(recs);
    // The textarea content must be written to the value property (setAttribute('value') has no effect on a textarea)
    const cell = (r, k) => { const t = h('textarea', { rows: 2, 'aria-label': COLS[k], oninput: e => { r[k] = e.target.value; save(); } }); t.value = r[k] || ''; return h('td', null, t); };
    const tb = recs.map((r, i) => h('tr', null, ...COLS.map((_, k) => cell(r, k)),
      h('td', null, K.btn('×', () => { recs.splice(i, 1); save(); A.renderRecords(); }, 'mini', 'Delete this row'))));
    U.$('#records').replaceChildren(
      recs.length ? h('table.rec', null, h('thead', null, h('tr', null, ...COLS.map(t => h('th', null, t)), h('th'))), h('tbody', null, tb))
        : h('p.note', null, 'No records yet. Click "Record current reading" in Analyze or here, and the current configuration and readings are written to a new row.'),
      h('div.btns', null,
        K.btn('Record current reading', () => A.recordReading(), 'primary'),
        K.btn('Add blank row', () => { recs.push(['', '', '', '']); save(); A.renderRecords(); }),
        K.btn('Export CSV', () => U.download('study_log_' + A.st.model.code + '_' + A.st.model.title + '.csv', U.csv([COLS].concat(recs)), 'text/csv;charset=utf-8')),
        K.btn('Clear log', () => { if (confirm('Clear the entire study log for this model?')) { U.store.del(recKey()); delete mem[recKey()]; A.renderRecords(); } })));
  };
})(window.EL);
