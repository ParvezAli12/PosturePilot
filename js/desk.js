/* The two-minute desk break: a short guided routine, mostly done from a chair. */
(() => {
  const $ = (id) => document.getElementById(id);
  const TARGET = 120, GAP = 3, READY = 5;                       // aim for about two minutes in total

  /* leave out any move that uses a body area marked as injured */
  const profile = Store.get('profile');
  const blocked = new Set();
  ((profile && profile.injuries) || []).forEach((id) => (INJURIES.find((i) => i.id === id) || { blocks: [] }).blocks.forEach((b) => blocked.add(b)));
  const moves = DESK_MOVES.filter((m) => !m.loads.some((l) => blocked.has(l)));
  const skipped = DESK_MOVES.filter((m) => !moves.includes(m));
  const round5 = (v) => Math.round(v / 5) * 5;
  const per = moves.length ? Math.min(45, Math.max(15, round5((TARGET - (moves.length - 1) * GAP) / moves.length))) : 0;
  const total = moves.length * per + Math.max(0, moves.length - 1) * GAP;

  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const breaksToday = () => (Store.get('deskBreaks', []) || []).filter((d) => d === today()).length;
  const prefs = { mute: false, ...(Store.get('prefs', {}) || {}) };

  /* ---------- intro page ---------- */
  $('dkToday').textContent = breaksToday();
  if (moves.length < 3) {
    $('dkTime').textContent = 0; $('dkCount').textContent = moves.length;
    $('dkNote').textContent = 'Too many desk moves use areas you marked as injured. A doctor or physiotherapist can suggest safe ones for you.';
    $('dkStart').hidden = true;
    return;
  }
  $('dkTime').textContent = Math.round(total / 60);
  $('dkCount').textContent = moves.length;
  $('dkList').innerHTML = moves.map((m) =>
    `<li><b>${m.name}</b><span>${per} s${m.sides ? ', half on each leg' : ''}</span></li>`).join('');
  $('dkNote').textContent = !profile
    ? 'This is the general set. Build your plan to adapt it to any injuries you have.'
    : skipped.length ? `Left out because of your injuries: ${skipped.map((m) => m.name.toLowerCase()).join(', ')}.` : '';

  /* ---------- guided run ---------- */
  const wo = $('wo');
  let seq = [], si = 0, endAt = 0, left = 0, paused = false, running = false;
  let tickId = null, stopAnim = null, shownIdx = -1, lastSec = -1, lastSide = '', wake = null, audio = null, startedAt = 0;
  const CIRC = 339.3;

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
  $('woMute').onclick = () => { prefs.mute = !prefs.mute; Store.set('prefs', { ...(Store.get('prefs', {}) || {}), mute: prefs.mute }); setMute(); };

  function buildSeq() {
    const s = [{ type: 'ready', secs: READY, idx: 0 }];
    moves.forEach((m, i) => {
      s.push({ type: 'work', idx: i, secs: per });
      if (i < moves.length - 1) s.push({ type: 'gap', secs: GAP, next: i + 1 });
    });
    return s;
  }

  function cue(m, elapsed, secs) {
    let span = secs, t = elapsed, side = '';
    if (m.sides) { span = secs / 2; if (elapsed >= span) { t = elapsed - span; side = 'Second leg'; } else side = 'First leg'; }
    const k = Math.floor(t / m.tempo), pos = t - k * m.tempo;
    return { big: pos < m.tempo / 2 ? m.phases[0] : m.phases[1], sub: `Repeat ${k + 1}`, side };
  }

  function startRun() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
    seq = buildSeq(); running = true; startedAt = performance.now();
    $('woDone').hidden = true; $('woActive').hidden = false; wo.hidden = false;
    document.body.style.overflow = 'hidden';
    setMute(); lock(); enter(0);
    clearInterval(tickId); tickId = setInterval(tick, 200);
  }
  function stopRun() {
    running = false; clearInterval(tickId); tickId = null;
    stopAnim?.(); stopAnim = null; shownIdx = -1;
    try { wake?.release?.(); } catch {} wake = null;
  }
  function closeAll() { stopRun(); wo.hidden = true; document.body.style.overflow = ''; $('dkToday').textContent = breaksToday(); }

  function enter(i) {
    si = i; paused = false;
    const s = seq[i];
    left = s.secs; endAt = performance.now() + s.secs * 1000; lastSec = -1; lastSide = '';
    wo.dataset.phase = s.type === 'gap' ? 'rest' : s.type;
    $('woPause').textContent = 'Pause';
    const idx = s.type === 'gap' ? s.next : s.idx, m = moves[idx];
    if (shownIdx !== idx) {
      stopAnim?.(); stopAnim = Figure.play($('woSvg'), m); shownIdx = idx;
      $('woSteps').innerHTML = m.steps.map((t) => `<li>${t}</li>`).join('');
      $('woTips').textContent = m.cues.join('  ·  ');
    }
    $('woSide').textContent = '';
    if (s.type === 'ready') {
      $('woPill').textContent = 'Get ready';
      $('woName').textContent = m.name;
      $('woProg').textContent = `${moves.length} moves, about ${Math.round(total / 60)} minutes`;
      $('woCue').textContent = 'Starting soon'; $('woSub2').textContent = 'Sit tall and get comfortable';
      $('woNext').textContent = '';
    } else if (s.type === 'work') {
      $('woPill').textContent = 'Move ' + (idx + 1) + ' of ' + moves.length;
      $('woName').textContent = m.name;
      $('woProg').textContent = `Move ${idx + 1} of ${moves.length}`;
      $('woNext').textContent = idx < moves.length - 1 ? 'Next: ' + moves[idx + 1].name : 'Last move';
      beep(880, 0.18); setTimeout(() => beep(1175, 0.18), 220);
    } else {
      $('woPill').textContent = 'Next';
      $('woName').textContent = m.name;
      $('woProg').textContent = `Move ${idx + 1} of ${moves.length}`;
      $('woCue').textContent = 'Switch'; $('woSub2').textContent = idx === moves.length - 1 ? 'Stand up from your chair' : 'Get into position';
      $('woNext').textContent = '';
      beep(440, 0.2);
    }
    tick();
  }

  function tick() {
    if (!running || paused) return;
    const s = seq[si];
    left = Math.max(0, (endAt - performance.now()) / 1000);
    const sec = Math.ceil(left);
    $('woTime').textContent = sec;
    $('woArc').style.strokeDashoffset = String(CIRC * (1 - left / s.secs));
    if (s.type === 'work') {
      const c = cue(moves[s.idx], s.secs - left, s.secs);
      $('woCue').textContent = c.big; $('woSub2').textContent = c.sub; $('woSide').textContent = c.side;
      if (lastSide && c.side && c.side !== lastSide) {
        beep(1000, 0.15); setTimeout(() => beep(1000, 0.15), 250);
        const f = $('woFlash'); f.firstElementChild.textContent = 'Switch legs'; f.hidden = false; setTimeout(() => { f.hidden = true; }, 2200);
      }
      lastSide = c.side;
    }
    if (sec !== lastSec) { if (sec > 0 && sec <= 3) beep(660, 0.08); lastSec = sec; }
    let done = 0, sum = 0;
    seq.forEach((x, i) => { sum += x.secs; if (i < si) done += x.secs; });
    done += s.secs - left;
    $('woBar').style.width = Math.min(100, (done / sum) * 100) + '%';
    if (left <= 0) next();
  }

  function next() { if (si + 1 < seq.length) enter(si + 1); else finish(); }

  function finish() {
    const secs = Math.round((performance.now() - startedAt) / 1000);
    stopRun(); beep(1175, 0.25);
    const log = Store.get('deskBreaks', []) || [];
    log.push(today()); Store.set('deskBreaks', log);
    $('woActive').hidden = true; $('woDone').hidden = false;
    const n = breaksToday();
    $('woDoneText').textContent = `${moves.length} moves in about ${Math.max(1, Math.round(secs / 60))} minutes. Desk breaks today: ${n}.`;
  }

  $('woPause').onclick = () => {
    if (!running) return;
    paused = !paused;
    if (paused) left = Math.max(0, (endAt - performance.now()) / 1000); else endAt = performance.now() + left * 1000;
    $('woPause').textContent = paused ? 'Resume' : 'Pause';
  };
  $('woSkip').onclick = () => { if (running) next(); };
  $('dkStart').onclick = startRun;
  $('woAgain').onclick = startRun;
  $('woBack').onclick = closeAll;
  wo.querySelectorAll('[data-exit]').forEach((b) => { b.onclick = () => { if (!running || confirm('End this desk break?')) closeAll(); }; });
  document.addEventListener('keydown', (ev) => {
    if (wo.hidden || !running) return;
    if (ev.code === 'Space') { ev.preventDefault(); $('woPause').click(); }
    else if (ev.code === 'ArrowRight') $('woSkip').click();
  });

  if (new URLSearchParams(location.search).get('start') === '1') $('dkStart').focus();
})();