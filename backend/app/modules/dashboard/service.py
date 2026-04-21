from app.services.database import DatabaseService


class DashboardService:
    def __init__(self):
        self.db = DatabaseService()

    def get_metrics(self, filters: dict) -> dict:
        period_start = filters.get("periodo_inicio")
        period_end = filters.get("periodo_fim")

        row = self.db.fetch_one(
            """
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
            """,
            [
                period_start,
                period_start,
                period_end,
                period_end,
                period_start,
                period_start,
                period_end,
                period_end,
                "Em prospecção",
                period_start,
                period_start,
                period_end,
                period_end,
                "Realizada",
                period_start,
                period_start,
                period_end,
                period_end,
            ],
        )

        return {
            "total_leads": int(row["total_leads"] or 0),
            "total_leads_prospectados": int(row["total_leads_prospectados"] or 0),
            "total_reunioes_realizadas": int(row["total_reunioes_realizadas"] or 0),
            "total_vendas_realizadas": int(row["total_vendas_realizadas"] or 0),
        }
