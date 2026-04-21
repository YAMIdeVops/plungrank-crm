from app.core.errors import AppError
from app.core.formatters import canonical_text_key, normalize_text
from app.core.validators import ensure_positive_number, require_fields
from app.services.base_service import BaseService


class ServiceCatalogService(BaseService):
    table_name = "servicos"

    def list_services(self) -> list[dict]:
        rows = self.db.fetch_all("select * from servicos order by servico asc")
        return [self._serialize_service(item) for item in rows]

    def create_service(self, payload: dict) -> dict:
        require_fields(payload, ["nome_servico", "valor"])
        nome_servico = normalize_text(payload["nome_servico"])
        result = self.db.fetch_optional("select id_servico from servicos where servico = %s limit 1", [nome_servico])
        if result:
            raise AppError("Nome do serviÃƒÂ§o jÃƒÂ¡ cadastrado.")

        inserted = self.db.fetch_one(
            "insert into servicos (servico, valor) values (%s, %s) returning *",
            [nome_servico, ensure_positive_number(payload["valor"], "valor")],
        )
        return self._serialize_service(inserted)

    def update_service(self, service_id: int, payload: dict) -> dict:
        update_data = {}
        if "nome_servico" in payload:
            current = self.get_one("id_servico", service_id)
            next_name = normalize_text(payload["nome_servico"])
            if next_name != current["servico"] and self._has_sales(service_id):
                raise AppError("Nome de servico vinculado a vendas nao pode ser alterado.")
            update_data["servico"] = next_name
        if "valor" in payload:
            update_data["valor"] = ensure_positive_number(payload["valor"], "valor")
        updated = self.update_by_id("id_servico", service_id, update_data)
        return self._serialize_service(updated)

    def delete_service(self, service_id: int) -> None:
        linked_active_sale = self.db.fetch_optional(
            """
            select v.id_venda
            from vendas v
            join leads l on l.id_lead = v.id_lead
            where v.id_servico = %s
              and l.situacao <> %s
            limit 1
            """,
            [service_id, "Inativo"],
        )
        if linked_active_sale:
            raise AppError("Servico vendido so pode ser excluido quando todos os leads vinculados estiverem Inativos.")
        self.db.execute("delete from servicos where id_servico = %s", [service_id])

    def _serialize_service(self, row: dict) -> dict:
        return {
            "id_servico": row["id_servico"],
            "nome_servico": row["servico"],
            "valor": row["valor"],
        }

    def _has_sales(self, service_id: int) -> bool:
        return bool(self.db.fetch_optional("select id_venda from vendas where id_servico = %s limit 1", [service_id]))
