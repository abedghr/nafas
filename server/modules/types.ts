import type { Router } from "express";

// A feature module wires its own app + admin routes. app.ts registers all
// enabled modules. Deferred-phase modules simply aren't in the registry yet.
export interface AppModule {
  name: string;
  registerApp?(api: Router): void;
  registerAdmin?(admin: Router): void;
}
