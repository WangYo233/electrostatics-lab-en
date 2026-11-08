'use strict';
// Three-dimensional knowledge map on the home page (Canvas 2D, with its own 3D rotation and projection, no external library).
// Starts from the root node "Electrostatic field"; click a node to expand it level by level; drag to rotate and scroll to zoom; a model node opens the lab or the worked-problems page.
// Layout: each visible node takes one row (pre-order of the tree), and its level determines its horizontal position and depth; in the default view no row labels overlap.
// The list beside the map stays in sync with it and works with Tab and Enter, as an accessible alternative to the map.
(function () {
  var M = {
    1: ['01', 'Point charges and the dipole'], 2: ['02', 'Paths and energy'], 4: ['03', 'Regular tetrahedron'], 6: ['04', 'Cube'], 5: ['05', 'Regular octahedron'],
    7: ['06', 'Model inquiry'], 8: ['Ext. 1', 'Analytic-field models'], 3: ['Ext. 2', 'Charged disk'], ex: ['Examples', 'Worked problems']
  };
  // [name, children]; a number or 'ex' is a model leaf node
  var TREE = ['Electrostatic field', [
    ['Electric field', [
      ['Field of a point charge', [1]],
      ['Field lines', [1, 7]],
      ['Line charges and charged planes', [8]]
    ]],
    ['Electric potential', [
      ['Equipotential surfaces', [1, 4]],
      ['Zero of potential', [1, 8]],
      ['Field and potential', [2]]
    ]],
    ['Potential energy and work', [
      ['Work done by the electric force', [2, 6, 5]],
      ['Interaction energy', [3]]
    ]],
    ['Superposition and 3D vector addition', [
      ['Vector sum of fields', [4, 7]],
      ['Algebraic sum of potentials', [4, 1]],
      ['Electric dipole', [1]]
    ]],
    ['Symmetry', [
      ['Rotational symmetry: zero field at the center', [4, 'ex']],
      ['Inversion symmetry', [6]],
      ['Reflection symmetry', [5, 'ex']]
    ]],
    ['Conductors and dielectrics', [
      ['Electrostatic equilibrium of a conductor', [8]],
      ['Field in a dielectric', [8]]
    ]]
  ]];

  var host = document.getElementById('kg'); if (!host) return;
  var cv = host.querySelector('canvas'), g = cv.getContext('2d'), list = host.querySelector('.kg-list');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Building the tree ----------
  var nodes = [], seq = 0;
  function make(def, parent, level) {
    var n = { id: 'kg' + (seq++), parent: parent, level: level, kids: [], open: false, p: [0, 0, 0], a: 0, t: [0, 0, 0] };
    if (Array.isArray(def)) { n.label = def[0]; (def[1] || []).forEach(function (c) { n.kids.push(make(c, n, level + 1)); }); }
    else { var x = M[def]; n.label = x[0] + ' ' + x[1]; n.href = def === 'ex' ? 'examples.html' : 'lab.html?m=' + def; }
    nodes.push(n); return n;
  }
  var root = make(TREE, null, 0); root.a = 1;
  function visible(n) { for (var p = n.parent; p; p = p.parent) if (!p.open) return false; return true; }
  // ---------- Layout (world coordinates in CSS pixels; z is depth) ----------
  // Horizontal tree: one column per level, with the column width measured from the longest label of that level; each leaf (including unexpanded nodes) takes one row, and a parent sits at the middle height of its children.
  // Depth: levels are staggered front to back, and rows are slightly staggered too; dragging to rotate shows the three-dimensional arrangement of the levels.
  var W = 0, H = 0, small = false, ROW = 30, colX = [];
  var FONT = { 0: 'bold 17px', 1: '600 14.5px', 2: '13.5px', 3: '13px' };
  var FAM = ' "Microsoft YaHei", "PingFang SC", sans-serif';
  function font(n) { return (small ? ['bold 15px', '600 13px', '12.5px', '12px'][n.level] : FONT[n.level]) + FAM; }
  function txt(n) { return n.label + (n.href ? ' →' : n.kids.length ? (n.open ? ' −' : ' +') : ''); }
  function labelW(n) { g.font = font(n); return g.measureText(txt(n)).width + 14; }
  function layout() {
    var vis = nodes.filter(function (n) { return n === root || visible(n); });
    var maxW = [0, 0, 0, 0]; vis.forEach(function (n) { maxW[n.level] = Math.max(maxW[n.level], labelW(n)); });
    var gap = small ? 26 : 38, x = 0, deep = 0; colX = [];
    vis.forEach(function (n) { deep = Math.max(deep, n.level); });
    for (var L = 0; L < 4; L++) { colX[L] = x; x += 14 + maxW[L] + gap; }
    var need = colX[deep] + 14 + maxW[deep] + 40;
    // When the canvas cannot hold the horizontal tree, switch to an indented layout (one row per node, indented by level) and make the canvas taller according to the number of rows
    outline = need > W * 0.97;
    var slot = 0;
    if (outline) {
      vis.forEach(function (n) { n.row = 0; });
      (function lay(n) { n.row = slot++; if (n.open) n.kids.forEach(lay); })(root);
      ROW = small ? 29 : 30;
      for (L = 0; L < 4; L++) colX[L] = L * (small ? 20 : 26);
      var want = Math.max(baseH, Math.ceil(slot * ROW + 40)) + 'px';
      if (cv.style.height !== want) cv.style.height = want;
    } else {
      if (cv.style.height) cv.style.height = '';
      (function lay(n) {
        if (n.open && n.kids.length) { n.kids.forEach(lay); n.row = (n.kids[0].row + n.kids[n.kids.length - 1].row) / 2; }
        else n.row = slot++;
      })(root);
      ROW = Math.max(small ? 25 : 27, Math.min(46, (H - 44) / Math.max(1, slot)));
    }
    var mid = (slot - 1) / 2;
    nodes.forEach(function (n) {
      var row = n.row === undefined ? 0 : n.row;
      // Deeper levels come slightly forward (z negative) and rows alternate front to back to show the layered depth; the default pitch is 0, so nodes in one row stay at the same height
      // y is compensated for perspective according to depth, so rows are evenly spaced in the default view and labels do not overlap
      var z = -30 * n.level + 12 * Math.sin(row * 1.9);
      n.t = [colX[n.level], (mid - row) * ROW * (CAM + z) / CAM, z];
    });
    nodes.forEach(function (n) { if (!(n === root || visible(n))) delete n.row; });
    var right = outline ? Math.max.apply(null, vis.map(function (n) { return colX[n.level] + labelW(n) + 14; })) : colX[deep] + 14 + maxW[deep];
    ctrT = [(right - 16) / 2, 0, 0];
    var radialStep = deep ? Math.max(34, Math.min((W - 150) * 0.46 / deep, (H - 64) * 0.46 / deep)) : 0;
    nodes.forEach(function (n) { n.t = [0, 0, 0]; });
    for (var level = 1; level <= deep; level++) {
      var ring = vis.filter(function (n) { return n.level === level; });
      ring.forEach(function (n, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / ring.length; n.t = [radialStep * level * Math.cos(a), radialStep * level * Math.sin(a), 0]; });
    }
    outline = false; ctrT = [0, 0, 0];
  }

  // ---------- View ----------
  var YAW0 = 0.2, PITCH0 = 0, CAM = 900, outline = false, baseH = 320;
  var yaw = YAW0, pitch = PITCH0, zoom = 1, hover = null, focusN = null, proj = [];
  var ctr = [0, 0, 0], ctrT = [0, 0, 0];
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    if (!cv.style.height) baseH = cv.clientHeight;
    W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); small = W < 560;
    layout(); ctr = ctrT.slice(); kick();
  }
  function project(p) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var px = p[0] - ctr[0], py = p[1] - ctr[1], pz = p[2] - ctr[2];
    var x = cy * px - sy * pz, z = sy * px + cy * pz, y = cp * py - sp * z; z = sp * py + cp * z;
    var s = CAM / (CAM + z) * zoom;
    return { x: W / 2 + x * s, y: H / 2 - y * s, z: z, s: CAM / (CAM + z) };
  }

  // ---------- Drawing ----------
  // Colors: root indigo, branches orange, concepts blue, models pale gray-white; shapes also distinguish them (circle, circle, small circle, square)
  var COL = ['#8a9bff', '#e8833a', '#4aa8e8', '#e3e9f3'];
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function draw() {
    g.clearRect(0, 0, W, H);
    proj = [];
    nodes.forEach(function (n) { if (n.a > 0.02) proj.push({ n: n, q: project(n.p) }); });
    proj.forEach(function (o) {
      var n = o.n; if (!n.parent) return;
      var q2 = project(n.parent.p), mx = (q2.x + o.q.x) / 2;
      g.strokeStyle = 'rgba(150,172,210,' + (0.55 * n.a) + ')'; g.lineWidth = n.level === 1 ? 1.6 : 1.2;
      g.beginPath(); g.moveTo(q2.x, q2.y); g.bezierCurveTo(mx, q2.y, mx, o.q.y, o.q.x, o.q.y); g.stroke();
    });
    proj.sort(function (a, b) { return b.q.z - a.q.z; });
    proj.forEach(function (o) {
      var n = o.n, q = o.q, r = [10, 7.5, 6, 5.5][n.level] * Math.max(0.8, Math.min(1.25, q.s)), hot = n === hover || n === focusN;
      g.globalAlpha = n.a;
      g.fillStyle = COL[n.level];
      if (n.level === 3) g.fillRect(q.x - r, q.y - r, 2 * r, 2 * r);
      else { g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.fill(); }
      if (n.kids.length && !n.open) { g.strokeStyle = COL[n.level]; g.lineWidth = 1.5; g.beginPath(); g.arc(q.x, q.y, r + 4, 0, 7); g.stroke(); }
      if (hot) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, r + 7, 0, 7); g.stroke(); }
      // Labels sit to the right of the node on a dark background, with text color #eef3fa (contrast above 12)
      var t = txt(n), th = n.level === 0 ? 24 : 21; g.font = font(n);
      var tw = g.measureText(t).width + 14, lx = q.x + r + 6, ly = q.y - th / 2;
      rr(lx, ly, tw, th, 5); g.fillStyle = 'rgba(9,15,28,0.92)'; g.fill();
      g.strokeStyle = hot ? '#ffffff' : COL[n.level]; g.lineWidth = hot ? 1.6 : 1; g.stroke();
      g.fillStyle = '#eef3fa'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, lx + 7, q.y + 0.5);
      g.globalAlpha = 1;
      o.box = [q.x - r - 4, Math.min(q.y - r - 4, ly), lx + tw, Math.max(q.y + r + 4, ly + th)];
    });
  }
  // ---------- Animation (runs on demand) ----------
  var running = false, last = 0, drag = null;
  function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } }
  function tick(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
    var f = still ? 1 : 1 - Math.exp(-dt * 7), moving = false;
    nodes.forEach(function (n) {
      // Expand: children move out of the parent and fade in; collapse: they move back to the parent and fade out
      var on = n === root || visible(n), tp = on ? n.t : n.parent.p, ta = on ? 1 : 0;
      for (var i = 0; i < 3; i++) { var d = tp[i] - n.p[i]; n.p[i] += d * f; if (Math.abs(d) > 0.05) moving = true; }
      var da = ta - n.a; n.a += da * f; if (Math.abs(da) > 1e-3) moving = true;
    });
    for (var j = 0; j < 3; j++) { var dc = ctrT[j] - ctr[j]; ctr[j] += dc * f; if (Math.abs(dc) > 0.05) moving = true; }
    draw();
    if (moving || drag) requestAnimationFrame(tick); else running = false;
  }

  // ---------- State operations ----------
  // Only one branch level is open at a time (accordion style), so the view fits and labels do not overlap
  function collapse(n) { n.open = false; n.kids.forEach(collapse); }
  function open(n) {
    if (n.level === 1) root.kids.forEach(function (c) { if (c !== n) collapse(c); });
    n.open = true;
  }
  function changed(n) { layout(); sync(n); kick(); }
  function toggle(n) {
    if (n.href) { location.href = n.href; return; }
    if (n.open) collapse(n); else open(n);
    changed(n);
  }
  // Expand the next level: root → first branch (or the branch currently open) → all of its concepts → the next branch
  function expandLayer() {
    var b = null; root.kids.forEach(function (c) { if (c.open) b = c; });
    if (!root.open) root.open = true;
    else if (!b) open(root.kids[0]);
    else if (b.kids.some(function (c) { return !c.open; })) b.kids.forEach(function (c) { c.open = true; });
    else open(root.kids[(root.kids.indexOf(b) + 1) % root.kids.length]);
    changed();
  }
  function reset() { collapse(root); yaw = YAW0; pitch = PITCH0; zoom = 1; changed(); }

  // ---------- Pointer, wheel, keyboard ----------
  function pick(e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = proj.length - 1; i >= 0; i--) { var b = proj[i].box; if (b && proj[i].n.a > 0.5 && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return proj[i].n; }
    return null;
  }
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; cv.setPointerCapture(e.pointerId); kick(); });
  cv.addEventListener('pointermove', function (e) {
    if (drag) {
      yaw = Math.max(-1.3, Math.min(1.3, yaw + (e.clientX - drag.x) * 0.006));
      pitch = Math.max(-1.1, Math.min(1.1, pitch + (e.clientY - drag.y) * 0.006));
      drag.x = e.clientX; drag.y = e.clientY; return;
    }
    var h = pick(e); if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; draw(); }
  });
  cv.addEventListener('pointerup', function (e) {
    var d = drag; drag = null; if (!d) return;
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) { var n = pick(e); if (n) toggle(n); }
  });
  cv.addEventListener('pointercancel', function () { drag = null; });
  cv.addEventListener('pointerleave', function () { if (hover) { hover = null; draw(); } });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault(); zoom = Math.max(0.5, Math.min(2.2, zoom * Math.exp(-e.deltaY * 0.0012))); draw();
  }, { passive: false });
  cv.addEventListener('keydown', function (e) {
    var k = e.key, used = true;
    if (k === 'ArrowLeft') yaw = Math.max(-1.3, yaw - 0.12); else if (k === 'ArrowRight') yaw = Math.min(1.3, yaw + 0.12);
    else if (k === 'ArrowUp') pitch = Math.max(-1.1, pitch - 0.12); else if (k === 'ArrowDown') pitch = Math.min(1.1, pitch + 0.12);
    else if (k === '+' || k === '=') zoom = Math.min(2.2, zoom * 1.15); else if (k === '-') zoom = Math.max(0.5, zoom / 1.15);
    else used = false;
    if (used) { e.preventDefault(); draw(); }
  });
  host.querySelector('[data-kg=more]').addEventListener('click', expandLayer);
  host.querySelector('[data-kg=reset]').addEventListener('click', reset);

  // ---------- Accessible list (in sync with the map, reachable by Tab) ----------
  function item(n) {
    var li = document.createElement('li'), el;
    if (n.href) { el = document.createElement('a'); el.href = n.href; el.textContent = n.label + ' →'; }
    else {
      el = document.createElement('button'); el.type = 'button'; el.textContent = n.label;
      if (n.kids.length) el.setAttribute('aria-expanded', String(n.open));
      el.addEventListener('click', function () { toggle(n); });
    }
    el.className = 'kg-i l' + n.level; el.dataset.id = n.id;
    el.addEventListener('focus', function () { focusN = n; draw(); });
    el.addEventListener('blur', function () { if (focusN === n) { focusN = null; draw(); } });
    li.appendChild(el);
    if (n.open && n.kids.length) { var ul = document.createElement('ul'); n.kids.forEach(function (c) { ul.appendChild(item(c)); }); li.appendChild(ul); }
    return li;
  }
  // Rebuild the list; if focus was in the list, put it back on the same node afterward
  function sync(keep) {
    var had = list.contains(document.activeElement);
    list.textContent = '';
    list.appendChild(item(root));
    if (keep && had) { var el = list.querySelector('[data-id="' + keep.id + '"]'); if (el) el.focus(); }
  }

  sync();
  // For layout checks to read (read-only): the label boxes of the currently visible nodes
  host.kgBoxes = function () { return proj.filter(function (o) { return o.n.a > 0.5 && o.box; }).map(function (o) { return { label: o.n.label, box: o.box }; }); };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
  resize();
})();
