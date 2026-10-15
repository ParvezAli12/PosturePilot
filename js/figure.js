/* Stick-figure animator (side view). A pose is a set of angles (degrees):
   p  torso lean from vertical (+ = toward facing direction)   h  head tilt relative to torso
   hf head forward shift (px)   sh shoulder lift (px)   bend torso curve (+ belly side)
   a,f upper arm / forearm angle, measured from straight down, + = forward
   t,s thigh / shin angle, same convention.  a2,f2,t2,s2 = far limbs (default: same as near)
   hx,hy hip position   flip 1 = facing left (used for lying on the back) */
const Figure = (() => {
  const D = { hx: 150, hy: 120, flip: 0, p: 0, h: 0, hf: 0, sh: 0, bend: 0, a: 0, f: 0, t: 0, s: 0 };
  const R = Math.PI / 180;
  const full = (o) => {
    const P = { ...D, ...o };
    for (const k of ['a', 'f', 't', 's']) if (o[k + '2'] === undefined) P[k + '2'] = P[k];
    return P;
  };
  const lerp = (A, B, u) => { const o = {}; for (const k in A) o[k] = A[k] + (B[k] - A[k]) * u; return o; };
  const ease = (x) => (x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const n = (v) => v.toFixed(1);

  function draw(P, meta = {}) {
    const k = P.flip ? -1 : 1;
    const dir = (g) => [k * Math.sin(g * R), Math.cos(g * R)];
    const add = (a, d, l) => [a[0] + d[0] * l, a[1] + d[1] * l];
    const hip = [P.hx, P.hy];
    const up = [k * Math.sin(P.p * R), -Math.cos(P.p * R)];
    const sho = add(hip, up, 60); sho[1] -= P.sh;
    const hu = [k * Math.sin((P.p + P.h) * R), -Math.cos((P.p + P.h) * R)];
    const head = add(sho, hu, 21); head[0] += k * P.hf;
    const neck = add(sho, hu, 10);
    const e = add(sho, dir(P.a), 30), w = add(e, dir(P.f), 28);
    const e2 = add(sho, dir(P.a2), 30), w2 = add(e2, dir(P.f2), 28);
    const kn = add(hip, dir(P.t), 46), ft = add(kn, dir(P.s), 44);
    const kn2 = add(hip, dir(P.t2), 46), ft2 = add(kn2, dir(P.s2), 44);
    const mid = [(hip[0] + sho[0]) / 2, (hip[1] + sho[1]) / 2];
    const pp = [-up[1], up[0]];
    const ctrl = [mid[0] + pp[0] * P.bend * 2, mid[1] + pp[1] * P.bend * 2];

    const line = (a, b, c, color) =>
      `<polyline points="${n(a[0])},${n(a[1])} ${n(b[0])},${n(b[1])} ${n(c[0])},${n(c[1])}" fill="none" style="stroke:var(${color})" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const L = (a, b, c) => line(a, b, c, '--fg-ink');
    const Lf = (a, b, c) => line(a, b, c, '--fg-far');
    const prop = (d, wd) => `<path d="${d}" fill="none" style="stroke:var(--fg-prop)" stroke-width="${wd}"/>`;

    const floor = meta.floor || 210;
    let props = prop(`M10 ${floor} H290`, 2);
    if (meta.prop === 'wall') { const x = (meta.wallX ?? 132); props += prop(`M${x} 0 V${floor}`, 4); }
    if (meta.prop === 'door') { const x = e[0] + 6; props += prop(`M${n(x)} 8 V${floor}`, 5); }
    if (meta.prop === 'chair') props += prop(`M112 118 V158 H146 M118 158 V${floor} M142 158 V${floor}`, 4);
    if (meta.prop === 'bench') props += prop(`M182 154 H228 M188 154 V${floor} M222 154 V${floor}`, 4);

    return props + Lf(sho, e2, w2) + Lf(hip, kn2, ft2) +
      `<path d="M${n(hip[0])} ${n(hip[1])} Q${n(ctrl[0])} ${n(ctrl[1])} ${n(sho[0])} ${n(sho[1])}" fill="none" style="stroke:var(--fg-spine)" stroke-width="8" stroke-linecap="round"/>` +
      L(hip, kn, ft) + L(sho, e, w) +
      `<line x1="${n(sho[0])}" y1="${n(sho[1])}" x2="${n(neck[0])}" y2="${n(neck[1])}" style="stroke:var(--fg-ink)" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="${n(head[0])}" cy="${n(head[1])}" r="11" style="fill:var(--fg-head);stroke:var(--fg-ink)" stroke-width="4"/>`;
  }

  /* Plays pose A -> B -> A on an <svg>. Returns a stop() function. */
  function play(svg, exercise, opts = {}) {
    svg.setAttribute('viewBox', '0 0 300 230');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label || exercise.name + ' animation');
    const A = full(exercise.a), B = full({ ...exercise.a, ...exercise.b });
    const meta = { floor: exercise.floor, prop: exercise.prop, wallX: exercise.wallX };
    const period = opts.period || 3600;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      let atB = false;
      const show = () => { svg.innerHTML = draw(atB ? B : A, meta); };
      svg.style.cursor = 'pointer'; svg.tabIndex = 0;
      svg.onclick = svg.onkeydown = (ev) => { if (ev.type === 'click' || ev.key === 'Enter' || ev.key === ' ') { atB = !atB; show(); } };
      show(); return () => { svg.onclick = svg.onkeydown = null; };
    }
    let raf, t0;
    const frame = (ts) => {
      t0 ??= ts;
      const t = ((ts - t0) % period) / period;
      const u = t < .4 ? ease(t / .4) : t < .6 ? 1 : t < .9 ? 1 - ease((t - .6) / .3) : 0;
      svg.innerHTML = draw(lerp(A, B, u), meta);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }
  return { play, draw, full, lerp };
})();