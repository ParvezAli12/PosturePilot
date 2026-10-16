/* Run with:  node tests/planner.test.js   (no dependencies) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const { Planner, EXERCISES, CONCERNS, INJURIES, RED_FLAGS } = vm.runInNewContext(
  read('exercises.js') + '\n' + read('planner.js') +
  '\n;({ Planner, EXERCISES, CONCERNS, INJURIES, RED_FLAGS })'
);

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg || ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const ex = (id) => EXERCISES.find((e) => e.id === id);
const base = { age: 25, weight: 70, height: 175, concerns: ['general'], injuries: [] };
const ids = (plan) => plan.items.map((i) => i.id);
const withPain = (arr) => arr.map((pain, i) => ({ date: 'd' + i, pain }));

console.log('\nData integrity');
test('every exercise has the required fields', () => {
  for (const e of EXERCISES) {
    for (const k of ['id', 'name', 'phase', 'level', 'concerns', 'loads', 'sets', 'reps', 'why', 'steps', 'cues', 'a', 'b'])
      assert(e[k] !== undefined, `${e.id} is missing "${k}"`);
    assert(e.steps.length >= 2 && e.cues.length >= 1, `${e.id} needs steps and cues`);
    assert([1, 2, 3].includes(e.level) && [1, 2, 3].includes(e.phase), `${e.id} has a bad level or phase`);
  }
});
test('exercise ids are unique', () => {
  eq(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});
test('concern ids used by exercises exist', () => {
  const valid = new Set(CONCERNS.map((c) => c.id));
  for (const e of EXERCISES) for (const c of e.concerns) assert(valid.has(c), `${e.id} uses unknown concern "${c}"`);
});
test('every "loads" tag is blocked by at least one injury option', () => {
  const blockable = new Set(INJURIES.flatMap((i) => i.blocks));
  for (const e of EXERCISES) for (const l of e.loads) assert(blockable.has(l), `${e.id} loads "${l}" which no injury can block`);
});
test('every concern has at least one exercise when there are no injuries', () => {
  for (const c of CONCERNS) assert(EXERCISES.some((e) => e.concerns.includes(c.id)), `no exercise for ${c.id}`);
});
test('safety questions exist', () => assert(RED_FLAGS.length >= 3));

console.log('\nInjury filtering (safety rules)');
test('a leg injury removes every knee, ankle and hip exercise', () => {
  const p = Planner.build({ ...base, concerns: ['knee', 'lower-back', 'general'], injuries: ['leg'] });
  for (const i of p.items) assert(!ex(i.id).loads.some((l) => ['knee', 'ankle', 'hip'].includes(l)), `${i.id} loads a leg area`);
});
test('a knee injury removes knee-loading exercises but keeps others', () => {
  const p = Planner.build({ ...base, concerns: ['knee'], injuries: ['knee'] });
  assert(!ids(p).includes('chair-squat'), 'chair squat should be removed');
  assert(ids(p).length > 0, 'safe knee-friendly exercises should remain');
});
test('shoulder injury removes shoulder exercises', () => {
  const p = Planner.build({ ...base, concerns: ['rounded-shoulders', 'uneven-shoulders'], injuries: ['shoulder'] });
  for (const i of p.items) assert(!ex(i.id).loads.includes('shoulder'), `${i.id} loads the shoulder`);
});
test('when nothing safe is left, the plan says so and refers to a professional', () => {
  const p = Planner.build({ ...base, concerns: ['uneven-shoulders'], injuries: ['shoulder'] });
  assert(p.notes.some((n) => /doctor or physiotherapist/.test(n)), 'expected a referral note');
});
test('EXHAUSTIVE: no plan ever contains an exercise that loads an injured area', () => {
  const injIds = INJURIES.map((i) => i.id);
  const conIds = CONCERNS.map((c) => c.id);
  let plans = 0;
  for (let mask = 0; mask < 1 << injIds.length; mask++) {
    const injuries = injIds.filter((_, b) => mask & (1 << b));
    const blocked = new Set(injuries.flatMap((id) => INJURIES.find((i) => i.id === id).blocks));
    for (const c of conIds) for (const age of [14, 30, 70]) for (const weight of [55, 110]) {
      const p = Planner.build({ age, weight, height: 170, concerns: [c], injuries });
      plans++;
      for (const i of p.items) assert(!ex(i.id).loads.some((l) => blocked.has(l)),
        `unsafe: ${i.id} for injuries [${injuries}] concern ${c}`);
    }
  }
  console.log(`       (checked ${plans} generated plans)`);
});

console.log('\nPersonalisation');
test('older users get reduced amounts', () => {
  const young = Planner.build({ ...base, concerns: ['forward-head'] });
  const old = Planner.build({ ...base, age: 70, concerns: ['forward-head'] });
  const a = young.items.find((i) => i.id === 'chin-tuck'), b = old.items.find((i) => i.id === 'chin-tuck');
  assert(b.reps < a.reps, 'older user should get fewer reps');
});
test('hardest (level 3) exercises are excluded for age 65+ or BMI 35+', () => {
  const p1 = Planner.build({ ...base, age: 70, concerns: ['lower-back'] });
  const p2 = Planner.build({ ...base, weight: 120, height: 165, concerns: ['lower-back'] });
  for (const p of [p1, p2]) for (const i of p.items) assert(ex(i.id).level <= 2, `${i.id} is too hard`);
});
test('doses are never zero', () => {
  const p = Planner.build({ ...base, age: 80, concerns: ['lower-back', 'forward-head'] }, { sessions: withPain([9]) });
  for (const i of p.items) assert(i.reps >= 1 && i.sets >= 1, `${i.id} has a zero dose`);
});
test('every plan item explains why it was chosen', () => {
  const p = Planner.build({ ...base, concerns: ['forward-head'], injuries: ['knee'] });
  for (const i of p.items) assert(i.why.length >= 1 && /Targets/.test(i.why[0]), 'missing explanation');
});

console.log('\nFeedback loop (adaptation rules)');
test('no history: factor 1', () => eq(Planner.adapt([]).factor, 1));
test('R1: last pain >= 8 cuts load to 50% and advises a professional', () => {
  const r = Planner.adapt(withPain([2, 8]));
  eq(r.factor, 0.5);
  assert(/doctor or physiotherapist/.test(r.notes[0]));
});
test('R2: last pain >= 6 cuts load to 75%', () => eq(Planner.adapt(withPain([2, 6])).factor, 0.75));
test('R2: a rise of 2+ to at least 4 cuts load to 75%', () => eq(Planner.adapt(withPain([2, 4])).factor, 0.75));
test('a rise to only 3 does not reduce load', () => assert(Planner.adapt(withPain([1, 3])).factor >= 1));
test('R3: 3 low-pain sessions raise load by 10%', () => eq(Planner.adapt(withPain([2, 1, 3])).factor, 1.1));
test('R3: 6 low-pain sessions raise load by 20%', () => eq(Planner.adapt(withPain([0, 1, 2, 3, 1, 2])).factor, 1.2));
test('R3: increase is capped at +30%', () => eq(Planner.adapt(withPain(Array(15).fill(1))).factor, 1.3));
test('R3: only the most recent run counts (a spike resets it)', () => eq(Planner.adapt(withPain([1, 1, 1, 1, 5, 1])).factor, 1));
test('sessions without a rating are ignored', () => eq(Planner.adapt([{ date: 'x' }, { date: 'y' }]).factor, 1));
test('R4: an exercise marked as hurting never appears again until restored', () => {
  const plain = Planner.build({ ...base, concerns: ['forward-head'] });
  const first = plain.items[0].id;
  const p = Planner.build({ ...base, concerns: ['forward-head'] }, { sessions: [], banned: [first] });
  assert(!ids(p).includes(first), `${first} should be paused`);
});
test('high pain lowers the doses in the generated plan', () => {
  const normal = Planner.build({ ...base, concerns: ['lower-back'] });
  const hurt = Planner.build({ ...base, concerns: ['lower-back'] }, { sessions: withPain([8]) });
  const total = (p) => p.items.reduce((t, i) => t + i.sets * i.reps, 0);
  assert(total(hurt) < total(normal), 'load should drop');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);