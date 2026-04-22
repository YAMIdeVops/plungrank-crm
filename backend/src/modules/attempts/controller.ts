import type { Express } from "express";

import { asyncHandler, getQueryParams } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import type { SerializedUser } from "../../types";
import { AttemptService } from "./service";

const service = new AttemptService();

export function registerAttemptsRoutes(app: Express) {
  app.get(
    "/api/attempts",
    loginRequired(),
    asyncHandler(async (req, res) => {
      res.status(200).json({ items: await service.listAttempts(getQueryParams(req.query)) });
    }),
  );

  app.post(
    "/api/attempts",
    loginRequired(),
    asyncHandler(async (req, res) => {
      const currentUser = res.locals.currentUser as SerializedUser;
      res.status(201).json(await service.createAttempt(req.body ?? {}, currentUser.id));
    }),
  );

  app.patch(
    "/api/attempts/:attemptId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.updateAttempt(Number(req.params.attemptId), req.body ?? {}));
    }),
  );

  app.delete(
    "/api/attempts/:attemptId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      await service.deleteAttempt(Number(req.params.attemptId));
      res.status(200).json({ message: "Tentativa excluida com sucesso." });
    }),
  );
}
