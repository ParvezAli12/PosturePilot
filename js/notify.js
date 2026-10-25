/* Reminders that run while PosturePilot is open, plus a gentle catch-up when you come back.
   A website cannot wake itself up at a set time when it is closed, so this is honest about that:
   - open (or in a background tab): a pop-up notification at the chosen time, if you allowed them;
   - a visible tab: an on-page card instead;
   - you open the site after missing your workout time: one reminder card.
   For alerts that arrive even when the site is closed, the Reminders page can add them to your calendar. */
(() => {
  if (typeof Store === 'undefined') return;

  const DEFAULTS = {
    workout: { on: false, time: '18:00', days: [0, 1, 2, 3, 4, 5, 6] },
    desk: { on: false, start: '10:00', end: '16:00', every: 60, days: [1, 2, 3, 4, 5] }
  };
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const mins = (t) => { const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

  function load() {
    const s = Store.get('reminders', {}) || {};
    return {
      workout: { ...DEFAULTS.workout, ...(s.workout || {}) },
      desk: { ...DEFAULTS.desk, ...(s.desk || {}) },
      fired: s.fired || {}, dismissed: s.dismissed || ''
    };
  }
  const save = (c) => Store.set('reminders', c);

  /* the times of day a desk-break reminder goes off */
  function slots(c) {
    const out = [], a = mins(c.start), b = mins(c.end), step = Math.max(15, +c.every || 60);
    for (let m = a; m <= b && out.length < 24; m += step) out.push(m);
    return out;
  }

  const trainedOn = (date) => (Store.get('sessions', []) || []).some((s) => (typeof s === 'string' ? s : s && s.date) === date);

  /* what should go off right now (a reminder stays valid for a few minutes after its time) */
  function due(c, now) {
    const day = now.getDay(), nowM = now.getHours() * 60 + now.getMinutes(), date = ymd(now), items = [];
    if (c.workout.on && c.workout.days.includes(day) && !trainedOn(date)) {
      const t = mins(c.workout.time);
      if (nowM >= t && nowM - t <= 30) items.push({ key: `w-${date}`, kind: 'workout', time: hhmm(t) });
    }
    if (c.desk.on && c.desk.days.includes(day)) {
      for (const t of slots(c.desk)) if (nowM >= t && nowM - t <= 10) items.push({ key: `d-${date}-${t}`, kind: 'desk', time: hhmm(t) });
    }
    return items.filter((i) => !c.fired[i.key]);
  }

  /* opened the site well after the workout time and nothing done yet today */
  function missed(c, now) {
    if (!c.workout.on || !c.workout.days.includes(now.getDay())) return null;
    const nowM = now.getHours() * 60 + now.getMinutes(), t = mins(c.workout.time);
    if (nowM - t > 30 && !trainedOn(ymd(now)) && c.dismissed !== ymd(now)) return { kind: 'missed', time: hhmm(t) };
    return null;
  }

  const MSG = {
    workout: { title: 'Time for your workout', text: 'Your PosturePilot session is ready.', url: 'plan.html?start=1', go: 'Start workout' },
    desk: { title: 'Desk break', text: 'Two minutes to loosen up your neck, shoulders and back.', url: 'desk.html?start=1', go: 'Start desk break' },
    missed: { title: 'Workout not done yet', text: '', url: 'plan.html?start=1', go: 'Start workout' }
  };

  /* ---------- the on-page card ---------- */
  const style = document.createElement('style');
  style.textContent = `#ppToast{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:440px;margin-inline:auto;background:var(--paper);color:var(--ink);border:1.5px solid var(--edge);border-radius:12px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:var(--font-body,system-ui)}
    #ppToast b{display:block;font:800 1.1rem var(--font-head,system-ui);margin-bottom:2px}#ppToast p{margin:0 0 12px;color:var(--slate)}
    #ppToast .row{display:flex;gap:10px;flex-wrap:wrap}`;
  document.head.appendChild(style);

  function toast(kind, text) {
    document.getElementById('ppToast')?.remove();
    const m = MSG[kind], el = document.createElement('div');
    el.id = 'ppToast'; el.setAttribute('role', 'status');
    el.innerHTML = `<b>${m.title}</b><p>${text || m.text}</p><div class="row"><a class="btn go small" href="${m.url}">${m.go}</a><button type="button" class="btn alt small" id="ppLater">Later</button></div>`;
    document.body.appendChild(el);
    el.querySelector('#ppLater').onclick = () => {
      el.remove();
      if (kind === 'missed') { const c = load(); c.dismissed = ymd(new Date()); save(c); }
    };
  }

  /* ---------- pop-up notification (works through the tiny service worker on phones) ---------- */
  async function osNotify(kind) {
    const m = MSG[kind === 'missed' ? 'workout' : kind];
    const url = new URL(m.url, location.href).href;
    const opts = { body: m.text, tag: 'posturepilot-' + kind, data: { url } };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg && reg.showNotification) { await reg.showNotification(m.title, opts); return true; }
    } catch {}
    try { const n = new Notification(m.title, opts); n.onclick = () => { window.focus(); location.href = url; }; return true; } catch { return false; }
  }

  const inWorkout = () => { const w = document.getElementById('wo'); return !!(w && !w.hidden); };
  let missedShown = false;

  async function check() {
    const c = load(), now = new Date(), date = ymd(now);
    let changed = false;

    for (const k of Object.keys(c.fired)) if (!k.includes(date)) { delete c.fired[k]; changed = true; }

    const list = due(c, now);
    if (list.length && !inWorkout()) {
      const it = list[0];                                           // one at a time, never a pile-up
      if (document.visibilityState === 'visible') { toast(it.kind); c.fired[it.key] = 1; changed = true; }
      else if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && await osNotify(it.kind)) { c.fired[it.key] = 1; changed = true; }
    } else if (!list.length && !missedShown && !inWorkout() && document.visibilityState === 'visible') {
      const m = missed(c, now);
      if (m) { toast('missed', `You planned to work out at ${m.time} and have not trained yet today.`); missedShown = true; }
    }
    if (changed) { const cur = load(); cur.fired = c.fired; save(cur); }       // merge so settings changed elsewhere are not overwritten
  }

  window.PPNotify = { load, save, due, missed, slots, mins, hhmm, ymd, check, osNotify, toast };
  const start = () => { check(); setInterval(check, 20000); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();