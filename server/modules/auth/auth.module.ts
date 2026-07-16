import type { AppModule } from "../types";
import { authRouter } from "./auth.routes";
import { authAdminRouter } from "./auth.admin.routes";

export const authModule: AppModule = {
  name: "auth",
  registerApp(api) {
    api.use("/auth", authRouter);
  },
  registerAdmin(admin) {
    admin.use("/auth", authAdminRouter);
  },
};
