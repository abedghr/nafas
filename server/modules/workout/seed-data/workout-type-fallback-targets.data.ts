import { ENUM_SYSTEM_BODY_TARGET } from "./body-target.enum";
import { BodyTargetEntry } from "./exercise-body-targets.map";

export const WORKOUT_TYPE_FALLBACK_TARGETS: Record<string, BodyTargetEntry[]> =
  {
    "Push Day": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 50 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 25 },
    ],
    "Pull Day": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 40 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.MID_BACK, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_POSTERIOR, percentage: 15 },
    ],
    "Leg Day": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 35 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 10 },
    ],
    "Upper Body": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.BICEPS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
    ],
    "Lower Body": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 35 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 30 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 10 },
    ],
    "Core": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 40 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 30 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.OBLIQUES, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 10 },
    ],
    "Full Body": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
    ],
    "HIIT": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 50 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 15 },
    ],
    "Cardio": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 70 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CALVES, percentage: 15 },
    ],
    "Mobility": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.FLEXIBILITY, percentage: 65 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HIP_FLEXORS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 15 },
    ],
    "Calisthenics": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_ABS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
    ],
    "Functional": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CORE_DEEP, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 15 },
    ],
    "Olympic Lifting": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.HAMSTRINGS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRAPS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.SHOULDERS_ANTERIOR, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 5 },
    ],
    "Powerlifting": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 25 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.ERECTOR_SPINAE, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.TRICEPS, percentage: 15 },
    ],
    "CrossFit / WOD": [
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CARDIOVASCULAR, percentage: 30 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.QUADRICEPS, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.GLUTES, percentage: 20 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.LATS, percentage: 15 },
      { bodyTarget: ENUM_SYSTEM_BODY_TARGET.CHEST, percentage: 15 },
    ],
  };
