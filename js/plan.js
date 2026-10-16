(() => {
  const $ = (id) => document.getElementById(id);
  const profile = Store.get('profile');
  if (!profile) { $('empty').hidden = false; return; }

  const byId = (id) => EXERCISES.find((e) => e.id === id);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- history (old saves stored plain date strings) ---------- */
  const load = () => ({
    sessions: (Store.get('sessions', []) || []).map((s) => (typeof s === 'string' ? { date: s } : s)),
    banned: Store.get('banned', []) || []
  });

  let plan;

  /* ---------- render plan + progress ---------- */
  function render() {
    const h = load();
    plan = Planner.build(profile, h);
    $('plan').hidden = false;
    $('sMin').textContent = plan.minutes;
    $('sCount').textContent = plan.items.length;
    $('sDone').textContent = h.sessions.length;
    $('sLoad').textContent = Math.round(plan.factor * 100) + '%';

    $('notes').innerHTML = '';
    plan.notes.forEach((n) => {
      const d = document.createElement('div'); d.className = 'warn'; d.textContent = n; $('notes').appendChild(d);
    });

    const dose = (i) => i.hold ? `${i.sets} x ${i.reps} holds of ${i.hold}s` : `${i.sets} x ${i.reps} reps`;
    if (!plan.items.length) {
      $('list').innerHTML = '<p>We could not find safe exercises for your answers. Please see a doctor or physiotherapist.</p>';
      $('start').hidden = true;
    } else {
      $('start').hidden = false;
      $('list').innerHTML = plan.items.map((i) => {
        const e = byId(i.id);
        return `<div class="ex"><div><h3>${e.name}</h3><p style="margin:0">${e.why}</p>
          <p class="why">Why this exercise: ${cap(i.why.join('; '))}.</p></div>
          <div class="dose">${dose(i)}</div></div>`;
      }).join('');
    }
    renderProgress(h);
  }

  function chart(vals) {
    if (!vals.length) return '<p class="note">Rate your pain after a session and your trend will appear here.</p>';
    const W = 300, H = 90, pad = 12;
    const step = vals.length > 1 ? (W - 2 * pad) / (vals.length - 1) : 0;
    const x = (i) => (vals.length > 1 ? pad + i * step : W / 2);
    const y = (v) => H - pad - (v / 10) * (H - 2 * pad);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain after your last ${vals.length} sessions: ${vals.join(', ')} out of 10">
      <line class="gl" x1="${pad}" x2="${W - pad}" y1="${y(7).toFixed(1)}" y2="${y(7).toFixed(1)}"/>
      <polyline class="ln" points="${pts}"/>
      ${vals.map((v, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4"/>`).join('')}
    </svg><p class="note" style="margin:4px 0 0">Pain after each of your last ${vals.length} rated sessions. The dashed line marks 7/10.</p>`;
  }

  function renderProgress(h) {
    const pains = h.sessions.map((s) => s.pain).filter((p) => typeof p === 'number').slice(-10);
    const recent = pains.slice(-5);
    $('pStats').textContent = recent.length
      ? `Average pain over your last ${recent.length} rated session${recent.length > 1 ? 's' : ''}: ${(recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1)} out of 10.`
      : 'No rated sessions yet.';
    $('pChart').innerHTML = chart(pains);
    $('pBanned').innerHTML = h.banned.length
      ? `<h3 style="margin-top:18px">Paused exercises</h3>` + h.banned.map((id) =>
          `<div class="row" style="margin-bottom:8px"><span>${byId(id)?.name || id}</span>
           <button type="button" class="btn alt" data-restore="${id}" style="padding:.3em .9em">Restore</button></div>`).join('')
      : '';
  }

  $('pBanned').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-restore]'); if (!b) return;
    Store.set('banned', (Store.get('banned', []) || []).filter((id) => id !== b.dataset.restore));
    render();
  });

  /* ---------- session player ---------- */
  const dlg = $('player');
  let idx = 0, set = 1, rep = 0, timer = null, stopAnim = null;
  const clearTimer = () => { clearInterval(timer); timer = null; };

  function loadExercise(i) {
    clearTimer();
    idx = Math.max(0, Math.min(plan.items.length - 1, i));
    set = 1; rep = 0;
    const item = plan.items[idx], e = byId(item.id);
    $('plCount').textContent = `Exercise ${idx + 1} of ${plan.items.length}`;
    $('plTitle').textContent = e.name;
    $('plSteps').innerHTML = e.steps.map((s) => `<li>${s}</li>`).join('');
    $('plCues').innerHTML = e.cues.map((c) => `<li>${c}</li>`).join('');
    $('plPrev').disabled = idx === 0;
    $('plNext').textContent = idx === plan.items.length - 1 ? 'Finish session' : 'Next exercise';
    stopAnim?.(); stopAnim = Figure.play($('plSvg'), e);
    refresh();
  }

  function refresh() {
    const item = plan.items[idx];
    const done = set > item.sets;
    $('plProgress').textContent = done ? 'Exercise complete' : `Set ${set} of ${item.sets}, rep ${rep} of ${item.reps}`;
    $('plAct').hidden = done;
    $('plAct').textContent = item.hold ? `Start ${item.hold}s hold` : 'Rep done';
    $('plAct').disabled = !!timer;
  }

  function addRep() {
    const item = plan.items[idx];
    rep++;
    if (rep >= item.reps) { rep = 0; set++; }
    refresh();
  }

  $('plAct').onclick = () => {
    const item = plan.items[idx];
    if (!item.hold) { addRep(); return; }
    let left = item.hold;
    $('plAct').disabled = true;
    $('plAct').textContent = `Hold ${left}s`;
    timer = setInterval(() => {
      left--;
      if (left > 0) { $('plAct').textContent = `Hold ${left}s`; return; }
      clearTimer(); addRep();
    }, 1000);
  };

  $('plPrev').onclick = () => loadExercise(idx - 1);
  $('plNext').onclick = () => {
    if (idx < plan.items.length - 1) { loadExercise(idx + 1); return; }
    dlg.close();
    openCheckin();
  };
  $('start').onclick = () => { dlg.showModal(); loadExercise(0); };
  $('plClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { clearTimer(); stopAnim?.(); });

  /* ---------- check-in after a session ---------- */
  const ci = $('checkin');
  const painText = (p) => (p === 0 ? 'No pain' : p <= 3 ? 'Mild' : p <= 6 ? 'Moderate' : 'Strong');
  function showPain() {
    const p = +$('ciPain').value;
    $('ciVal').textContent = `${p} / 10: ${painText(p)}`;
    $('ciAdvice').textContent = p >= 7
      ? 'Strong pain: stop for today and consider seeing a doctor or physiotherapist.'
      : p >= 4 ? 'Moderate pain: tomorrow\'s plan will be lighter.' : '';
  }
  $('ciPain').addEventListener('input', showPain);

  function openCheckin() {
    $('ciPain').value = 3; showPain();
    $('ciList').innerHTML = plan.items.map((i) =>
      `<label class="opt"><input type="checkbox" value="${i.id}"><span>${byId(i.id).name}</span></label>`).join('');
    ci.showModal();
  }

  function saveSession(entry, hurt) {
    const h = load();
    h.sessions.push(entry);
    Store.set('sessions', h.sessions);
    if (hurt && hurt.length) Store.set('banned', [...new Set([...h.banned, ...hurt])]);
    ci.close();
    render();
  }
  const today = () => new Date().toISOString().slice(0, 10);
  $('ciSave').onclick = () => {
    const hurt = [...$('ciList').querySelectorAll('input:checked')].map((x) => x.value);
    saveSession({ date: today(), pain: +$('ciPain').value, hurt }, hurt);
  };
  $('ciSkip').onclick = () => saveSession({ date: today() }, []);

  render();
})();