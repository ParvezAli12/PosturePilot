/* Character animator (side view). A pose is a set of angles (degrees):
   p  torso lean from vertical (+ = toward facing direction)   h  head tilt relative to torso
   hf head forward shift (px)   sh shoulder lift (px)   bend torso curve (+ belly side)
   a,f upper arm / forearm angle, measured from straight down, + = forward
   t,s thigh / shin angle, same convention.  a2,f2,t2,s2 = far limbs (default: same as near)
   hx,hy hip position   flip 1 = lying on the back (used for floor exercises) */
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

  /* ---------- geometry ---------- */
  function geo(P) {
    const k = P.flip ? -1 : 1;
    const dir = (g) => [k * Math.sin(g * R), Math.cos(g * R)];
    const add = (a, d, l) => [a[0] + d[0] * l, a[1] + d[1] * l];
    const hip = [P.hx, P.hy];
    const up = [k * Math.sin(P.p * R), -Math.cos(P.p * R)];
    const sho = add(hip, up, 60); sho[1] -= P.sh;
    const hu = [k * Math.sin((P.p + P.h) * R), -Math.cos((P.p + P.h) * R)];
    const neck = add(sho, hu, 10);
    const head = add(sho, hu, 21); head[0] += k * P.hf;
    const e = add(sho, dir(P.a), 30), w = add(e, dir(P.f), 28);
    const e2 = add(sho, dir(P.a2), 30), w2 = add(e2, dir(P.f2), 28);
    const kn = add(hip, dir(P.t), 46), ft = add(kn, dir(P.s), 44);
    const kn2 = add(hip, dir(P.t2), 46), ft2 = add(kn2, dir(P.s2), 44);
    const mid = [(hip[0] + sho[0]) / 2, (hip[1] + sho[1]) / 2];
    const pp = [-up[1], up[0]];
    const ctrl = [mid[0] + pp[0] * P.bend * 2, mid[1] + pp[1] * P.bend * 2];
    const toeOf = (kk, ff) => {
      const dx = ff[0] - kk[0], dy = ff[1] - kk[1], l = Math.hypot(dx, dy) || 1;
      return [ff[0] + (dy / l) * 10, ff[1] - (dx / l) * 10];
    };
    return { hip, sho, hu, neck, head, e, w, e2, w2, kn, ft, kn2, ft2, ctrl, toe: toeOf(kn, ft), toe2: toeOf(kn2, ft2) };
  }

  /* ---------- drawing helpers ---------- */
  const seg = (a, b, w, c) =>
    `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke-width="${w}" stroke-linecap="round" style="stroke:var(${c})"/>`;
  const dot = (p, r, c) => `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${r}" style="fill:var(${c})"/>`;
  const prop = (d, wd) => `<path d="${d}" fill="none" style="stroke:var(--fg-prop)" stroke-width="${wd}" stroke-linecap="round"/>`;

  function body(g) {
    const f = [-g.hu[1], g.hu[0]];                     // direction the face points
    const at = (c, a, b) => [c[0] + g.hu[0] * a + f[0] * b, c[1] + g.hu[1] * a + f[1] * b];

    const far =
      seg(g.sho, g.e2, 9, '--fg-shirt-far') + seg(g.e2, g.w2, 8, '--fg-skin-far') + dot(g.w2, 4.5, '--fg-skin-far') +
      seg(g.hip, g.kn2, 13, '--fg-pants-far') + seg(g.kn2, g.ft2, 11, '--fg-pants-far') + seg(g.ft2, g.toe2, 8, '--fg-shoe');

    const torso = `<path d="M${n(g.hip[0])} ${n(g.hip[1])} Q${n(g.ctrl[0])} ${n(g.ctrl[1])} ${n(g.sho[0])} ${n(g.sho[1])}" fill="none" stroke-width="17" stroke-linecap="round" style="stroke:var(--fg-shirt)"/>`;

    const leg = seg(g.hip, g.kn, 13, '--fg-pants') + seg(g.kn, g.ft, 11, '--fg-pants') + seg(g.ft, g.toe, 8, '--fg-shoe') +
      dot(g.kn, 6.2, '--fg-pants') + dot(g.hip, 8.5, '--fg-pants');

    const arm = seg(g.sho, g.e, 9, '--fg-shirt') + seg(g.e, g.w, 8, '--fg-skin') + dot(g.w, 4.5, '--fg-skin') + dot(g.sho, 8, '--fg-shirt');

    const hair = at(g.head, 2.5, -2.5), face = at(g.head, 0, 1.5);
    const head =
      seg(g.sho, g.neck, 7, '--fg-skin') +
      dot(hair, 11.5, '--fg-hair') + dot(face, 10, '--fg-skin') +
      dot(at(face, -1, 10), 2.4, '--fg-skin') +        // nose
      dot(at(face, 1.5, 5), 1.3, '--fg-hair');          // eye

    return far + torso + leg + arm + head;
  }

  function draw(P, meta = {}) {
    const g = geo(P);
    const floor = meta.floor || 210;
    let s = `<ellipse cx="${n((g.hip[0] + g.ft[0]) / 2)}" cy="${floor + 3}" rx="48" ry="4" style="fill:var(--fg-shadow)"/>`;
    s += prop(`M10 ${floor} H290`, 2);
    if (meta.prop === 'wall') { const x = meta.wallX ?? 132; s += prop(`M${x} 0 V${floor}`, 4); }
    if (meta.prop === 'door') { const x = g.e[0] + 6; s += prop(`M${n(x)} 8 V${floor}`, 5); }
    if (meta.prop === 'chair') s += prop(`M112 118 V158 H146 M118 158 V${floor} M142 158 V${floor}`, 4);
    if (meta.prop === 'bench') s += prop(`M182 154 H228 M188 154 V${floor} M222 154 V${floor}`, 4);
    if (meta.ghost) s += `<g style="opacity:.16">${body(geo(meta.ghost))}</g>`;   // where the move is heading
    return s + body(g);
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
      const show = () => { svg.innerHTML = draw(atB ? B : A, { ...meta, ghost: atB ? A : B }); };
      svg.style.cursor = 'pointer'; svg.tabIndex = 0;
      svg.onclick = svg.onkeydown = (ev) => { if (ev.type === 'click' || ev.key === 'Enter' || ev.key === ' ') { atB = !atB; show(); } };
      show(); return () => { svg.onclick = svg.onkeydown = null; };
    }
    let raf, t0;
    const frame = (ts) => {
      t0 ??= ts;
      const t = ((ts - t0) % period) / period;
      const u = t < .4 ? ease(t / .4) : t < .6 ? 1 : t < .9 ? 1 - ease((t - .6) / .3) : 0;
      svg.innerHTML = draw(lerp(A, B, u), { ...meta, ghost: u < .5 ? B : A });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }
  return { play, draw, full, lerp };
})();