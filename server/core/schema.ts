// Drizzle schema barrel — single source for drizzle-kit + the db client.
// Each module contributes its tables via <feature>.db.ts.
export * from "../modules/countries/countries.db";
export * from "../modules/identity/identity.db";
export * from "../modules/auth/auth.db";
export * from "../modules/workout/workout.db";
export * from "../modules/i18n/i18n.db";
export * from "../modules/nutrition/nutrition.db";
export * from "../modules/gyms/gyms.db";
export * from "../modules/restaurants/restaurants.db";
export * from "../modules/coaches/coaches.db";
export * from "../modules/events/events.db";
