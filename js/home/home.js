'use strict';
// Home page: grouped model cards and the dipole animation in the hero
(function () {
  // Worked problems and problem authoring have a dedicated fourth category.
  var groups = [
    ['I. Basic models', [[1, '01', 'Point charges and the dipole'], [2, '02', 'Paths and energy']]],
    ['II. Symmetric models', [[4, '03', 'Regular tetrahedron'], [6, '04', 'Cube'], [5, '05', 'Regular octahedron']]],
    ['III. Extensions and authoring', [[7, '06', 'Model inquiry'], [8, 'Ext. 1', 'Analytic-field models'], [3, 'Ext. 2', 'Charged disk (snowflake problem)']]],
    ['IV. Problems', [['ex', 'Worked', 'Worked problems'], ['add', 'Add', 'Add problems']]]
  ];
  function href(id) { return id === 'ex' ? 'examples.html' : id === 'add' ? 'examples.html?mode=add' : 'lab.html?m=' + id; }

  var root = document.getElementById('groups'), k = 0;
  // The hover glow on a card follows the pointer
  root.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.card-link'); if (!c) return;
    var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
  groups.forEach(function (g) {
    var h = document.createElement('h2'); h.className = 'cat'; h.textContent = g[0]; root.appendChild(h);
    var box = document.createElement('nav'); box.className = 'cards'; box.setAttribute('aria-label', g[0]);
    g[1].forEach(function (x) {
      var a = document.createElement('a');
      a.className = 'card-link'; a.href = href(x[0]); a.style.animationDelay = (k++ * 60) + 'ms';
      var n = document.createElement('div'); n.className = 'num'; n.textContent = x[1];
      var t = document.createElement('h2'); t.textContent = x[2];
      var go = document.createElement('span'); go.className = 'go'; go.setAttribute('aria-hidden', 'true'); go.textContent = '→';
      a.appendChild(n); a.appendChild(t); a.appendChild(go);
      box.appendChild(a);
    });
    root.appendChild(box);
  });

  // Hero animation: the dipole's field lines with particles flowing along them.
  // Field lines start from the positive charge; others are traced backward along E from the negative charge, keeping only lines that come from outside the frame (the direction of infinity). This fills in the region outside the negative charge without duplicating lines that start from the positive charge.
  (function () {
    var cv = document.getElementById('hero'), g = cv.getContext('2d'), lines = [], parts = [], W, H, Q, last = 0;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function E(x, y) {
      var ex = 0, ey = 0;
      Q.forEach(function (q) { var dx = x - q[0], dy = y - q[1], r2 = dx * dx + dy * dy, r3 = r2 * Math.sqrt(r2); ex += q[2] * dx / r3; ey += q[2] * dy / r3; });
      return [ex, ey];
    }
    // Integrate from near charge q; dir = 1 follows E, dir = −1 goes against E. Returns {pts, end}, where end is 'charge' or 'out'
    function trace(q, a, dir, other) {
      var x = q[0] + 10 * Math.cos(a), y = q[1] + 10 * Math.sin(a), pts = [[x, y]], end = 'out';
      for (var n = 0; n < 900; n++) {
        var e = E(x, y), l = Math.hypot(e[0], e[1]); if (!l) break;
        x += dir * 3 * e[0] / l; y += dir * 3 * e[1] / l; pts.push([x, y]);
        if (Math.hypot(x - other[0], y - other[1]) < 9) { end = 'charge'; break; }
        if (x < -60 || x > W + 60 || y < -60 || y > H + 60) break;
      }
      return { pts: pts, end: end };
    }
    function add(pts) {
      lines.push(pts);
      for (var m = 0; m < Math.max(2, pts.length / 40); m++) parts.push({ l: lines.length - 1, u: Math.random() * pts.length });
    }
    function build() {
      var dpr = window.devicePixelRatio || 1;
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var s = Math.min(W, H * 2.2) * 0.13;
      Q = [[W * 0.64 - s, H * 0.52, s * s], [W * 0.64 + s, H * 0.52, -s * s]];
      lines = []; parts = [];
      var N = 22, i;
      for (i = 0; i < N; i++) add(trace(Q[0], 2 * Math.PI * (i + 0.5) / N, 1, Q[1]).pts);
      // Negative charge: trace backward against E; lines that reach the positive charge were already drawn above and are discarded; the rest are reversed so particles flow along E into the negative charge
      for (i = 0; i < N; i++) {
        var r = trace(Q[1], Math.PI - 2 * Math.PI * (i + 0.5) / N, -1, Q[0]);
        if (r.end === 'out') add(r.pts.reverse());
      }
    }
    function frame(t) {
      var dt = last ? Math.min(50, t - last) : 16.7; last = t;
      g.clearRect(0, 0, W, H);
      g.lineWidth = 1; g.strokeStyle = 'rgba(143,184,222,0.22)';
      lines.forEach(function (p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.stroke(); });
      parts.forEach(function (P) {
        var p = lines[P.l], i = Math.floor(P.u), q = p[Math.min(i, p.length - 1)];
        // Speed ∝ √|E| (clamped), in polyline vertices advanced per frame; half as fast as before
        var e = E(q[0], q[1]), sp = 0.5 * Math.min(3, Math.max(0.35, Math.sqrt(Math.hypot(e[0], e[1])) * 0.9));
        if (!still) P.u = (P.u + sp * dt / 16.7) % p.length;
        var f = P.u / p.length, al = Math.min(1, f * 8, (1 - f) * 8) * 0.85;
        g.fillStyle = 'rgba(220,235,250,' + al + ')'; g.beginPath(); g.arc(q[0], q[1], 1.6, 0, 7); g.fill();
      });
      Q.forEach(function (q, i) {
        var r = 9 + (still ? 0 : Math.sin(t / 900 + i * 2) * 1.2), col = i ? '79,163,224' : '242,142,43';
        var gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 4);
        gr.addColorStop(0, 'rgba(' + col + ',0.55)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.beginPath(); g.arc(q[0], q[1], r * 4, 0, 7); g.fill();
        g.fillStyle = 'rgb(' + col + ')'; g.beginPath(); g.arc(q[0], q[1], 7, 0, 7); g.fill();
        g.fillStyle = '#0b1220'; g.font = 'bold 12px "Times New Roman"'; g.textAlign = 'center'; g.fillText(i ? '−' : '+', q[0], q[1] + 4);
      });
      if (!still) requestAnimationFrame(frame);
    }
    build(); requestAnimationFrame(frame);
    window.addEventListener('resize', function () { build(); if (still) requestAnimationFrame(frame); });
  })();
})();
