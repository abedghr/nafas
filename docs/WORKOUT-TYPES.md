# Nafas — Workout Types & Concepts

A complete reference for every workout building block in Nafas, with a plain
definition (acronyms spelled out) and a concrete scenario for each. The same
taxonomy backs the in-app help sheet (`components/WorkoutGuideSheet.tsx`).

The model has three layers:

1. **Set types** — how a single set is measured/counted.
2. **Block types** — what one row in the workout is (a single exercise, a combo, or an interval block).
3. **Combo modes** — how a combo block is paced.

Plus a set of shared concepts (rounds, rest, volume, RPE, tempo, etc.).

---

## Layer 1 — Set types (how a single set is counted)

### Reps
Do a number of repetitions, with optional weight.
- **Scenario:** Bench Press, 10 reps at 60 kg. Hit the green check when done.
- **Volume** for the set = reps x weight (600 kg here). Bodyweight = leave weight empty.
- **Config:** reps, weight (optional).

### Hold
An isometric hold for a number of seconds — no reps. The app runs a countdown.
- **Scenario:** Plank for 60 s, or a 90-degree Dip Hold for 20 s.
- **Variant — to failure / max hold:** counts up until you stop, instead of a fixed target.
- **Config:** duration (seconds), weight (optional), to-failure flag.

### EMOM (Every Minute On the Minute) — single exercise
At the start of each interval you do a fixed number of reps, then rest whatever
time is left in the interval, and repeat for a set number of intervals.
- **Scenario:** 5 Pull-ups every 60 s for 10 intervals. Minute 1: do 5 pull-ups (say it takes 20 s), rest 40 s. Minute 2: 5 more, rest. Total = 50 pull-ups in 10 minutes.
- **Config:** reps-per-interval, interval seconds (default 60), total intervals. Each minute's reps can also be customised.

### Distance
A distance target — laps, km, miles or metres — with optional added weight.
- **Scenario:** Run 2 laps, or a 1 km row. Farmer carry 40 m at 20 kg (weighted).
- **Config:** value, unit (lap / km / mi / m), weight (optional).

### Calories
A calorie target on a cardio machine (bike, rower, ski-erg), with optional added weight.
- **Scenario:** Assault bike for 60 cal.
- **Config:** calories, weight (optional).

---

## Layer 2 — Block types (what one row in the workout is)

### Exercise
One movement with its own sets. Each set is one of the Layer 1 types above.
- **Scenario:** Squat — set 1 x 8, set 2 x 8, set 3 x 6.

### Combo
Several movements chained together and treated as one unit (a superset /
circuit). It has a **mode** (see below) and a list of component moves. Each move
carries its own set type (reps / hold / EMOM).
- **Scenario:** "Pull-up + Dip + Push-up" done back-to-back.

### Intervals
A cardio work / recovery block (running, bike, rowing). Not sets. It is: a work
effort, an optional recovery, repeated for a number of rounds.
- **Scenario (by distance):** Run 400 m hard, then jog 200 m easy, x 8.
- **Scenario (by time):** 3:00 hard / 1:30 easy, x 4.
- **Config:** work (time or distance, optional target pace), recovery (time or distance, active or passive), rounds.

---

## Combo modes (only for a Combo block)

A combo's mode decides how the chained moves are paced.

### Circuit
Do each move once in sequence = one round. Rest, then repeat for R rounds.
- **Scenario:** 3 rounds of 10 Pull-ups + 15 Dips + 20 Push-ups.

### EMOM (combo)
The combo is paced by the clock: start the next round each minute, rest the
remainder of the minute.
- **Scenario:** Every minute: 5 Thrusters + 5 Burpees, for 10 minutes.

### AMRAP (As Many Rounds As Possible)
A fixed time cap. Do as many full rounds of the combo as you can; you count
completed rounds.
- **Scenario:** 10-minute AMRAP of 5 Pull-ups + 10 Push-ups + 15 Squats.

### Unbroken (flag)
A flag on a combo: do all moves in a round with no rest and without putting the
weight down.
- **Scenario:** Unbroken set of Curl + Press + Row — no rest until the round ends.

### Uneven sets (circuit only)
Each move in a circuit can have its own set count, up to the combo's round
count. A move with fewer sets does them first (front-loaded), then sits out the
later rounds. EMOM/AMRAP stay uniform (the clock cycles every move), so uneven
sets apply to circuit only.
- **Scenario:** Bench x4 / Pull-up x2 over 4 rounds. Rounds 1-2: both moves. Rounds 3-4: bench only. Bench logs 4 sets, pull-up logs 2.

---

## Shared concepts

| Term | Definition |
|---|---|
| **Round** | One pass through a combo (or one work/recovery cycle in an interval block). For a combo, a round = a set of the whole combo. |
| **Set** | One execution of an exercise's target (of any Layer 1 type). |
| **Rest** | Timed rest between sets/rounds; the app can auto-start a rest countdown. |
| **Volume** | Total work = sum of reps x weight across done sets. Only reps sets contribute (hold/distance/calories count as completed sets, not volume). |
| **To failure** | Do a set until you can't continue, instead of a fixed target. |
| **Tempo** | The speed of a rep, written as four counts (e.g. 3/1/2/0 = 3 s down, 1 s pause, 2 s up, 0 s pause). |
| **RPE (Rate of Perceived Exertion)** | A 1-10 difficulty rating for a set. |
| **Assist** | Assistance used (band, machine) noted on a set. |
| **Pre-workout** | An optional flag recording whether a pre-workout supplement was taken for the session. |

---

## How a set is logged

- **Reps:** contributes reps and volume (reps x weight).
- **Hold:** logged as a completed set with its duration; no volume.
- **EMOM:** logged as reps-per-interval x intervals.
- **Distance / Calories:** logged as a completed set with the value + unit; no volume. Added weight is recorded.
- **Combo:** on finish, expands into one logged exercise per component; each round it participated in becomes one set. Uneven-sets moves log only the rounds they were in.
