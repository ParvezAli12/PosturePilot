# PosturePilot

Posture-correction exercise website. Plain HTML, CSS and JavaScript, no build step.
Open `index.html` in a browser (or host the folder anywhere).

## Structure
```
posture-pilot/
  index.html        landing page with animated intro
  intake.html       4-step form: body details, concerns, injuries, safety check
  plan.html         personalised plan + session player (animations, rep counter, hold timer)
  css/styles.css    design tokens and layout
  js/exercises.js   exercise library, concerns, injuries, red flags   <- edit this to add exercises
  js/planner.js     plan generator (age, BMI, concerns, injury filtering)
  js/figure.js      stick-figure animation engine (poses are angles)
  js/intake.js      intake form logic
  js/plan.js        plan page + session player
  js/home.js        landing page intro
  js/storage.js     localStorage helper (profile, completed sessions)
```

## How injury filtering works
Each exercise lists the body areas it loads (`loads`). Each injury lists the areas it blocks (`blocks`).
Any exercise whose `loads` overlap a blocked area is removed before the plan is built.

## Notes
- The exercise library is a starter set. Have a physiotherapist review it before public release.
- Animations are side-view only. Exercises that need a front view (side bends, lateral raises) are not included yet.
