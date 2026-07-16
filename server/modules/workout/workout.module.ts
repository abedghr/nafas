import type { AppModule } from "../types";
import { workoutRouter } from "./workout.routes";
import { workoutAdminRouter } from "./workout.admin.routes";

export const workoutModule: AppModule = {
  name: "workout",
  registerApp(api) {
    api.use("/", workoutRouter); // /exercises, /workout-types, /workout-templates, /workout-logs, /active-session, /workout/*
  },
  registerAdmin(admin) {
    admin.use("/exercises", workoutAdminRouter); // scoped — avoids the global requireAuth leaking onto other admin routes
  },
};
