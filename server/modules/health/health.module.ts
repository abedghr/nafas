import type { AppModule } from "../types";
import { healthRouter } from "./health.routes";

export const healthModule: AppModule = {
  name: "health",
  registerApp(api) {
    api.use("/health", healthRouter);
  },
};
