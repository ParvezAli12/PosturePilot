(() => {
  const $ = (id) => document.getElementById(id);
  const profile = Store.get('profile');
  if (!profile) { $('empty').hidden = false; return; }

  const plan = Planner.build(profile);
  const byId = (id) => EXERCISES.find((e) => e.id === id);
  const sessions = () => (Store.get('sessions', []) || []).length;

  $('plan').hidden = false;
  $('sMin').textContent = plan.minutes;
  $('sCount').textContent = plan.items.length;
  $('sDone').textContent = sessions();

  plan.notes.forEach((n) => {
    const d = document.createElement('div'); d.className = 'warn'; d.textContent = n; $('notes').appendChild(d);
  });

  if (!plan.items.length) {
    $('list').innerHTML = '<p>We could not find safe exercises for your answers. Please see a doctor or physiotherapist.</p>';
    $('start').hidden = true;
    return;
  }

  const dose = (i) => i.hold ? `${i.sets} x ${i.reps} holds of ${i.hold}s` : `${i.sets} x ${i.reps} reps`;
  $('list').innerHTML = plan.items.map((i) => {
    const e = byId(i.id);
    return `<div class="ex"><div><h3>${e.name}</h3><p style="margin:0">${e.why}</p></div><div class="dose">${dose(i)}</div></div>`;
  }).join('');

  /* ---------- session player ---------- */
  const dlg = $('player');
  let idx = 0, set = 1, rep = 0, timer = null, stopAnim = null;

  const clearTimer = () => { clearInterval(timer); timer = null; };

  function load(i) {
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

  $('plPrev').onclick = () => load(idx - 1);
  $('plNext').onclick = () => {
    if (idx < plan.items.length - 1) { load(idx + 1); return; }
    const log = Store.get('sessions', []) || [];
    log.push(new Date().toISOString().slice(0, 10));
    Store.set('sessions', log);
    $('sDone').textContent = log.length;
    dlg.close();
  };
  $('start').onclick = () => { dlg.showModal(); load(0); };
  $('plClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { clearTimer(); stopAnim?.(); });
})();