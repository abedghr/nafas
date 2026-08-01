// Per-exercise metadata that isn't the name/description: equipment + image URL.
// Keyed by exercise name (must match the const `name` exactly). Populated in the
// catalog phase. Equipment values: None | Barbell | Dumbbell | Kettlebell |
// Machine | Plate | Resistance Band | Suspension Band | Other. imageUrl is an
// OPEN-LICENSED / public-domain exercise image URL (empty → icon fallback).

export const EXERCISE_EQUIPMENT: Record<string, string> = {
  // filled in the catalog phase
};

export const EXERCISE_IMAGE: Record<string, string> = {
  // filled in the catalog phase (open-licensed image URLs only)
};
