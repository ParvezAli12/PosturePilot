(() => {
  const $ = (id) => document.getElementById(id);
  const ex = (id) => EXERCISES.find((e) => e.id === id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero: slouch -> aligned, measured against a plumb line ---------- */
  const wall = ex('wall-stand');
  const A = Figure.full(wall.a), B = Figure.full({ ...wall.a, ...wall.b });
  const svg = $('hero'), cap = $('heroCap'), slider = $('posture');
  svg.setAttribute('viewBox', '0 0 300 230');

  /* Fallback landmark positions, worked out from the pose angles, so this page
     works with any version of figure.js. */
  const RAD = Math.PI / 180;
  function landmarks(P) {
    const hip = [P.hx, P.hy];
    const sho = [hip[0] + Math.sin(P.p * RAD) * 60, hip[1] - Math.cos(P.p * RAD) * 60 - P.sh];
    const head = [sho[0] + Math.sin((P.p + P.h) * RAD) * 21 + P.hf, sho[1] - Math.cos((P.p + P.h) * RAD) * 21];
    const kn = [hip[0] + Math.sin(P.t * RAD) * 46, hip[1] + Math.cos(P.t * RAD) * 46];
    const ft = [kn[0] + Math.sin(P.s * RAD) * 44, kn[1] + Math.cos(P.s * RAD) * 44];
    return { head, sho, hip, kn, ft };
  }

  const LANDMARKS = [['Ear', 'head'], ['Shoulder', 'sho'], ['Hip', 'hip'], ['Knee', 'kn']];
  const words = [
    [34, 'Slouched: the head and shoulders sit ahead of the line.'],
    [67, 'Getting closer: lift the chest and draw the head back.'],
    [101, 'Aligned: ear, shoulder, hip and knee stack on the line.']
  ];
  const state = (d) => (Math.abs(d) < 5 ? 'on the line' : d > 0 ? 'ahead' : 'behind');

  function render(v) {
    const P = Figure.lerp(A, B, v / 100);
    const g = Figure.grounded ? Figure.grounded(P) : landmarks(P);   // newer figure.js rests the body on the floor
    const px = g.ft[0];                                       // plumb line drops from the ankle
    const under = `<line x1="${px.toFixed(1)}" y1="4" x2="${px.toFixed(1)}" y2="212" stroke-width="1.5" stroke-dasharray="5 4" style="stroke:var(--amber);opacity:.9"/>`;
    let over = '', read = '';
    for (const [name, key] of LANDMARKS) {
      const [x, y] = g[key], d = x - px;
      if (Math.abs(d) > 2) over += `<line x1="${px.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke-width="1.2" style="stroke:var(--amber)"/>`;
      over += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" stroke-width="1.6" style="fill:var(--paper);stroke:var(--amber)"/>`;
      read += `<li class="${Math.abs(d) < 5 ? '' : 'off'}">${name}<b>${state(d)}</b></li>`;
    }
    svg.innerHTML = Figure.draw(P, {}) + under + over;
    $('read').innerHTML = read;
    const text = words.find(([max]) => v < max)[1];
    cap.textContent = text;
    slider.setAttribute('aria-valuetext', text);
  }

  let raf = 0;
  const stopAnim = () => cancelAnimationFrame(raf);
  const ease = (x) => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  function animateTo(target, dur = 900, delay = 0) {
    stopAnim();
    const from = +slider.value;
    if (reduce) { slider.value = target; render(target); return; }
    const t0 = performance.now() + delay;
    const step = (now) => {
      const x = Math.min(1, Math.max(0, (now - t0) / dur));
      const v = Math.round(from + (target - from) * ease(x));
      slider.value = v; render(v);
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  slider.addEventListener('input', () => { stopAnim(); render(+slider.value); });
  $('toSlouch').onclick = () => animateTo(0);
  $('toUpright').onclick = () => animateTo(100);
  render(0);
  animateTo(100, 2600, 700);

  /* ---------- numbers come from the real data ---------- */
  $('nEx').textContent = EXERCISES.length;
  $('nCon').textContent = CONCERNS.filter((c) => c.id !== 'general').length;
  $('nInj').textContent = INJURIES.length;

  /* ---------- short description for each posture problem ---------- */
  const blurb = {
    all: 'Every problem the library covers.',
    'forward-head': 'Head carried ahead of the shoulders, usually from screens.',
    'rounded-shoulders': 'Shoulders curl forward and the chest feels tight.',
    'uneven-shoulders': 'One shoulder sits higher or further forward than the other.',
    'upper-back': 'Stiffness across the upper back and the back of the neck.',
    'lower-back': 'Aching or stiffness low in the back, often after sitting.',
    'knee': 'Knee discomfort that needs gentle strengthening.',
    'general': 'A balanced routine when you are not sure where to start.'
  };

  /* ---------- the filter ---------- */
  const state2 = { c: 'all', inj: new Set() };
  const LEVEL = ['', 'gentle', 'moderate', 'harder'];

  $('concernTabs').innerHTML =
    [{ id: 'all', label: 'All problems' }, ...CONCERNS].map((c) =>
      `<button type="button" class="tab" data-c="${c.id}" aria-pressed="${c.id === 'all'}">${c.label}</button>`).join('');
  $('injuryChips').innerHTML =
    INJURIES.map((i) => `<button type="button" class="chip injury" data-i="${i.id}" aria-pressed="false">${i.label}</button>`).join('');

  function renderFilter() {
    const active = INJURIES.filter((i) => state2.inj.has(i.id));
    const list = EXERCISES.filter((e) => state2.c === 'all' || e.concerns.includes(state2.c));
    let ok = 0;
    $('xgrid').innerHTML = list.map((e) => {
      const hit = active.filter((i) => i.blocks.some((b) => e.loads.includes(b)));
      const skip = hit.length > 0;
      if (!skip) ok++;
      const tag = skip ? `Skipped: loads ${hit.map((i) => i.label.toLowerCase()).join(', ')}` : `Included, ${LEVEL[e.level]}`;
      return `<li><button type="button" class="xr ${skip ? 'skip' : ''}" data-id="${e.id}" ${skip ? 'aria-disabled="true"' : ''}>
        <span class="xn">${e.name}</span><span class="xw">${e.why}</span><span class="xt">${tag}</span></button></li>`;
    }).join('');

    $('count').textContent = ok === 0
      ? 'Nothing safe here with those injuries. PosturePilot would send you to a clinician.'
      : `${ok} of ${list.length} exercises included`;

    const q = new URLSearchParams();
    if (state2.c !== 'all') q.set('c', state2.c);
    if (state2.inj.size) q.set('i', [...state2.inj].join(','));
    $('xCta').href = 'intake.html' + (q.toString() ? '?' + q : '');
  }

  $('concernTabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    state2.c = b.dataset.c;
    $('concernTabs').querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('concernNote').textContent = blurb[state2.c] || '';
    renderFilter();
  });
  $('injuryChips').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]'); if (!b) return;
    const id = b.dataset.i;
    state2.inj.has(id) ? state2.inj.delete(id) : state2.inj.add(id);
    b.setAttribute('aria-pressed', String(state2.inj.has(id)));
    renderFilter();
  });

  /* ---------- exercise dialog ---------- */
  const dlg = $('exDlg');
  let stopDemo = null;
  $('xgrid').addEventListener('click', (ev) => {
    const b = ev.target.closest('.xr'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const e = ex(b.dataset.id);
    $('dTitle').textContent = e.name;
    $('dWhy').textContent = e.why;
    $('dMeta').textContent = `${LEVEL[e.level]} level`;
    $('dSteps').innerHTML = e.steps.map((s) => `<li>${s}</li>`).join('');
    $('dCues').innerHTML = e.cues.map((c) => `<li>${c}</li>`).join('');
    dlg.showModal();
    stopDemo?.(); stopDemo = Figure.play($('dSvg'), e);
  });
  $('dClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { stopDemo?.(); stopDemo = null; });
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  $('concernNote').textContent = blurb.all;
  renderFilter();

  /* ---------- exercise gallery: live demos, animated only while on screen ---------- */
  const GALLERY = ['chin-tuck', 'wall-angel', 'glute-bridge', 'cat-cow', 'scapular-squeeze', 'chair-squat'];
  $('gallery').innerHTML = GALLERY.map((id) => {
    const e = ex(id);
    return `<article class="card-ex" data-id="${id}">
      <div class="grid-stage"><svg aria-hidden="true"></svg></div>
      <div class="meta"><h3>${e.name}</h3><p>${e.why}</p><span class="tag">${LEVEL[e.level]} level</span></div></article>`;
  }).join('');
  document.querySelectorAll('#gallery .card-ex').forEach((card) => {
    const e = ex(card.dataset.id), s = card.querySelector('svg');
    let stop = null;
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !stop) stop = Figure.play(s, e);
      else if (!en.isIntersecting && stop) { stop(); stop = null; }
    }).observe(card);
  });

  /* ---------- floating button on small screens once the hero is gone ---------- */
  const sticky = $('stickyCta');
  new IntersectionObserver(([en]) => sticky.classList.toggle('show', !en.isIntersecting)).observe(document.querySelector('.hero2'));
})();