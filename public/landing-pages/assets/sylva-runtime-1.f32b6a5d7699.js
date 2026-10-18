function installSylvaScheduler() {
  let hostVisible = true;
  const mobile = window.matchMedia('(max-width: 600px), (pointer: coarse)');
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  let scrolling = false;
  let scrollTimer;
  function pauseForScroll() {
    if (!mobile.matches) return;
    clearTimeout(scrollTimer);
    if (!scrolling) {
      scrolling = true;
      notify();
    }
    scrollTimer = setTimeout(() => {
      scrolling = false;
      notify();
    }, 200);
  }
  // Scrolling belongs to the containing page, not the iframe document. Keep
  // the last painted frame visible and release the GPU during mobile gestures.
  const scrollTargets = [window];
  try {
    if (window.parent !== window && window.parent.document) scrollTargets.push(window.parent);
  } catch { /* A separately hosted preview cannot access its parent. */ }
  for (const target of scrollTargets) {
    target.addEventListener('scroll', pauseForScroll, { passive: true });
    target.addEventListener('touchmove', pauseForScroll, { passive: true });
  }
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    clearTimeout(scrollTimer);
    for (const target of scrollTargets) {
      target.removeEventListener('scroll', pauseForScroll);
      target.removeEventListener('touchmove', pauseForScroll);
    }
  });
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type !== 'threeui:visibility') return;
    hostVisible = event.data.visible === true;
    notify();
  });
  document.addEventListener('visibilitychange', notify);

  window.__sylvaRuntime = {
    createLoop(draw, element) {
      let visible = true;
      let pending = true;
      let frame = 0;
      let lastDraw = -Infinity;
      function schedule() {
        if (pending && visible && hostVisible && !scrolling && !document.hidden && !frame) {
          frame = requestAnimationFrame((now) => {
            frame = 0;
            if (!mobile.matches || now - lastDraw >= 1000 / 30 - 0.5) {
              lastDraw = now;
              pending = draw(now) !== false;
            }
            schedule();
          });
        }
      }
      function invalidate() {
        pending = true;
        schedule();
      }
      function refresh() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastDraw = -Infinity;
        invalidate();
      }
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0);
          refresh();
        });
        observer.observe(element);
      }
      listeners.add(refresh);
      return { invalidate };
    },
  };
}
installSylvaScheduler();