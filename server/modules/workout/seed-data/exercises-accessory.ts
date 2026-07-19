// ─── ACCESSORY / MACHINE / ISOLATION EXERCISES ───────────────────────────────
// Common commercial-gym movements missing from the original push-pull / legs-core
// seed: machine presses, cable isolation, curl/extension variants, hamstring &
// glute accessories, ab work. Same shape as the other exercise seed files.

// ── Chest ─────────────────────────────────────────────────────────────────────
export const declineBarbellPress = {
  name: "Decline Barbell Press",
  description:
    "A barbell press on a 15–30° decline bench. Movement pattern: decline horizontal press, bilateral. " +
    "Primary muscles: lower (sternal) pectoralis major, triceps, anterior deltoid. " +
    "The decline angle emphasises the lower chest and reduces shoulder strain. " +
    "Difficulty: beginner to intermediate. Key benefit: builds the lower chest shelf and lets you press heavier than flat.",
};
export const machineChestPress = {
  name: "Machine Chest Press",
  description:
    "A seated pressing machine with a fixed pressing path. Movement pattern: horizontal press, bilateral, guided. " +
    "Primary muscles: pectoralis major, anterior deltoid, triceps. " +
    "The fixed path removes stabiliser demand so you can push the chest to failure safely. " +
    "Difficulty: beginner. Key benefit: safe chest overload without a spotter — ideal for high-volume hypertrophy.",
};
export const pecDeck = {
  name: "Pec Deck",
  description:
    "A seated machine fly (butterfly). Movement pattern: horizontal adduction, bilateral, guided. " +
    "Primary muscles: pectoralis major, anterior deltoid. " +
    "Isolates the chest through a controlled adduction arc with constant tension. " +
    "Difficulty: beginner. Key benefit: pure chest isolation and squeeze with zero stabiliser fatigue.",
};
export const cableCrossover = {
  name: "Cable Crossover",
  description:
    "A standing cable fly from high pulleys crossing at the midline. Movement pattern: horizontal adduction, bilateral. " +
    "Primary muscles: pectoralis major (inner and lower), anterior deltoid. " +
    "Constant cable tension throughout the arc, peaking at full contraction. " +
    "Difficulty: beginner to intermediate. Key benefit: constant-tension inner-chest detail and contraction that dumbbells lose at the top.",
};

// ── Back ────────────────────────────────────────────────────────────────────
export const tBarRow = {
  name: "T-Bar Row",
  description:
    "A chest-supported or landmine barbell row with a V-handle. Movement pattern: horizontal pull, bilateral. " +
    "Primary muscles: mid-back (rhomboids), lats, upper back, biceps, traps. " +
    "The neutral close grip allows heavy loading with a strong mid-back squeeze. " +
    "Difficulty: intermediate. Key benefit: builds thick mid-back mass with heavy, back-biased loading.",
};
export const pendlayRow = {
  name: "Pendlay Row",
  description:
    "A strict barbell row from a dead stop on the floor each rep, torso parallel to the ground. Movement pattern: horizontal pull, bilateral, explosive. " +
    "Primary muscles: lats, mid-back, upper back, biceps, erector spinae. " +
    "The dead-stop reset removes momentum and forces full power from a static start. " +
    "Difficulty: advanced. Key benefit: explosive back strength and strict rowing power carryover to the deadlift.",
};
export const straightArmPulldown = {
  name: "Straight-Arm Pulldown",
  description:
    "A cable pulldown with straight arms from overhead to the thighs. Movement pattern: shoulder extension, bilateral. " +
    "Primary muscles: latissimus dorsi, triceps (long head), core. " +
    "Isolates the lats without biceps involvement by keeping the elbows locked. " +
    "Difficulty: beginner. Key benefit: teaches the lat-driven pull and isolates back width without arm fatigue.",
};
export const barbellShrug = {
  name: "Barbell Shrug",
  description:
    "A standing shrug elevating the shoulders with a loaded barbell. Movement pattern: scapular elevation, bilateral. " +
    "Primary muscles: trapezius (upper), upper back, forearms (grip). " +
    "A short-range, heavy movement that directly loads the upper traps. " +
    "Difficulty: beginner. Key benefit: builds upper-trap thickness and grip under heavy load.",
};

