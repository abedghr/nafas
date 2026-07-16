import type { AppModule } from "../types";
import { coachesRouter } from "./coaches.routes";
import { coachesAdminRouter } from "./coaches.admin.routes";

export const coachesModule: AppModule = {
  name: "coaches",
  registerApp(api) {
    api.use("/", coachesRouter); // /coaches, /coaches/:id, /book
  },
  registerAdmin(admin) {
    admin.use("/coaches", coachesAdminRouter);
  },
};
