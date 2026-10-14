/* ------------------------------------------------------------------
   Exercise library. To add an exercise, copy an entry and edit it.
   concerns : which problems it helps (ids from CONCERNS)
   loads    : body areas it puts load on (ids used by INJURIES.blocks)
   level    : 1 gentle, 2 moderate, 3 harder
   phase    : 1 warm-up, 2 mobility/stretch, 3 strengthening
   sets/reps (+ hold seconds for holds); a/b = start/end pose for the animation
------------------------------------------------------------------- */
const CONCERNS = [
  { id: 'forward-head',     label: 'Forward head / tech neck' },
  { id: 'rounded-shoulders', label: 'Rounded shoulders' },
  { id: 'uneven-shoulders', label: 'Uneven shoulders' },
  { id: 'upper-back',       label: 'Upper back and neck tightness' },
  { id: 'lower-back',       label: 'Lower back pain' },
  { id: 'knee',             label: 'Knee pain' },
  { id: 'general',          label: 'General posture' }
];

/* "blocks" = body areas whose exercises are removed from the plan */
const INJURIES = [
  { id: 'leg',        label: 'Leg injury (any part)',      blocks: ['knee', 'ankle', 'hip'] },
  { id: 'knee',       label: 'Knee',                       blocks: ['knee'] },
  { id: 'ankle',      label: 'Ankle or foot',              blocks: ['ankle'] },
  { id: 'hip',        label: 'Hip',                        blocks: ['hip'] },
  { id: 'lower-back', label: 'Lower back',                 blocks: ['lower-back'] },
  { id: 'upper-back', label: 'Upper back',                 blocks: ['upper-back'] },
  { id: 'neck',       label: 'Neck',                       blocks: ['neck'] },
  { id: 'shoulder',   label: 'Shoulder or collarbone',     blocks: ['shoulder'] },
  { id: 'wrist',      label: 'Elbow, wrist or hand',       blocks: ['wrist'] }
];

const RED_FLAGS = [
  'Numbness, tingling or weakness spreading into an arm or leg',
  'Pain that began after a fall, accident or sports injury',
  'Recent surgery or a known fracture that is still healing',
  'Chest pain, dizziness or shortness of breath with activity',
  'Severe pain that wakes you at night or does not ease with rest'
];

/* Poses */
const SUPINE = { flip: 1, hx: 100, hy: 190, p: 90, a: -90, f: -90, t: -120, s: 49 };
const QUAD   = { hx: 100, hy: 164, p: 80, a: 0, f: 0, t: 0, s: -90 };

