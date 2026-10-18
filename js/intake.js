(() => {
  const $ = (id) => document.getElementById(id);
  const steps = [...document.querySelectorAll('[data-step]')];
  let step = 0;

  const box = (host, name, id, label) => {
    const l = document.createElement('label');
    l.className = 'opt';
    l.innerHTML = `<input type="checkbox" name="${name}" value="${id}"><span>${label}</span>`;
    host.appendChild(l);
  };
  CONCERNS.forEach((c) => box($('concerns'), 'concern', c.id, c.label));
  INJURIES.forEach((i) => box($('injuries'), 'injury', i.id, i.label));
  RED_FLAGS.forEach((f, i) => box($('flags'), 'flag', i, f));

  
  /* coming back to change answers: start from what was saved */
  const saved = Store.get('profile');
  if (saved && !location.search) {
    ['age', 'weight', 'height'].forEach((k) => { if (saved[k]) $(k).value = saved[k]; });
    (saved.concerns || []).forEach((id) => { const b = document.querySelector(`input[name=concern][value="${id}"]`); if (b) b.checked = true; });
    (saved.injuries || []).forEach((id) => { const b = document.querySelector(`input[name=injury][value="${id}"]`); if (b) b.checked = true; });
  }

  const qs = new URLSearchParams(location.search);
  const pre = qs.get('c');
  if (pre) document.querySelector(`input[name=concern][value="${pre}"]`)?.click();
  (qs.get('i') || '').split(',').filter(Boolean).forEach((id) =>
    document.querySelector(`input[name=injury][value="${id}"]`)?.click());

  const checked = (name) => [...document.querySelectorAll(`input[name=${name}]:checked`)].map((x) => x.value);
  const num = (id) => parseFloat($(id).value);

  function validate() {
    if (step === 0) {
      const a = num('age'), w = num('weight'), h = num('height');
      if (!(a >= 10 && a <= 90)) return 'Enter an age between 10 and 90.';
      if (!(w >= 25 && w <= 250)) return 'Enter a weight between 25 and 250 kg.';
      if (!(h >= 100 && h <= 230)) return 'Enter a height between 100 and 230 cm.';
    }
    return '';
  }

  function show() {
    steps.forEach((s, i) => (s.hidden = i !== step));
    $('bar').style.width = ((step + 1) / steps.length) * 100 + '%';
    $('back').hidden = step === 0;
    $('next').textContent = step === steps.length - 1 ? 'Build my plan' : 'Next';
    $('err').textContent = '';
    steps[step].querySelector('input, h2')?.focus?.();
  }

  $('back').onclick = () => { step = Math.max(0, step - 1); show(); };
  $('next').onclick = () => {
    const msg = validate();
    if (msg) { $('err').textContent = msg; return; }
    if (step < steps.length - 1) { step++; show(); return; }

    if (checked('flag').length) {
      Store.del('profile');
      $('form').hidden = true;
      $('stop').hidden = false;
      $('stop').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    Store.set('profile', {
      age: num('age'), weight: num('weight'), height: num('height'),
      concerns: checked('concern'), injuries: checked('injury')
    });
        Store.set('planCreated', new Date().toISOString().slice(0, 10));
    location.href = 'plan.html';
  };
  $('form').addEventListener('submit', (e) => e.preventDefault());
  show();
})();