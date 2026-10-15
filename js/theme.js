(() => {
  const KEY = 'pf:theme';
  const root = document.documentElement;
  const sys = matchMedia('(prefers-color-scheme: dark)');
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  const current = () => read() || (sys.matches ? 'dark' : 'light');

  function label(t) {
    const b = document.getElementById('themeToggle');
    if (b) b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  function apply(t) { root.dataset.theme = t; label(t); }

  apply(current());                                   // before first paint, so no flash
  sys.addEventListener?.('change', () => { if (!read()) apply(current()); });

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    label(root.dataset.theme);
    btn?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      write(next);

      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduce) { apply(next); return; }

      // the new theme spreads outward from the button
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => apply(next));
      vt.ready.then(() => root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      ));
    });
  });
})();