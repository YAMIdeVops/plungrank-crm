import { DatabaseService } from "../../services/database";

export class DashboardService {
  private db = new DatabaseService();

  async getMetrics(filters: Record<string, string>) {
    const periodStart = filters.periodo_inicio || null;
    const periodEnd = filters.periodo_fim || null;

    const row = await this.db.fetchOne<Record<string, unknown>>(
      `
      select
          (
              select count(*)
              from leads
              where (%s::date is null or data_cadastro >= %s::date)
                and (%s::date is null or data_cadastro <= %s::date)
          ) as total_leads,
          (
              select count(*)
              from leads
              where (%s::date is null or data_cadastro >= %s::date)
                and (%s::date is null or data_cadastro <= %s::date)
                and situacao = %s
          ) as total_leads_prospectados,
          (
              select count(*)
              from reuniao
              where (%s::date is null or data_reuniao::date >= %s::date)
                and (%s::date is null or data_reuniao::date <= %s::date)
                and status_reuniao = %s
          ) as total_reunioes_realizadas,
          (
              select count(*)
              from vendas
              where (%s::date is null or data_venda >= %s::date)
                and (%s::date is null or data_venda <= %s::date)
          ) as total_vendas_realizadas
      `,
      [
        periodStart,
        periodStart,
        periodEnd,
        periodEnd,
        periodStart,
        periodStart,
        periodEnd,
        periodEnd,
        "Em prospecção",
        periodStart,
        periodStart,
        periodEnd,
        periodEnd,
        "Realizada",
        periodStart,
        periodStart,
        periodEnd,
        periodEnd,
      ],
    );

    return {
      total_leads: Number(row.total_leads || 0),
      total_leads_prospectados: Number(row.total_leads_prospectados || 0),
      total_reunioes_realizadas: Number(row.total_reunioes_realizadas || 0),
      total_vendas_realizadas: Number(row.total_vendas_realizadas || 0),
    };
  }
}