// ── Shoulders ─────────────────────────────────────────────────────────────────
export const arnoldPress = {
  name: "Arnold Press",
  description:
    "A seated dumbbell press that rotates from a supinated front-rack to a pressed overhead position. Movement pattern: vertical press with rotation, bilateral. " +
    "Primary muscles: anterior and lateral deltoids, triceps, traps. " +
    "The rotation recruits all three deltoid heads through an extended range. " +
    "Difficulty: intermediate. Key benefit: full-deltoid development from a single pressing movement.",
};
export const cableLateralRaise = {
  name: "Cable Lateral Raise",
  description:
    "A single-arm lateral raise from a low cable pulley. Movement pattern: shoulder abduction, unilateral. " +
    "Primary muscles: lateral deltoid, traps. " +
    "Cable tension stays constant from the bottom, unlike dumbbells which are easy at the start. " +
    "Difficulty: beginner. Key benefit: constant-tension side-delt width with resistance through the whole range.",
};
export const reversePecDeck = {
  name: "Reverse Pec Deck",
  description:
    "A seated rear-delt machine fly, arms moving from front to back. Movement pattern: horizontal abduction, bilateral, guided. " +
    "Primary muscles: posterior deltoid, upper back (rhomboids), traps. " +
    "Isolates the rear delts through a controlled reverse adduction arc. " +
    "Difficulty: beginner. Key benefit: rear-delt and upper-back isolation for balanced, healthy shoulders.",
};
export const uprightRow = {
  name: "Upright Row",
  description:
    "A vertical pull of a barbell or dumbbells up the front of the torso to chest height. Movement pattern: vertical pull, bilateral. " +
    "Primary muscles: lateral deltoid, trapezius, biceps, forearms. " +
    "Drives the elbows high to load the side delts and traps together. " +
    "Difficulty: intermediate. Key benefit: builds side delts and traps in one movement; use a wider grip to spare the shoulders.",
};

// ── Biceps ───────────────────────────────────────────────────────────────────
export const preacherCurl = {
  name: "Preacher Curl",
  description:
    "A curl with the upper arms braced on an angled preacher bench. Movement pattern: elbow flexion, bilateral, supported. " +
    "Primary muscles: biceps brachii (short head), forearms. " +
    "The braced arms remove all swing and isolate the biceps at the stretched position. " +
    "Difficulty: beginner. Key benefit: strict biceps isolation with a hard stretch at the bottom.",
};
export const cableCurl = {
  name: "Cable Curl",
  description:
    "A standing biceps curl from a low cable pulley with a bar or rope. Movement pattern: elbow flexion, bilateral. " +
    "Primary muscles: biceps brachii, forearms. " +
    "Constant cable tension keeps the biceps loaded even at the top of the curl. " +
    "Difficulty: beginner. Key benefit: constant-tension biceps work with a strong peak contraction.",
};
export const concentrationCurl = {
  name: "Concentration Curl",
  description:
    "A seated single-arm curl with the elbow braced against the inner thigh. Movement pattern: elbow flexion, unilateral, supported. " +
    "Primary muscles: biceps brachii (peak), forearms. " +
    "The braced elbow eliminates momentum for maximum peak contraction. " +
    "Difficulty: beginner. Key benefit: the classic biceps-peak builder with total isolation.",
};
export const inclineDumbbellCurl = {
  name: "Incline Dumbbell Curl",
  description:
    "A dumbbell curl seated on an incline bench with arms hanging back. Movement pattern: elbow flexion, bilateral, stretched. " +
    "Primary muscles: biceps brachii (long head), forearms. " +
    "The behind-the-body arm position maximises the biceps stretch at the bottom. " +
    "Difficulty: beginner. Key benefit: emphasises the long head for biceps length and the deepest stretch.",
};
export const reverseCurl = {
  name: "Reverse Curl",
  description:
    "A curl with a pronated (palms-down) grip on a barbell or EZ-bar. Movement pattern: elbow flexion, bilateral. " +
    "Primary muscles: forearms (brachioradialis), biceps (brachialis). " +
    "The overhand grip shifts load onto the forearm extensors and brachialis. " +
    "Difficulty: beginner. Key benefit: builds forearm and upper-arm thickness the underhand curl misses.",
};

