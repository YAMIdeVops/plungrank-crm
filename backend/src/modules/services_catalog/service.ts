import { AppError } from "../../core/errors";
import { normalizeText } from "../../core/formatters";
import { ensurePositiveNumber, requireFields } from "../../core/validators";
import { BaseService } from "../../services/base-service";

export class ServiceCatalogService extends BaseService {
  protected tableName = "servicos";

  async listServices() {
    const rows = await this.db.fetchAll<Record<string, unknown>>("select * from servicos order by servico asc");
    return rows.map((item) => this.serializeService(item));
  }

  async createService(payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      requireFields(payload, ["nome_servico", "valor"]);
      const nomeServico = normalizeText(payload.nome_servico);
      if (await this.db.exists("select 1 from servicos where servico = %s limit 1", [nomeServico])) {
        throw new AppError("Nome do serviço já cadastrado.");
      }

      const inserted = await this.db.fetchOne<Record<string, unknown>>(
        "insert into servicos (servico, valor) values (%s, %s) returning *",
        [nomeServico, ensurePositiveNumber(payload.valor, "valor")],
      );
      return this.serializeService(inserted);
    });
  }

  async updateService(serviceId: number, payload: Record<string, unknown>) {
    return this.db.transaction(async () => {
      const current = (await this.getOne("id_servico", serviceId)) as Record<string, unknown>;
      const hasSales = await this.hasSales(serviceId);
      const updateData: Record<string, unknown> = {};

      if ("nome_servico" in payload) {
        const nextName = normalizeText(payload.nome_servico);
        if (nextName !== current.servico && hasSales) {
          throw new AppError("Nome de servico vinculado a vendas nao pode ser alterado.");
        }
        updateData.servico = nextName;
      }

      if ("valor" in payload) {
        const nextValue = ensurePositiveNumber(payload.valor, "valor");
        if (nextValue !== Number(current.valor) && hasSales) {
          throw new AppError("Valor de servico vinculado a vendas nao pode ser alterado.");
        }
        updateData.valor = nextValue;
      }

      const updated = await this.updateById("id_servico", serviceId, updateData);
      return this.serializeService(updated as Record<string, unknown>);
    });
  }

  async deleteService(serviceId: number) {
    return this.db.transaction(async () => {
      const linkedActiveSale = await this.db.fetchOptional(
        `
        select v.id_venda
        from vendas v
        join leads l on l.id_lead = v.id_lead
        where v.id_servico = %s
          and l.situacao <> %s
        limit 1
        `,
        [serviceId, "Inativo"],
      );
      if (linkedActiveSale) {
        throw new AppError("Servico vendido so pode ser excluido quando todos os leads vinculados estiverem Inativos.");
      }
      await this.db.execute("delete from servicos where id_servico = %s", [serviceId]);
    });
  }

  private serializeService(row: Record<string, unknown>) {
    return {
      id_servico: Number(row.id_servico),
      nome_servico: String(row.servico),
      valor: Number(row.valor),
    };
  }

  private async hasSales(serviceId: number) {
    return this.db.exists("select 1 from vendas where id_servico = %s limit 1", [serviceId]);
  }
}
