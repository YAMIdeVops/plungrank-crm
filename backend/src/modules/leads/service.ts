import { LEAD_SITUATIONS, LEAD_SOURCES } from "../../core/constants";
import { AppError } from "../../core/errors";
import { canonicalTextKey, normalizePhone, normalizeText } from "../../core/formatters";
import { ensureNotFuture, parseDate, requireFields, validateState } from "../../core/validators";
import { BaseService } from "../../services/base-service";

export class LeadService extends BaseService {
  protected tableName = "leads";

  async listLeads(filters: Record<string, string>) {
    let sql = "select * from leads where 1=1";
    const params: unknown[] = [];

    if (filters.telefone) {
      sql += " and telefone = %s";
      params.push(normalizePhone(filters.telefone));
    }
    if (filters.nome_contato) {
      sql += " and nome_contato ilike %s";
      params.push(`%${normalizeText(filters.nome_contato)}%`);
    }
    if (filters.nome_empresa) {
      sql += " and nome_empresa ilike %s";
      params.push(`%${normalizeText(filters.nome_empresa)}%`);
    }
    if (filters.nicho) {
      sql += " and nicho = %s";
      params.push(normalizeText(filters.nicho));
    }
    if (filters.fonte_lead) {
      sql += " and fonte_lead = %s";
      params.push(this.resolveLeadSource(filters.fonte_lead));
    }
    if (filters.situacao) {
      sql += " and situacao = %s";
      params.push(this.resolveLeadSituation(filters.situacao));
    }
    if (filters.tem_site) {
      sql += " and tem_site = %s";
      params.push(this.normalizeTemSite(filters.tem_site));
    }

    sql += " order by data_cadastro desc, id_lead desc";
    return this.db.fetchAll(sql, params);
  }

  async getLead(leadId: number) {
    return this.getOne("id_lead", leadId);
  }

  async createLead(payload: Record<string, unknown>, _userId: string) {
    return this.db.transaction(async () => {
      requireFields(payload, [
        "nome_contato",
        "nome_empresa",
        "telefone",
        "nicho",
        "fonte_lead",
        "estado",
        "tem_site",
        "data_cadastro",
      ]);

      const telefone = normalizePhone(String(payload.telefone));
      await this.ensureUniquePhone(telefone);
      const fonteLead = this.resolveLeadSource(String(payload.fonte_lead));
      const dataCadastro = parseDate(payload.data_cadastro, "data_cadastro");
      ensureNotFuture(dataCadastro, "data_cadastro");
      const instagram = normalizeText(payload.instagram, "--") || "--";
      const duplicateInstagram = instagram !== "--" ? await this.findDuplicateInstagram(instagram) : null;

      const situacao = this.resolveLeadSituation(String(payload.situacao ?? "Novo"));
      if (canonicalTextKey(situacao) === canonicalTextKey("Em prospecção")) {
        throw new AppError("Lead só pode ser criado como Em prospecção após existir tentativa de contato.");
      }
      if (canonicalTextKey(situacao) === canonicalTextKey("Cliente")) {
        throw new AppError("Lead só pode ser criado como Cliente após existir venda registrada.");
      }

      const response = await this.db.fetchOne<Record<string, unknown>>(
        `
        insert into leads (
          nome_contato, nome_empresa, telefone, instagram, nicho, fonte_lead,
          situacao, estado, tem_site, data_cadastro
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning *
        `,
        [
          normalizeText(payload.nome_contato),
          normalizeText(payload.nome_empresa),
          telefone,
          instagram,
          normalizeText(payload.nicho),
          fonteLead,
          situacao,
          validateState(String(payload.estado)),
          this.normalizeTemSite(String(payload.tem_site)),
          dataCadastro,
        ],
      );

      if (duplicateInstagram) {
        response.alerta_instagram = "Instagram já existe em outro lead. Cadastro permitido com alerta.";
      }
      return response;
    });
  }