// ── Triceps ──────────────────────────────────────────────────────────────────
export const overheadTricepsExtension = {
  name: "Overhead Triceps Extension",
  description:
    "A dumbbell, cable or EZ-bar extension performed with the arms overhead. Movement pattern: elbow extension, overhead, bilateral. " +
    "Primary muscles: triceps brachii (long head), anterior deltoid (stabiliser). " +
    "The overhead position stretches the long head under load for greater growth. " +
    "Difficulty: beginner. Key benefit: targets the triceps long head — the mass that pushdowns under-train.",
};
export const closeGripBenchPress = {
  name: "Close-Grip Bench Press",
  description:
    "A barbell bench press with a shoulder-width or narrower grip. Movement pattern: horizontal press, bilateral, triceps-biased. " +
    "Primary muscles: triceps brachii, chest, anterior deltoid. " +
    "The narrow grip shifts emphasis from the chest onto the triceps. " +
    "Difficulty: intermediate. Key benefit: heavy triceps mass-builder and direct bench-press strength carryover.",
};
export const benchDip = {
  name: "Bench Dip",
  description:
    "A bodyweight dip with hands on a bench behind the torso and legs extended. Movement pattern: elbow extension, bilateral. " +
    "Primary muscles: triceps brachii, chest (lower), anterior deltoid. " +
    "A scalable triceps movement — elevate the feet or add a plate to increase load. " +
    "Difficulty: beginner. Key benefit: equipment-free triceps work that scales from beginner to loaded.",
};

// ── Legs / Glutes ─────────────────────────────────────────────────────────────
export const seatedLegCurl = {
  name: "Seated Leg Curl",
  description:
    "A seated machine hamstring curl, thighs pinned by a pad. Movement pattern: knee flexion, bilateral, guided. " +
    "Primary muscles: hamstrings, calves (assist). " +
    "The seated position keeps the hamstrings stretched, producing greater growth than the lying version. " +
    "Difficulty: beginner. Key benefit: isolates the hamstrings under stretch for size and knee health.",
};
export const gluteBridge = {
  name: "Glute Bridge",
  description:
    "A supine hip extension driving the hips up from the floor, optionally loaded with a barbell. Movement pattern: hip extension, bilateral. " +
    "Primary muscles: gluteus maximus, hamstrings, erector spinae. " +
    "A floor-based hip thrust variation with a shorter range and easy setup. " +
    "Difficulty: beginner. Key benefit: direct glute activation and strength with minimal equipment.",
};
export const goodMorning = {
  name: "Good Morning",
  description:
    "A barbell hip hinge with the bar on the upper back, torso bowing forward. Movement pattern: hip hinge, bilateral. " +
    "Primary muscles: hamstrings, glutes, erector spinae, core. " +
    "Loads the posterior chain through a hinge without gripping a bar in the hands. " +
    "Difficulty: advanced. Key benefit: builds hamstring and lower-back strength; strong deadlift and squat carryover.",
};
export const dumbbellStepUp = {
  name: "Dumbbell Step-up",
  description:
    "A single-leg step onto a box or bench holding dumbbells. Movement pattern: unilateral knee and hip extension. " +
    "Primary muscles: quadriceps, glutes, hamstrings, calves. " +
    "A unilateral movement exposing and correcting left-right leg imbalances. " +
    "Difficulty: beginner to intermediate. Key benefit: builds single-leg strength, balance and athletic power.",
};
export const nordicHamstringCurl = {
  name: "Nordic Hamstring Curl",
  description:
    "A kneeling eccentric hamstring curl with the ankles anchored, lowering the torso under control. Movement pattern: knee flexion, bilateral, eccentric. " +
    "Primary muscles: hamstrings, glutes, core. " +
    "Bodyweight eccentric loading builds elite hamstring strength and resilience. " +
    "Difficulty: advanced. Key benefit: the top hamstring-injury-prevention exercise for athletes.",
};
export const seatedCalfRaise = {
  name: "Seated Calf Raise",
  description:
    "A seated machine calf raise with a pad over the knees and bent legs. Movement pattern: ankle plantarflexion, bilateral. " +
    "Primary muscles: soleus (deep calf), gastrocnemius (assist). " +
    "The bent knee shifts emphasis onto the soleus, which standing raises miss. " +
    "Difficulty: beginner. Key benefit: targets the soleus for complete lower-leg development.",
};
export const hipAdduction = {
  name: "Hip Adduction (Machine)",
  description:
    "A seated machine squeezing the legs together against resistance. Movement pattern: hip adduction, bilateral, guided. " +
    "Primary muscles: adductors (inner thigh), glutes (assist). " +
    "Isolates the inner-thigh adductors that compound leg lifts under-train. " +
    "Difficulty: beginner. Key benefit: inner-thigh strength and groin resilience for lifters and athletes.",
};
export const hipAbduction = {
  name: "Hip Abduction (Machine)",
  description:
    "A seated machine pushing the legs apart against resistance. Movement pattern: hip abduction, bilateral, guided. " +
    "Primary muscles: gluteus medius and minimus, hip flexors (assist). " +
    "Isolates the lateral glutes that stabilise the hips and knees. " +
    "Difficulty: beginner. Key benefit: builds glute medius for hip stability and better squat tracking.",
};

