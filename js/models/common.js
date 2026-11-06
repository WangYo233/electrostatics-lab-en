'use strict';
// Model registry, color conventions and shared model helpers
(function (EL) {
  const V = EL.V;
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
  // Colorblind-safe palette based on Okabe–Ito: sign is shown by orange/blue hue, by the +/− symbol and by a lightness difference;
  // the zero level is neutral and labeled with its value, never relying on red–green contrast. dark = presentation studio, light = projector/print.
  EL.THEMES = {
    dark: {
      name: 'Dark studio', bg: [0.043, 0.071, 0.118], bgCss: 'radial-gradient(120% 90% at 50% 35%, #16233a 0%, #0b1220 62%, #070c16 100%)',
      pos: hex('#F28E2B'), neg: hex('#4FA3E0'), zero: hex('#C9D3E0'), field: hex('#8FB8DE'), flow: hex('#DCEBFA'),
      probe: hex('#F0E442'), energy: hex('#E58FC0'), pot: hex('#3FC1A4'), path: hex('#E8EEF6'), sum: hex('#FFFFFF'), part: hex('#B9A3F0'),
      geom: hex('#7F93AD'), edge: [0.62, 0.7, 0.8, 0.75], ring: [0.62, 0.7, 0.8, 0.85], mark: hex('#D8E1EC'), frame: [0.55, 0.62, 0.72, 0.35],
      axis: [0.6, 0.67, 0.76, 0.5], grid: [0.5, 0.6, 0.72, 0.09], gridMajor: [0.55, 0.65, 0.78, 0.18], guide: [0.8, 0.85, 0.92, 0.6], vec: hex('#A9C9F0'),
      plane: [0.55, 0.7, 0.9, 0.06], trail: [0.6, 0.68, 0.78, 0.5], conductor: hex('#9AA8BA'), zeroSrc: hex('#6B7A8F'), ang: hex('#F5D491'), fog: 0.55, lbl: 'dark'
    },
    light: {
      name: 'Light projection', bg: [0.972, 0.978, 0.988], bgCss: 'radial-gradient(120% 90% at 50% 30%, #ffffff 0%, #f3f6fa 70%, #e9eef5 100%)',
      pos: hex('#D55E00'), neg: hex('#0072B2'), zero: hex('#4A5566'), field: hex('#5B84AE'), flow: hex('#1F4E79'),
      probe: hex('#CC79A7'), energy: hex('#E69F00'), pot: hex('#009E73'), path: hex('#22303F'), sum: hex('#111821'), part: hex('#6A4FB0'),
      geom: hex('#7A8799'), edge: [0.3, 0.36, 0.44, 0.8], ring: [0.36, 0.42, 0.5, 0.9], mark: hex('#2E3A48'), frame: [0.4, 0.46, 0.54, 0.4],
      axis: [0.35, 0.4, 0.48, 0.5], grid: [0.3, 0.38, 0.48, 0.07], gridMajor: [0.3, 0.38, 0.48, 0.15], guide: [0.3, 0.33, 0.4, 0.7], vec: hex('#1D3F66'),
      plane: [0.3, 0.45, 0.62, 0.06], trail: [0.45, 0.5, 0.58, 0.5], conductor: hex('#8C99AA'), zeroSrc: hex('#9AA4B2'), ang: hex('#8A6D00'), fog: 0.25, lbl: 'light'
    }
  };
  EL.C = {};
  EL.setTheme = function (k) { EL.theme = EL.THEMES[k] ? k : 'dark'; for (const x in EL.C) delete EL.C[x]; Object.assign(EL.C, EL.THEMES[EL.theme]); };
  EL.setTheme('dark');
  // Curve charts are always drawn on a light panel with fixed colorblind-safe colors
  EL.CHART = { V: hex('#0072B2'), U: hex('#D55E00'), E: hex('#009E73'), alt: hex('#CC79A7'), mark: hex('#111821') };
  EL.MODELS = [];
  EL.model = id => EL.MODELS.find(m => String(m.id) === String(id));
  EL.defModel = m => { EL.MODELS.push(m); return m; };


  const MH = {};
  // Polyhedra: edges as lines, faces as translucent meshes
  MH.poly = function (verts, faces, o) {
    o = o || {};
    const out = { lines: [], meshes: [] };
    const edges = EL.GEO.edgesOf(faces);
    for (const e of edges) out.lines.push({ pts: [verts[e[0]], verts[e[1]]], color: o.edge || EL.C.edge, width: o.edgeWidth || 1.4 });
    if (o.faces !== false) {
      const cols = o.faceColors || [EL.C.geom, EL.C.pot];
      faces.forEach((f, i) => {
        const c = cols[i % cols.length];
        out.meshes.push({ mesh: EL.ISO.polygon(f.map(k => verts[k])), color: [c[0], c[1], c[2], o.opacity == null ? 0.18 : o.opacity] });
      });
    }
    return out;
  };
  // Marker points (small sphere + label)
  MH.mark = function (out, p, text, color, r) {
    out.spheres = out.spheres || []; out.labels = out.labels || [];
    out.spheres.push({ p, r: r || 0.07, color: color || EL.C.mark });
    if (text) out.labels.push({ p, text, cls: 'pt' });
  };
  MH.merge = function (...parts) {
    const out = {};
    for (const p of parts) if (p) for (const k in p) out[k] = (out[k] || []).concat(p[k]);
    return out;
  };
  // Sample V and E∥ along a path (E∥ per unit arc length)
  MH.alongPath = function (F, path, n) {
    const xs = [], Vs = [], Es = [];
    for (let i = 0; i <= n; i++) {
      const t = path.range[0] + (path.range[1] - path.range[0]) * i / n;
      const p = path.pos(t), s = F.sample(p), d = path.d(t), dl = V.len(d);
      xs.push(t); Vs.push(s.ok ? s.V : NaN); Es.push(s.ok ? V.dot(s.E, d) / dl : NaN);
    }
    return { xs, Vs, Es };
  };
  MH.Epar = function (F, path, t) {
    const s = F.sample(path.pos(t)), d = path.d(t);
    return s.ok ? V.dot(s.E, d) / V.len(d) : NaN;
  };
  // Whether the path segment [a,b] passes through an excluded neighborhood
  MH.pathBlocked = function (F, path, a, b) {
    const n = 200;
    let prev = path.pos(a);
    for (let i = 1; i <= n; i++) {
      const p = path.pos(a + (b - a) * i / n);
      if (F.segBlocked(prev, p)) return true;
      prev = p;
    }
    return false;
  };
  // Path polyline (broken where it crosses an excluded neighborhood)
  MH.pathLine = function (F, path, color, dash) {
    const lines = [], n = 240;
    let cur = [];
    for (let i = 0; i <= n; i++) {
      const p = path.pos(path.range[0] + (path.range[1] - path.range[0]) * i / n);
      if (F.blocked(p)) { if (cur.length > 1) lines.push(cur); cur = []; continue; }
      cur.push(p);
    }
    if (cur.length > 1) lines.push(cur);
    return lines.map(pts => ({ pts, color: color || EL.C.path, width: 2, dash }));
  };
  MH.sgn = x => x > 0 ? '+' : x < 0 ? '−' : '';
  // Models 04–06: "model-defined path / custom probe position"
  MH.customProbe = R => [
    { key: 'px', label: 'Probe x coordinate / L', min: -R, max: R, step: 0.05, val: 0.5, show: p => p.customProbe },
    { key: 'py', label: 'Probe y coordinate / L', min: -R, max: R, step: 0.05, val: 0.5, show: p => p.customProbe },
    { key: 'pz', label: 'Probe z coordinate / L', min: -R, max: R, step: 0.05, val: 0.5, show: p => p.customProbe }
  ];
  MH.customToggle = { key: 'customProbe', label: 'Custom probe position (when unchecked, the probe moves along the path set by the model)', val: false, probe: true };

  // ---- Teaching constructions: labeled vectors, angle arcs, right-angle marks, highlighted planes (objects that are added first and hidden later) ----
  MH.vec = function (out, p, v, color, text, cls, width) {
    if (!(V.len(v) > 1e-9)) return;
    (out.arrows = out.arrows || []).push({ p, v, color, width: width || 2.4 });
    if (text) (out.labels = out.labels || []).push({ p: V.addS(p, v, 1.06), text, cls: (cls || '') + ' vec', kind: 'vectors' });
  };
  MH.dash = (out, a, b, color) => (out.lines = out.lines || []).push({ pts: [a, b], color: color || EL.C.guide, width: 1.2, dash: [0.1, 0.07] });
  // Draw an angle arc at vertex o between directions u and v and label it in degrees
  MH.arc = function (out, o, u, v, r, text, color) {
    const a = V.norm(u), b0 = V.norm(v), th = Math.acos(EL.U.clamp(V.dot(a, b0), -1, 1));
    if (!(th > 1e-3)) return th;
    let w = V.sub(b0, V.mul(a, Math.cos(th)));
    w = V.len(w) > 1e-6 ? V.norm(w) : V.perp(a);
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = th * i / 40; pts.push(V.add(o, V.add(V.mul(a, r * Math.cos(t)), V.mul(w, r * Math.sin(t))))); }
    (out.lines = out.lines || []).push({ pts, color: color || EL.C.ang, width: 1.6 });
    const m = V.add(o, V.add(V.mul(a, 1.25 * r * Math.cos(th / 2)), V.mul(w, 1.25 * r * Math.sin(th / 2))));
    (out.labels = out.labels || []).push({ p: m, text: text != null ? text : (th * 180 / Math.PI).toFixed(1) + '°', cls: 'ang', kind: 'angles' });
    return th;
  };
  MH.right = function (out, o, u, v, s, color) {
    const a = V.mul(V.norm(u), s), b = V.mul(V.norm(v), s);
    (out.lines = out.lines || []).push({ pts: [V.add(o, a), V.add(V.add(o, a), b), V.add(o, b)], color: color || EL.C.ang, width: 1.4 });
  };
  MH.tri = function (out, pts, color, alpha) {
    (out.meshes = out.meshes || []).push({ mesh: EL.ISO.polygon(pts), color: [...(color || EL.C.pot), alpha == null ? 0.2 : alpha], lit: false });
    for (let i = 0; i < pts.length; i++) (out.lines = out.lines || []).push({ pts: [pts[i], pts[(i + 1) % pts.length]], color: [...(color || EL.C.pot), 0.95], width: 2 });
  };
  // Placement options for sources and the probe: vertices, face centers, center, outside
  MH.placements = function (verts, faces, outR) {
    const out = verts.map((p, i) => ({ name: 'Vertex ' + (i + 1), p }));
    faces.forEach((f, i) => out.push({ name: 'Face center ' + (i + 1), p: V.mul(f.reduce((s, k) => V.add(s, verts[k]), [0, 0, 0]), 1 / f.length) }));
    out.push({ name: 'Center (interior)', p: [0, 0, 0] }, { name: 'Exterior point (on the x axis, at 1.8 times the circumscribed-sphere radius from the center)', p: [1.8 * outR, 0, 0] });
    return out;
  };
  EL.MH = MH;
})(window.EL);
