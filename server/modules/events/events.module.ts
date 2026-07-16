import type { AppModule } from "../types";
import { eventsRouter } from "./events.routes";
import { eventsAdminRouter } from "./events.admin.routes";

export const eventsModule: AppModule = {
  name: "events",
  registerApp(api) {
    api.use("/", eventsRouter); // /events, /events/:id, /events/me/*
  },
  registerAdmin(admin) {
    admin.use("/events", eventsAdminRouter);
  },
};
