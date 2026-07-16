import type { AppModule } from "../types";
import { nutritionRouter } from "./nutrition.routes";
import { nutritionAdminRouter } from "./nutrition.admin.routes";

export const nutritionModule: AppModule = {
  name: "nutrition",
  registerApp(api) {
    api.use("/", nutritionRouter); // /foods, /nutrition/*, /inbody
  },
  registerAdmin(admin) {
    admin.use("/foods", nutritionAdminRouter);
  },
};
