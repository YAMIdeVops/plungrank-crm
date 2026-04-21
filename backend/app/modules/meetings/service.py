from datetime import datetime

from app.core.constants import FINAL_MEETING_STATUS, MEETING_STATUS
from app.core.errors import AppError
from app.core.formatters import canonical_text_key, normalize_text
from app.core.validators import parse_date, parse_datetime, require_fields, validate_enum
from app.modules.attempts.service import AttemptService
from app.modules.leads.service import LeadService
from app.services.base_service import BaseService


class MeetingService(BaseService):
    table_name = "reuniao"

    def __init__(self):
        super().__init__()
        self.lead_service = LeadService()
        self.attempt_service = AttemptService()

    def list_meetings(self, filters: dict) -> list[dict]:
        sql = "select * from reuniao where 1=1"
        params: list = []

        if filters.get("status_reuniao"):
            sql += " and status_reuniao = %s"
            params.append(filters["status_reuniao"])
        if filters.get("periodo_inicio"):
            sql += " and data_reuniao >= %s"
            params.append(filters["periodo_inicio"])
        if filters.get("periodo_fim"):
            sql += " and data_reuniao <= %s"
            params.append(filters["periodo_fim"])

        sql += " order by data_reuniao asc, id_reuniao asc"
        return self.db.fetch_all(sql, params)

    def create_meeting(self, payload: dict, user_id: str) -> dict:
        require_fields(payload, ["id_lead", "data_reuniao", "status_reuniao"])
        lead = self.lead_service.get_lead(payload["id_lead"])
        self.lead_service.ensure_allows_new_related_records(lead)
        if not self.attempt_service.has_attempt_for_lead(lead["id_lead"]):
            raise AppError("So e possivel registrar reuniao apos existir tentativa de contato.")

        meeting_datetime = parse_datetime(payload["data_reuniao"], "data_reuniao")
        lead_date = parse_date(lead["data_cadastro"], "data_cadastro")
        if meeting_datetime.date() < lead_date:
            raise AppError("Data da reuniao nao pode ser menor que a data de cadastro do lead.")

        status = validate_enum(normalize_text(payload["status_reuniao"]), MEETING_STATUS, "status_reuniao")
        self._validate_future_meeting_status(meeting_datetime, status)

        response = self.db.fetch_one(
            """
            insert into reuniao (id_lead, data_reuniao, status_reuniao)
            values (%s, %s, %s)
            returning *
            """,
            [lead["id_lead"], meeting_datetime, status],
        )
        if status == "Remarcada":
            response["notification"] = "Reuniao remarcada. Registre uma nova reuniao."
        return response

    def update_meeting(self, meeting_id: int, payload: dict) -> dict:
        meeting = self.get_one("id_reuniao", meeting_id)
        current_status = meeting["status_reuniao"]

        if current_status in FINAL_MEETING_STATUS:
            if "status_reuniao" in payload and payload["status_reuniao"] != current_status:
                raise AppError("Status de reuniao finalizada nao pode ser alterado.")
            if "data_reuniao" in payload and payload["data_reuniao"] != meeting["data_reuniao"]:
                raise AppError("Data de reuniao finalizada nao pode ser alterada.")

        update_data = {}
        next_datetime = meeting["data_reuniao"]
        if "data_reuniao" in payload:
            next_datetime = parse_datetime(payload["data_reuniao"], "data_reuniao")
            update_data["data_reuniao"] = next_datetime

        next_status = current_status
        if "status_reuniao" in payload:
            new_status = validate_enum(normalize_text(payload["status_reuniao"]), MEETING_STATUS, "status_reuniao")
            if current_status == "Realizada" and new_status in {"Remarcada", "Não Compareceu"}:
                raise AppError("Reuniao realizada nao pode retroceder.")
            if current_status == "Não Compareceu" and new_status == "Realizada":
                raise AppError("Crie uma nova reuniao em vez de alterar para Realizada.")
            next_status = new_status
            update_data["status_reuniao"] = new_status

        next_datetime = parse_datetime(next_datetime, "data_reuniao") if isinstance(next_datetime, str) else next_datetime
        self._validate_future_meeting_status(next_datetime, next_status)

        response = self.update_by_id("id_reuniao", meeting_id, update_data)
        if response["status_reuniao"] == "Remarcada":
            response["notification"] = "Reuniao remarcada. Registre uma nova reuniao."
        return response

    def delete_meeting(self, meeting_id: int) -> None:
        meeting = self.get_one("id_reuniao", meeting_id)
        lead = self.lead_service.get_lead(meeting["id_lead"])
        if canonical_text_key(lead["situacao"]) != canonical_text_key("Inativo"):
            raise AppError("Reuniao registrada so pode ser excluida quando o lead estiver Inativo.")
        self.db.execute("delete from reuniao where id_reuniao = %s", [meeting_id])

    def _validate_future_meeting_status(self, meeting_datetime: datetime, status: str) -> None:
        if meeting_datetime > datetime.now(meeting_datetime.tzinfo) and status != "Agendada":
            raise AppError("Reunioes futuras devem permanecer como Agendada.")
