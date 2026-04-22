import { SALES_ORIGINS } from "../../core/constants";
import { AppError } from "../../core/errors";
import { canonicalTextKey, normalizeText } from "../../core/formatters";
import { ensureNotFuture, ensurePositiveNumber, parseDate, requireFields, validateEnum } from "../../core/validators";
import { BaseService } from "../../services/base-service";
import { AttemptService } from "../attempts/service";
import { LeadService } from "../leads/service";

export class SaleService extends BaseService {
  protected tableName = "vendas";
  private leadService = new LeadService();
  private attemptService = new AttemptService();

  async listSales(filters: Record<string, string>) {
    let sql = "select * from vendas where 1=1";
    const params: unknown[] = [];

    if (filters.origem_fechamento) {
      sql += " and origem_fechamento = %s";
      params.push(this.resolveOrigin(filters.origem_fechamento));
    }
    if (filters.id_servico) {
      sql += " and id_servico = %s";
      params.push(Number(filters.id_servico));
    }
    if (filters.periodo_inicio) {
      sql += " and data_venda >= %s";
      params.push(filters.periodo_inicio);
    }
    if (filters.periodo_fim) {
      sql += " and data_venda <= %s";
      params.push(filters.periodo_fim);
    }

    sql += " order by data_venda desc, id_venda desc";
    return this.db.fetchAll(sql, params);
  }

  async createSale(payload: Record<string, unknown>, _userId: string) {
    return this.db.transaction(async () => {
      requireFields(payload, ["id_lead", "id_servico", "origem_fechamento", "valor_venda", "data_venda"]);
      const lead = (await this.leadService.getLead(Number(payload.id_lead))) as Record<string, unknown>;
      this.leadService.ensureAllowsNewRelatedRecords(lead);
      if (!(await this.attemptService.hasAttemptForLead(Number(lead.id_lead)))) {
        throw new AppError("Só é possível registrar venda após existir tentativa de contato.");
      }

      const service = await this.db.fetchOptional<Record<string, unknown>>(
        "select * from servicos where id_servico = %s limit 1",
        [Number(payload.id_servico)],
      );
      if (!service) {
        throw new AppError("Serviço informado não existe.");
      }

      const saleDate = parseDate(payload.data_venda, "data_venda");
      ensureNotFuture(saleDate, "data_venda");
      const leadDate = parseDate(lead.data_cadastro, "data_cadastro");
      if (saleDate < leadDate) {
        throw new AppError("Data da venda não pode ser menor que a data de cadastro do lead.");
      }

      const origemFechamento = this.resolveOrigin(String(payload.origem_fechamento));

      const meetingId = payload.id_reuniao ? Number(payload.id_reuniao) : null;
      if (meetingId) {
        const meeting = await this.db.fetchOptional<Record<string, unknown>>(
          "select * from reuniao where id_reuniao = %s limit 1",
          [meetingId],
        );
        if (!meeting) {
          throw new AppError("Reunião informada não existe.");
        }
        if (Number(meeting.id_lead) !== Number(lead.id_lead)) {
          throw new AppError("Reunião informada deve pertencer ao mesmo lead da venda.");
        }
      }

      const response = await this.db.fetchOne<Record<string, unknown>>(
        `
        insert into vendas (
          id_lead, id_servico, id_reuniao, origem_fechamento, valor_venda, data_venda
        )
        values (%s, %s, %s, %s, %s, %s)
        returning *
        `,
        [
          Number(lead.id_lead),
          Number(payload.id_servico),
          meetingId,
          origemFechamento,
          ensurePositiveNumber(payload.valor_venda, "valor_venda"),
          saleDate,
        ],
      );
      await this.leadService.updateSituation(Number(lead.id_lead), "Cliente");
      return response;
    });
  }

  async updateSale(saleId: number, payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      const sale = (await this.getOne("id_venda", saleId)) as Record<string, unknown>;
      const immutableMessages: Record<string, string> = {
        id_lead: "O lead da venda não pode ser alterado.",
        id_servico: "O serviço da venda não pode ser alterado.",
        origem_fechamento: "A origem da venda não pode ser alterada.",
        valor_venda: "O valor da venda não pode ser alterado.",
        data_venda: "A data da venda não pode ser alterada.",
        id_reuniao: "A reunião vinculada da venda não pode ser alterada.",
      };

      for (const [field, message] of Object.entries(immutableMessages)) {
        if (field in payload && payload[field] !== sale[field]) {
          throw new AppError(message);
        }
      }

      throw new AppError("Nenhuma alteração permitida para vendas registradas.");
    });
  }

  async deleteSale(saleId: number) {
    return this.db.transaction(async () => {
      const sale = (await this.getOne("id_venda", saleId)) as Record<string, unknown>;
      const lead = (await this.leadService.getLead(Number(sale.id_lead))) as Record<string, unknown>;
      if (canonicalTextKey(lead.situacao) !== canonicalTextKey("Inativo")) {
        throw new AppError("Venda registrada só pode ser excluída quando o lead estiver Inativo.");
      }
      await this.db.execute("delete from vendas where id_venda = %s", [saleId]);
      await this.leadService.refreshSituationFromHistory(Number(sale.id_lead));
    });
  }

  private resolveOrigin(value: string) {
    return validateEnum(normalizeText(value), SALES_ORIGINS, "origem_fechamento");
  }
}
