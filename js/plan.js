(() => {
  const $ = (id) => document.getElementById(id);
  const profile = Store.get('profile');
  if (!profile) { $('empty').hidden = false; return; }

  const byId = (id) => EXERCISES.find((e) => e.id === id);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const nice = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const round5 = (v) => Math.round(v / 5) * 5;
  const dur = (s) => (s % 60 === 0 ? `${s / 60} min` : `${s} s`);
  if (!Store.get('planCreated')) Store.set('planCreated', today());

  /* ---------- saved data ---------- */
  const loadHistory = () => ({
    sessions: (Store.get('sessions', []) || []).map((s) => (typeof s === 'string' ? { date: s } : s)),
    banned: Store.get('banned', []) || []
  });
  const prefs = { work: 60, rest: 30, rounds: 2, mute: false, ...(Store.get('prefs', {}) || {}) };
  const savePrefs = () => Store.set('prefs', prefs);

  let plan;

  /* how long each exercise lasts (plan intensity can shorten or lengthen it a little) */
  const workFor = () => Math.max(20, round5(prefs.work * Math.min(1.3, Math.max(0.5, plan.factor || 1))));
  const totalSecs = () => {
    const n = plan.items.length, blocks = prefs.rounds * n;
    return 5 + blocks * workFor() + Math.max(0, blocks - 1) * prefs.rest;
  };

  /* plain-language description of one exercise's timing */
  function describe(item, e, work) {
    const m = workoutMeta(e.id), sides = m.sides;
    const span = sides ? work / 2 : work;
    const tail = sides ? ', half on each side' : '';
    if (e.hold >= 20) return `<b>${dur(work)}</b>Hold the stretch steadily and keep breathing${tail}`;
    if (item.hold > 0) {
      const r = relaxFor(item.hold), reps = Math.floor(span / (item.hold + r)) * (sides ? 2 : 1);
      return `<b>${dur(work)}</b>Hold ${item.hold} s, relax ${r} s, repeat (about ${reps} reps)${tail}`;
    }
    const reps = Math.floor(span / m.tempo) * (sides ? 2 : 1);
    return `<b>${dur(work)}</b>About ${reps} slow reps, ${m.tempo} s each${tail}`;
  }

  /* ---------- plan page ---------- */
  function render() {
    const h = loadHistory();
    plan = Planner.build(profile, h);
    $('plan').hidden = false;
    $('sMin').textContent = plan.items.length ? Math.round(totalSecs() / 60) : 0;
    $('sCount').textContent = plan.items.length;
    $('sDone').textContent = h.sessions.length;
    $('sLoad').textContent = Math.round((plan.factor || 1) * 100) + '%';

    const last = h.sessions.length ? h.sessions[h.sessions.length - 1].date : null;
    $('saved').textContent = 'Saved plan, created ' + nice(Store.get('planCreated')) + (last ? ', last workout ' + nice(last) : '') + '.';

    $('notes').innerHTML = '';
    plan.notes.forEach((n) => {
      const d = document.createElement('div'); d.className = 'warn'; d.textContent = n; $('notes').appendChild(d);
    });

    if (!plan.items.length) {
      $('list').innerHTML = '<p>We could not find safe exercises for your answers. Please see a doctor or physiotherapist.</p>';
      $('start').hidden = true;
    } else {
      $('start').hidden = false;
      const w = workFor();
      $('list').innerHTML = plan.items.map((i) => {
        const e = byId(i.id);
        return `<div class="ex"><div><h3>${e.name}</h3><p style="margin:0">${e.why}</p>
          <p class="why">Why this exercise: ${cap(i.why.join('; '))}.</p></div>
          <div class="dose">${describe(i, e, w)}</div></div>`;
      }).join('');
    }
    renderProgress(h);
  }

  function chart(vals) {
    if (!vals.length) return '<p class="note">Rate your pain after a workout and your trend will appear here.</p>';
    const W = 300, H = 90, pad = 12;
    const step = vals.length > 1 ? (W - 2 * pad) / (vals.length - 1) : 0;
    const x = (i) => (vals.length > 1 ? pad + i * step : W / 2);
    const y = (v) => H - pad - (v / 10) * (H - 2 * pad);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain after your last ${vals.length} workouts: ${vals.join(', ')} out of 10">
      <line class="gl" x1="${pad}" x2="${W - pad}" y1="${y(7).toFixed(1)}" y2="${y(7).toFixed(1)}"/>
      <polyline class="ln" points="${pts}"/>
      ${vals.map((v, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4"/>`).join('')}
    </svg><p class="note" style="margin:4px 0 0">Pain after each of your last ${vals.length} rated workouts. The dashed line marks 7/10.</p>`;
  }

  function renderProgress(h) {
    const pains = h.sessions.map((s) => s.pain).filter((p) => typeof p === 'number').slice(-10);
    const recent = pains.slice(-5);
    $('pStats').textContent = recent.length
      ? `Average pain over your last ${recent.length} rated workout${recent.length > 1 ? 's' : ''}: ${(recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1)} out of 10.`
      : 'No rated workouts yet.';
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

  $('wipe').onclick = () => {
    if (!confirm('Delete your saved plan? Your workout history stays, but you will need to answer the questions again.')) return;
    ['profile', 'planCreated', 'banned'].forEach((k) => Store.del(k));
    location.href = 'index.html';
  };

  /* ====================================================================
     GUIDED WORKOUT
     ready (5 s) -> [exercise, rest] x exercises -> next round -> ... -> done
     ==================================================================== */
  const wo = $('wo');
  let seq = [], si = 0, endAt = 0, left = 0, paused = false, running = false;
  let tickId = null, stopAnim = null, lastSec = -1, lastSide = '', wake = null, audio = null, startedAt = 0, shownEx = -1;

  const WORK_OPTS = [30, 45, 60, 75, 90], REST_OPTS = [15, 30, 45, 60], ROUND_OPTS = [1, 2, 3];

  function seg(host, opts, key, fmt) {
    host.innerHTML = opts.map((v) =>
      `<button type="button" class="chip" data-v="${v}" aria-pressed="${prefs[key] === v}">${fmt(v)}</button>`).join('');
  }
  function wire(host, opts, key, fmt) {
    host.onclick = (ev) => {
      const b = ev.target.closest('[data-v]'); if (!b) return;
      prefs[key] = +b.dataset.v; savePrefs(); seg(host, opts, key, fmt); refreshSetup();
    };
  }
  wire($('segWork'), WORK_OPTS, 'work', (v) => `${v} s`);
  wire($('segRest'), REST_OPTS, 'rest', (v) => `${v} s`);
  wire($('segRounds'), ROUND_OPTS, 'rounds', (v) => `${v}`);

  function refreshSetup() {
    const w = workFor();
    seg($('segWork'), WORK_OPTS, 'work', (v) => `${v} s`);
    seg($('segRest'), REST_OPTS, 'rest', (v) => `${v} s`);
    seg($('segRounds'), ROUND_OPTS, 'rounds', (v) => `${v}`);
    $('woSummary').textContent =
      `${plan.items.length} exercises, ${prefs.rounds} round${prefs.rounds > 1 ? 's' : ''}, about ${Math.round(totalSecs() / 60)} minutes in total.`;
    $('woAdjust').textContent = w !== prefs.work
      ? `Each exercise is ${w} s instead of ${prefs.work} s because your plan intensity is ${Math.round((plan.factor || 1) * 100)}% today.` : '';
    $('woList').innerHTML = plan.items.map((i) => {
      const e = byId(i.id);
      return `<li><b>${e.name}</b><span>${describe(i, e, w).replace(/<\/?b>/g, '')}</span></li>`;
    }).join('');
  }

  function openWorkout() {
    if (!plan.items.length) return;
    refreshSetup();
    $('woSetup').hidden = false; $('woActive').hidden = true; $('woDone').hidden = true;
    wo.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeWorkout() {
    stopRun();
    wo.hidden = true;
    document.body.style.overflow = '';
  }

  /* ---- sound + screen wake lock ---- */
  function beep(freq, len = 0.12) {
    if (prefs.mute || !audio) return;
    try {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.12;
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + len);
    } catch {}
  }
  async function lock() { try { wake = await navigator.wakeLock?.request('screen'); } catch {} }
  document.addEventListener('visibilitychange', () => { if (running && document.visibilityState === 'visible') lock(); });
  const setMute = () => { $('woMute').textContent = prefs.mute ? 'Sound off' : 'Sound on'; $('woMute').setAttribute('aria-pressed', String(prefs.mute)); };
  $('woMute').onclick = () => { prefs.mute = !prefs.mute; savePrefs(); setMute(); };

  /* ---- what to do right now, second by second ---- */
  function cue(item, e, elapsed, work) {
    const m = workoutMeta(e.id);
    let span = work, t = elapsed, side = '';
    if (m.sides) { span = work / 2; if (elapsed >= span) { t = elapsed - span; side = 'Second side'; } else side = 'First side'; }
    if (e.hold >= 20) return { big: 'Hold', sub: `Breathe slowly, ${Math.max(0, Math.ceil(span - t))} s left${m.sides ? ' on this side' : ''}`, side };
    if (item.hold > 0) {
      const r = relaxFor(item.hold), cyc = item.hold + r, k = Math.floor(t / cyc), pos = t - k * cyc;
      return pos < item.hold
        ? { big: 'Hold', sub: `Rep ${k + 1}, keep still for ${Math.ceil(item.hold - pos)} s`, side }
        : { big: 'Relax', sub: `Rep ${k + 1} done, next one in ${Math.ceil(cyc - pos)} s`, side };
    }
    const k = Math.floor(t / m.tempo), pos = t - k * m.tempo;
    return { big: pos < m.tempo / 2 ? m.phases[0] : m.phases[1], sub: `Rep ${k + 1}`, side };
  }

  function buildSeq() {
    const n = plan.items.length, R = prefs.rounds, s = [];
    s.push({ type: 'ready', secs: 5, ex: 0, round: 1 });
    for (let r = 1; r <= R; r++) {
      for (let i = 0; i < n; i++) {
        s.push({ type: 'work', ex: i, round: r, secs: workFor() });
        const lastOne = r === R && i === n - 1;
        if (!lastOne) s.push({ type: 'rest', secs: prefs.rest, round: r, ex: i, next: i + 1 < n ? i + 1 : 0, nextRound: i + 1 < n ? r : r + 1 });
      }
    }
    return s;
  }

  function startRun() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
    seq = buildSeq(); running = true; startedAt = performance.now();
    $('woSetup').hidden = true; $('woDone').hidden = true; $('woActive').hidden = false;
    setMute(); lock(); enter(0);
    clearInterval(tickId); tickId = setInterval(tick, 200);
  }
  function stopRun() {
    running = false; clearInterval(tickId); tickId = null;
    stopAnim?.(); stopAnim = null; shownEx = -1;
    try { wake?.release?.(); } catch {} wake = null;
  }

  function enter(i) {
    si = i; paused = false;
    const s = seq[i], n = plan.items.length, R = prefs.rounds;
    left = s.secs; endAt = performance.now() + s.secs * 1000; lastSec = -1; lastSide = '';
    wo.dataset.phase = s.type;
    $('woPause').textContent = 'Pause';
    $('woPlus').hidden = s.type !== 'rest';

    const showIdx = s.type === 'rest' ? s.next : s.ex;
    const item = plan.items[showIdx], e = byId(item.id);
    if (shownEx !== showIdx) {
      stopAnim?.(); stopAnim = Figure.play($('woSvg'), e); shownEx = showIdx;
      $('woSteps').innerHTML = e.steps.map((t) => `<li>${t}</li>`).join('');
      $('woTips').textContent = e.cues.join('  ·  ');
    }

    if (s.type === 'ready') {
      $('woPill').textContent = 'Get ready';
      $('woName').textContent = e.name;
      $('woProg').textContent = `Round 1 of ${R}`;
      $('woCue').textContent = 'Starting soon'; $('woSub2').textContent = 'Get into position'; $('woSide').textContent = '';
    } else if (s.type === 'work') {
      $('woPill').textContent = 'Exercise';
      $('woName').textContent = e.name;
      $('woProg').textContent = `Round ${s.round} of ${R}, exercise ${s.ex + 1} of ${n}`;
      beep(880, 0.18); setTimeout(() => beep(1175, 0.18), 220);
    } else {
      const nr = s.nextRound > R ? R : s.nextRound;
      $('woPill').textContent = 'Rest';
      $('woName').textContent = 'Next: ' + e.name;
      $('woProg').textContent = s.next === 0 ? `Round ${s.round} complete, round ${nr} next` : `Round ${s.round} of ${R}, rest`;
      $('woCue').textContent = 'Rest'; $('woSub2').textContent = 'Shake it out and get into position'; $('woSide').textContent = '';
      beep(440, 0.25);
    }
    tick();
  }

  const CIRC = 339.3;
  function tick() {
    if (!running || paused) return;
    const s = seq[si], now = performance.now();
    left = Math.max(0, (endAt - now) / 1000);
    const sec = Math.ceil(left);
    $('woTime').textContent = sec;
    $('woArc').style.strokeDashoffset = String(CIRC * (1 - left / s.secs));

    if (s.type === 'work') {
      const item = plan.items[s.ex], e = byId(item.id);
      const c = cue(item, e, s.secs - left, s.secs);
      $('woCue').textContent = c.big; $('woSub2').textContent = c.sub; $('woSide').textContent = c.side;
      if (lastSide && c.side && c.side !== lastSide) {
        beep(1000, 0.15); setTimeout(() => beep(1000, 0.15), 250);
        const f = $('woFlash'); f.firstElementChild.textContent = 'Switch sides'; f.hidden = false; setTimeout(() => { f.hidden = true; }, 2200);
      }
      lastSide = c.side;
    }
    if (sec !== lastSec) { if (sec > 0 && sec <= 3) beep(660, 0.08); lastSec = sec; }

    let done = 0, total = 0;
    seq.forEach((x, i) => { total += x.secs; if (i < si) done += x.secs; });
    done += s.secs - left;
    $('woBar').style.width = Math.min(100, (done / total) * 100) + '%';

    if (left <= 0) next();
  }

  function next() { if (si + 1 < seq.length) enter(si + 1); else finish(); }

  function finish() {
    const secs = Math.round((performance.now() - startedAt) / 1000);
    stopRun();
    beep(1175, 0.2);
    $('woActive').hidden = true; $('woDone').hidden = false;
    $('woDoneText').textContent =
      `${plan.items.length} exercises x ${prefs.rounds} round${prefs.rounds > 1 ? 's' : ''} in about ${Math.max(1, Math.round(secs / 60))} minutes.`;
  }

  $('woPause').onclick = () => {
    if (!running) return;
    paused = !paused;
    if (paused) { left = Math.max(0, (endAt - performance.now()) / 1000); }
    else { endAt = performance.now() + left * 1000; }
    $('woPause').textContent = paused ? 'Resume' : 'Pause';
  };
  $('woSkip').onclick = () => { if (running) next(); };
  $('woPlus').onclick = () => { if (running && seq[si].type === 'rest') { seq[si].secs += 15; if (paused) left += 15; else endAt += 15000; } };
  $('woStart').onclick = startRun;
  $('woFinish').onclick = () => { closeWorkout(); openCheckin(); };
  wo.querySelectorAll('[data-exit]').forEach((b) => {
    b.onclick = () => {
      if (!running || confirm('End this workout? It will not be saved.')) closeWorkout();
    };
  });
  document.addEventListener('keydown', (ev) => {
    if (wo.hidden || !running) return;
    if (ev.code === 'Space') { ev.preventDefault(); $('woPause').click(); }
    else if (ev.code === 'ArrowRight') $('woSkip').click();
  });

  $('start').onclick = openWorkout;

  /* ---------- check-in after a workout ---------- */
  const ci = $('checkin');
  const painText = (p) => (p === 0 ? 'No pain' : p <= 3 ? 'Mild' : p <= 6 ? 'Moderate' : 'Strong');
  function showPain() {
    const p = +$('ciPain').value;
    $('ciVal').textContent = `${p} / 10: ${painText(p)}`;
    $('ciAdvice').textContent = p >= 7
      ? 'Strong pain: stop for today and consider seeing a doctor or physiotherapist.'
      : p >= 4 ? "Moderate pain: tomorrow's plan will be lighter." : '';
  }
  $('ciPain').addEventListener('input', showPain);

  function openCheckin() {
    $('ciPain').value = 3; showPain();
    $('ciList').innerHTML = plan.items.map((i) =>
      `<label class="opt"><input type="checkbox" value="${i.id}"><span>${byId(i.id).name}</span></label>`).join('');
    ci.showModal();
  }
  function saveSession(entry, hurt) {
    const h = loadHistory();
    h.sessions.push(entry);
    Store.set('sessions', h.sessions);
    if (hurt && hurt.length) Store.set('banned', [...new Set([...h.banned, ...hurt])]);
    ci.close();
    render();
  }
  $('ciSave').onclick = () => {
    const hurt = [...$('ciList').querySelectorAll('input:checked')].map((x) => x.value);
    saveSession({ date: today(), pain: +$('ciPain').value, hurt }, hurt);
  };
  $('ciSkip').onclick = () => saveSession({ date: today() }, []);

  render();

  /* opened from the landing page "Start workout" button */
  if (new URLSearchParams(location.search).get('start') === '1') {
    history.replaceState(null, '', 'plan.html');
    openWorkout();
  }
})();