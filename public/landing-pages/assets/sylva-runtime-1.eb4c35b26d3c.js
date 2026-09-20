function installSylvaScheduler() {
  let hostVisible = true;
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
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
      function schedule() {
        if (pending && visible && hostVisible && !document.hidden && !frame) {
          frame = requestAnimationFrame((now) => {
            frame = 0;
            pending = draw(now) !== false;
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