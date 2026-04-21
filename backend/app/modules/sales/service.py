from app.core.constants import SALES_ORIGINS
from app.core.errors import AppError
from app.core.formatters import canonical_text_key, normalize_text
from app.core.validators import ensure_not_future, ensure_positive_number, parse_date, require_fields, validate_enum
from app.modules.attempts.service import AttemptService
from app.modules.leads.service import LeadService
from app.services.base_service import BaseService


class SaleService(BaseService):
    table_name = "vendas"

    def __init__(self):
        super().__init__()
        self.lead_service = LeadService()
        self.attempt_service = AttemptService()

    def list_sales(self, filters: dict) -> list[dict]:
        sql = "select * from vendas where 1=1"
        params: list = []

        if filters.get("origem_fechamento"):
            sql += " and origem_fechamento = %s"
            params.append(filters["origem_fechamento"])
        if filters.get("id_servico"):
            sql += " and id_servico = %s"
            params.append(filters["id_servico"])
        if filters.get("periodo_inicio"):
            sql += " and data_venda >= %s"
            params.append(filters["periodo_inicio"])
        if filters.get("periodo_fim"):
            sql += " and data_venda <= %s"
            params.append(filters["periodo_fim"])

        sql += " order by data_venda desc, id_venda desc"
        return self.db.fetch_all(sql, params)

    def create_sale(self, payload: dict, user_id: str) -> dict:
        require_fields(payload, ["id_lead", "id_servico", "origem_fechamento", "valor_venda", "data_venda"])
        lead = self.lead_service.get_lead(payload["id_lead"])
        self.lead_service.ensure_allows_new_related_records(lead)
        if not self.attempt_service.has_attempt_for_lead(lead["id_lead"]):
            raise AppError("Só é possível registrar venda após existir tentativa de contato.")

        service = self.db.fetch_optional("select * from servicos where id_servico = %s limit 1", [payload["id_servico"]])
        if not service:
            raise AppError("Serviço informado não existe.")

        sale_date = parse_date(payload["data_venda"], "data_venda")
        ensure_not_future(sale_date, "data_venda")
        lead_date = parse_date(lead["data_cadastro"], "data_cadastro")
        if sale_date < lead_date:
            raise AppError("Data da venda não pode ser menor que a data de cadastro do lead.")

        origem_fechamento = validate_enum(normalize_text(payload["origem_fechamento"]), SALES_ORIGINS, "origem_fechamento")

        meeting_id = payload.get("id_reuniao")
        if meeting_id:
            meeting = self.db.fetch_optional("select * from reuniao where id_reuniao = %s limit 1", [meeting_id])
            if not meeting:
                raise AppError("Reunião informada não existe.")
            if meeting["id_lead"] != lead["id_lead"]:
                raise AppError("Reunião informada deve pertencer ao mesmo lead da venda.")

        response = self.db.fetch_one(
            """
            insert into vendas (
              id_lead, id_servico, id_reuniao, origem_fechamento, valor_venda, data_venda
            )
            values (%s, %s, %s, %s, %s, %s)
            returning *
            """,
            [
                lead["id_lead"],
                payload["id_servico"],
                meeting_id,
                origem_fechamento,
                ensure_positive_number(payload["valor_venda"], "valor_venda"),
                sale_date.isoformat(),
            ],
        )
        self.lead_service.update_situation(lead["id_lead"], "Cliente")
        return response

    def update_sale(self, sale_id: int, payload: dict) -> dict:
        sale = self.get_one("id_venda", sale_id)
        immutable_messages = {
            "id_lead": "O lead da venda não pode ser alterado.",
            "id_servico": "O serviço da venda não pode ser alterado.",
            "origem_fechamento": "A origem da venda não pode ser alterada.",
            "valor_venda": "O valor da venda não pode ser alterado.",
            "data_venda": "A data da venda não pode ser alterada.",
            "id_reuniao": "A reunião vinculada da venda não pode ser alterada.",
        }

        for field, message in immutable_messages.items():
            if field in payload and payload[field] != sale.get(field):
                raise AppError(message)

        raise AppError("Nenhuma alteração permitida para vendas registradas.")

    def delete_sale(self, sale_id: int) -> None:
        sale = self.get_one("id_venda", sale_id)
        lead = self.lead_service.get_lead(sale["id_lead"])
        if canonical_text_key(lead["situacao"]) != canonical_text_key("Inativo"):
            raise AppError("Venda registrada só pode ser excluída quando o lead estiver Inativo.")
        self.db.execute("delete from vendas where id_venda = %s", [sale_id])
        self.lead_service.refresh_situation_from_history(sale["id_lead"])
