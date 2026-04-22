import type { Express } from "express";

import { registerAttemptsRoutes } from "../modules/attempts/controller";
import { registerAuthRoutes } from "../modules/auth/controller";
import { registerDashboardRoutes } from "../modules/dashboard/controller";
import { registerLeadsRoutes } from "../modules/leads/controller";
import { registerMeetingsRoutes } from "../modules/meetings/controller";
import { registerSalesRoutes } from "../modules/sales/controller";
import { registerServicesRoutes } from "../modules/services_catalog/controller";
import { registerUsersRoutes } from "../modules/users/controller";

export function registerRoutes(app: Express) {
  registerAuthRoutes(app);
  registerUsersRoutes(app);
  registerLeadsRoutes(app);
  registerAttemptsRoutes(app);
  registerMeetingsRoutes(app);
  registerSalesRoutes(app);
  registerServicesRoutes(app);
  registerDashboardRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}
