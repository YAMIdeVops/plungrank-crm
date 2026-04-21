from app.core.constants import LEAD_SITUATIONS, LEAD_SOURCES
from app.core.errors import AppError
from app.core.formatters import canonical_text_key, normalize_phone, normalize_text
from app.core.validators import ensure_not_future, parse_date, require_fields, validate_state
from app.services.base_service import BaseService


class LeadService(BaseService):
    table_name = "leads"

    def list_leads(self, filters: dict) -> list[dict]:
        sql = "select * from leads where 1=1"
        params: list = []

        if filters.get("telefone"):
            sql += " and telefone = %s"
            params.append(normalize_phone(filters["telefone"]))
        if filters.get("nome_contato"):
            sql += " and nome_contato ilike %s"
            params.append(f"%{normalize_text(filters['nome_contato'])}%")
        if filters.get("nome_empresa"):
            sql += " and nome_empresa ilike %s"
            params.append(f"%{normalize_text(filters['nome_empresa'])}%")
        if filters.get("nicho"):
            sql += " and nicho = %s"
            params.append(normalize_text(filters["nicho"]))
        if filters.get("fonte_lead"):
            sql += " and fonte_lead = %s"
            params.append(self._resolve_lead_source(filters["fonte_lead"]))
        if filters.get("situacao"):
            sql += " and situacao = %s"
            params.append(self._resolve_lead_situation(filters["situacao"]))
        if filters.get("tem_site"):
            sql += " and tem_site = %s"
            params.append(self._normalize_tem_site(filters["tem_site"]))

        sql += " order by data_cadastro desc, id_lead desc"
        return self.db.fetch_all(sql, params)

    def get_lead(self, lead_id: int) -> dict:
        return self.get_one("id_lead", lead_id)

    def create_lead(self, payload: dict, user_id: str) -> dict:
        require_fields(
            payload,
            [
                "nome_contato",
                "nome_empresa",
                "telefone",
                "nicho",
                "fonte_lead",
                "estado",
                "tem_site",
                "data_cadastro",
            ],
        )
        telefone = normalize_phone(payload["telefone"])
        self._ensure_unique_phone(telefone)
        fonte_lead = self._resolve_lead_source(payload["fonte_lead"])
        data_cadastro = parse_date(payload["data_cadastro"], "data_cadastro")
        ensure_not_future(data_cadastro, "data_cadastro")
        instagram = normalize_text(payload.get("instagram"), "--") or "--"
        duplicate_instagram = None
        if instagram != "--":
            duplicate_instagram = self._find_duplicate_instagram(instagram)

        situacao = self._resolve_lead_situation(payload.get("situacao", "Novo"))
        if canonical_text_key(situacao) == canonical_text_key("Em prospecÃ§Ã£o"):
            raise AppError("Lead sÃ³ pode ser criado como Em prospecÃ§Ã£o apÃ³s existir tentativa de contato.")
        if canonical_text_key(situacao) == canonical_text_key("Cliente"):
            raise AppError("Lead sÃ³ pode ser criado como Cliente apÃ³s existir venda registrada.")

        response = self.db.fetch_one(
            """
            insert into leads (
              nome_contato, nome_empresa, telefone, instagram, nicho, fonte_lead,
              situacao, estado, tem_site, data_cadastro
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            returning *
            """,
            [
                normalize_text(payload["nome_contato"]),
                normalize_text(payload["nome_empresa"]),
                telefone,
                instagram,
                normalize_text(payload["nicho"]),
                fonte_lead,
                situacao,
                validate_state(payload["estado"]),
                self._normalize_tem_site(payload["tem_site"]),
                data_cadastro.isoformat(),
            ],
        )
        if duplicate_instagram:
            response["alerta_instagram"] = "Instagram jÃ¡ existe em outro lead. Cadastro permitido com alerta."
        return response

    def update_lead(self, lead_id: int, payload: dict) -> dict:
        lead = self.get_lead(lead_id)
        update_data = {}

        if "data_cadastro" in payload:
            raise AppError("Data de cadastro do lead nao pode ser alterada.")

        if "nome_contato" in payload:
            update_data["nome_contato"] = normalize_text(payload["nome_contato"])
        if "nome_empresa" in payload:
            update_data["nome_empresa"] = normalize_text(payload["nome_empresa"])
        if "instagram" in payload:
            update_data["instagram"] = normalize_text(payload["instagram"], "--") or "--"
        if "nicho" in payload:
            update_data["nicho"] = normalize_text(payload["nicho"])
        if "fonte_lead" in payload:
            update_data["fonte_lead"] = self._resolve_lead_source(payload["fonte_lead"])
        if "situacao" in payload:
            new_status = self._resolve_lead_situation(payload["situacao"])
            self._validate_manual_situation_change(lead, new_status)
            update_data["situacao"] = new_status
        if "estado" in payload:
            update_data["estado"] = validate_state(payload["estado"])
        if "tem_site" in payload:
            update_data["tem_site"] = self._normalize_tem_site(payload["tem_site"])

        return self.update_by_id("id_lead", lead_id, update_data)

    def delete_lead(self, lead_id: int) -> None:
        lead = self.get_lead(lead_id)
        if canonical_text_key(lead["situacao"]) != canonical_text_key("Inativo"):
            raise AppError("Lead sÃ³ pode ser excluÃ­do quando estiver Inativo.")
        with self.db.connection() as conn, conn.cursor() as cur:
            cur.execute("delete from vendas where id_lead = %s", [lead_id])
            cur.execute("delete from reuniao where id_lead = %s", [lead_id])
            cur.execute("delete from tentativa_contato where id_lead = %s", [lead_id])
            cur.execute("delete from leads where id_lead = %s", [lead_id])

    def update_situation(self, lead_id: int, new_status: str) -> None:
        resolved_status = self._resolve_lead_situation(new_status)
        self.db.execute("update leads set situacao = %s where id_lead = %s", [resolved_status, lead_id])

    def refresh_situation_from_history(self, lead_id: int) -> None:
        lead = self.get_lead(lead_id)
        if canonical_text_key(lead["situacao"]) == canonical_text_key("Inativo"):
            return

        history = self.get_history_snapshot(lead_id)
        if history["has_sale"]:
            self.update_situation(lead_id, "Cliente")
            return

        if history["latest_attempt_status"]:
            if canonical_text_key(history["latest_attempt_status"]) == canonical_text_key("NÃ£o tem interesse"):
                self.update_situation(lead_id, "Inativo")
                return
            self.update_situation(lead_id, "Em prospecÃ§Ã£o")
            return

        self.update_situation(lead_id, "Novo")

    def has_sale(self, lead_id: int) -> bool:
        return self.get_history_snapshot(lead_id)["has_sale"]

    def has_attempt(self, lead_id: int) -> bool:
        return self.get_history_snapshot(lead_id)["has_attempt"]

    def get_history_snapshot(self, lead_id: int) -> dict:
        result = self.db.fetch_one(
            """
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
            """,
            [lead_id, lead_id, lead_id],
        )
        return {
            "has_attempt": bool(result["has_attempt"]),
            "has_sale": bool(result["has_sale"]),
            "latest_attempt_status": result["latest_attempt_status"],
        }

    def ensure_allows_new_related_records(self, lead: dict) -> None:
        if canonical_text_key(lead["situacao"]) == canonical_text_key("Inativo"):
            raise AppError("Lead inativo nÃ£o pode receber novos registros de tentativa, reuniÃ£o ou venda.")

    def _ensure_unique_phone(self, phone: str) -> None:
        result = self.db.fetch_optional("select id_lead from leads where telefone = %s limit 1", [phone])
        if result:
            raise AppError("Telefone jÃ¡ cadastrado.")

    def _find_duplicate_instagram(self, instagram: str):
        return self.db.fetch_optional("select id_lead from leads where instagram = %s limit 1", [instagram])

    def _validate_manual_situation_change(self, lead: dict, new_status: str) -> None:
        history = self.get_history_snapshot(lead["id_lead"])
        if history["has_sale"] and canonical_text_key(new_status) in {
            canonical_text_key("Novo"),
            canonical_text_key("Em prospecÃ§Ã£o"),
        }:
            raise AppError("Lead com venda registrada nÃ£o pode voltar para essa situaÃ§Ã£o.")
        if canonical_text_key(new_status) == canonical_text_key("Em prospecÃ§Ã£o") and not history["has_attempt"]:
            raise AppError("Lead sÃ³ pode virar Em prospecÃ§Ã£o quando existir tentativa de contato.")
        if canonical_text_key(new_status) == canonical_text_key("Cliente") and not history["has_sale"]:
            raise AppError("Lead sÃ³ pode virar Cliente quando existir uma venda.")

    def _resolve_allowed_option(self, value: str, allowed: set[str], field_name: str) -> str:
        candidate_key = canonical_text_key(value)
        for option in allowed:
            if canonical_text_key(option) == candidate_key:
                return option
        raise AppError(f"Valor invÃ¡lido para {field_name}.")

    def _resolve_lead_source(self, value: str) -> str:
        return self._resolve_allowed_option(normalize_text(value), LEAD_SOURCES, "fonte_lead")

    def _resolve_lead_situation(self, value: str) -> str:
        return self._resolve_allowed_option(normalize_text(value), LEAD_SITUATIONS, "situacao")

    def _normalize_tem_site(self, value: str) -> str:
        normalized_key = canonical_text_key(value)
        if normalized_key == canonical_text_key("SIM"):
            return "SIM"
        if normalized_key in {canonical_text_key("NÃƒO"), canonical_text_key("NAO")}:
            return "NÃƒO"
        raise AppError("tem_site deve ser SIM ou NÃƒO.")
