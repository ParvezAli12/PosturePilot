/* Tiny wrapper around localStorage; never throws. */
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem('pf:' + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem('pf:' + key, JSON.stringify(value)); } catch {} },
  del(key) { try { localStorage.removeItem('pf:' + key); } catch {} }
};