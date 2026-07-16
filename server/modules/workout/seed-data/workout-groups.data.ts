import {
  barbellBenchPress,
  inclineBarbellPress,
  inclineDumbbellPress,
  flatDumbbellPress,
  dumbbellFly,
  cableChestFly,
  overheadPressBarbell,
  dumbbellShoulderPress,
  dumbbellLateralRaise,
  frontRaise,
  tricepsPushdown,
  skullCrusher,
  dips,
  pushUps,
  diamondPushUps,
  pikePushUp,
  handstandPushUp,
  pullUp,
  chinUp,
  barbellRow,
  dumbbellRow,
  seatedCableRow,
  latPulldown,
  facePull,
  barbellCurl,
  dumbbellHammerCurl,
  invertedRow,
  deadlift,
  romanianDeadlift,
} from "./exercises-push-pull";

import {
  barbellBackSquat,
  frontSquat,
  legPress,
  hackSquat,
  bulgarianSplitSquat,
  walkingLunges,
  legCurl,
  legExtension,
  hipThrust,
  standingCalfRaise,
  gobletSquat,
  sumoDeadlift,
  pistolSquat,
  plank,
  sidePlank,
  hangingKneeRaise,
  hangingLegRaise,
  abWheelRollout,
  cableCrunch,
  russianTwist,
  deadBug,
  lSit,
  dragonFlag,
} from "./exercises-legs-core";

import {
  treadmillRun,
  cyclingStationary,
  rowingMachine,
  jumpRope,
  stairClimber,
  battleRopes,
  burpee,
  boxJump,
  mountainClimbers,
  jumpingJacks,
  kettlebellSwing,
  assaultBikeSprint,
  farmersCarry,
  turkishGetUp,
  sledPush,
  tireFlip,
  powerClean,
  hangClean,
  cleanAndJerk,
  snatch,
  powerSnatch,
} from "./exercises-conditioning";

import {
  hip9090Stretch,
  thoracicRotation,
  worldsGreatestStretch,
  couchStretch,
  catCow,
  deepSquatHold,
  muscleUp,
  frontLever,
  backLever,
  planche,
  humanFlag,
  handstandHold,
  australianPullUp,
  wideGripPullUp,
  closeGripPullUp,
  archerPullUp,
  oneArmPullUp,
  typewriterPullUp,
  commandoPullUp,
  straightBarDip,
  koreanDip,
  ringDip,
  ringPushUp,
  ringPullUp,
  deadHang,
  scapularPullUp,
  toesToBar,
  barMuscleUp,
  ringMuscleUp,
  chestToBarPullUp,
} from "./exercises-bodyweight";

export interface ExerciseSeedItem {
  name: string;
  description: string;
}

export interface WorkoutGroupSeed {
  workoutType: { name: string; description: string };
  exercises: ExerciseSeedItem[];
}

