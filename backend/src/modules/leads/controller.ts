import type { Express } from "express";

import { AppError } from "../../core/errors";
import { asyncHandler, getQueryParams } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import type { SerializedUser } from "../../types";
import { LeadService } from "./service";

const service = new LeadService();

export function registerLeadsRoutes(app: Express) {
  app.get(
    "/api/leads",
    loginRequired(),
    asyncHandler(async (req, res) => {
      res.status(200).json({ items: await service.listLeads(getQueryParams(req.query)) });
    }),
  );

  app.post(
    "/api/leads",
    loginRequired(),
    asyncHandler(async (_req, res) => {
      const currentUser = res.locals.currentUser as SerializedUser;
      res.status(201).json(await service.createLead(_req.body ?? {}, currentUser.id));
    }),
  );

  app.patch(
    "/api/leads/:leadId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.updateLead(Number(req.params.leadId), req.body ?? {}));
    }),
  );

  app.delete(
    "/api/leads/:leadId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      const confirmation = String(req.query.confirmar_exclusao || "").trim().toLowerCase();
      if (!new Set(["1", "true", "sim"]).has(confirmation)) {
        throw new AppError("Confirme a exclusão em cascata antes de continuar.", 400);
      }
      await service.deleteLead(Number(req.params.leadId));
      res.status(200).json({ message: "Lead excluido com sucesso." });
    }),
  );
}
