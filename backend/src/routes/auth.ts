import type { NextFunction, Request, Response } from "express";

import { UserService } from "../modules/users/service";
import { AppError } from "../core/errors";
import { decodeAccessToken } from "../core/security";
import type { SerializedUser } from "../types";

export function loginRequired(requiredProfiles?: Set<string>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      if (!authHeader.startsWith("Bearer ")) {
        throw new AppError("Token de acesso não informado.", 401);
      }

      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      let payload;
      try {
        payload = decodeAccessToken(token);
      } catch {
        throw new AppError("Token inválido ou expirado.", 401);
      }

      const userService = new UserService();
      const user = await userService.getById(payload.sub);
      const serialized = userService.serializeUser(user);

      if (serialized.status !== "ACTIVE") {
        throw new AppError("Usuário inativo.", 403);
      }

      if (requiredProfiles && !requiredProfiles.has(serialized.perfil)) {
        throw new AppError("Acesso negado para este perfil.", 403);
      }

      res.locals.currentUser = serialized satisfies SerializedUser;
      next();
    } catch (error) {
      next(error);
    }
  };
}