const EXERCISES = [
  { id: 'wall-stand', name: 'Wall posture reset', phase: 1, level: 1,
    concerns: ['forward-head', 'rounded-shoulders', 'general'], loads: [],
    sets: 2, reps: 5, hold: 10,
    why: 'Teaches your body what upright feels like.',
    steps: ['Stand with heels a few centimetres from a wall.', 'Let hips, shoulder blades and the back of the head lightly touch the wall.', 'Keep your chin level, not tilted up.', 'Hold, then step away and try to keep the position.'],
    cues: ['Do not force your lower back flat', 'Breathe slowly'],
    prop: 'wall', wallX: 132,
    a: { p: 12, hx: 144, hf: 18 }, b: { p: 0, hx: 150, hf: 0 } },

  { id: 'shoulder-rolls', name: 'Shoulder rolls', phase: 1, level: 1,
    concerns: ['uneven-shoulders', 'upper-back'], loads: ['shoulder', 'neck'],
    sets: 2, reps: 10,
    why: 'Loosens tight shoulders and helps you notice if one sits higher.',
    steps: ['Stand tall with arms relaxed.', 'Lift both shoulders toward your ears.', 'Roll them back and down in a slow circle.', 'Reverse direction halfway through.'],
    cues: ['Move slowly', 'Keep your neck relaxed'],
    a: { sh: 0 }, b: { sh: 10 } },

  { id: 'pelvic-tilt', name: 'Pelvic tilt', phase: 1, level: 1,
    concerns: ['lower-back'], loads: ['lower-back'],
    sets: 2, reps: 10, hold: 5,
    why: 'A gentle way to wake up the deep abdominal muscles that support the lower back.',
    steps: ['Lie on your back with knees bent and feet flat.', 'Gently flatten your lower back toward the floor by tightening your stomach.', 'Hold, then release.'],
    cues: ['Small movement only', 'Keep breathing'],
    floor: 200, a: { ...SUPINE }, b: { hy: 187, p: 94 } },

  { id: 'cat-cow', name: 'Cat-cow', phase: 1, level: 1,
    concerns: ['lower-back', 'upper-back'], loads: ['wrist', 'knee', 'lower-back', 'upper-back'],
    sets: 2, reps: 10,
    why: 'Moves the whole spine through a comfortable range and eases stiffness.',
    steps: ['Start on hands and knees, hands under shoulders, knees under hips.', 'Breathe in, let your belly drop and look slightly up.', 'Breathe out, round your back and tuck your chin.', 'Move slowly with your breathing.'],
    cues: ['Stay inside a pain-free range', 'Pad your knees if needed'],
    a: { ...QUAD, bend: 16, h: -25 }, b: { bend: -16, h: 30 } },

  { id: 'chin-tuck', name: 'Chin tuck', phase: 2, level: 1,
    concerns: ['forward-head', 'upper-back', 'general'], loads: ['neck'],
    sets: 2, reps: 10, hold: 5,
    why: 'Strengthens the deep neck muscles that hold your head over your shoulders.',
    steps: ['Sit or stand tall, eyes level.', 'Glide your head straight back as if making a double chin.', 'Hold, then relax.'],
    cues: ['Do not tilt your head down', 'Stop if you feel sharp pain or tingling'],
    a: { hf: 16 }, b: { hf: 0 } },

  { id: 'doorway-chest', name: 'Doorway chest stretch', phase: 2, level: 1,
    concerns: ['rounded-shoulders'], loads: ['shoulder'],
    sets: 2, reps: 2, hold: 30,
    why: 'Lengthens tight chest muscles that pull the shoulders forward.',
    steps: ['Stand in a doorway with your forearm on the frame, elbow at shoulder height.', 'Step through gently until you feel a stretch across the chest.', 'Hold, then switch sides.'],
    cues: ['Mild stretch only', 'Keep ribs down, do not arch your back'],
    prop: 'door', a: { a: 90, f: 180 }, b: { p: 10 } },

  { id: 'thoracic-extension', name: 'Upper back extension', phase: 2, level: 2,
    concerns: ['rounded-shoulders', 'upper-back', 'general'], loads: ['upper-back', 'shoulder'],
    sets: 2, reps: 8, hold: 5,
    why: 'Opens up the stooped upper back.',
    steps: ['Stand or sit tall, hands behind your head.', 'Lift your chest and gently lean back over the top of your spine.', 'Hold, then return.'],
    cues: ['Bend from the upper back, not the lower back', 'Keep elbows wide'],
    a: { p: 6, a: 125, f: -120 }, b: { p: -8, h: -6 } },

  { id: 'child-pose', name: "Child's pose", phase: 2, level: 1,
    concerns: ['lower-back'], loads: ['knee', 'hip', 'ankle', 'lower-back'],
    sets: 2, reps: 2, hold: 30,
    why: 'A restful stretch for the lower back and hips.',
    steps: ['Kneel, then sit back toward your heels.', 'Reach your arms forward along the floor.', 'Rest your forehead down and breathe slowly.'],
    cues: ['Place a cushion under hips or knees if it is uncomfortable', 'Skip this if it hurts your knees'],
    a: { hx: 100, hy: 189, p: 75, h: 25, a: 40, f: 60, t: 60, s: -90 }, b: { hx: 92, p: 84, h: 16, a: 60, f: 75 } },

  { id: 'scapular-squeeze', name: 'Shoulder blade squeeze', phase: 3, level: 1,
    concerns: ['rounded-shoulders', 'uneven-shoulders', 'upper-back', 'general'], loads: ['shoulder', 'upper-back'],
    sets: 2, reps: 10, hold: 5,
    why: 'Strengthens the muscles between the shoulder blades that hold the shoulders back.',
    steps: ['Stand tall, elbows bent at your sides.', 'Pull your elbows back and squeeze your shoulder blades together.', 'Hold, then release slowly.'],
    cues: ['Keep shoulders down, away from your ears', 'Do not arch your lower back'],
    a: { a: 35, f: 95 }, b: { a: -35, f: 95 } },

  { id: 'wall-angel', name: 'Wall angel', phase: 3, level: 2,
    concerns: ['rounded-shoulders', 'upper-back', 'forward-head'], loads: ['shoulder', 'upper-back'],
    sets: 2, reps: 10,
    why: 'Builds control of the shoulder blades while the back of the body stays against the wall.',
    steps: ['Stand with your back against a wall, arms at your sides with elbows bent.', 'Slide your arms up the wall as far as you comfortably can.', 'Slide them back down with control.'],
    cues: ['Keep ribs and head touching the wall', 'Stop before your back arches'],
    prop: 'wall', wallX: 132, a: { a: -15, f: -20 }, b: { a: -170, f: -175 } },

  { id: 'single-arm-row', name: 'Single-arm row', phase: 3, level: 2,
    concerns: ['uneven-shoulders', 'rounded-shoulders'], loads: ['shoulder', 'lower-back'],
    sets: 2, reps: 10,
    why: 'Strengthens the weaker side so both shoulders can sit level. Use a light bottle or no weight.',
    steps: ['Rest one hand on a bench or chair, back flat.', 'With the other hand, pull your elbow back toward your hip.', 'Lower slowly, finish all reps, then switch sides.'],
    cues: ['Start with the weaker side and match reps on the other', 'Keep your neck in line with your spine'],
    prop: 'bench', a: { hx: 130, p: 65, h: -15, a: 0, f: 0, a2: 15, f2: 0 }, b: { a: -70, f: -20 } },

  { id: 'glute-bridge', name: 'Glute bridge', phase: 3, level: 1,
    concerns: ['lower-back', 'knee'], loads: ['hip'],
    sets: 2, reps: 12, hold: 3,
    why: 'Strengthens the buttocks, which support the lower back and take load off the knees.',
    steps: ['Lie on your back, knees bent, feet flat.', 'Squeeze your buttocks and lift your hips until shoulders, hips and knees line up.', 'Hold, then lower slowly.'],
    cues: ['Do not over-arch your back', 'Push through your heels'],
    floor: 200, a: { ...SUPINE }, b: { hy: 170, p: 110, t: -85, s: 60 } },

  { id: 'bird-dog', name: 'Bird-dog', phase: 3, level: 3,
    concerns: ['lower-back'], loads: ['wrist', 'knee', 'shoulder', 'hip', 'lower-back'],
    sets: 2, reps: 8,
    why: 'Trains the trunk to stay steady while the limbs move.',
    steps: ['Start on hands and knees.', 'Reach one arm forward and the opposite leg back, keeping your back level.', 'Return and switch sides.'],
    cues: ['Imagine balancing a cup on your lower back', 'Move slowly'],
    a: { ...QUAD, a2: 0, f2: 0, t2: 0, s2: -90 }, b: { a: 90, f: 90, t2: -90, s2: -90 } },

  { id: 'straight-leg-raise', name: 'Straight-leg raise', phase: 3, level: 1,
    concerns: ['knee'], loads: ['hip'],
    sets: 2, reps: 10,
    why: 'Strengthens the thigh muscle that supports the knee, without bending it.',
    steps: ['Lie on your back, one knee bent and the other leg straight.', 'Tighten the thigh of the straight leg and lift it to the height of the bent knee.', 'Lower slowly. Finish all reps, then switch legs.'],
    cues: ['Keep the lifted knee straight', 'Do not let your back arch'],
    floor: 200, a: { ...SUPINE, t: -90, s: -90, t2: -120, s2: 49 }, b: { t: -135, s: -135 } },

  { id: 'chair-squat', name: 'Sit-to-stand from a chair', phase: 3, level: 2,
    concerns: ['knee'], loads: ['knee', 'hip', 'ankle'],
    sets: 2, reps: 8,
    why: 'Builds leg strength through a small, controlled range.',
    steps: ['Stand in front of a sturdy chair, feet hip-width apart.', 'Sit back toward the chair slowly, stopping above the seat if you prefer.', 'Press through your heels to stand tall.'],
    cues: ['Knees track over your toes', 'Stay in a pain-free range'],
    prop: 'chair', a: { a: 90, f: 90 }, b: { hx: 151, hy: 150, p: 25, t: 45, s: -51 } }
];