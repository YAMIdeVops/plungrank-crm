import type { Express } from "express";

import { asyncHandler } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import { ServiceCatalogService } from "./service";

const service = new ServiceCatalogService();

export function registerServicesRoutes(app: Express) {
  app.get(
    "/api/services",
    loginRequired(),
    asyncHandler(async (_req, res) => {
      res.status(200).json({ items: await service.listServices() });
    }),
  );

  app.post(
    "/api/services",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(201).json(await service.createService(req.body ?? {}));
    }),
  );

  app.patch(
    "/api/services/:serviceId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.updateService(Number(req.params.serviceId), req.body ?? {}));
    }),
  );

  app.delete(
    "/api/services/:serviceId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      await service.deleteService(Number(req.params.serviceId));
      res.status(200).json({ message: "Serviço excluído com sucesso." });
    }),
  );
}
