import type { AppModule } from "./types";
import { healthModule } from "./health/health.module";
import { countriesModule } from "./countries/countries.module";
import { identityModule } from "./identity/identity.module";
import { authModule } from "./auth/auth.module";
import { workoutModule } from "./workout/workout.module";
import { i18nModule } from "./i18n/i18n.module";
import { nutritionModule } from "./nutrition/nutrition.module";
import { gymsModule } from "./gyms/gyms.module";
import { restaurantsModule } from "./restaurants/restaurants.module";
import { coachesModule } from "./coaches/coaches.module";
import { eventsModule } from "./events/events.module";
import { uploadsModule } from "./uploads/uploads.module";

// Enabled modules. Phase 1 + Phase 2 (gyms, …).
export const modules: AppModule[] = [
  healthModule,
  countriesModule,
  identityModule,
  authModule,
  i18nModule,   // before workout: its public /labels,/languages must resolve before workout's "/" requireAuth wall
  workoutModule,
  nutritionModule,
  gymsModule,
  restaurantsModule,
  coachesModule,
  eventsModule,
  uploadsModule,
];
