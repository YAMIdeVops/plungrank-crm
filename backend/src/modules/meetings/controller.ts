import type { Express } from "express";

import { asyncHandler, getQueryParams } from "../../core/http";
import { loginRequired } from "../../routes/auth";
import type { SerializedUser } from "../../types";
import { MeetingService } from "./service";

const service = new MeetingService();

export function registerMeetingsRoutes(app: Express) {
  app.get(
    "/api/meetings",
    loginRequired(),
    asyncHandler(async (req, res) => {
      res.status(200).json({ items: await service.listMeetings(getQueryParams(req.query)) });
    }),
  );

  app.post(
    "/api/meetings",
    loginRequired(),
    asyncHandler(async (req, res) => {
      const currentUser = res.locals.currentUser as SerializedUser;
      res.status(201).json(await service.createMeeting(req.body ?? {}, currentUser.id));
    }),
  );

  app.patch(
    "/api/meetings/:meetingId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      res.status(200).json(await service.updateMeeting(Number(req.params.meetingId), req.body ?? {}));
    }),
  );

  app.delete(
    "/api/meetings/:meetingId",
    loginRequired(new Set(["ADMIN"])),
    asyncHandler(async (req, res) => {
      await service.deleteMeeting(Number(req.params.meetingId));
      res.status(200).json({ message: "Reunião excluida com sucesso." });
    }),
  );
}
