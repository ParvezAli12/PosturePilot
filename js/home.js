(() => {
  const ex = (id) => EXERCISES.find((e) => e.id === id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hero: slouch <-> upright slider ---- */
  const wall = ex('wall-stand');
  const A = Figure.full(wall.a), B = Figure.full({ ...wall.a, ...wall.b });
  const meta = { prop: 'wall', wallX: wall.wallX };
  const svg = document.getElementById('hero');
  const cap = document.getElementById('heroCap');
  const slider = document.getElementById('posture');
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
  slider.addEventListener('input', () => { stopAuto(); render(+slider.value); });

  let raf = 0;
  const stopAuto = () => cancelAnimationFrame(raf);
  render(0);
  if (!reduce) {
    const t0 = performance.now() + 700, dur = 2600;
    const step = (now) => {
      const x = Math.min(1, Math.max(0, (now - t0) / dur));
      const v = Math.round((x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2) * 100);
      slider.value = v; render(v);
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---- problem cards ---- */
  const blurb = {
    'forward-head': 'Head sits ahead of the shoulders, often from phones and screens.',
    'rounded-shoulders': 'Shoulders curve forward and the chest feels tight.',
    'uneven-shoulders': 'One shoulder sits higher or further forward than the other.',
    'upper-back': 'Stiffness across the upper back and the back of the neck.',
    'lower-back': 'Aching or stiffness in the lower back, especially after sitting.',
    'knee': 'Knee discomfort that needs gentle strengthening.',
    'general': 'Not sure? Start with a balanced posture routine.'
  };
  document.getElementById('concernCards').innerHTML = CONCERNS.map((c) =>
    `<a class="card" href="intake.html?c=${c.id}"><h3>${c.label}</h3><p>${blurb[c.id] || ''}</p></a>`).join('');

  /* ---- injury chips ---- */
  document.getElementById('chips').innerHTML = INJURIES.map((i) => `<li>${i.label}</li>`).join('');

  /* ---- exercise previews (animate only while visible) ---- */
  const demos = document.getElementById('demos');
  ['chin-tuck', 'wall-angel', 'glute-bridge'].forEach((id) => {
    const e = ex(id);
    const el = document.createElement('div');
    el.className = 'demo';
    el.innerHTML = `<svg></svg><h3>${e.name}</h3><p>${e.why}</p>`;
    demos.appendChild(el);
    const s = el.querySelector('svg');
    let stop = null;
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !stop) stop = Figure.play(s, e);
      else if (!en.isIntersecting && stop) { stop(); stop = null; }
    }).observe(el);
  });
})();