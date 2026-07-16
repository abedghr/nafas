import type { AppModule } from "../types";
import { identityRouter } from "./identity.routes";
import { identityAdminRouter } from "./identity.admin.routes";

export const identityModule: AppModule = {
  name: "identity",
  registerApp(api) {
    api.use("/", identityRouter); // /me, /users/*, /coach-profile
  },
  registerAdmin(admin) {
    admin.use("/users", identityAdminRouter);
  },
};
