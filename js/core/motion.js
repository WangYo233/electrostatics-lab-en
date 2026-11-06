'use strict';
// Interface motion: cross-fade on workspace switch, smooth expansion of collapsible panels, fade-in on scroll, button press feedback, and theory-page table of contents highlighting on scroll
// All of it is turned off when the system setting "reduce motion" is on
(function (EL) {
  // When the system requests reduced motion, or the page is not in the foreground (no frames are drawn and animations would hang), always switch directly
  const still = () => (typeof document !== 'undefined' && document.hidden) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const M = EL.motion = { swap: fn => fn() };
  if (typeof document === 'undefined' || !document.addEventListener) return;   // Non-browser environment (unit tests): keep only the direct switch

  // Workspace switch: cross-fade when the browser supports View Transitions, otherwise switch directly.
  // During rapid consecutive switches the browser skips the previous transition (AbortError); every transition promise is handled, so no uncaught error appears
  M.swap = function (fn) {
    if (still() || !document.startViewTransition) return fn();
    let ran = false;
    const once = () => { if (!ran) { ran = true; fn(); } };
    try {
      const t = document.startViewTransition(once);
      [t.finished, t.ready, t.updateCallbackDone].forEach(p => p && p.catch(() => {}));
    } catch (e) { once(); }
    setTimeout(once, 250);   // Fallback in case the browser is slow to call back, so the switch is never lost
  };

  // Collapsible panels: smooth height transition on expanding and collapsing (applies only to note and group panels in the interface, not the top-bar menu)
  const SEL = 'details.acc, details.tip, details.where, details.base, details.g-item, details.grp';
  document.addEventListener('click', e => {
    const s = e.target.closest('summary');
    if (!s || still()) return;
    const d = s.parentElement;
    if (!d || !d.matches(SEL) || d.dataset.anim) return;
    e.preventDefault();
    const h0 = d.offsetHeight;
    d.dataset.anim = '1';
    const opening = !d.open;
    // First measure the target height synchronously (no painting), then transition from the current height
    d.open = !d.open; const h1 = d.offsetHeight; d.open = !d.open;
    if (opening) d.open = true;
    d.style.overflow = 'hidden';
    const a = d.animate({ height: [h0 + 'px', h1 + 'px'] }, { duration: Math.min(380, 160 + Math.abs(h1 - h0) * 0.35), easing: 'cubic-bezier(.22,.8,.26,1)' });
    let done = false;
    const end = () => { if (done) return; done = true; if (!opening) d.open = false; d.style.overflow = ''; delete d.dataset.anim; };
    a.onfinish = a.oncancel = end;
    setTimeout(() => { a.cancel(); end(); }, 600);   // Fallback when the animation is suspended
  });

  // Fade in and rise when scrolling into the viewport (elements marked with data-reveal)
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }) : null;
  M.reveal = function (root, sel) {
    const els = (root || document).querySelectorAll(sel || '[data-reveal]');
    els.forEach((el, i) => {
      if (still() || !io) { el.classList.add('in'); return; }
      el.classList.add('rv'); el.style.setProperty('--d', Math.min(i, 8) * 40 + 'ms'); io.observe(el);
    });
  };

  // Table of contents highlighting: mark the section currently being read while scrolling, and show reading progress at the top
  M.scrollSpy = function (scroller, links, bar) {
    if (M._spy) scroller.removeEventListener('scroll', M._spy);
    const tick = () => {
      const top = scroller.getBoundingClientRect().top + 80;
      let cur = links[0];
      for (const l of links) { const t = document.getElementById(l.dataset.target); if (t && t.getBoundingClientRect().top <= top) cur = l; }
      links.forEach(l => l.classList.toggle('cur', l === cur));
      if (bar) { const m = scroller.scrollHeight - scroller.clientHeight; bar.style.transform = 'scaleX(' + (m > 0 ? scroller.scrollTop / m : 0) + ')'; }
    };
    let raf = 0;
    M._spy = () => { if (!raf) raf = setTimeout(() => { raf = 0; tick(); }, 30); };
    scroller.addEventListener('scroll', M._spy, { passive: true });
    tick();
  };

  // Button press feedback: a soft ripple spreading from the click position
  document.addEventListener('pointerdown', e => {
    if (still() || e.button !== 0) return;
    const b = e.target.closest('.btn, .modes button, .chip, .rail button, .sb-nav, .tools button');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, w = document.createElement('i');
    w.className = 'ripple';
    w.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.classList.add('has-ripple'); b.appendChild(w);
    w.addEventListener('animationend', () => w.remove());
  });
})(window.EL = window.EL || {});
