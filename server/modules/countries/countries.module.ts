import type { AppModule } from "../types";
import { countriesRouter } from "./countries.routes";
import { countriesAdminRouter } from "./countries.admin.routes";

export const countriesModule: AppModule = {
  name: "countries",
  registerApp(api) {
    api.use("/countries", countriesRouter);
  },
  registerAdmin(admin) {
    admin.use("/countries", countriesAdminRouter);
  },
};
