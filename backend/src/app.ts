import cors from "cors";
import express from "express";

import { errorMiddleware, notFoundHandler } from "./core/errors";
import { registerRoutes } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  registerRoutes(app);
  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}

const app = createApp();

export default app;
