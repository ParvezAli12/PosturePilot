/* Builds a personalised plan from:
   profile = { age, weight(kg), height(cm), concerns[], injuries[] }
   history = { sessions: [{ date, pain?, hurt?[] }], banned: [exerciseId] }
   opts    = { day }  optional: which day to build for (defaults to today). The routine rotates daily. */
const Planner = {
  bmi: (kg, cm) => kg / Math.pow(cm / 100, 2),

  bmiBand(b) {
    if (b < 18.5) return 'Below typical range';
    if (b < 25) return 'Typical range';
    if (b < 30) return 'Above typical range';
    return 'Well above typical range';
  },

  /* Adjusts load from past check-ins (pain 0-10, most recent last).
     R1 last >= 8                              -> 50% load, advise professional
     R2 last >= 6, or rose by >= 2 to >= 4     -> 75% load
     R3 trailing run of pain <= 3 (3/6/9)      -> +10% / +20% / +30%
     Otherwise unchanged. */
  adapt(sessions) {
    const pains = sessions.map((s) => s.pain).filter((p) => typeof p === 'number');
    if (!pains.length) return { factor: 1, notes: [] };
    const last = pains[pains.length - 1];
    const prev = pains.length > 1 ? pains[pains.length - 2] : null;

    if (last >= 8) {
      return { factor: 0.5, notes: [`Your last session ended with strong pain (${last}/10), so today is much lighter. If pain this strong continues, stop and see a doctor or physiotherapist.`] };
    }
    if (last >= 6 || (prev !== null && last - prev >= 2 && last >= 4)) {
      return { factor: 0.75, notes: [`Pain went up after your last session (${last}/10), so today is lighter. If it keeps rising, see a doctor or physiotherapist.`] };
    }
    let run = 0;
    for (let i = pains.length - 1; i >= 0 && pains[i] <= 3; i--) run++;
    const steps = Math.min(3, Math.floor(run / 3));
    if (steps) {
      return { factor: 1 + steps * 0.1, notes: [`Your last ${run} sessions were low-pain, so amounts are up ${steps * 10}%.`] };
    }
    return { factor: 1, notes: [] };
  },

  /* a whole number that goes up by one at local midnight, used to rotate the routine day by day */
  dayNumber(d = new Date()) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); },

  build(profile, history = {}, opts = {}) {
    const { age, weight, height } = profile;
    const concerns = profile.concerns.length ? profile.concerns : ['general'];
    const bmi = Planner.bmi(weight, height);
    const banned = new Set(history.banned || []);
    const adapt = Planner.adapt(history.sessions || []);

    const blocked = new Set();
    const injuryLabels = [];
    profile.injuries.forEach((id) => {
      const inj = INJURIES.find((i) => i.id === id);
      if (!inj) return;
      injuryLabels.push(inj.label.toLowerCase());
      inj.blocks.forEach((b) => blocked.add(b));
    });

    const gentle = age >= 60 || age < 16 || bmi >= 30;
    const maxLevel = age >= 65 || bmi >= 35 ? 2 : 3;
    const factor = (gentle ? 0.75 : 1) * adapt.factor;
    const perConcern = gentle ? 2 : 3;

    /* Daily variety. Each day the plan picks a different exercise from the suitable ones for every part
       of the routine. How hard those options may be depends on you:
         span 0  only the gentlest options   (a gentle profile, recent pain, or fewer than 3 workouts done)
         span 1  the gentlest plus one step harder
         span 2  one more step harder too    (6 or more low-pain workouts in a row) */
    const day = Number.isFinite(opts.day) ? opts.day : Planner.dayNumber();
    const done = (history.sessions || []).length;
    const span = gentle || adapt.factor < 1 || done < 3 ? 0 : adapt.factor >= 1.2 ? 2 : 1;

    const notes = [...adapt.notes];
    const chosen = new Map(); // id -> { e, for: Set(concernId), pool }

    concerns.forEach((c, ci) => {
      const label = CONCERNS.find((x) => x.id === c).label;
      const pool = EXERCISES.filter((e) => e.concerns.includes(c));
      const safe = pool.filter((e) =>
        e.level <= maxLevel && !banned.has(e.id) && !e.loads.some((l) => blocked.has(l)));
      if (!safe.length) {
        notes.push(`No safe exercises are available for "${label}" with your injuries or paused exercises. Please see a doctor or physiotherapist for this area.`);
        return;
      }
      const rank = (x, y) => x.level - y.level || y.concerns.length - x.concerns.length || x.id.localeCompare(y.id);

      /* a balanced routine: a warm-up, a stretch and a strength move. A gentle profile gets the warm-up plus
         a stretch or a strength move, alternating by day. */
      const order = perConcern >= 3 ? [1, 2, 3] : [1, ...(day % 2 ? [3, 2] : [2, 3])];
      const picks = [];
      for (const ph of order) {
        const all = safe.filter((e) => e.phase === ph).sort(rank);
        if (!all.length) continue;
        const tier = all.filter((e) => e.level <= all[0].level + span);
        picks.push({ e: tier[(day + ph + ci) % tier.length], n: tier.length });   // moves one step each day
      }
      for (const e of [...safe].sort(rank)) {                                    // fill any gap with the next easiest
        if (picks.length >= perConcern) break;
        if (!picks.some((p) => p.e === e)) picks.push({ e, n: 1 });
      }
      picks.slice(0, perConcern).forEach(({ e, n }) => {
        const entry = chosen.get(e.id) || { e, for: new Set(), pool: 1 };
        entry.for.add(c); entry.pool = Math.max(entry.pool, n);
        chosen.set(e.id, entry);
      });
    });
    if (blocked.size) notes.push('Exercises that load your injured area were left out of this plan.');
    if (banned.size) notes.push(`${banned.size} exercise${banned.size > 1 ? 's are' : ' is'} paused because you said ${banned.size > 1 ? 'they' : 'it'} hurt. You can restore ${banned.size > 1 ? 'them' : 'it'} under Progress.`);
    if (gentle) notes.push('Repetitions and hold times were reduced for a gentler start. Increase slowly over several weeks.');

    const scale = (v) => Math.max(1, Math.round(v * factor));
    const items = [...chosen.values()]
      .sort((a, b) => a.e.phase - b.e.phase || a.e.id.localeCompare(b.e.id))
      .map(({ e, for: f, pool }) => {
        const why = [`Targets ${[...f].map((id) => CONCERNS.find((x) => x.id === id).label.toLowerCase()).join(' and ')}`];
        if (injuryLabels.length) why.push(`does not load your injured area (${injuryLabels.join(', ')})`);
        if (pool > 1) why.push(`rotates daily from ${pool} suitable options`);
        if (gentle) why.push('gentle amounts chosen for your age or body size');
        if (adapt.factor < 1) why.push('lighter after your last check-in');
        if (adapt.factor > 1) why.push('increased after low-pain sessions');
        return { id: e.id, sets: e.sets, reps: scale(e.reps), hold: e.hold ? scale(e.hold) : 0, why };
      });

    const secs = items.reduce((t, i) => t + i.sets * i.reps * (i.hold || 4) + (i.sets - 1) * 20 + 15, 0);
    return {
      items, notes, factor, day, rotates: [...chosen.values()].some((c) => c.pool > 1),
      bmi: Math.round(bmi * 10) / 10, band: Planner.bmiBand(bmi),
      minutes: Math.max(5, Math.ceil(secs / 60))
    };
  }
};