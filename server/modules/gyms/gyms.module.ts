import type { AppModule } from "../types";
import { gymsRouter } from "./gyms.routes";
import { gymsAdminRouter, facilitiesAdminRouter, classesAdminRouter } from "./gyms.admin.routes";

export const gymsModule: AppModule = {
  name: "gyms",
  registerApp(api) {
    api.use("/", gymsRouter); // /gyms, /gyms/:id, /facilities
  },
  registerAdmin(admin) {
    admin.use("/gyms", gymsAdminRouter);
    admin.use("/facilities", facilitiesAdminRouter);
    admin.use("/classes", classesAdminRouter);
  },
};
