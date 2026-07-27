import type { AppModule } from "../types";
import { programsRouter } from "./programs.routes";

export const programsModule: AppModule = {
  name: "programs",
  registerApp(api) {
    api.use("/", programsRouter); // /programs, /programs/:id
  },
};
