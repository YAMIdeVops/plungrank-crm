import type { Express } from "express";

import { asyncHandler, getQueryParams } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import { DashboardService } from "./service";

const service = new DashboardService();

export function registerDashboardRoutes(app: Express) {
  app.get(
    "/api/dashboard/metrics",
    loginRequired(),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.getMetrics(getQueryParams(req.query)));
    }),
  );
}
