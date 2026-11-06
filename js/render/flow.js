'use strict';
// Field-line flow particles: advance along the integrated field lines according to field strength, showing the direction and relative strength of the field
// This is only a dynamic display of the field lines, not a dynamical trajectory of charged particles
(function (EL) {
  const V = EL.V;

  function Flow() { this.src = null; this.lines = []; this.parts = []; this.n = 0; }

  // lines: [{pts, speed[]}]; speed is the relative speed at each vertex (normalized by the median field strength)
  Flow.prototype.set = function (data, density) {
    if (data === this.src && density === this.density) return;
    this.src = data; this.density = density;
    this.lines = []; this.parts = []; this.n = 0;
    if (!data) return;
    let total = 0;
    for (const L of data.lines) {
      const pts = L.pts, s = [0];
      for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + V.dist(pts[i - 1], pts[i]));
      const len = s[s.length - 1];
      if (len <= 0) continue;
      this.lines.push({ pts, s, len, sp: L.speed });
      total += len;
    }
    const budget = Math.round(1400 * density), spacing = Math.max(total / budget, data.bound * 0.06);
    this.lines.forEach((L, li) => {
      const n = Math.max(1, Math.round(L.len / spacing));
      for (let k = 0; k < n; k++) this.parts.push({ li, u: (k + Math.random() * 0.8) / n * L.len, seg: 0 });
    });
    this.n = this.parts.length;
    this.pos = new Float32Array(this.n * 3); this.col = new Float32Array(this.n * 4); this.size = new Float32Array(this.n);
    // Base speed (at a "flow speed" of 1, 0.055 of the display range per second); it was 0.11, halved to make the motion easier to follow
    this.base = data.bound * 0.055;
  };

  // Advance and write into the vertex array; dt is in seconds
  Flow.prototype.step = function (dt, speed, color) {
    const k = this.base * speed, n = Math.min(this.n, this.parts.length);
    for (let i = 0; i < n; i++) {
      const P = this.parts[i], L = this.lines[P.li];
      if (!L) continue;
      let j = P.seg;
      if (L.s[j] > P.u) j = 0;
      while (j < L.s.length - 2 && L.s[j + 1] < P.u) j++;
      const sp = L.sp ? L.sp[j] : 1;
      P.u += dt * k * sp;
      if (P.u >= L.len) { P.u -= L.len; j = 0; }
      while (j < L.s.length - 2 && L.s[j + 1] < P.u) j++;
      P.seg = j;
      const seg = L.s[j + 1] - L.s[j], t = seg > 0 ? (P.u - L.s[j]) / seg : 0;
      const a = L.pts[j], b = L.pts[j + 1];
      this.pos[i * 3] = a[0] + (b[0] - a[0]) * t; this.pos[i * 3 + 1] = a[1] + (b[1] - a[1]) * t; this.pos[i * 3 + 2] = a[2] + (b[2] - a[2]) * t;
      // Fade in and out at the ends of a line to avoid sudden appearance at the source
      const f = P.u / L.len, fade = Math.min(1, f * 8, (1 - f) * 8);
      this.col[i * 4] = color[0]; this.col[i * 4 + 1] = color[1]; this.col[i * 4 + 2] = color[2];
      this.col[i * 4 + 3] = 0.9 * fade * (0.55 + 0.45 * Math.min(1, sp));
      this.size[i] = 0.9 + 0.5 * Math.min(1.5, sp);
    }
  };

  // Relative speed at vertices. Particles move along the field lines in the direction of E (from positive sources to negative sources or infinity).
  // mode 'linear': speed ∝ |E| (taking the median |E| over the line as 1), clamped to [0.08, 6], so speed is clamped near sources;
  // mode 'sqrt': speed ∝ √|E|, which compresses strong/weak differences so flow near sources and far away can both be seen; clamped to [0.25, 3].
  // Both modes show only direction and relative strength, not the real motion of charged particles.
  Flow.speeds = function (F, lines, mode) {
    const all = [], lin = mode === 'linear';
    const out = lines.map(pts => pts.map(p => { const s = F.sample(p), m = s.ok ? V.len(s.E) : NaN; if (isFinite(m)) all.push(m); return m; }));
    all.sort((a, b) => a - b);
    const med = all.length ? all[Math.floor(all.length / 2)] || 1 : 1;
    const f = m => !isFinite(m) ? (lin ? 6 : 3) : lin ? Math.min(6, Math.max(0.08, m / med)) : Math.min(3, Math.max(0.25, Math.sqrt(m / med)));
    return lines.map((pts, i) => ({ pts, speed: out[i].map(f) }));
  };

  EL.Flow = Flow;
})(window.EL);
