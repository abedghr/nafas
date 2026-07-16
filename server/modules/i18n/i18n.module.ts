import type { AppModule } from "../types";
import { i18nRouter } from "./i18n.routes";
import { i18nAdminRouter } from "./i18n.admin.routes";

export const i18nModule: AppModule = {
  name: "i18n",
  registerApp(api) {
    api.use("/", i18nRouter); // /languages, /labels
  },
  registerAdmin(admin) {
    admin.use("/labels", i18nAdminRouter);
  },
};
