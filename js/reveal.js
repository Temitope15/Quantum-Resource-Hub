/* ================================================
   reveal.js  —  scroll-triggered reveal animations
   Adds .in to any .reveal element when it enters view.
   ================================================ */

(() => {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  const observe = () => {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }

  /* Re-scan when JS injects new .reveal nodes (e.g. featured grid). */
  window.QRH = window.QRH || {};
  window.QRH.observeReveal = observe;
})();
