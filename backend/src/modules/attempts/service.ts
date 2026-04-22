import {
  ATTEMPT_CHANNEL_MODALITY,
  ATTEMPT_CHANNELS,
  ATTEMPT_MODALITIES,
  ATTEMPT_STATUS,
  ATTEMPT_STATUS_FLOW,
} from "../../core/constants";
import { AppError } from "../../core/errors";
import { canonicalTextKey } from "../../core/formatters";
import { ensureNotFuture, parseDate, requireFields } from "../../core/validators";
import { BaseService } from "../../services/base-service";
import { LeadService } from "../leads/service";

export class AttemptService extends BaseService {
  protected tableName = "tentativa_contato";
  private leadService = new LeadService();

  async listAttempts(filters: Record<string, string>) {
    let sql = "select * from tentativa_contato where 1=1";
    const params: unknown[] = [];

    if (filters.modalidade) {
      sql += " and modalidade = %s";
      params.push(this.resolveAllowedOption(filters.modalidade, ATTEMPT_MODALITIES, "modalidade"));
    }
    if (filters.canal) {
      sql += " and canal = %s";
      params.push(this.resolveAllowedOption(filters.canal, ATTEMPT_CHANNELS, "canal"));
    }
    if (filters.status) {
      sql += " and status = %s";
      params.push(this.resolveAllowedOption(filters.status, ATTEMPT_STATUS, "status"));
    }

    sql += " order by data_tentativa desc, id_tentativa desc";
    return this.db.fetchAll(sql, params);
  }

  async createAttempt(payload: Record<string, unknown>, _userId: string) {
    return this.db.transaction(async () => {
      requireFields(payload, ["id_lead", "data_tentativa", "modalidade", "canal", "status"]);
      const lead = (await this.leadService.getLead(Number(payload.id_lead))) as Record<string, unknown>;
      this.leadService.ensureAllowsNewRelatedRecords(lead);

      const dataTentativa = parseDate(payload.data_tentativa, "data_tentativa");
      ensureNotFuture(dataTentativa, "data_tentativa");
      this.ensureDateAfterLead(String(lead.data_cadastro), dataTentativa);

      const modalidade = this.resolveAllowedOption(String(payload.modalidade), ATTEMPT_MODALITIES, "modalidade");
      const canal = this.resolveAllowedOption(String(payload.canal), ATTEMPT_CHANNELS, "canal");
      const status = this.resolveAllowedOption(String(payload.status), ATTEMPT_STATUS, "status");

      this.validateChannelModality(canal, modalidade);
      await this.validateTerminalHistory(Number(lead.id_lead));

      const response = await this.db.fetchOne<Record<string, unknown>>(
        `
        insert into tentativa_contato (id_lead, data_tentativa, modalidade, canal, status)
        values (%s, %s, %s, %s, %s)
        returning *
        `,
        [lead.id_lead, dataTentativa, modalidade, canal, status],
      );

      if (canonicalTextKey(lead.situacao) === canonicalTextKey("Novo")) {
        await this.leadService.updateSituation(Number(lead.id_lead), "Em prospecção");
      }
      if (canonicalTextKey(status) === canonicalTextKey("Não tem interesse")) {
        await this.leadService.updateSituation(Number(lead.id_lead), "Inativo");
      }
      if (canonicalTextKey(status) === canonicalTextKey("Reunião Marcada")) {
        response.notification = "Necessário registrar uma reunião para este lead.";
      }
      if (canonicalTextKey(status) === canonicalTextKey("Venda realizada")) {
        response.notification = "Necessário registrar uma venda para este lead.";
      }
      return response;
    });
  }

