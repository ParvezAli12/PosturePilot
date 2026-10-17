# PosturePilot

A web app that builds a short, safe daily posture-correction routine for each user, based on their
age, height, weight, posture problems and injuries, and then adapts the routine from the user's own
pain feedback.

## 1. Problem

Many students and desk workers develop posture-related discomfort: forward head, rounded or uneven
shoulders, upper and lower back pain. Generic exercise videos and lists are easy to find but have
three weaknesses:

1. **They ignore the person.** The same routine is given to a teenager and a 65-year-old.
2. **They ignore injuries.** Someone with a knee problem is told to do squats.
3. **They never learn.** Nothing changes if the exercises cause pain, or if they are too easy.

PosturePilot addresses these three gaps.

> Background: add 2 or 3 cited sources here on how common neck and back pain are among students
> and desk workers in Pakistan or worldwide (for example WHO or peer-reviewed prevalence studies).

## 2. Objectives

- Choose exercises that match the user's concerns, age and body size.
- **Never** include an exercise that loads an area the user has marked as injured.
- Explain every choice in plain language.
- Adjust the amount of exercise using the user's own pain ratings.
- Stop and refer to a professional when warning signs appear.

## 3. How it works

```
Landing page ──► Intake form ──► Safety screen ──► Plan generator ──► Session player ──► Pain check-in
                 age, height,     red-flag         (rules below)      animated demo,        │
                 weight,          questions                           rep counter,          │
                 concerns,        (stop if any)                       hold timer            │
                 injuries                                                                   │
                                                  ◄──────── adapts next plan ◄──────────────┘
```

**Data model.** Each exercise is a record in `js/exercises.js`: which problems it helps (`concerns`),
which body areas it puts load on (`loads`), difficulty level, phase (warm-up, stretch, strength),
sets, reps or hold time, steps, cues and its animation poses. Each injury option lists the areas it
blocks. Adding an exercise means adding one record, with no code changes.

### Selection rules (`js/planner.js`)

| # | Rule |
|---|------|
| S1 | Remove any exercise whose `loads` overlap an injured area. |
| S2 | Remove exercises the user has paused because they hurt. |
| S3 | For age 65+ or BMI 35+, allow only levels 1 and 2. |
| S4 | For age 60+, under 16, or BMI 30+, use 75% of the standard reps and holds, and fewer exercises per problem. |
| S5 | For each selected problem, take the gentlest, most broadly useful safe exercises, ordered warm-up, stretch, strength. |
| S6 | If nothing safe remains for a problem, say so and refer the user to a doctor or physiotherapist. |

### Adaptation rules (pain check-in after each session, 0 to 10)

| # | Trigger | Effect |
|---|---------|--------|
| R1 | Last pain 8 or higher | Load cut to 50%. Advise stopping and seeing a professional. |
| R2 | Last pain 6 or higher, or a rise of 2+ that reaches at least 4 | Load cut to 75%. |
| R3 | Last 3, 6 or 9 sessions all at pain 3 or lower | Load up 10%, 20% or 30% (cap). |
| R4 | The user marks an exercise as hurting | It is removed until the user restores it. |

### Safety screen

Before any plan is built the user is asked about numbness or tingling, pain after an accident,
recent surgery or fracture, chest pain or dizziness, and severe night pain. A yes to any of them stops
the process and recommends seeing a professional.

## 4. Testing

`node tests/planner.test.js` runs 27 automated checks with no dependencies:

- **Data integrity:** every exercise has the required fields, ids are unique, and every loaded
  body area can be blocked by some injury option.
- **Safety:** a leg injury removes all leg exercises, a shoulder injury removes shoulder
  exercises, and an exhaustive check over 21,504 generated plans (every combination of injuries,
  problems, ages and weights) confirms none contains an exercise that loads an injured area.
- **Personalisation:** older users get reduced amounts, hard exercises are excluded for high-risk
  profiles, doses are never zero, and every item has an explanation.
- **Adaptation:** each of R1 to R4 is tested, including the +30% cap and a pain spike resetting the
  low-pain run.

## 5. Limitations

- PosturePilot gives general exercise guidance. It does not diagnose, treat or replace a doctor
  or physiotherapist.
- Pain ratings are self-reported. The rules are deliberately conservative but have not been
  clinically validated.
- Animations are side-view stick figures. Exercises needing a front view (side bends, lateral
  raises) are not included yet.
- Data is stored only in the user's browser (`localStorage`). Clearing site data erases history.
- The exercise library is a starter set and should be reviewed by a qualified physiotherapist
  before public release.

## 6. Evaluation plan

1. Have a physiotherapist review the exercise library, injury tags and safety questions.
2. Run a small usability trial (5 to 10 participants). Measure the time to get a plan, whether people
   understood the "why this exercise" notes, and whether any plan felt unsuitable.
3. Optionally collect before and after pain ratings over two weeks from willing volunteers.

(Record the results in this section once the trial is done.)

## 7. Future work

- Front-view animations and more exercises (neck, wrist, hip flexor).
- Desk-break reminders every 45 minutes with a one-minute routine.
- A guided posture self-check (wall test, mirror test) to suggest problems.
- Optional accounts so progress syncs across devices.
- Urdu language support.

## 8. Run it

Open `index.html` in a browser. No build step and no dependencies.

```
posture-pilot/
  index.html, intake.html, plan.html
  css/   styles.css, landing.css
  js/    exercises.js  planner.js  figure.js  intake.js  plan.js  home.js  storage.js  theme.js
  tests/ planner.test.js
```