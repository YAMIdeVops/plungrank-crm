from app.services.database import DatabaseService


class DashboardService:
    def __init__(self):
        self.db = DatabaseService()

    def get_metrics(self, filters: dict) -> dict:
        period_start = filters.get("periodo_inicio")
        period_end = filters.get("periodo_fim")
        return {
            "total_leads": self._count("leads", period_start, period_end, "data_cadastro"),
            "total_leads_prospectados": self._count(
                "leads",
                period_start,
                period_end,
                "data_cadastro",
                {"situacao": "Em prospecção"},
            ),
            "total_reunioes_realizadas": self._count(
                "reuniao",
                period_start,
                period_end,
                "data_reuniao",
                {"status_reuniao": "Realizada"},
            ),
            "total_vendas_realizadas": self._count("vendas", period_start, period_end, "data_venda"),
        }

    def _count(
        self,
        table: str,
        period_start: str | None,
        period_end: str | None,
        field: str,
        equals: dict | None = None,
    ) -> int:
        sql = f"select count(*) as total from {table} where 1=1"
        params: list = []
        if period_start:
            sql += f" and {field} >= %s"
            params.append(period_start)
        if period_end:
            sql += f" and {field} <= %s"
            params.append(period_end)
        if equals:
            for key, value in equals.items():
                sql += f" and {key} = %s"
                params.append(value)
        return int(self.db.scalar(sql, params) or 0)
