/* Plan page: workout streaks, a 5-week calendar, and backup / restore of everything saved on this device.
   Nothing else needs to change: it reads the saved workouts and redraws whenever the "sessions done" number updates. */
(() => {
  const host = document.getElementById('progress');
  if (!host || typeof Store === 'undefined') return;

  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;     // local calendar date
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dates = () => (Store.get('sessions', []) || []).map((s) => (typeof s === 'string' ? s : s && s.date)).filter(Boolean);

  /* ---------- numbers ---------- */
  function stats(list) {
    const set = new Set(list);
    const today = new Date(); today.setHours(12, 0, 0, 0);

    let cur = 0, d = new Date(today);
    if (!set.has(iso(d))) d = addDays(d, -1);                    // no workout yet today? the streak is still alive until tonight
    while (set.has(iso(d))) { cur++; d = addDays(d, -1); }

    let best = 0, run = 0, prev = null;
    for (const s of [...set].sort()) {
      const dt = new Date(s + 'T12:00:00');
      run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = dt;
    }

    const monday = addDays(today, -((today.getDay() + 6) % 7));
    let week = 0;
    for (let i = 0; i < 7; i++) if (set.has(iso(addDays(monday, i)))) week++;
    return { total: list.length, cur, best, week };
  }

  /* ---------- markup ---------- */
  const style = document.createElement('style');
  style.textContent = `
    #streakBox{margin:6px 0 22px}
    #streakBox .sx{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--edge);border-radius:10px;background:var(--paper);overflow:hidden}
    #streakBox .sx div{padding:12px 14px;border-right:1px solid var(--line);color:var(--slate);font-size:.85rem}
    #streakBox .sx div:last-child{border-right:0}
    #streakBox .sx b{display:block;font:500 1.8rem var(--font-mono);color:var(--ink);line-height:1.15}
    #streakBox .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:14px 0 6px;max-width:460px}
    #streakBox .cal .h{font:400 .72rem var(--font-mono);color:var(--slate);text-align:center}
    #streakBox .cal i{display:grid;place-items:center;aspect-ratio:1;border-radius:6px;background:var(--mist);font:500 .72rem var(--font-mono);font-style:normal;color:var(--slate)}
    #streakBox .cal i.on{background:var(--teal);color:var(--on-teal)}
    #streakBox .cal i.today{outline:2px solid var(--amber);outline-offset:1px}
    #streakBox .cal i.future{opacity:.35}
    #streakBox .cap{font-size:.85rem;color:var(--slate);margin:0 0 4px}
    #backupBox{border-top:1px solid var(--line);margin-top:20px;padding-top:16px}
    #backupBox h3{margin:0 0 .3em}
    #backupBox .row{margin:.6em 0 0}
    #backupMsg{min-height:1.4em;font-weight:600}
    @media (max-width:560px){#streakBox .sx{grid-template-columns:repeat(2,1fr)}#streakBox .sx div:nth-child(2){border-right:0}#streakBox .sx div:nth-child(-n+2){border-bottom:1px solid var(--line)}}`;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'streakBox';
  host.querySelector('h2')?.after(box);

  function drawStreaks() {
    const list = dates(), s = stats(list), counts = {};
    list.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });

    const today = new Date(); today.setHours(12, 0, 0, 0);
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    const start = addDays(monday, -28);
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i), k = iso(d), n = counts[k] || 0;
      const cls = [n ? 'on' : '', k === iso(today) ? 'today' : '', d > today ? 'future' : ''].filter(Boolean).join(' ');
      const label = `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${n ? n + ' workout' + (n > 1 ? 's' : '') : 'no workout'}`;
      cells += `<i class="${cls}" title="${label}" aria-label="${label}">${n > 1 ? n : d.getDate()}</i>`;
    }
    box.innerHTML = `
      <div class="sx">
        <div><b>${s.total}</b>workouts done</div>
        <div><b>${s.cur}</b>day streak</div>
        <div><b>${s.best}</b>best streak</div>
        <div><b>${s.week}</b>days this week</div>
      </div>
      <p class="cap" style="margin-top:14px">Last five weeks, Monday first. Filled days have a workout.</p>
      <div class="cal" role="group" aria-label="Workout calendar for the last five weeks">
        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span class="h">${d}</span>`).join('')}${cells}
      </div>`;
  }

  /* ---------- backup and restore ---------- */
  const KEEP = ['pf:profile', 'pf:sessions', 'pf:banned', 'pf:prefs', 'pf:planCreated', 'pf:theme'];
  const backup = document.createElement('div');
  backup.id = 'backupBox';
  backup.innerHTML = `
    <h3>Back up your data</h3>
    <p class="note" style="margin:0">Your plan and workout history are stored only in this browser. Download a backup before you clear site data or change phones.</p>
    <div class="row">
      <button type="button" class="btn alt" id="bkSave" style="padding:.4em 1em">Download backup</button>
      <button type="button" class="btn alt" id="bkLoad" style="padding:.4em 1em">Restore from file</button>
      <input type="file" id="bkFile" accept="application/json,.json" hidden>
    </div>
    <p id="backupMsg" role="status"></p>`;
  host.appendChild(backup);
  const msg = (t) => { backup.querySelector('#backupMsg').textContent = t; };

  backup.querySelector('#bkSave').onclick = () => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP.includes(k)) items[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: 'PosturePilot', version: 1, exported: new Date().toISOString(), items }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `posturepilot-backup-${iso(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg('Backup downloaded.');
  };

  backup.querySelector('#bkLoad').onclick = () => backup.querySelector('#bkFile').click();
  backup.querySelector('#bkFile').onchange = (ev) => {
    const file = ev.target.files[0]; ev.target.value = '';
    if (!file) return;
    if (file.size > 1e6) { msg('That file is too large to be a PosturePilot backup.'); return; }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!d || d.app !== 'PosturePilot' || typeof d.items !== 'object') throw new Error('not a backup');
        const keys = Object.keys(d.items).filter((k) => KEEP.includes(k));
        if (!keys.length) throw new Error('empty');
        for (const k of keys) {
          const v = d.items[k];
          if (typeof v !== 'string') throw new Error('bad value');
          if (k === 'pf:theme') { if (!['light', 'dark'].includes(v)) throw new Error('bad theme'); } else JSON.parse(v);
        }
        if (!confirm(`Restore ${keys.length} saved item${keys.length > 1 ? 's' : ''} from this backup? It replaces the plan and history on this device.`)) return;
        keys.forEach((k) => localStorage.setItem(k, d.items[k]));
        msg('Restored. Reloading...');
        location.reload();
      } catch { msg('That file is not a valid PosturePilot backup.'); }
    };
    fr.onerror = () => msg('Could not read that file.');
    fr.readAsText(file);
  };

  drawStreaks();
  const counter = document.getElementById('sDone');          // plan.js rewrites this after every saved workout
  if (counter) new MutationObserver(drawStreaks).observe(counter, { childList: true, characterData: true, subtree: true });
})();