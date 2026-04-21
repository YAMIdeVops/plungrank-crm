from app.core.constants import (
    ATTEMPT_CHANNEL_MODALITY,
    ATTEMPT_CHANNELS,
    ATTEMPT_MODALITIES,
    ATTEMPT_STATUS,
    ATTEMPT_STATUS_FLOW,
)
from app.core.errors import AppError
from app.core.formatters import canonical_text_key
from app.core.validators import ensure_not_future, parse_date, require_fields
from app.modules.leads.service import LeadService
from app.services.base_service import BaseService


class AttemptService(BaseService):
    table_name = "tentativa_contato"

    def __init__(self):
        super().__init__()
        self.lead_service = LeadService()

    def list_attempts(self, filters: dict) -> list[dict]:
        sql = "select * from tentativa_contato where 1=1"
        params: list = []

        if filters.get("modalidade"):
            sql += " and modalidade = %s"
            params.append(self._resolve_allowed_option(filters["modalidade"], ATTEMPT_MODALITIES, "modalidade"))
        if filters.get("canal"):
            sql += " and canal = %s"
            params.append(self._resolve_allowed_option(filters["canal"], ATTEMPT_CHANNELS, "canal"))
        if filters.get("status"):
            sql += " and status = %s"
            params.append(self._resolve_allowed_option(filters["status"], ATTEMPT_STATUS, "status"))

        sql += " order by data_tentativa desc, id_tentativa desc"
        return self.db.fetch_all(sql, params)

    def create_attempt(self, payload: dict, user_id: str) -> dict:
        with self.db.transaction():
            require_fields(payload, ["id_lead", "data_tentativa", "modalidade", "canal", "status"])
            lead = self.lead_service.get_lead(payload["id_lead"])
            self.lead_service.ensure_allows_new_related_records(lead)

            data_tentativa = parse_date(payload["data_tentativa"], "data_tentativa")
            ensure_not_future(data_tentativa, "data_tentativa")
            self._ensure_date_after_lead(lead["data_cadastro"], data_tentativa)

            modalidade = self._resolve_allowed_option(payload["modalidade"], ATTEMPT_MODALITIES, "modalidade")
            canal = self._resolve_allowed_option(payload["canal"], ATTEMPT_CHANNELS, "canal")
            status = self._resolve_allowed_option(payload["status"], ATTEMPT_STATUS, "status")

            self._validate_channel_modality(canal, modalidade)
            self._validate_terminal_history(lead["id_lead"])

            response = self.db.fetch_one(
                """
                insert into tentativa_contato (id_lead, data_tentativa, modalidade, canal, status)
                values (%s, %s, %s, %s, %s)
                returning *
                """,
                [lead["id_lead"], data_tentativa.isoformat(), modalidade, canal, status],
            )

            if canonical_text_key(lead["situacao"]) == canonical_text_key("Novo"):
                self.lead_service.update_situation(lead["id_lead"], "Em prospecção")
            if canonical_text_key(status) == canonical_text_key("Não tem interesse"):
                self.lead_service.update_situation(lead["id_lead"], "Inativo")
            if canonical_text_key(status) == canonical_text_key("Reunião Marcada"):
                response["notification"] = "Necessário registrar uma reunião para este lead."
            if canonical_text_key(status) == canonical_text_key("Venda realizada"):
                response["notification"] = "Necessário registrar uma venda para este lead."
            return response

    def update_attempt(self, attempt_id: int, payload: dict) -> dict:
        with self.db.transaction():
            attempt = self.get_one("id_tentativa", attempt_id)
            if "data_tentativa" in payload and payload["data_tentativa"] != attempt["data_tentativa"]:
                raise AppError("Data da tentativa não pode ser alterada.")
            if "canal" in payload and payload["canal"] != attempt["canal"]:
                raise AppError("Canal da tentativa não pode ser alterado.")
            if "modalidade" in payload and payload["modalidade"] != attempt["modalidade"]:
                raise AppError("Modalidade da tentativa não pode ser alterada.")
            if "status" not in payload:
                raise AppError("Apenas atualização de status é suportada.")

            current_status = attempt["status"]
            new_status = self._resolve_allowed_option(payload["status"], ATTEMPT_STATUS, "status")
            if canonical_text_key(current_status) == canonical_text_key("Venda realizada"):
                raise AppError("Tentativa com venda realizada não pode ser alterada.")
            if canonical_text_key(current_status) in {
                canonical_text_key("Proposta Recusada"),
                canonical_text_key("Não tem interesse"),
            } and canonical_text_key(new_status) == canonical_text_key("Venda realizada"):
                raise AppError("Crie uma nova tentativa antes de marcar venda realizada.")

            allowed = self._allowed_next_statuses(current_status)
            if canonical_text_key(new_status) not in {canonical_text_key(status) for status in allowed}:
                raise AppError("Transição de status da tentativa não é permitida.")

            response = self.db.fetch_one(
                "update tentativa_contato set status = %s where id_tentativa = %s returning *",
                [new_status, attempt_id],
            )
            if canonical_text_key(new_status) == canonical_text_key("Não tem interesse"):
                self.lead_service.update_situation(attempt["id_lead"], "Inativo")
            if canonical_text_key(new_status) == canonical_text_key("Reunião Marcada"):
                response["notification"] = "Necessário registrar uma reunião para este lead."
            if canonical_text_key(new_status) == canonical_text_key("Venda realizada"):
                response["notification"] = "Necessário registrar uma venda para este lead."
            return response

    def delete_attempt(self, attempt_id: int) -> None:
        with self.db.transaction():
            attempt = self.get_one("id_tentativa", attempt_id)
            lead = self.lead_service.get_lead(attempt["id_lead"])
            if canonical_text_key(lead["situacao"]) != canonical_text_key("Inativo"):
                raise AppError("Tentativa registrada só pode ser excluída quando o lead estiver Inativo.")
            self.db.execute("delete from tentativa_contato where id_tentativa = %s", [attempt_id])
            self.lead_service.refresh_situation_from_history(attempt["id_lead"])

    def has_attempt_for_lead(self, lead_id: int) -> bool:
        return self.db.exists(
            "select 1 from tentativa_contato where id_lead = %s limit 1",
            [lead_id],
        )

    def _validate_channel_modality(self, channel: str, modality: str) -> None:
        expected = None
        for allowed_channel, allowed_modality in ATTEMPT_CHANNEL_MODALITY.items():
            if canonical_text_key(allowed_channel) == canonical_text_key(channel):
                expected = allowed_modality
                break
        if expected != modality:
            raise AppError("Canal incompatível com a modalidade informada.")

    def _resolve_allowed_option(self, value: str, allowed: set[str], field_name: str) -> str:
        candidate_key = canonical_text_key(value)
        for option in allowed:
            if canonical_text_key(option) == candidate_key:
                return option
        raise AppError(f"Valor inválido para {field_name}.")

    def _allowed_next_statuses(self, current_status: str) -> set[str]:
        current_key = canonical_text_key(current_status)
        for status, allowed in ATTEMPT_STATUS_FLOW.items():
            if canonical_text_key(status) == current_key:
                return allowed
        return set()

    def _ensure_date_after_lead(self, lead_date_raw: str, attempt_date) -> None:
        lead_date = parse_date(lead_date_raw, "data_cadastro") if isinstance(lead_date_raw, str) else lead_date_raw
        if attempt_date < lead_date:
            raise AppError("Data da tentativa não pode ser menor que a data de cadastro do lead.")

    def _validate_terminal_history(self, lead_id: int) -> None:
        result = self.db.fetch_optional(
            """
            select status
            from tentativa_contato
            where id_lead = %s
            order by data_tentativa desc, id_tentativa desc
            limit 1
            """,
            [lead_id],
        )
        if result and canonical_text_key(result["status"]) == canonical_text_key("Venda realizada"):
            raise AppError("Lead já possui tentativa finalizada como venda realizada.")
