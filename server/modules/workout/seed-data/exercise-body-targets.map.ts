import { ENUM_SYSTEM_BODY_TARGET } from "./body-target.enum";

export type BodyTargetEntry = {
  bodyTarget: ENUM_SYSTEM_BODY_TARGET;
  percentage: number;
};

export const EXERCISE_BODY_TARGETS: Record<string, BodyTargetEntry[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PUSH EXERCISES (17)
  // ═══════════════════════════════════════════════════════════════════════════

  "Barbell Bench Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
  ],
  "Incline Barbell Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
  ],
  "Incline Dumbbell Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Flat Dumbbell Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
  ],
  "Dumbbell Fly": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  "Cable Chest Fly": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  "Overhead Press (Barbell)": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],
  "Dumbbell Shoulder Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
  ],
  "Dumbbell Lateral Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 15 },
  ],
  "Front Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
  ],
  "Triceps Pushdown": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
  ],
  "Skull Crusher": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  Dips: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 25 },
  ],
  "Push-ups": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],
  "Diamond Push-ups": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],
  "Pike Push-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 5 },
  ],
  "Handstand Push-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL EXERCISES (12)
  // ═══════════════════════════════════════════════════════════════════════════

  "Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "Chin-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "Barbell Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
  ],
  "Dumbbell Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Seated Cable Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 15 },
  ],
  "Lat Pulldown": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "Face Pull": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
  ],
  "Barbell Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
  ],
  "Dumbbell Hammer Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 50 },
  ],
  "Inverted Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 15 },
  ],
  Deadlift: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Romanian Deadlift": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 20 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // LEG EXERCISES (13)
  // ═══════════════════════════════════════════════════════════════════════════

  "Barbell Back Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],
  "Front Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 10 },
  ],
  "Leg Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
  ],
  "Hack Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 65 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 10 },
  ],
  "Bulgarian Split Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 10 },
  ],
  "Walking Lunges": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Leg Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 15 },
  ],
  "Leg Extension": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 100 },
  ],
  "Hip Thrust": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Standing Calf Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 100 },
  ],
  "Goblet Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 10 },
  ],
  "Sumo Deadlift": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ADDUCTORS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
  ],
  "Pistol Squat": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BALANCE, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE EXERCISES (10)
  // ═══════════════════════════════════════════════════════════════════════════

  Plank: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 10 },
  ],
  "Side Plank": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
  ],
  "Hanging Knee Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Hanging Leg Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Ab Wheel Rollout": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],
  "Cable Crunch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 80 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 20 },
  ],
  "Russian Twist": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 10 },
  ],
  "Dead Bug": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 25 },
  ],
  "L-Sit": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],
  "Dragon Flag": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CARDIO EXERCISES (6)
  // ═══════════════════════════════════════════════════════════════════════════

  "Treadmill Run": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 5 },
  ],
  "Cycling (Stationary)": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 10 },
  ],
  "Rowing Machine": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],
  "Jump Rope": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BALANCE, percentage: 10 },
  ],
  "Stair Climber": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 5 },
  ],
  "Battle Ropes": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // HIIT EXERCISES (6)
  // ═══════════════════════════════════════════════════════════════════════════

  Burpee: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 10 },
  ],
  "Box Jump": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 15 },
  ],
  "Mountain Climbers": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  "Jumping Jacks": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ADDUCTORS, percentage: 10 },
  ],
  "Kettlebell Swing": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Assault Bike Sprint": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 5 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCTIONAL EXERCISES (4)
  // ═══════════════════════════════════════════════════════════════════════════

  "Farmer's Carry": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
  ],
  "Turkish Get-Up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BALANCE, percentage: 10 },
  ],
  "Sled Push": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 10 },
  ],
  "Tire Flip": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // OLYMPIC LIFTING EXERCISES (5)
  // ═══════════════════════════════════════════════════════════════════════════

  "Power Clean": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Hang Clean": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Clean & Jerk": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 10 },
  ],
  Snatch: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
  ],
  "Power Snatch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILITY EXERCISES (6)
  // ═══════════════════════════════════════════════════════════════════════════

  "Hip 90/90 Stretch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
  ],
  "Thoracic Rotation": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 10 },
  ],
  "World's Greatest Stretch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 15 },
  ],
  "Couch Stretch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 15 },
  ],
  "Cat-Cow": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
  ],
  "Deep Squat Hold": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 15 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CALISTHENICS SKILL EXERCISES (6)
  // ═══════════════════════════════════════════════════════════════════════════

  "Muscle-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 15 },
  ],
  "Front Lever": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
  ],
  "Back Lever": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 20 },
  ],
  Planche: [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
  ],
  "Human Flag": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Handstand Hold": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BALANCE, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // BAR & RING EXERCISES (18)
  // ═══════════════════════════════════════════════════════════════════════════

  "Australian Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 15 },
  ],
  "Wide Grip Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 65 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "Close Grip Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 50 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],
  "Archer Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "One-Arm Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Typewriter Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],
  "Commando Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],
  "Straight Bar Dip": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],
  "Korean Dip": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 10 },
  ],
  "Ring Dip": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
  ],
  "Ring Push-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
  ],
  "Ring Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],
  "Dead Hang": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 15 },
  ],
  "Scapular Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 25 },
  ],
  "Toes to Bar": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 10 },
  ],
  "Bar Muscle-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 15 },
  ],
  "Ring Muscle-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 15 },
  ],
  "Chest to Bar Pull-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 10 },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSORY / MACHINE / ISOLATION (33) — each list sums to 100
  // ═══════════════════════════════════════════════════════════════════════════
  "Decline Barbell Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 80 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 12 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 8 },
  ],
  "Machine Chest Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 75 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 13 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 12 },
  ],
  "Pec Deck": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 88 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 12 },
  ],
  "Cable Crossover": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  "T-Bar Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 5 },
  ],
  "Pendlay Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 5 },
  ],
  "Straight-Arm Pulldown": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 80 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 12 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 8 },
  ],
  "Barbell Shrug": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 5 },
  ],
  "Arnold Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
  ],
  "Cable Lateral Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 5 },
  ],
  "Reverse Pec Deck": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.UPPER_BACK, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 10 },
  ],
  "Upright Row": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_LATERAL, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 12 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 8 },
  ],
  "Preacher Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 88 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 12 },
  ],
  "Cable Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
  ],
  "Concentration Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 90 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 10 },
  ],
  "Incline Dumbbell Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 15 },
  ],
  "Reverse Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FOREARMS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 45 },
  ],
  "Overhead Triceps Extension": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 90 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],
  "Close-Grip Bench Press": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  "Bench Dip": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 10 },
  ],
  "Seated Leg Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 90 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 10 },
  ],
  "Glute Bridge": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 70 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
  ],
  "Good Morning": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 5 },
  ],
  "Dumbbell Step-up": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 15 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 5 },
  ],
  "Nordic Hamstring Curl": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 80 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 12 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 8 },
  ],
  "Seated Calf Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 95 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 5 },
  ],
  "Hip Adduction (Machine)": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ADDUCTORS, percentage: 90 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 10 },
  ],
  "Hip Abduction (Machine)": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 85 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 15 },
  ],
  "Bicycle Crunch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 35 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 10 },
  ],
  "Crunch": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 80 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 20 },
  ],
  "Lying Leg Raise": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 55 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 30 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
  ],
  "Hollow Body Hold": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 45 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 40 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 15 },
  ],
  "Cable Woodchopper": [
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 60 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 25 },
    { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
  ],
};