  async updateLead(leadId: number, payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      const lead = await this.getLead(leadId);
      const updateData: Record<string, unknown> = {};

      if ("data_cadastro" in payload) {
        throw new AppError("Data de cadastro do lead não pode ser alterada.");
      }

      if ("nome_contato" in payload) {
        updateData.nome_contato = normalizeText(payload.nome_contato);
      }
      if ("nome_empresa" in payload) {
        updateData.nome_empresa = normalizeText(payload.nome_empresa);
      }
      if ("instagram" in payload) {
        updateData.instagram = normalizeText(payload.instagram, "--") || "--";
      }
      if ("nicho" in payload) {
        updateData.nicho = normalizeText(payload.nicho);
      }
      if ("fonte_lead" in payload) {
        updateData.fonte_lead = this.resolveLeadSource(String(payload.fonte_lead));
      }
      if ("situacao" in payload) {
        const newStatus = this.resolveLeadSituation(String(payload.situacao));
        await this.validateManualSituationChange(lead as Record<string, unknown>, newStatus);
        updateData.situacao = newStatus;
      }
      if ("estado" in payload) {
        updateData.estado = validateState(String(payload.estado));
      }
      if ("tem_site" in payload) {
        updateData.tem_site = this.normalizeTemSite(String(payload.tem_site));
      }

      return this.updateById("id_lead", leadId, updateData);
    });
  }

  async deleteLead(leadId: number) {
    return this.db.transaction(async () => {
      const lead = await this.getLead(leadId);
      if (canonicalTextKey((lead as Record<string, unknown>).situacao) !== canonicalTextKey("Inativo")) {
        throw new AppError("Lead só pode ser excluído quando estiver Inativo.");
      }

      await this.db.execute("delete from vendas where id_lead = %s", [leadId]);
      await this.db.execute("delete from reuniao where id_lead = %s", [leadId]);
      await this.db.execute("delete from tentativa_contato where id_lead = %s", [leadId]);
      await this.db.execute("delete from leads where id_lead = %s", [leadId]);
    });
  }

  async updateSituation(leadId: number, newStatus: string) {
    await this.db.execute("update leads set situacao = %s where id_lead = %s", [
      this.resolveLeadSituation(newStatus),
      leadId,
    ]);
  }

  async refreshSituationFromHistory(leadId: number) {
    const lead = await this.getLead(leadId);
    if (canonicalTextKey((lead as Record<string, unknown>).situacao) === canonicalTextKey("Inativo")) {
      return;
    }

    const history = await this.getHistorySnapshot(leadId);
    if (history.hasSale) {
      await this.updateSituation(leadId, "Cliente");
      return;
    }
    if (history.latestAttemptStatus) {
      if (canonicalTextKey(history.latestAttemptStatus) === canonicalTextKey("Não tem interesse")) {
        await this.updateSituation(leadId, "Inativo");
        return;
      }
      await this.updateSituation(leadId, "Em prospecção");
      return;
    }

    await this.updateSituation(leadId, "Novo");
  }

  async hasSale(leadId: number) {
    return (await this.getHistorySnapshot(leadId)).hasSale;
  }

  async hasAttempt(leadId: number) {
    return (await this.getHistorySnapshot(leadId)).hasAttempt;
  }

  async getHistorySnapshot(leadId: number) {
    const result = await this.db.fetchOne<Record<string, unknown>>(
      `
      select
          exists(select 1 from tentativa_contato where id_lead = %s) as has_attempt,
          exists(select 1 from vendas where id_lead = %s) as has_sale,
          (
              select status
              from tentativa_contato
              where id_lead = %s
              order by data_tentativa desc, id_tentativa desc
              limit 1
          ) as latest_attempt_status
      `,
      [leadId, leadId, leadId],
    );

    return {
      hasAttempt: Boolean(result.has_attempt),
      hasSale: Boolean(result.has_sale),
      latestAttemptStatus: (result.latest_attempt_status as string | null | undefined) ?? null,
    };
  }

  ensureAllowsNewRelatedRecords(lead: Record<string, unknown>) {
    if (canonicalTextKey(lead.situacao) === canonicalTextKey("Inativo")) {
      throw new AppError("Lead inativo não pode receber novos registros de tentativa, reunião ou venda.");
    }
  }

  private async ensureUniquePhone(phone: string) {
    if (await this.db.exists("select 1 from leads where telefone = %s limit 1", [phone])) {
      throw new AppError("Telefone já cadastrado.");
    }
  }

  private async findDuplicateInstagram(instagram: string) {
    return this.db.fetchOptional("select id_lead from leads where instagram = %s limit 1", [instagram]);
  }

  private async validateManualSituationChange(lead: Record<string, unknown>, newStatus: string) {
    const history = await this.getHistorySnapshot(Number(lead.id_lead));
    if (
      history.hasSale &&
      new Set([canonicalTextKey("Novo"), canonicalTextKey("Em prospecção")]).has(canonicalTextKey(newStatus))
    ) {
      throw new AppError("Lead com venda registrada não pode voltar para essa situação.");
    }
    if (canonicalTextKey(newStatus) === canonicalTextKey("Em prospecção") && !history.hasAttempt) {
      throw new AppError("Lead só pode virar Em prospecção quando existir tentativa de contato.");
    }
    if (canonicalTextKey(newStatus) === canonicalTextKey("Cliente") && !history.hasSale) {
      throw new AppError("Lead só pode virar Cliente quando existir uma venda.");
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

  private resolveLeadSource(value: string) {
    return this.resolveAllowedOption(normalizeText(value), LEAD_SOURCES, "fonte_lead");
  }

  private resolveLeadSituation(value: string) {
    return this.resolveAllowedOption(normalizeText(value), LEAD_SITUATIONS, "situacao");
  }

  private normalizeTemSite(value: string) {
    const normalizedKey = canonicalTextKey(value);
    if (normalizedKey === canonicalTextKey("SIM")) {
      return "SIM";
    }
    if (new Set([canonicalTextKey("NÃO"), canonicalTextKey("NAO"), canonicalTextKey("Não")]).has(normalizedKey)) {
      return "NÃO";
    }
    throw new AppError("tem_site deve ser SIM ou NÃO.");
  }
}
