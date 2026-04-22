import type { Express } from "express";

import { asyncHandler } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import { AuthService } from "./service";

const service = new AuthService();

export function registerAuthRoutes(app: Express) {
  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.login(req.body ?? {}));
    }),
  );

  app.get(
    "/api/auth/me",
    loginRequired(),
    asyncHandler(async (_req, res) => {
      res.status(200).json({ user: res.locals.currentUser });
    }),
  );
}
