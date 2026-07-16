import type { AppModule } from "../types";
import { restaurantsRouter } from "./restaurants.routes";
import { restaurantsAdminRouter } from "./restaurants.admin.routes";

export const restaurantsModule: AppModule = {
  name: "restaurants",
  registerApp(api) {
    api.use("/", restaurantsRouter); // /restaurants, /restaurants/:id, /reserve
  },
  registerAdmin(admin) {
    admin.use("/restaurants", restaurantsAdminRouter);
  },
};
