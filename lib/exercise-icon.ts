// A recognizable MaterialCommunityIcons vector glyph per exercise, chosen by
// name keywords first, then muscle group. Returns the MDI glyph NAME (string);
// render with <MaterialCommunityIcons name={...} /> from '@expo/vector-icons'.
// ponytail: keyword table, not ML; extend the lists as the library grows.
const KEYWORD_ICON: [RegExp, string][] = [
  [/\bjog\b/i, 'run'],
  [/\b(run|running|sprint|treadmill)\b/i, 'run-fast'],
  [/\bwalk\b/i, 'walk'],
  [/\bcycl|\bbike\b/i, 'bike'],
  [/\bswim/i, 'swim'],
  [/\browing\b|ski erg/i, 'rowing'],
  [/\bjump rope\b/i, 'jump-rope'],
  [/\bjumping jack|high knee|burpee|mountain climb|shadow box/i, 'human-handsup'],
  [/\bplank|hollow|copenhagen|l-sit/i, 'yoga'],
  [/\b(hold|lever|planche|flag|hang|support|frog stand|handstand)\b/i, 'timer-sand'],
  [/\bmuscle-?up|pull-?up|chin-?up|\blat\b|pulldown|\brow\b/i, 'gymnastics'],
  [/\bdip\b/i, 'gymnastics'],
  [/\bcurl\b/i, 'arm-flex'],
  [/\b(bench|press|push-?up|fly|crossover|pec|shoulder|lateral raise|front raise|upright|shrug)\b/i, 'dumbbell'],
  [/\bsquat|lunge|\bleg\b|calf|glute|hip|deadlift|hamstring|step-?up|nordic/i, 'weight-lifter'],
  [/\bcrunch|sit-?up|twist|ab wheel|toes to bar|dragon|dead bug|\braise\b/i, 'stomach'],
  [/\bstretch|cat-?cow|mobility|rotation/i, 'meditation'],
  [/\bclean|snatch|jerk|kettlebell|sled|tire|carry|get-?up/i, 'kettlebell'],
];

const GROUP_ICON: Record<string, string> = {
  Chest: 'dumbbell', Back: 'gymnastics', Shoulders: 'dumbbell', Arms: 'arm-flex',
  Legs: 'weight-lifter', Core: 'stomach', Cardio: 'run-fast',
  Calisthenics: 'gymnastics', Combo: 'dumbbell', 'Full Body': 'weight-lifter',
};

export function exerciseIcon(name?: string, muscleGroup?: string): string {
  const n = name || '';
  for (const [re, icon] of KEYWORD_ICON) if (re.test(n)) return icon;
  if (muscleGroup && GROUP_ICON[muscleGroup]) return GROUP_ICON[muscleGroup];
  return 'dumbbell';
}
