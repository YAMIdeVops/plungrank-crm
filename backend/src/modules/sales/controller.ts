import type { Express } from "express";

import { asyncHandler, getQueryParams } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import type { SerializedUser } from "../../types";
import { SaleService } from "./service";

const service = new SaleService();

export function registerSalesRoutes(app: Express) {
  app.get(
    "/api/sales",
    loginRequired(),
    asyncHandler(async (req, res) => {
      res.status(200).json({ items: await service.listSales(getQueryParams(req.query)) });
    }),
  );

  app.post(
    "/api/sales",
    loginRequired(),
    asyncHandler(async (req, res) => {
      const currentUser = res.locals.currentUser as SerializedUser;
      res.status(201).json(await service.createSale(req.body ?? {}, currentUser.id));
    }),
  );

  app.patch(
    "/api/sales/:saleId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.updateSale(Number(req.params.saleId), req.body ?? {}));
    }),
  );

  app.delete(
    "/api/sales/:saleId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      await service.deleteSale(Number(req.params.saleId));
      res.status(200).json({ message: "Venda excluida com sucesso." });
    }),
  );
}
