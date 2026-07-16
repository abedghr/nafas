import { createApp } from "./app";
import { env } from "./core/env";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Nafas API listening on :${env.PORT}`);
  console.log(`Swagger docs at http://localhost:${env.PORT}/docs`);
});
