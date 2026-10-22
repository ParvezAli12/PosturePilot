/* Timing details for the guided workout. Kept separate from exercises.js so the exercise library is untouched.
   tempo  : seconds for one slow rep (rep-based moves)
   phases : the two halves of a rep, shown on screen
   sides  : true = half of the time on each side
   Holds come from exercises.js: a hold of 20 s or more is one steady stretch, shorter holds repeat
   (hold, then a short relax, then again). */
const WORKOUT_DEFAULT = { tempo: 4, phases: ['Move', 'Return'], sides: false };

const WORKOUT_META = {
  'shoulder-rolls':     { tempo: 4, phases: ['Roll shoulders back', 'Roll shoulders forward'] },
  'cat-cow':            { tempo: 6, phases: ['Belly down, look up', 'Round your back, tuck chin'] },
  'doorway-chest':      { sides: true },
  'wall-angel':         { tempo: 6, phases: ['Slide arms up', 'Slide arms down'] },
  'single-arm-row':     { tempo: 4, phases: ['Pull elbow back', 'Lower slowly'], sides: true },
  'bird-dog':           { tempo: 8, phases: ['Reach arm and opposite leg', 'Return slowly'] },
  'straight-leg-raise': { tempo: 5, phases: ['Lift the leg', 'Lower slowly'], sides: true },
  'chair-squat':        { tempo: 5, phases: ['Sit back', 'Stand up'] },
  'arm-swings':         { tempo: 4, phases: ['Swing arms forward', 'Swing arms back'] },
  'marching':           { tempo: 4, phases: ['Lift one knee', 'Lift the other knee'] },
  'overhead-reach':     { tempo: 6, phases: ['Reach up and breathe in', 'Lower and breathe out'] },
  'hip-hinge':          { tempo: 5, phases: ['Push hips back', 'Stand tall'] },
  'wall-pushup':        { tempo: 5, phases: ['Lean in, bend elbows', 'Push away'] },
  'dead-bug':           { tempo: 6, phases: ['Extend opposite arm and leg', 'Return'] },
  'prone-y':            { tempo: 5, phases: ['Sweep arms up, lift chest', 'Lower slowly'] },
  'hip-flexor':         { sides: true },
  'knee-to-chest':      { sides: true },
  'hamstring-stretch':  { sides: true },
  'quad-stretch':       { sides: true },
  'calf-stretch':       { sides: true }
};

const workoutMeta = (id) => ({ ...WORKOUT_DEFAULT, ...(WORKOUT_META[id] || {}) });
const relaxFor = (hold) => (hold <= 10 ? 3 : 5);   // rest between repeated holds, in seconds