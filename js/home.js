(() => {
  const $ = (id) => document.getElementById(id);
  const ex = (id) => EXERCISES.find((e) => e.id === id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero: slouch <-> upright ---------- */
  const wall = ex('wall-stand');
  const A = Figure.full(wall.a), B = Figure.full({ ...wall.a, ...wall.b });
  const meta = { prop: 'wall', wallX: wall.wallX };
  const svg = $('hero'), cap = $('heroCap'), slider = $('posture');
  svg.setAttribute('viewBox', '0 0 300 230');

  const words = [
    [34, 'Slouched: the head and shoulders drift forward of the hips.'],
    [67, 'Getting closer: lift the chest and draw the head back.'],
    [101, 'Stacked: ears over shoulders over hips.']
  ];
  function render(v) {
    svg.innerHTML = Figure.draw(Figure.lerp(A, B, v / 100), meta);
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

  /* ---------- live stats from the real data ---------- */
  $('nEx').textContent = EXERCISES.length;
  $('nCon').textContent = CONCERNS.filter((c) => c.id !== 'general').length;
  $('nInj').textContent = INJURIES.length;

  /* ---------- problem cards ---------- */
  const blurb = {
    'forward-head': 'Head sits ahead of the shoulders, often from phones and screens.',
    'rounded-shoulders': 'Shoulders curve forward and the chest feels tight.',
    'uneven-shoulders': 'One shoulder sits higher or further forward than the other.',
    'upper-back': 'Stiffness across the upper back and the back of the neck.',
    'lower-back': 'Aching or stiffness in the lower back, especially after sitting.',
    'knee': 'Knee discomfort that needs gentle strengthening.',
    'general': 'Not sure? Start with a balanced posture routine.'
  };
  $('concernCards').innerHTML = CONCERNS.map((c) =>
    `<a class="card" href="intake.html?c=${c.id}"><h3>${c.label}</h3><p>${blurb[c.id] || ''}</p></a>`).join('');

  /* ---------- explorer ---------- */
  const state = { c: 'all', inj: new Set() };
  const LEVEL = ['', 'Gentle', 'Moderate', 'Harder'];

  $('concernTabs').innerHTML =
    [{ id: 'all', label: 'All' }, ...CONCERNS].map((c) =>
      `<button type="button" class="chip" data-c="${c.id}" aria-pressed="${c.id === 'all'}">${c.label}</button>`).join('');
  $('injuryChips').innerHTML =
    INJURIES.map((i) => `<button type="button" class="chip injury" data-i="${i.id}" aria-pressed="false">${i.label}</button>`).join('');

  function renderExplorer() {
    const active = INJURIES.filter((i) => state.inj.has(i.id));
    const list = EXERCISES.filter((e) => state.c === 'all' || e.concerns.includes(state.c));
    let ok = 0;
    $('xgrid').innerHTML = list.map((e) => {
      const hit = active.filter((i) => i.blocks.some((b) => e.loads.includes(b)));
      const skip = hit.length > 0;
      if (!skip) ok++;
      const tag = skip ? `Skipped: you marked ${hit.map((i) => i.label.toLowerCase()).join(', ')}` : LEVEL[e.level];
      return `<button type="button" class="xc ${skip ? 'skip' : ''}" data-id="${e.id}" ${skip ? 'aria-disabled="true"' : ''}>
        <h4>${e.name}</h4><p>${e.why}</p><span class="tag">${tag}</span></button>`;
    }).join('');

    $('count').textContent = ok === 0
      ? 'Nothing safe here with those injuries. PosturePilot would suggest seeing a doctor or physiotherapist.'
      : `${ok} of ${list.length} exercises available`;

    const q = new URLSearchParams();
    if (state.c !== 'all') q.set('c', state.c);
    if (state.inj.size) q.set('i', [...state.inj].join(','));
    $('xCta').href = 'intake.html' + (q.toString() ? '?' + q : '');
  }

  $('concernTabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    state.c = b.dataset.c;
    $('concernTabs').querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderExplorer();
  });
  $('injuryChips').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-i]'); if (!b) return;
    const id = b.dataset.i;
    state.inj.has(id) ? state.inj.delete(id) : state.inj.add(id);
    b.setAttribute('aria-pressed', state.inj.has(id));
    renderExplorer();
  });

  /* ---------- exercise dialog ---------- */
  const dlg = $('exDlg');
  let stopDemo = null;
  $('xgrid').addEventListener('click', (ev) => {
    const b = ev.target.closest('.xc'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const e = ex(b.dataset.id);
    $('dTitle').textContent = e.name;
    $('dWhy').textContent = e.why;
    $('dMeta').textContent = `${LEVEL[e.level]} · ${e.sets} sets of ${e.reps}${e.hold ? ' holds of ' + e.hold + 's' : ' reps'}`;
    $('dSteps').innerHTML = e.steps.map((s) => `<li>${s}</li>`).join('');
    $('dCues').innerHTML = e.cues.map((c) => `<li>${c}</li>`).join('');
    dlg.showModal();
    stopDemo?.(); stopDemo = Figure.play($('dSvg'), e);
  });
  $('dClose').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { stopDemo?.(); stopDemo = null; });
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });

  renderExplorer();

  /* ---------- scroll progress + floating button ---------- */
  const bar = $('scroll'), sticky = $('stickyCta');
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
      ticking = false;
    });
  }, { passive: true });
  new IntersectionObserver(([en]) => sticky.classList.toggle('show', !en.isIntersecting)).observe(document.querySelector('.hero2'));
})();