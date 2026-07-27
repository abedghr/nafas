// Bilingual (EN + AR), diacritic- and punctuation-insensitive exercise matching.
// Matches the query against the exercise's localized name, English name, Arabic
// name and muscle group. Every whitespace token must hit somewhere (AND), so
// "pull back" matches "Pull-up" (Back). ponytail: substring, not fuzzy — add a
// Levenshtein pass only if users complain about typos.
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '') // Arabic short vowels / tashkeel
    .replace(/ـ/g, '')                // tatweel
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')       // drop punctuation/hyphens (pull-up → pull up)
    .trim();
}

export function matchExercise(
  query: string,
  ex: { name?: string; nameEn?: string; nameAr?: string | null; muscleGroup?: string },
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize([ex.name, ex.nameEn, ex.nameAr, ex.muscleGroup].filter(Boolean).join(' '));
  const hayNoSpace = hay.replace(/ /g, ''); // so "pullup" matches "pull up"
  return q.split(' ').every((tok) => hay.includes(tok) || hayNoSpace.includes(tok));
}