// ── Core ────────────────────────────────────────────────────────────────────
export const bicycleCrunch = {
  name: "Bicycle Crunch",
  description:
    "A supine crunch alternating elbow-to-opposite-knee in a pedalling motion. Movement pattern: trunk flexion with rotation, alternating. " +
    "Primary muscles: rectus abdominis, obliques, hip flexors. " +
    "Combines flexion and rotation to hit the whole ab wall dynamically. " +
    "Difficulty: beginner. Key benefit: one of the highest-activation ab exercises for abs and obliques together.",
};
export const crunch = {
  name: "Crunch",
  description:
    "A short-range supine trunk curl lifting the shoulder blades off the floor. Movement pattern: trunk flexion, bilateral. " +
    "Primary muscles: rectus abdominis (upper), obliques. " +
    "A controlled, spine-friendly flexion isolating the abs without hip-flexor takeover. " +
    "Difficulty: beginner. Key benefit: the fundamental ab isolation; add weight to progress.",
};
export const lyingLegRaise = {
  name: "Lying Leg Raise",
  description:
    "A supine raise of straight legs from the floor to vertical. Movement pattern: hip flexion, bilateral. " +
    "Primary muscles: rectus abdominis (lower), hip flexors, deep core. " +
    "Emphasises the lower abs through a controlled straight-leg raise and lower. " +
    "Difficulty: beginner to intermediate. Key benefit: targets the lower abs that crunches under-train.",
};
export const hollowBodyHold = {
  name: "Hollow Body Hold",
  description:
    "An isometric supine hold with the arms and legs raised, lower back pressed flat. Movement pattern: anti-extension isometric. " +
    "Primary muscles: rectus abdominis, deep core (transverse abdominis), hip flexors. " +
    "The gymnastics foundation for total-body tension and trunk control. " +
    "Difficulty: intermediate. Key benefit: builds the braced-core position underpinning every advanced calisthenics skill.",
};
export const cableWoodchopper = {
  name: "Cable Woodchopper",
  description:
    "A standing diagonal cable pull across the body from high to low (or low to high). Movement pattern: trunk rotation, unilateral. " +
    "Primary muscles: obliques, rectus abdominis, deep core. " +
    "Trains rotational power and anti-rotation control against a constant cable load. " +
    "Difficulty: beginner to intermediate. Key benefit: rotational core strength that carries over to sport and swings.",
};
