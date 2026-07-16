/**
 * Feature flags. Phase 1 = Workout · Nutrition · Profile only.
 * Deferred features stay in the codebase but are hidden (tabs/routes gated).
 * Flip a flag to true when its phase is built.
 */
export const FEATURES = {
  // Phase 1
  workout: true,
  nutrition: true,
  profile: true,
  // Phase 2
  discovery: true,    // Discover tab → directories
  gyms: true,
  restaurants: false, // hidden — domain needs deeper coverage before launch
  marketplace: true,  // coach marketplace
  events: true,       // tournaments / events / challenges
  // Phase 3 (hidden)
  social: false,
  findPartner: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isEnabled = (key: FeatureKey): boolean => FEATURES[key];
