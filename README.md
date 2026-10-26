# PosturePilot

**A posture routine that works around your injuries.** PosturePilot builds a timed daily exercise plan from your age, build, posture problems and injuries, adapts it from your own pain ratings, and guides you through it on a full-screen workout timer.

**Live site:** https://YOUR-USERNAME.github.io/posture-pilot/

![PosturePilot landing page](docs/screenshots/01-landing.png)

<!-- Optional: add one or two cited sources on how common neck and back pain are among students and desk workers. -->

## The problem

People who sit for long hours often end up with a stiff neck, rounded shoulders or an aching lower back. Free exercise videos and lists are easy to find, but they have three weaknesses:

1. **They ignore the person.** The same routine is given to a teenager and to a 65-year-old.
2. **They ignore injuries.** Someone with a sore knee is told to do squats.
3. **They never adapt.** Nothing changes if an exercise hurts or if the routine has become too easy.

PosturePilot addresses these three gaps with a small set of readable rules rather than a black box.

## Who it is for

Students and desk workers with everyday posture aches who want a short, safe routine. It is **not** a diagnosis tool and not for pain that follows an injury or needs a clinician (see [Limitations](#limitations)).

## What it does

| Feature | What you get |
|---|---|
| **Personal plan** | Answer four short steps (build, problems, injuries, safety check) and get a routine of 4 to 8 exercises, each with an animated demo and a "why this exercise" explanation. |
| **Injury filter** | Mark an injured area and every exercise that loads it disappears from your plan. |
| **Pain-aware** | After each workout you rate your pain. The next plan gets lighter, stays the same or builds up slowly. |
| **Guided workout** | A full-screen, timed session with sound cues. It starts each exercise and rest by itself. |
| **Desk break** | A two-minute routine, mostly done from a chair, that you can start from the landing page. |
| **Reminders** | Pick a time for a daily workout or for desk breaks through the day. |
| **Progress** | Streaks, a five-week calendar, a pain trend, and backup and restore of your data. |
| **Saved on your device** | Your plan comes back every time you open the site. No account is needed. |

![The injury filter with a knee injury selected](docs/screenshots/02-injury-filter.png)

## How it works

### The injury filter

The library has **30 exercises**. Each one records the body areas it puts load on (`loads`), such as `knee`, `shoulder` or `lower-back`. Each injury option records the areas it blocks. Building a plan is then a simple rule:

> Remove any exercise whose `loads` overlap an injured area.

Examples: a knee injury removes the wall sit and marching in place; a leg injury also removes hip and ankle exercises. If nothing safe is left for a problem you selected, the plan says so and points you to a doctor or physiotherapist instead of guessing.

Other rules in the plan builder:

- Age 65 or over, or a BMI of 35 or more: only the gentler exercises (levels 1 and 2).
- Age 60 or over, under 16, or a BMI of 30 or more: about 25% shorter holds and workouts, and fewer exercises per problem.
- Each problem gets a balanced mix: the best warm-up, the best stretch and the best strength move.

### Safety check

Before any plan is built the form asks about numbness or tingling, pain after an accident, recent surgery or a healing fracture, chest pain or dizziness, and severe pain at night. A "yes" to any of them stops the process and recommends seeing a clinician first.

### Pain rules

After each workout you rate your pain from 0 to 10 and can mark any exercise that hurt.

| Rule | Trigger | Effect on the next plan |
|---|---|---|
| R1 | Last pain 8 or higher | Load cut to 50%, with advice to stop and see a professional |
| R2 | Last pain 6 or higher, or a rise of 2 or more that reaches at least 4 | Load cut to 75% |
| R3 | Last 3, 6 or 9 sessions all at pain 3 or lower | Load up 10%, 20% or 30% (the maximum) |
| R4 | An exercise marked "this hurt" | Paused until you restore it |

The rules are written in `js/planner.js` so they can be read, reviewed and tested.

### Guided workout

![The full-screen workout](docs/screenshots/03-workout.png)

The workout opens on its own screen with everything visible, so there is no scrolling mid-exercise. By default each exercise runs about **a minute** with a **30-second rest**, then the next exercise starts automatically. After the last one it begins round two. You can change the exercise time (30 to 90 seconds), the rest (15 to 60 seconds) and the number of rounds (1 to 3) before starting.

The screen coaches you through each exercise: it says **Hold** or **Relax** and counts the seconds, tells you when to **switch sides**, and beeps at transitions. You can pause, skip or add 15 seconds of rest, and the screen stays awake on supported phones.

### Desk break

![The desk break](docs/screenshots/04-desk-break.png)

Six moves of about 20 seconds each, about two minutes in total: seated chin tuck, shoulder rolls, upper back extension, overhead reach, leg extensions, then standing up to march. Moves that use an area you marked as injured are left out, and the rest get a little longer so the break still takes about two minutes.

### Reminders

A website cannot wake itself up when it is closed, and PosturePilot does not pretend otherwise. Reminders work in three ways:

- **While the site is open:** an on-page card, or a pop-up notification if the tab is in the background and you allowed notifications.
- **When you come back late:** one catch-up reminder if your workout time has passed and you have not trained.
- **When the site is closed:** the Reminders page creates a calendar file (`.ics`) for your workout or for desk breaks through the day. Your phone's calendar then does the reminding.

### Saved data

Everything is stored in your browser (`localStorage`). Nothing is sent to a server. The Progress panel has **Download backup** and **Restore from file** so you do not lose your history if you clear site data or change phones.

## Design decisions

- **Rules, not machine learning.** Safety advice has to be explainable, so every choice the plan makes can be traced to a rule you can read. The plan page shows the reasons for each exercise.
- **The plumb line.** Posture is judged against a vertical line through the ear, shoulder, hip and knee. The landing page's slider uses exactly that line, and the logo is the same mark.
- **Animation without video.** The demos are drawn by a small SVG engine. Each pose is a set of joint angles and every bone has a fixed length, so limbs cannot stretch or detach. The figure rests on the floor in every frame.
- **Privacy by default.** No accounts, no tracking, and no server for your data.
- **Light and dark themes**, switched with a sun and moon button, and the system's "reduce motion" setting is respected.

## Tech and structure

Plain HTML, CSS and JavaScript. No framework and no build step. Open `index.html` in a browser.

```
index.html     landing page
intake.html    four-step questionnaire
plan.html      saved plan, guided workout, progress
desk.html      two-minute desk break
reminders.html reminder settings
css/           styles, landing, workout, extras
js/
  exercises.js   the exercise library, problems, injuries, safety questions
  planner.js     plan builder: injury filter, intensity rules, pain rules
  figure.js      stick-figure animation engine
  plan.js        plan page and the guided workout
  workout-data.js timing details for each exercise
  progress.js    streaks, calendar, backup and restore
  desk-data.js, desk.js   the desk break
  notify.js, reminders.js reminders and calendar files
  home.js, intake.js, returning.js, storage.js, theme.js
reminder-sw.js   tiny service worker so notifications work on phones
```

Fonts are Archivo, Public Sans and IBM Plex Mono, all under the SIL Open Font License.

## Testing

The plan builder and the animation geometry have automated checks that run with Node.js and need no packages:

```
node tests/planner.test.js   # 27 checks
node tests/figure.test.js    # 9 checks
```

The most important one generates **21,504 plans** (every combination of injury areas, posture problems, ages and weights) and fails if any plan contains an exercise that loads an injured area. The animation checks confirm that bone lengths never change, the head stays attached, nothing leaves the frame, and the body always rests on the floor.

## Limitations

- **Not medical advice.** PosturePilot gives general exercise guidance. It does not diagnose, treat or replace a doctor or physiotherapist.
- **Not clinically validated.** The exercise library and the pain rules are conservative design choices. They have not been reviewed by a physiotherapist.
- **Pain is self-reported**, so the plan can only respond to what you tell it.
- **Side-view animations only.** Moves that need a front view (side bends, lateral raises) are not included yet.
- **Data lives in one browser.** There is no syncing between devices. Use the backup file to move your data.
- **Reminders need the site or your calendar.** A website cannot send alerts while closed. On iPhone, web notifications only work for installed apps, so the calendar option is the way to go there.
- **Not an installable offline app yet.**

## Evaluation plan

- [ ] Have a physiotherapist review the exercises, the injury tags, the pain rules and the safety questions.
- [ ] Run a small usability trial with 5 to 10 people. Measure the time to get a plan, whether the "why this exercise" notes make sense, and whether any plan felt unsuitable.
- [ ] Optionally collect before and after pain ratings from willing volunteers over two weeks.

Results will be added here once the trial is done.

## Future work

Installable offline app, more exercises (neck, wrist, ankle), front-view animations, an Urdu version, and optional accounts so progress syncs across devices.

## Author

Built by Parvez Ali.