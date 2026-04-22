import { FINAL_MEETING_STATUS, MEETING_STATUS } from "../../core/constants";
import { AppError } from "../../core/errors";
import { canonicalTextKey, normalizeText } from "../../core/formatters";
import {
  extractDatePart,
  parseDate,
  parseDateTime,
  requireFields,
  todayInAppTimezone,
  validateEnum,
} from "../../core/validators";
import { BaseService } from "../../services/base-service";
import { AttemptService } from "../attempts/service";
import { LeadService } from "../leads/service";

export class MeetingService extends BaseService {
  protected tableName = "reuniao";
  private leadService = new LeadService();
  private attemptService = new AttemptService();

  async listMeetings(filters: Record<string, string>) {
    let sql = "select * from reuniao where 1=1";
    const params: unknown[] = [];

    if (filters.status_reuniao) {
      sql += " and status_reuniao = %s";
      params.push(this.resolveMeetingStatus(filters.status_reuniao));
    }
    if (filters.periodo_inicio) {
      sql += " and data_reuniao::date >= %s::date";
      params.push(filters.periodo_inicio);
    }
    if (filters.periodo_fim) {
      sql += " and data_reuniao::date <= %s::date";
      params.push(filters.periodo_fim);
    }

    sql += " order by data_reuniao asc, id_reuniao asc";
    return this.db.fetchAll(sql, params);
  }

  async createMeeting(payload: Record<string, unknown>, _userId: string) {
    return this.db.transaction(async () => {
      requireFields(payload, ["id_lead", "data_reuniao", "status_reuniao"]);
      const lead = (await this.leadService.getLead(Number(payload.id_lead))) as Record<string, unknown>;
      this.leadService.ensureAllowsNewRelatedRecords(lead);
      if (!(await this.attemptService.hasAttemptForLead(Number(lead.id_lead)))) {
        throw new AppError("Só é possível registrar reunião após existir tentativa de contato.");
      }

      const meetingDateTime = parseDateTime(payload.data_reuniao, "data_reuniao");
      const leadDate = parseDate(lead.data_cadastro, "data_cadastro");
      if (extractDatePart(meetingDateTime) < leadDate) {
        throw new AppError("Data da reunião não pode ser menor que a data de cadastro do lead.");
      }

      const status = validateEnum(normalizeText(payload.status_reuniao), MEETING_STATUS, "status_reuniao");
      this.validateFutureMeetingStatus(meetingDateTime, status);

      const response = await this.db.fetchOne<Record<string, unknown>>(
        `
        insert into reuniao (id_lead, data_reuniao, status_reuniao)
        values (%s, %s, %s)
        returning *
        `,
        [lead.id_lead, meetingDateTime, status],
      );
      if (status === "Remarcada") {
        response.notification = "Reunião remarcada. Registre uma nova reunião.";
      }
      return response;
    });
  }

  async updateMeeting(meetingId: number, payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      const meeting = (await this.getOne("id_reuniao", meetingId)) as Record<string, unknown>;
      const currentStatus = String(meeting.status_reuniao);

      if (FINAL_MEETING_STATUS.has(currentStatus)) {
        if ("status_reuniao" in payload && payload.status_reuniao !== currentStatus) {
          throw new AppError("Status de reunião finalizada não pode ser alterado.");
        }
        if ("data_reuniao" in payload) {
          const requestedDate = extractDatePart(parseDateTime(payload.data_reuniao, "data_reuniao"));
          const currentDate = extractDatePart(String(meeting.data_reuniao));
          if (requestedDate !== currentDate) {
            throw new AppError("Data de reunião finalizada não pode ser alterada.");
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      let nextDateTime = String(meeting.data_reuniao);
      if ("data_reuniao" in payload) {
        nextDateTime = parseDateTime(payload.data_reuniao, "data_reuniao");
        updateData.data_reuniao = nextDateTime;
      }

      let nextStatus = currentStatus;
      if ("status_reuniao" in payload) {
        const newStatus = validateEnum(normalizeText(payload.status_reuniao), MEETING_STATUS, "status_reuniao");
        if (
          canonicalTextKey(currentStatus) === canonicalTextKey("Realizada") &&
          new Set([canonicalTextKey("Remarcada"), canonicalTextKey("Não Compareceu")]).has(canonicalTextKey(newStatus))
        ) {
          throw new AppError("Reunião realizada não pode retroceder.");
        }
        if (
          canonicalTextKey(currentStatus) === canonicalTextKey("Não Compareceu") &&
          canonicalTextKey(newStatus) === canonicalTextKey("Realizada")
        ) {
          throw new AppError("Crie uma nova reunião em vez de alterar para Realizada.");
        }
        nextStatus = newStatus;
        updateData.status_reuniao = newStatus;
      }

      this.validateFutureMeetingStatus(nextDateTime, nextStatus);

      const response = await this.updateById("id_reuniao", meetingId, updateData);
      if (String(response.status_reuniao) === "Remarcada") {
        (response as Record<string, unknown>).notification = "Reunião remarcada. Registre uma nova reunião.";
      }
      return response;
    });
  }

  async deleteMeeting(meetingId: number) {
    return this.db.transaction(async () => {
      const meeting = (await this.getOne("id_reuniao", meetingId)) as Record<string, unknown>;
      const lead = (await this.leadService.getLead(Number(meeting.id_lead))) as Record<string, unknown>;
      if (canonicalTextKey(lead.situacao) !== canonicalTextKey("Inativo")) {
        throw new AppError("Reunião registrada só pode ser excluída quando o lead estiver Inativo.");
      }
      await this.db.execute("delete from reuniao where id_reuniao = %s", [meetingId]);
    });
  }

  private validateFutureMeetingStatus(meetingDateTime: string, status: string) {
    if (extractDatePart(meetingDateTime) > todayInAppTimezone() && status !== "Agendada") {
      throw new AppError("Reuniões futuras devem permanecer como Agendada.");
    }
  }

  private resolveMeetingStatus(value: string) {
    return validateEnum(normalizeText(value), MEETING_STATUS, "status_reuniao");
  }
}
