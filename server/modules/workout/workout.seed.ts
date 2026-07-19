import { and, eq, isNull, sql } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { workoutTypes, exercises, exerciseWorkoutTypes, exerciseBodyTargets } from "./workout.db";
import { workoutGroups } from "./seed-data/workout-groups.data";
import { EXERCISE_BODY_TARGETS } from "./seed-data/exercise-body-targets.map";
import { WORKOUT_TYPE_FALLBACK_TARGETS } from "./seed-data/workout-type-fallback-targets.data";
import { ENUM_SYSTEM_BODY_TARGET as BT } from "./seed-data/body-target.enum";

type Measurement = "reps" | "time_hold" | "distance_duration";

// Reconciliation: exercise measurement type (default reps).
const TIME_HOLD = new Set([
  "Plank", "Side Plank", "L-Sit", "Handstand Hold", "Dead Hang", "Front Lever",
  "Back Lever", "Planche", "Human Flag", "Deep Squat Hold", "Wall Sit",
  "Hip 90/90 Stretch", "Thoracic Rotation", "World's Greatest Stretch", "Couch Stretch", "Cat-Cow",
  "Hollow Body Hold",
]);
const DISTANCE_DURATION = new Set([
  "Treadmill Run", "Cycling (Stationary)", "Rowing Machine", "Stair Climber",
  "Assault Bike Sprint", "Jump Rope", "Battle Ropes", "Sled Push", "Farmer's Carry",
]);
const measurementFor = (name: string): Measurement =>
  TIME_HOLD.has(name) ? "time_hold" : DISTANCE_DURATION.has(name) ? "distance_duration" : "reps";

// Reconciliation: fill the 6 exercises lacking explicit body-targets (derived from
// their own descriptions — not invented), plus the added Wall Sit.
const EXTRA_TARGETS: Record<string, { bodyTarget: string; percentage: number }[]> = {
  Deadlift: [
    { bodyTarget: BT.GLUTES, percentage: 30 }, { bodyTarget: BT.HAMSTRINGS, percentage: 25 },
    { bodyTarget: BT.ERECTOR_SPINAE, percentage: 20 }, { bodyTarget: BT.LATS, percentage: 10 },
    { bodyTarget: BT.TRAPS, percentage: 10 }, { bodyTarget: BT.FOREARMS, percentage: 5 },
  ],
  Dips: [
    { bodyTarget: BT.CHEST, percentage: 50 }, { bodyTarget: BT.TRICEPS, percentage: 35 },
    { bodyTarget: BT.SHOULDERS_ANTERIOR, percentage: 15 },
  ],
  Plank: [
    { bodyTarget: BT.CORE_ABS, percentage: 50 }, { bodyTarget: BT.CORE_DEEP, percentage: 35 },
    { bodyTarget: BT.OBLIQUES, percentage: 15 },
  ],
  Burpee: [
    { bodyTarget: BT.CARDIOVASCULAR, percentage: 50 }, { bodyTarget: BT.QUADRICEPS, percentage: 20 },
    { bodyTarget: BT.CHEST, percentage: 15 }, { bodyTarget: BT.CORE_ABS, percentage: 15 },
  ],
  Planche: [
    { bodyTarget: BT.SHOULDERS_ANTERIOR, percentage: 40 }, { bodyTarget: BT.CORE_DEEP, percentage: 25 },
    { bodyTarget: BT.CHEST, percentage: 20 }, { bodyTarget: BT.TRICEPS, percentage: 15 },
  ],
  Snatch: [
    { bodyTarget: BT.QUADRICEPS, percentage: 25 }, { bodyTarget: BT.GLUTES, percentage: 20 },
    { bodyTarget: BT.TRAPS, percentage: 20 }, { bodyTarget: BT.SHOULDERS_LATERAL, percentage: 15 },
    { bodyTarget: BT.ERECTOR_SPINAE, percentage: 10 }, { bodyTarget: BT.HAMSTRINGS, percentage: 10 },
  ],
  "Wall Sit": [
    { bodyTarget: BT.QUADRICEPS, percentage: 70 }, { bodyTarget: BT.GLUTES, percentage: 20 },
    { bodyTarget: BT.CALVES, percentage: 10 },
  ],
};

