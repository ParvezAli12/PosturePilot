/* Landing page: if the visitor already has a saved plan, send them straight back to it. */
(() => {
  if (!Store.get('profile')) return;

  document.querySelectorAll('a[href="intake.html"]').forEach((a) => {
    if (/^\s*build my plan\s*$/i.test(a.textContent)) { a.textContent = 'Open my plan'; a.href = 'plan.html'; }
  });

  const main = document.querySelector('main');
  if (!main) return;
  const done = (Store.get('sessions', []) || []).length;
  const style = document.createElement('style');
  style.textContent = `.welcome{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between;background:var(--paper);border:2px solid var(--edge);border-radius:18px;padding:16px 20px;margin:8px 0 6px}
    .welcome h2{margin:0 0 .15em;font-size:1.3rem}.welcome p{margin:0;color:var(--slate)}`;
  document.head.appendChild(style);
  const bar = document.createElement('section');
  bar.className = 'welcome';
  bar.innerHTML = `<div><h2>Your plan is saved</h2><p>${done ? `${done} session${done > 1 ? 's' : ''} done so far.` : 'You have not done a session yet.'}</p></div>
    <div class="row"><a class="btn go" href="plan.html?start=1">Start workout</a><a class="btn alt" href="plan.html">View my plan</a><a class="btn alt" href="intake.html">Make a new plan</a></div>`;
  main.prepend(bar);
})();