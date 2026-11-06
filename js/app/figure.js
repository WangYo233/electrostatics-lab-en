'use strict';
// Model diagram (SVG) for the Theory page: projects geometry, sources, key points, and dimension marks from the standard view, always in the light print palette
(function (EL) {
  const V = EL.V, U = EL.U, A = EL.App;
  const COL = { pos: '#D55E00', neg: '#0072B2', zero: '#7A8799', geom: '#7A8799', path: '#22303F', pt: '#142033', axis: '#9AA6B2', dim: '#8A6D00' };

  // Label avoidance: estimate the text width (CJK characters 1 em, Latin about 0.56 em, subscripts smaller)
  const textW = (t, fs) => {
    let w = 0, sub = 0;
    const s = String(t).replace(/\\rm\s*/g, '').replace(/[{}\\]/g, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '_') { sub = 1; continue; }
      const k = /[⺀-￯]/.test(ch) && !/[₀-₉′]/.test(ch) ? 1 : /[A-Z]/.test(ch) ? 0.66 : 0.52;
      w += k * (sub ? 0.75 : 1);
      if (sub && !/[A-Za-z0-9]/.test(s[i + 1] || '')) sub = 0;
    }
    return w * fs;
  };
  // Whether a segment intersects a rectangle (Liang–Barsky clipping)
  const segHit = (s, b) => {
    let t0 = 0, t1 = 1;
    const dx = s[2] - s[0], dy = s[3] - s[1];
    for (const [p, q] of [[-dx, s[0] - b[0]], [dx, b[2] - s[0]], [-dy, s[1] - b[1]], [dy, b[3] - s[1]]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
  };
  const DIRS = [[1, -1], [1, 1], [-1, -1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]].map(d => { const l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; });

  // opt (used by the model preview): th0/ph0 view angles; extra additional annotations (dims/vecs/rings/notes/pts/add); fixed frames the view by the bounding sphere so the scale stays constant while rotating; idp prefix for marker ids
  A.figure = function (c, th, opt) {
    opt = opt || {};
    const m = c.m, flat = m.view === '2d' && m.id === 3, X = opt.extra || null, idp = opt.idp || 'f';
    // Projection: 3D models use the same standard view as the canvas; the disk model uses a top view
    const th0 = opt.th0 != null ? opt.th0 : -0.95, ph0 = opt.ph0 != null ? opt.ph0 : 0.42, eye = [Math.cos(ph0) * Math.cos(th0), Math.cos(ph0) * Math.sin(th0), Math.sin(ph0)];
    const z = V.norm(eye), x = V.norm(V.cross([0, 0, 1], z)), y = V.cross(z, x);
    const P = flat ? (p => [p[0], p[1]]) : (p => [V.dot(p, x), V.dot(p, y)]);
    const segs = [], dash = [], items = [];
    // Geometry: take the lines (edges, circles, paths) from the model's extra(), not faces or labels
    const ctx = Object.assign({}, c, { layers: Object.assign({}, c.layers, { geom: true }), cs: null, st: Object.assign({}, c.st, { view: m.view }) });
    let ex = {};
    try { ex = m.extra ? m.extra(ctx) : {}; } catch (e) { ex = {}; }
    for (const L of ex.lines || []) if (L.pts && L.pts.length > 1) (L.dash ? dash : segs).push(L.pts);
    if (th.circle) { const r = th.circle(c.p), q = []; for (let i = 0; i <= 64; i++) { const a = 2 * Math.PI * i / 64; q.push([r * Math.cos(a), r * Math.sin(a), 0]); } segs.push(q); }
    if (th.path) dash.push(th.path(c.p));
    // Geometry of the analytic models
    if (th.geom08) {
      const R = Math.min(c.bound, 3), sp = c.subP;
      if (th.geom08 === 'line') segs.push([[0, 0, -R], [0, 0, R]]);
      if (th.geom08 === 'plane') segs.push([[-R, -R, 0], [R, -R, 0], [R, R, 0], [-R, R, 0], [-R, -R, 0]]);
      if (th.geom08 === 'sphere') for (const [u, v] of [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]]]) { const q = []; for (let i = 0; i <= 64; i++) { const a = 2 * Math.PI * i / 64; q.push(V.add(V.mul(u, sp.a * Math.cos(a)), V.mul(v, sp.a * Math.sin(a)))); } segs.push(q); }
    }
    const pts = (th.pts ? th.pts(c.p) : []).concat(X && X.pts || []);
    const srcs = (m.analytic ? (th.geom08 === 'point' ? [{ p: [0, 0, 0], q: c.subP.q, label: 'q' }] : []) : c.sources).concat(X && X.srcs || []);
    // Lines with text: dimension lines (dims), named circles and segments (X.lines)
    const named = {};
    pts.forEach(q => { named[q.n] = q.p; });
    srcs.forEach(q => { named[q.label] = q.p; });
    const pos = v => typeof v === 'string' ? named[v] : v;
    const ann = [];
    for (const d of X && X.dims ? X.dims : (th.dims || []).map(d => ({ a: d[0], b: d[1], t: d[2] }))) {
      const a = pos(d.a), b = pos(d.b);
      if (a && b) ann.push({ pts: [a, b], t: d.t, k: d.k || d.t, at: 0.5, dim: true });
    }
    for (const L of X && X.lines || []) ann.push(Object.assign({ at: 0.5 }, L));
    // Bounding box: with fixed, frame the view by the bounding sphere so the scale stays constant while rotating
    const world = [].concat(...segs, ...dash, ...ann.map(a => a.pts), srcs.map(s => s.p), pts.map(q => q.p), [[0, 0, 0]]);
    const W = opt.W || 420;
    let x0, x1, y0, y1, H;
    if (opt.fixed) {
      const rb = Math.max(...world.map(q => V.len(q)), 1) * 1.12;
      H = Math.round(W * (opt.aspect || 0.9));
      x0 = -rb; x1 = rb; y0 = -rb * H / W; y1 = rb * H / W;
      if (H > W) { y0 = -rb; y1 = rb; x0 = -rb * W / H; x1 = rb * W / H; }
    } else {
      const all = world.map(P);
      x0 = Math.min(...all.map(q => q[0])); x1 = Math.max(...all.map(q => q[0])); y0 = Math.min(...all.map(q => q[1])); y1 = Math.max(...all.map(q => q[1]));
      const sp0 = Math.max(x1 - x0, y1 - y0, 1), pd = sp0 * 0.16;
      x0 -= pd; x1 += pd; y0 -= pd; y1 += pd;
      H = Math.round(W * Math.min(0.85, Math.max(0.5, (y1 - y0) / (x1 - x0))));
    }
    const span = opt.fixed ? (x1 - x0) / 1.4 : Math.max(x1 - x0, y1 - y0) / 1.32;
    const s = Math.min(W / (x1 - x0), H / (y1 - y0));
    const S = p => { const q = P(p); return [((q[0] - (x0 + x1) / 2) * s + W / 2).toFixed(1), (H / 2 - (q[1] - (y0 + y1) / 2) * s).toFixed(1)]; };
    const SN = p => S(p).map(Number);
    // Obstacles: all segments (screen coordinates) and points; labels are placed one after another, and placed labels become obstacles too
    const obs = [], dots = [], boxes = [];
    const addObs = ps => { for (let i = 1; i < ps.length; i++) { const a = SN(ps[i - 1]), b = SN(ps[i]); obs.push([a[0], a[1], b[0], b[1]]); } };
    const poly = (ps, st) => { addObs(ps); return '<polyline fill="none" points="' + ps.map(q => S(q).join(',')).join(' ') + '" ' + st + '/>'; };
    // SVG text: subscripts and superscripts become tspans; radicals are written by U.rich(t, true) as a √ plus an overlined tspan (Cambria Math, see U.svgRad)
    const svgRich = t => U.rich(t, true).replace(/<sub>/g, '<tspan font-size="75%" baseline-shift="sub">').replace(/<sup>/g, '<tspan font-size="75%" baseline-shift="super">').replace(/<\/su[bp]>/g, '</tspan>');
    // data-k: the key matching a formula symbol, used by the model preview for two-way highlighting
    const dk = k => k ? ' data-k="' + U.esc(k) + '"' : '';
    const ah = 'ah-' + idp;
    // Coordinate axes
    const ax = span * 0.22, labs = [];
    const axes = flat ? [[[1, 0, 0], 'x'], [[0, 1, 0], 'y']] : [[[1, 0, 0], 'x'], [[0, 1, 0], 'y'], [[0, 0, 1], 'z']];
    for (const [d, n] of axes) {
      items.push(poly([[0, 0, 0], V.mul(d, ax)], 'stroke="' + COL.axis + '" stroke-width="1" marker-end="url(#' + ah + ')"'));
      const t0 = SN([0, 0, 0]), t1 = SN(V.mul(d, ax)), tl = Math.hypot(t1[0] - t0[0], t1[1] - t0[1]) || 1;
      labs.push({ at: V.mul(d, ax), t: n, fs: 12, gap: 3, pref: [[(t1[0] - t0[0]) / tl, (t1[1] - t0[1]) / tl]], st: 'fill="' + COL.axis + '" font-style="italic"' });
    }
    for (const q of segs) items.push(poly(q, 'stroke="' + COL.geom + '" stroke-width="1.4"'));
    for (const q of dash) items.push(poly(q, 'stroke="' + COL.path + '" stroke-width="1.4" stroke-dasharray="5 4"'));
    // Dimension lines and named lines: the text goes on the normal side of the line
    const placedDims = [];
    for (const a of ann) {
      const col = a.col || COL.dim;
      if (a.dim) {
        // Dimension line: shifted on screen to one side of the segment (apart from the edge or axis it labels), with short extension lines at both ends; collinear dimension lines move outward layer by layer
        const s0 = SN(a.pts[0]), s1 = SN(a.pts[1]), L = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1, ux = (s1[0] - s0[0]) / L, uy = (s1[1] - s0[1]) / L;
        let nx = -uy, ny = ux;
        if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }   // Prefer the upper side
        let lv = 1;
        for (const q of placedDims) {
          const cr = Math.abs(ux * q.uy - uy * q.ux), dd = Math.abs((s0[0] - q.s0[0]) * q.ny0 - (s0[1] - q.s0[1]) * q.nx0);
          if (cr < 0.08 && dd < 4) lv = Math.max(lv, q.lv + 1);
        }
        placedDims.push({ s0, ux, uy, nx0: -uy, ny0: ux, lv });
        const off = 9 * lv, o = [nx * off, ny * off], A0 = [s0[0] + o[0], s0[1] + o[1]], A1 = [s1[0] + o[0], s1[1] + o[1]];
        const sl = (p, q) => { obs.push([p[0], p[1], q[0], q[1]]); return '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; };
        const ext = (p, q) => sl([p[0] + nx * 3, p[1] + ny * 3], [q[0] + nx * 3, q[1] + ny * 3]);
        items.push('<g class="fe"' + dk(a.k) + ' stroke="' + col + '" stroke-width="' + (a.w || 1.1) + '">' + sl(A0, A1).replace('/>', ' stroke-dasharray="3 2"/>') + ext(s0, A0) + ext(s1, A1) + '</g>');
        if (a.t) labs.push({ at: null, sat: [(A0[0] + A1[0]) / 2, (A0[1] + A1[1]) / 2], t: a.t, k: a.k, fs: 12, gap: 2, pref: [[nx, ny]], st: 'fill="' + col + '"' });
        continue;
      }
      items.push('<g class="fe"' + dk(a.k) + '>' + poly(a.pts, 'stroke="' + col + '" stroke-width="' + (a.w || 1.2) + '"' + (a.solid ? '' : ' stroke-dasharray="4 3"')) + '</g>');
      if (!a.t) continue;
      const n = a.pts.length, i = Math.min(n - 2, Math.floor(a.at * (n - 1))), f = a.at * (n - 1) - i;
      const p0 = a.pts[i], p1 = a.pts[i + 1], mid = V.lerp(p0, p1, n === 2 ? a.at : f), s0 = SN(p0), s1 = SN(p1);
      const L = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1, nx = -(s1[1] - s0[1]) / L, ny = (s1[0] - s0[0]) / L;
      labs.push({ at: mid, t: a.t, k: a.k, fs: 12, gap: 2, pref: ny <= 0 ? [[nx, ny], [-nx, -ny]] : [[-nx, -ny], [nx, ny]], st: 'fill="' + col + '"' });
    }
    // Vectors (used by the model preview)
    for (const v of X && X.vecs || []) {
      const a = pos(v.from), b = pos(v.to);
      if (!a || !b) continue;
      const col = v.col || COL.path, sa = SN(a), sb = SN(b), L = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]) || 1, ux = (sb[0] - sa[0]) / L, uy = (sb[1] - sa[1]) / L, hl = Math.min(8, L * 0.4);
      const head = [[sb[0], sb[1]], [sb[0] - ux * hl - uy * hl * 0.45, sb[1] - uy * hl + ux * hl * 0.45], [sb[0] - ux * hl + uy * hl * 0.45, sb[1] - uy * hl - ux * hl * 0.45]];
      items.push('<g class="fe"' + dk(v.k) + '>' + poly([a, b], 'stroke="' + col + '" stroke-width="1.6"') + '<polygon points="' + head.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" fill="' + col + '"/></g>');
      if (v.t) labs.push({ at: V.lerp(a, b, 0.6), alt: [0.85, 0.35, 1.08].map(f => SN(V.lerp(a, b, f))), t: v.t, k: v.k, fs: 12, gap: 3, st: 'fill="' + col + '"' });
    }
    for (const sr of srcs) {
      const q = S(sr.p), col = sr.q > 0 ? COL.pos : sr.q < 0 ? COL.neg : COL.zero;
      dots.push([+q[0], +q[1], 7]);
      items.push('<g class="fe"' + dk(sr.k || sr.label) + '><circle cx="' + q[0] + '" cy="' + q[1] + '" r="7" fill="' + col + '"/><text x="' + q[0] + '" y="' + (+q[1] + 4) + '" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">' + (sr.q > 0 ? '+' : sr.q < 0 ? '−' : '0') + '</text></g>');
      labs.push({ at: sr.p, t: String(sr.label).replace(/^([A-Za-z])(\d+)$/, '$1_$2'), k: (X && X.srcK && X.srcK[sr.label]) || sr.k || sr.label, fs: 13, gap: 9, st: 'fill="' + col + '" font-weight="700"', first: true });
    }
    // Plain text annotations (used by the model preview, e.g. the permittivity of a medium)
    for (const n of X && X.notes || []) labs.push({ at: pos(n.at), t: n.t, k: n.k, fs: 12, gap: 2, st: 'fill="' + (n.col || COL.pt) + '"' + (n.it ? ' font-style="italic"' : '') });
    for (const q of pts) {
      const sp = S(q.p);
      dots.push([+sp[0], +sp[1], 3.2]);
      items.push('<circle class="fe"' + dk(q.k || q.n) + ' cx="' + sp[0] + '" cy="' + sp[1] + '" r="3.2" fill="' + COL.pt + '"/>');
      labs.push({ at: q.p, t: q.n, k: q.k || q.n, fs: 13, gap: 5, st: 'fill="' + COL.pt + '"', first: true });
    }
    // Label placement: point and source names first, then dimensions and axis names; each label tries candidate positions around its anchor in turn and takes the first one that overlaps no line, point or placed label
    labs.sort((a, b) => (b.first ? 1 : 0) - (a.first ? 1 : 0));
    const hits = b => {
      let n = 0;
      if (b[0] < 1 || b[1] < 1 || b[2] > W - 1 || b[3] > H - 1) n += 4;
      for (const sg of obs) if (segHit(sg, b)) n++;
      for (const d of dots) { const cx = U.clamp(d[0], b[0], b[2]), cy = U.clamp(d[1], b[1], b[3]); if (Math.hypot(cx - d[0], cy - d[1]) < d[2] + 1) n += 2; }
      for (const o of boxes) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) n += 3;
      return n;
    };
    const lab = [];
    for (const L of labs) {
      const w = textW(L.t, L.fs) + 2, h = L.fs * 1.05;
      // pin (model preview): the label stays on the same side of its anchor and turns with the model; no avoidance, so it never jumps while rotating
      if (opt.pin) {
        const a = L.sat || SN(L.at), d = (L.pref && L.pref[0]) || [0.72, -0.7], r = L.gap + Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
        lab.push('<text class="fl"' + dk(L.k) + ' x="' + (a[0] + d[0] * r).toFixed(1) + '" y="' + (a[1] + d[1] * r + L.fs * 0.36).toFixed(1) + '" font-size="' + L.fs + '" text-anchor="middle" ' + L.st + '>' + svgRich(L.t) + '</text>');
        continue;
      }
      let best = null, bn = 1e9;
      const dirs = (L.pref || []).concat(DIRS);
      // Candidates: 8 directions around the anchor (and any backup anchor), from near to far
      const anc = [L.sat || SN(L.at)].concat(L.alt || []);
      outer: for (const g of [1, 1.7, 2.6, 3.8, 5.5, 8, 11]) for (const a of anc) for (const d of dirs) {
        // The box edge is gap·g from the anchor, pushed out half a box along direction d
        const r = L.gap * g + Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * h / 2;
        const cx = a[0] + d[0] * r, cy = a[1] + d[1] * r, b = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
        const n = hits(b);
        if (n < bn) { bn = n; best = [cx, cy, b]; }
        if (!n) break outer;
      }
      boxes.push(best[2]);
      lab.push('<text class="fl"' + dk(L.k) + ' x="' + best[0].toFixed(1) + '" y="' + (best[1] + L.fs * 0.36).toFixed(1) + '" font-size="' + L.fs + '" text-anchor="middle" ' + L.st + '>' + svgRich(L.t) + '</text>');
    }
    const halo = 'paint-order="stroke" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"';
    return '<svg class="fig" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + U.esc(m.title) + ': model diagram"><defs><marker id="' + ah + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + COL.axis + '"/></marker></defs>' +
      items.join('') + '<g class="labs" ' + halo + '>' + lab.join('') + '</g></svg>';
  };
})(window.EL);