// Added exercise not in source seed (was in old mobile lib).
const WALL_SIT = {
  name: "Wall Sit",
  description:
    "An isometric lower-body hold with the back flat against a wall and thighs parallel to the floor. " +
    "Movement pattern: isometric squat hold. Primary muscles: quadriceps, glutes, calves. " +
    "Difficulty: beginner. Key benefit: builds quad endurance and knee stability with zero equipment.",
  types: ["Leg Day", "Lower Body"],
};

async function findType(name: string) {
  const [r] = await db.select().from(workoutTypes).where(and(isNull(workoutTypes.userId), eq(workoutTypes.name, name)));
  return r;
}
async function findExercise(name: string) {
  const [r] = await db.select().from(exercises).where(and(isNull(exercises.userId), eq(exercises.name, name)));
  return r;
}

export async function seedWorkout() {
  const typeId = new Map<string, string>();
  const exId = new Map<string, string>();

  // 1. workout types
  for (const g of workoutGroups) {
    let t = await findType(g.workoutType.name);
    if (!t) [t] = await db.insert(workoutTypes).values({ name: g.workoutType.name, description: g.workoutType.description }).returning();
    typeId.set(g.workoutType.name, t.id);
  }

  // collect every exercise (from groups) + Wall Sit
  const allExercises = new Map<string, { name: string; description: string; types: string[] }>();
  for (const g of workoutGroups) {
    for (const ex of g.exercises) {
      const e = allExercises.get(ex.name) ?? { name: ex.name, description: ex.description, types: [] };
      e.types.push(g.workoutType.name);
      allExercises.set(ex.name, e);
    }
  }
  allExercises.set(WALL_SIT.name, { name: WALL_SIT.name, description: WALL_SIT.description, types: WALL_SIT.types });

  // 2. exercises + 3. links + 4. body targets
  let exCount = 0, btCount = 0;
  for (const ex of allExercises.values()) {
    let row = await findExercise(ex.name);
    if (!row) {
      [row] = await db.insert(exercises).values({
        name: ex.name, description: ex.description, measurementType: measurementFor(ex.name),
      }).returning();
      exCount++;
    }
    exId.set(ex.name, row.id);

    for (const tName of ex.types) {
      const wtId = typeId.get(tName)!;
      const [link] = await db.select().from(exerciseWorkoutTypes)
        .where(and(eq(exerciseWorkoutTypes.exerciseId, row.id), eq(exerciseWorkoutTypes.workoutTypeId, wtId)));
      if (!link) await db.insert(exerciseWorkoutTypes).values({ exerciseId: row.id, workoutTypeId: wtId });
    }

    const targets =
      EXERCISE_BODY_TARGETS[ex.name] ??
      EXTRA_TARGETS[ex.name] ??
      WORKOUT_TYPE_FALLBACK_TARGETS[ex.types[0]] ??
      [];
    for (const t of targets) {
      const [exists] = await db.select().from(exerciseBodyTargets)
        .where(and(eq(exerciseBodyTargets.exerciseId, row.id), eq(exerciseBodyTargets.bodyTarget, t.bodyTarget as string)));
      if (!exists) {
        await db.insert(exerciseBodyTargets).values({ exerciseId: row.id, bodyTarget: t.bodyTarget as string, percentage: t.percentage });
        btCount++;
      }
    }
  }

  const [{ count: typeTotal }] = await db.select({ count: sql<number>`count(*)::int` }).from(workoutTypes);
  const [{ count: exTotal }] = await db.select({ count: sql<number>`count(*)::int` }).from(exercises);
  console.log(`✓ workout seed: ${exCount} new exercises (${exTotal} total), ${typeTotal} types, ${btCount} body-targets`);
}

// standalone runner
if (process.argv[1]?.includes("workout.seed")) {
  seedWorkout().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
