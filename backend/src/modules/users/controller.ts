import type { Express } from "express";

import { asyncHandler } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import type { SerializedUser } from "../../types";
import { UserService } from "./service";

const service = new UserService();

export function registerUsersRoutes(app: Express) {
  app.get(
    "/api/users",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (_req, res) => {
      res.status(200).json({ items: await service.listUsers(), current_user: res.locals.currentUser });
    }),
  );

  app.post(
    "/api/users",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.createUser(req.body ?? {}));
    }),
  );

  app.patch(
    "/api/users/:userId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(
        await service.updateUser(
          String(req.params.userId),
          req.body ?? {},
          res.locals.currentUser as SerializedUser,
        ),
      );
    }),
  );

  app.delete(
    "/api/users/:userId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(
        await service.deleteUser(
          String(req.params.userId),
          res.locals.currentUser as SerializedUser,
        ),
      );
    }),
  );
}