  async updateAttempt(attemptId: number, payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      const attempt = (await this.getOne("id_tentativa", attemptId)) as Record<string, unknown>;
      if ("data_tentativa" in payload && payload.data_tentativa !== attempt.data_tentativa) {
        throw new AppError("Data da tentativa não pode ser alterada.");
      }
      if ("canal" in payload && payload.canal !== attempt.canal) {
        throw new AppError("Canal da tentativa não pode ser alterado.");
      }
      if ("modalidade" in payload && payload.modalidade !== attempt.modalidade) {
        throw new AppError("Modalidade da tentativa não pode ser alterada.");
      }
      if (!("status" in payload)) {
        throw new AppError("Apenas atualização de status é suportada.");
      }

      const currentStatus = String(attempt.status);
      const newStatus = this.resolveAllowedOption(String(payload.status), ATTEMPT_STATUS, "status");
      if (canonicalTextKey(currentStatus) === canonicalTextKey("Venda realizada")) {
        throw new AppError("Tentativa com venda realizada não pode ser alterada.");
      }
      if (
        new Set([canonicalTextKey("Proposta Recusada"), canonicalTextKey("Não tem interesse")]).has(
          canonicalTextKey(currentStatus),
        ) &&
        canonicalTextKey(newStatus) === canonicalTextKey("Venda realizada")
      ) {
        throw new AppError("Crie uma nova tentativa antes de marcar venda realizada.");
      }

      const allowed = this.allowedNextStatuses(currentStatus);
      if (![...allowed].some((status) => canonicalTextKey(status) === canonicalTextKey(newStatus))) {
        throw new AppError("Transição de status da tentativa não é permitida.");
      }

      const response = await this.db.fetchOne<Record<string, unknown>>(
        "update tentativa_contato set status = %s where id_tentativa = %s returning *",
        [newStatus, attemptId],
      );
      if (canonicalTextKey(newStatus) === canonicalTextKey("Não tem interesse")) {
        await this.leadService.updateSituation(Number(attempt.id_lead), "Inativo");
      }
      if (canonicalTextKey(newStatus) === canonicalTextKey("Reunião Marcada")) {
        response.notification = "Necessário registrar uma reunião para este lead.";
      }
      if (canonicalTextKey(newStatus) === canonicalTextKey("Venda realizada")) {
        response.notification = "Necessário registrar uma venda para este lead.";
      }
      return response;
    });
  }

  async deleteAttempt(attemptId: number) {
    return this.db.transaction(async () => {
      const attempt = (await this.getOne("id_tentativa", attemptId)) as Record<string, unknown>;
      const lead = (await this.leadService.getLead(Number(attempt.id_lead))) as Record<string, unknown>;
      if (canonicalTextKey(lead.situacao) !== canonicalTextKey("Inativo")) {
        throw new AppError("Tentativa registrada só pode ser excluída quando o lead estiver Inativo.");
      }
      await this.db.execute("delete from tentativa_contato where id_tentativa = %s", [attemptId]);
      await this.leadService.refreshSituationFromHistory(Number(attempt.id_lead));
    });
  }

  async hasAttemptForLead(leadId: number) {
    return this.db.exists("select 1 from tentativa_contato where id_lead = %s limit 1", [leadId]);
  }

  private validateChannelModality(channel: string, modality: string) {
    let expected: string | undefined;
    for (const [allowedChannel, allowedModality] of ATTEMPT_CHANNEL_MODALITY.entries()) {
      if (canonicalTextKey(allowedChannel) === canonicalTextKey(channel)) {
        expected = allowedModality;
        break;
      }
    }
    if (expected !== modality) {
      throw new AppError("Canal incompatível com a modalidade informada.");
    }
  }

  private resolveAllowedOption(value: string, allowed: Set<string>, fieldName: string) {
    const candidateKey = canonicalTextKey(value);
    for (const option of allowed) {
      if (canonicalTextKey(option) === candidateKey) {
        return option;
      }
    }
    throw new AppError(`Valor inválido para ${fieldName}.`);
  }

  private allowedNextStatuses(currentStatus: string) {
    const currentKey = canonicalTextKey(currentStatus);
    for (const [status, allowed] of ATTEMPT_STATUS_FLOW.entries()) {
      if (canonicalTextKey(status) === currentKey) {
        return allowed;
      }
    }
    return new Set<string>();
  }

  private ensureDateAfterLead(leadDateRaw: string, attemptDate: string) {
    const leadDate = parseDate(leadDateRaw, "data_cadastro");
    if (attemptDate < leadDate) {
      throw new AppError("Data da tentativa não pode ser menor que a data de cadastro do lead.");
    }
  }

  private async validateTerminalHistory(leadId: number) {
    const result = await this.db.fetchOptional<Record<string, unknown>>(
      `
      select status
      from tentativa_contato
      where id_lead = %s
      order by data_tentativa desc, id_tentativa desc
      limit 1
      `,
      [leadId],
    );
    if (result && canonicalTextKey(result.status) === canonicalTextKey("Venda realizada")) {
      throw new AppError("Lead já possui tentativa finalizada como venda realizada.");
    }
  }
}
