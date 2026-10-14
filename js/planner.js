/* Builds a personalised plan from { age, weight(kg), height(cm), concerns[], injuries[] } */
const Planner = {
  bmi: (kg, cm) => kg / Math.pow(cm / 100, 2),

  bmiBand(b) {
    if (b < 18.5) return 'Below typical range';
    if (b < 25) return 'Typical range';
    if (b < 30) return 'Above typical range';
    return 'Well above typical range';
  },

  build(profile) {
    const { age, weight, height } = profile;
    const concerns = profile.concerns.length ? profile.concerns : ['general'];
    const bmi = Planner.bmi(weight, height);
    const blocked = new Set();
    profile.injuries.forEach((id) => INJURIES.find((i) => i.id === id)?.blocks.forEach((b) => blocked.add(b)));

    const gentle = age >= 60 || age < 16 || bmi >= 30;
    const maxLevel = age >= 65 || bmi >= 35 ? 2 : 3;
    const factor = gentle ? 0.75 : 1;
    const perConcern = gentle ? 2 : 3;

    const notes = [];
    const chosen = new Map();
    for (const c of concerns) {
      const label = CONCERNS.find((x) => x.id === c).label;
      const pool = EXERCISES.filter((e) => e.concerns.includes(c));
      const safe = pool.filter((e) => e.level <= maxLevel && !e.loads.some((l) => blocked.has(l)));
      if (!safe.length) {
        notes.push(`No safe exercises are available for "${label}" with the injuries you reported. Please see a doctor or physiotherapist for this area.`);
        continue;
      }
      safe.sort((x, y) => x.level - y.level || y.concerns.length - x.concerns.length)
          .slice(0, perConcern).forEach((e) => chosen.set(e.id, e));
    }
    if (blocked.size) notes.push('Exercises that load your injured area were left out of this plan.');
    if (gentle) notes.push('Repetitions and hold times were reduced for a gentler start. Increase slowly over several weeks.');

    const scale = (v) => Math.max(1, Math.round(v * factor));
    const items = [...chosen.values()].sort((a, b) => a.phase - b.phase).map((e) => ({
      id: e.id, sets: e.sets, reps: scale(e.reps), hold: e.hold ? scale(e.hold) : 0
    }));
    const secs = items.reduce((t, i) => t + i.sets * i.reps * (i.hold || 4) + (i.sets - 1) * 20 + 15, 0);
    return { items, notes, bmi: Math.round(bmi * 10) / 10, band: Planner.bmiBand(bmi), minutes: Math.max(5, Math.ceil(secs / 60)) };
  }
};