'use strict';
// Three-dimensional knowledge map on the home page (Canvas 2D, with its own 3D rotation and projection, no external library).
// Starts from the root node "Electrostatic field"; click a node to expand it level by level; drag to rotate and scroll to zoom; a model node opens the lab or the worked-problems page.
// Each level occupies a spherical shell; straight edges connect each node to its parent.
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
  var cv = host.querySelector('canvas'), wrap = host.querySelector('.kg-canvas-wrap'), g = cv.getContext('2d'), list = host.querySelector('.kg-list');
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
  // ---------- Top-down tree layout ----------
  var W = 0, H = 0, viewportW = 0, small = false, baseH = 460, baseHSet = false;
  var FONT = { 0: 'bold 17px', 1: '600 14.5px', 2: '13.5px', 3: '13px' };
  var FAM = ' "Microsoft YaHei", "PingFang SC", sans-serif';
  function font(n) { return (small ? ['bold 15px', '600 13px', '12.5px', '12px'][n.level] : FONT[n.level]) + FAM; }
  function txt(n) { return n.label + (n.href ? ' →' : n.kids.length ? (n.open ? ' −' : ' +') : ''); }
  function wrapLabel(n, maxWidth) {
    g.font = font(n); var words = txt(n).match(/\S+|\s+/g) || [txt(n)], lines = [], line = '';
    words.forEach(function (word) {
      if (/^\s+$/.test(word) && !line) return;
      if (g.measureText(line + word).width <= maxWidth) { line += word; return; }
      if (line.trim()) lines.push(line.trim()); line = '';
      if (g.measureText(word).width <= maxWidth) { line = word.trimStart(); return; }
      Array.from(word).forEach(function (ch) { if (line && g.measureText(line + ch).width > maxWidth) { lines.push(line); line = ch; } else line += ch; });
    });
    if (line.trim()) lines.push(line.trim()); n.lines = lines.length ? lines : [''];
  }
  function layout() {
    cv.style.width = ''; cv.style.height = '';
    viewportW = wrap.clientWidth; small = viewportW < 560;
    if (!baseHSet) { baseH = parseFloat(getComputedStyle(cv).height) || 460; baseHSet = true; }
    var vis = nodes.filter(function (n) { return n === root || visible(n); }), slots = 0;
    function assign(n) {
      if (n.open && n.kids.length) { n.kids.forEach(assign); n.first = n.kids[0].first; n.last = n.kids[n.kids.length - 1].last; }
      else n.first = n.last = slots++;
    }
    assign(root);
    var desiredW = small && slots > 3 ? Math.max(viewportW, slots * 92 + 28) : viewportW;
    cv.style.width = desiredW > viewportW + 1 ? desiredW + 'px' : ''; W = cv.clientWidth;
    var unit = W / Math.max(1, slots), byLevel = [];
    vis.forEach(function (n) { n.x = ((n.first + n.last + 1) / 2) * unit; (byLevel[n.level] || (byLevel[n.level] = [])).push(n); });
    byLevel.forEach(function (row) {
      row.sort(function (a, b) { return a.x - b.x; });
      row.forEach(function (n, i) {
        var gap = Math.min(n.x * 2 - 12, (W - n.x) * 2 - 12, row.length === 1 ? W - 28 : Math.min(i ? n.x - row[i - 1].x : Infinity, i + 1 < row.length ? row[i + 1].x - n.x : Infinity) - 12);
        n.boxW = Math.max(40, Math.min(small ? 150 : 220, gap)); wrapLabel(n, n.boxW - 12);
        n.lineH = small ? 12 : 14; n.boxH = n.lines.length * n.lineH + 8;
      });
    });
    var rowHeights = byLevel.map(function (row, level) { var max = row.reduce(function (m, n) { return Math.max(m, n.boxH); }, 0); return (level ? 16 : 24) + 6 + max + 12; });
    var needH = rowHeights.reduce(function (a, b) { return a + b; }, 22) + 14;
    cv.style.height = Math.max(baseH, needH) + 'px'; H = cv.clientHeight;
    var y = 11;
    byLevel.forEach(function (row, level) {
      var radius = level ? 8 : 12;
      row.forEach(function (n) { n.t = [n.x - W / 2, H / 2 - (y + radius), 0]; n.radius = radius; n.boxH = row.reduce(function (m, x) { return Math.max(m, x.boxH); }, 0); });
      y += rowHeights[level];
    });
  }

  // ---------- View ----------
  var zoom = 1, hover = null, focusN = null, proj = [], ctr = [0, 0, 0];
  function resize() { layout(); var dpr = window.devicePixelRatio || 1; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); kick(); }
  function project(p) { return { x: W / 2 + (p[0] - ctr[0]) * zoom, y: H / 2 - (p[1] - ctr[1]) * zoom, z: 0, s: zoom }; }

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
      var q2 = project(n.parent.p);
      var dx = o.q.x - q2.x, dy = o.q.y - q2.y, len = Math.max(1, Math.hypot(dx, dy)), ux = dx / len, uy = dy / len;
      g.strokeStyle = 'rgba(150,172,210,' + (0.65 * n.a) + ')'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(q2.x + ux * n.parent.radius * zoom, q2.y + uy * n.parent.radius * zoom); g.lineTo(o.q.x - ux * n.radius * zoom, o.q.y - uy * n.radius * zoom); g.stroke();
    });
    proj.forEach(function (o) {
      var n = o.n, q = o.q, r = n.radius * zoom, hot = n === hover || n === focusN;
      g.globalAlpha = n.a;
      g.fillStyle = COL[n.level];
      g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.fill();
      if (n.kids.length && !n.open) { g.strokeStyle = COL[n.level]; g.lineWidth = 1.5 * zoom; g.beginPath(); g.arc(q.x, q.y, r + 4 * zoom, 0, Math.PI * 2); g.stroke(); }
      if (hot) { g.strokeStyle = '#ffffff'; g.lineWidth = 2 * zoom; g.beginPath(); g.arc(q.x, q.y, r + 7 * zoom, 0, Math.PI * 2); g.stroke(); }
      var tw = n.boxW * zoom, th = n.boxH * zoom, lx = q.x - tw / 2, ly = q.y + r + 5 * zoom;
      rr(lx, ly, tw, th, 5 * zoom); g.fillStyle = 'rgba(9,15,28,0.94)'; g.fill();
      g.strokeStyle = hot ? '#ffffff' : COL[n.level]; g.lineWidth = hot ? 1.6 : 1; g.stroke();
      g.fillStyle = '#f4f7fc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(n).replace(/([\d.]+)px/, function (_, px) { return (parseFloat(px) * zoom) + 'px'; });
      n.lines.forEach(function (s, i) { g.fillText(s, q.x, ly + 4 * zoom + (i + 0.5) * n.lineH * zoom, Math.max(1, tw - 12 * zoom)); });
      g.globalAlpha = 1;
      o.box = [Math.min(q.x - r - 4 * zoom, lx), q.y - r - 4 * zoom, Math.max(q.x + r + 4 * zoom, lx + tw), ly + th];
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
  function reset() { collapse(root); ctr = [0, 0, 0]; zoom = 1; changed(); }

  // ---------- Pointer, wheel, keyboard ----------
  function pick(e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = proj.length - 1; i >= 0; i--) { var b = proj[i].box; if (b && proj[i].n.a > 0.5 && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return proj[i].n; }
    return null;
  }
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) drag.moved = true;
      ctr[0] -= dx / zoom; ctr[1] += dy / zoom; draw();
      drag.x = e.clientX; drag.y = e.clientY; return;
    }
    var h = pick(e); if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; draw(); }
  });
  cv.addEventListener('pointerup', function (e) {
    var d = drag; drag = null; if (!d) return;
    if (!d.moved) { var n = pick(e); if (n) toggle(n); }
  });
  cv.addEventListener('pointercancel', function () { drag = null; });
  cv.addEventListener('pointerleave', function () { if (hover) { hover = null; draw(); } });
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var next = Math.max(0.55, Math.min(2.8, zoom * Math.exp(-e.deltaY * 0.0012)));
    var wx = ctr[0] + (x - W / 2) / zoom, wy = ctr[1] - (y - H / 2) / zoom;
    ctr[0] = wx - (x - W / 2) / next; ctr[1] = wy + (y - H / 2) / next; zoom = next; kick();
  }, { passive: false });
  cv.addEventListener('keydown', function (e) {
    var k = e.key, used = true;
    if (k === 'ArrowLeft') ctr[0] -= 24 / zoom; else if (k === 'ArrowRight') ctr[0] += 24 / zoom;
    else if (k === 'ArrowUp') ctr[1] += 24 / zoom; else if (k === 'ArrowDown') ctr[1] -= 24 / zoom;
    else if (k === '+' || k === '=') zoom = Math.min(2.8, zoom * 1.15); else if (k === '-') zoom = Math.max(0.55, zoom / 1.15);
    else used = false;
    if (used) { e.preventDefault(); kick(); }
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
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap); else window.addEventListener('resize', resize);
  resize();
})();
