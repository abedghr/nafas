// A recognizable emoji per exercise, chosen by name keywords first, then muscle
// group. Emoji reads far better than Ionicons' handful of generic gym glyphs.
// ponytail: keyword table, not ML; extend the lists as the library grows.
const KEYWORD_ICON: [RegExp, string][] = [
  [/\b(run|running|sprint|jog|treadmill|walk)\b/i, '🏃'],
  [/\bcycl|bike\b/i, '🚴'],
  [/\bswim/i, '🏊'],
  [/\brow|ski erg\b/i, '🚣'],
  [/\bjump rope|jumping jack|high knee|burpee|mountain climb|box jump|shadow box\b/i, '🤸'],
  [/\bplank|hollow|copenhagen\b/i, '🧘'],
  [/\b(hold|lever|planche|flag|hang|l-sit|support|frog stand|handstand)\b/i, '⏱️'],
  [/\bmuscle-?up|pull-?up|chin-?up|lat|pulldown|row\b/i, '🧗'],
  [/\bdip\b/i, '🤸'],
  [/\bcurl\b/i, '💪'],
  [/\b(bench|press|push-?up|fly|crossover|pec)\b/i, '🏋️'],
  [/\bsquat|lunge|leg|calf|glute|hip|deadlift|hamstring|step-?up|nordic\b/i, '🦵'],
  [/\bshrug|shoulder|lateral raise|front raise|upright\b/i, '🏋️'],
  [/\bcrunch|sit-?up|twist|ab wheel|toes to bar|dragon|dead bug|raise\b/i, '🎯'],
  [/\bstretch|cat-?cow|mobility|rotation\b/i, '🤍'],
  [/\bclean|snatch|jerk|kettlebell|sled|tire|carry|get-?up\b/i, '🏋️'],
];

const GROUP_ICON: Record<string, string> = {
  Chest: '🏋️', Back: '🧗', Shoulders: '🏋️', Arms: '💪', Legs: '🦵',
  Core: '🎯', Cardio: '🏃', Calisthenics: '🤸', Combo: '🔗', 'Full Body': '🔥',
};

export function exerciseIcon(name?: string, muscleGroup?: string): string {
  const n = name || '';
  for (const [re, icon] of KEYWORD_ICON) if (re.test(n)) return icon;
  if (muscleGroup && GROUP_ICON[muscleGroup]) return GROUP_ICON[muscleGroup];
  return '🏋️';
}