export const workoutGroups: WorkoutGroupSeed[] = [
  // ─── 1. PUSH DAY ─────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Push Day",
      description:
        "A resistance training session focused on horizontal and vertical pushing movements. " +
        "Primary muscles: chest, anterior deltoids, triceps. " +
        "Typically paired with Pull Day in a Push/Pull/Legs split. " +
        "Builds upper body pressing strength and hypertrophy. " +
        "Suitable for intermediate to advanced lifters training 3–6 days per week.",
    },
    exercises: [
      barbellBenchPress,
      inclineBarbellPress,
      inclineDumbbellPress,
      flatDumbbellPress,
      dumbbellFly,
      cableChestFly,
      overheadPressBarbell,
      dumbbellShoulderPress,
      dumbbellLateralRaise,
      frontRaise,
      tricepsPushdown,
      skullCrusher,
      dips,
      pushUps,
      diamondPushUps,
      pikePushUp,
      handstandPushUp,
      straightBarDip,
      ringDip,
      ringPushUp,
    ],
  },

  // ─── 2. PULL DAY ─────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Pull Day",
      description:
        "A resistance training session focused on horizontal and vertical pulling movements. " +
        "Primary muscles: latissimus dorsi, rhomboids, rear deltoids, biceps, forearms. " +
        "Complements Push Day by targeting the posterior upper body. " +
        "Builds back width, thickness, and arm strength. " +
        "Essential for postural balance and injury prevention in the shoulder girdle.",
    },
    exercises: [
      pullUp,
      chinUp,
      barbellRow,
      dumbbellRow,
      seatedCableRow,
      latPulldown,
      facePull,
      barbellCurl,
      dumbbellHammerCurl,
      invertedRow,
      deadlift,
      romanianDeadlift,
      australianPullUp,
      wideGripPullUp,
      closeGripPullUp,
      archerPullUp,
      typewriterPullUp,
      commandoPullUp,
      ringPullUp,
      chestToBarPullUp,
      deadHang,
      scapularPullUp,
    ],
  },

  // ─── 3. LEG DAY ──────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Leg Day",
      description:
        "A resistance training session dedicated entirely to the lower body. " +
        "Primary muscles: quadriceps, hamstrings, glutes, calves, hip flexors. " +
        "Incorporates squat, hinge, lunge, and isolation patterns. " +
        "The largest muscle groups in the body — stimulates the highest hormonal response of any training day. " +
        "Foundational for athletic performance, metabolism, and overall strength.",
    },
    exercises: [
      barbellBackSquat,
      frontSquat,
      legPress,
      hackSquat,
      bulgarianSplitSquat,
      walkingLunges,
      legCurl,
      legExtension,
      hipThrust,
      standingCalfRaise,
      gobletSquat,
      sumoDeadlift,
      romanianDeadlift,
      pistolSquat,
    ],
  },

  // ─── 4. UPPER BODY ───────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Upper Body",
      description:
        "A combined upper body session that includes both pushing and pulling movements in one workout. " +
        "Primary muscles: chest, back, shoulders, biceps, triceps. " +
        "Ideal for 2–3 day per week training splits where full upper body is hit per session. " +
        "Balances pushing and pulling volume to maintain shoulder health. " +
        "Efficient for intermediate lifters with limited training days.",
    },
    exercises: [
      barbellBenchPress,
      flatDumbbellPress,
      overheadPressBarbell,
      dumbbellShoulderPress,
      dumbbellLateralRaise,
      tricepsPushdown,
      pullUp,
      barbellRow,
      dumbbellRow,
      seatedCableRow,
      latPulldown,
      facePull,
      barbellCurl,
      dumbbellHammerCurl,
      australianPullUp,
      wideGripPullUp,
      closeGripPullUp,
    ],
  },

  // ─── 5. LOWER BODY ───────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Lower Body",
      description:
        "A combined lower body session covering quad-dominant, hip-hinge, and accessory leg work. " +
        "Primary muscles: quadriceps, hamstrings, glutes, calves, adductors. " +
        "Pairs with Upper Body sessions in a 2–4 day Upper/Lower split. " +
        "Develops leg strength symmetrically without the extreme volume of a dedicated Leg Day. " +
        "Well-suited for beginners and intermediates building a strength base.",
    },
    exercises: [
      barbellBackSquat,
      legPress,
      bulgarianSplitSquat,
      walkingLunges,
      legCurl,
      legExtension,
      hipThrust,
      standingCalfRaise,
      gobletSquat,
      romanianDeadlift,
    ],
  },

  // ─── 6. CORE ─────────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Core",
      description:
        "A targeted session for the muscles of the trunk — not just abs, but the full cylinder of core stability. " +
        "Primary muscles: rectus abdominis, obliques (internal and external), transverse abdominis, erector spinae, multifidus. " +
        "Trains anti-extension, anti-rotation, anti-lateral-flexion, and flexion patterns. " +
        "Reduces lower back injury risk and directly improves performance in every other lift. " +
        "Can be standalone or added as a finisher to any session.",
    },
    exercises: [
      plank,
      sidePlank,
      hangingKneeRaise,
      hangingLegRaise,
      abWheelRollout,
      cableCrunch,
      russianTwist,
      deadBug,
      lSit,
      dragonFlag,
      toesToBar,
    ],
  },

  // ─── 7. FULL BODY ────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Full Body",
      description:
        "A training session that hits all major muscle groups — upper, lower, and core — in one workout. " +
        "Built around large compound movements: squat, hinge, push, pull, carry. " +
        "Maximises training frequency per muscle group when sessions are limited to 2–3 per week. " +
        "High caloric expenditure and hormonal response make it effective for fat loss and strength simultaneously. " +
        "Ideal for beginners, athletes, and anyone with a busy schedule.",
    },
    exercises: [
      barbellBackSquat,
      deadlift,
      barbellBenchPress,
      overheadPressBarbell,
      barbellRow,
      pullUp,
      gobletSquat,
      farmersCarry,
      plank,
    ],
  },

  // ─── 8. HIIT ─────────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "HIIT",
      description:
        "High-Intensity Interval Training — alternating short bursts of maximal effort with brief rest periods. " +
        "Typical structure: 20–40 seconds of work, 10–20 seconds of rest, 4–8 rounds per exercise. " +
        "Elevates heart rate to 80–95% of max, creating a strong EPOC (afterburn) effect. " +
        "Burns fat efficiently in 20–30 minutes and improves cardiovascular capacity rapidly. " +
        "Movements are primarily bodyweight or light load — no heavy barbell work.",
    },
    exercises: [
      burpee,
      boxJump,
      mountainClimbers,
      jumpingJacks,
      kettlebellSwing,
      assaultBikeSprint,
      jumpRope,
      battleRopes,
    ],
  },

  // ─── 9. CARDIO ───────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Cardio",
      description:
        "Steady-state aerobic training performed at a sustained, moderate intensity for an extended duration. " +
        "Target heart rate zone: 60–75% of max heart rate. " +
        "Primary adaptations: improved VO2 max, cardiac output, fat oxidation, and aerobic base. " +
        "Includes running, cycling, rowing, and elliptical at consistent pace. " +
        "Foundational for recovery, endurance, heart health, and long-term fat management.",
    },
    exercises: [
      treadmillRun,
      cyclingStationary,
      rowingMachine,
      jumpRope,
      stairClimber,
      battleRopes,
      assaultBikeSprint,
    ],
  },

  // ─── 10. CALISTHENICS ────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Calisthenics",
      description:
        "Bodyweight strength and skill training using the body as the sole resistance tool. " +
        "Progresses from basic push/pull movements to advanced holds, levers, and dynamic skills. " +
        "Builds functional strength, body control, balance, and joint stability simultaneously. " +
        "Requires no equipment — can be performed anywhere with a pull-up bar and floor space. " +
        "Skill-based progressions (planche, front lever, muscle-up) provide long-term goals that keep training engaging.",
    },
    exercises: [
      pullUp,
      chinUp,
      dips,
      pushUps,
      diamondPushUps,
      pikePushUp,
      handstandPushUp,
      invertedRow,
      pistolSquat,
      hangingKneeRaise,
      hangingLegRaise,
      lSit,
      dragonFlag,
      muscleUp,
      frontLever,
      backLever,
      planche,
      humanFlag,
      handstandHold,
      australianPullUp,
      wideGripPullUp,
      closeGripPullUp,
      archerPullUp,
      oneArmPullUp,
      typewriterPullUp,
      commandoPullUp,
      straightBarDip,
      koreanDip,
      ringDip,
      ringPushUp,
      ringPullUp,
      deadHang,
      scapularPullUp,
      toesToBar,
      barMuscleUp,
      ringMuscleUp,
      chestToBarPullUp,
    ],
  },

  // ─── 11. MOBILITY ────────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Mobility",
      description:
        "A structured session targeting active range of motion, joint health, and movement quality. " +
        "Distinct from passive stretching — mobility training builds strength through full ranges of motion. " +
        "Addresses common restrictions: hip flexors, thoracic spine, ankle dorsiflexion, shoulder internal rotation. " +
        "Reduces injury risk, improves posture, and directly enhances performance in strength and skill training. " +
        "Recommended as a daily practice or active recovery session.",
    },
    exercises: [
      hip9090Stretch,
      thoracicRotation,
      worldsGreatestStretch,
      couchStretch,
      catCow,
      deepSquatHold,
      deadHang,
      scapularPullUp,
    ],
  },

  // ─── 12. FUNCTIONAL ──────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Functional",
      description:
        "Training that replicates and reinforces real-world movement patterns: squat, hinge, lunge, push, pull, carry, rotate. " +
        "Emphasises multi-joint, multi-planar movements over isolated single-muscle exercises. " +
        "Uses barbells, dumbbells, kettlebells, sleds, and bodyweight in combination. " +
        "Develops strength that transfers directly to sport, daily life, and injury resilience. " +
        "Highly effective for athletes and anyone wanting practical, usable strength.",
    },
    exercises: [
      farmersCarry,
      turkishGetUp,
      sledPush,
      tireFlip,
      kettlebellSwing,
      gobletSquat,
      walkingLunges,
      australianPullUp,
      commandoPullUp,
    ],
  },

  // ─── 13. OLYMPIC LIFTING ─────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Olympic Lifting",
      description:
        "Technical barbell sport comprising the Snatch and the Clean & Jerk, plus their derivatives. " +
        "Develops explosive power, coordination, timing, and full-body athleticism simultaneously. " +
        "Requires significant technical coaching — movement quality is non-negotiable before adding load. " +
        "Trains the entire posterior chain, shoulders, and core through high-velocity contractions. " +
        "Used by sprinters, jumpers, and power athletes worldwide for performance enhancement.",
    },
    exercises: [powerClean, hangClean, cleanAndJerk, snatch, powerSnatch, frontSquat],
  },

  // ─── 14. POWERLIFTING ────────────────────────────────────────────────────────
  {
    workoutType: {
      name: "Powerlifting",
      description:
        "Strength sport built on three barbell movements: Squat, Bench Press, and Deadlift. " +
        "Training focuses on maximising one-rep max strength through progressive overload and periodisation. " +
        "Develops the highest levels of absolute strength of any training modality. " +
        "Requires careful programming of intensity, volume, and recovery. " +
        "Suitable for intermediate to advanced athletes with solid movement foundations.",
    },
    exercises: [
      barbellBackSquat,
      barbellBenchPress,
      deadlift,
      sumoDeadlift,
      inclineBarbellPress,
      overheadPressBarbell,
      barbellRow,
    ],
  },

  // ─── 15. CROSSFIT / WOD ──────────────────────────────────────────────────────
  {
    workoutType: {
      name: "CrossFit / WOD",
      description:
        "Constantly varied, high-intensity functional fitness combining gymnastics, weightlifting, and metabolic conditioning. " +
        "Workout of the Day (WOD) format challenges strength, endurance, power, and mental toughness simultaneously. " +
        "Includes movements from Olympic lifting, calisthenics, cardio, and functional training. " +
        "Community-driven and competitive — workouts are scored by time, rounds, or reps. " +
        "Develops broad, general physical preparedness across all fitness domains.",
    },
    exercises: [
      powerClean,
      powerSnatch,
      toesToBar,
      barMuscleUp,
      ringMuscleUp,
      chestToBarPullUp,
      burpee,
      boxJump,
      kettlebellSwing,
      pullUp,
      pushUps,
      deadlift,
      barbellBackSquat,
      overheadPressBarbell,
    ],
  },
];
