/* The two-minute desk break: six moves you can do at work, mostly from your chair.
   Kept separate from the main exercise library so nothing there has to change.
   loads  : body areas the move uses. A move is left out if you marked one of them as injured.
   tempo  : seconds for one slow repeat.   sides: true = the first half is one leg, the second half the other. */
const DESK_MOVES = [
  { id: 'desk-chin', name: 'Seated chin tuck', loads: ['neck'], tempo: 4,
    phases: ['Glide your head back','Release'],
    steps: ['Sit tall with your back against the chair.','Glide your head straight back, as if making a double chin.','Release and repeat slowly.'],
    cues: ['Keep your eyes level','Stop if you feel tingling or sharp pain'],
    prop: 'chair',
    a: { hx: 122, hy: 152.5, p: 0, h: 0, t: 80, s: 0, a: 5.8, f: 32.4, hf: 16 },
    b: { hf: 0, hy: 152.5 } },

  { id: 'desk-rolls', name: 'Seated shoulder rolls', loads: ['shoulder','neck'], tempo: 4,
    phases: ['Lift and roll back','Lower and relax'],
    steps: ['Let your arms rest in your lap.','Lift your shoulders toward your ears, then roll them back and down.','Keep the circles slow and smooth.'],
    cues: ['Relax your jaw and neck','Roll the shoulders back, not just up'],
    prop: 'chair',
    a: { hx: 122, hy: 152.5, p: 0, h: 0, t: 80, s: 0, a: 5.8, f: 32.4, sh: 0 },
    b: { sh: 10, hy: 152.5 } },

  { id: 'desk-extension', name: 'Seated upper back extension', loads: ['upper-back','shoulder'], tempo: 5,
    phases: ['Lift your chest, lean back','Return upright'],
    steps: ['Place your hands behind your head, elbows wide.','Lift your chest and lean back gently over the top of the chair.','Return to upright and repeat.'],
    cues: ['Move from the upper back, not the lower back','Keep your ribs down'],
    prop: 'chair',
    a: { hx: 122, hy: 152.5, p: 6, h: 8, t: 80, s: 0, a: 125, f: -120, bend: -6, hf: 4 },
    b: { p: -8, bend: 7, h: -8, hf: 0, hy: 152.5 } },

  { id: 'desk-reach', name: 'Seated overhead reach', loads: ['shoulder'], tempo: 6,
    phases: ['Reach up, breathe in','Lower, breathe out'],
    steps: ['Sit tall with your feet flat on the floor.','Reach both arms overhead as you breathe in.','Lower them slowly as you breathe out.'],
    cues: ['Reach up before leaning back','Keep your shoulders away from your ears'],
    prop: 'chair',
    a: { hx: 122, hy: 152.5, p: 0, h: 0, t: 80, s: 0, a: 8, f: 8 },
    b: { a: 172, f: 176, p: -3, bend: 3, h: -5, hy: 152.5 } },

  { id: 'desk-legs', name: 'Seated leg extensions', loads: ['knee'], tempo: 4, sides: true,
    phases: ['Straighten the knee','Lower the foot'],
    steps: ['Sit tall near the front of the chair.','Straighten one knee until your leg is level, then lower it.','Switch legs halfway.'],
    cues: ['Keep your thigh resting on the seat','Stop if your knee feels pinched'],
    prop: 'chair',
    a: { hx: 122, hy: 152.5, p: 0, h: 0, t: 80, s: 0, a: 5.8, f: 32.4, t2: 80, s2: 0 },
    b: { t: 88, s: 86, hy: 152.5 } },

  { id: 'desk-march', name: 'Stand up and march', loads: ['hip','knee'], tempo: 4,
    phases: ['Lift one knee','Lift the other knee'],
    steps: ['Stand up from your chair, holding the desk if you need to.','Lift one knee at a time to about hip height.','Swing your arms and keep your back tall.'],
    cues: ['Stay tall and do not lean back','Land softly on each foot'],
    a: { t: 70, s: -15, t2: 0, s2: 0, a: -25, f: -25, a2: 25, f2: 25, hy: 114.5 },
    b: { t: 0, s: 0, t2: 70, s2: -15, a: 25, f: 25, a2: -25, f2: -25, hy: 114.5 } }
];